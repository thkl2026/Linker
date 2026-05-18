package kr.co.linker.talent.service;

import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.common.queue.AiJob;
import kr.co.linker.common.queue.AsyncJobQueue;
import kr.co.linker.common.storage.FileStorageService;
import kr.co.linker.talent.domain.AiJobRecord;
import kr.co.linker.talent.domain.AiJobStatus;
import kr.co.linker.talent.dto.JobStatusResponse;
import kr.co.linker.talent.dto.PresignedUrlResponse;
import kr.co.linker.talent.repository.AiJobRepository;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * 파일 업로드 + 이력서 파싱 요청 서비스 (F-1.1)
 *
 * <p>Pre-signed URL 발급 → 클라이언트 직접 업로드 → 파싱 요청 → 202 Accepted + jobId 반환
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UploadService {

    private final FileStorageService fileStorageService;
    private final AsyncJobQueue asyncJobQueue;
    private final AiJobRepository aiJobRepository;
    private final TalentProfileRepository talentProfileRepository;

    @Value("${linker.file.presigned-upload-expiry-seconds:300}")
    private long uploadExpirySeconds;

    /**
     * Pre-signed 업로드 URL 발급
     *
     * @param userId    요청자 사용자 UUID
     * @param filename  파일명 (확장자 포함)
     * @return Pre-signed URL + fileKey
     */
    public PresignedUrlResponse generateUploadUrl(UUID userId, String filename) {
        String ext = extractExtension(filename);
        String fileKey = "talents/" + userId + "/resume/" + UUID.randomUUID() + "." + ext;
        Duration expiry = Duration.ofSeconds(uploadExpirySeconds);
        String url = fileStorageService.generateUploadUrl(fileKey, expiry);
        log.info("[UPLOAD_URL_ISSUED] userId={} fileKey={}", userId, fileKey);
        return new PresignedUrlResponse(url, fileKey, uploadExpirySeconds);
    }

    /**
     * 이력서 파싱 비동기 작업 요청 (F-1.1)
     *
     * <p>talentProfile이 없으면 404. 파싱 작업을 큐에 발행하고 jobId를 반환한다.
     *
     * @param userId  요청자 사용자 UUID
     * @param fileKey 업로드된 파일 키
     * @return AI 작업 레코드 UUID (폴링용)
     */
    @Transactional
    public UUID requestResumeParse(UUID userId, String fileKey) {
        var profile = talentProfileRepository.findByUserIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "TALENT_NOT_FOUND", "인력 프로필을 먼저 생성하세요."));

        AiJobRecord jobRecord = AiJobRecord.create(
                AiJob.AiJobType.RESUME_PARSE.name(),
                profile.getId(),
                Map.of("fileKey", fileKey, "talentId", profile.getId().toString())
        );
        aiJobRepository.save(jobRecord);

        asyncJobQueue.publish(new AiJob(
                jobRecord.getId(),
                AiJob.AiJobType.RESUME_PARSE,
                Map.of("fileKey", fileKey, "talentId", profile.getId().toString(),
                       "jobRecordId", jobRecord.getId().toString())
        ));
        log.info("[RESUME_PARSE_REQUESTED] userId={} jobId={}", userId, jobRecord.getId());
        return jobRecord.getId();
    }

    /**
     * AI 작업 상태 조회
     *
     * @param jobId  작업 UUID
     * @param userId 요청자 (본인 작업 확인용)
     * @return 작업 상태 응답
     */
    @Transactional(readOnly = true)
    public JobStatusResponse getJobStatus(UUID jobId, UUID userId) {
        AiJobRecord record = aiJobRepository.findById(jobId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "JOB_NOT_FOUND", "작업을 찾을 수 없습니다."));

        var profile = talentProfileRepository.findByUserIdAndDeletedAtIsNull(userId);
        boolean isOwner = profile.map(p -> p.getId().equals(record.getTalentId())).orElse(false);
        if (!isOwner) {
            throw new LinkerException(HttpStatus.FORBIDDEN, "JOB_ACCESS_DENIED", "본인 작업만 조회할 수 있습니다.");
        }
        return JobStatusResponse.from(record);
    }

    private String extractExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "bin";
    }
}

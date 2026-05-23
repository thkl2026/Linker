package kr.co.linker.talent.service;

import kr.co.linker.talent.domain.AvailabilityStatus;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.domain.WorkType;
import kr.co.linker.common.encryption.EncryptionService;
import kr.co.linker.talent.dto.CreateProfileRequest;
import kr.co.linker.talent.dto.TalentProfileResponse;
import kr.co.linker.talent.dto.UpdateAvailabilityRequest;
import kr.co.linker.talent.dto.UpdateProfileRequest;
import kr.co.linker.talent.exception.TalentException;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * 인력 프로필 서비스 — 조회·수정·가용 상태 변경 비즈니스 로직
 *
 * <p>이력서 파싱(F-1.1)·AI 스코어링(F-1.3)은 비동기 파이프라인이므로
 * Phase 2에서 {@link kr.co.linker.common.queue.AsyncJobQueue}를 통해 처리한다.
 *
 * @rule 그라운드룰 Rule 1: @Transactional 메서드는 AOP 로그 자동 기록
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TalentProfileService {

    private final TalentProfileRepository talentProfileRepository;
    private final EncryptionService encryptionService;

    /**
     * 인력 프로필 단건 조회
     *
     * @param talentId 프로필 UUID
     * @return 프로필 응답 DTO
     * @throws TalentException 프로필 없거나 삭제된 경우
     */
    @Transactional(readOnly = true)
    public TalentProfileResponse getProfile(UUID talentId) {
        TalentProfile profile = findActive(talentId);
        return TalentProfileResponse.from(profile);
    }

    /**
     * 내 프로필 조회 (JWT 인증 사용자)
     *
     * @param userId 인증된 사용자 UUID
     * @return 프로필 응답 DTO
     * @throws TalentException 프로필 없는 경우
     */
    @Transactional(readOnly = true)
    public TalentProfileResponse getMyProfile(UUID userId) {
        TalentProfile profile = talentProfileRepository.findByUserIdAndDeletedAtIsNull(userId)
                .orElseThrow(TalentException::notFound);
        return TalentProfileResponse.from(profile);
    }

    /**
     * 가용 인력 검색 (매칭 1차 필터)
     *
     * @param workType 근무 형태 필터 (null = 전체)
     * @param maxRate  최대 단가 필터 (null = 무제한)
     * @param pageable 페이지네이션
     * @return 가용 인력 페이지
     */
    @Transactional(readOnly = true)
    public Page<TalentProfileResponse> searchAvailable(WorkType workType, BigDecimal maxRate, Pageable pageable) {
        return talentProfileRepository
                .searchAvailable(AvailabilityStatus.AVAILABLE, workType, maxRate, pageable)
                .map(TalentProfileResponse::from);
    }

    /**
     * 신규 인력 프로필 생성 — 회원가입 완료 후 TALENT 역할 사용자에게 호출
     *
     * @param userId   사용자 UUID
     * @param name     표시 이름
     * @param workType 희망 근무 형태
     * @return 생성된 프로필 UUID
     */
    @Transactional
    public UUID createProfile(UUID userId, CreateProfileRequest request) {
        TalentProfile profile = TalentProfile.create(
                userId, request.name(), request.category(), request.field(), request.workType());
        if (request.desiredRate() != null) {
            profile.updateProfile(request.name(), null, request.desiredRate(),
                    request.category(), request.field(), request.workType(),
                    profile.getBirthDate(), profile.getEmail(), profile.getAddress(),
                    profile.getTitle(), profile.getProjectRole());
        }
        if (request.phone() != null && !request.phone().isBlank()) {
            profile.updatePhone(encryptionService.encrypt(request.phone()));
        }
        talentProfileRepository.save(profile);
        log.info("[TALENT_CREATED] profileId={} userId={}", profile.getId(), userId);
        return profile.getId();
    }

    /**
     * 프로필 기본 정보 수정
     *
     * @param talentId  수정할 프로필 UUID
     * @param requesterId 요청자 사용자 UUID (본인 확인용)
     * @param request   수정 요청
     * @throws TalentException 프로필 없거나 본인이 아닌 경우
     */
    @Transactional
    public void updateProfile(UUID talentId, UUID requesterId, UpdateProfileRequest request) {
        TalentProfile profile = findActive(talentId);
        if (!profile.getUserId().equals(requesterId)) {
            throw TalentException.accessDenied();
        }
        profile.updateProfile(request.name(), null, request.desiredRate(),
                request.category(), request.field(), request.workType(),
                profile.getBirthDate(), profile.getEmail(), profile.getAddress(),
                request.title(), profile.getProjectRole());
        log.info("[TALENT_UPDATED] profileId={}", talentId);
    }

    /**
     * 가용 상태 변경 (F-1.2) — 모바일 FAB 원터치 전환에 사용
     *
     * @param talentId    프로필 UUID
     * @param requesterId 요청자 UUID (본인 확인)
     * @param request     상태·가용 예정일
     * @throws TalentException 프로필 없거나 본인이 아닌 경우
     */
    @Transactional
    public void updateAvailability(UUID talentId, UUID requesterId, UpdateAvailabilityRequest request) {
        TalentProfile profile = findActive(talentId);
        if (!profile.getUserId().equals(requesterId)) {
            throw TalentException.accessDenied();
        }
        profile.updateAvailability(request.status(), request.availableFrom());
        log.info("[AVAILABILITY_CHANGED] profileId={} status={}", talentId, request.status());
    }

    /**
     * 내 가용 상태 변경 — 모바일 앱 전용 (userId로 프로필 조회)
     *
     * @param userId  인증된 사용자 UUID
     * @param request 상태 변경 요청
     */
    @Transactional
    public void updateMyAvailability(UUID userId, UpdateAvailabilityRequest request) {
        TalentProfile profile = talentProfileRepository.findByUserIdAndDeletedAtIsNull(userId)
                .orElseThrow(TalentException::notFound);
        profile.updateAvailability(request.status(), request.availableFrom());
        log.info("[MY_AVAILABILITY_CHANGED] userId={} status={}", userId, request.status());
    }

    /**
     * 프로필 Soft Delete
     *
     * @param talentId    프로필 UUID
     * @param requesterId 요청자 UUID (본인 확인)
     */
    @Transactional
    public void deleteProfile(UUID talentId, UUID requesterId) {
        TalentProfile profile = findActive(talentId);
        if (!profile.getUserId().equals(requesterId)) {
            throw TalentException.accessDenied();
        }
        profile.delete();
        log.info("[TALENT_DELETED] profileId={}", talentId);
    }

    private TalentProfile findActive(UUID talentId) {
        TalentProfile profile = talentProfileRepository.findById(talentId)
                .orElseThrow(TalentException::notFound);
        if (profile.isDeleted()) {
            throw TalentException.alreadyDeleted();
        }
        return profile;
    }
}

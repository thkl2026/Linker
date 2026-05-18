package kr.co.linker.peerreview.service;

import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.peerreview.domain.PeerReview;
import kr.co.linker.peerreview.dto.CreatePeerReviewRequest;
import kr.co.linker.peerreview.dto.PeerReviewResponse;
import kr.co.linker.peerreview.repository.PeerReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * 익명 다면 평가 서비스 (F-4.5)
 *
 * <p>동료 평가 등록 + 조회 + 평균 점수 산출.
 * 익명 여부에 따라 조회 시 reviewerId를 마스킹한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PeerReviewService {

    private final PeerReviewRepository peerReviewRepository;

    /**
     * Peer Review를 등록한다.
     *
     * <p>계약당 1인 1회 제한. 중복 제출 시 CONFLICT 예외를 발생시킨다.
     *
     * @param reviewerId 평가자 UUID
     * @param request    등록 요청
     * @return 등록된 Peer Review 응답
     */
    @Transactional
    public PeerReviewResponse create(UUID reviewerId, CreatePeerReviewRequest request) {
        if (reviewerId.equals(request.talentId())) {
            throw new LinkerException(HttpStatus.BAD_REQUEST,
                    "SELF_REVIEW_NOT_ALLOWED", "자기 자신을 평가할 수 없습니다.");
        }

        peerReviewRepository.findByTalentIdAndReviewerIdAndContractId(
                request.talentId(), reviewerId, request.contractId())
                .ifPresent(existing -> {
                    throw new LinkerException(HttpStatus.CONFLICT,
                            "PEER_REVIEW_DUPLICATE", "이미 해당 계약에 평가를 제출했습니다.");
                });

        PeerReview pr = PeerReview.create(
                request.talentId(), reviewerId, request.contractId(),
                request.collaborationScore(), request.technicalScore(),
                request.reliabilityScore(), request.comment(), request.anonymous());

        PeerReview saved = peerReviewRepository.save(pr);
        log.info("[PEER_REVIEW] talentId={} reviewerId={} avg={}",
                request.talentId(), reviewerId, saved.averageScore());

        return PeerReviewResponse.from(saved, reviewerId, false);
    }

    /**
     * 인력의 Peer Review 목록을 반환한다.
     *
     * @param talentId    인력 UUID
     * @param requesterId 요청자 UUID
     * @param isAdmin     관리자 여부 — true이면 reviewerId 노출
     * @return Peer Review 목록 (최신순)
     */
    @Transactional(readOnly = true)
    public List<PeerReviewResponse> listByTalent(UUID talentId, UUID requesterId, boolean isAdmin) {
        return peerReviewRepository.findByTalentIdOrderByCreatedAtDesc(talentId).stream()
                .map(pr -> PeerReviewResponse.from(pr, requesterId, isAdmin))
                .toList();
    }

    /**
     * 인력의 Peer Review 평균 점수를 반환한다.
     *
     * @param talentId 인력 UUID
     * @return 평균 점수 (없으면 0.0)
     */
    @Transactional(readOnly = true)
    public double getAverageScore(UUID talentId) {
        return peerReviewRepository.findAverageScoreByTalentId(talentId).orElse(0.0);
    }
}

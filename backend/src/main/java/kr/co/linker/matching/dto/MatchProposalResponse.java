package kr.co.linker.matching.dto;

import kr.co.linker.matching.domain.MatchProposal;
import kr.co.linker.matching.domain.ProposalStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 매칭 제안 응답 DTO
 */
public record MatchProposalResponse(
        UUID id,
        UUID projectId,
        UUID talentId,
        BigDecimal similarityScore,
        String matchReason,
        List<String> strengths,
        List<String> concerns,
        List<String> interviewGuide,
        ProposalStatus status,
        OffsetDateTime createdAt
) {
    /**
     * 엔티티 → 응답 DTO 변환
     *
     * @param mp MatchProposal 엔티티
     * @return 응답 DTO
     */
    public static MatchProposalResponse from(MatchProposal mp) {
        return new MatchProposalResponse(
                mp.getId(), mp.getProjectId(), mp.getTalentId(),
                mp.getSimilarityScore(), mp.getMatchReason(),
                mp.getStrengths(), mp.getConcerns(), mp.getInterviewGuide(),
                mp.getStatus(), mp.getCreatedAt()
        );
    }
}

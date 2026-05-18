package kr.co.linker.talent.service;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.model.embedding.EmbeddingModel;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.UUID;

/**
 * 인력 프로필 임베딩 생성 서비스 (F-1.4)
 *
 * <p>스킬·이력 텍스트를 Gemini text-embedding-004 모델로 벡터화하여
 * {@code talent_profiles.profile_embedding} 컬럼을 업데이트한다.
 * pgvector HNSW 인덱스를 통해 매칭 유사도 검색에 사용된다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmbeddingService {

    private final EmbeddingModel embeddingModel;
    private final TalentProfileRepository talentProfileRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * 인력 프로필 임베딩을 생성하고 DB에 저장한다.
     *
     * @param talentId 인력 프로필 UUID
     * @param profileText 임베딩할 텍스트 (스킬 + 이력 요약)
     */
    @Transactional
    public void updateEmbedding(UUID talentId, String profileText) {
        log.info("[EMBEDDING_START] talentId={}", talentId);

        Embedding embedding = embeddingModel.embed(profileText).content();
        float[] vector = embedding.vector();

        // pgvector는 '[0.1,0.2,...]' 형식 문자열로 입력
        String vectorStr = Arrays.toString(vector).replace(" ", "");

        jdbcTemplate.update(
                "UPDATE talent_profiles SET profile_embedding = ?::vector, embedding_updated_at = NOW() WHERE id = ?",
                vectorStr, talentId
        );
        log.info("[EMBEDDING_UPDATED] talentId={} dims={}", talentId, vector.length);
    }

    /**
     * 프로필 텍스트를 구성한다 — 스킬 목록 + 이력 요약.
     *
     * @param profile 인력 프로필
     * @return 임베딩 입력 텍스트
     */
    public String buildProfileText(TalentProfile profile) {
        StringBuilder sb = new StringBuilder();
        sb.append("이름: ").append(profile.getName()).append('\n');
        sb.append("근무형태: ").append(profile.getWorkType()).append('\n');
        sb.append("기술: ");
        profile.getSkills().forEach(s ->
                sb.append(s.getSkillName()).append("(").append(s.getLevel()).append(") "));
        return sb.toString();
    }
}

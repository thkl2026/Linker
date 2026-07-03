package kr.co.linker.talent.service;

import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import jakarta.annotation.PostConstruct;
import kr.co.linker.talent.document.TalentDocument;
import kr.co.linker.talent.domain.TalentExperience;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.domain.TalentSkill;
import kr.co.linker.talent.repository.TalentExperienceRepository;
import kr.co.linker.talent.repository.TalentProfileRepository;
import kr.co.linker.talent.repository.TalentSearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class TalentIndexService {

    private final TalentSearchRepository searchRepository;
    private final TalentProfileRepository profileRepository;
    private final TalentExperienceRepository experienceRepository;
    private final ElasticsearchOperations elasticsearchOperations;

    @PostConstruct
    void ensureIndex() {
        try {
            IndexOperations ops = elasticsearchOperations.indexOps(TalentDocument.class);
            if (!ops.exists()) {
                ops.createWithMapping();
                log.info("[ES] talents 인덱스 생성 완료");
            }
        } catch (Exception e) {
            log.warn("[ES] 인덱스 초기화 실패 — ES 미연결 상태로 계속: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public void index(UUID talentId) {
        try {
            profileRepository.findById(talentId).ifPresent(profile -> {
                searchRepository.save(toDocument(profile));
                log.debug("[ES] indexed talentId={}", talentId);
            });
        } catch (Exception e) {
            log.warn("[ES] 인덱싱 실패 talentId={}: {}", talentId, e.getMessage());
        }
    }

    public void remove(UUID talentId) {
        try {
            searchRepository.deleteById(talentId.toString());
            log.debug("[ES] removed talentId={}", talentId);
        } catch (Exception e) {
            log.warn("[ES] 인덱스 삭제 실패 talentId={}: {}", talentId, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public long reindexAll() {
        List<TalentProfile> all = profileRepository.findByDeletedAtIsNull();
        List<TalentDocument> docs = all.stream().map(this::toDocument).toList();
        searchRepository.deleteAll();
        searchRepository.saveAll(docs);
        log.info("[ES] reindexAll 완료, count={}", docs.size());
        return docs.size();
    }

    public long countIndexed() {
        try {
            return searchRepository.count();
        } catch (Exception e) {
            return -1;
        }
    }

    public Page<UUID> searchIds(String keyword, String category, String field, Pageable pageable) {
        Query boolQuery = Query.of(q -> q.bool(b -> {
            if (keyword != null && !keyword.isBlank()) {
                b.must(m -> m.multiMatch(mm -> mm
                    .query(keyword)
                    .fields(List.of(
                        "name^3", "nameEn^2", "skills^2", "companyNames^2",
                        "projectNames^1.5", "techStacks^1.5", "roles", "descriptions^0.5"
                    ))
                    .type(TextQueryType.BestFields)
                ));
            } else {
                b.must(m -> m.matchAll(ma -> ma));
            }
            b.filter(f -> f.term(t -> t.field("deleted").value(false)));
            if (category != null) {
                b.filter(f -> f.term(t -> t.field("category").value(category)));
            }
            if (field != null) {
                b.filter(f -> f.term(t -> t.field("field").value(field)));
            }
            return b;
        }));

        NativeQuery nativeQuery = NativeQuery.builder()
            .withQuery(boolQuery)
            .withPageable(pageable)
            .build();

        SearchHits<TalentDocument> hits = elasticsearchOperations.search(nativeQuery, TalentDocument.class);
        List<UUID> ids = hits.getSearchHits().stream()
            .map(hit -> UUID.fromString(hit.getId()))
            .toList();
        return new PageImpl<>(ids, pageable, hits.getTotalHits());
    }

    private TalentDocument toDocument(TalentProfile profile) {
        List<TalentExperience> exps = experienceRepository.findByTalentProfileIdOrderByStartDateDesc(profile.getId());
        List<String> skills = profile.getSkills().stream()
            .map(TalentSkill::getSkillName)
            .filter(Objects::nonNull)
            .toList();
        List<String> companyNames = exps.stream()
            .map(TalentExperience::getCompanyName)
            .filter(s -> s != null && !s.isBlank())
            .distinct().toList();
        List<String> projectNames = exps.stream()
            .map(TalentExperience::getProjectName)
            .filter(s -> s != null && !s.isBlank() && !s.equals("-"))
            .distinct().toList();
        List<String> roles = exps.stream()
            .map(TalentExperience::getRole)
            .filter(s -> s != null && !s.isBlank())
            .distinct().toList();
        List<String> techStacks = exps.stream()
            .flatMap(e -> e.getTechStack() != null ? e.getTechStack().stream() : Stream.empty())
            .filter(s -> s != null && !s.isBlank())
            .distinct().toList();
        List<String> descriptions = exps.stream()
            .map(TalentExperience::getDescription)
            .filter(s -> s != null && !s.isBlank())
            .distinct().toList();

        return TalentDocument.builder()
            .id(profile.getId().toString())
            .name(profile.getName())
            .nameEn(profile.getNameEn())
            .category(profile.getCategory() != null ? profile.getCategory().name() : null)
            .field(profile.getField() != null ? profile.getField().name() : null)
            .skillGrade(profile.getSkillGrade())
            .title(profile.getTitle())
            .deleted(profile.isDeleted())
            .skills(skills)
            .companyNames(companyNames)
            .projectNames(projectNames)
            .roles(roles)
            .techStacks(techStacks)
            .descriptions(descriptions)
            .build();
    }
}

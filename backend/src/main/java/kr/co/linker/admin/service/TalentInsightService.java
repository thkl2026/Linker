package kr.co.linker.admin.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.admin.dto.ExperienceResponse;
import kr.co.linker.admin.dto.TalentInsightData;
import kr.co.linker.admin.dto.TalentInsightResponse;
import kr.co.linker.common.ai.PromptLoader;
import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.repository.TalentExperienceRepository;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class TalentInsightService {

    private final TalentProfileRepository talentProfileRepository;
    private final TalentExperienceRepository experienceRepository;
    private final PromptLoader promptLoader;
    private final ObjectMapper objectMapper;

    @Value("${linker.ai.gemini-api-key}")
    private String geminiApiKey;

    @Value("${linker.ai.llm-model:gemini-1.5-flash}")
    private String llmModel;

    public TalentInsightService(TalentProfileRepository talentProfileRepository,
                                TalentExperienceRepository experienceRepository,
                                PromptLoader promptLoader,
                                ObjectMapper objectMapper) {
        this.talentProfileRepository = talentProfileRepository;
        this.experienceRepository = experienceRepository;
        this.promptLoader = promptLoader;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TalentInsightData analyze(UUID talentId, String keywords) {
        TalentProfile profile = talentProfileRepository.findById(talentId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "TALENT_NOT_FOUND", "인력 프로필을 찾을 수 없습니다."));

        List<ExperienceResponse> experiences = experienceRepository
                .findByTalentProfileIdOrderByStartDateDesc(talentId)
                .stream().map(ExperienceResponse::from).toList();

        log.info("[INSIGHT_START] talentId={} experiences={} keywords={}", talentId, experiences.size(), keywords);

        String prompt = promptLoader.load("talent-insight", Map.of(
                "profileJson",     buildProfileJson(profile),
                "experiencesJson", buildExperiencesJson(experiences),
                "today",           LocalDate.now().toString(),
                "keywords",        keywords != null ? keywords : ""
        ));

        String raw;
        try {
            raw = callGemini(prompt);
        } catch (Exception e) {
            log.error("[INSIGHT_AI_ERROR] talentId={} err={}", talentId, e.getMessage(), e);
            throw new LinkerException(HttpStatus.INTERNAL_SERVER_ERROR, "AI_ERROR", "AI 분석 호출 실패: " + e.getMessage());
        }
        TalentInsightResponse result = parseInsight(raw, talentId);
        if (result != null) {
            result = computeDomainPct(result, experiences);
            result = computeGapPeriods(result, experiences);
        }
        log.info("[INSIGHT_DONE] talentId={} riskFlags={}", talentId,
                result != null && result.riskFlags() != null ? result.riskFlags().size() : 0);

        try {
            profile.updateAiInsight(objectMapper.writeValueAsString(result), keywords);
        } catch (Exception e) {
            log.warn("[INSIGHT_SAVE_ERROR] talentId={} err={}", talentId, e.getMessage());
        }
        return new TalentInsightData(result, keywords);
    }

    @Transactional(readOnly = true)
    public TalentInsightData getInsight(UUID talentId) {
        TalentProfile profile = talentProfileRepository.findById(talentId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "TALENT_NOT_FOUND", "인력 프로필을 찾을 수 없습니다."));
        if (profile.getAiInsightJson() == null) return new TalentInsightData(null, null);
        try {
            TalentInsightResponse insight = objectMapper.readValue(
                    profile.getAiInsightJson(), TalentInsightResponse.class);
            return new TalentInsightData(insight, profile.getAiInsightKeywords());
        } catch (Exception e) {
            log.warn("[INSIGHT_LOAD_ERROR] talentId={} err={}", talentId, e.getMessage());
            return new TalentInsightData(null, null);
        }
    }

    // AI가 분류한 projectAssignments + 실제 경력 기간으로 도메인 비율 계산
    private TalentInsightResponse computeDomainPct(TalentInsightResponse result,
                                                    List<ExperienceResponse> experiences) {
        if (result.domainProfile() == null) return result;

        List<TalentInsightResponse.ProjectDomainAssignment> assignments =
                result.domainProfile().projectAssignments();
        if (assignments == null || assignments.isEmpty()) return result;

        // projectName(소문자 정규화) → domain 매핑
        Map<String, String> domainMap = assignments.stream()
                .filter(a -> a.projectName() != null && a.domain() != null)
                .collect(Collectors.toMap(
                        a -> normalize(a.projectName()),
                        a -> a.domain(),
                        (a, b) -> a
                ));

        // PROJECT 이력별 도메인 분류 및 기간 합산
        Map<String, Integer> domainMonths = new LinkedHashMap<>();
        for (ExperienceResponse exp : experiences) {
            if (!"PROJECT".equalsIgnoreCase(String.valueOf(exp.experienceType()))) continue;

            String domain = findDomain(exp.projectName(), domainMap);
            int months = calcMonths(exp.startDate(), exp.endDate());
            domainMonths.merge(domain, months, Integer::sum);
        }

        if (domainMonths.isEmpty()) return result;

        int total = domainMonths.values().stream().mapToInt(Integer::intValue).sum();

        // pct 계산 후 합계가 정확히 100이 되도록 가장 큰 도메인에서 조정
        List<int[]> pcts = domainMonths.values().stream()
                .map(m -> new int[]{(int) Math.round(100.0 * m / total)})
                .collect(Collectors.toList());
        int sum = pcts.stream().mapToInt(p -> p[0]).sum();
        if (sum != 100 && !pcts.isEmpty()) pcts.get(0)[0] += (100 - sum);

        List<String> keys = new ArrayList<>(domainMonths.keySet());
        List<TalentInsightResponse.DomainItem> computed = new ArrayList<>();
        for (int i = 0; i < keys.size(); i++) {
            computed.add(new TalentInsightResponse.DomainItem(keys.get(i), pcts.get(i)[0]));
        }
        computed.sort(Comparator.comparingInt(TalentInsightResponse.DomainItem::pct).reversed());

        String primary = computed.isEmpty() ? result.domainProfile().primaryDomain()
                : computed.get(0).name();

        TalentInsightResponse.DomainProfile newDomain = new TalentInsightResponse.DomainProfile(
                primary, computed, result.domainProfile().domainNote(), assignments);

        return new TalentInsightResponse(
                result.summary(), result.careerPattern(), result.technicalProfile(),
                newDomain, result.roleProfile(), result.softSkills(),
                result.riskFlags(), result.marketValue(), result.careerRoadmap());
    }

    private TalentInsightResponse computeGapPeriods(TalentInsightResponse result, List<ExperienceResponse> experiences) {
        if (result.careerPattern() == null) return result;

        List<ExperienceResponse> sorted = experiences.stream()
                .filter(e -> e.startDate() != null && (String.valueOf(e.experienceType()).equals("COMPANY") || String.valueOf(e.experienceType()).equals("PROJECT")))
                .sorted(Comparator.comparing(ExperienceResponse::startDate))
                .collect(Collectors.toList());

        List<TalentInsightResponse.GapPeriod> gaps = new ArrayList<>();
        LocalDate currentEnd = null;

        for (ExperienceResponse exp : sorted) {
            LocalDate start = exp.startDate();
            LocalDate end = exp.endDate() != null ? exp.endDate() : LocalDate.now();

            if (currentEnd != null && start.isAfter(currentEnd)) {
                int gapMonths = (int) ChronoUnit.MONTHS.between(currentEnd.withDayOfMonth(1), start.withDayOfMonth(1));
                if (gapMonths >= 3) {
                    gaps.add(new TalentInsightResponse.GapPeriod(
                            currentEnd.toString().substring(0, 7),
                            start.toString().substring(0, 7),
                            gapMonths,
                            "이직 준비 또는 휴식 추정"
                    ));
                }
            }
            if (currentEnd == null || end.isAfter(currentEnd)) {
                currentEnd = end;
            }
        }
        Collections.reverse(gaps);

        TalentInsightResponse.CareerPattern oldPattern = result.careerPattern();
        TalentInsightResponse.CareerPattern newPattern = new TalentInsightResponse.CareerPattern(
                oldPattern.consistency(), oldPattern.consistencyReason(),
                oldPattern.shortProjectCount(), oldPattern.shortProjectRisk(),
                gaps, oldPattern.avgProjectMonths(),
                oldPattern.persistenceLevel(), oldPattern.persistenceReason()
        );

        List<TalentInsightResponse.RiskFlag> newRiskFlags = new ArrayList<>();
        if (result.riskFlags() != null) {
            newRiskFlags.addAll(result.riskFlags().stream().filter(f -> !"GAP".equals(f.type())).collect(Collectors.toList()));
        }
        for (TalentInsightResponse.GapPeriod gap : gaps) {
            if (gap.months() >= 6) {
                newRiskFlags.add(new TalentInsightResponse.RiskFlag("GAP", gap.months() >= 12 ? "HIGH" : "MEDIUM",
                        gap.fromDate() + " ~ " + gap.toDate() + " (" + gap.months() + "개월) 장기 공백"));
            }
        }

        return new TalentInsightResponse(
                result.summary(), newPattern, result.technicalProfile(),
                result.domainProfile(), result.roleProfile(), result.softSkills(),
                newRiskFlags, result.marketValue(), result.careerRoadmap()
        );
    }

    private String findDomain(String projectName, Map<String, String> domainMap) {
        if (projectName == null) return "기타";
        String norm = normalize(projectName);
        if (domainMap.containsKey(norm)) return domainMap.get(norm);
        // 부분 일치 (AI가 프로젝트명을 약간 다르게 표현한 경우)
        for (Map.Entry<String, String> entry : domainMap.entrySet()) {
            if (norm.contains(entry.getKey()) || entry.getKey().contains(norm)) {
                return entry.getValue();
            }
        }
        return "기타";
    }

    private String normalize(String s) {
        return s.toLowerCase().replaceAll("[\\s\\-_·]", "").trim();
    }

    // +1 규칙 포함 (시작월 포함 계산)
    private int calcMonths(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) return 0;
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        return (int) ChronoUnit.MONTHS.between(startDate, end) + 1;
    }

    private String buildProfileJson(TalentProfile p) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "name",           p.getName(),
                    "category",       p.getCategory() != null ? p.getCategory().name() : "",
                    "field",          p.getField() != null ? p.getField().name() : "",
                    "skillGrade",     p.getSkillGrade() != null ? p.getSkillGrade() : "",
                    "itCareerMonths", p.getItCareerMonths() != null ? p.getItCareerMonths() : 0,
                    "desiredRate",    p.getDesiredRate() != null ? p.getDesiredRate() : 0,
                    "skills",         p.getSkills().stream().map(s -> s.getSkillName()).toList()
            ));
        } catch (Exception e) {
            return "{}";
        }
    }

    private String buildExperiencesJson(List<ExperienceResponse> exps) {
        try {
            List<Map<String, Object>> list = exps.stream().map(e -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("type",        e.experienceType());
                m.put("company",     e.companyName());
                m.put("project",     e.projectName());
                m.put("role",        e.role());
                m.put("startDate",   e.startDate() != null ? e.startDate().toString() : null);
                m.put("endDate",     e.endDate() != null ? e.endDate().toString() : null);
                m.put("techStack",   e.techStack());
                m.put("description", e.description());
                return m;
            }).toList();
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    private String callGemini(String prompt) throws Exception {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000);
        factory.setReadTimeout(180000);
        RestTemplate rt = new RestTemplate(factory);
        rt.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + llmModel + ":generateContent?key=" + geminiApiKey;

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json; charset=utf-8");
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        ResponseEntity<String> response = rt.exchange(url, HttpMethod.POST,
                new HttpEntity<>(body, headers), String.class);
        String responseBody = response.getBody();
        if (responseBody == null) throw new RuntimeException("Gemini 응답 없음");

        @SuppressWarnings("unchecked")
        Map<String, Object> parsed = objectMapper.convertValue(
                objectMapper.readTree(responseBody), Map.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) parsed.get("candidates");
        @SuppressWarnings("unchecked")
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        return (String) parts.get(0).get("text");
    }

    private TalentInsightResponse parseInsight(String raw, UUID talentId) {
        int start = raw.indexOf('{');
        int end   = raw.lastIndexOf('}');
        if (start < 0 || end <= start) {
            log.error("[INSIGHT_PARSE_ERROR] JSON 블록 없음 talentId={}", talentId);
            return null;
        }
        String json = raw.substring(start, end + 1);
        try {
            return objectMapper.readValue(json, TalentInsightResponse.class);
        } catch (Exception e) {
            log.error("[INSIGHT_PARSE_ERROR] talentId={} err={}", talentId, e.getMessage());
            return null;
        }
    }
}

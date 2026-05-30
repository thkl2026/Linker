package kr.co.linker.admin.service;

import kr.co.linker.admin.dto.ResumeAnalysisResult;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

@Component
public class ResumeAnalysisValidator {

    private static final Set<String> VALID_CATEGORIES = Set.of(
            "DEVELOPER", "ARCHITECT", "DATA", "SECURITY", "PM", "DESIGNER"
    );
    private static final Set<String> VALID_WORK_TYPES = Set.of(
            "REMOTE", "ONSITE", "HYBRID"
    );
    private static final int MAX_MONTHLY_RATE = 20_000_000;
    private static final double MANUAL_REVIEW_THRESHOLD = 0.85;

    private static final Map<String, String> SKILL_MAP = Map.ofEntries(
            Map.entry("springboot", "Spring Boot"),
            Map.entry("spring-boot", "Spring Boot"),
            Map.entry("spring boot", "Spring Boot"),
            Map.entry("springmvc", "Spring MVC"),
            Map.entry("spring mvc", "Spring MVC"),
            Map.entry("spring-mvc", "Spring MVC"),
            Map.entry("spring framework", "Spring Framework"),
            Map.entry("nodejs", "Node.js"),
            Map.entry("node.js", "Node.js"),
            Map.entry("node js", "Node.js"),
            Map.entry("nestjs", "NestJS"),
            Map.entry("nest.js", "NestJS"),
            Map.entry("nextjs", "Next.js"),
            Map.entry("next.js", "Next.js"),
            Map.entry("nuxtjs", "Nuxt.js"),
            Map.entry("nuxt.js", "Nuxt.js"),
            Map.entry("k8s", "Kubernetes"),
            Map.entry("kubernetes", "Kubernetes"),
            Map.entry("js", "JavaScript"),
            Map.entry("javascript", "JavaScript"),
            Map.entry("ts", "TypeScript"),
            Map.entry("typescript", "TypeScript"),
            Map.entry("reactjs", "React"),
            Map.entry("react.js", "React"),
            Map.entry("react js", "React"),
            Map.entry("vuejs", "Vue.js"),
            Map.entry("vue.js", "Vue.js"),
            Map.entry("vue js", "Vue.js"),
            Map.entry("angular js", "Angular"),
            Map.entry("angularjs", "Angular"),
            Map.entry("angular.js", "Angular"),
            Map.entry("reactnative", "React Native"),
            Map.entry("react native", "React Native"),
            Map.entry("react-native", "React Native"),
            Map.entry("mysql", "MySQL"),
            Map.entry("postgresql", "PostgreSQL"),
            Map.entry("postgres", "PostgreSQL"),
            Map.entry("mongodb", "MongoDB"),
            Map.entry("mongo db", "MongoDB"),
            Map.entry("mssql", "MS SQL Server"),
            Map.entry("ms sql", "MS SQL Server"),
            Map.entry("mariadb", "MariaDB"),
            Map.entry("elasticsearch", "Elasticsearch"),
            Map.entry("elastic search", "Elasticsearch"),
            Map.entry("aws", "AWS"),
            Map.entry("gcp", "GCP"),
            Map.entry("azure", "Azure"),
            Map.entry("docker", "Docker"),
            Map.entry("gitlab", "GitLab"),
            Map.entry("github", "GitHub"),
            Map.entry("jenkins", "Jenkins"),
            Map.entry("kafka", "Kafka"),
            Map.entry("rabbitmq", "RabbitMQ"),
            Map.entry("rabbit mq", "RabbitMQ"),
            Map.entry("mybatis", "MyBatis"),
            Map.entry("my batis", "MyBatis"),
            Map.entry("jpa", "JPA"),
            Map.entry("redis", "Redis"),
            Map.entry("graphql", "GraphQL"),
            Map.entry("graph ql", "GraphQL"),
            Map.entry("terraform", "Terraform"),
            Map.entry("ansible", "Ansible"),
            Map.entry("fastapi", "FastAPI"),
            Map.entry("fast api", "FastAPI"),
            Map.entry("django", "Django"),
            Map.entry("flask", "Flask"),
            Map.entry("golang", "Go"),
            Map.entry("go lang", "Go"),
            Map.entry("kotlin", "Kotlin"),
            Map.entry("swift", "Swift"),
            Map.entry("scala", "Scala"),
            Map.entry("flutter", "Flutter"),
            Map.entry("hadoop", "Hadoop"),
            Map.entry("apache spark", "Apache Spark"),
            Map.entry("apache airflow", "Apache Airflow"),
            Map.entry("airflow", "Apache Airflow"),
            Map.entry("spark", "Apache Spark"),
            Map.entry("svelte", "Svelte"),
            Map.entry("tailwind", "Tailwind CSS"),
            Map.entry("tailwindcss", "Tailwind CSS"),
            Map.entry("tailwind css", "Tailwind CSS")
    );

    public ResumeAnalysisResult validate(ResumeAnalysisResult raw) {
        List<String> skills       = normalizeSkills(raw.skills());
        List<ResumeAnalysisResult.Exp> eduExps     = cleanEduExps(raw.educations());
        List<ResumeAnalysisResult.Exp> companyExps = validateExps(raw.companyExps());
        List<ResumeAnalysisResult.Exp> projectExps = validateExps(raw.projectExps());
        List<ResumeAnalysisResult.Exp> certExps    = validateExps(raw.certifications());

        ResumeAnalysisResult validated = new ResumeAnalysisResult(
                normalizeName(raw.name()),
                normalizeName(raw.nameEn()),
                normalizePhone(raw.phone()),
                validateEnum(raw.workType(), VALID_WORK_TYPES),
                validateRate(raw.desiredRate()),
                validateEnum(raw.category(), VALID_CATEGORIES),
                raw.field(),
                skills,
                raw.birthDate(),
                normalizeEmail(raw.email()),
                nullIfBlank(raw.address()),
                nullIfBlank(raw.skillGrade()),
                nullIfBlank(raw.title()),
                eduExps,
                companyExps,
                projectExps,
                certExps,
                raw.itCareerMonths(),
                raw.photoKey(),
                raw.resumeKey(),
                null,
                false
        );

        double score = computeConfidence(validated);
        return new ResumeAnalysisResult(
                validated.name(), validated.nameEn(), validated.phone(), validated.workType(), validated.desiredRate(),
                validated.category(), validated.field(), validated.skills(), validated.birthDate(),
                validated.email(), validated.address(), validated.skillGrade(), validated.title(),
                validated.educations(), validated.companyExps(), validated.projectExps(), validated.certifications(),
                validated.itCareerMonths(),
                validated.photoKey(),
                validated.resumeKey(),
                score,
                score < MANUAL_REVIEW_THRESHOLD
        );
    }

    // ─── Confidence Score (§4.2) ─────────────────────────────────────────────

    private double computeConfidence(ResumeAnalysisResult r) {
        double score = 0.0;

        // 이름 (0.20): 가장 핵심 식별자
        if (r.name() != null && !r.name().isBlank()) score += 0.20;

        // 연락처 (0.10): 전화번호 유효
        if (r.phone() != null && !r.phone().isBlank()) score += 0.10;

        // 이메일 (0.10): 이메일 유효
        if (r.email() != null && !r.email().isBlank()) score += 0.10;

        // 기술스택 (0.15): 3개 이상 추출
        if (r.skills() != null && r.skills().size() >= 3) score += 0.15;

        // 직군 분류 (0.10): category 판별 성공
        if (r.category() != null) score += 0.10;

        // 경력 데이터 (0.20): 회사 또는 프로젝트 이력 1건 이상
        int expCount = r.companyExps().size() + r.projectExps().size();
        if (expCount >= 1) score += 0.20;

        // 날짜 품질 (0.15): 모든 경력 항목의 시작일 유효
        if (expCount == 0) {
            score += 0.15; // 경력 없음은 신입 가능 — 감점 없음
        } else {
            boolean allDatesValid = Stream.concat(r.companyExps().stream(), r.projectExps().stream())
                    .allMatch(e -> e.startDate() != null && !e.startDate().isBlank());
            if (allDatesValid) score += 0.15;
        }

        return Math.round(score * 100.0) / 100.0;
    }

    // ─── Normalizers ─────────────────────────────────────────────────────────

    private String normalizeName(String name) {
        if (name == null || name.isBlank() || "이름미상".equals(name.trim())) return null;
        return name.trim();
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) return null;
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.length() == 11 && digits.startsWith("010")) {
            return digits.substring(0, 3) + "-" + digits.substring(3, 7) + "-" + digits.substring(7);
        }
        if (digits.length() == 10 && digits.startsWith("02")) {
            return digits.substring(0, 2) + "-" + digits.substring(2, 6) + "-" + digits.substring(6);
        }
        if (digits.length() == 10) {
            // 03X, 04X, 05X, 06X 지역번호
            return digits.substring(0, 3) + "-" + digits.substring(3, 6) + "-" + digits.substring(6);
        }
        return phone.trim();
    }

    private String validateEnum(String value, Set<String> valid) {
        if (value == null || value.isBlank()) return null;
        String upper = value.trim().toUpperCase();
        return valid.contains(upper) ? upper : null;
    }

    private Integer validateRate(Integer rate) {
        if (rate == null || rate <= 0 || rate > MAX_MONTHLY_RATE) return null;
        return rate;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) return null;
        String trimmed = email.trim().toLowerCase();
        return trimmed.matches("[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}") ? trimmed : null;
    }

    private String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private List<String> normalizeSkills(List<String> skills) {
        if (skills == null) return List.of();
        return skills.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(s -> {
                    String key = s.trim().toLowerCase();
                    return SKILL_MAP.getOrDefault(key, s.trim());
                })
                .distinct()
                .toList();
    }

    private List<ResumeAnalysisResult.Exp> validateExps(List<ResumeAnalysisResult.Exp> exps) {
        if (exps == null) return List.of();
        return exps.stream()
                .filter(e -> (e.projectName() != null && !e.projectName().isBlank())
                        || (e.companyName() != null && !e.companyName().isBlank()))
                .map(e -> {
                    String sd = e.startDate();
                    String ed = e.endDate();
                    if (sd != null && ed != null && sd.compareTo(ed) > 0) {
                        sd = e.endDate();
                        ed = e.startDate();
                    }
                    List<String> techStack = e.techStack() == null ? List.of()
                            : normalizeSkills(e.techStack().stream()
                                    .filter(t -> t != null && !t.isBlank())
                                    .map(String::trim)
                                    .toList());
                    return new ResumeAnalysisResult.Exp(
                            nullIfBlank(e.companyName()),
                            nullIfBlank(e.projectName()),
                            normalizeRole(e.role()),
                            sd, ed,
                            nullIfBlank(e.description()),
                            techStack
                    );
                })
                .toList();
    }

    /** 학력 전용 후처리: 고등학교 전공 제거, 학위 자동 추론 */
    private List<ResumeAnalysisResult.Exp> cleanEduExps(List<ResumeAnalysisResult.Exp> exps) {
        return validateExps(exps).stream().map(e -> {
            String school = e.companyName();
            String major  = e.projectName();
            String degree = e.role();

            // 전공이 학교명과 동일하면 제거 (LLM이 복사한 경우)
            if (school != null && school.equals(major)) major = null;

            if (school != null && school.contains("고등학교")) {
                major  = null;  // 고등학교는 전공 없음
                degree = null;  // 고등학교는 학위 없음
            } else if (degree == null || degree.equals("졸업")) {
                // 학위 미기재 시 학교명으로 추론
                if (school != null) {
                    if      (school.contains("대학원"))                          degree = "석사";
                    else if (school.contains("전문대학") || school.contains("전문학교")) degree = "전문학사";
                    else if (school.contains("대학교") || school.contains("대학"))     degree = "학사";
                }
            }

            return new ResumeAnalysisResult.Exp(school, major, degree,
                    e.startDate(), e.endDate(), e.description(), e.techStack());
        }).toList();
    }

    // 역할명 공백 정규화 (§4.1 직무명 매핑)
    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) return null;
        return role.trim().replaceAll("\\s+", " ");
    }
}

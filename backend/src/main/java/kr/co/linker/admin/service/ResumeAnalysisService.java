package kr.co.linker.admin.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.admin.dto.ResumeAnalysisResult;
import jakarta.annotation.PostConstruct;
import kr.co.linker.admin.domain.ResumeAnalysisLog;
import kr.co.linker.admin.repository.ResumeAnalysisLogRepository;
import kr.co.linker.common.ai.PromptLoader;
import kr.co.linker.common.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.form.PDFormXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.IBodyElement;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFPictureData;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

import org.springframework.http.converter.StringHttpMessageConverter;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeAnalysisService {

    private final ObjectMapper objectMapper;
    private final ResumeAnalysisLogRepository logRepository;
    private final PromptLoader promptLoader;
    private final ResumeAnalysisValidator validator;
    private final FileStorageService fileStorageService;
    private final ExecutorService executor = Executors.newFixedThreadPool(4);

    @Value("${linker.ai.gemini-api-key}")
    private String geminiApiKey;

    @Value("${linker.ai.llm-model:gemini-1.5-flash}")
    private String llmModel;

    @PostConstruct
    public void init() {
        log.info("================================================================");
        log.info("[AI_RESUME] 서버 기동: 최근 DB 저장된 분석 로그를 조회합니다.");
        logRepository.findAll().stream()
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .findFirst()
            .ifPresent(l -> {
                log.info("최근 분석 파일: {}", l.getFileName());
                log.info("분석 일시: {}", l.getCreatedAt());
                log.info("분석 원문(JSON):\n{}", l.getRawContent());
            });
        log.info("================================================================");
    }

    public List<ResumeAnalysisLog> getLogs() {
        return logRepository.findAll();
    }

    public ResumeAnalysisResult analyze(MultipartFile file) throws IOException {
        String fileName = file.getOriginalFilename();
        log.info("[AI_RESUME] 분석 시작: {}", fileName);

        byte[] fileBytes = file.getBytes();

        // 이력서 원본 파일을 스토리지에 업로드
        String ext = (fileName != null && fileName.contains("."))
                ? fileName.substring(fileName.lastIndexOf('.')) : "";
        String resumeKey = "resumes/" + UUID.randomUUID() + ext;
        try {
            String ct = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
            fileStorageService.uploadBytes(resumeKey, fileBytes, ct);
            log.info("[AI_RESUME] 이력서 업로드 완료: {}", resumeKey);
        } catch (Exception e) {
            log.warn("[AI_RESUME] 이력서 업로드 실패, 분석은 계속 진행: {}", e.getMessage());
            resumeKey = null;
        }

        // §5.1 파일 해시 캐싱 — 동일 파일 재업로드 시 API 호출 생략
        String hash = computeHash(fileBytes);
        if (hash != null) {
            var cached = logRepository.findFirstByFileHashOrderByCreatedAtDesc(hash);
            if (cached.isPresent()) {
                log.info("[AI_RESUME] 캐시 히트 (hash={}...) — 저장된 결과 반환", hash.substring(0, 8));
                try {
                    ResumeAnalysisResult r = objectMapper.readValue(cached.get().getRawContent(), ResumeAnalysisResult.class);
                    // 캐시된 이름이 블랙리스트 단어면 재분석
                    if (r.name() != null && !r.name().isBlank() && RESUME_SECTION_HEADERS.contains(r.name())) {
                        log.info("[AI_RESUME] 캐시 이름 무효 ({}), 재분석 진행", r.name());
                    } else if ((r.skills() == null || r.skills().isEmpty()) && r.phone() == null) {
                        log.info("[AI_RESUME] 캐시 데이터 불충분(스킬/연락처 누락), 재분석 진행");
                    } else {
                        return new ResumeAnalysisResult(
                                r.name(), r.nameEn(), r.phone(), r.workType(), r.desiredRate(),
                                r.category(), r.field(), r.skills(), r.birthDate(),
                                r.email(), r.address(), r.skillGrade(), r.title(),
                                r.educations(), r.companyExps(), r.projectExps(), r.certifications(),
                                r.trainings(), r.itCareerMonths(), r.photoKey(), resumeKey,
                                r.confidenceScore(), r.needsManualReview());
                    }
                } catch (Exception e) {
                    log.warn("[AI_RESUME] 캐시 역직렬화 실패, 재분석 진행", e);
                }
            }
        }

        String text = extractText(file, fileBytes);
        if (text.isBlank()) {
            log.warn("[AI_RESUME] 텍스트 추출 실패: {}", fileName);
            return emptyResult(resumeKey);
        }
        log.info("[AI_RESUME] 텍스트 추출 성공 ({}자)", text.length());

        String truncated = text.length() > 15000 ? text.substring(0, 15000) : text;

        String fname = Objects.requireNonNullElse(file.getOriginalFilename(), "").toLowerCase();
        CompletableFuture<String>              photoFuture   = CompletableFuture.supplyAsync(() -> extractPhoto(fname, fileBytes), executor);
        CompletableFuture<ResumeAnalysisResult> basicFuture   = CompletableFuture.supplyAsync(() -> parseBasicInfo(truncated),  executor);
        CompletableFuture<ResumeAnalysisResult> eduCertFuture = CompletableFuture.supplyAsync(() -> parseEduCert(truncated),    executor);
        CompletableFuture<ResumeAnalysisResult> companyFuture = CompletableFuture.supplyAsync(() -> parseCompanyExp(truncated), executor);
        CompletableFuture<ResumeAnalysisResult> projectFuture = CompletableFuture.supplyAsync(() -> parseProjectExp(truncated), executor);

        CompletableFuture.allOf(photoFuture, basicFuture, eduCertFuture, companyFuture, projectFuture).join();

        String photoKey = getSafeString(photoFuture);
        ResumeAnalysisResult basic   = getSafe(basicFuture);
        ResumeAnalysisResult eduCert = getSafe(eduCertFuture);
        ResumeAnalysisResult company = getSafe(companyFuture);
        ResumeAnalysisResult project = getSafe(projectFuture);

        ResumeAnalysisResult merged    = mergeResults(basic, eduCert, company, project, photoKey, resumeKey);
        ResumeAnalysisResult validated = validator.validate(normalizeDates(merged));

        saveToLog(fileName, hash, validated);

        if (Boolean.TRUE.equals(validated.needsManualReview())) {
            log.warn("[AI_RESUME] 수동 검수 필요 — 신뢰도={} fileName={}", validated.confidenceScore(), fileName);
        }

        return validated;
    }

    public ResumeAnalysisResult analyzeText(String text) {
        if (text == null || text.isBlank()) {
            log.warn("[AI_RESUME] 빈 텍스트 입력");
            return emptyResult();
        }
        log.info("[AI_RESUME] 텍스트 직접 분석 시작 ({}자)", text.length());

        String truncated = text.length() > 15000 ? text.substring(0, 15000) : text;

        CompletableFuture<ResumeAnalysisResult> basicFuture   = CompletableFuture.supplyAsync(() -> parseBasicInfo(truncated),  executor);
        CompletableFuture<ResumeAnalysisResult> eduCertFuture = CompletableFuture.supplyAsync(() -> parseEduCert(truncated),    executor);
        CompletableFuture<ResumeAnalysisResult> companyFuture = CompletableFuture.supplyAsync(() -> parseCompanyExp(truncated), executor);
        CompletableFuture<ResumeAnalysisResult> projectFuture = CompletableFuture.supplyAsync(() -> parseProjectExp(truncated), executor);

        CompletableFuture.allOf(basicFuture, eduCertFuture, companyFuture, projectFuture).join();

        ResumeAnalysisResult basic   = getSafe(basicFuture);
        ResumeAnalysisResult eduCert = getSafe(eduCertFuture);
        ResumeAnalysisResult company = getSafe(companyFuture);
        ResumeAnalysisResult project = getSafe(projectFuture);

        ResumeAnalysisResult merged    = mergeResults(basic, eduCert, company, project, null, null);
        ResumeAnalysisResult validated = validator.validate(normalizeDates(merged));

        saveToLog("Pasted Text", null, validated);

        return validated;
    }

    // ─── Parsing methods ──────────────────────────────────────────────────────

    private ResumeAnalysisResult parseBasicInfo(String text) {
        String prompt = promptLoader.load("resume-basic-info", Map.of("resumeText", text));
        ResumeAnalysisResult res = callGemini(prompt);
        if (res.name() == null || res.name().isBlank() || RESUME_SECTION_HEADERS.contains(res.name())) {
            String fallbackName = findNameInText(text);
            res = new ResumeAnalysisResult(fallbackName, res.nameEn(), res.phone(), res.workType(), res.desiredRate(),
                    res.category(), res.field(), res.skills(), res.birthDate(), res.email(),
                    res.address(), res.skillGrade(), res.title(), res.educations(), res.companyExps(),
                    res.projectExps(), res.certifications(), res.trainings(), res.itCareerMonths(), null, null, null, false);
        }
        return res;
    }

    private ResumeAnalysisResult parseEduCert(String text) {
        String prompt = promptLoader.load("resume-edu-cert", Map.of("resumeText", text));
        return callGemini(prompt);
    }

    private ResumeAnalysisResult parseCompanyExp(String text) {
        String prompt = promptLoader.load("resume-company-exp", Map.of("resumeText", text));
        return callGemini(prompt);
    }

    private ResumeAnalysisResult parseProjectExp(String text) {
        String prompt = promptLoader.load("resume-project-exp", Map.of("resumeText", text));
        return callGemini(prompt);
    }

    // ─── Result assembly ──────────────────────────────────────────────────────

    private ResumeAnalysisResult mergeResults(ResumeAnalysisResult basic, ResumeAnalysisResult eduCert,
                                               ResumeAnalysisResult company, ResumeAnalysisResult project,
                                               String photoKey, String resumeKey) {
        return new ResumeAnalysisResult(
                basic.name(),
                basic.nameEn(),
                basic.phone(),
                basic.workType(),
                basic.desiredRate(),
                basic.category(),
                basic.field(),
                basic.skills(),
                basic.birthDate(),
                basic.email(),
                basic.address(),
                basic.skillGrade(),
                basic.title(),
                eduCert.educations(),
                company.companyExps(),
                project.projectExps(),
                eduCert.certifications(),
                eduCert.trainings(),
                basic.itCareerMonths(),
                photoKey,
                resumeKey,
                null,
                false
        );
    }

    private ResumeAnalysisResult normalizeDates(ResumeAnalysisResult res) {
        if (res == null) return emptyResult();

        java.util.function.Function<ResumeAnalysisResult.Exp, ResumeAnalysisResult.Exp> fixExp = e -> {
            String sd = formatDate(e.startDate());
            String ed = isOngoing(e.endDate()) ? null : formatDate(e.endDate());

            if (sd == null || sd.isBlank()) {
                try {
                    java.time.LocalDate base = (ed != null && !ed.isBlank())
                            ? java.time.LocalDate.parse(ed) : java.time.LocalDate.now();
                    sd = base.minusYears(1).toString();
                } catch (Exception ex) {
                    sd = "2000-01-01";
                }
            }
            return new ResumeAnalysisResult.Exp(e.companyName(), e.projectName(), e.role(),
                    sd, ed, e.description(), e.techStack());
        };

        var normalizedCompany = res.companyExps().stream().map(fixExp).toList();
        var normalizedProject = res.projectExps().stream().map(fixExp).toList();
        int computed = computeItCareerMonths(normalizedCompany, normalizedProject);
        Integer itCareerMonths;
        if (computed > 0) {
            itCareerMonths = computed;
        } else {
            itCareerMonths = res.itCareerMonths();
        }

        return new ResumeAnalysisResult(
                res.name(),
                res.nameEn(),
                res.phone(),
                res.workType(),
                res.desiredRate(),
                res.category(),
                res.field(),
                res.skills(),
                formatDate(res.birthDate()),
                res.email(),
                res.address(),
                res.skillGrade(),
                res.title(),
                res.educations().stream().map(fixExp).toList(),
                normalizedCompany,
                normalizedProject,
                res.certifications().stream().map(fixExp).toList(),
                res.trainings().stream().map(fixExp).toList(),
                itCareerMonths,
                res.photoKey(),
                res.resumeKey(),
                null,
                false
        );
    }

    private int computeItCareerMonths(List<ResumeAnalysisResult.Exp> companyExps,
                                       List<ResumeAnalysisResult.Exp> projectExps) {
        var now = java.time.LocalDate.now();
        var intervals = java.util.stream.Stream.concat(companyExps.stream(), projectExps.stream())
                .filter(e -> e.startDate() != null && !e.startDate().isBlank())
                .map(e -> {
                    try {
                        long s = java.time.LocalDate.parse(e.startDate()).toEpochDay();
                        java.time.LocalDate end = (e.endDate() == null || e.endDate().isBlank())
                                ? now : java.time.LocalDate.parse(e.endDate());
                        long en = end.toEpochDay();
                        return s < en ? new long[]{s, en} : null;
                    } catch (Exception ex) { return null; }
                })
                .filter(java.util.Objects::nonNull)
                .sorted(java.util.Comparator.comparingLong(a -> a[0]))
                .collect(java.util.stream.Collectors.toCollection(java.util.ArrayList::new));

        if (intervals.isEmpty()) return 0;

        var merged = new java.util.ArrayList<long[]>();
        long[] cur = intervals.get(0);
        for (int i = 1; i < intervals.size(); i++) {
            long[] nx = intervals.get(i);
            if (nx[0] <= cur[1]) cur[1] = Math.max(cur[1], nx[1]);
            else { merged.add(cur); cur = nx; }
        }
        merged.add(cur);

        int total = 0;
        for (long[] iv : merged) {
            total += (int) java.time.temporal.ChronoUnit.MONTHS.between(
                    java.time.LocalDate.ofEpochDay(iv[0]), java.time.LocalDate.ofEpochDay(iv[1]));
        }
        return total;
    }

    private boolean isOngoing(String endDate) {
        if (endDate == null) return false;
        String val = endDate.trim();
        return val.equals("현재") || val.equals("재직중") || val.equals("현 재")
                || val.equals("수행중") || val.equals("진행중") || val.equals("-")
                || val.equalsIgnoreCase("present");
    }

    // ─── Text extraction ──────────────────────────────────────────────────────

    private String extractText(MultipartFile file, byte[] fileBytes) throws IOException {
        String name = Objects.requireNonNullElse(file.getOriginalFilename(), "").toLowerCase();
        if (name.endsWith(".pdf")) {
            String text = extractPdf(fileBytes);
            if (text == null || text.trim().length() < 50) {
                log.info("[AI_RESUME] PDF 텍스트가 없거나 매우 적음 (scanned PDF 의심), OCR/Vision 추출 시도");
                return extractTextFromImageOrPdf(fileBytes, "application/pdf");
            }
            return text;
        } else if (name.endsWith(".docx")) {
            return extractDocx(file);
        } else if (name.endsWith(".doc")) {
            return extractDoc(fileBytes);
        } else if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp")) {
            log.info("[AI_RESUME] 이미지 파일 감지, OCR/Vision 추출 시도");
            return extractTextFromImageOrPdf(fileBytes, file.getContentType());
        } else {
            return new String(fileBytes, StandardCharsets.UTF_8);
        }
    }

    private String extractPdf(byte[] bytes) {
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(doc);
            return text == null ? "" : joinFragmentedKorean(text);
        } catch (Exception e) {
            log.warn("[AI_RESUME] PDF 텍스트 추출 실패: {}", e.getMessage());
            return "";
        }
    }

    /**
     * 좁은 테이블 셀로 인해 "부 경 대 학 교", "전 기 공 학 과" 처럼
     * 한글 한 글자씩 공백으로 분리된 경우를 원래 단어로 복원한다.
     * 조건: 단일 한글 글자 3개 이상이 한 칸 공백으로 연속될 때만 적용.
     */
    private String joinFragmentedKorean(String text) {
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("[가-힣]( [가-힣]){2,}");
        java.util.regex.Matcher m = p.matcher(text);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            m.appendReplacement(sb, m.group().replace(" ", ""));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    // §1.2 DOCX 테이블 인식 개선 — 단락과 표를 문서 순서대로 추출
    private String extractDocx(MultipartFile file) {
        try (XWPFDocument doc = new XWPFDocument(file.getInputStream())) {
            StringBuilder sb = new StringBuilder();

            // 텍스트 박스 (v:textbox) 먼저 추출 — 이름·연락처가 여기에 위치하는 경우 많음
            // w: 네임스페이스도 함께 선언해야 XmlBeans XPath 오류 없음
            final String XPATH_TEXTBOX =
                "declare namespace v='urn:schemas-microsoft-com:vml' " +
                "declare namespace w='http://schemas.openxmlformats.org/wordprocessingml/2006/main' " +
                ".//v:textbox//w:t";
            for (XWPFParagraph para : doc.getParagraphs()) {
                for (var run : para.getRuns()) {
                    try {
                        org.apache.xmlbeans.XmlObject[] textBoxes = run.getCTR().selectPath(XPATH_TEXTBOX);
                        for (org.apache.xmlbeans.XmlObject obj : textBoxes) {
                            String t = obj.newCursor().getTextValue();
                            if (t != null && !t.isBlank()) sb.append(t).append(" ");
                        }
                    } catch (Exception ignored) {}
                }
            }
            if (sb.length() > 0) sb.append("\n");

            // 본문 단락·표 추출
            for (IBodyElement element : doc.getBodyElements()) {
                if (element instanceof XWPFParagraph para) {
                    String text = para.getText();
                    if (text != null && !text.isBlank()) sb.append(text).append("\n");
                } else if (element instanceof XWPFTable table) {
                    for (XWPFTableRow row : table.getRows()) {
                        String rowText = row.getTableCells().stream()
                                .map(cell -> cell.getText().trim())
                                .filter(t -> !t.isEmpty())
                                .collect(Collectors.joining("\t"));
                        if (!rowText.isBlank()) sb.append(rowText).append("\n");
                    }
                }
            }
            return sb.toString();
        } catch (Exception e) {
            log.warn("[AI_RESUME] DOCX 텍스트 추출 실패: {}", e.getMessage());
            return "";
        }
    }

    // §1.3 DOC(구형 Word 바이너리) 텍스트 추출 — HWPFDocument 사용
    private String extractDoc(byte[] fileBytes) {
        try (org.apache.poi.hwpf.HWPFDocument doc =
                     new org.apache.poi.hwpf.HWPFDocument(new java.io.ByteArrayInputStream(fileBytes))) {
            org.apache.poi.hwpf.extractor.WordExtractor extractor =
                    new org.apache.poi.hwpf.extractor.WordExtractor(doc);
            String text = extractor.getText();
            extractor.close();
            return text == null ? "" : text;
        } catch (Exception e) {
            log.warn("[AI_RESUME] DOC 텍스트 추출 실패: {}", e.getMessage());
            return "";
        }
    }

    // ─── Gemini API ───────────────────────────────────────────────────────────

    private ResumeAnalysisResult callGemini(String prompt) {
        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(10000);
            factory.setReadTimeout(180000);
            RestTemplate restTemplate = new RestTemplate(factory);
            restTemplate.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));

            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + llmModel + ":generateContent?key=" + geminiApiKey;

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json; charset=utf-8");
            headers.setAccept(List.of(org.springframework.http.MediaType.APPLICATION_JSON));

            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(requestBody, headers), String.class);
            String responseBody = response.getBody();
            if (responseBody == null) return emptyResult();

            @SuppressWarnings("unchecked")
            Map<String, Object> body = objectMapper.readValue(responseBody, Map.class);
            if (!body.containsKey("candidates")) return emptyResult();

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String jsonStr = (String) parts.get(0).get("text");

            String cleanJson = jsonStr.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            int start = cleanJson.indexOf('{');
            int end   = cleanJson.lastIndexOf('}');
            if (start >= 0 && end > start) cleanJson = cleanJson.substring(start, end + 1);

            log.debug("[AI_RESUME] 추출 성공: {}", cleanJson);
            return objectMapper.readValue(cleanJson, ResumeAnalysisResult.class);
        } catch (Exception e) {
            log.error("[AI_RESUME] Gemini API 호출 또는 파싱 실패 — 빈 결과 반환", e);
            return emptyResult();
        }
    }

    private String extractTextFromImageOrPdf(byte[] bytes, String mimeType) {
        try {
            String base64 = Base64.getEncoder().encodeToString(bytes);
            String mt = mimeType != null ? mimeType : "image/jpeg";
            String prompt = promptLoader.load("resume-ocr", Map.of());

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of("parts", List.of(
                            Map.of("text", prompt),
                            Map.of("inlineData", Map.of("mimeType", mt, "data", base64))
                    ))));

            String text = callGeminiApiForText(requestBody);
            return text != null ? text : "";
        } catch (Exception e) {
            log.error("[AI_RESUME] 이미지/PDF OCR Vision 추출 실패", e);
            return "";
        }
    }

    private String callGeminiApiForText(Map<String, Object> requestBody) {
        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(10000);
            factory.setReadTimeout(180000);
            RestTemplate restTemplate = new RestTemplate(factory);
            restTemplate.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));

            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + llmModel + ":generateContent?key=" + geminiApiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json; charset=utf-8");
            headers.setAccept(List.of(org.springframework.http.MediaType.APPLICATION_JSON));

            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(requestBody, headers), String.class);
            String responseBody = response.getBody();
            if (responseBody == null) return null;

            @SuppressWarnings("unchecked")
            Map<String, Object> body = objectMapper.readValue(responseBody, Map.class);
            if (!body.containsKey("candidates")) return null;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            log.error("[AI_RESUME] Gemini API 텍스트 추출 호출 실패", e);
            return null;
        }
    }

    // ─── Utilities ────────────────────────────────────────────────────────────

    private ResumeAnalysisResult emptyResult() {
        return emptyResult(null);
    }

    private ResumeAnalysisResult emptyResult(String resumeKey) {
        return new ResumeAnalysisResult(null, null, null, null, null, null, null, List.of(),
                null, null, null, null, null, List.of(), List.of(), List.of(), List.of(), List.of(), null, null, resumeKey, null, false);
    }

    private ResumeAnalysisResult getSafe(CompletableFuture<ResumeAnalysisResult> future) {
        try {
            return future.get();
        } catch (Exception e) {
            log.error("[AI_RESUME] 부분 추출 실패", e);
            return emptyResult();
        }
    }

    private String getSafeString(CompletableFuture<String> future) {
        try {
            return future.get();
        } catch (Exception e) {
            log.warn("[AI_RESUME] 사진 추출 실패", e);
            return null;
        }
    }

    // ─── Photo extraction ─────────────────────────────────────────────────────

    private String extractPhoto(String fileName, byte[] fileBytes) {
        try {
            if (fileName.endsWith(".pdf"))  return extractPhotoFromPdf(fileBytes);
            if (fileName.endsWith(".docx")) return extractPhotoFromDocx(fileBytes);
        } catch (Exception e) {
            log.warn("[AI_RESUME] 사진 추출 중 오류: {}", e.getMessage());
        }
        return null;
    }

    private String extractPhotoFromPdf(byte[] bytes) {
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            int pages = Math.min(2, doc.getNumberOfPages());
            for (int i = 0; i < pages; i++) {
                String key = findPhotoInResources(doc.getPage(i).getResources());
                if (key != null) return key;
            }
        } catch (Exception e) {
            log.warn("[AI_RESUME] PDF 사진 추출 실패: {}", e.getMessage());
        }
        return null;
    }

    private String findPhotoInResources(PDResources resources) {
        if (resources == null) return null;
        byte[] best = null;
        double bestScore = 0;
        try {
            for (COSName name : resources.getXObjectNames()) {
                PDXObject xobj = resources.getXObject(name);
                if (xobj instanceof PDImageXObject image) {
                    int w = image.getWidth();
                    int h = image.getHeight();
                    if (h > w && w >= 40 && h >= 40 && w <= 600 && h <= 900) {
                        double score = (double) Math.min(h, 900) / Math.max(w, 1) * w;
                        if (score > bestScore) {
                            bestScore = score;
                            best = imageToJpeg(image.getImage());
                        }
                    }
                } else if (xobj instanceof PDFormXObject form) {
                    String inner = findPhotoInResources(form.getResources());
                    if (inner != null) return inner;
                }
            }
        } catch (Exception e) {
            log.warn("[AI_RESUME] XObject 탐색 실패: {}", e.getMessage());
        }
        return best != null ? uploadPhoto(best) : null;
    }

    private String extractPhotoFromDocx(byte[] bytes) {
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            byte[] best = null;
            double bestScore = 0;
            for (XWPFPictureData pic : doc.getAllPictures()) {
                try {
                    BufferedImage img = ImageIO.read(new ByteArrayInputStream(pic.getData()));
                    if (img == null) continue;
                    int w = img.getWidth();
                    int h = img.getHeight();
                    if (h > w && w >= 40 && h >= 40 && w <= 600 && h <= 900) {
                        double score = (double) Math.min(h, 900) / Math.max(w, 1) * w;
                        if (score > bestScore) {
                            bestScore = score;
                            best = imageToJpeg(img);
                        }
                    }
                } catch (Exception ignored) {}
            }
            if (best != null) return uploadPhoto(best);
        } catch (Exception e) {
            log.warn("[AI_RESUME] DOCX 사진 추출 실패: {}", e.getMessage());
        }
        return null;
    }

    private byte[] imageToJpeg(BufferedImage img) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "jpg", baos);
        return baos.toByteArray();
    }

    private String uploadPhoto(byte[] jpegBytes) {
        String key = "talent-photos/" + UUID.randomUUID() + ".jpg";
        fileStorageService.uploadBytes(key, jpegBytes, "image/jpeg");
        log.info("[AI_RESUME] 사진 업로드 완료: {}", key);
        return key;
    }

    private String formatDate(String date) {
        if (date == null || date.isBlank()) return date;
        String trimmed = date.trim();
        if (trimmed.matches("\\d{6}")) {
            int yy = Integer.parseInt(trimmed.substring(0, 2));
            String year = (yy > 50 ? "19" : "20") + String.format("%02d", yy);
            return year + "-" + trimmed.substring(2, 4) + "-" + trimmed.substring(4, 6);
        }
        if (trimmed.matches("\\d{8}")) {
            return trimmed.substring(0, 4) + "-" + trimmed.substring(4, 6) + "-" + trimmed.substring(6, 8);
        }
        String clean = date.replaceAll("[^0-9]", "-").replaceAll("-+", "-");
        if (clean.startsWith("-")) clean = clean.substring(1);
        if (clean.endsWith("-"))   clean = clean.substring(0, clean.length() - 1);

        String[] parts = clean.split("-");
        if (parts.length >= 2) {
            String year  = parts[0];
            if (year.length() == 2) year = (Integer.parseInt(year) > 50 ? "19" : "20") + year;
            String month = parts[1].length() == 1 ? "0" + parts[1] : parts[1];
            String day   = parts.length >= 3 ? (parts[2].length() == 1 ? "0" + parts[2] : parts[2]) : "01";
            return year + "-" + month + "-" + day;
        }
        return date;
    }

    private static final java.util.Set<String> RESUME_SECTION_HEADERS = java.util.Set.of(
        "경력기술", "경력사항", "경력소개", "기술스택", "기술역량", "기술요약",
        "기본정보", "인적사항", "학력사항", "학력",
        "자격증", "자격사항", "수상내역", "교육사항",
        "프로젝트", "수행이력", "업무경험", "주요경력",
        "이력서", "소개", "요약", "자기소개",
        "프로필", "씽클레어", "기술경력", "기술경력서", "경력소개서",
        "신상기록", "연락처", "생년월일", "주소", "이메일",
        "희망단가", "희망연봉", "기술등급", "직위", "직급"
    );

    private String findNameInText(String text) {
        if (text == null || text.isBlank()) return null;
        String top = text.substring(0, Math.min(text.length(), 800));

        // Priority 1: "성명"/"성 명"/"이름" 레이블 뒤 값 추출
        java.util.regex.Matcher labelMatcher = java.util.regex.Pattern.compile(
            "(?:성\\s*명|이\\s*름)[^가-힣]*([가-힣][가-힣 ]{0,9}[가-힣])"
        ).matcher(top);
        if (labelMatcher.find()) {
            String compact = labelMatcher.group(1).trim().replaceAll("\\s+", "");
            if (compact.length() >= 2 && compact.length() <= 5 && !RESUME_SECTION_HEADERS.contains(compact)) {
                return compact;
            }
        }

        // Priority 2: 공백으로 분리된 낱자 한글 이름 ("박 창 훈" → "박창훈")
        java.util.regex.Matcher spacedMatcher = java.util.regex.Pattern.compile(
            "([가-힣]) ([가-힣]) ([가-힣])"
        ).matcher(top);
        while (spacedMatcher.find()) {
            String candidate = spacedMatcher.group(1) + spacedMatcher.group(2) + spacedMatcher.group(3);
            if (!RESUME_SECTION_HEADERS.contains(candidate)) {
                return candidate;
            }
        }

        // Priority 3: 상단 200자 내 연속 한글 2~4자
        String header = top.substring(0, Math.min(top.length(), 200));
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("([가-힣]{2,4})").matcher(header);
        while (m.find()) {
            String candidate = m.group(1);
            if (!RESUME_SECTION_HEADERS.contains(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    // §5.1 파일 SHA-256 해시 계산
    private String computeHash(byte[] bytes) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(bytes);
            StringBuilder sb = new StringBuilder(64);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            log.warn("[AI_RESUME] 해시 계산 실패", e);
            return null;
        }
    }

    private void saveToLog(String fileName, String hash, ResumeAnalysisResult result) {
        try {
            String json = objectMapper.writeValueAsString(result);
            logRepository.save(ResumeAnalysisLog.builder()
                    .fileName(fileName)
                    .fileHash(hash)
                    .rawContent(json)
                    .build());
            log.info("[AI_RESUME] 분석 결과 DB 저장 완료: {}", fileName);
        } catch (Exception e) {
            log.error("[AI_RESUME] 분석 결과 DB 저장 실패", e);
        }
    }
}

package kr.co.linker.admin.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.admin.dto.ContractorDocumentResult;
import kr.co.linker.common.ai.PromptLoader;
import kr.co.linker.common.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContractorDocumentService {

    private final ObjectMapper objectMapper;
    private final PromptLoader promptLoader;
    private final FileStorageService fileStorageService;

    @Value("${linker.ai.gemini-api-key}")
    private String geminiApiKey;

    @Value("${linker.ai.llm-model:gemini-1.5-flash}")
    private String llmModel;

    public ContractorDocumentResult analyzeAndUpload(MultipartFile file, String labelName) {
        String originalFilename = file.getOriginalFilename();
        String ext = (originalFilename != null && originalFilename.contains("."))
                ? originalFilename.substring(originalFilename.lastIndexOf('.')) : "";
        String key = "contractor-docs/" + UUID.randomUUID() + ext;

        // 스토리지 업로드
        try {
            String ct = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
            fileStorageService.uploadBytes(key, file.getBytes(), ct);
        } catch (Exception e) {
            log.warn("[CONTRACTOR_DOC] 파일 업로드 실패: {}", e.getMessage());
            return new ContractorDocumentResult(null, null, null, null, key, labelName);
        }

        // AI 분석
        try {
            byte[] bytes = file.getBytes();
            String lowerName = (originalFilename != null ? originalFilename : "").toLowerCase();
            boolean isImage = lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")
                    || lowerName.endsWith(".png") || lowerName.endsWith(".webp");

            String json;
            if (isImage) {
                json = callGeminiVision(bytes, file.getContentType());
            } else {
                String text = extractText(bytes, lowerName);
                if (text == null || text.isBlank()) {
                    log.warn("[CONTRACTOR_DOC] 텍스트 추출 실패");
                    return new ContractorDocumentResult(null, null, null, null, key, labelName);
                }
                String truncated = text.length() > 6000 ? text.substring(0, 6000) : text;
                String prompt = promptLoader.load("contractor-doc-analyze", Map.of("documentText", truncated));
                json = callGeminiText(prompt);
            }

            if (json == null) return new ContractorDocumentResult(null, null, null, null, key, labelName);

            @SuppressWarnings("unchecked")
            Map<String, Object> result = objectMapper.readValue(json, Map.class);
            String registrationNo = getString(result, "registrationNo");
            String phone          = getString(result, "phone");
            String bankName       = getString(result, "bankName");
            String bankAccount    = getString(result, "bankAccount");

            log.info("[CONTRACTOR_DOC] 분석 완료 key={} regNo={} phone={}", key, registrationNo, phone);
            return new ContractorDocumentResult(registrationNo, phone, bankName, bankAccount, key, labelName);

        } catch (Exception e) {
            log.error("[CONTRACTOR_DOC] AI 분석 실패", e);
            return new ContractorDocumentResult(null, null, null, null, key, labelName);
        }
    }

    private String extractText(byte[] bytes, String lowerName) {
        try {
            if (lowerName.endsWith(".pdf")) {
                try (PDDocument doc = Loader.loadPDF(bytes)) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    stripper.setSortByPosition(true);
                    return stripper.getText(doc);
                }
            }
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("[CONTRACTOR_DOC] 텍스트 추출 실패: {}", e.getMessage());
            return null;
        }
    }

    private String callGeminiVision(byte[] imageBytes, String mimeType) {
        try {
            String base64 = Base64.getEncoder().encodeToString(imageBytes);
            String mt = mimeType != null ? mimeType : "image/jpeg";

            String textPart = "이 문서(사업자등록증 또는 통장사본)에서 사업자등록번호, 전화번호, 은행명, 계좌번호를 추출하여 JSON으로만 반환하라. " +
                    "형식: {\"registrationNo\":null,\"phone\":null,\"bankName\":null,\"bankAccount\":null} — JSON만 출력, 설명 금지.";

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of("parts", List.of(
                            Map.of("text", textPart),
                            Map.of("inlineData", Map.of("mimeType", mt, "data", base64))
                    ))));

            return callGeminiApi(requestBody);
        } catch (Exception e) {
            log.error("[CONTRACTOR_DOC] Gemini Vision 실패", e);
            return null;
        }
    }

    private String callGeminiText(String prompt) {
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
        return callGeminiApi(requestBody);
    }

    private String callGeminiApi(Map<String, Object> requestBody) {
        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(10_000);
            factory.setReadTimeout(60_000);
            org.springframework.web.client.RestTemplate restTemplate =
                    new org.springframework.web.client.RestTemplate(factory);
            restTemplate.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));

            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + llmModel + ":generateContent?key=" + geminiApiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json; charset=utf-8");
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            ResponseEntity<String> response = new org.springframework.web.client.RestTemplate(factory)
                    .exchange(url, HttpMethod.POST, new HttpEntity<>(requestBody, headers), String.class);

            String body = response.getBody();
            if (body == null) return null;

            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = objectMapper.readValue(body, Map.class);
            if (!parsed.containsKey("candidates")) return null;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) parsed.get("candidates");
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String jsonStr = (String) parts.get(0).get("text");

            String clean = jsonStr.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            int start = clean.indexOf('{');
            int end = clean.lastIndexOf('}');
            if (start >= 0 && end > start) clean = clean.substring(start, end + 1);
            return clean;
        } catch (Exception e) {
            log.error("[CONTRACTOR_DOC] Gemini API 실패", e);
            return null;
        }
    }

    private String getString(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null || "null".equals(v.toString())) return null;
        String s = v.toString().trim();
        return s.isBlank() ? null : s;
    }
}

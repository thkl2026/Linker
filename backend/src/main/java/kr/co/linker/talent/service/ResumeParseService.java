package kr.co.linker.talent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.common.ai.LinkerChatModel;
import kr.co.linker.common.ai.PromptLoader;
import kr.co.linker.common.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/**
 * 이력서 파싱 서비스 (F-1.1)
 *
 * <p>MinIO에서 파일을 다운로드하여 텍스트를 추출하고,
 * Gemini LLM으로 구조화된 JSON을 생성한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeParseService {

    private final LinkerChatModel chatLanguageModel;
    private final FileStorageService fileStorageService;
    private final PromptLoader promptLoader;
    private final ObjectMapper objectMapper;

    public Map<String, Object> parse(String fileKey) {
        log.info("[RESUME_PARSE_START] fileKey={}", fileKey);

        String resumeText = downloadAndExtractText(fileKey);
        String prompt = promptLoader.load("resume-parse", Map.of("resumeText", resumeText));
        String llmResponse = chatLanguageModel.chat(prompt);

        log.debug("[RESUME_PARSE_LLM_RESPONSE] fileKey={} length={}", fileKey, llmResponse.length());
        return parseJson(llmResponse, fileKey);
    }

    private String downloadAndExtractText(String fileKey) {
        String downloadUrl = fileStorageService.generateDownloadUrl(fileKey, Duration.ofMinutes(5));
        try {
            URL url = URI.create(downloadUrl).toURL();
            try (InputStream is = url.openStream()) {
                byte[] bytes = is.readAllBytes();
                String lower = fileKey.toLowerCase();

                if (lower.endsWith(".pdf")) {
                    return extractPdf(bytes);
                } else if (lower.endsWith(".docx")) {
                    return extractDocx(bytes);
                } else if (lower.endsWith(".doc")) {
                    return extractDoc(bytes);
                }
                return new String(bytes, StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            log.warn("[RESUME_TEXT_EXTRACT_FAILED] fileKey={} error={}", fileKey, e.getMessage());
            return "(파일 텍스트 추출 실패)";
        }
    }

    private String extractPdf(byte[] bytes) {
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(doc);
            if (text != null && !text.isBlank()) { return text; }
        } catch (Exception e) {
            log.warn("[RESUME_PDF_EXTRACT_FAILED] {}", e.getMessage());
        }
        return "(PDF 텍스트 추출 실패)";
    }

    private String extractDocx(byte[] bytes) {
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes));
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            String text = extractor.getText();
            if (text != null && !text.isBlank()) return text;
        } catch (Exception e) {
            log.warn("[RESUME_DOCX_EXTRACT_FAILED] {}", e.getMessage());
        }
        return "(DOCX 텍스트 추출 실패)";
    }

    private String extractDoc(byte[] bytes) {
        try (HWPFDocument doc = new HWPFDocument(new ByteArrayInputStream(bytes));
             WordExtractor extractor = new WordExtractor(doc)) {
            String text = extractor.getText();
            if (text != null && !text.isBlank()) return text;
        } catch (Exception e) {
            log.warn("[RESUME_DOC_EXTRACT_FAILED] {}", e.getMessage());
        }
        return "(DOC 텍스트 추출 실패)";
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String llmResponse, String fileKey) {
        String json = extractJsonBlock(llmResponse);
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            log.error("[RESUME_PARSE_JSON_ERROR] fileKey={} raw={}", fileKey, llmResponse);
            return Map.of("error", "JSON 파싱 실패", "raw", llmResponse);
        }
    }

    private String extractJsonBlock(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        return (start >= 0 && end > start) ? text.substring(start, end + 1) : text;
    }
}

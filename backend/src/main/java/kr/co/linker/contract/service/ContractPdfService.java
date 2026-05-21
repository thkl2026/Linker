package kr.co.linker.contract.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.*;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import kr.co.linker.contract.domain.Contract;
import kr.co.linker.talent.domain.TalentProfile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

/**
 * 계약서 PDF 생성 서비스 (F-3.1)
 *
 * <p>OpenPDF 기반 단순 계약서 PDF를 생성한다.
 * AI 공백기간 분석(gapPeriods, GAP riskFlags)은 PDF에 포함하지 않는다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContractPdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy년 MM월 dd일");

    private final ObjectMapper objectMapper;

    /**
     * 계약 엔티티와 인력 프로필로부터 PDF 바이트 배열을 생성한다.
     *
     * @param contract 계약 엔티티
     * @param talent   인력 프로필 (null 허용 — 없으면 전문가 섹션 생략)
     * @return PDF 바이트 배열
     */
    public byte[] generate(Contract contract, @Nullable TalentProfile talent) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 60, 60, 80, 60);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = buildFont(18, Font.BOLD);
            Font headFont  = buildFont(12, Font.BOLD);
            Font bodyFont  = buildFont(11, Font.NORMAL);

            Paragraph title = new Paragraph("IT 외주 용역 계약서", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            if (talent != null) {
                Paragraph talentTitle = new Paragraph("전문가 정보\n", headFont);
                document.add(talentTitle);
                document.add(buildTalentTable(talent, headFont, bodyFont));
            }

            Paragraph contractTitle = new Paragraph("계약 정보\n", headFont);
            document.add(contractTitle);
            document.add(buildContractTable(contract, headFont, bodyFont));

            Paragraph termsTitle = new Paragraph("\n계약 조건\n", headFont);
            document.add(termsTitle);

            String terms = contract.getContractTerms() != null
                    ? contract.getContractTerms()
                    : "별도 협의";
            document.add(new Paragraph(terms, bodyFont));

            if (contract.getSignedAt() != null) {
                Paragraph signed = new Paragraph(
                        "\n\n서명일: " + contract.getSignedAt().format(DATE_FMT), bodyFont);
                signed.setAlignment(Element.ALIGN_RIGHT);
                document.add(signed);
            }

            document.close();
            log.info("[PDF_GENERATED] contractId={}", contract.getId());
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("PDF 생성 실패: " + contract.getId(), e);
        }
    }

    private PdfPTable buildTalentTable(TalentProfile talent, Font head, Font body) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingAfter(15);

        addRow(table, "성명", talent.getName(), head, body);

        String birthYear = talent.getBirthDate() != null
                ? talent.getBirthDate().getYear() + "년생"
                : "-";
        addRow(table, "출생년도", birthYear, head, body);

        // AI 공백기간 분석(gapPeriods)은 포함하지 않고 종합 요약만 출력
        String aiSummary = extractAiSummary(talent.getAiInsightJson());
        if (aiSummary != null) {
            addRow(table, "AI 종합 요약", aiSummary, head, body);
        }

        return table;
    }

    private PdfPTable buildContractTable(Contract contract, Font head, Font body) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingAfter(15);

        addRow(table, "계약 ID",   contract.getId().toString(), head, body);
        addRow(table, "단가",      contract.getUnitPrice() + " 만원/월", head, body);
        addRow(table, "계약 총액", contract.getTotalAmount() + " 만원", head, body);
        addRow(table, "계약 상태", contract.getStatus().name(), head, body);
        return table;
    }

    private void addRow(PdfPTable table, String label, String value, Font head, Font body) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, head));
        labelCell.setPadding(6);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, body));
        valueCell.setPadding(6);
        table.addCell(valueCell);
    }

    /** aiInsightJson에서 summary 필드만 추출한다. gapPeriods 등 공백기간 데이터는 읽지 않는다. */
    private String extractAiSummary(String aiInsightJson) {
        if (aiInsightJson == null || aiInsightJson.isBlank()) return null;
        try {
            JsonNode root = objectMapper.readTree(aiInsightJson);
            JsonNode summary = root.get("summary");
            return (summary != null && !summary.isNull()) ? summary.asText() : null;
        } catch (Exception e) {
            log.warn("[PDF_AI_PARSE_SKIP] aiInsightJson 파싱 실패: {}", e.getMessage());
            return null;
        }
    }

    private Font buildFont(int size, int style) {
        try {
            BaseFont base = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            return new Font(base, size, style);
        } catch (Exception e) {
            return new Font(Font.HELVETICA, size, style);
        }
    }
}

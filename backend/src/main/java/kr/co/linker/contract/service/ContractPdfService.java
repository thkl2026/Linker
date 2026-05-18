package kr.co.linker.contract.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import kr.co.linker.contract.domain.Contract;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

/**
 * 계약서 PDF 생성 서비스 (F-3.1)
 *
 * <p>OpenPDF 기반 단순 계약서 PDF를 생성한다.
 */
@Service
@Slf4j
public class ContractPdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy년 MM월 dd일");

    /**
     * 계약 엔티티로부터 PDF 바이트 배열을 생성한다.
     *
     * @param contract 계약 엔티티
     * @return PDF 바이트 배열
     */
    public byte[] generate(Contract contract) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 60, 60, 80, 60);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = buildFont(18, Font.BOLD);
            Font headFont = buildFont(12, Font.BOLD);
            Font bodyFont = buildFont(11, Font.NORMAL);

            Paragraph title = new Paragraph("IT 외주 용역 계약서", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            document.add(buildInfoTable(contract, headFont, bodyFont));

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

    private PdfPTable buildInfoTable(Contract contract, Font head, Font body) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingAfter(15);

        addRow(table, "계약 ID", contract.getId().toString(), head, body);
        addRow(table, "단가", contract.getUnitPrice() + " 만원/월", head, body);
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

    private Font buildFont(int size, int style) {
        try {
            BaseFont base = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            return new Font(base, size, style);
        } catch (Exception e) {
            return new Font(Font.HELVETICA, size, style);
        }
    }
}

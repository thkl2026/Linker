package kr.co.linker.admin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.linker.admin.dto.EvalReportDto;
import kr.co.linker.admin.dto.ProjectReportDto;
import kr.co.linker.admin.dto.RevenueReportDto;
import kr.co.linker.admin.dto.TalentReportDto;
import kr.co.linker.admin.service.ReportsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Reports", description = "통계 및 보고서 API")
@RestController
@RequestMapping("/api/v1/service-admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SERVICE_ADMIN', 'SYSTEM_ADMIN')")
public class ReportsController {

    private final ReportsService reportsService;

    @Operation(summary = "인력 현황 보고서")
    @GetMapping("/talent")
    public ResponseEntity<TalentReportDto> talent(
            @RequestParam(defaultValue = "6m") String period) {
        return ResponseEntity.ok(reportsService.talentReport(period));
    }

    @Operation(summary = "프로젝트 현황 보고서")
    @GetMapping("/project")
    public ResponseEntity<ProjectReportDto> project(
            @RequestParam(defaultValue = "6m") String period) {
        return ResponseEntity.ok(reportsService.projectReport(period));
    }

    @Operation(summary = "매출 분석 보고서")
    @GetMapping("/revenue")
    public ResponseEntity<RevenueReportDto> revenue(
            @RequestParam(defaultValue = "6m") String period) {
        return ResponseEntity.ok(reportsService.revenueReport(period));
    }

    @Operation(summary = "평가 분석 보고서")
    @GetMapping("/evaluation")
    public ResponseEntity<EvalReportDto> evaluation(
            @RequestParam(defaultValue = "6m") String period) {
        return ResponseEntity.ok(reportsService.evalReport(period));
    }
}

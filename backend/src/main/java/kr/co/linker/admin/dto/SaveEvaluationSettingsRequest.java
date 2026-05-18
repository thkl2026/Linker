package kr.co.linker.admin.dto;

import java.math.BigDecimal;
import java.util.List;

public record SaveEvaluationSettingsRequest(
        List<AllSettingsResponse.EvaluationMetric> metrics,
        BigDecimal gradeS,
        BigDecimal gradeA,
        BigDecimal gradeB
) {}

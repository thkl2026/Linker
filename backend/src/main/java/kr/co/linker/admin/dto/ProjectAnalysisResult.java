package kr.co.linker.admin.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProjectAnalysisResult(
    String title,
    String clientCompany,
    String mainContractor,
    String startDate,
    String endDate,
    List<RoleItem> roles
) {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record RoleItem(
        String role,
        Integer headcount,
        Double mm,
        String roleStart,
        String roleEnd,
        String techStack,
        String roleDescription
    ) {}

    public static ProjectAnalysisResult empty() {
        return new ProjectAnalysisResult(null, null, null, null, null, List.of());
    }
}

package kr.co.linker.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record ExperienceRequest(
        /** PROJECT | COMPANY */
        @Pattern(regexp = "PROJECT|COMPANY") String experienceType,

        @Size(max = 200) String companyName,

        /** COMPANY: 회사명 제목 / PROJECT: 프로젝트명 */
        @NotBlank @Size(max = 255) String projectName,

        @Size(max = 100) String role,

        /** COMPANY 전용: 소속 부서 */
        @Size(max = 100) String department,

        /** COMPANY 전용: 정규직/계약직/인턴 */
        @Size(max = 30) String employmentType,

        @NotNull LocalDate startDate,
        LocalDate endDate,
        String description,
        List<String> techStack
) {}

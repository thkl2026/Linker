package kr.co.linker.talent.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "talent_experiences")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TalentExperience {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "talent_id", nullable = false)
    private TalentProfile talentProfile;

    @Column(length = 200)
    private String companyName;

    @Column(nullable = false, length = 255)
    private String projectName;

    @Column(length = 100)
    private String role;

    @Column(nullable = false)
    private LocalDate startDate;

    private LocalDate endDate;

    /** PROJECT | COMPANY */
    @Column(nullable = false, length = 20)
    private String experienceType = "PROJECT";

    /** 소속 부서 (COMPANY 타입) */
    @Column(length = 100)
    private String department;

    /** 근무 형태: 정규직/계약직/인턴 (COMPANY 타입) */
    @Column(length = 30)
    private String employmentType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> techStack = new ArrayList<>();

    @Column(nullable = false)
    private boolean isVerified = false;

    @Column(length = 50)
    private String verificationStatus = "UNKNOWN";

    @Column(columnDefinition = "TEXT")
    private String suspiciousPoints;

    @CreationTimestamp
    private OffsetDateTime createdAt;

    public static TalentExperience create(TalentProfile profile, String experienceType,
                                          String companyName, String projectName, String role,
                                          String department, String employmentType,
                                          LocalDate startDate, LocalDate endDate,
                                          String description, List<String> techStack) {
        TalentExperience exp = new TalentExperience();
        exp.talentProfile = profile;
        exp.experienceType = experienceType != null ? experienceType : "PROJECT";
        exp.companyName = companyName;
        exp.projectName = projectName;
        exp.role = role;
        exp.department = department;
        exp.employmentType = employmentType;
        exp.startDate = startDate;
        exp.endDate = endDate;
        exp.description = description;
        exp.techStack = techStack != null ? techStack : new ArrayList<>();
        return exp;
    }

    public void update(String experienceType, String companyName, String projectName, String role,
                       String department, String employmentType,
                       LocalDate startDate, LocalDate endDate,
                       String description, List<String> techStack) {
        this.experienceType = experienceType != null ? experienceType : this.experienceType;
        this.companyName = companyName;
        this.projectName = projectName;
        this.role = role;
        this.department = department;
        this.employmentType = employmentType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.description = description;
        this.techStack = techStack != null ? techStack : new ArrayList<>();
    }
}

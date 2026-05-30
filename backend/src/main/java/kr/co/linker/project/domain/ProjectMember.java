package kr.co.linker.project.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "project_members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID projectId;

    @Column(nullable = false)
    private UUID talentId;

    @Column(length = 100)
    private String role;

    @CreationTimestamp
    private OffsetDateTime assignedAt;

    @Column(nullable = false)
    private boolean confirmed = false;

    private OffsetDateTime confirmedAt;

    /** 주사업자 제안 가격 (원/월) */
    private java.math.BigDecimal proposedPrice;

    /** 후보자 월 급여 (원/월) */
    private java.math.BigDecimal talentSalary;

    public static ProjectMember assign(UUID projectId, UUID talentId, String role,
                                       java.math.BigDecimal proposedPrice, java.math.BigDecimal talentSalary) {
        ProjectMember m = new ProjectMember();
        m.projectId = projectId;
        m.talentId = talentId;
        m.role = role;
        m.proposedPrice = proposedPrice;
        m.talentSalary = talentSalary;
        return m;
    }

    public void confirm() {
        this.confirmed = true;
        this.confirmedAt = OffsetDateTime.now();
    }
}

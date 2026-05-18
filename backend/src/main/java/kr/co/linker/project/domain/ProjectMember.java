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

    public static ProjectMember assign(UUID projectId, UUID talentId, String role) {
        ProjectMember m = new ProjectMember();
        m.projectId = projectId;
        m.talentId = talentId;
        m.role = role;
        return m;
    }
}

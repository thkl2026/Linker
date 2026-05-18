package kr.co.linker.admin.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "resume_analysis_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ResumeAnalysisLog {

    @Id
    private UUID id;

    private String fileName;

    @Column(length = 64)
    private String fileHash;

    @Column(columnDefinition = "TEXT")
    private String rawContent;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        this.createdAt = LocalDateTime.now();
    }
}

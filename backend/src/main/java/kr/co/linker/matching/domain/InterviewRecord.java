package kr.co.linker.matching.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 인터뷰 기록 엔티티 (F-2.3)
 *
 * <p>매칭 제안 수락 후 인터뷰 일정·결과를 기록한다.
 */
@Entity
@Table(name = "interview_records")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InterviewRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID proposalId;

    private OffsetDateTime scheduledAt;

    @Column(length = 255)
    private String location;

    @Column(length = 20)
    private String result;  // PASS | FAIL | PENDING

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    private OffsetDateTime updatedAt;

    /**
     * 인터뷰 기록 생성
     *
     * @param proposalId  매칭 제안 UUID
     * @param scheduledAt 인터뷰 일정
     * @param location    장소 또는 화상회의 URL
     * @return 인터뷰 기록 엔티티
     */
    public static InterviewRecord create(UUID proposalId, OffsetDateTime scheduledAt, String location) {
        InterviewRecord record = new InterviewRecord();
        record.proposalId = proposalId;
        record.scheduledAt = scheduledAt;
        record.location = location;
        record.result = "PENDING";
        return record;
    }

    /**
     * 인터뷰 결과 기록
     *
     * @param result PASS 또는 FAIL
     * @param notes  메모
     */
    public void recordResult(String result, String notes) {
        this.result = result;
        this.notes = notes;
    }
}

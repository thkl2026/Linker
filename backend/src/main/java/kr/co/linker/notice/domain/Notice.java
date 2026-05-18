package kr.co.linker.notice.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notices", indexes = {
        @Index(name = "idx_notice_created", columnList = "created_at DESC"),
        @Index(name = "idx_notice_category", columnList = "category"),
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false)
    private boolean pinned = false;

    @Column(nullable = false)
    private boolean hidden = false;

    @Column(nullable = false)
    private int viewCount = 0;

    @Column(nullable = false)
    private String authorName;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public static Notice create(String title, String content, String category, boolean pinned, String authorName) {
        Notice n = new Notice();
        n.title = title;
        n.content = content;
        n.category = category;
        n.pinned = pinned;
        n.authorName = authorName != null ? authorName : "관리자";
        return n;
    }

    public void update(String title, String content, String category, boolean pinned) {
        this.title = title;
        this.content = content;
        this.category = category;
        this.pinned = pinned;
    }

    public void incrementViewCount() { this.viewCount++; }
    public void toggleHidden()       { this.hidden = !this.hidden; }
    public void togglePinned()       { this.pinned = !this.pinned; }
}

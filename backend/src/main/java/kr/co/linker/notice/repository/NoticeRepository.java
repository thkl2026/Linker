package kr.co.linker.notice.repository;

import kr.co.linker.notice.domain.Notice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.UUID;

public interface NoticeRepository extends JpaRepository<Notice, UUID> {

    @Query("""
            SELECT n FROM Notice n
            WHERE (:category IS NULL OR n.category = :category)
              AND (:keyword IS NULL OR LOWER(n.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                                    OR LOWER(n.content) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY n.pinned DESC, n.createdAt DESC
            """)
    Page<Notice> search(@Param("category") String category,
                        @Param("keyword") String keyword,
                        Pageable pageable);

    long countByCreatedAtAfter(LocalDateTime date);

    long countByPinnedTrue();
}

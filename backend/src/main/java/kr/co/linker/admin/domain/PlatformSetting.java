package kr.co.linker.admin.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "platform_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlatformSetting {

    @Id
    private String key;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String value;

    @UpdateTimestamp
    private OffsetDateTime updatedAt;

    public static PlatformSetting of(String key, String value) {
        PlatformSetting s = new PlatformSetting();
        s.key = key;
        s.value = value;
        return s;
    }

    public void setValue(String value) {
        this.value = value;
    }
}

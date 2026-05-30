package kr.co.linker.admin.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Entity
@Table(name = "user_invitations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserInvitation {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;
    private static final int EXPIRE_DAYS = 7;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(length = 200)
    private String company;

    @Column(nullable = false, length = 50)
    private String role;

    @Column(nullable = false, length = 50)
    private String status = "PENDING";

    @Column(length = 64)
    private String token;

    private OffsetDateTime expiresAt;

    @CreationTimestamp
    private OffsetDateTime invitedAt;

    private OffsetDateTime acceptedAt;

    public static UserInvitation create(String email, String company, String role) {
        UserInvitation inv = new UserInvitation();
        inv.email = email;
        inv.company = company;
        inv.role = role;
        inv.refreshToken();
        return inv;
    }

    public void resend() {
        this.invitedAt = OffsetDateTime.now();
        this.status = "PENDING";
        refreshToken();
    }

    public void updateInfo(String company, String role) {
        if (company != null) this.company = company.isBlank() ? null : company.trim();
        if (role != null && !role.isBlank()) this.role = role.trim();
    }

    public void accept() {
        this.status = "ACCEPTED";
        this.acceptedAt = OffsetDateTime.now();
        this.token = null;
        this.expiresAt = null;
    }

    public boolean isExpired() {
        return expiresAt == null || OffsetDateTime.now().isAfter(expiresAt);
    }

    private void refreshToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        this.token = HexFormat.of().formatHex(bytes);
        this.expiresAt = OffsetDateTime.now().plusDays(EXPIRE_DAYS);
    }
}

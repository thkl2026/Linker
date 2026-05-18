package kr.co.linker.admin.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_invitations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, length = 50)
    private String role;

    @Column(nullable = false, length = 50)
    private String status = "PENDING";

    @CreationTimestamp
    private OffsetDateTime invitedAt;

    private OffsetDateTime acceptedAt;

    public static UserInvitation create(String email, String role) {
        UserInvitation inv = new UserInvitation();
        inv.email = email;
        inv.role = role;
        return inv;
    }

    public void resend() {
        this.invitedAt = OffsetDateTime.now();
        this.status = "PENDING";
    }

    public void accept() {
        this.status = "ACCEPTED";
        this.acceptedAt = OffsetDateTime.now();
    }
}

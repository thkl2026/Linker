package kr.co.linker.common.email;

public interface EmailService {
    void sendInvitation(String to, String role, String inviteUrl);
}

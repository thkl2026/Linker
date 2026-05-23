package kr.co.linker.common.email;

import jakarta.mail.internet.MimeMessage;
import kr.co.linker.admin.domain.PlatformSetting;
import kr.co.linker.admin.repository.PlatformSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Properties;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmtpEmailService implements EmailService {

    private final PlatformSettingRepository settingRepo;

    @Value("${spring.mail.host:}")
    private String envHost;

    @Value("${spring.mail.port:587}")
    private int envPort;

    @Value("${spring.mail.username:}")
    private String envUsername;

    @Value("${spring.mail.password:}")
    private String envPassword;

    private static final Map<String, String> ROLE_LABELS = Map.of(
            "TALENT",        "전문가 (Expert)",
            "PM",            "PM (Project Manager)",
            "PROCUREMENT",   "기업 담당자 (Client)",
            "SERVICE_ADMIN", "서비스 관리자 (Admin)"
    );

    private JavaMailSenderImpl buildSender() {
        String host = settingRepo.findById("smtp.host").map(PlatformSetting::getValue).orElse(null);
        if (host == null || host.isBlank()) host = envHost;
        if (host == null || host.isBlank()) return null;

        String portStr = settingRepo.findById("smtp.port").map(PlatformSetting::getValue).orElse(null);
        int port = (portStr != null && !portStr.isBlank()) ? Integer.parseInt(portStr) : envPort;

        String username = settingRepo.findById("smtp.username").map(PlatformSetting::getValue).orElse(null);
        if (username == null || username.isBlank()) username = envUsername;

        String password = settingRepo.findById("smtp.password").map(PlatformSetting::getValue).orElse(null);
        if (password == null || password.isBlank()) password = envPassword;

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username);
        sender.setPassword(password);

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        return sender;
    }

    @Override
    public void sendInvitation(String to, String role, String inviteUrl) {
        JavaMailSenderImpl sender = buildSender();
        if (sender == null) {
            log.info("[EMAIL-NOOP] SMTP 설정 없음, 초대 메일 생략 to={} role={}", to, role);
            return;
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(sender.getUsername());
            helper.setTo(to);
            helper.setSubject("[Linker] 서비스 초대 안내");
            helper.setText(buildHtml(to, role, inviteUrl), true);
            sender.send(message);
            log.info("[EMAIL] 초대 메일 발송 to={} role={}", to, role);
        } catch (Exception e) {
            log.error("[EMAIL] 초대 메일 발송 실패 to={}", to, e);
            throw new RuntimeException("이메일 발송에 실패했습니다.", e);
        }
    }

    private String buildHtml(String email, String role, String inviteUrl) {
        String roleLabel = ROLE_LABELS.getOrDefault(role, role);
        return """
                <!DOCTYPE html>
                <html lang="ko">
                <head><meta charset="UTF-8"></head>
                <body style="font-family:sans-serif;background:#f5f5f0;margin:0;padding:40px 0;">
                  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
                    <div style="background:#451a03;padding:36px 40px;">
                      <span style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;">Linker.</span>
                    </div>
                    <div style="padding:40px;">
                      <h2 style="font-size:22px;font-weight:800;color:#451a03;margin:0 0 8px;">서비스에 초대되었습니다</h2>
                      <p style="color:#78716c;font-size:14px;margin:0 0 32px;">
                        <strong>%s</strong> 계정으로 <strong>%s</strong> 역할로 초대받으셨습니다.<br>
                        아래 버튼을 클릭해 7일 이내에 가입을 완료해 주세요.
                      </p>
                      <a href="%s"
                         style="display:inline-block;background:#451a03;color:#fff;text-decoration:none;
                                font-weight:800;font-size:15px;padding:16px 36px;border-radius:14px;">
                        초대 수락하기
                      </a>
                      <p style="color:#a8a29e;font-size:12px;margin-top:32px;">
                        이 링크는 7일 후 만료됩니다. 본인이 요청하지 않은 경우 이 메일을 무시하세요.
                      </p>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(email, roleLabel, inviteUrl);
    }
}

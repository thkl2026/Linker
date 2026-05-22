package kr.co.linker.common.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

@ConditionalOnMissingBean(EmailService.class)
@Service
@Slf4j
public class NoOpEmailService implements EmailService {

    @Override
    public void sendInvitation(String to, String role, String inviteUrl) {
        log.info("[EMAIL-NOOP] 초대 메일 발송 생략 to={} role={} url={}", to, role, inviteUrl);
    }
}

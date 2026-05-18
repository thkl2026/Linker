package kr.co.linker.common.notification;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnResource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;

import java.io.IOException;

/**
 * Firebase Admin SDK 초기화 설정
 *
 * @rule 그라운드룰 Rule 2: 서비스 계정 키 경로는 env var에서 주입
 */
@Slf4j
@Configuration
@Profile({"local", "onprem", "cloud"})
@ConditionalOnResource(resources = "classpath:firebase-service-account.json")
public class FcmConfig {

    @Value("${linker.fcm.service-account-key}")
    private Resource serviceAccountKey;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }
        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccountKey.getInputStream()))
                .build();
        FirebaseApp app = FirebaseApp.initializeApp(options);
        log.info("[FCM_INITIALIZED] projectId={}", app.getOptions().getProjectId());
        return app;
    }
}

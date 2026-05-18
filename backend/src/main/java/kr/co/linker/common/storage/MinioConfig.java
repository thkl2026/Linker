package kr.co.linker.common.storage;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * MinIO 클라이언트 빈 설정 (Local / On-Premise)
 *
 * @rule 그라운드룰 Rule 2: 접속 정보는 env var에서 주입
 */
@Configuration
@Profile({"local", "onprem"})
public class MinioConfig {

    @Value("${linker.minio.endpoint}")
    private String endpoint;

    @Value("${linker.minio.access-key}")
    private String accessKey;

    @Value("${linker.minio.secret-key}")
    private String secretKey;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }
}

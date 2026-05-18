package kr.co.linker.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * 외부 HTTP 클라이언트 설정
 *
 * <p>GitHub API, 외부 검증 API 호출에 사용하는 {@link RestTemplate} Bean을 등록한다.
 */
@Configuration
public class WebClientConfig {

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(10_000);
        return new RestTemplate(factory);
    }
}

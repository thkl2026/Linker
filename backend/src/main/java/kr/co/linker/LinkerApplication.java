package kr.co.linker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Linker 애플리케이션 진입점
 *
 * <p>외부 인력 관리 시스템 (Workforce OS). Java 21 Virtual Thread + Spring Boot 3.x 기반.
 * Spring Profile로 local / onprem / cloud 인프라를 전환한다.
 *
 * @see <a href="./01_project_overview.md">프로젝트 개요</a>
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableAsync
public class LinkerApplication {

    public static void main(String[] args) {
        SpringApplication.run(LinkerApplication.class, args);
    }
}

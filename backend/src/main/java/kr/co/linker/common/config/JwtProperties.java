package kr.co.linker.common.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * JWT 설정 프로퍼티 — {@code application.yml}의 {@code linker.jwt} 섹션 바인딩
 *
 * <p>모든 JWT 관련 상수는 이 레코드를 통해 주입받는다. 코드 내 직접 값 작성 금지.
 *
 * @param secret             JWT 서명 비밀키 (HS256, 최소 32자)
 * @param accessTokenExpiry  Access Token 유효 시간 (초, 기본 900 = 15분)
 * @param refreshTokenExpiry Refresh Token 유효 시간 (초, 기본 604800 = 7일)
 * @rule 그라운드룰 Rule 2: 하드코딩 금지
 */
@ConfigurationProperties(prefix = "linker.jwt")
@Validated
public record JwtProperties(
        @NotBlank String secret,
        @Positive int accessTokenExpiry,
        @Positive int refreshTokenExpiry
) {}

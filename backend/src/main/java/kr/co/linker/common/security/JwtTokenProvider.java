package kr.co.linker.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import kr.co.linker.common.config.JwtProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * JWT 토큰 생성·검증·파싱 컴포넌트
 *
 * <p>Access Token (15분) + Refresh Token (7일) 이중 토큰 전략.
 * Refresh Token은 Redis에 저장되어 로그아웃 시 즉시 무효화된다.
 *
 * @rule 그라운드룰 Rule 2: 비밀키는 {@link JwtProperties}에서 주입
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtTokenProvider {

    private final JwtProperties jwtProperties;

    /**
     * Access Token 발급
     *
     * @param userId 사용자 UUID
     * @param role   사용자 역할 (TALENT/PM/PROCUREMENT/ADMIN)
     * @return 서명된 JWT Access Token
     */
    public String generateAccessToken(UUID userId, String role) {
        return buildToken(userId.toString(), role, jwtProperties.accessTokenExpiry());
    }

    /**
     * Refresh Token 발급
     *
     * @param userId 사용자 UUID
     * @param role   사용자 역할
     * @return 서명된 JWT Refresh Token
     */
    public String generateRefreshToken(UUID userId, String role) {
        return buildToken(userId.toString(), role, jwtProperties.refreshTokenExpiry());
    }

    /**
     * 토큰 유효성 검사
     *
     * @param token 검사할 JWT
     * @return 유효하면 true
     */
    public boolean isValid(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("[JWT_INVALID] {}", e.getMessage());
            return false;
        }
    }

    /**
     * 토큰에서 사용자 UUID 추출
     *
     * @param token 유효한 JWT
     * @return 사용자 UUID
     */
    public UUID getUserId(String token) {
        return UUID.fromString(getClaims(token).getSubject());
    }

    /**
     * 토큰에서 역할 추출
     *
     * @param token 유효한 JWT
     * @return 사용자 역할 문자열
     */
    public String getRole(String token) {
        return getClaims(token).get("role", String.class);
    }

    private String buildToken(String subject, String role, int expirySeconds) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + (long) expirySeconds * 1000);
        return Jwts.builder()
                .subject(subject)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(getSigningKey())
                .compact();
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtProperties.secret().getBytes(StandardCharsets.UTF_8));
    }
}

package kr.co.linker.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * JWT 인증 필터 — 모든 요청에서 Bearer 토큰을 추출하여 SecurityContext에 인증 정보를 등록한다.
 *
 * <p>토큰이 없거나 유효하지 않으면 SecurityContext를 비워두고 다음 필터로 넘긴다.
 * 인가 판단은 {@link kr.co.linker.common.config.SecurityConfig}에서 수행한다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;

    /**
     * 요청 헤더에서 JWT를 추출하고 유효하면 SecurityContext에 인증 정보를 등록한다.
     *
     * @param request     HTTP 요청
     * @param response    HTTP 응답
     * @param filterChain 필터 체인
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractToken(request);

        if (StringUtils.hasText(token) && jwtTokenProvider.isValid(token)) {
            UUID userId = jwtTokenProvider.getUserId(token);
            String role = jwtTokenProvider.getRole(token);

            var authentication = new UsernamePasswordAuthenticationToken(
                    userId,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role))
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.debug("[JWT_AUTH] userId={} role={}", userId, role);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Authorization 헤더에서 Bearer 토큰 문자열을 추출한다.
     *
     * @param request HTTP 요청
     * @return 토큰 문자열, 없으면 null
     */
    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader(AUTHORIZATION_HEADER);
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}

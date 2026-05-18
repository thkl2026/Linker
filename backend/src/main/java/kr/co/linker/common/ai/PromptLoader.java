package kr.co.linker.common.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * {@code resources/prompts/*.st} 파일 로더
 *
 * <p>시작 시 캐싱하여 반복 I/O를 방지한다.
 * 변수 치환은 {@code {{variableName}}} 형식을 사용한다.
 *
 * @rule 그라운드룰 Rule 2: 프롬프트 내용은 코드에 하드코딩하지 않는다.
 */
@Component
@Slf4j
public class PromptLoader {

    private final Map<String, String> cache = new ConcurrentHashMap<>();

    /**
     * 프롬프트 파일을 로드하고 변수를 치환하여 반환한다.
     *
     * @param templateName 파일명 (확장자 제외, e.g. "resume-parse")
     * @param variables    치환할 변수 맵 ({@code "key" → value.toString()})
     * @return 완성된 프롬프트 문자열
     */
    public String load(String templateName, Map<String, String> variables) {
        String template = cache.computeIfAbsent(templateName, this::readTemplate);
        String result = template;
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return result;
    }

    private String readTemplate(String name) {
        try {
            ClassPathResource resource = new ClassPathResource("prompts/" + name + ".st");
            byte[] bytes = resource.getInputStream().readAllBytes();
            log.debug("[PROMPT_LOADED] template={}", name);
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("프롬프트 파일 로드 실패: prompts/" + name + ".st", e);
        }
    }
}

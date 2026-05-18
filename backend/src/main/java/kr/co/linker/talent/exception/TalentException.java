package kr.co.linker.talent.exception;

import kr.co.linker.common.exception.LinkerException;
import org.springframework.http.HttpStatus;

/**
 * 인력 도메인 예외
 */
public class TalentException extends LinkerException {

    private TalentException(HttpStatus status, String errorCode, String message) {
        super(status, errorCode, message);
    }

    /** 프로필 없음 */
    public static TalentException notFound() {
        return new TalentException(HttpStatus.NOT_FOUND, "TALENT_NOT_FOUND", "인력 프로필을 찾을 수 없습니다.");
    }

    /** 이미 삭제된 프로필 */
    public static TalentException alreadyDeleted() {
        return new TalentException(HttpStatus.GONE, "TALENT_DELETED", "이미 삭제된 프로필입니다.");
    }

    /** 본인 프로필이 아닌 경우 수정 시도 */
    public static TalentException accessDenied() {
        return new TalentException(HttpStatus.FORBIDDEN, "TALENT_ACCESS_DENIED", "본인 프로필만 수정할 수 있습니다.");
    }
}

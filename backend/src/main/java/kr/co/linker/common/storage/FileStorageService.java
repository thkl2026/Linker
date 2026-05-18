package kr.co.linker.common.storage;

import java.time.Duration;

/**
 * 파일 저장소 추상화 인터페이스
 *
 * <p>On-Premise: {@code MinioFileStorageService} (MinIO S3 호환)
 * Cloud: {@code S3FileStorageService} (AWS S3)
 * 구현체는 Spring Profile로 주입된다. 서비스 레이어는 이 인터페이스만 의존한다.
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지 (구현체는 Profile로 주입)
 */
public interface FileStorageService {

    /**
     * 클라이언트가 파일을 직접 업로드할 Pre-signed URL을 발급한다.
     *
     * @param key    저장 경로 (예: talents/uuid/resume.pdf)
     * @param expiry URL 유효 기간
     * @return Pre-signed PUT URL
     */
    String generateUploadUrl(String key, Duration expiry);

    /**
     * 클라이언트가 파일을 직접 다운로드할 Pre-signed URL을 발급한다.
     *
     * @param key    저장 경로
     * @param expiry URL 유효 기간
     * @return Pre-signed GET URL
     */
    String generateDownloadUrl(String key, Duration expiry);

    /**
     * 저장소에서 파일을 삭제한다.
     *
     * @param key 삭제할 파일 경로
     */
    void delete(String key);

    /**
     * 바이트 배열을 저장소에 업로드하고 다운로드 URL을 반환한다.
     *
     * @param key         저장 경로
     * @param data        파일 바이트 배열
     * @param contentType MIME 타입
     * @return 파일 접근 경로 (Pre-signed URL 또는 내부 경로)
     */
    String uploadBytes(String key, byte[] data, String contentType);
}

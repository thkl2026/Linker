package kr.co.linker.common.storage;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * MinIO S3-호환 Pre-signed URL 파일 저장소 구현체
 *
 * <p>On-Premise / Local 환경에서 사용. Cloud 환경은 S3FileStorageService로 대체.
 *
 * @rule 그라운드룰 Rule 2: 버킷명·엔드포인트는 env var에서 주입
 */
@Slf4j
@Service
@Profile({"local", "onprem"})
@RequiredArgsConstructor
public class MinioFileStorageService implements FileStorageService {

    private final MinioClient minioClient;

    @Value("${linker.minio.bucket}")
    private String bucket;

    @Override
    public String generateUploadUrl(String key, Duration expiry) {
        try {
            String url = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.PUT)
                            .bucket(bucket)
                            .object(key)
                            .expiry((int) expiry.toSeconds(), TimeUnit.SECONDS)
                            .build()
            );
            log.debug("[STORAGE_UPLOAD_URL] key={} expiry={}s", key, expiry.toSeconds());
            return url;
        } catch (Exception e) {
            throw new StorageException("Pre-signed upload URL 발급 실패: " + key, e);
        }
    }

    @Override
    public String generateDownloadUrl(String key, Duration expiry) {
        try {
            String url = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucket)
                            .object(key)
                            .expiry((int) expiry.toSeconds(), TimeUnit.SECONDS)
                            .build()
            );
            log.debug("[STORAGE_DOWNLOAD_URL] key={} expiry={}s", key, expiry.toSeconds());
            return url;
        } catch (Exception e) {
            throw new StorageException("Pre-signed download URL 발급 실패: " + key, e);
        }
    }

    @Override
    public String uploadBytes(String key, byte[] data, String contentType) {
        try (ByteArrayInputStream is = new ByteArrayInputStream(data)) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(key)
                            .stream(is, data.length, -1)
                            .contentType(contentType)
                            .build()
            );
            log.info("[STORAGE_UPLOADED] key={} size={}", key, data.length);
            return key;
        } catch (Exception e) {
            throw new StorageException("파일 업로드 실패: " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucket)
                            .object(key)
                            .build()
            );
            log.info("[STORAGE_DELETED] key={}", key);
        } catch (Exception e) {
            throw new StorageException("파일 삭제 실패: " + key, e);
        }
    }
}

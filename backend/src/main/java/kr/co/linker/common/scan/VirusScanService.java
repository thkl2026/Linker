package kr.co.linker.common.scan;

import java.io.InputStream;

/**
 * 바이러스 스캔 추상화 인터페이스
 *
 * <p>On-Premise: {@code ClamAvVirusScanService} (ClamAV clamd 소켓 연동)
 * Cloud: {@code LambdaVirusScanService} (AWS Lambda + ClamAV)
 * 구현체는 Spring Profile로 주입된다.
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지 (구현체는 Profile로 주입)
 */
public interface VirusScanService {

    /**
     * 파일 스트림을 바이러스 스캔한다.
     *
     * <p>파일 업로드 후 DB 경로 기록 전에 반드시 호출되어야 한다.
     * INFECTED 결과 시 파일을 삭제하고 업로드를 거부해야 한다.
     *
     * @param fileStream 스캔할 파일 스트림
     * @param filename   로그 기록용 파일명
     * @return 스캔 결과 ({@link ScanResult})
     */
    ScanResult scan(InputStream fileStream, String filename);

    /**
     * 바이러스 스캔 결과
     *
     * @param clean   바이러스 미검출 여부
     * @param virusName 검출된 바이러스명 (clean이면 null)
     */
    record ScanResult(boolean clean, String virusName) {
        /** 안전한 결과 생성 */
        public static ScanResult safe() {
            return new ScanResult(true, null);
        }

        /** 감염 결과 생성 */
        public static ScanResult infected(String virusName) {
            return new ScanResult(false, virusName);
        }
    }
}

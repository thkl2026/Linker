package kr.co.linker.common.scan;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

/**
 * ClamAV clamd 소켓 연동 바이러스 스캔 구현체
 *
 * <p>INSTREAM 프로토콜 사용: 청크 단위로 파일을 전송하고 OK / FOUND 응답을 파싱한다.
 *
 * @rule 그라운드룰 Rule 2: clamd 호스트·포트는 env var에서 주입
 */
@Slf4j
@Service
@Profile({"local", "onprem"})
public class ClamAvVirusScanService implements VirusScanService {

    private static final int CHUNK_SIZE = 2048;
    private static final String RESPONSE_OK = "stream: OK";

    @Value("${linker.clamav.host:clamav}")
    private String host;

    @Value("${linker.clamav.port:3310}")
    private int port;

    @Value("${linker.clamav.timeout-ms:10000}")
    private int timeoutMs;

    @Override
    public ScanResult scan(InputStream fileStream, String filename) {
        log.debug("[VIRUS_SCAN_START] filename={}", filename);
        try (Socket socket = new Socket(host, port)) {
            socket.setSoTimeout(timeoutMs);

            DataOutputStream out = new DataOutputStream(socket.getOutputStream());
            out.write("zINSTREAM\0".getBytes(StandardCharsets.US_ASCII));

            byte[] buffer = new byte[CHUNK_SIZE];
            int bytesRead;
            while ((bytesRead = fileStream.read(buffer)) != -1) {
                out.write(ByteBuffer.allocate(4).putInt(bytesRead).array());
                out.write(buffer, 0, bytesRead);
            }
            // 종료 신호: 0-length chunk
            out.write(new byte[]{0, 0, 0, 0});
            out.flush();

            String response = new String(socket.getInputStream().readAllBytes(), StandardCharsets.US_ASCII).trim();
            log.debug("[VIRUS_SCAN_RESULT] filename={} response={}", filename, response);

            if (RESPONSE_OK.equals(response)) {
                return ScanResult.safe();
            }
            // 예: "stream: Eicar-Test-Signature FOUND"
            String virusName = parseVirusName(response);
            log.warn("[VIRUS_SCAN_INFECTED] filename={} virus={}", filename, virusName);
            return ScanResult.infected(virusName);

        } catch (IOException e) {
            log.error("[VIRUS_SCAN_ERROR] filename={} error={}", filename, e.getMessage());
            throw new ScanException("바이러스 스캔 실패: " + filename, e);
        }
    }

    private String parseVirusName(String response) {
        // "stream: <VirusName> FOUND" 형식에서 바이러스명 추출
        int start = response.indexOf(": ") + 2;
        int end = response.lastIndexOf(" FOUND");
        if (start > 1 && end > start) {
            return response.substring(start, end);
        }
        return response;
    }
}

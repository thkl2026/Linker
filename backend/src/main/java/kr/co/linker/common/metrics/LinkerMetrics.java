package kr.co.linker.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Linker 비즈니스 커스텀 메트릭 레지스트리 (Rule 1: 트랜잭션 계층 외 모니터링)
 *
 * <p>Grafana 비즈니스 대시보드에서 참조하는 카운터/게이지를 중앙에서 관리한다.
 * 각 서비스는 이 컴포넌트를 주입받아 {@code increment()} 메서드만 호출한다.
 */
@Component
@RequiredArgsConstructor
public class LinkerMetrics {

    private final MeterRegistry registry;

    private Counter matchProposalsCreated;
    private Counter contractsSigned;
    private Counter timesheetsApproved;
    private Counter timesheetAnomalyFlags;
    private Counter riskAlertsSent;
    private Counter aiJobsCompleted;
    private Counter aiJobsFailed;

    private final AtomicInteger aiJobQueueSize = new AtomicInteger(0);

    /** 애플리케이션 시작 시 모든 메트릭을 등록한다. */
    @PostConstruct
    public void init() {
        matchProposalsCreated = Counter.builder("linker.match.proposals.created")
                .description("AI 매칭 제안 생성 횟수")
                .register(registry);

        contractsSigned = Counter.builder("linker.contracts.signed")
                .description("전자 서명된 계약 수")
                .register(registry);

        timesheetsApproved = Counter.builder("linker.timesheets.approved")
                .description("승인된 타임시트 수")
                .register(registry);

        timesheetAnomalyFlags = Counter.builder("linker.timesheet.anomaly.flags")
                .description("AI 이상 감지 플래그 수")
                .register(registry);

        riskAlertsSent = Counter.builder("linker.risk.alerts.sent")
                .description("SSE RISK_ALERT 발송 수")
                .register(registry);

        aiJobsCompleted = Counter.builder("linker.ai.jobs.completed")
                .description("완료된 AI 작업 수")
                .register(registry);

        aiJobsFailed = Counter.builder("linker.ai.jobs.failed")
                .description("실패한 AI 작업 수")
                .register(registry);

        Gauge.builder("linker.ai.jobs.queue.size", aiJobQueueSize, AtomicInteger::get)
                .description("AI 작업 큐 대기 수")
                .register(registry);
    }

    /** AI 매칭 제안이 생성될 때 호출한다. */
    public void incrementMatchProposalsCreated(int count) {
        matchProposalsCreated.increment(count);
    }

    /** 계약 서명 완료 시 호출한다. */
    public void incrementContractsSigned() {
        contractsSigned.increment();
    }

    /** 타임시트 승인 시 호출한다. */
    public void incrementTimesheetsApproved() {
        timesheetsApproved.increment();
    }

    /** AI 이상 감지 플래그 설정 시 호출한다. */
    public void incrementTimesheetAnomalyFlags() {
        timesheetAnomalyFlags.increment();
    }

    /** SSE RISK_ALERT 발송 시 호출한다. */
    public void incrementRiskAlertsSent() {
        riskAlertsSent.increment();
    }

    /** AI 작업 완료 시 호출한다. */
    public void incrementAiJobsCompleted() {
        aiJobsCompleted.increment();
    }

    /** AI 작업 실패 시 호출한다. */
    public void incrementAiJobsFailed() {
        aiJobsFailed.increment();
    }

    /** AI 큐 사이즈를 업데이트한다. */
    public void setAiJobQueueSize(int size) {
        aiJobQueueSize.set(size);
    }
}

package kr.co.linker.timesheet.service;

import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.contract.repository.ContractRepository;
import kr.co.linker.timesheet.domain.Timesheet;
import kr.co.linker.timesheet.domain.TimesheetStatus;
import kr.co.linker.timesheet.dto.SubmitTimesheetRequest;
import kr.co.linker.timesheet.dto.TimesheetResponse;
import kr.co.linker.timesheet.repository.TimesheetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * 타임시트 등록·승인 워크플로우 서비스 (F-3.3)
 *
 * <p>TALENT 등록 → PM 승인/반려 흐름을 담당한다.
 * 하루 최대 근무 시간(10시간) 초과 시 AI 이상 플래그를 자동 설정한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TimesheetService {

    private static final double ANOMALY_HOURS_THRESHOLD = 10.0;

    private final TimesheetRepository timesheetRepository;
    private final ContractRepository contractRepository;
    private final kr.co.linker.common.metrics.LinkerMetrics linkerMetrics;

    /**
     * 타임시트를 등록한다.
     *
     * @param talentId 인력 사용자 UUID
     * @param request  타임시트 등록 요청
     * @return 등록된 타임시트 응답 DTO
     */
    @Transactional
    public TimesheetResponse submit(UUID talentId, SubmitTimesheetRequest request) {
        if (!contractRepository.existsById(request.contractId())) {
            throw new LinkerException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND", "계약을 찾을 수 없습니다.");
        }

        Timesheet ts = Timesheet.create(
                request.contractId(), talentId,
                request.workDate(), request.hoursWorked(),
                request.workDescription()
        );

        // 10시간 초과 = 이상 플래그
        if (request.hoursWorked().doubleValue() > ANOMALY_HOURS_THRESHOLD) {
            ts.flagAnomaly();
            linkerMetrics.incrementTimesheetAnomalyFlags();
            log.warn("[TIMESHEET_ANOMALY] talentId={} workDate={} hours={}",
                    talentId, request.workDate(), request.hoursWorked());
        }

        timesheetRepository.save(ts);
        log.info("[TIMESHEET_SUBMITTED] id={} talentId={}", ts.getId(), talentId);
        return TimesheetResponse.from(ts);
    }

    /**
     * 타임시트를 승인한다.
     *
     * @param timesheetId 타임시트 UUID
     * @param approverId  승인자(PM/ADMIN) UUID
     * @return 업데이트된 타임시트 응답 DTO
     */
    @Transactional
    public TimesheetResponse approve(UUID timesheetId, UUID approverId) {
        Timesheet ts = findOrThrow(timesheetId);
        ts.approve(approverId);
        linkerMetrics.incrementTimesheetsApproved();
        log.info("[TIMESHEET_APPROVED] id={} approver={}", timesheetId, approverId);
        return TimesheetResponse.from(ts);
    }

    /**
     * 타임시트를 반려한다.
     *
     * @param timesheetId 타임시트 UUID
     * @return 업데이트된 타임시트 응답 DTO
     */
    @Transactional
    public TimesheetResponse reject(UUID timesheetId) {
        Timesheet ts = findOrThrow(timesheetId);
        ts.reject();
        log.info("[TIMESHEET_REJECTED] id={}", timesheetId);
        return TimesheetResponse.from(ts);
    }

    /**
     * 계약별 타임시트 목록을 조회한다.
     *
     * @param contractId 계약 UUID
     * @param status     상태 필터 (null이면 전체)
     * @return 타임시트 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<TimesheetResponse> listByContract(UUID contractId, TimesheetStatus status) {
        List<Timesheet> list = status != null
                ? timesheetRepository.findByContractIdAndStatusOrderByWorkDateDesc(contractId, status)
                : timesheetRepository.findByContractIdOrderByWorkDateDesc(contractId);
        return list.stream().map(TimesheetResponse::from).toList();
    }

    /**
     * 인력별 타임시트 목록을 조회한다.
     *
     * @param talentId 인력 UUID
     * @return 타임시트 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<TimesheetResponse> listByTalent(UUID talentId) {
        return timesheetRepository.findByTalentIdOrderByWorkDateDesc(talentId)
                .stream().map(TimesheetResponse::from).toList();
    }

    private Timesheet findOrThrow(UUID id) {
        return timesheetRepository.findById(id)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "TIMESHEET_NOT_FOUND", "타임시트를 찾을 수 없습니다."));
    }
}

package kr.co.linker.settlement.service;

import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.contract.domain.Contract;
import kr.co.linker.contract.repository.ContractRepository;
import kr.co.linker.settlement.domain.Settlement;
import kr.co.linker.settlement.dto.SettlementResponse;
import kr.co.linker.settlement.repository.SettlementRepository;
import kr.co.linker.timesheet.domain.Timesheet;
import kr.co.linker.timesheet.domain.TimesheetStatus;
import kr.co.linker.timesheet.repository.TimesheetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * 정산 워크플로우 서비스 (F-4.1)
 *
 * <p>계약별 월 정산 생성 → PROCUREMENT 승인 → 지급 처리.
 * 정산 금액: 승인된 타임시트 총 시간 × 계약 단가.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SettlementService {

    private final SettlementRepository settlementRepository;
    private final ContractRepository contractRepository;
    private final TimesheetRepository timesheetRepository;

    /**
     * 정산 초안을 생성한다 — 해당 월의 승인된 타임시트를 집계한다.
     *
     * @param contractId      계약 UUID
     * @param settlementMonth 정산 대상 월 (YYYY-MM-01 형식)
     * @param deduction       공제 금액 (선택)
     * @return 생성된 정산 응답 DTO
     */
    @Transactional
    public SettlementResponse generate(UUID contractId, LocalDate settlementMonth, BigDecimal deduction) {
        if (settlementRepository.findByContractIdAndSettlementMonth(contractId, settlementMonth).isPresent()) {
            throw new LinkerException(HttpStatus.CONFLICT, "SETTLEMENT_EXISTS", "해당 월 정산이 이미 존재합니다.");
        }

        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND", "계약을 찾을 수 없습니다."));

        // 해당 월 + 승인된 타임시트 집계
        LocalDate monthStart = settlementMonth.withDayOfMonth(1);
        LocalDate monthEnd = settlementMonth.withDayOfMonth(settlementMonth.lengthOfMonth());

        List<Timesheet> approved = timesheetRepository
                .findByContractIdAndStatusOrderByWorkDateDesc(contractId, TimesheetStatus.APPROVED)
                .stream()
                .filter(ts -> !ts.getWorkDate().isBefore(monthStart) && !ts.getWorkDate().isAfter(monthEnd))
                .toList();

        BigDecimal totalHours = approved.stream()
                .map(Timesheet::getHoursWorked)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Settlement settlement = Settlement.create(
                contractId, contract.getTalentId(),
                monthStart, totalHours,
                contract.getUnitPrice(), deduction
        );

        settlementRepository.save(settlement);
        log.info("[SETTLEMENT_GENERATED] id={} contractId={} month={} totalHours={}",
                settlement.getId(), contractId, settlementMonth, totalHours);
        return SettlementResponse.from(settlement);
    }

    /**
     * 정산을 승인한다.
     *
     * @param settlementId 정산 UUID
     * @param approverId   승인자(PROCUREMENT/ADMIN) UUID
     * @return 승인된 정산 응답 DTO
     */
    @Transactional
    public SettlementResponse approve(UUID settlementId, UUID approverId) {
        Settlement settlement = findOrThrow(settlementId);
        settlement.approve(approverId);
        log.info("[SETTLEMENT_APPROVED] id={} approver={}", settlementId, approverId);
        return SettlementResponse.from(settlement);
    }

    /**
     * 정산을 지급 처리한다.
     *
     * @param settlementId 정산 UUID
     * @return 지급 완료 정산 응답 DTO
     */
    @Transactional
    public SettlementResponse markPaid(UUID settlementId) {
        Settlement settlement = findOrThrow(settlementId);
        settlement.markPaid();
        log.info("[SETTLEMENT_PAID] id={}", settlementId);
        return SettlementResponse.from(settlement);
    }

    /**
     * 계약별 정산 목록을 조회한다.
     *
     * @param contractId 계약 UUID
     * @return 정산 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<SettlementResponse> listByContract(UUID contractId) {
        return settlementRepository.findByContractIdOrderBySettlementMonthDesc(contractId)
                .stream().map(SettlementResponse::from).toList();
    }

    /**
     * 인력별 정산 목록을 조회한다.
     *
     * @param talentId 인력 UUID
     * @return 정산 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<SettlementResponse> listByTalent(UUID talentId) {
        return settlementRepository.findByTalentIdOrderBySettlementMonthDesc(talentId)
                .stream().map(SettlementResponse::from).toList();
    }

    private Settlement findOrThrow(UUID id) {
        return settlementRepository.findById(id)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "SETTLEMENT_NOT_FOUND", "정산을 찾을 수 없습니다."));
    }
}

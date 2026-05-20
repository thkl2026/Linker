package kr.co.linker.timesheet;

import kr.co.linker.common.AbstractIntegrationTest;
import kr.co.linker.timesheet.domain.Timesheet;
import kr.co.linker.timesheet.domain.TimesheetStatus;
import kr.co.linker.timesheet.repository.TimesheetRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.jdbc.Sql;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TimesheetRepository Testcontainers 통합 테스트.
 */
@Sql("/db/timesheet-test-data.sql")
class TimesheetRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    TimesheetRepository timesheetRepository;

    @Test
    @DisplayName("계약ID + SUBMITTED 상태 타임시트만 필터링된다")
    void findByContractIdAndStatus_returnsOnlySubmitted() {
        UUID contractId = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000002");

        List<Timesheet> submitted = timesheetRepository
                .findByContractIdAndStatusOrderByWorkDateDesc(contractId, TimesheetStatus.SUBMITTED);

        assertThat(submitted).hasSize(2);
        assertThat(submitted).allMatch(ts -> ts.getStatus() == TimesheetStatus.SUBMITTED);
    }

    @Test
    @DisplayName("aiAnomalyFlag 가 true인 타임시트가 목록에 포함된다")
    void anomalyFlaggedTimesheet_appearsInList() {
        UUID contractId = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000002");

        List<Timesheet> all = timesheetRepository
                .findByContractIdOrderByWorkDateDesc(contractId);

        assertThat(all).anyMatch(Timesheet::isAiAnomalyFlag);
    }

    @Test
    @DisplayName("approve() 후 flush하면 DB에 APPROVED 상태로 반영된다")
    void approve_persistsApprovedStatus() {
        UUID contractId = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000002");
        UUID approverId = UUID.randomUUID();

        Timesheet ts = timesheetRepository
                .findByContractIdAndStatusOrderByWorkDateDesc(contractId, TimesheetStatus.SUBMITTED)
                .get(0);
        ts.approve(approverId);
        timesheetRepository.flush();

        Timesheet refreshed = timesheetRepository.findById(ts.getId()).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(TimesheetStatus.APPROVED);
        assertThat(refreshed.getApprovedBy()).isEqualTo(approverId);
    }
}

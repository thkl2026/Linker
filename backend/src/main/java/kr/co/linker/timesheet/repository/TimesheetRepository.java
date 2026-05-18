package kr.co.linker.timesheet.repository;

import kr.co.linker.timesheet.domain.Timesheet;
import kr.co.linker.timesheet.domain.TimesheetStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TimesheetRepository extends JpaRepository<Timesheet, UUID> {

    List<Timesheet> findByContractIdOrderByWorkDateDesc(UUID contractId);

    List<Timesheet> findByTalentIdOrderByWorkDateDesc(UUID talentId);

    List<Timesheet> findByContractIdAndStatusOrderByWorkDateDesc(UUID contractId, TimesheetStatus status);
}

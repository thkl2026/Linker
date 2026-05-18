package kr.co.linker.workreport.repository;

import kr.co.linker.workreport.domain.WorkReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkReportRepository extends JpaRepository<WorkReport, UUID> {

    List<WorkReport> findByContractIdOrderByReportWeekDesc(UUID contractId);

    List<WorkReport> findByTalentIdOrderByReportWeekDesc(UUID talentId);
}

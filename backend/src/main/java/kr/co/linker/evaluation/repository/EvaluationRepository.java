package kr.co.linker.evaluation.repository;

import kr.co.linker.evaluation.domain.Evaluation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EvaluationRepository extends JpaRepository<Evaluation, UUID> {

    List<Evaluation> findByContractIdOrderByCreatedAtDesc(UUID contractId);
}

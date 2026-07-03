package kr.co.linker.talent.repository;

import kr.co.linker.talent.document.TalentDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface TalentSearchRepository extends ElasticsearchRepository<TalentDocument, String> {
}

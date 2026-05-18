package kr.co.linker.talent.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 인력 보유 기술 엔티티
 *
 * @feature F-1.1 이력서 파싱 결과 기술 저장
 */
@Entity
@Table(name = "talent_skills")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TalentSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "talent_id", nullable = false)
    private TalentProfile talentProfile;

    @Column(nullable = false, length = 100)
    private String skillName;

    @Column(length = 20)
    private String level;  // JUNIOR | MID | SENIOR | EXPERT

    private Integer years;

    @CreationTimestamp
    private OffsetDateTime createdAt;

    /**
     * 기술 항목 생성
     *
     * @param talentProfile 소속 인력 프로필
     * @param skillName     기술명
     * @param level         숙련도
     * @param years         경력 연수
     */
    public static TalentSkill of(TalentProfile talentProfile, String skillName, String level, Integer years) {
        TalentSkill skill = new TalentSkill();
        skill.talentProfile = talentProfile;
        skill.skillName = skillName;
        skill.level = level;
        skill.years = years;
        return skill;
    }
}

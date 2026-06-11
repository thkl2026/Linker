package kr.co.linker;

import kr.co.linker.admin.service.ServiceAdminService;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.repository.TalentProfileRepository;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

@SpringBootTest
@ActiveProfiles("local")
@Disabled("Developer tool for local database checking")
public class DbCheckTest {

    @Autowired
    private TalentProfileRepository talentProfileRepository;

    @Autowired
    private ServiceAdminService serviceAdminService;

    @Test
    public void printAllTalents() {
        System.out.println("=== RUNNING RECALCULATION ===");
        serviceAdminService.recalculateAllTalentGrades();
        System.out.println("=== RECALCULATION COMPLETED ===");

        System.out.println("=== PRINTING ALL TALENT PROFILES ===");
        List<TalentProfile> profiles = talentProfileRepository.findAll();
        System.out.println("Total profiles: " + profiles.size());
        for (int i = 0; i < profiles.size(); i++) {
            TalentProfile p = profiles.get(i);
            System.out.println(String.format("[%d] Name: %s | ID: %s | Grade: %s | CareerMonths: %s | Deleted: %b",
                    i + 1,
                    p.getName(),
                    p.getId(),
                    p.getSkillGrade(),
                    p.getItCareerMonths(),
                    p.isDeleted()
            ));
        }
        System.out.println("=== END OF TALENT LIST ===");
    }
}

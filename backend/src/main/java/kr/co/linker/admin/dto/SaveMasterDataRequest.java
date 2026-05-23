package kr.co.linker.admin.dto;

import java.util.List;

public record SaveMasterDataRequest(
        List<AllSettingsResponse.Contractor> contractors,
        List<String> techStacks,
        List<AllSettingsResponse.ReferralSource> referralSources,
        List<String> projectRoles
) {}

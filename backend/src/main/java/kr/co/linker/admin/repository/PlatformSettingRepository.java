package kr.co.linker.admin.repository;

import kr.co.linker.admin.domain.PlatformSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlatformSettingRepository extends JpaRepository<PlatformSetting, String> {}

package kr.co.linker.admin.dto;

public record SaveNotificationSettingsRequest(
        int evalReminderDays,
        boolean evalReminderEnabled,
        int urgentHours,
        boolean urgentEnabled
) {}

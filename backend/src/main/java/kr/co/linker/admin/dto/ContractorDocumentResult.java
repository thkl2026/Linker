package kr.co.linker.admin.dto;

public record ContractorDocumentResult(
        String registrationNo,
        String phone,
        String bankName,
        String bankAccount,
        String key,
        String name
) {}

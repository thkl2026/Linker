package kr.co.linker.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AnalyzeInsightsRequest(String keywords) {}

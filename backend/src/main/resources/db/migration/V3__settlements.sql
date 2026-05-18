-- ============================================================
-- V3__settlements.sql
-- 목적  : Phase 4 — 정산 테이블 신규 생성
-- 작성일: 2026-04-19
-- 주의  : 이 파일은 절대 수정 금지. 변경 필요 시 V4 이상으로 신규 작성. (Rule 4)
-- ============================================================

-- ── settlements — 월별 정산 마스터 ──────────────────────────────────────────
CREATE TABLE settlements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id     UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    talent_id       UUID NOT NULL REFERENCES talent_profiles(id),
    settlement_month DATE NOT NULL,             -- 정산 대상 월 (YYYY-MM-01)
    total_hours     DECIMAL(8,2) NOT NULL,       -- 승인된 총 근무시간
    unit_price      DECIMAL(15,2) NOT NULL,      -- 계약 단가 (스냅샷)
    gross_amount    DECIMAL(15,2) NOT NULL,      -- total_hours × unit_price
    deduction       DECIMAL(15,2) DEFAULT 0,     -- 공제 항목 합계
    net_amount      DECIMAL(15,2) NOT NULL,      -- 실지급액
    status          VARCHAR(30) NOT NULL DEFAULT 'DRAFT',  -- DRAFT | APPROVED | PAID
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (contract_id, settlement_month)
);

CREATE INDEX idx_settlements_contract  ON settlements (contract_id);
CREATE INDEX idx_settlements_talent    ON settlements (talent_id);
CREATE INDEX idx_settlements_status    ON settlements (status, settlement_month DESC);

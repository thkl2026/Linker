import { test, expect } from '@playwright/test';
import { mockApi, loginAs, PROJECT_ID } from './helpers';

/**
 * Golden path: 로그인 → AI 매칭 → 계약 서명
 *
 * All backend calls are intercepted with mockApi() so the test runs
 * without a live Spring Boot instance.
 */
test.describe('Linker 골든 패스', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  // ──────────────────────────────────────────────
  // 1. 로그인
  // ──────────────────────────────────────────────
  test('1. PM 로그인 — 이메일/비밀번호 플로우', async ({ page }) => {
    await page.goto('/auth/login');

    // 로그인 폼 요소 확인
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    await page.locator('input[type="email"]').fill('pm@linker.com');
    await page.locator('input[type="password"]').fill('Linker1234!');
    await page.getByRole('button', { name: '로그인' }).click();

    // 로그인 후 /app 으로 이동
    await page.waitForURL('/app', { timeout: 8000 });

    // PM 전용 사이드바 메뉴 확인
    await expect(page.getByRole('link', { name: /AI 매칭/ })).toBeVisible();
  });

  // ──────────────────────────────────────────────
  // 2. 사이드바 네비게이션
  // ──────────────────────────────────────────────
  test('2. 사이드바 네비게이션 — 내 프로젝트 이동', async ({ page }) => {
    await loginAs(page, 'PM');

    // PM 사이드바 "내 프로젝트" 링크
    await expect(page.getByRole('link', { name: /내 프로젝트/ })).toBeVisible();
    await page.getByRole('link', { name: /내 프로젝트/ }).click();
    await expect(page).toHaveURL(/\/app\/projects/);
  });

  // ──────────────────────────────────────────────
  // 3. AI 매칭 제안 생성
  // ──────────────────────────────────────────────
  test('3. AI 매칭 — 프로젝트 선택 후 제안 생성', async ({ page }) => {
    await loginAs(page, 'PM');
    await page.goto('/app/matching');

    // 프로젝트 목록에서 첫 번째 프로젝트 선택
    await expect(page.getByText('E2E 테스트 프로젝트')).toBeVisible({ timeout: 5000 });
    await page.getByText('E2E 테스트 프로젝트').click();

    // "AI 매칭 생성" 버튼 클릭
    await page.getByRole('button', { name: 'AI 매칭 생성' }).click();

    // 결과 카드에 김인재 등장 확인
    await expect(page.getByText('김인재')).toBeVisible({ timeout: 8000 });
  });

  // ──────────────────────────────────────────────
  // 4. 매칭 제안 수락
  // ──────────────────────────────────────────────
  test('4. 매칭 제안 수락', async ({ page }) => {
    await loginAs(page, 'PM');
    await page.goto('/app/matching');

    // 프로젝트 선택
    await expect(page.getByText('E2E 테스트 프로젝트')).toBeVisible({ timeout: 5000 });
    await page.getByText('E2E 테스트 프로젝트').click();

    // "김인재" 카드의 수락 버튼 클릭
    await expect(page.getByText('김인재')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: '수락' }).first().click();

    // 처리 완료 토스트 확인
    await expect(page.getByText('처리되었습니다.')).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────
  // 5. 계약 관리 페이지 진입
  // ──────────────────────────────────────────────
  test('5. 계약 관리 — 프로젝트 UUID 입력 후 계약 목록 확인', async ({ page }) => {
    await loginAs(page, 'PROCUREMENT');
    await page.goto('/app/contracts');

    // 프로젝트 UUID 입력
    await page.getByPlaceholder('프로젝트 UUID').fill(PROJECT_ID);
    await page.getByRole('button', { name: '이동' }).click();

    // 계약 관리 제목 확인
    await expect(page.getByRole('heading', { name: '계약 관리' })).toBeVisible({ timeout: 5000 });

    // DRAFT 상태 계약 배지 확인
    await expect(page.getByText('DRAFT')).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────
  // 6. 계약 서명
  // ──────────────────────────────────────────────
  test('6. 계약 서명 — DRAFT 계약 서명 후 SIGNED 확인', async ({ page }) => {
    await loginAs(page, 'PROCUREMENT');
    await page.goto('/app/contracts');

    await page.getByPlaceholder('프로젝트 UUID').fill(PROJECT_ID);
    await page.getByRole('button', { name: '이동' }).click();

    // DRAFT 계약의 서명 버튼 클릭
    await expect(page.getByRole('button', { name: '서명' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '서명' }).click();

    // 서명 완료 토스트 확인
    await expect(page.getByText(/계약 서명 완료/)).toBeVisible({ timeout: 5000 });
  });
});

// ──────────────────────────────────────────────
// 부가 테스트: 로그아웃
// ──────────────────────────────────────────────
test('로그아웃 — 사이드바 버튼 클릭 후 리다이렉트', async ({ page }) => {
  await mockApi(page);
  await loginAs(page, 'PM');

  // 사이드바는 기본으로 열려 있어 "로그아웃" 텍스트 버튼이 노출됨
  await page.getByRole('button', { name: '로그아웃' }).click();
  // clearAuth 후 navigate('/') → 랜딩 페이지
  await expect(page).toHaveURL('/', { timeout: 5000 });
});

import { test, expect } from '@playwright/test';
import { mockApi, loginAs, PROJECT_ID } from './helpers';

/**
 * Golden path: 로그인 → AI 매칭 → 계약 서명
 *
 * All backend calls are intercepted with mockApi() so the test runs
 * without a live Spring Boot instance.
 *
 * NOTE: page.goto() causes a full page reload which clears in-memory
 * Zustand state (accessToken is not persisted). After loginAs(), always
 * use SPA link clicks for navigation to preserve auth state.
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

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    await page.locator('input[type="email"]').fill('pm@linker.com');
    await page.locator('input[type="password"]').fill('Linker1234!');
    await page.getByRole('button', { name: '로그인' }).click();

    await page.waitForURL('/app', { timeout: 8000 });
    await expect(page.getByRole('link', { name: /AI 매칭/ })).toBeVisible();
  });

  // ──────────────────────────────────────────────
  // 2. 사이드바 네비게이션
  // ──────────────────────────────────────────────
  test('2. 사이드바 네비게이션 — 내 프로젝트 이동', async ({ page }) => {
    await loginAs(page, 'PM');

    // SPA 네비게이션 — 리로드 없이 accessToken 유지
    await page.getByRole('link', { name: /내 프로젝트/ }).click();
    await expect(page).toHaveURL(/\/app\/projects/);
  });

  // ──────────────────────────────────────────────
  // 3. AI 매칭 제안 생성
  // ──────────────────────────────────────────────
  test('3. AI 매칭 — 프로젝트 선택 후 제안 생성', async ({ page }) => {
    await loginAs(page, 'PM');

    // SPA 네비게이션
    await page.getByRole('link', { name: /AI 매칭/ }).click();
    await page.waitForURL(/\/app\/matching/, { timeout: 5000 });

    // 프로젝트 목록 로드 확인 후 선택
    await expect(page.getByText('E2E 테스트 프로젝트')).toBeVisible({ timeout: 5000 });
    await page.getByText('E2E 테스트 프로젝트').click();

    // AI 매칭 생성 → 제안 카드 확인
    await page.getByRole('button', { name: 'AI 매칭 생성' }).click();
    await expect(page.getByText('김인재')).toBeVisible({ timeout: 8000 });
  });

  // ──────────────────────────────────────────────
  // 4. 매칭 제안 수락
  // ──────────────────────────────────────────────
  test('4. 매칭 제안 수락', async ({ page }) => {
    await loginAs(page, 'PM');

    await page.getByRole('link', { name: /AI 매칭/ }).click();
    await page.waitForURL(/\/app\/matching/, { timeout: 5000 });

    await expect(page.getByText('E2E 테스트 프로젝트')).toBeVisible({ timeout: 5000 });
    await page.getByText('E2E 테스트 프로젝트').click();

    await expect(page.getByText('김인재')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: '수락' }).first().click();

    await expect(page.getByText('처리되었습니다.')).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────
  // 5. 계약 관리 페이지 진입
  // ──────────────────────────────────────────────
  test('5. 계약 관리 — 프로젝트 UUID 입력 후 계약 목록 확인', async ({ page }) => {
    await loginAs(page, 'PROCUREMENT');

    await page.getByRole('link', { name: /계약 관리/ }).click();
    await page.waitForURL(/\/app\/contracts/, { timeout: 5000 });

    await page.getByPlaceholder('프로젝트 UUID').fill(PROJECT_ID);
    await page.getByRole('button', { name: '이동' }).click();

    await expect(page.getByRole('heading', { name: '계약 관리' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('DRAFT')).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────
  // 6. 계약 서명
  // ──────────────────────────────────────────────
  test('6. 계약 서명 — DRAFT 계약 서명 후 SIGNED 확인', async ({ page }) => {
    await loginAs(page, 'PROCUREMENT');

    await page.getByRole('link', { name: /계약 관리/ }).click();
    await page.waitForURL(/\/app\/contracts/, { timeout: 5000 });

    await page.getByPlaceholder('프로젝트 UUID').fill(PROJECT_ID);
    await page.getByRole('button', { name: '이동' }).click();

    await expect(page.getByRole('button', { name: '서명' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '서명' }).click();
    await expect(page.getByText(/계약 서명 완료/)).toBeVisible({ timeout: 5000 });
  });
});

// ──────────────────────────────────────────────
// 부가 테스트: 로그아웃
// ──────────────────────────────────────────────
test('로그아웃 — 사이드바 버튼 클릭 후 리다이렉트', async ({ page }) => {
  await mockApi(page);
  await loginAs(page, 'PM');

  await page.getByRole('button', { name: '로그아웃' }).click();
  // clearAuth() → <Navigate to="/auth/login" replace> 가 navigate('/') 보다 먼저 실행됨
  await expect(page).toHaveURL(/auth\/login/, { timeout: 5000 });
});

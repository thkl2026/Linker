import { test, expect } from '@playwright/test';
import { mockApi, loginAs, PROJECT_ID } from './helpers';

/**
 * Golden path: 로그인 → AI 매칭 → 계약 서명
 *
 * - 백엔드 호출은 mockApi()로 전부 인터셉트 (Spring Boot 불필요)
 * - loginAs() 후에는 page.goto() 금지 → SPA 링크 클릭으로만 이동
 *   (accessToken 은 Zustand 메모리에만 존재; 페이지 리로드 시 소멸)
 */
test.describe('Linker 골든 패스', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  // 1. 로그인
  test('1. PM 로그인 — 이메일/비밀번호 플로우', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await page.locator('input[type="email"]').fill('pm@linker.com');
    await page.locator('input[type="password"]').fill('Linker1234!');
    await page.getByRole('button', { name: '로그인' }).click();

    await page.waitForURL('/app', { timeout: 8000 });
    await expect(page.getByRole('link', { name: /AI 매칭/ })).toBeVisible();
  });

  // 2. 사이드바 네비게이션
  test('2. 사이드바 네비게이션 — 내 프로젝트 이동', async ({ page }) => {
    await loginAs(page, 'PM');

    await page.getByRole('link', { name: /내 프로젝트/ }).click();
    await expect(page).toHaveURL(/\/app\/projects/);
  });

  // 3. AI 매칭 제안 생성
  test('3. AI 매칭 — 프로젝트 선택 후 제안 생성', async ({ page }) => {
    await loginAs(page, 'PM');

    // SPA 이동 (리로드 없이 accessToken 유지)
    await page.getByRole('link', { name: /AI 매칭/ }).click();
    await page.waitForURL(/\/app\/matching/, { timeout: 5000 });

    await expect(page.getByText('E2E 테스트 프로젝트')).toBeVisible({ timeout: 8000 });
    await page.getByText('E2E 테스트 프로젝트').click();

    await page.getByRole('button', { name: 'AI 매칭 생성' }).click();
    await expect(page.getByText('김인재')).toBeVisible({ timeout: 8000 });
  });

  // 4. 매칭 제안 수락
  test('4. 매칭 제안 수락', async ({ page }) => {
    await loginAs(page, 'PM');

    await page.getByRole('link', { name: /AI 매칭/ }).click();
    await page.waitForURL(/\/app\/matching/, { timeout: 5000 });

    await expect(page.getByText('E2E 테스트 프로젝트')).toBeVisible({ timeout: 8000 });
    await page.getByText('E2E 테스트 프로젝트').click();

    await expect(page.getByText('김인재')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: '수락' }).first().click();
    await expect(page.getByText('처리되었습니다.')).toBeVisible({ timeout: 5000 });
  });

  // 5. 계약 관리 페이지 진입
  test('5. 계약 관리 — 프로젝트 UUID 입력 후 계약 목록 확인', async ({ page }) => {
    await loginAs(page, 'PROCUREMENT');

    await page.getByRole('link', { name: /계약 관리/ }).click();
    await page.waitForURL(/\/app\/contracts/, { timeout: 5000 });

    await page.getByPlaceholder('프로젝트 UUID').fill(PROJECT_ID);
    await page.getByRole('button', { name: '이동' }).click();

    await expect(page.getByRole('heading', { name: '계약 관리' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('DRAFT')).toBeVisible({ timeout: 5000 });
  });

  // 6. 계약 서명
  test('6. 계약 서명 — DRAFT 계약 서명 후 SIGNED 확인', async ({ page }) => {
    await loginAs(page, 'PROCUREMENT');

    await page.getByRole('link', { name: /계약 관리/ }).click();
    await page.waitForURL(/\/app\/contracts/, { timeout: 5000 });

    await page.getByPlaceholder('프로젝트 UUID').fill(PROJECT_ID);
    await page.getByRole('button', { name: '이동' }).click();

    await expect(page.getByRole('button', { name: '서명', exact: true })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '서명', exact: true }).click();
    await expect(page.getByText(/계약 서명 완료/)).toBeVisible({ timeout: 5000 });
  });
});

// 7. 로그아웃
test('로그아웃 — 사이드바 버튼 클릭 후 리다이렉트', async ({ page }) => {
  await mockApi(page);
  await loginAs(page, 'PM');

  await page.getByRole('button', { name: '로그아웃' }).click();
  // clearAuth() 후 RootLayout 재렌더링 → <Navigate to="/auth/login" replace> 가 먼저 처리됨
  await expect(page).toHaveURL(/auth\/login/, { timeout: 5000 });
});

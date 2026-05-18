import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

/**
 * Golden path: 로그인 → AI 매칭 → 계약 생성·서명
 *
 * All backend calls are intercepted with mockApi() so the test runs
 * without a live Spring Boot instance.
 */
test.describe('Linker 골든 패스', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  // ──────────────────────────────────────────────
  // 1. 로그인 (OTP)
  // ──────────────────────────────────────────────
  test('1. PM 로그인 — OTP 플로우', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: /로그인/ })).toBeVisible();

    // 이메일 입력 + OTP 요청
    await page.getByPlaceholder('이메일').fill('pm@linker.co.kr');
    await page.getByRole('button', { name: /OTP|인증코드 전송/ }).click();

    // OTP 입력창 노출 확인
    await expect(
      page.locator('input[autocomplete="one-time-code"], [data-testid="otp-input"] input').first()
    ).toBeVisible({ timeout: 5000 });

    // 6자리 입력 (mockApi → 000000 허용)
    const inputs = page.locator('input[autocomplete="one-time-code"], [data-testid="otp-input"] input');
    const count = await inputs.count();
    if (count > 1) {
      for (let i = 0; i < 6; i++) await inputs.nth(i).fill('0');
    } else {
      await inputs.first().fill('000000');
    }

    await page.getByRole('button', { name: /확인|로그인|검증/ }).click();
    await page.waitForURL('/', { timeout: 8000 });
    await expect(page.getByText('테스트 PM')).toBeVisible();
  });

  // ──────────────────────────────────────────────
  // 2. 네비게이션 — 프로젝트 목록
  // ──────────────────────────────────────────────
  test('2. 사이드바 네비게이션 — 프로젝트 이동', async ({ page }) => {
    // 토큰을 스토리지에 미리 주입해 로그인 건너뜀
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-store',
        JSON.stringify({
          state: {
            token: 'test-token',
            userId: 'aaaaaaaa-0000-0000-0000-000000000001',
            role: 'PM',
            name: '테스트 PM',
          },
          version: 0,
        })
      );
    });
    await page.reload();
    await page.waitForURL('/', { timeout: 5000 });

    // 사이드바에 '프로젝트' 링크 확인
    await expect(page.getByRole('link', { name: /프로젝트/ })).toBeVisible();
    await page.getByRole('link', { name: /프로젝트/ }).click();
    await expect(page).toHaveURL(/\/projects/);
  });

  // ──────────────────────────────────────────────
  // 3. AI 매칭 제안 생성
  // ──────────────────────────────────────────────
  test('3. AI 매칭 — 프로젝트 선택 후 제안 생성', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-store',
        JSON.stringify({
          state: {
            token: 'test-token',
            userId: 'aaaaaaaa-0000-0000-0000-000000000001',
            role: 'PM',
            name: '테스트 PM',
          },
          version: 0,
        })
      );
    });
    await page.reload();

    // 매칭 메뉴로 이동
    await page.getByRole('link', { name: /매칭/ }).click();
    await expect(page).toHaveURL(/\/matching/);

    // "AI 매칭 실행" 버튼 (프로젝트 선택 후 활성)
    const runBtn = page.getByRole('button', { name: /AI 매칭|매칭 실행/ });
    if (await runBtn.isDisabled()) {
      // 프로젝트 셀렉트가 있으면 첫 번째 옵션 선택
      const projectSelect = page.locator('select, [role="combobox"]').first();
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }
    }
    await runBtn.click();

    // 결과 카드 노출 확인
    await expect(page.getByText('김인재')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('0.92')).toBeVisible();
  });

  // ──────────────────────────────────────────────
  // 4. 매칭 제안 수락
  // ──────────────────────────────────────────────
  test('4. 매칭 제안 수락', async ({ page }) => {
    await page.goto('/matching');
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-store',
        JSON.stringify({
          state: {
            token: 'test-token',
            userId: 'aaaaaaaa-0000-0000-0000-000000000001',
            role: 'PM',
            name: '테스트 PM',
          },
          version: 0,
        })
      );
    });
    await page.reload();
    await expect(page).toHaveURL(/\/matching/);

    await expect(page.getByText('김인재')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: /수락|Accept/ }).first().click();

    // 수락 완료 피드백 (토스트 or 상태 뱃지 변경)
    await expect(
      page.getByText(/수락|ACCEPTED/i)
    ).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────
  // 5. 계약 생성 (PROCUREMENT 역할)
  // ──────────────────────────────────────────────
  test('5. 계약 생성 — 단가 및 금액 입력 후 저장', async ({ page }) => {
    await page.goto('/contracts');
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-store',
        JSON.stringify({
          state: {
            token: 'test-token',
            userId: 'bbbbbbbb-0000-0000-0000-000000000002',
            role: 'PROCUREMENT',
            name: '구매담당자',
          },
          version: 0,
        })
      );
    });
    await page.reload();
    await expect(page).toHaveURL(/\/contracts/);

    // 새 계약 버튼
    await page.getByRole('button', { name: /새 계약|계약 생성/ }).click();

    // 폼 작성
    await page.getByLabel(/프로젝트/).selectOption({ index: 1 });
    await page.getByLabel(/인력/).selectOption({ index: 1 });
    await page.getByLabel(/단가/).fill('8000000');
    await page.getByLabel(/총액/).fill('96000000');

    const terms = page.getByLabel(/계약 조건|조건/);
    if (await terms.isVisible()) {
      await terms.fill('월 단위 계약. 매월 말일 정산.');
    }

    await page.getByRole('button', { name: /저장|생성/ }).click();

    // 생성 확인
    await expect(page.getByText(/DRAFT|계약이 생성/i)).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────
  // 6. 계약 서명
  // ──────────────────────────────────────────────
  test('6. 계약 서명 — PDF 생성 후 SIGNED 상태 확인', async ({ page }) => {
    await page.goto('/contracts');
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-store',
        JSON.stringify({
          state: {
            token: 'test-token',
            userId: 'bbbbbbbb-0000-0000-0000-000000000002',
            role: 'PROCUREMENT',
            name: '구매담당자',
          },
          version: 0,
        })
      );
    });
    await page.reload();

    // DRAFT 상태 계약 카드의 서명 버튼
    const signBtn = page.getByRole('button', { name: /서명|Sign/ }).first();
    await expect(signBtn).toBeVisible({ timeout: 5000 });
    await signBtn.click();

    // SIGNED 상태 배지 확인
    await expect(page.getByText(/SIGNED/i)).toBeVisible({ timeout: 8000 });
  });
});

// ──────────────────────────────────────────────
// 부가 테스트: 로그아웃
// ──────────────────────────────────────────────
test('로그아웃 — 인증 스토어 초기화 후 로그인 페이지 리다이렉트', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'auth-store',
      JSON.stringify({
        state: {
          token: 'test-token',
          userId: 'aaaaaaaa-0000-0000-0000-000000000001',
          role: 'PM',
          name: '테스트 PM',
        },
        version: 0,
      })
    );
  });
  await page.reload();

  await page.getByRole('button', { name: /로그아웃/ }).click();
  await page.waitForURL('/auth/login', { timeout: 5000 });
  await expect(page.getByRole('heading', { name: /로그인/ })).toBeVisible();
});

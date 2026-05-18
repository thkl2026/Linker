import { Page } from '@playwright/test';

const API_BASE = process.env.API_BASE ?? 'http://localhost:8080';

export async function loginAs(page: Page, email: string) {
  await page.goto('/auth/login');
  await page.getByPlaceholder('이메일').fill(email);
  await page.getByRole('button', { name: /OTP|인증코드 전송/ }).click();

  // In CI/test environment the backend returns a fixed OTP seed; use mock intercept
  await page.waitForSelector('[data-testid="otp-input"], input[autocomplete="one-time-code"]', {
    timeout: 5000,
  });

  // Fill OTP — test profile returns 000000
  const otpInputs = page.locator('input[autocomplete="one-time-code"], [data-testid="otp-input"] input');
  const count = await otpInputs.count();
  if (count > 1) {
    for (let i = 0; i < 6; i++) await otpInputs.nth(i).fill('0');
  } else {
    await otpInputs.first().fill('000000');
  }
  await page.getByRole('button', { name: /확인|로그인|검증/ }).click();
  await page.waitForURL('/', { timeout: 8000 });
}

export async function mockApi(page: Page) {
  await page.route(`${API_BASE}/api/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/auth/otp/request')) {
      return route.fulfill({ status: 200, body: '{}' });
    }
    if (url.includes('/auth/otp/verify')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'test-token',
          userId: 'aaaaaaaa-0000-0000-0000-000000000001',
          role: 'PM',
          name: '테스트 PM',
        }),
      });
    }
    if (url.includes('/projects') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'proj-0001-0000-0000-000000000001',
            title: 'E2E 테스트 프로젝트',
            description: 'Playwright 골든패스 테스트용',
            status: 'OPEN',
            requiredSkills: 'Java, Spring',
          },
        ]),
      });
    }
    if (url.includes('/matching/proposals') && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ proposalsCreated: 3 }),
      });
    }
    if (url.includes('/matching/proposals') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [
            {
              id: 'prop-0001-0000-0000-000000000001',
              talentId: 'tale-0001-0000-0000-000000000001',
              talentName: '김인재',
              similarityScore: '0.92',
              matchReason: 'Java/Spring 전문가, 금융 프로젝트 경험 다수',
              strengths: ['Spring Boot 숙련', 'AWS 경험'],
              concerns: [],
              status: 'PENDING',
            },
          ],
          totalPages: 1,
          totalElements: 1,
        }),
      });
    }
    if (url.includes('/proposals') && url.includes('/respond') && method === 'POST') {
      return route.fulfill({ status: 200, body: '{}' });
    }
    if (url.includes('/contracts') && method === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'cont-0001-0000-0000-000000000001',
          status: 'DRAFT',
          unitPrice: 8000000,
          totalAmount: 96000000,
        }),
      });
    }
    if (url.includes('/contracts') && url.includes('/sign') && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'cont-0001-0000-0000-000000000001',
          status: 'SIGNED',
          fileUrl: 'https://minio.example.com/contracts/test.pdf',
        }),
      });
    }

    // pass through anything else
    return route.continue();
  });
}

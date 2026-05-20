import { Page } from '@playwright/test';

const PROJECT_ID = 'proj-0001-0000-0000-000000000001';
const CONTRACT_ID = 'cont-0001-0000-0000-000000000001';
const PROPOSAL_ID = 'prop-0001-0000-0000-000000000001';

export async function mockApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/auth/login') && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresIn: 900,
          role: 'PM',
        }),
      });
    }
    if (url.includes('/auth/logout')) {
      return route.fulfill({ status: 200, body: '{}' });
    }
    if (url.includes('/projects/me') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [
            {
              id: PROJECT_ID,
              title: 'E2E 테스트 프로젝트',
              description: 'Playwright 골든패스 테스트용',
              requiredSkills: 'Java, Spring',
              status: 'OPEN',
              pmId: 'aaaaaaaa-0000-0000-0000-000000000001',
              createdAt: '2026-01-01T00:00:00',
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 50,
          number: 0,
        }),
      });
    }
    if (url.includes('/recommendations') && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ created: 1 }),
      });
    }
    if (url.includes('/proposals') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [
            {
              id: PROPOSAL_ID,
              projectId: PROJECT_ID,
              talentId: 'tale-0001-0000-0000-000000000001',
              talentName: '김인재',
              similarityScore: 0.92,
              matchReason: 'Java/Spring 전문가, 금융 프로젝트 경험 다수',
              strengths: ['Spring Boot 숙련', 'AWS 경험'],
              concerns: [],
              interviewGuide: [],
              status: 'PENDING',
              createdAt: '2026-01-01T00:00:00',
            },
          ],
          totalElements: 1,
          totalPages: 1,
        }),
      });
    }
    if (url.includes('/proposals') && url.includes('/respond')) {
      return route.fulfill({ status: 200, body: '{}' });
    }
    if (url.includes('/contracts/by-project') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: CONTRACT_ID,
            projectId: PROJECT_ID,
            talentId: 'tale-0001-0000-0000-000000000001',
            unitPrice: 8000000,
            totalAmount: 96000000,
            status: 'DRAFT',
            contractFileUrl: null,
            aiPriceAnalysis: null,
            signedAt: null,
            createdAt: '2026-01-01T00:00:00',
          },
        ]),
      });
    }
    if (url.includes('/contracts/') && url.includes('/sign') && method === 'PUT') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: CONTRACT_ID,
          projectId: PROJECT_ID,
          talentId: 'tale-0001-0000-0000-000000000001',
          unitPrice: 8000000,
          totalAmount: 96000000,
          status: 'SIGNED',
          contractFileUrl: 'https://minio.example.com/contracts/test.pdf',
          aiPriceAnalysis: null,
          signedAt: '2026-01-01T12:00:00',
          createdAt: '2026-01-01T00:00:00',
        }),
      });
    }
    if (url.includes('/timesheets') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.includes('/settlements') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }

    return route.continue();
  });
}

export async function loginAs(page: Page, role: 'PM' | 'PROCUREMENT' = 'PM') {
  // Override role in the login mock response
  await page.route('**/api/v1/auth/login', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 900,
        role,
      }),
    });
  });

  const email = role === 'PM' ? 'pm@linker.com' : 'proc@linker.com';
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill('Linker1234!');
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('/app', { timeout: 8000 });
}

export { PROJECT_ID, CONTRACT_ID };

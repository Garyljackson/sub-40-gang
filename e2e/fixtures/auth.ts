/**
 * E2E test fixtures for authentication
 * Provides helpers to set up authenticated sessions in Playwright
 */
import { test as base, type Page } from '@playwright/test';
import { SignJWT } from 'jose';

// Test user data (matches seed.sql)
export const testUser = {
  memberId: '11111111-1111-1111-1111-111111111111',
  stravaAthleteId: '10001',
  name: 'Alice Runner',
};

const SESSION_COOKIE_NAME = 's40g_session';

// JWT secret for testing - should match the env var used in tests
const TEST_JWT_SECRET = 'test-jwt-secret-for-e2e-testing';

/**
 * Generate a valid JWT token for testing
 */
async function generateTestToken(payload: {
  memberId: string;
  stravaAthleteId: string;
  name: string;
}): Promise<string> {
  const secret = new TextEncoder().encode(TEST_JWT_SECRET);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);
}

/**
 * Extended test fixture that provides an authenticated page
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Generate valid session token
    const token = await generateTestToken(testUser);

    // Set the session cookie before navigating
    await page.context().addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect } from '@playwright/test';

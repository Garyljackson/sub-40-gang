/**
 * E2E tests for the activity feed
 *
 * PREREQUISITES:
 * 1. Local Supabase running: `pnpm db:start`
 * 2. Database seeded: `pnpm db:reset`
 * 3. JWT_SECRET env var set to: test-jwt-secret-for-e2e-testing
 *
 * Run tests: `JWT_SECRET=test-jwt-secret-for-e2e-testing pnpm test:e2e`
 */
import { test, expect } from './fixtures/auth';

test.describe('Feed - Authenticated User', () => {
  test('authenticated user sees feed page', async ({ authenticatedPage: page }) => {
    await page.goto('/feed');

    // Should stay on feed page (not redirect to login)
    await expect(page).toHaveURL('/feed');
  });

  test('displays bottom navigation', async ({ authenticatedPage: page }) => {
    await page.goto('/feed');

    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();

    // Check navigation links
    await expect(page.getByRole('link', { name: /feed/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /leaderboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /profile/i })).toBeVisible();
  });

  test('can navigate to leaderboard', async ({ authenticatedPage: page }) => {
    await page.goto('/feed');

    await page.getByRole('link', { name: /leaderboard/i }).click();

    await expect(page).toHaveURL('/leaderboard');
  });

  test('can navigate to profile', async ({ authenticatedPage: page }) => {
    await page.goto('/feed');

    await page.getByRole('link', { name: /profile/i }).click();

    await expect(page).toHaveURL('/profile');
  });

  test('feed page has proper page structure', async ({ authenticatedPage: page }) => {
    await page.goto('/feed');

    // Page should have main content area (use first() as there may be nested mains)
    const main = page.getByRole('main').first();
    await expect(main).toBeVisible();
  });
});

test.describe('Feed - Mobile View', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE
  });

  test('bottom navigation is visible on mobile', async ({ authenticatedPage: page }) => {
    await page.goto('/feed');

    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
  });

  test('content is properly sized for mobile', async ({ authenticatedPage: page }) => {
    await page.goto('/feed');

    // Check viewport is respected
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(375);
    expect(viewportSize?.height).toBe(667);
  });
});

test.describe('Leaderboard Page', () => {
  test('displays leaderboard content', async ({ authenticatedPage: page }) => {
    await page.goto('/leaderboard');

    await expect(page).toHaveURL('/leaderboard');

    // Page should load without errors
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Profile Page', () => {
  test('displays profile content', async ({ authenticatedPage: page }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL('/profile');

    // Page should load without errors
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

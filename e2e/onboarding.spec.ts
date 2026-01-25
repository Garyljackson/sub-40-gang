/**
 * E2E tests for onboarding/login flow
 *
 * These tests verify the unauthenticated user experience.
 * Note: We can't test the full Strava OAuth flow in E2E tests
 * since it requires real Strava credentials.
 */
import { test, expect } from '@playwright/test';

test.describe('Onboarding - Unauthenticated', () => {
  test('shows login page with app branding', async ({ page }) => {
    await page.goto('/');

    // Check app branding
    await expect(page.getByRole('heading', { name: 'S40G' })).toBeVisible();
    await expect(page.getByText('Sub 40 Gang')).toBeVisible();
  });

  test('displays app description', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(/track your running milestones/i)).toBeVisible();
    await expect(page.getByText(/10km in under 40 minutes/i)).toBeVisible();
  });

  test('shows Sign in with Strava button', async ({ page }) => {
    await page.goto('/');

    const stravaButton = page.getByRole('link', { name: /sign in with strava/i });
    await expect(stravaButton).toBeVisible();
  });

  test('Strava button links to OAuth endpoint', async ({ page }) => {
    await page.goto('/');

    const stravaButton = page.getByRole('link', { name: /sign in with strava/i });
    await expect(stravaButton).toHaveAttribute('href', /\/api\/auth\/strava/);
  });

  test('displays milestone preview icons', async ({ page }) => {
    await page.goto('/');

    // Check all 5 milestone previews are visible (use exact match to avoid partial matches)
    await expect(page.getByText('1km', { exact: true })).toBeVisible();
    await expect(page.getByText('2km', { exact: true })).toBeVisible();
    await expect(page.getByText('5km', { exact: true })).toBeVisible();
    await expect(page.getByText('7.5km', { exact: true })).toBeVisible();
    await expect(page.getByText('10km', { exact: true })).toBeVisible();
  });

  test('shows Strava sync message', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByText(/connect your strava account to automatically sync/i)
    ).toBeVisible();
  });
});

test.describe('Onboarding - Navigation Guards', () => {
  test('redirects unauthenticated user from /feed to login', async ({ page }) => {
    await page.goto('/feed');

    // Should redirect to login page
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'S40G' })).toBeVisible();
  });

  test('redirects unauthenticated user from /leaderboard to login', async ({ page }) => {
    await page.goto('/leaderboard');

    await expect(page).toHaveURL('/');
  });

  test('redirects unauthenticated user from /profile to login', async ({ page }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL('/');
  });
});

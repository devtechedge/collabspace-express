import { expect, test } from '@playwright/test';

test.describe('CollabSpace smokes', () => {
  test('shell renders sidebar, theme toggle, and join form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('theme-toggle')).toBeVisible();
    await expect(page.getByTestId('create-board-form')).toBeVisible();
    await expect(page.getByTestId('join-room-input')).toBeVisible();
    await expect(page.getByText('CollabSpace').first()).toBeVisible();
  });

  test('creates a board and shows the drawing toolbar', async ({ page }) => {
    const name = `CI Sprint ${Date.now()}`;
    await page.goto('/');
    await expect(page.getByTestId('offline-banner')).toHaveCount(0);
    await page.getByTestId('create-board-input').fill(name);
    await page.getByTestId('create-board-submit').click();
    await expect(page.getByTestId('toolbar')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('drawing-canvas')).toBeVisible();
    await expect(page.getByTestId('room-code')).toBeVisible();
    await expect(page.getByText(name).first()).toBeVisible();
    await expect(page.getByTestId('offline-banner')).toHaveCount(0);
  });

  test('pencil tool can be selected after a board exists', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-board-input').fill(`Tool Check ${Date.now()}`);
    await page.getByTestId('create-board-submit').click();
    await expect(page.getByTestId('toolbar')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('tool-pencil').click();
    await expect(page.getByTestId('tool-pencil')).toHaveClass(/active/);
    await page.getByTestId('tool-select').click();
    await expect(page.getByTestId('tool-select')).toHaveClass(/active/);
  });

  test('theme toggle sets data-theme=dark on <html>', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(page.getByTestId('theme-toggle')).toBeVisible();
    await page.getByTestId('theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.getByTestId('theme-toggle').click();
    await expect(html).not.toHaveAttribute('data-theme', 'dark');
  });
});

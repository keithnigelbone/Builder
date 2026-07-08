import { test, expect } from '@playwright/test';

/**
 * Hermetic smoke of the whole guided flow on the deterministic fallback
 * path (RELIANCE_BUILDER_DISABLE_AI=1 → every proxy 503s → fallbackPlan.ts
 * authors the content). Asserts the preview-first product contract, not
 * AI quality.
 */
test('guided flow renders a polished preview with details collapsed', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Reliance', { exact: true })).toBeVisible();

  await page.getByPlaceholder('What would you like to build today?').fill('A campaign page for rooftop solar');
  await page.getByRole('button', { name: 'Build' }).click();

  // Fallback classification reuses the category's hand-authored questions.
  await expect(page.getByText('What type of website do you want to build?')).toBeVisible();
  await page.getByText('Campaign page', { exact: true }).click();

  await expect(page.getByText('What is the main goal of the website?')).toBeVisible();
  await page.getByText('Launch', { exact: true }).click();

  // Preview-first: the result screen leads with the rendered canvas.
  await expect(page.getByText("Here's what we'd build")).toBeVisible();
  await expect(page.getByText('A headline that sells the idea').first()).toBeVisible();

  // Technical detail stays collapsed until asked for.
  await expect(page.getByText('What Claude understood')).not.toBeVisible();
  await page.getByText('Build details').click();
  await expect(page.getByText('What Claude understood')).toBeVisible();
  await expect(page.getByText('Layout pattern')).toBeVisible();

  // Refine affordance is present.
  await expect(page.getByText('Refine prompt')).toBeVisible();
});

test('quick CTAs start a category directly', async ({ page }) => {
  await page.goto('/');

  await page.getByText('Slides', { exact: true }).click();

  await expect(page.getByText('What kind of slide do you want to create?')).toBeVisible();
});

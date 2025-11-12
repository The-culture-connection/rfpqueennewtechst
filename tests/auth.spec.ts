import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display landing page correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check main heading
    await expect(page.getByRole('heading', { name: /Find Your Perfect Funding Match/i })).toBeVisible();
    
    // Check CTA buttons
    await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Log In/i })).toBeVisible();
    
    // Check feature cards
    await expect(page.getByText(/Smart Matching/i)).toBeVisible();
    await expect(page.getByText(/Win Rate Predictions/i)).toBeVisible();
    await expect(page.getByText(/Opportunity Tracker/i)).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Get Started/i }).click();
    
    await expect(page).toHaveURL('/signup');
    await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible();
  });

  test('should show validation on signup form', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill in email only
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[id="password"]', '12345');
    await page.fill('input[id="confirmPassword"]', '123456');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Should show password mismatch error
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible();
  });

  test('should show password length validation', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[id="password"]', '123');
    await page.fill('input[id="confirmPassword"]', '123');
    
    await page.click('button[type="submit"]');
    
    await expect(page.getByText(/Password must be at least 6 characters/i)).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Log In/i }).click();
    
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  });

  test('should have link from signup to login', async ({ page }) => {
    await page.goto('/signup');
    
    await expect(page.getByText(/Already have an account/i)).toBeVisible();
    await page.getByRole('link', { name: /Log in/i }).click();
    
    await expect(page).toHaveURL('/login');
  });

  test('should have link from login to signup', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.getByText(/Don't have an account/i)).toBeVisible();
    await page.getByRole('link', { name: /Sign up/i }).click();
    
    await expect(page).toHaveURL('/signup');
  });
});


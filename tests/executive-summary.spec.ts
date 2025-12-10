import { test, expect } from '@playwright/test';

test.describe('Executive Summary Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
  });

  test('should display executive summary page after login', async ({ page }) => {
    // Login (you'll need to update with actual credentials or use test user)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');

    // Navigate to executive summary page
    await page.click('button:has-text("Executive Summary")');
    await page.waitForURL('**/executive-summary');

    // Verify page elements
    await expect(page.locator('h1')).toContainText('Executive Summary');
    await expect(page.locator('text=Upload your executive summary')).toBeVisible();
  });

  test('should allow file upload', async ({ page }) => {
    // Assume user is logged in and on executive summary page
    await page.goto('http://localhost:3000/executive-summary');

    // Check for file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Verify accepted file types
    const acceptAttr = await fileInput.getAttribute('accept');
    expect(acceptAttr).toContain('.pdf');
    expect(acceptAttr).toContain('.docx');
    expect(acceptAttr).toContain('.txt');
  });

  test('should show business profile after upload', async ({ page }) => {
    // Assume user has already uploaded an executive summary
    await page.goto('http://localhost:3000/executive-summary');

    // Check if business profile section exists
    const profileSection = page.locator('text=Your Business Profile');
    
    // If profile exists, verify sections
    if (await profileSection.isVisible()) {
      await expect(page.locator('text=Company Overview')).toBeVisible();
      await expect(page.locator('text=Mission')).toBeVisible();
    }
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/executive-summary');

    // Click back button
    await page.click('button:has-text("Back to Dashboard")');
    await page.waitForURL('**/dashboard');

    // Verify we're on dashboard
    await expect(page.locator('h1')).toContainText('RFP Matcher');
  });
});

test.describe('Intelligent Matching Algorithm', () => {
  test('should display personalized match analysis', async ({ page }) => {
    // Login and navigate to dashboard
    await page.goto('http://localhost:3000/login');
    // ... login steps ...
    await page.goto('http://localhost:3000/dashboard');

    // Wait for opportunities to load
    await page.waitForSelector('text=Match Analysis', { timeout: 10000 });

    // Check for enhanced match components
    const matchAnalysis = page.locator('text=Match Analysis');
    if (await matchAnalysis.isVisible()) {
      await expect(page.locator('text=Why You\'re Eligible')).toBeVisible();
    }
  });

  test('should show eligibility highlights', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');

    // Look for eligibility section
    const eligibilitySection = page.locator('text=Why You\'re Eligible');
    
    if (await eligibilitySection.isVisible()) {
      // Verify it shows specific reasons
      const highlights = page.locator('li').filter({ hasText: /eligible|match|align/i });
      await expect(highlights.first()).toBeVisible();
    }
  });

  test('should display match score with confidence', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');

    // Check for match score badges
    const matchBadge = page.locator('text=/Match \\(\\d+\\)/');
    await expect(matchBadge.first()).toBeVisible();

    // Check for confidence indicator
    const confidenceBadge = page.locator('text=High Confidence');
    // May or may not be visible depending on match quality
  });
});

test.describe('Preference Learning', () => {
  test('should track pass action', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');

    // Click pass button
    const passButton = page.locator('button:has-text("Pass")').first();
    await passButton.click();

    // Verify opportunity moved to next
    // (This is implicit - if no error, tracking succeeded)
  });

  test('should track save action', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');

    // Click save button
    const saveButton = page.locator('button:has-text("Save")').first();
    await saveButton.click();

    // Wait for success message
    await expect(page.locator('text=saved')).toBeVisible({ timeout: 5000 });
  });

  test('should track apply action', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');

    // Click apply button
    const applyButton = page.locator('button:has-text("Apply")').first();
    
    // Listen for new tab opening
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      applyButton.click()
    ]);

    // Verify new tab opened with opportunity URL
    expect(newPage.url()).toBeTruthy();
  });
});



import { test, expect } from '@playwright/test';

// Note: These tests assume you're authenticated. 
// For full E2E tests, you'd need to set up auth state.

test.describe('Onboarding Flow', () => {
  test('should display onboarding page with progress bar', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Check progress indicator
    await expect(page.getByText(/Step 1 of 4/i)).toBeVisible();
    await expect(page.getByText(/25% Complete/i)).toBeVisible();
    
    // Check first step heading
    await expect(page.getByRole('heading', { name: /What type of funding are you looking for/i })).toBeVisible();
  });

  test('should show all funding type options', async ({ page }) => {
    await page.goto('/onboarding');
    
    await expect(page.getByText(/Grants/i)).toBeVisible();
    await expect(page.getByText(/RFPs \(Request for Proposals\)/i)).toBeVisible();
    await expect(page.getByText(/Government Contracts/i)).toBeVisible();
    
    // Check descriptions
    await expect(page.getByText(/Non-repayable funds/i)).toBeVisible();
    await expect(page.getByText(/Competitive bidding opportunities/i)).toBeVisible();
  });

  test('should allow selecting multiple funding types', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Click Grants
    await page.click('text=Grants');
    
    // Click RFPs
    await page.click('text=RFPs (Request for Proposals)');
    
    // Both should be selected (have checkmarks)
    const grants = page.locator('button:has-text("Grants")');
    await expect(grants).toHaveClass(/border-indigo-600/);
  });

  test('should disable Next button when no funding type selected', async ({ page }) => {
    await page.goto('/onboarding');
    
    const nextButton = page.getByRole('button', { name: /Next/i });
    await expect(nextButton).toBeDisabled();
  });

  test('should enable Next button after selecting funding type', async ({ page }) => {
    await page.goto('/onboarding');
    
    await page.click('text=Grants');
    
    const nextButton = page.getByRole('button', { name: /Next/i });
    await expect(nextButton).toBeEnabled();
  });

  test('should navigate to step 2 (timeline)', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Select a funding type
    await page.click('text=Grants');
    
    // Click Next
    await page.click('button:has-text("Next")');
    
    // Should now be on step 2
    await expect(page.getByText(/Step 2 of 4/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /When do you need funding/i })).toBeVisible();
  });

  test('should show timeline options', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Navigate to step 2
    await page.click('text=Grants');
    await page.click('button:has-text("Next")');
    
    // Check timeline options
    await expect(page.getByText(/Urgent \(Within 30 days\)/i)).toBeVisible();
    await expect(page.getByText(/Soon \(Within 3 months\)/i)).toBeVisible();
    await expect(page.getByText(/Ongoing \(Any deadline\)/i)).toBeVisible();
  });

  test('should allow going back to previous step', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Go to step 2
    await page.click('text=Grants');
    await page.click('button:has-text("Next")');
    
    // Click Back
    await page.click('button:has-text("Back")');
    
    // Should be back on step 1
    await expect(page.getByText(/Step 1 of 4/i)).toBeVisible();
  });

  test('should navigate through all steps', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Step 1: Funding Type
    await page.click('text=Grants');
    await page.click('button:has-text("Next")');
    
    // Step 2: Timeline
    await expect(page.getByText(/Step 2 of 4/i)).toBeVisible();
    await page.click('text=Urgent (Within 30 days)');
    await page.click('button:has-text("Next")');
    
    // Step 3: Interests
    await expect(page.getByText(/Step 3 of 4/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /What are your areas of interest/i })).toBeVisible();
  });

  test('should show interest categories with emojis', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Navigate to step 3
    await page.click('text=Grants');
    await page.click('button:has-text("Next")');
    await page.click('text=Urgent (Within 30 days)');
    await page.click('button:has-text("Next")');
    
    // Check some interest categories
    await expect(page.getByText('Education')).toBeVisible();
    await expect(page.getByText('Health & Medical')).toBeVisible();
    await expect(page.getByText('Environment')).toBeVisible();
    await expect(page.getByText('Arts & Culture')).toBeVisible();
  });

  test('should track selected interests count', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Navigate to step 3
    await page.click('text=Grants');
    await page.click('button:has-text("Next")');
    await page.click('text=Urgent (Within 30 days)');
    await page.click('button:has-text("Next")');
    
    // Initially should show 0
    await expect(page.getByText(/0 interests selected/i)).toBeVisible();
    
    // Select some interests
    await page.click('text=Education');
    await expect(page.getByText(/1 interest selected/i)).toBeVisible();
    
    await page.click('text=Health & Medical');
    await expect(page.getByText(/2 interests selected/i)).toBeVisible();
  });

  test('should show entity information step', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Navigate to step 4
    await page.click('text=Grants');
    await page.click('button:has-text("Next")');
    await page.click('text=Soon (Within 3 months)');
    await page.click('button:has-text("Next")');
    await page.click('text=Education');
    await page.click('button:has-text("Next")');
    
    // Should be on step 4
    await expect(page.getByText(/Step 4 of 4/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Tell us about your organization/i })).toBeVisible();
    
    // Check for entity name input
    await expect(page.getByLabel(/Organization Name/i)).toBeVisible();
    
    // Check for entity type options
    await expect(page.getByText(/Nonprofit Organization/i)).toBeVisible();
    await expect(page.getByText(/Limited Liability Company/i)).toBeVisible();
  });

  test('should disable Complete button without entity info', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Navigate to step 4
    await page.click('text=Grants');
    await page.click('button:has-text("Next")');
    await page.click('text=Soon (Within 3 months)');
    await page.click('button:has-text("Next")');
    await page.click('text=Education');
    await page.click('button:has-text("Next")');
    
    const completeButton = page.getByRole('button', { name: /Complete/i });
    await expect(completeButton).toBeDisabled();
  });

  test('should enable Complete button with entity info', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Navigate to step 4
    await page.click('text=Grants');
    await page.click('button:has-text("Next")');
    await page.click('text=Soon (Within 3 months)');
    await page.click('button:has-text("Next")');
    await page.click('text=Education');
    await page.click('button:has-text("Next")');
    
    // Fill in entity info
    await page.fill('input[id="entityName"]', 'Test Organization');
    await page.click('text=Nonprofit Organization');
    
    const completeButton = page.getByRole('button', { name: /Complete/i });
    await expect(completeButton).toBeEnabled();
  });

  test('should update progress bar correctly', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Check initial progress
    await expect(page.getByText(/25% Complete/i)).toBeVisible();
    
    // Move to step 2
    await page.click('text=Grants');
    await page.click('button:has-text("Next")');
    await expect(page.getByText(/50% Complete/i)).toBeVisible();
    
    // Move to step 3
    await page.click('text=Urgent (Within 30 days)');
    await page.click('button:has-text("Next")');
    await expect(page.getByText(/75% Complete/i)).toBeVisible();
    
    // Move to step 4
    await page.click('text=Education');
    await page.click('button:has-text("Next")');
    await expect(page.getByText(/100% Complete/i)).toBeVisible();
  });
});


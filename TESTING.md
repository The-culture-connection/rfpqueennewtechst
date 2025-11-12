# Testing Guide for RFP Matcher Web App

## 🧪 Playwright Tests Included

I've written comprehensive tests for all completed features:

### Authentication Tests (`tests/auth.spec.ts`)
- ✅ Landing page displays correctly
- ✅ Navigation to signup/login pages
- ✅ Form validation (password mismatch, length requirements)
- ✅ Links between login and signup pages
- ✅ All UI elements are visible and accessible

### Onboarding Tests (`tests/onboarding.spec.ts`)
- ✅ Progress bar shows correct percentages
- ✅ All 4 steps display correctly
- ✅ Funding type selection (multi-select)
- ✅ Timeline selection (single-select)
- ✅ Interests selection with counter
- ✅ Entity information form validation
- ✅ Navigation between steps (Next/Back buttons)
- ✅ Button enable/disable states
- ✅ Complete button validation

## 🚀 Quick Start

### 1. Setup Environment Variables

Create `.env.local` in the `webapp` directory:

```bash
# Get these from Firebase Console
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=therfpqueen-f11fd.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=therfpqueen-f11fd
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=therfpqueen-f11fd.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

See `env-setup-instructions.txt` for detailed steps.

### 2. Install Dependencies

```bash
cd webapp
npm install
```

### 3. Install Playwright Browsers

```bash
npx playwright install
```

## 🎯 Running Tests

### Run All Tests (Headless)
```bash
npm test
```

### Run Tests with UI (Recommended for Development)
```bash
npm run test:ui
```
This opens Playwright's interactive UI where you can:
- See all tests
- Run tests one by one
- Watch tests in slow motion
- Debug failures

### Run Tests in Headed Mode (See the Browser)
```bash
npm run test:headed
```

### Run Specific Test File
```bash
npx playwright test tests/auth.spec.ts
```

### Run Tests in Debug Mode
```bash
npx playwright test --debug
```

### View Test Report (After Running Tests)
```bash
npm run test:report
```

## 🏃 Running the Development Server

```bash
npm run dev
```

Then open: http://localhost:3000

## 📋 Test Coverage

### ✅ Currently Tested (Phases 1-3)
- Landing page
- Sign up flow and validation
- Login flow and navigation
- Onboarding questionnaire (all 4 steps)
- Form validations
- Navigation and routing
- UI element visibility

### ⏳ Not Yet Tested (Phases 4-5 - Not Built Yet)
- Dashboard with opportunity cards
- Win rate calculations
- Opportunity tracker (save/apply/skip)
- Firestore data fetching
- Authenticated routes

## 🐛 Manual Testing Checklist

While the dev server is running, manually test:

### Landing Page
- [ ] Page loads without errors
- [ ] Hero section is visible
- [ ] "Get Started" button works
- [ ] "Log In" button works
- [ ] Feature cards display

### Sign Up Flow
1. [ ] Navigate to /signup
2. [ ] Try submitting with mismatched passwords → Should show error
3. [ ] Try submitting with short password → Should show error
4. [ ] Enter valid email/password → Should create account
5. [ ] Should redirect to /onboarding

### Login Flow
1. [ ] Navigate to /login
2. [ ] Enter correct credentials → Should log in
3. [ ] If profile incomplete → Redirect to /onboarding
4. [ ] If profile complete → Redirect to /dashboard (once built)

### Onboarding Flow
1. [ ] **Step 1:** Select at least one funding type
   - [ ] Next button disabled until selection made
   - [ ] Can select multiple options
   - [ ] Checkmarks appear on selected items
2. [ ] **Step 2:** Select timeline
   - [ ] Can only select one option
   - [ ] Next button enabled after selection
3. [ ] **Step 3:** Select interests
   - [ ] Counter updates as you select
   - [ ] Can select multiple interests
   - [ ] Scrollable list works
4. [ ] **Step 4:** Enter entity information
   - [ ] Organization name is required
   - [ ] Must select entity type
   - [ ] Complete button disabled until both filled
5. [ ] **Back Button:** Works at each step
6. [ ] **Progress Bar:** Updates from 25% → 100%
7. [ ] **Complete:** Saves to Firestore (check Firebase Console)

## 🔍 Debugging Tips

### If Tests Fail:
1. **Check Screenshots:** Playwright saves screenshots of failures in `test-results/`
2. **Use UI Mode:** `npm run test:ui` to see what's happening
3. **Check Console:** Look for Firebase errors
4. **Verify Environment:** Make sure `.env.local` is set up

### Common Issues:
- **"Cannot find module"** → Run `npm install`
- **"Firebase not initialized"** → Check `.env.local` file
- **Tests timeout** → Increase timeout in `playwright.config.ts`
- **Port already in use** → Stop other dev servers or change port

## 📊 Test Results Format

After running tests, you'll see:
```
Running 25 tests using 3 workers

  ✓ auth.spec.ts:7:3 › should display landing page correctly (452ms)
  ✓ auth.spec.ts:18:3 › should navigate to signup page (312ms)
  ...

25 passed (15s)
```

## 🎨 Testing Best Practices

1. **Always run tests before committing code**
2. **Use test:ui mode during development** for better debugging
3. **Check test coverage** - aim for >80% for critical flows
4. **Update tests** when you change UI or flows
5. **Write tests first** for new features (TDD approach)

## 🚨 Known Limitations

- Tests currently run without real Firebase authentication
- For full E2E tests, you'll need to set up test users
- Dashboard and tracker tests pending (features not built yet)

## 📝 Next Steps

Once you've verified everything works:
1. Run through the manual testing checklist
2. Run Playwright tests: `npm run test:ui`
3. Check for any UI/UX issues
4. Then we can move on to building the dashboard (Phase 4)!


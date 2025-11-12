# 🚀 Getting Started with RFP Matcher

## Step-by-Step Setup Guide

### Step 1: Get Firebase Credentials

1. Open Firebase Console: https://console.firebase.google.com/project/therfpqueen-f11fd
2. Click Settings (⚙️) → **Project Settings**
3. Scroll to "Your apps" section
4. If no web app exists:
   - Click **"Add app"** → Select **Web** (`</>` icon)
   - Nickname: "RFP Matcher Web"
   - Click **"Register app"**
5. Copy the configuration values shown

### Step 2: Create Environment File

In your `webapp` folder, create a file named `.env.local`:

**Windows (PowerShell):**
```powershell
cd webapp
New-Item .env.local
notepad .env.local
```

**Mac/Linux:**
```bash
cd webapp
touch .env.local
nano .env.local
```

Paste this content (replace with your actual values):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=therfpqueen-f11fd.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=therfpqueen-f11fd
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=therfpqueen-f11fd.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123XYZ
```

### Step 3: Install Playwright Browsers

**Windows (PowerShell):**
```powershell
npx playwright install
```

**Mac/Linux:**
```bash
npx playwright install
```

This downloads Chrome, Firefox, and Safari browsers for testing.

### Step 4: Run the Development Server

```powershell
npm run dev
```

You should see:
```
✓ Ready in 2.3s
○ Local:        http://localhost:3000
```

### Step 5: Open in Browser

Open your browser and go to: **http://localhost:3000**

You should see the beautiful landing page! 🎉

### Step 6: Test the App Manually

1. **Click "Get Started"** → Should go to signup page
2. **Fill in the form:**
   - Email: test@example.com
   - Password: test123 (min 6 characters)
   - Confirm: test123
3. **Click "Sign Up"** → Creates account and goes to onboarding
4. **Complete the 4-step questionnaire:**
   - Step 1: Select funding types (Grants, RFPs, etc.)
   - Step 2: Select timeline (Urgent, Soon, Ongoing)
   - Step 3: Select interests (Education, Health, etc.)
   - Step 4: Enter organization name and type
5. **Click "Complete"** → Saves profile to Firestore

### Step 7: Run Automated Tests

Open a **NEW terminal window** (keep dev server running):

```powershell
cd webapp
npm run test:ui
```

This opens Playwright's visual test interface where you can:
- ✅ See all 25+ tests
- ▶️ Run tests one by one
- 🐛 Debug failures
- 📹 Watch tests in action

**OR run all tests at once:**
```powershell
npm test
```

## ✅ Success Indicators

### You'll know it's working when:

1. **Landing page loads** without console errors
2. **Sign up creates user** in Firebase Authentication
3. **Profile saves** to Firestore `profiles` collection
4. **All Playwright tests pass** (green checkmarks)

## 🐛 Troubleshooting

### Problem: "Firebase: Error (auth/configuration-not-found)"
**Solution:** Check your `.env.local` file - make sure all values are correct and file is in the `webapp` folder.

### Problem: "Cannot find module 'firebase'"
**Solution:** Run `npm install` in the webapp folder.

### Problem: "Port 3000 is already in use"
**Solution:** Stop other dev servers or change port:
```powershell
npm run dev -- -p 3001
```

### Problem: Tests fail with "Timeout"
**Solution:** Make sure dev server is running before running tests.

### Problem: "Access denied" when creating account
**Solution:** Check Firebase Authentication is enabled:
1. Firebase Console → Authentication
2. Sign-in method tab
3. Enable "Email/Password"

## 📊 What to Check in Firebase Console

After completing onboarding, verify in Firebase Console:

### 1. Authentication (Users Created)
- Go to **Authentication** → **Users** tab
- You should see your test user

### 2. Firestore (Profile Saved)
- Go to **Firestore Database**
- Collection: `profiles`
- Document ID: (your user UID)
- Fields should show:
  ```
  fundingTypes: ["Grants"]
  timeline: "urgent"
  interestsMain: ["Education", "Health"]
  entityName: "Test Org"
  entityType: "Nonprofit"
  ```

## 🎯 Next Steps

Once everything works:

1. ✅ **Phase 1-3 are complete!** (Setup, Auth, Onboarding)
2. ⏭️ **Ready for Phase 4:** Dashboard with opportunity cards
3. ⏭️ **Then Phase 5:** Opportunity tracker

Want me to continue building the dashboard now? 🚀


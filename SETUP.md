# RFP Matcher Web App Setup

## Prerequisites
- Node.js 18+ installed
- Firebase project configured (therfpqueen-f11fd)

## Setup Instructions

### 1. Install Dependencies
```bash
cd webapp
npm install
```

### 2. Configure Firebase
Create a `.env.local` file in the `webapp` directory with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=therfpqueen-f11fd.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=therfpqueen-f11fd
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=therfpqueen-f11fd.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

Get these values from:
- Firebase Console → Project Settings → General → Your apps → SDK setup and configuration

### 3. Run Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

### 4. Run Tests
```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run tests
npm run test:e2e
```

## Project Structure
```
webapp/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── login/        # Login page
│   │   ├── signup/       # Sign up page
│   │   ├── onboarding/   # User profile questionnaire
│   │   ├── dashboard/    # Main opportunity cards view
│   │   └── tracker/      # Saved/Applied opportunities
│   ├── components/       # React components
│   ├── lib/             # Utilities and Firebase config
│   ├── hooks/           # Custom React hooks
│   └── types/           # TypeScript type definitions
├── tests/               # Playwright E2E tests
└── playwright.config.ts # Playwright configuration
```

## Terminal Issues?
If Cursor terminal isn't working:
1. Open a separate PowerShell/Terminal window
2. Navigate to the webapp directory
3. Run commands there
4. Or use VS Code integrated terminal as backup

## Next Steps
See the TODO list in Cursor for development progress!


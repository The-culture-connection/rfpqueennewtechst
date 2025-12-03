# Deployment Commands

## Firebase Functions Deployment

To deploy the updated `matchOpportunities` function with AND logic for interests and keyword support:

### From the project root directory:
```bash
cd functions
npm run build
firebase deploy --only functions
```

### Or from the functions directory:
```bash
cd functions
npm run build
npm run deploy
```

### Deploy only the matchOpportunities function (faster):
```bash
cd functions
npm run build
firebase deploy --only functions:matchOpportunities
```

## Webapp Deployment (Railway)

The webapp is deployed on Railway. Railway automatically deploys when you push to your connected Git repository.

### Manual Railway Deployment:
1. Go to your Railway dashboard
2. Select your webapp service
3. Click "Redeploy" or trigger a new deployment

### Or via Railway CLI:
```bash
railway up
```

## Full Deployment (Functions + Webapp)

### Step 1: Deploy Firebase Functions
```bash
cd functions
npm run build
firebase deploy --only functions
```

### Step 2: Webapp will auto-deploy on Railway
- Push your changes to Git
- Railway will automatically detect and deploy

## Verify Deployment

### Check Firebase Functions:
```bash
firebase functions:log
```

### Check specific function:
```bash
firebase functions:log --only matchOpportunities
```

## Environment Variables

Make sure these are set in Firebase Functions:
- `SAM_API_KEY` (if using SAM.gov integration)

Make sure these are set in Railway (webapp):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`


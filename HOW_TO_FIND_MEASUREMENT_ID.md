# How to Find Your Firebase Measurement ID

The `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is required for Firebase Analytics to work. Here's exactly where to find it:

## Step-by-Step Instructions

### Option 1: From Firebase Console (Recommended)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/project/therfpqueen-f11fd
   - (Replace `therfpqueen-f11fd` with your project ID if different)

2. **Open Project Settings**
   - Click the **gear icon** (⚙️) in the top left
   - Select **"Project settings"**

3. **Find Your Web App**
   - Scroll down to the **"Your apps"** section
   - Look for your web app (it should show a `</>` icon)
   - If you don't see a web app, you need to add one first (see below)

4. **Get the Measurement ID**
   - In the Firebase config object, look for `measurementId`
   - It will look like: `"G-PWXR6YZMGH"` or `"G-XXXXXXXXXX"`
   - **Copy this value** - this is your `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

### Option 2: From Firebase Config Object

If you already have your Firebase config object, the measurement ID is the last property:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-PWXR6YZMGH"  // ← This is what you need!
};
```

## If You Don't Have a Web App Yet

If you don't see a web app in Firebase Console:

1. **Add a Web App**
   - In Firebase Console → Project Settings → Your apps
   - Click **"Add app"** button
   - Select the **Web icon** (`</>`)
   - Give it a nickname (e.g., "RFP Matcher Web")
   - **Don't check "Firebase Hosting"** (unless you want to use it)
   - Click **"Register app"**

2. **Copy the Config**
   - You'll see the Firebase config object
   - Copy the `measurementId` value

## Adding to Your Environment Variables

Once you have the Measurement ID:

### For Local Development (`.env.local`)

Add this line to your `.env.local` file:

```bash
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-PWXR6YZMGH
```

(Replace `G-PWXR6YZMGH` with your actual measurement ID)

### For Vercel Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Name**: `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
   - **Value**: `G-PWXR6YZMGH` (your actual ID)
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**

## Verify It's Working

After adding the Measurement ID:

1. **Restart your dev server** (if running locally)
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

2. **Check the browser console**
   - Open your app in the browser
   - Open Developer Tools (F12)
   - Look for: `[Analytics] Event tracked: ...` messages
   - If you see these, analytics is working!

3. **Check Firebase Console**
   - Go to Firebase Console → Analytics → Events
   - Events should appear within 24 hours
   - For real-time testing, use DebugView (requires additional setup)

## Format

The Measurement ID always:
- Starts with `G-`
- Followed by 10 alphanumeric characters
- Example: `G-PWXR6YZMGH`, `G-ABC123DEF4`

## Troubleshooting

### "Measurement ID not found"
- Make sure you've added a **Web app** (not iOS or Android)
- The measurement ID only appears for web apps
- If you only have mobile apps, add a web app first

### "Analytics not initializing"
- Check that `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is set correctly
- Make sure the variable name starts with `NEXT_PUBLIC_` (required for client-side)
- Restart your dev server after adding the variable
- Check browser console for errors

### "Events not appearing in Firebase"
- Events can take up to 24 hours to appear in Firebase Analytics
- Use DebugView for real-time testing (requires additional setup)
- Check that Analytics is enabled in your Firebase project

## Quick Reference

- **Where to find**: Firebase Console → Project Settings → Your apps → Web app → Config object
- **Format**: `G-XXXXXXXXXX` (starts with G-)
- **Environment variable**: `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- **Required for**: Firebase Analytics tracking


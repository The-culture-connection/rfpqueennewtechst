# How to Register Your Railway URL in Firebase for Analytics

Firebase Analytics requires you to register your domain/URL in the Firebase Console before it will accept analytics data. Here's how to do it:

## Step 1: Find Your Railway URL

Your Railway deployment URL should look like:
- `https://your-app-name.up.railway.app`
- Or a custom domain if you've set one up

You can find it in:
- Railway Dashboard → Your Project → Settings → Domains
- Or check your Railway deployment logs

## Step 2: Register URL in Firebase Console

### Option A: Add to Authorized Domains (Recommended)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/project/therfpqueen-f11fd

2. **Open Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click the **Settings** tab
   - Scroll down to **Authorized domains**

3. **Add Your Railway Domain**
   - Click **Add domain**
   - Enter your Railway domain (e.g., `your-app.up.railway.app`)
   - Click **Add**

### Option B: Configure Analytics Data Stream

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/project/therfpqueen-f11fd

2. **Open Analytics Settings**
   - Click **Analytics** in the left sidebar
   - Click **Data Streams** (or **Settings** → **Data Streams**)

3. **Find Your Web App Stream**
   - Look for your web app (the one with the measurement ID)
   - Click on it to open settings

4. **Add Web Domain**
   - Look for **Web domains** or **Authorized domains** section
   - Click **Add domain**
   - Enter your Railway domain
   - Save

### Option C: Project Settings → General

1. **Go to Project Settings**
   - Click the **gear icon** (⚙️) → **Project settings**
   - Go to the **General** tab

2. **Scroll to "Your apps"**
   - Find your web app
   - Click the **gear icon** next to it
   - Look for **Authorized domains** or **Web domains**
   - Add your Railway URL

## Step 3: Verify the Measurement ID

Make sure your `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` in Railway matches the one in Firebase Console:

1. **In Firebase Console**
   - Project Settings → General → Your apps → Web app
   - Copy the `measurementId` (starts with `G-`)

2. **In Railway**
   - Go to your project → Variables
   - Verify `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` matches

## Step 4: Test Analytics

After adding the domain:

1. **Redeploy on Railway** (to ensure the measurement ID is loaded)
2. **Open your Railway URL** in a browser
3. **Open Browser DevTools** (F12)
4. **Check Console** for analytics logs:
   - Should see: `[Analytics] ✅ Initialized successfully`
   - Should see: `[Analytics] ✅ Event tracked: ...`

5. **Check Firebase Console**
   - Go to Analytics → Events
   - Events may take a few minutes to appear
   - For real-time: Use DebugView (see below)

## Step 5: Enable DebugView for Real-Time Testing

For real-time analytics testing:

1. **Install Firebase DebugView Extension** (Chrome)
   - Or use the DebugView in Firebase Console

2. **Add Debug Mode to Your App**
   - Add this to your browser console on your Railway site:
   ```javascript
   // Only for testing - remove in production
   localStorage.setItem('firebase:debug', 'true');
   ```

3. **View Real-Time Events**
   - Firebase Console → Analytics → DebugView
   - You'll see events in real-time

## Common Issues

### Issue: "Analytics not initialized"
**Solution:**
- Check that `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is set in Railway
- Check browser console for errors
- Verify the measurement ID format (should start with `G-`)

### Issue: "Events not appearing"
**Solution:**
- Wait 24 hours for events to appear in standard Analytics view
- Use DebugView for real-time testing
- Check that your domain is authorized
- Check browser console for errors

### Issue: "Domain not authorized"
**Solution:**
- Make sure you added the exact domain (including `https://`)
- Don't include paths, just the domain
- Example: `your-app.up.railway.app` (not `https://your-app.up.railway.app/dashboard`)

## Quick Checklist

- [ ] Found your Railway URL
- [ ] Added Railway domain to Firebase Authorized Domains
- [ ] Verified `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` in Railway matches Firebase
- [ ] Redeployed on Railway
- [ ] Checked browser console for analytics logs
- [ ] Tested by navigating through the app
- [ ] Checked Firebase Analytics → Events (wait 24h or use DebugView)

## Need Help?

If analytics still aren't working:
1. Check browser console for errors
2. Verify all environment variables are set in Railway
3. Make sure you're testing on the actual Railway URL (not localhost)
4. Check Firebase Console → Analytics → DebugView for real-time events


# Debugging "Missing or insufficient permissions" Error Locally

## Common Causes

Since this works on the public server but not locally, the issue is likely one of these:

### 1. Firebase Emulator Running

If you have Firebase emulators running, they use different rules. Make sure you're connecting to the **production** Firestore, not the emulator.

**Check:**
```bash
# Check if emulators are running
firebase emulators:list

# If running, stop them:
# Press Ctrl+C in the emulator terminal
```

**Fix:** Make sure your `.env.local` points to production:
```env
NEXT_PUBLIC_FIREBASE_PROJECT_ID=therfpqueen-f11fd
```

### 2. Environment Variables Not Loaded

**Check:** Open browser console and check:
```javascript
console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
```

**Fix:** 
1. Make sure `.env.local` exists in the `webapp` directory
2. Restart your dev server after changing `.env.local`:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

### 3. User Not Properly Authenticated

**Check:** In browser console:
```javascript
// Check if user is authenticated
import { auth } from '@/lib/firebase';
auth.currentUser?.uid
```

**Fix:** 
- Make sure you're logged in
- Try logging out and logging back in
- Check browser console for auth errors

### 4. Firestore Rules Not Deployed

Even though rules work on production, make sure local is using production rules:

**Check:**
```bash
firebase firestore:rules:get
```

**Fix:** If rules are different, deploy them:
```bash
firebase deploy --only firestore:rules
```

### 5. Browser Cache Issues

**Fix:** 
- Clear browser cache
- Try incognito/private mode
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## Quick Debug Steps

1. **Check Console Errors:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for Firebase errors
   - Check the Network tab for failed requests

2. **Verify Environment:**
   ```bash
   # In your terminal, check if env vars are set
   echo $NEXT_PUBLIC_FIREBASE_PROJECT_ID
   
   # Or in PowerShell:
   $env:NEXT_PUBLIC_FIREBASE_PROJECT_ID
   ```

3. **Test Firebase Connection:**
   Add this to your terms page temporarily:
   ```typescript
   useEffect(() => {
     console.log('Firebase check:', {
       projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
       user: user?.uid,
       db: !!db,
     });
   }, [user]);
   ```

4. **Check Authentication State:**
   ```typescript
   import { onAuthStateChanged } from 'firebase/auth';
   import { auth } from '@/lib/firebase';
   
   onAuthStateChanged(auth, (user) => {
     console.log('Auth state:', user?.uid, user?.email);
   });
   ```

## Most Likely Fix

Since it works on production, try:

1. **Restart your dev server:**
   ```bash
   # Stop server
   Ctrl+C
   
   # Start fresh
   npm run dev
   ```

2. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Verify you're using production Firebase:**
   - Check `.env.local` has correct project ID
   - Make sure no emulators are running
   - Check browser console for "Using emulator" messages

## Still Not Working?

Check the exact error in browser console and share:
- Error code (e.g., `permission-denied`)
- Error message
- Network tab → Failed request → Response tab
- Console logs showing Firebase initialization

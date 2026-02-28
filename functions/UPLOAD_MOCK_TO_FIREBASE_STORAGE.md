# Upload Mock Opportunities to Firebase Storage

## Option 1: Upload via Firebase Console (Easiest)

1. Go to Firebase Console → Storage
2. Click "Upload file"
3. Upload `public/mock_opportunities_50.json`
4. Make the file public (set permissions)
5. Copy the download URL
6. Use that URL in `examplesources.json`

## Option 2: Upload via Firebase CLI

```bash
# From project root
firebase storage:upload "public/mock_opportunities_50.json" /mock-opportunities/mock_opportunities_50.json
```

Then get the public URL from Firebase Console.

## Option 3: Use Firebase Storage Public URL Format

After uploading, the URL will be:
```
https://firebasestorage.googleapis.com/v0/b/therfpqueen-f11fd.appspot.com/o/mock-opportunities%2Fmock_opportunities_50.json?alt=media
```

Update `examplesources.json`:
```json
{
  "source": "localJson",
  "endpointUrl": "https://firebasestorage.googleapis.com/v0/b/therfpqueen-f11fd.appspot.com/o/mock-opportunities%2Fmock_opportunities_50.json?alt=media",
  "method": "GET",
  "auth": { "type": "none" }
}
```

# Troubleshooting Local Webhook Receiver

## Common Errors and Solutions

### Error: "Cannot GET /" or 404 Not Found

**Solution:** I've added a root route handler. Now visiting `http://localhost:3000/` will show a helpful JSON response.

**Test endpoints:**
- `GET http://localhost:3000/` - Root endpoint (shows service info)
- `GET http://localhost:3000/health` - Health check
- `POST http://localhost:3000/webhook` - Webhook endpoint

### Error: "Port 3000 is already in use"

**Solution:**
```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port
# Edit server.ts and change PORT = 3000 to PORT = 3001
```

### Error: "ts-node: command not found"

**Solution:**
```powershell
cd local-webhook-receiver
npm install
```

### Error: "Cannot find module 'express'"

**Solution:**
```powershell
cd local-webhook-receiver
npm install
```

### Error: "SyntaxError" or TypeScript errors

**Solution:**
```powershell
cd local-webhook-receiver
npm install
npm run build  # If there's a build script
npm start
```

### Server starts but no response

**Check:**
1. Is the server actually running? Look for: `🚀 Local webhook receiver running on http://localhost:3000`
2. Try the health endpoint: `curl http://localhost:3000/health`
3. Check if firewall is blocking port 3000
4. Try accessing from browser: `http://localhost:3000/`

### Webhook endpoint returns 404

**Check:**
- Are you using `POST` method? (not GET)
- Is the path `/webhook`? (not `/webhooks` or `/webhook/`)
- Correct: `POST http://localhost:3000/webhook`

### Signature verification fails

**Check:**
1. Secret in Firestore matches the one in server (default: `test-secret-change-me`)
2. Set custom secret: `$env:WEBHOOK_SECRET="your-secret"` before starting server
3. Verify the signature header is being sent correctly

### ngrok connection issues

**Check:**
1. Is ngrok still running? (it must stay running)
2. Did ngrok URL change? (free tier gives new URL on restart)
3. Update `webhookUrl` in Firestore if ngrok restarted
4. Check ngrok dashboard: http://localhost:4040

## Testing Steps

### 1. Verify Server is Running
```powershell
# In browser or curl
curl http://localhost:3000/
# Should return JSON with service info
```

### 2. Test Health Endpoint
```powershell
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 3. Test Webhook Endpoint (Manual)
```powershell
curl -X POST http://localhost:3000/webhook `
  -H "Content-Type: application/json" `
  -H "X-OpportuniLynk-Event: test.event" `
  -H "X-OpportuniLynk-Id: test-123" `
  -d '{"test": "data"}'
```

### 4. Check Logs
- Console output (terminal running server)
- `webhook-logs.jsonl` file in `local-webhook-receiver` directory

## Still Having Issues?

1. **Check server logs** - Look at the terminal where you ran `npm start`
2. **Check ngrok status** - Visit http://localhost:4040 (ngrok web interface)
3. **Verify Firestore integration** - Check `isActive: true` and correct `webhookUrl`
4. **Check Firebase Functions logs**:
   ```powershell
   firebase functions:log
   ```

## Getting Help

Share these details when asking for help:
1. Error message (exact text)
2. What URL you're accessing
3. Server logs (from terminal)
4. ngrok status (if using ngrok)
5. Firestore integration configuration

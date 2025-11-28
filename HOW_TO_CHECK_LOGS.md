# How to Check Terminal Logs

## Quick Guide

### 1. Find the Terminal Window

The dev server logs appear in the **terminal where you ran `npm run dev`**.

**Where to look:**
- The terminal/command prompt window where you started the server
- It should show Next.js startup messages like:
  ```
  ▲ Next.js 16.0.5
  - Local:        http://localhost:3000
  ```

### 2. What You'll See

When you upload an image, you should see logs like:

```
[OCR+Parse API] Request received
[OCR+Parse API] User authenticated: <user-id>
[OCR+Parse API] File received: filename.jpg Size: 12345 bytes
[OCR+Parse API] Buffer created, size: 12345 bytes
[OCR+Parse API] Starting OCR extraction...
[OCR] Starting extraction...
[OCR] Step 1: Optimizing image...
[OCR] Image optimized, size: 12000 bytes
[OCR] Step 2: Creating worker (may take 30-60s on first use - downloading language data)...
[OCR] Worker status: loading tesseract core...
[OCR] Worker status: initializing tesseract...
[OCR] Worker created in 35000ms
[OCR] Worker configured
[OCR] Step 3: Recognizing text (this may take 10-30 seconds)...
[OCR] Recognition progress: 25%
[OCR] Recognition progress: 50%
[OCR] Recognition progress: 75%
[OCR] Recognition progress: 100%
[OCR] Recognition complete in 8000ms, text length: 250
[OCR+Parse API] OCR complete in 43000ms, text length: 250
[OCR+Parse API] Starting transaction parsing...
[OCR+Parse API] Parsing complete in 2000ms, found 5 transactions
[OCR+Parse API] Total processing time: 45000ms
```

### 3. If You Can't Find the Terminal

**Option A: Find it in your IDE/Editor**
- Look for a "Terminal" tab at the bottom of VS Code, Cursor, etc.
- Or check the "Output" panel

**Option B: Check All Terminal Windows**
- On Mac: Check all Terminal/iTerm windows
- On Windows: Check all Command Prompt/PowerShell windows
- On Linux: Check all terminal windows

**Option C: Restart in a New Terminal**
1. Open a new terminal window
2. Navigate to the project:
   ```bash
   cd /Users/idankov/cycler
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
4. Watch this terminal for logs

### 4. What to Look For

**Good signs:**
- ✅ Logs appear immediately when you upload
- ✅ Progress updates show percentage
- ✅ "Recognition complete" message appears
- ✅ "Parsing complete" with transaction count

**Problem signs:**
- ❌ No logs appear at all (request not reaching backend)
- ❌ Logs stop at "Creating worker..." (stuck downloading)
- ❌ Logs stop at "Recognizing text..." (OCR taking too long)
- ❌ Error messages appear

### 5. Common Issues

**No logs appearing:**
- Check if server is actually running
- Check browser console for errors
- Check Network tab to see if request is being sent

**Logs stop at a certain point:**
- That's where the issue is
- Note the last log message you see
- Check if it's timing out or erroring

**Can't find the terminal:**
- Restart the server in a visible terminal
- Use `pkill -f "next dev"` to stop all instances
- Then run `npm run dev` in a new terminal

## Quick Test

1. Make sure server is running (`npm run dev`)
2. Go to Import page in browser
3. Upload an image
4. **Immediately check the terminal** - logs should start appearing
5. Watch for progress updates

The terminal logs will tell you exactly what's happening and where it might be getting stuck!


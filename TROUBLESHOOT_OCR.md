# Troubleshooting Infinite OCR Loading

## Quick Checks

1. **Check Terminal Logs**
   - Look for `[OCR+Parse API]` or `[OCR]` logs
   - See where it's getting stuck
   - Check for error messages

2. **Check Browser Console (F12)**
   - Look for JavaScript errors
   - Check Network tab for the `/api/ocr-and-parse` request
   - See if request is pending or failed

3. **Common Issues:**

### Issue: No logs appearing
- **Cause**: Request not reaching backend
- **Fix**: Check if you're logged in, check network tab

### Issue: Stuck at "Starting OCR extraction..."
- **Cause**: Tesseract worker creation taking too long
- **Fix**: Wait 30-60 seconds on first use (language data download)

### Issue: Stuck at "Recognizing text..."
- **Cause**: Image too large or complex
- **Fix**: Try smaller/clearer image, or use text input instead

### Issue: Timeout error
- **Cause**: Processing taking longer than 90 seconds
- **Fix**: Use smaller image or paste text directly

## Debug Steps

1. **Check what's happening:**
   ```bash
   # In terminal where npm run dev is running
   # Look for logs starting with [OCR] or [OCR+Parse API]
   ```

2. **Test with text input first:**
   - Go to Import page
   - Paste text instead of uploading image
   - This bypasses OCR and tests parsing only

3. **Check server is responding:**
   - Open browser DevTools → Network tab
   - Upload image
   - Check if `/api/ocr-and-parse` request appears
   - Check status code and response

4. **Try manual initialization:**
   - Visit: http://localhost:3000/api/init-ocr
   - This pre-loads OCR workers
   - Then try uploading again

## Expected Log Flow

When working correctly, you should see:
```
[OCR+Parse API] Request received
[OCR+Parse API] User authenticated: <id>
[OCR+Parse API] File received: <name> Size: <size> bytes
[OCR+Parse API] Buffer created, size: <size> bytes
[OCR+Parse API] Starting OCR extraction...
[OCR] Starting extraction...
[OCR] Step 1: Optimizing image...
[OCR] Image optimized, size: <size> bytes
[OCR] Step 2: Getting worker...
[OCR] Using pre-loaded worker (fast path) OR Creating new worker...
[OCR] Step 3: Recognizing text...
[OCR] Progress: X%
[OCR] Recognition complete in Xms, text length: X
[OCR+Parse API] OCR complete in Xms, text length: X
[OCR+Parse API] Starting transaction parsing...
[OCR+Parse API] Parsing complete in Xms, found X transactions
[OCR+Parse API] Total processing time: Xms
```

If logs stop at a certain point, that's where the issue is.


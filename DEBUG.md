# Debugging OCR Processing Issues

## Common Issues and Solutions

### 1. Infinite Processing / Timeout

**Symptoms:** The "Processing..." message never stops, or you get a timeout error.

**Possible Causes:**
- First-time Tesseract.js setup (downloading language data - can take 30-60 seconds)
- Large image file
- Server timeout limits
- Network issues

**Solutions:**

1. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for error messages or logs starting with `[OCR API]`

2. **Check Server Logs:**
   - Look at your terminal where `npm run dev` is running
   - Look for logs starting with `[OCR API]` or `OCR Error:`

3. **Try Smaller Image:**
   - Resize your image to under 2MB
   - Use PNG or JPEG format
   - Ensure image is clear and readable

4. **Use Text Input Instead:**
   - If OCR keeps failing, use the "Paste Financial Statement Text" option
   - Manually copy text from your statement and paste it

5. **Check Network Tab:**
   - Open Developer Tools → Network tab
   - Try uploading again
   - Check if `/api/ocr` request is pending or failed
   - Check the response status and body

## Debugging Steps

### Step 1: Check Server Logs

In your terminal, you should see logs like:
```
[OCR API] Request received
[OCR API] Verifying authentication...
[OCR API] User authenticated: <user-id>
[OCR API] File received: <filename> Size: <size> bytes
[OCR API] Buffer created, size: <size> bytes
[OCR API] Starting OCR extraction...
Starting Tesseract worker...
Worker created, recognizing image...
Recognition complete, text length: <length>
[OCR API] OCR complete, extracted text length: <length>
[OCR API] Total time: <ms>ms
```

If you see errors, note them down.

### Step 2: Check Browser Console

1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for:
   - `Uploading file: <filename>`
   - `OCR response received, text length: <length>`
   - Any error messages

### Step 3: Check Network Requests

1. Open Developer Tools → Network tab
2. Upload an image
3. Find the `/api/ocr` request
4. Check:
   - Status code (should be 200)
   - Response time
   - Response body (should contain `{ text: "..." }`)

### Step 4: Test with Smaller Image

Try uploading a very small, clear image (under 500KB) to see if it's a size issue.

### Step 5: Test Text Input

Use the "Paste Financial Statement Text" option to bypass OCR and test if the parsing works.

## Common Error Messages

### "OCR timeout after 60 seconds"
- **Cause:** Image processing took too long
- **Solution:** Try a smaller/clearer image, or use text input

### "No text detected in image"
- **Cause:** OCR couldn't find any text
- **Solution:** Ensure image is clear, has text, and is properly oriented

### "Failed to extract text from image"
- **Cause:** General OCR failure
- **Solution:** Check server logs for specific error, try different image

### "Request timed out"
- **Cause:** Network or server timeout
- **Solution:** Check if server is running, try again, or use text input

## Performance Notes

- **First OCR run:** Can take 30-60 seconds (Tesseract downloads language data)
- **Subsequent runs:** Usually 5-15 seconds depending on image size
- **Large images:** May take longer, consider resizing before upload

## Quick Fixes

1. **Restart dev server:** `npm run dev`
2. **Clear browser cache:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. **Try text input:** Bypass OCR entirely
4. **Check file size:** Keep images under 2MB
5. **Check image format:** Use PNG or JPEG



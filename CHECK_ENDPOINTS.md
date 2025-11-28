# How to Check if OCR/Parsing is Working

## 1. Check Browser Console

When you upload an image or paste text, open Browser DevTools (F12) and check the Console tab. You should see:

**For Image Upload:**
```
Uploading file: filename.jpg
Processing complete: { transactions: X, stats: {...} }
```

**For Text Input:**
```
Parsing transactions...
Parsing complete: { transactions: X, stats: {...} }
```

## 2. Check Server Logs (Terminal)

In the terminal where `npm run dev` is running, you should see detailed logs:

**For Image Upload (`/api/ocr-and-parse`):**
```
[OCR+Parse API] Request received
[OCR+Parse API] User authenticated: <user-id>
[OCR+Parse API] File received: <filename> Size: <size> bytes
[OCR+Parse API] Buffer created, size: <size> bytes
[OCR+Parse API] Starting OCR extraction...
Starting Tesseract worker...
Worker created, recognizing image...
Recognition complete, text length: <length>
[OCR+Parse API] OCR complete in <ms>ms, text length: <length>
[OCR+Parse API] Starting transaction parsing...
[OCR+Parse API] Parsing complete in <ms>ms, found <count> transactions
[OCR+Parse API] Total processing time: <ms>ms (OCR: <ms>ms, Parse: <ms>ms)
```

**For Text Input (`/api/parse-transactions`):**
```
[Parse API] Request received
[Parse API] User authenticated: <user-id>
[Parse API] Text received, length: <length> characters
[Parse API] Starting transaction parsing...
[Parse API] Parsing complete in <ms>ms, found <count> transactions
[Parse API] Total processing time: <ms>ms
```

## 3. Check Network Tab

1. Open Browser DevTools (F12)
2. Go to **Network** tab
3. Upload an image or paste text
4. Look for:
   - `/api/ocr-and-parse` (for images)
   - `/api/parse-transactions` (for text)
5. Click on the request to see:
   - **Status**: Should be 200 (success) or 401 (unauthorized)
   - **Response**: Should contain `transactions` array
   - **Timing**: Shows how long it took

## 4. Common Issues

### No Logs Appearing
- **Check**: Is the dev server running? (`npm run dev`)
- **Check**: Are you logged in? (Authentication required)
- **Check**: Browser console for JavaScript errors

### 401 Unauthorized
- **Issue**: Not logged in
- **Fix**: Sign in to the app first

### 500 Error
- **Check**: Server logs for specific error message
- **Common causes**:
  - OpenAI API key not set
  - Tesseract.js worker failing
  - Image too large or corrupted

### Timeout Errors
- **Check**: Server logs to see where it's timing out
- **OCR timeout**: Image may be too large/complex
- **Parse timeout**: Text may be too long

## 5. Quick Test

1. **Sign in** to the app
2. Go to **Import** page
3. **Paste this test text**:
```
Date: 2024-01-15
Coffee Shop - $5.50
Grocery Store - $45.20
Salary Deposit - $2000.00
```
4. Click "Parse Transactions"
5. Check:
   - Browser console for logs
   - Terminal for server logs
   - Network tab for request/response

## 6. Expected Behavior

✅ **Working correctly:**
- Status messages update during processing
- Server logs show progress
- Transactions appear in review step
- No errors in console

❌ **Not working:**
- Stuck on "Processing..."
- No server logs
- Error messages appear
- Network request fails


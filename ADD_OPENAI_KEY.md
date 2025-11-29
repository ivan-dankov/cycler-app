# How to Add Your OpenAI API Key

## Quick Steps

1. **Get your OpenAI API key:**
   - Go to https://platform.openai.com/api-keys
   - Sign in or create an account
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)

2. **Update `.env.local` file:**
   
   **Option A: Edit the file directly**
   - Open `.env.local` in your editor
   - Find the line: `OPENAI_API_KEY=your_openai_api_key`
   - Replace `your_openai_api_key` with your actual key:
     ```
     OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
     ```
   - Save the file

   **Option B: Use terminal command**
   ```bash
   # Replace YOUR_ACTUAL_KEY with your OpenAI API key
   sed -i '' 's/OPENAI_API_KEY=your_openai_api_key/OPENAI_API_KEY=YOUR_ACTUAL_KEY/' .env.local
   ```

3. **Restart the dev server:**
   - Stop the current server (Ctrl+C)
   - Start it again: `npm run dev`
   - Environment variables are only loaded when the server starts

## Verify It's Working

After adding the key and restarting:

1. Go to the Import page
2. Paste some test text:
   ```
   Date: 2024-01-15
   Coffee Shop - $5.50
   Grocery Store - $45.20
   ```
3. Click "Parse Transactions"
4. You should see transactions appear (no more 401 error)

## Important Notes

- ⚠️ **Never commit `.env.local` to git** (it's already in `.gitignore`)
- 🔑 Your API key starts with `sk-` or `sk-proj-`
- 💰 OpenAI charges per API call (check pricing at platform.openai.com)
- 🔄 **Must restart dev server** after changing `.env.local`

## Current Status

Your `.env.local` currently has:
```
OPENAI_API_KEY=your_openai_api_key  ← This is a placeholder!
```

Replace it with your actual key from https://platform.openai.com/api-keys



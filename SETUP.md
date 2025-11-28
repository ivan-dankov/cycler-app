# Cycler Setup Instructions

## 1. Supabase Database Setup

Your Supabase credentials have been configured. Now you need to set up the database schema:

1. Go to your Supabase project: https://rqhwcxobhhrjchunknvl.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Click **Run** to execute the migration

This will create all necessary tables, indexes, RLS policies, and triggers.

## 2. Get Service Role Key

You'll need the Service Role Key for server-side operations:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (keep this secret!)
4. Update `.env.local` with:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## 3. OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Update `.env.local` with:
   ```
   OPENAI_API_KEY=sk-...
   ```

## 4. OCR (No Setup Required!)

The app uses **Tesseract.js** for OCR, which is:
- ✅ Completely free
- ✅ No API keys needed
- ✅ No external services required
- ✅ Works entirely server-side

No configuration needed - it just works!

## 5. Run the Application

```bash
npm install
npm run dev
```

The app will be available at http://localhost:3000

## 6. Test the Setup

1. Sign up for a new account
2. Create your first budget cycle
3. Default categories will be automatically created
4. Start adding transactions!

## Notes

- The `.env.local` file is gitignored and won't be committed
- Make sure to add all environment variables to Vercel when deploying
- The service role key should NEVER be exposed to the client


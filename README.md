# Cycler - Budget Cycle Management App

A mobile-first web application for managing budget cycles, tracking expenses and income, and analyzing spending patterns.

## Features

- **Budget Cycles**: Create and manage budget cycles with custom date ranges
- **Categories**: Organize expenses and income by categories with budget limits
- **Transactions**: Add, edit, and delete transactions manually
- **OCR Import**: Upload financial statement screenshots or paste text to automatically extract and parse transactions
- **AI Parsing**: Uses OpenAI to intelligently parse transaction data from text
- **Analytics**: Visualize spending by category and over time with charts
- **Mobile-First**: Optimized for mobile devices with bottom navigation

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication)
- **OCR**: Tesseract.js (free, client-side OCR)
- **AI**: OpenAI API (GPT-4)
- **Charts**: Recharts
- **Deployment**: Vercel

## Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key
- Note: OCR uses Tesseract.js (free, no API keys needed)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cycler
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
```
Note: OCR uses Tesseract.js which is completely free and requires no API keys.

4. Set up Supabase database:
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Run the migration file: `supabase/migrations/001_initial_schema.sql`

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add all environment variables in Vercel project settings
4. Deploy

### Environment Variables for Production

Make sure to add all environment variables in your Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Note: OCR uses Tesseract.js which requires no API keys or configuration.

## Project Structure

```
cycler/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/        # Protected dashboard routes
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utilities and helpers
├── types/                 # TypeScript type definitions
├── supabase/             # Supabase migrations
└── public/               # Static assets
```

## Default Categories

New users receive default categories when they create their first budget cycle:
- Housing
- Food
- Transport
- Travel
- Entertainment
- Healthcare
- Shopping
- Utilities
- Education
- Other

These can be edited or deleted as needed.

## License

MIT

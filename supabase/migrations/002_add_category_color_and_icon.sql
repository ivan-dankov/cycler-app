-- Add color and icon columns to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS icon TEXT;

-- Add color and icon columns to default_categories table
ALTER TABLE default_categories
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS icon TEXT;


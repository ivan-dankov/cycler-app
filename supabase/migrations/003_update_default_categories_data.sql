-- Update default_categories rows with colors and icons
UPDATE default_categories SET color = '#EF4444', icon = '🏠' WHERE name = 'Housing';
UPDATE default_categories SET color = '#F97316', icon = '🍔' WHERE name = 'Food';
UPDATE default_categories SET color = '#F59E0B', icon = '🚗' WHERE name = 'Transport';
UPDATE default_categories SET color = '#0EA5E9', icon = '✈️' WHERE name = 'Travel';
UPDATE default_categories SET color = '#8B5CF6', icon = '🎬' WHERE name = 'Entertainment';
UPDATE default_categories SET color = '#10B981', icon = '💊' WHERE name = 'Healthcare';
UPDATE default_categories SET color = '#EC4899', icon = '🛒' WHERE name = 'Shopping';
UPDATE default_categories SET color = '#EAB308', icon = '💡' WHERE name = 'Utilities';
UPDATE default_categories SET color = '#6366F1', icon = '🎓' WHERE name = 'Education';
UPDATE default_categories SET color = '#64748B', icon = '📦' WHERE name = 'Other';

-- Update initial INSERT statement in schema (if not already handled by logic)
-- Note: This is idempotent for existing rows due to previous setup but good for completeness in migration history



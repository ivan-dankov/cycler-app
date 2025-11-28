import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CATEGORIES } from './default-categories'

export async function seedDefaultCategoriesForUser(userId: string) {
  const supabase = await createClient()

  // Check if categories already exist for this user
  const { data: existingCategories } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  // Only seed if no categories exist
  if (existingCategories && existingCategories.length > 0) {
    return
  }

  // Insert default categories
  const categoriesToInsert = DEFAULT_CATEGORIES.map((cat) => ({
    user_id: userId,
    name: cat.name,
    budget_amount: cat.budget_amount,
    color: cat.color,
    icon: cat.icon,
  }))

  const { error } = await supabase.from('categories').insert(categoriesToInsert)

  if (error) {
    console.error('Error seeding default categories:', error)
    throw error
  }
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CategoriesManager from '@/components/categories/CategoriesManager'

async function getCategories(userId: string) {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name')

  return categories || []
}

export default async function CategoriesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const categories = await getCategories(user.id)

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Categories</h1>
        <CategoriesManager
          initialCategories={categories}
          userId={user.id}
        />
      </div>
    </div>
  )
}

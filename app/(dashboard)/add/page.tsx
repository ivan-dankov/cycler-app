import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddPageContent from '@/components/add/AddPageContent'

async function getCategories(userId: string) {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, color, icon')
    .eq('user_id', userId)
    .order('name')

  return categories || []
}

export default async function AddPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const categories = await getCategories(user.id)

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add Transaction</h1>
        <AddPageContent categories={categories} />
      </div>
    </div>
  )
}

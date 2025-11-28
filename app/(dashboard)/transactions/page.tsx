import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TransactionsList from '@/components/transactions/TransactionsList'
import { TransactionWithCategory } from '@/types/transactions'

async function getTransactions(userId: string) {
  const supabase = await createClient()

  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      *,
      categories (
        id,
        name,
        color,
        icon
      )
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (!transactions) return []

  return transactions.map((t: any) => ({
    id: t.id,
    amount: Number(t.amount),
    description: t.description,
    date: t.date,
    type: t.type,
    category_id: t.category_id,
    category_name: t.categories?.name,
    category_color: t.categories?.color,
    category_icon: t.categories?.icon,
    created_at: t.created_at,
    updated_at: t.updated_at,
  })) as TransactionWithCategory[]
}

async function getCategories(userId: string) {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, color, icon')
    .eq('user_id', userId)
    .order('name')

  return categories || []
}

export default async function TransactionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const transactions = await getTransactions(user.id)
  const categories = await getCategories(user.id)

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <TransactionsList initialTransactions={transactions} categories={categories} />
      </div>
    </div>
  )
}

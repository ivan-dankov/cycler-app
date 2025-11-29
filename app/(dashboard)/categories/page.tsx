import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CategoriesManager from '@/components/categories/CategoriesManager'
import { CategoryWithBalance } from '@/types/transactions'
import { format } from 'date-fns'

type Cycle = {
  id: string
  name: string
  start_date: string
  end_date: string
}

async function getCurrentCycle(userId: string): Promise<Cycle | null> {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: cycle } = await supabase
    .from('budget_cycles')
    .select('*')
    .eq('user_id', userId)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  if (!cycle) {
    // Create a default cycle if none exists
    const startDate = new Date()
    startDate.setDate(1) // First day of current month
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
    endDate.setDate(0) // Last day of current month

    const { data: newCycle } = await supabase
      .from('budget_cycles')
      .insert({
        user_id: userId,
        name: format(startDate, 'MMMM yyyy'),
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      } as any)
      .select()
      .single()

    return newCycle as Cycle | null
  }

  return cycle as Cycle
}

async function getCategoriesWithBalance(userId: string, cycle: { start_date: string; end_date: string } | null) {
  const supabase = await createClient()

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name')

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError)
    return []
  }

  if (!categories || categories.length === 0) return []

  type CategoryRow = { id: string; name: string; budget_amount: number; color?: string; icon?: string }
  type TransactionRow = { amount: string | number; type: string }

  const categoriesWithBalance: CategoryWithBalance[] = await Promise.all(
    (categories as CategoryRow[]).map(async (category) => {
      let query = supabase
        .from('transactions')
        .select('amount, type')
        .eq('category_id', category.id)
        .eq('type', 'expense')

      // Filter by date range if cycle is provided
      if (cycle) {
        query = query
          .gte('date', cycle.start_date)
          .lte('date', cycle.end_date)
      }

      const { data: transactions, error: transactionsError } = await query

      if (transactionsError) {
        console.error(`Error fetching transactions for category ${category.id}:`, transactionsError)
      }

      const transactionList = (transactions as TransactionRow[] | null) || []
      const spent = transactionList.reduce((sum, t) => {
        const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0)
        return sum + (isNaN(amount) ? 0 : amount)
      }, 0)

      const budgetAmount = typeof category.budget_amount === 'string' 
        ? parseFloat(category.budget_amount) 
        : (category.budget_amount || 0)
      const budgetAmountNum = isNaN(budgetAmount) ? 0 : budgetAmount

      return {
        id: category.id,
        name: category.name,
        budget_amount: budgetAmountNum,
        spent,
        remaining: budgetAmountNum - spent,
        color: category.color,
        icon: category.icon,
      }
    })
  )

  return categoriesWithBalance
}

export default async function CategoriesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const cycle = await getCurrentCycle(user.id)
  const categories = await getCategoriesWithBalance(user.id, cycle)

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

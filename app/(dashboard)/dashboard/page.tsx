import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CategoryCard from '@/components/dashboard/CategoryCard'
import CycleSwitcher from '@/components/dashboard/CycleSwitcher'
import { CategoryWithBalance } from '@/types/transactions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { format } from 'date-fns'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui'
import { Wallet01, TrendUp01, TrendDown01, Calendar, ChevronRight, CreditCard01, ChevronDown } from '@untitledui/icons'

type Cycle = {
  id: string
  name: string
  start_date: string
  end_date: string
}

async function getRecentTransactions(userId: string, cycle: Cycle | null) {
  const supabase = await createClient()

  let query = supabase
    .from('transactions')
    .select(`
      *,
      categories (
        name
      )
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)

  if (cycle) {
    query = query
      .gte('date', cycle.start_date)
      .lte('date', cycle.end_date)
  }

  const { data: transactions } = await query

  if (!transactions) return []

  return transactions.map((t) => ({
    id: t.id,
    amount: Number(t.amount),
    description: t.description,
    date: t.date,
    type: t.type,
    category_name: t.categories?.name,
  }))
}

async function getCurrentCycle(userId: string, cycleId?: string): Promise<Cycle | null> {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  let query = supabase
    .from('budget_cycles')
    .select('*')
    .eq('user_id', userId)

  if (cycleId) {
    query = query.eq('id', cycleId)
  } else {
    query = query
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: false })
  }
    
  const { data: cycle } = await query.limit(1).single()

  if (!cycle && !cycleId) {
    // Create a default cycle if none exists and no specific cycle requested
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

async function getCycles(userId: string) {
  const supabase = await createClient()
  const { data: cycles } = await supabase
    .from('budget_cycles')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
  
  return cycles || []
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

async function getCycleTotals(userId: string, cycle: { start_date: string; end_date: string }) {
  const supabase = await createClient()

  const [incomeResult, expensesResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .eq('type', 'income')
      .gte('date', cycle.start_date)
      .lte('date', cycle.end_date),
    
    supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', cycle.start_date)
      .lte('date', cycle.end_date),
  ])

  const incomeTransactions = Array.isArray(incomeResult.data) 
    ? (incomeResult.data as { amount: string | number }[])
    : []
  const expenseTransactions = Array.isArray(expensesResult.data)
    ? (expensesResult.data as { amount: string | number }[])
    : []

  const income = incomeTransactions.reduce((sum, t) => {
    const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : Number(t.amount)
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)
  
  const expenses = expenseTransactions.reduce((sum, t) => {
    const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : Number(t.amount)
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)

  return { income, expenses, net: income - expenses }
}

export default async function DashboardPage(props: { searchParams: Promise<{ cycle?: string }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const selectedCycleId = searchParams.cycle
  const currentCycle = await getCurrentCycle(user.id, selectedCycleId)
  
  if (!currentCycle) {
    return <div>Error loading cycle</div>
  }

  const allCycles = await getCycles(user.id)
  const categories = await getCategoriesWithBalance(user.id, currentCycle)
  const totals = await getCycleTotals(user.id, currentCycle)
  const recentTransactions = await getRecentTransactions(user.id, currentCycle)

  return (
    <div className="min-h-screen p-4 space-y-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Overview of your financial activity
            </p>
          </div>
          
          {/* Cycle Switcher */}
          <CycleSwitcher currentCycle={currentCycle} allCycles={allCycles} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Income Card */}
          <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendUp01 className="w-24 h-24 text-emerald-600" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <TrendUp01 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Income</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {formatCurrency(totals.income)}
              </p>
            </CardContent>
          </Card>

          {/* Expenses Card */}
          <Card className="border-none shadow-sm bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-gray-900 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendDown01 className="w-24 h-24 text-rose-600" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-lg">
                  <TrendDown01 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <span className="text-sm font-semibold text-rose-900 dark:text-rose-100">Expenses</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {formatCurrency(totals.expenses)}
              </p>
            </CardContent>
          </Card>

          {/* Net Card */}
          <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-gray-900 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet01 className="w-24 h-24 text-blue-600" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Wallet01 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">Net Balance</span>
              </div>
              <p className={`text-3xl font-bold tracking-tight ${
                totals.net >= 0 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatCurrency(totals.net)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content - Categories */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Budget Categories</h2>
              <Link 
                href="/categories"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 transition-colors"
              >
                Manage <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            {categories.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 text-center border border-dashed border-gray-300 dark:border-gray-700">
                <div className="inline-flex p-3 bg-white dark:bg-gray-800 rounded-full mb-4 shadow-sm">
                  <CreditCard01 className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No categories yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  Create categories to track your spending and set budgets for different expenses.
                </p>
                <Link
                  href="/categories"
                  className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Create Categories
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((category) => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Recent Transactions */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
              <Link 
                href="/transactions"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 transition-colors"
              >
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recent transactions</p>
                </div>
              ) : (
                recentTransactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        transaction.type === 'income' 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                      }`}>
                        {transaction.type === 'income' ? <TrendUp01 className="w-5 h-5" /> : <CreditCard01 className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[140px]" title={transaction.description}>
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        transaction.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      {transaction.category_name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {transaction.category_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

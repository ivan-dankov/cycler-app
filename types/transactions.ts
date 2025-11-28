export type TransactionType = 'income' | 'expense'

export interface TransactionWithCategory {
  id: string
  amount: number
  description: string
  date: string
  type: TransactionType
  category_id: string | null
  category_name?: string
  category_color?: string
  category_icon?: string
  created_at: string
  updated_at: string
}

export interface CategoryWithBalance {
  id: string
  name: string
  budget_amount: number
  spent: number
  remaining: number
  color?: string
  icon?: string
}

export interface ParsedTransaction {
  amount: number
  description: string
  date: string
  type: 'income' | 'expense'
  suggested_category?: string
}

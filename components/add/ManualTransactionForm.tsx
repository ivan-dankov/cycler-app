'use client'

import { useState } from 'react'
import { TransactionWithCategory } from '@/types/transactions'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/format'
import { Button, Input, Label, Alert, AlertDescription } from '@/components/ui'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

interface ManualTransactionFormProps {
  categories: Category[]
  onSuccess?: () => void
}

export default function ManualTransactionForm({ categories, onSuccess }: ManualTransactionFormProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(formatDate(new Date()))
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      const transactionData = {
        user_id: user.id,
        amount: parseFloat(amount),
        description: description || '',
        date,
        type,
        category_id: categoryId || null,
      }

      const { error: insertError } = await supabase
        .from('transactions')
        .insert(transactionData)

      if (insertError) throw insertError

      setSuccess(true)
      // Reset form
      setAmount('')
      setDescription('')
      setDate(formatDate(new Date()))
      setType('expense')
      setCategoryId('')
      
      router.refresh()
      if (onSuccess) onSuccess()
      
      // Auto-hide success message
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
          <AlertDescription>Transaction saved successfully!</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Type</Label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            type="button"
            className={`py-3 sm:py-2 px-4 rounded-md text-sm font-medium transition-all touch-manipulation ${
              type === 'income'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => {
              setType('income')
              setCategoryId('')
            }}
          >
            Income
          </button>
          <button
            type="button"
            className={`py-3 sm:py-2 px-4 rounded-md text-sm font-medium transition-all touch-manipulation ${
              type === 'expense'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => setType('expense')}
          >
            Expense
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="pl-7 text-lg font-medium h-12"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description <span className="text-gray-400 font-normal">(Optional)</span></Label>
        <Input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this transaction for?"
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="h-12"
        />
      </div>

      {categories.length > 0 && type === 'expense' && (
        <div className="space-y-2">
          <Label>Category</Label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => setCategoryId('')}
              className={`flex flex-col items-center justify-center p-3 sm:p-2.5 rounded-lg border transition-all touch-manipulation min-h-[90px] sm:min-h-[80px] ${
                categoryId === ''
                  ? 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500 shadow-inner'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 bg-gray-50/50 dark:bg-gray-800/50'
              }`}
            >
              <span className="text-2xl sm:text-xl mb-1">🚫</span>
              <span className="text-xs text-center truncate w-full font-medium">None</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`flex flex-col items-center justify-center p-3 sm:p-2.5 rounded-lg border transition-all touch-manipulation min-h-[90px] sm:min-h-[80px] ${
                  categoryId === cat.id
                    ? 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500 shadow-inner ring-1 ring-gray-200 dark:ring-gray-600'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 bg-gray-50/50 dark:bg-gray-800/50'
                }`}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg mb-1"
                  style={{ 
                    backgroundColor: cat.color ? `${cat.color}20` : '#F3F4F6',
                  }}
                >
                  {cat.icon || '📁'}
                </div>
                <span className="text-xs text-center truncate w-full font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full h-12 sm:h-11 text-base sm:text-lg touch-manipulation">
        {loading ? 'Saving...' : 'Add Transaction'}
      </Button>
    </form>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { TransactionWithCategory } from '@/types/transactions'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/format'
import { Button, Input, Label, Alert, AlertDescription, Modal } from '@/components/ui'
import CategoryForm from '@/components/categories/CategoryForm'
import { Plus } from '@untitledui/icons'

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

interface TransactionFormProps {
  transaction?: TransactionWithCategory | null
  categories: Category[]
  onSuccess: () => void
  onCancel: () => void
  onCategoriesChange?: (categories: Category[]) => void
}

export default function TransactionForm({
  transaction,
  categories,
  onSuccess,
  onCancel,
  onCategoriesChange,
}: TransactionFormProps) {
  const [amount, setAmount] = useState(transaction?.amount.toString() || '')
  const [description, setDescription] = useState(transaction?.description || '')
  const [date, setDate] = useState(transaction?.date || formatDate(new Date()))
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type || 'expense')
  const [categoryId, setCategoryId] = useState(transaction?.category_id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [localCategories, setLocalCategories] = useState(categories)
  const supabase = createClient()

  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString())
      setDescription(transaction.description)
      setDate(transaction.date)
      setType(transaction.type)
      setCategoryId(transaction.category_id || '')
    }
  }, [transaction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const transactionData = {
      user_id: user.id,
      amount: parseFloat(amount),
      description: description || '',
      date,
      type,
      category_id: categoryId || null,
    }

    if (transaction) {
      const { error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', transaction.id)

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        onSuccess()
      }
    } else {
      const { error } = await supabase.from('transactions').insert(transactionData)

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        onSuccess()
      }
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              className={`py-3 sm:py-2 px-4 rounded-md text-sm font-medium transition-all touch-manipulation ${
                type === 'income'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              onClick={() => setType('income')}
            >
              Income
            </button>
            <button
              type="button"
              className={`py-3 sm:py-2 px-4 rounded-md text-sm font-medium transition-all touch-manipulation ${
                type === 'expense'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-900'
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
              className="pl-7 text-lg font-medium"
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
          />
        </div>

        {type === 'expense' && (
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 sm:gap-2 max-h-48 overflow-y-auto p-1">
              <button
                type="button"
                onClick={() => setCategoryId('')}
                className={`flex flex-col items-center justify-center p-2.5 sm:p-2 rounded-lg border transition-all touch-manipulation min-h-[80px] sm:min-h-[70px] ${
                  categoryId === ''
                    ? 'bg-gray-100 border-gray-300'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <span className="text-xl sm:text-xl mb-1">🚫</span>
                <span className="text-xs text-center truncate w-full">None</span>
              </button>
              {localCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex flex-col items-center justify-center p-2.5 sm:p-2 rounded-lg border transition-all touch-manipulation min-h-[80px] sm:min-h-[70px] ${
                    categoryId === cat.id
                      ? 'bg-gray-100 border-gray-300 ring-1 ring-gray-300'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div 
                    className="w-8 h-8 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-lg mb-1"
                    style={{ 
                      backgroundColor: cat.color ? `${cat.color}20` : '#F3F4F6',
                    }}
                  >
                    {cat.icon || '📁'}
                  </div>
                  <span className="text-xs text-center truncate w-full">{cat.name}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCategoryForm(true)}
                className="flex flex-col items-center justify-center p-2.5 sm:p-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all touch-manipulation min-h-[80px] sm:min-h-[70px]"
              >
                <div className="w-8 h-8 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-lg mb-1 bg-gray-100">
                  <Plus className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-xs text-center truncate w-full text-gray-600 font-medium">New Category</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11 sm:h-10 touch-manipulation">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1 h-11 sm:h-10 touch-manipulation">
            {loading ? 'Saving...' : transaction ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>

      <Modal
        isOpen={showCategoryForm}
        onClose={() => setShowCategoryForm(false)}
        title="New Category"
      >
        <CategoryForm
          category={null}
          onSuccess={async (newCategory) => {
            if (newCategory) {
              // Optimistically update local state immediately
              const updatedCategories = [...localCategories, newCategory].sort((a, b) => 
                a.name.localeCompare(b.name)
              )
              
              setLocalCategories(updatedCategories)
              setCategoryId(newCategory.id)
              
              // Notify parent and sync with server in background
              if (onCategoriesChange) {
                onCategoriesChange(updatedCategories)
              }
            }
            setShowCategoryForm(false)
          }}
          onCancel={() => setShowCategoryForm(false)}
        />
      </Modal>
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { TransactionWithCategory } from '@/types/transactions'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/format'
import { Button, Input, Label, Alert, AlertDescription, Modal } from '@/components/ui'
import { useRouter } from 'next/navigation'
import CategoryForm from '@/components/categories/CategoryForm'
import { Plus } from '@untitledui/icons'

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

interface ManualTransactionFormProps {
  categories: Category[]
  onSuccess?: () => void
  onCategoriesChange?: (categories: Category[]) => void
}

export default function ManualTransactionForm({ categories, onSuccess, onCategoriesChange }: ManualTransactionFormProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(formatDate(new Date()))
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [localCategories, setLocalCategories] = useState(categories)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

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
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="bg-green-50 text-green-900 border-green-200">
            <AlertDescription>Transaction saved successfully!</AlertDescription>
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

        {type === 'expense' && (
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
              <button
                type="button"
                onClick={() => setCategoryId('')}
                className={`flex flex-col items-center justify-center p-3 sm:p-2.5 rounded-lg border transition-all touch-manipulation min-h-[90px] sm:min-h-[80px] ${
                  categoryId === ''
                    ? 'bg-gray-100 border-gray-300 shadow-inner'
                    : 'border-transparent hover:bg-gray-50 bg-gray-50/50'
                }`}
              >
                <span className="text-2xl sm:text-xl mb-1">🚫</span>
                <span className="text-xs text-center truncate w-full font-medium">None</span>
              </button>
              {localCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex flex-col items-center justify-center p-3 sm:p-2.5 rounded-lg border transition-all touch-manipulation min-h-[90px] sm:min-h-[80px] ${
                    categoryId === cat.id
                      ? 'bg-gray-100 border-gray-300 shadow-inner ring-1 ring-gray-200'
                      : 'border-transparent hover:bg-gray-50 bg-gray-50/50'
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
              <button
                type="button"
                onClick={() => setShowCategoryForm(true)}
                className="flex flex-col items-center justify-center p-3 sm:p-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all touch-manipulation min-h-[90px] sm:min-h-[80px]"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg mb-1 bg-gray-100">
                  <Plus className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-xs text-center truncate w-full text-gray-600 font-medium">New Category</span>
              </button>
            </div>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-12 sm:h-11 text-base sm:text-lg touch-manipulation">
          {loading ? 'Saving...' : 'Add Transaction'}
        </Button>
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


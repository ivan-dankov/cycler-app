'use client'

import { useState, useEffect } from 'react'
import { TransactionWithCategory } from '@/types/transactions'
import { formatCurrency } from '@/lib/utils/format'
import TransactionForm from './TransactionForm'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, Modal } from '@/components/ui'
import { Edit02, Trash01, Plus } from '@untitledui/icons'
import { format, isToday, isYesterday } from 'date-fns'

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

interface TransactionsListProps {
  initialTransactions: TransactionWithCategory[]
  categories: Category[]
}

export default function TransactionsList({ initialTransactions, categories }: TransactionsListProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [localCategories, setLocalCategories] = useState(categories)
  
  useEffect(() => {
    setTransactions(initialTransactions)
  }, [initialTransactions])

  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleCategoriesChange = async (updatedCategories: Category[]) => {
    setLocalCategories(updatedCategories)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error deleting transaction: ' + error.message)
    } else {
      setTransactions(transactions.filter(t => t.id !== id))
      router.refresh()
    }
  }

  const handleEdit = (transaction: TransactionWithCategory) => {
    setEditingTransaction(transaction)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingTransaction(null)
    router.refresh()
    window.location.reload() 
  }

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = transaction.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(transaction)
    return groups
  }, {} as Record<string, TransactionWithCategory[]>)

  // Sort dates descending
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  const formatGroupDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'MMMM d, yyyy')
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transactions</h1>
        <Button
          onClick={() => router.push('/add')}
          className="w-full sm:w-auto touch-manipulation"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingTransaction(null)
        }}
        title="Edit Transaction"
      >
        <TransactionForm
          transaction={editingTransaction}
          categories={localCategories}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false)
            setEditingTransaction(null)
          }}
          onCategoriesChange={handleCategoriesChange}
        />
      </Modal>

      <div className="space-y-6">
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions yet</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first transaction.</p>
              <Button
                onClick={() => router.push('/add')}
              >
                Add Transaction
              </Button>
            </CardContent>
          </Card>
        ) : (
          sortedDates.map((date) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-500 mb-3 ml-1">
                {formatGroupDate(date)}
              </h3>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {groupedTransactions[date].map((transaction, index) => (
                  <div 
                    key={transaction.id}
                    className={`
                      group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-gray-50 transition-colors
                      ${index !== groupedTransactions[date].length - 1 ? 'border-b border-gray-100' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div 
                        className="w-10 h-10 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                        style={{ 
                          backgroundColor: transaction.category_color ? `${transaction.category_color}20` : '#F3F4F6',
                          color: transaction.category_color || '#6B7280'
                        }}
                      >
                        {transaction.category_icon || (transaction.type === 'income' ? '💰' : '💸')}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
                            {transaction.description}
                          </p>
                        </div>
                        {transaction.category_name && (
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            {transaction.category_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 sm:pl-4">
                      <span
                        className={`font-semibold whitespace-nowrap text-sm sm:text-base ${
                          transaction.type === 'income'
                            ? 'text-green-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : ''}
                        {formatCurrency(transaction.amount)}
                      </span>
                      
                      <div className="flex gap-1 sm:gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 sm:h-8 sm:w-8 p-0 touch-manipulation"
                          onClick={() => handleEdit(transaction)}
                          aria-label="Edit transaction"
                        >
                          <Edit02 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700 touch-manipulation"
                          onClick={() => handleDelete(transaction.id)}
                          aria-label="Delete transaction"
                        >
                          <Trash01 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

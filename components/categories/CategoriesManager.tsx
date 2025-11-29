'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import CategoryForm from './CategoryForm'
import { formatCurrency } from '@/lib/utils/format'
import { Button, Card, CardContent, Modal } from '@/components/ui'
import { Edit02, Trash01, Plus } from '@untitledui/icons'
import { CategoryWithBalance } from '@/types/transactions'

interface CategoriesManagerProps {
  initialCategories: CategoryWithBalance[]
  userId: string
}

export default function CategoriesManager({
  initialCategories,
  userId,
}: CategoriesManagerProps) {
  const [categories, setCategories] = useState(initialCategories)
  
  // Update local state when props change
  useEffect(() => {
    setCategories(initialCategories)
  }, [initialCategories])

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithBalance | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    const { error } = await supabase.from('categories').delete().eq('id', id)

    if (error) {
      alert('Error deleting category: ' + error.message)
    } else {
      setCategories(categories.filter((c) => c.id !== id))
      router.refresh()
    }
  }

  const handleFormSuccess = () => {
    setShowCategoryForm(false)
    setEditingCategory(null)
    router.refresh()
    // Force reload to ensure data consistency
    window.location.reload()
  }

  const totalBudget = categories.reduce((sum, category) => sum + Number(category.budget_amount), 0)

  return (
    <div className="space-y-6">
      {/* Categories Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Categories
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Total Monthly Budget: <span className="font-medium text-gray-900">{formatCurrency(totalBudget)}</span>
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingCategory(null)
                setShowCategoryForm(true)
              }}
              className="w-full sm:w-auto touch-manipulation"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Category
            </Button>
          </div>

          <Modal
            isOpen={showCategoryForm}
            onClose={() => {
              setShowCategoryForm(false)
              setEditingCategory(null)
            }}
            title={editingCategory ? 'Edit Category' : 'New Category'}
          >
            <CategoryForm
              category={editingCategory}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowCategoryForm(false)
                setEditingCategory(null)
              }}
            />
          </Modal>

          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-gray-600 text-sm">No categories yet</p>
            ) : (
              categories.map((category) => {
                const percentageUsed = category.budget_amount > 0 
                  ? (category.spent / category.budget_amount) * 100 
                  : 0
                const isOverBudget = category.remaining < 0

                return (
                  <div
                    key={category.id}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    style={{ borderLeft: `4px solid ${category.color || 'transparent'}` }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {category.icon && (
                        <span className="text-xl">{category.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{category.name}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mt-1">
                          <p className="text-sm text-gray-600">
                            Budget: {formatCurrency(Number(category.budget_amount))}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`font-medium ${
                              isOverBudget 
                                ? 'text-red-600' 
                                : 'text-gray-500'
                            }`}>
                              {isOverBudget ? 'Over Budget' : `${Math.min(Math.round(percentageUsed), 100)}% Used`}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">
                              {formatCurrency(category.spent)} spent
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className={`font-medium ${
                              isOverBudget 
                                ? 'text-red-600' 
                                : 'text-gray-700'
                            }`}>
                              {formatCurrency(category.remaining)} left
                            </span>
                          </div>
                        </div>
                        {category.budget_amount > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isOverBudget
                                  ? 'bg-red-500'
                                  : percentageUsed > 85
                                  ? 'bg-yellow-500'
                                  : percentageUsed > 50
                                  ? 'bg-blue-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ 
                                width: `${Math.min(percentageUsed, 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 sm:flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCategory(category)
                          setShowCategoryForm(true)
                        }}
                        aria-label="Edit"
                        className="h-9 w-9 sm:h-8 sm:w-8 p-0 touch-manipulation"
                      >
                        <Edit02 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        aria-label="Delete"
                        className="h-9 w-9 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700 touch-manipulation"
                      >
                        <Trash01 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

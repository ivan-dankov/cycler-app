import { CategoryWithBalance } from '@/types/transactions'
import { formatCurrency } from '@/lib/utils/format'
import { Card, CardContent } from '@/components/ui'

interface CategoryCardProps {
  category: CategoryWithBalance
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const percentageUsed = category.budget_amount > 0 
    ? (category.spent / category.budget_amount) * 100 
    : 0
  const isOverBudget = category.remaining < 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ 
                backgroundColor: category.color ? `${category.color}20` : '#F3F4F6',
              }}
            >
              {category.icon || '📁'}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">{category.name}</h3>
              <p className={`text-xs font-medium mt-0.5 ${
                isOverBudget 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {isOverBudget ? 'Over Budget' : `${Math.min(Math.round(percentageUsed), 100)}% Used`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-bold ${
              isOverBudget 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {formatCurrency(category.remaining)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">left</p>
          </div>
        </div>

        {category.budget_amount > 0 && (
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
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
        
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>{formatCurrency(category.spent)} spent</span>
          <span>of {formatCurrency(category.budget_amount)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

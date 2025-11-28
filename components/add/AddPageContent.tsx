'use client'

import { useState } from 'react'
import ImportTransactions from '@/components/import/ImportTransactions'
import ManualTransactionForm from '@/components/add/ManualTransactionForm'
import { Card, CardContent } from '@/components/ui'
import { Plus, Camera01 } from '@untitledui/icons'

interface AddPageProps {
  categories: Array<{ id: string; name: string; color?: string; icon?: string }>
}

export default function AddPageContent({ categories }: AddPageProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'screenshot'>('manual')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'manual'
              ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          Manual Entry
        </button>
        <button
          onClick={() => setActiveTab('screenshot')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'screenshot'
              ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Camera01 className="w-4 h-4" />
          Add Screenshot
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        {activeTab === 'screenshot' ? (
          <ImportTransactions categories={categories} />
        ) : (
          <ManualTransactionForm categories={categories} />
        )}
      </div>
    </div>
  )
}


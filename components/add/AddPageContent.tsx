'use client'

import { useState, useEffect } from 'react'
import ImportTransactions from '@/components/import/ImportTransactions'
import ManualTransactionForm from '@/components/add/ManualTransactionForm'
import { Card, CardContent } from '@/components/ui'
import { Plus, Camera01 } from '@untitledui/icons'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AddPageProps {
  categories: Array<{ id: string; name: string; color?: string; icon?: string }>
}

export default function AddPageContent({ categories }: AddPageProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'screenshot'>('manual')
  const [localCategories, setLocalCategories] = useState(categories)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

  const handleCategoriesChange = async (updatedCategories: Array<{ id: string; name: string; color?: string; icon?: string }>) => {
    setLocalCategories(updatedCategories)
    // We update local state immediately. 
    // We do NOT call router.refresh() here to avoid race conditions where 
    // stale server data might overwrite our optimistic update.
    // The page will be refreshed when the transaction is saved.
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'manual'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          Manual Entry
        </button>
        <button
          onClick={() => setActiveTab('screenshot')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'screenshot'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Camera01 className="w-4 h-4" />
          Add Screenshot
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {activeTab === 'screenshot' ? (
          <ImportTransactions 
            categories={localCategories.map(c => ({ id: c.id, name: c.name }))} 
            onCategoriesChange={(cats) => handleCategoriesChange(cats.map(c => ({ ...c, color: undefined, icon: undefined })))}
          />
        ) : (
          <ManualTransactionForm 
            categories={localCategories} 
            onCategoriesChange={handleCategoriesChange}
          />
        )}
      </div>
    </div>
  )
}


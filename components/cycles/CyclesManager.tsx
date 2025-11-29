'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import CycleForm from './CycleForm'
import { format } from 'date-fns'
import { Button, Card, CardContent, Modal } from '@/components/ui'
import { Plus, Trash01, Check } from '@untitledui/icons'

interface Cycle {
  id: string
  name: string
  start_date: string
  end_date: string
}

interface CyclesManagerProps {
  cycles: Cycle[]
  currentCycle: Cycle | null
}

export default function CyclesManager({
  cycles: initialCycles,
  currentCycle,
}: CyclesManagerProps) {
  const [cycles, setCycles] = useState(initialCycles)
  const [showCycleForm, setShowCycleForm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleCycleFormSuccess = () => {
    setShowCycleForm(false)
    router.refresh()
    window.location.reload()
  }

  const handleDeleteCycle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cycle?')) return

    const { error } = await supabase.from('budget_cycles').delete().eq('id', id)

    if (error) {
      alert('Error deleting cycle: ' + error.message)
    } else {
      setCycles(cycles.filter((c) => c.id !== id))
      router.refresh()
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Budget Cycles</h2>
          <Button size="sm" onClick={() => setShowCycleForm(true)} className="w-full sm:w-auto touch-manipulation">
            <Plus className="w-4 h-4 mr-1" />
            New Cycle
          </Button>
        </div>

        <Modal
          isOpen={showCycleForm}
          onClose={() => setShowCycleForm(false)}
          title="New Budget Cycle"
        >
          <CycleForm onSuccess={handleCycleFormSuccess} onCancel={() => setShowCycleForm(false)} />
        </Modal>

        <div className="space-y-2">
          {cycles.length === 0 ? (
            <p className="text-gray-600 text-sm">No cycles yet</p>
          ) : (
            cycles.map((cycle) => {
              const isCurrent = currentCycle?.id === cycle.id
              return (
                <div
                  key={cycle.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    isCurrent
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {format(new Date(cycle.start_date), 'MMMM d, yyyy')} -{' '}
                          {format(new Date(cycle.end_date), 'MMMM d, yyyy')}
                        </p>
                        {isCurrent && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCycle(cycle.id)}
                        className="h-9 w-9 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 touch-manipulation"
                        aria-label="Delete cycle"
                      >
                        <Trash01 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}


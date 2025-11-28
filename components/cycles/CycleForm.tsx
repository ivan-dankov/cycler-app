'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/format'
import { format, addMonths, setDate, endOfMonth, startOfMonth, addDays } from 'date-fns'
import { Button, Input, Label, Alert, AlertDescription } from '@/components/ui'

interface CycleFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function CycleForm({ onSuccess, onCancel }: CycleFormProps) {
  const [startDate, setStartDate] = useState(formatDate(new Date()))
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Presets
  const setPreset = (type: '30days' | 'nextMonth' | 'monthEnd') => {
    const start = new Date(startDate)
    let end: Date

    switch (type) {
      case '30days':
        end = addDays(start, 30)
        break
      case 'nextMonth':
        end = addMonths(start, 1)
        break
      case 'monthEnd':
        end = endOfMonth(start)
        break
    }
    setEndDate(formatDate(end))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!startDate || !endDate) {
      setError('All fields are required')
      setLoading(false)
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('End date must be after start date')
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    // Auto-generate cycle name from dates
    const start = new Date(startDate)
    const name = format(start, 'MMMM yyyy')

    const { data: newCycle, error: insertError } = await supabase
      .from('budget_cycles')
      .insert({
        user_id: user.id,
        name,
        start_date: startDate,
        end_date: endDate,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else if (newCycle) {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="startDate">Start Date</Label>
        <Input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endDate">End Date</Label>
        <div className="flex flex-col gap-2">
           <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs h-10 sm:h-9 touch-manipulation"
              onClick={() => setPreset('30days')}
            >
              +30 Days
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs h-10 sm:h-9 touch-manipulation"
              onClick={() => setPreset('nextMonth')}
            >
              <span className="hidden sm:inline">Next Month (Same Day)</span>
              <span className="sm:hidden">Next Month</span>
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs h-10 sm:h-9 touch-manipulation"
              onClick={() => setPreset('monthEnd')}
            >
              End of Month
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11 sm:h-10 touch-manipulation">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 h-11 sm:h-10 touch-manipulation">
          {loading ? 'Creating...' : 'Create Cycle'}
        </Button>
      </div>
    </form>
  )
}

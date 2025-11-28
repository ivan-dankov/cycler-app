'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Label, Alert, AlertDescription } from '@/components/ui'
import { PRESET_COLORS, PRESET_EMOJIS } from '@/lib/constants/categories'
import { Check } from '@untitledui/icons'

interface Category {
  id: string
  name: string
  budget_amount: number
  color?: string | null
  icon?: string | null
}

interface CategoryFormProps {
  category?: Category | null
  onSuccess: () => void
  onCancel: () => void
}

export default function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '')
  const [budgetAmount, setBudgetAmount] = useState(category?.budget_amount.toString() || '0')
  const [color, setColor] = useState(category?.color || PRESET_COLORS[0])
  const [icon, setIcon] = useState(category?.icon || PRESET_EMOJIS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [showCustomColor, setShowCustomColor] = useState(false)
  const [showCustomIcon, setShowCustomIcon] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (category) {
      setName(category.name)
      setBudgetAmount(category.budget_amount.toString())
      setColor(category.color || PRESET_COLORS[0])
      setIcon(category.icon || PRESET_EMOJIS[0])
      
      // If the loaded color/icon isn't in the preset list, show custom input
      if (category.color && !PRESET_COLORS.includes(category.color)) {
        setShowCustomColor(true)
      }
      if (category.icon && !PRESET_EMOJIS.includes(category.icon)) {
        setShowCustomIcon(true)
      }
    }
  }, [category])

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

    const categoryData = {
      user_id: user.id,
      name,
      budget_amount: parseFloat(budgetAmount) || 0,
      color,
      icon,
    }

    if (category) {
      const { error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', category.id)

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        onSuccess()
      }
    } else {
      const { error } = await supabase.from('categories').insert(categoryData)

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        onSuccess()
      }
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
        <Label htmlFor="name">Category Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">Budget Amount</Label>
        <Input
          id="budget"
          type="number"
          step="0.01"
          value={budgetAmount}
          onChange={(e) => setBudgetAmount(e.target.value)}
          required
          min="0"
        />
      </div>

      <div className="space-y-4">
        {/* Color Selection */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Color</Label>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="text-xs h-6"
              onClick={() => setShowCustomColor(!showCustomColor)}
            >
              {showCustomColor ? 'Use Presets' : 'Use Custom'}
            </Button>
          </div>
          
          {showCustomColor ? (
             <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <span className="text-sm text-gray-500">{color}</span>
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-6 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all touch-manipulation ${
                    color === presetColor 
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' 
                      : 'hover:scale-110 border-transparent'
                  }`}
                  style={{ backgroundColor: presetColor }}
                >
                  {color === presetColor && (
                    <Check className="w-5 h-5 sm:w-4 sm:h-4 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Emoji Selection */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Emoji</Label>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="text-xs h-6"
              onClick={() => setShowCustomIcon(!showCustomIcon)}
            >
              {showCustomIcon ? 'Use Presets' : 'Use Custom'}
            </Button>
          </div>

          {showCustomIcon ? (
            <Input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. 🍔"
              className="text-center text-xl"
              maxLength={2}
            />
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
              {PRESET_EMOJIS.map((presetEmoji) => (
                <button
                  key={presetEmoji}
                  type="button"
                  onClick={() => setIcon(presetEmoji)}
                  className={`h-12 sm:h-10 rounded-md flex items-center justify-center text-xl sm:text-xl border transition-all touch-manipulation ${
                    icon === presetEmoji 
                      ? 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent'
                  }`}
                >
                  {presetEmoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11 sm:h-10 touch-manipulation">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 h-11 sm:h-10 touch-manipulation">
          {loading ? 'Saving...' : category ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

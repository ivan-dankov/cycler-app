'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, ChevronDown } from '@untitledui/icons'

interface Cycle {
  id: string
  name: string
  start_date: string
  end_date: string
}

interface CycleSwitcherProps {
  currentCycle: Cycle
  allCycles: Cycle[]
}

export default function CycleSwitcher({ currentCycle, allCycles }: CycleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-500 transition-colors cursor-pointer w-full md:w-auto"
      >
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
          <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </div>
        <div className="pr-2 text-left">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Viewing Cycle</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {format(new Date(currentCycle.start_date), 'MMM d')} - {format(new Date(currentCycle.end_date), 'MMM d, yyyy')}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 max-h-96 overflow-y-auto">
          {allCycles.map((cycle) => (
            <Link
              key={cycle.id}
              href={`/dashboard?cycle=${cycle.id}`}
              className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                currentCycle.id === cycle.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {format(new Date(cycle.start_date), 'MMMM d, yyyy')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                to {format(new Date(cycle.end_date), 'MMMM d, yyyy')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}


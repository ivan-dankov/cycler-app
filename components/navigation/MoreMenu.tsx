'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui'
import { PieChart01 } from '@untitledui/icons'
import Link from 'next/link'

export default function MoreMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsOpen(false)
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center justify-center h-full transition-colors text-gray-500"
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
        <span className="text-xs font-medium">More</span>
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="More">
        <div className="space-y-2">
          <Link
            href="/cycles"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-gray-100 rounded-lg">
              <PieChart01 className="w-5 h-5 text-gray-700" />
            </div>
            <span className="font-medium text-gray-900">Cycles</span>
          </Link>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <span className="font-medium text-gray-900">Logout</span>
          </button>
        </div>
      </Modal>
    </>
  )
}


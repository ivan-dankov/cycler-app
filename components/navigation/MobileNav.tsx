'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home01, Wallet01, Folder, Plus } from '@untitledui/icons'
import MoreMenu from './MoreMenu'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: Home01 },
  { href: '/transactions', label: 'Transactions', Icon: Wallet01 },
  { href: '/add', label: 'Add', Icon: Plus },
  { href: '/categories', label: 'Categories', Icon: Folder },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="grid grid-cols-5 items-center h-16 px-2">
        {navItems.map((item) => {
          const isAdd = item.href === '/add'
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          
          if (isAdd) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-6 relative z-10"
              >
                <div className={`p-4 rounded-full shadow-lg transition-transform hover:scale-105 ${
                  isActive 
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' 
                    : 'bg-blue-600 text-white dark:bg-blue-500'
                }`}>
                  <item.Icon className="w-6 h-6" />
                </div>
                <span className={`text-xs font-medium mt-1 ${
                  isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {item.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center h-full transition-colors ${
                isActive
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <item.Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
        <MoreMenu />
      </div>
    </nav>
  )
}


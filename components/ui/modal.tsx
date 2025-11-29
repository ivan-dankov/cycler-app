'use client'

import { useEffect } from 'react'
import { X } from '@untitledui/icons'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { cn } from '@/lib/utils/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 modal-container"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" />
      
      {/* Modal */}
      <Card className={cn(
        'relative z-10 w-full max-w-md max-h-[calc(100dvh-4rem)] sm:max-h-[calc(100vh-2rem)] md:max-h-[85vh] overflow-hidden flex flex-col',
        'mx-auto my-auto shadow-2xl',
        className
      )}>
        <CardHeader className="flex-shrink-0 pb-3 sm:pb-4 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base sm:text-lg md:text-xl pr-2 break-words">{title}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close"
              className="h-9 w-9 p-0 flex-shrink-0 touch-manipulation"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 pb-safe">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}


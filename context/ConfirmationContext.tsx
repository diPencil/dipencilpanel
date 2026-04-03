'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

export interface ConfirmationDialogOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

interface ConfirmationContextType {
  isOpen: boolean
  options: ConfirmationDialogOptions | null
  confirm: (options: ConfirmationDialogOptions) => Promise<boolean>
  confirmAction: () => void
  cancelAction: () => void
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined)

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmationDialogOptions | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((dialogOptions: ConfirmationDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setOptions(dialogOptions)
      setIsOpen(true)
    })
  }, [])

  const confirmAction = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(true)
      resolveRef.current = null
    }
    setIsOpen(false)
    setOptions(null)
  }, [])

  const cancelAction = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false)
      resolveRef.current = null
    }
    setIsOpen(false)
    setOptions(null)
  }, [])

  return (
    <ConfirmationContext.Provider value={{ isOpen, options, confirm, confirmAction, cancelAction }}>
      {children}
    </ConfirmationContext.Provider>
  )
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext)
  if (!context) {
    throw new Error('useConfirmation must be used within ConfirmationProvider')
  }
  return context
}

export function useConfirm() {
  const { confirm } = useConfirmation()
  return confirm
}

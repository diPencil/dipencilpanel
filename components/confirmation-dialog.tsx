'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useConfirmation } from '@/context/ConfirmationContext'

export function ConfirmationDialog() {
  const { isOpen, options, confirmAction, cancelAction } = useConfirmation()

  if (!options) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && cancelAction()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          {options.description && (
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel onClick={cancelAction}>
            {options.cancelText || 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmAction}
            className={options.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {options.confirmText || 'Confirm'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

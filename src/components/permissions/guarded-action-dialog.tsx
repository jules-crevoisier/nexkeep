"use client"

import { PermissionDeniedDialog } from "./permission-denied-dialog"

interface GuardedActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: string
}

/** Dialogue à placer une fois par page/composant utilisant useGuardedAction. */
export function GuardedActionDialog({
  open,
  onOpenChange,
  message,
}: GuardedActionDialogProps) {
  return (
    <PermissionDeniedDialog
      open={open}
      onOpenChange={onOpenChange}
      message={message}
    />
  )
}

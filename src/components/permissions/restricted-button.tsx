"use client"

import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGuardedAction } from "@/hooks/use-guarded-action"
import { PermissionDeniedDialog } from "./permission-denied-dialog"

interface RestrictedButtonProps extends ButtonProps {
  allowed: boolean
  deniedMessage: string
}

/** Bouton désactivé visuellement ; au clic, popup si l'action n'est pas autorisée. */
export function RestrictedButton({
  allowed,
  deniedMessage,
  onClick,
  className,
  disabled,
  children,
  ...props
}: RestrictedButtonProps) {
  const { guard, deniedOpen, setDeniedOpen } = useGuardedAction(allowed, deniedMessage)

  return (
    <>
      <Button
        {...props}
        disabled={disabled}
        aria-disabled={!allowed || disabled}
        className={cn(!allowed && "opacity-50", className)}
        onClick={onClick ? guard(onClick) : undefined}
      >
        {children}
      </Button>
      <PermissionDeniedDialog
        open={deniedOpen}
        onOpenChange={setDeniedOpen}
        message={deniedMessage}
      />
    </>
  )
}

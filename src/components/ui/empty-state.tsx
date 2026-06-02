import * as React from "react"
import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/** État vide standardisé : icône + titre + message + action optionnelle. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className
      )}
    >
      <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-full">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

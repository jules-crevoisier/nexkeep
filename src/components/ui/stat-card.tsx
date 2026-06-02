import * as React from "react"
import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatCardProps {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  /** Couleur d'accent de l'icône (classe Tailwind text-*). */
  iconClassName?: string
  /** Texte secondaire sous la valeur (ex. variation). */
  hint?: React.ReactNode
  /** Classe de couleur appliquée à la valeur. */
  valueClassName?: string
  className?: string
}

/** Carte KPI standardisée (label + valeur + icône + indice optionnel). */
export function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  hint,
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {label}
        </CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  )
}

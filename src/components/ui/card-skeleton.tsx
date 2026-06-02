import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Grille de cartes en chargement (remplace les « Chargement… » texte). */
export function CardGridSkeleton({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** Bloc de chargement générique (ex. à la place d'un graphique). */
export function BlockSkeleton({ className }: { className?: string }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className={cn("h-64 w-full", className)} />
      </CardContent>
    </Card>
  )
}

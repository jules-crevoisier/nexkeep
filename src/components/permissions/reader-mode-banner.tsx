"use client"

import { Eye } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"

interface ReaderModeBannerProps {
  mode: "orga" | "treasury"
}

/** Bandeau informatif pour les utilisateurs en lecture seule. */
export function ReaderModeBanner({ mode }: ReaderModeBannerProps) {
  const perms = usePermissions()

  const showOrga =
    mode === "orga" &&
    (perms.isViewer || perms.isProjectsOnly || !perms.canAccessInbox)
  const showTreasury = mode === "treasury" && perms.isTreasuryReadOnly

  if (!showOrga && !showTreasury) return null

  const orgaParts: string[] = []
  if (perms.isViewer) orgaParts.push(perms.orgaDeniedMessage)
  if (perms.isProjectsOnly) {
    orgaParts.push("Accès limité aux projets qui vous sont assignés.")
  }
  if (!perms.canAccessInbox) {
    orgaParts.push("Tâches courantes (sans projet) : accès désactivé.")
  }

  const message =
    mode === "orga"
      ? orgaParts.join(" ")
      : `Trésorerie en lecture seule — ${perms.treasuryDeniedMessage}`

  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
      <Eye className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  )
}

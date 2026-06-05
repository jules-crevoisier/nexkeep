"use client"

import { useWorkspace } from "@/components/providers/workspace-provider"
import {
  canAdminWorkspace,
  canEditOrga,
  canReadTreasury,
  canWriteTreasury,
  PERMISSION_MESSAGES,
  ROLE_LABELS,
} from "@/lib/permissions"

/** Droits de l'utilisateur dans l'organisation active. */
export function usePermissions() {
  const { active } = useWorkspace()
  const role = active?.role ?? "VIEWER"
  const treasuryAccess = active?.treasuryAccess ?? "NONE"

  const orgaScope = active?.orgaScope ?? "FULL"
  const canAccessInbox = active?.canAccessInbox ?? true

  return {
    role,
    roleLabel: ROLE_LABELS[role],
    treasuryAccess,
    orgaScope,
    canAccessInbox,
    canEditOrga: canEditOrga(role),
    canAdmin: canAdminWorkspace(role),
    canReadTreasury: canReadTreasury(treasuryAccess),
    canWriteTreasury: canWriteTreasury(treasuryAccess),
    isViewer: role === "VIEWER",
    isProjectsOnly: orgaScope === "PROJECTS_ONLY",
    isTreasuryReadOnly: canReadTreasury(treasuryAccess) && !canWriteTreasury(treasuryAccess),
    orgaDeniedMessage: PERMISSION_MESSAGES.orgaWrite,
    treasuryDeniedMessage: PERMISSION_MESSAGES.treasuryWrite,
    adminDeniedMessage: PERMISSION_MESSAGES.adminOnly,
    scopeDeniedMessage: PERMISSION_MESSAGES.scopeDenied,
    inboxDeniedMessage: PERMISSION_MESSAGES.inboxDenied,
  }
}

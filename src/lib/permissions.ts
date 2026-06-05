import type { TreasuryAccess, WorkspaceRole } from "@/components/providers/workspace-provider"

const ROLE_RANK: Record<WorkspaceRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
}

const TREASURY_RANK: Record<TreasuryAccess, number> = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MEMBER: "Membre",
  VIEWER: "Lecteur",
}

export function canEditOrga(role: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.MEMBER
}

export function canAdminWorkspace(role: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.ADMIN
}

export function canWriteTreasury(access: TreasuryAccess): boolean {
  return TREASURY_RANK[access] >= TREASURY_RANK.WRITE
}

export function canReadTreasury(access: TreasuryAccess): boolean {
  return TREASURY_RANK[access] >= TREASURY_RANK.READ
}

export const PERMISSION_MESSAGES = {
  orgaWrite:
    "Vous êtes lecteur dans cette organisation. Vous pouvez consulter le contenu mais pas le créer ni le modifier.",
  treasuryWrite:
    "Votre accès à la trésorerie est en lecture seule. Contactez un administrateur pour obtenir les droits d'écriture.",
  adminOnly:
    "Cette action est réservée aux administrateurs de l'organisation.",
  scopeDenied:
    "Vous n'avez pas accès à ce projet. Contactez un administrateur pour obtenir les droits.",
  inboxDenied:
    "Vous n'avez pas accès aux tâches courantes (sans projet). Contactez un administrateur.",
} as const

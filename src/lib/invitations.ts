import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"

/** Duree de validite d'une invitation (jours). */
export const INVITATION_TTL_DAYS = 14

export function newInvitationToken(): string {
  return randomBytes(24).toString("hex")
}

export function invitationExpiry(): Date {
  return new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000)
}

/**
 * Fait rejoindre une organisation a un utilisateur a partir d'un token d'invitation.
 * Verifie : invitation existante, PENDING, non expiree, email correspondant.
 * Idempotent : si deja membre, marque simplement l'invitation acceptee.
 * Renvoie l'id du workspace rejoint, ou null si l'invitation est invalide.
 */
export async function acceptInvitationForUser(
  token: string,
  userId: string,
  userEmail: string
): Promise<string | null> {
  const invitation = await prisma.workspaceInvitation.findUnique({ where: { token } })
  if (!invitation) return null
  if (invitation.status !== "PENDING") return null
  if (invitation.expiresAt < new Date()) {
    await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    })
    return null
  }
  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) return null

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
  })
  if (!existing) {
    await prisma.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
        treasuryAccess: invitation.treasuryAccess,
      },
    })
  }

  await prisma.workspaceInvitation.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  })

  return invitation.workspaceId
}

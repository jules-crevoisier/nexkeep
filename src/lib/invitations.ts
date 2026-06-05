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

export type AcceptInvitationFailureReason =
  | "not_found"
  | "expired"
  | "revoked"
  | "email_mismatch"
  | "already_used"

export type AcceptInvitationResult =
  | { success: true; workspaceId: string; alreadyMember: boolean }
  | { success: false; reason: AcceptInvitationFailureReason }

const FAILURE_MESSAGES: Record<AcceptInvitationFailureReason, string> = {
  not_found: "Invitation introuvable.",
  expired: "Cette invitation a expire. Demandez un nouvel envoi.",
  revoked: "Cette invitation a ete annulee.",
  email_mismatch: "Cette invitation est destinee a un autre email.",
  already_used: "Cette invitation a deja ete utilisee par un autre compte.",
}

export function acceptInvitationErrorMessage(reason: AcceptInvitationFailureReason): string {
  return FAILURE_MESSAGES[reason]
}

/**
 * Fait rejoindre une organisation a un utilisateur a partir d'un token d'invitation.
 * Idempotent : si deja membre (meme apres acceptation precedente), renvoie success.
 */
export async function acceptInvitationForUser(
  token: string,
  userId: string,
  userEmail: string
): Promise<AcceptInvitationResult> {
  const normalizedEmail = userEmail.trim().toLowerCase()

  const invitation = await prisma.workspaceInvitation.findUnique({ where: { token } })
  if (!invitation) {
    return { success: false, reason: "not_found" }
  }

  if (invitation.email.toLowerCase() !== normalizedEmail) {
    return { success: false, reason: "email_mismatch" }
  }

  const existingMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
  })

  // Deja membre : succes meme si l'invitation est deja marquee acceptee (ex. inscription + login).
  if (existingMember) {
    if (invitation.status === "PENDING") {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      })
    }
    return {
      success: true,
      workspaceId: invitation.workspaceId,
      alreadyMember: true,
    }
  }

  if (invitation.status === "ACCEPTED") {
    return { success: false, reason: "already_used" }
  }

  if (invitation.status === "REVOKED") {
    return { success: false, reason: "revoked" }
  }

  if (invitation.status === "EXPIRED" || invitation.expiresAt < new Date()) {
    if (invitation.status === "PENDING") {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      })
    }
    return { success: false, reason: "expired" }
  }

  if (invitation.status !== "PENDING") {
    return { success: false, reason: "already_used" }
  }

  await prisma.workspaceMember.create({
    data: {
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role,
      treasuryAccess: invitation.treasuryAccess,
    },
  })

  await prisma.workspaceInvitation.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  })

  return {
    success: true,
    workspaceId: invitation.workspaceId,
    alreadyMember: false,
  }
}

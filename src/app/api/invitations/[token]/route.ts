import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/invitations/[token] - infos publiques d'une invitation (page d'atterrissage)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token },
      include: { workspace: { select: { name: true } } },
    })

    if (!invitation) {
      return NextResponse.json({ valid: false, error: "Invitation introuvable" }, { status: 404 })
    }

    const expired = invitation.expiresAt < new Date()
    const valid = invitation.status === "PENDING" && !expired

    // Un compte existe-t-il déjà pour cet email ? (oriente login vs signup côté UI)
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    })

    return NextResponse.json({
      valid,
      status: expired && invitation.status === "PENDING" ? "EXPIRED" : invitation.status,
      email: invitation.email,
      workspaceName: invitation.workspace.name,
      role: invitation.role,
      treasuryAccess: invitation.treasuryAccess,
      hasAccount: !!existingUser,
    })
  } catch (error) {
    console.error("Erreur GET invitation token:", error)
    return NextResponse.json({ valid: false, error: "Erreur serveur" }, { status: 500 })
  }
}

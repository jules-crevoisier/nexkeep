import { NextRequest, NextResponse } from "next/server"
import type { WorkspaceRole, TreasuryAccess } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireRoleIn, workspaceErrorResponse } from "@/lib/workspace"
import { newInvitationToken, invitationExpiry } from "@/lib/invitations"
import { sendInvitationEmail } from "@/lib/email"

const ROLES: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"]
const TREASURY: TreasuryAccess[] = ["NONE", "READ", "WRITE"]

// GET /api/workspaces/[id]/invitations - invitations en attente (ADMIN+)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await requireRoleIn(id, "ADMIN")
    const invitations = await prisma.workspaceInvitation.findMany({
      where: { workspaceId: id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(
      invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        treasuryAccess: i.treasuryAccess,
        expiresAt: i.expiresAt,
      }))
    )
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error("Erreur GET invitations:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/workspaces/[id]/invitations - inviter un email (ADMIN+)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const ctx = await requireRoleIn(id, "ADMIN")

    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const role: WorkspaceRole = ROLES.includes(body.role) ? body.role : "MEMBER"
    const treasuryAccess: TreasuryAccess = TREASURY.includes(body.treasuryAccess) ? body.treasuryAccess : "NONE"

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 })
    }
    if (role === "OWNER") {
      return NextResponse.json({ error: "On ne peut pas inviter directement un propriétaire" }, { status: 400 })
    }

    // Déjà membre ?
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      const alreadyMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId: existingUser.id } },
      })
      if (alreadyMember) {
        return NextResponse.json({ error: "Cette personne est déjà membre" }, { status: 400 })
      }
    }

    const token = newInvitationToken()
    const expiresAt = invitationExpiry()

    // Une seule invitation par (workspace, email) : on rafraîchit si elle existe.
    const invitation = await prisma.workspaceInvitation.upsert({
      where: { workspaceId_email: { workspaceId: id, email } },
      create: {
        workspaceId: id,
        email,
        role,
        treasuryAccess,
        token,
        expiresAt,
        invitedById: ctx.userId,
        status: "PENDING",
      },
      update: {
        role,
        treasuryAccess,
        token,
        expiresAt,
        invitedById: ctx.userId,
        status: "PENDING",
        acceptedAt: null,
      },
    })

    try {
      const inviter = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { email: true } })
      await sendInvitationEmail(email, ctx.workspace.name, token, inviter?.email)
    } catch (mailErr) {
      console.error("Envoi invitation échoué:", mailErr)
      // On n'échoue pas la requête : l'admin peut renvoyer / partager le lien.
    }

    return NextResponse.json(
      { id: invitation.id, email: invitation.email, role: invitation.role, treasuryAccess: invitation.treasuryAccess },
      { status: 201 }
    )
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error("Erreur POST invitation:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import type { WorkspaceRole, TreasuryAccess } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireMembershipIn, requireRoleIn, workspaceErrorResponse, WorkspaceAuthError } from "@/lib/workspace"

const ROLES: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"]
const TREASURY: TreasuryAccess[] = ["NONE", "READ", "WRITE"]

// PATCH /api/workspaces/[id]/members/[memberId] - modifier rôle / accès trésorerie / couleur (ADMIN+)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params
  try {
    const ctx = await requireRoleIn(id, "ADMIN")

    const target = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId: id },
    })
    if (!target) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 })
    }

    const body = await request.json()
    const data: { role?: WorkspaceRole; treasuryAccess?: TreasuryAccess; color?: string } = {}

    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) {
        return NextResponse.json({ error: "Rôle invalide" }, { status: 400 })
      }
      // Seul un OWNER peut nommer un autre OWNER.
      if (body.role === "OWNER" && ctx.role !== "OWNER") {
        return NextResponse.json({ error: "Seul un propriétaire peut nommer un propriétaire" }, { status: 403 })
      }
      // Empêcher de rétrograder le dernier OWNER.
      if (target.role === "OWNER" && body.role !== "OWNER") {
        const owners = await prisma.workspaceMember.count({ where: { workspaceId: id, role: "OWNER" } })
        if (owners <= 1) {
          return NextResponse.json({ error: "Impossible de rétrograder le dernier propriétaire" }, { status: 400 })
        }
      }
      data.role = body.role
    }

    if (body.treasuryAccess !== undefined) {
      if (!TREASURY.includes(body.treasuryAccess)) {
        return NextResponse.json({ error: "Accès trésorerie invalide" }, { status: 400 })
      }
      data.treasuryAccess = body.treasuryAccess
    }

    if (body.color !== undefined && typeof body.color === "string") {
      data.color = body.color
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data,
      include: { user: { select: { email: true } } },
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.displayName || updated.user?.email || "Membre",
      email: updated.user?.email || null,
      color: updated.color,
      role: updated.role,
      treasuryAccess: updated.treasuryAccess,
      hasAccount: !!updated.userId,
    })
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error("Erreur PATCH member:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE /api/workspaces/[id]/members/[memberId] - retirer un membre (ADMIN) ou quitter (soi-même)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params
  try {
    // Tout membre peut tenter (pour se retirer) ; on vérifie ensuite les droits.
    const ctx = await requireMembershipIn(id)

    const target = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId: id },
    })
    if (!target) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 })
    }

    const isSelf = target.id === ctx.membership.id
    // Sinon, il faut être ADMIN+.
    if (!isSelf && ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      throw new WorkspaceAuthError("FORBIDDEN")
    }

    // Empêcher le retrait du dernier OWNER.
    if (target.role === "OWNER") {
      const owners = await prisma.workspaceMember.count({ where: { workspaceId: id, role: "OWNER" } })
      if (owners <= 1) {
        return NextResponse.json({ error: "Impossible de retirer le dernier propriétaire" }, { status: 400 })
      }
    }

    await prisma.workspaceMember.delete({ where: { id: memberId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error("Erreur DELETE member:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createWorkspaceForUser } from "@/lib/workspace-create"

// GET /api/workspaces - mes organisations + invitations en attente
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    const email = session?.user?.email
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: { select: { id: true, name: true, _count: { select: { members: true } } } },
      },
      orderBy: { createdAt: "asc" },
    })

    const invitations = email
      ? await prisma.workspaceInvitation.findMany({
          where: { email, status: "PENDING", expiresAt: { gt: new Date() } },
          include: { workspace: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : []

    return NextResponse.json({
      workspaces: memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        role: m.role,
        treasuryAccess: m.treasuryAccess,
        orgaScope: m.orgaScope,
        canAccessInbox: m.canAccessInbox,
        memberCount: m.workspace._count.members,
      })),
      invitations: invitations.map((i) => ({
        token: i.token,
        workspaceId: i.workspaceId,
        workspaceName: i.workspace.name,
        role: i.role,
        treasuryAccess: i.treasuryAccess,
        expiresAt: i.expiresAt,
      })),
    })
  } catch (error) {
    console.error("Erreur GET workspaces:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/workspaces - créer une nouvelle organisation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { name, budgetInitial, cashInitial } = await request.json()
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 })
    }

    const workspace = await createWorkspaceForUser(userId, name, {
      budgetInitial: Math.max(0, Number(budgetInitial) || 0),
      cashInitial: Math.max(0, Number(cashInitial) || 0),
    })

    return NextResponse.json({ id: workspace.id, name: workspace.name }, { status: 201 })
  } catch (error) {
    console.error("Erreur POST workspace:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

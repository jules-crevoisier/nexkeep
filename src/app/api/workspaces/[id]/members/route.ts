import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireMembershipIn, workspaceErrorResponse } from "@/lib/workspace"

// GET /api/workspaces/[id]/members - membres de l'organisation (tout membre peut lire)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await requireMembershipIn(id)

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(
      members.map((m) => ({
        id: m.id,
        name: m.displayName || m.user?.email || "Membre",
        email: m.user?.email || null,
        color: m.color,
        role: m.role,
        treasuryAccess: m.treasuryAccess,
        hasAccount: !!m.userId,
      }))
    )
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error("Erreur GET workspace members:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

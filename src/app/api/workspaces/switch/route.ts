import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { WORKSPACE_COOKIE } from "@/lib/workspace"

// POST /api/workspaces/switch { workspaceId } - bascule l'organisation active (cookie httpOnly)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { workspaceId } = await request.json()
    if (!workspaceId || typeof workspaceId !== "string") {
      return NextResponse.json({ error: "workspaceId requis" }, { status: 400 })
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: "Organisation introuvable" }, { status: 403 })
    }

    const res = NextResponse.json({ ok: true, workspaceId })
    res.cookies.set(WORKSPACE_COOKIE, workspaceId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
    return res
  } catch (error) {
    console.error("Erreur switch workspace:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

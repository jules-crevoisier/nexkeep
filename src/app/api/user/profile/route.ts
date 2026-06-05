import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireWorkspace, workspaceErrorResponse } from "@/lib/workspace"

export async function GET() {
  try {
    const ctx = await requireWorkspace()

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, email: true, createdAt: true }
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // La trésorerie vit désormais sur l'organisation active.
    return NextResponse.json({
      ...user,
      budget: ctx.workspace.budget,
      budgetInitial: ctx.workspace.budgetInitial,
      cashInitial: ctx.workspace.cashInitial,
    })
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error("Profile fetch error:", error)
    return NextResponse.json({
      error: "Erreur interne du serveur"
    }, { status: 500 })
  }
}

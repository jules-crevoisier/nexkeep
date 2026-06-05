import { NextResponse } from "next/server"
import { requireWorkspace, workspaceErrorResponse } from "@/lib/workspace"

// GET /api/workspaces/active - organisation active + droits + trésorerie
export async function GET() {
  try {
    const ctx = await requireWorkspace()
    return NextResponse.json({
      id: ctx.workspace.id,
      name: ctx.workspace.name,
      role: ctx.role,
      treasuryAccess: ctx.treasuryAccess,
      orgaScope: ctx.membership.orgaScope,
      canAccessInbox: ctx.membership.canAccessInbox,
      budget: ctx.workspace.budget,
      budgetInitial: ctx.workspace.budgetInitial,
      cashInitial: ctx.workspace.cashInitial,
    })
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error("Erreur GET workspace active:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRoleIn, workspaceErrorResponse } from "@/lib/workspace"

// DELETE /api/workspaces/[id]/invitations/[invId] - révoquer une invitation (ADMIN+)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; invId: string }> }
) {
  const { id, invId } = await params
  try {
    await requireRoleIn(id, "ADMIN")
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { id: invId, workspaceId: id },
    })
    if (!invitation) {
      return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 })
    }
    await prisma.workspaceInvitation.update({
      where: { id: invId },
      data: { status: "REVOKED" },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error("Erreur DELETE invitation:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

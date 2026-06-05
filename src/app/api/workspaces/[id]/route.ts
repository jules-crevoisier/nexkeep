import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRoleIn, workspaceErrorResponse } from "@/lib/workspace"

// PATCH /api/workspaces/[id] - renommer l'organisation (ADMIN+)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await requireRoleIn(id, "ADMIN")

    const { name } = await request.json()
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 })
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: { name: name.trim() },
      select: { id: true, name: true },
    })
    return NextResponse.json(workspace)
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error("Erreur PATCH workspace:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE /api/workspaces/[id] - supprimer l'organisation et toutes ses données (OWNER)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await requireRoleIn(id, "OWNER")
    await prisma.workspace.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const res = workspaceErrorResponse(error)
    if (res) return res
    console.error("Erreur DELETE workspace:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

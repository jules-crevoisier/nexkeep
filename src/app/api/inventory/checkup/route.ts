import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireWorkspace, requireRole, workspaceErrorResponse } from "@/lib/workspace"
import { parseDate } from "@/lib/inventory"

// GET /api/inventory/checkup — date du dernier inventaire complet de l'organisation
export async function GET() {
  try {
    const ctx = await requireWorkspace()
    const ws = await prisma.workspace.findUnique({
      where: { id: ctx.workspace.id },
      select: { lastInventoryAt: true },
    })
    return NextResponse.json({ lastInventoryAt: ws?.lastInventoryAt ?? null })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// POST /api/inventory/checkup — enregistrer la date du dernier inventaire complet
// Body: { date?: string } — si absent, prend la date du jour.
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole("MEMBER")
    const body = await request.json().catch(() => ({}))
    const date = body?.date ? parseDate(body.date) : new Date()
    if (!date) {
      return NextResponse.json({ error: "Date invalide" }, { status: 400 })
    }
    await prisma.workspace.update({
      where: { id: ctx.workspace.id },
      data: { lastInventoryAt: date },
    })
    return NextResponse.json({ lastInventoryAt: date })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

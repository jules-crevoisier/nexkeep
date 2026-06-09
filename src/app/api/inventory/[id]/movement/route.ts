import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTreasury, workspaceErrorResponse } from "@/lib/workspace"
import { ACTIVITY_TYPES, recordActivity } from "@/lib/activity"

const trimOrNull = (v: unknown, max = 500): string | null => {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

// POST /api/inventory/[id]/movement — entrée, sortie ou ajustement de stock
// Body: { type: "in" | "out" | "adjust", quantity: number, reason?, note? }
// Pour "in"/"out" : quantity = quantité du mouvement. Pour "adjust" : quantity = nouveau total.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const ctx = await requireTreasury("WRITE")
    const item = await prisma.inventoryItem.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
    })
    if (!item) return NextResponse.json({ error: "Article non trouvé" }, { status: 404 })

    const body = await request.json()
    const type = body.type
    if (!["in", "out", "adjust"].includes(type)) {
      return NextResponse.json({ error: "Type de mouvement invalide" }, { status: 400 })
    }

    const value = Number(body.quantity)
    if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000) {
      return NextResponse.json({ error: "Quantité invalide" }, { status: 400 })
    }

    let newQuantity: number
    let movementQty: number
    if (type === "in") {
      movementQty = value
      newQuantity = item.quantity + value
    } else if (type === "out") {
      if (value > item.quantity) {
        return NextResponse.json({ error: "Stock insuffisant pour cette sortie" }, { status: 400 })
      }
      movementQty = value
      newQuantity = item.quantity - value
    } else {
      // ajustement d'inventaire : value = nouveau total constaté
      movementQty = Math.abs(value - item.quantity)
      newQuantity = value
    }

    // Transaction atomique : mouvement + mise à jour du stock
    const [, updated] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          type,
          quantity: movementQty,
          reason: trimOrNull(body.reason, 200),
          note: trimOrNull(body.note, 1000),
          itemId: id,
          workspaceId: ctx.workspace.id,
          userId: ctx.userId,
        },
      }),
      prisma.inventoryItem.update({
        where: { id },
        data: { quantity: newQuantity },
      }),
    ])

    await recordActivity({
      workspaceId: ctx.workspace.id,
      type: ACTIVITY_TYPES.INVENTORY_MOVEMENT,
      title: `Inventaire — ${item.name}`,
      description:
        type === "in"
          ? `Entrée de ${movementQty} ${item.unit}`
          : type === "out"
          ? `Sortie de ${movementQty} ${item.unit}`
          : `Ajustement → ${newQuantity} ${item.unit}`,
      actorId: ctx.userId,
      metadata: { itemId: id, type, movementQty, newQuantity },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

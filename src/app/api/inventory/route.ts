import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireWorkspace, requireRole, workspaceErrorResponse } from "@/lib/workspace"
import { ACTIVITY_TYPES, recordActivity } from "@/lib/activity"

// Champs texte bornés pour éviter les abus / payloads géants
const trimOrNull = (v: unknown, max = 500): string | null => {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

const CONDITIONS = ["new", "good", "worn", "broken"]

// GET /api/inventory — liste de l'inventaire de l'organisation active
export async function GET() {
  try {
    const ctx = await requireWorkspace()
    const items = await prisma.inventoryItem.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    })
    return NextResponse.json(items)
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// POST /api/inventory — créer un article d'inventaire
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole("MEMBER")
    const body = await request.json()

    const name = trimOrNull(body.name, 200)
    if (!name) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 })
    }

    const quantity = Number(body.quantity)
    if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1_000_000_000) {
      return NextResponse.json({ error: "Quantité invalide" }, { status: 400 })
    }

    const minQuantity = body.minQuantity === "" || body.minQuantity == null ? null : Number(body.minQuantity)
    if (minQuantity !== null && (!Number.isFinite(minQuantity) || minQuantity < 0)) {
      return NextResponse.json({ error: "Seuil d'alerte invalide" }, { status: 400 })
    }

    const unitValue = body.unitValue === "" || body.unitValue == null ? null : Number(body.unitValue)
    if (unitValue !== null && (!Number.isFinite(unitValue) || unitValue < 0)) {
      return NextResponse.json({ error: "Valeur unitaire invalide" }, { status: 400 })
    }

    const condition = CONDITIONS.includes(body.condition) ? body.condition : null

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        description: trimOrNull(body.description, 2000),
        category: trimOrNull(body.category, 100),
        reference: trimOrNull(body.reference, 100),
        quantity,
        unit: trimOrNull(body.unit, 30) ?? "unité",
        minQuantity,
        unitValue,
        location: trimOrNull(body.location, 200),
        condition,
        photoUrl: trimOrNull(body.photoUrl, 1000),
        workspaceId: ctx.workspace.id,
        userId: ctx.userId,
      },
    })

    // Mouvement d'entrée initial (traçabilité) si stock de départ
    if (quantity > 0) {
      await prisma.inventoryMovement.create({
        data: {
          type: "in",
          quantity,
          reason: "Stock initial",
          itemId: item.id,
          workspaceId: ctx.workspace.id,
          userId: ctx.userId,
        },
      })
    }

    await recordActivity({
      workspaceId: ctx.workspace.id,
      type: ACTIVITY_TYPES.INVENTORY_ITEM_CREATED,
      title: `Inventaire — ${name}`,
      description: `${quantity} ${item.unit} ajouté(s) au stock`,
      actorId: ctx.userId,
      metadata: { itemId: item.id },
    })

    return NextResponse.json(item)
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

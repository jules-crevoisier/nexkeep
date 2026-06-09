import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireWorkspace, requireRole, workspaceErrorResponse } from "@/lib/workspace"
import { canAdminWorkspace } from "@/lib/permissions"
import { ACTIVITY_TYPES, recordActivity } from "@/lib/activity"
import { trimOrNull, parseDate, INVENTORY_CONDITIONS } from "@/lib/inventory"

const CONDITIONS = INVENTORY_CONDITIONS as readonly string[]

// Un membre ne peut modifier/supprimer qu'un article qu'il a lui-même créé ;
// les administrateurs (et plus) peuvent gérer tous les articles.
function canManageItem(
  ctx: { role: string; userId: string },
  item: { userId: string | null }
): boolean {
  return canAdminWorkspace(ctx.role as "VIEWER" | "MEMBER" | "ADMIN" | "OWNER") || item.userId === ctx.userId
}

// GET /api/inventory/[id] — détail + historique des mouvements
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const ctx = await requireWorkspace()
    const item = await prisma.inventoryItem.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
      include: { movements: { orderBy: { createdAt: "desc" }, take: 100 } },
    })
    if (!item) return NextResponse.json({ error: "Article non trouvé" }, { status: 404 })
    return NextResponse.json(item)
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// PATCH /api/inventory/[id] — modifier les champs descriptifs (pas la quantité : voir /movement)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const ctx = await requireRole("MEMBER")
    const existing = await prisma.inventoryItem.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
    })
    if (!existing) return NextResponse.json({ error: "Article non trouvé" }, { status: 404 })
    if (!canManageItem(ctx, existing)) {
      return NextResponse.json(
        { error: "Vous ne pouvez modifier que les articles que vous avez ajoutés." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data: Record<string, unknown> = {}

    if (body.name !== undefined) {
      const name = trimOrNull(body.name, 200)
      if (!name) return NextResponse.json({ error: "Le nom est requis" }, { status: 400 })
      data.name = name
    }
    if (body.description !== undefined) data.description = trimOrNull(body.description, 2000)
    if (body.category !== undefined) data.category = trimOrNull(body.category, 100)
    if (body.reference !== undefined) data.reference = trimOrNull(body.reference, 100)
    if (body.unit !== undefined) data.unit = trimOrNull(body.unit, 30) ?? "unité"
    if (body.location !== undefined) data.location = trimOrNull(body.location, 200)
    if (body.photoUrl !== undefined) data.photoUrl = trimOrNull(body.photoUrl, 1000)
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
    if (body.condition !== undefined) {
      data.condition = CONDITIONS.includes(body.condition) ? body.condition : null
    }
    if (body.expiryDate !== undefined) {
      data.expiryDate = parseDate(body.expiryDate)
    }
    if (body.minQuantity !== undefined) {
      const m = body.minQuantity === "" || body.minQuantity == null ? null : Number(body.minQuantity)
      if (m !== null && (!Number.isFinite(m) || m < 0)) {
        return NextResponse.json({ error: "Seuil d'alerte invalide" }, { status: 400 })
      }
      data.minQuantity = m
    }
    if (body.unitValue !== undefined) {
      const u = body.unitValue === "" || body.unitValue == null ? null : Number(body.unitValue)
      if (u !== null && (!Number.isFinite(u) || u < 0)) {
        return NextResponse.json({ error: "Valeur unitaire invalide" }, { status: 400 })
      }
      data.unitValue = u
    }

    // Quantité : modifiable depuis le formulaire (pratique pour l'inventaire).
    // Tout écart avec le stock actuel est tracé comme un ajustement.
    let adjust: { qty: number; newQty: number } | null = null
    if (body.quantity !== undefined) {
      const q = Number(body.quantity)
      if (!Number.isFinite(q) || q < 0 || q > 1_000_000_000) {
        return NextResponse.json({ error: "Quantité invalide" }, { status: 400 })
      }
      if (q !== existing.quantity) {
        data.quantity = q
        adjust = { qty: Math.abs(q - existing.quantity), newQty: q }
      }
    }

    const item = adjust
      ? await prisma.$transaction(async (tx) => {
          await tx.inventoryMovement.create({
            data: {
              type: "adjust",
              quantity: adjust.qty,
              reason: "Ajustement (modification de l'article)",
              itemId: id,
              workspaceId: ctx.workspace.id,
              userId: ctx.userId,
            },
          })
          return tx.inventoryItem.update({ where: { id }, data })
        })
      : await prisma.inventoryItem.update({ where: { id }, data })

    if (adjust) {
      await recordActivity({
        workspaceId: ctx.workspace.id,
        type: ACTIVITY_TYPES.INVENTORY_MOVEMENT,
        title: `Inventaire — ${item.name}`,
        description: `Ajustement → ${adjust.newQty} ${item.unit}`,
        actorId: ctx.userId,
        metadata: { itemId: id, type: "adjust", newQuantity: adjust.newQty },
      })
    }

    return NextResponse.json(item)
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// DELETE /api/inventory/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const ctx = await requireRole("MEMBER")
    const existing = await prisma.inventoryItem.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
    })
    if (!existing) return NextResponse.json({ error: "Article non trouvé" }, { status: 404 })
    if (!canManageItem(ctx, existing)) {
      return NextResponse.json(
        { error: "Vous ne pouvez supprimer que les articles que vous avez ajoutés." },
        { status: 403 }
      )
    }

    await prisma.inventoryItem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

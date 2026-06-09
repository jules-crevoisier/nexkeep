import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole, workspaceErrorResponse } from "@/lib/workspace"
import { ACTIVITY_TYPES, recordActivity } from "@/lib/activity"
import { trimOrNull, parseDate } from "@/lib/inventory"

const MAX_IMPORT = 2000

// POST /api/inventory/import — import en masse depuis un fichier Excel
// Body: { items: Array<{ name, category?, description?, quantity?, unit?, expiryDate?, location?, reference? }> }
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole("MEMBER")
    const body = await request.json()
    const rawItems = Array.isArray(body?.items) ? body.items : null

    if (!rawItems) {
      return NextResponse.json({ error: "Format invalide" }, { status: 400 })
    }
    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Aucune ligne à importer" }, { status: 400 })
    }
    if (rawItems.length > MAX_IMPORT) {
      return NextResponse.json(
        { error: `Trop de lignes (max ${MAX_IMPORT})` },
        { status: 400 }
      )
    }

    // Normalisation + validation côté serveur (on ignore les lignes sans nom)
    const prepared = rawItems
      .map((r: Record<string, unknown>) => {
        const name = trimOrNull(r.name, 200)
        if (!name) return null
        const qty = Number(r.quantity)
        const quantity = Number.isFinite(qty) && qty >= 0 && qty <= 1_000_000_000 ? qty : 0
        return {
          name,
          category: trimOrNull(r.category, 100),
          reference: trimOrNull(r.reference, 100),
          description: trimOrNull(r.description, 2000),
          quantity,
          unit: trimOrNull(r.unit, 30) ?? "unité",
          location: trimOrNull(r.location, 200),
          expiryDate: parseDate(r.expiryDate),
          workspaceId: ctx.workspace.id,
          userId: ctx.userId,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    if (prepared.length === 0) {
      return NextResponse.json(
        { error: "Aucune ligne valide (colonne « Nom de l'article » manquante ?)" },
        { status: 400 }
      )
    }

    // Création en une transaction : articles + mouvement d'entrée initial
    const created = await prisma.$transaction(async (tx) => {
      const items = []
      for (const data of prepared) {
        const item = await tx.inventoryItem.create({ data })
        if (item.quantity > 0) {
          await tx.inventoryMovement.create({
            data: {
              type: "in",
              quantity: item.quantity,
              reason: "Import Excel",
              itemId: item.id,
              workspaceId: ctx.workspace.id,
              userId: ctx.userId,
            },
          })
        }
        items.push(item)
      }
      return items
    })

    await recordActivity({
      workspaceId: ctx.workspace.id,
      type: ACTIVITY_TYPES.INVENTORY_ITEM_CREATED,
      title: "Import d'inventaire",
      description: `${created.length} article(s) importé(s) depuis un fichier Excel`,
      actorId: ctx.userId,
      metadata: { count: created.length },
    })

    return NextResponse.json({ imported: created.length })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

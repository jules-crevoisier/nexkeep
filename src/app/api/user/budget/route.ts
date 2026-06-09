import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTreasury, WorkspaceAuthError, workspaceErrorResponse } from "@/lib/workspace"
import { ACTIVITY_TYPES, recordActivity } from "@/lib/activity"

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTreasury("READ")

    const workspace = await prisma.workspace.findUnique({
      where: { id: ctx.workspace.id },
      select: { budget: true, budgetInitial: true, cashInitial: true }
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    return NextResponse.json({
      budget: workspace.budget,
      budgetInitial: workspace.budgetInitial,
      cashInitial: workspace.cashInitial
    })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireTreasury("WRITE")

    // Paramètre critique : la modification des soldes de départ recalcule
    // l'ensemble de la trésorerie. Réservé aux administrateurs / propriétaires.
    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      throw new WorkspaceAuthError("FORBIDDEN")
    }

    const { budgetInitial, cashInitial } = await request.json()

    const data: { budgetInitial?: number; cashInitial?: number } = {}

    if (budgetInitial !== undefined) {
      if (typeof budgetInitial !== 'number' || isNaN(budgetInitial)) {
        return NextResponse.json({ error: "Budget invalide" }, { status: 400 })
      }
      if (budgetInitial < 0) {
        return NextResponse.json({ error: "Le budget ne peut pas être négatif" }, { status: 400 })
      }
      if (budgetInitial > 1_000_000_000) {
        return NextResponse.json({ error: "Montant hors limites" }, { status: 400 })
      }
      data.budgetInitial = budgetInitial
    }

    if (cashInitial !== undefined) {
      if (typeof cashInitial !== 'number' || isNaN(cashInitial)) {
        return NextResponse.json({ error: "Solde liquide invalide" }, { status: 400 })
      }
      if (cashInitial < 0) {
        return NextResponse.json({ error: "Le solde liquide ne peut pas être négatif" }, { status: 400 })
      }
      if (cashInitial > 1_000_000_000) {
        return NextResponse.json({ error: "Montant hors limites" }, { status: 400 })
      }
      data.cashInitial = cashInitial
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Aucune valeur à mettre à jour" }, { status: 400 })
    }

    // Valeurs précédentes (pour la piste d'audit)
    const previous = await prisma.workspace.findUnique({
      where: { id: ctx.workspace.id },
      select: { budgetInitial: true, cashInitial: true }
    })

    // Mettre à jour le(s) solde(s) initial(aux) de l'organisation
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: ctx.workspace.id },
      data,
      select: {
        id: true,
        budgetInitial: true,
        cashInitial: true,
        budget: true
      }
    })

    // Journaliser ce changement sensible (qui, quoi, ancienne → nouvelle valeur)
    await recordActivity({
      workspaceId: ctx.workspace.id,
      type: ACTIVITY_TYPES.INITIAL_BALANCE_UPDATED,
      title: "Soldes de départ modifiés",
      description: [
        data.budgetInitial !== undefined
          ? `Banque : ${previous?.budgetInitial?.toFixed(2) ?? "?"} € → ${updatedWorkspace.budgetInitial.toFixed(2)} €`
          : null,
        data.cashInitial !== undefined
          ? `Liquide : ${previous?.cashInitial?.toFixed(2) ?? "?"} € → ${updatedWorkspace.cashInitial.toFixed(2)} €`
          : null,
      ].filter(Boolean).join(" · "),
      actorId: ctx.userId,
      metadata: { previous, next: data },
    })

    return NextResponse.json({
      message: "Budget initial mis à jour avec succès",
      user: updatedWorkspace
    })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

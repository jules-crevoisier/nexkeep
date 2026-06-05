import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTreasury, workspaceErrorResponse } from "@/lib/workspace"

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

    const { budgetInitial, cashInitial } = await request.json()

    const data: { budgetInitial?: number; cashInitial?: number } = {}

    if (budgetInitial !== undefined) {
      if (typeof budgetInitial !== 'number' || isNaN(budgetInitial)) {
        return NextResponse.json({ error: "Budget invalide" }, { status: 400 })
      }
      if (budgetInitial < 0) {
        return NextResponse.json({ error: "Le budget ne peut pas être négatif" }, { status: 400 })
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
      data.cashInitial = cashInitial
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Aucune valeur à mettre à jour" }, { status: 400 })
    }

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

    return NextResponse.json({
      message: "Budget initial mis à jour avec succès",
      user: updatedWorkspace
    })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

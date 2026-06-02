import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { budget: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ budget: user.budget })
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
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

    // Mettre à jour le(s) solde(s) initial(aux) de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
        budgetInitial: true,
        cashInitial: true,
        budget: true,
        email: true
      }
    })

    return NextResponse.json({ 
      message: "Budget initial mis à jour avec succès",
      user: updatedUser 
    })
  } catch (error) {
    console.error("Erreur lors de la mise à jour du budget:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
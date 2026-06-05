import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ACTIVITY_TYPES, recordActivity } from "@/lib/activity"
import { requireTreasury, workspaceErrorResponse } from "@/lib/workspace"

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTreasury("READ")

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: {
      workspaceId: string;
      type?: string;
      date?: {
        gte: Date;
        lte: Date;
      };
    } = {
      workspaceId: ctx.workspace.id
    }

    if (type && type !== "all") {
      where.type = type
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" }
    })

    return NextResponse.json(transactions)
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireTreasury("WRITE")

    const { name, amount, type, description, category, account } = await request.json()

    if (!name || !amount || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const accountValue = account === "cash" ? "cash" : "bank"
    const parsedAmount = parseFloat(amount)

    // Récupérer le nom de la catégorie si un ID est fourni
    let categoryName = category;
    if (category && category !== "") {
      const categoryData = await prisma.category.findUnique({
        where: { id: category }
      });
      if (categoryData) {
        categoryName = categoryData.name;
      }
    }

    // Créer la transaction
    const transaction = await prisma.transaction.create({
      data: {
        name,
        amount: parsedAmount,
        type,
        account: accountValue,
        description,
        category: categoryName,
        workspaceId: ctx.workspace.id,
        userId: ctx.userId
      }
    })

    // Mettre à jour le budget de l'organisation (atomique)
    const updated = await prisma.workspace.update({
      where: { id: ctx.workspace.id },
      data: {
        budget: type === "income"
          ? { increment: parsedAmount }
          : { decrement: parsedAmount }
      },
      select: { budget: true }
    })

    await recordActivity({
      workspaceId: ctx.workspace.id,
      type: ACTIVITY_TYPES.TRANSACTION_CREATED,
      title: type === 'income' ? `Revenu — ${name}` : `Dépense — ${name}`,
      description: `${parsedAmount.toFixed(2)} €`,
      actorId: ctx.userId,
      metadata: { transactionId: transaction.id, type, amount: parsedAmount },
    })

    return NextResponse.json({
      ...transaction,
      newBudget: updated.budget
    })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

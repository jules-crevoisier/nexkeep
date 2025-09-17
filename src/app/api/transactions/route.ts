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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: {
      userId: string;
      type?: string;
      date?: {
        gte: Date;
        lte: Date;
      };
    } = {
      userId: session.user.id
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, amount, type, description, category } = await request.json()

    if (!name || !amount || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

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
        amount: parseFloat(amount),
        type,
        description,
        category: categoryName,
        userId: session.user.id
      }
    })

    // Mettre à jour le budget de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user) {
      const newBudget = type === "income" 
        ? user.budget + parseFloat(amount)
        : user.budget - parseFloat(amount)

      await prisma.user.update({
        where: { id: session.user.id },
        data: { budget: newBudget }
      })

      // Retourner la transaction avec le nouveau budget
      return NextResponse.json({
        ...transaction,
        newBudget
      })
    }

    return NextResponse.json(transaction)
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

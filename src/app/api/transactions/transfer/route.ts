import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseAndValidateAmount } from "@/lib/api-utils"

// POST - Transférer un montant entre la banque et la caisse (liquide)
// Crée une paire de transactions (sortie sur la source, entrée sur la destination)
// avec la catégorie "Transfert" → net global nul, le solde se déplace d'un compte à l'autre.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    let body: { amount?: unknown; from?: string; notes?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Données JSON invalides" }, { status: 400 })
    }

    const { amount, from, notes } = body

    const amountValidation = parseAndValidateAmount(amount as string | number ?? "")
    if (!amountValidation.valid) {
      return NextResponse.json(
        { error: amountValidation.error ?? "Montant invalide" },
        { status: 400 }
      )
    }
    const value = amountValidation.amount!

    if (from !== "bank" && from !== "cash") {
      return NextResponse.json(
        { error: "Sens du transfert invalide" },
        { status: 400 }
      )
    }
    const to = from === "bank" ? "cash" : "bank"

    const fromLabel = from === "bank" ? "Banque" : "Liquide"
    const toLabel = to === "bank" ? "Banque" : "Liquide"
    const description = notes?.trim() || `Transfert ${fromLabel} → ${toLabel}`

    const result = await prisma.$transaction(async (tx) => {
      const out = await tx.transaction.create({
        data: {
          name: `Transfert vers ${toLabel}`,
          amount: value,
          type: "expense",
          account: from,
          category: "Transfert",
          description,
          userId: session.user.id,
        },
      })

      const incoming = await tx.transaction.create({
        data: {
          name: `Transfert depuis ${fromLabel}`,
          amount: value,
          type: "income",
          account: to,
          category: "Transfert",
          description,
          userId: session.user.id,
        },
      })

      return { out, incoming }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Erreur lors du transfert:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

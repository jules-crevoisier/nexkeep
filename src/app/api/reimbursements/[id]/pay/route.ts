import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseAndValidateAmount } from '@/lib/api-utils'
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace'

// POST - Enregistrer un remboursement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("WRITE")

    let body: { amount?: string | number; method?: string; transferDate?: string; reference?: string; notes?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Données JSON invalides' }, { status: 400 })
    }
    const { amount, method, transferDate, reference, notes } = body

    const amountValidation = parseAndValidateAmount(amount ?? '')
    if (!amountValidation.valid) {
      return NextResponse.json(
        { error: amountValidation.error ?? 'Le montant doit être un nombre valide supérieur à 0' },
        { status: 400 }
      )
    }
    const parsedAmount = amountValidation.amount!

    // Vérifier que la demande existe et appartient à l'organisation
    const reimbursementRequest = await prisma.reimbursementRequest.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
      }
    })

    if (!reimbursementRequest) {
      return NextResponse.json(
        { error: 'Demande non trouvée' },
        { status: 404 }
      )
    }

    if (!method?.trim()) {
      return NextResponse.json(
        { error: 'La méthode de paiement est requise' },
        { status: 400 }
      )
    }

    // Créer le remboursement et mettre à jour le statut de la demande
    const result = await prisma.$transaction(async (tx) => {
      const reimbursement = await tx.reimbursement.create({
        data: {
          amount: parsedAmount,
          method: method.trim(),
          transferDate: transferDate ? new Date(transferDate) : null,
          reference,
          notes,
          requestId: id,
          workspaceId: ctx.workspace.id,
          userId: ctx.userId
        }
      })

      // Mettre à jour le statut de la demande
      await tx.reimbursementRequest.update({
        where: { id: id },
        data: { status: 'paid' }
      })

      await tx.transaction.create({
        data: {
          name: `Remboursement - ${reimbursementRequest.requesterName}`,
          amount: -parsedAmount,
          type: 'expense',
          description: `Remboursement pour: ${reimbursementRequest.description}`,
          category: 'Remboursements',
          workspaceId: ctx.workspace.id,
          userId: ctx.userId
        }
      })

      return reimbursement
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

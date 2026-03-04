import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseAndValidateAmount } from '@/lib/api-utils'

// POST - Enregistrer un remboursement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    let body: { amount?: unknown; method?: string; transferDate?: string; reference?: string; notes?: string }
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

    // Vérifier que la demande existe et appartient à l'utilisateur
    const reimbursementRequest = await prisma.reimbursementRequest.findFirst({
      where: {
        id: id,
        userId: session.user.id
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
          userId: session.user.id
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
          userId: session.user.id
        }
      })

      return reimbursement
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du remboursement:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

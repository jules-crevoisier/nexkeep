import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Enregistrer un remboursement
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, method, transferDate, reference, notes } = body

    // Vérifier que la demande existe et appartient à l'utilisateur
    const reimbursementRequest = await prisma.reimbursementRequest.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!reimbursementRequest) {
      return NextResponse.json(
        { error: 'Demande non trouvée' },
        { status: 404 }
      )
    }

    // Validation des données
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Le montant doit être positif' },
        { status: 400 }
      )
    }

    if (!method) {
      return NextResponse.json(
        { error: 'La méthode de paiement est requise' },
        { status: 400 }
      )
    }

    // Créer le remboursement et mettre à jour le statut de la demande
    const result = await prisma.$transaction(async (tx) => {
      // Créer le remboursement
      const reimbursement = await tx.reimbursement.create({
        data: {
          amount,
          method,
          transferDate: transferDate ? new Date(transferDate) : null,
          reference,
          notes,
          requestId: params.id,
          userId: session.user.id
        }
      })

      // Mettre à jour le statut de la demande
      await tx.reimbursementRequest.update({
        where: { id: params.id },
        data: { status: 'paid' }
      })

      // Créer une transaction de dépense pour le remboursement
      await tx.transaction.create({
        data: {
          name: `Remboursement - ${reimbursementRequest.requesterName}`,
          amount: -amount, // Montant négatif pour une dépense
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

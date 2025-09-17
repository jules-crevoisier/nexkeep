import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Récupérer une demande de remboursement spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const request_data = await prisma.reimbursementRequest.findFirst({
      where: {
        id: id,
        userId: session.user.id
      },
      include: {
        reimbursements: true
      }
    })

    if (!request_data) {
      return NextResponse.json(
        { error: 'Demande non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(request_data)
  } catch (error) {
    console.error('Erreur lors de la récupération de la demande:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour une demande de remboursement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { requesterName, requesterEmail, amount, description, status, receiptUrl, ribUrl, notes } = body

    // Vérifier que la demande existe et appartient à l'utilisateur
    const existingRequest = await prisma.reimbursementRequest.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Demande non trouvée' },
        { status: 404 }
      )
    }

    // Validation des données
    if (amount && amount <= 0) {
      return NextResponse.json(
        { error: 'Le montant doit être positif' },
        { status: 400 }
      )
    }

    const updatedRequest = await prisma.reimbursementRequest.update({
      where: { id: id },
      data: {
        ...(requesterName && { requesterName }),
        ...(requesterEmail !== undefined && { requesterEmail }),
        ...(amount && { amount }),
        ...(description && { description }),
        ...(status && { status }),
        ...(receiptUrl !== undefined && { receiptUrl }),
        ...(ribUrl !== undefined && { ribUrl }),
        ...(notes !== undefined && { notes })
      },
      include: {
        reimbursements: true
      }
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la demande:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une demande de remboursement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que la demande existe et appartient à l'utilisateur
    const existingRequest = await prisma.reimbursementRequest.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Demande non trouvée' },
        { status: 404 }
      )
    }

    await prisma.reimbursementRequest.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'Demande supprimée avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression de la demande:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

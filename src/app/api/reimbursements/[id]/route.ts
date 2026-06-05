import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace'

// GET - Récupérer une demande de remboursement spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("READ")

    const request_data = await prisma.reimbursementRequest.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
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
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// PUT - Mettre à jour une demande de remboursement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("WRITE")

    const body = await request.json()
    const { requesterName, requesterEmail, amount, description, status, receiptUrl, ribUrl, notes } = body

    // Vérifier que la demande existe et appartient à l'organisation
    const existingRequest = await prisma.reimbursementRequest.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
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
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// DELETE - Supprimer une demande de remboursement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("WRITE")

    // Vérifier que la demande existe et appartient à l'organisation
    const existingRequest = await prisma.reimbursementRequest.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
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
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

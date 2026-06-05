import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace'

// GET - Récupérer toutes les demandes de remboursement de l'organisation
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTreasury("READ")

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where = {
      workspaceId: ctx.workspace.id, // Seulement les demandes de l'organisation active
      ...(status && { status })
    }

    const [requests, total] = await Promise.all([
      prisma.reimbursementRequest.findMany({
        where,
        include: {
          reimbursements: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.reimbursementRequest.count({ where })
    ])

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// POST - Créer une nouvelle demande de remboursement
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireTreasury("WRITE")

    let body: { requesterName?: string; requesterEmail?: string; amount?: unknown; description?: string; receiptUrl?: string; ribUrl?: string; notes?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Données JSON invalides' }, { status: 400 })
    }
    const { requesterName, requesterEmail, amount, description, receiptUrl, ribUrl, notes } = body

    // Validation des données
    if (!requesterName?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: 'Nom et description sont requis' },
        { status: 400 }
      )
    }

    const parsedAmount = typeof amount === 'string' ? parseFloat(amount.replace(',', '.')) : Number(amount)
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Le montant doit être un nombre valide supérieur à 0' },
        { status: 400 }
      )
    }

    const reimbursementRequest = await prisma.reimbursementRequest.create({
      data: {
        requesterName: requesterName.trim(),
        requesterEmail: requesterEmail?.trim() || null,
        amount: parsedAmount,
        description: description.trim(),
        receiptUrl: receiptUrl || null,
        ribUrl: ribUrl || null,
        notes: notes?.trim() || null,
        workspaceId: ctx.workspace.id,
        userId: ctx.userId
      }
    })

    return NextResponse.json(reimbursementRequest, { status: 201 })
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

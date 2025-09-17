import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Récupérer toutes les demandes de remboursement de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where = {
      userId: session.user.id, // Seulement les demandes de l'utilisateur connecté
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
    console.error('Erreur lors de la récupération des demandes:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle demande de remboursement
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { requesterName, requesterEmail, amount, description, receiptUrl, ribUrl, notes } = body

    // Validation des données
    if (!requesterName || !amount || !description) {
      return NextResponse.json(
        { error: 'Nom, montant et description sont requis' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Le montant doit être positif' },
        { status: 400 }
      )
    }

    const reimbursementRequest = await prisma.reimbursementRequest.create({
      data: {
        requesterName,
        requesterEmail,
        amount,
        description,
        receiptUrl,
        ribUrl,
        notes,
        userId: session.user.id
      }
    })

    return NextResponse.json(reimbursementRequest, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de la demande:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

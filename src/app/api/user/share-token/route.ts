import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// GET - Récupérer ou créer le token de partage
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { shareToken: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Si l'utilisateur n'a pas de token, en créer un
    if (!user.shareToken) {
      const token = randomBytes(32).toString('hex')
      
      await prisma.user.update({
        where: { id: session.user.id },
        data: { shareToken: token }
      })

      return NextResponse.json({
        token,
        shareUrl: `${process.env.NEXTAUTH_URL}/request-reimbursement/${token}`
      })
    }

    return NextResponse.json({
      token: user.shareToken,
      shareUrl: `${process.env.NEXTAUTH_URL}/request-reimbursement/${user.shareToken}`
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du token:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Régénérer le token de partage
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = randomBytes(32).toString('hex')
    
    await prisma.user.update({
      where: { id: session.user.id },
      data: { shareToken: token }
    })

    return NextResponse.json({
      token,
      shareUrl: `${process.env.NEXTAUTH_URL}/request-reimbursement/${token}`,
      message: 'Token régénéré avec succès'
    })
  } catch (error) {
    console.error('Erreur lors de la régénération du token:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

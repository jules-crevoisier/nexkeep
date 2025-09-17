import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Vérifier qu'un token est valide
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token manquant' },
        { status: 400 }
      )
    }

    // Trouver l'utilisateur par son token de partage
    const user = await prisma.user.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        email: true,
        budget: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 404 }
      )
    }

    // Retourner les informations de l'utilisateur (sans données sensibles)
    return NextResponse.json({
      user: {
        name: user.email.split('@')[0], // Utiliser la partie avant @ comme nom
        email: user.email
      },
      valid: true
    })
  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

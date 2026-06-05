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

    // Trouver l'organisation par son token de partage
    const workspace = await prisma.workspace.findUnique({
      where: { shareToken: token },
      select: { id: true, name: true }
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 404 }
      )
    }

    // Retourner les informations publiques (sans données sensibles)
    return NextResponse.json({
      userName: workspace.name,
      user: { name: workspace.name },
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

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReimbursementConfirmation, sendAdminNotification } from '@/lib/email'

// POST - Créer une nouvelle demande de remboursement (publique)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requesterName, requesterEmail, amount, description, receiptUrl, ribUrl, notes, token } = body

    // Validation des données
    if (!requesterName || !requesterEmail || !amount || !description) {
      return NextResponse.json(
        { error: 'Nom, email, montant et description sont requis' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Le montant doit être positif' },
        { status: 400 }
      )
    }

    // Validation email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(requesterEmail)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      )
    }

    // Vérifier le token de partage
    if (!token) {
      return NextResponse.json(
        { error: 'Token de partage manquant' },
        { status: 400 }
      )
    }

    // Trouver l'utilisateur par son token de partage
    const user = await prisma.user.findUnique({
      where: { shareToken: token }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Token de partage invalide ou expiré' },
        { status: 404 }
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
        userId: user.id, // Lié à l'utilisateur qui a partagé le formulaire
        isPublicRequest: true, // Marquer comme demande publique
        status: 'pending'
      }
    })

    // Envoyer les emails de notification
    try {
      await Promise.all([
        sendReimbursementConfirmation(requesterEmail, requesterName, reimbursementRequest.id),
        sendAdminNotification(requesterName, requesterEmail, amount, description, reimbursementRequest.id, user.email)
      ])
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi des emails:', emailError)
      // On continue même si l'email échoue
    }

    return NextResponse.json({
      success: true,
      requestId: reimbursementRequest.id,
      message: 'Demande créée avec succès'
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de la demande publique:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

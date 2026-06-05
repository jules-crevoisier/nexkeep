import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReimbursementConfirmation, sendAdminNotification } from '@/lib/email'

// POST - Créer une nouvelle demande de remboursement (publique)
export async function POST(request: NextRequest) {
  try {
    let body: { requesterName?: string; requesterEmail?: string; amount?: unknown; description?: string; receiptUrl?: string; ribUrl?: string; notes?: string; token?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Données JSON invalides' }, { status: 400 })
    }
    const { requesterName, requesterEmail, amount, description, receiptUrl, ribUrl, notes, token } = body

    // Validation des données
    if (!requesterName?.trim() || !requesterEmail?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: 'Nom, email et description sont requis' },
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

    // Trouver l'organisation par son token de partage
    const workspace = await prisma.workspace.findUnique({
      where: { shareToken: token },
      include: {
        members: {
          where: { role: 'OWNER', userId: { not: null } },
          include: { user: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Token de partage invalide ou expiré' },
        { status: 404 }
      )
    }

    const owner = workspace.members[0]?.user
    const ownerUserId = owner?.id ?? workspace.createdById
    if (!ownerUserId) {
      return NextResponse.json(
        { error: 'Organisation invalide (aucun propriétaire)' },
        { status: 400 }
      )
    }

    // Anti-spam : limite le nombre de demandes publiques (endpoint non authentifié
    // qui déclenche l'envoi d'emails vers une adresse fournie par l'appelant).
    const normalizedEmail = requesterEmail.trim().toLowerCase()
    const now = Date.now()
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000)
    const oneHourAgo = new Date(now - 60 * 60 * 1000)

    const [recentForWorkspace, recentForEmail] = await Promise.all([
      prisma.reimbursementRequest.count({
        where: {
          workspaceId: workspace.id,
          isPublicRequest: true,
          createdAt: { gt: tenMinutesAgo },
        },
      }),
      prisma.reimbursementRequest.count({
        where: {
          workspaceId: workspace.id,
          isPublicRequest: true,
          requesterEmail: normalizedEmail,
          createdAt: { gt: oneHourAgo },
        },
      }),
    ])

    if (recentForWorkspace >= 5 || recentForEmail >= 3) {
      return NextResponse.json(
        { error: 'Trop de demandes envoyées. Merci de réessayer plus tard.' },
        { status: 429 }
      )
    }

    const reimbursementRequest = await prisma.reimbursementRequest.create({
      data: {
        requesterName: requesterName.trim(),
        requesterEmail: normalizedEmail,
        amount: parsedAmount,
        description: description.trim(),
        receiptUrl: receiptUrl || null,
        ribUrl: ribUrl || null,
        notes: notes?.trim() || null,
        userId: ownerUserId, // Créateur/propriétaire de l'organisation
        workspaceId: workspace.id,
        isPublicRequest: true, // Marquer comme demande publique
        status: 'pending'
      }
    })

    // Envoyer les emails de notification
    try {
      await Promise.all([
        sendReimbursementConfirmation(requesterEmail, requesterName, reimbursementRequest.id),
        ...(owner?.email
          ? [sendAdminNotification(requesterName, requesterEmail, parsedAmount, description, reimbursementRequest.id, owner.email)]
          : [])
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

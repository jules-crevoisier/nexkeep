import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { createWorkspaceForUser } from "@/lib/workspace-create"
import { acceptInvitationForUser } from "@/lib/invitations"

export async function POST(request: NextRequest) {
  try {
    const { email, password, inviteToken } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 })
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 })
    }

    // Validation du mot de passe
    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caractères" }, { status: 400 })
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: "Un compte avec cet email existe déjà" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
    })

    // Avec un token d'invitation valide correspondant à l'email : rejoindre l'org invitante.
    // Sinon : créer une organisation personnelle par défaut.
    let joinedWorkspaceId: string | null = null
    if (inviteToken && typeof inviteToken === "string") {
      joinedWorkspaceId = await acceptInvitationForUser(inviteToken, user.id, email)
    }
    if (!joinedWorkspaceId) {
      const baseName = email.split("@")[0]
      await createWorkspaceForUser(user.id, `Organisation de ${baseName}`)
    }

    return NextResponse.json({
      message: "Compte créé avec succès",
      userId: user.id,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({
      error: "Erreur interne du serveur. Veuillez réessayer.",
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { email, password, initialBudget } = await request.json()

    console.log("Registration attempt for:", email);

    if (!email || !password) {
      console.log("Missing email or password");
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
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log("User already exists");
      return NextResponse.json({ error: "Un compte avec cet email existe déjà" }, { status: 400 })
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Créer l'utilisateur
    const budgetInitialValue = initialBudget ? parseFloat(initialBudget) : 0;
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        budget: budgetInitialValue,
        budgetInitial: budgetInitialValue
      }
    })

    console.log("User created successfully:", user.id);

    return NextResponse.json({ 
      message: "Compte créé avec succès",
      userId: user.id 
    })
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ 
      error: "Erreur interne du serveur. Veuillez réessayer." 
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// POST - Créer un utilisateur admin
export async function POST(request: NextRequest) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@vosoft.fr'
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'Utilisateur admin existe déjà',
        email: adminEmail
      })
    }

    // Créer l'utilisateur admin
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        budget: 0,
        budgetInitial: 0
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Utilisateur admin créé avec succès',
      email: adminEmail,
      password: 'admin123',
      warning: 'Changez le mot de passe après la première connexion!'
    })
    
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur admin:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

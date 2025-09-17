const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@vosoft.fr'
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      console.log('✅ Utilisateur admin existe déjà:', adminEmail)
      return
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

    console.log('✅ Utilisateur admin créé avec succès!')
    console.log('📧 Email:', adminEmail)
    console.log('🔑 Mot de passe temporaire: admin123')
    console.log('⚠️  Changez le mot de passe après la première connexion!')
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()

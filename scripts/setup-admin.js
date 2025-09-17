const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function setupAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@vosoft.fr'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    
    console.log('🔧 Configuration du compte administrateur...')
    console.log('📧 Email:', adminEmail)
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      console.log('✅ Utilisateur admin existe déjà')
      console.log('🆔 ID:', existingUser.id)
      console.log('📧 Email:', existingUser.email)
      console.log('💰 Budget:', existingUser.budget)
      return
    }

    // Créer l'utilisateur admin
    const hashedPassword = await bcrypt.hash(adminPassword, 10)
    
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        budget: 0,
        budgetInitial: 0
      }
    })

    console.log('✅ Utilisateur admin créé avec succès!')
    console.log('🆔 ID:', adminUser.id)
    console.log('📧 Email:', adminUser.email)
    console.log('🔑 Mot de passe:', adminPassword)
    console.log('💰 Budget initial:', adminUser.budget)
    
    console.log('\n🚀 Vous pouvez maintenant:')
    console.log('1. Aller sur http://localhost:3000/login')
    console.log('2. Vous connecter avec:', adminEmail)
    console.log('3. Gérer les demandes de remboursement')
    console.log('4. Partager le formulaire public: http://localhost:3000/request-reimbursement')
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupAdmin()

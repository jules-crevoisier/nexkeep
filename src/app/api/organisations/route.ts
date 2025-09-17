import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/organisations - Récupérer toutes les organisations de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const organisations = await prisma.organisation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(organisations);
  } catch (error) {
    console.error('Erreur lors de la récupération des organisations:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/organisations - Créer une nouvelle organisation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validation des champs obligatoires
    if (!data.name || !data.address || !data.city || !data.postalCode) {
      return NextResponse.json({ 
        error: 'Les champs nom, adresse, ville et code postal sont obligatoires' 
      }, { status: 400 });
    }

    const organisation = await prisma.organisation.create({
      data: {
        ...data,
        userId: session.user.id
      }
    });

    return NextResponse.json(organisation, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de l\'organisation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


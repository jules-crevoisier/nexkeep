import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/clients - Récupérer tous les clients de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const clients = await prisma.client.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Erreur lors de la récupération des clients:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/clients - Créer un nouveau client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validation des champs obligatoires
    if (!data.name) {
      return NextResponse.json({ 
        error: 'Le nom est obligatoire' 
      }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        ...data,
        userId: session.user.id
      }
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du client:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


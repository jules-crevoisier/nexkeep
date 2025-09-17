import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/articles - Récupérer tous les articles de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const articles = await prisma.article.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Erreur lors de la récupération des articles:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/articles - Créer un nouvel article
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validation des champs obligatoires
    if (!data.name || !data.price) {
      return NextResponse.json({ 
        error: 'Le nom et le prix sont obligatoires' 
      }, { status: 400 });
    }

    // Validation du prix
    if (data.price < 0) {
      return NextResponse.json({ 
        error: 'Le prix doit être positif' 
      }, { status: 400 });
    }

    // Validation du taux de TVA
    if (data.tvaRate && (data.tvaRate < 0 || data.tvaRate > 100)) {
      return NextResponse.json({ 
        error: 'Le taux de TVA doit être entre 0 et 100' 
      }, { status: 400 });
    }

    const article = await prisma.article.create({
      data: {
        ...data,
        userId: session.user.id
      }
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de l\'article:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


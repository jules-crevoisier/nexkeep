import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/articles/[id] - Récupérer un article spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const article = await prisma.article.findFirst({
      where: { 
        id: id,
        userId: session.user.id 
      }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'article:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/articles/[id] - Mettre à jour un article
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const data = await request.json();

    // Vérifier que l'article appartient à l'utilisateur
    const existingArticle = await prisma.article.findFirst({
      where: { 
        id: id,
        userId: session.user.id 
      }
    });

    if (!existingArticle) {
      return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 });
    }

    // Validation du prix
    if (data.price && data.price < 0) {
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

    const article = await prisma.article.update({
      where: { id: id },
      data
    });

    return NextResponse.json(article);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'article:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/articles/[id] - Supprimer un article
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'article appartient à l'utilisateur
    const existingArticle = await prisma.article.findFirst({
      where: { 
        id: id,
        userId: session.user.id 
      }
    });

    if (!existingArticle) {
      return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 });
    }

    await prisma.article.delete({
      where: { id: id }
    });

    return NextResponse.json({ message: 'Article supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'article:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


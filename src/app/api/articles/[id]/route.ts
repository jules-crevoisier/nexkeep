import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace';

// GET /api/articles/[id] - Récupérer un article spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("READ");

    const article = await prisma.article.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
      }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/articles/[id] - Mettre à jour un article
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("WRITE");

    const data = await request.json();

    // Vérifier que l'article appartient à l'organisation
    const existingArticle = await prisma.article.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
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
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/articles/[id] - Supprimer un article
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("WRITE");

    // Vérifier que l'article appartient à l'organisation
    const existingArticle = await prisma.article.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
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
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

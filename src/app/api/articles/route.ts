import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace';

// GET /api/articles - Récupérer tous les articles de l'organisation
export async function GET() {
  try {
    const ctx = await requireTreasury("READ");

    const articles = await prisma.article.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(articles);
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/articles - Créer un nouvel article
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireTreasury("WRITE");

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
        workspaceId: ctx.workspace.id,
        userId: ctx.userId
      }
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

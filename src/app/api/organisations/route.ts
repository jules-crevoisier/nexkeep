import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace';

// GET /api/organisations - Récupérer toutes les organisations de l'organisation
export async function GET() {
  try {
    const ctx = await requireTreasury("READ");

    const organisations = await prisma.organisation.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(organisations);
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/organisations - Créer une nouvelle organisation
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireTreasury("WRITE");

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
        workspaceId: ctx.workspace.id,
        userId: ctx.userId
      }
    });

    return NextResponse.json(organisation, { status: 201 });
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

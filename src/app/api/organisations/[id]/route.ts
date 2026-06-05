import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace';

// GET /api/organisations/[id] - Récupérer une organisation spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("READ");

    const organisation = await prisma.organisation.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
      }
    });

    if (!organisation) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    return NextResponse.json(organisation);
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/organisations/[id] - Mettre à jour une organisation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("WRITE");

    const data = await request.json();

    // Vérifier que l'organisation appartient à l'organisation
    const existingOrganisation = await prisma.organisation.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
      }
    });

    if (!existingOrganisation) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    const organisation = await prisma.organisation.update({
      where: { id: id },
      data
    });

    return NextResponse.json(organisation);
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/organisations/[id] - Supprimer une organisation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("WRITE");

    // Vérifier que l'organisation appartient à l'organisation
    const existingOrganisation = await prisma.organisation.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
      }
    });

    if (!existingOrganisation) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    await prisma.organisation.delete({
      where: { id: id }
    });

    return NextResponse.json({ message: 'Organisation supprimée avec succès' });
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

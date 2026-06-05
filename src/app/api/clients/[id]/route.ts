import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace';

// GET /api/clients/[id] - Récupérer un client spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("READ");

    const client = await prisma.client.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/clients/[id] - Mettre à jour un client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("WRITE");

    const data = await request.json();

    // Vérifier que le client appartient à l'organisation
    const existingClient = await prisma.client.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
      }
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    const client = await prisma.client.update({
      where: { id: id },
      data
    });

    return NextResponse.json(client);
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/clients/[id] - Supprimer un client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury("WRITE");

    // Vérifier que le client appartient à l'organisation
    const existingClient = await prisma.client.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
      }
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    await prisma.client.delete({
      where: { id: id }
    });

    return NextResponse.json({ message: 'Client supprimé avec succès' });
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace';

// GET /api/clients - Récupérer tous les clients de l'organisation
export async function GET() {
  try {
    const ctx = await requireTreasury("READ");

    const clients = await prisma.client.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(clients);
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/clients - Créer un nouveau client
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireTreasury("WRITE");

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
        workspaceId: ctx.workspace.id,
        userId: ctx.userId
      }
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

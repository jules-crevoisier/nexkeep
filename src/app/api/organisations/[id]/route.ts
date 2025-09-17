import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/organisations/[id] - Récupérer une organisation spécifique
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

    const organisation = await prisma.organisation.findFirst({
      where: { 
        id: id,
        userId: session.user.id 
      }
    });

    if (!organisation) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    return NextResponse.json(organisation);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'organisation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/organisations/[id] - Mettre à jour une organisation
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

    // Vérifier que l'organisation appartient à l'utilisateur
    const existingOrganisation = await prisma.organisation.findFirst({
      where: { 
        id: id,
        userId: session.user.id 
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
    console.error('Erreur lors de la mise à jour de l\'organisation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/organisations/[id] - Supprimer une organisation
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

    // Vérifier que l'organisation appartient à l'utilisateur
    const existingOrganisation = await prisma.organisation.findFirst({
      where: { 
        id: id,
        userId: session.user.id 
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
    console.error('Erreur lors de la suppression de l\'organisation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


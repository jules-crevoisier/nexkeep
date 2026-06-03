import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/orga/statuses/[id] - renommer / couleur / position / isBlocked
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const existing = await prisma.status.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Statut non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.color !== undefined) data.color = body.color;
    if (body.position !== undefined) data.position = body.position;
    if (body.isBlocked !== undefined) data.isBlocked = !!body.isBlocked;

    const status = await prisma.status.update({ where: { id }, data });
    return NextResponse.json(status);
  } catch (error) {
    console.error("Erreur PATCH status:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/orga/statuses/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const existing = await prisma.status.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Statut non trouvé" }, { status: 404 });
    }

    if (existing.isDefault || existing.isDone) {
      return NextResponse.json(
        { error: "Impossible de supprimer le statut par défaut ou terminé" },
        { status: 400 }
      );
    }

    const used = await prisma.task.count({ where: { statusId: id } });
    if (used > 0) {
      return NextResponse.json(
        { error: `Statut utilisé par ${used} tâche(s)` },
        { status: 400 }
      );
    }

    await prisma.status.delete({ where: { id } });
    return NextResponse.json({ message: "Statut supprimé" });
  } catch (error) {
    console.error("Erreur DELETE status:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

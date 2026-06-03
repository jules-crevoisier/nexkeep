import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAndValidateAmount } from "@/lib/api-utils";

async function getOwnedGroup(id: string, userId: string) {
  return prisma.taskGroup.findFirst({
    where: { id, project: { userId } },
    select: { id: true },
  });
}

// GET /api/orga/groups/[id] - Détail d'un pôle (avec projet parent et nb de tâches)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const group = await prisma.taskGroup.findFirst({
      where: { id, project: { userId: session.user.id } },
      include: {
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { tasks: true } },
      },
    });
    if (!group) {
      return NextResponse.json({ error: "Pôle non trouvé" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error("Erreur GET group:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH /api/orga/groups/[id]
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

    const existing = await getOwnedGroup(id, session.user.id);
    if (!existing) {
      return NextResponse.json({ error: "Groupe non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
    }
    if (typeof body.color === "string") data.color = body.color;
    if (body.position !== undefined) data.position = body.position;
    if (body.budget !== undefined) {
      if (body.budget === null || body.budget === "") {
        data.budget = null;
      } else {
        const parsed = parseAndValidateAmount(body.budget);
        if (!parsed.valid) {
          return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
        data.budget = parsed.amount!;
      }
    }

    const group = await prisma.taskGroup.update({ where: { id }, data });
    return NextResponse.json(group);
  } catch (error) {
    console.error("Erreur PATCH group:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/orga/groups/[id] - les tâches passent à groupId=null (SetNull)
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

    const existing = await getOwnedGroup(id, session.user.id);
    if (!existing) {
      return NextResponse.json({ error: "Groupe non trouvé" }, { status: 404 });
    }

    await prisma.taskGroup.delete({ where: { id } });
    return NextResponse.json({ message: "Groupe supprimé" });
  } catch (error) {
    console.error("Erreur DELETE group:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

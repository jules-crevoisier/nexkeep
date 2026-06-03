import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAndValidateAmount } from "@/lib/api-utils";

// GET /api/orga/groups?projectId=... - Liste des groupes d'un projet
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId requis" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }

    const groups = await prisma.taskGroup.findMany({
      where: { projectId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { tasks: true } } },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Erreur GET groups:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/orga/groups - Créer un groupe dans un projet
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { projectId, name, color, budget } = await request.json();
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json({ error: "projectId requis" }, { status: 400 });
    }
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }

    let budgetValue: number | null = null;
    if (budget !== undefined && budget !== null && budget !== "") {
      const parsed = parseAndValidateAmount(budget);
      if (!parsed.valid) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      budgetValue = parsed.amount!;
    }

    const last = await prisma.taskGroup.findFirst({
      where: { projectId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const group = await prisma.taskGroup.create({
      data: {
        projectId,
        name: name.trim(),
        color: color || undefined,
        budget: budgetValue,
        position: (last?.position ?? -1) + 1,
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("Erreur POST group:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

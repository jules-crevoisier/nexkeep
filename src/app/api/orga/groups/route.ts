import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseAndValidateAmount } from "@/lib/api-utils";
import { requireWorkspace, requireRole, workspaceErrorResponse } from "@/lib/workspace";

// GET /api/orga/groups?projectId=... - Liste des groupes d'un projet
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();

    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId requis" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: ctx.workspace.id },
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
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Erreur GET groups:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/orga/groups - Créer un groupe dans un projet
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole("MEMBER");

    const { projectId, name, color, budget } = await request.json();
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json({ error: "projectId requis" }, { status: 400 });
    }
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: ctx.workspace.id },
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
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Erreur POST group:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

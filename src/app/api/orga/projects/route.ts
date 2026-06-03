import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/orga/projects?status=active - Liste des projets (avec compteur de tâches)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const status = new URL(request.url).searchParams.get("status");
    const where: { userId: string; status?: string } = {
      userId: session.user.id,
    };
    if (status) where.status = status;

    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { tasks: true } } },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Erreur GET projects:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/orga/projects - Créer un projet
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { name, description, color, status, budget, endDate } =
      await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        color: color || null,
        status: typeof status === "string" ? status : "active",
        budget: budget === "" || budget == null ? null : Number(budget),
        endDate: endDate ? new Date(endDate) : null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Erreur POST project:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

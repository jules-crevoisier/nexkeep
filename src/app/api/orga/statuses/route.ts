import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureStatuses } from "@/lib/orga-statuses";

// GET /api/orga/statuses - workflow de l'utilisateur (seed si vide)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const statuses = await ensureStatuses(session.user.id);
    return NextResponse.json(statuses);
  } catch (error) {
    console.error("Erreur GET statuses:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/orga/statuses - créer un statut
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { name, color, isBlocked } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const last = await prisma.status.findFirst({
      where: { userId: session.user.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const status = await prisma.status.create({
      data: {
        name: name.trim(),
        color: color || "#64748b",
        isBlocked: !!isBlocked,
        position: (last?.position ?? -1) + 1,
        userId: session.user.id,
      },
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error("Erreur POST status:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

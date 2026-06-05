import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureStatuses } from "@/lib/orga-statuses";
import { requireWorkspace, requireRole, workspaceErrorResponse } from "@/lib/workspace";

// GET /api/orga/statuses - workflow de l'organisation (seed si vide)
export async function GET() {
  try {
    const ctx = await requireWorkspace();
    const statuses = await ensureStatuses(ctx.workspace.id, ctx.userId);
    return NextResponse.json(statuses);
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Erreur GET statuses:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/orga/statuses - créer un statut
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole("MEMBER");

    const { name, color, isBlocked } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const last = await prisma.status.findFirst({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const status = await prisma.status.create({
      data: {
        name: name.trim(),
        color: color || "#64748b",
        isBlocked: !!isBlocked,
        position: (last?.position ?? -1) + 1,
        workspaceId: ctx.workspace.id,
        userId: ctx.userId,
      },
    });

    return NextResponse.json(status);
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Erreur POST status:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

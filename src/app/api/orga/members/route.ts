import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, requireRole, workspaceErrorResponse } from "@/lib/workspace";

type MemberWithUser = {
  id: string;
  displayName: string | null;
  color: string;
  user: { email: string } | null;
};

/** Forme attendue par le front (picker d'assignés) : { id, name, email, color }. */
function shape(m: MemberWithUser) {
  return {
    id: m.id,
    name: m.displayName || m.user?.email || "Membre",
    email: m.user?.email || null,
    color: m.color,
  };
}

// GET /api/orga/members - membres de l'organisation active
export async function GET() {
  try {
    const ctx = await requireWorkspace();
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(members.map(shape));
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Erreur GET members:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/orga/members - créer un membre "contact" (sans compte) assignable
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole("MEMBER");

    const { name, color } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const member = await prisma.workspaceMember.create({
      data: {
        displayName: name.trim(),
        color: color || "#3b82f6",
        role: "VIEWER",
        treasuryAccess: "NONE",
        workspaceId: ctx.workspace.id,
        userId: null,
      },
      include: { user: { select: { email: true } } },
    });

    return NextResponse.json(shape(member));
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Erreur POST member:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, workspaceErrorResponse } from "@/lib/workspace";

// PATCH /api/orga/members/[id] - met à jour un membre (nom affiché / couleur)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireRole("MEMBER");

    const existing = await prisma.workspaceMember.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Membre non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.displayName = body.name;
    if (body.color !== undefined) data.color = body.color;

    const member = await prisma.workspaceMember.update({ where: { id }, data });
    return NextResponse.json(member);
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Erreur PATCH member:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/orga/members/[id] - supprime un membre "contact" (sans compte)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireRole("MEMBER");

    const existing = await prisma.workspaceMember.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Membre non trouvé" }, { status: 404 });
    }

    // La gestion des membres avec compte se fait via /api/workspaces/[id]/members.
    if (existing.userId) {
      return NextResponse.json(
        { error: "Gérez ce membre depuis les paramètres de l'organisation" },
        { status: 403 }
      );
    }

    await prisma.workspaceMember.delete({ where: { id } });
    return NextResponse.json({ message: "Membre supprimé" });
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Erreur DELETE member:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

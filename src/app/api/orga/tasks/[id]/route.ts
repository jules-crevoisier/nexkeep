import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskInclude, setAssignees } from "@/lib/orga-task";

// PATCH /api/orga/tasks/[id]
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

    const existing = await prisma.task.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.position !== undefined) data.position = body.position;
    if (body.blockingPoint !== undefined) data.blockingPoint = body.blockingPoint || null;
    if (body.dueDate !== undefined) {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    // Changement de statut : vérifier l'appartenance + recalcul completedAt
    if (body.statusId !== undefined) {
      if (body.statusId) {
        const status = await prisma.status.findFirst({
          where: { id: body.statusId, userId: session.user.id },
        });
        if (!status) {
          return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
        }
        data.statusId = status.id;
        data.completedAt = status.isDone ? new Date() : null;
      } else {
        data.statusId = null;
        data.completedAt = null;
      }
    }

    // Changement de projet : vérifier l'appartenance
    if (body.projectId !== undefined) {
      if (body.projectId) {
        const project = await prisma.project.findFirst({
          where: { id: body.projectId, userId: session.user.id },
        });
        if (!project) {
          return NextResponse.json({ error: "Projet invalide" }, { status: 400 });
        }
        data.projectId = body.projectId;
      } else {
        data.projectId = null;
      }
    }

    // Changement de groupe : vérifier l'appartenance (ou mise à null)
    if (body.groupId !== undefined) {
      if (body.groupId) {
        const group = await prisma.taskGroup.findFirst({
          where: { id: body.groupId, project: { userId: session.user.id } },
          select: { id: true },
        });
        if (!group) {
          return NextResponse.json({ error: "Groupe invalide" }, { status: 400 });
        }
        data.groupId = group.id;
      } else {
        data.groupId = null;
      }
    }

    // Resync des membres assignés
    if (Array.isArray(body.assigneeIds)) {
      await setAssignees(id, body.assigneeIds, session.user.id);
    }

    const task = await prisma.task.update({
      where: { id },
      data,
      include: taskInclude,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Erreur PATCH task:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/orga/tasks/[id]
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

    const existing = await prisma.task.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ message: "Tâche supprimée" });
  } catch (error) {
    console.error("Erreur DELETE task:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

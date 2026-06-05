import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_TYPES, recordActivity } from "@/lib/activity";
import { taskInclude, setAssignees } from "@/lib/orga-task";
import {
  assertInboxAccess,
  assertProjectWriteAccess,
  assertTaskAccess,
} from "@/lib/orga-access";
import { requireRole, workspaceErrorResponse } from "@/lib/workspace";

// PATCH /api/orga/tasks/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireRole("MEMBER");
    const workspaceId = ctx.workspace.id;

    const existing = await prisma.task.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }

    await assertTaskAccess(ctx, existing, true);

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
          where: { id: body.statusId, workspaceId },
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

    if (body.projectId !== undefined) {
      if (body.projectId) {
        const project = await prisma.project.findFirst({
          where: { id: body.projectId, workspaceId },
        });
        if (!project) {
          return NextResponse.json({ error: "Projet invalide" }, { status: 400 });
        }
        await assertProjectWriteAccess(ctx, body.projectId);
        data.projectId = body.projectId;
      } else {
        assertInboxAccess(ctx);
        data.projectId = null;
      }
    }

    // Changement de groupe : vérifier l'appartenance (ou mise à null)
    if (body.groupId !== undefined) {
      if (body.groupId) {
        const group = await prisma.taskGroup.findFirst({
          where: { id: body.groupId, project: { workspaceId } },
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
      await setAssignees(id, body.assigneeIds, workspaceId);
    }

    const task = await prisma.task.update({
      where: { id },
      data,
      include: taskInclude,
    });

    const wasDone = existing.completedAt != null;
    const isDone = task.completedAt != null;
    if (!wasDone && isDone) {
      await recordActivity({
        workspaceId,
        type: ACTIVITY_TYPES.TASK_COMPLETED,
        title: `Tâche terminée — ${task.title}`,
        actorId: ctx.userId,
        metadata: { taskId: task.id, projectId: task.projectId },
      });
    }

    return NextResponse.json(task);
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
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
    const ctx = await requireRole("MEMBER");

    const existing = await prisma.task.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }

    await assertTaskAccess(ctx, existing, true);
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ message: "Tâche supprimée" });
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Erreur DELETE task:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

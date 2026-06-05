import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultStatusId } from "@/lib/orga-statuses";
import { taskInclude, setAssignees } from "@/lib/orga-task";
import {
  assertInboxAccess,
  assertProjectReadAccess,
  assertProjectWriteAccess,
  buildVisibleTasksWhere,
  canMemberAccessInbox,
} from "@/lib/orga-access";
import { requireWorkspace, requireRole, workspaceErrorResponse } from "@/lib/workspace";

// GET /api/orga/tasks?projectId=...&status=...&scope=inbox|all
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const statusId = searchParams.get("statusId");
    const scope = searchParams.get("scope");
    const groupId = searchParams.get("groupId");

    const baseWhere: {
      projectId?: string | null;
      statusId?: string;
      groupId?: string | null;
      parentId: null;
    } = { parentId: null };

    if (projectId) {
      await assertProjectReadAccess(ctx, projectId);
      baseWhere.projectId = projectId;
    } else if (scope === "inbox") {
      if (!canMemberAccessInbox(ctx)) {
        return NextResponse.json([]);
      }
      baseWhere.projectId = null;
    }

    if (groupId === "none") {
      baseWhere.groupId = null;
    } else if (groupId) {
      baseWhere.groupId = groupId;
    }

    if (statusId && statusId !== "all") {
      baseWhere.statusId = statusId;
    }

    const where = buildVisibleTasksWhere(ctx, baseWhere);

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      include: taskInclude,
    });

    return NextResponse.json(tasks);
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Erreur GET tasks:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/orga/tasks
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole("MEMBER");
    const workspaceId = ctx.workspace.id;

    const body = await request.json();
    const {
      title,
      description,
      statusId,
      priority,
      dueDate,
      projectId,
      groupId,
      parentId,
      blockingPoint,
      assigneeIds,
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId },
      });
      if (!project) {
        return NextResponse.json({ error: "Projet invalide" }, { status: 400 });
      }
      await assertProjectWriteAccess(ctx, projectId);
    } else {
      assertInboxAccess(ctx);
    }

    // Vérifier l'appartenance du groupe (au projet de l'organisation)
    if (groupId) {
      const group = await prisma.taskGroup.findFirst({
        where: { id: groupId, project: { workspaceId } },
        select: { projectId: true },
      });
      if (!group || (projectId && group.projectId !== projectId)) {
        return NextResponse.json({ error: "Groupe invalide" }, { status: 400 });
      }
    }

    // Vérifier l'appartenance de la tâche parente (sous-tâche)
    if (parentId) {
      const parent = await prisma.task.findFirst({
        where: { id: parentId, workspaceId },
      });
      if (!parent) {
        return NextResponse.json({ error: "Tâche parente invalide" }, { status: 400 });
      }
    }

    // Statut : fourni (vérifié) ou défaut de l'organisation
    let finalStatusId = statusId as string | undefined;
    if (finalStatusId) {
      const st = await prisma.status.findFirst({
        where: { id: finalStatusId, workspaceId },
      });
      if (!st) finalStatusId = undefined;
    }
    if (!finalStatusId) {
      finalStatusId = await getDefaultStatusId(workspaceId, ctx.userId);
    }
    const status = await prisma.status.findUnique({ where: { id: finalStatusId } });

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description || null,
        priority: priority || "medium",
        blockingPoint: blockingPoint || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId || null,
        groupId: groupId || null,
        parentId: parentId || null,
        statusId: finalStatusId,
        completedAt: status?.isDone ? new Date() : null,
        workspaceId,
        userId: ctx.userId,
      },
    });

    if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      await setAssignees(task.id, assigneeIds, workspaceId);
    }

    const full = await prisma.task.findUnique({
      where: { id: task.id },
      include: taskInclude,
    });
    return NextResponse.json(full);
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Erreur POST task:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

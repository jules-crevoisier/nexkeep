import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultStatusId } from "@/lib/orga-statuses";
import { taskInclude, setAssignees } from "@/lib/orga-task";

// GET /api/orga/tasks?projectId=...&status=...&scope=inbox|all
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const statusId = searchParams.get("statusId");
    const scope = searchParams.get("scope");
    const groupId = searchParams.get("groupId");

    const where: {
      userId: string;
      projectId?: string | null;
      statusId?: string;
      groupId?: string | null;
      parentId: null;
    } = { userId: session.user.id, parentId: null }; // sous-tâches exclues du board

    if (projectId) {
      where.projectId = projectId;
    } else if (scope === "inbox") {
      where.projectId = null; // tâches courantes (sans projet)
    }

    // Filtre par pôle : id réel, ou "none" pour les tâches générales du projet.
    if (groupId === "none") {
      where.groupId = null;
    } else if (groupId) {
      where.groupId = groupId;
    }

    if (statusId && statusId !== "all") {
      where.statusId = statusId;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      include: taskInclude,
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Erreur GET tasks:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/orga/tasks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

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

    // Vérifier l'appartenance du projet
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id },
      });
      if (!project) {
        return NextResponse.json({ error: "Projet invalide" }, { status: 400 });
      }
    }

    // Vérifier l'appartenance du groupe (au projet de l'utilisateur)
    if (groupId) {
      const group = await prisma.taskGroup.findFirst({
        where: { id: groupId, project: { userId: session.user.id } },
        select: { projectId: true },
      });
      if (!group || (projectId && group.projectId !== projectId)) {
        return NextResponse.json({ error: "Groupe invalide" }, { status: 400 });
      }
    }

    // Vérifier l'appartenance de la tâche parente (sous-tâche)
    if (parentId) {
      const parent = await prisma.task.findFirst({
        where: { id: parentId, userId: session.user.id },
      });
      if (!parent) {
        return NextResponse.json({ error: "Tâche parente invalide" }, { status: 400 });
      }
    }

    // Statut : fourni (vérifié) ou défaut de l'utilisateur
    let finalStatusId = statusId as string | undefined;
    if (finalStatusId) {
      const st = await prisma.status.findFirst({
        where: { id: finalStatusId, userId: session.user.id },
      });
      if (!st) finalStatusId = undefined;
    }
    if (!finalStatusId) {
      finalStatusId = await getDefaultStatusId(session.user.id);
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
        userId: session.user.id,
      },
    });

    if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      await setAssignees(task.id, assigneeIds, session.user.id);
    }

    const full = await prisma.task.findUnique({
      where: { id: task.id },
      include: taskInclude,
    });
    return NextResponse.json(full);
  } catch (error) {
    console.error("Erreur POST task:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

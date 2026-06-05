import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Include partagé pour renvoyer une tâche complète (statut, assignés, sous-tâches). */
export const taskInclude = {
  project: { select: { id: true, name: true, color: true } },
  status: true,
  group: { select: { id: true, name: true, color: true } },
  assignees: { include: { member: true } },
  subtasks: { orderBy: { position: "asc" }, include: { status: true } },
} satisfies Prisma.TaskInclude;

/**
 * Remplace la liste des membres assignés à une tâche.
 * Valide que chaque membre appartient bien à l'organisation.
 */
export async function setAssignees(
  taskId: string,
  memberIds: string[],
  workspaceId: string
) {
  const valid = await prisma.workspaceMember.findMany({
    where: { id: { in: memberIds }, workspaceId },
    select: { id: true },
  });
  await prisma.taskAssignee.deleteMany({ where: { taskId } });
  if (valid.length > 0) {
    await prisma.taskAssignee.createMany({
      data: valid.map((m) => ({ taskId, memberId: m.id })),
    });
  }
}

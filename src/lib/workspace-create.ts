import { prisma } from "@/lib/prisma"
import { ensureStatuses } from "@/lib/orga-statuses"

/**
 * Cree une organisation (tenant) et y rattache l'utilisateur comme OWNER
 * avec acces tresorerie complet. Seede le workflow de statuts par defaut.
 * Utilise a l'inscription (org perso) et depuis le hub (nouvelle org).
 */
export async function createWorkspaceForUser(
  userId: string,
  name: string,
  opts?: { budgetInitial?: number; cashInitial?: number }
) {
  const budgetInitial = Math.max(0, Number(opts?.budgetInitial) || 0)
  const cashInitial = Math.max(0, Number(opts?.cashInitial) || 0)

  const workspace = await prisma.workspace.create({
    data: {
      name: name.trim() || "Mon organisation",
      createdById: userId,
      budget: budgetInitial,
      budgetInitial,
      cashInitial,
      members: {
        create: {
          userId,
          role: "OWNER",
          treasuryAccess: "WRITE",
        },
      },
    },
  })

  await ensureStatuses(workspace.id, userId)

  return workspace
}

import { prisma } from "@/lib/prisma";

/** Statuts par défaut créés au premier accès d'une organisation. */
const DEFAULT_STATUSES = [
  { name: "À faire", color: "#64748b", isDefault: true, isDone: false, isBlocked: false },
  { name: "En cours", color: "#3b82f6", isDefault: false, isDone: false, isBlocked: false },
  { name: "Bloqué", color: "#f59e0b", isDefault: false, isDone: false, isBlocked: true },
  { name: "Terminé", color: "#22c55e", isDefault: false, isDone: true, isBlocked: false },
];

/**
 * Garantit que l'organisation possède un workflow de statuts.
 * Crée le set par défaut si aucun statut n'existe, puis renvoie la liste triée.
 */
export async function ensureStatuses(workspaceId: string, createdById: string) {
  const count = await prisma.status.count({ where: { workspaceId } });
  if (count === 0) {
    await prisma.status.createMany({
      data: DEFAULT_STATUSES.map((s, i) => ({ ...s, position: i, workspaceId, userId: createdById })),
    });
  }
  return prisma.status.findMany({
    where: { workspaceId },
    orderBy: { position: "asc" },
  });
}

/** Renvoie le statut par défaut (initial) de l'organisation, en le créant si besoin. */
export async function getDefaultStatusId(workspaceId: string, createdById: string): Promise<string> {
  const statuses = await ensureStatuses(workspaceId, createdById);
  const def = statuses.find((s) => s.isDefault) ?? statuses[0];
  return def.id;
}

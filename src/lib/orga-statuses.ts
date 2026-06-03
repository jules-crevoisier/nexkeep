import { prisma } from "@/lib/prisma";

/** Statuts par défaut créés au premier accès d'un utilisateur. */
const DEFAULT_STATUSES = [
  { name: "À faire", color: "#64748b", isDefault: true, isDone: false, isBlocked: false },
  { name: "En cours", color: "#3b82f6", isDefault: false, isDone: false, isBlocked: false },
  { name: "Bloqué", color: "#f59e0b", isDefault: false, isDone: false, isBlocked: true },
  { name: "Terminé", color: "#22c55e", isDefault: false, isDone: true, isBlocked: false },
];

/**
 * Garantit que l'utilisateur possède un workflow de statuts.
 * Crée le set par défaut si aucun statut n'existe, puis renvoie la liste triée.
 */
export async function ensureStatuses(userId: string) {
  const count = await prisma.status.count({ where: { userId } });
  if (count === 0) {
    await prisma.status.createMany({
      data: DEFAULT_STATUSES.map((s, i) => ({ ...s, position: i, userId })),
    });
  }
  return prisma.status.findMany({
    where: { userId },
    orderBy: { position: "asc" },
  });
}

/** Renvoie le statut par défaut (initial) de l'utilisateur, en le créant si besoin. */
export async function getDefaultStatusId(userId: string): Promise<string> {
  const statuses = await ensureStatuses(userId);
  const def = statuses.find((s) => s.isDefault) ?? statuses[0];
  return def.id;
}

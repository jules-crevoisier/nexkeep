import { prisma } from "./prisma";
import { TRANSFER_CATEGORY } from "./balances";

export interface DefaultCategorySeed {
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
}

/** Catégories par défaut pour les transactions (associations / trésorerie). */
export const defaultCategories: DefaultCategorySeed[] = [
  // Revenus
  { name: "Cotisations", type: "income", color: "#22c55e", icon: "Users" },
  { name: "Subventions", type: "income", color: "#3b82f6", icon: "Landmark" },
  { name: "Dons", type: "income", color: "#10b981", icon: "Heart" },
  { name: "Recettes événementielles", type: "income", color: "#f59e0b", icon: "PartyPopper" },
  { name: "Ventes", type: "income", color: "#8b5cf6", icon: "ShoppingBag" },
  { name: "Intérêts bancaires", type: "income", color: "#06b6d4", icon: "TrendingUp" },
  { name: "Autre revenu", type: "income", color: "#6b7280", icon: "Plus" },

  // Dépenses
  { name: "Fournitures & matériel", type: "expense", color: "#ef4444", icon: "Package" },
  { name: "Événements", type: "expense", color: "#f97316", icon: "Calendar" },
  { name: "Communication", type: "expense", color: "#6366f1", icon: "Megaphone" },
  { name: "Frais bancaires", type: "expense", color: "#64748b", icon: "Landmark" },
  { name: "Honoraires & prestations", type: "expense", color: "#ec4899", icon: "Briefcase" },
  { name: "Location & locaux", type: "expense", color: "#dc2626", icon: "Home" },
  { name: "Transport", type: "expense", color: "#f97316", icon: "Car" },
  { name: "Alimentation", type: "expense", color: "#84cc16", icon: "Utensils" },
  { name: "Remboursements", type: "expense", color: "#14b8a6", icon: "Receipt" },
  { name: "Loisirs & activités", type: "expense", color: "#8b5cf6", icon: "Gamepad2" },
  { name: "Autre dépense", type: "expense", color: "#6b7280", icon: "Minus" },

  // Transferts internes banque ↔ caisse (exclu des graphiques)
  { name: TRANSFER_CATEGORY, type: "expense", color: "#94a3b8", icon: "ArrowLeftRight" },
];

/**
 * Crée ou met à jour les catégories par défaut.
 * @returns Nombre de catégories présentes en base après le seed.
 */
export async function seedCategories(): Promise<number> {
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {
        type: category.type,
        color: category.color,
        icon: category.icon,
      },
      create: {
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon,
      },
    });
  }

  return prisma.category.count();
}

/**
 * Seed automatique si aucune catégorie n'existe encore.
 */
export async function ensureDefaultCategories(): Promise<boolean> {
  const count = await prisma.category.count();
  if (count > 0) {
    return false;
  }
  await seedCategories();
  return true;
}

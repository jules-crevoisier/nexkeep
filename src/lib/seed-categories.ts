import { prisma } from "./prisma";

const defaultCategories = [
  // Catégories de revenus
  { name: "Salaire", type: "income", color: "#22c55e", icon: "Briefcase" },
  { name: "Freelance", type: "income", color: "#3b82f6", icon: "Laptop" },
  { name: "Investissements", type: "income", color: "#8b5cf6", icon: "TrendingUp" },
  { name: "Vente", type: "income", color: "#f59e0b", icon: "ShoppingBag" },
  { name: "Don", type: "income", color: "#10b981", icon: "Heart" },
  { name: "Autre revenu", type: "income", color: "#6b7280", icon: "Plus" },

  // Catégories de dépenses
  { name: "Alimentation", type: "expense", color: "#ef4444", icon: "ShoppingCart" },
  { name: "Transport", type: "expense", color: "#f97316", icon: "Car" },
  { name: "Logement", type: "expense", color: "#dc2626", icon: "Home" },
  { name: "Santé", type: "expense", color: "#ec4899", icon: "Heart" },
  { name: "Éducation", type: "expense", color: "#6366f1", icon: "BookOpen" },
  { name: "Loisirs", type: "expense", color: "#8b5cf6", icon: "Gamepad2" },
  { name: "Vêtements", type: "expense", color: "#06b6d4", icon: "Shirt" },
  { name: "Technologie", type: "expense", color: "#84cc16", icon: "Smartphone" },
  { name: "Restaurant", type: "expense", color: "#f59e0b", icon: "Utensils" },
  { name: "Autre dépense", type: "expense", color: "#6b7280", icon: "Minus" }
];

export async function seedCategories() {
  try {
    console.log("🌱 Initialisation des catégories par défaut...");

    for (const category of defaultCategories) {
      await prisma.category.upsert({
        where: { name: category.name },
        update: {},
        create: {
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon
        }
      });
    }

    console.log("✅ Catégories initialisées avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation des catégories:", error);
  }
}

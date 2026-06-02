import "dotenv/config";
import { seedCategories } from "../src/lib/seed-categories";
import { prisma } from "../src/lib/prisma";

async function main(): Promise<void> {
  const count = await seedCategories();
  console.log(`Seed terminé : ${count} catégorie(s) en base.`);
}

main()
  .catch((error: unknown) => {
    console.error("Échec du seed des catégories:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

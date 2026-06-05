import { NextResponse } from "next/server";
import { seedCategories } from "@/lib/seed-categories";
import { requireRole, workspaceErrorResponse } from "@/lib/workspace";

export async function POST() {
  try {
    await requireRole("ADMIN");

    const count = await seedCategories();

    return NextResponse.json({
      message: "Catégories initialisées avec succès",
      count,
    });
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Categories seed error:", error);
    return NextResponse.json({
      error: "Erreur interne du serveur"
    }, { status: 500 });
  }
}

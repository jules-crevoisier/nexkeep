import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, workspaceErrorResponse } from "@/lib/workspace";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await requireRole("ADMIN");

    const categoryId = id;

    // Vérifier si la catégorie existe
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json({ 
        error: "Catégorie non trouvée" 
      }, { status: 404 });
    }

    // Vérifier s'il y a des transactions utilisant cette catégorie
    const transactionsCount = await prisma.transaction.count({
      where: { category: category.name }
    });

    if (transactionsCount > 0) {
      return NextResponse.json({ 
        error: `Cette catégorie est utilisée par ${transactionsCount} transaction(s). Supprimez d'abord les transactions ou changez leur catégorie.` 
      }, { status: 400 });
    }

    // Supprimer la catégorie
    await prisma.category.delete({
      where: { id: categoryId }
    });

    return NextResponse.json({
      message: "Catégorie supprimée avec succès"
    });
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Category deletion error:", error);
    return NextResponse.json({
      error: "Erreur interne du serveur"
    }, { status: 500 });
  }
}

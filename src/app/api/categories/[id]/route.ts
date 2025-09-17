import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const categoryId = params.id;

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
    console.error("Category deletion error:", error);
    return NextResponse.json({ 
      error: "Erreur interne du serveur" 
    }, { status: 500 });
  }
}

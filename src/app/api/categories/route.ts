import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultCategories } from "@/lib/seed-categories";
import { requireWorkspace, requireRole, workspaceErrorResponse } from "@/lib/workspace";

export async function GET() {
  try {
    await requireWorkspace();

    await ensureDefaultCategories();

    const categories = await prisma.category.findMany({
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(categories);
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Categories fetch error:", error);
    return NextResponse.json({
      error: "Erreur interne du serveur"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("ADMIN");

    const { name, type, color, icon } = await request.json();

    if (!name || !type) {
      return NextResponse.json({ 
        error: "Nom et type de catégorie requis" 
      }, { status: 400 });
    }

    if (!["income", "expense"].includes(type)) {
      return NextResponse.json({ 
        error: "Type de catégorie invalide" 
      }, { status: 400 });
    }

    // Vérifier si la catégorie existe déjà
    const existingCategory = await prisma.category.findUnique({
      where: { name }
    });

    if (existingCategory) {
      return NextResponse.json({ 
        error: "Cette catégorie existe déjà" 
      }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        type,
        color: color || null,
        icon: icon || null
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    const res = workspaceErrorResponse(error);
    if (res) return res;
    console.error("Category creation error:", error);
    return NextResponse.json({
      error: "Erreur interne du serveur"
    }, { status: 500 });
  }
}

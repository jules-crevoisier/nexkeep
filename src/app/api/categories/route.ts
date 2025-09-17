import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Categories fetch error:", error);
    return NextResponse.json({ 
      error: "Erreur interne du serveur" 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

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
    console.error("Category creation error:", error);
    return NextResponse.json({ 
      error: "Erreur interne du serveur" 
    }, { status: 500 });
  }
}

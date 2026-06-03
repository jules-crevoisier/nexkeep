import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/orga/members - carnet de membres de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const members = await prisma.member.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(members);
  } catch (error) {
    console.error("Erreur GET members:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/orga/members - créer un membre
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { name, email, color } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const member = await prisma.member.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        color: color || "#3b82f6",
        userId: session.user.id,
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error("Erreur POST member:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

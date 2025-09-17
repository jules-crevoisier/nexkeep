import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs"; // nécessaire pour le SDK côté serveur

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Type de fichier non autorisé. Formats acceptés: JPG, PNG, PDF' 
      }, { status: 400 });
    }

    // Vérifier la taille du fichier (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Fichier trop volumineux. Taille maximale: 10MB' 
      }, { status: 400 });
    }

    // Générer une clé unique pour le fichier
    const origName = file.name || "file";
    const ext = origName.includes(".") ? origName.split(".").pop() : "";
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).slice(2);
    const key = `uploads/${timestamp}_${randomString}${ext ? "." + ext : ""}`;

    // Envoi direct vers Vercel Blob (public)
    const { url } = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || "application/octet-stream",
    });

    // Retourner l'URL publique à stocker en base (compatible avec l'ancien format)
    return NextResponse.json({ 
      success: true, 
      fileUrl: url,  // URL publique Vercel Blob
      url: url,      // Alias pour compatibilité
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    }, { status: 200 });

  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ 
      error: err?.message || "Erreur lors de l'upload du fichier" 
    }, { status: 500 });
  }
}


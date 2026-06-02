import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const runtime = "nodejs"; // nécessaire pour le SDK côté serveur

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
];

// Upload direct côté client vers Vercel Blob.
// Le fichier ne transite plus par cette fonction serverless (limite ~4,5 Mo),
// ce qui corrige les erreurs sur les grosses photos de tickets.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          addRandomSuffix: true,
          maximumSizeInBytes: 10 * 1024 * 1024, // 10 Mo
        };
      },
      onUploadCompleted: async () => {
        // Rien à faire ici : l'URL est renvoyée au client par le SDK.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur lors de l'upload du fichier";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { redirect } from "next/navigation";
import { getActiveWorkspaceContext } from "@/lib/workspace";

export default async function Home() {
  const ctx = await getActiveWorkspaceContext();
  // Pas d'organisation (ou non connecté) → le hub gère la suite (création / login).
  if (!ctx) redirect("/hub");
  // Selon le droit trésorerie : accès direct ou repli sur l'organisation.
  redirect(ctx.treasuryAccess === "NONE" ? "/orga" : "/tresorerie");
}

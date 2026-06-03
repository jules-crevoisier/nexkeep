"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Layers, Wallet } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OrgaLayout } from "@/components/layout/orga-layout";
import { TaskBoard } from "@/components/orga/task-board";

interface PoleDetail {
  id: string;
  name: string;
  color: string;
  budget: number | null;
  project: { id: string; name: string; color: string | null };
  _count?: { tasks: number };
}

export default function PolePage({
  params,
}: {
  params: Promise<{ id: string; poleId: string }>;
}) {
  const { id, poleId } = use(params);
  const { data: session } = useSession();
  const [pole, setPole] = useState<PoleDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/orga/groups/${poleId}`)
      .then((res) => {
        if (res.ok) return res.json();
        setNotFound(true);
        return null;
      })
      .then((data) => data && setPole(data))
      .catch((e) => console.error("Error fetching pole:", e));
  }, [session, poleId]);

  return (
    <AuthGuard>
      <OrgaLayout>
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
              <Link
                href="/orga/projects"
                className="hover:text-foreground transition-colors"
              >
                Projets
              </Link>
              <span>/</span>
              <Link
                href={`/orga/projects/${id}`}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {pole?.project.name ?? "Projet"}
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: pole?.color ?? "#64748b" }}
              >
                <Layers className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {pole?.name ?? (notFound ? "Pôle introuvable" : "…")}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    {pole?._count?.tasks ?? 0} tâche
                    {(pole?._count?.tasks ?? 0) > 1 ? "s" : ""}
                  </span>
                  {pole?.budget != null && (
                    <span className="inline-flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      €{pole.budget.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!notFound && (
            <TaskBoard
              projectId={id}
              groupId={poleId}
              lockProject
              lockGroup
            />
          )}
        </div>
      </OrgaLayout>
    </AuthGuard>
  );
}

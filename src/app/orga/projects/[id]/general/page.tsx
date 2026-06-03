"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, ListTodo } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OrgaLayout } from "@/components/layout/orga-layout";
import { TaskBoard } from "@/components/orga/task-board";
import type { Project } from "@/components/orga/task-types";

export default function GeneralTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/orga/projects/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setProject(data))
      .catch((e) => console.error("Error fetching project:", e));
  }, [session, id]);

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
                {project?.name ?? "Projet"}
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <ListTodo className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Tâches générales
                </h1>
                <p className="text-sm text-muted-foreground">
                  Tâches du projet qui ne sont rattachées à aucun pôle
                </p>
              </div>
            </div>
          </div>

          <TaskBoard projectId={id} generalScope lockProject lockGroup />
        </div>
      </OrgaLayout>
    </AuthGuard>
  );
}

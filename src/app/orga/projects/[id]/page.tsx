"use client";

import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, CheckCircle2, Circle, CalendarClock, Wallet } from "lucide-react";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OrgaLayout } from "@/components/layout/orga-layout";
import { cn } from "@/lib/utils";
import { dispatchOrgaUpdated } from "@/lib/orga-events";
import { ProjectPolesGrid } from "@/components/orga/project-poles-grid";
import { ProjectUrgentTasksTable } from "@/components/orga/project-urgent-tasks-table";
import { ProjectBudgetPreview } from "@/components/orga/project-budget-preview";
import { projectStatusMeta } from "@/components/orga/task-types";
import type { Project, TaskGroup } from "@/components/orga/task-types";
import { ORGA_DATA_UPDATED_EVENT } from "@/lib/orga-events";

export default function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [notFound, setNotFound] = useState(false);

  const fetchProjectData = useCallback(() => {
    if (!session) return;
    Promise.all([
      fetch(`/api/orga/projects/${id}`),
      fetch(`/api/orga/groups?projectId=${id}`),
    ])
      .then(async ([pRes, gRes]) => {
        if (pRes.ok) {
          setProject(await pRes.json());
        } else {
          setNotFound(true);
        }
        if (gRes.ok) {
          const data = await gRes.json();
          setGroups(Array.isArray(data) ? data : []);
        }
      })
      .catch((e) => console.error("Error fetching project:", e));
  }, [session, id]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  useEffect(() => {
    const handler = () => fetchProjectData();
    window.addEventListener(ORGA_DATA_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ORGA_DATA_UPDATED_EVENT, handler);
  }, [fetchProjectData]);

  const toggleStatus = async () => {
    if (!project) return;
    const next = project.status === "done" ? "active" : "done";
    setProject({ ...project, status: next });
    try {
      await fetch(`/api/orga/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      dispatchOrgaUpdated();
    } catch (e) {
      console.error("Error updating project status:", e);
    }
  };

  return (
    <AuthGuard>
      <OrgaLayout>
        <div className="space-y-4">
          <div>
            <Link
              href="/orga/projects"
              className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Projets
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {project?.color && (
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
              )}
              <h1 className="text-2xl font-bold tracking-tight">
                {project?.name ?? (notFound ? "Projet introuvable" : "…")}
              </h1>
              {project && (
                <button
                  type="button"
                  onClick={toggleStatus}
                  title="Basculer terminé / en cours"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80",
                    projectStatusMeta(project.status).badge
                  )}
                >
                  {project.status === "done" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  {projectStatusMeta(project.status).label}
                </button>
              )}
            </div>
            {project?.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
            {project && (project.endDate || project.budget != null) && (
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
                {project.endDate && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      isPast(new Date(project.endDate)) &&
                        project.status !== "done"
                        ? "font-medium text-red-600"
                        : "text-muted-foreground"
                    )}
                  >
                    <CalendarClock className="h-4 w-4" />
                    Échéance :{" "}
                    {format(new Date(project.endDate), "d MMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                )}
                {project.budget != null && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    Budget : €{project.budget.toFixed(2)}
                  </span>
                )}
              </div>
            )}
          </div>

          {!notFound && (
            <>
              <ProjectPolesGrid projectId={id} />
              <div className="grid gap-3 lg:grid-cols-2 [&>*:only-child]:lg:col-span-2">
                <ProjectUrgentTasksTable projectId={id} />
                {project && (
                  <ProjectBudgetPreview project={project} groups={groups} />
                )}
              </div>
            </>
          )}
        </div>
      </OrgaLayout>
    </AuthGuard>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, FolderKanban, Pencil, Trash2 } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OrgaLayout } from "@/components/layout/orga-layout";
import { usePermissions } from "@/hooks/use-permissions";
import { useGuardedAction } from "@/hooks/use-guarded-action";
import { GuardedActionDialog } from "@/components/permissions/guarded-action-dialog";
import { RestrictedButton } from "@/components/permissions/restricted-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProjectDialog } from "@/components/orga/project-dialog";
import { projectStatusMeta } from "@/components/orga/task-types";
import type { Project } from "@/components/orga/task-types";

export default function ProjectsPage() {
  const { data: session } = useSession();
  const { canEditOrga, orgaDeniedMessage } = usePermissions();
  const orgaGuard = useGuardedAction(canEditOrga, orgaDeniedMessage);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/orga/projects");
      if (res.ok) setProjects(await res.json());
    } catch (e) {
      console.error("Error fetching projects:", e);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (session) fetchProjects();
  }, [session, fetchProjects]);

  const handleNew = orgaGuard.run(() => {
    setEditing(null);
    setDialogOpen(true);
  });

  const handleEdit = orgaGuard.guard((e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    setEditing(project);
    setDialogOpen(true);
  });

  const handleDeleteRequest = orgaGuard.guard((e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    setDeleteTarget(project);
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setDeleteTarget(null);
    try {
      await fetch(`/api/orga/projects/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Error deleting project:", e);
      fetchProjects();
    }
  };

  return (
    <AuthGuard>
      <OrgaLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Projets</h1>
              <p className="text-muted-foreground">
                Organisez vos tâches par projet
              </p>
            </div>
            <RestrictedButton
              allowed={canEditOrga}
              deniedMessage={orgaDeniedMessage}
              onClick={handleNew}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau projet
            </RestrictedButton>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Chargement…
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <FolderKanban className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Aucun projet pour le moment</p>
              <RestrictedButton
                variant="outline"
                className="mt-4"
                allowed={canEditOrga}
                deniedMessage={orgaDeniedMessage}
                onClick={handleNew}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer un projet
              </RestrictedButton>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link key={project.id} href={`/orga/projects/${project.id}`}>
                  <Card
                    className={cn(
                      "group h-full transition-shadow hover:shadow-md",
                      project.status === "done" && "opacity-60"
                    )}
                  >
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: project.color ?? "#94a3b8" }}
                        />
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            projectStatusMeta(project.status).badge
                          )}
                        >
                          {projectStatusMeta(project.status).label}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => handleEdit(e, project)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteRequest(e, project)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {project.description && (
                        <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {project._count?.tasks ?? 0} tâche
                        {(project._count?.tasks ?? 0) > 1 ? "s" : ""}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <ProjectDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            project={editing}
            onSaved={fetchProjects}
          />

          <AlertDialog
            open={!!deleteTarget}
            onOpenChange={(o) => !o && setDeleteTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le projet ?</AlertDialogTitle>
                <AlertDialogDescription>
                  « {deleteTarget?.name} » et toutes ses tâches seront supprimés
                  définitivement.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <GuardedActionDialog
            open={orgaGuard.deniedOpen}
            onOpenChange={orgaGuard.setDeniedOpen}
            message={orgaGuard.deniedMessage}
          />
        </div>
      </OrgaLayout>
    </AuthGuard>
  );
}

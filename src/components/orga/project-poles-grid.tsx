"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Layers,
  ListTodo,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useGuardedAction } from "@/hooks/use-guarded-action";
import { GuardedActionDialog } from "@/components/permissions/guarded-action-dialog";
import { RestrictedButton } from "@/components/permissions/restricted-button";
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
import { dispatchOrgaUpdated, ORGA_DATA_UPDATED_EVENT } from "@/lib/orga-events";
import { GroupDialog } from "./group-dialog";
import type { TaskGroup } from "./task-types";

interface ProjectPolesGridProps {
  projectId: string;
}

const fmt = (v: number) => `€${v.toFixed(2)}`;

export function ProjectPolesGrid({ projectId }: ProjectPolesGridProps) {
  const { canEditOrga, orgaDeniedMessage } = usePermissions();
  const orgaGuard = useGuardedAction(canEditOrga, orgaDeniedMessage);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [generalCount, setGeneralCount] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskGroup | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const [gRes, tRes] = await Promise.all([
        fetch(`/api/orga/groups?projectId=${projectId}`),
        fetch(`/api/orga/tasks?projectId=${projectId}&groupId=none`),
      ]);
      if (gRes.ok) setGroups(await gRes.json());
      if (tRes.ok) {
        const tasks = await tRes.json();
        setGeneralCount(Array.isArray(tasks) ? tasks.length : 0);
      }
    } catch (e) {
      console.error("Error fetching poles:", e);
    }
  }, [projectId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    const handler = () => fetchGroups();
    window.addEventListener(ORGA_DATA_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ORGA_DATA_UPDATED_EVENT, handler);
  }, [fetchGroups]);

  const handleNew = orgaGuard.run(() => {
    setEditing(null);
    setDialogOpen(true);
  });

  const handleEdit = orgaGuard.guard((e: React.MouseEvent, group: TaskGroup) => {
    e.preventDefault();
    setEditing(group);
    setDialogOpen(true);
  });

  const handleDeleteRequest = orgaGuard.guard((e: React.MouseEvent, group: TaskGroup) => {
    e.preventDefault();
    setDeleteTarget(group);
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setDeleteTarget(null);
    try {
      await fetch(`/api/orga/groups/${id}`, { method: "DELETE" });
      dispatchOrgaUpdated();
    } catch (e) {
      console.error("Error deleting pole:", e);
      fetchGroups();
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Layers className="h-5 w-5 text-muted-foreground" />
          Pôles
          <span className="text-sm font-normal text-muted-foreground">
            ({groups.length})
          </span>
        </h2>
        <RestrictedButton
          variant="outline"
          size="sm"
          allowed={canEditOrga}
          deniedMessage={orgaDeniedMessage}
          onClick={handleNew}
        >
          <Plus className="mr-1 h-4 w-4" />
          Nouveau pôle
        </RestrictedButton>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {/* Carte Tâches générales */}
        <Link
          href={`/orga/projects/${projectId}/general`}
          className="group flex flex-col justify-between rounded-xl border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ListTodo className="h-5 w-5" />
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="mt-3">
            <p className="font-medium">Tâches générales</p>
            <p className="text-xs text-muted-foreground">
              {generalCount ?? "…"} tâche
              {(generalCount ?? 0) > 1 ? "s" : ""} hors pôle
            </p>
          </div>
        </Link>

        {/* Cartes pôles */}
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/orga/projects/${projectId}/pole/${g.id}`}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-md"
          >
            <span
              className="absolute inset-x-0 top-0 h-1"
              style={{ backgroundColor: g.color }}
            />
            <div className="flex items-start justify-between">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: g.color }}
              >
                <Layers className="h-5 w-5" />
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => handleEdit(e, g)}
                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                  aria-label={`Modifier ${g.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteRequest(e, g)}
                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-red-600 group-hover:opacity-100"
                  aria-label={`Supprimer ${g.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-3">
              <p className="truncate font-medium">{g.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {g._count?.tasks ?? 0} tâche
                  {(g._count?.tasks ?? 0) > 1 ? "s" : ""}
                </span>
                {g.budget != null && (
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="h-3 w-3" />
                    {fmt(g.budget)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}

        {/* Carte ajout */}
        <button
          type="button"
          onClick={handleNew}
          className={`flex min-h-[112px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground ${!canEditOrga ? "opacity-50" : ""}`}
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm font-medium">Ajouter un pôle</span>
        </button>
      </div>

      <GroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        group={editing}
        onSaved={() => {
          fetchGroups();
          dispatchOrgaUpdated();
        }}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le pôle ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleteTarget?.name} » sera supprimé. Les tâches associées ne
              seront pas supprimées (elles deviendront des tâches générales).
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
    </section>
  );
}

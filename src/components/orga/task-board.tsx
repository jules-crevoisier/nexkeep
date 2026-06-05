"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, List, KanbanSquare, CalendarDays, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { TaskDialog } from "./task-dialog";
import { TaskListView } from "./task-list-view";
import { TaskKanbanView } from "./task-kanban-view";
import { TaskCalendarView } from "./task-calendar-view";
import { StatusManager } from "./status-manager";
import { BlockingPointDialog } from "./blocking-point-dialog";
import {
  type Task,
  type Status,
  type Project,
  type Member,
  type TaskGroup,
} from "./task-types";

type ViewMode = "list" | "kanban" | "calendar";

const VIEWS: { key: ViewMode; label: string; icon: typeof List }[] = [
  { key: "list", label: "Liste", icon: List },
  { key: "kanban", label: "Kanban", icon: KanbanSquare },
  { key: "calendar", label: "Calendrier", icon: CalendarDays },
];

interface TaskBoardProps {
  /** "inbox" pour les tâches courantes, sinon utiliser projectId. */
  scope?: "inbox";
  projectId?: string;
  /** Restreint le board à un pôle précis (page pôle). */
  groupId?: string;
  /** Restreint le board aux tâches générales du projet (sans pôle). */
  generalScope?: boolean;
  showProject?: boolean;
  lockProject?: boolean;
  /** Verrouille / masque le sélecteur de pôle dans le formulaire. */
  lockGroup?: boolean;
  /** Tri initial de la vue liste (par défaut "created"). */
  defaultSort?: "created" | "due" | "priority";
  /** Regroupe la vue liste par projet (accueil multi-projets). */
  groupByProject?: boolean;
  /** Affiche le bandeau récapitulatif des échéances (accueil). */
  showDeadlineSummary?: boolean;
  /** Masque les tâches terminées par défaut. */
  defaultHideDone?: boolean;
}

export function TaskBoard({
  scope,
  projectId,
  groupId,
  generalScope = false,
  showProject = false,
  lockProject = false,
  lockGroup = false,
  defaultSort = "created",
  groupByProject = false,
  showDeadlineSummary = false,
  defaultHideDone = false,
}: TaskBoardProps) {
  const { data: session } = useSession();
  const { canEditOrga, orgaDeniedMessage } = usePermissions();
  const orgaGuard = useGuardedAction(canEditOrga, orgaDeniedMessage);
  const [view, setView] = useState<ViewMode>("list");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [blockingTarget, setBlockingTarget] = useState<{
    task: Task;
    status: Status;
  } | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!session) return;
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    else if (scope === "inbox") params.set("scope", "inbox");
    if (groupId) params.set("groupId", groupId);
    else if (generalScope) params.set("groupId", "none");
    try {
      const res = await fetch(`/api/orga/tasks?${params.toString()}`);
      if (res.ok) setTasks(await res.json());
    } catch (e) {
      console.error("Error fetching tasks:", e);
    }
    setLoading(false);
  }, [session, projectId, scope, groupId, generalScope]);

  const fetchStatuses = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/orga/statuses");
      if (res.ok) setStatuses(await res.json());
    } catch (e) {
      console.error("Error fetching statuses:", e);
    }
  }, [session]);

  const fetchMembers = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/orga/members");
      if (res.ok) setMembers(await res.json());
    } catch (e) {
      console.error("Error fetching members:", e);
    }
  }, [session]);

  const fetchProjects = useCallback(async () => {
    if (!session || lockProject) return;
    try {
      const res = await fetch("/api/orga/projects");
      if (res.ok) setProjects(await res.json());
    } catch (e) {
      console.error("Error fetching projects:", e);
    }
  }, [session, lockProject]);

  const fetchGroups = useCallback(async () => {
    if (!session || !projectId) return;
    try {
      const res = await fetch(`/api/orga/groups?projectId=${projectId}`);
      if (res.ok) setGroups(await res.json());
    } catch (e) {
      console.error("Error fetching groups:", e);
    }
  }, [session, projectId]);

  useEffect(() => {
    if (session) {
      fetchTasks();
      fetchStatuses();
      fetchMembers();
      fetchProjects();
      fetchGroups();
    }
  }, [session, fetchTasks, fetchStatuses, fetchMembers, fetchProjects, fetchGroups]);

  useEffect(() => {
    if (!session || !projectId) return;
    const handler = () => fetchGroups();
    window.addEventListener(ORGA_DATA_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ORGA_DATA_UPDATED_EVENT, handler);
  }, [session, projectId, fetchGroups]);

  const refresh = useCallback(() => {
    fetchTasks();
    dispatchOrgaUpdated();
  }, [fetchTasks]);

  const patchTask = async (
    task: Task,
    body: Record<string, unknown>,
    optimistic?: Partial<Task>
  ) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? ({ ...t, ...body, ...optimistic } as Task) : t
      )
    );
    try {
      await fetch(`/api/orga/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      dispatchOrgaUpdated();
    } catch (e) {
      console.error("Error updating task:", e);
      fetchTasks();
    }
  };

  const applyStatusChange = (
    task: Task,
    target: Status,
    extra?: Record<string, unknown>
  ) => {
    patchTask(
      task,
      { statusId: target.id, ...extra },
      {
        statusId: target.id,
        status: target,
        completedAt: target.isDone ? new Date().toISOString() : null,
        ...(extra as Partial<Task>),
      }
    );
  };

  const handleStatusChange = orgaGuard.guard((task: Task, statusId: string) => {
    const target = statuses.find((s) => s.id === statusId);
    if (!target) return;
    if (target.isBlocked) {
      setBlockingTarget({ task, status: target });
      return;
    }
    applyStatusChange(task, target);
  });

  const confirmBlocking = (blockingPoint: string) => {
    if (!blockingTarget) return;
    applyStatusChange(blockingTarget.task, blockingTarget.status, {
      blockingPoint: blockingPoint || null,
    });
    setBlockingTarget(null);
  };

  const handleToggleSubtask = orgaGuard.guard((subtask: Task) => {
    const doneStatus = statuses.find((s) => s.isDone);
    const defaultStatus = statuses.find((s) => s.isDefault) ?? statuses[0];
    const target = subtask.status?.isDone ? defaultStatus : doneStatus;
    if (!target) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.subtasks?.some((s) => s.id === subtask.id)
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtask.id ? { ...s, statusId: target.id, status: target } : s
              ),
            }
          : t
      )
    );
    fetch(`/api/orga/tasks/${subtask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId: target.id }),
    })
      .then(() => dispatchOrgaUpdated())
      .catch((e) => {
        console.error("Error updating subtask:", e);
        fetchTasks();
      });
  });

  const handleEdit = orgaGuard.guard((task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  });

  const handleNew = orgaGuard.run(() => {
    setEditingTask(null);
    setDialogOpen(true);
  });

  const handleDeleteRequest = orgaGuard.guard((task: Task) => {
    setDeleteTarget(task);
  });

  const handleToggleDone = orgaGuard.guard((task: Task) => {
    const doneStatus = statuses.find((s) => s.isDone);
    const defaultStatus = statuses.find((s) => s.isDefault) ?? statuses[0];
    const isDone = task.status?.isDone;
    const target = isDone ? defaultStatus : doneStatus;
    if (!target) return;
    patchTask(
      task,
      { statusId: target.id },
      { statusId: target.id, status: target, completedAt: target.isDone ? new Date().toISOString() : null }
    );
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDeleteTarget(null);
    try {
      await fetch(`/api/orga/tasks/${id}`, { method: "DELETE" });
      dispatchOrgaUpdated();
    } catch (e) {
      console.error("Error deleting task:", e);
      fetchTasks();
    }
  };

  return (
    <div className="space-y-4">
      {/* Barre d'actions : sélecteur de vue + nouvelle tâche */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === v.key
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <v.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <RestrictedButton
            variant="outline"
            allowed={canEditOrga}
            deniedMessage={orgaDeniedMessage}
            onClick={() => setStatusManagerOpen(true)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Statuts</span>
          </RestrictedButton>
          <RestrictedButton
            allowed={canEditOrga}
            deniedMessage={orgaDeniedMessage}
            onClick={handleNew}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle tâche
          </RestrictedButton>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Chargement…</div>
      ) : view === "list" ? (
        <TaskListView
          tasks={tasks}
          statuses={statuses}
          groups={groups}
          showProject={showProject}
          groupMode={
            groupId || generalScope
              ? "none"
              : !!projectId && groups.length > 0
                ? "pole"
                : groupByProject
                  ? "project"
                  : "none"
          }
          showDeadlineSummary={showDeadlineSummary}
          defaultHideDone={defaultHideDone}
          defaultSort={defaultSort}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onToggleDone={handleToggleDone}
          onToggleSubtask={handleToggleSubtask}
        />
      ) : view === "kanban" ? (
        <TaskKanbanView
          tasks={tasks}
          statuses={statuses}
          showProject={showProject}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onToggleDone={handleToggleDone}
          onToggleSubtask={handleToggleSubtask}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <TaskCalendarView tasks={tasks} onEdit={handleEdit} />
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        defaultProjectId={projectId ?? null}
        defaultGroupId={groupId ?? null}
        projects={projects}
        statuses={statuses}
        members={members}
        groups={groups}
        lockProject={lockProject}
        lockGroup={lockGroup}
        onSaved={refresh}
      />

      <StatusManager
        open={statusManagerOpen}
        onOpenChange={setStatusManagerOpen}
        statuses={statuses}
        onChanged={fetchStatuses}
      />

      <BlockingPointDialog
        open={!!blockingTarget}
        onOpenChange={(o) => !o && setBlockingTarget(null)}
        statusName={blockingTarget?.status.name}
        initialValue={blockingTarget?.task.blockingPoint ?? ""}
        onConfirm={confirmBlocking}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la tâche ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleteTarget?.title} » sera définitivement supprimée.
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
  );
}

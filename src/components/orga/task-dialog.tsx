"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import {
  type Task,
  type Project,
  type Status,
  type Member,
  type TaskGroup,
  PRIORITY_ORDER,
  PRIORITY_META,
} from "./task-types";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tâche à éditer (sinon création). */
  task?: Task | null;
  /** Projet courant (board projet). null = tâche courante. */
  defaultProjectId?: string | null;
  /** Pôle par défaut d'une nouvelle tâche (page pôle). */
  defaultGroupId?: string | null;
  /** Liste des projets pour le sélecteur (optionnel). */
  projects?: Project[];
  /** Liste des statuts du workflow. */
  statuses?: Status[];
  /** Carnet de membres pour l'attribution. */
  members?: Member[];
  /** Groupes / pôles du projet courant. */
  groups?: TaskGroup[];
  /** Verrouille le sélecteur de projet (board projet). */
  lockProject?: boolean;
  /** Verrouille / masque le sélecteur de pôle (page pôle). */
  lockGroup?: boolean;
  onSaved: () => void;
}

const NO_PROJECT = "__none__";
const NO_GROUP = "__none__";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultProjectId = null,
  defaultGroupId = null,
  projects = [],
  statuses = [],
  members = [],
  groups = [],
  lockProject = false,
  lockGroup = false,
  onSaved,
}: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState("");
  const [blockingPoint, setBlockingPoint] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState<string>(NO_PROJECT);
  const [groupId, setGroupId] = useState<string>(NO_GROUP);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [subBusy, setSubBusy] = useState(false);

  const defaultStatusId =
    statuses.find((s) => s.isDefault)?.id ?? statuses[0]?.id ?? "";
  const doneStatusId = statuses.find((s) => s.isDone)?.id ?? "";
  const selectedStatus = statuses.find((s) => s.id === statusId);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setStatusId(task.statusId ?? defaultStatusId);
      setBlockingPoint(task.blockingPoint ?? "");
      setPriority(task.priority);
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
      setProjectId(task.projectId ?? NO_PROJECT);
      setGroupId(task.groupId ?? NO_GROUP);
      setAssigneeIds(task.assignees?.map((a) => a.member.id) ?? []);
      setSubtasks(task.subtasks ?? []);
    } else {
      setTitle("");
      setDescription("");
      setStatusId(defaultStatusId);
      setBlockingPoint("");
      setPriority("medium");
      setDueDate("");
      setProjectId(defaultProjectId ?? NO_PROJECT);
      setGroupId(defaultGroupId ?? NO_GROUP);
      setAssigneeIds([]);
      setSubtasks([]);
    }
    setNewSubtask("");
  }, [open, task, defaultProjectId, defaultGroupId, defaultStatusId]);

  const toggleAssignee = (id: string) =>
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        statusId: statusId || null,
        blockingPoint: selectedStatus?.isBlocked
          ? blockingPoint.trim() || null
          : null,
        priority,
        dueDate: dueDate || null,
        projectId: projectId === NO_PROJECT ? null : projectId,
        groupId: groupId === NO_GROUP ? null : groupId,
        assigneeIds,
      };
      const url = task ? `/api/orga/tasks/${task.id}` : "/api/orga/tasks";
      const method = task ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onOpenChange(false);
        onSaved();
      }
    } catch (err) {
      console.error("Error saving task:", err);
    }
    setSaving(false);
  };

  // --- Sous-tâches (uniquement en édition d'une tâche existante) ---
  const reloadSubtasks = useCallback(async () => {
    if (!task) return;
    try {
      const res = await fetch(`/api/orga/tasks/${task.id}`);
      if (res.ok) {
        const data: Task = await res.json();
        setSubtasks(data.subtasks ?? []);
      }
    } catch (err) {
      console.error("Error reloading subtasks:", err);
    }
  }, [task]);

  const addSubtask = async () => {
    if (!task || !newSubtask.trim()) return;
    setSubBusy(true);
    try {
      await fetch("/api/orga/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtask.trim(),
          parentId: task.id,
          projectId: task.projectId,
        }),
      });
      setNewSubtask("");
      await reloadSubtasks();
    } catch (err) {
      console.error("Error adding subtask:", err);
    }
    setSubBusy(false);
  };

  const toggleSubtask = async (st: Task) => {
    const isDone = st.status?.isDone;
    const target = isDone ? defaultStatusId : doneStatusId;
    if (!target) return;
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === st.id
          ? { ...s, statusId: target, status: statuses.find((x) => x.id === target) }
          : s
      )
    );
    try {
      await fetch(`/api/orga/tasks/${st.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId: target }),
      });
    } catch (err) {
      console.error("Error toggling subtask:", err);
      reloadSubtasks();
    }
  };

  const deleteSubtask = async (st: Task) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== st.id));
    try {
      await fetch(`/api/orga/tasks/${st.id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Error deleting subtask:", err);
      reloadSubtasks();
    }
  };

  const subDone = subtasks.filter((s) => s.status?.isDone).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="task-title">Titre</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Préparer la réunion"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-desc">Description (optionnel)</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ORDER.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedStatus?.isBlocked && (
            <div className="space-y-2">
              <Label
                htmlFor="task-blocking"
                className="flex items-center gap-1 text-amber-700"
              >
                <AlertTriangle className="h-4 w-4" />
                Point bloquant
              </Label>
              <Textarea
                id="task-blocking"
                value={blockingPoint}
                onChange={(e) => setBlockingPoint(e.target.value)}
                placeholder="Qu'est-ce qui bloque cette tâche ?"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="task-due">Échéance</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            {!lockProject && (
              <div className="space-y-2">
                <Label>Projet</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PROJECT}>Aucun (courante)</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {groups.length > 0 && !lockGroup && (
            <div className="space-y-2">
              <Label>Pôle</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>Tâches générales</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {members.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label>Assigné à</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const on = assigneeIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAssignee(m.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-sm transition-colors",
                        on
                          ? "border-transparent bg-muted"
                          : "border-dashed text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: m.color }}
                      >
                        {initials(m.name)}
                      </span>
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {task && (
            <div className="space-y-2 border-t pt-3">
              <Label className="flex items-center justify-between">
                <span>Sous-tâches</span>
                {subtasks.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {subDone}/{subtasks.length}
                  </span>
                )}
              </Label>
              <div className="space-y-1.5">
                {subtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!st.status?.isDone}
                      onChange={() => toggleSubtask(st)}
                      className="h-4 w-4 rounded border-muted-foreground/40"
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        st.status?.isDone &&
                          "text-muted-foreground line-through"
                      )}
                    >
                      {st.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSubtask(st)}
                      className="text-muted-foreground hover:text-red-600"
                      aria-label="Supprimer la sous-tâche"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSubtask();
                    }
                  }}
                  placeholder="Ajouter une sous-tâche…"
                  className="h-8"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addSubtask}
                  disabled={subBusy || !newSubtask.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {task ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, ListTodo, Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";
import {
  type Task,
  type Status,
  type TaskGroup,
  PRIORITY_ORDER,
  PRIORITY_META,
} from "./task-types";

/** Mode de regroupement des tâches en sections. */
type GroupMode = "none" | "pole" | "project";

interface TaskListViewProps {
  tasks: Task[];
  statuses: Status[];
  groups?: TaskGroup[];
  showProject?: boolean;
  /**
   * Affiche les tâches par section :
   * - "pole" : Tâches générales + un bloc par pôle (sur la page projet).
   * - "project" : un bloc par projet + Tâches générales (sur l'accueil).
   */
  groupMode?: GroupMode;
  /** Affiche le bandeau récapitulatif des échéances (accueil). */
  showDeadlineSummary?: boolean;
  /** Masque les tâches terminées par défaut. */
  defaultHideDone?: boolean;
  /** Tri initial (par défaut "created"). */
  defaultSort?: SortKey;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onToggleSubtask?: (subtask: Task) => void;
}

type SortKey = "created" | "due" | "priority";

interface Section {
  key: string;
  name: string;
  color: string;
  tasks: Task[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GENERAL_COLOR = "#94a3b8";

export function TaskListView({
  tasks,
  statuses,
  groups = [],
  showProject,
  groupMode = "none",
  showDeadlineSummary = false,
  defaultHideDone = false,
  defaultSort = "created",
  onEdit,
  onDelete,
  onToggleDone,
  onToggleSubtask,
}: TaskListViewProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>(defaultSort);
  const [hideDone, setHideDone] = useState(defaultHideDone);

  // Filtre pôle utilisé uniquement hors mode "sections par pôle".
  const usePoleFilter = groupMode !== "pole" && groups.length > 0;

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (hideDone) list = list.filter((t) => !t.status?.isDone);
    if (statusFilter !== "all")
      list = list.filter((t) => t.statusId === statusFilter);
    if (priorityFilter !== "all")
      list = list.filter((t) => t.priority === priorityFilter);
    if (usePoleFilter && groupFilter !== "all")
      list = list.filter((t) =>
        groupFilter === "none" ? !t.groupId : t.groupId === groupFilter
      );

    list.sort((a, b) => {
      if (sortKey === "priority") {
        return PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight;
      }
      if (sortKey === "due") {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [
    tasks,
    hideDone,
    statusFilter,
    priorityFilter,
    groupFilter,
    usePoleFilter,
    sortKey,
  ]);

  // Récapitulatif des échéances (calculé sur les tâches ouvertes, non filtrées).
  const summary = useMemo(() => {
    if (!showDeadlineSummary)
      return { overdue: 0, soon: 0, open: 0 };
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTs = startOfToday.getTime();
    const soonTs = todayTs + 7 * MS_PER_DAY;
    let overdue = 0;
    let soon = 0;
    let open = 0;
    for (const t of tasks) {
      if (t.status?.isDone) continue;
      open += 1;
      if (!t.dueDate) continue;
      const due = new Date(t.dueDate).getTime();
      if (due < todayTs) overdue += 1;
      else if (due <= soonTs) soon += 1;
    }
    return { overdue, soon, open };
  }, [tasks, showDeadlineSummary]);

  // Construction des sections selon le mode de regroupement.
  const sections = useMemo<Section[]>(() => {
    if (groupMode === "pole") {
      const general = filtered.filter((t) => !t.groupId);
      const byPole = groups.map((g) => ({
        key: g.id,
        name: g.name,
        color: g.color,
        tasks: filtered.filter((t) => t.groupId === g.id),
      }));
      return [
        { key: "general", name: "Tâches générales", color: GENERAL_COLOR, tasks: general },
        ...byPole,
      ];
    }
    if (groupMode === "project") {
      const general = filtered.filter((t) => !t.projectId);
      const byProject = new Map<string, Section>();
      for (const t of filtered) {
        if (!t.projectId || !t.project) continue;
        const existing = byProject.get(t.projectId);
        if (existing) {
          existing.tasks.push(t);
        } else {
          byProject.set(t.projectId, {
            key: t.projectId,
            name: t.project.name,
            color: t.project.color ?? GENERAL_COLOR,
            tasks: [t],
          });
        }
      }
      const projectSections = Array.from(byProject.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "fr")
      );
      const result: Section[] = [];
      if (general.length > 0)
        result.push({
          key: "general",
          name: "Tâches générales",
          color: GENERAL_COLOR,
          tasks: general,
        });
      return [...result, ...projectSections];
    }
    return [];
  }, [groupMode, filtered, groups]);

  const grouped = groupMode !== "none";

  return (
    <div className="space-y-4">
      {showDeadlineSummary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            icon={AlertTriangle}
            label="En retard"
            value={summary.overdue}
            tone={summary.overdue > 0 ? "danger" : "muted"}
          />
          <SummaryCard
            icon={CalendarClock}
            label="Cette semaine"
            value={summary.soon}
            tone={summary.soon > 0 ? "warning" : "muted"}
          />
          <SummaryCard
            icon={ListTodo}
            label="À faire"
            value={summary.open}
            tone="info"
          />
        </div>
      )}

      {/* Filtres / tri */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Statut</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Priorité</Label>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {PRIORITY_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_META[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {usePoleFilter && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Pôle</Label>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="none">Tâches générales</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Trier par</Label>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Plus récentes</SelectItem>
              <SelectItem value="due">Échéance</SelectItem>
              <SelectItem value="priority">Priorité</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={() => setHideDone((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {hideDone ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {hideDone ? "Terminées masquées" : "Terminées affichées"}
          </span>
        </button>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} tâche{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          Aucune tâche
        </div>
      ) : grouped ? (
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: section.color }}
                />
                <h3 className="text-sm font-semibold">{section.name}</h3>
                <span className="text-xs text-muted-foreground">
                  {section.tasks.length}
                </span>
              </div>
              {section.tasks.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                  Aucune tâche
                </p>
              ) : (
                <div className="space-y-2">
                  {section.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      showProject={showProject}
                      showStatus
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onToggleDone={onToggleDone}
                      onToggleSubtask={onToggleSubtask}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              showProject={showProject}
              showStatus
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleDone={onToggleDone}
              onToggleSubtask={onToggleSubtask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const TONE_STYLES = {
  danger: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  muted: "border-border bg-muted/40 text-muted-foreground",
} as const;

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  tone: keyof typeof TONE_STYLES;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        TONE_STYLES[tone]
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-xs font-medium">{label}</p>
      </div>
    </div>
  );
}

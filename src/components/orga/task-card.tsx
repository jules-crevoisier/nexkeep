"use client";

import { useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  ListChecks,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { type Task, PRIORITY_META, statusStyle } from "./task-types";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onToggleSubtask?: (subtask: Task) => void;
  showProject?: boolean;
  showStatus?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onToggleDone,
  onToggleSubtask,
  showProject = false,
  showStatus = false,
  draggable = false,
  onDragStart,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const prio = PRIORITY_META[task.priority];
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const done = task.status?.isDone ?? false;
  const overdue = due && !done && isPast(due) && !isToday(due);
  const subtasks = task.subtasks ?? [];
  const subDone = subtasks.filter((s) => s.status?.isDone).length;
  const assignees = task.assignees ?? [];
  const blocked = task.status?.isBlocked && task.blockingPoint;

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, task)}
      onDoubleClick={() => onEdit(task)}
      className={cn(
        "group rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        draggable && "cursor-grab active:cursor-grabbing",
        done && "opacity-70"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onToggleDone(task)}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-green-600"
          aria-label={done ? "Marquer à faire" : "Marquer terminé"}
        >
          {done ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium leading-snug break-words",
              done && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          {blocked && (
            <div className="mt-2 flex items-start gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="break-words">{task.blockingPoint}</span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {showStatus && task.status && (
              <Badge
                variant="outline"
                className="text-[10px]"
                style={statusStyle(task.status.color)}
              >
                {task.status.name}
              </Badge>
            )}
            <Badge variant="outline" className={cn("text-[10px]", prio.badge)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", prio.dot)} />
              {prio.label}
            </Badge>
            {task.group && (
              <Badge variant="outline" className="text-[10px]">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: task.group.color }}
                />
                {task.group.name}
              </Badge>
            )}
            {due && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px]",
                  overdue ? "text-red-600 font-medium" : "text-muted-foreground"
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(due, "d MMM", { locale: fr })}
              </span>
            )}
            {subtasks.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                aria-label={expanded ? "Replier les sous-tâches" : "Déplier les sous-tâches"}
              >
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-transform",
                    expanded && "rotate-90"
                  )}
                />
                <ListChecks className="h-3 w-3" />
                {subDone}/{subtasks.length}
              </button>
            )}
            {showProject && task.project && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: task.project.color ?? "#94a3b8" }}
                />
                {task.project.name}
              </span>
            )}
          </div>

          {subtasks.length > 0 && expanded && (
            <div className="mt-2 space-y-1 border-l-2 pl-2">
              {subtasks.map((st) => {
                const stDone = st.status?.isDone ?? false;
                return (
                  <div key={st.id} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={stDone}
                      onChange={() => onToggleSubtask?.(st)}
                      className="h-3.5 w-3.5 rounded border-muted-foreground/40"
                    />
                    <span
                      className={cn(
                        "text-[11px]",
                        stDone && "text-muted-foreground line-through"
                      )}
                    >
                      {st.title}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {assignees.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {assignees.map(({ member }) => (
                <span
                  key={member.id}
                  title={member.email ? `${member.name} · ${member.email}` : member.name}
                  className="inline-flex h-5 items-center gap-1 rounded-full pr-2 text-[10px] font-medium text-white"
                  style={{ backgroundColor: member.color }}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/15">
                    {initials(member.name)}
                  </span>
                  <span className="max-w-[80px] truncate">{member.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Modifier"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
            aria-label="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

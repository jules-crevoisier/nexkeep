"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";
import { type Task, type Status } from "./task-types";

interface TaskKanbanViewProps {
  tasks: Task[];
  statuses: Status[];
  showProject?: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onToggleSubtask?: (subtask: Task) => void;
  onStatusChange: (task: Task, statusId: string) => void;
}

export function TaskKanbanView({
  tasks,
  statuses,
  showProject,
  onEdit,
  onDelete,
  onToggleDone,
  onToggleSubtask,
  onStatusChange,
}: TaskKanbanViewProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDragId(task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (statusId: string) => {
    setOverCol(null);
    const task = tasks.find((t) => t.id === dragId);
    setDragId(null);
    if (task && task.statusId !== statusId) {
      onStatusChange(task, statusId);
    }
  };

  const defaultStatusId = statuses.find((s) => s.isDefault)?.id ?? statuses[0]?.id;

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      style={{
        gridTemplateColumns:
          statuses.length > 0
            ? `repeat(${statuses.length}, minmax(220px, 1fr))`
            : undefined,
      }}
    >
      {statuses.map((status) => {
        const colTasks = tasks.filter(
          (t) => (t.statusId ?? defaultStatusId) === status.id
        );
        return (
          <div
            key={status.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(status.id);
            }}
            onDragLeave={() => setOverCol((c) => (c === status.id ? null : c))}
            onDrop={() => handleDrop(status.id)}
            className={cn(
              "flex flex-col rounded-lg border-t-4 bg-muted/40 p-3 transition-colors",
              overCol === status.id && "bg-muted ring-2 ring-primary/40"
            )}
            style={{ borderTopColor: status.color }}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-semibold">{status.name}</span>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {colTasks.length}
              </span>
            </div>
            <div className="flex min-h-[120px] flex-col gap-2">
              {colTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  showProject={showProject}
                  draggable
                  onDragStart={handleDragStart}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleDone={onToggleDone}
                  onToggleSubtask={onToggleSubtask}
                />
              ))}
              {colTasks.length === 0 && (
                <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                  Déposer ici
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

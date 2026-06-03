"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { format, differenceInCalendarDays, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  type Task,
  PRIORITY_META,
  statusStyle,
} from "./task-types";
import { ORGA_DATA_UPDATED_EVENT } from "@/lib/orga-events";
import { CollapsibleSection } from "./collapsible-section";

const SHORT_DEADLINE_DAYS = 7;

function isUrgentOrSoon(task: Task): boolean {
  if (task.status?.isDone) return false;
  if (task.priority === "urgent") return true;
  if (!task.dueDate) return false;
  const days = differenceInCalendarDays(new Date(task.dueDate), new Date());
  return days <= SHORT_DEADLINE_DAYS;
}

function dueLabel(task: Task): { text: string; tone: "danger" | "warning" | "muted" } {
  if (!task.dueDate) return { text: "—", tone: "muted" };
  const due = new Date(task.dueDate);
  const text = format(due, "d MMM", { locale: fr });
  if (isPast(due) && !isToday(due)) {
    return { text: `${text} · retard`, tone: "danger" };
  }
  const days = differenceInCalendarDays(due, new Date());
  if (days <= SHORT_DEADLINE_DAYS) {
    return {
      text: days === 0 ? `${text} · auj.` : `${text} · J+${days}`,
      tone: "warning",
    };
  }
  return { text, tone: "muted" };
}

function taskHref(projectId: string, task: Task): string {
  if (task.groupId) {
    return `/orga/projects/${projectId}/pole/${task.groupId}`;
  }
  return `/orga/projects/${projectId}/general`;
}

interface ProjectUrgentTasksTableProps {
  projectId: string;
}

export function ProjectUrgentTasksTable({ projectId }: ProjectUrgentTasksTableProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/orga/tasks?projectId=${projectId}`);
      if (res.ok) {
        const data: Task[] = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching project tasks:", e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const handler = () => fetchTasks();
    window.addEventListener(ORGA_DATA_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ORGA_DATA_UPDATED_EVENT, handler);
  }, [fetchTasks]);

  const rows = useMemo(
    () =>
      tasks
        .filter(isUrgentOrSoon)
        .sort((a, b) => {
          if (a.priority === "urgent" && b.priority !== "urgent") return -1;
          if (b.priority === "urgent" && a.priority !== "urgent") return 1;
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return ad - bd;
        }),
    [tasks]
  );

  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <CollapsibleSection
      title="Priorités & échéances"
      icon={<AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
      badge={rows.length}
      summary="Urgent ou sous 7 jours"
      defaultOpen={rows.length <= 3}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8">Tâche</TableHead>
            <TableHead className="h-8 hidden sm:table-cell">Pôle</TableHead>
            <TableHead className="h-8">Priorité</TableHead>
            <TableHead className="h-8 hidden md:table-cell">Échéance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((task) => {
            const prio = PRIORITY_META[task.priority];
            const due = dueLabel(task);
            return (
              <TableRow key={task.id}>
                <TableCell className="py-2">
                  <Link
                    href={taskHref(projectId, task)}
                    className="text-sm font-medium hover:underline"
                  >
                    {task.title}
                  </Link>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground md:hidden">
                    {task.dueDate && <CalendarClock className="h-3 w-3" />}
                    {due.text}
                  </span>
                </TableCell>
                <TableCell className="hidden py-2 sm:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {task.group?.name ?? "Général"}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", prio.badge)}
                  >
                    {prio.label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden py-2 md:table-cell">
                  <span
                    className={cn(
                      "text-sm",
                      due.tone === "danger" && "font-medium text-red-600",
                      due.tone === "warning" && "text-amber-700"
                    )}
                  >
                    {due.text}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </CollapsibleSection>
  );
}

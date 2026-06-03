"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Pencil,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OrgaLayout } from "@/components/layout/orga-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProjectDialog } from "@/components/orga/project-dialog";
import {
  projectStatusMeta,
  PROJECT_STATUS_ORDER,
  PROJECT_STATUS_META,
} from "@/components/orga/task-types";
import type { Project, ProjectStatus } from "@/components/orga/task-types";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function PlanningPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [defaultDate, setDefaultDate] = useState("");

  const fetchProjects = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/orga/projects");
      if (res.ok) setProjects(await res.json());
    } catch (e) {
      console.error("Error fetching projects:", e);
    }
  }, [session]);

  useEffect(() => {
    if (session) fetchProjects();
  }, [session, fetchProjects]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const projectsByDay = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of projects) {
      if (!p.endDate) continue;
      const key = format(new Date(p.endDate), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [projects]);

  const undated = useMemo(() => projects.filter((p) => !p.endDate), [projects]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) counts[p.status] = (counts[p.status] ?? 0) + 1;
    return counts;
  }, [projects]);

  const openNewIdea = (endDate = "") => {
    setEditing(null);
    setDefaultDate(endDate);
    setDialogOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setDefaultDate("");
    setDialogOpen(true);
  };

  return (
    <AuthGuard>
      <OrgaLayout>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Planning</h1>
              <p className="text-muted-foreground">
                Vos projets et idées placés dans le calendrier
              </p>
            </div>
            <Button onClick={() => openNewIdea()}>
              <Lightbulb className="mr-2 h-4 w-4" />
              Nouvelle idée
            </Button>
          </div>

          {/* Légende des statuts */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {PROJECT_STATUS_ORDER.map((s: ProjectStatus) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    PROJECT_STATUS_META[s].dot
                  )}
                />
                {PROJECT_STATUS_META[s].label}
                <span className="font-medium text-foreground">
                  {statusCounts[s] ?? 0}
                </span>
              </span>
            ))}
          </div>

          {/* En-tête du calendrier */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize">
              {format(month, "MMMM yyyy", { locale: fr })}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonth((m) => subMonths(m, 1))}
                aria-label="Mois précédent"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonth(startOfMonth(new Date()))}
              >
                Aujourd&apos;hui
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonth((m) => addMonths(m, 1))}
                aria-label="Mois suivant"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendrier */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="grid grid-cols-7 border-b bg-muted/40">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayProjects = projectsByDay.get(key) ?? [];
                const inMonth = isSameMonth(day, month);
                const today = isToday(day);
                return (
                  <div
                    key={key}
                    onClick={() => openNewIdea(key)}
                    className={cn(
                      "group/day min-h-[104px] cursor-pointer border-b border-r p-1.5 transition-colors last:border-r-0 hover:bg-muted/40 [&:nth-child(7n)]:border-r-0",
                      !inMonth && "bg-muted/20 text-muted-foreground"
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                          today && "bg-primary font-semibold text-primary-foreground",
                          !inMonth && !today && "text-muted-foreground/60"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      <Lightbulb className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover/day:opacity-100" />
                    </div>
                    <div className="space-y-1">
                      {dayProjects.map((p) => {
                        const meta = projectStatusMeta(p.status);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/orga/projects/${p.id}`);
                            }}
                            className={cn(
                              "group/chip flex w-full items-center gap-1 rounded-md border-l-2 bg-muted/60 px-1.5 py-1 text-left text-[11px] transition-colors hover:bg-muted"
                            )}
                            style={{ borderColor: p.color ?? "#94a3b8" }}
                            title={`${p.name} — ${meta.label}`}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                meta.dot
                              )}
                            />
                            <span className="flex-1 truncate">{p.name}</span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(p);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.stopPropagation();
                                  openEdit(p);
                                }
                              }}
                              className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/chip:opacity-100"
                              aria-label={`Modifier ${p.name}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Astuce : cliquez sur un jour pour y ajouter une idée de projet.
          </p>

          {/* Projets sans date envisagée */}
          {undated.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Sans date envisagée ({undated.length})
              </h2>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {undated.map((p) => {
                  const meta = projectStatusMeta(p.status);
                  return (
                    <div
                      key={p.id}
                      className="group/chip flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors hover:bg-muted"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color ?? "#94a3b8" }}
                      />
                      <button
                        type="button"
                        onClick={() => router.push(`/orga/projects/${p.id}`)}
                        className="flex-1 truncate text-left hover:underline"
                      >
                        {p.name}
                      </button>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                          meta.badge
                        )}
                      >
                        {meta.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/chip:opacity-100"
                        aria-label={`Modifier ${p.name}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <ProjectDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            project={editing}
            defaultStatus="idea"
            defaultEndDate={defaultDate}
            onSaved={fetchProjects}
          />
        </div>
      </OrgaLayout>
    </AuthGuard>
  );
}

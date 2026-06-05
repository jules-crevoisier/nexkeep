"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ORGA_DATA_UPDATED_EVENT } from "@/lib/orga-events";
import {
  Home,
  CalendarRange,
  FolderKanban,
  LogOut,
  X,
  ListTodo,
  AlertCircle,
  Search,
} from "lucide-react";

const navigation = [
  { name: "Accueil", href: "/orga", icon: Home },
  { name: "Planning", href: "/orga/planning", icon: CalendarRange },
  { name: "Projets", href: "/orga/projects", icon: FolderKanban },
];

interface OrgaSidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Ouvre la palette de recherche (Cmd/Ctrl+K). */
  onSearch?: () => void;
}

interface TaskStat {
  status: { isDone: boolean } | null;
  dueDate: string | null;
}

interface ActiveProject {
  id: string;
  name: string;
  color: string | null;
}

export function OrgaSidebar({ open, onOpenChange, onSearch }: OrgaSidebarProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = useCallback(
    (value: boolean) => {
      if (isControlled) onOpenChange?.(value);
      else setInternalOpen(value);
    },
    [isControlled, onOpenChange]
  );
  const pathname = usePathname();
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<TaskStat[]>([]);
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);

  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      const [tRes, pRes] = await Promise.all([
        fetch("/api/orga/tasks"),
        fetch("/api/orga/projects?status=active"),
      ]);
      if (tRes.ok) {
        const data = await tRes.json();
        setTasks(Array.isArray(data) ? data : []);
      }
      if (pRes.ok) {
        const data = await pRes.json();
        setActiveProjects(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching sidebar data:", e);
    }
  }, [session]);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  useEffect(() => {
    const handler = () => {
      if (session) fetchData();
    };
    window.addEventListener(ORGA_DATA_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ORGA_DATA_UPDATED_EVENT, handler);
  }, [session, fetchData]);

  const now = new Date();
  const openTasks = tasks.filter((t) => !t.status?.isDone);
  const todoCount = openTasks.length;
  const overdueCount = openTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now
  ).length;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <span className="text-2xl font-bold font-nunito text-primary">
              Organisation
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User info */}
          {session && (
            <div className="p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {session.user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">Module tâches</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1">
            <nav className="p-4 space-y-2">
              {onSearch && (
                <button
                  type="button"
                  onClick={onSearch}
                  className="flex w-full items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Search className="h-4 w-4" />
                  <span className="flex-1 text-left">Rechercher…</span>
                  <kbd className="pointer-events-none hidden rounded border bg-background px-1.5 font-mono text-[10px] sm:inline">
                    ⌘K
                  </kbd>
                </button>
              )}
              {navigation.map((item) => {
                const isActive =
                  item.href === "/orga"
                    ? pathname === "/orga"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {activeProjects.length > 0 && (
                <div className="pt-4">
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Projets en cours
                  </p>
                  {activeProjects.map((project) => {
                    const href = `/orga/projects/${project.id}`;
                    const isActive = pathname === href;
                    return (
                      <Link
                        key={project.id}
                        href={href}
                        className={cn(
                          "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors",
                          isActive
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: project.color ?? "#94a3b8" }}
                        />
                        <span className="truncate">{project.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </nav>
          </ScrollArea>

          {/* Quick stats */}
          {session && (
            <div className="p-4 border-t">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <ListTodo className="h-4 w-4 text-blue-600" />
                    <span className="text-muted-foreground">À faire</span>
                  </div>
                  <span className="font-medium">{todoCount}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-muted-foreground">En retard</span>
                  </div>
                  <span
                    className={cn(
                      "font-medium",
                      overdueCount > 0 ? "text-red-600" : "text-foreground"
                    )}
                  >
                    {overdueCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          {session && (
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Se déconnecter
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

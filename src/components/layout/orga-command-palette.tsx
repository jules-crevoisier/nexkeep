"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home,
  CalendarRange,
  FolderKanban,
  Users,
  Search,
  ListTodo,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  group: string;
  icon: LucideIcon;
  color?: string;
  keywords?: string;
  href: string;
}

interface ProjectLite {
  id: string;
  name: string;
  color: string | null;
}

interface TaskLite {
  id: string;
  title: string;
  projectId: string | null;
  project?: { id: string; name: string } | null;
}

interface MemberLite {
  id: string;
  name: string;
  email: string | null;
}

const NAV_ITEMS: CommandItem[] = [
  {
    id: "nav-home",
    label: "Accueil",
    group: "Navigation",
    icon: Home,
    href: "/orga",
    keywords: "taches dashboard",
  },
  {
    id: "nav-planning",
    label: "Planning",
    group: "Navigation",
    icon: CalendarRange,
    href: "/orga/planning",
    keywords: "calendrier idees projets annee",
  },
  {
    id: "nav-projects",
    label: "Projets",
    group: "Navigation",
    icon: FolderKanban,
    href: "/orga/projects",
    keywords: "poles",
  },
  {
    id: "nav-members",
    label: "Membres",
    group: "Navigation",
    icon: Users,
    href: "/orga/membres",
    keywords: "equipe assignation",
  },
];

interface OrgaCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrgaCommandPalette({
  open,
  onOpenChange,
}: OrgaCommandPaletteProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [members, setMembers] = useState<MemberLite[]>([]);

  // Raccourci global Ctrl/⌘+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Chargement des données à l'ouverture
  useEffect(() => {
    if (!open || !session) return;
    setQuery("");
    setActive(0);
    (async () => {
      try {
        const [pRes, tRes, mRes] = await Promise.all([
          fetch("/api/orga/projects"),
          fetch("/api/orga/tasks"),
          fetch("/api/orga/members"),
        ]);
        if (pRes.ok) setProjects(await pRes.json());
        if (tRes.ok) setTasks(await tRes.json());
        if (mRes.ok) setMembers(await mRes.json());
      } catch (e) {
        console.error("Error loading command palette data:", e);
      }
    })();
  }, [open, session]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const items = useMemo<CommandItem[]>(() => {
    const projectItems: CommandItem[] = projects.map((p) => ({
      id: `project-${p.id}`,
      label: p.name,
      group: "Projets",
      icon: FolderKanban,
      color: p.color ?? undefined,
      href: `/orga/projects/${p.id}`,
    }));
    const taskItems: CommandItem[] = tasks.map((t) => ({
      id: `task-${t.id}`,
      label: t.title,
      sublabel: t.project?.name ?? "Tâche générale",
      group: "Tâches",
      icon: ListTodo,
      href: t.projectId ? `/orga/projects/${t.projectId}` : "/orga",
    }));
    const memberItems: CommandItem[] = members.map((m) => ({
      id: `member-${m.id}`,
      label: m.name,
      sublabel: m.email ?? undefined,
      group: "Membres",
      icon: Users,
      href: "/orga/membres",
    }));
    return [...NAV_ITEMS, ...projectItems, ...taskItems, ...memberItems];
  }, [projects, tasks, members]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_ITEMS;
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        (it.sublabel ?? "").toLowerCase().includes(q) ||
        (it.keywords ?? "").toLowerCase().includes(q)
    );
  }, [query, items]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[active];
      if (target) go(target.href);
    }
  };

  // Regroupe les résultats par section, en conservant l'ordre global pour l'index actif.
  let runningIndex = -1;
  const groups = results.reduce<Record<string, { item: CommandItem; index: number }[]>>(
    (acc, item) => {
      runningIndex += 1;
      (acc[item.group] ??= []).push({ item, index: runningIndex });
      return acc;
    },
    {}
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Rechercher</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Rechercher une page, un projet, une tâche…"
            className="border-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Aucun résultat
            </p>
          ) : (
            Object.entries(groups).map(([groupName, entries]) => (
              <div key={groupName} className="mb-1">
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {groupName}
                </p>
                {entries.map(({ item, index }) => (
                  <button
                    key={item.id}
                    onClick={() => go(item.href)}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      index === active
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {item.color ? (
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    ) : (
                      <item.icon className="h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.sublabel && (
                      <span
                        className={cn(
                          "truncate text-xs",
                          index === active
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {item.sublabel}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Status {
  id: string;
  name: string;
  color: string;
  position: number;
  isDefault: boolean;
  isDone: boolean;
  isBlocked: boolean;
}

export interface Member {
  id: string;
  name: string;
  email: string | null;
  color: string;
}

export interface TaskProjectRef {
  id: string;
  name: string;
  color: string | null;
}

export interface TaskGroupRef {
  id: string;
  name: string;
  color: string;
}

export interface TaskGroup {
  id: string;
  name: string;
  color: string;
  budget: number | null;
  position: number;
  projectId: string;
  _count?: { tasks: number };
}

export interface TaskAssignee {
  member: Member;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  statusId: string | null;
  status?: Status | null;
  priority: TaskPriority;
  blockingPoint: string | null;
  dueDate: string | null;
  position: number;
  completedAt: string | null;
  projectId: string | null;
  project?: TaskProjectRef | null;
  groupId: string | null;
  group?: TaskGroupRef | null;
  parentId: string | null;
  assignees?: TaskAssignee[];
  subtasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = "idea" | "planned" | "active" | "done";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  status: string; // ProjectStatus : "idea" | "planned" | "active" | "done"
  budget: number | null;
  endDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
}

/** Métadonnées d'affichage des statuts de projet (libellé + couleurs de badge). */
export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; badge: string; dot: string }
> = {
  idea: {
    label: "Idée",
    badge: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
  },
  planned: {
    label: "Planifié",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  active: {
    label: "En cours",
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  done: {
    label: "Terminé",
    badge: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "idea",
  "planned",
  "active",
  "done",
];

export function projectStatusMeta(status: string) {
  return (
    PROJECT_STATUS_META[status as ProjectStatus] ?? PROJECT_STATUS_META.active
  );
}

/** Style d'un badge de statut à partir de sa couleur hex (fond translucide + texte). */
export function statusStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: `${color}1a`, // ~10% opacité
    color,
    borderColor: `${color}40`,
  };
}

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; badge: string; dot: string; weight: number }
> = {
  low: {
    label: "Basse",
    badge: "bg-zinc-100 text-zinc-600 border-zinc-200",
    dot: "bg-zinc-400",
    weight: 0,
  },
  medium: {
    label: "Moyenne",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
    weight: 1,
  },
  high: {
    label: "Haute",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
    weight: 2,
  },
  urgent: {
    label: "Urgente",
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    weight: 3,
  },
};

export const PRIORITY_ORDER: TaskPriority[] = ["low", "medium", "high", "urgent"];

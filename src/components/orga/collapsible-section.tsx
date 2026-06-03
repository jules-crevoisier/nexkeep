"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  /** Pastille à droite du titre (ex. nombre de tâches). */
  badge?: string | number;
  /** Contenu affiché à côté du titre quand la section est repliée. */
  summary?: ReactNode;
  /** Actions visibles même repliées (ex. export). */
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  icon,
  badge,
  summary,
  actions,
  defaultOpen = false,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          {icon}
          <span className="truncate text-sm font-semibold">{title}</span>
          {badge !== undefined && badge !== "" && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
              {badge}
            </span>
          )}
          {!open && summary && (
            <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">
              {summary}
            </span>
          )}
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        {actions && (
          <div
            className="flex shrink-0 items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
      {open && <div className="border-t px-3 pb-3 pt-2 sm:px-4">{children}</div>}
    </section>
  );
}

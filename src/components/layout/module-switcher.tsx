"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, CheckSquare, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupTool {
  name: string;
  /** Premier segment d'URL identifiant l'outil. */
  segment: string;
  href: string;
  icon: LucideIcon;
}

/** Outils du groupe — ajouter ici les futurs modules. */
const GROUP_TOOLS: GroupTool[] = [
  { name: "Trésorerie", segment: "tresorerie", href: "/tresorerie", icon: Wallet },
  { name: "Organisation", segment: "orga", href: "/orga", icon: CheckSquare },
];

export function ModuleSwitcher() {
  const pathname = usePathname();
  const current = pathname.split("/").filter(Boolean)[0] ?? "";

  return (
    <div className="flex h-10 w-full items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-3 text-zinc-200">
      <span className="mr-2 select-none text-xs font-semibold uppercase tracking-wider text-zinc-400">
        NexKeep
      </span>
      <div className="h-4 w-px bg-zinc-700" />
      <nav className="flex items-center gap-1 pl-2">
        {GROUP_TOOLS.map((tool) => {
          const active = current === tool.segment;
          return (
            <Link
              key={tool.segment}
              href={tool.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              )}
            >
              <tool.icon className="h-3.5 w-3.5" />
              <span>{tool.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

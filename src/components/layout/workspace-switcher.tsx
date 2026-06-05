"use client";

import Link from "next/link";
import { Building2, Check, ChevronsUpDown, Plus, LayoutGrid, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const { workspaces, active, invitations, switchWorkspace, loading } = useWorkspace();

  // Changement d'organisation : on bascule le cookie puis on recharge la page
  // courante pour que tous les composants refassent leurs requêtes avec le
  // nouveau tenant (les fetch au montage ne se relancent pas via router.refresh).
  const handleSwitch = async (id: string) => {
    if (id === active?.id) return;
    await switchWorkspace(id);
    window.location.reload();
  };

  if (loading && !active) {
    return (
      <div className="h-7 w-32 animate-pulse rounded-md bg-zinc-800" aria-hidden />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          <Building2 className="h-3.5 w-3.5 text-zinc-400" />
          <span className="max-w-[140px] truncate">{active?.name ?? "Organisation"}</span>
          {invitations.length > 0 && (
            <span className="ml-1 rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
              {invitations.length}
            </span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organisations</DropdownMenuLabel>
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => handleSwitch(ws.id)}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{ws.name}</span>
            </span>
            {ws.id === active?.id && <Check className="h-4 w-4 text-blue-600" />}
          </DropdownMenuItem>
        ))}
        {workspaces.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">Aucune organisation</div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/hub" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span>Hub des organisations</span>
            {invitations.length > 0 && (
              <span className={cn("ml-auto rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white")}>
                {invitations.length}
              </span>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/hub?new=1" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Nouvelle organisation</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/parametres" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Paramètres</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

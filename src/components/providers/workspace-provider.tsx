"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type TreasuryAccess = "NONE" | "READ" | "WRITE";
export type OrgaScope = "FULL" | "PROJECTS_ONLY";

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: WorkspaceRole;
  treasuryAccess: TreasuryAccess;
  orgaScope: OrgaScope;
  canAccessInbox: boolean;
  memberCount: number;
}

export interface ActiveWorkspace {
  id: string;
  name: string;
  role: WorkspaceRole;
  treasuryAccess: TreasuryAccess;
  orgaScope: OrgaScope;
  canAccessInbox: boolean;
}

export interface PendingInvitation {
  token: string;
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  treasuryAccess: TreasuryAccess;
  expiresAt: string;
}

interface WorkspaceContextValue {
  loading: boolean;
  workspaces: WorkspaceSummary[];
  active: ActiveWorkspace | null;
  invitations: PendingInvitation[];
  refresh: () => Promise<void>;
  switchWorkspace: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [active, setActive] = useState<ActiveWorkspace | null>(null);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [listRes, activeRes] = await Promise.all([
        fetch("/api/workspaces"),
        fetch("/api/workspaces/active"),
      ]);
      if (listRes.ok) {
        const data = await listRes.json();
        setWorkspaces(data.workspaces ?? []);
        setInvitations(data.invitations ?? []);
      }
      if (activeRes.ok) {
        setActive(await activeRes.json());
      } else {
        setActive(null);
      }
    } catch {
      // silencieux : l'UI gère l'absence de données
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      refresh();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, refresh]);

  const switchWorkspace = useCallback(
    async (id: string) => {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: id }),
      });
      if (res.ok) {
        await refresh();
        router.refresh();
      }
    },
    [refresh, router]
  );

  return (
    <WorkspaceContext.Provider
      value={{ loading, workspaces, active, invitations, refresh, switchWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace doit être utilisé dans WorkspaceProvider");
  return ctx;
}

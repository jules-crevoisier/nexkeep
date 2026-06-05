"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { FolderKanban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrgaScope = "FULL" | "PROJECTS_ONLY";
type ProjectAccess = "VIEWER" | "CONTRIBUTOR" | "MANAGER";

interface ProjectRow {
  id: string;
  name: string;
  color: string | null;
  isRestricted: boolean;
  access: ProjectAccess | null;
}

interface MemberProjectAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  memberId: string;
  memberName: string;
  onSaved: () => void;
}

const SCOPE_LABELS: Record<OrgaScope, string> = {
  FULL: "Tous les projets publics",
  PROJECTS_ONLY: "Projets assignés uniquement",
};

const ACCESS_LABELS: Record<ProjectAccess, string> = {
  VIEWER: "Lecture",
  CONTRIBUTOR: "Contribution",
  MANAGER: "Gestion",
};

export function MemberProjectAccessDialog({
  open,
  onOpenChange,
  workspaceId,
  memberId,
  memberName,
  onSaved,
}: MemberProjectAccessDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgaScope, setOrgaScope] = useState<OrgaScope>("FULL");
  const [canAccessInbox, setCanAccessInbox] = useState(true);
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!workspaceId || !memberId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}/projects`
      );
      if (!res.ok) throw new Error("Chargement impossible");
      const data = await res.json();
      setOrgaScope(data.orgaScope ?? "FULL");
      setCanAccessInbox(data.canAccessInbox ?? true);
      setProjects(data.projects ?? []);
    } catch {
      toast.error("Impossible de charger les accès");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, memberId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const setProjectAccess = (projectId: string, access: ProjectAccess | null) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, access } : p))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const memberPatch = fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgaScope, canAccessInbox }),
        }
      );

      const assignments = projects
        .filter((p) => p.access != null)
        .map((p) => ({ projectId: p.id, access: p.access }));

      const projectsPatch = fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}/projects`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments }),
        }
      );

      const [mRes, pRes] = await Promise.all([memberPatch, projectsPatch]);
      if (!mRes.ok || !pRes.ok) {
        const err = await mRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Enregistrement refusé");
      }

      toast.success("Accès mis à jour");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Accès organisation — {memberName}</DialogTitle>
          <DialogDescription>
            Définissez quels projets et quelles tâches courantes ce membre peut
            consulter.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Chargement…
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Visibilité des projets</Label>
              <Select
                value={orgaScope}
                onValueChange={(v) => setOrgaScope(v as OrgaScope)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SCOPE_LABELS) as OrgaScope[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SCOPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                « Projets publics » = projets non restreints de l&apos;organisation.
                Les projets restreints nécessitent toujours une assignation explicite.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Tâches courantes</p>
                <p className="text-xs text-muted-foreground">
                  Tâches sans projet assigné
                </p>
              </div>
              <Select
                value={canAccessInbox ? "yes" : "no"}
                onValueChange={(v) => setCanAccessInbox(v === "yes")}
              >
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Oui</SelectItem>
                  <SelectItem value="no">Non</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                Assignations par projet
              </Label>
              <p className="text-xs text-muted-foreground">
                Obligatoire en mode « Projets assignés ». Utile aussi pour les
                projets restreints en mode complet.
              </p>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
                {projects.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Aucun projet dans cette organisation
                  </p>
                ) : (
                  projects.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color ?? "#94a3b8" }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {p.name}
                        {p.isRestricted && (
                          <span className="ml-1 text-[10px] text-amber-600">
                            (restreint)
                          </span>
                        )}
                      </span>
                      <Select
                        value={p.access ?? "none"}
                        onValueChange={(v) =>
                          setProjectAccess(
                            p.id,
                            v === "none" ? null : (v as ProjectAccess)
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun</SelectItem>
                          {(Object.keys(ACCESS_LABELS) as ProjectAccess[]).map(
                            (a) => (
                              <SelectItem key={a} value={a}>
                                {ACCESS_LABELS[a]}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

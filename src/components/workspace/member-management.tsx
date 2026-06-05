"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Users, Trash2, Mail, ShieldCheck, Clock, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/components/providers/workspace-provider";

type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
type Treasury = "NONE" | "READ" | "WRITE";

interface WsMember {
  id: string;
  name: string;
  email: string | null;
  color: string;
  role: Role;
  treasuryAccess: Treasury;
  hasAccount: boolean;
}

interface WsInvitation {
  id: string;
  email: string;
  role: Role;
  treasuryAccess: Treasury;
  expiresAt: string;
}

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MEMBER: "Membre",
  VIEWER: "Lecteur",
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Tous les droits, gère et peut supprimer l'organisation.",
  ADMIN: "Gère les membres, les invitations et le contenu.",
  MEMBER: "Crée et modifie le contenu de l'organisation.",
  VIEWER: "Lecture seule, ne peut rien modifier.",
};

const TREASURY_LABELS: Record<Treasury, string> = {
  NONE: "Aucun accès",
  READ: "Lecture",
  WRITE: "Lecture + écriture",
};

const INVITABLE_ROLES: Role[] = ["ADMIN", "MEMBER", "VIEWER"];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function MemberManagement() {
  const { active } = useWorkspace();
  const workspaceId = active?.id ?? null;
  const isAdmin = active?.role === "ADMIN" || active?.role === "OWNER";

  const [members, setMembers] = useState<WsMember[]>([]);
  const [invitations, setInvitations] = useState<WsInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<WsMember | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("MEMBER");
  const [inviteTreasury, setInviteTreasury] = useState<Treasury>("NONE");
  const [inviting, setInviting] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const reqs: Promise<Response>[] = [
        fetch(`/api/workspaces/${workspaceId}/members`),
      ];
      if (isAdmin) reqs.push(fetch(`/api/workspaces/${workspaceId}/invitations`));
      const [mRes, iRes] = await Promise.all(reqs);
      if (mRes.ok) setMembers(await mRes.json());
      if (iRes && iRes.ok) setInvitations(await iRes.json());
    } catch (e) {
      console.error("Erreur chargement membres:", e);
    }
    setLoading(false);
  }, [workspaceId, isAdmin]);

  useEffect(() => {
    if (workspaceId) fetchAll();
  }, [workspaceId, fetchAll]);

  const ownerCount = members.filter((m) => m.role === "OWNER").length;

  const updateMember = async (
    member: WsMember,
    patch: Partial<Pick<WsMember, "role" | "treasuryAccess">>
  ) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, ...patch } : m))
    );
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${member.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error);
      }
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Modification refusée");
      fetchAll();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setMembers((prev) => prev.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error);
      }
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Suppression refusée");
      fetchAll();
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          treasuryAccess: inviteTreasury,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error);
      }
      toast.success("Invitation envoyée");
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("MEMBER");
      setInviteTreasury("NONE");
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Invitation refusée");
    } finally {
      setInviting(false);
    }
  };

  const revokeInvitation = async (inv: WsInvitation) => {
    setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
    try {
      await fetch(`/api/workspaces/${workspaceId}/invitations/${inv.id}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error("Erreur révocation:", e);
      fetchAll();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Membres &amp; rôles</h2>
          <p className="text-sm text-muted-foreground">
            Gérez les membres, leurs rôles et l&apos;accès à la trésorerie
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Inviter
          </Button>
        )}
      </div>

      {/* Légende des rôles et des listes déroulantes */}
      <Card className="bg-muted/40">
        <CardContent className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-blue-600" />
            Comprendre les rôles et les accès
          </p>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            {(["OWNER", "ADMIN", "MEMBER", "VIEWER"] as Role[]).map((r) => (
              <div key={r}>
                <span className="font-medium text-foreground">{ROLE_LABELS[r]}</span>{" "}
                — {ROLE_DESCRIPTIONS[r]}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Liste de gauche</span> = rôle dans
            l&apos;organisation. <span className="font-medium text-foreground">Liste de droite</span> ={" "}
            accès à la trésorerie (indépendant du rôle) : Aucun accès, Lecture, ou Lecture + écriture.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Chargement…</div>
      ) : (
        <>
          {/* Invitations en attente (admin) */}
          {isAdmin && invitations.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Clock className="h-4 w-4" />
                Invitations en attente
              </h3>
              <div className="grid gap-2">
                {invitations.map((inv) => (
                  <Card key={inv.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {ROLE_LABELS[inv.role]} · Trésorerie : {TREASURY_LABELS[inv.treasuryAccess]}
                        </p>
                      </div>
                      <button
                        onClick={() => revokeInvitation(inv)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
                        aria-label="Annuler l'invitation"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Liste des membres */}
          <section className="space-y-3">
            {invitations.length > 0 && isAdmin && (
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Users className="h-4 w-4" />
                Membres actifs
              </h3>
            )}
            <div className="grid gap-3">
              {members.map((member) => {
                const isLastOwner = member.role === "OWNER" && ownerCount <= 1;
                return (
                  <Card key={member.id}>
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                          style={{ backgroundColor: member.color }}
                        >
                          {initials(member.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate font-medium">
                            {member.name}
                            {member.role === "OWNER" && (
                              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                            )}
                          </p>
                          {member.email && (
                            <p className="truncate text-xs text-muted-foreground">
                              {member.email}
                              {!member.hasAccount && " (sans compte)"}
                            </p>
                          )}
                        </div>
                      </div>

                      {isAdmin ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(v) => updateMember(member, { role: v as Role })}
                            disabled={isLastOwner}
                          >
                            <SelectTrigger className="h-8 w-[150px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(["OWNER", "ADMIN", "MEMBER", "VIEWER"] as Role[]).map((r) => (
                                <SelectItem
                                  key={r}
                                  value={r}
                                  disabled={r === "OWNER" && active?.role !== "OWNER"}
                                >
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={member.treasuryAccess}
                            onValueChange={(v) =>
                              updateMember(member, { treasuryAccess: v as Treasury })
                            }
                          >
                            <SelectTrigger className="h-8 w-[170px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(["NONE", "READ", "WRITE"] as Treasury[]).map((t) => (
                                <SelectItem key={t} value={t}>
                                  {TREASURY_LABELS[t]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <button
                            onClick={() => setDeleteTarget(member)}
                            disabled={isLastOwner}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-30"
                            aria-label="Retirer le membre"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-muted px-2 py-1">
                            {ROLE_LABELS[member.role]}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-1">
                            Trésorerie : {TREASURY_LABELS[member.treasuryAccess]}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Dialog d'invitation */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter un membre</DialogTitle>
            <DialogDescription>
              Un email d&apos;invitation sera envoyé. La personne pourra créer un
              compte si elle n&apos;en a pas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="personne@exemple.fr"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Rôle dans l&apos;organisation</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLE_DESCRIPTIONS[inviteRole]}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Accès trésorerie</Label>
              <Select
                value={inviteTreasury}
                onValueChange={(v) => setInviteTreasury(v as Treasury)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["NONE", "READ", "WRITE"] as Treasury[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TREASURY_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Contrôle l&apos;accès à la page Trésorerie, indépendamment du rôle.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? "Envoi…" : "Envoyer l'invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer le membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleteTarget?.name} » perdra l&apos;accès à cette organisation et
              sera retiré de ses tâches assignées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

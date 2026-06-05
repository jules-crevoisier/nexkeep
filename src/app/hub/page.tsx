"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Building2, Plus, Users, Check, Mail, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/components/providers/workspace-provider";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MEMBER: "Membre",
  VIEWER: "Lecteur",
};

function HubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, workspaces, active, invitations, switchWorkspace, refresh } =
    useWorkspace();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [budgetInitial, setBudgetInitial] = useState("");
  const [cashInitial, setCashInitial] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyToken, setBusyToken] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") setCreateOpen(true);
  }, [searchParams]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          budgetInitial: Math.max(0, Number(budgetInitial) || 0),
          cashInitial: Math.max(0, Number(cashInitial) || 0),
        }),
      });
      if (!res.ok) throw new Error();
      const ws = await res.json();
      await switchWorkspace(ws.id);
      toast.success("Organisation créée");
      setCreateOpen(false);
      setName("");
      setBudgetInitial("");
      setCashInitial("");
      router.push("/");
    } catch {
      toast.error("Impossible de créer l'organisation");
    } finally {
      setCreating(false);
    }
  };

  const handleEnter = async (id: string) => {
    await switchWorkspace(id);
    router.push("/");
  };

  const handleAccept = async (token: string) => {
    setBusyToken(token);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      await refresh();
      if (data.workspaceId) await switchWorkspace(data.workspaceId);
      toast.success("Invitation acceptée");
      router.push("/");
    } catch {
      toast.error("Impossible d'accepter l'invitation");
    } finally {
      setBusyToken(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <span className="font-nunito text-xl font-bold text-primary">
            NexKeep
          </span>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Mes organisations
            </h1>
            <p className="text-muted-foreground">
              Choisissez une organisation ou créez-en une nouvelle
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle organisation
          </Button>
        </div>

        {invitations.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Invitations en attente
            </h2>
            <div className="grid gap-3">
              {invitations.map((inv) => (
                <Card key={inv.token} className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900">
                      <Mail className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{inv.workspaceName}</p>
                      <p className="text-xs text-muted-foreground">
                        Invité comme {ROLE_LABELS[inv.role] ?? inv.role}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(inv.token)}
                      disabled={busyToken === inv.token}
                    >
                      {busyToken === inv.token ? "…" : "Accepter"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Chargement…
            </div>
          ) : workspaces.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                Vous n&apos;avez pas encore d&apos;organisation
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer ma première organisation
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {workspaces.map((ws) => (
                <Card
                  key={ws.id}
                  className="group cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => handleEnter(ws.id)}
                >
                  <CardContent className="flex items-center gap-4 p-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate font-semibold">
                        {ws.name}
                        {ws.id === active?.id && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </p>
                      <p className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{ROLE_LABELS[ws.role] ?? ws.role}</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {ws.memberCount}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle organisation</DialogTitle>
            <DialogDescription>
              Donnez un nom à votre organisation. Vous en serez le propriétaire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Nom de l&apos;organisation</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Association Sportive"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ws-bank">Solde banque (€)</Label>
                <Input
                  id="ws-bank"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetInitial}
                  onChange={(e) => setBudgetInitial(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-cash">Solde liquide (€)</Label>
                <Input
                  id="ws-cash"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashInitial}
                  onChange={(e) => setCashInitial(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Soldes de départ optionnels (modifiables ensuite dans les paramètres).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HubPage() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <HubContent />
      </Suspense>
    </AuthGuard>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  Building2,
  Users,
  User,
  Loader2,
  Copy,
  RefreshCw,
  LogOut,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ModuleSwitcher } from "@/components/layout/module-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MemberManagement } from "@/components/workspace/member-management";
import { useWorkspace } from "@/components/providers/workspace-provider";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <ModuleSwitcher />
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </div>
  );
}

function OrganisationTab() {
  const { active, refresh } = useWorkspace();
  const workspaceId = active?.id ?? null;
  const isAdmin = active?.role === "ADMIN" || active?.role === "OWNER";
  const isOwner = active?.role === "OWNER";
  const canReadTreasury = active?.treasuryAccess !== "NONE";
  // Paramètre critique : seuls les admins/propriétaires avec accès écriture
  // peuvent modifier les soldes de départ (recalcul de toute la trésorerie).
  const canWriteTreasury = active?.treasuryAccess === "WRITE";
  const canEditBalances = canWriteTreasury && isAdmin;

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [bank, setBank] = useState("");
  const [cash, setCash] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  const [shareUrl, setShareUrl] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (active) setName(active.name);
  }, [active]);

  useEffect(() => {
    if (!canReadTreasury) return;
    fetch("/api/user/budget")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setBank(String(d.budgetInitial ?? 0));
          setCash(String(d.cashInitial ?? 0));
        }
      })
      .catch(() => {});
    fetch("/api/user/share-token")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.shareUrl) setShareUrl(d.shareUrl);
      })
      .catch(() => {});
  }, [canReadTreasury, workspaceId]);

  const saveName = async () => {
    if (!workspaceId || !name.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      await refresh();
      toast.success("Nom de l'organisation mis à jour");
    } catch {
      toast.error("Impossible de renommer l'organisation");
    } finally {
      setSavingName(false);
    }
  };

  const saveBudget = async () => {
    setSavingBudget(true);
    try {
      const res = await fetch("/api/user/budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetInitial: Math.max(0, Number(bank) || 0),
          cashInitial: Math.max(0, Number(cash) || 0),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Soldes mis à jour");
    } catch {
      toast.error("Impossible de mettre à jour les soldes");
    } finally {
      setSavingBudget(false);
    }
  };

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien copié");
    } catch {
      toast.error("Copie impossible");
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/user/share-token", { method: "POST" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setShareUrl(d.shareUrl);
      toast.success("Lien régénéré");
    } catch {
      toast.error("Impossible de régénérer le lien");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Nom */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Organisation
          </CardTitle>
          <CardDescription>Nom affiché de votre organisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="ws-name">Nom</Label>
          <div className="flex gap-2">
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
            />
            {isAdmin && (
              <Button onClick={saveName} disabled={savingName || !name.trim() || name === active?.name}>
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </Button>
            )}
          </div>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">
              Seuls les administrateurs peuvent renommer l&apos;organisation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Soldes */}
      {canReadTreasury && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Soldes de départ
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="h-3 w-3" /> Critique
              </span>
            </CardTitle>
            <CardDescription>
              Solde initial en banque et en caisse, base des calculs de trésorerie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bank">Solde banque (€)</Label>
                <Input
                  id="bank"
                  type="number"
                  min="0"
                  step="0.01"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  disabled={!canEditBalances}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cash">Solde liquide (€)</Label>
                <Input
                  id="cash"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  disabled={!canEditBalances}
                />
              </div>
            </div>
            {canEditBalances ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={savingBudget}>
                    {savingBudget ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer les soldes"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      Modifier les soldes de départ ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Ces valeurs servent de base à <strong>tous</strong> les calculs de trésorerie
                      (banque {Number(bank || 0).toFixed(2)} € · liquide {Number(cash || 0).toFixed(2)} €).
                      Toute modification recalcule l&apos;ensemble des soldes affichés et sera
                      enregistrée dans le journal d&apos;activité. Continuer ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={saveBudget}>Confirmer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : !canWriteTreasury ? (
              <p className="text-xs text-muted-foreground">
                Vous avez un accès en lecture seule à la trésorerie.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Seuls les administrateurs peuvent modifier les soldes de départ.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lien de partage */}
      {canReadTreasury && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lien de demande de remboursement</CardTitle>
            <CardDescription>
              Partagez ce lien public pour recevoir des demandes de remboursement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="bg-muted" />
              <Button variant="outline" size="icon" onClick={copyShare} disabled={!shareUrl}>
                <Copy className="h-4 w-4" />
              </Button>
              {canWriteTreasury && (
                <Button variant="outline" size="icon" onClick={regenerate} disabled={regenerating}>
                  {regenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {canWriteTreasury && (
              <p className="text-xs text-muted-foreground">
                Régénérer le lien invalide l&apos;ancien.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Zone danger */}
      {isOwner && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Zone de danger
            </CardTitle>
            <CardDescription>
              La suppression de l&apos;organisation est définitive et efface toutes ses données.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteWorkspaceButton workspaceId={workspaceId} name={active?.name ?? ""} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DeleteWorkspaceButton({ workspaceId, name }: { workspaceId: string | null; name: string }) {
  const { refresh } = useWorkspace();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!workspaceId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Organisation supprimée");
      await refresh();
      window.location.href = "/hub";
    } catch {
      toast.error("Impossible de supprimer l'organisation");
      setDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer l&apos;organisation
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {name} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Toutes les données (trésorerie, projets, tâches,
            membres) seront définitivement supprimées.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? "Suppression…" : "Supprimer définitivement"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AccountTab() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Mon compte
          </CardTitle>
          <CardDescription>Informations de votre compte personnel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-email">Email</Label>
            <Input id="account-email" value={session?.user?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">L&apos;email ne peut pas être modifié.</p>
          </div>
          <div className="space-y-2">
            <Label>Thème</Label>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">Choisissez votre thème préféré</span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              signOut({ callbackUrl: "/login" });
            }}
            disabled={loading}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {loading ? "Déconnexion…" : "Se déconnecter"}
          </Button>
        </CardContent>
      </Card>

      <ChangePasswordForm />
    </div>
  );
}

export default function ParametresPage() {
  return (
    <AuthGuard>
      <Shell>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground">
            Gérez votre organisation, les membres et votre compte
          </p>
        </div>

        <Tabs defaultValue="organisation">
          <TabsList className="flex-wrap">
            <TabsTrigger value="organisation">
              <Building2 className="mr-1.5 h-4 w-4" />
              Organisation
            </TabsTrigger>
            <TabsTrigger value="membres">
              <Users className="mr-1.5 h-4 w-4" />
              Membres &amp; rôles
            </TabsTrigger>
            <TabsTrigger value="compte">
              <User className="mr-1.5 h-4 w-4" />
              Mon compte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organisation" className="mt-6">
            <OrganisationTab />
          </TabsContent>
          <TabsContent value="membres" className="mt-6">
            <MemberManagement />
          </TabsContent>
          <TabsContent value="compte" className="mt-6">
            <AccountTab />
          </TabsContent>
        </Tabs>
      </Shell>
    </AuthGuard>
  );
}

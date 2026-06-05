"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Building2, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface InviteInfo {
  valid: boolean;
  status: string;
  email: string;
  workspaceName: string;
  role: string;
  treasuryAccess: string;
  hasAccount: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MEMBER: "Membre",
  VIEWER: "Lecteur",
};

export default function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/invitations/${token}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setInfo(data))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Impossible d'accepter l'invitation");
        setAccepting(false);
        return;
      }
      toast.success(
        data?.alreadyMember
          ? "Vous êtes déjà membre de cette organisation"
          : "Invitation acceptée"
      );
      router.push("/hub");
      router.refresh();
    } catch {
      toast.error("Impossible d'accepter l'invitation");
      setAccepting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        {loading ? (
          <CardContent className="py-12 text-center text-muted-foreground">
            Chargement…
          </CardContent>
        ) : !info || !info.valid ? (
          <>
            <CardHeader className="text-center">
              <Mail className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
              <CardTitle>Invitation indisponible</CardTitle>
              <CardDescription>
                Ce lien d&apos;invitation est invalide, expiré ou a déjà été
                utilisé.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/hub">Retour au hub</Link>
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </span>
              <CardTitle>{info.workspaceName}</CardTitle>
              <CardDescription>
                Vous êtes invité(e) en tant que{" "}
                {ROLE_LABELS[info.role] ?? info.role} ({info.email})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {status === "loading" ? (
                <p className="text-center text-sm text-muted-foreground">…</p>
              ) : session ? (
                session.user?.email?.toLowerCase() ===
                info.email.toLowerCase() ? (
                  <Button
                    className="w-full"
                    onClick={handleAccept}
                    disabled={accepting}
                  >
                    {accepting ? "…" : "Rejoindre l'organisation"}
                  </Button>
                ) : (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    Vous êtes connecté(e) avec un autre compte (
                    {session.user?.email}). Connectez-vous avec {info.email} pour
                    accepter.
                  </p>
                )
              ) : info.hasAccount ? (
                <Button asChild className="w-full">
                  <Link href={`/login?invite=${token}`}>Se connecter pour accepter</Link>
                </Button>
              ) : (
                <>
                  <Button asChild className="w-full">
                    <Link href={`/register?invite=${token}`}>
                      Créer un compte
                    </Link>
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Déjà un compte ?{" "}
                    <Link
                      href={`/login?invite=${token}`}
                      className="text-primary hover:underline"
                    >
                      Se connecter
                    </Link>
                  </p>
                </>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

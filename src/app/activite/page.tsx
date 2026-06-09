"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Activity,
  CheckCircle2,
  CreditCard,
  Mail,
  FolderKanban,
  ListTodo,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ModuleSwitcher } from "@/components/layout/module-switcher";
import { Card, CardContent } from "@/components/ui/card";

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  actorEmail: string | null;
  createdAt: string;
};

const TYPE_META: Record<
  string,
  { icon: typeof Activity; color: string }
> = {
  invitation_sent: { icon: Mail, color: "text-blue-600" },
  invitation_accepted: { icon: UserPlus, color: "text-emerald-600" },
  reimbursement_requested: { icon: CreditCard, color: "text-amber-600" },
  reimbursement_paid: { icon: CheckCircle2, color: "text-green-600" },
  transaction_created: { icon: TrendingUp, color: "text-violet-600" },
  project_created: { icon: FolderKanban, color: "text-indigo-600" },
  task_completed: { icon: ListTodo, color: "text-sky-600" },
  initial_balance_updated: { icon: CreditCard, color: "text-amber-600" },
  inventory_item_created: { icon: ListTodo, color: "text-teal-600" },
  inventory_movement: { icon: TrendingUp, color: "text-teal-600" },
};

function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity?limit=50")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ModuleSwitcher />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Activity className="h-8 w-8 text-primary" />
            Activité
          </h1>
          <p className="mt-1 text-muted-foreground">
            Fil d&apos;événements de votre organisation
          </p>
        </div>

        {loading ? (
          <p className="py-12 text-center text-muted-foreground">Chargement…</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune activité pour le moment.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const meta = TYPE_META[item.type] ?? {
                icon: Activity,
                color: "text-muted-foreground",
              };
              const Icon = meta.icon;
              return (
                <li key={item.id}>
                  <Card>
                    <CardContent className="flex gap-4 p-4">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted ${meta.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                          {item.actorEmail ? ` · ${item.actorEmail}` : ""}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

export default function ActivitePage() {
  return (
    <AuthGuard>
      <ActivityFeed />
    </AuthGuard>
  );
}

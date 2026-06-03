"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { OrgaLayout } from "@/components/layout/orga-layout";
import { TaskBoard } from "@/components/orga/task-board";

export default function OrgaInboxPage() {
  return (
    <AuthGuard>
      <OrgaLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Accueil</h1>
            <p className="text-muted-foreground">
              Vos tâches à faire et celles dont l&apos;échéance approche,
              regroupées par projet
            </p>
          </div>
          <TaskBoard
            showProject
            groupByProject
            showDeadlineSummary
            defaultHideDone
            defaultSort="due"
          />
        </div>
      </OrgaLayout>
    </AuthGuard>
  );
}

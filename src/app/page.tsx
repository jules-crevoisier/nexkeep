"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AuthGuard } from "@/components/auth/auth-guard";
import DashboardPage from "./dashboard/page";

export default function Home() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <DashboardPage />
      </DashboardLayout>
    </AuthGuard>
  );
}
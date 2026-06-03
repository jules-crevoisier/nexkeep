"use client";

import { BarChart3, TrendingUp, TrendingDown, Wallet, Hash } from "lucide-react";
import { useSession } from "next-auth/react";
import { DATA_UPDATED_EVENT } from "@/lib/events";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TransactionsChart } from "@/components/charts/transactions-chart";
import { ComparisonChart } from "@/components/charts/comparison-chart";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton, BlockSkeleton } from "@/components/ui/card-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAcademicYearStart,
  academicYearLabel,
  listAcademicYears,
  filterByAcademicYear,
} from "@/lib/academic-year";
import { computeIncomeExpense } from "@/lib/balances";
import { useState, useEffect } from "react";

interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  account?: string | null;
  category?: string | null;
  date: string;
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [startYear, setStartYear] = useState<number>(getAcademicYearStart(new Date()));

  const fetchData = async () => {
    try {
      const transactionsResponse = await fetch("/api/transactions");
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  useEffect(() => {
    const handleDataUpdate = () => {
      if (session) fetchData();
    };
    window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdate);
    window.addEventListener("budgetUpdated", handleDataUpdate);
    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdate);
      window.removeEventListener("budgetUpdated", handleDataUpdate);
    };
  }, [session]);

  const years = listAcademicYears(transactions);
  const yearTransactions = filterByAcademicYear(transactions, startYear);
  const { income, expenses } = computeIncomeExpense(yearTransactions);
  const net = income - expenses;

  const yearSelector = (
    <Select value={String(startYear)} onValueChange={(v) => setStartYear(Number(v))}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            Année {academicYearLabel(y)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            title="Rapports"
            description="Analyse de l'année scolaire (septembre → août)"
            actions={!loading && transactions.length > 0 ? yearSelector : undefined}
          />

          {loading ? (
            <div className="space-y-6">
              <CardGridSkeleton count={4} />
              <BlockSkeleton />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Aucune donnée disponible"
              description="Ajoutez des transactions pour voir les graphiques et statistiques."
            />
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Revenus"
                  value={`€${income.toFixed(2)}`}
                  icon={TrendingUp}
                  iconClassName="text-green-600"
                  valueClassName="text-green-600"
                />
                <StatCard
                  label="Dépenses"
                  value={`€${expenses.toFixed(2)}`}
                  icon={TrendingDown}
                  iconClassName="text-red-600"
                  valueClassName="text-red-600"
                />
                <StatCard
                  label="Solde net"
                  value={`€${net.toFixed(2)}`}
                  icon={Wallet}
                  iconClassName="text-blue-600"
                  valueClassName={net >= 0 ? "text-green-600" : "text-red-600"}
                />
                <StatCard
                  label="Transactions"
                  value={yearTransactions.length}
                  icon={Hash}
                  hint={`Année ${academicYearLabel(startYear)}`}
                />
              </div>

              {yearTransactions.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title={`Aucune transaction pour ${academicYearLabel(startYear)}`}
                  description="Sélectionnez une autre année scolaire."
                />
              ) : (
                <div className="space-y-6">
                  <TransactionsChart transactions={yearTransactions} startYear={startYear} />
                  <ComparisonChart transactions={transactions} startYear={startYear} />
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown,
  PlusCircle,
  History,
  BarChart3,
  Wallet
} from "lucide-react";
import { useSession } from "next-auth/react";
import { DATA_UPDATED_EVENT } from "@/lib/events";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Transaction } from "@/types";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBudgetInitial, setUserBudgetInitial] = useState(0);

  const fetchUserData = async () => {
    try {
      // Récupérer les transactions
      const transactionsResponse = await fetch("/api/transactions");
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
      }

      // Récupérer le profil utilisateur avec budget initial actuel
      const userResponse = await fetch("/api/user/profile");
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserBudgetInitial(userData.budgetInitial || 0);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      fetchUserData();
    }
  }, [session]);

  // Rafraîchir les données quand la page devient visible ou quand les données changent
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        fetchUserData();
      }
    };

    const handleBudgetUpdate = (event: CustomEvent<{ newBudget?: number; shouldRefetch?: boolean }>) => {
      if (!session) return;
      const detail = event.detail;
      if (detail?.newBudget !== undefined) {
        setUserBudgetInitial(detail.newBudget);
      } else if (detail?.shouldRefetch) {
        fetchUserData();
      }
    };

    const handleDataUpdated = () => {
      if (session) fetchUserData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('budgetUpdated', handleBudgetUpdate as EventListener);
    window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdated);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('budgetUpdated', handleBudgetUpdate as EventListener);
      window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    };
  }, [session]);

  const totalIncome = transactions
    .filter((t: Transaction) => t.type === "income")
    .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t: Transaction) => t.type === "expense")
    .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

  const netBalance = totalIncome - totalExpenses;
  const currentBudget = userBudgetInitial + netBalance;

  const recentTransactions = transactions
    .sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <AuthGuard>
      <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Vue d&apos;ensemble de vos finances
            </p>
        </div>
        <div className="flex space-x-2">
          <Button asChild>
            <Link href="/tresorerie/transactions">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouvelle Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Budget Actuel
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              currentBudget >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              €{currentBudget.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Budget initial: €{userBudgetInitial.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenus
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter((t: Transaction) => t.type === "income").length} transaction(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Dépenses
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">€{totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter((t: Transaction) => t.type === "expense").length} transaction(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Solde Net
            </CardTitle>
            {netBalance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{netBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {netBalance >= 0 ? 'Bénéfice' : 'Déficit'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PlusCircle className="mr-2 h-5 w-5" />
              Transactions
            </CardTitle>
            <CardDescription>
              Gérer vos revenus et dépenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/tresorerie/transactions">
                Ajouter une transaction
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-2 h-5 w-5" />
              Historique
            </CardTitle>
            <CardDescription>
              Consulter l&apos;historique complet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/tresorerie/history">
                Voir l&apos;historique
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Rapports
            </CardTitle>
            <CardDescription>
              Analyser vos finances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/tresorerie/reports">
                Voir les rapports
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions Récentes</CardTitle>
          <CardDescription>
            Vos 5 dernières transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Chargement des transactions...</p>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucune transaction trouvée</p>
              <p className="text-sm">Commencez par ajouter des transactions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction: Transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {transaction.type === "income" ? (
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{transaction.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      transaction.type === "income" ? "text-green-600" : "text-red-600"
                    }`}>
                      {transaction.type === "income" ? "+" : "-"}€{transaction.amount.toFixed(2)}
                    </p>
                    {transaction.description && (
                      <p className="text-sm text-muted-foreground">
                        {transaction.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
      </DashboardLayout>
    </AuthGuard>
  );
}

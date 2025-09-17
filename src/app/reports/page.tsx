"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TransactionsChart } from "@/components/charts/transactions-chart";
import { ComparisonChart } from "@/components/charts/comparison-chart";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useState, useEffect } from "react";

export default function ReportsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [initialBudget, setInitialBudget] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Récupérer les transactions
      const transactionsResponse = await fetch("/api/transactions");
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
      }

      // Récupérer le budget initial
      const userResponse = await fetch("/api/user/profile");
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setInitialBudget(userData.budgetInitial || 0);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rapports</h1>
            <p className="text-muted-foreground">
              Analysez vos finances avec des graphiques et statistiques
            </p>
          </div>
        </div>

        {/* Charts Section */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Chargement des données...</p>
          </div>
        ) : transactions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucune donnée disponible</CardTitle>
              <CardDescription>
                Ajoutez des transactions pour voir les graphiques
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Commencez par ajouter des transactions</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <TransactionsChart 
              transactions={transactions} 
              initialBudget={initialBudget} 
            />
            <ComparisonChart 
              transactions={transactions} 
              initialBudget={initialBudget} 
            />
          </div>
        )}

      </div>
      </DashboardLayout>
    </AuthGuard>
  );
}

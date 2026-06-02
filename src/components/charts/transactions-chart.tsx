"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import { TrendingUp, TrendingDown, Calendar, PieChart as PieChartIcon, Landmark } from "lucide-react";
import { academicMonths } from "@/lib/academic-year";
import { CHART_COLORS, categoryColor } from "@/lib/chart-colors";
import { TRANSFER_CATEGORY } from "@/lib/balances";

interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  account?: string | null;
  description?: string;
  category?: string | null;
  date: string;
}

interface TransactionsChartProps {
  transactions: Transaction[];
  /** Année scolaire de départ (sept N → août N+1). */
  startYear: number;
}

/** Valeur absolue signée par le type (le signe stocké est incohérent). */
const absAmount = (t: Transaction) => Math.abs(t.amount);

export function TransactionsChart({ transactions, startYear }: TransactionsChartProps) {
  const realTransactions = transactions.filter((t) => t.category !== TRANSFER_CATEGORY);

  // Données mensuelles ordonnées septembre → août
  const monthlyData = () => {
    const months = academicMonths(startYear).map((m) => ({
      key: m.key,
      month: m.label,
      income: 0,
      expense: 0,
      net: 0,
    }));
    const byKey = new Map(months.map((m) => [m.key, m]));

    realTransactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const data = byKey.get(key);
      if (!data) return;
      if (transaction.type === "income") data.income += absAmount(transaction);
      else data.expense += absAmount(transaction);
      data.net = data.income - data.expense;
    });

    return months;
  };

  // Données par catégorie (dépenses + revenus en valeur absolue)
  const categoryData = () => {
    const categories = new Map<string, { name: string; income: number; expense: number; total: number }>();

    realTransactions.forEach((transaction) => {
      const category = transaction.category || "Non catégorisé";
      if (!categories.has(category)) {
        categories.set(category, { name: category, income: 0, expense: 0, total: 0 });
      }
      const data = categories.get(category)!;
      if (transaction.type === "income") data.income += absAmount(transaction);
      else data.expense += absAmount(transaction);
      data.total = data.income - data.expense;
    });

    return Array.from(categories.values()).sort((a, b) => b.expense - a.expense);
  };

  // Répartition revenus / dépenses
  const pieData = () => {
    const income = realTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + absAmount(t), 0);
    const expense = realTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + absAmount(t), 0);

    return [
      { name: "Revenus", value: income, color: CHART_COLORS.income },
      { name: "Dépenses", value: expense, color: CHART_COLORS.expense },
    ].filter((item) => item.value > 0);
  };

  // Répartition par compte (Banque vs Liquide), tous flux confondus
  const accountData = () => {
    let bank = 0;
    let cash = 0;
    realTransactions.forEach((t) => {
      const v = absAmount(t);
      if ((t.account ?? "bank") === "cash") cash += v;
      else bank += v;
    });
    return [
      { name: "Banque", value: bank, color: CHART_COLORS.bank },
      { name: "Liquide", value: cash, color: CHART_COLORS.cash },
    ].filter((item) => item.value > 0);
  };

  const monthlyChartData = monthlyData();
  const categoryChartData = categoryData();
  const pieChartData = pieData();
  const accountChartData = accountData();

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ color: string; name: string; value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: €{entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Mensuel</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Catégories</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            <span className="hidden sm:inline">Tendances</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Vue d&apos;ensemble</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution mensuelle</CardTitle>
              <CardDescription>Revenus et dépenses par mois (septembre → août)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" fill={CHART_COLORS.income} name="Revenus" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill={CHART_COLORS.expense} name="Dépenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse par catégories</CardTitle>
              <CardDescription>Répartition des transactions par catégorie</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryChartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" fill={CHART_COLORS.income} name="Revenus" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="expense" fill={CHART_COLORS.expense} name="Dépenses" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendance du solde net</CardTitle>
              <CardDescription>Solde net mensuel sur l&apos;année scolaire</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke={CHART_COLORS.net}
                    fill={CHART_COLORS.net}
                    fillOpacity={0.5}
                    name="Solde net"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" /> Revenus vs dépenses
                </CardTitle>
                <CardDescription>Répartition globale de l&apos;année</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={110}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, "Montant"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-4 w-4" /> Banque vs Liquide
                </CardTitle>
                <CardDescription>Répartition des flux par compte</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={accountChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={110}
                      dataKey="value"
                    >
                      {accountChartData.map((entry, index) => (
                        <Cell key={`acc-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, "Montant"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

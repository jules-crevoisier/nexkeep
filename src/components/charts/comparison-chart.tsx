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
  Area,
  AreaChart
} from "recharts";
import { Calendar, BarChart3 } from "lucide-react";
import { academicMonths, academicYearLabel, academicYearRange } from "@/lib/academic-year";
import { CHART_COLORS } from "@/lib/chart-colors";
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

interface ComparisonChartProps {
  transactions: Transaction[];
  /** Année scolaire de départ (sept N → août N+1). */
  startYear: number;
}

const absAmount = (t: Transaction) => Math.abs(t.amount);

export function ComparisonChart({ transactions, startYear }: ComparisonChartProps) {
  const realTransactions = transactions.filter((t) => t.category !== TRANSFER_CATEGORY);

  // Évolution mensuelle (sept → août) de l'année scolaire sélectionnée
  const monthlyData = () => {
    const months = academicMonths(startYear).map((m) => ({
      key: m.key,
      month: m.label,
      income: 0,
      expense: 0,
    }));
    const byKey = new Map(months.map((m) => [m.key, m]));

    realTransactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const data = byKey.get(key);
      if (!data) return;
      if (transaction.type === "income") data.income += absAmount(transaction);
      else data.expense += absAmount(transaction);
    });

    return months;
  };

  // Totaux d'une année scolaire donnée
  const yearTotals = (year: number) => {
    const { start, end } = academicYearRange(year);
    let income = 0;
    let expense = 0;
    let count = 0;
    realTransactions.forEach((t) => {
      const d = new Date(t.date);
      if (d < start || d > end) return;
      count += 1;
      if (t.type === "income") income += absAmount(t);
      else expense += absAmount(t);
    });
    return { income, expense, net: income - expense, count };
  };

  // 3 dernières années scolaires jusqu'à celle sélectionnée
  const yearlyData = () => {
    const result = [];
    for (let i = 2; i >= 0; i--) {
      const year = startYear - i;
      const totals = yearTotals(year);
      result.push({ year: academicYearLabel(year), ...totals });
    }
    return result;
  };

  const monthlyChartData = monthlyData();
  const yearlyChartData = yearlyData();

  const current = yearTotals(startYear);
  const previous = yearTotals(startYear - 1);
  const incomeDelta = current.income - previous.income;
  const expenseDelta = current.expense - previous.expense;
  const incomePct = previous.income > 0 ? (incomeDelta / previous.income) * 100 : 0;
  const expensePct = previous.expense > 0 ? (expenseDelta / previous.expense) * 100 : 0;

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
      {/* Comparaison année scolaire vs précédente */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus {academicYearLabel(startYear)}</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{current.income.toFixed(2)}</div>
            <p className={`text-xs ${incomeDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
              {incomeDelta >= 0 ? "+" : ""}€{incomeDelta.toFixed(2)} ({incomePct.toFixed(1)}%) vs {academicYearLabel(startYear - 1)}
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses {academicYearLabel(startYear)}</CardTitle>
            <BarChart3 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">€{current.expense.toFixed(2)}</div>
            <p className={`text-xs ${expenseDelta <= 0 ? "text-green-600" : "text-red-600"}`}>
              {expenseDelta >= 0 ? "+" : ""}€{expenseDelta.toFixed(2)} ({expensePct.toFixed(1)}%) vs {academicYearLabel(startYear - 1)}
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde net {academicYearLabel(startYear)}</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${current.net >= 0 ? "text-green-600" : "text-red-600"}`}>
              €{current.net.toFixed(2)}
            </div>
            <p className="text-muted-foreground text-xs">{current.count} transaction{current.count > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Mensuelle
          </TabsTrigger>
          <TabsTrigger value="yearly" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Annuelle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution mensuelle {academicYearLabel(startYear)}</CardTitle>
              <CardDescription>Revenus et dépenses mois par mois (septembre → août)</CardDescription>
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

        <TabsContent value="yearly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparaison annuelle</CardTitle>
              <CardDescription>Évolution sur 3 années scolaires</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={yearlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stackId="1"
                    stroke={CHART_COLORS.income}
                    fill={CHART_COLORS.income}
                    fillOpacity={0.5}
                    name="Revenus"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stackId="2"
                    stroke={CHART_COLORS.expense}
                    fill={CHART_COLORS.expense}
                    fillOpacity={0.5}
                    name="Dépenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

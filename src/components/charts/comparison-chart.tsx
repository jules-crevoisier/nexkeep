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
import { Calendar, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  description?: string;
  category?: string;
  date: string;
}

interface ComparisonChartProps {
  transactions: Transaction[];
  initialBudget: number;
}

export function ComparisonChart({ transactions, initialBudget }: ComparisonChartProps) {
  // Calculer les données mensuelles pour l'année courante
  const monthlyData = () => {
    const currentYear = new Date().getFullYear();
    const months = new Map();
    
    // Initialiser tous les mois de l'année
    for (let i = 0; i < 12; i++) {
      const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      const monthName = new Date(currentYear, i).toLocaleDateString('fr-FR', { month: 'long' });
      
      months.set(monthKey, {
        month: monthName,
        income: 0,
        expense: 0,
        net: 0,
        budget: initialBudget
      });
    }
    
    // Ajouter les transactions
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      if (date.getFullYear() === currentYear) {
        const monthKey = `${currentYear}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const data = months.get(monthKey);
        
        if (data) {
          if (transaction.type === 'income') {
            data.income += transaction.amount;
          } else {
            data.expense += transaction.amount;
          }
          data.net = data.income - data.expense;
        }
      }
    });
    
    return Array.from(months.values());
  };

  // Calculer les données annuelles (3 dernières années)
  const yearlyData = () => {
    const years = new Map();
    const currentYear = new Date().getFullYear();
    
    // Initialiser les 3 dernières années
    for (let i = 2; i >= 0; i--) {
      const year = currentYear - i;
      years.set(year, {
        year: year.toString(),
        income: 0,
        expense: 0,
        net: 0,
        transactions: 0
      });
    }
    
    // Ajouter les transactions
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const year = date.getFullYear();
      
      if (years.has(year)) {
        const data = years.get(year);
        if (transaction.type === 'income') {
          data.income += transaction.amount;
        } else {
          data.expense += transaction.amount;
        }
        data.net = data.income - data.expense;
        data.transactions += 1;
      }
    });
    
    return Array.from(years.values());
  };

  // Calculer les statistiques de comparaison
  const comparisonStats = () => {
    const monthly = monthlyData();
    const yearly = yearlyData();
    
    const currentMonth = monthly[new Date().getMonth()];
    const previousMonth = monthly[new Date().getMonth() - 1] || { income: 0, expense: 0, net: 0 };
    
    const currentYear = yearly[yearly.length - 1];
    const previousYear = yearly[yearly.length - 2] || { income: 0, expense: 0, net: 0 };
    
    return {
      monthly: {
        incomeChange: currentMonth.income - previousMonth.income,
        expenseChange: currentMonth.expense - previousMonth.expense,
        netChange: currentMonth.net - previousMonth.net,
        incomePercent: previousMonth.income > 0 ? ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100 : 0,
        expensePercent: previousMonth.expense > 0 ? ((currentMonth.expense - previousMonth.expense) / previousMonth.expense) * 100 : 0
      },
      yearly: {
        incomeChange: currentYear.income - previousYear.income,
        expenseChange: currentYear.expense - previousYear.expense,
        netChange: currentYear.net - previousYear.net,
        incomePercent: previousYear.income > 0 ? ((currentYear.income - previousYear.income) / previousYear.income) * 100 : 0,
        expensePercent: previousYear.expense > 0 ? ((currentYear.expense - previousYear.expense) / previousYear.expense) * 100 : 0
      }
    };
  };

  const monthlyChartData = monthlyData();
  const yearlyChartData = yearlyData();
  const stats = comparisonStats();

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{
      color: string;
      name: string;
      value: number;
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: { color: string; name: string; value: number }, index: number) => (
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
      {/* Statistiques de comparaison */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus ce mois</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{monthlyChartData[new Date().getMonth()]?.income.toFixed(2) || "0.00"}
            </div>
            <p className={`text-xs ${stats.monthly.incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.monthly.incomeChange >= 0 ? '+' : ''}€{stats.monthly.incomeChange.toFixed(2)} 
              ({stats.monthly.incomePercent.toFixed(1)}%) vs mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses ce mois</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              €{monthlyChartData[new Date().getMonth()]?.expense.toFixed(2) || "0.00"}
            </div>
            <p className={`text-xs ${stats.monthly.expenseChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.monthly.expenseChange >= 0 ? '+' : ''}€{stats.monthly.expenseChange.toFixed(2)} 
              ({stats.monthly.expensePercent.toFixed(1)}%) vs mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus cette année</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              €{yearlyChartData[yearlyChartData.length - 1]?.income.toFixed(2) || "0.00"}
            </div>
            <p className={`text-xs ${stats.yearly.incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.yearly.incomeChange >= 0 ? '+' : ''}€{stats.yearly.incomeChange.toFixed(2)} 
              ({stats.yearly.incomePercent.toFixed(1)}%) vs année dernière
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses cette année</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              €{yearlyChartData[yearlyChartData.length - 1]?.expense.toFixed(2) || "0.00"}
            </div>
            <p className={`text-xs ${stats.yearly.expenseChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.yearly.expenseChange >= 0 ? '+' : ''}€{stats.yearly.expenseChange.toFixed(2)} 
              ({stats.yearly.expensePercent.toFixed(1)}%) vs année dernière
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Comparaison Mensuelle
          </TabsTrigger>
          <TabsTrigger value="yearly" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Comparaison Annuelle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution Mensuelle {new Date().getFullYear()}</CardTitle>
              <CardDescription>
                Comparaison des revenus et dépenses mois par mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" fill="#22c55e" name="Revenus" />
                  <Bar dataKey="expense" fill="#ef4444" name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparaison Annuelle</CardTitle>
              <CardDescription>
                Évolution des revenus et dépenses sur 3 ans
              </CardDescription>
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
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.6}
                    name="Revenus"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stackId="2"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.6}
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

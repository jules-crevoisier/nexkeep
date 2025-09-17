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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import { TrendingUp, TrendingDown, Calendar, PieChart as PieChartIcon } from "lucide-react";

interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  description?: string;
  category?: string;
  date: string;
}

interface TransactionsChartProps {
  transactions: Transaction[];
  initialBudget: number;
}

const COLORS = {
  income: "#22c55e",
  expense: "#ef4444",
  budget: "#3b82f6"
};

export function TransactionsChart({ transactions, initialBudget }: TransactionsChartProps) {
  // Calculer les données mensuelles
  const monthlyData = () => {
    const months = new Map();
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      
      if (!months.has(monthKey)) {
        months.set(monthKey, {
          month: monthName,
          income: 0,
          expense: 0,
          net: 0,
          budget: initialBudget
        });
      }
      
      const data = months.get(monthKey);
      if (transaction.type === 'income') {
        data.income += transaction.amount;
      } else {
        data.expense += transaction.amount;
      }
      data.net = data.income - data.expense;
    });
    
    return Array.from(months.values()).sort((a, b) => {
      const aDate = new Date(a.month);
      const bDate = new Date(b.month);
      return aDate.getTime() - bDate.getTime();
    });
  };

  // Calculer les données par catégorie
  const categoryData = () => {
    const categories = new Map();
    
    transactions.forEach(transaction => {
      const category = transaction.category || 'Non catégorisé';
      
      if (!categories.has(category)) {
        categories.set(category, {
          name: category,
          income: 0,
          expense: 0,
          total: 0
        });
      }
      
      const data = categories.get(category);
      if (transaction.type === 'income') {
        data.income += transaction.amount;
      } else {
        data.expense += transaction.amount;
      }
      data.total = data.income - data.expense;
    });
    
    return Array.from(categories.values()).sort((a, b) => b.total - a.total);
  };

  // Calculer les données pour le graphique en secteurs
  const pieData = () => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return [
      { name: 'Revenus', value: income, color: COLORS.income },
      { name: 'Dépenses', value: expense, color: COLORS.expense }
    ].filter(item => item.value > 0);
  };

  const monthlyChartData = monthlyData();
  const categoryChartData = categoryData();
  const pieChartData = pieData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Mensuel
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Catégories
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Tendances
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Vue d'ensemble
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution Mensuelle</CardTitle>
              <CardDescription>
                Revenus et dépenses par mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" fill={COLORS.income} name="Revenus" />
                  <Bar dataKey="expense" fill={COLORS.expense} name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse par Catégories</CardTitle>
              <CardDescription>
                Répartition des transactions par catégorie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryChartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" fill={COLORS.income} name="Revenus" />
                  <Bar dataKey="expense" fill={COLORS.expense} name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendances Financières</CardTitle>
              <CardDescription>
                Évolution du budget dans le temps
              </CardDescription>
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
                    stackId="1"
                    stroke={COLORS.budget}
                    fill={COLORS.budget}
                    fillOpacity={0.6}
                    name="Solde Net"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vue d'Ensemble</CardTitle>
              <CardDescription>
                Répartition revenus vs dépenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, 'Montant']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

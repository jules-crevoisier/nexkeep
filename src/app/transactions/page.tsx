"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus,
  Minus,
  Wallet,
  AlertTriangle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CategorySelector } from "@/components/forms/category-selector";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [budget, setBudget] = useState(0);
  const [loading, setLoading] = useState(false);

  // États pour les formulaires
  const [incomeForm, setIncomeForm] = useState({ name: "", amount: "", description: "", category: "" });
  const [expenseForm, setExpenseForm] = useState({ name: "", amount: "", description: "", category: "" });

  // États pour la confirmation de dépense
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingExpense, setPendingExpense] = useState<{name: string, amount: string, description: string, category: string} | null>(null);

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.name || !incomeForm.amount) return;

    setLoading(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: incomeForm.name,
          amount: incomeForm.amount,
          type: "income",
          description: incomeForm.description,
          category: incomeForm.category
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIncomeForm({ name: "", amount: "", description: "", category: "" });
        // Mettre à jour le budget directement
        if (data.newBudget !== undefined) {
          setBudget(data.newBudget);
        }
      }
    } catch (error) {
      console.error("Error adding income:", error);
    }
    setLoading(false);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.name || !expenseForm.amount) return;

    const expenseAmount = parseFloat(expenseForm.amount);
    
    // Vérifier si la dépense dépasse le budget
    if (expenseAmount > budget) {
      setPendingExpense(expenseForm);
      setShowConfirmDialog(true);
      return;
    }

    // Si la dépense est acceptable, procéder directement
    await processExpense(expenseForm);
  };

  const processExpense = async (expenseData: {name: string, amount: string, description: string}) => {
    setLoading(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: expenseData.name,
          amount: expenseData.amount,
          type: "expense",
          description: expenseData.description,
          category: expenseData.category
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExpenseForm({ name: "", amount: "", description: "", category: "" });
        // Mettre à jour le budget directement
        if (data.newBudget !== undefined) {
          setBudget(data.newBudget);
        }
      }
    } catch (error) {
      console.error("Error adding expense:", error);
    }
    setLoading(false);
  };

  const confirmExpense = async () => {
    if (pendingExpense) {
      await processExpense(pendingExpense);
      setPendingExpense(null);
      setShowConfirmDialog(false);
    }
  };

  const cancelExpense = () => {
    setPendingExpense(null);
    setShowConfirmDialog(false);
  };

  const fetchBudget = async () => {
    try {
      const response = await fetch("/api/user/budget");
      if (response.ok) {
        const data = await response.json();
        setBudget(data.budget);
      }
    } catch (error) {
      console.error("Error fetching budget:", error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchBudget();
    }
  }, [session]);

  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              Gérer vos revenus et dépenses
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Budget actuel</p>
            <p className={`text-2xl font-bold ${
              budget < 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              €{budget.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-green-600" />
                <span>Ajouter de l'argent</span>
              </CardTitle>
              <CardDescription>
                Enregistrer un revenu ou un ajout
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIncomeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="income-name">Nom de la transaction</Label>
                  <Input 
                    id="income-name" 
                    placeholder="Ex: Salaire, Don, Vente..."
                    value={incomeForm.name}
                    onChange={(e) => setIncomeForm({...incomeForm, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income-amount">Montant</Label>
                  <Input 
                    id="income-amount" 
                    type="number" 
                    placeholder="0.00"
                    step="0.01"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({...incomeForm, amount: e.target.value})}
                    required
                  />
                </div>
              <div className="space-y-2">
                <Label htmlFor="income-description">Description (optionnel)</Label>
                <Textarea 
                  id="income-description" 
                  placeholder="Détails supplémentaires..."
                  value={incomeForm.description}
                  onChange={(e) => setIncomeForm({...incomeForm, description: e.target.value})}
                />
              </div>
              <CategorySelector
                selectedCategory={incomeForm.category}
                onCategoryChange={(category) => setIncomeForm({...incomeForm, category})}
                type="income"
              />
                <Button type="submit" className="w-full" disabled={loading}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Minus className="h-5 w-5 text-red-600" />
                <span>Dépenser de l'argent</span>
              </CardTitle>
              <CardDescription>
                Enregistrer une dépense
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-name">Nom de la transaction</Label>
                  <Input 
                    id="expense-name" 
                    placeholder="Ex: Courses, Essence, Restauration..."
                    value={expenseForm.name}
                    onChange={(e) => setExpenseForm({...expenseForm, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Montant</Label>
                  <Input 
                    id="expense-amount" 
                    type="number" 
                    placeholder="0.00"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                    required
                  />
                </div>
              <div className="space-y-2">
                <Label htmlFor="expense-description">Description (optionnel)</Label>
                <Textarea 
                  id="expense-description" 
                  placeholder="Détails supplémentaires..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                />
              </div>
              <CategorySelector
                selectedCategory={expenseForm.category}
                onCategoryChange={(category) => setExpenseForm({...expenseForm, category})}
                type="expense"
              />
                <Button type="submit" variant="destructive" className="w-full" disabled={loading}>
                  <Minus className="mr-2 h-4 w-4" />
                  Dépenser
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Dialogue de confirmation pour dépense importante */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>Dépense importante</span>
              </AlertDialogTitle>
              <AlertDialogDescription>
                Cette dépense de <strong>€{pendingExpense?.amount}</strong> dépasse votre budget actuel de <strong>€{budget.toFixed(2)}</strong>.
                <br /><br />
                Votre solde sera négatif après cette transaction. Voulez-vous continuer ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelExpense}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmExpense}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirmer la dépense
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      </DashboardLayout>
    </AuthGuard>
  );
}

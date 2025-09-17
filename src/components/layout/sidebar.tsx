"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  History,
  PlusCircle,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  FileText
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: PlusCircle,
  },
  {
    name: "Remboursements",
    href: "/reimbursements",
    icon: CreditCard,
  },
  {
    name: "Facturation",
    href: "/facturation",
    icon: FileText,
  },
  {
    name: "Historique",
    href: "/history",
    icon: History,
  },
  {
    name: "Rapports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    name: "Paramètres",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [initialBudget, setInitialBudget] = useState(0);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const fetchUserData = async () => {
    try {
      // Récupérer les transactions
      const transactionsResponse = await fetch("/api/transactions");
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
      }

      // Récupérer le profil utilisateur (budget initial)
      const userResponse = await fetch("/api/user/profile");
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setInitialBudget(userData.budgetInitial || 0);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchUserData();
    }
  }, [session]);

  // Écouter les mises à jour du budget initial
  useEffect(() => {
    const handleBudgetUpdate = (event: CustomEvent) => {
      if (session) {
        // Mettre à jour le budget initial
        setInitialBudget(event.detail.newBudget);
      }
    };

    window.addEventListener('budgetUpdated', handleBudgetUpdate as EventListener);
    
    return () => {
      window.removeEventListener('budgetUpdated', handleBudgetUpdate as EventListener);
    };
  }, [session]);

  // Calculer les statistiques
  const totalIncome = transactions
    .filter((t: { type: string; amount: number }) => t.type === "income")
    .reduce((sum: number, t: { type: string; amount: number }) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t: { type: string; amount: number }) => t.type === "expense")
    .reduce((sum: number, t: { type: string; amount: number }) => sum + Math.abs(t.amount), 0);

  const netBalance = totalIncome - totalExpenses;
  const currentBudget = initialBudget + netBalance;

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center">
              <span className="text-3xl font-bold font-nunito text-primary">NexKeep</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User info */}
          {session && (
            <div className="p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {session.user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Budget: €{currentBudget.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1">
            <nav className="p-4 space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Quick stats */}
          {session && (
            <div className="p-4 border-t">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">Revenus</span>
                  </div>
                  <span className="font-medium text-green-600">€{totalIncome.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-muted-foreground">Dépenses</span>
                  </div>
                  <span className="font-medium text-red-600">€{totalExpenses.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-muted-foreground">Budget Actuel</span>
                  </div>
                  <span className={`font-medium ${currentBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    €{currentBudget.toFixed(2)}
                  </span>
                </div>
                {initialBudget > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Budget initial: €{initialBudget.toFixed(2)}</span>
                    <span>Solde net: €{netBalance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logout */}
          {session && (
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Se déconnecter
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

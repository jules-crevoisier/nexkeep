"use client";

import { useState, useEffect, useCallback } from "react";
import { DATA_UPDATED_EVENT } from "@/lib/events";
import { computeBalances, computeIncomeExpense, type BalanceTransaction } from "@/lib/balances";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CommandPalette } from "./command-palette";
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
  FileText,
  Wallet,
  Landmark,
  Search
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/tresorerie",
    icon: LayoutDashboard,
  },
  {
    name: "Transactions",
    href: "/tresorerie/transactions",
    icon: PlusCircle,
  },
  {
    name: "Remboursements",
    href: "/tresorerie/reimbursements",
    icon: CreditCard,
  },
  {
    name: "Liquide",
    href: "/tresorerie/liquide",
    icon: Wallet,
  },
  {
    name: "Facturation",
    href: "/tresorerie/facturation",
    icon: FileText,
  },
  {
    name: "Historique",
    href: "/tresorerie/history",
    icon: History,
  },
  {
    name: "Rapports",
    href: "/tresorerie/reports",
    icon: BarChart3,
  },
  {
    name: "Paramètres",
    href: "/parametres",
    icon: Settings,
  },
];

interface SidebarProps {
  /** Ouverture contrôlée (mobile). Si omis, la sidebar gère son propre état. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Sidebar({ open, onOpenChange }: SidebarProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = useCallback(
    (value: boolean) => {
      if (isControlled) onOpenChange?.(value);
      else setInternalOpen(value);
    },
    [isControlled, onOpenChange]
  );
  const pathname = usePathname();
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [initialBudget, setInitialBudget] = useState(0);
  const [cashInitial, setCashInitial] = useState(0);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const fetchUserData = useCallback(async () => {
    if (!session) return
    try {
      const [transactionsResponse, userResponse] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/user/profile")
      ])
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setTransactions(Array.isArray(transactionsData) ? transactionsData : [])
      }
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setInitialBudget(Number(userData.budgetInitial) || 0)
        setCashInitial(Number(userData.cashInitial) || 0)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }, [session])

  useEffect(() => {
    if (session) {
      fetchUserData()
    }
  }, [session, fetchUserData])

  // Écouter les mises à jour (transactions, budget, remboursements)
  useEffect(() => {
    const handleBudgetUpdate = (event: CustomEvent<{ newBudget?: number; shouldRefetch?: boolean }>) => {
      if (!session) return
      const detail = event.detail
      if (detail?.newBudget !== undefined) {
        setInitialBudget(detail.newBudget)
      } else if (detail?.shouldRefetch) {
        fetchUserData()
      }
    }

    const handleDataUpdated = () => {
      if (session) fetchUserData()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) fetchUserData()
    }

    window.addEventListener('budgetUpdated', handleBudgetUpdate as EventListener)
    window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdated)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('budgetUpdated', handleBudgetUpdate as EventListener)
      window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdated)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session, fetchUserData])

  // Calculer les statistiques (transferts internes exclus des revenus/dépenses)
  const { income: totalIncome, expenses: totalExpenses } = computeIncomeExpense(transactions);
  const { bank: bankBalance, cash: cashBalance, total: currentBudget } = computeBalances(
    transactions,
    initialBudget,
    cashInitial
  );

  return (
    <>
      {/* Palette de commande globale (⌘K) */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* Bouton menu flottant : seulement en mode non contrôlé (sinon l'en-tête mobile s'en charge). */}
      {!isControlled && (
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden fixed top-4 left-4 z-50"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

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
              <button
                onClick={() => {
                  setPaletteOpen(true);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center space-x-3">
                  <Search className="h-4 w-4" />
                  <span>Rechercher</span>
                </span>
                <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
                  ⌘K
                </kbd>
              </button>
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
                    <Landmark className="h-4 w-4 text-blue-600" />
                    <span className="text-muted-foreground">Banque</span>
                  </div>
                  <span className={`font-medium ${bankBalance >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                    €{bankBalance.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4 text-amber-600" />
                    <span className="text-muted-foreground">Liquide</span>
                  </div>
                  <span className={`font-medium ${cashBalance >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                    €{cashBalance.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-muted-foreground font-medium">Total</span>
                  </div>
                  <span className={`font-bold ${currentBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    €{currentBudget.toFixed(2)}
                  </span>
                </div>
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

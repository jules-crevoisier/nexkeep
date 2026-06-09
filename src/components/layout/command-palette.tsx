"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  History,
  PlusCircle,
  BarChart3,
  Settings,
  CreditCard,
  FileText,
  Wallet,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CommandRoute {
  name: string;
  href: string;
  icon: LucideIcon;
  keywords?: string;
}

const ROUTES: CommandRoute[] = [
  { name: "Dashboard", href: "/tresorerie", icon: LayoutDashboard, keywords: "accueil home tableau" },
  { name: "Transactions", href: "/tresorerie/transactions", icon: PlusCircle, keywords: "ajouter revenu depense" },
  { name: "Remboursements", href: "/tresorerie/reimbursements", icon: CreditCard, keywords: "remboursement demande" },
  { name: "Liquide", href: "/tresorerie/liquide", icon: Wallet, keywords: "caisse especes cash" },
  { name: "Facturation", href: "/tresorerie/facturation", icon: FileText, keywords: "factures clients articles" },
  { name: "Historique", href: "/tresorerie/history", icon: History, keywords: "transactions export" },
  { name: "Rapports", href: "/tresorerie/reports", icon: BarChart3, keywords: "graphiques statistiques analyse" },
  { name: "Paramètres", href: "/parametres", icon: Settings, keywords: "profil theme securite" },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROUTES;
    return ROUTES.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.keywords ?? "").toLowerCase().includes(q)
    );
  }, [query]);

  // Raccourci global Ctrl/⌘+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Réinitialiser à l'ouverture
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[active];
      if (target) go(target.href);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Rechercher une page</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="text-muted-foreground h-4 w-4 shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Rechercher une page…"
            className="border-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              Aucun résultat
            </p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.href}
                onClick={() => go(r.href)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  i === active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <r.icon className="h-4 w-4" />
                <span>{r.name}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

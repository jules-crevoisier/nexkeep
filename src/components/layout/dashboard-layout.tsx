"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandPalette } from "./command-palette";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/** Libellés de page pour l'en-tête mobile (premier segment d'URL). */
const PAGE_TITLES: Record<string, string> = {
  "": "Dashboard",
  transactions: "Transactions",
  reimbursements: "Remboursements",
  liquide: "Liquide",
  facturation: "Facturation",
  history: "Historique",
  reports: "Rapports",
  settings: "Paramètres",
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();

  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  const pageTitle = PAGE_TITLES[firstSegment] ?? "NexKeep";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* En-tête mobile */}
        <header className="flex items-center justify-between gap-2 border-b px-4 py-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ouvrir le menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-nunito text-lg font-bold text-primary">{pageTitle}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Rechercher"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="space-y-4 p-4 sm:p-6 lg:p-8">
            <Breadcrumbs />
            <div key={pathname} className="animate-in fade-in duration-300">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

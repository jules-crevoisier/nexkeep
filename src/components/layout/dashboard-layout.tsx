"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandPalette } from "./command-palette";
import { ModuleSwitcher } from "./module-switcher";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { ReaderModeBanner } from "@/components/permissions/reader-mode-banner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/** Libellés de page pour l'en-tête mobile. */
const PAGE_TITLES: Record<string, string> = {
  "": "Dashboard",
  tresorerie: "Trésorerie",
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
  const router = useRouter();
  const { loading, active } = useWorkspace();

  // Garde trésorerie : un membre sans accès est redirigé vers l'orga.
  useEffect(() => {
    if (!loading && active && active.treasuryAccess === "NONE") {
      router.replace("/orga");
    }
  }, [loading, active, router]);

  const segments = pathname.split("/").filter(Boolean);
  // Titre = segment connu le plus profond (ex: /tresorerie/transactions -> Transactions)
  const pageTitle =
    [...segments].reverse().map((s) => PAGE_TITLES[s]).find(Boolean) ??
    PAGE_TITLES[""] ??
    "NexKeep";

  return (
    <div className="flex flex-col h-screen bg-background">
      <ModuleSwitcher />
      <div className="flex flex-1 overflow-hidden">
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
            <ReaderModeBanner mode="treasury" />
            <div key={pathname} className="animate-in fade-in duration-300">
              {children}
            </div>
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}

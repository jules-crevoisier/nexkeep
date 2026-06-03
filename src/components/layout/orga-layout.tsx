"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrgaSidebar } from "./orga-sidebar";
import { Breadcrumbs } from "./breadcrumbs";
import { ModuleSwitcher } from "./module-switcher";
import { OrgaCommandPalette } from "./orga-command-palette";

interface OrgaLayoutProps {
  children: React.ReactNode;
}

const PAGE_TITLES: Record<string, string> = {
  orga: "Accueil",
  planning: "Planning",
  projects: "Projets",
};

export function OrgaLayout({ children }: OrgaLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const pageTitle =
    [...segments].reverse().map((s) => PAGE_TITLES[s]).find(Boolean) ??
    "Organisation";

  return (
    <div className="flex flex-col h-screen bg-background">
      <ModuleSwitcher />
      <div className="flex flex-1 overflow-hidden">
        <OrgaSidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          onSearch={() => setPaletteOpen(true)}
        />
        <OrgaCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

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
    </div>
  );
}

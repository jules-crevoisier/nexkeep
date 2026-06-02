"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

/** Libellés lisibles pour les segments d'URL connus. */
const LABELS: Record<string, string> = {
  "": "Dashboard",
  transactions: "Transactions",
  reimbursements: "Remboursements",
  liquide: "Liquide",
  facturation: "Facturation",
  history: "Historique",
  reports: "Rapports",
  settings: "Paramètres",
  edit: "Édition",
};

const labelFor = (segment: string): string => {
  if (LABELS[segment]) return LABELS[segment];
  // Segment dynamique (id) : tronquer proprement.
  if (segment.length > 12) return segment.slice(0, 8) + "…";
  return segment;
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Pas de fil d'ariane sur le dashboard racine.
  if (segments.length === 0) return null;

  let href = "";
  return (
    <nav
      aria-label="Fil d'ariane"
      className="text-muted-foreground flex items-center gap-1 text-sm"
    >
      <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment, i) => {
        href += `/${segment}`;
        const isLast = i === segments.length - 1;
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="text-foreground font-medium">{labelFor(segment)}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {labelFor(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

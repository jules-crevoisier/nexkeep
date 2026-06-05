"use client";

import { useCallback, useState } from "react";
import { FileDown, PieChart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CollapsibleSection } from "./collapsible-section";
import type { Project, TaskGroup } from "./task-types";

interface ProjectBudgetPreviewProps {
  projectId: string;
  project: Pick<
    Project,
    "name" | "description" | "status" | "endDate" | "budget" | "color"
  >;
  groups: TaskGroup[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);

const pct = (part: number, total: number) =>
  total > 0 ? `${((part / total) * 100).toFixed(1)} %` : "—";

export function ProjectBudgetPreview({
  projectId,
  project,
  groups,
}: ProjectBudgetPreviewProps) {
  const [exporting, setExporting] = useState(false);
  const projectBudget = project.budget;
  const allocated = groups.reduce((sum, g) => sum + (g.budget ?? 0), 0);
  const remaining =
    projectBudget != null ? projectBudget - allocated : null;
  const over = remaining != null && remaining < 0;
  const hasBudgetData =
    projectBudget != null || groups.some((g) => g.budget != null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/orga/projects/${projectId}/budget-pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Export impossible");
      }
      const blob = await res.blob();
      if (blob.size < 100) throw new Error("PDF vide");

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `budget-prev-${project.name}.pdf`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("PDF telecharge");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export impossible";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }, [projectId, project.name]);

  if (!hasBudgetData) return null;

  const summary =
    projectBudget != null ? (
      <>
        {fmt(projectBudget)} total · {fmt(allocated)} alloué
        {remaining != null && (
          <>
            {" "}
            ·{" "}
            <span className={over ? "text-red-600" : "text-emerald-600"}>
              {over ? "dépassement" : "reste"} {fmt(Math.abs(remaining))}
            </span>
          </>
        )}
      </>
    ) : (
      <>{fmt(allocated)} réparti sur les pôles</>
    );

  return (
    <CollapsibleSection
      title="Budget prévisionnel"
      icon={<PieChart className="h-4 w-4 shrink-0 text-muted-foreground" />}
      summary={summary}
      defaultOpen={false}
      actions={
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={handleExport}
          disabled={exporting}
        >
          <FileDown className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:ml-1.5">
            {exporting ? "PDF…" : "PDF"}
          </span>
        </Button>
      }
    >
      {projectBudget != null && (
        <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="font-semibold tabular-nums">{fmt(projectBudget)}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">Alloué</p>
            <p className="font-semibold tabular-nums">{fmt(allocated)}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">
              {over ? "Dépassement" : "Restant"}
            </p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                over ? "text-red-600" : "text-emerald-600"
              )}
            >
              {remaining != null ? fmt(Math.abs(remaining)) : "—"}
            </p>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8">Pôle</TableHead>
            <TableHead className="h-8 text-right">Montant</TableHead>
            {projectBudget != null && (
              <TableHead className="h-8 text-right">Part</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => (
            <TableRow key={g.id}>
              <TableCell className="py-2">
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  {g.name}
                </span>
              </TableCell>
              <TableCell className="py-2 text-right tabular-nums text-sm">
                {g.budget != null ? fmt(g.budget) : "—"}
              </TableCell>
              {projectBudget != null && (
                <TableCell className="py-2 text-right text-sm text-muted-foreground">
                  {g.budget != null ? pct(g.budget, projectBudget) : "—"}
                </TableCell>
              )}
            </TableRow>
          ))}
          {remaining != null && remaining > 0 && projectBudget != null && (
            <TableRow className="bg-muted/30">
              <TableCell className="py-2 text-sm text-muted-foreground">
                Non alloué
              </TableCell>
              <TableCell className="py-2 text-right tabular-nums text-sm">
                {fmt(remaining)}
              </TableCell>
              <TableCell className="py-2 text-right text-sm text-muted-foreground">
                {pct(remaining, projectBudget)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {projectBudget != null && (
          <TableFooter>
            <TableRow>
              <TableCell className="py-2 font-medium">Total alloué</TableCell>
              <TableCell className="py-2 text-right font-medium tabular-nums">
                {fmt(allocated)}
              </TableCell>
              <TableCell className="py-2 text-right text-muted-foreground">
                {pct(allocated, projectBudget)}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </CollapsibleSection>
  );
}

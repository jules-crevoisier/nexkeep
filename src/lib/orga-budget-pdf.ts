import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { projectStatusMeta } from "@/components/orga/task-types";

export interface BudgetPdfGroup {
  name: string;
  budget: number | null;
  color?: string;
}

export interface BudgetPdfProject {
  name: string;
  description: string | null;
  status: string;
  endDate: string | null;
  budget: number | null;
  color?: string | null;
}

export interface BudgetPdfInput {
  project: BudgetPdfProject;
  groups: BudgetPdfGroup[];
}

const PRIMARY = { r: 37, g: 99, b: 235 };
const TEXT = { r: 30, g: 41, b: 59 };
const MUTED = { r: 100, g: 116, b: 139 };
const SUCCESS = { r: 5, g: 150, b: 105 };
const DANGER = { r: 220, g: 38, b: 38 };

/** Texte ASCII-safe pour Helvetica (jsPDF). */
const ascii = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const fmtMoney = (v: number): string => {
  const [intPart, dec] = Math.abs(v).toFixed(2).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = v < 0 ? "-" : "";
  return `${sign}${grouped},${dec} EUR`;
};

const fmtDate = (iso: string | null): string => {
  if (!iso) return "Non definie";
  const d = new Date(iso);
  const months = [
    "janvier", "fevrier", "mars", "avril", "mai", "juin",
    "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const fmtDateTime = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const pct = (part: number, total: number): string =>
  total > 0 ? `${((part / total) * 100).toFixed(1)} %` : "-";

export const safeBudgetFilename = (name: string): string =>
  ascii(name)
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "projet";

/**
 * Genere le PDF cote serveur (fiable sur Vercel, contrairement au bundle client).
 */
export function generateBudgetPreviewPdfBuffer(input: BudgetPdfInput): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 0;

  const { project, groups } = input;
  const projectName = ascii(project.name);
  const allocated = groups.reduce((sum, g) => sum + (g.budget ?? 0), 0);
  const remaining = project.budget != null ? project.budget - allocated : null;
  const over = remaining != null && remaining < 0;
  const statusLabel = ascii(projectStatusMeta(project.status).label);

  doc.setFillColor(PRIMARY.r, PRIMARY.g, PRIMARY.b);
  doc.rect(0, 0, pageWidth, 42, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("NEXKEEP - Organisation", margin, 12);

  doc.setFontSize(20);
  doc.text("Budget previsionnel", margin, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Exporte le ${fmtDateTime()}`, pageWidth - margin, 12, { align: "right" });

  y = 52;

  doc.setTextColor(TEXT.r, TEXT.g, TEXT.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(projectName, margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(`Statut : ${statusLabel}`, margin, y);
  doc.text(`Date envisagee : ${fmtDate(project.endDate)}`, pageWidth / 2, y);
  y += 6;

  if (project.description?.trim()) {
    doc.setTextColor(TEXT.r, TEXT.g, TEXT.b);
    const descLines = doc.splitTextToSize(
      ascii(project.description.trim()),
      pageWidth - margin * 2
    );
    doc.text(descLines, margin, y);
    y += descLines.length * 5 + 4;
  } else {
    y += 4;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(TEXT.r, TEXT.g, TEXT.b);
  doc.text("Synthese budgetaire", margin, y);
  y += 6;

  const boxW = (pageWidth - margin * 2 - 8) / 3;
  const boxH = 22;
  const boxes: { label: string; value: string; accent?: "ok" | "bad" }[] = [];

  if (project.budget != null) {
    boxes.push(
      { label: "Budget total", value: fmtMoney(project.budget) },
      { label: "Alloue aux poles", value: fmtMoney(allocated) },
      {
        label: over ? "Depassement" : "Restant",
        value: remaining != null ? fmtMoney(Math.abs(remaining)) : "-",
        accent: over ? "bad" : "ok",
      }
    );
  } else {
    boxes.push({ label: "Total alloue (poles)", value: fmtMoney(allocated) });
  }

  boxes.forEach((box, i) => {
    const x = margin + i * (boxW + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(x, y, boxW, boxH, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(box.label, x + 4, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    if (box.accent === "bad") doc.setTextColor(DANGER.r, DANGER.g, DANGER.b);
    else if (box.accent === "ok") doc.setTextColor(SUCCESS.r, SUCCESS.g, SUCCESS.b);
    else doc.setTextColor(TEXT.r, TEXT.g, TEXT.b);
    doc.text(doc.splitTextToSize(box.value, boxW - 8), x + 4, y + 16);
  });

  y += boxH + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(TEXT.r, TEXT.g, TEXT.b);
  doc.text("Repartition par pole", margin, y);
  y += 4;

  const head = project.budget
    ? ["Pole", "Montant alloue", "Part du budget"]
    : ["Pole", "Montant alloue"];

  const body: string[][] = groups.map((g) => {
    const row = [ascii(g.name), g.budget != null ? fmtMoney(g.budget) : "-"];
    if (project.budget != null) {
      row.push(g.budget != null ? pct(g.budget, project.budget) : "-");
    }
    return row;
  });

  if (remaining != null && remaining > 0 && project.budget != null) {
    body.push(["Non alloue", fmtMoney(remaining), pct(remaining, project.budget)]);
  }

  if (groups.length === 0) {
    body.push(project.budget ? ["Aucun pole defini", "-", "-"] : ["Aucun pole defini", "-"]);
  }

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [TEXT.r, TEXT.g, TEXT.b],
    },
    headStyles: {
      fillColor: [PRIMARY.r, PRIMARY.g, PRIMARY.b],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right" },
      ...(project.budget ? { 2: { halign: "right" } } : {}),
    },
    foot:
      project.budget != null
        ? [["Total alloue", fmtMoney(allocated), pct(allocated, project.budget)]]
        : undefined,
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [TEXT.r, TEXT.g, TEXT.b],
      fontStyle: "bold",
    },
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;

  const footerY = Math.min(finalY + 14, doc.internal.pageSize.getHeight() - 16);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    "Document genere par NexKeep - Module Organisation. A titre indicatif.",
    margin,
    footerY
  );
  doc.text(`Projet : ${projectName}`, margin, footerY + 4);

  return Buffer.from(doc.output("arraybuffer"));
}

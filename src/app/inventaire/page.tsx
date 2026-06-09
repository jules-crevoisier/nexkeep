"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import * as XLSX from "xlsx"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { ModuleSwitcher } from "@/components/layout/module-switcher"
import { AuthGuard } from "@/components/auth/auth-guard"
import { RestrictedButton } from "@/components/permissions/restricted-button"
import { GuardedActionDialog } from "@/components/permissions/guarded-action-dialog"
import { useGuardedAction } from "@/hooks/use-guarded-action"
import { usePermissions } from "@/hooks/use-permissions"
import { toast } from "sonner"
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Euro,
  Search,
  Eye,
  Download,
  Upload,
  CalendarClock,
} from "lucide-react"

interface InventoryItem {
  id: string
  name: string
  description?: string | null
  category?: string | null
  reference?: string | null
  quantity: number
  unit: string
  minQuantity?: number | null
  unitValue?: number | null
  location?: string | null
  condition?: string | null
  expiryDate?: string | null
  isActive: boolean
}

interface ParsedRow {
  name: string
  category: string
  description: string
  quantity: number
  unit: string
  location: string
  expiryDate: unknown
}

// Catégories suggérées typiques d'un BDE (l'utilisateur peut en saisir d'autres)
const SUGGESTED_CATEGORIES = [
  "Boissons",
  "Nourriture",
  "Matériel événementiel",
  "Son / Lumière",
  "Goodies / Textile",
  "Décoration",
  "Vaisselle / Gobelets",
  "Bureautique",
  "Jeux",
  "Autre",
]

const CONDITION_LABELS: Record<string, string> = {
  new: "Neuf",
  good: "Bon état",
  worn: "Usé",
  broken: "HS / Cassé",
}

const formatEuro = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n)

const emptyForm = {
  name: "",
  category: "",
  reference: "",
  quantity: "0",
  unit: "unité",
  minQuantity: "",
  unitValue: "",
  location: "",
  condition: "good",
  expiryDate: "",
  description: "",
}

// Normalise un en-tête de colonne (minuscule, sans accent)
const normalizeHeader = (s: unknown): string =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()

// Convertit une valeur de cellule date en chaîne yyyy-mm-dd pour <input type=date>
const toDateInput = (v?: string | null): string => {
  if (!v) return ""
  const d = new Date(v)
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0]
}

// Statut de péremption : "expired", "soon" (< 30 jours) ou null
const expiryStatus = (v?: string | null): "expired" | "soon" | null => {
  if (!v) return null
  const d = new Date(v)
  if (isNaN(d.getTime())) return null
  const days = (d.getTime() - Date.now()) / 86400000
  if (days < 0) return "expired"
  if (days <= 30) return "soon"
  return null
}

export default function InventairePage() {
  // L'inventaire est un module à part, gouverné par le rôle dans l'organisation :
  // tout membre peut consulter, les membres (et plus) peuvent modifier, le lecteur
  // est en lecture seule.
  const { canEditOrga, isViewer, orgaDeniedMessage } = usePermissions()
  const guard = useGuardedAction(canEditOrga, orgaDeniedMessage)

  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [moveItem, setMoveItem] = useState<InventoryItem | null>(null)
  const [moveType, setMoveType] = useState<"in" | "out" | "adjust">("in")
  const [moveQty, setMoveQty] = useState("")
  const [moveReason, setMoveReason] = useState("")

  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<ParsedRow[] | null>(null)
  const [importing, setImporting] = useState(false)

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/inventory")
      if (res.ok) setItems(await res.json())
    } catch {
      // silencieux
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[],
    [items]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (categoryFilter !== "all" && i.category !== categoryFilter) return false
      if (!q) return true
      return (
        i.name.toLowerCase().includes(q) ||
        (i.reference ?? "").toLowerCase().includes(q) ||
        (i.location ?? "").toLowerCase().includes(q)
      )
    })
  }, [items, search, categoryFilter])

  const stats = useMemo(() => {
    const totalValue = items.reduce((s, i) => s + (i.unitValue ?? 0) * i.quantity, 0)
    const lowStock = items.filter(
      (i) => i.minQuantity != null && i.quantity <= i.minQuantity
    ).length
    return { count: items.length, totalValue, lowStock }
  }, [items])

  const exportToXLSX = () => {
    // On exporte la liste filtrée affichée (recherche + catégorie)
    const rows = [...filtered].sort((a, b) => a.name.localeCompare(b.name, "fr"))

    const headers = [
      "Nom",
      "Catégorie",
      "Référence",
      "Quantité",
      "Unité",
      "Seuil d'alerte",
      "Valeur unitaire (€)",
      "Valeur totale (€)",
      "Lieu de stockage",
      "Date de péremption",
      "État",
      "Statut",
      "Alerte stock",
      "Description",
    ]

    const data = rows.map((i) => [
      i.name,
      i.category ?? "",
      i.reference ?? "",
      i.quantity,
      i.unit,
      i.minQuantity ?? "",
      i.unitValue ?? "",
      i.unitValue != null ? parseFloat((i.unitValue * i.quantity).toFixed(2)) : "",
      i.location ?? "",
      i.expiryDate ? new Date(i.expiryDate).toLocaleDateString("fr-FR") : "",
      i.condition ? CONDITION_LABELS[i.condition] ?? i.condition : "",
      i.isActive ? "Actif" : "Archivé",
      i.minQuantity != null && i.quantity <= i.minQuantity ? "STOCK BAS" : "",
      i.description ?? "",
    ])

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data])
    worksheet["!cols"] = [
      { wch: 26 }, // Nom
      { wch: 18 }, // Catégorie
      { wch: 14 }, // Référence
      { wch: 10 }, // Quantité
      { wch: 10 }, // Unité
      { wch: 13 }, // Seuil
      { wch: 16 }, // Valeur unitaire
      { wch: 16 }, // Valeur totale
      { wch: 20 }, // Lieu
      { wch: 16 }, // Date de péremption
      { wch: 12 }, // État
      { wch: 10 }, // Statut
      { wch: 12 }, // Alerte
      { wch: 35 }, // Description
    ]

    // En-tête en gras sur fond bleu (même DA que l'export Historique)
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1")
    for (let col = range.s.c; col <= range.e.c; col++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!worksheet[addr]) continue
      worksheet[addr].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "3B82F6" } },
        alignment: { horizontal: "center" },
      }
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventaire")

    // Feuille Résumé (global + répartition par catégorie)
    const byCategory = new Map<string, { count: number; value: number }>()
    for (const i of rows) {
      const key = i.category || "Sans catégorie"
      const entry = byCategory.get(key) ?? { count: 0, value: 0 }
      entry.count += 1
      entry.value += (i.unitValue ?? 0) * i.quantity
      byCategory.set(key, entry)
    }

    const summaryData: (string | number)[][] = [
      ["Résumé de l'inventaire"],
      ["", ""],
      ["Articles référencés", rows.length],
      ["Valeur totale du stock (€)", parseFloat(stats.totalValue.toFixed(2))],
      ["Articles en alerte stock bas", stats.lowStock],
      ["Date d'export", new Date().toLocaleString("fr-FR")],
      ["", ""],
      ["Répartition par catégorie", ""],
      ["Catégorie", "Articles", "Valeur (€)"],
      ...Array.from(byCategory.entries())
        .sort((a, b) => b[1].value - a[1].value)
        .map(([cat, v]) => [cat, v.count, parseFloat(v.value.toFixed(2))]),
    ]
    const summary = XLSX.utils.aoa_to_sheet(summaryData)
    summary["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }]
    if (summary["A1"]) {
      summary["A1"].s = { font: { bold: true, size: 16 }, fill: { fgColor: { rgb: "E5E7EB" } } }
    }
    XLSX.utils.book_append_sheet(workbook, summary, "Résumé")

    XLSX.writeFile(workbook, `inventaire-${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  // Lit un fichier Excel et mappe les colonnes par nom d'en-tête (tolérant aux accents/casse).
  // Compatible avec le modèle « Suivi de l'inventaire » : Catégorie, Nom de l'article,
  // Description, Quantité, Unité, Date de péremption, Localisation dans le stock, Remarques.
  const parseFile = async (file: File): Promise<ParsedRow[]> => {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: "array", cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const grid: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" })

    // Trouver la ligne d'en-tête (celle qui contient une colonne « nom »)
    const headerIdx = grid.findIndex((row) =>
      row.some((c) => normalizeHeader(c).includes("nom"))
    )
    if (headerIdx === -1) return []

    const headers = grid[headerIdx].map(normalizeHeader)
    const colOf = (pred: (h: string) => boolean) => headers.findIndex(pred)
    const idx = {
      category: colOf((h) => h.includes("categor")),
      name: colOf((h) => h.includes("nom")),
      description: colOf((h) => h === "description" || h.includes("description")),
      quantity: colOf((h) => h.includes("quantit")),
      unit: colOf((h) => h === "unite" || h.startsWith("unite")),
      expiry: colOf((h) => h.includes("peremp") || h.includes("perim")),
      location: colOf((h) => h.includes("localisation") || h.includes("emplacement")),
      remarks: colOf((h) => h.includes("remarque")),
    }

    const get = (row: unknown[], i: number) => (i >= 0 ? row[i] : "")

    return grid
      .slice(headerIdx + 1)
      .map((row): ParsedRow | null => {
        const name = String(get(row, idx.name) ?? "").trim()
        if (!name) return null
        const desc = String(get(row, idx.description) ?? "").trim()
        const remarks = String(get(row, idx.remarks) ?? "").trim()
        const quantity = Number(get(row, idx.quantity))
        return {
          name,
          category: String(get(row, idx.category) ?? "").trim(),
          description: [desc, remarks].filter(Boolean).join(" — "),
          quantity: Number.isFinite(quantity) ? quantity : 0,
          unit: String(get(row, idx.unit) ?? "").trim() || "unité",
          location: String(get(row, idx.location) ?? "").trim(),
          expiryDate: get(row, idx.expiry),
        }
      })
      .filter((x): x is ParsedRow => x !== null)
  }

  const onFileChosen = guard.run(() => fileInputRef.current?.click())

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // permet de re-sélectionner le même fichier
    if (!file) return
    try {
      const parsed = await parseFile(file)
      if (parsed.length === 0) {
        toast.error("Aucun article détecté. Vérifiez la colonne « Nom de l'article ».")
        return
      }
      setPendingImport(parsed)
    } catch {
      toast.error("Lecture du fichier impossible")
    }
  }

  const confirmImport = async () => {
    if (!pendingImport) return
    setImporting(true)
    try {
      const res = await fetch("/api/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: pendingImport }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        throw new Error(d?.error)
      }
      const d = await res.json()
      toast.success(`${d.imported} article(s) importé(s)`)
      setPendingImport(null)
      fetchItems()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Import impossible")
    } finally {
      setImporting(false)
    }
  }

  const openCreate = guard.run(() => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  })

  const openEdit = (item: InventoryItem) =>
    guard.run(() => {
      setEditing(item)
      setForm({
        name: item.name,
        category: item.category ?? "",
        reference: item.reference ?? "",
        quantity: String(item.quantity),
        unit: item.unit,
        minQuantity: item.minQuantity != null ? String(item.minQuantity) : "",
        unitValue: item.unitValue != null ? String(item.unitValue) : "",
        location: item.location ?? "",
        condition: item.condition ?? "good",
        expiryDate: toDateInput(item.expiryDate),
        description: item.description ?? "",
      })
      setFormOpen(true)
    })()

  const saveForm = async () => {
    if (!form.name.trim()) {
      toast.error("Le nom est requis")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        category: form.category,
        reference: form.reference,
        unit: form.unit,
        minQuantity: form.minQuantity,
        unitValue: form.unitValue,
        location: form.location,
        condition: form.condition,
        expiryDate: form.expiryDate || null,
        description: form.description,
        ...(editing ? {} : { quantity: form.quantity }),
      }
      const res = await fetch(
        editing ? `/api/inventory/${editing.id}` : "/api/inventory",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) throw new Error()
      toast.success(editing ? "Article mis à jour" : "Article ajouté")
      setFormOpen(false)
      fetchItems()
    } catch {
      toast.error("Enregistrement impossible")
    } finally {
      setSaving(false)
    }
  }

  const submitMovement = async () => {
    if (!moveItem) return
    const qty = Number(moveQty)
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Quantité invalide")
      return
    }
    try {
      const res = await fetch(`/api/inventory/${moveItem.id}/movement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: moveType, quantity: qty, reason: moveReason }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        throw new Error(d?.error)
      }
      toast.success("Stock mis à jour")
      setMoveItem(null)
      setMoveQty("")
      setMoveReason("")
      fetchItems()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Mouvement impossible")
    }
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    try {
      const res = await fetch(`/api/inventory/${deleteItem.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Article supprimé")
      setDeleteItem(null)
      fetchItems()
    } catch {
      toast.error("Suppression impossible")
    }
  }

  const openMovement = (item: InventoryItem, type: "in" | "out" | "adjust") =>
    guard.run(() => {
      setMoveItem(item)
      setMoveType(type)
      setMoveQty(type === "adjust" ? String(item.quantity) : "")
      setMoveReason("")
    })()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <ModuleSwitcher />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="space-y-6">
            {/* Bandeau lecture seule */}
            {isViewer && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <Eye className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Inventaire en lecture seule — {orgaDeniedMessage}</p>
              </div>
            )}

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold">Inventaire</h1>
                <p className="text-muted-foreground">
                  Gérez le stock de matériel et de consommables du BDE
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFile}
                />
                {canEditOrga && (
                  <Button variant="outline" onClick={onFileChosen}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer Excel
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={exportToXLSX}
                  disabled={loading || items.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exporter Excel
                </Button>
                <RestrictedButton
                  allowed={canEditOrga}
                  deniedMessage={orgaDeniedMessage}
                  onClick={openCreate}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvel article
                </RestrictedButton>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Articles référencés</CardTitle>
                  <Boxes className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? "-" : stats.count}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valeur du stock</CardTitle>
                  <Euro className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {loading ? "-" : formatEuro(stats.totalValue)}
                  </div>
                </CardContent>
              </Card>
              <Card className={stats.lowStock > 0 ? "border-amber-500/40" : undefined}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Alertes stock bas</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stats.lowStock > 0 ? "text-amber-600" : ""}`}>
                    {loading ? "-" : stats.lowStock}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher (nom, référence, lieu)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Liste */}
            <Card>
              <CardHeader>
                <CardTitle>Articles en stock</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Aucun article"
                    description="Commencez par référencer le matériel et les consommables du BDE."
                  />
                ) : (
                  <div className="divide-y">
                    {filtered.map((item) => {
                      const low = item.minQuantity != null && item.quantity <= item.minQuantity
                      return (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{item.name}</p>
                              {item.category && (
                                <Badge variant="secondary">{item.category}</Badge>
                              )}
                              {item.condition && CONDITION_LABELS[item.condition] && (
                                <Badge variant="outline">{CONDITION_LABELS[item.condition]}</Badge>
                              )}
                              {low && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3" /> Stock bas
                                </Badge>
                              )}
                              {expiryStatus(item.expiryDate) === "expired" && (
                                <Badge variant="destructive">
                                  <CalendarClock className="h-3 w-3" /> Périmé
                                </Badge>
                              )}
                              {expiryStatus(item.expiryDate) === "soon" && (
                                <Badge className="border-transparent bg-amber-500 text-white">
                                  <CalendarClock className="h-3 w-3" /> Bientôt périmé
                                </Badge>
                              )}
                              {!item.isActive && <Badge variant="outline">Archivé</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {[
                                item.reference ? `Réf. ${item.reference}` : null,
                                item.location ? `📍 ${item.location}` : null,
                                item.unitValue != null ? `${formatEuro(item.unitValue)}/${item.unit}` : null,
                                item.expiryDate
                                  ? `Péremption : ${new Date(item.expiryDate).toLocaleDateString("fr-FR")}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`text-lg font-bold ${low ? "text-amber-600" : ""}`}>
                                {item.quantity} <span className="text-sm font-normal">{item.unit}</span>
                              </p>
                              {item.minQuantity != null && (
                                <p className="text-xs text-muted-foreground">
                                  seuil&nbsp;: {item.minQuantity}
                                </p>
                              )}
                            </div>
                            {canEditOrga && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Entrée de stock"
                                  onClick={() => openMovement(item, "in")}
                                >
                                  <ArrowDownToLine className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Sortie de stock"
                                  onClick={() => openMovement(item, "out")}
                                >
                                  <ArrowUpFromLine className="h-4 w-4 text-red-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Modifier"
                                  onClick={() => openEdit(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Supprimer"
                                  onClick={guard.run(() => setDeleteItem(item))}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Dialog création / édition */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="f-name">Nom *</Label>
                <Input
                  id="f-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="f-cat">Catégorie</Label>
                  <Input
                    id="f-cat"
                    list="cat-suggestions"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                  <datalist id="cat-suggestions">
                    {SUGGESTED_CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-ref">Référence</Label>
                  <Input
                    id="f-ref"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!editing && (
                  <div className="space-y-2">
                    <Label htmlFor="f-qty">Quantité initiale</Label>
                    <Input
                      id="f-qty"
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="f-unit">Unité</Label>
                  <Input
                    id="f-unit"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="f-min">Seuil d&apos;alerte</Label>
                  <Input
                    id="f-min"
                    type="number"
                    min="0"
                    placeholder="Optionnel"
                    value={form.minQuantity}
                    onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-val">Valeur unitaire (€)</Label>
                  <Input
                    id="f-val"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optionnel"
                    value={form.unitValue}
                    onChange={(e) => setForm({ ...form, unitValue: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="f-loc">Lieu de stockage</Label>
                  <Input
                    id="f-loc"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-cond">État</Label>
                  <Select
                    value={form.condition}
                    onValueChange={(v) => setForm({ ...form, condition: v })}
                  >
                    <SelectTrigger id="f-cond">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITION_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-exp">Date de péremption</Label>
                <Input
                  id="f-exp"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-desc">Description / notes</Label>
                <Textarea
                  id="f-desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Annuler
              </Button>
              <Button onClick={saveForm} disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog mouvement de stock */}
        <Dialog open={!!moveItem} onOpenChange={(o) => !o && setMoveItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {moveType === "in"
                  ? "Entrée de stock"
                  : moveType === "out"
                  ? "Sortie de stock"
                  : "Ajustement d'inventaire"}
                {moveItem ? ` — ${moveItem.name}` : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Stock actuel&nbsp;: {moveItem?.quantity} {moveItem?.unit}
              </p>
              <div className="space-y-2">
                <Label htmlFor="m-qty">
                  {moveType === "adjust" ? "Nouveau total constaté" : "Quantité"}
                </Label>
                <Input
                  id="m-qty"
                  type="number"
                  min="0"
                  value={moveQty}
                  onChange={(e) => setMoveQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-reason">Motif</Label>
                <Input
                  id="m-reason"
                  placeholder="Achat, événement, prêt, casse, perte…"
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMoveItem(null)}>
                Annuler
              </Button>
              <Button onClick={submitMovement}>Valider</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation suppression */}
        <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
              <AlertDialogDescription>
                « {deleteItem?.name} » et tout son historique de mouvements seront définitivement
                supprimés. Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation import */}
        <AlertDialog open={!!pendingImport} onOpenChange={(o) => !o && !importing && setPendingImport(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Importer l&apos;inventaire ?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{pendingImport?.length ?? 0}</strong> article(s) détecté(s) dans le fichier.
                Ils seront <strong>ajoutés</strong> à l&apos;inventaire actuel (les articles existants
                ne sont pas modifiés ni dédoublonnés). Continuer ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={importing}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmImport() }} disabled={importing}>
                {importing ? "Import…" : `Importer ${pendingImport?.length ?? 0} article(s)`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <GuardedActionDialog
          open={guard.deniedOpen}
          onOpenChange={guard.setDeniedOpen}
          message={guard.deniedMessage}
        />
      </div>
    </AuthGuard>
  )
}

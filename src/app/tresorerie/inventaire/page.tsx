"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { DashboardLayout } from "@/components/layout/dashboard-layout"
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
  isActive: boolean
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
  description: "",
}

export default function InventairePage() {
  const { canWriteTreasury, treasuryDeniedMessage } = usePermissions()
  const guard = useGuardedAction(canWriteTreasury, treasuryDeniedMessage)

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
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">Inventaire</h1>
              <p className="text-muted-foreground">
                Gérez le stock de matériel et de consommables du BDE
              </p>
            </div>
            <RestrictedButton
              allowed={canWriteTreasury}
              deniedMessage={treasuryDeniedMessage}
              onClick={openCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvel article
            </RestrictedButton>
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
                            {!item.isActive && <Badge variant="outline">Archivé</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {[
                              item.reference ? `Réf. ${item.reference}` : null,
                              item.location ? `📍 ${item.location}` : null,
                              item.unitValue != null ? `${formatEuro(item.unitValue)}/${item.unit}` : null,
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
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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

        <GuardedActionDialog
          open={guard.deniedOpen}
          onOpenChange={guard.setDeniedOpen}
          message={guard.deniedMessage}
        />
      </DashboardLayout>
    </AuthGuard>
  )
}

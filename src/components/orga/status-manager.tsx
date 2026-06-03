"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GripVertical, Trash2, Plus, AlertTriangle } from "lucide-react";
import { type Status } from "./task-types";

const COLORS = [
  "#64748b",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

interface StatusManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: Status[];
  onChanged: () => void;
}

export function StatusManager({
  open,
  onOpenChange,
  statuses,
  onChanged,
}: StatusManagerProps) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const api = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur");
      } else {
        onChanged();
      }
    } catch {
      setError("Erreur réseau");
    }
    setBusy(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await api("/api/orga/statuses", "POST", { name: newName.trim() });
    setNewName("");
  };

  const rename = (s: Status, name: string) =>
    api(`/api/orga/statuses/${s.id}`, "PATCH", { name });

  const setColor = (s: Status, color: string) =>
    api(`/api/orga/statuses/${s.id}`, "PATCH", { color });

  const toggleBlocked = (s: Status) =>
    api(`/api/orga/statuses/${s.id}`, "PATCH", { isBlocked: !s.isBlocked });

  const handleDrop = async (toIndex: number) => {
    const from = dragIndex;
    setDragIndex(null);
    setOverIndex(null);
    if (from === null || from === toIndex) return;
    const ordered = [...statuses];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(toIndex, 0, moved);
    // réindexation séquentielle des positions modifiées
    setBusy(true);
    setError(null);
    try {
      await Promise.all(
        ordered.map((s, i) =>
          s.position === i
            ? null
            : fetch(`/api/orga/statuses/${s.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ position: i }),
              })
        )
      );
      onChanged();
    } catch {
      setError("Erreur réseau");
    }
    setBusy(false);
  };

  const remove = (s: Status) => api(`/api/orga/statuses/${s.id}`, "DELETE");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gérer les statuts</DialogTitle>
          <DialogDescription>
            Personnalisez les colonnes de votre workflow (ordre, couleur, nom).
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="flex items-center gap-1 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </p>
        )}

        <div className="space-y-2">
          {statuses.map((s, i) => (
            <div
              key={s.id}
              draggable={!busy}
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(i);
              }}
              onDragLeave={() => setOverIndex((o) => (o === i ? null : o))}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2 transition-colors",
                overIndex === i && dragIndex !== i && "ring-2 ring-primary/40",
                dragIndex === i && "opacity-50"
              )}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />

              <div className="flex gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(s, c)}
                    className={cn(
                      "h-4 w-4 rounded-full border",
                      s.color === c
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Couleur ${c}`}
                  />
                ))}
              </div>

              <Input
                defaultValue={s.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== s.name) rename(s, v);
                }}
                className="h-8 flex-1"
              />

              <button
                type="button"
                onClick={() => toggleBlocked(s)}
                title="Statut « bloquant » (affiche le point bloquant)"
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium transition-colors",
                  s.isBlocked
                    ? "bg-amber-100 text-amber-700"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                Bloquant
              </button>

              {s.isDefault || s.isDone ? (
                <span className="w-7 text-center text-[10px] text-muted-foreground">
                  {s.isDefault ? "déf." : "fin"}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(s)}
                  className="rounded p-1 text-muted-foreground hover:text-red-600"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t pt-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Nouveau statut…"
            className="h-9"
          />
          <Button onClick={handleAdd} disabled={busy || !newName.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

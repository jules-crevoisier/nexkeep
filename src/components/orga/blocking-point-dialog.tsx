"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BlockingPointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusName?: string;
  initialValue?: string;
  onConfirm: (blockingPoint: string) => void;
}

export function BlockingPointDialog({
  open,
  onOpenChange,
  statusName,
  initialValue,
  onConfirm,
}: BlockingPointDialogProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue(initialValue ?? "");
  }, [open, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Point bloquant</DialogTitle>
          <DialogDescription>
            {statusName
              ? `Cette tâche passe en « ${statusName} ». Précisez ce qui bloque (facultatif).`
              : "Précisez ce qui bloque (facultatif)."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blocking-point">Description</Label>
            <Textarea
              id="blocking-point"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex: en attente de validation du devis…"
              rows={3}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit">Valider</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

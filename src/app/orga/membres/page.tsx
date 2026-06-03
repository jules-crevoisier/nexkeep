"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, Users, Pencil, Trash2, Mail } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OrgaLayout } from "@/components/layout/orga-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MemberDialog } from "@/components/orga/member-dialog";
import type { Member } from "@/components/orga/task-types";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function MembresPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/orga/members");
      if (res.ok) setMembers(await res.json());
    } catch (e) {
      console.error("Error fetching members:", e);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (session) fetchMembers();
  }, [session, fetchMembers]);

  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (member: Member) => {
    setEditing(member);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setDeleteTarget(null);
    try {
      await fetch(`/api/orga/members/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Error deleting member:", e);
      fetchMembers();
    }
  };

  return (
    <AuthGuard>
      <OrgaLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Membres</h1>
              <p className="text-muted-foreground">
                Carnet de contacts pour attribuer vos tâches
              </p>
            </div>
            <Button onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau membre
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Chargement…
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Aucun membre pour le moment</p>
              <Button variant="outline" className="mt-4" onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un membre
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <Card key={member.id} className="group">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: member.color }}
                    >
                      {initials(member.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{member.name}</p>
                      {member.email && (
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          {member.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => handleEdit(member)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(member)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <MemberDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            member={editing}
            onSaved={fetchMembers}
          />

          <AlertDialog
            open={!!deleteTarget}
            onOpenChange={(o) => !o && setDeleteTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le membre ?</AlertDialogTitle>
                <AlertDialogDescription>
                  « {deleteTarget?.name} » sera retiré de toutes ses tâches
                  assignées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </OrgaLayout>
    </AuthGuard>
  );
}

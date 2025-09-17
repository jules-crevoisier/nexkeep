"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, User, Shield, Bell, Palette } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AuthGuard } from "@/components/auth/auth-guard";
import { BudgetModificationForm } from "@/components/forms/budget-modification-form";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [currentBudget, setCurrentBudget] = useState(0);

  useEffect(() => {
    if (session?.user?.budgetInitial !== undefined) {
      setCurrentBudget(session.user.budgetInitial);
    }
  }, [session]);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut({ callbackUrl: "/login" });
  };

  const handleBudgetUpdated = (newBudget: number) => {
    setCurrentBudget(newBudget);
    // Le composant BudgetModificationForm émet déjà l'événement 'budgetUpdated'
  };


  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
            <p className="text-muted-foreground">
              Gérez vos préférences et votre compte
            </p>
          </div>
        </div>

        {/* Settings Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Profil
              </CardTitle>
              <CardDescription>
                Informations de votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  value={session?.user?.email || ""} 
                  disabled 
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  L'email ne peut pas être modifié
                </p>
              </div>
              <div className="space-y-2">
                <BudgetModificationForm
                  currentBudget={currentBudget}
                  onBudgetUpdated={handleBudgetUpdated}
                />
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="mr-2 h-5 w-5" />
                Apparence
              </CardTitle>
              <CardDescription>
                Personnalisez l'apparence de l'application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Thème</Label>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <ThemeToggle />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Choisissez votre thème préféré
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Actions du Compte
              </CardTitle>
              <CardDescription>
                Gestion de votre session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleSignOut}
                disabled={loading}
              >
                {loading ? "Déconnexion..." : "Se déconnecter"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Déconnectez-vous de votre compte en toute sécurité
              </p>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Préférences de notification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Fonctionnalités de notification</p>
                <p className="text-sm">Bientôt disponibles</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Change Password Form */}
        <ChangePasswordForm />
      </div>
      </DashboardLayout>
    </AuthGuard>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Wallet, History, LogOut } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <Wallet className="h-6 w-6" />
            <span className="text-lg font-semibold">NexKeep</span>
          </Link>
        </div>
        
        {session ? (
          <nav className="flex items-center space-x-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Wallet className="mr-2 h-4 w-4" />
                Budget
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="ghost" size="sm">
                <History className="mr-2 h-4 w-4" />
                Historique
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </nav>
        ) : (
          <nav className="flex items-center space-x-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Connexion
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Inscription
              </Button>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

import type { Metadata } from "next";
import { Inter, Nunito } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/session-provider";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "sonner";
import { PermissionDeniedListener } from "@/components/permissions/permission-denied-listener";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "NexKeep - Gestionnaire de Budget",
  description: "Application moderne de gestion de budget pour associations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${nunito.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          defaultTheme="system"
          storageKey="nexkeep-theme"
        >
          <AuthProvider>
            <WorkspaceProvider>
              {children}
              <PermissionDeniedListener />
              <Toaster position="top-right" richColors />
            </WorkspaceProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

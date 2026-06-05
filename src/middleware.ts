import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Logique supplémentaire si nécessaire
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Routes publiques qui ne nécessitent pas d'authentification
        const publicRoutes = [
          "/login",
          "/register",
          "/request-reimbursement",
          "/invitations",      // Page d'atterrissage d'invitation (visible avant connexion)
          "/api/auth",
          "/api/public",
          "/api/invitations",  // Infos publiques d'invitation (l'accept se protège lui-même)
          "/api/upload"  // Nécessaire pour les formulaires externes
        ];
        
        // Vérifier si la route est publique
        const isPublicRoute = publicRoutes.some(route => 
          pathname.startsWith(route)
        );
        
        // Si c'est une route publique, autoriser l'accès
        if (isPublicRoute) {
          return true;
        }

        // Diagnostic email (dev uniquement, les handlers renvoient 404 en prod)
        if (process.env.NODE_ENV !== "production" && pathname.startsWith("/api/dev")) {
          return true;
        }
        
        // Pour toutes les autres routes, vérifier la présence du token
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - api/public (public API routes)
     * - api/upload (file upload for external forms)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|api/public|api/upload|_next/static|_next/image|favicon.ico|public).*)",
  ],
};

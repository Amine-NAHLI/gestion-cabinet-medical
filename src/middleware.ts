import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const host = req.headers.get("host") || "";
    const pathname = req.nextUrl.pathname;

    // Détecter si la requête est sur le domaine toncabinet.me
    if (host.endsWith("toncabinet.me")) {
      const subdomain = host.replace(".toncabinet.me", "").replace(/^www\./, "");
      const isApex = subdomain === "toncabinet.me" || subdomain === "www" || subdomain === "";

      // 1. SI ON EST SUR UN SOUS-DOMAINE (ex: test.toncabinet.me, amine.toncabinet.me)
      if (!isApex && subdomain !== "admin") {
        // A) /login et / (racine) : La connexion s'effectue EXCLUSIVEMENT sur https://toncabinet.me/login sans sous-domaine
        if (pathname === "/login" || pathname === "/") {
          return NextResponse.redirect(new URL("https://toncabinet.me/login"));
        }

        // B) Si on tente d'accéder au /dashboard :
        if (pathname.startsWith("/dashboard")) {
          // Si non connecté : renvoyer impérativement vers le login racine sans sous-domaine
          if (!token) {
            return NextResponse.redirect(new URL("https://toncabinet.me/login"));
          }

          const clinicSlug = token.clinicSlug as string | undefined;

          // Si le cabinet a été supprimé ou n'a pas de sous-domaine valide
          if (!clinicSlug) {
            return NextResponse.redirect(new URL("https://toncabinet.me/login"));
          }

          // Si l'utilisateur tente d'accéder à un sous-domaine qui n'est pas le sien (ex: compte supprimé 'test')
          if (subdomain !== clinicSlug) {
            return NextResponse.redirect(new URL(`https://${clinicSlug}.toncabinet.me${pathname}`));
          }
        } else {
          // Tout autre chemin sur un sous-domaine (ex: anciennes pages ou requêtes perdues) -> retour login racine
          return NextResponse.redirect(new URL("https://toncabinet.me/login"));
        }
      }

      // 2. SI ON EST SUR LE DOMAINE PRINCIPAL (toncabinet.me ou www.toncabinet.me)
      if (isApex) {
        if (pathname.startsWith("/dashboard")) {
          const clinicSlug = token?.clinicSlug as string | undefined;
          if (clinicSlug) {
            return NextResponse.redirect(new URL(`https://${clinicSlug}.toncabinet.me${pathname}`));
          } else if (!token) {
            return NextResponse.redirect(new URL("https://toncabinet.me/login"));
          }
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;
        // Seules les routes /dashboard nécessitent une session authentifiée
        if (pathname.startsWith("/dashboard")) {
          return !!token;
        }
        // Toutes les autres routes (/login, /, /admin, etc.) sont autorisées à passer dans la fonction middleware
        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Matcher global interceptant toutes les routes applicatives
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

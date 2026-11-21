import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const host = req.headers.get("host") || "";

    // Si on est en production sur toncabinet.me
    if (host.endsWith("toncabinet.me")) {
      const subdomain = host.replace(".toncabinet.me", "").replace("www.", "");
      // Si l'utilisateur est sur la racine toncabinet.me ou www.toncabinet.me
      if (subdomain === "toncabinet.me" || subdomain === "www" || subdomain === "") {
        const clinicSlug = token?.clinicSlug as string | undefined;
        // Redirige automatiquement le médecin ou l'assistante vers le sous-domaine de son cabinet
        if (clinicSlug) {
          const targetUrl = req.nextUrl.clone();
          targetUrl.host = `${clinicSlug}.toncabinet.me`;
          return NextResponse.redirect(targetUrl);
        }
      }
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

// Protège uniquement l'espace cabinet /dashboard
// La route /admin gère de manière autonome son formulaire spécial dédié (AdminSpecialLoginForm)
export const config = {
  matcher: ["/dashboard/:path*"],
};

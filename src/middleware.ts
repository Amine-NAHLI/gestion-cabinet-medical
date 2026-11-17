import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
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


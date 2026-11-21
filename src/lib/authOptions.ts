import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { users, clinics } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const userArray = await db.select().from(users).where(eq(users.email, credentials.email));
        const user = userArray[0];

        if (!user) return null;
        if (user.status === "suspended") return null;

        const passwordsMatch = await bcrypt.compare(credentials.password, user.password);

        if (passwordsMatch) {
          // Récupérer le slug du cabinet pour le sous-domaine dynamique
          let clinicSlug: string | null = null;
          if (user.clinicId) {
            const clinicArray = await db
              .select({ slug: clinics.slug })
              .from(clinics)
              .where(eq(clinics.id, user.clinicId))
              .limit(1);
            clinicSlug = clinicArray[0]?.slug || null;
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            clinicId: user.clinicId,
            clinicSlug,
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.clinicId = (user as any).clinicId;
        token.clinicSlug = (user as any).clinicSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.clinicId = token.clinicId as number | null;
        session.user.clinicSlug = token.clinicSlug as string | null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      try {
        const parsed = new URL(url);
        // Autoriser la navigation cross-subdomain sur .toncabinet.me
        if (parsed.hostname.endsWith("toncabinet.me") || parsed.hostname.includes("vercel.app")) {
          return url;
        }
      } catch {
        // url relative
      }

      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      return baseUrl;
    }
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // Permet de partager la session entre toncabinet.me et *.toncabinet.me
        domain:
          process.env.NODE_ENV === "production" && !process.env.VERCEL_URL?.includes("localhost")
            ? ".toncabinet.me"
            : undefined,
      },
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

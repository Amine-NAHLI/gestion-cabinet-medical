import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
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
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            clinicId: user.clinicId,
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.clinicId = token.clinicId as number | null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Déterminer l'URL canonique de production
      let host = baseUrl;
      if (process.env.VERCEL_URL) {
        host = `https://${process.env.VERCEL_URL}`;
      } else if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
        host = process.env.NEXTAUTH_URL;
      }

      // Si URL relative, concaténer avec le domaine actuel
      if (url.startsWith("/")) {
        return `${host}${url}`;
      }

      // Si même origine ou domaine vercel
      try {
        const parsed = new URL(url);
        if (parsed.origin === host || parsed.hostname.includes("vercel.app")) {
          return url;
        }
      } catch {
        return host;
      }

      return host;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

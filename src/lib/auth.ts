import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Vérification avec le compte Médecin
        if (
          credentials.email === process.env.MEDECIN_EMAIL &&
          credentials.password === process.env.MEDECIN_PASSWORD
        ) {
          return { id: "1", name: "Docteur", email: credentials.email, role: "medecin" };
        }

        // Vérification avec le compte Assistante
        if (
          credentials.email === process.env.ASSISTANTE_EMAIL &&
          credentials.password === process.env.ASSISTANTE_PASSWORD
        ) {
          return { id: "2", name: "Assistante", email: credentials.email, role: "assistante" };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  }
};

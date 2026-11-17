import "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: string;
    clinicId?: number | null;
  }
  interface Session {
    user: User & {
      id?: string;
      role?: string;
      clinicId?: number | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    clinicId?: number | null;
  }
}


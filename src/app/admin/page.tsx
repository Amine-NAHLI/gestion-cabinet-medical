import "@/app/globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getAdminDashboardData } from "@/actions/admin";
import AdminDashboardClient from "./AdminDashboardClient";
import AdminSpecialLoginForm from "./AdminSpecialLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // Si l'utilisateur n'est pas connecté en tant que Super Admin, afficher le formulaire spécial Admin
  if (!session || session.user?.role !== "superadmin") {
    return <AdminSpecialLoginForm />;
  }

  const initialData = await getAdminDashboardData();
  return <AdminDashboardClient initialData={initialData} adminEmail={session.user.email || "nahliamine95@gmail.com"} />;
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardRedirect() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "medecin") {
    redirect("/dashboard/medecin");
  } else if (session.user.role === "assistante") {
    redirect("/dashboard/assistante");
  }

  return <div style={{ padding: '2rem' }}>Redirection en cours...</div>;
}

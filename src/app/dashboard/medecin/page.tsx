import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MedecinDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "medecin") {
    redirect("/login");
  }

  return (
    <div style={{ padding: '3rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#111827', fontSize: '2rem', marginBottom: '1rem' }}>Dashboard Médecin</h1>
      <div style={{ padding: '2rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <p style={{ fontSize: '1.1rem', color: '#4b5563' }}>Module en cours de développement...</p>
      </div>
    </div>
  );
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getClinicSettings } from "@/actions/settings";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = session?.user as { role?: string; name?: string | null; email?: string | null } | undefined;
  const role = user?.role || "assistant";
  const settings = await getClinicSettings();

  const todayStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardShell
      role={role}
      clinicName={settings?.clinicName || "MonCabinet"}
      todayStr={todayStr}
      user={{ name: user?.name, email: user?.email }}
    >
      {children}
    </DashboardShell>
  );
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getDoctorOnboardingData } from "@/actions/onboarding-wizard";
import DoctorOnboardingClient from "./DoctorOnboardingClient";

export const dynamic = "force-dynamic";

export default async function DoctorOnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = session.user as { role?: string };
  if (user.role !== "doctor") {
    redirect("/dashboard");
  }

  const initialData = await getDoctorOnboardingData();
  if (!initialData) {
    redirect("/dashboard");
  }

  // Si le médecin a déjà complété son onboarding, il peut aller directement au dashboard
  // (sauf s'il accède explicitement pour re-configurer)
  return <DoctorOnboardingClient initialData={initialData} />;
}

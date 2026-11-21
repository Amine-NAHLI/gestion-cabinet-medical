import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getChatOverviewData } from "@/actions/community";
import ChatClient from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams?: Promise<{ doctor?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as { role?: string } | undefined)?.role;
  if (role !== "doctor") {
    redirect("/dashboard");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const initialDoctorId = resolvedParams.doctor ? parseInt(resolvedParams.doctor) : null;

  const data = await getChatOverviewData();
  if (!data) redirect("/dashboard");

  return <ChatClient initialData={data} initialDoctorId={initialDoctorId} />;
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getCommunityData } from "@/actions/community";
import CommunityClient from "./CommunityClient";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = session.user as { role?: string };
  if (user.role !== "doctor") {
    redirect("/dashboard");
  }

  const communityData = await getCommunityData();
  if (!communityData || !communityData.isDoctor) {
    redirect("/dashboard");
  }

  return (
    <CommunityClient
      initialData={{
        isDoctor: true,
        isMember: Boolean(communityData.isMember),
        posts: communityData.posts || [],
        confreres: communityData.confreres || [],
        currentDoctorId: communityData.currentDoctorId,
      }}
    />
  );
}

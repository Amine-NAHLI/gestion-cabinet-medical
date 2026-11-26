"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function DetailsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const plan = searchParams.get("plan") || "pro";
    const cycle = searchParams.get("cycle") || "yearly";
    router.replace(`/register?step=details&plan=${plan}&cycle=${cycle}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8F9FB]">
      <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function RegisterDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8F9FB]">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DetailsRedirect />
    </Suspense>
  );
}

import "@/app/globals.css";
import { Suspense } from "react";
import VerifyOtpClient from "./VerifyOtpClient";

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800">
          <span className="material-symbols-outlined animate-spin text-3xl text-sky-600">
            progress_activity
          </span>
        </div>
      }
    >
      <VerifyOtpClient />
    </Suspense>
  );
}

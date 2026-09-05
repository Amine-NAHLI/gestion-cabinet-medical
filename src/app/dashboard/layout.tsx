import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import BottomNav from "@/components/BottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role || "assistant";

  const todayStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col relative selection:bg-sky-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
                role === "doctor" ? "bg-sky-600" : "bg-teal-600"
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {role === "doctor" ? "stethoscope" : "assignment_ind"}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">
                MediCabinet
              </span>
              <span
                className={`ml-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  role === "doctor"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-teal-100 text-teal-700"
                }`}
              >
                {role === "doctor" ? "Médecin" : "Assistante"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-xs font-medium capitalize hidden sm:flex">
            <span className="material-symbols-outlined text-base text-slate-400">
              calendar_today
            </span>
            <span>{todayStr}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-36">
        {children}
      </main>

      {/* Floating Bottom Navigation Dock */}
      <BottomNav role={role} user={session?.user} />
    </div>
  );
}

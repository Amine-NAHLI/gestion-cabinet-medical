import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import LogoutButton from "./LogoutButton";

export default async function Sidebar() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col transition-all duration-300 shadow-sm relative z-20">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${role === 'doctor' ? 'bg-sky-600' : 'bg-teal-600'}`}>
          <span className="material-symbols-outlined">{role === 'doctor' ? 'stethoscope' : 'assignment_ind'}</span>
        </div>
        <div>
          <h1 className="font-bold text-slate-900 text-lg tracking-tight leading-none">MediCabinet</h1>
          <p className={`text-xs font-medium mt-1 ${role === 'doctor' ? 'text-sky-600' : 'text-teal-600'}`}>
            Espace {role === 'doctor' ? 'Médecin' : 'Assistante'}
          </p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="mb-4 mt-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Consultations
        </div>

        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors group font-medium">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-teal-500 transition-colors">home</span>
          <span>Accueil</span>
        </Link>
        
        <Link href="/dashboard/queue" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors group font-medium">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-sky-500 transition-colors">queue</span>
          <span>File d'attente</span>
        </Link>

        {role === 'assistant' && (
          <Link href="/dashboard/payments" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors group font-medium">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-teal-500 transition-colors">payments</span>
            <span>Paiements</span>
          </Link>
        )}

        <div className="mb-4 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Données
        </div>

        <Link href="/dashboard/history" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors group font-medium">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-sky-500 transition-colors">history</span>
          <span>Historique</span>
        </Link>

        <Link href="/dashboard/appointments" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors group font-medium">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-fuchsia-500 transition-colors">event</span>
          <span>Rendez-vous</span>
        </Link>

        {role === 'doctor' && (
          <>
            <div className="mb-4 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cabinet
            </div>
            <Link href="/dashboard/stats" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors group font-medium">
              <span className="material-symbols-outlined text-slate-400 group-hover:text-sky-500 transition-colors">bar_chart</span>
              <span>Statistiques</span>
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 px-3 py-3 mb-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <span className="material-symbols-outlined text-sm">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{session?.user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}

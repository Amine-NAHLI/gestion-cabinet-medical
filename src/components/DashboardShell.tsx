"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import RealtimeSync from "@/components/RealtimeSync";

interface DashboardShellProps {
  role: string;
  clinicName: string;
  todayStr: string;
  user?: {
    name?: string | null;
    email?: string | null;
  };
  children: React.ReactNode;
}

export default function DashboardShell({
  role,
  clinicName,
  todayStr,
  user,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restaurer l'état de la sidebar sur desktop
  useEffect(() => {
    try {
      const saved = localStorage.getItem("moncabinet_sidebar");
      if (saved === "closed") {
        setSidebarOpen(false);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Fermer le tiroir mobile automatiquement lors d'un changement de page
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleDesktopSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("moncabinet_sidebar", next ? "open" : "closed");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
    } finally {
      window.location.href = "/login";
    }
  };

  const isDoctor = role === "doctor";

  const navItems = [
    { href: "/dashboard", label: "Accueil", icon: "home", exact: true },
    { href: "/dashboard/queue", label: "File d'attente", icon: "queue", exact: false },
    { href: "/dashboard/patients", label: "Dossiers Patients", icon: "folder_shared", exact: false },
    ...(role === "assistant"
      ? [{ href: "/dashboard/payments", label: "Paiements", icon: "payments", exact: false }]
      : []),
    { href: "/dashboard/history", label: "Historique", icon: "history", exact: false },
    { href: "/dashboard/appointments", label: "Rendez-vous", icon: "event", exact: false },
    { href: "/dashboard/stats", label: "Statistiques", icon: "bar_chart", exact: false },
    { href: "/dashboard/settings", label: "Paramètres", icon: "settings", exact: false },
  ];

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : isDoctor
    ? "DR"
    : "AS";

  const renderNavLinks = (expanded: boolean) => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            title={!expanded ? item.label : undefined}
            className={`flex items-center gap-3 rounded-xl transition-all duration-150 font-semibold text-sm ${
              expanded ? "px-3.5 py-2.5" : "px-0 py-2.5 justify-center"
            } ${
              isActive
                ? isDoctor
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">
              {item.icon}
            </span>
            {expanded && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const renderSidebarFooter = (expanded: boolean) => (
    <div className="p-3 border-t border-slate-100 space-y-2">
      {expanded ? (
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-100">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
              isDoctor ? "bg-sky-600" : "bg-teal-600"
            }`}
          >
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">
              {user?.name || (isDoctor ? "Médecin" : "Assistante")}
            </p>
            <p className="text-[10px] font-medium text-slate-500 truncate">
              {isDoctor ? "Espace Médecin" : "Espace Assistante"}
            </p>
          </div>
        </div>
      ) : (
        <div
          title={user?.name || (isDoctor ? "Médecin" : "Assistante")}
          className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center text-white text-xs font-bold ${
            isDoctor ? "bg-sky-600" : "bg-teal-600"
          }`}
        >
          {userInitials}
        </div>
      )}

      <button
        type="button"
        onClick={handleLogout}
        title={!expanded ? "Déconnexion" : undefined}
        className={`w-full flex items-center gap-2.5 rounded-xl text-red-600 bg-red-50/80 hover:bg-red-100 transition-colors font-semibold text-xs cursor-pointer ${
          expanded ? "px-3.5 py-2.5 justify-start" : "py-2.5 justify-center"
        }`}
      >
        <span className="material-symbols-outlined text-[18px] shrink-0">logout</span>
        {expanded && <span>Déconnexion</span>}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/70 flex relative selection:bg-sky-500 selection:text-white">
      {/* ============================================================
          SIDEBAR DESKTOP (GAUCHE, OUVRABLE / FERMABLE)
         ============================================================ */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-200/80 sticky top-0 h-screen shrink-0 transition-all duration-200 ease-out z-30 ${
          sidebarOpen ? "w-64" : "w-[72px]"
        }`}
      >
        {/* Header Sidebar */}
        <div
          className={`h-16 border-b border-slate-100 flex items-center shrink-0 ${
            sidebarOpen ? "px-4 justify-between" : "justify-center"
          }`}
        >
          {sidebarOpen && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${
                  isDoctor ? "bg-sky-600" : "bg-teal-600"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isDoctor ? "stethoscope" : "assignment_ind"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                  {clinicName}
                </p>
                <p
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isDoctor ? "text-sky-600" : "text-teal-600"
                  }`}
                >
                  {isDoctor ? "Médecin" : "Assistante"}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={toggleDesktopSidebar}
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer shrink-0"
            title={sidebarOpen ? "Réduire le menu" : "Ouvrir le menu"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {sidebarOpen ? "menu_open" : "menu"}
            </span>
          </button>
        </div>

        {renderNavLinks(sidebarOpen)}
        {renderSidebarFooter(sidebarOpen)}
      </aside>

      {/* ============================================================
          SIDEBAR MOBILE / TABLETTE (TIROIR GAUCHE)
         ============================================================ */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              className="relative z-10 w-64 max-w-[82vw] bg-white h-full flex flex-col shadow-2xl border-r border-slate-200"
            >
              <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${
                      isDoctor ? "bg-sky-600" : "bg-teal-600"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isDoctor ? "stethoscope" : "assignment_ind"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 text-sm truncate">
                      {clinicName}
                    </p>
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isDoctor ? "text-sky-600" : "text-teal-600"
                      }`}
                    >
                      {isDoctor ? "Médecin" : "Assistante"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                  aria-label="Fermer le menu"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {renderNavLinks(true)}
              {renderSidebarFooter(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================
          ZONE PRINCIPALE (TOP BAR + CONTENU)
         ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar simple et épurée */}
        <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Bouton ouvrir menu sur mobile */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Ouvrir le menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-slate-900 text-base tracking-tight truncate">
                {clinicName}
              </span>
              <span
                className={`hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  isDoctor
                    ? "bg-sky-100 text-sky-700"
                    : "bg-teal-100 text-teal-700"
                }`}
              >
                {isDoctor ? "Médecin" : "Assistante"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <RealtimeSync role={role} />
            <div className="hidden md:flex items-center gap-2 text-slate-500 text-xs font-semibold capitalize">
              <span className="material-symbols-outlined text-base text-slate-400">
                calendar_today
              </span>
              <span>{todayStr}</span>
            </div>
          </div>
        </header>

        {/* Contenu de la page */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

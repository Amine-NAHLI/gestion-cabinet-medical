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

  useEffect(() => {
    try {
      const saved = localStorage.getItem("moncabinet_sidebar");
      if (saved === "closed") {
        setSidebarOpen(false);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleDesktopSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("moncabinet_sidebar", next ? "open" : "closed");
      } catch {
        // ignore
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

  const primaryItems = [
    { href: "/dashboard", label: "Tableau de bord", icon: "grid_view", exact: true },
    { href: "/dashboard/queue", label: "Salle d'attente", icon: "groups", exact: false },
    { href: "/dashboard/patients", label: "Patients", icon: "folder_shared", exact: false },
    ...(role === "assistant"
      ? [{ href: "/dashboard/payments", label: "Encaissements", icon: "payments", exact: false }]
      : []),
    { href: "/dashboard/appointments", label: "Rendez-vous", icon: "calendar_month", exact: false },
  ];

  const secondaryItems = [
    { href: "/dashboard/history", label: "Historique", icon: "history", exact: false },
    { href: "/dashboard/stats", label: "Statistiques", icon: "bar_chart", exact: false },
    { href: "/dashboard/settings", label: "Paramètres", icon: "tune", exact: false },
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

  const renderGroup = (
    items: { href: string; label: string; icon: string; exact: boolean }[],
    expanded: boolean,
    sectionTitle?: string
  ) => (
    <div className="space-y-0.5">
      {expanded && sectionTitle && (
        <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-medium text-slate-400">
          {sectionTitle}
        </p>
      )}
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            title={!expanded ? item.label : undefined}
            className={`group flex items-center gap-2.5 rounded-lg transition-colors text-[13px] ${
              expanded ? "px-2.5 py-2" : "py-2 justify-center"
            } ${
              isActive
                ? "bg-slate-100 text-slate-900 font-semibold"
                : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[19px] shrink-0 transition-colors ${
                isActive
                  ? isDoctor
                    ? "text-sky-700"
                    : "text-teal-700"
                  : "text-slate-400 group-hover:text-slate-600"
              }`}
            >
              {item.icon}
            </span>
            {expanded && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </div>
  );

  const renderNavLinks = (expanded: boolean) => (
    <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
      {renderGroup(primaryItems, expanded, "Cabinet")}
      <div className="border-t border-slate-100 pt-2">
        {renderGroup(secondaryItems, expanded, "Gestion")}
      </div>
    </nav>
  );

  const renderSidebarFooter = (expanded: boolean) => (
    <div className="p-2.5 border-t border-slate-200/80 space-y-1">
      {expanded ? (
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
              {user?.name || (isDoctor ? "Médecin" : "Assistante")}
            </p>
            <p className="text-[11px] text-slate-500 truncate leading-tight">
              {isDoctor ? "Médecin" : "Secrétariat"}
            </p>
          </div>
        </div>
      ) : (
        <div
          title={user?.name || (isDoctor ? "Médecin" : "Assistante")}
          className="w-8 h-8 mx-auto rounded-md bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold"
        >
          {userInitials}
        </div>
      )}

      <button
        type="button"
        onClick={handleLogout}
        title={!expanded ? "Se déconnecter" : undefined}
        className={`w-full flex items-center gap-2.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50/70 transition-colors font-medium text-[13px] cursor-pointer ${
          expanded ? "px-2.5 py-2 justify-start" : "py-2 justify-center"
        }`}
      >
        <span className="material-symbols-outlined text-[18px] shrink-0">logout</span>
        {expanded && <span>Se déconnecter</span>}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex relative">
      {/* SIDEBAR DESKTOP */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-200/90 sticky top-0 h-screen shrink-0 transition-[width] duration-200 ease-out z-30 ${
          sidebarOpen ? "w-60" : "w-16"
        }`}
      >
        <div
          className={`h-14 border-b border-slate-200/80 flex items-center shrink-0 ${
            sidebarOpen ? "px-3.5 justify-between" : "justify-center"
          }`}
        >
          {sidebarOpen && (
            <div className="min-w-0 pr-2">
              <p className="font-semibold text-slate-900 text-sm tracking-tight truncate">
                {clinicName}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                MonCabinet • {isDoctor ? "Praticien" : "Accueil"}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={toggleDesktopSidebar}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer shrink-0"
            title={sidebarOpen ? "Réduire le menu" : "Ouvrir le menu"}
          >
            <span className="material-symbols-outlined text-[19px]">
              {sidebarOpen ? "dock_to_right" : "menu"}
            </span>
          </button>
        </div>

        {renderNavLinks(sidebarOpen)}
        {renderSidebarFooter(sidebarOpen)}
      </aside>

      {/* SIDEBAR MOBILE */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-slate-900/35"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10 w-60 max-w-[80vw] bg-white h-full flex flex-col shadow-xl border-r border-slate-200"
            >
              <div className="h-14 px-3.5 border-b border-slate-200/80 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {clinicName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {isDoctor ? "Espace Praticien" : "Espace Accueil"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                  aria-label="Fermer le menu"
                >
                  <span className="material-symbols-outlined text-[19px]">close</span>
                </button>
              </div>

              {renderNavLinks(true)}
              {renderSidebarFooter(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ZONE PRINCIPALE */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Ouvrir le menu"
            >
              <span className="material-symbols-outlined text-[19px]">menu</span>
            </button>

            <span className="text-xs font-medium text-slate-500 capitalize truncate hidden sm:inline">
              {todayStr}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <RealtimeSync role={role} />
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
          {children}
        </main>
      </div>
    </div>
  );
}

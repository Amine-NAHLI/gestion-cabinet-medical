"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import RealtimeSync from "@/components/RealtimeSync";
import InternalChatDrawer from "@/components/InternalChatDrawer";
import AssistantOnboardingModal from "@/components/AssistantOnboardingModal";
import DashboardTour from "@/components/DashboardTour";
import { getUnreadChatCount } from "@/actions/community";
import { getActiveNotifications, markNotificationsAsRead } from "@/actions/notifications";
import { getActiveConsultation } from "@/actions/consultation";

export interface ActiveConsultationInfo {
  visitId: number;
  patientName: string;
  patientAge: number;
  patientPhone?: string;
  sinceTime?: string;
}

interface DashboardShellProps {
  role: string;
  clinicName: string;
  clinicLogoUrl?: string | null;
  primaryColor?: string;
  isCommunityMember?: boolean;
  unreadChatCount?: number;
  activeConsultation?: ActiveConsultationInfo | null;
  todayStr: string;
  user?: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    isOnboarded?: boolean;
    hasSeenTour?: boolean;
  };
  children: React.ReactNode;
}

export default function DashboardShell({
  role,
  clinicName,
  clinicLogoUrl,
  primaryColor = "#0f172a",
  isCommunityMember,
  unreadChatCount = 0,
  activeConsultation = null,
  todayStr,
  user,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [chatBadgeCount, setChatBadgeCount] = useState(unreadChatCount);
  const [assistantModalOpen, setAssistantModalOpen] = useState(
    role === "assistant" && user?.isOnboarded === false
  );

  const isDoctor = role === "doctor";

  // Consultation en cours pour le médecin (persistant jusqu'à encaissement)
  const [currentConsultation, setCurrentConsultation] = useState<ActiveConsultationInfo | null>(
    activeConsultation || null
  );

  useEffect(() => {
    if (activeConsultation !== undefined) {
      setCurrentConsultation(activeConsultation);
    }
  }, [activeConsultation]);

  useEffect(() => {
    if (!isDoctor) return;
    const fetchActive = async () => {
      try {
        const active = await getActiveConsultation();
        setCurrentConsultation(active);
      } catch {
        // ignore
      }
    };

    fetchActive();
    const interval = setInterval(fetchActive, 4000);
    const handleActiveUpdate = () => fetchActive();
    window.addEventListener("refresh_active_consultation", handleActiveUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("refresh_active_consultation", handleActiveUpdate);
    };
  }, [isDoctor, pathname]);

  // Notifications en direct par catégorie (Communauté, Messagerie, Interphone, Salle d'attente)
  const [notifCounts, setNotifCounts] = useState({
    community: 0,
    chat: unreadChatCount || 0,
    interphone: 0,
    queue: 0,
  });

  const fetchAllNotifications = useCallback(async () => {
    try {
      const data = await getActiveNotifications();
      const unread = data.notifications.filter((n) => !n.isRead);
      setNotifCounts({
        community: unread.filter((n) => n.type === "community_post").length,
        chat: unread.filter((n) => n.type === "community_message").length,
        interphone: unread.filter((n) => n.type === "clinic_message").length,
        queue: unread.filter((n) => n.type === "queue_arrival").length,
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAllNotifications();
    const interval = setInterval(fetchAllNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchAllNotifications]);

  // Réinitialiser les compteurs et marquer comme lues à la visite de la section
  useEffect(() => {
    if (pathname.startsWith("/dashboard/community") && notifCounts.community > 0) {
      markNotificationsAsRead("community_post");
      setNotifCounts((prev) => ({ ...prev, community: 0 }));
    } else if (pathname.startsWith("/dashboard/chat") && notifCounts.chat > 0) {
      markNotificationsAsRead("community_message");
      setNotifCounts((prev) => ({ ...prev, chat: 0 }));
    } else if (pathname.startsWith("/dashboard/queue") && notifCounts.queue > 0) {
      markNotificationsAsRead("queue_arrival");
      setNotifCounts((prev) => ({ ...prev, queue: 0 }));
    }
  }, [pathname, notifCounts.community, notifCounts.chat, notifCounts.queue]);

  // Rafraîchir périodiquement et sur événement le compteur de messages non lus du médecin
  useEffect(() => {
    if (!isDoctor) return;
    const fetchUnread = async () => {
      try {
        const count = await getUnreadChatCount();
        setChatBadgeCount(count);
      } catch {
        // ignore
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 6000);

    const handleChatRead = () => {
      fetchUnread();
      fetchAllNotifications();
    };
    window.addEventListener("chat_read", handleChatRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener("chat_read", handleChatRead);
    };
  }, [isDoctor, fetchAllNotifications]);

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
      if (typeof window !== "undefined" && window.location.hostname.endsWith("toncabinet.me")) {
        window.location.href = "https://toncabinet.me/login";
      } else {
        window.location.href = "/login";
      }
    }
  };

  const primaryItems = [
    { href: "/dashboard", label: "Tableau de bord", icon: "grid_view", exact: true, tourId: "dashboard" },
    {
      href: "/dashboard/queue",
      label: "Salle d'attente",
      icon: "groups",
      exact: false,
      tourId: "queue",
      badgeCount: notifCounts.queue,
    },
    { href: "/dashboard/patients", label: "Patients", icon: "folder_shared", exact: false, tourId: "patients" },
    ...(role === "assistant"
      ? [{ href: "/dashboard/payments", label: "Encaissements", icon: "payments", exact: false, tourId: "payments" }]
      : []),
    { href: "/dashboard/appointments", label: "Rendez-vous", icon: "calendar_month", exact: false, tourId: "appointments" },
    ...(isDoctor
      ? [
          {
            href: "/dashboard/community",
            label: "Communauté",
            icon: "hub",
            exact: false,
            tourId: "community",
            badgeCount: notifCounts.community,
          },
          {
            href: "/dashboard/chat",
            label: "Messagerie",
            icon: "chat",
            exact: false,
            tourId: "chat",
            badgeCount: Math.max(chatBadgeCount, notifCounts.chat),
          },
        ]
      : []),
  ];

  const secondaryItems = [
    { href: "/dashboard/history", label: "Historique", icon: "history", exact: false, tourId: "history" },
    { href: "/dashboard/stats", label: "Statistiques", icon: "bar_chart", exact: false, tourId: "stats" },
    { href: "/dashboard/settings", label: "Paramètres", icon: "tune", exact: false, tourId: "settings" },
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
    items: {
      href: string;
      label: string;
      icon: string;
      exact: boolean;
      tourId?: string;
      badgeCount?: number;
    }[],
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
            data-tour={item.tourId}
            title={!expanded ? item.label : undefined}
            className={`group relative flex items-center gap-2.5 rounded-lg transition-colors text-[13px] ${
              expanded ? "px-2.5 py-2" : "py-2 justify-center"
            } ${
              isActive
                ? "bg-slate-100 text-slate-900 font-semibold shadow-2xs"
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
            {expanded && <span className="truncate flex-1">{item.label}</span>}
            {item.badgeCount && item.badgeCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-2xs shrink-0 animate-pulse tabular-nums">
                {item.badgeCount}
              </span>
            ) : null}
            {!expanded && item.badgeCount && item.badgeCount > 0 ? (
              <span className="absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white animate-pulse" />
            ) : null}
          </Link>
        );
      })}
    </div>
  );

  const renderNavLinks = (expanded: boolean) => (
    <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
      {/* Consultation active permanente pour le praticien */}
      {isDoctor && currentConsultation && (
        <div className="space-y-1">
          {expanded ? (
            <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-300 shadow-2xs transition-all">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  En consultation
                </span>
                {currentConsultation.sinceTime && (
                  <span className="text-[10px] text-emerald-700 font-semibold tabular-nums">
                    {currentConsultation.sinceTime}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-900 truncate">
                {currentConsultation.patientName}
              </p>
              <p className="text-[11px] text-slate-500 mb-2.5">
                {currentConsultation.patientAge} ans
              </p>
              <Link
                href={`/dashboard/consultation/${currentConsultation.visitId}`}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <span>Reprendre</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
            </div>
          ) : (
            <Link
              href={`/dashboard/consultation/${currentConsultation.visitId}`}
              title={`Consultation en cours : ${currentConsultation.patientName}`}
              className="group relative flex items-center justify-center py-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
            >
              <span className="material-symbols-outlined text-[20px] text-emerald-700 animate-pulse">
                stethoscope
              </span>
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-ping" />
            </Link>
          )}
        </div>
      )}

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
          {user?.avatarUrl ? (
            <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 shrink-0 shadow-2xs">
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              style={{ backgroundColor: primaryColor }}
              className="w-7 h-7 rounded-md text-white flex items-center justify-center text-[11px] font-semibold shrink-0 shadow-2xs"
            >
              {userInitials}
            </div>
          )}
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
          className="w-8 h-8 mx-auto rounded-md overflow-hidden flex items-center justify-center shadow-2xs"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div
              style={{ backgroundColor: primaryColor }}
              className="w-full h-full text-white flex items-center justify-center text-[11px] font-semibold"
            >
              {userInitials}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("moncabinet_start_tour"))}
        title={!expanded ? "Visite guidée" : undefined}
        className={`w-full flex items-center gap-2.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/70 transition-colors font-medium text-[13px] cursor-pointer ${
          expanded ? "px-2.5 py-2 justify-start" : "py-2 justify-center"
        }`}
      >
        <span className="material-symbols-outlined text-[18px] shrink-0 text-emerald-600">help_outline</span>
        {expanded && <span>Visite guidée</span>}
      </button>

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
    <div
      style={{ "--clinic-primary": primaryColor } as React.CSSProperties}
      className="min-h-screen bg-[#F8F9FB] flex relative"
    >
      {/* SIDEBAR DESKTOP */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-200/90 sticky top-0 h-screen shrink-0 transition-[width] duration-200 ease-out z-30 ${
          sidebarOpen ? "w-[240px] min-w-[240px]" : "w-[68px] min-w-[68px]"
        }`}
      >
        <div
          className={`h-14 border-b border-slate-200/80 flex items-center shrink-0 ${
            sidebarOpen ? "px-3.5 justify-between" : "justify-center"
          }`}
        >
          {sidebarOpen && (
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              {clinicLogoUrl && (
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                  <img src={clinicLogoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-sm tracking-tight truncate">
                  {clinicName}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  MonCabinet • {isDoctor ? "Praticien" : "Accueil"}
                </p>
              </div>
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
                <div className="flex items-center gap-2.5 min-w-0">
                  {clinicLogoUrl && (
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      <img src={clinicLogoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">
                      {clinicName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {isDoctor ? "Espace Praticien" : "Espace Accueil"}
                    </p>
                  </div>
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
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-14 px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center cursor-pointer shrink-0 active:bg-slate-100"
              aria-label="Ouvrir le menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>

            <span className="lg:hidden font-semibold text-sm text-slate-900 truncate">
              {clinicName}
            </span>

            <span className="text-xs font-medium text-slate-500 capitalize truncate hidden lg:inline">
              {todayStr}
            </span>
          </div>

          {/* Pillule active "Consultation en cours" pour le praticien */}
          {isDoctor && currentConsultation && (
            <Link
              href={`/dashboard/consultation/${currentConsultation.visitId}`}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition shrink-0 shadow-2xs group ${
                pathname === `/dashboard/consultation/${currentConsultation.visitId}`
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300"
              }`}
              title={`Consultation en cours avec ${currentConsultation.patientName}`}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="hidden sm:inline font-semibold">En consultation :</span>
              <span className="font-semibold truncate max-w-[130px] sm:max-w-[200px]">
                {currentConsultation.patientName}
              </span>
              <span className="text-[11px] font-bold underline underline-offset-2 shrink-0 hidden md:inline ml-0.5">
                {pathname === `/dashboard/consultation/${currentConsultation.visitId}`
                  ? "Fiche ouverte"
                  : "Reprendre →"}
              </span>
            </Link>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {/* Bouton Interphone Cabinet avec Badge de notification directe */}
            <button
              id="tour-interphone"
              data-tour="interphone"
              type="button"
              onClick={() => {
                setChatOpen(true);
                if (notifCounts.interphone > 0) {
                  markNotificationsAsRead("clinic_message");
                  setNotifCounts((prev) => ({ ...prev, interphone: 0 }));
                }
              }}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs active:bg-slate-100"
              title="Ouvrir l'interphone interne du cabinet"
            >
              <span className="material-symbols-outlined text-[17px] text-slate-600">forum</span>
              <span className="hidden sm:inline">Interphone</span>
              {(notifCounts.interphone > 0 || chatUnread > 0) && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  {Math.max(notifCounts.interphone, chatUnread)}
                </span>
              )}
            </button>

            <RealtimeSync role={role} />
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7">
          {children}
        </main>
      </div>

      {/* Tiroir Interphone Cabinet Médecin ⟷ Assistante */}
      <InternalChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        primaryColor={primaryColor}
        onUnreadChange={setChatUnread}
        role={role}
        clinicName={clinicName}
      />

      {/* Modal d'accueil première connexion assistante */}
      <AssistantOnboardingModal
        assistantName={user?.name || "Assistante"}
        clinicName={clinicName}
        isOpen={assistantModalOpen}
        onClose={() => setAssistantModalOpen(false)}
      />

      {/* Visite guidée / Product Tour interactif premier passage */}
      <DashboardTour
        role={role}
        userEmail={user?.email}
        hasSeenTour={user?.hasSeenTour}
        sidebarOpen={sidebarOpen}
        onEnsureSidebarOpen={() => setSidebarOpen(true)}
      />
    </div>
  );
}

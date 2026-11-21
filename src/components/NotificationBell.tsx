"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getActiveNotifications,
  markNotificationsAsRead,
} from "@/actions/notifications";
import {
  AppNotification,
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/lib/notificationsConfig";

interface NotificationBellProps {
  role: string;
  onOpenInterphone?: () => void;
}

export default function NotificationBell({ role, onOpenInterphone }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [activeFilter, setActiveFilter] = useState<"all" | "community" | "messages" | "clinic">("all");
  const [isLoading, setIsLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  // Jouer un bip discret si activé
  const playSubtleChime = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Ré 5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // La 5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext non disponible ou bloqué par le navigateur
    }
  }, []);

  // Récupérer les notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getActiveNotifications();
      setNotifications(data.notifications);
      setPreferences(data.preferences);

      // Si nouveau message et audio activé, jouer le bip
      if (data.unreadCount > lastCountRef.current && data.preferences.soundEnabled) {
        playSubtleChime();
      }
      lastCountRef.current = data.unreadCount;
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    }
  }, [playSubtleChime]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 7000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Écouter les clics en dehors pour fermer le menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Tout marquer comme lu
  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      await markNotificationsAsRead("all");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setIsLoading(false);
    }
  };

  // Clic sur une notification
  const handleNotificationClick = async (notif: AppNotification) => {
    setIsOpen(false);

    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await markNotificationsAsRead(notif.type);
    }

    if (notif.action === "open_interphone") {
      onOpenInterphone?.();
    } else if (notif.href) {
      router.push(notif.href);
    }
  };

  // Filtrage selon l'onglet
  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "community") {
      return notif.type === "community_post" || notif.type === "community_message";
    }
    if (activeFilter === "messages") {
      return notif.type === "community_message" || notif.type === "clinic_message";
    }
    if (activeFilter === "clinic") {
      return notif.type === "clinic_message" || notif.type === "queue_arrival";
    }
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton Cloche de notification */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative w-9 h-9 rounded-lg border flex items-center justify-center transition cursor-pointer shadow-2xs ${
          isOpen
            ? "bg-slate-900 text-white border-slate-900"
            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
        }`}
        title="Notifications et alertes"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[19px]">notifications</span>

        {/* Badge rouge avec compteur non lus */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-xs animate-in zoom-in-75">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Menu déroulant des notifications */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* En-tête */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-700 text-lg">
                notifications_active
              </span>
              <p className="text-xs font-bold text-slate-900">Notifications</p>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isLoading}
                className="text-[11px] font-medium text-sky-700 hover:text-sky-900 cursor-pointer disabled:opacity-50"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Onglets de filtrage */}
          <div className="flex items-center gap-1 p-1.5 bg-slate-100/80 border-b border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`flex-1 py-1 rounded-md font-semibold transition cursor-pointer text-center ${
                activeFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Toutes
            </button>
            {role === "doctor" && (
              <button
                type="button"
                onClick={() => setActiveFilter("community")}
                className={`flex-1 py-1 rounded-md font-semibold transition cursor-pointer text-center ${
                  activeFilter === "community"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Réseau
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveFilter("messages")}
              className={`flex-1 py-1 rounded-md font-semibold transition cursor-pointer text-center ${
                activeFilter === "messages"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Messages
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("clinic")}
              className={`flex-1 py-1 rounded-md font-semibold transition cursor-pointer text-center ${
                activeFilter === "clinic"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Cabinet
            </button>
          </div>

          {/* Liste des notifications */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-1.5 text-slate-400">
                <span className="material-symbols-outlined text-3xl text-slate-300">
                  check_circle
                </span>
                <p className="text-xs font-semibold text-slate-700">Vous êtes à jour</p>
                <p className="text-[11px] text-slate-400">
                  Aucune notification dans cette rubrique pour le moment.
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const date = new Date(n.timestamp);
                const timeStr = date.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                // Style icône par type
                const iconConfig =
                  n.type === "community_message"
                    ? { icon: "chat", bg: "bg-sky-50 text-sky-700 border-sky-100" }
                    : n.type === "community_post"
                    ? { icon: "stethoscope", bg: "bg-rose-50 text-rose-700 border-rose-100" }
                    : n.type === "clinic_message"
                    ? { icon: "forum", bg: "bg-emerald-50 text-emerald-700 border-emerald-100" }
                    : { icon: "groups", bg: "bg-amber-50 text-amber-700 border-amber-100" };

                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full p-3 text-left transition flex items-start gap-3 cursor-pointer ${
                      !n.isRead ? "bg-sky-50/30 hover:bg-sky-50/60" : "hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${iconConfig.bg}`}
                    >
                      <span className="material-symbols-outlined text-base">
                        {iconConfig.icon}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{timeStr}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                        {n.content}
                      </p>
                    </div>

                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Pied de page : Lien vers les paramètres */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">Alertes en direct</span>
            <Link
              href="/dashboard/settings?tab=notifications"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition"
            >
              <span className="material-symbols-outlined text-[14px]">tune</span>
              <span>Gérer les alertes</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

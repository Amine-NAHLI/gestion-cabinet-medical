"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

interface ReadyVisit {
  id: number;
  patientName: string;
}

interface PendingPayment {
  id: number;
  patientName: string;
  amount: string | null;
}

interface SyncPayload {
  signature: string;
  waitingCount: number;
  readyVisits: ReadyVisit[];
  pendingPayments: PendingPayment[];
  patientsCount: number;
  appointmentsCount: number;
  timestamp: number;
}

interface LiveNotification {
  id: string;
  title: string;
  subtitle: string;
  tone: "emerald" | "sky" | "teal";
  href?: string;
  cta?: string;
}

function playNotificationChime(doubleTone = false) {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.09, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    playTone(587.33, now, 0.22); // D5
    if (doubleTone) {
      playTone(880, now + 0.14, 0.32); // A5
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch {
    // Ignore autoplay restriction errors before user interaction
  }
}

export default function RealtimeSync({ role }: { role: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const prevDataRef = useRef<SyncPayload | null>(null);
  const isCheckingRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const soundEnabledRef = useRef(true);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [justSynced, setJustSynced] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notification, setNotification] = useState<LiveNotification | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("moncabinet_sound");
      if (saved === "false") {
        setSoundEnabled(false);
        soundEnabledRef.current = false;
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundEnabledRef.current = next;
      try {
        localStorage.setItem("moncabinet_sound", String(next));
      } catch {
        // ignore storage errors
      }
      if (next) {
        playNotificationChime(false);
      }
      return next;
    });
  };

  const showNotification = useCallback((notif: Omit<LiveNotification, "id">, doubleTone = false) => {
    if (notifTimerRef.current) {
      clearTimeout(notifTimerRef.current);
    }
    setNotification({ ...notif, id: `${Date.now()}` });
    if (soundEnabledRef.current) {
      playNotificationChime(doubleTone);
    }
    notifTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 7500);
  }, []);

  const checkSync = useCallback(async () => {
    if (isCheckingRef.current || document.hidden) return;
    isCheckingRef.current = true;

    try {
      const res = await fetch("/api/sync/status", {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        if (res.status !== 401) {
          setIsOnline(false);
        }
        return;
      }

      const data: SyncPayload = await res.json();
      setIsOnline(true);

      const prev = prevDataRef.current;

      // Première initialisation silencieuse
      if (!prev) {
        prevDataRef.current = data;
        return;
      }

      // Changement détecté en base de données !
      if (data.signature !== prev.signature) {
        prevDataRef.current = data;

        // Ne pas interrompre la saisie en cours sur la page de consultation active
        const isInConsultation = pathnameRef.current?.startsWith("/dashboard/consultation/");
        if (!isInConsultation) {
          router.refresh();
        }

        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 1800);

        // Notifications intelligentes selon le rôle
        if (role === "doctor") {
          const prevReadyIds = new Set(prev.readyVisits.map((v) => v.id));
          const newlyReady = data.readyVisits.find((v) => !prevReadyIds.has(v.id));

          if (newlyReady) {
            showNotification(
              {
                title: "Patient prêt en consultation",
                subtitle: `${newlyReady.patientName} vient d'être envoyé par l'assistante.`,
                tone: "emerald",
                href: `/dashboard/consultation/${newlyReady.id}`,
                cta: "Consulter",
              },
              true
            );
          } else if (data.waitingCount > prev.waitingCount) {
            showNotification(
              {
                title: "Nouveau patient en salle d'attente",
                subtitle: `${data.waitingCount} patient${data.waitingCount > 1 ? "s" : ""} actuellement en attente.`,
                tone: "sky",
                href: "/dashboard/queue",
                cta: "Voir la file",
              },
              false
            );
          } else if (data.appointmentsCount > prev.appointmentsCount) {
            showNotification(
              {
                title: "Nouveau rendez-vous planifié",
                subtitle: "L'agenda du cabinet vient d'être mis à jour.",
                tone: "sky",
                href: "/dashboard/appointments",
                cta: "Voir agenda",
              },
              false
            );
          }
        } else if (role === "assistant") {
          const prevPaymentIds = new Set(prev.pendingPayments.map((p) => p.id));
          const newPayment = data.pendingPayments.find((p) => !prevPaymentIds.has(p.id));

          if (newPayment) {
            showNotification(
              {
                title: "Consultation terminée — Paiement prêt",
                subtitle: `${newPayment.patientName}${newPayment.amount ? ` • ${newPayment.amount} DH` : ""}`,
                tone: "teal",
                href: "/dashboard/payments",
                cta: "Encaisser",
              },
              true
            );
          }
        }
      }
    } catch {
      setIsOnline(false);
    } finally {
      isCheckingRef.current = false;
    }
  }, [role, router, showNotification]);

  useEffect(() => {
    // Premier snapshot immédiat
    checkSync();

    // Synchronisation automatique toutes les 3 secondes
    const interval = setInterval(checkSync, 3000);

    // Synchronisation instantanée dès retour sur l'onglet
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSync();
      }
    };
    const handleFocus = () => {
      checkSync();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      if (notifTimerRef.current) {
        clearTimeout(notifTimerRef.current);
      }
    };
  }, [checkSync]);

  const toneStyles = {
    emerald: {
      border: "border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-700",
      icon: "stethoscope",
      cta: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    sky: {
      border: "border-sky-200",
      iconBg: "bg-sky-100 text-sky-700",
      icon: "person_add",
      cta: "bg-sky-600 hover:bg-sky-700 text-white",
    },
    teal: {
      border: "border-teal-200",
      iconBg: "bg-teal-100 text-teal-700",
      icon: "payments",
      cta: "bg-teal-600 hover:bg-teal-700 text-white",
    },
  };

  return (
    <>
      {/* Indicateur compact dans la barre supérieure */}
      <div className="flex items-center gap-1.5">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all ${
            !isOnline
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : justSynced
              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
              : "bg-slate-50 border-slate-200/80 text-slate-600"
          }`}
          title="Synchronisation automatique en temps réel entre le médecin et l'assistante"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              !isOnline
                ? "bg-amber-500"
                : justSynced
                ? "bg-emerald-500 scale-125"
                : "bg-emerald-500 animate-pulse"
            }`}
          />
          <span className="hidden sm:inline">
            {!isOnline ? "Reconnexion..." : justSynced ? "Synchronisé" : "En direct"}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleSound}
          className="w-7 h-7 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer"
          title={soundEnabled ? "Désactiver le son de notification" : "Activer le son de notification"}
        >
          <span className="material-symbols-outlined text-[16px]">
            {soundEnabled ? "volume_up" : "volume_off"}
          </span>
        </button>
      </div>

      {/* Notification flottante en temps réel (positionnée en bas à droite pour ne jamais masquer les KPI ou la barre supérieure) */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={`fixed bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-2xl border ${
              toneStyles[notification.tone].border
            } shadow-2xl shadow-slate-900/15 p-4`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  toneStyles[notification.tone].iconBg
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {toneStyles[notification.tone].icon}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-extrabold text-slate-900 leading-snug">
                    {notification.title}
                  </p>
                  <button
                    type="button"
                    onClick={() => setNotification(null)}
                    className="text-slate-400 hover:text-slate-600 transition cursor-pointer -mt-0.5"
                    aria-label="Fermer"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {notification.subtitle}
                </p>

                {notification.href && notification.cta && (
                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href={notification.href}
                      onClick={() => setNotification(null)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition shadow-xs ${
                        toneStyles[notification.tone].cta
                      }`}
                    >
                      <span>{notification.cta}</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

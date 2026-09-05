"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";

interface BottomNavProps {
  role?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function BottomNav({ role = "assistant", user }: BottomNavProps) {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  const navItems = [
    {
      href: "/dashboard",
      label: "Accueil",
      icon: "home",
      exact: true,
      color: role === "doctor" ? "text-sky-600 bg-sky-50" : "text-teal-600 bg-teal-50",
      activeBg: role === "doctor" ? "bg-sky-600 text-white shadow-sky-500/25" : "bg-teal-600 text-white shadow-teal-500/25",
    },
    {
      href: "/dashboard/queue",
      label: "File d'attente",
      icon: "queue",
      exact: false,
      color: "text-amber-600 bg-amber-50",
      activeBg: "bg-amber-600 text-white shadow-amber-500/25",
    },
    ...(role === "assistant"
      ? [
          {
            href: "/dashboard/payments",
            label: "Paiements",
            icon: "payments",
            exact: false,
            color: "text-emerald-600 bg-emerald-50",
            activeBg: "bg-emerald-600 text-white shadow-emerald-500/25",
          },
        ]
      : []),
    {
      href: "/dashboard/history",
      label: "Historique",
      icon: "history",
      exact: false,
      color: "text-indigo-600 bg-indigo-50",
      activeBg: "bg-indigo-600 text-white shadow-indigo-500/25",
    },
    {
      href: "/dashboard/appointments",
      label: "Rendez-vous",
      icon: "event",
      exact: false,
      color: "text-fuchsia-600 bg-fuchsia-50",
      activeBg: "bg-fuchsia-600 text-white shadow-fuchsia-500/25",
    },
    {
      href: "/dashboard/stats",
      label: "Statistiques",
      icon: "bar_chart",
      exact: false,
      color: "text-violet-600 bg-violet-50",
      activeBg: "bg-violet-600 text-white shadow-violet-500/25",
    },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none">
      <motion.nav
        layout
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`pointer-events-auto bg-white/90 backdrop-blur-2xl border border-slate-200/90 shadow-2xl shadow-slate-900/15 ring-1 ring-black/5 flex items-center gap-1.5 transition-all duration-300 ease-out ${
          isHovered ? "p-2.5 px-4 rounded-3xl shadow-slate-900/20" : "p-2 px-3 rounded-full"
        }`}
      >
        {/* Navigation Items */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative group focus:outline-none"
              >
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? `${item.activeBg} shadow-md font-bold`
                      : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${
                      isActive ? "scale-110" : "group-hover:scale-110"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <AnimatePresence initial={false}>
                    {isHovered && (
                      <motion.span
                        initial={{ opacity: 0, width: 0, x: -6 }}
                        animate={{ opacity: 1, width: "auto", x: 0 }}
                        exit={{ opacity: 0, width: 0, x: -6 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="text-xs font-semibold whitespace-nowrap overflow-hidden pr-0.5"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Subtle active pill indicator when not hovered */}
                {!isHovered && isActive && (
                  <motion.span
                    layoutId="activeDot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-900"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-200 mx-1 self-center" />

        {/* User Role Badge & Logout */}
        <div className="flex items-center gap-1">
          {/* User Avatar */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-xs ${
              role === "doctor" ? "bg-sky-600" : "bg-teal-600"
            }`}
            title={`${user?.name || "Utilisateur"} (${role === "doctor" ? "Médecin" : "Assistante"})`}
          >
            <span className="material-symbols-outlined text-base">
              {role === "doctor" ? "stethoscope" : "assignment_ind"}
            </span>
          </div>

          <AnimatePresence>
            {isHovered && user?.name && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden flex flex-col justify-center px-1 text-left"
              >
                <p className="text-xs font-bold text-slate-800 truncate max-w-[100px] leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-400 font-medium capitalize leading-none">
                  {role === "doctor" ? "Médecin" : "Assistante"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logout Button */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 p-2 rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none group"
            title="Déconnexion"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
              logout
            </span>
            <AnimatePresence>
              {isHovered && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs font-semibold text-red-600 whitespace-nowrap overflow-hidden pr-1"
                >
                  Déconnexion
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.nav>
    </div>
  );
}

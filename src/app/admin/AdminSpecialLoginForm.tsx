"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminSpecialLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        redirect: false,
      });

      if (res?.error) {
        setError("Identifiants Super Administrateur invalides.");
        setIsLoading(false);
        return;
      }

      // Redirection immédiate sur /admin
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Erreur de connexion au serveur.");
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        color: "#1e293b",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: "1rem",
        position: "relative",
      }}
      className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800 flex items-center justify-center p-4 selection:bg-slate-900 selection:text-white relative overflow-hidden font-sans"
    >
      {/* Ambient background soft aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-72 bg-gradient-to-b from-sky-100/50 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-72 h-72 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          border: "1px solid #e2e8f0",
          padding: "2rem",
          boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03)",
          position: "relative",
          zIndex: 10,
        }}
        className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-900/[0.04] relative z-10"
      >
        {/* En-tête exclusif Admin */}
        <div className="text-center mb-6">
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              padding: "2px",
              margin: "0 auto 12px auto",
              boxShadow: "0 10px 15px -3px rgba(15, 23, 42, 0.15)",
            }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 p-0.5 mx-auto mb-3 shadow-md shadow-slate-900/15"
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#0f172a",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
              className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white"
            >
              <span className="material-symbols-outlined text-2xl text-sky-400">admin_panel_settings</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            Console Centrale • Super Administrateur
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Portail Super Administrateur
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Entrez vos identifiants maîtres pour accéder à la console de gestion.
          </p>
        </div>

        {/* Message d'erreur */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-base text-red-500 shrink-0">lock_clock</span>
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulaire spécial Super Admin */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="admin-email">
              Identifiant Super Admin
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
              </div>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nahliamine95@gmail.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700" htmlFor="admin-password">
                Mot de Passe Maître
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Chiffrement AES-256</span>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                <span className="material-symbols-outlined text-[18px]">key</span>
              </div>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wider shadow-md shadow-slate-900/10 transition-all duration-200 cursor-pointer disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  <span>Vérification des accès...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">lock_open</span>
                  <span>Ouvrir la Console Super Admin</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-xs text-emerald-600">verified_user</span>
            Console réservée au propriétaire de MonCabinet Platform
          </p>
        </div>
      </motion.div>
    </div>
  );
}

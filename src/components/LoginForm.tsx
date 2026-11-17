"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);

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
        setError("Adresse email ou mot de passe incorrect.");
        setIsLoading(false);
      } else {
        const session = await getSession();
        if (session?.user?.role === "superadmin") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/dashboard";
        }
      }
    } catch {
      setError("Impossible de contacter le serveur d'authentification.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Alerte d'erreur moderne */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 p-3.5 rounded-2xl bg-red-50/80 border border-red-200/80 text-red-700 text-xs font-medium flex items-center gap-2.5"
          >
            <span className="material-symbols-outlined text-base text-red-500 shrink-0">error</span>
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Champ Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="email">
            Email professionnel
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nom@cabinet.ma"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
          />
        </div>

        {/* Champ Mot de passe */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700" htmlFor="password">
              Mot de passe
            </label>
            <button
              type="button"
              onClick={() => setForgotModal(true)}
              className="text-xs text-sky-600 hover:text-sky-700 hover:underline font-medium transition cursor-pointer"
            >
              Mot de passe oublié ?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 pr-11 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              tabIndex={-1}
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        {/* Checkbox Se souvenir de moi */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs text-slate-600 font-medium">Rester connecté</span>
          </label>
        </div>

        {/* Bouton Se Connecter */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md shadow-slate-900/10 transition-all duration-150 cursor-pointer disabled:opacity-60 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                <span>Connexion en cours...</span>
              </>
            ) : (
              <span>Se connecter</span>
            )}
          </button>
        </div>
      </form>

      {/* Séparateur & Lien Inscription */}
      <div className="pt-6 mt-6 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500">
          Vous n'avez pas encore de cabinet ?{" "}
          <Link
            href="/register"
            className="font-bold text-slate-900 hover:text-sky-600 hover:underline transition"
          >
            Inscrire mon cabinet médical
          </Link>
        </p>
      </div>

      {/* Modal Assistance Mot de passe oublié */}
      <AnimatePresence>
        {forgotModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100"
            >
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-xl">vpn_key</span>
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">Réinitialisation d'accès</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Pour des raisons de secret médical, contactez le praticien titulaire de votre cabinet ou l'administrateur de la plateforme pour réinitialiser votre mot de passe.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 font-medium mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-sky-600">headset_mic</span>
                <span>Support d'assistance : 06 27 13 57 64</span>
              </div>
              <button
                type="button"
                onClick={() => setForgotModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Fermer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

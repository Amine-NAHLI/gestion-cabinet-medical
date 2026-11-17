"use client";

import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

function ActivationBanner() {
  const searchParams = useSearchParams();
  const activated = searchParams.get("activated");

  if (!activated) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5"
    >
      <span className="material-symbols-outlined text-emerald-600 text-lg shrink-0">check_circle</span>
      <div>
        <span className="font-bold block">Votre cabinet est désormais actif.</span>
        <span>Connectez-vous ci-dessous pour accéder à vos dossiers.</span>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800 font-sans selection:bg-slate-900 selection:text-white relative">
      
      {/* Ambient soft glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-gradient-to-b from-sky-100/40 to-transparent blur-3xl pointer-events-none" />

      {/* Top spacing */}
      <div className="pt-6 sm:pt-10" />

      {/* Center Auth Container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-400 p-0.5 mx-auto mb-3.5 shadow-md shadow-sky-500/15">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl text-sky-400">health_and_safety</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            MediCabinet
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Système de Gestion Médicale pour Cabinets & Cliniques
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-7 sm:p-9 shadow-xl shadow-slate-900/[0.04]">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Connexion
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Entrez vos identifiants pour accéder à votre espace de travail.
            </p>
          </div>

          <Suspense fallback={null}>
            <ActivationBanner />
          </Suspense>

          <LoginForm />
        </div>
      </motion.div>

      {/* Bottom Footer Info */}
      <footer className="pt-8 pb-4 text-center relative z-10">
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-emerald-600">lock</span>
            Chiffrement SSL 256-bit
          </span>
          <span>•</span>
          <span>Données de santé protégées</span>
          <span>•</span>
          <span>Support 24/7</span>
        </div>
        <p className="text-[10px] text-slate-300 mt-1">
          © {new Date().getFullYear()} MediCabinet Platform. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}

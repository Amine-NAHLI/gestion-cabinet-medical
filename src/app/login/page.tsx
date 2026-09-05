"use client";

import { useState } from "react";
import LoginForm from "@/components/LoginForm";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [role, setRole] = useState<'doctor' | 'assistant'>('doctor');

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-slate-100 via-slate-50 to-sky-50/40 selection:bg-slate-900 selection:text-white relative">
      
      {/* Ambient Depth Lights */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-sky-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-teal-300/25 rounded-full blur-3xl pointer-events-none" />

      {/* Main Dual Card - Strict viewport fitting */}
      <motion.main
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-4xl max-h-[92vh] sm:max-h-[530px] bg-white rounded-[28px] shadow-2xl shadow-slate-900/10 border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10"
      >
        
        {/* LEFT PANEL : Deep Gradient with Organic Wave & Floating Micro-badges */}
        <section className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 relative overflow-hidden text-white bg-gradient-to-br from-[#070e1c] via-[#0a162b] to-[#0c1f3d]">
          
          {/* Subtle Organic Lights */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-2xl bg-sky-500/20 pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full blur-2xl bg-teal-500/20 pointer-events-none" />

          {/* Flowing Organic Waves */}
          <div className="absolute inset-0 pointer-events-none opacity-25 mix-blend-screen">
            <svg
              className="w-full h-full object-cover"
              viewBox="0 0 400 530"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M-30 110 C 90 50, 210 190, 430 80 C 510 30, 530 170, 430 290 C 290 410, 50 330, -30 470 Z"
                fill="url(#wave1)"
                opacity="0.6"
              />
              <path
                d="M-50 250 C 50 170, 170 330, 330 230 C 410 170, 450 310, 310 410 C 170 490, 0 390, -50 510 Z"
                fill="url(#wave2)"
                opacity="0.4"
              />
              <defs>
                <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
                <linearGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Brand Header */}
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-lg">health_and_safety</span>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block leading-none">
                MediCabinet
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                Système Médical Certifié
              </span>
            </div>
          </div>

          {/* Center Content: Pure Class & Typography */}
          <div className="relative z-10 my-auto py-2 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-sky-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Espace Praticien Sécurisé
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white leading-snug">
              L'Excellence <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-teal-200 to-indigo-200">au service</span> de votre clinique.
            </h1>

            <p className="text-xs text-slate-300/80 leading-relaxed max-w-xs font-normal">
              Dossiers patients, consultations et facturation unifiés en une seule interface.
            </p>

            {/* 2 Micro-badges Glassmorphism */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.07] backdrop-blur-md border border-white/[0.09] text-[11px] text-slate-200">
                <span className="material-symbols-outlined text-xs text-emerald-400">verified_user</span>
                <span>Norme HDS • Chiffrement 256-bit</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.07] backdrop-blur-md border border-white/[0.09] text-[11px] text-slate-200">
                <span className="material-symbols-outlined text-xs text-sky-400">sync</span>
                <span>Cabinet Connecté • Temps réel</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <span>© {new Date().getFullYear()} MediCabinet</span>
            <span>Sécurité Certifiée</span>
          </div>
        </section>

        {/* RIGHT PANEL : Executive Form */}
        <section className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-white overflow-y-auto">
          <div>
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Connexion
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                Identifiez-vous pour accéder à votre espace de travail.
              </p>
            </div>

            {/* Form */}
            <LoginForm role={role} setRole={setRole} />
          </div>

          {/* Security Guarantee in Footer */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <span className="material-symbols-outlined text-xs text-slate-400">lock</span>
            <span>Accès sécurisé SSL 256-bit • Données de santé protégées</span>
          </div>
        </section>
      </motion.main>
    </div>
  );
}

"use client";

import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";
import { useSearchParams } from "next/navigation";

function ActivationBanner() {
  const searchParams = useSearchParams();
  const activated = searchParams.get("activated");

  if (!activated) return null;

  return (
    <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
      <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">
        check_circle
      </span>
      <div>
        <span className="font-semibold block">Votre cabinet est actif.</span>
        <span className="text-emerald-700">Connectez-vous ci-dessous pour accéder à votre espace.</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center px-4 py-8 sm:py-12 bg-[#F8F9FB] text-slate-900">
      <div />

      <div className="w-full max-w-[400px]">
        {/* En-tête sobre */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Mon<span className="text-sky-700">Cabinet</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestion médicale pour cabinets et cliniques
          </p>
        </div>

        {/* Carte de connexion */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-7 sm:p-8 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-900">
              Connexion à votre espace
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Renseignez vos identifiants praticien ou secrétariat.
            </p>
          </div>

          <Suspense fallback={null}>
            <ActivationBanner />
          </Suspense>

          <LoginForm />
        </div>
      </div>

      <footer className="pt-8 text-center">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} MonCabinet — Connexion sécurisée SSL
        </p>
      </footer>
    </div>
  );
}

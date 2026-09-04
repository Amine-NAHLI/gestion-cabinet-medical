"use client";
import { useState } from "react";
import LoginForm from "@/components/LoginForm";
import Script from "next/script";

export default function LoginPage() {
  const [role, setRole] = useState<'doctor' | 'assistant'>('doctor');

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-50">
      
      {/* 1. Animated Mesh Gradient Background (Subtle) */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-60">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-300/40 rounded-full blur-[100px] animate-[spin_20s_linear_infinite]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-200/40 rounded-full blur-[120px] animate-[spin_25s_linear_infinite_reverse]" />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-indigo-200/30 rounded-full blur-[90px] animate-pulse" />
      </div>

      {/* 3D Background - Multiples instances dispersées */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <Script type="module" src="https://unpkg.com/@splinetool/viewer/build/spline-viewer.js" strategy="afterInteractive" />
        
        {role === 'doctor' ? (
          <>
            {/* ADN 1 : En haut à gauche (Box beaucoup plus grande pour ne pas couper) */}
            <div className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] opacity-70 blur-[1px] animate-in fade-in duration-1000 delay-500 fill-mode-both pointer-events-none">
              <div className="w-full h-full relative overflow-hidden">
                {/* @ts-ignore */}
                <spline-viewer url="https://prod.spline.design/D8nbLxD8dUS4yp5t/scene.splinecode" background="transparent" style={{ width: '100%', height: 'calc(100% + 80px)', position: 'absolute', top: 0, left: 0, backgroundColor: 'transparent' }}></spline-viewer>
              </div>
            </div>

            {/* ADN 2 : En bas à droite */}
            <div className="absolute -bottom-[20%] -right-[10%] w-[900px] h-[900px] opacity-90 animate-in fade-in duration-1000 delay-700 fill-mode-both pointer-events-none">
              <div className="w-full h-full relative overflow-hidden">
                {/* @ts-ignore */}
                <spline-viewer url="https://prod.spline.design/D8nbLxD8dUS4yp5t/scene.splinecode" background="transparent" style={{ width: '100%', height: 'calc(100% + 80px)', position: 'absolute', top: 0, left: 0, backgroundColor: 'transparent' }}></spline-viewer>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50 z-10 animate-bounce">3d_rotation</span>
            <p className="font-medium text-lg opacity-50 z-10">Modèle 3D Assistante en attente...</p>
          </div>
        )}
      </div>

      {/* Transparent overlay to soften the 3D object slightly behind the card */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-0 pointer-events-none" />

      {/* Central Glassmorphism Card */}
      <main className="relative z-10 w-full max-w-md p-7 sm:p-10 mx-4 bg-white/70 backdrop-blur-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] transition-all duration-500">
         <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-teal-500 rounded-2xl shadow-lg shadow-sky-500/30 flex items-center justify-center text-white mb-5 animate-in zoom-in duration-500">
              <span className="material-symbols-outlined text-4xl">medical_services</span>
            </div>
            {/* 2. Premium Gradient Title */}
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-sky-700 via-teal-600 to-sky-700 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient_4s_linear_infinite]">
              MediCabinet
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-2">Connectez-vous pour accéder à votre espace</p>
         </div>

         {/* Form Component */}
         <LoginForm role={role} setRole={setRole} />

         {/* Footer */}
         <div className="mt-8 text-center border-t border-slate-200/60 pt-5">
            <p className="text-xs text-slate-400 font-medium tracking-wide">Système de gestion médicale ultra-sécurisé</p>
         </div>
      </main>

    </div>
  );
}

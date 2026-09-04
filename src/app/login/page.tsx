"use client";
import { useState } from "react";
import LoginForm from "@/components/LoginForm";
import Script from "next/script";

export default function LoginPage() {
  const [role, setRole] = useState<'doctor' | 'assistant'>('doctor');

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-50 transition-colors duration-1000">
      
      {/* 1. Animated Mesh Gradient Background (Dynamic based on role) */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-70 transition-all duration-1000">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] animate-[spin_20s_linear_infinite] transition-colors duration-1000 ${role === 'doctor' ? 'bg-sky-400/40' : 'bg-emerald-400/40'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-[spin_25s_linear_infinite_reverse] transition-colors duration-1000 ${role === 'doctor' ? 'bg-blue-300/30' : 'bg-teal-300/30'}`} />
        <div className={`absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full blur-[90px] animate-pulse transition-colors duration-1000 ${role === 'doctor' ? 'bg-indigo-300/30' : 'bg-cyan-300/30'}`} />
      </div>

      {/* 3D Background - Multiples instances dispersées */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none" key={role}>
        <Script type="module" src="https://unpkg.com/@splinetool/viewer/build/spline-viewer.js" strategy="afterInteractive" />
        
        {role === 'doctor' ? (
          <>
            {/* ADN 1 : En haut à gauche */}
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
          <>
            {/* Assistante 1 : Calendrier */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] opacity-80 blur-[1px] animate-in fade-in duration-1000 delay-300 fill-mode-both pointer-events-none scale-[0.55] origin-top-left">
              <div className="w-full h-full relative overflow-hidden">
                {/* @ts-ignore */}
                <spline-viewer url="https://prod.spline.design/L7VfNWtRtvnFZn9h/scene.splinecode" background="transparent" style={{ width: '100%', height: 'calc(100% + 80px)', position: 'absolute', top: 0, left: 0, backgroundColor: 'transparent' }}></spline-viewer>
              </div>
            </div>

            {/* Assistante 2 : Calendrier */}
            <div className="absolute bottom-0 right-0 w-[700px] h-[700px] opacity-100 animate-in fade-in duration-1000 delay-500 fill-mode-both pointer-events-none scale-[0.6] origin-bottom-right">
              <div className="w-full h-full relative overflow-hidden">
                {/* @ts-ignore */}
                <spline-viewer url="https://prod.spline.design/L7VfNWtRtvnFZn9h/scene.splinecode" background="transparent" style={{ width: '100%', height: 'calc(100% + 80px)', position: 'absolute', top: 0, left: 0, backgroundColor: 'transparent' }}></spline-viewer>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Transparent overlay to soften the 3D object slightly behind the card */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] z-0 pointer-events-none" />

      {/* Central Glassmorphism Card - EXTREME GLASS */}
      <main className="relative z-10 w-full max-w-md p-7 sm:p-10 mx-4 bg-white/40 backdrop-blur-[40px] border border-white/50 shadow-[0_8px_40px_rgb(0,0,0,0.08)] rounded-[2rem] transition-all duration-700 hover:shadow-[0_8px_50px_rgb(0,0,0,0.12)]">
         <div className="flex flex-col items-center mb-8 text-center">
            <div className={`w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center text-white mb-5 animate-in zoom-in duration-500 transition-all duration-1000 ${role === 'doctor' ? 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/30' : 'bg-gradient-to-br from-teal-400 to-emerald-600 shadow-emerald-500/30'}`}>
              <span className="material-symbols-outlined text-4xl">medical_services</span>
            </div>
            {/* 2. Premium Gradient Title (Dynamic) */}
            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] transition-all duration-1000 ${role === 'doctor' ? 'bg-gradient-to-r from-sky-700 via-blue-600 to-sky-700' : 'bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-700'}`}>
              MediCabinet
            </h1>
            <p className="text-sm font-medium text-slate-600/80 mt-2">Connectez-vous pour accéder à votre espace</p>
         </div>

         {/* Form Component */}
         <LoginForm role={role} setRole={setRole} />

         {/* Footer */}
         <div className="mt-8 text-center border-t border-slate-300/40 pt-5">
            <p className="text-xs text-slate-500/70 font-semibold tracking-wide">Système de gestion médicale ultra-sécurisé</p>
         </div>
      </main>

    </div>
  );
}

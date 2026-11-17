"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyOtpCode, resendOtpCode, getOnboardingRequestStatus } from "@/actions/onboarding";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function VerifyOtpClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestIdStr = searchParams.get("id");
  const requestId = requestIdStr ? parseInt(requestIdStr, 10) : null;

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  
  // Request details
  const [requestInfo, setRequestInfo] = useState<{
    clinicName: string;
    doctorName: string;
    doctorEmail: string;
    status: string;
    expiresAt: string;
  } | null>(null);

  // Countdown timer in seconds
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes
  const [isExpired, setIsExpired] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Charger les informations de la demande
  useEffect(() => {
    if (!requestId) return;

    let isMounted = true;

    async function fetchStatus() {
      if (!requestId) return;
      const data = await getOnboardingRequestStatus(requestId);
      if (data && isMounted) {
        setRequestInfo(data);
        if (data.status === "verified" || data.status === "approved") {
          setSuccessMessage("Votre cabinet a été validé avec succès !");
          setTimeout(() => {
            router.push("/login?activated=true");
          }, 1800);
          return;
        }

        const diffMs = new Date(data.expiresAt).getTime() - Date.now();
        const diffSec = Math.max(0, Math.floor(diffMs / 1000));
        setTimeLeft(diffSec);
        if (diffSec <= 0) {
          setIsExpired(true);
        }
      }
    }

    fetchStatus();

    // Polling toutes les 3.5s pour détecter l'approbation en 1-clic par l'Admin
    const interval = setInterval(fetchStatus, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [requestId, router]);

  // 2. Compte à rebours
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // 3. Gestion de la saisie
  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, "").slice(0, 6).split("");
      pasted.forEach((char, i) => {
        if (index + i < 6) newDigits[index + i] = char;
      });
      setDigits(newDigits);
      const nextFocus = Math.min(index + pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
      if (newDigits.every((d) => d !== "")) {
        submitCode(newDigits.join(""));
      }
      return;
    }

    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== "")) {
      submitCode(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submitCode = async (code: string) => {
    if (!requestId || isVerifying) return;
    setIsVerifying(true);
    setError(null);

    const res: any = await verifyOtpCode(requestId, code);

    if (res?.error) {
      setError(res.error);
      setIsVerifying(false);
    } else {
      setSuccessMessage(res?.message || "Cabinet validé avec succès !");
      setTimeout(() => {
        router.push("/login?activated=true");
      }, 1800);
    }
  };

  const handleResend = async () => {
    if (!requestId || isResending) return;
    setIsResending(true);
    setError(null);

    const res: any = await resendOtpCode(requestId);
    if (res?.error) {
      setError(res.error);
    } else {
      setDigits(["", "", "", "", "", ""]);
      setTimeLeft(300);
      setIsExpired(false);
      setSuccessMessage("Nouveau code transmis à l'administrateur !");
      setTimeout(() => setSuccessMessage(null), 3000);
      inputRefs.current[0]?.focus();
    }
    setIsResending(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        color: "#1e293b",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: "1.5rem",
      }}
      className="min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800 font-sans selection:bg-slate-900 selection:text-white relative"
    >
      
      {/* Ambient background soft glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-gradient-to-b from-sky-100/40 to-transparent blur-3xl pointer-events-none" />

      {/* Top spacing */}
      <div className="pt-6 sm:pt-10" />

      {/* Center Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: "440px", position: "relative", zIndex: 10 }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Brand Emblem */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }} className="text-center mb-6">
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #0284c7 0%, #14b8a6 100%)",
              padding: "2px",
              margin: "0 auto 12px auto",
              boxShadow: "0 10px 15px -3px rgba(2, 132, 199, 0.2)",
            }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-400 p-0.5 mx-auto mb-3 shadow-md shadow-sky-500/15"
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#090d16",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38bdf8",
              }}
              className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white"
            >
              <span className="material-symbols-outlined text-2xl text-sky-400">lock</span>
            </div>
          </div>
          <h1
            style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.025em", color: "#0f172a", margin: "0" }}
            className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900"
          >
            Activation du Cabinet
          </h1>
          <p
            style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "4px" }}
            className="text-xs text-slate-500 mt-1"
          >
            {requestInfo ? (
              <>
                Cabinet <strong style={{ color: "#0f172a" }}>{requestInfo.clinicName}</strong> pour{" "}
                <strong style={{ color: "#0f172a" }}>{requestInfo.doctorName}</strong>.
              </>
            ) : (
              "Vérification sécurisée par code de confirmation."
            )}
          </p>
        </div>

        {/* Card Box */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            border: "1px solid #e2e8f0",
            padding: "2rem",
            boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03)",
            textAlign: "center",
          }}
          className="bg-white rounded-3xl border border-slate-200/80 p-7 sm:p-8 shadow-xl shadow-slate-900/[0.04] text-center"
        >
          
          {/* Info Banner */}
          <div
            style={{
              backgroundColor: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "16px",
              padding: "0.875rem",
              marginBottom: "1.5rem",
              textAlign: "left",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
            className="bg-sky-50 border border-sky-100 rounded-2xl p-3.5 mb-6 text-left flex items-start gap-2.5"
          >
            <span style={{ color: "#0284c7" }} className="material-symbols-outlined text-sky-600 text-base shrink-0 mt-0.5">info</span>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#0369a1", lineHeight: 1.5 }} className="text-[11px] text-sky-900 leading-relaxed">
              Pour des raisons de conformité médicale, votre code d'activation à 6 chiffres a été transmis à l'administrateur. Saisissez-le dès réception.
            </p>
          </div>

          {/* Countdown Timer Badge */}
          <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "center" }} className="mb-6 flex items-center justify-center">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                fontWeight: 700,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                backgroundColor: isExpired ? "#fef2f2" : timeLeft < 60 ? "#fffbeb" : "#f1f5f9",
                border: `1px solid ${isExpired ? "#fecaca" : timeLeft < 60 ? "#fde68a" : "#e2e8f0"}`,
                color: isExpired ? "#dc2626" : timeLeft < 60 ? "#b45309" : "#334155",
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all ${
                isExpired
                  ? "bg-red-50 border border-red-200 text-red-600"
                  : timeLeft < 60
                  ? "bg-amber-50 border border-amber-200 text-amber-700 animate-pulse"
                  : "bg-slate-100 border border-slate-200 text-slate-700"
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isExpired ? "timer_off" : "timer"}
              </span>
              <span>
                {isExpired ? "Code expiré" : `Valable encore : ${formatTime(timeLeft)}`}
              </span>
            </div>
          </div>

          {/* 6 Input Boxes */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "1.5rem" }} className="flex items-center justify-center gap-2 sm:gap-2.5 mb-6">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                disabled={isExpired || isVerifying || !!successMessage}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                style={{
                  width: "48px",
                  height: "56px",
                  fontSize: "24px",
                  fontWeight: "bold",
                  textAlign: "center",
                  borderRadius: "14px",
                  border: digit ? "2px solid #0284c7" : "1px solid #cbd5e1",
                  backgroundColor: digit ? "#f0f9ff" : "#ffffff",
                  color: "#0f172a",
                  outline: "none",
                  transition: "all 0.15s ease",
                }}
                className={`border text-slate-900 font-mono transition-all duration-150 focus:outline-none ${
                  digit
                    ? "bg-sky-50/50 border-sky-500 ring-2 ring-sky-500/10 shadow-xs"
                    : "bg-white border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                } disabled:opacity-40`}
              />
            ))}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                style={{
                  padding: "12px",
                  marginBottom: "1.25rem",
                  borderRadius: "14px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
                className="p-3 mb-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm text-red-500">error</span>
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  padding: "14px",
                  marginBottom: "1.25rem",
                  borderRadius: "14px",
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
                className="p-3.5 mb-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg text-emerald-600">check_circle</span>
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Boutons d'Action */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }} className="space-y-3">
            <button
              type="button"
              disabled={digits.some((d) => d === "") || isExpired || isVerifying || !!successMessage}
              onClick={() => submitCode(digits.join(""))}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                backgroundColor: digits.some((d) => d === "") || isExpired || isVerifying ? "#94a3b8" : "#0f172a",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.875rem",
                border: "none",
                cursor: digits.some((d) => d === "") || isExpired || isVerifying ? "not-allowed" : "pointer",
                boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.1)",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md shadow-slate-900/10 transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  <span>Vérification en cours...</span>
                </>
              ) : (
                <span>Confirmer et Activer le Cabinet</span>
              )}
            </button>

            {/* Bouton Renvoyer code */}
            <div style={{ paddingTop: "6px" }} className="pt-2">
              <button
                type="button"
                disabled={isResending || isVerifying}
                onClick={handleResend}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "0.75rem",
                  color: "#64748b",
                  cursor: isResending || isVerifying ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  margin: "0 auto",
                  fontWeight: 600,
                }}
                className="text-xs text-slate-500 hover:text-slate-900 transition flex items-center justify-center gap-1.5 mx-auto font-medium cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>{isResending ? "Génération du nouveau code..." : "Renvoyer un nouveau code (5 min)"}</span>
              </button>
            </div>
          </div>

          {/* Séparateur & Retour Connexion */}
          <div
            style={{
              paddingTop: "1.25rem",
              marginTop: "1.25rem",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.75rem",
              color: "#64748b",
            }}
            className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500"
          >
            <Link
              href="/login"
              style={{ color: "#64748b", textDecoration: "none", fontWeight: 600 }}
              className="hover:text-slate-900 hover:underline transition font-medium"
            >
              ← Retour à la connexion
            </Link>
            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#94a3b8" }} className="flex items-center gap-1 text-slate-400">
              <span className="material-symbols-outlined text-xs text-emerald-600">verified</span>
              Protection 256-bit
            </span>
          </div>
        </div>
      </motion.div>

      {/* Footer Info */}
      <footer style={{ paddingTop: "2rem", paddingBottom: "1rem", textAlign: "center", fontSize: "0.75rem", color: "#94a3b8" }} className="pt-8 pb-4 text-center relative z-10 text-[11px] text-slate-400 font-medium">
        MonCabinet Platform • Activation Sécurisée par Code à 6 Chiffres
      </footer>
    </div>
  );
}

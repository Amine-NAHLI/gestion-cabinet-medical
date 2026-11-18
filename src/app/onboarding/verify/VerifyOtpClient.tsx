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
    <div className="min-h-screen w-full flex flex-col justify-between items-center px-4 py-8 sm:py-12 bg-[#F8F9FB] text-slate-900">
      <div />

      <div className="w-full max-w-[420px]">
        {/* En-tête sobre */}
        <div className="text-center mb-6">
          <p className="text-sm font-semibold tracking-tight text-slate-900 mb-3">
            Mon<span className="text-sky-700">Cabinet</span>
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Activation du cabinet
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {requestInfo ? (
              <>
                Cabinet <strong className="font-semibold text-slate-800">{requestInfo.clinicName}</strong> •{" "}
                <strong className="font-semibold text-slate-800">{requestInfo.doctorName}</strong>
              </>
            ) : (
              "Vérification par code de confirmation à 6 chiffres."
            )}
          </p>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-7 shadow-[0_1px_3px_rgba(16,24,40,0.06)] text-center space-y-5">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 text-left flex items-start gap-2.5">
            <span className="material-symbols-outlined text-slate-500 text-[18px] shrink-0 mt-0.5">info</span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Votre code d'activation à 6 chiffres a été transmis à l'administrateur MonCabinet. Saisissez-le ci-dessous dès réception.
            </p>
          </div>

          {/* Compte à rebours */}
          <div className="flex items-center justify-center">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold border tabular-nums ${
                isExpired
                  ? "bg-red-50 border-red-200 text-red-700"
                  : timeLeft < 60
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {isExpired ? "timer_off" : "timer"}
              </span>
              <span>
                {isExpired ? "Code expiré" : `Valable : ${formatTime(timeLeft)}`}
              </span>
            </div>
          </div>

          {/* 6 cases OTP responsives (adaptées dès 360px) */}
          <div className="grid grid-cols-6 gap-2 max-w-[320px] mx-auto">
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
                className={`w-full h-12 sm:h-14 text-center text-xl font-semibold font-mono rounded-lg border transition focus:outline-none ${
                  digit
                    ? "bg-sky-50/50 border-slate-900 text-slate-900"
                    : "bg-white border-slate-200 text-slate-900 focus:border-slate-900"
                } disabled:opacity-40`}
              />
            ))}
          </div>

          {/* Erreur */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-red-600">error</span>
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Succès */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Boutons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={digits.some((d) => d === "") || isExpired || isVerifying || !!successMessage}
              onClick={() => submitCode(digits.join(""))}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  <span>Vérification...</span>
                </>
              ) : (
                <span>Confirmer et activer le cabinet</span>
              )}
            </button>

            <button
              type="button"
              disabled={isResending || isVerifying}
              onClick={handleResend}
              className="text-xs text-slate-500 hover:text-slate-900 transition inline-flex items-center justify-center gap-1.5 font-medium cursor-pointer disabled:opacity-50 pt-1"
            >
              <span className="material-symbols-outlined text-[15px]">refresh</span>
              <span>{isResending ? "Génération en cours..." : "Renvoyer un nouveau code"}</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <Link href="/login" className="hover:text-slate-900 font-medium transition">
              ← Retour à la connexion
            </Link>
            <span className="text-slate-400">SSL sécurisé</span>
          </div>
        </div>
      </div>

      <footer className="pt-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} MonCabinet — Activation sécurisée
      </footer>
    </div>
  );
}

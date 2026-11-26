"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { markTourAsSeen } from "@/actions/onboarding-wizard";

export interface TourStep {
  tourId: string;
  badge: string;
  title: string;
  description: string;
  position?: "right" | "bottom";
}

interface DashboardTourProps {
  role: string;
  userEmail?: string | null;
  hasSeenTour?: boolean;
  sidebarOpen: boolean;
  onEnsureSidebarOpen?: () => void;
}

const DOCTOR_STEPS: TourStep[] = [
  {
    tourId: "dashboard",
    badge: "Accueil & Synthèse",
    title: "Tableau de bord clinique",
    description:
      "Votre vue centrale quotidienne : suivez les consultations en cours, le statut de la file d'attente et le patient actuellement prêt à être reçu.",
    position: "right",
  },
  {
    tourId: "queue",
    badge: "Flux Patients",
    title: "Salle d'attente connectée",
    description:
      "Suivez en temps réel les patients enregistrés par votre assistante. Appelez le patient suivant en un clic sans quitter votre bureau.",
    position: "right",
  },
  {
    tourId: "patients",
    badge: "Dossiers Médicaux",
    title: "Fiches Patients & Antécédents",
    description:
      "Accédez aux dossiers médicaux complets : antécédents, observations cliniques, historiques des consultations, ordonnances et quittances.",
    position: "right",
  },
  {
    tourId: "appointments",
    badge: "Planning",
    title: "Agenda & Rendez-vous",
    description:
      "Gérez votre planning de consultations, vos créneaux horaires disponibles et l'organisation hebdomadaire du cabinet.",
    position: "right",
  },
  {
    tourId: "community",
    badge: "Réseau Médical",
    title: "Communauté Confraternelle",
    description:
      "Partagez des cas cliniques anonymisés, sollicitez l'avis de confrères spécialistes, ou proposez des remplacements et gardes en toute sécurité.",
    position: "right",
  },
  {
    tourId: "chat",
    badge: "Messagerie Sécurisée",
    title: "Messagerie Confraternelle Privée",
    description:
      "Échangez en direct 1-à-1 avec vos confrères médecins certifiés via un chat chiffré style WhatsApp avec secret médical préservé.",
    position: "right",
  },
  {
    tourId: "interphone",
    badge: "Communication Directe",
    title: "Interphone Cabinet Médecin ⟷ Assistante",
    description:
      "Communiquez instantanément et discrètement avec votre secrétaire sans interrompre la consultation (arrivée urgente, dossier, etc.).",
    position: "bottom",
  },
  {
    tourId: "settings",
    badge: "Personnalisation",
    title: "Paramètres & Profil Praticien",
    description:
      "Personnalisez les coordonnées du cabinet, votre photo de profil, votre spécialité, votre modèle d'ordonnance et vos formulaires.",
    position: "right",
  },
];

const ASSISTANT_STEPS: TourStep[] = [
  {
    tourId: "dashboard",
    badge: "Accueil & Synthèse",
    title: "Tableau de bord de l'accueil",
    description:
      "Suivez en direct l'activité de la journée, le nombre de patients en attente et l'avancement des consultations du médecin.",
    position: "right",
  },
  {
    tourId: "queue",
    badge: "Accueil Patients",
    title: "Salle d'attente & File en direct",
    description:
      "Enregistrez l'arrivée des patients, gérez la file d'attente et prévenez le médecin en un clic quand le patient est prêt.",
    position: "right",
  },
  {
    tourId: "patients",
    badge: "Fichier Patients",
    title: "Gestion des Patients",
    description:
      "Créez rapidement de nouvelles fiches patients, mettez à jour leurs coordonnées et retrouvez leur historique administratif.",
    position: "right",
  },
  {
    tourId: "payments",
    badge: "Caisse & Facturation",
    title: "Encaissements & Honoraires",
    description:
      "Enregistrez les règlements des consultations, générez les quittances pour les mutuelles et suivez la caisse journalière.",
    position: "right",
  },
  {
    tourId: "appointments",
    badge: "Planning",
    title: "Agenda & Prise de Rendez-vous",
    description:
      "Planifiez les rendez-vous selon les disponibilités et créneaux horaires configurés par le médecin.",
    position: "right",
  },
  {
    tourId: "interphone",
    badge: "Communication Directe",
    title: "Interphone Cabinet",
    description:
      "Communiquez instantanément avec le médecin en consultation sans entrer dans le bureau.",
    position: "bottom",
  },
  {
    tourId: "settings",
    badge: "Configuration",
    title: "Coordonnées & Paramètres",
    description:
      "Consultez les informations générales, coordonnées du cabinet et mentions légales.",
    position: "right",
  },
];

export default function DashboardTour({
  role,
  userEmail,
  hasSeenTour,
  sidebarOpen,
  onEnsureSidebarOpen,
}: DashboardTourProps) {
  const steps = useMemo(() => (role === "doctor" ? DOCTOR_STEPS : ASSISTANT_STEPS), [role]);
  const storageKey = `moncabinet_tour_completed_${role}_${userEmail || "user"}_v4`;

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Vérifier au montage : S'affiche STRICTEMENT et UNIQUEMENT la première fois
  useEffect(() => {
    // Si déjà vu en BDD, ne JAMAIS lancer automatiquement
    if (hasSeenTour) return;

    try {
      const alreadyDone =
        localStorage.getItem(storageKey) ||
        localStorage.getItem("moncabinet_tour_completed_universal");
      if (alreadyDone) return;
    } catch {
      // ignore
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
      if (onEnsureSidebarOpen && !sidebarOpen) {
        onEnsureSidebarOpen();
      }
      // Dès l'apparition initiale, verrouiller IMMÉDIATEMENT en BDD et en localStorage
      try {
        localStorage.setItem(storageKey, "true");
        localStorage.setItem("moncabinet_tour_completed_universal", "true");
      } catch {
        // ignore
      }
      markTourAsSeen();
    }, 600);

    return () => clearTimeout(timer);
  }, [hasSeenTour, storageKey, onEnsureSidebarOpen, sidebarOpen]);

  // Écouter un événement global pour pouvoir relancer le guide à la demande ("Visite guidée")
  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStepIndex(0);
      setIsOpen(true);
      if (onEnsureSidebarOpen && !sidebarOpen) {
        onEnsureSidebarOpen();
      }
    };
    window.addEventListener("moncabinet_start_tour", handleStartTour);
    return () => window.removeEventListener("moncabinet_start_tour", handleStartTour);
  }, [onEnsureSidebarOpen, sidebarOpen]);

  const currentStep = steps[currentStepIndex];

  // Calculer la position de l'élément cible
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !currentStep) return;
    const el = document.querySelector(`[data-tour="${currentStep.tourId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updateTargetRect();
    const handleResize = () => updateTargetRect();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [updateTargetRect, currentStepIndex]);

  // Raccourcis clavier (flèches + Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleClose = () => {
    setIsOpen(false);
    try {
      localStorage.setItem(storageKey, "true");
      localStorage.setItem("moncabinet_tour_completed_universal", "true");
    } catch {
      // ignore
    }
    markTourAsSeen();
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  if (!isOpen || !currentStep) return null;

  // Calculer la position du popover par rapport à l'élément ciblé
  let popoverStyle: React.CSSProperties = {};
  let arrowClass = "";

  if (targetRect) {
    const isBottom = currentStep.position === "bottom" || targetRect.top < 100;
    if (isBottom) {
      // Position sous l'élément (ex: Interphone)
      popoverStyle = {
        position: "fixed",
        top: targetRect.bottom + 14,
        left: Math.max(16, Math.min(window.innerWidth - 340, targetRect.left - 40)),
        width: 320,
      };
      arrowClass = "top-[-7px] left-10 border-b border-r bg-white rotate-[225deg]";
    } else {
      // Position à droite de l'élément (sidebar)
      const topPos = Math.max(
        16,
        Math.min(window.innerHeight - 260, targetRect.top - 20)
      );
      popoverStyle = {
        position: "fixed",
        top: topPos,
        left: Math.min(window.innerWidth - 340, targetRect.right + 14),
        width: 320,
      };
      arrowClass = "left-[-7px] top-7 border-l border-b bg-white rotate-45";
    }
  } else {
    // Centré au milieu si l'élément n'est pas trouvé
    popoverStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: 340,
    };
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] pointer-events-auto">
        {/* Cadre découpé (Spotlight Cutout) qui entoure le bouton ciblé */}
        {targetRect && (
          <motion.div
            key={currentStep.tourId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              // L'ombre 9999px assombrit TOUT le reste de l'écran et laisse ce bouton net sans filtre !
              boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.72)",
            }}
            className="rounded-xl border-2 border-emerald-400 ring-4 ring-emerald-500/30 pointer-events-none transition-all duration-300"
          />
        )}

        {/* Si aucun rectangle détecté, fallback sur un fond sombre standard */}
        {!targetRect && (
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-[2px]" />
        )}

        {/* Boîte d'explication avec flèche pointant vers le bouton */}
        <motion.div
          key={`popover-${currentStepIndex}`}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={popoverStyle}
          className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 z-[10000] text-slate-900 relative"
        >
          {/* Flèche indicatrice */}
          {targetRect && (
            <div
              className={`absolute w-3.5 h-3.5 border-slate-200 z-10 shadow-xs ${arrowClass}`}
            />
          )}

          {/* En-tête de l'étape */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {currentStep.badge}
            </span>

            <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
              Étape {currentStepIndex + 1} / {steps.length}
            </span>
          </div>

          {/* Titre & Description */}
          <h3 className="text-sm font-bold text-slate-900 mb-1.5">
            {currentStep.title}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            {currentStep.description}
          </p>

          {/* Pagination dots */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 cursor-pointer transition"
            >
              Passer la visite
            </button>

            <div className="flex items-center gap-1.5">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition shadow-2xs"
                >
                  Précédent
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition shadow-xs inline-flex items-center gap-1"
              >
                <span>
                  {currentStepIndex === steps.length - 1 ? "C'est parti !" : "Suivant"}
                </span>
                <span className="material-symbols-outlined text-[14px]">
                  {currentStepIndex === steps.length - 1 ? "check" : "arrow_forward"}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

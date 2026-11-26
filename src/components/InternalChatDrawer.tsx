"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  getInternalChatData,
  sendInternalMessage,
  markInternalMessagesAsRead,
  saveQuickMessages,
  clearInternalMessages,
} from "@/actions/internal-chat";

interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  senderRole: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  isMe: boolean;
  isPending?: boolean;
}

interface InternalChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
  onUnreadChange?: (count: number) => void;
  role?: string;
  clinicName?: string;
}

// Suggestions prêtes à l'emploi selon le rôle
const DOCTOR_PRESETS_CATALOG = [
  "Faites entrer le patient suivant",
  "Merci de préparer le dossier médical",
  "J'ai environ 10 min de retard",
  "Patient à préparer pour soins",
  "Besoin d'aide immédiate au cabinet",
  "Pause café 5 minutes",
  "Le patient suivant est-il arrivé ?",
  "Faites patienter 5 minutes en salle",
];

const ASSISTANT_PRESETS_CATALOG = [
  "Le patient de l'heure est en salle",
  "Appel urgent en attente au standard",
  "Une urgence s'est présentée à l'accueil",
  "Dossier patient prêt sur votre bureau",
  "Le patient suivant aura 10 min de retard",
  "Patient sans RDV demande à vous voir",
  "Le laboratoire est au téléphone",
  "Salle d'attente actuellement libre",
];

// Détection intelligente de l'icône médicale adaptée au message
function getQuickMessageIcon(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("entrer") || lower.includes("suivant") || lower.includes("salle")) {
    return "meeting_room";
  }
  if (lower.includes("dossier")) {
    return "folder_shared";
  }
  if (lower.includes("retard") || lower.includes("pause") || lower.includes("min") || lower.includes("patienter")) {
    return "schedule";
  }
  if (lower.includes("urgence") || lower.includes("aide") || lower.includes("urgent")) {
    return "emergency";
  }
  if (lower.includes("appel") || lower.includes("téléphone") || lower.includes("standard")) {
    return "call";
  }
  if (lower.includes("soin") || lower.includes("préparer")) {
    return "medical_services";
  }
  return "chat_bubble";
}

// Formatage séparateur de date ("Aujourd'hui", "Hier", "26 Novembre")
function formatDateDivider(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return "Hier";
    }
    return d.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "Aujourd'hui";
  }
}

export default function InternalChatDrawer({
  isOpen,
  onClose,
  primaryColor = "#0f172a",
  onUnreadChange,
  role = "doctor",
  clinicName = "Cabinet Médical",
}: InternalChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickMessages, setQuickMessages] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<string>(role);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Mode gestion des raccourcis
  const [isManagingShortcuts, setIsManagingShortcuts] = useState(false);
  const [editingShortcuts, setEditingShortcuts] = useState<string[]>([]);
  const [newShortcutText, setNewShortcutText] = useState("");
  const [isSavingShortcuts, setIsSavingShortcuts] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  const isDoctor = currentRole === "doctor";

  // Carillon sonore Web Audio discret et professionnel
  const playChime = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Premier ton doux D5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.06, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Deuxième ton cristallin A5
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.08, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.38);

      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 600);
    } catch {
      // AudioContext bloqué avant interaction
    }
  }, [soundEnabled]);

  // Récupérer les messages et raccourcis
  const fetchChat = useCallback(async () => {
    try {
      const data = await getInternalChatData();
      if (!data) return;

      setCurrentRole(data.currentRole);
      setCurrentUserId(data.currentUserId);
      setQuickMessages(data.quickMessages);
      setEditingShortcuts(data.quickMessages);

      if (onUnreadChange) {
        onUnreadChange(data.unreadCount);
      }

      // Si de nouveaux messages sont arrivés de l'autre personne
      if (
        prevMessagesCountRef.current > 0 &&
        data.messages.length > prevMessagesCountRef.current
      ) {
        const lastMsg = data.messages[data.messages.length - 1];
        if (!lastMsg.isMe) {
          playChime();
        }
      }
      prevMessagesCountRef.current = data.messages.length;

      // Conserver les messages en cours d'envoi optimiste
      setMessages((prev) => {
        const pending = prev.filter((m) => m.isPending);
        return [...data.messages, ...pending];
      });

      // Si ouvert et messages non lus, marquer comme lu immédiatement
      if (isOpen && data.unreadCount > 0) {
        markInternalMessagesAsRead().then(() => {
          if (onUnreadChange) onUnreadChange(0);
        });
      }
    } catch {
      // ignore
    }
  }, [isOpen, onUnreadChange, playChime]);

  // Polling temps réel (toutes les 2.5s quand ouvert, 5s quand fermé)
  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, isOpen ? 2500 : 5000);
    return () => clearInterval(interval);
  }, [fetchChat, isOpen]);

  // Défilement automatique vers le bas
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(true);
    }
  }, [messages.length, isOpen, scrollToBottom]);

  // Fermeture par la touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Envoi optimiste à latence 0ms
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    const tempId = -Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      senderId: currentUserId || 0,
      senderName: isDoctor ? "Dr. Médecin" : "Assistante",
      senderRole: currentRole,
      content: text,
      isRead: false,
      createdAt: new Date().toISOString(),
      isMe: true,
      isPending: true,
    };

    // Affichage instantané
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");
    setIsSending(true);
    scrollToBottom(true);

    try {
      const res = await sendInternalMessage(text);
      if (res.success && res.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...res.message, isPending: false } : m))
        );
        prevMessagesCountRef.current += 1;
      }
    } catch {
      // En cas d'échec, retirer le message optimiste
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
      // Remettre le focus sur le champ texte
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  // Gestion des raccourcis
  const handleAddShortcut = (textToAdd?: string) => {
    const t = (textToAdd || newShortcutText).trim();
    if (!t) return;
    if (editingShortcuts.includes(t)) return;
    setEditingShortcuts((prev) => [...prev, t]);
    setNewShortcutText("");
  };

  const handleRemoveShortcut = (index: number) => {
    setEditingShortcuts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveShortcuts = async () => {
    setIsSavingShortcuts(true);
    try {
      const res = await saveQuickMessages(editingShortcuts);
      if (res.success && res.quickMessages) {
        setQuickMessages(res.quickMessages);
        setIsManagingShortcuts(false);
      }
    } finally {
      setIsSavingShortcuts(false);
    }
  };

  const handleClearHistory = async () => {
    if (
      !confirm(
        "Voulez-vous effacer l'historique des échanges de l'interphone pour aujourd'hui ?"
      )
    ) {
      return;
    }
    setMessages([]);
    await clearInternalMessages();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop sombre avec flou doux */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs cursor-pointer"
          />

          {/* Tiroir Interphone Coulissant */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 w-full sm:w-[420px] max-w-full bg-white h-[100dvh] max-h-[100dvh] flex flex-col shadow-2xl border-l border-slate-200 overflow-hidden"
          >
            {/* ========================================================
                1. EN-TÊTE PROFESSIONNEL INTERPHONE
            ======================================================== */}
            <header className="px-4 py-3.5 border-b border-slate-200/90 flex items-center justify-between bg-white shrink-0 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar du correspondant */}
                <div className="relative shrink-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
                      isDoctor
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-900 text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isDoctor ? "support_agent" : "stethoscope"}
                    </span>
                  </div>
                  {/* Pastille En direct */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/20" />
                </div>

                {/* Nom et statut du correspondant */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {isDoctor ? "Assistante Médicale" : "Médecin Praticien"}
                    </h3>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                      Direct
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>{isDoctor ? "Accueil & Secrétariat" : "En consultation au cabinet"}</span>
                  </p>
                </div>
              </div>

              {/* Barre d'outils de l'en-tête */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Raccourcis */}
                <button
                  type="button"
                  onClick={() => setIsManagingShortcuts(!isManagingShortcuts)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                    isManagingShortcuts
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  title="Personnaliser mes boutons rapides"
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                </button>

                {/* Sonnerie */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                  title={soundEnabled ? "Couper le carillon sonore" : "Activer le carillon sonore"}
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {soundEnabled ? "volume_up" : "volume_off"}
                  </span>
                </button>

                {/* Effacer la conversation */}
                {messages.length > 0 && !isManagingShortcuts && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                    title="Effacer les échanges d'aujourd'hui"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                  </button>
                )}

                {/* Fermer */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer ml-1"
                  title="Fermer l'interphone (Échap)"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </header>

            {/* ========================================================
                2. GESTION DES RACCOURCIS (VUE SLIDE-IN)
            ======================================================== */}
            {isManagingShortcuts ? (
              <div className="flex-1 p-4 bg-slate-50/70 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-slate-700">tune</span>
                        <span>Mes boutons rapides</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Envoyez des consignes médicales en 1 clic sans avoir à taper.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsManagingShortcuts(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                    >
                      Retour
                    </button>
                  </div>

                  {/* Formulaire ajout personnalisé */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={70}
                      value={newShortcutText}
                      onChange={(e) => setNewShortcutText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddShortcut();
                        }
                      }}
                      placeholder="Ex: Préparer le tensiomètre..."
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddShortcut()}
                      disabled={!newShortcutText.trim()}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-xs"
                    >
                      Ajouter
                    </button>
                  </div>

                  {/* Suggestions recommandées en 1 clic */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Suggestions recommandées :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(isDoctor ? DOCTOR_PRESETS_CATALOG : ASSISTANT_PRESETS_CATALOG)
                        .filter((p) => !editingShortcuts.includes(p))
                        .slice(0, 6)
                        .map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleAddShortcut(preset)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 hover:border-slate-400 text-slate-700 text-[11px] font-medium transition shadow-2xs hover:bg-slate-50 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[13px] text-slate-400">
                              add
                            </span>
                            <span>{preset}</span>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Liste des boutons actuels */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Boutons actuellement configurés ({editingShortcuts.length}) :
                    </span>
                    {editingShortcuts.map((msg, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-slate-400 text-base shrink-0">
                            {getQuickMessageIcon(msg)}
                          </span>
                          <span className="text-xs text-slate-800 truncate font-medium">
                            {msg}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveShortcut(idx)}
                          className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                          title="Supprimer ce bouton"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 mt-4">
                  <button
                    type="button"
                    disabled={isSavingShortcuts}
                    onClick={handleSaveShortcuts}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {isSavingShortcuts ? "Enregistrement..." : "Enregistrer mes raccourcis"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ========================================================
                    3. BANDEAU DES BOUTONS RAPIDES (1 CLIC = ENVOI INSTANTANÉ)
                ======================================================== */}
                <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setIsManagingShortcuts(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 shrink-0 transition shadow-2xs cursor-pointer"
                    title="Gérer mes boutons rapides"
                  >
                    <span className="material-symbols-outlined text-[14px]">tune</span>
                    <span>Raccourcis</span>
                  </button>

                  {quickMessages.map((msg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(msg)}
                      disabled={isSending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50/70 hover:border-emerald-300 border border-slate-200 text-slate-800 text-[11px] font-medium shrink-0 transition shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px] text-slate-400">
                        {getQuickMessageIcon(msg)}
                      </span>
                      <span>{msg}</span>
                    </button>
                  ))}
                </div>

                {/* ========================================================
                    4. FIL DE DISCUSSION EN TEMPS RÉEL (FLUIDE & MODERNE)
                ======================================================== */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#F8F9FA]">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-400 mb-3">
                        <span className="material-symbols-outlined text-2xl text-emerald-600">
                          forum
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        Interphone prêt pour le service
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                        {isDoctor
                          ? "Communiquez directement avec votre assistante sans vous déplacer. Cliquez sur un raccourci ci-dessus pour envoyer une consigne en 1 clic."
                          : "Communiquez directement avec le médecin praticien pendant ses consultations en toute discrétion."}
                      </p>
                    </div>
                  ) : (
                    messages.map((m, index) => {
                      const time = new Date(m.createdAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      // Séparateur de date
                      const prevMsg = messages[index - 1];
                      const showDateDivider =
                        !prevMsg ||
                        new Date(prevMsg.createdAt).toDateString() !==
                          new Date(m.createdAt).toDateString();

                      // Groupement compact si même émetteur dans les 2 minutes
                      const isSameSenderAsPrev =
                        prevMsg &&
                        prevMsg.isMe === m.isMe &&
                        Math.abs(
                          new Date(m.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()
                        ) < 120000;

                      return (
                        <div key={m.id || index} className="space-y-2">
                          {showDateDivider && (
                            <div className="flex items-center justify-center my-3">
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                {formatDateDivider(m.createdAt)}
                              </span>
                            </div>
                          )}

                          <div
                            className={`flex flex-col ${
                              m.isMe ? "items-end" : "items-start"
                            } ${isSameSenderAsPrev ? "mt-1" : "mt-2.5"}`}
                          >
                            {!isSameSenderAsPrev && !m.isMe && (
                              <div className="flex items-center gap-1.5 mb-1 px-1">
                                <span className="text-[10px] font-bold text-slate-700">
                                  {m.senderName}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {m.senderRole === "doctor" ? "Médecin" : "Assistante"}
                                </span>
                              </div>
                            )}

                            <div
                              style={
                                m.isMe
                                  ? { backgroundColor: primaryColor, color: "#ffffff" }
                                  : { backgroundColor: "#ffffff", color: "#0f172a" }
                              }
                              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs break-words border ${
                                m.isMe
                                  ? "rounded-br-xs border-transparent shadow-slate-900/10"
                                  : "rounded-bl-xs border-slate-200/90 shadow-slate-900/5"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{m.content}</p>

                              {/* Heure et confirmation d'envoi / lecture */}
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                  m.isMe ? "text-slate-300" : "text-slate-400"
                                }`}
                              >
                                <span className="tabular-nums">{time}</span>

                                {m.isMe && (
                                  <span className="inline-flex items-center">
                                    {m.isPending ? (
                                      <span className="material-symbols-outlined text-[13px] animate-spin text-slate-300">
                                        progress_activity
                                      </span>
                                    ) : m.isRead ? (
                                      <span
                                        className="material-symbols-outlined text-[14px] text-emerald-400"
                                        title="Lu par le destinataire"
                                      >
                                        done_all
                                      </span>
                                    ) : (
                                      <span
                                        className="material-symbols-outlined text-[14px] text-slate-300"
                                        title="Envoyé"
                                      >
                                        check
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* ========================================================
                    5. ZONE DE SAISIE MODERNE & RESPONSIVE
                ======================================================== */}
                <footer className="p-3 border-t border-slate-200 bg-white shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex items-end gap-2"
                  >
                    <div className="flex-1 min-w-0 relative">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder={
                          isDoctor
                            ? "Message direct pour l'assistante (Entrée)..."
                            : "Message direct pour le médecin (Entrée)..."
                        }
                        className="w-full px-3.5 py-2.5 max-h-28 rounded-xl border border-slate-200/90 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-slate-50/50 resize-none leading-relaxed transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!inputText.trim() || isSending}
                      style={{ backgroundColor: primaryColor }}
                      className="w-9 h-9 rounded-xl text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40 shadow-xs shrink-0 active:scale-95"
                      title="Envoyer (Entrée)"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </button>
                  </form>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

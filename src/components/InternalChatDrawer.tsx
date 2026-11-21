"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getInternalChatData,
  sendInternalMessage,
  markInternalMessagesAsRead,
  saveQuickMessages,
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
}

interface InternalChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
  onUnreadChange?: (count: number) => void;
}

export default function InternalChatDrawer({
  isOpen,
  onClose,
  primaryColor = "#0f172a",
  onUnreadChange,
}: InternalChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickMessages, setQuickMessages] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("doctor");
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Mode édition des raccourcis personnalisés
  const [isManagingShortcuts, setIsManagingShortcuts] = useState(false);
  const [editingShortcuts, setEditingShortcuts] = useState<string[]>([]);
  const [newShortcutText, setNewShortcutText] = useState("");
  const [isSavingShortcuts, setIsSavingShortcuts] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  // Carillon sonore Web Audio discret
  const playChime = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext non autorisé sans interaction
    }
  }, [soundEnabled]);

  const fetchChat = useCallback(async () => {
    try {
      const data = await getInternalChatData();
      if (!data) return;

      setCurrentRole(data.currentRole);
      setQuickMessages(data.quickMessages);
      setEditingShortcuts(data.quickMessages);

      if (onUnreadChange) {
        onUnreadChange(data.unreadCount);
      }

      // Détecter si un nouveau message de l'autre personne est arrivé
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
      setMessages(data.messages);

      // Si le tiroir est ouvert, marquer les messages comme lus
      if (isOpen && data.unreadCount > 0) {
        markInternalMessagesAsRead().then(() => {
          if (onUnreadChange) onUnreadChange(0);
        });
      }
    } catch {
      // ignore
    }
  }, [isOpen, onUnreadChange, playChime]);

  // Polling doux : toutes les 2.5s quand ouvert, toutes les 6s quand fermé
  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, isOpen ? 2500 : 6000);
    return () => clearInterval(interval);
  }, [fetchChat, isOpen]);

  // Auto-scroll en bas quand nouveaux messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText("");

    try {
      const res = await sendInternalMessage(text);
      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
        prevMessagesCountRef.current += 1;
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleAddShortcut = () => {
    const t = newShortcutText.trim();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Fond sombre cliquable */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
      />

      {/* Tiroir coulissant */}
      <div className="relative z-10 w-full sm:w-96 max-w-full bg-white h-full flex flex-col shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* En-tête de l'interphone */}
        <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="material-symbols-outlined text-[19px]">forum</span>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 truncate">
                  Interphone Cabinet
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Direct
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {currentRole === "doctor"
                  ? "Communication avec l'assistante"
                  : "Communication avec le médecin"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition cursor-pointer"
              title={soundEnabled ? "Couper le son" : "Activer le son"}
            >
              <span className="material-symbols-outlined text-base">
                {soundEnabled ? "volume_up" : "volume_off"}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </header>

        {/* Modal / Section de gestion des raccourcis personnalisés */}
        {isManagingShortcuts ? (
          <div className="flex-1 p-4 bg-slate-50/60 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-slate-500">tune</span>
                  <span>Mes boutons rapides</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsManagingShortcuts(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Annuler
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                Personnalisez vos messages types pour les envoyer en 1 clic sans avoir à taper.
              </p>

              {/* Formulaire ajout nouveau raccourci */}
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
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddShortcut}
                  disabled={!newShortcutText.trim()}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Ajouter
                </button>
              </div>

              {/* Liste des raccourcis actuels avec suppression */}
              <div className="space-y-1.5 pt-2">
                {editingShortcuts.map((msg, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <span className="text-xs text-slate-800 truncate font-medium">{msg}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveShortcut(idx)}
                      className="text-slate-400 hover:text-red-600 transition p-1"
                      title="Supprimer ce bouton"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                disabled={isSavingShortcuts}
                onClick={handleSaveShortcuts}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isSavingShortcuts ? "Enregistrement..." : "Enregistrer mes raccourcis"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Barre des Raccourcis Rapides en 1 clic */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setIsManagingShortcuts(true)}
                className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold flex items-center gap-1 shrink-0 transition shadow-2xs"
                title="Personnaliser mes boutons rapides"
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
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-medium shrink-0 transition shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {msg}
                </button>
              ))}
            </div>

            {/* Fil des messages */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#FCFDFD]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">chat</span>
                  <p className="text-xs font-medium text-slate-600">Aucun message pour l&apos;instant</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Utilisez les raccourcis ci-dessus ou écrivez un message pour communiquer en direct.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const time = new Date(m.createdAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.isMe ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                        {m.isMe ? "Vous" : m.senderName} • {time}
                      </span>
                      <div
                        style={
                          m.isMe
                            ? { backgroundColor: primaryColor, color: "#ffffff" }
                            : { backgroundColor: "#f1f5f9", color: "#0f172a" }
                        }
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-2xs break-words ${
                          m.isMe ? "rounded-br-xs" : "rounded-bl-xs"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie */}
            <footer className="p-3 border-t border-slate-200 bg-white shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Écrire un message en direct..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 bg-slate-50/50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  style={{ backgroundColor: primaryColor }}
                  className="w-9 h-9 rounded-xl text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40 shadow-xs shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </form>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

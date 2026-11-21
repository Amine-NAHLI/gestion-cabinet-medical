"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getCommunityDirectMessages,
  sendCommunityDirectMessage,
  markDoctorChatAsRead,
  toggleCommunityMembership,
} from "@/actions/community";

interface ConfrereChat {
  id: number;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  clinicName: string;
  clinicCity: string;
  unreadCount: number;
  lastMessage: {
    content: string;
    createdAt: string;
    isMe: boolean;
  } | null;
}

interface DirectMessage {
  id: number;
  senderDoctorId: number;
  receiverDoctorId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  isMe: boolean;
}

interface ChatClientProps {
  initialData: {
    isDoctor: boolean;
    isMember: boolean;
    confreres: ConfrereChat[];
    totalUnreadCount: number;
    currentDoctorId: number;
  };
  initialDoctorId?: number | null;
}

export default function ChatClient({ initialData, initialDoctorId }: ChatClientProps) {
  const [isMember, setIsMember] = useState(initialData.isMember);
  const [confreres, setConfreres] = useState<ConfrereChat[]>(initialData.confreres || []);
  const [searchQuery, setSearchQuery] = useState("");

  // Trouver le confrère initial s'il est spécifié dans l'URL
  const initialSelected = initialDoctorId
    ? initialData.confreres.find((c) => c.id === initialDoctorId) || null
    : initialData.confreres.length > 0
    ? initialData.confreres[0]
    : null;

  const [selectedConfrere, setSelectedConfrere] = useState<ConfrereChat | null>(initialSelected);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Rejoindre la communauté si pas encore membre
  const handleJoin = async () => {
    const res = await toggleCommunityMembership(true);
    if (res.success) {
      setIsMember(true);
      window.location.reload();
    }
  };

  // Récupérer les messages avec le confrère sélectionné
  const fetchMessages = useCallback(async () => {
    if (!selectedConfrere) return;
    try {
      const msgs = await getCommunityDirectMessages(selectedConfrere.id);
      setMessages(msgs);

      // Si le confrère avait des messages non lus, effacer son compteur localement
      if (selectedConfrere.unreadCount > 0) {
        setConfreres((prev) =>
          prev.map((c) => (c.id === selectedConfrere.id ? { ...c, unreadCount: 0 } : c))
        );
        setSelectedConfrere((prev) => (prev ? { ...prev, unreadCount: 0 } : null));
        await markDoctorChatAsRead(selectedConfrere.id);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("chat_read"));
        }
      }
    } catch {
      // ignore
    }
  }, [selectedConfrere]);

  useEffect(() => {
    if (selectedConfrere) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConfrere, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sélectionner un confrère et marquer ses messages comme lus
  const handleSelectConfrere = async (confrere: ConfrereChat) => {
    setSelectedConfrere({ ...confrere, unreadCount: 0 });

    if (confrere.unreadCount > 0) {
      setConfreres((prev) =>
        prev.map((c) => (c.id === confrere.id ? { ...c, unreadCount: 0 } : c))
      );
      await markDoctorChatAsRead(confrere.id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chat_read"));
      }
    }
  };

  // Envoi d'un message direct
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfrere || !inputText.trim() || isSending) return;

    const text = inputText.trim();
    setIsSending(true);
    setInputText("");

    try {
      const res = await sendCommunityDirectMessage(selectedConfrere.id, text);
      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);

        // Mettre à jour le dernier message dans la liste de gauche
        setConfreres((prev) =>
          prev.map((c) =>
            c.id === selectedConfrere.id
              ? {
                  ...c,
                  lastMessage: {
                    content: text,
                    createdAt: new Date().toISOString(),
                    isMe: true,
                  },
                }
              : c
          )
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  // Filtre de recherche
  const filteredConfreres = confreres.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.clinicCity.toLowerCase().includes(q) ||
      c.clinicName.toLowerCase().includes(q)
    );
  });

  const totalUnread = confreres.reduce((acc, c) => acc + c.unreadCount, 0);

  if (!isMember) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-3xl">chat</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Messagerie Confraternelle</h2>
        <p className="text-xs text-slate-500">
          Activez votre accès au réseau pour échanger en privé avec les autres médecins de la plateforme.
        </p>
        <button
          onClick={handleJoin}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
        >
          Activer la Messagerie
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Messagerie Confraternelle
            </h1>
            {totalUnread > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white shadow-2xs animate-pulse">
                {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                À jour
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Discussions privées 1-à-1 chiffrées entre médecins certifiés • Style WhatsApp Web
          </p>
        </div>
      </div>

      {/* Interface Principale 2 Colonnes WhatsApp Style */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-14rem)] min-h-[580px]">
        {/* COLONNE GAUCHE (CONFRÈRES) : 4/12 sur desktop */}
        <aside
          className={`md:col-span-4 lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50 ${
            selectedConfrere ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Barre de recherche */}
          <div className="p-3 border-b border-slate-200 bg-white">
            <div className="relative">
              <span className="material-symbols-outlined text-slate-400 text-base absolute left-3 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une discussion..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-900 transition"
              />
            </div>
          </div>

          {/* Liste des discussions */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConfreres.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun confrère trouvé.
              </div>
            ) : (
              filteredConfreres.map((c) => {
                const isSelected = selectedConfrere?.id === c.id;
                const initials = c.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                const lastTime = c.lastMessage
                  ? new Date(c.lastMessage.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectConfrere(c)}
                    className={`w-full p-3.5 text-left transition flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-white shadow-2xs border-l-4 border-l-slate-900"
                        : "hover:bg-slate-100/70"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {c.avatarUrl ? (
                        <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-200 overflow-hidden shadow-2xs">
                          <img src={c.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                          {initials}
                        </div>
                      )}

                      {/* Indicateur non lu sur l'avatar */}
                      {c.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Infos Confrère & Aperçu Dernier Message */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs truncate flex items-center gap-1 ${
                            c.unreadCount > 0 ? "font-bold text-slate-950" : "font-semibold text-slate-800"
                          }`}
                        >
                          <span>{c.name}</span>
                          <span className="material-symbols-outlined text-[13px] text-sky-600">
                            verified
                          </span>
                        </p>
                        {lastTime && (
                          <span
                            className={`text-[10px] shrink-0 ${
                              c.unreadCount > 0 ? "text-rose-600 font-bold" : "text-slate-400"
                            }`}
                          >
                            {lastTime}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p
                          className={`text-[11px] truncate leading-tight ${
                            c.unreadCount > 0
                              ? "font-semibold text-slate-900"
                              : "text-slate-500 font-normal"
                          }`}
                        >
                          {c.lastMessage ? (
                            <>
                              {c.lastMessage.isMe && <span className="text-slate-400">Vous : </span>}
                              {c.lastMessage.content}
                            </>
                          ) : (
                            <span className="italic text-slate-400">Aucun message</span>
                          )}
                        </p>

                        {/* Badge rouge WhatsApp sur la ligne */}
                        {c.unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white shrink-0">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* COLONNE DROITE (CONVERSATION ACTIVE) : 8/12 sur desktop */}
        <main
          className={`md:col-span-8 lg:col-span-8 flex flex-col bg-white ${
            !selectedConfrere ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedConfrere ? (
            <>
              {/* En-tête de la conversation */}
              <header className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Bouton retour sur mobile */}
                  <button
                    type="button"
                    onClick={() => setSelectedConfrere(null)}
                    className="md:hidden w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                  </button>

                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {selectedConfrere.avatarUrl ? (
                      <img
                        src={selectedConfrere.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      selectedConfrere.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                      <span>{selectedConfrere.name}</span>
                      <span className="material-symbols-outlined text-[14px] text-sky-600">
                        verified
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {selectedConfrere.clinicCity} • {selectedConfrere.clinicName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    En direct
                  </span>
                </div>
              </header>

              {/* Fil des messages WhatsApp Style */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8F9FB]">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">
                      lock
                    </span>
                    <p className="text-xs font-bold text-slate-700">Début de la discussion</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                      Les messages échangés avec le Dr. {selectedConfrere.name} sont strictement confidentiels et réservés aux praticiens.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const time = new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs break-words ${
                            msg.isMe
                              ? "bg-slate-900 text-white rounded-br-xs"
                              : "bg-white text-slate-900 border border-slate-200/80 rounded-bl-xs"
                          }`}
                        >
                          <p>{msg.content}</p>
                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                              msg.isMe ? "text-slate-400" : "text-slate-400"
                            }`}
                          >
                            <span>{time}</span>
                            {msg.isMe && (
                              <span
                                className={`material-symbols-outlined text-[13px] leading-none ${
                                  msg.isRead ? "text-sky-400" : "text-slate-400"
                                }`}
                                title={msg.isRead ? "Lu par le confrère" : "Envoyé"}
                              >
                                done_all
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Barre de saisie message */}
              <footer className="p-3 border-t border-slate-200 bg-white shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Écrire au Dr. ${selectedConfrere.name}...`}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 bg-slate-50/50"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40 shadow-xs shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </button>
                </form>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-2 text-slate-300">chat</span>
              <p className="text-sm font-bold text-slate-800">Sélectionnez une discussion</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Choisissez un médecin dans la liste de gauche pour échanger en direct ou demander un avis.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

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
  specialty?: string;
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
  initialPostTitle?: string | null;
}

export default function ChatClient({
  initialData,
  initialDoctorId,
  initialPostTitle,
}: ChatClientProps) {
  const [isMember, setIsMember] = useState(initialData.isMember);
  const [confreres, setConfreres] = useState<ConfrereChat[]>(initialData.confreres || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [closedConfrereIds, setClosedConfrereIds] = useState<number[]>([]);

  // Tag / Référence publication lors d'un échange depuis la communauté
  const [activePostRef, setActivePostRef] = useState<string | null>(initialPostTitle || null);

  // Filtre spécialité et recherche pour l'annuaire des confrères
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [directorySearch, setDirectorySearch] = useState<string>("");

  // Trouver le confrère initial s'il est spécifié dans l'URL ou ayant des messages récents
  const initialSelected = initialDoctorId
    ? initialData.confreres.find((c) => c.id === initialDoctorId) || null
    : initialData.confreres.find((c) => c.lastMessage !== null) || null;

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
    // Si la discussion était fermée, la réouvrir
    setClosedConfrereIds((prev) => prev.filter((id) => id !== confrere.id));
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

  // Fermer une conversation pour ne pas la laisser encombrer la barre latérale
  const handleCloseConversation = (e: React.MouseEvent, confrereId: number) => {
    e.stopPropagation();
    setClosedConfrereIds((prev) => (prev.includes(confrereId) ? prev : [...prev, confrereId]));
    if (selectedConfrere?.id === confrereId) {
      setSelectedConfrere(null);
    }
  };

  // Démarrer une conversation depuis l'annuaire
  const handleStartConversation = (confrere: ConfrereChat) => {
    setClosedConfrereIds((prev) => prev.filter((id) => id !== confrere.id));
    handleSelectConfrere(confrere);
  };

  // Envoi d'un message direct (avec tag publication éventuel)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfrere || !inputText.trim() || isSending) return;

    const baseText = inputText.trim();
    // Si on répond à une publication, ajouter le tag de contexte
    const textToSend = activePostRef
      ? `📌 [Réf. Publication : "${activePostRef}"]\n\n${baseText}`
      : baseText;

    setIsSending(true);
    setInputText("");
    const sentPostRef = activePostRef;
    setActivePostRef(null); // Consommer le tag après le premier envoi

    try {
      const res = await sendCommunityDirectMessage(selectedConfrere.id, textToSend);
      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);

        // Mettre à jour le dernier message dans la liste de gauche
        setConfreres((prev) =>
          prev.map((c) =>
            c.id === selectedConfrere.id
              ? {
                  ...c,
                  lastMessage: {
                    content: textToSend,
                    createdAt: new Date().toISOString(),
                    isMe: true,
                  },
                }
              : c
          )
        );
      } else {
        // En cas d'échec, restaurer le tag
        setActivePostRef(sentPostRef);
      }
    } catch {
      setActivePostRef(sentPostRef);
    } finally {
      setIsSending(false);
    }
  };

  // Liste des conversations actives dans la barre latérale
  const activeConversations = confreres.filter((c) => {
    const isCurrentlySelected = selectedConfrere?.id === c.id;
    const isClosed = closedConfrereIds.includes(c.id);
    if (isClosed && !isCurrentlySelected) return false;

    // Est active si elle a des messages échangés OU est actuellement sélectionnée
    const hasHistory = c.lastMessage !== null;
    return hasHistory || isCurrentlySelected || initialDoctorId === c.id;
  });

  // Filtrer les conversations actives par la recherche
  const filteredActiveConversations = activeConversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.specialty || "").toLowerCase().includes(q) ||
      c.clinicCity.toLowerCase().includes(q) ||
      c.clinicName.toLowerCase().includes(q)
    );
  });

  // Liste des spécialités disponibles pour le filtre de l'annuaire
  const allSpecialties = Array.from(
    new Set(confreres.map((c) => c.specialty || "Médecine Générale"))
  ).sort();

  // Liste des confrères pour l'annuaire (confrères qui ont activé la messagerie)
  const directoryDoctors = confreres.filter((c) => {
    const matchesSpec =
      selectedSpecialty === "all" ||
      (c.specialty || "Médecine Générale") === selectedSpecialty;
    if (!matchesSpec) return false;
    if (!directorySearch.trim()) return true;

    const q = directorySearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.specialty || "").toLowerCase().includes(q) ||
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
            Discussions privées chiffrées entre médecins certifiés • Style WhatsApp Web
          </p>
        </div>

        {/* Bouton Annuaire / Nouveau Message */}
        <button
          type="button"
          onClick={() => setSelectedConfrere(null)}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            !selectedConfrere
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs"
          }`}
        >
          <span className="material-symbols-outlined text-[17px] text-sky-600">person_add</span>
          <span>Annuaire des Médecins ({confreres.length})</span>
        </button>
      </div>

      {/* Interface Principale 2 Colonnes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-14rem)] min-h-[580px]">
        {/* COLONNE GAUCHE (DISCUSSIONS EN COURS) : 4/12 sur desktop */}
        <aside
          className={`md:col-span-4 lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50 ${
            selectedConfrere ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Barre de recherche + bouton nouveau */}
          <div className="p-3 border-b border-slate-200 bg-white space-y-2">
            <div className="relative">
              <span className="material-symbols-outlined text-slate-400 text-base absolute left-3 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer mes discussions..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-900 transition"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
              <span>Discussions actives ({filteredActiveConversations.length})</span>
              <button
                type="button"
                onClick={() => setSelectedConfrere(null)}
                className="text-sky-600 hover:text-sky-800 font-semibold cursor-pointer inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span>Nouveau</span>
              </button>
            </div>
          </div>

          {/* Liste des discussions */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredActiveConversations.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-lg">chat_bubble_outline</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700">Aucune discussion ouverte</p>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                    Sélectionnez un médecin dans l&apos;annuaire à droite pour débuter un échange.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedConfrere(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold transition cursor-pointer"
                >
                  Voir l&apos;annuaire
                </button>
              </div>
            ) : (
              filteredActiveConversations.map((c) => {
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
                  <div
                    key={c.id}
                    onClick={() => handleSelectConfrere(c)}
                    className={`group relative w-full p-3.5 text-left transition flex items-start gap-3 cursor-pointer ${
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
                    <div className="min-w-0 flex-1 pr-5">
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

                      <p className="text-[10px] text-slate-400 truncate">
                        {c.specialty || "Médecine Générale"} • {c.clinicCity}
                      </p>

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
                            <span className="italic text-slate-400">Discussion ouverte</span>
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

                    {/* Bouton discret pour FERMER la conversation */}
                    <button
                      type="button"
                      title="Fermer cette discussion"
                      onClick={(e) => handleCloseConversation(e, c.id)}
                      className="absolute right-2 top-3 w-5 h-5 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* COLONNE DROITE : CONVERSATION ACTIVE OU ANNUAIRE DES CONFRÈRES */}
        <main
          className={`md:col-span-8 lg:col-span-8 flex flex-col bg-white ${
            !selectedConfrere ? "flex" : "flex"
          }`}
        >
          {selectedConfrere ? (
            /* ============================================================
               VUE 1 : CONVERSATION EN COURS AVEC LE MÉDECIN SÉLECTIONNÉ
               ============================================================ */
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
                      {selectedConfrere.specialty || "Médecine Générale"} • {selectedConfrere.clinicCity} • {selectedConfrere.clinicName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    En direct
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCloseConversation(e, selectedConfrere.id)}
                    title="Fermer cette discussion"
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-600 hover:bg-slate-100 flex items-center gap-1 cursor-pointer transition"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                    <span>Fermer</span>
                  </button>
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
                      Les messages échangés avec le Dr. {selectedConfrere.name} sont strictement confidentiels et chiffrés.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const time = new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    // Détection du tag de publication
                    const isTagged = msg.content.startsWith("📌 [Réf. Publication :");
                    let quoteHeader = "";
                    let cleanBody = msg.content;

                    if (isTagged) {
                      const splitIndex = msg.content.indexOf("\n\n");
                      if (splitIndex !== -1) {
                        quoteHeader = msg.content.substring(0, splitIndex);
                        cleanBody = msg.content.substring(splitIndex + 2);
                      }
                    }

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
                          {/* En-tête de référence publication si présent */}
                          {quoteHeader && (
                            <div
                              className={`mb-2 p-2 rounded-xl text-[11px] font-medium border ${
                                msg.isMe
                                  ? "bg-slate-800/80 border-slate-700 text-sky-200"
                                  : "bg-sky-50 border-sky-100 text-sky-900"
                              }`}
                            >
                              <div className="flex items-center gap-1 font-bold">
                                <span className="material-symbols-outlined text-xs">forum</span>
                                <span>Réponse à une publication</span>
                              </div>
                              <p className="mt-0.5 italic">{quoteHeader.replace("📌 [Réf. Publication :", "").replace(/\]$/, "").trim()}</p>
                            </div>
                          )}

                          <p className="whitespace-pre-line">{cleanBody}</p>

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
              <footer className="p-3 border-t border-slate-200 bg-white shrink-0 space-y-2">
                {/* Badge visuel si une référence de publication est active */}
                {activePostRef && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-base text-sky-600">reply</span>
                      <span className="truncate">
                        En réponse à la publication : <strong>&quot;{activePostRef}&quot;</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePostRef(null)}
                      className="text-sky-500 hover:text-sky-800 cursor-pointer p-0.5"
                      title="Retirer la référence"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                )}

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
            /* ============================================================
               VUE 2 : ANNUAIRE DES MÉDECINS CERTIFIÉS (QUAND TOUT EST FERMÉ OU MODE EXPLORATION)
               ============================================================ */
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAFAFC]">
              {/* En-tête Annuaire */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sky-600 text-2xl">contacts</span>
                  <h2 className="text-lg font-bold text-slate-900">
                    Annuaire des Médecins du Réseau
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Tous ces praticiens ont activé la messagerie confraternelle. Choisissez un confrère pour démarrer un échange privé.
                </p>
              </div>

              {/* Barre de recherche dans l'annuaire */}
              <div className="relative max-w-md">
                <span className="material-symbols-outlined text-slate-400 text-base absolute left-3 top-1/2 -translate-y-1/2">
                  search
                </span>
                <input
                  type="text"
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  placeholder="Rechercher par nom, spécialité, ville ou cabinet..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:border-slate-900 shadow-2xs transition"
                />
              </div>

              {/* Filtres par spécialité */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedSpecialty("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    selectedSpecialty === "all"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  Toutes les spécialités ({confreres.length})
                </button>
                {allSpecialties.map((spec) => {
                  const count = confreres.filter(
                    (c) => (c.specialty || "Médecine Générale") === spec
                  ).length;
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => setSelectedSpecialty(spec)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        selectedSpecialty === spec
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      <span>{spec}</span>
                      <span className="text-[10px] opacity-75 font-normal">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Grille des cartes médecins */}
              {directoryDoctors.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-white border border-slate-200 space-y-2">
                  <span className="material-symbols-outlined text-3xl text-slate-300">
                    person_search
                  </span>
                  <p className="text-xs font-semibold text-slate-700">Aucun médecin trouvé</p>
                  <p className="text-[11px] text-slate-400">
                    Modifiez vos critères de recherche ou réinitialisez le filtre de spécialité.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {directoryDoctors.map((doc) => {
                    const initials = doc.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs transition space-y-3 flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3">
                          {doc.avatarUrl ? (
                            <div className="w-11 h-11 rounded-full bg-slate-200 border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                              <img src={doc.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {initials}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                              <span>{doc.name}</span>
                              <span className="material-symbols-outlined text-[14px] text-sky-600">
                                verified
                              </span>
                            </p>
                            <p className="text-[11px] font-semibold text-sky-700 truncate">
                              {doc.specialty || "Médecine Générale"}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {doc.clinicCity} • {doc.clinicName}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Messagerie active
                          </span>

                          <button
                            type="button"
                            onClick={() => handleStartConversation(doc)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-xs">chat</span>
                            <span>Contacter</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

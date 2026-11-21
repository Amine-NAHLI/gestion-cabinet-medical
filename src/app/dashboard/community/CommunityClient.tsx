"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import {
  createCommunityPost,
  getCommunityDirectMessages,
  sendCommunityDirectMessage,
  toggleCommunityMembership,
} from "@/actions/community";

interface Confrere {
  id: number;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  clinicName: string;
  clinicCity: string;
}

interface Post {
  id: number;
  clinicId: number;
  authorDoctorId: number;
  authorName: string;
  authorSpecialty: string;
  authorCity: string;
  authorAvatarUrl: string | null;
  category: string;
  title: string;
  content: string;
  likesCount: number;
  createdAt: string;
  isMyPost: boolean;
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

interface CommunityClientProps {
  initialData: {
    isDoctor: boolean;
    isMember: boolean;
    posts?: Post[];
    confreres?: Confrere[];
    currentDoctorId?: number;
  };
}

const CATEGORIES = [
  { id: "all", label: "Toutes les publications", icon: "dashboard" },
  { id: "cas_clinique", label: "Cas Cliniques & Avis", icon: "stethoscope" },
  { id: "remplacement", label: "Remplacements & Gardes", icon: "calendar_month" },
  { id: "orientation", label: "Orientation Spécialiste", icon: "person_search" },
  { id: "materiel", label: "Matériel & Annonces", icon: "medical_services" },
];

export default function CommunityClient({ initialData }: CommunityClientProps) {
  const [isMember, setIsMember] = useState(initialData.isMember);
  const [activeTab, setActiveTab] = useState<"feed" | "chat">("feed");
  const [posts, setPosts] = useState<Post[]>(initialData.posts || []);
  const [confreres, setConfreres] = useState<Confrere[]>(initialData.confreres || []);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [postSearch, setPostSearch] = useState("");

  // Modal Nouvelle publication
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postCategory, setPostCategory] = useState("cas_clinique");
  const [isSubmittingPost, startSubmitPost] = useTransition();

  // Chat direct confrères
  const [selectedConfrere, setSelectedConfrere] = useState<Confrere | null>(null);
  const [confrereSearch, setConfrereSearch] = useState("");
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [directInputText, setDirectInputText] = useState("");
  const [isSendingDirect, setIsSendingDirect] = useState(false);

  const [isTogglingMembership, startToggleMembership] = useTransition();
  const directMessagesEndRef = useRef<HTMLDivElement>(null);

  // Rejoindre la communauté
  const handleJoinCommunity = () => {
    startToggleMembership(async () => {
      const res = await toggleCommunityMembership(true);
      if (res.success) {
        setIsMember(true);
        window.location.reload();
      }
    });
  };

  // Ouvrir la modale avec une catégorie pré-sélectionnée
  const handleOpenCreateWithCategory = (catId: string) => {
    setPostCategory(catId === "all" ? "cas_clinique" : catId);
    setIsCreateModalOpen(true);
  };

  // Créer une publication
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;

    startSubmitPost(async () => {
      const res = await createCommunityPost({
        title: postTitle,
        content: postContent,
        category: postCategory,
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setPostTitle("");
        setPostContent("");
        window.location.reload();
      }
    });
  };

  // Récupérer les messages directs avec le confrère sélectionné
  const fetchDirectMessages = useCallback(async () => {
    if (!selectedConfrere) return;
    try {
      const msgs = await getCommunityDirectMessages(selectedConfrere.id);
      setDirectMessages(msgs);
    } catch {
      // ignore
    }
  }, [selectedConfrere]);

  useEffect(() => {
    if (selectedConfrere) {
      fetchDirectMessages();
      const interval = setInterval(fetchDirectMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConfrere, fetchDirectMessages]);

  useEffect(() => {
    if (activeTab === "chat" && selectedConfrere) {
      directMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [directMessages, activeTab, selectedConfrere]);

  // Envoyer un message direct au confrère
  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfrere || !directInputText.trim() || isSendingDirect) return;

    const text = directInputText.trim();
    setIsSendingDirect(true);
    setDirectInputText("");

    try {
      const res = await sendCommunityDirectMessage(selectedConfrere.id, text);
      if (res.success && res.message) {
        setDirectMessages((prev) => [...prev, res.message]);
      }
    } finally {
      setIsSendingDirect(false);
    }
  };

  // Démarrer une conversation depuis un post
  const handleStartChatWithAuthor = (post: Post) => {
    const existing = confreres.find((c) => c.id === post.authorDoctorId);
    if (existing) {
      setSelectedConfrere(existing);
      setActiveTab("chat");
    } else {
      setSelectedConfrere({
        id: post.authorDoctorId,
        name: post.authorName,
        avatarUrl: post.authorAvatarUrl,
        bio: post.authorSpecialty,
        clinicName: "Cabinet Médical",
        clinicCity: post.authorCity,
      });
      setActiveTab("chat");
    }
  };

  // Filtre des publications (catégorie + recherche textuelle)
  const filteredPosts = posts.filter((p) => {
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    if (!matchesCategory) return false;
    if (!postSearch.trim()) return true;

    const q = postSearch.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q) ||
      p.authorCity.toLowerCase().includes(q) ||
      p.authorSpecialty.toLowerCase().includes(q)
    );
  });

  // Filtre des confrères
  const filteredConfreres = confreres.filter((c) => {
    const q = confrereSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.clinicCity.toLowerCase().includes(q) ||
      c.clinicName.toLowerCase().includes(q)
    );
  });

  // Compteur de posts par catégorie
  const getCategoryCount = (catId: string) => {
    if (catId === "all") return posts.length;
    return posts.filter((p) => p.category === catId).length;
  };

  // ============================================================
  // ÉCRAN 1 : OPT-IN SI LE MÉDECIN N'A PAS ENCORE REJOINT LE RÉSEAU
  // ============================================================
  if (!isMember) {
    return (
      <div className="max-w-2xl mx-auto py-8 sm:py-14 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center mx-auto shadow-2xs">
          <span className="material-symbols-outlined text-3xl">hub</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Communauté Médicale Confraternelle
          </h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Rejoignez le réseau fermé et sécurisé des médecins certifiés. Échangez des avis sur des cas cliniques, trouvez des remplaçants et discutez en direct entre confrères.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-xl mx-auto pt-2">
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <span className="material-symbols-outlined text-xl text-sky-600">forum</span>
            <p className="text-xs font-bold text-slate-900">Fil Confraternel</p>
            <p className="text-[11px] text-slate-500 leading-snug">
              Publiez des cas complexes et demandez l&apos;avis de spécialistes.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <span className="material-symbols-outlined text-xl text-emerald-600">chat</span>
            <p className="text-xs font-bold text-slate-900">Chat WhatsApp Style</p>
            <p className="text-[11px] text-slate-500 leading-snug">
              Messagerie privée 1-à-1 réservée aux praticiens certifiés.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <span className="material-symbols-outlined text-xl text-purple-600">verified_user</span>
            <p className="text-xs font-bold text-slate-900">Secret Préservé</p>
            <p className="text-[11px] text-slate-500 leading-snug">
              Strictement confidentiel et isolé de la gestion courante.
            </p>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="button"
            disabled={isTogglingMembership}
            onClick={handleJoinCommunity}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>
              {isTogglingMembership ? "Activation du réseau..." : "Rejoindre la Communauté Médicale"}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // ÉCRAN 2 : ESPACE COMMUNAUTÉ COMPLET (FIL CONFRATERNEL + CHAT DIRECT)
  // ============================================================
  return (
    <div className="space-y-6">
      {/* 1. EN-TÊTE PRINCIPAL : TITRE & ONGLET PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Réseau Confraternel
            </h1>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Espace Médecins Certifié
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Échangez entre confrères praticiens : cas cliniques, remplacements, orientations et messagerie privée.
          </p>
        </div>

        {/* Sélecteur Onglet Moderne */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === "feed"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">forum</span>
            <span>Fil & Publications</span>
            {posts.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold">
                {posts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === "chat"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">chat</span>
            <span>Messagerie Directe</span>
            {confreres.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-50 text-sky-700 font-bold border border-sky-100">
                {confreres.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================
          ONGLET 1 : FIL CONFRATERNEL (BLOG / FEED MÉDICAL)
         ============================================================ */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          {/* BARRE D'ACTION 1 : RECHERCHE RAPIDE + BOUTON NOUVELLE PUBLICATION */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Champ de recherche instantané */}
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined text-slate-400 text-lg absolute left-3 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                type="text"
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                placeholder="Rechercher par titre, confrère, ville, symptôme..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 bg-white shadow-2xs focus:outline-none focus:border-slate-900 transition"
              />
              {postSearch && (
                <button
                  type="button"
                  onClick={() => setPostSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            {/* Bouton Nouvelle Publication bien en vue */}
            <button
              type="button"
              onClick={() => handleOpenCreateWithCategory(selectedCategory)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              <span>+ Nouvelle publication</span>
            </button>
          </div>

          {/* BARRE D'ACTION 2 : CATÉGORIES 100% VISIBLES (FLEX-WRAP, AUCUN SCROLL CACHÉ) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count = getCategoryCount(cat.id);

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs font-semibold ring-2 ring-slate-900/10"
                      : "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/90 shadow-2xs"
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px] leading-none">
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                      isActive
                        ? "bg-slate-800 text-slate-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ============================================================
              ÉTAT VIDE AMÉLIORÉ : AVEC CTA ET SUGGESTIONS CLINIQUES
             ============================================================ */}
          {filteredPosts.length === 0 ? (
            <div className="space-y-4 pt-2">
              {/* Carte centrale vide */}
              <div className="p-8 sm:p-12 text-center rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center mx-auto shadow-2xs">
                  <span className="material-symbols-outlined text-3xl">medical_services</span>
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-slate-900">
                    {postSearch
                      ? `Aucune publication correspondant à "${postSearch}"`
                      : selectedCategory === "all"
                      ? "Le fil confraternel est calme pour le moment"
                      : "Aucune publication dans cette rubrique"}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {postSearch
                      ? "Essayez d'autres mots-clés ou réinitialisez la recherche."
                      : "Partagez un cas clinique atypique, proposez un remplacement ou sollicitez un spécialiste certifié."}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  {postSearch && (
                    <button
                      type="button"
                      onClick={() => setPostSearch("")}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Effacer la recherche
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenCreateWithCategory(selectedCategory)}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    <span>Rédiger une publication</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================
               LISTE DES PUBLICATIONS : CARTES MÉDICALES PROPRES
               ============================================================ */
            <div className="grid grid-cols-1 gap-4 pt-1">
              {filteredPosts.map((post) => {
                const dateStr = new Date(post.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const catBadge =
                  post.category === "cas_clinique"
                    ? {
                        label: "Cas Clinique & Avis",
                        icon: "stethoscope",
                        cls: "bg-rose-50 text-rose-700 border-rose-200",
                      }
                    : post.category === "remplacement"
                    ? {
                        label: "Remplacement / Garde",
                        icon: "calendar_month",
                        cls: "bg-amber-50 text-amber-700 border-amber-200",
                      }
                    : post.category === "orientation"
                    ? {
                        label: "Orientation Spécialiste",
                        icon: "person_search",
                        cls: "bg-sky-50 text-sky-700 border-sky-200",
                      }
                    : {
                        label: "Annonce Confraternelle",
                        icon: "medical_services",
                        cls: "bg-slate-100 text-slate-700 border-slate-200",
                      };

                const authorInitials = post.authorName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <article
                    key={post.id}
                    className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4 hover:border-slate-300 hover:shadow-xs transition"
                  >
                    {/* Ligne 1 : Médecin + Catégorie */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {post.authorAvatarUrl ? (
                          <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                            <img
                              src={post.authorAvatarUrl}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {authorInitials || "DR"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{post.authorName}</span>
                            <span
                              className="material-symbols-outlined text-[15px] text-sky-600"
                              title="Médecin certifié par l'Ordre"
                            >
                              verified
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {post.authorSpecialty} • {post.authorCity}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 shrink-0 text-right sm:text-left">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 self-end sm:self-auto ${catBadge.cls}`}
                        >
                          <span className="material-symbols-outlined text-[13px] leading-none">
                            {catBadge.icon}
                          </span>
                          <span>{catBadge.label}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">{dateStr}</span>
                      </div>
                    </div>

                    {/* Ligne 2 : Titre & Contenu */}
                    <div className="space-y-2">
                      <h2 className="text-base font-bold text-slate-900 leading-snug">
                        {post.title}
                      </h2>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        {post.content}
                      </p>
                    </div>

                    {/* Ligne 3 : Pied de carte & Action de contact */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">
                          shield_person
                        </span>
                        <span>
                          {post.isMyPost
                            ? "Votre publication active sur le réseau"
                            : "Secret médical préservé • Médecin certifié"}
                        </span>
                      </span>

                      {!post.isMyPost && (
                        <button
                          type="button"
                          onClick={() => handleStartChatWithAuthor(post)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer shadow-2xs self-start sm:self-auto"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            chat
                          </span>
                          <span>Échanger en privé avec ce confrère</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          ONGLET 2 : MESSAGERIE CONFRATERNELLE (CHAT 1-À-1 WHATSAPP STYLE)
         ============================================================ */}
      {activeTab === "chat" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[580px]">
          {/* Colonne de gauche : Liste des confrères (masquée sur mobile si conversation ouverte) */}
          <aside
            className={`border-r border-slate-200/90 flex flex-col bg-slate-50/50 ${
              selectedConfrere ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-3.5 border-b border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900">Confrères du Réseau</p>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {confreres.length} médecins
                </span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined text-base text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                  search
                </span>
                <input
                  type="text"
                  value={confrereSearch}
                  onChange={(e) => setConfrereSearch(e.target.value)}
                  placeholder="Rechercher par nom, ville, cabinet..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50/60 focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

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

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedConfrere(c)}
                      className={`w-full p-3.5 text-left transition flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-white shadow-2xs border-l-4 border-l-slate-900"
                          : "hover:bg-slate-100/60"
                      }`}
                    >
                      {c.avatarUrl ? (
                        <div className="w-9 h-9 rounded-full bg-slate-200 border border-white overflow-hidden shrink-0">
                          <img src={c.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                          <span>{c.name}</span>
                          <span className="material-symbols-outlined text-[13px] text-sky-600">
                            verified
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {c.clinicCity} • {c.clinicName}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Colonne de droite : Conversation privée active */}
          <main
            className={`md:col-span-2 flex flex-col bg-white ${
              !selectedConfrere ? "hidden md:flex" : "flex"
            }`}
          >
            {selectedConfrere ? (
              <>
                {/* En-tête conversation avec bouton retour sur mobile */}
                <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedConfrere(null)}
                      className="md:hidden w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 cursor-pointer"
                      title="Retour à la liste"
                    >
                      <span className="material-symbols-outlined text-base">arrow_back</span>
                    </button>

                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                      {selectedConfrere.avatarUrl ? (
                        <img
                          src={selectedConfrere.avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
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
                        <span className="material-symbols-outlined text-[13px] text-sky-600">
                          verified
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {selectedConfrere.clinicCity} • Discussion privée confraternelle
                      </p>
                    </div>
                  </div>
                </header>

                {/* Fil des messages directs */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FCFDFD]">
                  {directMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">
                        lock
                      </span>
                      <p className="text-xs font-bold text-slate-700">Début de la conversation</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                        Envoyez un message pour échanger directement avec le Dr. {selectedConfrere.name}.
                      </p>
                    </div>
                  ) : (
                    directMessages.map((msg) => {
                      const time = new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}
                        >
                          <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                            {msg.isMe ? "Vous" : selectedConfrere.name} • {time}
                          </span>
                          <div
                            className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-2xs break-words ${
                              msg.isMe
                                ? "bg-slate-900 text-white rounded-br-xs"
                                : "bg-slate-100 text-slate-900 rounded-bl-xs"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={directMessagesEndRef} />
                </div>

                {/* Saisie message direct */}
                <footer className="p-3 border-t border-slate-200 bg-white shrink-0">
                  <form onSubmit={handleSendDirectMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={directInputText}
                      onChange={(e) => setDirectInputText(e.target.value)}
                      placeholder={`Écrire au Dr. ${selectedConfrere.name}...`}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 bg-slate-50/50"
                    />
                    <button
                      type="submit"
                      disabled={!directInputText.trim() || isSendingDirect}
                      className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40 shadow-xs shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </button>
                  </form>
                </footer>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">forum</span>
                <p className="text-xs font-bold text-slate-700">Sélectionnez un confrère</p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                  Cliquez sur un médecin dans la liste de gauche ou depuis le fil d&apos;actualité pour démarrer une discussion.
                </p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ============================================================
          MODALE : CRÉER UNE NOUVELLE PUBLICATION CONFRATERNELLE
         ============================================================ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-slate-600">edit_note</span>
                <span>Nouvelle Publication Confraternelle</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Avertissement Déontologie */}
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">
                shield
              </span>
              <span>
                <strong>Secret médical :</strong> Veillez à préserver l&apos;anonymat strict de vos patients (aucun nom, date exacte ou information permettant d&apos;identifier la personne).
              </span>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rubrique
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "cas_clinique", label: "Cas Clinique", icon: "stethoscope" },
                    { id: "remplacement", label: "Remplacement", icon: "calendar_month" },
                    { id: "orientation", label: "Orientation", icon: "person_search" },
                    { id: "materiel", label: "Matériel", icon: "medical_services" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPostCategory(cat.id)}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        postCategory === cat.id
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-bold"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base leading-none">
                        {cat.icon}
                      </span>
                      <span className="text-[11px]">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Titre du sujet
                </label>
                <input
                  type="text"
                  required
                  maxLength={140}
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Ex: Avis sur ECG suspect patient 45 ans / Remplacement mois d'août..."
                  className="w-full px-3.5 py-2 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contenu détaillé
                </label>
                <textarea
                  required
                  rows={5}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Décrivez votre cas, question ou proposition confraternelle (sans données nominatives)..."
                  className="w-full px-3.5 py-2.5 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPost || !postTitle.trim() || !postContent.trim()}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPost ? "Publication..." : "Publier sur le fil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

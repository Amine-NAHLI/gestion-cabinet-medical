"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
    } finally {
      if (typeof window !== "undefined" && window.location.hostname.endsWith("toncabinet.me")) {
        window.location.href = "https://toncabinet.me/login";
      } else {
        window.location.href = "/login";
      }
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors font-medium text-sm cursor-pointer"
    >
      <span className="material-symbols-outlined text-lg">logout</span>
      <span>Déconnexion</span>
    </button>
  );
}

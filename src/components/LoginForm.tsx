"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Email ou mot de passe incorrect");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {error && (
        <div style={{ color: '#d32f2f', padding: '0.75rem', backgroundColor: '#ffebee', borderRadius: '4px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <label htmlFor="email" style={{ marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
        <input 
          id="email"
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
          placeholder="votre@email.com"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <label htmlFor="password" style={{ marginBottom: '0.5rem', fontWeight: 500 }}>Mot de passe</label>
        <input 
          id="password"
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
          placeholder="••••••••"
        />
      </div>

      <button type="submit" style={{ padding: '0.85rem', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem', fontSize: '1rem', fontWeight: 600 }}>
        Se connecter
      </button>
    </form>
  );
}

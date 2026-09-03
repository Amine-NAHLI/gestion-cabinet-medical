"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [role, setRole] = useState<'doctor' | 'assistant'>('doctor');
  const [email, setEmail] = useState("medecin@cabinet.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const router = useRouter();

  const handleRoleSelect = (selectedRole: 'doctor' | 'assistant') => {
    setRole(selectedRole);
    if (selectedRole === 'doctor') {
      setEmail("medecin@cabinet.com");
    } else {
      setEmail("assistante@cabinet.com");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Email ou mot de passe incorrect");
      setIsLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div>
      {/* Role Selection */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">Sign in as</label>
        <div className="grid grid-cols-2 gap-3.5">
          {/* Doctor Button */}
          <button 
            type="button"
            onClick={() => handleRoleSelect('doctor')}
            className={`relative text-left p-4 rounded-2xl transition-all duration-150 cursor-pointer focus:outline-none ${
              role === 'doctor' 
                ? 'border-2 border-sky-600 bg-sky-50/60' 
                : 'border border-slate-200 bg-white hover:bg-slate-50/70'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                role === 'doctor' ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}>
                <span className="material-symbols-outlined text-xl">stethoscope</span>
              </div>
              <span className={`items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-600 text-white ${
                role === 'doctor' ? 'flex' : 'hidden'
              }`}>
                <span className="material-symbols-outlined text-xs">check</span>
                Selected
              </span>
            </div>
            <div className="mt-3">
              <p className="font-headline-sm text-sm font-bold text-slate-900">Doctor</p>
              <p className="text-xs text-slate-600 mt-1 leading-snug">Access patients, appointments and medical records.</p>
            </div>
          </button>

          {/* Assistant Button */}
          <button 
            type="button"
            onClick={() => handleRoleSelect('assistant')}
            className={`relative text-left p-4 rounded-2xl transition-all duration-150 cursor-pointer focus:outline-none ${
              role === 'assistant' 
                ? 'border-2 border-sky-600 bg-sky-50/60' 
                : 'border border-slate-200 bg-white hover:bg-slate-50/70'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                role === 'assistant' ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}>
                <span className="material-symbols-outlined text-xl">assignment_ind</span>
              </div>
              <span className={`items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-600 text-white ${
                role === 'assistant' ? 'flex' : 'hidden'
              }`}>
                <span className="material-symbols-outlined text-xs">check</span>
                Selected
              </span>
            </div>
            <div className="mt-3">
              <p className="font-headline-sm text-sm font-bold text-slate-900">Assistant</p>
              <p className="text-xs text-slate-600 mt-1 leading-snug">Manage appointments, patients and clinic administration.</p>
            </div>
          </button>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium border-l-4 border-red-500">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="email-field">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-lg">mail</span>
            </div>
            <input 
              id="email-field"
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address" 
              required 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="password-field">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-lg">lock</span>
            </div>
            <input 
              id="password-field"
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password" 
              required 
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
            />
            <button 
              type="button"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">
                {isPasswordVisible ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500" defaultChecked />
            <span className="text-xs text-slate-600">Remember me on this device</span>
          </label>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-xs font-medium text-sky-600 hover:text-sky-700 transition">Forgot password?</a>
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white text-sm font-semibold shadow-sm transition duration-150 cursor-pointer disabled:opacity-70"
          >
            <span>{isLoading ? 'Authenticating...' : `Sign In as ${role === 'doctor' ? 'Doctor' : 'Assistant'}`}</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </form>
    </div>
  );
}

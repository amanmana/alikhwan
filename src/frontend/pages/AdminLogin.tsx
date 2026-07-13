import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Lock, ShieldAlert, Zap } from "lucide-react";
import Header from "../components/Header.tsx";

const ADMIN_KEYWORD = "kariah2026";

interface AdminLoginProps {
  onAdminAuthSuccess: () => void;
}

export default function AdminLogin({ onAdminAuthSuccess }: AdminLoginProps) {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (keyword.trim() === ADMIN_KEYWORD) {
      localStorage.setItem("alikhwan_admin_auth", "true");
      onAdminAuthSuccess();
      navigate("/admin");
    } else {
      setError("Kata kunci pentadbir tidak sah. Sila cuba lagi.");
      setKeyword("");
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-6">
      <Header isAdmin />

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          {/* Navigation */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 text-brand-muted hover:text-brand-primary rounded-lg"
              aria-label="Kembali ke Utama"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-lg font-bold text-brand-primary">
              Akses Pentadbir
            </h2>
          </div>

          <div className="bg-brand-surface border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            {/* Icon + Title */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded-2xl">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-brand-text">
                Surau Al-Ikhwan
              </h3>
              <p className="text-xs text-brand-muted">
                Masukkan kata kunci pentadbir untuk mengakses panel kawalan.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-keyword"
                  className="block text-xs font-bold text-brand-muted uppercase tracking-wider"
                >
                  Kata Kunci Pentadbir
                </label>
                <input
                  id="admin-keyword"
                  type="password"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Masukkan kata kunci..."
                  autoFocus
                  required
                  className="w-full px-4 py-3 bg-brand-background border border-gray-300 rounded-xl text-center font-mono tracking-widest text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary placeholder:tracking-normal placeholder:font-sans placeholder:text-gray-400"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-brand-danger text-xs bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                  <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-brand-primary hover:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Zap className="w-4 h-4 fill-current" />
                Masuk Sebagai Pentadbir
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, LogIn, Info } from "lucide-react";
import Header from "../components/Header.tsx";
import Turnstile from "../components/Turnstile.tsx";

interface LoginProps {
  onAuthSuccess: (member: any) => void;
}

export default function Login({ onAuthSuccess }: LoginProps) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [failedCount, setFailedCount] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Sila masukkan nama pengguna dan kata laluan anda.");
      return;
    }

    // Require turnstile only after 2 failed attempts
    if (failedCount >= 2 && !turnstileToken) {
      setError("Sila lengkapkan pengesahan Turnstile keselamatan.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
          turnstileToken:
            failedCount >= 2 ? turnstileToken : "mock-turnstile-token",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Increment failed count on bad login
        setFailedCount((prev) => prev + 1);
        throw new Error(
          data.error || "Nama pengguna atau kata laluan tidak sah.",
        );
      }

      // Successful auth
      onAuthSuccess({
        id: data.member.id,
        fullName: data.member.fullName,
        membershipStatus: data.member.membershipStatus,
      });

      navigate("/profil");
    } catch (err: any) {
      setError(err.message || "Log masuk gagal. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-6">
      <Header />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-4">
        {/* Navigation */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/"
            className="p-2 text-brand-muted hover:text-brand-primary rounded-lg"
            aria-label="Kembali ke Utama"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-lg font-bold text-brand-primary">
            Log Masuk Ahli
          </h2>
        </div>

        <div className="bg-brand-surface border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-brand-primary border-b border-gray-100 pb-3">
            <LogIn className="w-5 h-5" />
            <h3 className="font-bold text-sm">Masuk ke Profil Kariah</h3>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-brand-danger text-xs font-medium p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="login-username"
                className="block text-xs font-bold text-brand-text"
              >
                Nama Pengguna (Username)
              </label>
              <input
                id="login-username"
                type="text"
                placeholder="Masukkan nama pengguna"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="login-pwd"
                  className="block text-xs font-bold text-brand-text"
                >
                  Kata Laluan
                </label>
                <Link
                  to="/lupa-kata-laluan"
                  className="text-xs font-semibold text-brand-primary hover:underline"
                >
                  Lupa kata laluan?
                </Link>
              </div>
              <input
                id="login-pwd"
                type="password"
                placeholder="Masukkan kata laluan"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            {/* Turnstile (Appears dynamically only after repeated failures) */}
            {failedCount >= 2 && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <p className="text-[10px] text-brand-danger text-center font-medium">
                  Cubaan gagal berulang. Sila selesaikan cabaran di bawah:
                </p>
                <Turnstile onVerify={setTurnstileToken} />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-primary hover:bg-teal-800 text-white font-bold text-sm rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
            >
              {loading ? "Log Masuk..." : "Log Masuk"}
            </button>
          </form>

          <div className="border-t border-gray-100 pt-3 space-y-2 text-center text-xs text-brand-muted">
            <p>
              Belum berdaftar?{" "}
              <Link
                to="/daftar"
                className="text-brand-primary font-semibold underline"
              >
                Daftar Keahlian Baru
              </Link>
            </p>
            <p>
              Mempunyai rekod kariah lama?{" "}
              <Link
                to="/semak-keahlian"
                className="text-brand-primary font-semibold underline"
              >
                Semak & Tuntut Akaun
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-start gap-2.5 text-brand-primary">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-xs">
            Lupa kata laluan? Anda boleh menetapkannya semula sendiri
            menggunakan No. IC dan nombor telefon yang didaftarkan.
          </p>
        </div>
      </main>
    </div>
  );
}

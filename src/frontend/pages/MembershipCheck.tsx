import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import Header from "../components/Header.tsx";
import Turnstile from "../components/Turnstile.tsx";

export default function MembershipCheck() {
  const [ic, setIc] = useState("");
  const [phone, setPhone] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    checked: boolean;
    matched: boolean;
    message: string;
  } | null>(null);

  const navigate = useNavigate();

  const handleIcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format input as YYMMDD-SS-NNNN
    const cleaned = e.target.value.replace(/[^\d]/g, "").substring(0, 12);
    if (cleaned.length > 8) {
      setIc(
        `${cleaned.substring(0, 6)}-${cleaned.substring(6, 8)}-${cleaned.substring(8)}`,
      );
    } else if (cleaned.length > 6) {
      setIc(`${cleaned.substring(0, 6)}-${cleaned.substring(6)}`);
    } else {
      setIc(cleaned);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const rawIc = ic.replace(/[\s-]/g, "");
    if (rawIc.length !== 12) {
      setError("No. IC mestilah mengandungi 12 digit angka.");
      return;
    }

    if (!phone.trim()) {
      setError("No. telefon diperlukan.");
      return;
    }

    if (!turnstileToken) {
      setError("Sila lengkapkan pengesahan keselamatan Turnstile.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/public/membership-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ic: rawIc,
          phone: phone.trim(),
          turnstileToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ralat semasa menyemak keahlian.");
      }

      setResult({
        checked: true,
        matched: data.matched,
        message: data.message,
      });
    } catch (err: any) {
      setError(err.message || "Sambungan terputus. Sila cuba lagi.");
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
            className="p-2 text-brand-muted hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-brand-accent rounded-lg"
            aria-label="Kembali ke Laman Utama"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-lg font-bold text-brand-primary">
            Semak Keahlian Kariah
          </h2>
        </div>

        <div className="bg-brand-surface border border-gray-200 rounded-xl p-5 shadow-sm space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-xs text-brand-muted">
              Masukkan No. IC dan No. telefon anda untuk menyemak sama ada
              maklumat anda telah diimport daripada sistem lama.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-brand-danger text-xs font-medium p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-6 text-center">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-3">
                <CheckCircle2 className="w-8 h-8 text-brand-primary mx-auto" />
                <p className="text-xs font-semibold text-brand-primary">
                  Semakan Selesai
                </p>
                <p className="text-xs text-brand-muted leading-relaxed">
                  {result.message}
                </p>
              </div>

              {result.matched ? (
                <button
                  onClick={() =>
                    navigate("/tuntut-akaun", { state: { ic, phone } })
                  }
                  className="w-full py-3 bg-brand-primary hover:bg-teal-800 text-white font-bold text-sm rounded-lg shadow-md transition-all focus:ring-4 focus:ring-teal-200 min-h-[44px]"
                >
                  Teruskan ke Tuntutan Akaun
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-brand-muted">
                    Jika anda pasti maklumat anda betul tetapi tidak ditemui,
                    anda boleh memohon pendaftaran baru:
                  </p>
                  <Link
                    to="/daftar"
                    className="block w-full py-3 bg-brand-accent hover:bg-amber-600 text-brand-text font-bold text-sm rounded-lg shadow-md text-center transition-all focus:ring-4 focus:ring-amber-200 min-h-[44px] flex items-center justify-center"
                  >
                    Daftar Keahlian Baru
                  </Link>
                </div>
              )}

              <button
                onClick={() => setResult(null)}
                className="text-xs text-brand-primary font-medium hover:underline block mx-auto"
              >
                Semak Nombor Lain
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="ic-input"
                  className="block text-xs font-bold text-brand-text"
                >
                  Nombor IC (12 Digit)
                </label>
                <input
                  id="ic-input"
                  type="text"
                  placeholder="Contoh: 801215-01-4321"
                  value={ic}
                  onChange={handleIcChange}
                  required
                  className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="phone-input"
                  className="block text-xs font-bold text-brand-text"
                >
                  Nombor Telefon Bimbit
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  placeholder="Contoh: 012-3456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              {/* Turnstile Integration */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-brand-text text-center">
                  Pengesahan Keselamatan
                </label>
                <Turnstile onVerify={setTurnstileToken} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-primary hover:bg-teal-800 text-white font-bold text-sm rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-teal-200 min-h-[44px]"
              >
                {loading ? "Menyemak..." : "Hantar Semakan"}
              </button>
            </form>
          )}
        </div>

        {/* Info panel */}
        <div className="mt-4 bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-center gap-3 text-brand-primary">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs">
            Keselamatan Terjamin: Semakan keahlian adalah sulit dan dilindungi
            daripada cubaan mengumpul maklumat secara tidak sah.
          </p>
        </div>
      </main>
    </div>
  );
}

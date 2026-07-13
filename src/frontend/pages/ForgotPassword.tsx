import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import Header from "../components/Header.tsx";
import Turnstile from "../components/Turnstile.tsx";
import { formatPhoneInput } from "../../shared/validation.ts";

const formatIcInput = (value: string) => {
  const digits = value.replace(/\D/g, "").substring(0, 12);
  if (digits.length <= 6) return digits;
  if (digits.length <= 8) {
    return `${digits.substring(0, 6)}-${digits.substring(6)}`;
  }
  return `${digits.substring(0, 6)}-${digits.substring(6, 8)}-${digits.substring(8)}`;
};

export default function ForgotPassword() {
  const [ic, setIc] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (ic.replace(/\D/g, "").length !== 12) {
      setError("Sila masukkan No. IC lengkap 12 digit.");
      return;
    }
    if (!phone.trim()) {
      setError("Sila masukkan nombor telefon yang didaftarkan.");
      return;
    }
    if (newPassword.length < 10) {
      setError("Kata laluan mestilah sekurang-kurangnya 10 aksara.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Kata laluan baharu dan pengesahan tidak sepadan.");
      return;
    }
    if (!turnstileToken) {
      setError("Sila lengkapkan pengesahan keselamatan.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ic,
          phone,
          newPassword,
          confirmNewPassword,
          turnstileToken,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menetapkan semula kata laluan.");
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Gagal menetapkan semula kata laluan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-6">
      <Header />

      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4">
        <div className="mb-6 flex items-center gap-3">
          <Link
            to="/log-masuk"
            className="rounded-lg p-2 text-brand-muted hover:text-brand-primary"
            aria-label="Kembali ke Log Masuk"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="text-lg font-bold text-brand-primary">
            Tetapkan Semula Kata Laluan
          </h2>
        </div>

        <section className="space-y-4 rounded-xl border border-gray-200 bg-brand-surface p-5 shadow-sm">
          {success ? (
            <div className="space-y-5 py-3 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-brand-success" />
              <div className="space-y-1.5">
                <h3 className="font-bold text-brand-text">
                  Kata Laluan Berjaya Ditukar
                </h3>
                <p className="text-xs leading-relaxed text-brand-muted">
                  Semua sesi lama telah ditamatkan. Sila log masuk menggunakan
                  kata laluan baharu anda.
                </p>
              </div>
              <Link
                to="/log-masuk"
                className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand-primary px-4 py-3 text-sm font-bold text-white hover:bg-teal-800"
              >
                Kembali ke Log Masuk
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-brand-primary">
                <KeyRound className="h-5 w-5" />
                <h3 className="font-bold text-sm">Sahkan Maklumat Anda</h3>
              </div>

              <p className="text-xs leading-relaxed text-brand-muted">
                Masukkan No. IC dan nombor telefon yang sama seperti dalam
                profil anda.
              </p>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-brand-danger">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label
                    htmlFor="reset-ic"
                    className="block text-xs font-bold text-brand-text"
                  >
                    No. IC (12 Digit)
                  </label>
                  <input
                    id="reset-ic"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="YYMMDD-PP-NNNN"
                    value={ic}
                    onChange={(event) =>
                      setIc(formatIcInput(event.target.value))
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 bg-brand-background px-3 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="reset-phone"
                    className="block text-xs font-bold text-brand-text"
                  >
                    Nombor Telefon
                  </label>
                  <input
                    id="reset-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01X-XXX XXXX"
                    value={phone}
                    onChange={(event) =>
                      setPhone(formatPhoneInput(event.target.value))
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 bg-brand-background px-3 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                  <p className="text-[10px] text-brand-muted">
                    Format akan disusun secara automatik, contohnya 01X-XXX
                    XXXX.
                  </p>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="reset-new-password"
                    className="block text-xs font-bold text-brand-text"
                  >
                    Kata Laluan Baharu
                  </label>
                  <div className="relative">
                    <input
                      id="reset-new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Sekurang-kurangnya 10 aksara"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-300 bg-brand-background px-3 py-3 pr-11 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={
                        showPassword
                          ? "Sembunyikan kata laluan"
                          : "Paparkan kata laluan"
                      }
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-brand-muted"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-bold text-brand-text"
                  >
                    Sahkan Kata Laluan Baharu
                  </label>
                  <input
                    id="reset-confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Masukkan semula kata laluan"
                    value={confirmNewPassword}
                    onChange={(event) =>
                      setConfirmNewPassword(event.target.value)
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 bg-brand-background px-3 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                <div className="border-t border-gray-100 pt-2">
                  <p className="text-center text-[10px] font-semibold text-brand-muted">
                    Pengesahan Keselamatan
                  </p>
                  <Turnstile onVerify={setTurnstileToken} />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand-primary px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Sedang Menyimpan..."
                    : "Tetapkan Kata Laluan Baharu"}
                </button>
              </form>
            </>
          )}
        </section>

        {!success && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-teal-100 bg-teal-50 p-4 text-brand-primary">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="text-xs">
              Maklumat ini hanya digunakan untuk memadankan akaun anda dan tidak
              dipaparkan kepada pengguna lain.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

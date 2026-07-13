import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  UserPlus,
  Info,
  CheckCircle2,
  AlertTriangle,
  LogIn,
} from "lucide-react";
import Header from "../components/Header.tsx";
import Turnstile from "../components/Turnstile.tsx";

export default function Registration({
  onAuthSuccess,
}: {
  onAuthSuccess: (member: any) => void;
}) {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [ic, setIc] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [directoryConsent, setDirectoryConsent] = useState(false); // MUST be unchecked by default!
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [checkingLegacy, setCheckingLegacy] = useState(false);
  const [possibleLegacyMatches, setPossibleLegacyMatches] = useState<any[]>([]);
  const [confirmedNotLegacy, setConfirmedNotLegacy] = useState(false);

  const handleIcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const validateStep1 = () => {
    setError(null);
    if (fullName.trim().length < 3) {
      setError("Nama penuh mestilah sekurang-kurangnya 3 aksara.");
      return false;
    }
    const rawIc = ic.replace(/[\s-]/g, "");
    if (rawIc.length !== 12) {
      setError("Nombor IC mestilah mengandungi 12 digit angka.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setError(null);
    if (!phone.trim()) {
      setError("Nombor telefon bimbit diperlukan.");
      return false;
    }
    if (address.trim().length < 10) {
      setError("Alamat lengkap mestilah sekurang-kurangnya 10 aksara.");
      return false;
    }
    return true;
  };

  const handleStep1Next = async () => {
    if (!validateStep1()) return;

    if (confirmedNotLegacy) {
      setStep(2);
      return;
    }

    setCheckingLegacy(true);
    setPossibleLegacyMatches([]);
    try {
      const res = await fetch(
        `/api/public/legacy-search?q=${encodeURIComponent(fullName.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Semakan rekod lama gagal.");
      }

      const matches = data.members || [];
      if (matches.length > 0) {
        setPossibleLegacyMatches(matches);
        return;
      }

      setStep(2);
    } catch (err: any) {
      setError(err.message || "Semakan rekod lama gagal. Sila cuba lagi.");
    } finally {
      setCheckingLegacy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Kata laluan mestilah sekurang-kurangnya 10 aksara.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Kata laluan dan pengesahan kata laluan tidak sepadan.");
      return;
    }

    if (!privacyConsent) {
      setError("Anda mesti bersetuju dengan syarat Notis Privasi.");
      return;
    }

    if (!turnstileToken) {
      setError("Sila lengkapkan pengesahan keselamatan Turnstile.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/public/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          ic: ic.replace(/[\s-]/g, ""),
          phone: phone.trim(),
          address: address.trim(),
          username,
          password,
          confirmPassword,
          directoryConsent,
          confirmedNotLegacy,
          privacyConsent,
          turnstileToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === "POSSIBLE_LEGACY_MATCH") {
          setStep(1);
          setConfirmedNotLegacy(false);
        }
        throw new Error(data.error || "Pendaftaran gagal dilaraskan.");
      }

      // Successful registration: trigger callback to update state and redirect
      onAuthSuccess({
        id: data.member.id,
        fullName: data.member.fullName,
        membershipStatus: data.member.membershipStatus,
        registrationSuccessMessage: data.message,
      });

      navigate("/profil");
    } catch (err: any) {
      setError(err.message || "Ralat semasa mendaftar. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-6">
      <Header />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-4">
        {/* Navigation */}
        <div className="flex items-center gap-3 mb-4">
          <Link
            to="/"
            className="p-2 text-brand-muted hover:text-brand-primary rounded-lg"
            aria-label="Kembali ke Utama"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-lg font-bold text-brand-primary">
            Daftar Ahli Kariah Baru
          </h2>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 h-2 rounded-full mb-6 flex overflow-hidden">
          <div
            className={`h-full bg-brand-primary transition-all duration-300 ${step === 1 ? "w-1/3" : step === 2 ? "w-2/3" : "w-full"}`}
          ></div>
        </div>

        {/* Form Container */}
        <div className="bg-brand-surface border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-brand-primary text-sm mb-4">
            Langkah {step} daripada 3:{" "}
            {step === 1
              ? "Maklumat Peribadi"
              : step === 2
                ? "Maklumat Perhubungan"
                : "Cipta Akaun"}
          </h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-brand-danger text-xs font-medium p-3 rounded-lg flex items-start gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-bold text-brand-text"
                >
                  Nama Penuh (Seperti Dalam IC)
                </label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="Contoh: Ahmad bin Ibrahim"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setPossibleLegacyMatches([]);
                    setConfirmedNotLegacy(false);
                  }}
                  autoComplete="name"
                  required
                  className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reg-ic"
                  className="block text-xs font-bold text-brand-text"
                >
                  Nombor Kad Pengenalan (IC)
                </label>
                <input
                  id="reg-ic"
                  type="text"
                  placeholder="Contoh: YYMMDD-SS-NNNN"
                  value={ic}
                  onChange={handleIcChange}
                  inputMode="numeric"
                  required
                  className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
                <span className="text-[10px] text-brand-muted block">
                  Terhad kepada umur 18 hingga 90 tahun sahaja semasa mendaftar.
                </span>
              </div>

              {possibleLegacyMatches.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-brand-text">
                        Rekod lama yang mungkin milik anda ditemui
                      </p>
                      <p className="text-[10px] text-brand-muted mt-1 leading-relaxed">
                        Tuntut rekod lama untuk mengelakkan pendaftaran
                        berganda.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {possibleLegacyMatches.map((member, index) =>
                      member.claimState === "claimed" ? (
                        <div
                          key={`claimed-${member.fullName}-${index}`}
                          className="rounded-lg border border-teal-200 bg-teal-50 p-2.5"
                        >
                          <span className="block text-xs font-bold text-brand-text">
                            {member.fullName}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-brand-muted">
                            Rekod ini sudah mempunyai akaun.
                          </span>
                          <Link
                            to="/log-masuk"
                            className="mt-2 flex min-h-[36px] items-center justify-center gap-1.5 rounded-md border border-brand-primary bg-white text-[10px] font-bold text-brand-primary"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            Log Masuk Akaun
                          </Link>
                        </div>
                      ) : (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() =>
                            navigate("/tuntut-akaun", {
                              state: {
                                memberId: member.id,
                                fullName: member.fullName,
                                address: member.address,
                              },
                            })
                          }
                          className="w-full bg-white border border-amber-200 rounded-lg p-2.5 text-left hover:border-brand-primary"
                        >
                          <span className="block text-xs font-bold text-brand-text">
                            {member.fullName}
                          </span>
                          <span className="block text-[10px] text-brand-muted mt-0.5">
                            {member.address || "Kariah Al-Ikhwan"}
                          </span>
                          <span className="block text-[10px] font-bold text-brand-primary mt-1">
                            Tuntut rekod ini →
                          </span>
                        </button>
                      ),
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmedNotLegacy(true);
                      setPossibleLegacyMatches([]);
                      setStep(2);
                    }}
                    className="w-full text-[10px] text-brand-muted underline font-semibold py-2"
                  >
                    Tiada satu pun rekod ini milik saya — teruskan daftar
                  </button>
                </div>
              )}

              {possibleLegacyMatches.length === 0 && (
                <button
                  type="button"
                  onClick={handleStep1Next}
                  disabled={checkingLegacy}
                  className="w-full py-3 bg-brand-primary hover:bg-teal-800 text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
                >
                  <span>
                    {checkingLegacy ? "Menyemak Rekod Lama..." : "Seterusnya"}
                  </span>
                  {!checkingLegacy && <ArrowRight className="w-4 h-4" />}
                </button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="reg-phone"
                  className="block text-xs font-bold text-brand-text"
                >
                  Nombor Telefon Bimbit
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="Contoh: 012-3456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  required
                  className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reg-addr"
                  className="block text-xs font-bold text-brand-text"
                >
                  Alamat Kediaman Lengkap (Dalam Kariah)
                </label>
                <textarea
                  id="reg-addr"
                  placeholder="Masukkan alamat lengkap rumah anda..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                ></textarea>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/2 py-3 bg-gray-150 hover:bg-gray-200 text-brand-text font-semibold text-sm rounded-lg border border-gray-200 transition-all min-h-[44px]"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setStep(3);
                  }}
                  className="w-1/2 py-3 bg-brand-primary hover:bg-teal-800 text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <span>Seterusnya</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="reg-username"
                  className="block text-xs font-bold text-brand-text"
                >
                  Nama Pengguna (Username) Pilihan
                </label>
                <input
                  id="reg-username"
                  type="text"
                  placeholder="Contoh: ahmad_ibrahim"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
                <span className="text-[10px] text-gray-400 block">
                  3-30 aksara. Gunakan huruf kecil, angka, _ atau - sahaja.
                </span>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reg-pwd"
                  className="block text-xs font-bold text-brand-text"
                >
                  Kata Laluan
                </label>
                <input
                  id="reg-pwd"
                  type="password"
                  placeholder="Minima 10 aksara"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reg-pwd-confirm"
                  className="block text-xs font-bold text-brand-text"
                >
                  Sahkan Kata Laluan
                </label>
                <input
                  id="reg-pwd-confirm"
                  type="password"
                  placeholder="Masukkan semula kata laluan"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              {/* Directory Visibility Consent (UNCHECKED BY DEFAULT) */}
              <div className="pt-2 flex items-start gap-2.5">
                <input
                  id="directory-consent"
                  type="checkbox"
                  checked={directoryConsent}
                  onChange={(e) => setDirectoryConsent(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary mt-1"
                />
                <label
                  htmlFor="directory-consent"
                  className="text-xs text-brand-muted leading-relaxed"
                >
                  Saya bersetuju nama saya dipaparkan dalam{" "}
                  <strong className="text-brand-text">
                    Senarai Ahli Kariah (Direktori Awam)
                  </strong>
                  .
                </label>
              </div>

              {/* Privacy Notice Consent */}
              <div className="pt-1 flex items-start gap-2.5">
                <input
                  id="privacy-consent"
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  required
                  className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary mt-1"
                />
                <label
                  htmlFor="privacy-consent"
                  className="text-xs text-brand-muted leading-relaxed"
                >
                  Saya bersetuju dan membenarkan pihak surau menguruskan data
                  peribadi saya mengikut{" "}
                  <Link
                    to="/notis-privasi"
                    className="text-brand-primary underline font-semibold"
                  >
                    Notis Privasi e-Kariah Al-Ikhwan
                  </Link>
                  .
                </label>
              </div>

              {/* Turnstile verification */}
              <div className="space-y-1 pt-1">
                <label className="block text-xs font-bold text-brand-text text-center">
                  Pengesahan Keselamatan
                </label>
                <Turnstile onVerify={setTurnstileToken} />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/2 py-3 bg-gray-150 hover:bg-gray-200 text-brand-text font-semibold text-sm rounded-lg border border-gray-200 transition-all min-h-[44px]"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 py-3 bg-brand-primary hover:bg-teal-800 text-white font-bold text-sm rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
                >
                  {loading ? "Mendaftar..." : "Hantar Daftar"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

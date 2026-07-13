import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Info,
  Search,
  LogIn,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import Header from "../components/Header.tsx";
import Turnstile from "../components/Turnstile.tsx";

export default function AccountClaim() {
  const location = useLocation();

  const [memberId, setMemberId] = useState("");
  const [ic, setIc] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  // Legacy Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [validatingSelection, setValidatingSelection] = useState(false);
  const [claimedRecordName, setClaimedRecordName] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  // Prefill state from check page if redirected
  useEffect(() => {
    if (location.state) {
      const state = location.state as {
        memberId?: string;
        fullName?: string;
        address?: string;
      };
      if (!state.memberId) return;

      const verifySelection = async () => {
        setValidatingSelection(true);
        try {
          const res = await fetch(
            `/api/public/legacy-claim-status/${encodeURIComponent(state.memberId!)}`,
          );
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || "Rekod lama gagal disahkan.");
          }

          if (!data.claimable) {
            setMemberId("");
            setSelectedMember(null);
            setClaimedRecordName(state.fullName || "Rekod ahli ini");
            return;
          }

          setClaimedRecordName(null);
          setMemberId(state.memberId!);
          setSelectedMember({
            id: state.memberId,
            fullName: state.fullName || "Ahli Kariah",
            address: state.address || "",
          });
        } catch (err: any) {
          setMemberId("");
          setSelectedMember(null);
          setError(err.message || "Rekod lama gagal disahkan.");
        } finally {
          setValidatingSelection(false);
        }
      };

      verifySelection();
    }
  }, [location.state]);

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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/public/legacy-search?q=${encodeURIComponent(query)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.members || []);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawIc = ic.replace(/[\s-]/g, "");
    if (rawIc.length !== 12) {
      setError("Nombor IC mestilah mengandungi 12 digit.");
      return;
    }

    if (!phone.trim()) {
      setError("Nombor telefon diperlukan.");
      return;
    }

    if (username.length < 3) {
      setError("Nama pengguna mestilah sekurang-kurangnya 3 aksara.");
      return;
    }

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
      const res = await fetch("/api/public/account-claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: memberId || undefined,
          ic: rawIc,
          phone: phone.trim(),
          username,
          password,
          confirmPassword,
          privacyConsent,
          turnstileToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ralat semasa memproses tuntutan akaun.");
      }

      setSuccessCode(data.referenceCode);
    } catch (err: any) {
      setError(
        err.message ||
          "Gagal memproses tuntutan. Sila semak semula maklumat anda.",
      );
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
            to="/semak-keahlian"
            className="p-2 text-brand-muted hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-brand-accent rounded-lg"
            aria-label="Kembali ke Semakan Keahlian"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-lg font-bold text-brand-primary">
            Tuntut Akaun Ahli Lama
          </h2>
        </div>

        <div className="bg-brand-surface border border-gray-200 rounded-xl p-5 shadow-sm">
          {successCode ? (
            <div className="space-y-6 text-center py-4">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-5 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-brand-primary mx-auto" />
                <h3 className="font-bold text-brand-primary text-base">
                  Permohonan Tuntutan Akaun Diterima
                </h3>
                <p className="text-xs text-brand-muted leading-relaxed">
                  Permohonan tuntutan akaun anda berjaya dihantar untuk semakan
                  pihak pentadbir surau. Pihak pentadbir akan menyemak padanan
                  rekod nama dan alamat kediaman anda. Anda boleh log masuk
                  selepas permohonan ini diluluskan.
                </p>
                <div className="bg-brand-surface border border-gray-200 p-3 rounded-lg mt-2 inline-block">
                  <span className="text-[10px] text-gray-400 block uppercase font-semibold">
                    Kod Rujukan Anda
                  </span>
                  <span className="text-lg font-mono font-bold text-brand-text tracking-wide">
                    {successCode}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Link
                  to="/"
                  className="block w-full py-3 bg-brand-primary hover:bg-teal-800 text-white font-bold text-sm rounded-lg shadow-md text-center transition-all min-h-[44px] flex items-center justify-center"
                >
                  Kembali ke Utama
                </Link>
              </div>
            </div>
          ) : validatingSelection ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
              <RefreshCw className="h-7 w-7 animate-spin text-brand-primary" />
              <p className="text-xs font-medium text-brand-muted">
                Mengesahkan status rekod lama...
              </p>
            </div>
          ) : claimedRecordName ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-5 text-center">
                <UserCheck className="mx-auto h-9 w-9 text-brand-primary" />
                <h3 className="mt-3 font-bold text-brand-text">
                  Akaun Telah Dituntut
                </h3>
                <p className="mt-1 text-sm font-semibold text-brand-primary">
                  {claimedRecordName}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-brand-muted">
                  Rekod ini sudah mempunyai akaun atau sedang melalui proses
                  tuntutan. Tuntutan kedua tidak dibenarkan.
                </p>
              </div>
              <Link
                to="/log-masuk"
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-3 text-sm font-bold text-white hover:bg-teal-800"
              >
                <LogIn className="h-4 w-4" />
                Log Masuk Akaun
              </Link>
              <Link
                to="/semak-keahlian"
                className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-3 text-xs font-bold text-brand-text hover:bg-gray-50"
              >
                Kembali ke Carian Rekod
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2.5 text-brand-accent">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-brand-muted">
                    Rekod kariah lama tidak mengandungi No. IC dan No. telefon.
                    Cari dan pilih profil lama anda dahulu. Medan untuk
                    melengkapkan akaun akan dipaparkan selepas profil dipilih.
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-brand-danger text-xs font-medium p-3 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Legacy Profile Search */}
              <div className="space-y-2 border-b border-gray-150 pb-4 mb-2">
                <label className="block text-xs font-bold text-brand-text">
                  Nama Anda
                </label>

                {!selectedMember ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Taip ejaan nama anda di sini..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                      />
                      <div className="absolute right-3 top-3">
                        {searching ? (
                          <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Search className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="bg-brand-background border border-gray-250 rounded-lg p-2 space-y-1 shadow-inner">
                        {searchResults.map((member, index) =>
                          member.claimState === "claimed" ? (
                            <div
                              key={`claimed-${member.fullName}-${index}`}
                              className="rounded-md border border-teal-200 bg-teal-50 p-2.5 text-xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-brand-text">
                                  {member.fullName}
                                </span>
                                <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-brand-primary">
                                  Telah dituntut
                                </span>
                              </div>
                              <Link
                                to="/log-masuk"
                                className="mt-2 flex min-h-[36px] items-center justify-center gap-1.5 rounded-md border border-brand-primary bg-white font-bold text-brand-primary"
                              >
                                <LogIn className="h-3.5 w-3.5" />
                                Log Masuk
                              </Link>
                            </div>
                          ) : (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => {
                                setSelectedMember(member);
                                setMemberId(member.id);
                                setSearchResults([]);
                              }}
                              className="w-full text-left p-2.5 hover:bg-teal-50 border border-transparent hover:border-teal-200 rounded-md transition-all text-xs"
                            >
                              <div className="font-bold text-brand-text">
                                {member.fullName}
                              </div>
                              <div className="text-[10px] text-brand-muted">
                                Jalan/Kawasan:{" "}
                                {member.address || "Kariah Al-Ikhwan"}
                              </div>
                            </button>
                          ),
                        )}
                      </div>
                    )}

                    {searchQuery.trim().length >= 2 &&
                      searchResults.length === 0 &&
                      !searching && (
                        <p className="text-[10px] text-brand-danger">
                          Nama tiada dalam rekod ahli lama, atau akaun telah pun
                          dituntut. Sila cuba ejaan lain.
                        </p>
                      )}
                  </div>
                ) : (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs flex justify-between items-center shadow-sm">
                    <div>
                      <span className="text-[9px] uppercase font-extrabold text-brand-primary block">
                        Profil Terpilih
                      </span>
                      <strong className="text-brand-text text-sm block">
                        {selectedMember.fullName}
                      </strong>
                      <span className="text-brand-muted text-[10px]">
                        Alamat: {selectedMember.address || "Kariah Al-Ikhwan"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMember(null);
                        setMemberId("");
                        setSearchQuery("");
                      }}
                      className="text-xs text-brand-danger hover:text-red-800 hover:underline font-bold px-2 py-1"
                    >
                      Tukar Carian
                    </button>
                  </div>
                )}
              </div>

              {selectedMember && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pt-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                      2
                    </span>
                    <p className="text-xs font-bold text-brand-text">
                      Lengkapkan Maklumat Akaun
                    </p>
                  </div>

                  {/* IC Input */}
                  <div className="space-y-1">
                    <label
                      htmlFor="claim-ic"
                      className="block text-xs font-bold text-brand-text"
                    >
                      Nombor IC Baru Anda (12 Digit)
                    </label>
                    <input
                      id="claim-ic"
                      type="text"
                      placeholder="Contoh: 801215-01-4321"
                      value={ic}
                      onChange={handleIcChange}
                      required
                      className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1">
                    <label
                      htmlFor="claim-phone"
                      className="block text-xs font-bold text-brand-text"
                    >
                      Nombor Telefon Baru Anda
                    </label>
                    <input
                      id="claim-phone"
                      type="tel"
                      placeholder="Contoh: 012-3456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>

                  {/* Desired Username */}
                  <div className="space-y-1">
                    <label
                      htmlFor="claim-username"
                      className="block text-xs font-bold text-brand-text"
                    >
                      Nama Pengguna (Username) Pilihan
                    </label>
                    <input
                      id="claim-username"
                      type="text"
                      placeholder="Hanya huruf, angka, _ atau -"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                    />
                    <span className="text-[10px] text-gray-400 block">
                      Digunakan untuk log masuk kelak. Panjang 3-30 aksara.
                    </span>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label
                      htmlFor="claim-pwd"
                      className="block text-xs font-bold text-brand-text"
                    >
                      Kata Laluan Baru
                    </label>
                    <input
                      id="claim-pwd"
                      type="password"
                      placeholder="Sekurang-kurangnya 10 aksara"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                    />
                    {password.length > 0 && password.length < 10 && (
                      <span className="text-[10px] text-brand-danger block">
                        Panjang kata laluan semasa ialah {password.length}/10
                        aksara.
                      </span>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <label
                      htmlFor="claim-pwd-confirm"
                      className="block text-xs font-bold text-brand-text"
                    >
                      Sahkan Kata Laluan Baru
                    </label>
                    <input
                      id="claim-pwd-confirm"
                      type="password"
                      placeholder="Masukkan semula kata laluan"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>

                  {/* Privacy Notice Agreement */}
                  <div className="pt-2 flex items-start gap-2.5">
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
                      Saya bersetuju nama dan data peribadi saya dikendalikan
                      berlandaskan{" "}
                      <Link
                        to="/notis-privasi"
                        className="text-brand-primary underline font-semibold"
                      >
                        Notis Privasi e-Kariah Al-Ikhwan
                      </Link>
                      .
                    </label>
                  </div>

                  {/* Turnstile Safety */}
                  <div className="space-y-1 pt-1">
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
                    {loading
                      ? "Menghantar Permohonan..."
                      : "Hantar Tuntutan Akaun"}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

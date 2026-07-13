import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  MapPin,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Header from "../components/Header.tsx";

interface LegacyMember {
  id: string;
  fullName: string;
  address: string;
}

export default function MembershipCheck() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LegacyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSearched(false);
    setResults([]);

    if (query.trim().length < 2) {
      setError("Masukkan sekurang-kurangnya 2 aksara nama anda.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/public/legacy-search?q=${encodeURIComponent(query.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Carian rekod lama gagal.");
      }

      setResults(data.members || []);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || "Sambungan terputus. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const selectMember = (member: LegacyMember) => {
    navigate("/tuntut-akaun", {
      state: {
        memberId: member.id,
        fullName: member.fullName,
        address: member.address,
      },
    });
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-6">
      <Header />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/"
            className="p-2 text-brand-muted hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-brand-accent rounded-lg"
            aria-label="Kembali ke Laman Utama"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-lg font-bold text-brand-primary">
            Cari Rekod Keahlian Lama
          </h2>
        </div>

        <div className="bg-brand-surface border border-gray-200 rounded-xl p-5 shadow-sm space-y-5">
          <div className="space-y-2 text-center">
            <UserCheck className="w-9 h-9 text-brand-primary mx-auto" />
            <h3 className="font-bold text-brand-text text-sm">
              Pernah menjadi ahli kariah?
            </h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              Cari nama anda dalam rekod lama dahulu. Rekod lama mungkin belum
              mempunyai nombor IC dan telefon, jadi anda akan melengkapkannya
              semasa membuat tuntutan akaun.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-brand-danger text-xs font-medium p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="legacy-name-search"
                className="block text-xs font-bold text-brand-text"
              >
                Nama Penuh
              </label>
              <div className="relative">
                <input
                  id="legacy-name-search"
                  type="search"
                  placeholder="Contoh: Ahmad bin Ibrahim"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearched(false);
                    setResults([]);
                  }}
                  autoComplete="name"
                  className="w-full pl-3 pr-10 py-2.5 bg-brand-background border border-gray-300 rounded-lg text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
                <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-primary hover:bg-teal-800 text-white font-bold text-sm rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-teal-200 min-h-[44px]"
            >
              {loading ? "Mencari Rekod..." : "Cari Nama Saya"}
            </button>
          </form>

          {searched && results.length > 0 && (
            <section className="space-y-3" aria-live="polite">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                <p className="text-xs font-bold text-brand-primary">
                  Adakah salah satu ini rekod anda?
                </p>
                <p className="text-[10px] text-brand-muted mt-1">
                  Pilih hanya rekod milik anda. Pentadbir akan membuat
                  pengesahan sebelum akaun diaktifkan.
                </p>
              </div>

              <div className="space-y-2">
                {results.map((member) => (
                  <div
                    key={member.id}
                    className="border border-gray-200 rounded-lg p-3 space-y-3"
                  >
                    <div>
                      <p className="font-bold text-sm text-brand-text">
                        {member.fullName}
                      </p>
                      <p className="text-[10px] text-brand-muted mt-1 flex items-start gap-1.5">
                        <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span>
                          {member.address || "Kawasan Kariah Al-Ikhwan"}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectMember(member)}
                      className="w-full py-2.5 bg-brand-primary hover:bg-teal-800 text-white font-bold text-xs rounded-lg min-h-[44px]"
                    >
                      Ini Rekod Saya
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {searched && results.length === 0 && (
            <section
              className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3 text-center"
              aria-live="polite"
            >
              <AlertTriangle className="w-7 h-7 text-brand-accent mx-auto" />
              <div>
                <p className="text-xs font-bold text-brand-text">
                  Nama belum ditemui
                </p>
                <p className="text-[11px] text-brand-muted leading-relaxed mt-1">
                  Cuba ejaan nama yang lain dahulu. Jika masih tiada, anda boleh
                  meneruskan pendaftaran ahli baharu.
                </p>
              </div>
              <Link
                to="/daftar"
                className="flex w-full py-2.5 bg-brand-accent hover:bg-amber-600 text-brand-text font-bold text-xs rounded-lg items-center justify-center min-h-[44px]"
              >
                Daftar Keahlian Baru
              </Link>
            </section>
          )}
        </div>

        <div className="mt-4 bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-start gap-3 text-brand-primary">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs leading-relaxed">
            Nama dan kawasan sahaja dipaparkan. Tuntutan tidak diaktifkan secara
            automatik dan mesti disahkan oleh pentadbir surau.
          </p>
        </div>
      </main>
    </div>
  );
}

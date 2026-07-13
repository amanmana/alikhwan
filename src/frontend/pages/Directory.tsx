import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "../components/Header.tsx";

interface PublicMember {
  id: string;
  fullName: string;
  address: string;
  icMasked: string;
  phoneMasked: string;
  status: string;
}

export default function Directory() {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<any>(null);

  const fetchMembers = (searchQuery: string, pageNum: number) => {
    // Abort previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    const url = `/api/public/members?q=${encodeURIComponent(searchQuery)}&page=${pageNum}`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Gagal mendapatkan senarai ahli daripada pelayan.");
        }
        return res.json();
      })
      .then((data: any) => {
        if (data && data.members) {
          setMembers(data.members);
          setTotalPages(data.totalPages || 1);
          setTotalMembers(data.total || 0);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(
            "Sambungan internet terputus atau pelayan terganggu. Sila cuba lagi.",
          );
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Debounced search logic
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setPage(1);

    if (query.length > 0 && query.length < 2) {
      setMembers([]);
      setTotalPages(1);
      setTotalMembers(0);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchMembers(query, 1);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const handleRetry = () => {
    fetchMembers(query, page);
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-6">
      <Header />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4">
        {/* Header Navigation */}
        <div className="flex items-center gap-3 mb-4">
          <Link
            to="/"
            className="p-2 text-brand-muted hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-brand-accent rounded-lg"
            aria-label="Kembali ke Laman Utama"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-lg font-bold text-brand-primary">
            Senarai Ahli Kariah
          </h2>
        </div>

        {/* Sticky Search Bar */}
        <div className="sticky top-[61px] bg-brand-background z-20 pb-3 pt-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted w-5 h-5" />
            <input
              type="search"
              placeholder="Cari nama ahli kariah..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-brand-surface border border-gray-300 rounded-xl shadow-sm text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary placeholder:text-gray-400"
              aria-live="polite"
              aria-label="Cari nama ahli kariah"
            />
          </div>
          {query.length > 0 && query.length < 2 && (
            <p className="text-[11px] text-brand-accent mt-1 pl-2">
              Sila masukkan sekurang-kurangnya 2 aksara untuk mencari.
            </p>
          )}
        </div>

        {/* Search Results / Live Status */}
        <div className="space-y-4 mt-2">
          {/* Total Record Count Display */}
          {!loading && !error && members.length > 0 && (
            <div className="text-xs text-brand-muted flex justify-between items-center px-1 bg-teal-50/50 p-2.5 rounded-lg border border-teal-100/50">
              <span>Menunjukkan {members.length} ahli kariah</span>
              <span className="font-semibold text-brand-primary">
                Jumlah: {totalMembers} orang aktif
              </span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-brand-danger text-sm rounded-xl p-4 text-center space-y-3 shadow-sm">
              <p>{error}</p>
              <button
                onClick={handleRetry}
                className="mx-auto flex items-center gap-2 bg-brand-danger text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Cuba Lagi</span>
              </button>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <div className="space-y-3" aria-busy="true">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-brand-surface border border-gray-150 p-6 rounded-xl space-y-3 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && members.length === 0 && (
            <div className="text-center py-10 bg-brand-surface border border-dashed border-gray-300 rounded-xl p-6">
              <span className="text-3xl block mb-2" aria-hidden="true">
                🔍
              </span>
              <p className="text-sm font-medium text-brand-muted">
                Tiada rekod ditemui
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Cuba masukkan nama lain atau semak ejaan anda.
              </p>
            </div>
          )}

          {/* Member Cards Layout */}
          {!loading && members.length > 0 && (
            <div className="space-y-4" aria-live="polite">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="bg-brand-surface border border-gray-200 p-5 rounded-xl shadow-sm hover:border-brand-primary hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-extrabold text-brand-text text-sm sm:text-base leading-tight">
                      {member.fullName}
                    </h3>
                    <span
                      className={`text-[9px] sm:text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${
                        member.status === "Belum Dituntut"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-teal-50 text-brand-primary border-teal-200"
                      }`}
                    >
                      {member.status}
                    </span>
                  </div>

                  <div className="text-xs text-brand-muted space-y-2">
                    <p className="leading-relaxed">
                      <span className="font-semibold text-brand-text">
                        Alamat:
                      </span>{" "}
                      {member.address}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-2.5 border-t border-gray-100 mt-3">
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-brand-text">
                          No. IC:
                        </span>{" "}
                        <span className="font-mono text-[11px] bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                          {member.icMasked}
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-brand-text">
                          No. Telefon:
                        </span>{" "}
                        <span className="font-mono text-[11px] bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                          {member.phoneMasked}
                        </span>
                      </p>
                    </div>
                  </div>

                  {member.status === "Belum Dituntut" && (
                    <Link
                      to="/tuntut-akaun"
                      state={{
                        memberId: member.id,
                        fullName: member.fullName,
                        address: member.address,
                      }}
                      className="mt-3 block text-center py-2 bg-brand-primary hover:bg-teal-800 text-white font-bold text-xs rounded-lg transition-all shadow-sm focus:ring-2 focus:ring-teal-200 min-h-[38px] flex items-center justify-center"
                    >
                      Tuntut Profil Ini
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && !loading && !error && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-6">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => {
                  const prev = page - 1;
                  setPage(prev);
                  fetchMembers(query, prev);
                }}
                className="px-4 py-2 bg-brand-surface border border-gray-300 text-brand-text hover:border-brand-primary rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[38px] flex items-center justify-center shadow-sm"
              >
                Sebelumnya
              </button>

              <span className="text-xs text-brand-muted font-medium">
                Halaman {page} dari {totalPages}
              </span>

              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  fetchMembers(query, next);
                }}
                className="px-4 py-2 bg-brand-surface border border-gray-300 text-brand-text hover:border-brand-primary rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[38px] flex items-center justify-center shadow-sm"
              >
                Seterusnya
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

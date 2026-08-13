import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Search, KeyRound, LogIn, ShieldCheck } from "lucide-react";
import Header from "../components/Header.tsx";

export default function Home() {
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    // Fetch count of approved, directory-visible members to show in stats
    fetch("/api/public/members?page=1")
      .then((res) => res.json())
      .then((data: any) => {
        if (data && data.members) {
          // Setting the fetched total active member count
          setMemberCount(data.total || 0);
        }
      })
      .catch(() => {
        // Fallback
        setMemberCount(null);
      });
  }, []);

  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      <Header />

      <main
        id="main-content"
        className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full space-y-8"
      >
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-teal-800 to-teal-950 text-white rounded-2xl p-6 sm:p-10 shadow-lg text-center relative overflow-hidden">
          {/* Subtle Islamic Motif Background Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none islamic-pattern-border"></div>

          <div className="relative z-10 space-y-4">
            <span
              className="inline-block text-4xl mb-2"
              role="img"
              aria-label="Surau Al-Ikhwan Logo"
            >
              🕌
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              Selamat Datang ke e-Kariah Al-Ikhwan
            </h2>
            <p className="text-teal-100 max-w-xl mx-auto text-sm sm:text-base">
              Sistem pengurusan ahli kariah dan direktori untuk ahli komuniti
              Surau Al-Ikhwan. Bersama mengukuhkan ukhuwah dan pengurusan
              qaryah.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/daftar"
                className="bg-brand-accent hover:bg-amber-600 text-brand-text font-bold px-6 py-3 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 focus:ring-4 focus:ring-amber-300 min-h-[44px] flex items-center justify-center animate-hover"
              >
                Daftar Sebagai Ahli
              </Link>
              <Link
                to="/semak-keahlian"
                className="bg-teal-700 hover:bg-teal-650 text-white font-medium px-6 py-3 rounded-lg border border-teal-600 transition-all focus:ring-4 focus:ring-teal-500 min-h-[44px] flex items-center justify-center"
              >
                Semak Keahlian
              </Link>
              <Link
                to="/ahli"
                className="bg-white hover:bg-gray-50 text-teal-900 font-bold px-6 py-3 rounded-lg border border-gray-200 transition-all focus:ring-4 focus:ring-gray-100 min-h-[44px] flex items-center justify-center shadow-sm"
              >
                Senarai Ahli
              </Link>
            </div>

            {memberCount !== null && (
              <p
                className="text-teal-200 text-xs sm:text-sm pt-2"
                aria-live="polite"
              >
                Sebanyak{" "}
                <span className="font-semibold text-brand-accent text-sm sm:text-base">
                  {memberCount > 0 ? `${memberCount}` : "beberapa"}
                </span>{" "}
                ahli aktif telah dipaparkan dalam Direktori Kariah.
              </p>
            )}
          </div>
        </section>

        {/* Quick Action Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/ahli"
            className="bg-brand-surface border border-gray-200 hover:border-brand-primary p-5 rounded-xl shadow-sm flex items-start gap-4 transition-all hover:shadow-md"
          >
            <div className="bg-teal-50 text-brand-primary p-3 rounded-lg">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-brand-text">Cari Ahli</h3>
              <p className="text-xs text-brand-muted">
                Cari nama ahli kariah aktif yang berdaftar secara umum.
              </p>
            </div>
          </Link>

          <Link
            to="/daftar"
            className="bg-brand-surface border border-gray-200 hover:border-brand-primary p-5 rounded-xl shadow-sm flex items-start gap-4 transition-all hover:shadow-md"
          >
            <div className="bg-amber-50 text-brand-accent p-3 rounded-lg">
              <UserPlus className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-brand-text">Daftar Ahli</h3>
              <p className="text-xs text-brand-muted">
                Pendaftaran keahlian baru untuk penduduk kariah Surau Al-Ikhwan.
              </p>
            </div>
          </Link>

          <Link
            to="/tuntut-akaun"
            className="bg-brand-surface border border-gray-200 hover:border-brand-primary p-5 rounded-xl shadow-sm flex items-start gap-4 transition-all hover:shadow-md"
          >
            <div className="bg-teal-50 text-brand-secondary p-3 rounded-lg">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-brand-text">Tuntut Akaun Lama</h3>
              <p className="text-xs text-brand-muted">
                Aktifkan nama pengguna dan kata laluan bagi rekod sedia ada.
              </p>
            </div>
          </Link>

          <Link
            to="/log-masuk"
            className="bg-brand-surface border border-gray-200 hover:border-brand-primary p-5 rounded-xl shadow-sm flex items-start gap-4 transition-all hover:shadow-md"
          >
            <div className="bg-teal-50 text-brand-primary p-3 rounded-lg">
              <LogIn className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-brand-text">Log Masuk Ahli</h3>
              <p className="text-xs text-brand-muted">
                Akses ke profil peribadi dan pengurusan maklumat keahlian.
              </p>
            </div>
          </Link>
        </section>

        {/* Privacy reassurance */}
        <section className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-center gap-3 text-brand-primary">
          <ShieldCheck className="w-6 h-6 flex-shrink-0" />
          <p className="text-xs sm:text-sm font-medium">
            Maklumat peribadi anda dilindungi dan hanya digunakan untuk
            pengurusan ahli kariah Surau Al-Ikhwan sahaja.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 text-center py-6 text-xs text-brand-muted space-y-2 mt-auto">
        <div className="flex justify-center gap-4">
          <Link
            to="/notis-privasi"
            className="hover:text-brand-primary font-medium underline"
          >
            Notis Privasi
          </Link>

          <Link
            to="/admin/login"
            className="hover:text-brand-primary font-medium underline"
          >
            Log Masuk Admin
          </Link>
        </div>
        <p>© 2026 Surau Al-Ikhwan. Hak Cipta Terpelihara.</p>
        <p className="text-[10px] text-gray-400">
          Versi 1.0.0 (Melaka-Vite Stack)
        </p>
      </footer>
    </div>
  );
}

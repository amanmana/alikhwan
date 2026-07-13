import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, WifiOff } from "lucide-react";
import Header from "../components/Header.tsx";

interface ErrorViewProps {
  type: "404" | "403" | "offline";
}

export default function Errors({ type }: ErrorViewProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-4 text-center space-y-6">
        {type === "404" && (
          <>
            <span className="text-6xl" role="img" aria-label="Page Not Found">
              🗺️
            </span>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-brand-primary">
                Laman Tidak Ditemui (404)
              </h2>
              <p className="text-sm text-brand-muted">
                Maaf, pautan yang anda cuba layari tidak wujud dalam sistem
                e-Kariah Al-Ikhwan.
              </p>
            </div>
          </>
        )}

        {type === "403" && (
          <>
            <AlertCircle className="w-16 h-16 text-brand-danger mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-brand-danger">
                Tiada Kebenaran (403)
              </h2>
              <p className="text-sm text-brand-muted">
                Akses dihalang. Pelayar peranti anda tidak mempunyai kebenaran
                untuk membuka halaman sulit ini.
              </p>
            </div>
          </>
        )}

        {type === "offline" && (
          <>
            <WifiOff className="w-16 h-16 text-brand-accent mx-auto animate-pulse" />
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-brand-primary">
                Sambungan Terputus
              </h2>
              <p className="text-sm text-brand-muted">
                Sambungan internet terputus. Sila semak sambungan rangkaian anda
                dan cuba sekali lagi.
              </p>
            </div>
          </>
        )}

        <div className="pt-2 w-full">
          <Link
            to="/"
            className="w-full py-3 bg-brand-primary hover:bg-teal-800 text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Utama</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

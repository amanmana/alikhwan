import React from "react";
import { Link } from "react-router-dom";

interface HeaderProps {
  isAdmin?: boolean;
  devMode?: boolean;
}

export default function Header({
  isAdmin = false,
  devMode = false,
}: HeaderProps) {
  return (
    <header className="bg-brand-surface border-b border-gray-200 sticky top-0 z-40 px-4 py-3 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-brand-accent"
          aria-label="Laman Utama e-Kariah"
        >
          <span className="text-2xl" aria-hidden="true">
            🕌
          </span>
          <div>
            <h1 className="font-bold text-brand-primary text-sm sm:text-base leading-none">
              e-Kariah Al-Ikhwan
            </h1>
            <p className="text-[10px] sm:text-xs text-brand-muted">
              Surau Al-Ikhwan, Seksyen 5, BBB
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {devMode && (
            <span
              className="bg-brand-accent text-brand-text text-[10px] font-bold px-2 py-1 rounded shadow-sm"
              role="status"
            >
              DEMO / MOD MOCK
            </span>
          )}
          {isAdmin ? (
            <span className="bg-red-50 text-brand-danger text-xs font-semibold px-2.5 py-0.5 rounded-full border border-red-200">
              PENTADBIR
            </span>
          ) : (
            <span className="bg-teal-50 text-brand-primary text-xs font-semibold px-2.5 py-0.5 rounded-full border border-teal-200">
              KARIAH
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

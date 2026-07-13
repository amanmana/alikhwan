import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Users, UserPlus, User } from "lucide-react";

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-brand-surface border-t border-gray-200 z-40 md:hidden py-2 px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] safe-bottom"
      aria-label="Navigasi Mudah Alih"
    >
      <div className="flex justify-around items-center max-w-md mx-auto">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center text-[11px] font-medium transition-colors min-w-[60px] min-h-[44px] justify-center ${
              isActive
                ? "text-brand-primary"
                : "text-brand-muted hover:text-brand-secondary"
            }`
          }
        >
          <Home className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span>Utama</span>
        </NavLink>

        <NavLink
          to="/ahli"
          className={({ isActive }) =>
            `flex flex-col items-center text-[11px] font-medium transition-colors min-w-[60px] min-h-[44px] justify-center ${
              isActive
                ? "text-brand-primary"
                : "text-brand-muted hover:text-brand-secondary"
            }`
          }
        >
          <Users className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span>Senarai Ahli</span>
        </NavLink>

        <NavLink
          to="/daftar"
          className={({ isActive }) =>
            `flex flex-col items-center text-[11px] font-medium transition-colors min-w-[60px] min-h-[44px] justify-center ${
              isActive
                ? "text-brand-primary"
                : "text-brand-muted hover:text-brand-secondary"
            }`
          }
        >
          <UserPlus className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span>Daftar</span>
        </NavLink>

        <NavLink
          to="/profil"
          className={({ isActive }) =>
            `flex flex-col items-center text-[11px] font-medium transition-colors min-w-[60px] min-h-[44px] justify-center ${
              isActive
                ? "text-brand-primary"
                : "text-brand-muted hover:text-brand-secondary"
            }`
          }
        >
          <User className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span>Profil</span>
        </NavLink>
      </div>
    </nav>
  );
}

import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardCheck,
  RefreshCw,
  ShieldAlert,
  History,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  onLogout: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  return (
    <aside className="w-64 bg-brand-surface border-r border-gray-200 hidden md:flex flex-col h-[calc(100vh-61px)] sticky top-[61px] shadow-sm">
      <div className="flex-1 py-6 px-4 space-y-1">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-teal-50 text-brand-primary"
                : "text-brand-muted hover:bg-gray-50 hover:text-brand-primary"
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Rumusan (Dashboard)</span>
        </NavLink>

        <NavLink
          to="/admin/ahli"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-teal-50 text-brand-primary"
                : "text-brand-muted hover:bg-gray-50 hover:text-brand-primary"
            }`
          }
        >
          <Users className="w-5 h-5" />
          <span>Urus Ahli Kariah</span>
        </NavLink>

        <NavLink
          to="/admin/pendaftaran"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-teal-50 text-brand-primary"
                : "text-brand-muted hover:bg-gray-50 hover:text-brand-primary"
            }`
          }
        >
          <UserCheck className="w-5 h-5" />
          <span>Pengesahan Ahli</span>
        </NavLink>

        <NavLink
          to="/admin/tuntutan"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-teal-50 text-brand-primary"
                : "text-brand-muted hover:bg-gray-50 hover:text-brand-primary"
            }`
          }
        >
          <ClipboardCheck className="w-5 h-5" />
          <span>Tuntutan Akaun</span>
        </NavLink>

        <NavLink
          to="/admin/pembetulan"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-teal-50 text-brand-primary"
                : "text-brand-muted hover:bg-gray-50 hover:text-brand-primary"
            }`
          }
        >
          <RefreshCw className="w-5 h-5" />
          <span>Permohonan Pindaan</span>
        </NavLink>

        <NavLink
          to="/admin/sesi"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-teal-50 text-brand-primary"
                : "text-brand-muted hover:bg-gray-50 hover:text-brand-primary"
            }`
          }
        >
          <ShieldAlert className="w-5 h-5" />
          <span>Sesi Pentadbir</span>
        </NavLink>

        <NavLink
          to="/admin/audit"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-teal-50 text-brand-primary"
                : "text-brand-muted hover:bg-gray-50 hover:text-brand-primary"
            }`
          }
        >
          <History className="w-5 h-5" />
          <span>Log Audit</span>
        </NavLink>
      </div>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-brand-danger hover:bg-red-50 rounded-lg transition-colors focus:ring-2 focus:ring-brand-danger"
        >
          <span className="flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            <span>Log Keluar</span>
          </span>
        </button>
      </div>
    </aside>
  );
}

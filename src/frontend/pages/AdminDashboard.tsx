import React, { useEffect, useState } from "react";
import { Link, useNavigate, NavLink } from "react-router-dom";
import {
  Users,
  UserCheck,
  ClipboardCheck,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  LayoutDashboard,
  Search,
  ArrowRight,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import Header from "../components/Header.tsx";
import Sidebar from "../components/Sidebar.tsx";
import { adminFetch } from "../utils/adminFetch.ts";

// Admin Mobile Navigation Header for easy mobile switching
export function AdminMobileNav() {
  return (
    <div className="bg-brand-surface border-b border-gray-200 md:hidden flex overflow-x-auto whitespace-nowrap px-4 py-2.5 gap-2 scrollbar-none sticky top-[61px] z-30 shadow-sm">
      <NavLink
        to="/admin"
        end
        className={({ isActive }) =>
          `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isActive
              ? "bg-brand-primary text-white"
              : "bg-gray-100 text-brand-muted"
          }`
        }
      >
        <LayoutDashboard className="w-3.5 h-3.5" />
        <span>Rumusan</span>
      </NavLink>

      <NavLink
        to="/admin/ahli"
        className={({ isActive }) =>
          `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isActive
              ? "bg-brand-primary text-white"
              : "bg-gray-100 text-brand-muted"
          }`
        }
      >
        <Users className="w-3.5 h-3.5" />
        <span>Kariah</span>
      </NavLink>

      <NavLink
        to="/admin/pendaftaran"
        className={({ isActive }) =>
          `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isActive
              ? "bg-brand-primary text-white"
              : "bg-gray-100 text-brand-muted"
          }`
        }
      >
        <UserCheck className="w-3.5 h-3.5" />
        <span>Daftar</span>
      </NavLink>

      <NavLink
        to="/admin/tuntutan"
        className={({ isActive }) =>
          `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isActive
              ? "bg-brand-primary text-white"
              : "bg-gray-100 text-brand-muted"
          }`
        }
      >
        <ClipboardCheck className="w-3.5 h-3.5" />
        <span>Tuntutan</span>
      </NavLink>

      <NavLink
        to="/admin/sesi"
        className={({ isActive }) =>
          `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isActive
              ? "bg-brand-primary text-white"
              : "bg-gray-100 text-brand-muted"
          }`
        }
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>Sesi</span>
      </NavLink>

      <NavLink
        to="/admin/tetapan"
        className={({ isActive }) =>
          `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isActive
              ? "bg-brand-primary text-white"
              : "bg-gray-100 text-brand-muted"
          }`
        }
      >
        <Settings2 className="w-3.5 h-3.5" />
        <span>Tetapan</span>
      </NavLink>
    </div>
  );
}

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/dashboard");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/admin/login");
          return;
        }
        throw new Error(data.error || "Gagal memuatkan data pentadbir.");
      }
      setStats(data.stats);
      setRecentMembers(data.recentMembers || []);
    } catch (err: any) {
      setError(err.message || "Ralat pelayan semasa memuatkan dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isAdmin />
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-brand-primary animate-spin mb-4" />
          <p className="text-sm text-brand-muted">
            Memuatkan data papan pemuka...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isAdmin />
        <main className="flex-1 max-w-md mx-auto w-full px-4 pt-10 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-brand-danger mx-auto" />
          <h2 className="font-bold text-brand-text">
            Ralat Dashboard Pentadbir
          </h2>
          <p className="text-sm text-brand-muted">{error}</p>
          <button
            onClick={fetchDashboard}
            className="px-6 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg"
          >
            Muat Semula
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAdmin />
      <AdminMobileNav />

      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <Sidebar onLogout={onLogout} />

        {/* Content panel */}
        <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-brand-primary">
                Rumusan Pengurusan Surau
              </h2>
              <p className="text-xs text-brand-muted">
                Gambaran keseluruhan keahlian kariah dan kelulusan menunggu
                tindakan.
              </p>
            </div>
            <Link
              to="/admin/ahli"
              className="bg-brand-primary hover:bg-teal-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow flex items-center justify-center gap-2 self-start"
            >
              <Search className="w-4 h-4" />
              <span>Carian Cepat Ahli</span>
            </Link>
          </div>

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/ahli?status=active"
              className="bg-brand-surface border border-gray-200 p-4 rounded-xl shadow-sm hover:border-brand-primary transition-all space-y-2"
            >
              <span className="text-[10px] font-bold text-brand-muted uppercase block">
                Ahli Aktif
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-brand-primary">
                {stats.totalActive}
              </span>
            </Link>

            <Link
              to="/admin/pendaftaran"
              className="bg-brand-surface border border-gray-200 p-4 rounded-xl shadow-sm hover:border-brand-primary transition-all relative space-y-2"
            >
              {stats.pendingRegistrations > 0 && (
                <span className="absolute top-2 right-2 bg-brand-accent text-brand-text text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {stats.pendingRegistrations} baru
                </span>
              )}
              <span className="text-[10px] font-bold text-brand-muted uppercase block">
                Kelulusan Ahli
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-brand-text">
                {stats.pendingRegistrations}
              </span>
            </Link>

            <Link
              to="/admin/tuntutan"
              className="bg-brand-surface border border-gray-200 p-4 rounded-xl shadow-sm hover:border-brand-primary transition-all relative space-y-2"
            >
              {stats.pendingClaims > 0 && (
                <span className="absolute top-2 right-2 bg-brand-accent text-brand-text text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {stats.pendingClaims} baru
                </span>
              )}
              <span className="text-[10px] font-bold text-brand-muted uppercase block">
                Tuntutan Sesi
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-brand-text">
                {stats.pendingClaims}
              </span>
            </Link>

            <a
              href="#pendaftaran-terbaru"
              className={`relative space-y-2 rounded-xl border p-4 shadow-sm transition-all hover:border-brand-accent ${
                stats.newRegistrations > 0
                  ? "border-amber-300 bg-amber-50/50"
                  : "border-gray-200 bg-brand-surface"
              }`}
            >
              {stats.newRegistrations > 0 && (
                <span className="absolute right-2 top-2 rounded-full bg-brand-accent px-1.5 py-0.5 text-[9px] font-bold text-brand-text">
                  30 hari
                </span>
              )}
              <span className="block text-[10px] font-bold uppercase text-brand-muted">
                Ahli Baharu
              </span>
              <span className="text-xl font-extrabold text-brand-accent sm:text-2xl">
                {stats.newRegistrations}
              </span>
            </a>
          </section>

          {/* Detailed stats overview banner */}
          <section className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-center gap-3 text-brand-primary">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs">
              Terdapat <strong>{stats.unclaimedActive}</strong> ahli aktif lama
              yang <strong>belum menuntut akaun mereka</strong> untuk log masuk.
            </p>
          </section>

          {/* Recent Members / Activity card */}
          <section
            id="pendaftaran-terbaru"
            className="scroll-mt-24 bg-brand-surface border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5 space-y-4"
          >
            <h3 className="font-bold text-brand-text text-sm sm:text-base border-b border-gray-100 pb-2">
              Pendaftaran / Kemaskini Terbaru
            </h3>

            <div className="divide-y divide-gray-150">
              {recentMembers.map((member: any) => (
                <div
                  key={member.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-xs sm:text-sm text-brand-text">
                      {member.full_name}
                    </h4>
                    <span className="text-[10px] text-brand-muted">
                      Kemaskini:{" "}
                      {new Date(member.updated_at).toLocaleDateString("ms-MY")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        member.membership_status === "active"
                          ? "bg-green-50 text-brand-success border border-green-150"
                          : member.membership_status === "pending"
                            ? "bg-amber-50 text-brand-accent border border-amber-150"
                            : "bg-red-50 text-brand-danger border border-red-150"
                      }`}
                    >
                      {member.membership_status === "active"
                        ? "Aktif"
                        : member.membership_status === "pending"
                          ? "Menunggu"
                          : member.membership_status}
                    </span>
                    <Link
                      to={`/admin/ahli/${member.id}`}
                      className="p-1 text-brand-muted hover:text-brand-primary rounded"
                      aria-label={`Urus profil ${member.full_name}`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}

              {recentMembers.length === 0 && (
                <p className="text-xs text-brand-muted py-2 text-center">
                  Tiada aktiviti pendaftaran baru ditemui.
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

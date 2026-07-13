import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import Header from "../components/Header.tsx";
import { AdminMobileNav } from "./AdminDashboard.tsx";
import Sidebar from "../components/Sidebar.tsx";
import { adminFetch } from "../utils/adminFetch.ts";

export default function AdminSessions({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/sessions");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/admin/login");
          return;
        }
        throw new Error(
          data.error || "Gagal memuatkan sesi peranti pentadbir.",
        );
      }
      setSessions(data.sessions || []);
      setCurrentSessionId(data.currentSessionId);
    } catch (err: any) {
      setError(err.message || "Ralat semasa mendapatkan sesi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (sessionId: string, deviceLabel: string) => {
    const confirmRevoke = window.confirm(
      `Adakah anda pasti mahu membatalkan kebenaran sesi bagi peranti "${deviceLabel}"?`,
    );
    if (!confirmRevoke) return;

    try {
      const res = await adminFetch(`/api/admin/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.message || "Sesi peranti dibatalkan.");
      fetchSessions();
    } catch (err: any) {
      alert(err.message || "Gagal membatalkan sesi peranti.");
    }
  };

  const handleRevokeOthers = async () => {
    const confirmRevokeAll = window.confirm(
      "Adakah anda pasti mahu membatalkan semua sesi peranti pentadbir lain? Kebenaran pada pelayar lain akan ditarik balik.",
    );
    if (!confirmRevokeAll) return;

    try {
      const res = await adminFetch("/api/admin/sessions/revoke-others", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.message || "Semua sesi pentadbir lain berjaya dibatalkan.");
      fetchSessions();
    } catch (err: any) {
      alert(err.message || "Ralat membatalkan sesi lain.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isAdmin />
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-brand-primary animate-spin mb-4" />
          <p className="text-sm text-brand-muted">
            Memuatkan sesi pentadbir...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAdmin />
      <AdminMobileNav />

      <div className="flex-1 flex">
        <Sidebar onLogout={onLogout} />

        <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-brand-primary">
                Urus Sesi Peranti Pentadbir
              </h2>
              <p className="text-xs text-brand-muted">
                Mengawal pelayar peranti yang berdaftar ke akaun pentadbir
                surau.
              </p>
            </div>
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeOthers}
                className="bg-brand-danger hover:bg-red-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm"
              >
                Batal Semua Sesi Lain
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-brand-danger text-sm rounded-xl p-4 text-center">
              {error}
            </div>
          )}

          {/* Sesi List Cards */}
          <div className="space-y-3">
            {sessions.map((sess) => {
              const isCurrent = sess.id === currentSessionId;

              return (
                <div
                  key={sess.id}
                  className={`bg-brand-surface border rounded-xl p-4 shadow-sm flex items-center justify-between gap-4 ${
                    isCurrent
                      ? "border-brand-primary bg-teal-50/20"
                      : "border-gray-200"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-brand-text text-sm sm:text-base">
                        {sess.device_label}
                      </span>
                      {isCurrent && (
                        <span className="bg-teal-50 text-brand-primary border border-teal-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Peranti Semasa</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-brand-muted space-y-0.5">
                      <p>
                        Didaftarkan:{" "}
                        {new Date(sess.created_at).toLocaleString("ms-MY")}
                      </p>
                      <p>
                        Penggunaan Terakhir:{" "}
                        {new Date(sess.last_used_at).toLocaleString("ms-MY")}
                      </p>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevoke(sess.id, sess.device_label)}
                      className="p-3 text-gray-400 hover:text-brand-danger hover:bg-red-50 rounded-lg transition-colors focus:ring-2 focus:ring-brand-danger min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label={`Batal sesi peranti ${sess.device_label}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-start gap-2.5 text-brand-primary">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-brand-text">
                Informasi Keselamatan
              </h4>
              <p className="text-brand-muted leading-relaxed">
                Tindakan pembatalan sesi akan menamatkan akses pentadbir pada
                pelayar peranti terbabit dengan serta-merta. Pelayar tersebut
                perlu memasukkan semula kata kunci pentadbir untuk masuk semula.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

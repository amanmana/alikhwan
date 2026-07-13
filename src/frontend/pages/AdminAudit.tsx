import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  History,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Header from "../components/Header.tsx";
import { AdminMobileNav } from "./AdminDashboard.tsx";
import Sidebar from "../components/Sidebar.tsx";
import { adminFetch } from "../utils/adminFetch.ts";

export default function AdminAudit({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();

  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [actorTypeFilter, setActorTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/audit?page=${page}`;
      if (actionFilter) url += `&action=${actionFilter}`;
      if (actorTypeFilter) url += `&actorType=${actorTypeFilter}`;

      const res = await adminFetch(url);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/admin/login");
          return;
        }
        throw new Error(data.error || "Gagal memuatkan log audit.");
      }
      setLogs(data.logs || []);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || "Ralat pelayan semasa memuatkan log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter, actorTypeFilter, page]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAdmin />
      <AdminMobileNav />

      <div className="flex-1 flex">
        <Sidebar onLogout={onLogout} />

        <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-brand-primary">
              Log Audit Sistem
            </h2>
            {loading && (
              <RefreshCw className="w-5 h-5 text-brand-primary animate-spin" />
            )}
          </div>

          {/* Filters */}
          <section className="bg-brand-surface border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1.5 text-brand-muted text-xs">
              <Filter className="w-4 h-4" />
              <span>Tapis Log:</span>
            </div>

            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="bg-brand-background border border-gray-300 rounded-lg text-xs px-3 py-2"
            >
              <option value="">-- Semua Tindakan --</option>
              <option value="LOGIN_SUCCESS">Log Masuk Ahli</option>
              <option value="REGISTRATION_CREATE">Pendaftaran Baru</option>
              <option value="CLAIM_SUBMIT">Permohonan Tuntutan</option>
              <option value="CLAIM_APPROVE">Tuntutan Diluluskan</option>
              <option value="CLAIM_REJECT">Tuntutan Ditolak</option>
              <option value="MEMBER_EDIT">Kemaskini Ahli</option>
              <option value="MEMBER_APPROVE">Keahlian Diluluskan</option>
              <option value="MEMBER_DEACTIVATE">Ahli Dinyahaktif</option>
              <option value="MEMBER_ACTIVATE">Ahli Diaktifkan Semula</option>
              <option value="CORRECTION_REQUEST">Permohonan Pindaan</option>
              <option value="CORRECTION_APPROVE">Pindaan Diluluskan</option>
              <option value="CORRECTION_REJECT">Pindaan Ditolak</option>
              <option value="PASSWORD_RESET_CODE_GENERATE">
                Kod Reset Laluan Dijana
              </option>
              <option value="ADMIN_LOGIN_SUCCESS">Admin Daftar Peranti</option>
              <option value="ADMIN_LOGIN_FAILURE">Admin Login Gagal</option>
            </select>

            <select
              value={actorTypeFilter}
              onChange={(e) => {
                setActorTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-brand-background border border-gray-300 rounded-lg text-xs px-3 py-2"
            >
              <option value="">-- Semua Pelaku (Actors) --</option>
              <option value="member">Ahli (Member)</option>
              <option value="admin">Pentadbir (Admin)</option>
              <option value="system">Sistem Automatik (System)</option>
            </select>
          </section>

          {error && (
            <div className="bg-red-50 border border-red-200 text-brand-danger text-sm rounded-xl p-4 text-center">
              {error}
            </div>
          )}

          {/* Chronological Logs list */}
          <div className="space-y-3">
            {logs.map((log) => {
              const changes = log.changed_fields_json
                ? JSON.parse(log.changed_fields_json)
                : null;

              return (
                <div
                  key={log.id}
                  className="bg-brand-surface border border-gray-200 rounded-xl p-4 shadow-sm text-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 border-b border-gray-100 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          log.actor_type === "admin"
                            ? "bg-red-100 text-brand-danger"
                            : log.actor_type === "member"
                              ? "bg-teal-150 text-brand-primary"
                              : "bg-gray-100 text-brand-muted"
                        }`}
                      >
                        {log.actor_type}
                      </span>
                      <span className="font-bold text-brand-text text-sm">
                        {log.action}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(log.created_at).toLocaleString("ms-MY")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      {log.actor_id && (
                        <p className="text-[11px] text-brand-muted">
                          ID Pelaku:{" "}
                          <span className="font-mono text-brand-text font-medium">
                            {log.actor_id}
                          </span>
                        </p>
                      )}
                      <p className="text-[11px] text-brand-muted">
                        Entiti Terlibat:{" "}
                        <strong className="text-brand-text">
                          {log.entity_type}
                        </strong>{" "}
                        ({log.entity_id || "N/A"})
                      </p>
                      {log.reason && (
                        <p className="text-[11px] bg-amber-50/55 p-2 rounded text-brand-muted border border-amber-100/50">
                          Sebab Audit:{" "}
                          <span className="font-semibold text-brand-text">
                            {log.reason}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Masked changes summary */}
                    {changes && (
                      <div className="bg-gray-50 p-2.5 rounded border border-gray-150 space-y-1 font-mono text-[10px] text-gray-600">
                        <span className="font-bold text-[8px] uppercase text-gray-400 block">
                          Pindaan / Data:
                        </span>
                        <pre className="whitespace-pre-wrap max-w-full overflow-x-auto">
                          {JSON.stringify(changes, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {logs.length === 0 && !loading && (
              <div className="text-center py-10 bg-brand-surface border border-dashed border-gray-300 rounded-xl p-6">
                <span className="text-3xl block mb-2">📋</span>
                <p className="text-sm font-medium text-brand-muted">
                  Tiada rekod log audit ditemui.
                </p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-between items-center bg-brand-surface border border-gray-200 px-4 py-3 rounded-xl shadow-sm text-xs text-brand-muted">
              <span>
                Halaman {pagination.page} daripada {pagination.totalPages}{" "}
                (Jumlah: {pagination.total})
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 bg-gray-100 border border-gray-250 rounded disabled:opacity-50 min-h-[36px]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 bg-gray-100 border border-gray-250 rounded disabled:opacity-50 min-h-[36px]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

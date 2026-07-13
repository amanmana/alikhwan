import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Header from "../components/Header.tsx";
import Sidebar from "../components/Sidebar.tsx";
import { AdminMobileNav } from "./AdminDashboard.tsx";
import { adminFetch } from "../utils/adminFetch.ts";

type ApprovalMode = "manual" | "automatic";

export default function AdminSettings({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const [savedMode, setSavedMode] = useState<ApprovalMode>("manual");
  const [selectedMode, setSelectedMode] = useState<ApprovalMode>("manual");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadSetting = async () => {
      try {
        const res = await adminFetch(
          "/api/admin/settings/registration-approval",
        );
        const data = await res.json();
        if (res.status === 401) {
          navigate("/admin/login");
          return;
        }
        if (!res.ok) throw new Error(data.error);

        const mode: ApprovalMode =
          data.mode === "automatic" ? "automatic" : "manual";
        setSavedMode(mode);
        setSelectedMode(mode);
      } catch (err: any) {
        setError(err.message || "Tetapan kelulusan gagal dimuatkan.");
      } finally {
        setLoading(false);
      }
    };

    loadSetting();
  }, [navigate]);

  const saveSetting = async () => {
    if (selectedMode === savedMode) return;

    if (
      selectedMode === "automatic" &&
      !window.confirm(
        "Aktifkan auto lulus? Semua pendaftaran baharu yang melepasi semakan sistem akan terus menjadi ahli aktif.",
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminFetch(
        "/api/admin/settings/registration-approval",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: selectedMode }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSavedMode(selectedMode);
      setSuccess(data.message || "Tetapan kelulusan berjaya disimpan.");
    } catch (err: any) {
      setError(err.message || "Tetapan kelulusan gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAdmin />
      <AdminMobileNav />

      <div className="flex-1 flex">
        <Sidebar onLogout={onLogout} />

        <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-brand-primary">
              <Settings2 className="h-5 w-5" />
              Tetapan Pentadbir
            </h2>
            <p className="mt-1 text-xs text-brand-muted">
              Kawal cara pendaftaran ahli baharu diluluskan oleh sistem.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-brand-surface">
              <RefreshCw className="h-7 w-7 animate-spin text-brand-primary" />
              <p className="text-xs text-brand-muted">Memuatkan tetapan...</p>
            </div>
          ) : (
            <section className="space-y-5 rounded-xl border border-gray-200 bg-brand-surface p-4 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start">
                <div>
                  <h3 className="font-bold text-brand-text">
                    Kelulusan Pendaftaran Baharu
                  </h3>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-brand-muted">
                    Tetapan ini hanya terpakai kepada pendaftaran selepas ia
                    disimpan. Permohonan yang sedang menunggu tidak akan
                    diluluskan secara automatik.
                  </p>
                </div>
                <span
                  className={`self-start rounded-full border px-3 py-1 text-[10px] font-bold ${
                    savedMode === "automatic"
                      ? "border-teal-200 bg-teal-50 text-brand-primary"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  Semasa: {savedMode === "automatic" ? "Auto lulus" : "Manual"}
                </span>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-brand-danger">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-brand-primary">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {success}
                </div>
              )}

              <fieldset className="space-y-3">
                <legend className="mb-2 text-xs font-bold text-brand-text">
                  Pilih cara kelulusan
                </legend>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    selectedMode === "manual"
                      ? "border-brand-primary bg-teal-50 ring-1 ring-brand-primary"
                      : "border-gray-200 hover:border-teal-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="approval-mode"
                    value="manual"
                    checked={selectedMode === "manual"}
                    onChange={() => {
                      setSelectedMode("manual");
                      setSuccess(null);
                    }}
                    className="mt-1 h-4 w-4 accent-teal-700"
                  />
                  <Clock3 className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <span>
                    <span className="block font-bold text-brand-text">
                      Kelulusan manual
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-brand-muted">
                      Pendaftaran baharu berstatus Menunggu. Admin perlu
                      menyemak dan meluluskan setiap permohonan.
                    </span>
                  </span>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    selectedMode === "automatic"
                      ? "border-brand-primary bg-teal-50 ring-1 ring-brand-primary"
                      : "border-gray-200 hover:border-teal-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="approval-mode"
                    value="automatic"
                    checked={selectedMode === "automatic"}
                    onChange={() => {
                      setSelectedMode("automatic");
                      setSuccess(null);
                    }}
                    className="mt-1 h-4 w-4 accent-teal-700"
                  />
                  <Zap className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-primary" />
                  <span>
                    <span className="block font-bold text-brand-text">
                      Auto lulus
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-brand-muted">
                      Pendaftaran baharu yang sah terus menjadi ahli Aktif tanpa
                      menunggu semakan admin.
                    </span>
                  </span>
                </label>
              </fieldset>

              {selectedMode === "automatic" && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      Semakan keselamatan masih berjalan
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-amber-800">
                      Validasi IC, telefon, nama pengguna, rekod pendua,
                      pengesahan Turnstile dan semakan rekod lama masih wajib.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={saveSetting}
                  disabled={saving || selectedMode === savedMode}
                  className="min-h-[44px] w-full rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {saving ? "Menyimpan..." : "Simpan Tetapan"}
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

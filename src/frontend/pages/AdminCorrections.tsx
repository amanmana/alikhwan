import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Check, X, AlertTriangle } from "lucide-react";
import Header from "../components/Header.tsx";
import { AdminMobileNav } from "./AdminDashboard.tsx";
import Sidebar from "../components/Sidebar.tsx";
import { adminFetch } from "../utils/adminFetch.ts";
import {
  formatIcForDisplay,
  formatPhoneForDisplay,
} from "../../shared/validation.ts";

export default function AdminCorrections({
  onLogout,
}: {
  onLogout: () => void;
}) {
  const navigate = useNavigate();

  const [corrections, setCorrections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rejection reason prompt
  const [selectedCorrectionId, setSelectedCorrectionId] = useState<
    string | null
  >(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCorrections = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/corrections");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/admin/login");
          return;
        }
        throw new Error(data.error || "Gagal memuatkan rekod pindaan.");
      }
      setCorrections(data.corrections || []);
    } catch (err: any) {
      setError(err.message || "Ralat semasa memuatkan rekod pindaan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrections();
  }, []);

  const handleApprove = async (corrId: string, memberName: string) => {
    const confirmApprove = window.confirm(
      `Adakah anda pasti mahu meluluskan permohonan pindaan maklumat profil bagi ahli "${memberName}"?`,
    );
    if (!confirmApprove) return;

    try {
      const res = await adminFetch(`/api/admin/corrections/${corrId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Pindaan maklumat profil diluluskan.");
      fetchCorrections();
    } catch (err: any) {
      alert(err.message || "Gagal meluluskan permohonan pindaan.");
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert("Sebab penolakan wajib dinyatakan.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminFetch(
        `/api/admin/corrections/${selectedCorrectionId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: rejectionReason }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Permohonan pindaan ditolak.");
      setSelectedCorrectionId(null);
      setRejectionReason("");
      fetchCorrections();
    } catch (err: any) {
      alert(err.message || "Ralat semasa menolak permohonan pindaan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isAdmin />
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-brand-primary animate-spin mb-4" />
          <p className="text-sm text-brand-muted">
            Memuatkan permohonan pindaan...
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
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-brand-primary">
              Permohonan Pindaan Profil
            </h2>
            <p className="text-xs text-brand-muted">
              Kelulusan bagi ahli berdaftar yang meminta pembetulan maklumat
              peribadi.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-brand-danger text-sm rounded-xl p-4 text-center">
              {error}
            </div>
          )}

          {/* Rejection Modal */}
          {selectedCorrectionId && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <form
                onSubmit={handleRejectSubmit}
                className="bg-brand-surface rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl"
              >
                <h3 className="font-bold text-brand-primary text-sm sm:text-base border-b border-gray-100 pb-2">
                  Tolak Permohonan Pindaan
                </h3>
                <div className="space-y-1">
                  <label
                    htmlFor="reject-corr-reason"
                    className="block text-xs font-bold text-brand-text"
                  >
                    Sebab Penolakan Pindaan
                  </label>
                  <textarea
                    id="reject-corr-reason"
                    required
                    rows={3}
                    placeholder="Contoh: Dokumen sokongan atau maklumat tidak sepadan..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
                  ></textarea>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCorrectionId(null);
                      setRejectionReason("");
                    }}
                    className="w-1/2 py-2 bg-gray-100 border border-gray-250 text-xs font-bold rounded-lg min-h-[44px]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-1/2 py-2 bg-brand-danger text-white text-xs font-bold rounded-lg shadow min-h-[44px]"
                  >
                    {isSubmitting ? "Menolak..." : "Hantar Tolak"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Dynamic Cards list */}
          <div className="space-y-4">
            {corrections.map((corr) => {
              const changes = JSON.parse(corr.requested_changes_json);

              return (
                <div
                  key={corr.id}
                  className="bg-brand-surface border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <div>
                      <h3 className="font-bold text-brand-text text-sm sm:text-base">
                        {corr.full_name}
                      </h3>
                      <span className="text-[10px] text-brand-muted">
                        Tarikh Mohon:{" "}
                        {new Date(corr.requested_at).toLocaleString("ms-MY")}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        corr.status === "pending"
                          ? "bg-amber-50 text-brand-accent border-amber-200"
                          : corr.status === "approved"
                            ? "bg-green-50 text-brand-success border-green-200"
                            : "bg-red-50 text-brand-danger border-red-200"
                      }`}
                    >
                      {corr.status}
                    </span>
                  </div>

                  {/* Side-by-Side original vs requested changes */}
                  <div className="text-xs space-y-3">
                    <h4 className="font-bold text-brand-primary text-[10px] uppercase">
                      Perbandingan Maklumat Pindaan
                    </h4>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-150">
                      <div className="space-y-2 border-r border-gray-200 pr-2">
                        <span className="font-bold text-[9px] text-gray-400 block uppercase">
                          REKOD ASAL SEKARANG
                        </span>

                        {changes.fullName && (
                          <div>
                            <span className="text-[9px] text-brand-muted block font-semibold">
                              Nama Penuh
                            </span>
                            <span className="text-brand-text line-through font-medium">
                              {corr.full_name}
                            </span>
                          </div>
                        )}
                        {changes.ic && (
                          <div>
                            <span className="text-[9px] text-brand-muted block font-semibold">
                              No. IC
                            </span>
                            <span className="font-mono text-gray-500 line-through font-medium">
                              {formatIcForDisplay(corr.ic_normalized)}
                            </span>
                          </div>
                        )}
                        {changes.phone && (
                          <div>
                            <span className="text-[9px] text-brand-muted block font-semibold">
                              Telefon
                            </span>
                            <span className="text-brand-text line-through font-medium">
                              {formatPhoneForDisplay(corr.phone_normalized)}
                            </span>
                          </div>
                        )}
                        {changes.address && (
                          <div>
                            <span className="text-[9px] text-brand-muted block font-semibold">
                              Alamat
                            </span>
                            <span className="text-brand-text line-through font-medium">
                              {corr.address}
                            </span>
                          </div>
                        )}
                        {changes.generalArea && (
                          <div>
                            <span className="text-[9px] text-brand-muted block font-semibold">
                              Kawasan
                            </span>
                            <span className="text-brand-text line-through font-medium">
                              {corr.general_area || "Tiada"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pl-2">
                        <span className="font-bold text-[9px] text-brand-accent block uppercase">
                          PINDAAN BARU YANG DIPOHON
                        </span>

                        {changes.fullName && (
                          <div>
                            <span className="text-[9px] text-brand-muted block font-semibold">
                              Nama Penuh
                            </span>
                            <span className="text-brand-primary font-bold">
                              {changes.fullName}
                            </span>
                          </div>
                        )}
                        {changes.ic && (
                          <div>
                            <span className="text-[9px] text-brand-muted block font-semibold">
                              No. IC
                            </span>
                            <span className="font-mono text-brand-primary font-bold">
                              {formatIcForDisplay(changes.ic)}
                            </span>
                          </div>
                        )}
                        {changes.phone && (
                          <div>
                            <span className="text-[9px] text-brand-muted block font-semibold">
                              Telefon
                            </span>
                            <span className="text-brand-primary font-bold">
                              {formatPhoneForDisplay(changes.phone)}
                            </span>
                          </div>
                        )}
                        {changes.address && (
                          <div>
                            <span className="text-[9px] text-brand-muted block font-semibold">
                              Alamat
                            </span>
                            <span className="text-brand-primary font-bold">
                              {changes.address}
                            </span>
                          </div>
                        )}
                        {changes.generalArea && (
                          <div>
                            <span className="text-[9px] text-brand-muted block font-semibold">
                              Kawasan
                            </span>
                            <span className="text-brand-primary font-bold">
                              {changes.generalArea}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {corr.status === "pending" && (
                    <div className="flex gap-2 border-t border-gray-150 pt-3">
                      <button
                        onClick={() => handleApprove(corr.id, corr.full_name)}
                        className="w-1/2 py-2 bg-brand-primary hover:bg-teal-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow min-h-[44px]"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Luluskan Pindaan</span>
                      </button>
                      <button
                        onClick={() => setSelectedCorrectionId(corr.id)}
                        className="w-1/2 py-2 bg-brand-danger hover:bg-red-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow min-h-[44px]"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Tolak Pindaan</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {corrections.length === 0 && (
              <div className="text-center py-10 bg-brand-surface border border-dashed border-gray-300 rounded-xl p-6">
                <span className="text-3xl block mb-2">📋</span>
                <p className="text-sm font-medium text-brand-muted">
                  Tiada permohonan pembetulan maklumat profil baru.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

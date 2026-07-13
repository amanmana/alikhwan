import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import Header from "../components/Header.tsx";
import { AdminMobileNav } from "./AdminDashboard.tsx";
import Sidebar from "../components/Sidebar.tsx";
import { adminFetch } from "../utils/adminFetch.ts";
import {
  formatIcForDisplay,
  formatPhoneForDisplay,
} from "../../shared/validation.ts";

export default function AdminClaims({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();

  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rejection reason prompt
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/claims");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/admin/login");
          return;
        }
        throw new Error(data.error || "Gagal memuatkan rekod tuntutan.");
      }
      setClaims(data.claims || []);
    } catch (err: any) {
      setError(err.message || "Ralat semasa memuatkan rekod tuntutan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleApprove = async (claimId: string, username: string) => {
    const confirmApprove = window.confirm(
      `Adakah anda pasti mahu meluluskan tuntutan akaun untuk nama pengguna "${username}"?`,
    );
    if (!confirmApprove) return;

    try {
      const res = await adminFetch(`/api/admin/claims/${claimId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Tuntutan akaun berjaya diluluskan.");
      fetchClaims();
    } catch (err: any) {
      alert(err.message || "Gagal meluluskan tuntutan akaun.");
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
        `/api/admin/claims/${selectedClaimId}/reject`,
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

      alert("Permohonan tuntutan ditolak.");
      setSelectedClaimId(null);
      setRejectionReason("");
      fetchClaims();
    } catch (err: any) {
      alert(err.message || "Ralat semasa menolak tuntutan.");
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
            Memuatkan permohonan tuntutan...
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
              Semakan Tuntutan Akaun
            </h2>
            <p className="text-xs text-brand-muted">
              Kelulusan bagi permohonan tuntutan akaun lama karian.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-brand-danger text-sm rounded-xl p-4 text-center">
              {error}
            </div>
          )}

          {/* Rejection Modal */}
          {selectedClaimId && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <form
                onSubmit={handleRejectSubmit}
                className="bg-brand-surface rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl"
              >
                <h3 className="font-bold text-brand-primary text-sm sm:text-base border-b border-gray-100 pb-2">
                  Tolak Tuntutan Akaun
                </h3>
                <div className="space-y-1">
                  <label
                    htmlFor="reject-claim-reason"
                    className="block text-xs font-bold text-brand-text"
                  >
                    Sebab Penolakan Tuntutan
                  </label>
                  <textarea
                    id="reject-claim-reason"
                    required
                    rows={3}
                    placeholder="Contoh: No. telefon tidak sepadan dengan rekod kariah..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
                  ></textarea>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClaimId(null);
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

          {/* Cards List (Mobile and Desktop friendly) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="bg-brand-surface border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-brand-muted uppercase">
                      Kod Rujukan: {claim.reference_code}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        claim.status === "pending"
                          ? "bg-amber-50 text-brand-accent border-amber-200"
                          : claim.status === "approved"
                            ? "bg-green-50 text-brand-success border-green-200"
                            : "bg-red-50 text-brand-danger border-red-200"
                      }`}
                    >
                      {claim.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 pt-1">
                    <div>
                      <span className="text-[9px] uppercase text-gray-400 font-bold block">
                        Ahli Yang Memohon
                      </span>
                      <span className="font-bold text-brand-text text-sm block">
                        {claim.full_name}
                      </span>
                      <span className="font-mono text-gray-500">
                        {formatIcForDisplay(claim.ic_normalized)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2">
                      <div>
                        <span className="text-[9px] uppercase text-gray-400 font-bold block">
                          Telefon
                        </span>
                        <span className="font-semibold text-brand-text">
                          {formatPhoneForDisplay(claim.phone_normalized)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-gray-400 font-bold block">
                          Username Dipohon
                        </span>
                        <span className="font-mono font-bold text-brand-primary">
                          {claim.requested_username}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {claim.status === "pending" && (
                  <div className="flex gap-2 border-t border-gray-150 pt-3">
                    <button
                      onClick={() =>
                        handleApprove(claim.id, claim.requested_username)
                      }
                      className="w-1/2 py-2 bg-brand-primary hover:bg-teal-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 shadow min-h-[44px]"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Terima</span>
                    </button>
                    <button
                      onClick={() => setSelectedClaimId(claim.id)}
                      className="w-1/2 py-2 bg-brand-danger hover:bg-red-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 shadow min-h-[44px]"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {claims.length === 0 && (
              <div className="col-span-full text-center py-10 bg-brand-surface border border-dashed border-gray-300 rounded-xl p-6">
                <span className="text-3xl block mb-2">📋</span>
                <p className="text-sm font-medium text-brand-muted">
                  Tiada permohonan tuntutan akaun menunggu semakan.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

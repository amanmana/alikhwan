import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Edit3,
  Check,
  X,
  UserX,
  UserCheck,
  LockKeyhole,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Header from "../components/Header.tsx";
import { AdminMobileNav } from "./AdminDashboard.tsx";
import Sidebar from "../components/Sidebar.tsx";
import { adminFetch } from "../utils/adminFetch.ts";
import {
  formatIcForDisplay,
  formatPhoneForDisplay,
} from "../../shared/validation.ts";

export default function AdminMembers({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();

  const statusLabel = (s: string) =>
    ({
      active: "Aktif",
      pending: "Menunggu",
      inactive: "Tidak Aktif",
      rejected: "Ditolak",
      moved: "Berpindah",
      deceased: "Meninggal Dunia",
      needs_review: "Perlu Semakan",
    })[s] ?? s;

  const [members, setMembers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search/Filter states
  const [query, setQuery] = useState("");
  const [icQuery, setIcQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("ASC");
  const [page, setPage] = useState(1);

  // Selected Member Details Modal / Drawer
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form Edit fields
  const [editName, setEditName] = useState("");
  const [editIc, setEditIc] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionType, setActionType] = useState<
    | "edit"
    | "approve"
    | "reject"
    | "deactivate"
    | "activate"
    | "set-status"
    | "reset-code"
    | null
  >(null);
  const [setStatusValue, setSetStatusValue] = useState<"moved" | "deceased">(
    "moved",
  );
  const [resetCodeResult, setResetCodeResult] = useState<any | null>(null);

  const debounceTimerRef = useRef<any>(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/members?page=${page}&sortBy=${sortField}&sortOrder=${sortOrder}`;
      if (query.trim().length >= 2) url += `&q=${encodeURIComponent(query)}`;
      if (icQuery.trim()) url += `&ic=${encodeURIComponent(icQuery)}`;
      if (phoneQuery.trim()) url += `&phone=${encodeURIComponent(phoneQuery)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (accountFilter) url += `&accountState=${accountFilter}`;

      const res = await adminFetch(url);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/admin/login");
          return;
        }
        throw new Error(data.error || "Gagal memuatkan rekod kariah.");
      }
      setMembers(data.members || []);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || "Sambungan terputus semasa menghubungi pelayan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchMembers();
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [
    query,
    icQuery,
    phoneQuery,
    statusFilter,
    accountFilter,
    sortField,
    sortOrder,
    page,
  ]);

  const viewMemberDetail = async (memberId: string) => {
    setDetailLoading(true);
    setSelectedMember(null);
    setSelectedAccount(null);
    setResetCodeResult(null);
    setIsEditing(false);
    setActionType(null);
    setActionReason("");

    try {
      const res = await adminFetch(`/api/admin/members/${memberId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSelectedMember(data.member);
      setSelectedAccount(data.account);

      // Prefill fields
      setEditName(data.member.full_name);
      setEditIc(formatIcForDisplay(data.member.ic_normalized));
      setEditPhone(formatPhoneForDisplay(data.member.phone_normalized));
      setEditAddress(data.member.address);
      setEditArea(data.member.general_area || "");
      setEditNotes(data.member.admin_notes || "");
    } catch (err: any) {
      alert(err.message || "Gagal memuatkan butiran ahli kariah.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionReason.trim()) {
      alert("Sebab tindakan wajib diisi untuk tujuan audit keselamatan.");
      return;
    }

    const memberId = selectedMember.id;
    let url = `/api/admin/members/${memberId}`;
    let method = "PATCH";
    let body: any = { reason: actionReason };

    if (actionType === "edit") {
      body = {
        ...body,
        fullName: editName,
        ic: editIc,
        phone: editPhone,
        address: editAddress,
        generalArea: editArea || null,
        adminNotes: editNotes || null,
      };
    } else if (actionType === "approve") {
      url += "/approve";
      method = "POST";
    } else if (actionType === "reject") {
      url += "/reject";
      method = "POST";
    } else if (actionType === "deactivate") {
      url += "/deactivate";
      method = "POST";
    } else if (actionType === "activate") {
      url += "/activate";
      method = "POST";
    } else if (actionType === "set-status") {
      url += "/set-status";
      method = "POST";
      body = { ...body, status: setStatusValue };
    } else if (actionType === "reset-code") {
      url = `/api/admin/accounts/${memberId}/reset-code`;
      method = "POST";
    }

    try {
      const res = await adminFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (actionType === "reset-code") {
        setResetCodeResult(data);
      } else {
        alert(data.message || "Tindakan berjaya diproses.");
        setSelectedMember(null);
        setIsEditing(false);
        setActionType(null);
        setActionReason("");
        fetchMembers(); // refresh
      }
    } catch (err: any) {
      alert(err.message || "Ralat semasa memproses tindakan.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAdmin />
      <AdminMobileNav />

      <div className="flex-1 flex">
        <Sidebar onLogout={onLogout} />

        <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-brand-primary">
              Urus Ahli Kariah
            </h2>
            {loading && (
              <RefreshCw className="w-5 h-5 text-brand-primary animate-spin" />
            )}
          </div>

          {/* Filtering Toolbar */}
          <section className="bg-brand-surface border border-gray-200 rounded-xl p-4 shadow-sm space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Name search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari nama kariah..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
                />
              </div>

              {/* IC exact search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari No. IC penuh..."
                  value={icQuery}
                  onChange={(e) => setIcQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
                />
              </div>

              {/* Phone search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari No. Telefon..."
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-brand-background border border-gray-300 rounded-lg text-xs px-3 py-2 focus:outline-none"
              >
                <option value="">-- Semua Status --</option>
                <option value="active">Aktif</option>
                <option value="pending">Menunggu Kelulusan</option>
                <option value="inactive">Tidak Aktif</option>
                <option value="rejected">Ditolak</option>
                <option value="moved">Berpindah</option>
                <option value="deceased">Meninggal Dunia</option>
                <option value="needs_review">Perlu Semakan</option>
              </select>

              {/* Account State filter */}
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="bg-brand-background border border-gray-300 rounded-lg text-xs px-3 py-2 focus:outline-none"
              >
                <option value="">-- Sesi Akaun --</option>
                <option value="unclaimed">Belum Dituntut</option>
                <option value="pending_claim">Tuntutan Menunggu</option>
                <option value="active">Akaun Aktif</option>
                <option value="locked">Akaun Dikunci</option>
              </select>

              {/* Sort field */}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="bg-brand-background border border-gray-300 rounded-lg text-xs px-3 py-2 focus:outline-none"
              >
                <option value="name">Susun Nama</option>
                <option value="created">Tarikh Daftar</option>
                <option value="updated">Tarikh Kemaskini</option>
              </select>

              <button
                onClick={() =>
                  setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"))
                }
                className="bg-gray-100 border border-gray-250 text-xs font-semibold px-3 py-2 rounded-lg"
              >
                Susunan:{" "}
                {sortOrder === "ASC"
                  ? "Menarik (A-Z/Lama)"
                  : "Menurun (Z-A/Baru)"}
              </button>
            </div>
          </section>

          {/* Members List */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-brand-danger text-sm rounded-xl p-4 text-center">
              {error}
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block bg-brand-surface border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-brand-muted uppercase font-bold">
                  <th className="px-4 py-3">Nama Penuh</th>
                  <th className="px-4 py-3">No. IC</th>
                  <th className="px-4 py-3">No. Telefon</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sesi Akaun</th>
                  <th className="px-4 py-3">Direktori</th>
                  <th className="px-4 py-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-brand-text">
                      {m.full_name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-gray-500">
                      {formatIcForDisplay(m.ic_normalized)}
                    </td>
                    <td className="px-4 py-3.5 font-medium">
                      {formatPhoneForDisplay(m.phone_normalized)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold ${
                          m.membership_status === "active"
                            ? "bg-green-50 text-brand-success border border-green-200"
                            : m.membership_status === "pending"
                              ? "bg-amber-50 text-brand-accent border border-amber-200"
                              : m.membership_status === "moved"
                                ? "bg-orange-50 text-orange-700 border border-orange-200"
                                : m.membership_status === "deceased"
                                  ? "bg-gray-100 text-gray-600 border border-gray-300"
                                  : "bg-red-50 text-brand-danger border border-red-200"
                        }`}
                      >
                        {statusLabel(m.membership_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold">{m.account_state}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {m.directory_visible === 1 ? "Dipaparkan" : "Tersembunyi"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => viewMemberDetail(m.id)}
                        className="bg-brand-primary hover:bg-teal-800 text-white font-semibold px-3 py-1.5 rounded-lg"
                      >
                        Urus
                      </button>
                    </td>
                  </tr>
                ))}

                {members.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-8 text-brand-muted"
                    >
                      Tiada rekod ahli ditemui.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="bg-brand-surface border border-gray-200 p-4 rounded-xl shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-brand-text text-sm">
                      {m.full_name}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {formatIcForDisplay(m.ic_normalized)}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      m.membership_status === "active"
                        ? "bg-green-50 text-brand-success border-green-200"
                        : m.membership_status === "moved"
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : m.membership_status === "deceased"
                            ? "bg-gray-100 text-gray-600 border-gray-300"
                            : "bg-amber-50 text-brand-accent border-amber-200"
                    }`}
                  >
                    {statusLabel(m.membership_status)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-100">
                  <span className="text-brand-muted">
                    {formatPhoneForDisplay(m.phone_normalized)}
                  </span>
                  <button
                    onClick={() => viewMemberDetail(m.id)}
                    className="bg-brand-primary hover:bg-teal-800 text-white font-bold px-3 py-1 rounded-lg"
                  >
                    Urus Ahli
                  </button>
                </div>
              </div>
            ))}

            {members.length === 0 && !loading && (
              <p className="text-xs text-brand-muted py-6 text-center">
                Tiada rekod ahli ditemui.
              </p>
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

          {/* Member Detail Drawer / Modal Overlay */}
          {selectedMember && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-brand-surface rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <h3 className="font-bold text-brand-primary text-sm sm:text-base">
                    Butiran Rekod Kariah
                  </h3>
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="p-1.5 text-brand-muted hover:text-brand-text rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {actionType ? (
                  // Audit Action Reason prompt
                  <form onSubmit={handleActionSubmit} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 text-brand-muted text-xs p-3 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-brand-text">
                          Sebab Tindakan Diperlukan
                        </h4>
                        <p className="text-[10px] leading-relaxed">
                          Anda sedang memproses tindakan:{" "}
                          <strong>{actionType.toUpperCase()}</strong>. Sila
                          berikan sebab pengauditan bertulis untuk log
                          keselamatan.
                        </p>
                      </div>
                    </div>

                    {actionType === "set-status" && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1">
                        <p className="text-[10px] uppercase font-bold text-orange-700">
                          Status Baharu Yang Dipilih
                        </p>
                        <p className="text-sm font-bold text-orange-900">
                          {setStatusValue === "moved"
                            ? "🚚 Berpindah"
                            : "🕌 Meninggal Dunia"}
                        </p>
                        <p className="text-[10px] text-orange-600">
                          Profil akan disembunyikan daripada direktori awam.
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label
                        htmlFor="action-reason"
                        className="block text-xs font-bold text-brand-text"
                      >
                        Sebab / Catatan Audit
                      </label>
                      <textarea
                        id="action-reason"
                        required
                        rows={3}
                        placeholder="Masukkan sebab tindakan..."
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
                      ></textarea>
                    </div>

                    {actionType === "reset-code" && resetCodeResult && (
                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-center space-y-1">
                        <span className="text-[9px] uppercase text-teal-600 font-bold">
                          KOD RESET SATU KALI DIJANA
                        </span>
                        <span className="text-xl font-mono font-extrabold text-brand-text tracking-widest">
                          {resetCodeResult.resetCode}
                        </span>
                        <span className="text-[10px] text-brand-muted block">
                          Kongsi kod ini dengan {resetCodeResult.username}. Sah
                          24 jam.
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActionType(null);
                          setResetCodeResult(null);
                        }}
                        className="w-1/2 py-2.5 bg-gray-100 border border-gray-250 text-xs font-bold rounded-lg min-h-[44px]"
                      >
                        Kembali
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-lg shadow min-h-[44px]"
                      >
                        Sahkan & Hantar
                      </button>
                    </div>
                  </form>
                ) : isEditing ? (
                  // Edit profile form
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setActionType("edit");
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label
                          htmlFor="edit-name-inp"
                          className="block text-[10px] font-bold text-brand-muted uppercase"
                        >
                          Nama Penuh
                        </label>
                        <input
                          id="edit-name-inp"
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label
                          htmlFor="edit-ic-inp"
                          className="block text-[10px] font-bold text-brand-muted uppercase"
                        >
                          Nombor IC
                        </label>
                        <input
                          id="edit-ic-inp"
                          type="text"
                          value={editIc}
                          onChange={(e) => setEditIc(e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label
                          htmlFor="edit-phone-inp"
                          className="block text-[10px] font-bold text-brand-muted uppercase"
                        >
                          Telefon
                        </label>
                        <input
                          id="edit-phone-inp"
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label
                          htmlFor="edit-area-inp"
                          className="block text-[10px] font-bold text-brand-muted uppercase"
                        >
                          Kawasan
                        </label>
                        <input
                          id="edit-area-inp"
                          type="text"
                          value={editArea}
                          onChange={(e) => setEditArea(e.target.value)}
                          className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="edit-addr-inp"
                        className="block text-[10px] font-bold text-brand-muted uppercase"
                      >
                        Alamat
                      </label>
                      <textarea
                        id="edit-addr-inp"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        required
                        rows={2}
                        className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
                      ></textarea>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="edit-notes-inp"
                        className="block text-[10px] font-bold text-brand-muted uppercase"
                      >
                        Nota Pentadbir (Catatan Dalaman)
                      </label>
                      <textarea
                        id="edit-notes-inp"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
                      ></textarea>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="w-1/2 py-2.5 bg-gray-100 border border-gray-250 text-xs font-bold rounded-lg min-h-[44px]"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-lg shadow min-h-[44px]"
                      >
                        Simpan Perubahan
                      </button>
                    </div>
                  </form>
                ) : (
                  // Static detailed view with actions
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3.5 bg-gray-50 p-3.5 rounded-xl border border-gray-150">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-brand-muted">
                          Legacy ID
                        </span>
                        <p className="font-semibold">
                          {selectedMember.legacy_id || "Tiada"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-brand-muted">
                          Sumber Rekod
                        </span>
                        <p className="font-semibold">
                          {selectedMember.registration_source}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-brand-muted">
                          Status Keahlian
                        </span>
                        <p className="font-semibold text-brand-primary">
                          {selectedMember.membership_status.toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-brand-muted">
                          Sesi Akaun
                        </span>
                        <p className="font-semibold">
                          {selectedMember.account_state.toUpperCase()}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] uppercase font-bold text-brand-muted">
                          Nama Penuh
                        </span>
                        <p className="font-bold text-brand-text text-sm">
                          {selectedMember.full_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-brand-muted">
                          No. IC
                        </span>
                        <p className="font-mono font-medium">
                          {formatIcForDisplay(selectedMember.ic_normalized)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-brand-muted">
                          No. Telefon
                        </span>
                        <p className="font-medium">
                          {formatPhoneForDisplay(
                            selectedMember.phone_normalized,
                          )}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] uppercase font-bold text-brand-muted">
                          Alamat
                        </span>
                        <p className="font-medium leading-relaxed">
                          {selectedMember.address} (
                          {selectedMember.general_area || "Desa Al-Ikhwan"})
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] uppercase font-bold text-brand-muted">
                          Catatan Pentadbir
                        </span>
                        <p className="font-medium bg-white p-2 rounded border border-gray-200 min-h-[30px] italic">
                          {selectedMember.admin_notes || "Tiada catatan."}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="py-2 px-3 border border-gray-300 hover:border-brand-primary text-brand-text font-bold rounded-lg flex items-center justify-center gap-1.5 min-h-[44px]"
                      >
                        <Edit3 className="w-4 h-4 text-brand-muted" />
                        <span>Kemas Kini Profil</span>
                      </button>

                      {selectedAccount && (
                        <button
                          onClick={() => setActionType("reset-code")}
                          className="py-2 px-3 border border-gray-300 hover:border-brand-accent text-brand-text font-bold rounded-lg flex items-center justify-center gap-1.5 min-h-[44px]"
                        >
                          <LockKeyhole className="w-4 h-4 text-brand-muted" />
                          <span>Kod Reset Laluan</span>
                        </button>
                      )}

                      {selectedMember.membership_status === "pending" && (
                        <>
                          <button
                            onClick={() => setActionType("approve")}
                            className="py-2 px-3 bg-brand-primary hover:bg-teal-800 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 min-h-[44px]"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Lulus Ahli</span>
                          </button>
                          <button
                            onClick={() => setActionType("reject")}
                            className="py-2 px-3 bg-brand-danger hover:bg-red-800 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 min-h-[44px]"
                          >
                            <X className="w-4 h-4" />
                            <span>Tolak Ahli</span>
                          </button>
                        </>
                      )}

                      {selectedMember.membership_status === "active" && (
                        <>
                          <button
                            onClick={() => setActionType("deactivate")}
                            className="py-2 px-3 bg-brand-danger hover:bg-red-800 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 min-h-[44px]"
                          >
                            <UserX className="w-4 h-4" />
                            <span>Nyahaktifkan</span>
                          </button>
                          {/* Inline radio button for Berpindah / Meninggal Dunia */}
                          <button
                            onClick={() => setActionType("set-status")}
                            className="py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 min-h-[44px]"
                          >
                            <UserX className="w-4 h-4" />
                            <span>Tukar Status</span>
                          </button>
                          <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                            <p className="text-[10px] uppercase font-bold text-amber-700">
                              Status Ahli
                            </p>
                            <div className="flex gap-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`status-${selectedMember.id}`}
                                  value="moved"
                                  checked={setStatusValue === "moved"}
                                  onChange={() => setSetStatusValue("moved")}
                                  className="accent-amber-600 w-4 h-4"
                                />
                                <span className="text-xs font-semibold text-amber-800">
                                  🚚 Berpindah
                                </span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`status-${selectedMember.id}`}
                                  value="deceased"
                                  checked={setStatusValue === "deceased"}
                                  onChange={() => setSetStatusValue("deceased")}
                                  className="accent-gray-600 w-4 h-4"
                                />
                                <span className="text-xs font-semibold text-gray-700">
                                  🕌 Meninggal Dunia
                                </span>
                              </label>
                            </div>
                            <p className="text-[10px] text-amber-600">
                              Profil akan disembunyikan daripada direktori awam
                              secara automatik.
                            </p>
                          </div>
                        </>
                      )}

                      {(selectedMember.membership_status === "inactive" ||
                        selectedMember.membership_status === "rejected" ||
                        selectedMember.membership_status === "moved" ||
                        selectedMember.membership_status === "deceased") && (
                        <button
                          onClick={() => setActionType("activate")}
                          className="py-2 px-3 bg-brand-primary hover:bg-teal-800 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 min-h-[44px] col-span-2"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Aktifkan Semula Keahlian</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

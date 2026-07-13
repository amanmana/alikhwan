import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Lock,
  MapPin,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  FileEdit,
  LogOut,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import Header from "../components/Header.tsx";
import {
  formatIcForDisplay,
  maskIc,
  formatPhoneForDisplay,
} from "../../shared/validation.ts";

interface ProfileProps {
  onLogoutSuccess: () => void;
}

export default function Profile({ onLogoutSuccess }: ProfileProps) {
  const navigate = useNavigate();

  const [member, setMember] = useState<any>(null);
  const [pendingCorrections, setPendingCorrections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile fields state
  const [revealIc, setRevealIc] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Correction request state
  const [editName, setEditName] = useState("");
  const [editIc, setEditIc] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editArea, setEditArea] = useState("");
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [correctionSuccess, setCorrectionSuccess] = useState<string | null>(
    null,
  );
  const [correctionLoading, setCorrectionLoading] = useState(false);

  // Alert message passed from registration
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(
    null,
  );

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/log-masuk");
          return;
        }
        throw new Error(data.error || "Gagal memuatkan maklumat profil.");
      }

      setMember(data.member);
      setPendingCorrections(data.pendingCorrections || []);

      // Prefill edit forms
      setEditName(data.member.fullName);
      setEditIc(formatIcForDisplay(data.member.ic));
      setEditPhone(formatPhoneForDisplay(data.member.phone));
      setEditAddress(data.member.address);
      setEditArea(data.member.generalArea || "");
    } catch (err: any) {
      setError(err.message || "Sambungan terputus. Sila muat semula laman.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Check if redirect has message state
    const regMsg = sessionStorage.getItem("registrationSuccessMessage");
    if (regMsg) {
      setRegistrationMessage(regMsg);
      sessionStorage.removeItem("registrationSuccessMessage");
    }
  }, []);

  const handleDirectoryConsentToggle = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextVal = e.target.checked;
    try {
      const res = await fetch("/api/me/directory-preference", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ directoryVisible: nextVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMember((prev: any) => ({ ...prev, directoryVisible: nextVal }));
    } catch (err: any) {
      alert(err.message || "Gagal mengemaskini tetapan direktori.");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 10) {
      setPasswordError(
        "Kata laluan baru mestilah sekurang-kurangnya 10 aksara.",
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError(
        "Kata laluan baru dan pengesahan kata laluan tidak sepadan.",
      );
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menukar kata laluan.");
      }

      setPasswordSuccess("Kata laluan anda berjaya ditukar.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Sambungan terputus. Sila cuba lagi.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrectionError(null);
    setCorrectionSuccess(null);

    const cleanEditIc = editIc.replace(/[\s-]/g, "");
    const cleanEditPhone = editPhone.trim();

    if (cleanEditIc.length !== 12) {
      setCorrectionError("Nombor IC mestilah mengandungi 12 digit.");
      return;
    }

    setCorrectionLoading(true);

    try {
      const res = await fetch("/api/me/correction-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName:
            editName.trim() !== member.fullName ? editName.trim() : undefined,
          ic: cleanEditIc !== member.ic ? cleanEditIc : undefined,
          phone: cleanEditPhone !== member.phone ? cleanEditPhone : undefined,
          address:
            editAddress.trim() !== member.address
              ? editAddress.trim()
              : undefined,
          generalArea:
            editArea.trim() !== (member.generalArea || "")
              ? editArea.trim()
              : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Gagal menghantar permohonan pembetulan.",
        );
      }

      setCorrectionSuccess(
        "Permohonan pindaan maklumat berjaya dihantar untuk kelulusan admin.",
      );

      // Refresh profile to show pending correction banner
      fetchProfile();
    } catch (err: any) {
      setCorrectionError(err.message || "Ralat semasa menghantar permohonan.");
    } finally {
      setCorrectionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      onLogoutSuccess();
      navigate("/log-masuk");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-brand-primary animate-spin mb-4" />
          <p className="text-sm text-brand-muted">
            Memuatkan maklumat profil...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-md mx-auto w-full px-4 pt-10 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-brand-danger mx-auto" />
          <h2 className="font-bold text-brand-text">Ralat Memuat Profil</h2>
          <p className="text-sm text-brand-muted">{error}</p>
          <button
            onClick={fetchProfile}
            className="px-6 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors"
          >
            Muat Semula
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-6">
      <Header />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 space-y-6">
        {/* Registration notification */}
        {(registrationMessage || member.membershipStatus === "pending") && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-brand-muted">
            <AlertCircle className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-xs text-brand-text">
                Status Keahlian: Menunggu Pengesahan
              </h4>
              <p className="text-[11px] leading-relaxed">
                {registrationMessage ||
                  "Pendaftaran anda telah diterima. Akaun anda sedang menunggu semakan dan kelulusan daripada pentadbir surau."}
              </p>
            </div>
          </div>
        )}

        {/* Pending correction banner */}
        {pendingCorrections.length > 0 && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3 text-brand-muted">
            <RefreshCw className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5 animate-spin" />
            <div className="space-y-1">
              <h4 className="font-bold text-xs text-brand-primary">
                Pindaan Profil Sedang Diproses
              </h4>
              <p className="text-[11px] leading-relaxed">
                Anda telah menghantar permohonan pembetulan maklumat. Pihak
                pentadbir sedang meneliti maklumat baru tersebut.
              </p>
            </div>
          </div>
        )}

        {/* Profile Card Section */}
        <section className="bg-brand-surface border border-gray-200 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="bg-teal-50 text-brand-primary p-2.5 rounded-full">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-brand-text leading-tight">
                  {member.fullName}
                </h3>
                <span className="text-[10px] text-brand-muted">
                  Ahli sejak{" "}
                  {new Date(member.createdAt).toLocaleDateString("ms-MY")}
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                member.membershipStatus === "active"
                  ? "bg-green-50 text-brand-success border-green-200"
                  : "bg-amber-50 text-brand-accent border-amber-200"
              }`}
            >
              {member.membershipStatus === "active"
                ? "Ahli Aktif"
                : "Menunggu Pengesahan"}
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Masked IC with show/reveal toggle */}
            <div className="flex items-center justify-between text-sm">
              <div className="space-y-0.5">
                <span className="text-[10px] text-brand-muted font-bold block uppercase">
                  No. Kad Pengenalan
                </span>
                <span className="font-mono text-brand-text font-medium">
                  {revealIc ? formatIcForDisplay(member.ic) : maskIc(member.ic)}
                </span>
              </div>
              <button
                onClick={() => setRevealIc(!revealIc)}
                className="p-2 text-brand-muted hover:text-brand-primary focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={revealIc ? "Sembunyikan IC" : "Paparkan IC"}
              >
                {revealIc ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Phone */}
            <div className="text-sm">
              <span className="text-[10px] text-brand-muted font-bold block uppercase">
                No. Telefon
              </span>
              <span className="text-brand-text font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand-muted" />
                {formatPhoneForDisplay(member.phone)}
              </span>
            </div>

            {/* Address */}
            <div className="text-sm">
              <span className="text-[10px] text-brand-muted font-bold block uppercase">
                Alamat Rumah
              </span>
              <span className="text-brand-text font-medium flex items-start gap-2 leading-relaxed">
                <MapPin className="w-4 h-4 text-brand-muted mt-0.5 flex-shrink-0" />
                <span>
                  {member.address}{" "}
                  {member.generalArea ? `(${member.generalArea})` : ""}
                </span>
              </span>
            </div>
          </div>
        </section>

        {/* Directory Visibility Consent Widget (Immediate updates) */}
        <section className="bg-brand-surface border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-brand-primary" />
            <h4 className="font-bold text-sm text-brand-text">
              Kebolehnampakan Direktori
            </h4>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="pref-visible"
              type="checkbox"
              checked={member.directoryVisible}
              onChange={handleDirectoryConsentToggle}
              className="w-5 h-5 rounded text-brand-primary focus:ring-brand-primary mt-0.5"
            />
            <div className="space-y-1">
              <label
                htmlFor="pref-visible"
                className="text-xs font-bold text-brand-text block"
              >
                Paparkan nama saya di Direktori Awam
              </label>
              <p className="text-[10px] text-brand-muted leading-relaxed">
                Jika diaktifkan, pelawat luar hanya boleh melihat{" "}
                <strong>Nama Penuh</strong> dan{" "}
                <strong>Kawasan Kejiranan</strong> sahaja. No. IC, Telefon, dan
                Alamat terperinci anda dijamin kekal terpelihara dan
                tersembunyi.
              </p>
            </div>
          </div>
        </section>

        {/* Profile Correction Request section */}
        <section className="bg-brand-surface border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <FileEdit className="w-5 h-5 text-brand-primary" />
            <h4 className="font-bold text-sm text-brand-text">
              Mohon Pindaan Maklumat Profil
            </h4>
          </div>

          <p className="text-[10px] text-brand-muted leading-relaxed">
            Sebarang pindaan nama, No. IC, telefon, atau alamat memerlukan
            semakan pentadbir surau sebelum dikemaskini bagi mengelakkan
            penipuan identiti.
          </p>

          {correctionSuccess && (
            <div className="bg-green-50 border border-green-200 text-brand-success text-xs font-medium p-3 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{correctionSuccess}</span>
            </div>
          )}

          {correctionError && (
            <div className="bg-red-50 border border-red-200 text-brand-danger text-xs font-medium p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{correctionError}</span>
            </div>
          )}

          <form onSubmit={handleCorrectionSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label
                htmlFor="edit-name"
                className="block text-[10px] font-bold text-brand-muted uppercase"
              >
                Nama Penuh
              </label>
              <input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="edit-ic"
                className="block text-[10px] font-bold text-brand-muted uppercase"
              >
                Nombor IC
              </label>
              <input
                id="edit-ic"
                type="text"
                value={editIc}
                onChange={(e) => setEditIc(e.target.value)}
                className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="edit-phone"
                className="block text-[10px] font-bold text-brand-muted uppercase"
              >
                Nombor Telefon
              </label>
              <input
                id="edit-phone"
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="edit-address"
                className="block text-[10px] font-bold text-brand-muted uppercase"
              >
                Alamat Lengkap
              </label>
              <textarea
                id="edit-address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={correctionLoading || pendingCorrections.length > 0}
              className="w-full py-2.5 bg-brand-secondary hover:bg-teal-600 text-white font-bold text-xs rounded-lg shadow transition-all disabled:opacity-50 min-h-[44px]"
            >
              {correctionLoading
                ? "Menghantar..."
                : "Hantar Permohonan Pindaan"}
            </button>
          </form>
        </section>

        {/* Change Password Section */}
        <section className="bg-brand-surface border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <Lock className="w-5 h-5 text-brand-primary" />
            <h4 className="font-bold text-sm text-brand-text">
              Tukar Kata Laluan
            </h4>
          </div>

          {passwordSuccess && (
            <div className="bg-green-50 border border-green-200 text-brand-success text-xs font-medium p-3 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="bg-red-50 border border-red-200 text-brand-danger text-xs font-medium p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3.5">
            <div className="space-y-1">
              <label
                htmlFor="pwd-current"
                className="block text-[10px] font-bold text-brand-muted uppercase"
              >
                Kata Laluan Semasa
              </label>
              <input
                id="pwd-current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="pwd-new"
                className="block text-[10px] font-bold text-brand-muted uppercase"
              >
                Kata Laluan Baru
              </label>
              <input
                id="pwd-new"
                type="password"
                placeholder="Minimum 10 aksara"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="pwd-new-confirm"
                className="block text-[10px] font-bold text-brand-muted uppercase"
              >
                Sahkan Kata Laluan Baru
              </label>
              <input
                id="pwd-new-confirm"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-brand-background border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-2.5 bg-brand-primary hover:bg-teal-800 text-white font-bold text-xs rounded-lg shadow transition-all disabled:opacity-50 min-h-[44px]"
            >
              {passwordLoading ? "Mengemaskini..." : "Simpan Kata Laluan Baru"}
            </button>
          </form>
        </section>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-50 hover:bg-red-100 text-brand-danger font-bold text-sm rounded-xl border border-red-200 transition-all flex items-center justify-center gap-2 min-h-[44px]"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Keluar Dari Akaun</span>
        </button>
      </main>
    </div>
  );
}

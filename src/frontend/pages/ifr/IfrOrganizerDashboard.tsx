import React, { useState, useEffect } from "react";
import { Users, Search, Image as ImageIcon, X, LogIn, ChevronLeft, Info, Download } from "lucide-react";
import { Link } from "react-router-dom";

export default function IfrOrganizerDashboard() {
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [selectedParticipantDetail, setSelectedParticipantDetail] = useState<any>(null);
  const [eventStatus, setEventStatus] = useState("open");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [certReleaseDate, setCertReleaseDate] = useState("2026-10-10");
  const [certReleaseTime, setCertReleaseTime] = useState("10:00");
  const [updatingCert, setUpdatingCert] = useState(false);
  const [autoCloseDate, setAutoCloseDate] = useState("");
  const [autoCloseTime, setAutoCloseTime] = useState("");
  const [updatingAutoClose, setUpdatingAutoClose] = useState(false);
  const [activeTab, setActiveTab] = useState<"peserta" | "tetapan">("peserta");

  const handleViewReceipt = async (receiptData: string) => {
    if (!receiptData.startsWith("GROUP:")) {
      setSelectedReceipt(receiptData);
      return;
    }
    const groupId = receiptData.replace("GROUP:", "");
    try {
      const authCode = localStorage.getItem("ifr_admin_code") || "IFR2026";
      const res = await fetch(`/api/ifr/admin/receipt/${groupId}`, {
        headers: { Authorization: `Bearer ${authCode}` }
      });
      if (!res.ok) {
        alert("Gagal memuat turun resit kumpulan.");
        return;
      }
      const data = await res.json();
      setSelectedReceipt(data.receipt_data);
    } catch (e) {
      alert("Ralat pelayan semasa memuat turun resit.");
    }
  };

  const fetchData = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ifr/admin/participants", {
        headers: {
          Authorization: `Bearer ${code}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants || []);
        setIsAuthenticated(true);
        localStorage.setItem("ifr_admin_passcode", code);
        
        // Fetch event status
        try {
          const statusRes = await fetch("/api/ifr/status");
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setEventStatus(statusData.status || "open");
            if (statusData.autoCloseDate) {
              const d = new Date(statusData.autoCloseDate);
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              const hh = String(d.getHours()).padStart(2, '0');
              const min = String(d.getMinutes()).padStart(2, '0');
              setAutoCloseDate(`${yyyy}-${mm}-${dd}`);
              setAutoCloseTime(`${hh}:${min}`);
            }
          }
        } catch (e) {}

        // Fetch cert status
        try {
          const certRes = await fetch("/api/ifr/cert-status");
          if (certRes.ok) {
            const certData = await certRes.json();
            if (certData.releaseDate) {
              const d = new Date(certData.releaseDate);
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              const hh = String(d.getHours()).padStart(2, '0');
              const min = String(d.getMinutes()).padStart(2, '0');
              setCertReleaseDate(`${yyyy}-${mm}-${dd}`);
              setCertReleaseTime(`${hh}:${min}`);
            }
          }
        } catch (e) {}
      } else {
        setError("Passcode tidak sah. Sila cuba lagi.");
        localStorage.removeItem("ifr_admin_passcode");
      }
    } catch (err) {
      setError("Ralat sambungan ke pelayan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedCode = localStorage.getItem("ifr_admin_passcode");
    if (savedCode) {
      setPasscode(savedCode);
      fetchData(savedCode);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchData(passcode);
  };

  const handleAutoCloseChange = async () => {
    setUpdatingAutoClose(true);
    try {
      let dateTimeStr = "";
      if (autoCloseDate && autoCloseTime) {
        dateTimeStr = `${autoCloseDate}T${autoCloseTime}:00+08:00`;
      }
      
      const res = await fetch("/api/ifr/admin/auto-close-date", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${passcode}`,
        },
        body: JSON.stringify({ closeDate: dateTimeStr }),
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Tetapan tutup pendaftaran automatik berjaya dikemas kini.");
      } else {
        alert(data.error || "Gagal mengemas kini tetapan automatik.");
      }
    } catch (e) {
      alert("Ralat sistem.");
    } finally {
      setUpdatingAutoClose(false);
    }
  };

  const handleCertDateChange = async () => {
    if (!certReleaseDate || !certReleaseTime) {
      alert("Sila isi tarikh dan masa.");
      return;
    }
    
    setUpdatingCert(true);
    try {
      // Create date object assuming local timezone (Kuala Lumpur)
      // We will parse it and then toISOString to send properly formatted ISO
      const dateTimeStr = `${certReleaseDate}T${certReleaseTime}:00+08:00`;
      const res = await fetch("/api/ifr/admin/cert-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${passcode}`,
        },
        body: JSON.stringify({ releaseDate: dateTimeStr }),
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Tarikh pelepasan sijil berjaya dikemas kini.");
      } else {
        alert(data.error || "Gagal mengemas kini tarikh sijil.");
      }
    } catch (e) {
      alert("Ralat sistem.");
    } finally {
      setUpdatingCert(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Adakah anda pasti mahu menukar status kepada: ${newStatus}?`)) return;
    
    setUpdatingStatus(true);
    try {
      const res = await fetch("/api/ifr/admin/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${passcode}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setEventStatus(newStatus);
        alert("Status acara berjaya dikemas kini!");
      } else {
        alert("Gagal mengemas kini status.");
      }
    } catch (err) {
      alert("Ralat semasa menyambung ke pelayan.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleToggleKitClaim = async (id: string, currentStatus: number) => {
    try {
      const newStatus = currentStatus ? false : true; // Toggle boolean
      const res = await fetch(`/api/ifr/admin/participants/${id}/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${passcode}`,
        },
        body: JSON.stringify({ claimed: newStatus }),
      });
      if (res.ok) {
        // Update local state
        setParticipants(prev => prev.map(p => 
          p.id === id ? { ...p, kit_claimed: newStatus ? 1 : 0 } : p
        ));
      } else {
        alert("Gagal mengemas kini status kit.");
      }
    } catch (err) {
      alert("Ralat semasa menyambung ke pelayan.");
    }
  };

  const filteredParticipants = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ic_number.includes(searchQuery) ||
      p.phone.includes(searchQuery)
  );

  const handleDownloadCSV = () => {
    if (filteredParticipants.length === 0) return;
    
    const keyword = prompt("Sila masukkan kata laluan (Magic Keyword) untuk memuat turun semua data sulit peserta:");
    if (keyword !== "durian9247") {
      alert("Kata laluan salah. Muat turun dibatalkan.");
      return;
    }

    const headers = ["No.", "Nama", "No IC", "No Telefon", "Kategori", "Saiz Baju", "Alamat Semasa", "No Tel Waris (Kecemasan)", "Tarikh Daftar", "Status Kit"];
    const csvRows = [headers.join(",")];

    for (let i = 0; i < filteredParticipants.length; i++) {
      const p = filteredParticipants[i];
      const row = [
        `"${i + 1}"`,
        `"${p.name}"`,
        `"${p.ic_number}"`,
        `"${p.phone}"`,
        `"${p.category}"`,
        `"${p.shirt_size}"`,
        `"${(p.address || "").replace(/"/g, '""')}"`,
        `"${p.emergency_contact_phone || ""}"`,
        `"${new Date(p.created_at.includes('T') ? p.created_at : p.created_at.replace(' ', 'T') + 'Z').toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}"`,
        `"${p.kit_claimed ? 'Telah Dituntut' : 'Belum'}"`
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Senarai_Peserta_IFR_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPrinter = () => {
    if (filteredParticipants.length === 0) return;

    // Format Khas Pencetak
    const headers = ["No.", "Nama", "Kategori", "Saiz Baju", "Alamat Semasa"];
    const csvRows = [headers.join(",")];

    for (let i = 0; i < filteredParticipants.length; i++) {
      const p = filteredParticipants[i];
      const row = [
        `"${i + 1}"`,
        `"${p.name}"`,
        `"${p.category}"`,
        `"${p.shirt_size}"`,
        `"${(p.address || "").replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // User requested .xls, a .csv file is fully supported by Excel.
    link.setAttribute("download", `Senarai_Pencetak_IFR_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadRefundCSV = () => {
    const refundListStatic = [
      { name: "Mohd Fadzlan Bin Kadir", ic: "830911-01-5389", category: "Dewasa" },
      { name: "Muhammad Iyas Bin Mohd Fadzlan", ic: "170911-10-1323", category: "Kanak-Kanak" },
      { name: "Muhammad Bilal Bin Mohd Fadzlan", ic: "140718-10-1527", category: "Kanak-Kanak" },
      { name: "Hana Nur Imanina Binti Mohd Fadzlan", ic: "130305-10-0578", category: "Belia" },
      { name: "Marilah binti Sulaiman", ic: "731025-03-5493", category: "Dewasa" },
      { name: "Muhammad Amerhakim bin Sukry", ic: "030709-14-0471", category: "Belia" },
      { name: "Muhamad Aiman Haziq bin Sukry", ic: "130222-14-0873", category: "Belia" },
      { name: "Kadir Bin Muda", ic: "550526-11-5037", category: "Veteran" },
      { name: "Airis Raihana Binti Ahmad Hamili", ic: "120611-10-0972", category: "Belia" },
      { name: "ADRIANA QAISARA BINTI AHMAD HAMILI", ic: "090506-10-1098", category: "Belia" },
      { name: "Alesya Umairah Binti Ahmad Hamili", ic: "061126-10-0306", category: "Belia" },
      { name: "HASINAH MARIAM HABIBU RAHMAN", ic: "770604-05-5506", category: "Dewasa" },
      { name: "MOHAMED FAREQ BIN MOHAMED SUBUHAN", ic: "091223-14-1377", category: "Belia" },
      { name: "NUR AIN SOFEA BINTI NURARIFFUDDIN", ic: "100808-03-0420", category: "Dewasa" },
      { name: "Syarazi Kamarudi", ic: "760420-09-5045", category: "Dewasa" },
      { name: "Noor Aida Idris", ic: "760608-08-5922", category: "Dewasa" },
      { name: "Hamsah Bin Abustang", ic: "739628-12-5613", category: "Veteran" },
    ];

    const headers = ["No.", "Nama Peserta", "No. IC", "Kategori", "Jumlah Refund"];
    const csvRows = [headers.join(",")];

    refundListStatic.forEach((item, index) => {
      const cleanTargetIc = item.ic.replace(/\D/g, "");
      const dbMatch = participants.find(
        (p) => (p.ic_number || "").replace(/\D/g, "") === cleanTargetIc
      );

      const name = dbMatch ? dbMatch.name : item.name;
      const category = dbMatch ? dbMatch.category : item.category;
      const rawIc = dbMatch ? dbMatch.ic_number : item.ic;
      const digits = rawIc.replace(/\D/g, "");
      const last4 = digits.length >= 4 ? digits.slice(-4) : "0000";
      const maskedIc = `****-**-${last4}`;

      const row = [
        `"${index + 1}"`,
        `"${name}"`,
        `"${maskedIc}"`,
        `"${category}"`,
        `"RM 20.00"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Senarai_Refund_RM20_IFR_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <Link to="/" className="absolute top-8 left-8 text-slate-500 hover:text-slate-700 flex items-center">
          <ChevronLeft className="w-5 h-5 mr-1" /> Kembali ke Laman Utama
        </Link>
        
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="text-center mb-8">
            <div className="bg-[#8cc63f]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-[#8cc63f]" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Penganjur IFR</h1>
            <p className="text-slate-500 mt-2">Sila masukkan passcode penganjur.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f]"
                placeholder="Passcode"
                required
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8cc63f] hover:bg-[#7abd36] text-[#0A192F] font-bold py-3 rounded-lg shadow-md transition-all flex justify-center items-center"
            >
              {loading ? "Menyemak..." : "Log Masuk"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard Penganjur IFR</h1>
            <p className="text-slate-500">Ikhwan Fun Run 3.0</p>
          </div>
          <button 
            onClick={() => {
              setIsAuthenticated(false);
              setPasscode("");
              localStorage.removeItem("ifr_admin_passcode");
            }}
            className="text-slate-500 hover:text-slate-700 font-medium"
          >
            Log Keluar
          </button>
        </div>


        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'peserta' ? 'text-[#8cc63f]' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('peserta')}
          >
            Senarai Peserta
            {activeTab === 'peserta' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#8cc63f]" />}
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'tetapan' ? 'text-[#8cc63f]' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('tetapan')}
          >
            Tetapan Sistem
            {activeTab === 'tetapan' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#8cc63f]" />}
          </button>
        </div>

        {activeTab === 'tetapan' && (
          <>
            {/* Status Control */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Kawalan Status Acara</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={eventStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] min-w-[200px]"
            >
              <option value="open">Buka Pendaftaran (Open)</option>
              <option value="closed_registration">Tutup Pendaftaran (Closed)</option>
              <option value="event_ended">Acara Tamat (Event Ended)</option>
            </select>
            {updatingStatus && <span className="text-sm text-slate-500 self-center">Menyimpan...</span>}
          </div>
          <p className="text-sm text-slate-500 mt-3">
            {eventStatus === 'open' && "Pendaftaran dibuka seperti biasa."}
            {eventStatus === 'closed_registration' && "Pendaftaran ditutup. Borang akan disembunyikan pada pandangan awam."}
            {eventStatus === 'event_ended' && "Acara ditutup sepenuhnya dengan mesej penghargaan."}
          </p>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-md font-bold text-slate-800 mb-3">Tutup Pendaftaran Automatik (Pilihan)</h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tarikh</label>
                <input
                  type="date"
                  value={autoCloseDate}
                  onChange={(e) => setAutoCloseDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] min-w-[200px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Masa</label>
                <input
                  type="time"
                  value={autoCloseTime}
                  onChange={(e) => setAutoCloseTime(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] min-w-[120px]"
                />
              </div>
              <button
                onClick={handleAutoCloseChange}
                disabled={updatingAutoClose}
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium transition-colors h-[42px] disabled:opacity-50"
              >
                {updatingAutoClose ? "Menyimpan..." : "Simpan Tetapan"}
              </button>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              Kosongkan tarikh jika anda mahu mengawal status secara manual sahaja.
            </p>
          </div>
        </div>

        {/* Certificate Control */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Tetapan Sijil Digital</h2>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tarikh Boleh Dimuat Turun</label>
              <input
                type="date"
                value={certReleaseDate}
                onChange={(e) => setCertReleaseDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] min-w-[200px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Masa</label>
              <input
                type="time"
                value={certReleaseTime}
                onChange={(e) => setCertReleaseTime(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] min-w-[120px]"
              />
            </div>
            <button
              onClick={handleCertDateChange}
              disabled={updatingCert}
              className="bg-[#0A192F] hover:bg-[#112a50] text-white px-6 py-2 rounded-lg font-medium transition-colors h-[42px] disabled:opacity-50"
            >
              {updatingCert ? "Menyimpan..." : "Simpan Tetapan"}
            </button>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            Sijil hanya boleh dimuat turun oleh peserta selepas tarikh dan waktu yang ditetapkan di atas.
          </p>
        </div>
          </>
        )}

        {activeTab === 'peserta' && (
          <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 flex items-center">
            <div className="bg-blue-100 p-4 rounded-lg mr-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Jumlah Peserta</p>
              <h2 className="text-3xl font-bold text-slate-900">{participants.length}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-slate-800">Senarai Peserta</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, IC atau no tel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8cc63f] w-64"
                />
              </div>
              <button 
                onClick={handleDownloadCSV}
                disabled={filteredParticipants.length === 0}
                className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Muat Turun Semua Data (CSV)"
              >
                <Download className="w-4 h-4" />
                <span>Semua Data</span>
              </button>
              <button 
                onClick={handleDownloadPrinter}
                disabled={filteredParticipants.length === 0}
                className="flex items-center gap-2 bg-[#8cc63f] hover:bg-[#7ab135] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Muat Turun Khas Untuk Pencetak Baju (Excel/CSV)"
              >
                <Download className="w-4 h-4" />
                <span>Untuk Pencetak</span>
              </button>
              <button 
                onClick={handleDownloadRefundCSV}
                disabled={participants.length === 0}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Muat Turun Senarai Refund (RM20) CSV"
              >
                <Download className="w-4 h-4" />
                <span>Senarai Refund (RM20)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm border-b border-slate-200">
                  <th className="p-4 font-semibold">Nama</th>
                  <th className="p-4 font-semibold">No IC</th>
                  <th className="p-4 font-semibold">No Telefon</th>
                  <th className="p-4 font-semibold">Kategori</th>
                  <th className="p-4 font-semibold">Saiz Baju</th>
                  <th className="p-4 font-semibold text-center">Tuntutan Kit</th>
                  <th className="p-4 font-semibold text-center">Resit</th>
                  <th className="p-4 font-semibold text-center">Butiran</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.length > 0 ? (
                  filteredParticipants.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm">
                      <td className="p-4 font-medium text-slate-900">{p.name}</td>
                      <td className="p-4 text-slate-600">{p.ic_number}</td>
                      <td className="p-4 text-slate-600">{p.phone}</td>
                      <td className="p-4">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-700">{p.shirt_size}</span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleKitClaim(p.id, p.kit_claimed)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                            p.kit_claimed 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300' 
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300'
                          }`}
                        >
                          {p.kit_claimed ? 'Dituntut' : 'Belum'}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        {p.receipt_data ? (
                          <button
                            onClick={() => handleViewReceipt(p.receipt_data)}
                            className="text-[#8cc63f] hover:text-[#7abd36] p-2 rounded-full hover:bg-slate-100 transition-colors inline-block"
                            title="Lihat Resit"
                          >
                            <ImageIcon className="w-5 h-5 mx-auto" />
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedParticipantDetail(p)}
                          className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-slate-100 transition-colors inline-block"
                          title="Lihat Butiran Lanjut"
                        >
                          <Info className="w-5 h-5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Tiada rekod dijumpai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900">Paparan Resit</h3>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex justify-center bg-slate-100">
              <img 
                src={selectedReceipt} 
                alt="Resit Pembayaran" 
                className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Participant Detail Modal */}
      {selectedParticipantDetail && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900">Maklumat Lanjut Peserta</h3>
              <button 
                onClick={() => setSelectedParticipantDetail(null)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-auto bg-white space-y-4">
              <div>
                <p className="text-sm text-slate-500 font-medium">Nama Peserta</p>
                <p className="text-slate-900 font-semibold">{selectedParticipantDetail.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">No. Kad Pengenalan</p>
                <p className="text-slate-900">{selectedParticipantDetail.ic_number}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Alamat Semasa</p>
                <p className="text-slate-900 whitespace-pre-wrap">{selectedParticipantDetail.address || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">No. Tel Waris (Kecemasan)</p>
                <p className="text-slate-900 font-medium text-red-600">{selectedParticipantDetail.emergency_contact_phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Tarikh & Waktu Daftar</p>
                <p className="text-slate-900">
                  {new Date(
                    selectedParticipantDetail.created_at.includes('T') 
                      ? selectedParticipantDetail.created_at 
                      : selectedParticipantDetail.created_at.replace(' ', 'T') + 'Z'
                  ).toLocaleDateString("ms-MY", {
                    timeZone: "Asia/Kuala_Lumpur",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

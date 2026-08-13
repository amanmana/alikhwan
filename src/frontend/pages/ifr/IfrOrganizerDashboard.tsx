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

  const filteredParticipants = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ic_number.includes(searchQuery) ||
      p.phone.includes(searchQuery)
  );

  const handleDownloadCSV = () => {
    if (filteredParticipants.length === 0) return;

    const headers = ["Nama", "No IC", "No Telefon", "Kategori", "Saiz Baju", "Alamat Semasa", "No Tel Waris (Kecemasan)", "Tarikh Daftar"];
    const csvRows = [headers.join(",")];

    for (const p of filteredParticipants) {
      const row = [
        `"${p.name}"`,
        `"${p.ic_number}"`,
        `"${p.phone}"`,
        `"${p.category}"`,
        `"${p.shirt_size}"`,
        `"${(p.address || "").replace(/"/g, '""')}"`,
        `"${p.emergency_contact_phone || ""}"`,
        `"${new Date(p.created_at.includes('T') ? p.created_at : p.created_at.replace(' ', 'T') + 'Z').toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}"`
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
                title="Muat Turun CSV"
              >
                <Download className="w-4 h-4" />
                <span>Muat Turun</span>
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
                        {p.receipt_data ? (
                          <button
                            onClick={() => setSelectedReceipt(p.receipt_data)}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

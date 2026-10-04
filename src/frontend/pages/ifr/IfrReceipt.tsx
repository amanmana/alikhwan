import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { CheckCircle, Printer, ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { isRefundEligibleIc } from "../../utils/ifrRefund";

export default function IfrReceipt() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<any>(location.state || null);
  const [loading, setLoading] = useState(!location.state);

  useEffect(() => {
    if (!participant && id) {
      fetch(`/api/ifr/participant/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.participant) {
            setParticipant(data.participant);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id, participant]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-[#8cc63f] text-xl">Memuatkan...</div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-4">Maklumat tidak dijumpai</h2>
        <button
          onClick={() => navigate("/ifr")}
          className="text-[#8cc63f] hover:underline flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke pendaftaran
        </button>
      </div>
    );
  }

  const isRefundEligible = isRefundEligibleIc(participant.ic_number || participant.ic);

  // URL for the QR code to point to the participant info page (for organizer to scan)
  const qrUrl = `${window.location.origin}/ifr/peserta/${id}`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans py-12 px-4 print:bg-white print:py-0 print:px-0">
      
      {/* Hide controls when printing */}
      <div className="max-w-md mx-auto mb-6 flex justify-between items-center print:hidden">
        <button
          onClick={() => navigate("/ifr")}
          className="text-slate-500 hover:text-slate-800 flex items-center font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </button>
        <button
          onClick={handlePrint}
          className="bg-[#0A192F] hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium flex items-center shadow-md transition-colors"
        >
          <Printer className="w-4 h-4 mr-2" /> Cetak Resit
        </button>
      </div>

      <div className="max-w-md mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 print:shadow-none print:border-none print:max-w-full">
        {/* Header */}
        <div className={`${isRefundEligible ? 'bg-[#980002]' : 'bg-[#0A192F]'} px-8 py-8 text-center text-white relative transition-colors`}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <div className={`w-16 h-16 ${isRefundEligible ? 'bg-white text-[#980002]' : 'bg-[#8cc63f] text-[#0A192F]'} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider mb-1">Pendaftaran Berjaya!</h1>
          <p className="text-slate-200 font-medium text-sm">Ikhwan Fun Run 3.0</p>

          {isRefundEligible && (
            <div className="mt-4 bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl p-3 text-center shadow-md">
              <p className="font-extrabold text-yellow-300 text-sm sm:text-base leading-snug">
                Sila tuntut wang RM20 dari penganjur semasa kutipan baju
              </p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-8">
          <div className="text-center mb-8">
            <p className="text-slate-500 text-sm font-semibold tracking-wide uppercase mb-2">Imbas untuk maklumat / kutipan baju</p>
            <div className="inline-block p-4 bg-white border-4 border-slate-100 rounded-2xl shadow-sm">
              <QRCodeSVG 
                value={qrUrl} 
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#0A192F"}
                level={"M"}
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-slate-400 mt-3 font-mono break-all">{id}</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-slate-100 pb-3">
              <span className="text-slate-500 text-sm font-medium">Nama Peserta</span>
              <span className="font-bold text-slate-800 text-right">{participant.name}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-100 pb-3">
              <span className="text-slate-500 text-sm font-medium">Kategori</span>
              <span className="font-bold text-slate-800 text-right">{participant.category}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-100 pb-3">
              <span className="text-slate-500 text-sm font-medium">Saiz Baju</span>
              <span className="font-black text-xl text-[#8cc63f] text-right">{participant.shirt_size}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium">
            Sila simpan resit ini atau tangkap layar (screenshot) sebagai bukti pendaftaran. Tunjukkan kod QR di atas semasa menuntut baju (Race Kit).
          </p>
        </div>
      </div>
    </div>
  );
}

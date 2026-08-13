import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User, Tag, Shirt, Clock, AlertCircle } from "lucide-react";

export default function IfrParticipantInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/ifr/participant/${id}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Peserta tidak dijumpai.");
          }
          return res.json();
        })
        .then((data) => {
          if (data.participant) {
            setParticipant(data.participant);
          } else {
            setError(data.error || "Peserta tidak dijumpai.");
          }
        })
        .catch((err) => {
          setError(err.message || "Ralat mendapatkan maklumat.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8cc63f]"></div>
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Maklumat Tidak Dijumpai</h2>
        <p className="text-slate-400 mb-8 max-w-sm">{error || "Kod QR ini mungkin tidak sah atau rekod telah dipadam."}</p>
        <button
          onClick={() => navigate("/ifr")}
          className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Kembali ke Laman Utama
        </button>
      </div>
    );
  }

  const formattedDate = new Date(participant.created_at).toLocaleDateString("ms-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="min-h-screen bg-[#0A192F] text-white py-12 px-4 font-sans">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[#8cc63f] uppercase tracking-wider mb-2">Semakan Peserta</h1>
          <p className="text-slate-400 font-medium">Ikhwan Fun Run 3.0</p>
        </div>

        <div className="bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
          <div className="p-8 space-y-6">
            
            {/* Name */}
            <div className="flex items-start">
              <div className="bg-slate-700/50 p-3 rounded-xl mr-4 shrink-0">
                <User className="w-6 h-6 text-[#8cc63f]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-1">Nama Peserta</p>
                <p className="font-bold text-xl leading-tight">{participant.name}</p>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-start">
              <div className="bg-slate-700/50 p-3 rounded-xl mr-4 shrink-0">
                <Tag className="w-6 h-6 text-[#8cc63f]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-1">Kategori</p>
                <p className="font-bold text-lg text-slate-200">{participant.category}</p>
              </div>
            </div>

            {/* Shirt Size */}
            <div className="flex items-start">
              <div className="bg-[#8cc63f]/10 p-3 rounded-xl mr-4 shrink-0 border border-[#8cc63f]/30">
                <Shirt className="w-6 h-6 text-[#8cc63f]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-1">Saiz Baju (Race Kit)</p>
                <p className="font-black text-3xl text-[#8cc63f] drop-shadow-sm">{participant.shirt_size}</p>
              </div>
            </div>
            
            {/* Date */}
            <div className="flex items-start pt-6 border-t border-slate-700">
              <div className="bg-slate-700/30 p-2 rounded-lg mr-4 shrink-0">
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-0.5">Tarikh Daftar</p>
                <p className="text-sm text-slate-400 font-mono">{formattedDate}</p>
              </div>
            </div>

          </div>
          
          <div className="bg-slate-900 px-6 py-4 border-t border-slate-700 text-center">
             <p className="text-xs text-slate-500 flex items-center justify-center">
               <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
               Rekod Sah (Disahkan)
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

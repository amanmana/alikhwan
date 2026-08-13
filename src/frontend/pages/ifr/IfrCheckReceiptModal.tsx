import React, { useState } from "react";
import { X, Search, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface IfrCheckReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IfrCheckReceiptModal({ isOpen, onClose }: IfrCheckReceiptModalProps) {
  const [icNumber, setIcNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 12) value = value.slice(0, 12);
    
    if (value.length > 8) {
      value = `${value.slice(0, 6)}-${value.slice(6, 8)}-${value.slice(8)}`;
    } else if (value.length > 6) {
      value = `${value.slice(0, 6)}-${value.slice(6)}`;
    }
    
    setIcNumber(value);
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (icNumber.replace(/\D/g, "").length !== 12) {
      setError("Sila masukkan 12 digit No. Kad Pengenalan dengan betul.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/ifr/check-receipt?ic_number=${encodeURIComponent(icNumber)}`);
      const data = await response.json();

      if (response.ok && data.participantId) {
        // Navigate to receipt page and close modal
        onClose();
        navigate(`/ifr/resit/${data.participantId}`);
      } else {
        setError(data.error || "Rekod tidak dijumpai.");
      }
    } catch (err) {
      setError("Ralat sambungan. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        
        <div className="bg-[#0A192F] p-6 text-white flex justify-between items-center">
          <h3 className="text-lg font-bold">Semak & Dapatkan Resit</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-600 mb-6 text-sm">
            Masukkan No. Kad Pengenalan anda untuk menyemak status pendaftaran dan mencetak semula resit / kod QR pendaftaran.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-600 p-3 rounded-lg mb-5 flex items-start text-sm">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleCheck}>
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                No. Kad Pengenalan
              </label>
              <input
                type="text"
                required
                value={icNumber}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all"
                placeholder="Cth: 900101-10-1234"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !icNumber}
              className="w-full bg-[#8cc63f] hover:bg-[#7ab133] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A192F] font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-colors shadow-md"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0A192F]"></div>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Semak Rekod
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

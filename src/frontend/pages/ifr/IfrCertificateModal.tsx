import React, { useState, useRef, useEffect } from "react";
import { X, Search, AlertCircle, Download, FileText, Image as ImageIcon, ChevronLeft } from "lucide-react";
import { jsPDF } from "jspdf";

interface IfrCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IfrCertificateModal({ isOpen, onClose }: IfrCertificateModalProps) {
  const [icNumber, setIcNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  const [certReleaseDate, setCertReleaseDate] = useState<Date>(new Date("2026-10-10T10:00:00+08:00"));
  const [isReleased, setIsReleased] = useState<boolean>(false);
  const [isCheckingDate, setIsCheckingDate] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setIsCheckingDate(true);
      fetch("/api/ifr/cert-status")
        .then(res => res.json())
        .then(data => {
          if (data.releaseDate) {
            const dateObj = new Date(data.releaseDate);
            setCertReleaseDate(dateObj);
            setIsReleased(new Date() >= dateObj || localStorage.getItem("DEBUG_CERT") === "true");
          }
        })
        .catch(err => console.error("Failed to fetch cert status", err))
        .finally(() => setIsCheckingDate(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (participantName && canvasRef.current) {
      drawCertificate(participantName);
    }
  }, [participantName]);

  const drawCertificate = (name: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = "/sijil.webp";
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw background
      ctx.drawImage(img, 0, 0);

      // Setup text style
      ctx.font = "bold 60px Arial";
      ctx.fillStyle = "#0A192F";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Draw name in the center (adjust Y coordinate based on template design)
      // Looking at the template, the name goes right below "Dengan ini diperakui bahawa"
      // Assuming a 2000x1414 standard size, Y=650 might be appropriate. 
      // We will use standard center X, and calculate Y around 48% of height.
      const nameY = canvas.height * 0.48; 
      
      // Add text shadow or just solid text
      ctx.fillText(name.toUpperCase(), canvas.width / 2, nameY);
      
      setIsCanvasReady(true);
    };
    img.onerror = () => {
      setError("Gagal memuatkan templat sijil. Sila hubungi urusetia.");
    };
  };

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
    setParticipantName(null);
    setIsCanvasReady(false);
    
    if (icNumber.replace(/\D/g, "").length !== 12) {
      setError("Sila masukkan 12 digit No. Kad Pengenalan dengan betul.");
      return;
    }

    setLoading(true);
    try {
      // 1. Get participant ID from IC
      const response = await fetch(`/api/ifr/check-receipt?ic_number=${encodeURIComponent(icNumber)}`);
      const data = await response.json();

      if (response.ok && data.participantId) {
        // 2. Get participant details using ID
        const detailRes = await fetch(`/api/ifr/participant/${data.participantId}`);
        const detailData = await detailRes.json();
        
        if (detailRes.ok && detailData.participant) {
          setParticipantName(detailData.participant.name);
        } else {
          setError(detailData.error || "Rekod peserta tidak lengkap.");
        }
      } else {
        setError(data.error || "Rekod tidak dijumpai.");
      }
    } catch (err) {
      setError("Ralat sambungan. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `Sijil_IFR_${icNumber}.png`;
    link.href = dataUrl;
    link.click();
  };

  const downloadPDF = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Create A4 landscape PDF
    // 297 x 210 mm
    const pdf = new jsPDF("landscape", "mm", "a4");
    
    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    
    // Calculate dimensions to fit A4 exactly
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Sijil_IFR_${icNumber}.pdf`);
  };

  const resetForm = () => {
    setParticipantName(null);
    setIsCanvasReady(false);
    setIcNumber("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${participantName ? 'max-w-4xl' : 'max-w-md'} overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 transition-all`}>
        
        <div className="bg-[#0A192F] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            {participantName && (
              <button onClick={resetForm} className="hover:bg-white/10 p-1 rounded-full transition-colors mr-1">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="text-lg font-bold">Sijil Penyertaan Digital</h3>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8">
          {isCheckingDate ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8cc63f] mx-auto mb-4"></div>
              <p className="text-slate-500">Menyemak status sijil...</p>
            </div>
          ) : !isReleased ? (
            <div className="text-center py-8">
              <div className="bg-amber-100 text-amber-700 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Sijil Belum Boleh Dimuat Turun</h4>
              <p className="text-slate-600 mb-6">
                E-Sijil hanya boleh dimuat turun bermula <strong className="text-slate-800">{certReleaseDate.toLocaleString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' })}</strong>. Harap maklum.
              </p>
              <button
                onClick={handleClose}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          ) : !participantName ? (
            <div className="animate-in fade-in">
              <p className="text-slate-600 mb-6 text-sm">
                Masukkan No. Kad Pengenalan anda untuk menyemak dan memuat turun e-Sijil penyertaan Ikhwan Fun Run 3.0.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-600 p-3 rounded-lg mb-5 flex items-start text-sm">
                  <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleCheck}>
                <div className="mb-6">
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
                      Semak Rekod Sijil
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              
              <div className="text-center mb-6">
                <h4 className="text-xl font-bold text-slate-800">Sijil Dijumpai!</h4>
                <p className="text-slate-500">Tahniah, {participantName}</p>
              </div>

              {/* Canvas Container */}
              <div className="w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 mb-6 flex justify-center items-center p-2">
                <canvas 
                  ref={canvasRef} 
                  className="w-full h-auto max-w-full object-contain drop-shadow-md rounded"
                  style={{ maxHeight: '60vh' }}
                />
                {!isCanvasReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8cc63f]"></div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={downloadImage}
                  disabled={!isCanvasReady}
                  className="flex items-center justify-center py-3 px-4 bg-white border-2 border-[#8cc63f] text-[#0A192F] font-bold rounded-xl hover:bg-[#8cc63f]/10 transition-colors disabled:opacity-50"
                >
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Muat Turun (PNG)
                </button>
                <button
                  onClick={downloadPDF}
                  disabled={!isCanvasReady}
                  className="flex items-center justify-center py-3 px-4 bg-[#8cc63f] hover:bg-[#7ab133] text-[#0A192F] font-bold rounded-xl transition-colors shadow-md disabled:opacity-50"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Muat Turun (PDF)
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

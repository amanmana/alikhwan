import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CreditCard, Upload, CheckCircle, AlertCircle, Search } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import IfrCheckReceiptModal from "./IfrCheckReceiptModal";

const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // 10 Oktober 2026, 07:00 AM
    const targetDate = new Date("2026-10-10T07:00:00+08:00").getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000); // update every second

    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="bg-[#0b101e] text-white rounded-[2rem] inline-flex items-center justify-center px-2 py-2 md:px-4 md:py-3 shadow-xl">
      <div className="flex flex-col items-center px-2 md:px-5">
        <span className="text-base md:text-2xl font-bold leading-none mb-1">{String(timeLeft.days).padStart(2, '0')}</span>
        <span className="text-[7px] md:text-[10px] tracking-widest text-slate-300 uppercase font-medium">Days</span>
      </div>
      <div className="w-px h-6 bg-slate-600 mx-1"></div>
      <div className="flex flex-col items-center px-2 md:px-5">
        <span className="text-base md:text-2xl font-bold leading-none mb-1">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-[7px] md:text-[10px] tracking-widest text-slate-300 uppercase font-medium">Hours</span>
      </div>
      <div className="w-px h-6 bg-slate-600 mx-1"></div>
      <div className="flex flex-col items-center px-2 md:px-5">
        <span className="text-base md:text-2xl font-bold leading-none mb-1">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-[7px] md:text-[10px] tracking-widest text-slate-300 uppercase font-medium">Minutes</span>
      </div>
      <div className="w-px h-6 bg-slate-600 mx-1"></div>
      <div className="flex flex-col items-center px-2 md:px-5">
        <span className="text-base md:text-2xl font-bold leading-none mb-1 text-[#8cc63f]">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-[7px] md:text-[10px] tracking-widest text-[#8cc63f] uppercase font-medium">Seconds</span>
      </div>
    </div>
  );
};

const TABS = [
  { id: 'borang', label: 'Borang Penyertaan' },
  { id: 'fees', label: 'Yuran Penyertaan' },
  { id: 'entitlements', label: 'Barangan Peserta' },
  { id: 'prizes', label: 'Hadiah' },
  { id: 'course', label: 'Laluan Larian' },
  { id: 'tnc', label: 'Terma & Syarat' },
  { id: 'contact', label: 'Maklumat Penganjur' }
];

export default function IfrRegistration() {
  const navigate = useNavigate();
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("borang");
  const [formData, setFormData] = useState({
    name: "",
    ic_number: "",
    phone: "",
    category: "",
    address: "",
    shirt_size: "",
    emergency_contact_phone: "",
  });
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    let { name, value } = e.target;
    
    if (name === "ic_number") {
      value = value.replace(/\D/g, "");
      if (value.length > 12) value = value.slice(0, 12);
      
      if (value.length > 8) {
        value = `${value.slice(0, 6)}-${value.slice(6, 8)}-${value.slice(8)}`;
      } else if (value.length > 6) {
        value = `${value.slice(0, 6)}-${value.slice(6)}`;
      }
    } else if (name === "phone" || name === "emergency_contact_phone") {
      value = value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);
      
      if (value.length > 3) {
        value = `${value.slice(0, 3)}-${value.slice(3)}`;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resizeImageAndConvertBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.7)); // compress
          } else {
            reject(new Error("Canvas not supported"));
          }
        };
        img.onerror = () => reject(new Error("Gagal memuatkan imej."));
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Sila muat naik fail imej sahaja (JPEG/PNG).");
        return;
      }
      try {
        const base64 = await resizeImageAndConvertBase64(file);
        setReceiptBase64(base64);
        setPreviewUrl(base64);
        setError(null);
      } catch (err) {
        setError("Gagal memproses gambar. Sila cuba lagi.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!receiptBase64) {
      setError("Sila muat naik resit bayaran pengesahan anda.");
      return;
    }

    setIsSubmitting(true);
    const participantId = uuidv4();
    const payload = {
      id: participantId,
      ...formData,
      receipt_data: receiptBase64,
    };

    try {
      const response = await fetch("/api/ifr/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Navigate to receipt/success page with participant ID
        navigate(`/ifr/resit/${participantId}`, {
          state: {
            participantId,
            name: formData.name,
            category: formData.category,
            shirt_size: formData.shirt_size,
          },
        });
      } else {
        setError(data.error || "Ralat berlaku ketika pendaftaran.");
      }
    } catch (err) {
      setError("Sistem tidak dapat dihubungi. Sila cuba sebentar lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Header Banner (Hero Image) */}
      <div className="w-full bg-[#0A192F] shadow-lg mb-8">
        <div className="max-w-5xl mx-auto relative">
          <img 
            src="/hero.webp" 
            alt="Ikhwan Fun Run 3.0" 
            className="w-full h-auto object-cover"
            onError={(e) => {
              // Fallback banner jika gambar tiada
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = `
                <div class="bg-[#8cc63f] px-6 py-10 text-center relative overflow-hidden">
                  <div class="absolute inset-0 opacity-20" style="background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"></div>
                  <div class="relative z-10">
                    <h1 class="text-3xl md:text-5xl font-black text-[#0A192F] uppercase italic drop-shadow-md">Ikhwan Fun Run 3.0</h1>
                    <p class="mt-2 text-[#0A192F] font-semibold md:text-xl">Sila simpan poster anda sebagai 'public/hero.png'</p>
                  </div>
                </div>
              `;
            }}
          />
          
          {/* Floating Countdown Timer Overlay */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center md:right-auto md:justify-start md:bottom-6 md:left-6 z-10 w-full md:w-auto">
            <CountdownTimer />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        <div className="flex flex-col md:flex-row gap-5">
          
          {/* Left Navigation Menu */}
          <div className="w-full md:w-52 shrink-0">
             <div className="sticky top-8 rounded-2xl overflow-hidden shadow-xl border border-slate-200">
                <div className="bg-[#0A192F] text-white font-bold py-3 px-4 text-center text-base">
                  Maklumat Acara
                </div>
                 <div className="flex flex-col bg-white">
                    {TABS.map(tab => (
                       <button 
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`py-3 px-4 text-center text-sm transition-colors border-b border-slate-100 ${activeTab === tab.id ? 'bg-[#8cc63f] font-bold text-[#0A192F]' : 'text-slate-600 hover:bg-slate-50'}`}
                       >
                          {tab.label}
                       </button>
                    ))}
                 </div>
                 <div className="bg-slate-100 p-4">
                    <button
                      onClick={() => setIsCheckModalOpen(true)}
                      className="w-full text-[#0A192F] bg-slate-200 hover:bg-slate-300 px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center whitespace-nowrap"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Resit Penyertaan
                    </button>
                 </div>
              </div>
           </div>

          {/* Right Content Area */}
          <div className="w-full md:flex-1 min-w-0">
             {activeTab === 'borang' ? (
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-200">
                  <div className="mb-6 border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Borang Penyertaan
            </h2>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 flex items-start">
              <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nama */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nama Peserta
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all"
                  placeholder="Nama penuh mengikut kad pengenalan"
                />
              </div>

              {/* No I/C */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  No. Kad Pengenalan
                </label>
                <input
                  type="text"
                  name="ic_number"
                  required
                  value={formData.ic_number}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all"
                  placeholder="Cth: 900101-10-1234"
                />
              </div>

              {/* No Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  No. Telefon
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all"
                  placeholder="Cth: 0123456789"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Kategori
                </label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all"
                >
                  <option value="" disabled>Pilih Kategori</option>
                  <option value="Kanak-Kanak">Kanak-Kanak</option>
                  <option value="Belia">Belia</option>
                  <option value="Dewasa">Dewasa</option>
                  <option value="Veteran">Veteran</option>
                </select>
              </div>

              {/* Shirt Size */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Saiz Baju
                </label>
                <select
                  name="shirt_size"
                  required
                  value={formData.shirt_size}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all"
                >
                  <option value="" disabled>Pilih Saiz</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="2XL">2XL</option>
                  <option value="3XL">3XL</option>
                  <option value="4XL">4XL</option>
                </select>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alamat Semasa
                </label>
                <textarea
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all"
                  placeholder="Alamat tempat tinggal"
                ></textarea>
              </div>

              {/* Emergency Contact */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  No Tel Waris (Kecemasan)
                </label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  required
                  value={formData.emergency_contact_phone}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all"
                  placeholder="Hubungi jika kecemasan"
                />
              </div>
            </div>

            {/* Payment Info Section */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <CreditCard className="w-6 h-6 mr-2 text-[#8cc63f]" />
                Maklumat Pembayaran (Yuran: RM40)
              </h3>
              
              <div className="bg-white text-slate-900 rounded-xl p-6 shadow-md mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 rounded-bl-full -z-0"></div>
                <div className="relative z-10 space-y-3">
                  <div>
                    <p className="text-sm text-slate-500 font-semibold tracking-wider">PENAMA AKAUN</p>
                    <p className="font-bold text-lg">SURAU AL-IKHWAN TAMAN PUNCAK JALIL</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-semibold tracking-wider">NAMA BANK</p>
                    <p className="font-bold text-lg">CIMB ISLAMIC BANK BERHAD</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-semibold tracking-wider">NOMBOR AKAUN</p>
                    <p className="font-black text-2xl text-blue-600 tracking-wider">8602643946</p>
                  </div>
                </div>
              </div>

              {/* Receipt Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Muat Naik Resit Bayaran
                </label>
                
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    previewUrl 
                      ? 'border-[#8cc63f] bg-[#8cc63f]/5' 
                      : 'border-slate-300 hover:border-[#8cc63f] hover:bg-slate-50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  
                  {previewUrl ? (
                    <div className="flex flex-col items-center">
                      <div className="w-32 h-32 md:w-48 md:h-48 rounded-lg overflow-hidden border-2 border-[#8cc63f] mb-4 shadow-lg">
                        <img src={previewUrl} alt="Resit Preview" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[#8cc63f] font-medium flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Resit dimuat naik. Tekan untuk tukar.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-500">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Camera className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="font-medium mb-1">Tekan untuk memuat naik gambar resit</p>
                      <p className="text-sm text-slate-500">Format: JPG, PNG</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#8cc63f] hover:bg-[#7ab133] text-[#0A192F] font-bold text-lg py-4 rounded-xl shadow-[0_0_15px_rgba(140,198,63,0.3)] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#0A192F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  "Hantar Pendaftaran"
                )}
              </button>
            </div>
          </form>
        </div>
             ) : (
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-200 min-h-[400px]">
                   <h2 className="text-2xl font-bold text-[#0A192F] mb-6 border-b border-slate-200 pb-4">
                     {TABS.find(t => t.id === activeTab)?.label}
                   </h2>
                   <div className="prose prose-slate max-w-none text-slate-700">
                     {activeTab === 'fees' ? (
                       <img src="/yuran.webp" alt="Yuran Penyertaan" className="w-full h-auto rounded-xl shadow-sm border border-slate-100" />
                     ) : activeTab === 'entitlements' ? (
                       <img src="/barangan_peserta.webp" alt="Barangan Peserta" className="w-full h-auto rounded-xl shadow-sm border border-slate-100" />
                     ) : activeTab === 'prizes' ? (
                       <img src="/hadiah.webp" alt="Hadiah" className="w-full h-auto rounded-xl shadow-sm border border-slate-100" />
                     ) : activeTab === 'tnc' ? (
                       <div className="text-slate-800 text-sm md:text-base space-y-6">
                         <h2 className="text-xl md:text-2xl font-bold">Terma & Syarat Ikhwan Fun Run 3.0</h2>
                         <p>Dengan mendaftar untuk <span className="font-bold">Ikhwan Fun Run 3.0</span>, peserta dianggap telah membaca, memahami dan bersetuju dengan terma berikut.</p>
                         
                         <div>
                           <h3 className="font-bold text-lg mb-2">1. Maklumat Acara</h3>
                           <ul className="space-y-1">
                             <li><span className="font-bold">Penganjur:</span> Surau Al Ikhwan, Taman Puncak Jalil 2</li>
                             <li><span className="font-bold">Tarikh:</span> 10 Oktober 2026</li>
                             <li><span className="font-bold">Lokasi:</span> Taman Puncak Jalil 2</li>
                             <li><span className="font-bold">Kategori:</span> 5.3KM – Terbuka</li>
                             <li><span className="font-bold">Yuran:</span> RM40 seorang</li>
                             <li><span className="font-bold">Pendaftaran rasmi:</span> <a href="https://alikhwan.amanmana.workers.dev/ifr" target="_blank" rel="noreferrer" className="underline decoration-slate-400 underline-offset-2">https://alikhwan.amanmana.workers.dev/ifr</a></li>
                           </ul>
                         </div>

                         <div>
                           <h3 className="font-bold text-lg mb-2">2. Pendaftaran & Yuran</h3>
                           <ul className="list-disc pl-5 space-y-2">
                             <li>Semua maklumat pendaftaran hendaklah tepat dan lengkap.</li>
                             <li>Pendaftaran hanya disahkan selepas pembayaran berjaya.</li>
                             <li>Yuran penyertaan sebanyak <span className="font-bold">RM40 tidak boleh dikembalikan</span>.</li>
                             <li>Penyertaan <span className="font-bold">boleh dipindah milik</span> kepada peserta lain tertakluk kepada prosedur yang ditetapkan oleh penganjur.</li>
                             <li>Setiap pendaftaran disediakan <span className="font-bold">T-shirt rasmi Ikhwan Fun Run 3.0</span>, tertakluk kepada saiz dan stok yang tersedia.</li>
                           </ul>
                         </div>

                         <div>
                           <h3 className="font-bold text-lg mb-2">3. Kelayakan Penyertaan</h3>
                           <ul className="list-disc pl-5 space-y-2">
                             <li>Kategori 5.3KM adalah <span className="font-bold">terbuka tanpa had umur</span>.</li>
                             <li>Peserta hendaklah memastikan keadaan kesihatan dan fizikal sesuai untuk menyertai acara.</li>
                             <li>Peserta kanak-kanak hendaklah berada di bawah pengawasan ibu bapa atau penjaga.</li>
                             <li>Penggunaan <span className="font-bold">stroller dibenarkan</span>, dengan syarat keselamatan diri dan peserta lain sentiasa diutamakan.</li>
                           </ul>
                         </div>

                         <div>
                           <h3 className="font-bold text-lg mb-2">4. Peraturan Acara</h3>
                           <ul className="list-disc pl-5 space-y-2">
                             <li>Peserta hendaklah mengikuti laluan rasmi serta arahan penganjur, marshal, petugas keselamatan dan petugas perubatan.</li>
                             <li>Peserta tidak dibenarkan mengambil jalan pintas atau melakukan tindakan yang boleh memberikan kelebihan tidak adil.</li>
                             <li>Penganjur berhak menyingkirkan peserta yang melanggar peraturan atau membahayakan peserta lain.</li>
                             <li>Acara ini tidak menggunakan race bib.</li>
                           </ul>
                         </div>

                         <div>
                           <h3 className="font-bold text-lg mb-2">5. Hadiah Pemenang</h3>
                           <p className="mb-2">Kategori lelaki dan wanita masing-masing menyediakan hadiah untuk tiga kedudukan teratas:</p>
                           <ul className="list-disc pl-5 space-y-2 mb-2">
                             <li>Tempat Pertama: Medal Emas</li>
                             <li>Tempat Kedua: Medal Perak</li>
                             <li>Tempat Ketiga: Medal Gangsa</li>
                           </ul>
                           <ul className="list-disc pl-5 space-y-2">
                             <li>Reka bentuk medal dalam bahan promosi adalah ilustrasi sahaja dan mungkin berbeza daripada medal sebenar.</li>
                             <li>Keputusan rasmi penganjur berkaitan kedudukan dan kelayakan pemenang adalah muktamad.</li>
                             <li>Maklumat berkaitan medal finisher dan cabutan bertuah, jika ada, akan diumumkan kemudian.</li>
                           </ul>
                         </div>

                         <div>
                           <h3 className="font-bold text-lg mb-2">6. Keselamatan & Tanggungjawab</h3>
                           <ul className="list-disc pl-5 space-y-2">
                             <li>Peserta menyertai acara atas kesedaran sendiri terhadap tahap kesihatan dan kemampuan fizikal masing-masing.</li>
                             <li>Peserta hendaklah berhenti dan mendapatkan bantuan sekiranya mengalami kecederaan, masalah kesihatan atau ketidakselesaan semasa acara.</li>
                             <li>Pihak penganjur akan mengambil langkah yang munasabah bagi memastikan keselamatan acara. Peserta juga bertanggungjawab menjaga keselamatan diri sendiri, kanak-kanak di bawah jagaan serta barang peribadi masing-masing.</li>
                           </ul>
                         </div>

                         <div>
                           <h3 className="font-bold text-lg mb-2">7. Perubahan, Penangguhan atau Pembatalan</h3>
                           <p className="mb-2">Atas faktor seperti hujan lebat, jerebu, cuaca buruk, arahan pihak berkuasa, kecemasan atau isu keselamatan, penganjur berhak untuk:</p>
                           <ul className="list-disc pl-5 space-y-2 mb-2">
                             <li>mengubah laluan atau jadual acara;</li>
                             <li>menangguhkan acara; atau</li>
                             <li>membatalkan acara.</li>
                           </ul>
                           <p>Sebarang perubahan akan dimaklumkan melalui saluran rasmi penganjur.</p>
                         </div>

                         <div>
                           <h3 className="font-bold text-lg mb-2">8. Foto, Video & Data Peribadi</h3>
                           <ul className="list-disc pl-5 space-y-2">
                             <li>Foto dan video mungkin dirakam sepanjang acara dan boleh digunakan oleh penganjur bagi tujuan dokumentasi, hebahan dan promosi berkaitan Ikhwan Fun Run serta aktiviti Surau Al Ikhwan.</li>
                             <li>Maklumat peribadi peserta pula akan digunakan untuk tujuan pendaftaran, pembayaran, komunikasi acara, penyediaan T-shirt, pertukaran peserta dan urusan pentadbiran yang berkaitan.</li>
                           </ul>
                         </div>
                       </div>
                     ) : activeTab === 'contact' ? (
                       <div className="text-slate-800 text-sm md:text-base space-y-6">
                         <h2 className="text-xl md:text-2xl font-bold">Maklumat Penganjur</h2>
                         
                         <p><span className="font-bold">Ikhwan Fun Run 3.0</span> dianjurkan oleh <span className="font-bold">Surau Al Ikhwan, Taman Puncak Jalil 2</span> sebagai sebuah acara larian komuniti yang menghimpunkan penduduk setempat, keluarga dan peserta daripada pelbagai peringkat umur.</p>
                         
                         <p>Penganjuran acara ini bertujuan menggalakkan <span className="font-bold">gaya hidup sihat</span>, mengeratkan hubungan sesama komuniti serta mewujudkan suasana kebersamaan melalui aktiviti riadah yang santai dan menyeronokkan.</p>
                         
                         <p>Dengan kategori <span className="font-bold">5.3KM Terbuka</span>, Ikhwan Fun Run 3.0 memberi peluang kepada semua untuk turut serta sama ada secara individu, bersama keluarga atau rakan-rakan. Kanak-kanak dan peserta yang menggunakan stroller juga dialu-alukan untuk menyertai acara ini.</p>
                         
                         <div>
                           <h3 className="font-bold text-lg mb-2">Penganjur</h3>
                           <p><span className="font-bold">Surau Al Ikhwan</span><br/>Taman Puncak Jalil 2</p>
                         </div>
                         
                         <div>
                           <h3 className="font-bold text-lg mb-2">Acara</h3>
                           <p><span className="font-bold">Ikhwan Fun Run 3.0</span><br/>
                           <span className="font-bold">Tarikh:</span> 10 Oktober 2026<br/>
                           <span className="font-bold">Lokasi:</span> Taman Puncak Jalil 2</p>
                         </div>
                         
                         <p className="font-bold text-lg pt-2 text-[#0A192F]">"Lari Bersama, Sihat Bersama, Ukhuwah Terjalin Selamanya!"</p>
                       </div>
                     ) : (
                       <>
                         <p>Maklumat rasmi bagi halaman ini akan dikemas kini kelak.</p>
                       </>
                     )}
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>
      <IfrCheckReceiptModal 
        isOpen={isCheckModalOpen} 
        onClose={() => setIsCheckModalOpen(false)} 
      />
    </div>
  );
}

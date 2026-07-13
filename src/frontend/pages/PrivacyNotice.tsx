import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Clock } from "lucide-react";
import Header from "../components/Header.tsx";

export default function PrivacyNotice() {
  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-6">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-4 space-y-6">
        {/* Navigation */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 text-brand-muted hover:text-brand-primary rounded-lg"
            aria-label="Kembali ke Utama"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-lg font-bold text-brand-primary">
            Notis Privasi e-Kariah Al-Ikhwan
          </h2>
        </div>

        <div className="bg-brand-surface border border-gray-200 rounded-xl p-6 shadow-sm space-y-6 text-sm text-brand-text leading-relaxed">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-brand-primary">
              <ShieldCheck className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-base">
                1. Komitmen Perlindungan Data Peribadi
              </h3>
            </div>
            <p>
              Pihak pengurusan Surau Al-Ikhwan amat menghormati privasi anda.
              Notis Privasi ini menerangkan cara kami mengumpul, mengguna,
              menyimpan, dan melindungi maklumat peribadi anda selaras dengan
              amalan terbaik perlindungan data di Malaysia.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-brand-primary text-base">
              2. Maklumat Peribadi Yang Kami Kumpul
            </h3>
            <p>
              Semasa anda mendaftar atau menuntut akaun, kami mengumpul maklumat
              berikut:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Nama penuh:</strong> Untuk rekod pendaftaran rasmi ahli
                kariah.
              </li>
              <li>
                <strong>Nombor Kad Pengenalan (IC):</strong> Untuk menentusahkan
                umur (18-90 tahun) dan mengelakkan pertindihan rekod.
              </li>
              <li>
                <strong>Nombor telefon bimbit:</strong> Untuk komunikasi rasmi
                surau dan pengesahan akaun.
              </li>
              <li>
                <strong>Alamat kediaman:</strong> Untuk memastikan anda menetap
                dalam sempadan kariah Surau Al-Ikhwan.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-brand-primary text-base">
              3. Tujuan Penggunaan Maklumat
            </h3>
            <p>Maklumat anda hanya akan digunakan untuk:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Mengurus pendaftaran dan senarai ahli kariah Surau Al-Ikhwan.
              </li>
              <li>
                Menjana direktori awam yang terpilih (hanya nama penuh dan
                kawasan kejiranan umum dipaparkan, sekiranya anda bersetuju).
              </li>
              <li>
                Menghantar pengumuman penting, urusan kebajikan, atau bantuan
                kariah.
              </li>
              <li>Tujuan keselamatan sistem dan pengesahan pentadbir.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-brand-primary">
              <Clock className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-bold text-base">
                4. Polisi Penyimpanan dan Pemadaman Data
              </h3>
            </div>
            <p>Kami menyimpan data anda mengikut jadual ketat:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Ahli Aktif:</strong> Disimpan sepanjang tempoh keahlian
                kariah anda aktif.
              </li>
              <li>
                <strong>Permohonan Ditolak/Dibatalkan:</strong> Dipadamkan
                secara kekal selepas tempoh 90 hari.
              </li>
              <li>
                <strong>Hak untuk Dilupakan:</strong> Ahli berhak meminta
                pemadaman penuh rekod mereka sekiranya berpindah keluar kariah
                dengan menghubungi pentadbir surau.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-brand-primary text-base">
              5. Kawalan Keselamatan
            </h3>
            <p>
              Semua maklumat sensitif seperti kata laluan disimpan dalam bentuk
              enkripsi kriptografi tinggi (`scrypt` hash). Nombor IC
              disembunyikan secara lalai pada antara muka pengguna bagi
              mengelakkan intipan skrin. Kami tidak sesekali menjual atau
              berkongsi data peribadi anda dengan mana-mana pihak ketiga untuk
              tujuan komersial.
            </p>
          </section>

          <section className="space-y-3 border-t border-gray-100 pt-4">
            <h3 className="font-bold text-brand-primary text-base">
              6. Hubungi Kami
            </h3>
            <p>
              Sekiranya anda mempunyai sebarang soalan mengenai notis privasi
              ini, atau ingin memohon pemadaman data anda, sila hubungi
              mana-mana AJK Surau Al-Ikhwan. Sila rujuk papan kenyataan.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

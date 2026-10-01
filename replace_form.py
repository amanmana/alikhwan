with open('src/frontend/pages/ifr/IfrRegistration.tsx', 'r') as f:
    content = f.read()

start_tag = '<form onSubmit={handleSubmit} className="space-y-6">'
end_tag = '{/* Payment Info Section */}'

start_idx = content.find(start_tag)
end_idx = content.find(end_tag)

if start_idx == -1 or end_idx == -1:
    print("Could not find sections")
    exit(1)

new_form = """<form onSubmit={handleSubmit} className="space-y-6">
            <div className="mb-6 flex gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <label className={`flex-1 flex justify-center cursor-pointer px-4 py-3 rounded-lg font-medium transition-colors ${regType === "individu" ? "bg-[#8cc63f] text-white shadow-md" : "text-slate-600 hover:bg-slate-200"}`}>
                <input type="radio" name="regType" className="hidden" checked={regType === "individu"} onChange={() => { setRegType("individu"); setParticipants([participants[0]]); }} />
                Daftar Individu
              </label>
              <label className={`flex-1 flex justify-center cursor-pointer px-4 py-3 rounded-lg font-medium transition-colors ${regType === "kumpulan" ? "bg-[#8cc63f] text-white shadow-md" : "text-slate-600 hover:bg-slate-200"}`}>
                <input type="radio" name="regType" className="hidden" checked={regType === "kumpulan"} onChange={() => setRegType("kumpulan")} />
                Keluarga / Berkumpulan
              </label>
            </div>

            {participants.map((p, index) => (
              <div key={index} className="bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-200 relative mb-6">
                {regType === "kumpulan" && (
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                    <h3 className="font-bold text-lg text-slate-800">Peserta {index + 1} {index === 0 && "(Ketua)"}</h3>
                    {index > 0 && (
                      <button type="button" onClick={() => removeParticipant(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg text-sm font-medium transition-colors flex items-center">
                        Buang
                      </button>
                    )}
                  </div>
                )}

                {index > 0 && (
                  <div className="mb-6">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={p.useLeaderDetails} 
                        onChange={(e) => handleUseLeaderDetails(index, e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-[#8cc63f] focus:ring-[#8cc63f]" 
                      />
                      <span className="text-sm font-medium text-slate-700">Tandakan jika Alamat/No Tel sama seperti ketua</span>
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nama */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nama Peserta</label>
                    <input type="text" name="name" required value={p.name} onChange={(e) => handleParticipantChange(index, e)} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all" placeholder="Nama penuh mengikut kad pengenalan" />
                  </div>

                  {/* No I/C */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">No. Kad Pengenalan</label>
                    <input type="text" name="ic_number" required value={p.ic_number} onChange={(e) => handleParticipantChange(index, e)} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all" placeholder="Cth: 900101-10-1234" />
                  </div>

                  {/* No Phone */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">No. Telefon</label>
                    <input type="tel" name="phone" required value={p.phone} disabled={p.useLeaderDetails} onChange={(e) => handleParticipantChange(index, e)} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all disabled:bg-slate-200 disabled:text-slate-500" placeholder="Cth: 0123456789" />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Kategori</label>
                    <select name="category" required value={p.category} onChange={(e) => handleParticipantChange(index, e)} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all">
                      <option value="" disabled>Pilih Kategori</option>
                      <option value="Kanak-Kanak">Kanak-Kanak</option>
                      <option value="Belia">Belia</option>
                      <option value="Dewasa">Dewasa</option>
                      <option value="Veteran">Veteran</option>
                    </select>
                  </div>

                  {/* Shirt Size */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Saiz Baju</label>
                    <select name="shirt_size" required value={p.shirt_size} onChange={(e) => handleParticipantChange(index, e)} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all">
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Alamat Semasa</label>
                    <textarea name="address" required value={p.address} disabled={p.useLeaderDetails} onChange={(e) => handleParticipantChange(index, e)} rows={3} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all disabled:bg-slate-200 disabled:text-slate-500" placeholder="Alamat penuh rumah" />
                  </div>

                  {/* Emergency */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">No. Telefon Waris (Kecemasan)</label>
                    <input type="tel" name="emergency_contact_phone" required value={p.emergency_contact_phone} onChange={(e) => handleParticipantChange(index, e)} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8cc63f] focus:border-transparent transition-all" placeholder="Cth: 0123456789" />
                  </div>
                </div>
              </div>
            ))}

            {regType === "kumpulan" && (
              <div className="flex justify-center mb-6">
                <button type="button" onClick={addParticipant} className="px-6 py-3 bg-white border-2 border-[#8cc63f] text-[#7ab135] hover:bg-[#8cc63f] hover:text-white rounded-xl font-bold transition-all shadow-sm">
                  + Tambah Peserta
                </button>
              </div>
            )}

            """

new_content = content[:start_idx] + new_form + content[end_idx:]

with open('src/frontend/pages/ifr/IfrRegistration.tsx', 'w') as f:
    f.write(new_content)

print("Form replaced successfully")

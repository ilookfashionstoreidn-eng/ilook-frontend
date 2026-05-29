const fs = require('fs');
const filePath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let content = fs.readFileSync(filePath, 'utf-8');

const replacement = `<div className="spk-cutting-form-group-section">
                      <h4 className="spk-cutting-group-title">Identitas</h4>
                      <div className="spk-cutting-identity-grid">
                        <div className="spk-cutting-form-group">
                          <label>Tukang Cutting:</label>
                          <select name="tukang_cutting_id" value={newSpkCutting.tukang_cutting_id} onChange={handleInputChange} required>
                            <option value="">Pilih Tukang</option>
                            {tukangList.map((tukang) => (
                              <option key={tukang.id} value={tukang.id}>
                                {tukang.nama_tukang_cutting}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="spk-cutting-form-group">
                          <label>Nomor Seri SPK:</label>
                          <input type="text" name="id_spk_cutting" value={newSpkCutting.id_spk_cutting || "Pilih tukang cutting terlebih dahulu"} readOnly disabled />
                        </div>

                        <div className="spk-cutting-form-group">
                          <label>PIC:</label>
                          <input type="text" name="pic" value={newSpkCutting.pic} onChange={handleInputChange} placeholder="Nama PIC" />
                        </div>

                        <div className="spk-cutting-form-group">
                          <label>Tukang Pola:</label>
                          <select name="tukang_pola_id" value={newSpkCutting.tukang_pola_id} onChange={handleInputChange}>
                            <option value="">Pilih Tukang Pola (Opsional)</option>
                            {tukangPolaList.map((tukangPola) => (
                              <option key={tukangPola.id} value={tukangPola.id}>
                                {tukangPola.nama}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="spk-cutting-form-group-section mt-4">
                      <h4 className="spk-cutting-group-title">Produk & Target</h4>
                      <div className="spk-cutting-identity-grid">
                        <div className="spk-cutting-form-group">
                          <label>Product:</label>
                          <Select
                            className="spk-cutting-bahan-select"
                            classNamePrefix="spk-cutting-react-select"
                            options={produkOptions}
                            value={getSelectedProdukOption(newSpkCutting.produk_id)}
                            onChange={(option) => handleInputChange(makeInputEvent("produk_id", option?.value))}
                            placeholder="Cari / pilih Product"
                            isClearable
                            isSearchable
                            noOptionsMessage={() => "Product tidak ditemukan"}
                            menuPortalTarget={bahanSelectPortalTarget}
                            styles={{
                              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            }}
                          />
                        </div>

                        <div className="spk-cutting-form-group">
                          <label>Jenis SPK:</label>
                          <select name="jenis_spk" value={newSpkCutting.jenis_spk} onChange={handleInputChange}>
                            <option value="">Pilih Jenis SPK</option>
                            <option value="Terjual">Terjual</option>
                            <option value="Fittingan">Fittingan</option>
                            <option value="Habisin Bahan">Habisin Bahan</option>
                          </select>
                        </div>

                        <div className="spk-cutting-form-group">
                          <label>Tanggal Batas Kirim:</label>
                          <input type="date" name="tanggal_batas_kirim" value={newSpkCutting.tanggal_batas_kirim} onChange={handleInputChange} required />
                        </div>
                      </div>
                    </div>

                    <div className="spk-cutting-form-group-section mt-4">
                      <h4 className="spk-cutting-group-title">Biaya & Asumsi</h4>
                      <div className="spk-cutting-identity-grid">
                        <div className="spk-cutting-form-group">
                          <label>Harga Jasa:</label>
                          <div className="spk-cutting-currency-input">
                            <span className="spk-cutting-currency-prefix">Rp</span>
                            <input
                              type="text"
                              name="harga_jasa"
                              className="spk-cutting-input-with-prefix"
                              value={newSpkCutting.harga_jasaDisplay}
                              onChange={handleInputChange}
                              placeholder="0"
                              readOnly
                              required
                            />
                          </div>
                          <small className="spk-cutting-form-hint">Terisi otomatis dari harga jasa cutting Product List.</small>
                        </div>

                        <div className="spk-cutting-form-group">
                          <label>Satuan Harga:</label>
                          <select name="satuan_harga" value={newSpkCutting.satuan_harga} onChange={handleInputChange} required>
                            <option value="Pcs">Pcs</option>
                            <option value="Lusin">Lusin</option>
                          </select>
                        </div>
                      
                        <div className="spk-cutting-form-group">
                          <label>Jumlah Asumsi Produk:</label>
                          <input type="text" name="jumlah_asumsi_produk" value={newSpkCutting.jumlah_asumsi_produkDisplay} onChange={handleInputChange} placeholder="Otomatis dari total rol bahan" readOnly />
                          <small className="spk-cutting-form-hint">1 rol bahan = {ASUMSI_PRODUK_PER_ROLL} asumsi produk.</small>
                        </div>
                      </div>
                    </div>`;

const regex = /<div className="spk-cutting-identity-grid">([\s\S]*?)<\/div>\s*\{renderSkuSelector/g;
content = content.replace(regex, (m, p1) => {
  return replacement + '\n                    {renderSkuSelector';
});

fs.writeFileSync(filePath, content);
console.log("Grouped fields in SpkCutting.js!");

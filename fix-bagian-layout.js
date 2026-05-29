const fs = require('fs');

const jsPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let jsContent = fs.readFileSync(jsPath, 'utf-8');

const targetRegex = /<div className="spk-cutting-bagian-header">([\s\S]*?)<\/div>\s*<div className="spk-cutting-bagian-lines">[\s\S]*?\{bagian\.bahan\.length > 0 && !bagian\.is_auto_bagian && \([\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*\)\)/g;

const replacement = `<div className="spk-cutting-bagian-header">
                          <h4>Bagian {bagianIndex + 1}</h4>
                          {!bagian.is_auto_bagian && (
                            <button type="button" className="spk-cutting-btn-remove-bagian" onClick={() => removeBagian(bagianIndex)}>
                              Hapus Bagian
                            </button>
                          )}
                        </div>

                        <div className="spk-cutting-form-group spk-cutting-bagian-name-field" style={{ marginBottom: '16px', maxWidth: '300px' }}>
                          <label>Nama Bagian:</label>
                          {bagian.is_auto_bagian ? (
                            <>
                              <input type="text" value={bagian.nama_bagian || ""} readOnly />
                              {bagian.material_group && <small className="spk-cutting-form-hint">Group bahan: {bagian.material_group}</small>}
                            </>
                          ) : (
                            <select value={bagian.nama_bagian || ""} onChange={(e) => handleBagianChange(bagianIndex, "nama_bagian", e.target.value)} required>
                              <option value="">Pilih Nama Bagian</option>
                              {NAMA_BAGIAN_OPTIONS.map((nama) => (
                                <option key={nama} value={nama}>
                                  {nama}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="spk-cutting-bagian-lines">
                          {(bagian.bahan.length ? bagian.bahan : [null]).map((bahan, bahanIndex) => (
                            <div key={bahan ? bahanIndex : "empty"} className="spk-cutting-bagian-line">
                              {bahan ? (
                                <>
                                  <div className="spk-cutting-bahan-cell">
                                    {isAksesorisBagian(bagian.nama_bagian)
                                      ? renderAksesorisSelect({
                                          value: bahan.aksesoris_id,
                                          onChange: (value) => handleAksesorisChange(bagianIndex, bahanIndex, value),
                                        })
                                      : renderBahanSelect({
                                          value: bahan.bahan_id,
                                          materialGroup: bahan.material_group || bagian.material_group,
                                          onChange: (value) => handleBahanChange(bagianIndex, bahanIndex, "bahan_id", value),
                                        })}
                                  </div>

                                  <div className="spk-cutting-bahan-cell">
                                    {isAksesorisBagian(bagian.nama_bagian) ? (
                                      <input type="text" value="Aksesoris" readOnly />
                                    ) : (
                                      <>
                                        <select value={bahan.warna || ""} onChange={(e) => handleBahanChange(bagianIndex, bahanIndex, "warna", e.target.value)} disabled={!bahan.bahan_id}>
                                          <option value="">{bahan.bahan_id ? "Pilih Warna" : "Pilih Bahan terlebih dahulu"}</option>
                                          {(bahan.warnaList || []).map((item, idx) => {
                                            const warna = typeof item === "string" ? item : item.warna;
                                            const stok = typeof item === "object" ? item.stok : 999;
                                            const isDisabled = stok === 0 && warna !== "Lainnya";
                                            return (
                                              <option key={idx} value={warna} disabled={isDisabled} style={isDisabled ? { color: "#999", opacity: 0.5 } : {}}>
                                                {warna} {stok !== 999 && \`(\${stok} stok)\`}
                                              </option>
                                            );
                                          })}
                                        </select>
                                        {bahan.warna === "Lainnya" && <input type="text" placeholder="Masukkan warna custom..." value={bahan.warna_custom || ""} onChange={(e) => handleWarnaCustomChange(bagianIndex, bahanIndex, e.target.value)} required style={{ marginTop: '8px' }} />}
                                      </>
                                    )}
                                  </div>

                                  <input type="number" placeholder={isAksesorisBagian(bagian.nama_bagian) ? "Qty Aksesoris" : "Qty (Jumlah Rol)"} value={bahan.qty} onChange={(e) => handleBahanChange(bagianIndex, bahanIndex, "qty", e.target.value)} required />
                                  
                                  {!bagian.is_auto_bagian && (
                                    <button type="button" className="spk-cutting-btn-remove-bahan" onClick={() => removeBahan(bagianIndex, bahanIndex)}>
                                      Hapus
                                    </button>
                                  )}
                                </>
                              ) : (
                                <div className="spk-cutting-bahan-empty-action" style={{ gridColumn: '1 / -1' }}>
                                  {!bagian.is_auto_bagian && (
                                    <button type="button" className="spk-cutting-btn spk-cutting-btn-success" onClick={() => addBahan(bagianIndex)}>
                                      <FaPlus /> Tambah Bahan
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}

                          {bagian.bahan.length > 0 && !bagian.is_auto_bagian && (
                            <div className="spk-cutting-bagian-add-wrapper" style={{ marginTop: '12px' }}>
                              <button type="button" className="spk-cutting-btn spk-cutting-btn-success" onClick={() => addBahan(bagianIndex)} style={{ width: '100%' }}>
                                <FaPlus /> Tambah Bahan Tambahan
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))`;

// Note: the regex matches all occurrences including the one in Edit form if it exists.
let matchCount = 0;
jsContent = jsContent.replace(targetRegex, () => {
  matchCount++;
  return replacement;
});

fs.writeFileSync(jsPath, jsContent);
console.log("Updated SpkCutting.js Bagian card layout! Matches: " + matchCount);

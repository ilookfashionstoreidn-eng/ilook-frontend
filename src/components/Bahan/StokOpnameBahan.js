import React, { useEffect, useState, useRef } from "react";
import "./StokOpnameBahan.css";
import API from "../../api";
import { FaPlus, FaEye, FaDownload, FaBarcode, FaTimes, FaUndo, FaSearch, FaTrash, FaEdit } from "react-icons/fa";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import Select from "react-select";

const normalizeApiList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const swalButtonColors = {
  confirmButtonColor: "#2458ce",
  cancelButtonColor: "#64748b",
};

const showAlert = (icon, title, text) =>
  Swal.fire({
    icon,
    title,
    text,
    ...swalButtonColors,
  });

const focusRollInput = (warnaIndex, rolIndex) => {
  setTimeout(() => {
    const input = document.querySelector(`[data-roll-input="${warnaIndex}-${rolIndex}"]`);
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus();
  }, 120);
};

const StokOpnameBahan = () => {
  const [items, setItems] = useState([]);
  const [pabrikList, setPabrikList] = useState([]);
  const [gudangList, setGudangList] = useState([]);
  const [bahanList, setBahanList] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const WARNA_OPTIONS = ["Putih", "Hitam", "Merah", "Biru", "Hijau", "Kuning", "Abu-abu", "Coklat", "Pink", "Ungu", "Orange", "Navy", "Maroon", "Beige", "Khaki", "Lainnya"];

  // Form Tambah
  const [newItem, setNewItem] = useState({
    pabrik_id: "",
    gudang_id: "",
    tanggal_kirim: new Date().toISOString().split('T')[0],
    bahan_id: "",
    gramasi: "",
    lebar_kain: "",
    keterangan: "Stok Opname",
    harga: "",
    warna: [{ nama: "", isCustom: false, customNama: "", rol: [0] }],
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [resData, resPabrik, resGudang, resBahan] = await Promise.all([
        API.get("/pembelian-bahan"),
        API.get("/pabrik"),
        API.get("/gudang"),
        API.get("/bahan?all=1"),
      ]);

      let dataBahan = normalizeApiList(resData.data);
      dataBahan = dataBahan
        .filter(item => item.no_surat_jalan && item.no_surat_jalan.startsWith('OPNAME'))
        .sort((a, b) => b.id - a.id);

      setItems(dataBahan);
      setPabrikList(normalizeApiList(resPabrik.data));
      setGudangList(normalizeApiList(resGudang.data));
      
      const rawBahanList = normalizeApiList(resBahan.data);
      const uniqueBahanMap = new Map();
      rawBahanList.forEach(b => {
        if (!uniqueBahanMap.has(b.nama_bahan)) {
          b.available_colors = new Set();
          if (b.warna_bahan) b.available_colors.add(b.warna_bahan);
          uniqueBahanMap.set(b.nama_bahan, b);
        } else {
          if (b.warna_bahan) {
             uniqueBahanMap.get(b.nama_bahan).available_colors.add(b.warna_bahan);
          }
        }
      });
      const dedupedList = Array.from(uniqueBahanMap.values()).map(b => ({
          ...b,
          available_colors: Array.from(b.available_colors)
      }));
      setBahanList(dedupedList);
      
      setIsReady(true);
    } catch (e) {
      setError("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filtered = items.filter((b) => (b.bahan?.nama_bahan || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getBahanName = (item) => item?.bahan?.nama_bahan || "-";
  const getBahanSatuan = (item) => item?.bahan?.satuan || "kg";

  const getHargaBahan = (bahanId) => {
    if (!bahanId || !bahanList || bahanList.length === 0) return 0;
    const bahan = bahanList.find((b) => b.id === parseInt(bahanId));
    return bahan ? parseFloat(bahan.harga) || 0 : 0;
  };

  const calculateTotalRoll = (warnaArray) => {
    if (!warnaArray || !Array.isArray(warnaArray)) return 0;
    return warnaArray.reduce((total, w) => {
      const jumlahRol = w.jumlah_rol || w.rol?.length || 0;
      return total + jumlahRol;
    }, 0);
  };

  const handleCetakBarcode = async (id) => {
    try {
      const resp = await API.get(`/pembelian-bahan/${id}/download-barcode`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Barcode_Opname_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      showAlert("error", "Gagal", "Tidak dapat mendownload barcode.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        pabrik_id: newItem.pabrik_id,
        gudang_id: newItem.gudang_id,
        bahan_id: newItem.bahan_id,
        tanggal_kirim: newItem.tanggal_kirim,
        gramasi: newItem.gramasi,
        lebar_kain: newItem.lebar_kain,
        keterangan: newItem.keterangan,
        harga: newItem.harga,
        warna: {}
      };

      // Construct warna object
      newItem.warna.forEach((w) => {
        const namaWarna = w.isCustom ? w.customNama : w.nama;
        if (namaWarna) {
           payload.warna[namaWarna] = w.rol.map(Number);
        }
      });

      if (Object.keys(payload.warna).length === 0) {
        return showAlert("warning", "Peringatan", "Minimal satu warna harus diisi.");
      }

      await API.post("/pembelian-bahan/opname", payload);
      showAlert("success", "Sukses", "Stok Opname Bahan berhasil disimpan!");
      setShowForm(false);
      
      // Reset
      setNewItem({
        pabrik_id: "",
        gudang_id: "",
        tanggal_kirim: new Date().toISOString().split('T')[0],
        bahan_id: "",
        gramasi: "",
        lebar_kain: "",
        keterangan: "Stok Opname",
        harga: "",
        warna: [{ nama: "", isCustom: false, customNama: "", rol: [0] }],
      });
      
      fetchAll();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Terjadi kesalahan";
      showAlert("error", "Gagal", errMsg);
    }
  };

  // --- Dynamic Rows ---
  const handleAddWarna = () => {
    setNewItem(prev => ({
      ...prev,
      warna: [...prev.warna, { nama: "", isCustom: false, customNama: "", rol: [0] }]
    }));
  };

  const handleRemoveWarna = (index) => {
    setNewItem(prev => ({
      ...prev,
      warna: prev.warna.filter((_, i) => i !== index)
    }));
  };

  const handleWarnaChange = (index, value) => {
    const updated = [...newItem.warna];
    if (value === "Lainnya") {
      updated[index].isCustom = true;
      updated[index].nama = "";
    } else {
      updated[index].isCustom = false;
      updated[index].nama = value;
      updated[index].customNama = "";
    }
    setNewItem({ ...newItem, warna: updated });
  };

  const handleCustomWarnaChange = (index, value) => {
    const updated = [...newItem.warna];
    updated[index].customNama = value;
    setNewItem({ ...newItem, warna: updated });
  };

  const handleAddRol = (warnaIndex) => {
    const updated = [...newItem.warna];
    updated[warnaIndex].rol.push(0);
    setNewItem({ ...newItem, warna: updated });
    focusRollInput(warnaIndex, updated[warnaIndex].rol.length - 1);
  };

  const handleRemoveRol = (warnaIndex, rolIndex) => {
    const updated = [...newItem.warna];
    updated[warnaIndex].rol.splice(rolIndex, 1);
    setNewItem({ ...newItem, warna: updated });
  };

  const handleRolChange = (warnaIndex, rolIndex, value) => {
    const updated = [...newItem.warna];
    updated[warnaIndex].rol[rolIndex] = value;
    setNewItem({ ...newItem, warna: updated });
  };

  const handleKeyPress = (e, warnaIndex, rolIndex) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddRol(warnaIndex);
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Hapus Stok Opname?",
      text: "Data yang dihapus tidak bisa dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
      ...swalButtonColors,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await API.delete(`/pembelian-bahan/opname/${id}`);
          showAlert("success", "Berhasil!", "Data stok opname berhasil dihapus.");
          fetchAll();
        } catch (error) {
          showAlert("error", "Gagal!", "Terjadi kesalahan saat menghapus data.");
        }
      }
    });
  };

  const handleDeleteRol = (rolId) => {
    Swal.fire({
      title: "Hapus Rol Ini?",
      text: "Rol ini akan dihapus secara permanen dari stok opname!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
      ...swalButtonColors,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await API.delete(`/pembelian-bahan/rol/${rolId}`);
          showAlert("success", "Berhasil!", "Rol berhasil dihapus.");
          // Update modal data directly or close it
          setShowDetail(false);
          fetchAll();
        } catch (error) {
          showAlert("error", "Gagal!", "Terjadi kesalahan saat menghapus rol.");
        }
      }
    });
  };

  const handleEditRol = (rol) => {
    Swal.fire({
      title: "Update Berat Rol",
      input: "number",
      inputValue: rol.berat,
      inputAttributes: {
        min: 0,
        step: 0.01,
      },
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      ...swalButtonColors,
      inputValidator: (value) => {
        if (!value || value <= 0) {
          return "Berat tidak valid!";
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await API.put(`/pembelian-bahan/scan-barcode/${rol.barcode}/update-berat`, {
            berat: parseFloat(result.value)
          });
          showAlert("success", "Berhasil!", "Berat rol berhasil diupdate.");
          
          setDetailItem(prev => {
             const updated = {...prev};
             updated.warna = updated.warna.map(w => {
                return {
                   ...w,
                   rol: w.rol.map(r => r.id === rol.id ? {...r, berat: result.value} : r)
                }
             });
             return updated;
          });
          
          fetchAll();
        } catch (error) {
          showAlert("error", "Gagal!", "Terjadi kesalahan saat mengupdate rol.");
        }
      }
    });
  };

  if (!isReady || loading) {
    return (
      <div className="opname-bahan-loading-container">
        <div className="opname-bahan-spinner"></div>
        <p>Memuat Data...</p>
      </div>
    );
  }

  if (error) {
    return <div className="opname-bahan-error-container">{error}</div>;
  }

  return (
    <div className="opname-bahan-container">
      <div className="opname-bahan-header-section">
        <h1 className="opname-bahan-title">Stok Opname Bahan</h1>
        <p className="opname-bahan-subtitle">Generate barcode untuk bahan yang sudah ada fisiknya di gudang</p>
      </div>

      <div className="opname-bahan-top-controls">
        <div className="opname-bahan-search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Cari nama bahan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <FaTimes className="clear-icon" onClick={() => setSearchTerm("")} />}
        </div>
        <button className="opname-bahan-btn-primary" onClick={() => setShowForm(true)}>
          <FaPlus /> Tambah Opname
        </button>
      </div>

      <div className="opname-bahan-card">
        <div className="opname-bahan-table-responsive">
          <table className="opname-bahan-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th>Bahan</th>
                <th>Total Rol</th>
                <th>Gudang / Pabrik</th>
                <th className="opname-bahan-text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.tanggal_kirim).toLocaleDateString("id-ID")}</td>
                    <td><span className="opname-badge">{item.keterangan}</span></td>
                    <td>
                      <div className="bahan-info">
                        <strong>{getBahanName(item)}</strong>
                        <span className="small-text">{item.gramasi} / {item.lebar_kain}</span>
                      </div>
                    </td>
                    <td>{calculateTotalRoll(item.warna)} rol</td>
                    <td>
                      <div className="gudang-pabrik">
                        <span><i className="fas fa-warehouse"></i> {item.gudang?.nama_gudang || "-"}</span>
                        <span><i className="fas fa-industry"></i> {item.pabrik?.nama_pabrik || "-"}</span>
                      </div>
                    </td>
                    <td className="opname-bahan-actions">
                      <button className="opname-bahan-btn-icon opname-bahan-btn-info" title="Detail" onClick={() => { setDetailItem(item); setShowDetail(true); }}>
                        <FaEye />
                      </button>
                      <button className="opname-bahan-btn-icon opname-bahan-btn-success" title="Cetak Barcode" onClick={() => handleCetakBarcode(item.id)}>
                        <FaBarcode />
                      </button>
                      <button className="opname-bahan-btn-icon opname-bahan-btn-danger" title="Hapus" style={{ backgroundColor: '#ef4444', color: 'white', marginLeft: '4px', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleDelete(item.id)}>
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="opname-bahan-text-center opname-bahan-empty">
                    Tidak ada data opname.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="opname-bahan-pagination">
            <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>Prev</button>
            <span>Halaman {currentPage} dari {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>Next</button>
          </div>
        )}
      </div>

      {/* Modal Tambah */}
      {showForm && (
        <div className="opname-bahan-modal-overlay">
          <div className="opname-bahan-modal-content">
            <div className="opname-bahan-modal-header">
              <h2>Tambah Stok Opname Bahan</h2>
              <button className="opname-bahan-close-btn" onClick={() => setShowForm(false)}><FaTimes /></button>
            </div>
            <div className="opname-bahan-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="opname-bahan-grid">
                  <div className="opname-bahan-form-group">
                    <label>Pabrik <span className="opname-bahan-text-danger">*</span></label>
                    <select required value={newItem.pabrik_id} onChange={(e) => setNewItem({ ...newItem, pabrik_id: e.target.value })}>
                      <option value="">-- Pilih Pabrik --</option>
                      {pabrikList.map((p) => (<option key={p.id} value={p.id}>{p.nama_pabrik}</option>))}
                    </select>
                  </div>
                  <div className="opname-bahan-form-group">
                    <label>Gudang <span className="opname-bahan-text-danger">*</span></label>
                    <select required value={newItem.gudang_id} onChange={(e) => setNewItem({ ...newItem, gudang_id: e.target.value })}>
                      <option value="">-- Pilih Gudang --</option>
                      {gudangList.map((g) => (<option key={g.id} value={g.id}>{g.nama_gudang}</option>))}
                    </select>
                  </div>
                  <div className="opname-bahan-form-group">
                    <label>Bahan <span className="opname-bahan-text-danger">*</span></label>
                    <Select
                      options={bahanList.map((b) => ({ value: b.id, label: b.nama_bahan }))}
                      value={newItem.bahan_id ? { value: newItem.bahan_id, label: bahanList.find(b => b.id === parseInt(newItem.bahan_id))?.nama_bahan } : null}
                      onChange={(selected) => {
                        const selBahanId = selected ? selected.value : "";
                        setNewItem({ ...newItem, bahan_id: selBahanId, harga: getHargaBahan(selBahanId) });
                      }}
                      placeholder="-- Cari Bahan --"
                      isClearable
                      required
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: '#cfd8e3',
                          borderRadius: '8px',
                          minHeight: '38px',
                          padding: '0 4px',
                          backgroundColor: '#f8fafc',
                          boxShadow: 'none',
                          '&:hover': {
                            borderColor: '#b6c2d6'
                          }
                        })
                      }}
                    />
                  </div>
                  <div className="opname-bahan-form-group">
                    <label>Tanggal Opname <span className="opname-bahan-text-danger">*</span></label>
                    <input type="date" required value={newItem.tanggal_kirim} onChange={(e) => setNewItem({ ...newItem, tanggal_kirim: e.target.value })} />
                  </div>
                  <div className="opname-bahan-form-group">
                    <label>Harga per {getBahanSatuan({bahan_id: newItem.bahan_id})} <span className="opname-bahan-text-danger">*</span></label>
                    <input type="number" required min="0" value={newItem.harga} onChange={(e) => setNewItem({ ...newItem, harga: e.target.value })} />
                  </div>
                  <div className="opname-bahan-form-group">
                    <label>Keterangan <span className="opname-bahan-text-danger">*</span></label>
                    <input type="text" required value={newItem.keterangan} onChange={(e) => setNewItem({ ...newItem, keterangan: e.target.value })} />
                  </div>
                  <div className="opname-bahan-form-group">
                    <label>Gramasi <span className="opname-bahan-text-danger">*</span></label>
                    <input type="text" required value={newItem.gramasi} onChange={(e) => setNewItem({ ...newItem, gramasi: e.target.value })} placeholder="Cth: 24s / 150-160 gsm" />
                  </div>
                  <div className="opname-bahan-form-group">
                    <label>Lebar Kain (inch) <span className="opname-bahan-text-danger">*</span></label>
                    <input type="number" required min="1" step="0.01" value={newItem.lebar_kain} onChange={(e) => setNewItem({ ...newItem, lebar_kain: e.target.value })} placeholder="Cth: 72" />
                  </div>
                </div>

                <hr className="opname-bahan-divider" />
                <h3 className="opname-bahan-section-title">Warna & Rol</h3>

                {newItem.warna.map((w, wIdx) => (
                  <div key={wIdx} className="opname-bahan-warna-card">
                    <div className="opname-bahan-warna-header">
                      <div className="opname-bahan-form-group-inline">
                        <label>Warna {wIdx + 1}</label>
                        <select
                          required
                          value={w.isCustom ? "Lainnya" : w.nama}
                          onChange={(e) => handleWarnaChange(wIdx, e.target.value)}
                        >
                          <option value="">-- Pilih Warna --</option>
                        {(() => {
                          const selectedBahan = bahanList.find(b => b.id === parseInt(newItem.bahan_id));
                          const optionsToUse = selectedBahan?.available_colors?.length > 0 
                            ? [...selectedBahan.available_colors, "Lainnya"]
                            : WARNA_OPTIONS;
                          
                          return optionsToUse.map((opt) => (<option key={opt} value={opt}>{opt}</option>));
                        })()}
                        </select>
                        {w.isCustom && (
                          <input
                            type="text"
                            required
                            placeholder="Ketik nama warna"
                            value={w.customNama}
                            onChange={(e) => handleCustomWarnaChange(wIdx, e.target.value)}
                            style={{ marginLeft: '10px' }}
                          />
                        )}
                      </div>
                      <button type="button" className="opname-bahan-btn-icon opname-bahan-btn-danger" onClick={() => handleRemoveWarna(wIdx)}>
                        <FaTimes /> Hapus Warna
                      </button>
                    </div>

                    <div className="opname-bahan-rol-container">
                      <label>Isi Berat Rol ({getBahanSatuan({bahan_id: newItem.bahan_id})})</label>
                      <div className="opname-bahan-rol-grid">
                        {w.rol.map((rVal, rIdx) => (
                          <div key={rIdx} className="opname-bahan-rol-item">
                            <span className="rol-badge">Rol {rIdx + 1}</span>
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={rVal}
                              data-roll-input={`${wIdx}-${rIdx}`}
                              onChange={(e) => handleRolChange(wIdx, rIdx, e.target.value)}
                              onKeyDown={(e) => handleKeyPress(e, wIdx, rIdx)}
                            />
                            {w.rol.length > 1 && (
                              <button type="button" className="remove-rol-btn" onClick={() => handleRemoveRol(wIdx, rIdx)}><FaTimes /></button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button type="button" className="opname-bahan-btn-add-small" onClick={() => handleAddRol(wIdx)}>
                        <FaPlus /> Tambah Rol (Enter)
                      </button>
                    </div>
                  </div>
                ))}

                <button type="button" className="opname-bahan-btn-add-warna" onClick={handleAddWarna}>
                  <FaPlus /> Tambah Warna
                </button>

                <div className="opname-bahan-modal-footer">
                  <button type="button" className="opname-bahan-btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
                  <button type="submit" className="opname-bahan-btn-primary">Simpan Opname</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {showDetail && detailItem && (
        <div className="opname-bahan-modal-overlay">
          <div className="opname-bahan-modal-content opname-bahan-modal-detail">
            <div className="opname-bahan-modal-header">
              <h2>Detail Stok Opname</h2>
              <button className="opname-bahan-close-btn" onClick={() => setShowDetail(false)}><FaTimes /></button>
            </div>
            <div className="opname-bahan-modal-body">
              <div className="opname-bahan-detail-info">
                <p><strong>Keterangan:</strong> {detailItem.keterangan}</p>
                <p><strong>No Opname:</strong> {detailItem.no_surat_jalan}</p>
                <p><strong>Tanggal:</strong> {new Date(detailItem.tanggal_kirim).toLocaleDateString("id-ID")}</p>
                <p><strong>Bahan:</strong> {getBahanName(detailItem)}</p>
                <p><strong>Pabrik:</strong> {detailItem.pabrik?.nama_pabrik}</p>
                <p><strong>Gudang:</strong> {detailItem.gudang?.nama_gudang}</p>
                <p><strong>Harga:</strong> {detailItem.harga}</p>
              </div>

              <hr />
              <h3>Daftar Rol & Barcode</h3>
              {detailItem.warna?.map((w, wIdx) => (
                <div key={wIdx} className="opname-bahan-detail-warna-section">
                  <h4>Warna: {w.warna}</h4>
                  <div className="opname-bahan-rol-grid">
                    {w.rol?.map((rol, rIdx) => {
                      const isRolTerpakai = 
                        (rol.status && rol.status !== 'tersedia') || 
                        (rol.status_stok_bahan && rol.status_stok_bahan !== 'tersedia');
                      return (
                      <div key={rIdx} className={`opname-bahan-rol-item detail ${isRolTerpakai ? 'terpakai' : ''}`}>
                        <span className="rol-badge">Rol {rIdx + 1}</span>
                        <div className="rol-info">
                          <div>
                            <strong>{rol.berat} {getBahanSatuan(detailItem)}</strong>
                            <span className="rol-barcode"><FaBarcode /> {rol.barcode}</span>
                          </div>
                          <div className="rol-actions">
                            <button 
                              className="opname-bahan-btn-icon opname-bahan-edit"
                              onClick={() => handleEditRol(rol)}
                              title="Edit Rol"
                              style={{ background: "none", border: "none", color: "var(--erp-primary, #3b82f6)", cursor: "pointer", fontSize: "14px" }}
                            >
                              <FaEdit />
                            </button>
                            <button 
                              className="opname-bahan-btn-icon opname-bahan-delete"
                              onClick={() => handleDeleteRol(rol.id)}
                              title="Hapus Rol"
                              style={{ background: "none", border: "none", color: "var(--erp-danger)", cursor: "pointer", fontSize: "14px" }}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StokOpnameBahan;

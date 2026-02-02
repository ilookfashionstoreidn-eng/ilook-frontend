import React, { useEffect, useState } from "react";
import "./PembelianBahan.css";
import API from "../../api";
import { FaUndo, FaSearch, FaTimes } from "react-icons/fa";

const RefundBahan = () => {
  const [pembelianList, setPembelianList] = useState([]);
  const [pembelianMeta, setPembelianMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [selectedPembelian, setSelectedPembelian] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pabrikList, setPabrikList] = useState([]);
  const [gudangList, setGudangList] = useState([]);
  const [returnList, setReturnList] = useState([]);
  const [returnMeta, setReturnMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loadingReturnList, setLoadingReturnList] = useState(false);
  const [activeTab, setActiveTab] = useState("return"); // "pembelian" atau "return"

  // Form Return
  const [returnForm, setReturnForm] = useState({
    pembelian_bahan_id: "",
    pembelian_bahan_rol_id: "",
    tipe_return: "refund",
    jumlah_rol: 1,
    total_refund: "",
    keterangan: "",
    tanggal_return: new Date().toISOString().split('T')[0],
    foto_bukti: null,
  });

  const [loadingReturn, setLoadingReturn] = useState(false);

  useEffect(() => {
    if (activeTab === "pembelian") {
      fetchAllData(1, searchTerm);
    } else {
      fetchReturnList(1, searchTerm);
    }
  }, [activeTab]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeTab === "pembelian") {
        fetchAllData(1, searchTerm);
      } else {
        fetchReturnList(1, searchTerm);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchAllData = async (page = 1, search = "") => {
    try {
      setLoading(true);
      const [resPembelian, resPabrik, resGudang] = await Promise.all([
        API.get("/pembelian-bahan", { params: { page, per_page: 10, search } }),
        API.get("/pabrik"),
        API.get("/gudang"),
      ]);

      const data = resPembelian.data?.data?.data || [];
      const meta = resPembelian.data?.data || {};

      setPembelianList(data);
      setPembelianMeta({
        current_page: meta.current_page || 1,
        last_page: meta.last_page || 1,
        total: meta.total || 0
      });

      setPabrikList(Array.isArray(resPabrik.data) ? resPabrik.data : resPabrik.data?.data || []);
      setGudangList(Array.isArray(resGudang.data) ? resGudang.data : resGudang.data?.data || []);
    } catch (e) {
      setError("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnList = async (page = 1, search = "") => {
    try {
      setLoadingReturnList(true);
      const res = await API.get("/return-bahan", { params: { page, per_page: 10, search } });
      const returns = res.data?.data?.data || [];
      const meta = res.data?.data || {};
      
      setReturnList(returns);
      setReturnMeta({
        current_page: meta.current_page || 1,
        last_page: meta.last_page || 1,
        total: meta.total || 0
      });
    } catch (e) {
      console.error("Gagal memuat data return:", e);
    } finally {
      setLoadingReturnList(false);
    }
  };

  const getNamaById = (list, id, field = "nama") => {
    const item = list.find((i) => i.id === id);
    return item ? item[field] || "-" : "-";
  };

  const handleUpdateReturnStatus = async (returnId, newStatus) => {
    if (!window.confirm(`Yakin ingin mengubah status menjadi "${newStatus.toUpperCase()}"?`)) {
      return;
    }

    try {
      const res = await API.put(`/return-bahan/${returnId}/status`, {
        status: newStatus,
      });

      if (res.data?.success) {
        alert(res.data?.message || "Status berhasil diupdate");
        fetchReturnList();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Gagal mengupdate status";
      alert(msg);
    }
  };

  const handleSelectPembelian = (pembelian) => {
    setSelectedPembelian(pembelian);
    setReturnForm({
      pembelian_bahan_id: pembelian.id,
      pembelian_bahan_rol_id: "",
      tipe_return: "refund",
      jumlah_rol: 1,
      total_refund: "",
      keterangan: "",
      tanggal_return: new Date().toISOString().split('T')[0],
      foto_bukti: null,
    });
    setShowForm(true);
  };

  const getMaxRolls = () => {
    if (!selectedPembelian) return 0;
    const totalBeli = selectedPembelian.warna 
      ? selectedPembelian.warna.reduce((acc, curr) => acc + (curr.jumlah_rol || 0), 0)
      : 0;
    const totalSudahReturn = selectedPembelian.returns?.total_rol_returned || 0;
    return Math.max(0, totalBeli - totalSudahReturn);
  };
  
  const handleReturnFormChange = (e) => {
    const { name, value } = e.target;
    setReturnForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReturnFileChange = (e) => {
    setReturnForm((prev) => ({ ...prev, foto_bukti: e.target.files[0] }));
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();

    if (!returnForm.pembelian_bahan_id) {
      alert("Pembelian Bahan ID tidak valid");
      return;
    }

    if (returnForm.tipe_return === "refund" && !returnForm.total_refund) {
      alert("Total refund wajib diisi untuk tipe refund");
      return;
    }

    const maxRolls = getMaxRolls();
    if (parseInt(returnForm.jumlah_rol) > maxRolls) {
      alert(`Jumlah rol tidak boleh melebihi sisa yang tersedia (${maxRolls} rol).`);
      return;
    }

    try {
      setLoadingReturn(true);
      const formData = new FormData();
      formData.append("pembelian_bahan_id", returnForm.pembelian_bahan_id);
      if (returnForm.pembelian_bahan_rol_id) {
        formData.append("pembelian_bahan_rol_id", returnForm.pembelian_bahan_rol_id);
      }
      formData.append("tipe_return", returnForm.tipe_return);
      formData.append("jumlah_rol", returnForm.jumlah_rol);
      if (returnForm.total_refund) {
        formData.append("total_refund", returnForm.total_refund);
      }
      formData.append("keterangan", returnForm.keterangan || "");
      formData.append("tanggal_return", returnForm.tanggal_return);
      if (returnForm.foto_bukti) {
        formData.append("foto_bukti", returnForm.foto_bukti);
      }

      const res = await API.post("/return-bahan", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.success) {
        alert(res.data?.message || "Return/Refund berhasil dicatat");
        setShowForm(false);
        setSelectedPembelian(null);
        fetchAllData();
        await fetchReturnList();
        setActiveTab("return"); // Switch ke tab return setelah submit
      }
    } catch (err) {
      let msg = err.response?.data?.message || err.response?.data?.error || "Gagal mencatat return/refund";
      if (err.response?.data?.errors) {
        msg += "\n\n" + Object.values(err.response.data.errors).flat().join("\n");
      }
      alert(msg);
    } finally {
      setLoadingReturn(false);
    }
  };

  const formatRupiah = (angka) => {
    if (!angka) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  const filteredPembelian = pembelianList;


  return (
    <div className="pembelian-bahan-page">
      <div className="pembelian-bahan-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="pembelian-bahan-header-icon">
            <FaUndo />
          </div>
          <h1>Refund Bahan</h1>
        </div>
        
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: "20px", borderBottom: "2px solid #e5e7eb" }}>
        <div style={{ display: "flex", gap: "20px" }}>
          <button
            onClick={() => setActiveTab("return")}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "return" ? "3px solid #17457c" : "3px solid transparent",
              color: activeTab === "return" ? "#17457c" : "#666",
              fontWeight: activeTab === "return" ? "bold" : "normal",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Daftar Return/Refund ({returnList.length})
          </button>
          <button
            onClick={() => setActiveTab("pembelian")}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "pembelian" ? "3px solid #17457c" : "3px solid transparent",
              color: activeTab === "pembelian" ? "#17457c" : "#666",
              fontWeight: activeTab === "pembelian" ? "bold" : "normal",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Pilih Pembelian ({pembelianList.length})
          </button>
        </div>
      </div>

      {/* Tab Content: List Pembelian */}
      {activeTab === "pembelian" && (
      <div className="pembelian-bahan-table-container">
        <div className="pembelian-bahan-filter-header">
          <div className="pembelian-bahan-search-bar">
            <input
              type="text"
              placeholder="Cari keterangan, no surat jalan, atau SPK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="pembelian-bahan-loading">Memuat data...</p>
        ) : error ? (
          <p className="pembelian-bahan-error">{error}</p>
        ) : filteredPembelian.length === 0 ? (
          <p className="pembelian-bahan-loading">Belum ada data pembelian bahan</p>
        ) : (
          <div className="pembelian-bahan-table-wrapper">
            <table className="pembelian-bahan-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Keterangan</th>
                  <th>SPK Bahan</th>
                  <th>Tanggal Kirim</th>
                  <th>No. Surat Jalan</th>
                  <th>Pabrik</th>
                  <th>Gudang</th>
                  <th>Total Refund</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredPembelian.map((item, index) => (
                  <tr key={item.id}>
                    <td>{(pembelianMeta.current_page - 1) * 10 + index + 1}</td>
                    <td>
                      <span className={`pembelian-bahan-badge ${item.keterangan?.toLowerCase()}`}>
                        {item.keterangan}
                      </span>
                    </td>
                    <td>
                      {item.spk ? (
                        <div>
                          <div>ID: {item.spk.id}</div>
                         
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{item.tanggal_kirim || "-"}</td>
                    <td>{item.no_surat_jalan || "-"}</td>
                    <td>{getNamaById(pabrikList, item.pabrik_id, "nama_pabrik")}</td>
                    <td>{getNamaById(gudangList, item.gudang_id, "nama_gudang")}</td>
                    <td>
                      {item.returns?.total_refund ? formatRupiah(item.returns.total_refund) : "-"}
                    </td>
                    <td>
                      <button
                        className="pembelian-bahan-btn-icon edit"
                        title="Pilih untuk Refund"
                        onClick={() => handleSelectPembelian(item)}
                        style={{ backgroundColor: "#f59e0b", color: "white" }}
                      >
                        <FaUndo />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination Controls Pembelian */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", gap: "8px", alignItems: "center" }}>
              <button
                disabled={pembelianMeta.current_page === 1}
                onClick={() => fetchAllData(pembelianMeta.current_page - 1, searchTerm)}
                style={{ padding: "6px 12px", cursor: "pointer", opacity: pembelianMeta.current_page === 1 ? 0.5 : 1 }}
              >
                Prev
              </button>
              <span style={{ fontSize: "14px" }}>Halaman {pembelianMeta.current_page} dari {pembelianMeta.last_page}</span>
              <button
                disabled={pembelianMeta.current_page === pembelianMeta.last_page}
                onClick={() => fetchAllData(pembelianMeta.current_page + 1, searchTerm)}
                style={{ padding: "6px 12px", cursor: "pointer", opacity: pembelianMeta.current_page === pembelianMeta.last_page ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Tab Content: Daftar Return/Refund */}
      {activeTab === "return" && (
      <div className="pembelian-bahan-table-container">
        {loadingReturnList ? (
          <p className="pembelian-bahan-loading">Memuat data return...</p>
        ) : returnList.length === 0 ? (
          <p className="pembelian-bahan-loading">Belum ada data return/refund</p>
        ) : (
          <div className="pembelian-bahan-table-wrapper">
            <table className="pembelian-bahan-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Pembelian ID</th>
                  <th>Tipe Return</th>
                  <th>Jumlah Rol</th>
                  <th>Total Refund</th>
                  <th>Tanggal Return</th>
                  <th>Keterangan</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {returnList.map((ret, index) => (
                  <tr key={ret.id}>
                    <td>{(returnMeta.current_page - 1) * 10 + index + 1}</td>
                    <td>{ret.pembelian_bahan_id || "-"}</td>
                    <td>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        backgroundColor: ret.tipe_return === "refund" ? "#e3f2fd" : "#f3e5f5",
                        color: ret.tipe_return === "refund" ? "#1976d2" : "#7b1fa2"
                      }}>
                        {ret.tipe_return === "refund" ? "Refund" : "Return Barang"}
                      </span>
                    </td>
                    <td>{ret.jumlah_rol || 0}</td>
                    <td>{ret.total_refund ? formatRupiah(ret.total_refund) : "-"}</td>
                    <td>{new Date(ret.tanggal_return).toLocaleDateString("id-ID")}</td>
                    <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ret.keterangan || "-"}
                    </td>
                    <td>
                      <span className={`pembelian-bahan-badge ${ret.status?.toLowerCase()}`}>
                        {ret.status || "pending"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {ret.foto_bukti && (
                          <a
                            href={ret.foto_bukti.startsWith("http") ? ret.foto_bukti : `http://localhost:8000/storage/${ret.foto_bukti}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#17457c", fontSize: "12px", textDecoration: "underline" }}
                          >
                            Lihat Bukti
                          </a>
                        )}
                        {ret.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleUpdateReturnStatus(ret.id, "approved")}
                              style={{
                                padding: "4px 8px",
                                fontSize: "11px",
                                backgroundColor: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateReturnStatus(ret.id, "rejected")}
                              style={{
                                padding: "4px 8px",
                                fontSize: "11px",
                                backgroundColor: "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {ret.status === "approved" && (
                          <button
                            onClick={() => handleUpdateReturnStatus(ret.id, "completed")}
                            style={{
                                padding: "4px 8px",
                                fontSize: "11px",
                                backgroundColor: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                              }}
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination Controls Return */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", gap: "8px", alignItems: "center" }}>
              <button
                disabled={returnMeta.current_page === 1}
                onClick={() => fetchReturnList(returnMeta.current_page - 1, searchTerm)}
                style={{ padding: "6px 12px", cursor: "pointer", opacity: returnMeta.current_page === 1 ? 0.5 : 1 }}
              >
                Prev
              </button>
              <span style={{ fontSize: "14px" }}>Halaman {returnMeta.current_page} dari {returnMeta.last_page}</span>
              <button
                disabled={returnMeta.current_page === returnMeta.last_page}
                onClick={() => fetchReturnList(returnMeta.current_page + 1, searchTerm)}
                style={{ padding: "6px 12px", cursor: "pointer", opacity: returnMeta.current_page === returnMeta.last_page ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Modal Form Return/Refund */}
      {showForm && selectedPembelian && (
        <div className="pembelian-bahan-modal" onClick={() => setShowForm(false)}>
          <div className="pembelian-bahan-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2>Form Refund - Pembelian ID: {selectedPembelian.id}</h2>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#666" }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Info Pembelian */}
            <div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "#f0f9ff", borderRadius: "8px" }}>
              <div style={{ fontSize: "14px", marginBottom: "4px" }}>
                <strong>Keterangan:</strong> {selectedPembelian.keterangan}
              </div>
              <div style={{ fontSize: "14px", marginBottom: "4px" }}>
                <strong>Tanggal Kirim:</strong> {selectedPembelian.tanggal_kirim}
              </div>
              {selectedPembelian.spk && (
                <div style={{ fontSize: "14px" }}>
                  <strong>SPK ID:</strong> {selectedPembelian.spk.id} | <strong>Status:</strong>{" "}
                  <span className={`pembelian-bahan-badge ${selectedPembelian.spk.status?.toLowerCase()}`}>
                    {selectedPembelian.spk.status}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitReturn} className="pembelian-bahan-form">
              <div className="pembelian-bahan-form-group">
                <label>Tipe Return *</label>
                <select
                  name="tipe_return"
                  value={returnForm.tipe_return}
                  onChange={handleReturnFormChange}
                  required
                >
                  <option value="refund">Refund (Pengembalian Uang)</option>
                  <option value="return_barang">Return Barang (Pengembalian Barang)</option>
                </select>
              </div>

              <div className="pembelian-bahan-form-group">
                <label>Jumlah Rol * (Sisa: {getMaxRolls()})</label>
                <input
                  type="number"
                  name="jumlah_rol"
                  value={returnForm.jumlah_rol}
                  onChange={(e) => {
                    e.target.setCustomValidity("");
                    handleReturnFormChange(e);
                  }}
                  min="1"
                  max={getMaxRolls()}
                  required
                  onInvalid={(e) => {
                    if (e.target.validity.rangeOverflow) {
                      e.target.setCustomValidity(`Jumlah tidak boleh melebihi sisa ${getMaxRolls()} rol`);
                    } else if (e.target.validity.rangeUnderflow) {
                      e.target.setCustomValidity('Jumlah minimal 1 rol');
                    } else if (e.target.validity.valueMissing) {
                      e.target.setCustomValidity('Jumlah rol wajib diisi');
                    }
                  }}
                />
              </div>

              {returnForm.tipe_return === "refund" && (
                <div className="pembelian-bahan-form-group">
                  <label>Total Refund (Rp) *</label>
                  <input
                    type="number"
                    name="total_refund"
                    value={returnForm.total_refund}
                    onChange={handleReturnFormChange}
                    min="0"
                    step="0.01"
                    required
                    placeholder="Masukkan jumlah refund"
                  />
                </div>
              )}

              <div className="pembelian-bahan-form-group">
                <label>Tanggal Return *</label>
                <input
                  type="date"
                  name="tanggal_return"
                  value={returnForm.tanggal_return}
                  onChange={handleReturnFormChange}
                  required
                />
              </div>

              <div className="pembelian-bahan-form-group">
                <label>Keterangan</label>
                <textarea
                  name="keterangan"
                  value={returnForm.keterangan}
                  onChange={handleReturnFormChange}
                  rows="3"
                  placeholder="Alasan return/refund..."
                />
              </div>

              <div className="pembelian-bahan-form-group">
                <label>Foto Bukti (Opsional)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReturnFileChange}
                />
                <small style={{ color: "#666", fontSize: "12px" }}>
                  Format: JPG, PNG, atau PDF (Max 5MB)
                </small>
              </div>

              <div className="pembelian-bahan-form-actions">
                <button
                  type="submit"
                  className="pembelian-bahan-btn pembelian-bahan-btn-primary"
                  disabled={loadingReturn}
                >
                  {loadingReturn ? "Menyimpan..." : "Simpan Refund"}
                </button>
                <button
                  type="button"
                  className="pembelian-bahan-btn pembelian-bahan-btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedPembelian(null);
                  }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundBahan;

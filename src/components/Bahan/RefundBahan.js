import React, { useEffect, useState } from "react";
import "./PembelianBahan.css";
import API from "../../api";
import { FaUndo, FaSearch, FaTimes } from "react-icons/fa";

const RefundBahan = () => {
  const [pembelianList, setPembelianList] = useState([]);
  const [selectedPembelian, setSelectedPembelian] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pabrikList, setPabrikList] = useState([]);
  const [gudangList, setGudangList] = useState([]);
  const [returnList, setReturnList] = useState([]);
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
    fetchAllData();
    fetchReturnList();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [resPembelian, resPabrik, resGudang] = await Promise.all([
        API.get("/pembelian-bahan"),
        API.get("/pabrik"),
        API.get("/gudang"),
      ]);

      let dataBahan = Array.isArray(resPembelian.data.data) ? resPembelian.data.data : resPembelian.data.data?.data || [];
      dataBahan = dataBahan.sort((a, b) => b.id - a.id);
      setPembelianList(dataBahan);

      setPabrikList(Array.isArray(resPabrik.data) ? resPabrik.data : resPabrik.data?.data || []);
      setGudangList(Array.isArray(resGudang.data) ? resGudang.data : resGudang.data?.data || []);
    } catch (e) {
      setError("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnList = async () => {
    try {
      setLoadingReturnList(true);
      const res = await API.get("/return-bahan");
      const returns = res.data?.data || [];
      setReturnList(returns.sort((a, b) => new Date(b.tanggal_return) - new Date(a.tanggal_return)));
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
      const msg = err.response?.data?.message || err.response?.data?.error || "Gagal mencatat return/refund";
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

  const filteredPembelian = pembelianList.filter((item) => {
    const term = (searchTerm || "").toLowerCase();
    return (
      (item.keterangan || "").toLowerCase().includes(term) ||
      (item.no_surat_jalan || "").toLowerCase().includes(term) ||
      (item.spk?.id?.toString() || "").includes(term)
    );
  });


  return (
    <div className="pembelian-bahan-page">
      <div className="pembelian-bahan-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="pembelian-bahan-header-icon">
            <FaUndo />
          </div>
          <h1>Refund Bahan</h1>
        </div>
        <button
          onClick={() => setActiveTab("pembelian")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#f59e0b",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <FaUndo /> Pilih Pembelian untuk Refund
        </button>
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
            <FaSearch style={{ marginRight: "8px", color: "#666" }} />
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
                    <td>{index + 1}</td>
                    <td>
                      <span className={`pembelian-bahan-badge ${item.keterangan?.toLowerCase()}`}>
                        {item.keterangan}
                      </span>
                    </td>
                    <td>
                      {item.spk ? (
                        <div>
                          <div>ID: {item.spk.id}</div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            Status: <span className={`pembelian-bahan-badge ${item.spk.status?.toLowerCase()}`}>
                              {item.spk.status || "-"}
                            </span>
                          </div>
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
                    <td>{index + 1}</td>
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
                <label>Jumlah Rol *</label>
                <input
                  type="number"
                  name="jumlah_rol"
                  value={returnForm.jumlah_rol}
                  onChange={handleReturnFormChange}
                  min="1"
                  required
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

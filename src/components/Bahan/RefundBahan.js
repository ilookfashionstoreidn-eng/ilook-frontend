import React, { useEffect, useState } from "react";
import "./RefundBahan.css";
import API from "../../api";
import { FaUndo, FaSearch, FaTimes, FaClipboardList, FaBoxes, FaFileInvoiceDollar } from "react-icons/fa";

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
  const [activeTab, setActiveTab] = useState("return");

  const [returnForm, setReturnForm] = useState({
    pembelian_bahan_id: "",
    pembelian_bahan_rol_id: "",
    tipe_return: "refund",
    jumlah_rol: 1,
    total_refund: "",
    keterangan: "",
    tanggal_return: new Date().toISOString().split("T")[0],
    foto_bukti: null,
  });

  const [loadingReturn, setLoadingReturn] = useState(false);

  const SWEETALERT_CDN = "https://cdn.jsdelivr.net/npm/sweetalert2@11";

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
      setError(null);
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
        total: meta.total || 0,
      });

      setPabrikList(Array.isArray(resPabrik.data) ? resPabrik.data : resPabrik.data?.data || []);
      setGudangList(Array.isArray(resGudang.data) ? resGudang.data : resGudang.data?.data || []);
    } catch (e) {
      setError("Gagal memuat data pembelian bahan.");
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
        total: meta.total || 0,
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

  const ensureSweetAlert = () =>
    new Promise((resolve, reject) => {
      if (window.Swal) {
        resolve(window.Swal);
        return;
      }

      const existingScript = document.querySelector('script[data-sweetalert2="cdn"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.Swal), { once: true });
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = SWEETALERT_CDN;
      script.async = true;
      script.setAttribute("data-sweetalert2", "cdn");
      script.onload = () => resolve(window.Swal);
      script.onerror = reject;
      document.body.appendChild(script);
    });

  const showStatusAlert = async (type, title, text) => {
    try {
      const Swal = await ensureSweetAlert();
      if (!Swal) throw new Error("SweetAlert2 tidak tersedia");

      await Swal.fire({
        icon: type,
        title,
        text,
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          popup: "refund-swal-popup",
          confirmButton: "refund-swal-btn refund-swal-btn-primary",
        },
      });
      return true;
    } catch (error) {
      console.error("Gagal menampilkan SweetAlert:", error);
      return false;
    }
  };

  const showConfirmAlert = async ({ title, text, confirmText, confirmClass }) => {
    try {
      const Swal = await ensureSweetAlert();
      if (!Swal) throw new Error("SweetAlert2 tidak tersedia");

      const result = await Swal.fire({
        icon: "question",
        title,
        text,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: "Batal",
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
          popup: "refund-swal-popup",
          confirmButton: `refund-swal-btn ${confirmClass || "refund-swal-btn-primary"}`,
          cancelButton: "refund-swal-btn refund-swal-btn-cancel",
        },
      });

      return !!result.isConfirmed;
    } catch (error) {
      console.error("Gagal menampilkan konfirmasi SweetAlert:", error);
      return false;
    }
  };

  const handleUpdateReturnStatus = async (returnId, newStatus) => {
    const statusConfig = {
      approved: {
        title: "Approve Return?",
        text: "Data return/refund akan di-approve. Lanjutkan?",
        confirmText: "Ya, Approve",
        confirmClass: "refund-swal-btn-approve",
      },
      rejected: {
        title: "Reject Return?",
        text: "Data return/refund akan di-reject. Lanjutkan?",
        confirmText: "Ya, Reject",
        confirmClass: "refund-swal-btn-reject",
      },
      completed: {
        title: "Selesaikan Return?",
        text: "Status return/refund akan diubah menjadi completed. Lanjutkan?",
        confirmText: "Ya, Complete",
        confirmClass: "refund-swal-btn-complete",
      },
    };

    const config = statusConfig[newStatus] || {
      title: "Ubah Status?",
      text: `Yakin ingin mengubah status menjadi "${newStatus.toUpperCase()}"?`,
      confirmText: "Ya, Lanjutkan",
      confirmClass: "refund-swal-btn-primary",
    };

    const confirmProceed = await showConfirmAlert(config);
    if (!confirmProceed) return;

    try {
      const res = await API.put(`/return-bahan/${returnId}/status`, {
        status: newStatus,
      });

      if (res.data?.success) {
        await showStatusAlert("success", "Berhasil", res.data?.message || "Status berhasil diupdate");
        fetchReturnList(returnMeta.current_page, searchTerm);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Gagal mengupdate status";
      await showStatusAlert("error", "Gagal", msg);
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
      tanggal_return: new Date().toISOString().split("T")[0],
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

  const sanitizeNumber = (value) => String(value || "").replace(/[^\d]/g, "");

  const formatNumberWithDots = (value) => {
    const numeric = sanitizeNumber(value);
    if (!numeric) return "";
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleTotalRefundChange = (e) => {
    const rawValue = sanitizeNumber(e.target.value);
    setReturnForm((prev) => ({ ...prev, total_refund: rawValue }));
  };

  const handleReturnFileChange = (e) => {
    setReturnForm((prev) => ({ ...prev, foto_bukti: e.target.files[0] }));
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();

    if (!returnForm.pembelian_bahan_id) {
      await showStatusAlert("warning", "Validasi Gagal", "Pembelian Bahan ID tidak valid.");
      return;
    }

    if (returnForm.tipe_return === "refund" && !returnForm.total_refund) {
      await showStatusAlert("warning", "Validasi Gagal", "Total refund wajib diisi untuk tipe refund.");
      return;
    }

    const maxRolls = getMaxRolls();
    if (parseInt(returnForm.jumlah_rol, 10) > maxRolls) {
      await showStatusAlert("warning", "Validasi Gagal", `Jumlah rol tidak boleh melebihi sisa yang tersedia (${maxRolls} rol).`);
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
        formData.append("total_refund", sanitizeNumber(returnForm.total_refund));
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
        await showStatusAlert("success", "Berhasil", res.data?.message || "Return/Refund berhasil dicatat");
        setShowForm(false);
        setSelectedPembelian(null);
        fetchAllData();
        await fetchReturnList();
        setActiveTab("return");
      }
    } catch (err) {
      let msg = err.response?.data?.message || err.response?.data?.error || "Gagal mencatat return/refund";
      if (err.response?.data?.errors) {
        msg += "\n\n" + Object.values(err.response.data.errors).flat().join("\n");
      }
      await showStatusAlert("error", "Gagal", msg);
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

  const getReturnStatusClass = (status) => {
    const normalized = (status || "pending").toLowerCase();
    if (normalized === "approved") return "approved";
    if (normalized === "rejected") return "rejected";
    if (normalized === "completed") return "completed";
    return "pending";
  };

  const totalNominalRefund = returnList.reduce((acc, item) => acc + Number(item.total_refund || 0), 0);

  return (
    <div className="refund-bahan-page">
      <div className="refund-bahan-shell">
        <header className="refund-bahan-topbar">
          <div className="refund-bahan-title-group">
            <div className="refund-bahan-brand-icon">
              <FaUndo />
            </div>
            <div>
              <h1>Refund Bahan</h1>
              <p>Kelola pengembalian bahan dan proses refund secara terstruktur</p>
            </div>
          </div>

          <div className="refund-bahan-kpi-grid">
            <div className="refund-kpi-card">
              <FaClipboardList className="refund-kpi-icon" />
              <div>
                <span>Total Return</span>
                <strong>{returnMeta.total || 0}</strong>
              </div>
            </div>
            <div className="refund-kpi-card">
              <FaBoxes className="refund-kpi-icon" />
              <div>
                <span>Total Pembelian</span>
                <strong>{pembelianMeta.total || 0}</strong>
              </div>
            </div>
            <div className="refund-kpi-card refund-kpi-card-accent">
              <FaFileInvoiceDollar className="refund-kpi-icon" />
              <div>
                <span>Nominal Refund</span>
                <strong>{formatRupiah(totalNominalRefund)}</strong>
              </div>
            </div>
          </div>
        </header>

        <section className="refund-bahan-card">
          <div className="refund-tabbar">
            <button
              type="button"
              className={`refund-tab ${activeTab === "return" ? "active" : ""}`}
              onClick={() => setActiveTab("return")}
            >
              Daftar Return/Refund
              <span>{returnMeta.total || 0}</span>
            </button>
            <button
              type="button"
              className={`refund-tab ${activeTab === "pembelian" ? "active" : ""}`}
              onClick={() => setActiveTab("pembelian")}
            >
              Pilih Pembelian
              <span>{pembelianMeta.total || 0}</span>
            </button>
          </div>

          <div className="refund-toolbar">
            <div className="refund-search-bar">
              <FaSearch className="refund-search-icon" />
              <input
                type="text"
                placeholder={
                  activeTab === "pembelian"
                    ? "Cari keterangan, no surat jalan, atau SPK..."
                    : "Cari data return, status, atau ID pembelian..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="refund-toolbar-meta">
              Menampilkan halaman {activeTab === "pembelian" ? pembelianMeta.current_page : returnMeta.current_page}
            </div>
          </div>

          {activeTab === "pembelian" && (
            <>
              {loading ? (
                <p className="refund-state">Memuat data pembelian...</p>
              ) : error ? (
                <p className="refund-state refund-state-error">{error}</p>
              ) : pembelianList.length === 0 ? (
                <p className="refund-state">Belum ada data pembelian bahan.</p>
              ) : (
                <>
                  <div className="refund-table-wrapper">
                    <table className="refund-table">
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
                        {pembelianList.map((item, index) => (
                          <tr key={item.id}>
                            <td>{(pembelianMeta.current_page - 1) * 10 + index + 1}</td>
                            <td>
                              <span className="refund-chip">{item.keterangan || "-"}</span>
                            </td>
                            <td>{item.spk ? `ID: ${item.spk.id}` : "-"}</td>
                            <td>{item.tanggal_kirim || "-"}</td>
                            <td>{item.no_surat_jalan || "-"}</td>
                            <td>{getNamaById(pabrikList, item.pabrik_id, "nama_pabrik")}</td>
                            <td>{getNamaById(gudangList, item.gudang_id, "nama_gudang")}</td>
                            <td className="refund-value">
                              {item.returns?.total_refund ? formatRupiah(item.returns.total_refund) : "-"}
                            </td>
                            <td>
                              <button
                                className="refund-action-btn"
                                title="Pilih untuk Refund"
                                onClick={() => handleSelectPembelian(item)}
                              >
                                <FaUndo /> Pilih
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="refund-pagination">
                    <button
                      type="button"
                      disabled={pembelianMeta.current_page === 1}
                      onClick={() => fetchAllData(pembelianMeta.current_page - 1, searchTerm)}
                    >
                      Prev
                    </button>
                    <span>
                      Halaman {pembelianMeta.current_page} dari {pembelianMeta.last_page}
                    </span>
                    <button
                      type="button"
                      disabled={pembelianMeta.current_page === pembelianMeta.last_page}
                      onClick={() => fetchAllData(pembelianMeta.current_page + 1, searchTerm)}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === "return" && (
            <>
              {loadingReturnList ? (
                <p className="refund-state">Memuat data return...</p>
              ) : returnList.length === 0 ? (
                <p className="refund-state">Belum ada data return/refund.</p>
              ) : (
                <>
                  <div className="refund-table-wrapper">
                    <table className="refund-table">
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
                            <td>#{ret.pembelian_bahan_id || "-"}</td>
                            <td>
                              <span className={`refund-type ${ret.tipe_return === "refund" ? "refund" : "return"}`}>
                                {ret.tipe_return === "refund" ? "Refund" : "Return Barang"}
                              </span>
                            </td>
                            <td>{ret.jumlah_rol || 0}</td>
                            <td className="refund-value">{ret.total_refund ? formatRupiah(ret.total_refund) : "-"}</td>
                            <td>{new Date(ret.tanggal_return).toLocaleDateString("id-ID")}</td>
                            <td className="refund-ellipsis" title={ret.keterangan || "-"}>
                              {ret.keterangan || "-"}
                            </td>
                            <td>
                              <span className={`refund-status ${getReturnStatusClass(ret.status)}`}>
                                {ret.status || "pending"}
                              </span>
                            </td>
                            <td>
                              <div className="refund-action-group">
                                {ret.foto_bukti && (
                                  <a
                                    href={ret.foto_bukti.startsWith("http") ? ret.foto_bukti : `http://localhost:8000/storage/${ret.foto_bukti}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="refund-link"
                                  >
                                    Lihat Bukti
                                  </a>
                                )}

                                {ret.status === "pending" && (
                                  <>
                                    <button type="button" className="refund-mini-btn approve" onClick={() => handleUpdateReturnStatus(ret.id, "approved")}>
                                      Approve
                                    </button>
                                    <button type="button" className="refund-mini-btn reject" onClick={() => handleUpdateReturnStatus(ret.id, "rejected")}>
                                      Reject
                                    </button>
                                  </>
                                )}

                                {ret.status === "approved" && (
                                  <button type="button" className="refund-mini-btn complete" onClick={() => handleUpdateReturnStatus(ret.id, "completed")}>
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

                  <div className="refund-pagination">
                    <button
                      type="button"
                      disabled={returnMeta.current_page === 1}
                      onClick={() => fetchReturnList(returnMeta.current_page - 1, searchTerm)}
                    >
                      Prev
                    </button>
                    <span>
                      Halaman {returnMeta.current_page} dari {returnMeta.last_page}
                    </span>
                    <button
                      type="button"
                      disabled={returnMeta.current_page === returnMeta.last_page}
                      onClick={() => fetchReturnList(returnMeta.current_page + 1, searchTerm)}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {showForm && selectedPembelian && (
          <div className="refund-modal" onClick={() => setShowForm(false)}>
            <div className="refund-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="refund-modal-header">
                <div>
                  <h2>Form Refund</h2>
                  <p>Pembelian ID: #{selectedPembelian.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="refund-close-btn"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="refund-info-panel">
                <div>
                  <span>Keterangan</span>
                  <strong>{selectedPembelian.keterangan || "-"}</strong>
                </div>
                <div>
                  <span>Tanggal Kirim</span>
                  <strong>{selectedPembelian.tanggal_kirim || "-"}</strong>
                </div>
                <div>
                  <span>Status SPK</span>
                  <strong>{selectedPembelian.spk?.status || "-"}</strong>
                </div>
                <div>
                  <span>Sisa Maksimal Rol</span>
                  <strong>{getMaxRolls()} rol</strong>
                </div>
              </div>

              <form onSubmit={handleSubmitReturn} className="refund-form">
                <div className="refund-form-row">
                  <div className="refund-form-group">
                    <label>Tipe Return *</label>
                    <select name="tipe_return" value={returnForm.tipe_return} onChange={handleReturnFormChange} required>
                      <option value="refund">Refund (Pengembalian Uang)</option>
                      <option value="return_barang">Return Barang (Pengembalian Barang)</option>
                    </select>
                  </div>

                  <div className="refund-form-group">
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
                          e.target.setCustomValidity("Jumlah minimal 1 rol");
                        } else if (e.target.validity.valueMissing) {
                          e.target.setCustomValidity("Jumlah rol wajib diisi");
                        }
                      }}
                    />
                  </div>
                </div>

                {returnForm.tipe_return === "refund" && (
                  <div className="refund-form-group">
                    <label>Total Refund (Rp) *</label>
                    <div className="refund-input-prefix-wrap">
                      <span className="refund-input-prefix">Rp</span>
                      <input
                        type="text"
                        name="total_refund"
                        value={formatNumberWithDots(returnForm.total_refund)}
                        onChange={handleTotalRefundChange}
                        required
                        inputMode="numeric"
                        placeholder="0"
                        className="refund-input-with-prefix"
                      />
                    </div>
                  </div>
                )}

                <div className="refund-form-row">
                  <div className="refund-form-group">
                    <label>Tanggal Return *</label>
                    <input
                      type="date"
                      name="tanggal_return"
                      value={returnForm.tanggal_return}
                      onChange={handleReturnFormChange}
                      required
                    />
                  </div>

                  <div className="refund-form-group">
                    <label>Foto Bukti (Opsional)</label>
                    <input type="file" accept="image/*,.pdf" onChange={handleReturnFileChange} />
                    <small>Format: JPG, PNG, atau PDF (Max 5MB)</small>
                  </div>
                </div>

                <div className="refund-form-group">
                  <label>Keterangan</label>
                  <textarea
                    name="keterangan"
                    value={returnForm.keterangan}
                    onChange={handleReturnFormChange}
                    rows="3"
                    placeholder="Alasan return/refund..."
                  />
                </div>

                <div className="refund-form-actions">
                  <button type="submit" className="refund-btn-primary" disabled={loadingReturn}>
                    {loadingReturn ? "Menyimpan..." : "Simpan Refund"}
                  </button>
                  <button
                    type="button"
                    className="refund-btn-secondary"
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
    </div>
  );
};

export default RefundBahan;





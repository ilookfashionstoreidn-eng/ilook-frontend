import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiBell,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiFilter,
  FiInfo,
  FiPlus,
  FiSearch,
  FiUpload,
  FiX,
} from "react-icons/fi";
import API from "../../../api";
import "./CashboanCutting.css";

const SWEETALERT_CDN = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js";

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

const showSuccessAlert = async (title, text) => {
  try {
    const Swal = await ensureSweetAlert();
    if (!Swal) throw new Error("SweetAlert2 tidak tersedia");

    await Swal.fire({
      icon: "success",
      title: title || "Berhasil",
      text: text || "Data berhasil disimpan.",
      confirmButtonText: "OK",
      customClass: {
        container: "cashboan-cutting-swal-container",
      },
    });
  } catch (alertError) {
    console.error("Gagal menampilkan SweetAlert:", alertError);
    window.alert(text || title || "Berhasil");
  }
};

const initialNewCashbon = {
  tukang_cutting_id: "",
  jumlah_cashboan: "",
  tanggal_cashboan: "",
  bukti_transfer: null,
};

const formatRupiahInput = (value) => {
  if (!value && value !== 0) return "";
  const number = String(value).replace(/\D/g, "");
  if (!number) return "";
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseRupiah = (value) => {
  if (!value && value !== 0) return "";
  return String(value).replace(/\D/g, "");
};

const formatRupiahDisplay = (angka) => {
  if (!angka && angka !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(angka) || 0);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusClass = (status = "") => {
  const normalized = String(status).toLowerCase();

  if (normalized === "lunas") return "is-lunas";
  if (normalized.includes("proses")) return "is-proses";
  return "is-belum";
};

const CashboanCutting = () => {
  const [cashbons, setCashbons] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCashbon, setSelectedCashbon] = useState(null);
  const [newCashbon, setNewCashbon] = useState(initialNewCashbon);

  const [selectedDetailCashbon, setSelectedDetailCashbon] = useState(null);
  const [selectedJenisPerubahan, setSelectedJenisPerubahan] = useState("");
  const [logHistory, setLogHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isFetchingCashbons = useRef(false);

  const closeTambahModal = () => {
    setSelectedCashbon(null);
    setNewCashbon(initialNewCashbon);
  };

  const closeDetailModal = () => {
    setSelectedDetailCashbon(null);
    setSelectedJenisPerubahan("");
    setLogHistory([]);
  };

  const refreshCashbons = async ({ showLoading = false } = {}) => {
    if (isFetchingCashbons.current) return;

    try {
      isFetchingCashbons.current = true;
      if (showLoading) setLoading(true);
      setError(null);

      const response = await API.get("/cashboan_cutting");
      setCashbons(response?.data?.data || []);
    } catch (fetchError) {
      if (fetchError.response?.status === 429) {
        setError("Terlalu banyak permintaan. Silakan tunggu beberapa saat lalu coba lagi.");
      } else {
        setError(fetchError.response?.data?.message || "Gagal mengambil data cashboan cutting.");
      }
      console.error("Error fetching cashboan cutting:", fetchError);
    } finally {
      if (showLoading) setLoading(false);
      isFetchingCashbons.current = false;
    }
  };

  const fetchHistory = async (id, jenisPerubahan = "") => {
    if (!id) {
      setLogHistory([]);
      return;
    }

    setHistoryLoading(true);
    try {
      const response = await API.get(`history_cashboan_cutting/${id}`, {
        params: jenisPerubahan ? { jenis_perubahan: jenisPerubahan } : {},
      });

      setLogHistory(response?.data || []);
    } catch (fetchError) {
      console.error("Error fetching history cashboan:", fetchError.response?.data || fetchError);

      if (fetchError.response?.status === 404) {
        setLogHistory([]);
      } else if (fetchError.response?.status === 429) {
        setError("Terlalu banyak permintaan saat memuat riwayat. Coba lagi sebentar.");
      } else {
        setLogHistory([]);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    refreshCashbons({ showLoading: true });

    return () => {
      isFetchingCashbons.current = false;
    };
  }, []);

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === "Escape") {
        if (selectedCashbon) closeTambahModal();
        if (selectedDetailCashbon) closeDetailModal();
      }
    };

    if (selectedCashbon || selectedDetailCashbon) {
      document.addEventListener("keydown", onEscape);
    }

    return () => {
      document.removeEventListener("keydown", onEscape);
    };
  }, [selectedCashbon, selectedDetailCashbon]);

  const filteredCashbons = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const bySearch = cashbons.filter((cashbon) => {
      const namaTukang = cashbon.tukang_cutting?.nama_tukang_cutting || cashbon.nama_tukang_cutting || "";
      return namaTukang.toLowerCase().includes(keyword);
    });

    return [...bySearch].sort((a, b) => {
      const timeA = new Date(a.updated_at || a.tanggal_cashboan || 0).getTime();
      const timeB = new Date(b.updated_at || b.tanggal_cashboan || 0).getTime();

      if (timeA !== timeB) return timeB - timeA;
      return Number(b.id || b.tukang_cutting_id || 0) - Number(a.id || a.tukang_cutting_id || 0);
    });
  }, [cashbons, searchTerm]);

  const stats = useMemo(() => {
    const totalCashboan = filteredCashbons.reduce((sum, item) => sum + (Number(item.jumlah_cashboan) || 0), 0);
    const lunas = filteredCashbons.filter((item) => String(item.status_pembayaran || "").toLowerCase() === "lunas").length;

    return {
      totalData: filteredCashbons.length,
      totalCashboan,
      lunas,
      belumLunas: filteredCashbons.length - lunas,
    };
  }, [filteredCashbons]);

  const handleTambahClick = (cashbon) => {
    setSelectedCashbon(cashbon);
  };

  const handleDetailClick = (cashbon) => {
    setSelectedDetailCashbon(cashbon);
    setSelectedJenisPerubahan("");
    fetchHistory(cashbon.id, "");
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();

    if (!newCashbon.jumlah_cashboan || parseRupiah(newCashbon.jumlah_cashboan) === "") {
      alert("Jumlah cashboan harus diisi.");
      return;
    }

    const jumlahCashboan = parseInt(parseRupiah(newCashbon.jumlah_cashboan), 10);

    if (Number.isNaN(jumlahCashboan) || jumlahCashboan <= 0) {
      alert("Jumlah cashboan tidak valid. Pastikan Anda memasukkan angka yang benar.");
      return;
    }

    const formData = new FormData();
    formData.append("perubahan_cashboan", String(jumlahCashboan));

    if (newCashbon.bukti_transfer) {
      formData.append("bukti_transfer", newCashbon.bukti_transfer);
    }

    try {
      const tukangCuttingId = selectedCashbon.tukang_cutting_id || selectedCashbon.id;
      const response = await API.post(`/cashboan_cutting/tambah/${tukangCuttingId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      closeTambahModal();
      await refreshCashbons();
      await showSuccessAlert("Berhasil Menambahkan", response.data?.message || "Data cashboan berhasil disimpan.");
    } catch (submitError) {
      console.error("Error submit cashboan cutting:", submitError.response?.data?.message || submitError.message);
      alert(submitError.response?.data?.message || "Terjadi kesalahan saat menyimpan data cashboan.");
    }
  };

  return (
    <div className="cashboan-cutting-erp-container">
      <header className="cashboan-cutting-erp-header">
        <div className="cashboan-cutting-erp-header-top">
          <div className="cashboan-cutting-erp-title-group">
            <div className="cashboan-cutting-erp-brand-icon">
              <FiDollarSign />
            </div>
            <div className="cashboan-cutting-erp-title-wrap">
              <div className="cashboan-cutting-erp-module-pill">ERP Finance Module</div>
              <h1>Cashboan Cutting</h1>
              <p>Monitoring cashboan, status pembayaran, dan riwayat perubahan nominal</p>
            </div>
          </div>

          <div className="cashboan-cutting-erp-actions">
            <div className="cashboan-cutting-erp-search-wrap">
              <FiSearch className="cashboan-cutting-erp-search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari nama tukang cutting..."
                className="cashboan-cutting-erp-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="cashboan-cutting-erp-search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Hapus pencarian"
                >
                  <FiX />
                </button>
              )}
            </div>

            <button type="button" className="cashboan-cutting-erp-icon-btn" aria-label="Notifikasi">
              <FiBell />
              <span className="cashboan-cutting-erp-dot" />
            </button>

            <div className="cashboan-cutting-erp-avatar" title="Finance Team">
              FC
            </div>
          </div>
        </div>
      </header>

      <main className="cashboan-cutting-erp-main">
        <section className="cashboan-cutting-erp-stats">
          <article className="cashboan-cutting-erp-stat-item">
            <p className="cashboan-cutting-erp-stat-label">Total Data</p>
            <p className="cashboan-cutting-erp-stat-value">{stats.totalData}</p>
          </article>

          <article className="cashboan-cutting-erp-stat-item">
            <p className="cashboan-cutting-erp-stat-label">Total Cashboan</p>
            <p className="cashboan-cutting-erp-stat-value cashboan-cutting-erp-stat-value-info">
              {formatRupiahDisplay(stats.totalCashboan)}
            </p>
          </article>

          <article className="cashboan-cutting-erp-stat-item">
            <p className="cashboan-cutting-erp-stat-label">Lunas</p>
            <p className="cashboan-cutting-erp-stat-value cashboan-cutting-erp-stat-value-success">{stats.lunas}</p>
          </article>

          <article className="cashboan-cutting-erp-stat-item">
            <p className="cashboan-cutting-erp-stat-label">Belum Lunas</p>
            <p className="cashboan-cutting-erp-stat-value cashboan-cutting-erp-stat-value-warning">{stats.belumLunas}</p>
          </article>
        </section>

        <section className="cashboan-cutting-erp-table-wrapper">
          <div className="cashboan-cutting-erp-table-header">
            <div>
              <h3>Daftar Cashboan Tukang Cutting</h3>
              <p>Menampilkan {filteredCashbons.length} data sesuai filter pencarian.</p>
            </div>
          </div>

          {loading ? (
            <div className="cashboan-cutting-erp-loading">
              <div className="cashboan-cutting-erp-spinner" />
              <p>Memuat data cashboan cutting...</p>
            </div>
          ) : error ? (
            <div className="cashboan-cutting-erp-empty-state">
              <FiAlertCircle className="cashboan-cutting-erp-empty-icon" />
              <p className="cashboan-cutting-erp-empty-title error">{error}</p>
            </div>
          ) : filteredCashbons.length > 0 ? (
            <div className="cashboan-cutting-erp-table-scroll">
              <table className="cashboan-cutting-erp-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Tukang Cutting</th>
                    <th>Jumlah Cashboan</th>
                    <th>Status Pembayaran</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCashbons.map((cashbon, index) => {
                    const namaTukang = cashbon.tukang_cutting?.nama_tukang_cutting || cashbon.nama_tukang_cutting || "-";
                    const status = cashbon.status_pembayaran || "belum lunas";

                    return (
                      <tr key={cashbon.id || cashbon.tukang_cutting_id || index}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="cashboan-cutting-erp-name-cell">
                            <FiClock />
                            <span>{namaTukang}</span>
                          </div>
                        </td>
                        <td>
                          <span className="cashboan-cutting-erp-badge info">{formatRupiahDisplay(cashbon.jumlah_cashboan || 0)}</span>
                        </td>
                        <td>
                          <span className={`cashboan-cutting-erp-status-badge ${getStatusClass(status)}`}>{status}</span>
                        </td>
                        <td>{formatDateTime(cashbon.tanggal_cashboan || cashbon.updated_at)}</td>
                        <td>
                          <div className="cashboan-cutting-erp-actions-cell">
                            <button type="button" className="cashboan-cutting-erp-action-btn add" onClick={() => handleTambahClick(cashbon)}>
                              <FiPlus /> Tambah
                            </button>
                            {cashbon.id && (
                              <button type="button" className="cashboan-cutting-erp-action-btn detail" onClick={() => handleDetailClick(cashbon)}>
                                <FiInfo /> Detail
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cashboan-cutting-erp-empty-state">
              <FiFilter className="cashboan-cutting-erp-empty-icon" />
              <p className="cashboan-cutting-erp-empty-title">Tidak ada data cashboan</p>
              <p className="cashboan-cutting-erp-empty-text">Coba ubah kata kunci pencarian atau periksa kembali data master tukang cutting.</p>
            </div>
          )}
        </section>
      </main>

      {selectedCashbon && (
        <div className="cashboan-cutting-erp-modal-overlay" onClick={closeTambahModal}>
          <div className="cashboan-cutting-erp-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="cashboan-cutting-erp-modal-header">
              <div>
                <h2>Tambah Cashboan Cutting</h2>
                <p>{selectedCashbon.tukang_cutting?.nama_tukang_cutting || selectedCashbon.nama_tukang_cutting || "-"}</p>
              </div>
              <button type="button" className="cashboan-cutting-erp-modal-close" onClick={closeTambahModal}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="cashboan-cutting-erp-form">
              <div className="cashboan-cutting-erp-form-grid">
                <div className="cashboan-cutting-erp-form-group">
                  <label>Jumlah Cashboan</label>
                  <div className="cashboan-cutting-erp-rupiah-input">
                    <input
                      type="text"
                      value={formatRupiahInput(newCashbon.jumlah_cashboan)}
                      onChange={(event) => {
                        const numericValue = parseRupiah(event.target.value);
                        setNewCashbon((prev) => ({
                          ...prev,
                          jumlah_cashboan: numericValue !== "" ? numericValue : "",
                        }));
                      }}
                      placeholder="Masukkan jumlah cashboan"
                      required
                    />
                  </div>
                </div>

                <div className="cashboan-cutting-erp-form-group full">
                  <label>Upload Bukti Transfer (Opsional)</label>
                  <div className="cashboan-cutting-erp-file-input-wrap">
                    <FiUpload />
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(event) =>
                        setNewCashbon((prev) => ({
                          ...prev,
                          bukti_transfer: event.target.files?.[0] || null,
                        }))
                      }
                    />
                  </div>
                  {newCashbon.bukti_transfer && <p className="cashboan-cutting-erp-file-name">File: {newCashbon.bukti_transfer.name}</p>}
                </div>
              </div>

              <div className="cashboan-cutting-erp-form-actions">
                <button type="button" className="cashboan-cutting-erp-btn-secondary" onClick={closeTambahModal}>
                  Batal
                </button>
                <button type="submit" className="cashboan-cutting-erp-btn-primary">
                  Simpan Cashboan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDetailCashbon && (
        <div className="cashboan-cutting-erp-modal-overlay" onClick={closeDetailModal}>
          <div className="cashboan-cutting-erp-modal-content wide" onClick={(event) => event.stopPropagation()}>
            <div className="cashboan-cutting-erp-modal-header">
              <div>
                <h2>Detail Cashboan Cutting</h2>
                <p>{selectedDetailCashbon.tukang_cutting?.nama_tukang_cutting || selectedDetailCashbon.nama_tukang_cutting || "-"}</p>
              </div>
              <button type="button" className="cashboan-cutting-erp-modal-close" onClick={closeDetailModal}>
                <FiX />
              </button>
            </div>

            <div className="cashboan-cutting-erp-modal-body">
              <div className="cashboan-cutting-erp-info-grid">
                <div className="cashboan-cutting-erp-info-item">
                  <span className="cashboan-cutting-erp-info-label">ID Cashboan</span>
                  <strong>{selectedDetailCashbon.id || "-"}</strong>
                </div>
                <div className="cashboan-cutting-erp-info-item">
                  <span className="cashboan-cutting-erp-info-label">Nama Tukang</span>
                  <strong>{selectedDetailCashbon.tukang_cutting?.nama_tukang_cutting || selectedDetailCashbon.nama_tukang_cutting || "-"}</strong>
                </div>
                <div className="cashboan-cutting-erp-info-item">
                  <span className="cashboan-cutting-erp-info-label">Jumlah Cashboan</span>
                  <strong>{formatRupiahDisplay(selectedDetailCashbon.jumlah_cashboan || 0)}</strong>
                </div>
                <div className="cashboan-cutting-erp-info-item">
                  <span className="cashboan-cutting-erp-info-label">Status</span>
                  <strong>
                    <span className={`cashboan-cutting-erp-status-badge ${getStatusClass(selectedDetailCashbon.status_pembayaran || "")}`}>
                      {selectedDetailCashbon.status_pembayaran || "belum lunas"}
                    </span>
                  </strong>
                </div>
                <div className="cashboan-cutting-erp-info-item">
                  <span className="cashboan-cutting-erp-info-label">Tanggal Cashboan</span>
                  <strong>{formatDateTime(selectedDetailCashbon.tanggal_cashboan)}</strong>
                </div>
              </div>

              <div className="cashboan-cutting-erp-history-card">
                <div className="cashboan-cutting-erp-history-header">
                  <h4>Riwayat Perubahan Cashboan</h4>
                  <select
                    value={selectedJenisPerubahan}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSelectedJenisPerubahan(value);
                      fetchHistory(selectedDetailCashbon.id, value);
                    }}
                  >
                    <option value="">Semua</option>
                    <option value="penambahan">Penambahan</option>
                    <option value="pengurangan">Pengurangan</option>
                  </select>
                </div>

                {historyLoading ? (
                  <div className="cashboan-cutting-erp-loading inline">
                    <div className="cashboan-cutting-erp-spinner" />
                    <p>Memuat log history...</p>
                  </div>
                ) : logHistory.length > 0 ? (
                  <div className="cashboan-cutting-erp-history-scroll">
                    <table className="cashboan-cutting-erp-history-table">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>Jenis</th>
                          <th>Nominal</th>
                          <th>Bukti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logHistory.map((history, index) => (
                          <tr key={`${history.id || "history"}-${index}`}>
                            <td>{formatDateTime(history.tanggal_perubahan)}</td>
                            <td>
                              <span className={`cashboan-cutting-erp-mini-badge ${history.jenis_perubahan === "penambahan" ? "plus" : "minus"}`}>
                                {history.jenis_perubahan || "-"}
                              </span>
                            </td>
                            <td>{formatRupiahDisplay(history.perubahan_cashboan || 0)}</td>
                            <td>
                              {history.bukti_transfer ? (
                                <a
                                  className="cashboan-cutting-erp-link"
                                  href={`${process.env.REACT_APP_FILE_URL}/storage/${history.bukti_transfer}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Lihat Bukti
                                </a>
                              ) : (
                                <span className="cashboan-cutting-erp-muted-text">Tidak ada</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="cashboan-cutting-erp-empty-state inline">
                    <FiCheckCircle className="cashboan-cutting-erp-empty-icon" />
                    <p className="cashboan-cutting-erp-empty-title">Belum ada riwayat perubahan</p>
                  </div>
                )}
              </div>
            </div>

            <div className="cashboan-cutting-erp-modal-footer">
              <button type="button" className="cashboan-cutting-erp-btn-secondary" onClick={closeDetailModal}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashboanCutting;

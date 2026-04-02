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
import "./HutangCutting.css";

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

const initialNewHutang = {
  tukang_cutting_id: "",
  jumlah_hutang: "",
  potongan_per_minggu: "",
  is_potongan_persen: false,
  persentase_potongan: null,
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
        container: "hutang-cutting-swal-container",
      },
    });
  } catch (alertError) {
    console.error("Gagal menampilkan SweetAlert:", alertError);
    window.alert(text || title || "Berhasil");
  }
};

const HutangCutting = () => {
  const [hutangs, setHutangs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedHutang, setSelectedHutang] = useState(null);
  const [newHutang, setNewHutang] = useState(initialNewHutang);

  const [selectedDetailHutang, setSelectedDetailHutang] = useState(null);
  const [selectedJenisPerubahan, setSelectedJenisPerubahan] = useState("");
  const [logHistory, setLogHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isFetchingHutangs = useRef(false);

  const closeTambahModal = () => {
    setSelectedHutang(null);
    setNewHutang(initialNewHutang);
  };

  const closeDetailModal = () => {
    setSelectedDetailHutang(null);
    setSelectedJenisPerubahan("");
    setLogHistory([]);
  };

  const refreshHutangs = async ({ showLoading = false } = {}) => {
    if (isFetchingHutangs.current) return;

    try {
      isFetchingHutangs.current = true;
      if (showLoading) setLoading(true);
      setError(null);

      const response = await API.get("/hutang_cutting");
      setHutangs(response?.data?.data || []);
    } catch (fetchError) {
      if (fetchError.response?.status === 429) {
        setError("Terlalu banyak permintaan. Silakan tunggu beberapa saat lalu coba lagi.");
      } else {
        setError(fetchError.response?.data?.message || "Gagal mengambil data hutang cutting.");
      }
      console.error("Error fetching Hutang Cutting:", fetchError);
    } finally {
      if (showLoading) setLoading(false);
      isFetchingHutangs.current = false;
    }
  };

  const fetchHistory = async (id, jenisPerubahan = "") => {
    if (!id) {
      setLogHistory([]);
      return;
    }

    setHistoryLoading(true);
    try {
      const response = await API.get(`/history_cutting/${id}`, {
        params: { jenis_perubahan: jenisPerubahan || "" },
      });

      setLogHistory(response.data || []);
    } catch (fetchError) {
      console.error("Error fetching history hutang cutting:", fetchError.response?.data || fetchError);

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
    refreshHutangs({ showLoading: true });

    return () => {
      isFetchingHutangs.current = false;
    };
  }, []);

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === "Escape") {
        if (selectedHutang) closeTambahModal();
        if (selectedDetailHutang) closeDetailModal();
      }
    };

    if (selectedHutang || selectedDetailHutang) {
      document.addEventListener("keydown", onEscape);
    }

    return () => {
      document.removeEventListener("keydown", onEscape);
    };
  }, [selectedHutang, selectedDetailHutang]);

  const filteredHutangs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const bySearch = hutangs.filter((hutang) => {
      const namaTukang = hutang.tukang_cutting?.nama_tukang_cutting || hutang.nama_tukang_cutting || "";
      return namaTukang.toLowerCase().includes(keyword);
    });

    return [...bySearch].sort((a, b) => {
      const timeA = new Date(a.updated_at || a.tanggal_hutang || 0).getTime();
      const timeB = new Date(b.updated_at || b.tanggal_hutang || 0).getTime();

      if (timeA !== timeB) return timeB - timeA;
      return Number(b.id || b.tukang_cutting_id || 0) - Number(a.id || a.tukang_cutting_id || 0);
    });
  }, [hutangs, searchTerm]);

  const stats = useMemo(() => {
    const totalHutang = filteredHutangs.reduce((sum, hutang) => sum + (Number(hutang.jumlah_hutang) || 0), 0);
    const totalPotongan = filteredHutangs.reduce((sum, hutang) => sum + (Number(hutang.potongan_per_minggu) || 0), 0);
    const lunas = filteredHutangs.filter((hutang) => String(hutang.status_pembayaran || "").toLowerCase() === "lunas").length;

    return {
      totalData: filteredHutangs.length,
      totalHutang,
      totalPotongan,
      belumLunas: filteredHutangs.length - lunas,
    };
  }, [filteredHutangs]);

  const handleTambahClick = (hutang) => {
    setSelectedHutang(hutang);
  };

  const handleDetailClick = (hutang) => {
    setSelectedDetailHutang(hutang);
    setSelectedJenisPerubahan("");
    fetchHistory(hutang.id, "");
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();

    if (newHutang.is_potongan_persen && !newHutang.persentase_potongan) {
      alert("Persentase potongan harus diisi.");
      return;
    }

    if (!newHutang.is_potongan_persen && !newHutang.potongan_per_minggu) {
      alert("Potongan per minggu harus diisi.");
      return;
    }

    const formData = new FormData();
    formData.append("tukang_cutting_id", selectedHutang.tukang_cutting_id || selectedHutang.id);

    const jumlahHutang = parseRupiah(newHutang.jumlah_hutang);
    formData.append("jumlah_hutang", jumlahHutang);
    formData.append("is_potongan_persen", newHutang.is_potongan_persen ? "1" : "0");

    if (newHutang.is_potongan_persen) {
      formData.append("persentase_potongan", newHutang.persentase_potongan);
    } else {
      formData.append("potongan_per_minggu", parseRupiah(newHutang.potongan_per_minggu));
    }

    if (newHutang.bukti_transfer) {
      formData.append("bukti_transfer", newHutang.bukti_transfer);
    }

    try {
      const response = await API.post("/hutang/tambah_cutting", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      closeTambahModal();
      await refreshHutangs();
      await showSuccessAlert("Berhasil Menambahkan", response.data.message || "Data hutang berhasil disimpan.");
    } catch (submitError) {
      console.error("Error submit hutang cutting:", submitError.response?.data?.message || submitError.message);
      alert(submitError.response?.data?.message || "Terjadi kesalahan saat menyimpan data hutang.");
    }
  };

  return (
    <div className="hutang-cutting-erp-container">
      <header className="hutang-cutting-erp-header">
        <div className="hutang-cutting-erp-header-top">
          <div className="hutang-cutting-erp-title-group">
            <div className="hutang-cutting-erp-brand-icon">
              <FiDollarSign />
            </div>
            <div className="hutang-cutting-erp-title-wrap">
              <div className="hutang-cutting-erp-module-pill">Finance Module</div>
              <h1>Hutang Cutting</h1>
              <p>Monitoring hutang, potongan, dan histori pembayaran tukang cutting</p>
            </div>
          </div>

          <div className="hutang-cutting-erp-actions">
            <div className="hutang-cutting-erp-search-wrap">
              <FiSearch className="hutang-cutting-erp-search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari nama tukang cutting..."
                className="hutang-cutting-erp-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="hutang-cutting-erp-search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Hapus pencarian"
                >
                  <FiX />
                </button>
              )}
            </div>

            <button type="button" className="hutang-cutting-erp-icon-btn" aria-label="Notifikasi">
              <FiBell />
              <span className="hutang-cutting-erp-dot" />
            </button>

            <div className="hutang-cutting-erp-avatar" title="Finance Team">
              FC
            </div>
          </div>
        </div>
      </header>

      <main className="hutang-cutting-erp-main">
        <section className="hutang-cutting-erp-stats">
          <article className="hutang-cutting-erp-stat-item">
            <p className="hutang-cutting-erp-stat-label">Total Data</p>
            <p className="hutang-cutting-erp-stat-value">{stats.totalData}</p>
          </article>

          <article className="hutang-cutting-erp-stat-item">
            <p className="hutang-cutting-erp-stat-label">Total Hutang</p>
            <p className="hutang-cutting-erp-stat-value hutang-cutting-erp-stat-value-danger">
              {formatRupiahDisplay(stats.totalHutang)}
            </p>
          </article>

          <article className="hutang-cutting-erp-stat-item">
            <p className="hutang-cutting-erp-stat-label">Total Potongan Mingguan</p>
            <p className="hutang-cutting-erp-stat-value hutang-cutting-erp-stat-value-info">
              {formatRupiahDisplay(stats.totalPotongan)}
            </p>
          </article>

          <article className="hutang-cutting-erp-stat-item">
            <p className="hutang-cutting-erp-stat-label">Belum Lunas</p>
            <p className="hutang-cutting-erp-stat-value hutang-cutting-erp-stat-value-warning">{stats.belumLunas}</p>
          </article>
        </section>

        <section className="hutang-cutting-erp-table-wrapper">
          <div className="hutang-cutting-erp-table-header">
            <div>
              <h3>Daftar Hutang Tukang Cutting</h3>
              <p>Menampilkan {filteredHutangs.length} data sesuai filter pencarian.</p>
            </div>
          </div>

          {loading ? (
            <div className="hutang-cutting-erp-loading">
              <div className="hutang-cutting-erp-spinner" />
              <p>Memuat data hutang cutting...</p>
            </div>
          ) : error ? (
            <div className="hutang-cutting-erp-empty-state">
              <FiAlertCircle className="hutang-cutting-erp-empty-icon" />
              <p className="hutang-cutting-erp-empty-title error">{error}</p>
            </div>
          ) : filteredHutangs.length > 0 ? (
            <div className="hutang-cutting-erp-table-scroll">
              <table className="hutang-cutting-erp-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Tukang Cutting</th>
                    <th>Jumlah Hutang</th>
                    <th>Potongan Per Minggu</th>
                    <th>Skema Potongan</th>
                    <th>Status Pembayaran</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHutangs.map((hutang, index) => {
                    const namaTukang = hutang.tukang_cutting?.nama_tukang_cutting || hutang.nama_tukang_cutting || "-";
                    const status = hutang.status_pembayaran || "belum lunas";

                    return (
                      <tr key={hutang.id || hutang.tukang_cutting_id || index}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="hutang-cutting-erp-name-cell">
                            <FiClock />
                            <span>{namaTukang}</span>
                          </div>
                        </td>
                        <td>
                          <span className="hutang-cutting-erp-badge amount">{formatRupiahDisplay(hutang.jumlah_hutang || 0)}</span>
                        </td>
                        <td>
                          <span className="hutang-cutting-erp-badge info">{formatRupiahDisplay(hutang.potongan_per_minggu || 0)}</span>
                        </td>
                        <td>
                          {hutang.persentase_potongan ? (
                            <span className="hutang-cutting-erp-badge percent">{hutang.persentase_potongan}%</span>
                          ) : (
                            <span className="hutang-cutting-erp-badge muted">Nominal tetap</span>
                          )}
                        </td>
                        <td>
                          <span className={`hutang-cutting-erp-status-badge ${getStatusClass(status)}`}>{status}</span>
                        </td>
                        <td>
                          <div className="hutang-cutting-erp-actions-cell">
                            <button type="button" className="hutang-cutting-erp-action-btn add" onClick={() => handleTambahClick(hutang)}>
                              <FiPlus /> Tambah
                            </button>

                            {hutang.id && (
                              <button type="button" className="hutang-cutting-erp-action-btn detail" onClick={() => handleDetailClick(hutang)}>
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
            <div className="hutang-cutting-erp-empty-state">
              <FiFilter className="hutang-cutting-erp-empty-icon" />
              <p className="hutang-cutting-erp-empty-title">Tidak ada data hutang</p>
              <p className="hutang-cutting-erp-empty-text">Coba ubah kata kunci pencarian atau periksa kembali data master tukang cutting.</p>
            </div>
          )}
        </section>
      </main>

      {selectedHutang && (
        <div className="hutang-cutting-erp-modal-overlay" onClick={closeTambahModal}>
          <div className="hutang-cutting-erp-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="hutang-cutting-erp-modal-header">
              <div>
                <h2>Tambah Hutang Cutting</h2>
                <p>{selectedHutang.tukang_cutting?.nama_tukang_cutting || selectedHutang.nama_tukang_cutting || "-"}</p>
              </div>
              <button type="button" className="hutang-cutting-erp-modal-close" onClick={closeTambahModal}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="hutang-cutting-erp-form">
              <div className="hutang-cutting-erp-form-grid">
                <div className="hutang-cutting-erp-form-group">
                  <label>Jumlah Hutang</label>
                  <div className="hutang-cutting-erp-rupiah-input">
                    <input
                      type="text"
                      value={formatRupiahInput(newHutang.jumlah_hutang)}
                      onChange={(event) => {
                        const numericValue = parseRupiah(event.target.value);
                        setNewHutang((prev) => ({
                          ...prev,
                          jumlah_hutang: numericValue !== "" ? numericValue : "",
                        }));
                      }}
                      placeholder="Masukkan jumlah hutang"
                      required
                    />
                  </div>
                </div>

                {!newHutang.is_potongan_persen && (
                  <div className="hutang-cutting-erp-form-group">
                    <label>Potongan Per Minggu</label>
                    <div className="hutang-cutting-erp-rupiah-input">
                      <input
                        type="text"
                        value={formatRupiahInput(newHutang.potongan_per_minggu)}
                        onChange={(event) => {
                          const numericValue = parseRupiah(event.target.value);
                          setNewHutang((prev) => ({
                            ...prev,
                            potongan_per_minggu: numericValue !== "" ? numericValue : "",
                          }));
                        }}
                        placeholder="Masukkan potongan tetap"
                        required={!newHutang.is_potongan_persen}
                      />
                    </div>
                  </div>
                )}

                {newHutang.is_potongan_persen && (
                  <div className="hutang-cutting-erp-form-group">
                    <label>Persentase Potongan (%)</label>
                    <input
                      type="number"
                      value={newHutang.persentase_potongan || ""}
                      onChange={(event) =>
                        setNewHutang((prev) => ({
                          ...prev,
                          persentase_potongan: event.target.value !== "" ? Number(event.target.value) : null,
                        }))
                      }
                      placeholder="Contoh: 10"
                      required={newHutang.is_potongan_persen}
                      min="0"
                      max="100"
                    />
                  </div>
                )}

                <div className="hutang-cutting-erp-form-group full">
                  <label>Upload Bukti Transfer (Opsional)</label>
                  <div className="hutang-cutting-erp-file-input-wrap">
                    <FiUpload />
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(event) =>
                        setNewHutang((prev) => ({
                          ...prev,
                          bukti_transfer: event.target.files?.[0] || null,
                        }))
                      }
                    />
                  </div>
                  {newHutang.bukti_transfer && <p className="hutang-cutting-erp-file-name">File: {newHutang.bukti_transfer.name}</p>}
                </div>
              </div>

              <div className="hutang-cutting-erp-checkbox-row">
                <input
                  id="is-potongan-persen"
                  type="checkbox"
                  checked={newHutang.is_potongan_persen}
                  onChange={(event) =>
                    setNewHutang((prev) => ({
                      ...prev,
                      is_potongan_persen: event.target.checked,
                      persentase_potongan: event.target.checked ? prev.persentase_potongan : null,
                    }))
                  }
                />
                <label htmlFor="is-potongan-persen">Gunakan skema potongan persen</label>
              </div>

              <div className="hutang-cutting-erp-form-actions">
                <button type="button" className="hutang-cutting-erp-btn-secondary" onClick={closeTambahModal}>
                  Batal
                </button>
                <button type="submit" className="hutang-cutting-erp-btn-primary">
                  Simpan Hutang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDetailHutang && (
        <div className="hutang-cutting-erp-modal-overlay" onClick={closeDetailModal}>
          <div className="hutang-cutting-erp-modal-content wide" onClick={(event) => event.stopPropagation()}>
            <div className="hutang-cutting-erp-modal-header">
              <div>
                <h2>Detail Hutang Cutting</h2>
                <p>{selectedDetailHutang.tukang_cutting?.nama_tukang_cutting || selectedDetailHutang.nama_tukang_cutting || "-"}</p>
              </div>
              <button type="button" className="hutang-cutting-erp-modal-close" onClick={closeDetailModal}>
                <FiX />
              </button>
            </div>

            <div className="hutang-cutting-erp-modal-body">
              <div className="hutang-cutting-erp-info-grid">
                <div className="hutang-cutting-erp-info-item">
                  <span className="hutang-cutting-erp-info-label">ID Hutang</span>
                  <strong>{selectedDetailHutang.id || "-"}</strong>
                </div>
                <div className="hutang-cutting-erp-info-item">
                  <span className="hutang-cutting-erp-info-label">ID Tukang Cutting</span>
                  <strong>{selectedDetailHutang.tukang_cutting_id || "-"}</strong>
                </div>
                <div className="hutang-cutting-erp-info-item">
                  <span className="hutang-cutting-erp-info-label">Jumlah Hutang</span>
                  <strong>{formatRupiahDisplay(selectedDetailHutang.jumlah_hutang || 0)}</strong>
                </div>
                <div className="hutang-cutting-erp-info-item">
                  <span className="hutang-cutting-erp-info-label">Status</span>
                  <strong>
                    <span className={`hutang-cutting-erp-status-badge ${getStatusClass(selectedDetailHutang.status_pembayaran || "")}`}>
                      {selectedDetailHutang.status_pembayaran || "belum lunas"}
                    </span>
                  </strong>
                </div>
                <div className="hutang-cutting-erp-info-item">
                  <span className="hutang-cutting-erp-info-label">Tanggal Hutang</span>
                  <strong>{formatDateTime(selectedDetailHutang.tanggal_hutang)}</strong>
                </div>
              </div>

              <div className="hutang-cutting-erp-history-card">
                <div className="hutang-cutting-erp-history-header">
                  <h4>Riwayat Perubahan Hutang</h4>
                  <select
                    value={selectedJenisPerubahan}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSelectedJenisPerubahan(value);
                      fetchHistory(selectedDetailHutang.id, value);
                    }}
                  >
                    <option value="">Semua</option>
                    <option value="penambahan">Penambahan</option>
                    <option value="pengurangan">Pengurangan</option>
                  </select>
                </div>

                {historyLoading ? (
                  <div className="hutang-cutting-erp-loading inline">
                    <div className="hutang-cutting-erp-spinner" />
                    <p>Memuat log history...</p>
                  </div>
                ) : logHistory.length > 0 ? (
                  <div className="hutang-cutting-erp-history-scroll">
                    <table className="hutang-cutting-erp-history-table">
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
                              <span className={`hutang-cutting-erp-mini-badge ${history.jenis_perubahan === "penambahan" ? "plus" : "minus"}`}>
                                {history.jenis_perubahan || "-"}
                              </span>
                            </td>
                            <td>{formatRupiahDisplay(history.perubahan_hutang || 0)}</td>
                            <td>
                              {history.bukti_transfer ? (
                                <a
                                  className="hutang-cutting-erp-link"
                                  href={`${process.env.REACT_APP_FILE_URL}/storage/${history.bukti_transfer}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Lihat Bukti
                                </a>
                              ) : (
                                <span className="hutang-cutting-erp-muted-text">Tidak ada</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="hutang-cutting-erp-empty-state inline">
                    <FiCheckCircle className="hutang-cutting-erp-empty-icon" />
                    <p className="hutang-cutting-erp-empty-title">Belum ada riwayat pembayaran</p>
                  </div>
                )}
              </div>
            </div>

            <div className="hutang-cutting-erp-modal-footer">
              <button type="button" className="hutang-cutting-erp-btn-secondary" onClick={closeDetailModal}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HutangCutting;

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiDownload,
  FiFilter,
  FiSearch,
  FiUpload,
  FiX,
} from "react-icons/fi";
import API from "../../../api";
import "./PendapatanCutting.css";

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

const initialSimulasi = {
  total_pendapatan: 0,
  potongan_hutang: 0,
  potongan_cashbon: 0,
  total_transfer: 0,
  pendapatan_belum_dibayar_sebelumnya: 0,
};

const formatRupiahDisplay = (angka) => {
  if (!angka && angka !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(angka) || 0);
};

const formatDateDisplay = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const normalizeStatus = (status = "") => String(status).toLowerCase().trim();

const isPaidStatus = (status = "") => {
  const normalized = normalizeStatus(status);
  return normalized.includes("sudah") || normalized === "lunas";
};

const getStatusClass = (status = "") => {
  const normalized = normalizeStatus(status);

  if (normalized.includes("sudah") || normalized === "lunas") return "is-lunas";
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
        container: "pendapatan-cutting-swal-container",
      },
    });
  } catch (alertError) {
    console.error("Gagal menampilkan SweetAlert:", alertError);
    window.alert(text || title || "Berhasil");
  }
};

const PendapatanCutting = () => {
  const [pendapatans, setPendapatans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [selectedCutting, setSelectedCutting] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [buktiTransfer, setBuktiTransfer] = useState(null);

  const [kurangiHutang, setKurangiHutang] = useState(false);
  const [kurangiCashbon, setKurangiCashbon] = useState(false);
  const [simulasi, setSimulasi] = useState(initialSimulasi);

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloadingPreviewId, setDownloadingPreviewId] = useState(null);

  const isFetchingPendapatan = useRef(false);

  const resetModalState = () => {
    setSelectedCutting(null);
    setShowForm(false);
    setKurangiHutang(false);
    setKurangiCashbon(false);
    setBuktiTransfer(null);
    setSimulasi(initialSimulasi);
  };

  const fetchPendapatans = async ({ showLoading = false } = {}) => {
    if (!startDate || !endDate || isFetchingPendapatan.current) return;

    try {
      isFetchingPendapatan.current = true;
      if (showLoading) setLoading(true);
      setError(null);

      const response = await API.get("/pendapatan/mingguan/cutting", {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      const data = Array.isArray(response?.data) ? response.data : response?.data?.data || [];
      setPendapatans(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error("Error fetching pendapatan cutting:", fetchError);
      if (fetchError.response?.status === 429) {
        setError("Terlalu banyak permintaan. Silakan tunggu beberapa saat lalu coba lagi.");
      } else {
        setError(fetchError.response?.data?.message || "Gagal mengambil data pendapatan cutting.");
      }
      setPendapatans([]);
    } finally {
      if (showLoading) setLoading(false);
      isFetchingPendapatan.current = false;
    }
  };

  const fetchSimulasi = async (tukangCuttingId, shouldKurangiHutang, shouldKurangiCashbon) => {
    if (!tukangCuttingId || !startDate || !endDate) {
      setSimulasi(initialSimulasi);
      return;
    }

    try {
      const response = await API.post("/pendapatan/simulasi/cutting", {
        tukang_cutting_id: tukangCuttingId,
        tanggal_awal: startDate,
        tanggal_akhir: endDate,
        kurangi_hutang: shouldKurangiHutang,
        kurangi_cashbon: shouldKurangiCashbon,
      });

      setSimulasi({
        total_pendapatan: response?.data?.total_pendapatan || 0,
        potongan_hutang: response?.data?.potongan_hutang || 0,
        potongan_cashbon: response?.data?.potongan_cashbon || 0,
        total_transfer: response?.data?.total_transfer || 0,
        pendapatan_belum_dibayar_sebelumnya: response?.data?.pendapatan_belum_dibayar_sebelumnya || 0,
      });
    } catch (fetchError) {
      console.error("Gagal fetch simulasi pendapatan cutting:", fetchError.response?.data || fetchError);
      setSimulasi(initialSimulasi);
    }
  };

  useEffect(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setStartDate(startOfMonth.toISOString().split("T")[0]);
    setEndDate(endOfMonth.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const timeoutId = window.setTimeout(() => {
      fetchPendapatans({ showLoading: true });
    }, 350);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  useEffect(() => {
    if (!selectedCutting) return;

    fetchSimulasi(selectedCutting.tukang_cutting_id, kurangiHutang, kurangiCashbon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCutting, kurangiHutang, kurangiCashbon, startDate, endDate]);

  const filteredPendapatans = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const bySearch = pendapatans.filter((item) => {
      const nama = item.nama_tukang_cutting || "";
      return nama.toLowerCase().includes(keyword);
    });

    return [...bySearch].sort((a, b) => {
      if (isPaidStatus(a.status_pembayaran) !== isPaidStatus(b.status_pembayaran)) {
        return isPaidStatus(a.status_pembayaran) ? 1 : -1;
      }
      return Number(b.total_transfer || 0) - Number(a.total_transfer || 0);
    });
  }, [pendapatans, searchTerm]);

  const stats = useMemo(() => {
    const totalPendapatan = filteredPendapatans.reduce((sum, item) => sum + (Number(item.total_pendapatan) || 0), 0);
    const totalTransfer = filteredPendapatans.reduce((sum, item) => sum + (Number(item.total_transfer) || 0), 0);
    const totalPotongan = filteredPendapatans.reduce(
      (sum, item) => sum + (Number(item.potongan_hutang) || 0) + (Number(item.potongan_cashbon) || 0),
      0
    );
    const sudahDibayar = filteredPendapatans.filter((item) => isPaidStatus(item.status_pembayaran)).length;

    return {
      totalData: filteredPendapatans.length,
      totalPendapatan,
      totalPotongan,
      totalTransfer,
      belumDibayar: filteredPendapatans.length - sudahDibayar,
    };
  }, [filteredPendapatans]);

  const handleFilter = async () => {
    if (!startDate || !endDate) {
      window.alert("Silakan pilih tanggal mulai dan tanggal akhir terlebih dahulu.");
      return;
    }

    if (startDate > endDate) {
      window.alert("Tanggal mulai tidak boleh lebih besar dari tanggal akhir.");
      return;
    }

    resetModalState();
    await fetchPendapatans({ showLoading: true });
  };

  const handleOpenForm = (cutting) => {
    if (!startDate || !endDate) {
      window.alert("Pilih periode tanggal terlebih dahulu.");
      return;
    }

    setSelectedCutting(cutting);
    setKurangiHutang(false);
    setKurangiCashbon(false);
    setBuktiTransfer(null);
    setShowForm(true);
  };

  const handleCloseModal = () => {
    resetModalState();
  };

  const handleTambahPendapatan = async (event) => {
    event.preventDefault();

    if (!selectedCutting) {
      window.alert("Data tukang cutting tidak ditemukan.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("tukang_cutting_id", selectedCutting.tukang_cutting_id);
      formData.append("tanggal_awal", startDate);
      formData.append("tanggal_akhir", endDate);
      formData.append("kurangi_hutang", kurangiHutang ? "1" : "0");
      formData.append("kurangi_cashbon", kurangiCashbon ? "1" : "0");

      if (buktiTransfer) {
        formData.append("bukti_transfer", buktiTransfer);
      }

      const response = await API.post("/pendapatan/cutting", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      handleCloseModal();
      await fetchPendapatans({ showLoading: true });
      await showSuccessAlert("Pendapatan Berhasil Disimpan", response?.data?.message || "Data pendapatan berhasil ditambahkan.");
    } catch (submitError) {
      console.error("Error saat tambah pendapatan cutting:", submitError);
      if (submitError.response?.status === 429) {
        window.alert("Terlalu banyak permintaan. Silakan tunggu beberapa saat lalu coba lagi.");
      } else {
        window.alert(submitError.response?.data?.message || "Terjadi kesalahan saat menambahkan pendapatan.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoicePreview = async (pendapatan) => {
    if (!startDate || !endDate) {
      window.alert("Pilih periode tanggal terlebih dahulu.");
      return;
    }

    const currentId = pendapatan?.tukang_cutting_id;
    if (!currentId || downloadingPreviewId) return;

    setDownloadingPreviewId(currentId);
    try {
      const response = await API.post(
        "/pendapatan/cutting/download-invoice-preview",
        {
          tukang_cutting_id: currentId,
          tanggal_awal: startDate,
          tanggal_akhir: endDate,
        },
        {
          responseType: "blob",
        }
      );

      if (response.data instanceof Blob && response.data.type === "application/pdf") {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Invoice-Preview-Pendapatan-Cutting-${currentId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return;
      }

      const responseText = await response.data.text();
      try {
        const errorData = JSON.parse(responseText);
        window.alert(errorData.message || errorData.error || "Gagal mengunduh preview invoice.");
      } catch {
        window.alert("Gagal mengunduh preview invoice.");
      }
    } catch (downloadError) {
      console.error("Error downloading preview invoice:", downloadError);

      let errorMessage = "Gagal mengunduh preview invoice.";
      const contentType = downloadError.response?.headers?.["content-type"];

      if (contentType?.includes("application/json")) {
        if (downloadError.response?.data && typeof downloadError.response.data === "object") {
          errorMessage = downloadError.response.data.message || downloadError.response.data.error || errorMessage;
        } else {
          try {
            const responseText = await downloadError.response?.data?.text();
            const errorData = JSON.parse(responseText || "{}");
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // no-op
          }
        }
      } else if (contentType?.includes("text/html")) {
        errorMessage = "Server mengembalikan error. Pastikan data periode valid.";
      } else if (downloadError.request) {
        errorMessage = "Tidak ada respons dari server. Periksa koneksi Anda.";
      }

      window.alert(errorMessage);
    } finally {
      setDownloadingPreviewId(null);
    }
  };

  return (
    <div className="pendapatan-cutting-erp-container">
      <header className="pendapatan-cutting-erp-header">
        <div className="pendapatan-cutting-erp-header-top">
          <div className="pendapatan-cutting-erp-title-group">
            <div className="pendapatan-cutting-erp-brand-icon">
              <FiDollarSign />
            </div>
            <div className="pendapatan-cutting-erp-title-wrap">
              <div className="pendapatan-cutting-erp-module-pill">Finance Module</div>
              <h1>Pendapatan Cutting</h1>
              <p>Rekap pendapatan mingguan, simulasi potongan, dan eksekusi pembayaran tukang cutting</p>
            </div>
          </div>

          <div className="pendapatan-cutting-erp-actions">
            <div className="pendapatan-cutting-erp-search-wrap">
              <FiSearch className="pendapatan-cutting-erp-search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari nama tukang cutting..."
                className="pendapatan-cutting-erp-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="pendapatan-cutting-erp-search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Hapus pencarian"
                >
                  <FiX />
                </button>
              )}
            </div>

            <button type="button" className="pendapatan-cutting-erp-icon-btn" aria-label="Notifikasi">
              <FiBell />
              <span className="pendapatan-cutting-erp-dot" />
            </button>

            <div className="pendapatan-cutting-erp-avatar" title="Finance Team">
              FC
            </div>
          </div>
        </div>
      </header>

      <main className="pendapatan-cutting-erp-main">
        <section className="pendapatan-cutting-erp-stats">
          <article className="pendapatan-cutting-erp-stat-item">
            <p className="pendapatan-cutting-erp-stat-label">Total Data</p>
            <p className="pendapatan-cutting-erp-stat-value">{stats.totalData}</p>
          </article>

          <article className="pendapatan-cutting-erp-stat-item">
            <p className="pendapatan-cutting-erp-stat-label">Total Pendapatan</p>
            <p className="pendapatan-cutting-erp-stat-value pendapatan-cutting-erp-stat-value-info">
              {formatRupiahDisplay(stats.totalPendapatan)}
            </p>
          </article>

          <article className="pendapatan-cutting-erp-stat-item">
            <p className="pendapatan-cutting-erp-stat-label">Total Potongan</p>
            <p className="pendapatan-cutting-erp-stat-value pendapatan-cutting-erp-stat-value-danger">
              {formatRupiahDisplay(stats.totalPotongan)}
            </p>
          </article>

          <article className="pendapatan-cutting-erp-stat-item">
            <p className="pendapatan-cutting-erp-stat-label">Total Transfer</p>
            <p className="pendapatan-cutting-erp-stat-value pendapatan-cutting-erp-stat-value-success">
              {formatRupiahDisplay(stats.totalTransfer)}
            </p>
          </article>
        </section>

        <section className="pendapatan-cutting-erp-table-wrapper">
          <div className="pendapatan-cutting-erp-table-header">
            <div>
              <h3>Daftar Pendapatan Tukang Cutting</h3>
              <p>Menampilkan {filteredPendapatans.length} data pada periode terpilih.</p>
            </div>

            <div className="pendapatan-cutting-erp-filter-row">
              <label className="pendapatan-cutting-erp-date-field">
                <span>
                  <FiCalendar /> Dari
                </span>
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </label>

              <label className="pendapatan-cutting-erp-date-field">
                <span>
                  <FiCalendar /> Sampai
                </span>
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </label>

              <button type="button" className="pendapatan-cutting-erp-filter-btn" onClick={handleFilter}>
                <FiFilter /> Terapkan
              </button>
            </div>
          </div>

          {loading ? (
            <div className="pendapatan-cutting-erp-loading">
              <div className="pendapatan-cutting-erp-spinner" />
              <p>Memuat data pendapatan cutting...</p>
            </div>
          ) : error ? (
            <div className="pendapatan-cutting-erp-empty-state">
              <FiAlertCircle className="pendapatan-cutting-erp-empty-icon" />
              <p className="pendapatan-cutting-erp-empty-title error">{error}</p>
            </div>
          ) : filteredPendapatans.length > 0 ? (
            <div className="pendapatan-cutting-erp-table-scroll">
              <table className="pendapatan-cutting-erp-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Tukang Cutting</th>
                    <th>Total Pendapatan</th>
                    <th>Potongan Hutang</th>
                    <th>Potongan Cashboan</th>
                    <th>Total Transfer</th>
                    <th>Status Pembayaran</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPendapatans.map((pendapatan, index) => {
                    const statusRaw = pendapatan.status_pembayaran || "belum dibayar";
                    const statusLabel = isPaidStatus(statusRaw) ? "Sudah Dibayar" : "Belum Dibayar";
                    const canPay = Number(pendapatan.total_pendapatan || 0) > 0 && !isPaidStatus(statusRaw);
                    const isDownloading = downloadingPreviewId === pendapatan.tukang_cutting_id;

                    return (
                      <tr key={pendapatan.tukang_cutting_id || index}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="pendapatan-cutting-erp-name-cell">
                            <FiClock />
                            <span>{pendapatan.nama_tukang_cutting || "-"}</span>
                          </div>
                        </td>
                        <td>
                          <span className="pendapatan-cutting-erp-badge info">{formatRupiahDisplay(pendapatan.total_pendapatan || 0)}</span>
                        </td>
                        <td>
                          <span className="pendapatan-cutting-erp-badge danger">{formatRupiahDisplay(pendapatan.potongan_hutang || 0)}</span>
                        </td>
                        <td>
                          <span className="pendapatan-cutting-erp-badge danger">{formatRupiahDisplay(pendapatan.potongan_cashbon || 0)}</span>
                        </td>
                        <td>
                          <span className="pendapatan-cutting-erp-badge success">{formatRupiahDisplay(pendapatan.total_transfer || 0)}</span>
                        </td>
                        <td>
                          <span className={`pendapatan-cutting-erp-status-badge ${getStatusClass(statusRaw)}`}>{statusLabel}</span>
                        </td>
                        <td>
                          <div className="pendapatan-cutting-erp-actions-cell">
                            <button
                              type="button"
                              className="pendapatan-cutting-erp-action-btn preview"
                              onClick={() => handleDownloadInvoicePreview(pendapatan)}
                              disabled={Boolean(downloadingPreviewId)}
                            >
                              <FiDownload /> {isDownloading ? "Memproses" : "Preview"}
                            </button>

                            {canPay ? (
                              <button
                                type="button"
                                className="pendapatan-cutting-erp-action-btn pay"
                                onClick={() => handleOpenForm(pendapatan)}
                              >
                                <FiCheckCircle /> Bayar
                              </button>
                            ) : (
                              <span className="pendapatan-cutting-erp-disabled-pill">
                                {isPaidStatus(statusRaw) ? "Sudah dibayar" : "Belum ada pendapatan"}
                              </span>
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
            <div className="pendapatan-cutting-erp-empty-state">
              <FiFilter className="pendapatan-cutting-erp-empty-icon" />
              <p className="pendapatan-cutting-erp-empty-title">Tidak ada data pendapatan</p>
              <p className="pendapatan-cutting-erp-empty-text">Coba ubah periode tanggal atau kata kunci pencarian.</p>
            </div>
          )}
        </section>

        <section className="pendapatan-cutting-erp-stats compact">
          <article className="pendapatan-cutting-erp-stat-item">
            <p className="pendapatan-cutting-erp-stat-label">Belum Dibayar</p>
            <p className="pendapatan-cutting-erp-stat-value pendapatan-cutting-erp-stat-value-warning">{stats.belumDibayar}</p>
          </article>

          <article className="pendapatan-cutting-erp-stat-item">
            <p className="pendapatan-cutting-erp-stat-label">Periode Aktif</p>
            <p className="pendapatan-cutting-erp-stat-value pendapatan-cutting-erp-stat-value-small">
              {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
            </p>
          </article>
        </section>
      </main>

      {showForm && selectedCutting && (
        <div className="pendapatan-cutting-erp-modal-overlay" onClick={handleCloseModal}>
          <div className="pendapatan-cutting-erp-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="pendapatan-cutting-erp-modal-header">
              <div>
                <h2>Pembayaran Pendapatan Cutting</h2>
                <p>
                  {selectedCutting.nama_tukang_cutting || "-"} | Periode {formatDateDisplay(startDate)} -{" "}
                  {formatDateDisplay(endDate)}
                </p>
              </div>
              <button type="button" className="pendapatan-cutting-erp-modal-close" onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleTambahPendapatan} className="pendapatan-cutting-erp-form">
              <div className="pendapatan-cutting-erp-form-grid">
                <div className="pendapatan-cutting-erp-form-group">
                  <label>ID Tukang Cutting</label>
                  <input type="text" value={selectedCutting.tukang_cutting_id || "-"} readOnly />
                </div>

                <div className="pendapatan-cutting-erp-form-group">
                  <label>Nama Tukang Cutting</label>
                  <input type="text" value={selectedCutting.nama_tukang_cutting || "-"} readOnly />
                </div>

                <div className="pendapatan-cutting-erp-form-group">
                  <label>Total Pendapatan</label>
                  <input type="text" value={formatRupiahDisplay(simulasi.total_pendapatan || 0)} readOnly />
                </div>

                <div className="pendapatan-cutting-erp-form-group">
                  <label>Pending Sebelumnya</label>
                  <input type="text" value={formatRupiahDisplay(simulasi.pendapatan_belum_dibayar_sebelumnya || 0)} readOnly />
                </div>

                <div className="pendapatan-cutting-erp-form-group">
                  <label>Potongan Hutang</label>
                  <input type="text" value={formatRupiahDisplay(simulasi.potongan_hutang || 0)} readOnly />
                </div>

                <div className="pendapatan-cutting-erp-form-group">
                  <label>Potongan Cashboan</label>
                  <input type="text" value={formatRupiahDisplay(simulasi.potongan_cashbon || 0)} readOnly />
                </div>

                <div className="pendapatan-cutting-erp-form-group full">
                  <label>Upload Bukti Transfer (Opsional)</label>
                  <div className="pendapatan-cutting-erp-file-input-wrap">
                    <FiUpload />
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(event) => setBuktiTransfer(event.target.files?.[0] || null)}
                    />
                  </div>
                  {buktiTransfer && <p className="pendapatan-cutting-erp-file-name">File: {buktiTransfer.name}</p>}
                </div>
              </div>

              <div className="pendapatan-cutting-erp-toggle-row">
                <label>
                  <input
                    type="checkbox"
                    checked={kurangiHutang}
                    onChange={(event) => setKurangiHutang(event.target.checked)}
                  />
                  Potong hutang saat pembayaran
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={kurangiCashbon}
                    onChange={(event) => setKurangiCashbon(event.target.checked)}
                  />
                  Potong cashboan saat pembayaran
                </label>
              </div>

              <div className="pendapatan-cutting-erp-transfer-box">
                <span>Total Transfer Final</span>
                <strong>{formatRupiahDisplay(simulasi.total_transfer || 0)}</strong>
              </div>

              <div className="pendapatan-cutting-erp-form-actions">
                <button type="button" className="pendapatan-cutting-erp-btn-secondary" onClick={handleCloseModal}>
                  Batal
                </button>
                <button type="submit" className="pendapatan-cutting-erp-btn-primary" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan Pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendapatanCutting;

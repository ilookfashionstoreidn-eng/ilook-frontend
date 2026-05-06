import React, { useEffect, useState } from "react";
import "./Logs.css";
import "./Return.css";
import API from "../../api";
import { FaFileExcel, FaUndo } from "react-icons/fa";
import { FiCheckCircle, FiLayers, FiSearch, FiUser } from "react-icons/fi";
import dayjs from "dayjs";

const PER_PAGE_OPTIONS = [25, 50, 100];

const triggerBlobDownload = (blob, fileName) => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const formatWholeNumber = (value) => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "0";
  }

  return amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const ReturnLogs = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [petugasSummary, setPetugasSummary] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [singleDate, setSingleDate] = useState("");
  const [tracking, setTracking] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [perPage, setPerPage] = useState(25);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
  });

  const openDatePicker = (event) => {
    const input = event.currentTarget;

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch (error) {
        // Ignore browsers that block repeated picker calls.
      }
    }
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
    setSingleDate("");
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
    setSingleDate("");
  };

  const handleSingleDateChange = (event) => {
    const selectedDate = event.target.value;
    setSingleDate(selectedDate);

    if (selectedDate) {
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    }
  };

  const fetchLogs = async (
    start = startDate,
    end = endDate,
    page = 1,
    pageSize = perPage,
    track = tracking,
    performed = performedBy
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.get("/returns/logs", {
        params: {
          page,
          per_page: pageSize,
          start_date: start,
          end_date: end,
          ...(track && { tracking_number: track }),
          ...(performed && { performed_by: performed }),
        },
      });

      setLogs(response.data.data || []);
      setPagination({
        current_page: response.data.current_page || 1,
        last_page: response.data.last_page || 1,
      });
    } catch (fetchError) {
      setLogs([]);
      setPagination({ current_page: 1, last_page: 1 });
      setError("Gagal mengambil data return logs.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (
    start = today,
    end = today,
    track = tracking,
    performed = performedBy
  ) => {
    try {
      setLoadingSummary(true);
      setError(null);

      const response = await API.post("/returns/summary", {
        start_date: start,
        end_date: end,
        ...(track && { tracking_number: track }),
        ...(performed && { performed_by: performed }),
      });

      setSummary(response.data.data?.[0] || {
        total_return: 0,
        total_items: 0,
      });
      setPetugasSummary(response.data.petugas_summary || []);
    } catch (fetchError) {
      setError("Gagal mengambil summary return.");
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    setStartDate(today);
    setEndDate(today);
    fetchLogs(today, today);
    fetchSummary(today, today);
  }, []);

  const handleFilter = () => {
    if (!startDate || !endDate) {
      alert("Silakan pilih tanggal awal dan akhir!");
      return;
    }

    fetchLogs(startDate, endDate, 1, perPage, tracking, performedBy);
    fetchSummary(startDate, endDate, tracking, performedBy);
  };

  const handleTrackingKeyDown = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleFilter();
  };

  const handlePerPageChange = (event) => {
    const nextPerPage = Number(event.target.value) || 25;

    setPerPage(nextPerPage);
    fetchLogs(startDate, endDate, 1, nextPerPage, tracking, performedBy);
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert("Silakan pilih tanggal awal dan akhir!");
      return;
    }

    try {
      setExporting(true);
      setError(null);

      const response = await API.get("/returns/logs/export", {
        responseType: "blob",
        params: {
          start_date: startDate,
          end_date: endDate,
          ...(tracking && { tracking_number: tracking }),
          ...(performedBy && { performed_by: performedBy }),
        },
      });

      triggerBlobDownload(
        response.data,
        `return_logs_${startDate}_to_${endDate}.xlsx`
      );
    } catch (exportError) {
      setError("Gagal mengunduh file Excel return logs.");
    } finally {
      setExporting(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedLog(null);
  };

  const totalPetugasAktif = petugasSummary.length;
  const selectedItems = selectedLog?.order?.items || [];

  return (
    <div className="pklog-page">
      <div className="pklog-shell">
        <section className="pklog-content">
          <header className="pklog-topbar">
            <div className="pklog-title-group">
              <div className="pklog-brand-icon return-brand-icon">
                <FaUndo />
              </div>
              <div>
                <h1>Logs Return</h1>
                <p>Audit tracking number yang sudah dicatat melalui proses return.</p>
              </div>
            </div>
          </header>

          <main className="pklog-main">
            <section className="pklog-card pklog-filter-card">
              <div className="pklog-filter-row">
                <div className="pklog-filter-date-stack">
                  <span className="pklog-filter-label">Range Tanggal</span>
                  <div className="pklog-filter-dates">
                    <input
                      type="date"
                      value={startDate}
                      onChange={handleStartDateChange}
                      onClick={openDatePicker}
                      onFocus={openDatePicker}
                    />
                    <span className="pklog-dash">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      onClick={openDatePicker}
                      onFocus={openDatePicker}
                    />
                  </div>
                </div>

                <div className="pklog-filter-date-stack pklog-filter-single-date">
                  <span className="pklog-filter-label">1 Tanggal</span>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={handleSingleDateChange}
                    onClick={openDatePicker}
                    onFocus={openDatePicker}
                  />
                </div>

                <div className="pklog-filter-search">
                  <input
                    type="text"
                    placeholder="Cari Tracking Number..."
                    value={tracking}
                    onChange={(event) => setTracking(event.target.value)}
                    onKeyDown={handleTrackingKeyDown}
                    className="pklog-input-tracking"
                  />
                </div>

                <div className="pklog-filter-selects">
                  <input
                    type="text"
                    value={performedBy}
                    onChange={(event) => setPerformedBy(event.target.value)}
                    onKeyDown={handleTrackingKeyDown}
                    placeholder="Cari nama petugas..."
                  />
                </div>

                <div className="pklog-filter-actions">
                  <button
                    onClick={handleExport}
                    className="pklog-btn pklog-btn-export"
                    disabled={exporting}
                  >
                    <FaFileExcel />
                    {exporting ? "Mengunduh..." : "Export Excel"}
                  </button>
                  <button onClick={handleFilter} className="pklog-btn pklog-btn-primary">
                    Tampilkan
                  </button>
                </div>
              </div>

              {error && <div className="pklog-error">{error}</div>}
            </section>

            <section className="pklog-kpi-grid">
              <article className="pklog-kpi-card">
                <div className="pklog-kpi-head">
                  <FiLayers /> Total Return
                </div>
                <strong>
                  {loadingSummary
                    ? "..."
                    : summary?.total_return_formatted ??
                      formatWholeNumber(summary?.total_return)}
                </strong>
                <small>tracking pada rentang tanggal</small>
              </article>
              <article className="pklog-kpi-card">
                <div className="pklog-kpi-head">
                  <FiCheckCircle /> Total Produk
                </div>
                <strong>
                  {loadingSummary
                    ? "..."
                    : summary?.total_items_formatted ??
                      formatWholeNumber(summary?.total_items)}
                </strong>
                <small>item dari order return</small>
              </article>
              <article className="pklog-kpi-card">
                <div className="pklog-kpi-head">
                  <FiUser /> Petugas Aktif
                </div>
                <strong>{formatWholeNumber(totalPetugasAktif)}</strong>
                <small>petugas tercatat dalam periode</small>
              </article>
              <article className="pklog-kpi-card">
                <div className="pklog-kpi-head">
                  <FiSearch /> Filter Tracking
                </div>
                <strong>{tracking || "Semua"}</strong>
                <small>nomor yang sedang difilter</small>
              </article>
            </section>

            <section className="pklog-card pklog-kasir-card">
              <h3>Ringkasan Petugas</h3>
              {petugasSummary.length === 0 ? (
                <div className="pklog-empty">Tidak ada data petugas</div>
              ) : (
                <div className="pklog-kasir-wrap">
                  <table className="pklog-kasir-table">
                    <thead>
                      <tr>
                        <th>Petugas</th>
                        <th>Return</th>
                      </tr>
                    </thead>
                    <tbody>
                      {petugasSummary.map((item) => (
                        <tr key={`${item.performed_by || "unknown"}-${item.total_returns}`}>
                          <td>{item.performed_by || "-"}</td>
                          <td>
                            {item.total_returns_formatted ??
                              formatWholeNumber(item.total_returns)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="pklog-card pklog-table-card">
              <div className="pklog-table-wrap">
                <div className="pklog-table-inner">
                  <table className="pklog-table">
                    <thead>
                      <tr>
                        <th>Tracking Number</th>
                        <th>Order Number</th>
                        <th>Petugas</th>
                        <th>Total Item</th>
                        <th>Tanggal / Jam</th>
                        <th>Status Order</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={7} className="pklog-empty">
                            Memuat data...
                          </td>
                        </tr>
                      )}
                      {!loading && logs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="pklog-empty">
                            Tidak ada data return log pada filter ini.
                          </td>
                        </tr>
                      )}
                      {logs.map((logItem) => (
                        <tr key={logItem.id}>
                          <td data-label="Tracking Number">{logItem.tracking_number || "-"}</td>
                          <td data-label="Order Number">{logItem.order?.order_number || "-"}</td>
                          <td data-label="Petugas">{logItem.performed_by || "-"}</td>
                          <td data-label="Total Item">
                            {logItem.total_items_formatted ??
                              formatWholeNumber(logItem.total_items)}
                          </td>
                          <td data-label="Tanggal / Jam">
                            <div className="pklog-date-time">
                              <span>{dayjs(logItem.created_at).format("DD-MM-YYYY")}</span>
                              <small>{dayjs(logItem.created_at).format("HH:mm:ss")}</small>
                            </div>
                          </td>
                          <td data-label="Status Order">{logItem.order?.status || "-"}</td>
                          <td data-label="Aksi">
                            <button
                              type="button"
                              className="pklog-btn-detail"
                              onClick={() => setSelectedLog(logItem)}
                              disabled={!logItem.has_detail}
                            >
                              {logItem.has_detail ? "Detail" : "Tidak Ada"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pagination">
                <div className="pagination-page-size">
                  <label htmlFor="returnlog-per-page">Tampilkan</label>
                  <select
                    id="returnlog-per-page"
                    value={perPage}
                    onChange={handlePerPageChange}
                    disabled={loading}
                  >
                    {PER_PAGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <span>data per halaman</span>
                </div>

                <div className="pagination-nav">
                  <button
                    disabled={pagination.current_page === 1 || loading}
                    onClick={() =>
                      fetchLogs(
                        startDate,
                        endDate,
                        pagination.current_page - 1,
                        perPage,
                        tracking,
                        performedBy
                      )
                    }
                  >
                    Prev
                  </button>

                  <span>
                    Page {pagination.current_page} / {pagination.last_page}
                  </span>

                  <button
                    disabled={pagination.current_page === pagination.last_page || loading}
                    onClick={() =>
                      fetchLogs(
                        startDate,
                        endDate,
                        pagination.current_page + 1,
                        perPage,
                        tracking,
                        performedBy
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>

            {selectedLog && (
              <div className="pklog-modal-overlay">
                <div className="pklog-modal-content return-log-modal">
                  <h3>
                    Detail Return {selectedLog.tracking_number
                      ? `- ${selectedLog.tracking_number}`
                      : `- ${selectedLog.id}`}
                  </h3>
                  <div className="pklog-modal-meta">
                    <span>{selectedLog.order?.order_number || "-"}</span>
                    <span>{selectedLog.performed_by || "-"}</span>
                    <span>{dayjs(selectedLog.created_at).format("DD-MM-YYYY HH:mm:ss")}</span>
                  </div>

                  <div className="pklog-modal-table-wrap">
                    <table className="pklog-modal-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Nama Produk</th>
                          <th>Qty</th>
                          <th>Gambar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.length === 0 && (
                          <tr>
                            <td colSpan={4}>Tidak ada detail produk untuk log ini.</td>
                          </tr>
                        )}
                        {selectedItems.map((item) => (
                          <tr key={item.id || item.sku}>
                            <td>{item.sku}</td>
                            <td>{item.product_name}</td>
                            <td>{formatWholeNumber(item.quantity)}</td>
                            <td>
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.product_name}
                                  className="return-modal-image"
                                />
                              ) : (
                                <span className="return-no-image">No Image</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button className="pklog-btn pklog-btn-primary" onClick={handleCloseModal}>
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </main>
        </section>
      </div>
    </div>
  );
};

export default ReturnLogs;

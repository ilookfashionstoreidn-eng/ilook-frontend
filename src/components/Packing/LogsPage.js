import React, { useEffect, useRef, useState } from "react";
import "./Logs.css";
import API from "../../api";
import { FaFileExcel, FaQrcode } from "react-icons/fa";
import { FiCheckCircle, FiChevronDown, FiLayers, FiSearch, FiUser } from "react-icons/fi";
import dayjs from "dayjs";

const formatRupiah = (value) => {
  const amount = Number(value || 0);

  return `Rp ${amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
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

const getModeLabel = (log) => log?.mode_label || "Normal";

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

const PER_PAGE_OPTIONS = [25, 50, 100];
const KASIR_SUMMARY_BATCH = 5;
const MODE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "random", label: "Random" },
  { value: "belum-barcode", label: "Belum Barcode" },
  { value: "no-data-ginee", label: "No Data Ginee" },
];

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [singleDate, setSingleDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedModes, setSelectedModes] = useState([]);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [selectedLogs, setSelectedLogs] = useState(null);
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [tracking, setTracking] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [kasirSummary, setKasirSummary] = useState([]);
  const [exportJob, setExportJob] = useState(null);
  const tableScrollRef = useRef(null);
  const modeFilterRef = useRef(null);
  const [pagination, setPagination] = useState({
    next_cursor: null,
    prev_cursor: null,
  });
  const [perPage, setPerPage] = useState(25);
  const [visibleKasirCount, setVisibleKasirCount] = useState(KASIR_SUMMARY_BATCH);

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
    stat = status,
    cursor = null,
    track = tracking,
    performed = performedBy,
    modeFilters = selectedModes,
    pageSize = perPage
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.get("/orders/logs", {
        params: {
          ...(cursor && { cursor }),
          per_page: pageSize,
          start_date: start,
          end_date: end,
          ...(performed && { performed_by: performed }),
          ...(stat && { status: stat }),
          ...(modeFilters.length > 0 && { mode: modeFilters }),
          ...(track && { tracking_number: track }),
        },
      });

      setLogs(response.data.data);
      setPagination({
        next_cursor: response.data.next_cursor || null,
        prev_cursor: response.data.prev_cursor || null,
      });
    } catch (fetchError) {
      setPagination({ next_cursor: null, prev_cursor: null });
      setError("Gagal mengambil data logs.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (
    start = today,
    end = today,
    stat = status,
    performed = performedBy,
    track = tracking,
    modeFilters = selectedModes
  ) => {
    try {
      setLoadingSummary(true);
      setError(null);

      const response = await API.post("/orders/summary", {
        start_date: start,
        end_date: end,
        ...(stat && { status: stat }),
        ...(modeFilters.length > 0 && { mode: modeFilters }),
        ...(performed && { performed_by: performed }),
        ...(track && { tracking_number: track }),
      });

      if (response.data.data.length > 0) {
        setSummary(response.data.data[0]);
      } else {
        setSummary({
          total_order: 0,
          total_order_formatted: "0",
          total_items: 0,
          total_items_formatted: "0",
          total_amount: 0,
          total_amount_formatted: "0",
        });
      }

      setKasirSummary(response.data.kasir_summary || []);
    } catch (fetchError) {
      setError("Gagal mengambil summary.");
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

  useEffect(() => {
    setVisibleKasirCount(KASIR_SUMMARY_BATCH);
  }, [kasirSummary]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modeFilterRef.current && !modeFilterRef.current.contains(event.target)) {
        setIsModeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleModeSelection = (modeValue) => {
    setSelectedModes((current) => {
      if (current.includes(modeValue)) {
        return current.filter((item) => item !== modeValue);
      }

      return [...current, modeValue];
    });
  };

  const clearModeSelection = () => {
    setSelectedModes([]);
  };

  const handleFilter = () => {
    if (!startDate || !endDate) {
      alert("Silakan pilih tanggal awal dan akhir!");
      return;
    }

    fetchSummary(startDate, endDate, status, performedBy, tracking, selectedModes);
    fetchLogs(startDate, endDate, status, null, tracking, performedBy, selectedModes, perPage);
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
    fetchLogs(
      startDate,
      endDate,
      status,
      null,
      tracking,
      performedBy,
      selectedModes,
      nextPerPage
    );
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);

      const response = await API.post("/orders/logs/export", {
        start_date: startDate,
        end_date: endDate,
        ...(status && { status }),
        ...(selectedModes.length > 0 && { mode: selectedModes }),
        ...(tracking && { tracking_number: tracking }),
        ...(performedBy && { performed_by: performedBy }),
      });

      const exportData = response.data?.data;
      setExportJob(exportData || null);

      if (exportData?.can_download) {
        await downloadExportFile(exportData.id, exportData.file_name);
      }
    } catch (exportError) {
      alert("Gagal memproses export logs.");
      setExporting(false);
    }
  };

  const downloadExportFile = async (exportId, fileName) => {
    try {
      const response = await API.get(`/orders/logs/export/${exportId}/download`, {
        responseType: "blob",
      });

      triggerBlobDownload(response.data, fileName || `packing_logs_${Date.now()}.xlsx`);
      setExporting(false);
    } catch (downloadError) {
      setExporting(false);
      alert("File export gagal diunduh.");
    }
  };

  useEffect(() => {
    if (!exportJob || !["queued", "processing"].includes(exportJob.status)) {
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await API.get(`/orders/logs/export/${exportJob.id}`);
        const latestExport = response.data?.data;

        setExportJob(latestExport || null);

        if (latestExport?.status === "completed" && latestExport?.can_download) {
          await downloadExportFile(latestExport.id, latestExport.file_name);
        }

        if (latestExport?.status === "failed") {
          setExporting(false);
          alert(latestExport.error_message || "Export logs gagal diproses.");
        }
      } catch (pollError) {
        setExporting(false);
        alert("Gagal memeriksa status export.");
      }
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [exportJob]);

  const handleOpenModal = async (item) => {
    setSelectedLogs(item);
    setSelectedLogDetail(null);
    setDetailError(null);
    setShowModal(true);

    if (!item?.has_detail) {
      return;
    }

    try {
      setDetailLoading(true);
      const response = await API.get(
        `/orders/logs/${item.source_type}/${item.source_id}/detail`
      );

      setSelectedLogDetail(response.data?.data || null);
    } catch (fetchError) {
      setDetailError("Gagal mengambil detail log.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedLogs(null);
    setSelectedLogDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const exportStatusLabel = (() => {
    if (!exportJob) {
      return null;
    }

    if (exportJob.status === "queued") {
      return "Export masuk antrean.";
    }

    if (exportJob.status === "processing") {
      return "File export sedang dibuat.";
    }

    if (exportJob.status === "completed") {
      return "File export siap dan sedang diunduh.";
    }

    if (exportJob.status === "failed") {
      return exportJob.error_message || "Export gagal diproses.";
    }

    return null;
  })();

  const totalKasirAktif = kasirSummary.length;
  const visibleKasirSummary = kasirSummary.slice(0, visibleKasirCount);
  const hasMoreKasirSummary = visibleKasirCount < kasirSummary.length;
  const selectedModeLabel =
    selectedModes.length === 0
      ? "Semua Mode"
      : selectedModes.length === 1
      ? MODE_OPTIONS.find((option) => option.value === selectedModes[0])?.label || "1 Mode"
      : `${selectedModes.length} Mode Dipilih`;

  const scrollTable = (direction) => {
    if (!tableScrollRef.current) {
      return;
    }

    const amount = direction === "left" ? -320 : 320;
    tableScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="pklog-page">
      <div className="pklog-shell">
        <section className="pklog-content">
          <header className="pklog-topbar">
            <div className="pklog-title-group">
              <div className="pklog-brand-icon">
                <FaQrcode />
              </div>
              <div>
                <h1>Logs Packing</h1>
                <p>Audit log proses packing, performa petugas, dan monitoring status order.</p>
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
                  <div className="pklog-multi-select" ref={modeFilterRef}>
                    <button
                      type="button"
                      className={`pklog-multi-select-trigger ${
                        isModeDropdownOpen ? "is-open" : ""
                      }`}
                      onClick={() => setIsModeDropdownOpen((current) => !current)}
                    >
                      <span>{selectedModeLabel}</span>
                      <FiChevronDown className="pklog-multi-select-chevron" />
                    </button>

                    {isModeDropdownOpen && (
                      <div className="pklog-multi-select-panel">
                        <button
                          type="button"
                          className="pklog-multi-select-clear"
                          onClick={clearModeSelection}
                        >
                          Semua Mode
                        </button>

                        <div className="pklog-multi-select-options">
                          {MODE_OPTIONS.map((option) => (
                            <label key={option.value} className="pklog-multi-select-option">
                              <input
                                type="checkbox"
                                checked={selectedModes.includes(option.value)}
                                onChange={() => toggleModeSelection(option.value)}
                              />
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <select value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="">Semua Status</option>
                    <option value="READY_TO_SHIP">READY_TO_SHIP</option>
                    <option value="PAID">PAID</option>
                    <option value="SHIPPING">SHIPPING</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>

                  <input
                    type="text"
                    value={performedBy}
                    onChange={(event) => setPerformedBy(event.target.value)}
                    placeholder="Cari nama scanner / kasir..."
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
              {exportStatusLabel && (
                <div
                  className={`pklog-export-status ${
                    exportJob?.status === "failed" ? "is-error" : ""
                  }`}
                >
                  {exportStatusLabel}
                </div>
              )}
            </section>

            <section className="pklog-kpi-grid">
              <article className="pklog-kpi-card">
                <div className="pklog-kpi-head">
                  <FiLayers /> Total Pesanan
                </div>
                <strong>
                  {loadingSummary
                    ? "..."
                    : summary?.total_order_formatted ?? formatWholeNumber(summary?.total_order)}
                </strong>
                <small>order pada rentang tanggal</small>
              </article>
              <article className="pklog-kpi-card">
                <div className="pklog-kpi-head">
                  <FiCheckCircle /> Total Produk
                </div>
                <strong>
                  {loadingSummary
                    ? "..."
                    : summary?.total_items_formatted ?? formatWholeNumber(summary?.total_items)}
                </strong>
                <small>item berhasil dipacking</small>
              </article>
              <article className="pklog-kpi-card">
                <div className="pklog-kpi-head">
                  <FiSearch /> Total Pendapatan
                </div>
                <strong>{loadingSummary ? "..." : formatRupiah(summary?.total_amount)}</strong>
                <small>akumulasi gross amount</small>
              </article>
              <article className="pklog-kpi-card">
                <div className="pklog-kpi-head">
                  <FiUser /> Petugas Aktif
                </div>
                <strong>{formatWholeNumber(totalKasirAktif)}</strong>
                <small>petugas tercatat dalam periode</small>
              </article>
            </section>

            <section className="pklog-card pklog-kasir-card">
              <h3>Ringkasan Petugas</h3>
              {kasirSummary.length === 0 ? (
                <div className="pklog-empty">Tidak ada data petugas</div>
              ) : (
                <>
                  <div className="pklog-kasir-wrap">
                    <table className="pklog-kasir-table">
                      <thead>
                        <tr>
                          <th>Petugas</th>
                          <th>Pesanan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleKasirSummary.map((item) => (
                          <tr key={`${item.performed_by || "unknown"}-${item.total_orders}`}>
                            <td>{item.performed_by || "-"}</td>
                            <td>
                              {item.total_orders_formatted ?? formatWholeNumber(item.total_orders)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pklog-kasir-footer">
                    <span>
                      Menampilkan {visibleKasirSummary.length} dari {kasirSummary.length} petugas.
                    </span>

                    {hasMoreKasirSummary && (
                      <button
                        type="button"
                        className="pklog-btn pklog-btn-secondary"
                        onClick={() =>
                          setVisibleKasirCount((current) => current + KASIR_SUMMARY_BATCH)
                        }
                      >
                        Tampilkan 5 Berikutnya
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="pklog-card pklog-table-card">
              <div className="pklog-table-tools">
                <span>Geser tabel untuk melihat semua kolom</span>
                <div className="pklog-table-tools-btns">
                  <button type="button" onClick={() => scrollTable("left")}>
                    Geser Kiri
                  </button>
                  <button type="button" onClick={() => scrollTable("right")}>
                    Geser Kanan
                  </button>
                </div>
              </div>

              <div className="pklog-table-wrap" ref={tableScrollRef}>
                <div className="pklog-table-inner">
                  <table className="pklog-table">
                    <thead>
                      <tr>
                        <th>Tracking Number</th>
                        <th>Mode</th>
                        <th>Petugas</th>
                        <th>Total Item</th>
                        <th>Total Harga</th>
                        <th>Tanggal / Jam</th>
                        <th>Nomor Seri</th>
                        <th>Status</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={9} className="pklog-empty">
                            Memuat data...
                          </td>
                        </tr>
                      )}
                      {!loading && logs.length === 0 && (
                        <tr>
                          <td colSpan={9} className="pklog-empty">
                            Tidak ada data log pada filter ini.
                          </td>
                        </tr>
                      )}
                      {logs.map((logItem) => (
                        <tr key={logItem.id}>
                          <td data-label="Tracking Number">
                            {logItem.order?.tracking_number || "-"}
                          </td>
                          <td data-label="Mode">{getModeLabel(logItem)}</td>
                          <td data-label="Petugas">{logItem.performed_by || "-"}</td>
                          <td data-label="Total Item">
                            {logItem.total_items_formatted ??
                              formatWholeNumber(logItem.total_items)}
                          </td>
                          <td data-label="Total Harga">
                            {formatRupiah(logItem.order?.total_amount)}
                          </td>
                          <td data-label="Tanggal / Jam">
                            <div className="pklog-date-time">
                              <span>{dayjs(logItem.created_at).format("DD-MM-YYYY")}</span>
                              <small>{dayjs(logItem.created_at).format("HH:mm:ss")}</small>
                            </div>
                          </td>
                          <td data-label="Nomor Seri">{logItem.serial_preview || "-"}</td>
                          <td data-label="Status">{logItem.order?.status || "-"}</td>
                          <td data-label="Aksi">
                            <button
                              className="pklog-btn-detail"
                              onClick={() => handleOpenModal(logItem)}
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
                  <label htmlFor="pklog-per-page">Tampilkan</label>
                  <select
                    id="pklog-per-page"
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
                    disabled={!pagination.prev_cursor || loading}
                    onClick={() =>
                      fetchLogs(
                        startDate,
                        endDate,
                        status,
                        pagination.prev_cursor,
                        tracking,
                        performedBy,
                        selectedModes,
                        perPage
                      )
                    }
                  >
                    Prev
                  </button>

                  <span>Gunakan Prev / Next untuk lanjut ke data berikutnya.</span>

                  <button
                    disabled={!pagination.next_cursor || loading}
                    onClick={() =>
                      fetchLogs(
                        startDate,
                        endDate,
                        status,
                        pagination.next_cursor,
                        tracking,
                        performedBy,
                        selectedModes,
                        perPage
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>

            {showModal && selectedLogs && (
              <div className="pklog-modal-overlay">
                <div className="pklog-modal-content">
                  <h3>
                    Detail Scan {selectedLogs.order?.tracking_number
                      ? `- ${selectedLogs.order.tracking_number}`
                      : `- ${selectedLogs.id}`}
                  </h3>
                  <div className="pklog-modal-meta">
                    <span>{selectedLogDetail?.mode_label || selectedLogs.mode_label || "-"}</span>
                    <span>{selectedLogDetail?.performed_by || selectedLogs.performed_by || "-"}</span>
                    <span>
                      {dayjs(selectedLogDetail?.created_at || selectedLogs.created_at).format(
                        "DD-MM-YYYY HH:mm:ss"
                      )}
                    </span>
                  </div>
                  <div className="pklog-modal-table-wrap">
                    <table className="pklog-modal-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Qty</th>
                          <th>Nomor Seri</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailLoading && (
                          <tr>
                            <td colSpan={4}>Memuat detail scan...</td>
                          </tr>
                        )}
                        {!detailLoading && detailError && (
                          <tr>
                            <td colSpan={4}>{detailError}</td>
                          </tr>
                        )}
                        {!detailLoading &&
                          !detailError &&
                          (selectedLogDetail?.rows || []).length === 0 && (
                          <tr>
                            <td colSpan={4}>Tidak ada detail scan untuk log ini.</td>
                          </tr>
                        )}
                        {!detailLoading &&
                          !detailError &&
                          (selectedLogDetail?.rows || []).map((item) => (
                          <tr key={item.key}>
                            <td>
                              {item.sku}
                              {item.originalSku && item.originalSku !== item.sku
                                ? ` (asli: ${item.originalSku})`
                                : ""}
                            </td>
                            <td>{formatWholeNumber(item.quantity)}</td>
                            <td>{item.serial_number}</td>
                            <td>{item.status}</td>
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

export default LogsPage;

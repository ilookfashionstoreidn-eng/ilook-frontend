import React, { useEffect, useRef, useState } from "react";
import "./Logs.css";
import API from "../../api";
import { FaFileExcel, FaQrcode } from "react-icons/fa";
import { FiCheckCircle, FiLayers, FiSearch, FiUser } from "react-icons/fi";
import dayjs from "dayjs";

const formatRupiah = (value) => {
  const amount = Number(value || 0);

  return `Rp ${amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const getLogMode = (log) => {
  if (log?.action === "scan_validasi_random") {
    return "random";
  }

  if (log?.action === "scan_validasi_belum_barcode") {
    return "belum-barcode";
  }

  return "normal";
};

const getModeLabel = (log) => {
  const mode = getLogMode(log);

  if (mode === "random") {
    return "Random";
  }

  if (mode === "belum-barcode") {
    return "Belum Barcode";
  }

  return "Normal";
};

const getPackedTotalItems = (log) => {
  if (getLogMode(log) === "random") {
    const totalPackedQty = Number(log.order?.total_packed_qty || 0);
    if (Number.isFinite(totalPackedQty) && totalPackedQty > 0) {
      return totalPackedQty;
    }

    return (log.order?.packing_results || []).reduce(
      (sum, item) => sum + Number(item.scanned_qty || 0),
      0
    );
  }

  return Number(log.order?.total_qty || 0);
};

const getPackingRows = (log) => {
  const mode = getLogMode(log);

  if (mode === "random") {
    return (
      log.order?.packing_results?.flatMap((item) =>
        (item.serials || []).map((serial) => ({
          key: `${item.id}-${serial.id || serial.serial_number}`,
          sku: item.actual_sku,
          originalSku: item.original_sku,
          quantity: 1,
          status: item.status,
          serial_number: serial.serial_number,
        }))
      ) || []
    );
  }

  if (mode === "belum-barcode") {
    return (
      log.order?.items?.map((item) => ({
        key: `${log.id}-${item.id || item.sku}`,
        sku: item.sku,
        originalSku: null,
        quantity: Number(item.quantity || 0),
        status: "belum barcode",
        serial_number: "-",
      })) || []
    );
  }

  return (
    log.order?.items?.flatMap((item) =>
      (item.serials || []).map((serial) => ({
        key: `${item.sku}-${serial.id || serial.serial_number}`,
        sku: item.sku,
        originalSku: null,
        quantity: 1,
        status: "sesuai",
        serial_number: serial.serial_number,
      }))
    ) || []
  );
};

const getSerialPreview = (log) => {
  if (getLogMode(log) === "belum-barcode") {
    return "-";
  }

  const serials = getPackingRows(log).map((row) => row.serial_number).filter(Boolean);
  return serials.length > 0 ? serials.join(", ") : "-";
};

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [selectedLogs, setSelectedLogs] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [tracking, setTracking] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [kasirSummary, setKasirSummary] = useState([]);
  const tableScrollRef = useRef(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
  });

  const fetchLogs = async (
    start = startDate,
    end = endDate,
    stat = status,
    page = 1,
    track = tracking,
    performed = performedBy
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.get("/orders/logs", {
        params: {
          page,
          start_date: start,
          end_date: end,
          ...(performed && { performed_by: performed }),
          ...(stat && { status: stat }),
          ...(track && { tracking_number: track }),
        },
      });

      setLogs(response.data.data);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
      });
    } catch (fetchError) {
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
    track = tracking
  ) => {
    try {
      setLoadingSummary(true);
      setError(null);

      const response = await API.post("/orders/summary", {
        start_date: start,
        end_date: end,
        ...(stat && { status: stat }),
        ...(performed && { performed_by: performed }),
        ...(track && { tracking_number: track }),
      });

      if (response.data.data.length > 0) {
        setSummary(response.data.data[0]);
      } else {
        setSummary({ total_order: 0, total_items: 0, total_amount: 0 });
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

  const handleFilter = () => {
    if (!startDate || !endDate) {
      alert("Silakan pilih tanggal awal dan akhir!");
      return;
    }

    fetchSummary(startDate, endDate, status, performedBy, tracking);
    fetchLogs(startDate, endDate, status, 1, tracking, performedBy);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await API.get("/orders/logs/export", {
        responseType: "blob",
        params: {
          start_date: startDate,
          end_date: endDate,
          status: status || null,
        },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `logs_order_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (exportError) {
      alert("Gagal mengunduh file Excel.");
    } finally {
      setExporting(false);
    }
  };

  const handleOpenModal = (item) => {
    setSelectedLogs(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedLogs(null);
  };

  const totalKasirAktif = kasirSummary.length;

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
                <div className="pklog-filter-dates">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                  <span className="pklog-dash">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </div>

                <div className="pklog-filter-search">
                  <input
                    type="text"
                    placeholder="Cari Tracking Number..."
                    value={tracking}
                    onChange={(event) => setTracking(event.target.value)}
                    className="pklog-input-tracking"
                  />
                </div>

                <div className="pklog-filter-selects">
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
            </section>

            <section className="pklog-kpi-grid">
              <article className="pklog-kpi-card">
                <div className="pklog-kpi-head">
                  <FiLayers /> Total Pesanan
                </div>
                <strong>{loadingSummary ? "..." : summary?.total_order || 0}</strong>
                <small>order pada rentang tanggal</small>
              </article>
              <article className="pklog-kpi-card">
                <div className="pklog-kpi-head">
                  <FiCheckCircle /> Total Produk
                </div>
                <strong>{loadingSummary ? "..." : summary?.total_items || 0}</strong>
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
                <strong>{totalKasirAktif}</strong>
                <small>petugas tercatat dalam periode</small>
              </article>
            </section>

            <section className="pklog-card pklog-kasir-card">
              <h3>Ringkasan Petugas</h3>
              {kasirSummary.length === 0 ? (
                <div className="pklog-empty">Tidak ada data petugas</div>
              ) : (
                <div className="pklog-kasir-wrap">
                  <table className="pklog-kasir-table">
                    <thead>
                      <tr>
                        <th>Petugas</th>
                        <th>Pesanan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kasirSummary.map((item) => (
                        <tr key={`${item.performed_by || "unknown"}-${item.total_orders}`}>
                          <td>{item.performed_by || "-"}</td>
                          <td>{item.total_orders}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                          <td>{logItem.order?.tracking_number || "-"}</td>
                          <td>{getModeLabel(logItem)}</td>
                          <td>{logItem.performed_by || "-"}</td>
                          <td>{getPackedTotalItems(logItem)}</td>
                          <td>{formatRupiah(logItem.order?.total_amount)}</td>
                          <td>
                            <div className="pklog-date-time">
                              <span>{dayjs(logItem.created_at).format("DD-MM-YYYY")}</span>
                              <small>{dayjs(logItem.created_at).format("HH:mm:ss")}</small>
                            </div>
                          </td>
                          <td>{getSerialPreview(logItem)}</td>
                          <td>{logItem.order?.status || "-"}</td>
                          <td>
                            <button
                              className="pklog-btn-detail"
                              onClick={() => handleOpenModal(logItem)}
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pagination">
                <button
                  disabled={pagination.current_page === 1}
                  onClick={() =>
                    fetchLogs(
                      startDate,
                      endDate,
                      status,
                      pagination.current_page - 1,
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
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() =>
                    fetchLogs(
                      startDate,
                      endDate,
                      status,
                      pagination.current_page + 1,
                      tracking,
                      performedBy
                    )
                  }
                >
                  Next
                </button>
              </div>
            </section>

            {showModal && selectedLogs && (
              <div className="pklog-modal-overlay">
                <div className="pklog-modal-content">
                  <h3>Detail Scan - ID Logs #{selectedLogs.id}</h3>
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
                        {getPackingRows(selectedLogs).length === 0 && (
                          <tr>
                            <td colSpan={4}>Tidak ada detail scan untuk log ini.</td>
                          </tr>
                        )}
                        {getPackingRows(selectedLogs).map((item) => (
                          <tr key={item.key}>
                            <td>
                              {item.sku}
                              {item.originalSku && item.originalSku !== item.sku
                                ? ` (asli: ${item.originalSku})`
                                : ""}
                            </td>
                            <td>{item.quantity}</td>
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

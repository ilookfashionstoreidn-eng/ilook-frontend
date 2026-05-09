import React, { useEffect, useMemo, useState } from "react";
import "./OrderMonitor.css";
import API from "../../api";
import {
  FaCheckCircle,
  FaDatabase,
  FaExclamationTriangle,
  FaSearch,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";
import { FiBox, FiClock } from "react-icons/fi";

const todayIso = () => new Date().toISOString().slice(0, 10);

const daysAgoIso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const formatNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString("id-ID") : "0";
};

const formatCurrency = (value) => {
  const parsed = Number(value || 0);
  return `Rp ${Number.isFinite(parsed) ? parsed.toLocaleString("id-ID", { maximumFractionDigits: 0 }) : "0"}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusClass = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("ready") || normalized.includes("printed")) return "info";
  if (normalized.includes("packed") || normalized.includes("ship")) return "success";
  if (normalized.includes("cancel") || normalized.includes("fail")) return "danger";
  return "muted";
};

const isPacked = (value) => String(value) === "1" || String(value).toLowerCase() === "true";

const parseIdentifiers = (value) =>
  Array.from(
    new Set(
      String(value || "")
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

const OrderMonitor = () => {
  const [filters, setFilters] = useState({
    q: "",
    start_date: daysAgoIso(7),
    end_date: todayIso(),
    status: "",
    packed: "",
    label_print_status: "",
    per_page: "50",
    time_window_unit: "hour",
    time_window_value: "8",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [pagination, setPagination] = useState({
    next_cursor: null,
    per_page: 50,
    has_more: false,
  });
  const [currentCursor, setCurrentCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [checkInput, setCheckInput] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [checkResult, setCheckResult] = useState(null);

  const identifiers = useMemo(() => parseIdentifiers(checkInput), [checkInput]);

  const fetchOrders = async (cursor = currentCursor, nextFilters = appliedFilters) => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/orders/monitor", {
        params: {
          ...nextFilters,
          cursor: cursor || undefined,
        },
      });

      setOrders(response.data.data || []);
      setSummary(response.data.summary || null);
      setSyncLogs(response.data.sync || []);
      setPagination(response.data.pagination || { next_cursor: null, per_page: nextFilters.per_page, has_more: false });
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal mengambil data order.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(null, appliedFilters);
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setAppliedFilters(filters);
    setCurrentCursor(null);
    setCursorHistory([]);
    fetchOrders(null, filters);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      q: "",
      start_date: daysAgoIso(7),
      end_date: todayIso(),
      status: "",
      packed: "",
      label_print_status: "",
      per_page: "50",
      time_window_unit: "hour",
      time_window_value: "8",
    };

    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setCurrentCursor(null);
    setCursorHistory([]);
    fetchOrders(null, resetFilters);
  };

  const handleRefresh = () => {
    fetchOrders(currentCursor, appliedFilters);
  };

  const applyQuickWindow = (unit, value) => {
    const nextFilters = {
      ...filters,
      time_window_unit: unit,
      time_window_value: String(value),
      start_date: "",
      end_date: "",
    };

    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setCurrentCursor(null);
    setCursorHistory([]);
    fetchOrders(null, nextFilters);
  };

  const handleNextPage = () => {
    if (!pagination.next_cursor) return;

    setCursorHistory((prev) => [...prev, currentCursor]);
    setCurrentCursor(pagination.next_cursor);
    fetchOrders(pagination.next_cursor, appliedFilters);
  };

  const handlePreviousPage = () => {
    if (cursorHistory.length === 0) return;

    const previousCursor = cursorHistory[cursorHistory.length - 1] || null;
    setCursorHistory((prev) => prev.slice(0, -1));
    setCurrentCursor(previousCursor);
    fetchOrders(previousCursor, appliedFilters);
  };

  const handleCheckOrders = async (event) => {
    event.preventDefault();

    if (identifiers.length === 0) {
      setCheckError("Masukkan minimal 1 nomor order atau resi.");
      setCheckResult(null);
      return;
    }

    if (identifiers.length > 200) {
      setCheckError("Maksimal 200 nomor dalam sekali cek agar query tetap ringan.");
      setCheckResult(null);
      return;
    }

    try {
      setCheckLoading(true);
      setCheckError("");
      const response = await API.post("/orders/monitor/check", {
        identifiers,
      });
      setCheckResult(response.data);
    } catch (err) {
      setCheckError(err?.response?.data?.message || "Gagal mengecek data order.");
      setCheckResult(null);
    } finally {
      setCheckLoading(false);
    }
  };

  const totalMissing = checkResult?.summary?.missing || 0;
  const windowLabel = summary?.window_label || "Rentang tanggal";
  const windowRange = summary?.window_start_at && summary?.window_end_at
    ? `${formatDateTime(summary.window_start_at)} - ${formatDateTime(summary.window_end_at)}`
    : `${appliedFilters.start_date || "-"} sampai ${appliedFilters.end_date || "-"}`;

  return (
    <div className="order-monitor">
      <header className="order-monitor-header">
        <div className="order-title-group">
          <div className="order-brand-icon">
            <FaDatabase />
          </div>
          <div>
            <div className="order-module-pill">Ginee Order Monitor</div>
            <h1>Monitoring Order</h1>
            <p>Memantau order Ginee yang sudah tersimpan di database lokal.</p>
          </div>
        </div>
        <button type="button" className="order-icon-button" onClick={handleRefresh} disabled={loading} title="Refresh data">
          <FaSyncAlt className={loading ? "spinning" : ""} />
        </button>
      </header>

      <main className="order-monitor-main">
        <section className="order-stats">
          <div className="order-stat-item">
            <p>Data Masuk</p>
            <strong>{formatNumber(summary?.total_in_window)}</strong>
            <span>{windowLabel}</span>
          </div>
          <div className="order-stat-item success">
            <p>Sudah Packed</p>
            <strong>{formatNumber(summary?.packed)}</strong>
            <span>order selesai packing</span>
          </div>
          <div className="order-stat-item warning">
            <p>Belum Packed</p>
            <strong>{formatNumber(summary?.unpacked)}</strong>
            <span>order perlu diproses</span>
          </div>
          <div className="order-stat-item info">
            <p>Label Printed</p>
            <strong>{formatNumber(summary?.printed)}</strong>
            <span>resi sudah dicetak</span>
          </div>
        </section>

        <section className="order-window-panel">
          <div className="order-window-copy">
            <h3>Filter Data Masuk</h3>
            <p>{formatNumber(summary?.total_in_window)} order masuk pada {windowLabel}</p>
            <span>{windowRange}</span>
          </div>
          <div className="order-window-actions">
            <button type="button" onClick={() => applyQuickWindow("hour", 8)} className={appliedFilters.time_window_unit === "hour" && String(appliedFilters.time_window_value) === "8" ? "active" : ""}>
              8 Jam
            </button>
            <button type="button" onClick={() => applyQuickWindow("hour", 24)} className={appliedFilters.time_window_unit === "hour" && String(appliedFilters.time_window_value) === "24" ? "active" : ""}>
              24 Jam
            </button>
            <button type="button" onClick={() => applyQuickWindow("minute", 15)} className={appliedFilters.time_window_unit === "minute" && String(appliedFilters.time_window_value) === "15" ? "active" : ""}>
              15 Menit
            </button>
            <button type="button" onClick={() => applyQuickWindow("minute", 60)} className={appliedFilters.time_window_unit === "minute" && String(appliedFilters.time_window_value) === "60" ? "active" : ""}>
              60 Menit
            </button>
          </div>
        </section>

        <section className="order-table-wrapper">
          <div className="order-table-header">
            <div>
              <h3>Database Order</h3>
            </div>
            <div className="order-sync-strip">
              {syncLogs.length > 0 ? (
                syncLogs.slice(0, 3).map((log) => (
                  <span key={log.type}>
                    <FiClock /> {log.label}: {formatDateTime(log.last_sync_at)}
                  </span>
                ))
              ) : (
                <span><FiClock /> Last sync belum tersedia</span>
              )}
            </div>
          </div>

          <form className="order-filter-section" onSubmit={handleApplyFilters}>
            <div className="order-search-wrap">
              <FaSearch />
              <input
                value={filters.q}
                onChange={(event) => handleFilterChange("q", event.target.value)}
                placeholder="Cari exact/prefix order number atau resi"
              />
            </div>
            <select
              value={filters.time_window_unit}
              onChange={(event) => handleFilterChange("time_window_unit", event.target.value)}
            >
              <option value="">Pakai Tanggal</option>
              <option value="hour">Jam kebelakang</option>
              <option value="minute">Menit kebelakang</option>
            </select>
            <input
              type="number"
              min="1"
              max="1440"
              value={filters.time_window_value}
              disabled={!filters.time_window_unit}
              onChange={(event) => handleFilterChange("time_window_value", event.target.value)}
              placeholder="Jumlah"
            />
            <input
              type="date"
              value={filters.start_date}
              disabled={Boolean(filters.time_window_unit)}
              onChange={(event) => handleFilterChange("start_date", event.target.value)}
            />
            <input
              type="date"
              value={filters.end_date}
              disabled={Boolean(filters.time_window_unit)}
              onChange={(event) => handleFilterChange("end_date", event.target.value)}
            />
            <select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
              <option value="">Semua Status</option>
              <option value="READY_TO_SHIP">READY_TO_SHIP</option>
              <option value="PRINTED">PRINTED</option>
              <option value="packed">packed</option>
              <option value="shipped">shipped</option>
            </select>
            <select value={filters.packed} onChange={(event) => handleFilterChange("packed", event.target.value)}>
              <option value="">Semua Packing</option>
              <option value="packed">Packed</option>
              <option value="unpacked">Belum packed</option>
            </select>
            <select value={filters.label_print_status} onChange={(event) => handleFilterChange("label_print_status", event.target.value)}>
              <option value="">Semua Label</option>
              <option value="PRINTED">PRINTED</option>
              <option value="printed">printed</option>
              <option value="NOT_PRINTED">NOT_PRINTED</option>
            </select>
            <select value={filters.per_page} onChange={(event) => handleFilterChange("per_page", event.target.value)}>
              <option value="25">25/baris</option>
              <option value="50">50/baris</option>
              <option value="100">100/baris</option>
            </select>
            <button type="submit" className="order-primary-button" disabled={loading}>
              Terapkan
            </button>
            <button type="button" className="order-secondary-button" onClick={handleResetFilters} disabled={loading}>
              Reset
            </button>
          </form>

          {error && <div className="order-alert error">{error}</div>}

          <div className="order-table-scroll">
            <table className="order-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Tracking</th>
                  <th>Platform</th>
                  <th>Status</th>
                  <th>Packing</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Order Date</th>
                  <th>Masuk DB</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10">
                      <div className="order-loading">Memuat data order...</div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="10">
                      <div className="order-empty">
                        <FiBox />
                        <span>Tidak ada order pada filter ini.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.order_number || "-"}</strong>
                        <small>#{order.id}</small>
                      </td>
                      <td>{order.tracking_number || "-"}</td>
                      <td>{order.platform || "-"}</td>
                      <td>
                        <span className={`order-badge ${statusClass(order.status)}`}>{order.status || "-"}</span>
                      </td>
                      <td>
                        <span className={`order-badge ${isPacked(order.is_packed) ? "success" : "warning"}`}>
                          {isPacked(order.is_packed) ? "Packed" : "Belum"}
                        </span>
                      </td>
                      <td>{formatNumber(order.total_qty)}</td>
                      <td>{formatCurrency(order.total_amount)}</td>
                      <td>{formatDateTime(order.order_date)}</td>
                      <td>{formatDateTime(order.created_at)}</td>
                      <td>
                        <button type="button" className="order-row-button" onClick={() => setSelectedOrder(order)}>
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="order-pagination">
            <button type="button" onClick={handlePreviousPage} disabled={loading || cursorHistory.length === 0}>
              Sebelumnya
            </button>
            <span>
              {currentCursor ? "Halaman berikutnya" : "Halaman pertama"} · {formatNumber(orders.length)} row
            </span>
            <button type="button" onClick={handleNextPage} disabled={loading || !pagination.next_cursor}>
              Berikutnya
            </button>
          </div>
        </section>

        <section className="order-check-panel">
          <div className="order-check-head">
            <div>
              <h3>Cek Order dari Ginee</h3>
              <p>Paste nomor order atau resi dari Ginee untuk memastikan sudah ada di database.</p>
            </div>
            <span className={totalMissing > 0 ? "order-check-pill danger" : "order-check-pill"}>
              {checkResult ? `${formatNumber(totalMissing)} belum masuk` : `${formatNumber(identifiers.length)} siap dicek`}
            </span>
          </div>
          <form onSubmit={handleCheckOrders} className="order-check-form">
            <textarea
              value={checkInput}
              onChange={(event) => setCheckInput(event.target.value)}
              placeholder="Contoh: 250509ABC123&#10;SPXID123456789"
            />
            <div className="order-check-actions">
              <button type="submit" className="order-primary-button" disabled={checkLoading}>
                {checkLoading ? "Mengecek..." : "Cek Database"}
              </button>
              <button
                type="button"
                className="order-secondary-button"
                onClick={() => {
                  setCheckInput("");
                  setCheckResult(null);
                  setCheckError("");
                }}
              >
                Bersihkan
              </button>
            </div>
          </form>
          {checkError && <div className="order-alert error">{checkError}</div>}
          {checkResult && (
            <div className="order-check-result">
              <div className="order-check-summary">
                <span><FaCheckCircle /> Ditemukan {formatNumber(checkResult.summary?.found)}</span>
                <span><FaExclamationTriangle /> Belum masuk {formatNumber(checkResult.summary?.missing)}</span>
              </div>
              <div className="order-check-list">
                {(checkResult.data || []).map((item) => (
                  <div key={item.identifier} className={`order-check-row ${item.exists ? "found" : "missing"}`}>
                    <div>
                      <strong>{item.identifier}</strong>
                      <span>{item.exists ? item.order?.order_number || item.order?.tracking_number : "Belum ditemukan di database"}</span>
                    </div>
                    <span>{item.exists ? "Ada" : "Missing"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {selectedOrder && (
        <div className="order-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="order-modal" onClick={(event) => event.stopPropagation()}>
            <div className="order-modal-header">
              <div>
                <h3>Detail Order</h3>
                <p>{selectedOrder.order_number || selectedOrder.tracking_number || "-"}</p>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="order-detail-grid">
              <div><span>Order Number</span><strong>{selectedOrder.order_number || "-"}</strong></div>
              <div><span>Tracking</span><strong>{selectedOrder.tracking_number || "-"}</strong></div>
              <div><span>Customer</span><strong>{selectedOrder.customer_name || "-"}</strong></div>
              <div><span>No. HP</span><strong>{selectedOrder.customer_phone || "-"}</strong></div>
              <div><span>Status</span><strong>{selectedOrder.status || "-"}</strong></div>
              <div><span>Label Print</span><strong>{selectedOrder.label_print_status || "-"}</strong></div>
              <div><span>Label Print Time</span><strong>{formatDateTime(selectedOrder.label_print_time)}</strong></div>
              <div><span>Picked At</span><strong>{formatDateTime(selectedOrder.picked_at)}</strong></div>
              <div><span>Updated</span><strong>{formatDateTime(selectedOrder.updated_at)}</strong></div>
              <div><span>Total Amount</span><strong>{formatCurrency(selectedOrder.total_amount)}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderMonitor;

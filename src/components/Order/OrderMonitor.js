import React, { useEffect, useMemo, useState } from "react";
import "./OrderMonitor.css";
import "../Cutting/SpkCutting/DashboardCutting.css"; // Reuse dashboard cutting CSS for layout
import API from "../../api";
import {
  FaCheckCircle,
  FaDatabase,
  FaExclamationTriangle,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaFilter,
  FaListUl,
} from "react-icons/fa";
import { FiBox, FiClock, FiFileText } from "react-icons/fi";

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
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
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
    q: "", start_date: daysAgoIso(7), end_date: todayIso(),
    status: "", packed: "", label_print_status: "", per_page: "50",
    time_window_unit: "hour", time_window_value: "8",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [pagination, setPagination] = useState({
    next_cursor: null, per_page: 50, has_more: false,
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
      setLoading(true); setError("");
      const response = await API.get("/orders/monitor", {
        params: { ...nextFilters, cursor: cursor || undefined },
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

  useEffect(() => { fetchOrders(null, appliedFilters); }, []);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setAppliedFilters(filters);
    setCurrentCursor(null); setCursorHistory([]);
    fetchOrders(null, filters);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      q: "", start_date: daysAgoIso(7), end_date: todayIso(),
      status: "", packed: "", label_print_status: "", per_page: "50",
      time_window_unit: "hour", time_window_value: "8",
    };
    setFilters(resetFilters); setAppliedFilters(resetFilters);
    setCurrentCursor(null); setCursorHistory([]);
    fetchOrders(null, resetFilters);
  };

  const handleRefresh = () => { fetchOrders(currentCursor, appliedFilters); };

  const handleSyncHistorical = async () => {
    if (!window.confirm("Penarikan historis 90 hari akan dijalankan di latar belakang (hanya berlaku di VPS Linux). Lanjutkan?")) return;
    try {
      setLoading(true);
      const res = await API.post("/orders/sync-historical");
      alert(res.data.message);
    } catch (err) {
      alert(err?.response?.data?.message || "Gagal memulai sinkronisasi historis.");
    } finally {
      setLoading(false);
    }
  };

  const applyQuickWindow = (unit, value) => {
    const nextFilters = {
      ...filters, time_window_unit: unit, time_window_value: String(value),
      start_date: "", end_date: "",
    };
    setFilters(nextFilters); setAppliedFilters(nextFilters);
    setCurrentCursor(null); setCursorHistory([]);
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
      setCheckError("Masukkan minimal 1 nomor order atau resi."); setCheckResult(null); return;
    }
    if (identifiers.length > 200) {
      setCheckError("Maksimal 200 nomor dalam sekali cek agar query tetap ringan."); setCheckResult(null); return;
    }
    try {
      setCheckLoading(true); setCheckError("");
      const response = await API.post("/orders/monitor/check", { identifiers });
      setCheckResult(response.data);
    } catch (err) {
      setCheckError(err?.response?.data?.message || "Gagal mengecek data order."); setCheckResult(null);
    } finally {
      setCheckLoading(false);
    }
  };

  const totalMissing = checkResult?.summary?.missing || 0;
  const windowLabel = summary?.window_label || "Rentang tanggal";
  const windowRange = summary?.window_start_at && summary?.window_end_at
    ? `${formatDateTime(summary.window_start_at)} - ${formatDateTime(summary.window_end_at)}`
    : `${appliedFilters.start_date || "-"} sampai ${appliedFilters.end_date || "-"}`;

  const inputStyle = { padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--ks-line)", fontSize: "12px", outline: "none", width: "130px", height: "32px", boxSizing: "border-box" };

  return (
    <div className="ks-page dc-page">
      {/* Header */}
      <header className="ks-header">
        <div className="ks-header-id">
          <div className="dc-title">
            <FaDatabase style={{ color: "var(--dc-blue)" }} />
            <h1>Ginee Order Monitor</h1>
          </div>
          <span className="ks-header-sub">Memantau order Ginee yang sudah tersimpan di database lokal.</span>
        </div>
        <div className="ks-header-actions">
          <button className="ks-btn ks-btn-outline" onClick={handleSyncHistorical} disabled={loading} style={{ marginRight: '8px' }}>
            <FaDatabase className={loading ? "is-spinning" : ""} />
            <span>Tarik Data 90 Hari</span>
          </button>
          <button className="ks-btn" onClick={handleRefresh} disabled={loading}>
            <FaSyncAlt className={loading ? "is-spinning" : ""} />
            <span>Segarkan</span>
          </button>
        </div>
      </header>

      <main className="dc-main">
        {error && <div className="dc-error"><FaExclamationTriangle /><span>{error}</span></div>}

        {/* ROW 1: KPI Cards */}
        <section className="dc-kpi-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-blue"><FiBox /></span>
              <span className="dc-kpi-label">Data Masuk</span>
            </div>
            <div className="dc-kpi-value">{formatNumber(summary?.total_in_window)}</div>
            <div className="dc-kpi-foot" style={{ marginTop: "8px" }}>
              <strong>{windowLabel}</strong>
            </div>
          </div>
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-green"><FaCheckCircle /></span>
              <span className="dc-kpi-label">Sudah Packed</span>
            </div>
            <div className="dc-kpi-value">{formatNumber(summary?.packed)}</div>
            <div className="dc-kpi-foot" style={{ marginTop: "8px" }}>
              <span className="dc-ok">Order selesai packing ✓</span>
            </div>
          </div>
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-orange"><FaExclamationTriangle /></span>
              <span className="dc-kpi-label">Belum Packed</span>
            </div>
            <div className="dc-kpi-value dc-val-orange">{formatNumber(summary?.unpacked)}</div>
            <div className="dc-kpi-foot" style={{ marginTop: "8px" }}>
              <span className="dc-mini-warn">Perlu diproses</span>
            </div>
          </div>
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-purple"><FiFileText /></span>
              <span className="dc-kpi-label">Label Printed</span>
            </div>
            <div className="dc-kpi-value">{formatNumber(summary?.printed)}</div>
            <div className="dc-kpi-foot" style={{ marginTop: "8px" }}>
              <strong>Resi sudah dicetak</strong>
            </div>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px", flex: 1, minHeight: 0 }}>
          
          {/* Main Table Column */}
          <section className="dc-card" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: 0, overflow: "hidden" }}>
            <div className="dc-card-head" style={{ padding: "16px 18px", margin: 0, borderBottom: "1px solid var(--ks-line)", flexWrap: "wrap", gap: "12px" }}>
              <span className="dc-card-title"><FaListUl style={{ marginRight: 6, color: "var(--dc-teal)" }} /> Database Order</span>
              
              {/* Quick Windows */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--ks-text-soft)", marginRight: "4px" }}>Filter:</span>
                <button type="button" onClick={() => applyQuickWindow("hour", 8)} className={`ks-btn ${appliedFilters.time_window_unit === "hour" && String(appliedFilters.time_window_value) === "8" ? "is-primary" : ""}`} style={{ padding: "4px 8px", fontSize: "11px", height: "auto" }}>8 Jam</button>
                <button type="button" onClick={() => applyQuickWindow("hour", 24)} className={`ks-btn ${appliedFilters.time_window_unit === "hour" && String(appliedFilters.time_window_value) === "24" ? "is-primary" : ""}`} style={{ padding: "4px 8px", fontSize: "11px", height: "auto" }}>24 Jam</button>
                <button type="button" onClick={() => applyQuickWindow("minute", 15)} className={`ks-btn ${appliedFilters.time_window_unit === "minute" && String(appliedFilters.time_window_value) === "15" ? "is-primary" : ""}`} style={{ padding: "4px 8px", fontSize: "11px", height: "auto" }}>15 Mnt</button>
              </div>

              <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "var(--ks-text-soft)", marginLeft: "auto" }}>
                {syncLogs.length > 0 ? (
                  syncLogs.slice(0, 2).map((log) => (
                    <span key={log.type} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <FiClock /> {log.label}: {formatDateTime(log.last_sync_at)}
                    </span>
                  ))
                ) : (
                  <span><FiClock /> Last sync belum tersedia</span>
                )}
              </div>
            </div>

            {/* Filters Form */}
            <form onSubmit={handleApplyFilters} style={{ padding: "12px 18px", borderBottom: "1px solid var(--ks-line)", backgroundColor: "#fbfbfc", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", backgroundColor: "#fff", border: "1px solid var(--ks-line)", borderRadius: "6px", padding: "0 8px", height: "32px", flex: 1, minWidth: "200px" }}>
                <FaSearch style={{ color: "var(--ks-muted)", fontSize: "12px", marginRight: "6px" }} />
                <input
                  value={filters.q} onChange={(e) => handleFilterChange("q", e.target.value)}
                  placeholder="Cari order/resi..."
                  style={{ border: "none", outline: "none", fontSize: "12px", width: "100%", background: "transparent" }}
                />
              </div>
              
              <select value={filters.time_window_unit} onChange={(e) => handleFilterChange("time_window_unit", e.target.value)} style={inputStyle}>
                <option value="">Pakai Tanggal</option>
                <option value="hour">Jam kebelakang</option>
                <option value="minute">Menit kebelakang</option>
              </select>
              
              <input type="number" min="1" max="1440" value={filters.time_window_value} disabled={!filters.time_window_unit} onChange={(e) => handleFilterChange("time_window_value", e.target.value)} placeholder="Qty" style={{...inputStyle, width: "60px"}} />
              
              <input type="date" value={filters.start_date} disabled={Boolean(filters.time_window_unit)} onChange={(e) => handleFilterChange("start_date", e.target.value)} style={{...inputStyle, width: "120px"}} />
              
              <input type="date" value={filters.end_date} disabled={Boolean(filters.time_window_unit)} onChange={(e) => handleFilterChange("end_date", e.target.value)} style={{...inputStyle, width: "120px"}} />
              
              <select value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)} style={inputStyle}>
                <option value="">Semua Status</option>
                <option value="READY_TO_SHIP">READY_TO_SHIP</option>
                <option value="PRINTED">PRINTED</option>
                <option value="packed">packed</option>
                <option value="shipped">shipped</option>
              </select>

              <select value={filters.packed} onChange={(e) => handleFilterChange("packed", e.target.value)} style={inputStyle}>
                <option value="">Semua Packing</option>
                <option value="packed">Packed</option>
                <option value="unpacked">Belum packed</option>
              </select>

              <button type="submit" className="ks-btn is-primary" disabled={loading} style={{ height: "32px", padding: "0 12px" }}>Terapkan</button>
              <button type="button" className="ks-btn" onClick={handleResetFilters} disabled={loading} style={{ height: "32px", padding: "0 12px" }}>Reset</button>
            </form>

            <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead style={{ position: "sticky", top: 0, backgroundColor: "var(--ks-surface)", zIndex: 1, boxShadow: "0 1px 0 var(--ks-line)" }}>
                  <tr>
                    <th style={{ padding: "12px 18px", textAlign: "left", fontWeight: "600", color: "var(--ks-text-soft)", borderBottom: "1px solid var(--ks-line)" }}>Order</th>
                    <th style={{ padding: "12px 18px", textAlign: "left", fontWeight: "600", color: "var(--ks-text-soft)", borderBottom: "1px solid var(--ks-line)" }}>Tracking</th>
                    <th style={{ padding: "12px 18px", textAlign: "left", fontWeight: "600", color: "var(--ks-text-soft)", borderBottom: "1px solid var(--ks-line)" }}>Status</th>
                    <th style={{ padding: "12px 18px", textAlign: "left", fontWeight: "600", color: "var(--ks-text-soft)", borderBottom: "1px solid var(--ks-line)" }}>Packing</th>
                    <th style={{ padding: "12px 18px", textAlign: "left", fontWeight: "600", color: "var(--ks-text-soft)", borderBottom: "1px solid var(--ks-line)" }}>Sumber</th>
                    <th style={{ padding: "12px 18px", textAlign: "center", fontWeight: "600", color: "var(--ks-text-soft)", borderBottom: "1px solid var(--ks-line)" }}>Total</th>
                    <th style={{ padding: "12px 18px", textAlign: "center", fontWeight: "600", color: "var(--ks-text-soft)", borderBottom: "1px solid var(--ks-line)" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "var(--ks-muted)" }}>Memuat data order...</td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "var(--ks-muted)" }}><FiBox size={24} style={{ marginBottom: "8px" }} /><br/>Tidak ada order pada filter ini.</td></tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} style={{ borderBottom: "1px solid var(--ks-line)" }} className="ks-table-row-hover">
                        <td style={{ padding: "12px 18px" }}>
                          <strong style={{ color: "var(--ks-text)" }}>{order.order_number || "-"}</strong>
                          <div style={{ fontSize: "11px", color: "var(--ks-muted)", marginTop: "4px" }}>{order.platform || "-"} • {formatDateTime(order.order_date)}</div>
                        </td>
                        <td style={{ padding: "12px 18px", color: "var(--ks-text)" }}>{order.tracking_number || "-"}</td>
                        <td style={{ padding: "12px 18px" }}>
                          <span className={`dc-track-badge ${statusClass(order.status) === "success" ? "is-ontrack" : statusClass(order.status) === "danger" ? "is-behind" : ""}`} style={{ backgroundColor: statusClass(order.status) === "info" ? "#eef3fc" : undefined, color: statusClass(order.status) === "info" ? "var(--dc-blue)" : undefined, padding: "4px 8px" }}>{order.status || "-"}</span>
                        </td>
                        <td style={{ padding: "12px 18px" }}>
                          <span className={`dc-track-badge ${isPacked(order.is_packed) ? "is-ontrack" : "is-behind"}`} style={{ padding: "4px 8px" }}>
                            {isPacked(order.is_packed) ? "Packed" : "Belum"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 18px" }}>
                          <span className="dc-track-badge" style={{ backgroundColor: order.source === "webhook" ? "#e5f8ed" : "#eef3fc", color: order.source === "webhook" ? "var(--dc-green)" : "var(--dc-blue)", padding: "4px 8px", textTransform: "capitalize" }}>
                            {order.source || "Syncing"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 18px", textAlign: "center" }}>
                          <div style={{ fontWeight: "600" }}>{formatNumber(order.total_qty)} pcs</div>
                          <div style={{ fontSize: "11px", color: "var(--ks-muted)" }}>{formatCurrency(order.total_amount)}</div>
                        </td>
                        <td style={{ padding: "12px 18px", textAlign: "center" }}>
                          <button type="button" className="ks-btn" onClick={() => setSelectedOrder(order)} style={{ padding: "4px 10px", fontSize: "11px", height: "auto" }}>Detail</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--ks-line)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fbfbfc", fontSize: "12px" }}>
              <button type="button" className="ks-btn" onClick={handlePreviousPage} disabled={loading || cursorHistory.length === 0} style={{ padding: "6px 12px", height: "auto" }}>Sebelumnya</button>
              <span style={{ color: "var(--ks-text-soft)" }}>{currentCursor ? "Halaman berikutnya" : "Halaman pertama"} · <strong>{formatNumber(orders.length)} row</strong></span>
              <button type="button" className="ks-btn" onClick={handleNextPage} disabled={loading || !pagination.next_cursor} style={{ padding: "6px 12px", height: "auto" }}>Berikutnya</button>
            </div>
          </section>

          {/* Right Column: Check Missing Orders */}
          <section className="dc-card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
            <div className="dc-card-head" style={{ padding: "16px 18px", margin: 0, borderBottom: "1px solid var(--ks-line)" }}>
              <span className="dc-card-title"><FaSearch style={{ marginRight: 6, color: "var(--dc-orange)" }} /> Cek Missing Order</span>
            </div>
            
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px", flex: 1, overflow: "auto" }}>
              <p style={{ fontSize: "12px", color: "var(--ks-text-soft)", margin: 0 }}>Paste nomor order/resi dari Ginee untuk memastikan apakah data tersebut sudah masuk ke database lokal kita.</p>
              
              <form onSubmit={handleCheckOrders} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <textarea
                  value={checkInput}
                  onChange={(e) => setCheckInput(e.target.value)}
                  placeholder="Contoh: 250509ABC123&#10;SPXID123456789"
                  style={{ width: "100%", height: "120px", padding: "10px", borderRadius: "8px", border: "1px solid var(--ks-line)", fontSize: "13px", resize: "none", boxSizing: "border-box", outline: "none", fontFamily: "monospace" }}
                />
                <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: totalMissing > 0 ? "var(--dc-red)" : "var(--dc-blue)", padding: "4px 8px", backgroundColor: totalMissing > 0 ? "#fdecec" : "#eef3fc", borderRadius: "999px" }}>
                    {checkResult ? `${formatNumber(totalMissing)} belum masuk` : `${formatNumber(identifiers.length)} nomor`}
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" className="ks-btn" onClick={() => { setCheckInput(""); setCheckResult(null); setCheckError(""); }} style={{ padding: "6px 12px", height: "auto", fontSize: "12px" }}>Clear</button>
                    <button type="submit" className="ks-btn is-primary" disabled={checkLoading} style={{ padding: "6px 12px", height: "auto", fontSize: "12px" }}>{checkLoading ? "Mengecek..." : "Cek Sekarang"}</button>
                  </div>
                </div>
              </form>

              {checkError && <div className="dc-error" style={{ marginTop: "12px" }}><FaExclamationTriangle /><span>{checkError}</span></div>}

              {checkResult && (
                <div style={{ marginTop: "12px", flex: 1 }}>
                  <div style={{ display: "flex", gap: "12px", fontSize: "12px", fontWeight: "600", marginBottom: "12px" }}>
                    <span style={{ color: "var(--dc-green)", display: "flex", alignItems: "center", gap: "4px" }}><FaCheckCircle /> Ditemukan: {formatNumber(checkResult.summary?.found)}</span>
                    <span style={{ color: "var(--dc-red)", display: "flex", alignItems: "center", gap: "4px" }}><FaExclamationTriangle /> Missing: {formatNumber(checkResult.summary?.missing)}</span>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
                    {(checkResult.data || []).map((item) => (
                      <div key={item.identifier} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", borderRadius: "8px", border: `1px solid ${item.exists ? "rgba(22, 163, 74, 0.2)" : "rgba(229, 72, 77, 0.2)"}`, backgroundColor: item.exists ? "rgba(22, 163, 74, 0.04)" : "rgba(229, 72, 77, 0.04)" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <strong style={{ fontSize: "12px", color: "var(--ks-text)" }}>{item.identifier}</strong>
                          <span style={{ fontSize: "11px", color: "var(--ks-muted)", marginTop: "2px" }}>{item.exists ? item.order?.order_number || item.order?.tracking_number : "Tidak ada di database"}</span>
                        </div>
                        <span className={`dc-track-badge ${item.exists ? "is-ontrack" : "is-behind"}`} style={{ padding: "3px 6px", fontSize: "9px" }}>
                          {item.exists ? "Ada" : "Missing"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>

      {/* Modal Detail */}
      {selectedOrder && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSelectedOrder(null)}>
          <div className="dc-card" style={{ width: "100%", maxWidth: "600px", margin: "20px", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="dc-card-head" style={{ padding: "16px 20px", margin: 0, borderBottom: "1px solid var(--ks-line)", backgroundColor: "#fbfbfc", borderRadius: "11px 11px 0 0" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", color: "var(--ks-text)" }}>Detail Order</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--ks-text-soft)" }}>{selectedOrder.order_number || selectedOrder.tracking_number || "-"}</p>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ks-muted)", fontSize: "18px" }}><FaTimes /></button>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", fontSize: "13px", maxHeight: "70vh", overflowY: "auto" }}>
              
              {/* Section 1: Customer & Order Basic Info */}
              <div>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "12px", color: "var(--dc-blue)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Informasi Pesanan & Pelanggan</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--ks-muted)" }}>Order Number</span><strong style={{ color: "var(--ks-text)" }}>{selectedOrder.order_number || "-"}</strong></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--ks-muted)" }}>Status</span><strong style={{ color: "var(--ks-text)" }}>{selectedOrder.status || "-"}</strong></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--ks-muted)" }}>Nama Pelanggan</span><strong style={{ color: "var(--ks-text)" }}>{selectedOrder.customer_name || "-"}</strong></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--ks-muted)" }}>No. Handphone</span><strong style={{ color: "var(--ks-text)" }}>{selectedOrder.customer_phone || "-"}</strong></div>
                </div>
              </div>

              {/* Section 2: Logistics & Address */}
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid var(--ks-line)" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "12px", color: "var(--dc-blue)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pengiriman</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--ks-muted)" }}>Kurir / Ekspedisi</span><strong style={{ color: "var(--ks-text)" }}>{selectedOrder.logistic_provider_name || "-"}</strong></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--ks-muted)" }}>Tracking Number</span><strong style={{ color: "var(--ks-text)" }}>{selectedOrder.tracking_number || "-"}</strong></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", gridColumn: "1 / -1" }}>
                    <span style={{ color: "var(--ks-muted)" }}>Alamat Pengiriman</span>
                    <strong style={{ color: "var(--ks-text)", lineHeight: "1.5" }}>
                      {selectedOrder.customer_address ? `${selectedOrder.customer_address} - ${selectedOrder.customer_city || ''}, ${selectedOrder.customer_province || ''} ${selectedOrder.customer_zip_code || ''}` : "-"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Section 3: Messages & Timestamps */}
              <div>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "12px", color: "var(--dc-blue)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Waktu & Keterangan</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", gridColumn: "1 / -1" }}>
                    <span style={{ color: "var(--ks-muted)" }}>Pesan Pembeli</span>
                    <strong style={{ color: "var(--ks-text)", backgroundColor: "#fffbe6", padding: "6px 8px", borderRadius: "4px", border: "1px dashed #ffe58f", display: "inline-block" }}>{selectedOrder.buyer_message || "-"}</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", gridColumn: "1 / -1" }}>
                    <span style={{ color: "var(--ks-muted)" }}>Memo Penjual</span>
                    <strong style={{ color: "var(--ks-text)" }}>{selectedOrder.seller_memo || "-"}</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--ks-muted)" }}>Waktu Pembayaran</span><strong style={{ color: "var(--ks-text)" }}>{formatDateTime(selectedOrder.pay_time)}</strong></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--ks-muted)" }}>Waktu Cetak Resi</span><strong style={{ color: "var(--ks-text)" }}>{formatDateTime(selectedOrder.label_print_time)}</strong></div>
                </div>
              </div>

              {/* Section 4: Finance */}
              <div style={{ borderTop: "1px solid var(--ks-line)", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ color: "var(--ks-muted)" }}>Ongkos Kirim</span>
                  <strong style={{ color: "var(--ks-text)" }}>{formatCurrency(selectedOrder.shipping_fee)}</strong>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "right" }}>
                  <span style={{ color: "var(--ks-muted)" }}>Total Pembayaran</span>
                  <strong style={{ color: "var(--dc-green)", fontSize: "18px" }}>{formatCurrency(selectedOrder.total_amount)}</strong>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderMonitor;

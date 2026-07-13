import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import "./OrderPacking.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPlatformClass = (platform = "") => {
  const p = (platform || "").toUpperCase();
  if (p.includes("TIKTOK")) return "tiktok";
  if (p.includes("SHOPEE")) return "shopee";
  if (p.includes("TOKOPEDIA")) return "tokopedia";
  if (p.includes("LAZADA")) return "lazada";
  return "other-plt";
};

const getPlatformLabel = (platform = "") => {
  const p = (platform || "").toUpperCase();
  if (p.includes("TIKTOK")) return "🎵 TikTok";
  if (p.includes("SHOPEE")) return "🛍️ Shopee";
  if (p.includes("TOKOPEDIA")) return "🟢 Tokopedia";
  if (p.includes("LAZADA")) return "🔵 Lazada";
  return platform || "—";
};

const getOrderStatusClass = (status = "") => {
  if (status === "READY_TO_SHIP") return "ready";
  if (status === "SHIPPING") return "shipping";
  if (status === "PACKED") return "packed";
  return "other-st";
};

const getOrderStatusLabel = (status = "") => {
  const map = {
    READY_TO_SHIP: "✅ Siap Kirim",
    SHIPPING: "🚚 Dalam Kirim",
    PACKED: "📦 Sudah Pack",
    CANCELLED: "❌ Dibatalkan",
    PENDING_PAYMENT: "⏳ Pending",
  };
  return map[status] || status;
};

const getLogStatusInfo = (status) => {
  const map = {
    received:  { cls: "other-st", label: "⏳ Antrian" },
    processed: { cls: "ready",    label: "✅ Berhasil" },
    failed:    { cls: "unprinted",label: "❌ Gagal" },
  };
  return map[status] || { cls: "other-st", label: status };
};

const getDeadlineInfo = (deadlineStr) => {
  if (!deadlineStr) return null;
  const now = new Date();
  const dl = new Date(deadlineStr);
  const diffHours = (dl - now) / 3600000;
  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(dl);
  if (diffHours < 6)  return { label: fmt, cls: "urgent" };
  if (diffHours < 24) return { label: fmt, cls: "warning" };
  return { label: fmt, cls: "normal" };
};

const formatTime = (dtStr) => {
  if (!dtStr) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date(dtStr));
};

const today = () => new Date().toISOString().split("T")[0];

// ─── Component ────────────────────────────────────────────────────────────────

const OrderPacking = () => {
  const navigate = useNavigate();

  // Mode: "webhook" = log webhook murni | "all" = semua order packing
  const [mode, setMode] = useState("webhook");

  const [logs, setLogs]     = useState([]);
  const [stats, setStats]   = useState({ total: 0, processed: 0, failed: 0, received: 0 });
  const [loading, setLoading] = useState(false);

  const [date, setDate]               = useState(today());
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput]   = useState("");
  const [search, setSearch]             = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [total, setTotal]             = useState(0);

  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef(null);
  const refreshRef   = useRef(null);
  const [copiedText, setCopiedText] = useState(null);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date, page, per_page: 50 });
      if (statusFilter) params.set("status", statusFilter);
      if (search)       params.set("search", search);

      const endpoint = mode === "webhook" ? "/webhook-logs" : "/orders/webhook-orders";
      const { data } = await API.get(`${endpoint}?${params}`);

      if (mode === "webhook") {
        setLogs(data.logs.data || []);
        setStats(data.stats || { total: 0, processed: 0, failed: 0, received: 0 });
        setCurrentPage(data.logs.current_page || 1);
        setLastPage(data.logs.last_page || 1);
        setTotal(data.logs.total || 0);
      } else {
        setLogs(data.orders.data || []);
        setStats(data.stats || { total: 0, ready_to_scan: 0, packed: 0 });
        setCurrentPage(data.orders.current_page || 1);
        setLastPage(data.orders.last_page || 1);
        setTotal(data.orders.total || 0);
      }
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  }, [date, statusFilter, search, mode]);

  const resetCountdown = useCallback(() => {
    setCountdown(30);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 30 : c - 1));
    }, 1000);
  }, []);

  const startAutoRefresh = useCallback(() => {
    if (refreshRef.current) clearInterval(refreshRef.current);
    refreshRef.current = setInterval(() => {
      fetchData(1);
      resetCountdown();
    }, 30000);
  }, [fetchData, resetCountdown]);

  useEffect(() => {
    fetchData(1);
    resetCountdown();
    startAutoRefresh();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (refreshRef.current)   clearInterval(refreshRef.current);
    };
  }, [fetchData, resetCountdown, startAutoRefresh]);

  const handleSearch       = () => { setSearch(searchInput); setCurrentPage(1); };
  const handleReset        = () => { setDate(today()); setStatusFilter(""); setSearch(""); setSearchInput(""); setCurrentPage(1); };
  const handleManualRefresh = () => { fetchData(currentPage); resetCountdown(); };
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const canScan = (order) =>
    order && !order.is_packed && order.label_print_status === "PRINTED" && order.tracking_number;

  // ─── Webhook Mode: render log rows ────────────────────────────────────────
  const renderWebhookRows = () =>
    logs.map((log, idx) => {
      const order = log.order;
      const logSt = getLogStatusInfo(log.status);
      const deadlineInfo = getDeadlineInfo(order?.shipping_deadline);
      const items = order?.items || [];
      return (
        <tr key={log.id}>
          <td style={{ color: "var(--text-muted)", fontWeight: 600 }}>
            {(currentPage - 1) * 50 + idx + 1}
          </td>

          {/* Waktu Webhook Masuk */}
          <td>
            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-primary)" }}>
              {formatTime(log.created_at)}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              {new Date(log.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
            </div>
          </td>

          {/* Ginee Order ID */}
          <td>
            <div
              style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--accent-blue)", cursor: "pointer", fontWeight: 600 }}
              onClick={() => handleCopy(log.ginee_order_id)}
              title="Klik untuk copy"
            >
              {log.ginee_order_id?.slice(0, 16)}...
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {log.action || "—"}
            </div>
          </td>

          {/* Status Proses */}
          <td>
            <span className={`op-badge ${logSt.cls}`}>{logSt.label}</span>
            {log.error_message && (
              <div style={{ fontSize: "0.65rem", color: "var(--accent-red)", marginTop: "3px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.error_message}>
                ⚠️ {log.error_message}
              </div>
            )}
          </td>

          {/* Platform */}
          <td>
            {order ? (
              <span className={`op-badge ${getPlatformClass(order.platform)}`}>
                {getPlatformLabel(order.platform)}
              </span>
            ) : <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>}
          </td>

          {/* Tracking */}
          <td>
            {order?.tracking_number ? (
              <div
                className="op-tracking"
                onClick={() => handleCopy(order.tracking_number)}
                title="Klik untuk copy"
              >
                {order.tracking_number}
                <span className="op-copy-icon">📋</span>
              </div>
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>
            )}
          </td>

          {/* SKU */}
          <td>
            {items.length > 0 ? (
              <div className="op-sku-list">
                {items.slice(0, 2).map((item, i) => (
                  <span key={i} className="op-sku-item" title={item.sku}>
                    {item.sku}
                    {item.quantity > 1 && (
                      <span style={{ color: "var(--accent-orange)", marginLeft: "4px" }}>×{item.quantity}</span>
                    )}
                  </span>
                ))}
                {items.length > 2 && (
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>+{items.length - 2} item</span>
                )}
              </div>
            ) : (
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{order?.sku || "—"}</span>
            )}
          </td>

          {/* Status Order */}
          <td>
            {order ? (
              <>
                <span className={`op-badge ${getOrderStatusClass(order.status)}`}>
                  {getOrderStatusLabel(order.status)}
                </span>
                <div style={{ marginTop: "4px" }}>
                  <span className={`op-badge ${order.label_print_status === "PRINTED" ? "printed" : "unprinted"}`}
                    style={{ fontSize: "0.65rem" }}>
                    {order.label_print_status === "PRINTED" ? "🖨️ Printed" : "⬜ Belum"}
                  </span>
                </div>
              </>
            ) : <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>}
          </td>

          {/* Deadline */}
          <td>
            {deadlineInfo ? (
              <span className={`op-deadline ${deadlineInfo.cls}`}>
                {deadlineInfo.cls === "urgent" && "⚠️ "}
                {deadlineInfo.label}
              </span>
            ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
          </td>

          {/* Aksi */}
          <td>
            {order && canScan(order) ? (
              <button
                className="op-btn-scan"
                onClick={() => navigate(`/packing?tracking=${encodeURIComponent(order.tracking_number)}`)}
              >
                📦 Scan
              </button>
            ) : order?.is_packed ? (
              <span className="op-btn-scan disabled">✅ Done</span>
            ) : log.status === "failed" ? (
              <span className="op-btn-scan disabled" style={{ color: "var(--accent-red)" }}>❌ Error</span>
            ) : (
              <span className="op-btn-scan disabled">🔒 Belum</span>
            )}
          </td>
        </tr>
      );
    });

  // ─── Stats config by mode ─────────────────────────────────────────────────
  const statsCards = mode === "webhook"
    ? [
        { icon: "📥", label: "Webhook Diterima", value: stats.total,     cls: "blue" },
        { icon: "✅", label: "Berhasil Diproses", value: stats.processed, cls: "green" },
        { icon: "⏳", label: "Dalam Antrian",     value: stats.received,  cls: "" },
        { icon: "❌", label: "Gagal",             value: stats.failed,    cls: "orange" },
      ]
    : [
        { icon: "📥", label: "Total Order",      value: stats.total,         cls: "blue" },
        { icon: "✅", label: "Siap Discan",      value: stats.ready_to_scan, cls: "green" },
        { icon: "📦", label: "Sudah Dipacking",  value: stats.packed,        cls: "orange" },
        { icon: "⏳", label: "Belum Dipacking",  value: (stats.total || 0) - (stats.packed || 0), cls: "" },
      ];

  const statusOptions = mode === "webhook"
    ? [{ v: "", l: "Semua Status" }, { v: "processed", l: "Berhasil" }, { v: "received", l: "Dalam Antrian" }, { v: "failed", l: "Gagal" }]
    : [{ v: "", l: "Semua Status" }, { v: "READY_TO_SHIP", l: "Siap Kirim" }, { v: "SHIPPING", l: "Dalam Kirim" }, { v: "PACKED", l: "Sudah Pack" }];

  const tableHeaders = mode === "webhook"
    ? ["#", "Waktu Masuk", "Ginee Order ID", "Status Proses", "Platform", "Tracking Number", "SKU / Produk", "Status Order", "Batas Kirim", "Aksi"]
    : ["#", "Platform", "Tracking Number", "No. Order", "SKU / Produk", "Status", "Label", "Batas Kirim", "Waktu Masuk", "Aksi"];

  return (
    <div className="op-page">
      {/* ── HEADER ── */}
      <div className="op-header">
        <div className="op-header-inner">
          <div className="op-header-left">
            <div className="op-header-icon">📦</div>
            <div>
              <h1>Order Packing Monitor</h1>
              <p className="op-header-sub">
                {mode === "webhook"
                  ? "Log webhook real-time dari Ginee"
                  : "Data order masuk via Webhook Ginee · Siap discan di Packing"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Mode Toggle */}
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "8px", padding: "3px", border: "1px solid var(--border)" }}>
              <button
                onClick={() => setMode("webhook")}
                style={{
                  padding: "6px 14px", borderRadius: "6px", border: "none", cursor: "pointer",
                  fontSize: "0.78rem", fontWeight: 700, fontFamily: "Inter, sans-serif",
                  background: mode === "webhook" ? "var(--accent-green)" : "transparent",
                  color: mode === "webhook" ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.2s",
                }}
              >
                🔔 Log Webhook
              </button>
              <button
                onClick={() => setMode("all")}
                style={{
                  padding: "6px 14px", borderRadius: "6px", border: "none", cursor: "pointer",
                  fontSize: "0.78rem", fontWeight: 700, fontFamily: "Inter, sans-serif",
                  background: mode === "all" ? "var(--accent-blue)" : "transparent",
                  color: mode === "all" ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.2s",
                }}
              >
                📋 Semua Order
              </button>
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Refresh dalam {countdown}d</span>
            <div className="op-live-badge"><span className="op-live-dot" />LIVE</div>
            <button className="op-btn op-btn-ghost" onClick={handleManualRefresh}>🔄 Refresh</button>
          </div>
        </div>
      </div>

      <div className="op-content">
        {/* ── STATS ── */}
        <div className="op-stats">
          {statsCards.map((s, i) => (
            <div key={i} className="op-stat-card">
              <div className={`op-stat-icon ${s.cls}`}>{s.icon}</div>
              <div>
                <p className="op-stat-label">{s.label}</p>
                <div className={`op-stat-value ${s.cls}`}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── FILTERS ── */}
        <div className="op-filters">
          <div className="op-filter-group">
            <span className="op-filter-label">Tanggal</span>
            <input type="date" className="op-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="op-filter-group">
            <span className="op-filter-label">Status</span>
            <select className="op-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {statusOptions.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <div className="op-filter-group">
            <span className="op-filter-label">Cari</span>
            <input
              type="text" className="op-input op-input-search"
              placeholder={mode === "webhook" ? "Ginee Order ID / Tracking..." : "Tracking / SKU / Nama..."}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="op-filter-actions">
            <button className="op-btn op-btn-primary" onClick={handleSearch}>🔍 Cari</button>
            <button className="op-btn op-btn-ghost" onClick={handleReset}>↩ Reset</button>
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="op-table-wrapper">
          <div className="op-table-header">
            <span className="op-table-title">
              {mode === "webhook" ? "Log Webhook dari Ginee" : "Daftar Order Masuk"}
            </span>
            <span className="op-table-count">{total} item ditemukan</span>
          </div>

          {loading ? (
            <div className="op-loading">
              <div className="op-spinner" />
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Memuat data...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="op-empty">
              <div className="op-empty-icon">📭</div>
              <p>{mode === "webhook" ? "Belum ada webhook masuk hari ini" : "Tidak ada order untuk tanggal " + date}</p>
              <p style={{ marginTop: "6px", fontSize: "0.78rem" }}>
                {mode === "webhook" ? "Log akan muncul otomatis saat Ginee mengirim webhook" : "Coba ganti tanggal filter"}
              </p>
            </div>
          ) : (
            <div className="op-table-scroll">
              <table className="op-table">
                <thead>
                  <tr>{tableHeaders.map((h, i) => <th key={i}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {mode === "webhook" ? renderWebhookRows() : logs.map((order, idx) => {
                    const deadlineInfo = getDeadlineInfo(order.shipping_deadline);
                    const scannable = canScan(order);
                    const items = order.items || [];
                    return (
                      <tr key={order.id}>
                        <td style={{ color: "var(--text-muted)", fontWeight: 600 }}>{(currentPage - 1) * 50 + idx + 1}</td>
                        <td><span className={`op-badge ${getPlatformClass(order.platform)}`}>{getPlatformLabel(order.platform)}</span></td>
                        <td>
                          <div className="op-tracking" onClick={() => handleCopy(order.tracking_number)} title="Klik untuk copy">
                            {order.tracking_number}<span className="op-copy-icon">📋</span>
                          </div>
                        </td>
                        <td><div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>{order.order_number?.slice(0, 12)}...</div></td>
                        <td>
                          {items.length > 0 ? (
                            <div className="op-sku-list">
                              {items.slice(0, 2).map((item, i) => <span key={i} className="op-sku-item">{item.sku} {item.quantity > 1 && <span style={{ color: "var(--accent-orange)" }}>×{item.quantity}</span>}</span>)}
                              {items.length > 2 && <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>+{items.length - 2}</span>}
                            </div>
                          ) : <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{order.sku || "—"}</span>}
                        </td>
                        <td><span className={`op-badge ${getOrderStatusClass(order.status)}`}>{getOrderStatusLabel(order.status)}</span></td>
                        <td><span className={`op-badge ${order.label_print_status === "PRINTED" ? "printed" : "unprinted"}`}>{order.label_print_status === "PRINTED" ? "🖨️ Printed" : "⬜ Belum"}</span></td>
                        <td>{deadlineInfo ? <span className={`op-deadline ${deadlineInfo.cls}`}>{deadlineInfo.label}</span> : "—"}</td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{formatTime(order.created_at)}</td>
                        <td>
                          <button className={`op-btn-scan ${!scannable ? "disabled" : ""}`} onClick={() => scannable && navigate(`/packing?tracking=${encodeURIComponent(order.tracking_number)}`)}>
                            {order.is_packed ? "✅ Done" : scannable ? "📦 Scan" : "🔒 Belum"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {lastPage > 1 && (
            <div className="op-pagination">
              <button className="op-btn op-btn-ghost" disabled={currentPage === 1} onClick={() => { setCurrentPage(currentPage - 1); fetchData(currentPage - 1); }}>← Prev</button>
              <span className="op-page-info">Halaman {currentPage} dari {lastPage}</span>
              <button className="op-btn op-btn-ghost" disabled={currentPage === lastPage} onClick={() => { setCurrentPage(currentPage + 1); fetchData(currentPage + 1); }}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {copiedText && <div className="op-copied-toast">✅ Disalin: {copiedText}</div>}
    </div>
  );
};

export default OrderPacking;

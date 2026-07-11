import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import "./OrderPacking.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPlatformClass = (platform = "") => {
  const p = platform.toUpperCase();
  if (p.includes("TIKTOK")) return "tiktok";
  if (p.includes("SHOPEE")) return "shopee";
  if (p.includes("TOKOPEDIA")) return "tokopedia";
  if (p.includes("LAZADA")) return "lazada";
  return "other-plt";
};

const getPlatformLabel = (platform = "") => {
  const p = platform.toUpperCase();
  if (p.includes("TIKTOK")) return "🎵 TikTok";
  if (p.includes("SHOPEE")) return "🛍️ Shopee";
  if (p.includes("TOKOPEDIA")) return "🟢 Tokopedia";
  if (p.includes("LAZADA")) return "🔵 Lazada";
  return platform || "—";
};

const getStatusClass = (status = "") => {
  if (status === "READY_TO_SHIP") return "ready";
  if (status === "SHIPPING") return "shipping";
  if (status === "PACKED") return "packed";
  return "other-st";
};

const getStatusLabel = (status = "") => {
  const map = {
    READY_TO_SHIP: "✅ Siap Kirim",
    SHIPPING: "🚚 Dalam Kirim",
    PACKED: "📦 Sudah Pack",
    CANCELLED: "❌ Dibatalkan",
    PENDING_PAYMENT: "⏳ Pending",
  };
  return map[status] || status;
};

const getCourier = (tracking = "") => {
  const t = tracking.toUpperCase();
  if (t.startsWith("JT")) return "J&T";
  if (t.startsWith("JX")) return "J&T Cargo";
  if (t.startsWith("SP")) return "Shopee";
  if (t.startsWith("TK")) return "J&T";
  if (t.startsWith("GT")) return "GTL";
  if (t.startsWith("NJ")) return "Ninja";
  if (t.startsWith("JY")) return "J&T";
  return "";
};

const getDeadlineInfo = (deadlineStr) => {
  if (!deadlineStr) return null;
  const now = new Date();
  const dl = new Date(deadlineStr);
  const diffHours = (dl - now) / 3600000;
  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(dl);
  if (diffHours < 6) return { label: fmt, cls: "urgent" };
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
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, ready_to_scan: 0, packed: 0, platforms: [] });
  const [loading, setLoading] = useState(false);

  // Filters
  const [date, setDate] = useState(today());
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Auto-refresh
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef(null);
  const refreshRef = useRef(null);

  // Copy toast
  const [copiedText, setCopiedText] = useState(null);

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date,
        page,
        per_page: 50,
      });
      if (statusFilter) params.set("status", statusFilter);
      if (platformFilter) params.set("platform", platformFilter);
      if (search) params.set("search", search);

      const { data } = await API.get(`/orders/webhook-orders?${params}`);
      setOrders(data.orders.data || []);
      setStats(data.stats || { total: 0, ready_to_scan: 0, packed: 0, platforms: [] });
      setCurrentPage(data.orders.current_page || 1);
      setLastPage(data.orders.last_page || 1);
      setTotal(data.orders.total || 0);
    } catch (err) {
      console.error("Failed to load webhook orders", err);
    } finally {
      setLoading(false);
    }
  }, [date, statusFilter, platformFilter, search]);

  // Auto-refresh countdown
  const resetCountdown = useCallback(() => {
    setCountdown(30);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) return 30;
        return c - 1;
      });
    }, 1000);
  }, []);

  const startAutoRefresh = useCallback(() => {
    if (refreshRef.current) clearInterval(refreshRef.current);
    refreshRef.current = setInterval(() => {
      fetchOrders(1);
      resetCountdown();
    }, 30000);
  }, [fetchOrders, resetCountdown]);

  useEffect(() => {
    fetchOrders(1);
    resetCountdown();
    startAutoRefresh();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [fetchOrders, resetCountdown, startAutoRefresh]);

  const handleSearch = () => {
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setDate(today());
    setStatusFilter("");
    setPlatformFilter("");
    setSearch("");
    setSearchInput("");
    setCurrentPage(1);
  };

  const handleManualRefresh = () => {
    fetchOrders(currentPage);
    resetCountdown();
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const handleOpenPacking = (trackingNumber, isPacked) => {
    if (isPacked) return;
    // Buka halaman packing dengan tracking number sudah terisi
    navigate(`/packing?tracking=${encodeURIComponent(trackingNumber)}`);
  };

  const canScan = (order) =>
    !order.is_packed &&
    order.label_print_status === "PRINTED" &&
    order.tracking_number;

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
                Data order masuk via Webhook Ginee · Siap discan di Packing
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="op-refresh-info">Refresh dalam {countdown}d</span>
            <div className="op-live-badge">
              <span className="op-live-dot" />
              LIVE
            </div>
            <button className="op-btn op-btn-ghost" onClick={handleManualRefresh}>
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="op-content">
        {/* ── STATS ── */}
        <div className="op-stats">
          <div className="op-stat-card">
            <div className="op-stat-icon blue">📥</div>
            <div>
              <p className="op-stat-label">Total Masuk Hari Ini</p>
              <div className="op-stat-value blue">{stats.total}</div>
            </div>
          </div>
          <div className="op-stat-card">
            <div className="op-stat-icon green">✅</div>
            <div>
              <p className="op-stat-label">Siap Discan</p>
              <div className="op-stat-value green">{stats.ready_to_scan}</div>
            </div>
          </div>
          <div className="op-stat-card">
            <div className="op-stat-icon orange">📦</div>
            <div>
              <p className="op-stat-label">Sudah Dipacking</p>
              <div className="op-stat-value orange">{stats.packed}</div>
            </div>
          </div>
          <div className="op-stat-card">
            <div className="op-stat-icon purple">⏳</div>
            <div>
              <p className="op-stat-label">Belum Dipacking</p>
              <div className="op-stat-value">{stats.total - stats.packed}</div>
            </div>
          </div>
        </div>

        {/* ── FILTERS ── */}
        <div className="op-filters">
          <div className="op-filter-group">
            <span className="op-filter-label">Tanggal</span>
            <input
              type="date"
              className="op-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="op-filter-group">
            <span className="op-filter-label">Status</span>
            <select
              className="op-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="READY_TO_SHIP">Siap Kirim</option>
              <option value="SHIPPING">Dalam Kirim</option>
              <option value="PACKED">Sudah Pack</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>

          <div className="op-filter-group">
            <span className="op-filter-label">Platform</span>
            <select
              className="op-input"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
            >
              <option value="">Semua Platform</option>
              {stats.platforms.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="op-filter-group">
            <span className="op-filter-label">Cari</span>
            <input
              type="text"
              className="op-input op-input-search"
              placeholder="Tracking / No. Order / SKU / Nama..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          <div className="op-filter-actions">
            <button className="op-btn op-btn-primary" onClick={handleSearch}>
              🔍 Cari
            </button>
            <button className="op-btn op-btn-ghost" onClick={handleReset}>
              ↩ Reset
            </button>
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="op-table-wrapper">
          <div className="op-table-header">
            <span className="op-table-title">Daftar Order Masuk via Webhook</span>
            <span className="op-table-count">{total} order ditemukan</span>
          </div>

          {loading ? (
            <div className="op-loading">
              <div className="op-spinner" />
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Memuat data order...
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="op-empty">
              <div className="op-empty-icon">📭</div>
              <p>Belum ada order masuk untuk tanggal {date}</p>
              <p style={{ marginTop: "6px", fontSize: "0.78rem" }}>
                Order akan muncul otomatis saat Ginee mengirim webhook
              </p>
            </div>
          ) : (
            <div className="op-table-scroll">
              <table className="op-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Platform</th>
                    <th>Tracking Number</th>
                    <th>No. Order</th>
                    <th>SKU / Produk</th>
                    <th>Status</th>
                    <th>Label</th>
                    <th>Batas Kirim</th>
                    <th>Waktu Masuk</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => {
                    const deadlineInfo = getDeadlineInfo(order.shipping_deadline);
                    const scannable = canScan(order);
                    const items = order.items || [];
                    const courier = getCourier(order.tracking_number || "");

                    return (
                      <tr key={order.id}>
                        <td style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                          {(currentPage - 1) * 50 + idx + 1}
                        </td>

                        {/* Platform */}
                        <td>
                          <span className={`op-badge ${getPlatformClass(order.platform)}`}>
                            {getPlatformLabel(order.platform)}
                          </span>
                        </td>

                        {/* Tracking */}
                        <td>
                          <div
                            className="op-tracking"
                            onClick={() => handleCopy(order.tracking_number)}
                            title="Klik untuk copy"
                          >
                            {order.tracking_number}
                            <span className="op-copy-icon">📋</span>
                          </div>
                          {courier && (
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              {courier}
                            </div>
                          )}
                        </td>

                        {/* Order number */}
                        <td>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                              fontFamily: "monospace",
                              cursor: "pointer",
                            }}
                            onClick={() => handleCopy(order.order_number)}
                            title="Klik untuk copy"
                          >
                            {order.order_number
                              ? `${order.order_number.slice(0, 10)}...`
                              : "—"}
                          </div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {order.customer_name || ""}
                          </div>
                        </td>

                        {/* SKU / Items */}
                        <td>
                          {items.length > 0 ? (
                            <div className="op-sku-list">
                              {items.slice(0, 3).map((item, i) => (
                                <span key={i} className="op-sku-item" title={item.sku}>
                                  {item.sku}
                                  {item.quantity > 1 && (
                                    <span style={{ color: "var(--accent-orange)", marginLeft: "4px" }}>
                                      ×{item.quantity}
                                    </span>
                                  )}
                                </span>
                              ))}
                              {items.length > 3 && (
                                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                  +{items.length - 3} item lagi
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {order.sku || "—"}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`op-badge ${getStatusClass(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                          {order.is_packed ? (
                            <div style={{ marginTop: "4px" }}>
                              <span className="op-badge packed" style={{ fontSize: "0.65rem" }}>
                                ✅ Packed
                              </span>
                            </div>
                          ) : null}
                        </td>

                        {/* Label */}
                        <td>
                          <span
                            className={`op-badge ${
                              order.label_print_status === "PRINTED"
                                ? "printed"
                                : "unprinted"
                            }`}
                          >
                            {order.label_print_status === "PRINTED"
                              ? "🖨️ Printed"
                              : "⬜ Belum"}
                          </span>
                        </td>

                        {/* Deadline */}
                        <td>
                          {deadlineInfo ? (
                            <span className={`op-deadline ${deadlineInfo.cls}`}>
                              {deadlineInfo.cls === "urgent" && "⚠️ "}
                              {deadlineInfo.label}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>

                        {/* Time */}
                        <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                          {formatTime(order.created_at)}
                        </td>

                        {/* Action */}
                        <td>
                          <button
                            className={`op-btn-scan ${!scannable ? "disabled" : ""}`}
                            onClick={() =>
                              scannable && handleOpenPacking(order.tracking_number, order.is_packed)
                            }
                            title={
                              !order.tracking_number
                                ? "Tidak ada tracking number"
                                : order.is_packed
                                ? "Sudah dipacking"
                                : order.label_print_status !== "PRINTED"
                                ? "Label belum diprint"
                                : "Buka di halaman Packing"
                            }
                          >
                            {order.is_packed ? "✅ Done" : scannable ? "📦 Scan" : "🔒 Belum Siap"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="op-pagination">
              <button
                className="op-btn op-btn-ghost"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(currentPage - 1);
                  fetchOrders(currentPage - 1);
                }}
              >
                ← Prev
              </button>
              <span className="op-page-info">
                Halaman {currentPage} dari {lastPage}
              </span>
              <button
                className="op-btn op-btn-ghost"
                disabled={currentPage === lastPage}
                onClick={() => {
                  setCurrentPage(currentPage + 1);
                  fetchOrders(currentPage + 1);
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Copy Toast */}
      {copiedText && (
        <div className="op-copied-toast">✅ Disalin: {copiedText}</div>
      )}
    </div>
  );
};

export default OrderPacking;

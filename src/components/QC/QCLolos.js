import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import API from "../../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./QCLolos.css";

import {
  FiCheckCircle,
  FiBox,
  FiSearch,
  FiLayers,
  FiCamera,
  FiX,
  FiCornerUpLeft,
  FiFileText,
  FiZap,
  FiRefreshCw,
  FiAlertCircle,
  FiClock,
  FiActivity,
  FiCommand,
} from "react-icons/fi";

const STATUS_META = {
  idle: { label: "Idle", className: "idle" },
  ready: { label: "Ready", className: "ready" },
  scanning: { label: "Scanning", className: "scanning" },
  success: { label: "Success", className: "success" },
  error: { label: "Error", className: "error" },
};

const SESSION_TARGET = 500;
const ROW_HEIGHT = 56;
const TABLE_VIEWPORT_HEIGHT = 420;
const OVERSCAN = 8;

const QCLolos = () => {
  const [summary, setSummary] = useState({ total_item: 0, total_scan: 0, total_group: 0 });
  const [reportRows, setReportRows] = useState([]);
  const [reportMeta, setReportMeta] = useState({ current_page: 1, per_page: 50, last_page: 1, total: 0 });
  const [skuOptions, setSkuOptions] = useState(["all"]);

  const [isScanning, setIsScanning] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [skuFilter, setSkuFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [tableScrollTop, setTableScrollTop] = useState(0);

  const [undoLoadingKey, setUndoLoadingKey] = useState("");
  const [scanStatus, setScanStatus] = useState("idle");
  const [statusText, setStatusText] = useState("Mode scan belum aktif.");
  const [lastErrorMessage, setLastErrorMessage] = useState("");
  const [sessionSuccess, setSessionSuccess] = useState(0);
  const [sessionError, setSessionError] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const [pendingUndo, setPendingUndo] = useState(null);

  const inputRef = useRef(null);
  const autoSubmitTimerRef = useRef(null);
  const sessionStartRef = useRef(Date.now());
  const quickUndoTimerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isScanning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isScanning]);

  const fetchSummary = useCallback(async () => {
    const res = await API.get("/qc-lolos");
    setSummary({
      total_item: Number(res.data.total_item || 0),
      total_scan: Number(res.data.total_scan || 0),
      total_group: Number(res.data.total_group || 0),
    });
  }, []);

  const fetchReport = useCallback(
    async (targetPage = page) => {
      const params = {
        page: targetPage,
        per_page: perPage,
        search: debouncedSearch || undefined,
        sku: skuFilter !== "all" ? skuFilter : undefined,
        time_filter: timeFilter,
      };

      const res = await API.get("/qc-lolos/report", { params });
      const payload = res.data || {};
      const meta = payload.meta || {};

      setReportRows(payload.data || []);
      setReportMeta({
        current_page: Number(meta.current_page || targetPage || 1),
        per_page: Number(meta.per_page || perPage),
        last_page: Number(meta.last_page || 1),
        total: Number(meta.total || 0),
      });

      const normalizedSku = ["all", ...((payload.sku_options || []).filter(Boolean))];
      setSkuOptions([...new Set(normalizedSku)]);

      if ((meta.last_page || 1) > 0 && targetPage > (meta.last_page || 1)) {
        setPage(meta.last_page);
      }

      setTableScrollTop(0);
    },
    [debouncedSearch, page, perPage, skuFilter, timeFilter]
  );

  const refreshData = useCallback(
    async (targetPage = page) => {
      setFetchingData(true);
      try {
        await Promise.all([fetchSummary(), fetchReport(targetPage)]);
      } catch {
        toast.error("Gagal memuat data QC Lolos.");
      } finally {
        setFetchingData(false);
      }
    },
    [fetchReport, fetchSummary, page]
  );

  useEffect(() => {
    refreshData(page);
  }, [refreshData, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, timeFilter, skuFilter, perPage]);

  const activateScanMode = () => {
    setIsScanning(true);
    setBarcodeInput("");
    setLastScanResult(null);
    setScanStatus("ready");
    setStatusText("Scanner siap. Tempel barcode untuk proses otomatis.");
    setLastErrorMessage("");

    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  const deactivateScanMode = () => {
    setIsScanning(false);
    setBarcodeInput("");
    setLastScanResult(null);
    setScanStatus("idle");
    setStatusText("Mode scan dimatikan.");

    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
  };

  const parseErrorMessage = (err) => {
    const status = err?.response?.status;
    const rawMsg = err?.response?.data?.message || "";
    const msg = rawMsg.toLowerCase();

    if (status === 422 || msg.includes("format barcode")) {
      return "Format barcode tidak valid. Gunakan format SKU|NOMOR_SERI.";
    }
    if (status === 404 || msg.includes("tidak ditemukan")) {
      return "Data barcode tidak ditemukan di sistem.";
    }
    if (status >= 500) {
      return "Server error saat simpan scan. Coba ulang beberapa detik lagi.";
    }
    if (rawMsg) {
      return rawMsg;
    }
    return "Scan gagal. Coba scan ulang barcode yang sama.";
  };

  const pushQuickUndo = useCallback((nomor_seri, sku) => {
    const expiresAt = Date.now() + 5000;
    setPendingUndo({ nomor_seri, sku, expiresAt });

    if (quickUndoTimerRef.current) {
      clearTimeout(quickUndoTimerRef.current);
    }

    quickUndoTimerRef.current = setTimeout(() => {
      setPendingUndo(null);
      quickUndoTimerRef.current = null;
    }, 5000);
  }, []);

  const submitScan = useCallback(
    async (rawBarcode) => {
      const barcode = (rawBarcode || "").trim();
      if (!barcode || loading) return;

      setLoading(true);
      setScanStatus("scanning");
      setStatusText("Memproses barcode...");
      setLastErrorMessage("");

      try {
        const res = await API.post("/qc-lolos/scan", { barcode });
        const result = res.data;

        setLastScanResult({ ...result, scanned_at: new Date().toISOString() });
        setSessionSuccess((v) => v + 1);
        setScanStatus("success");
        setStatusText(`Scan sukses: ${result.sku} / ${result.nomor_seri}`);
        setBarcodeInput("");
        pushQuickUndo(result.nomor_seri, result.sku);
        toast.success(`Scan berhasil: ${result.sku} - ${result.nomor_seri}`);
        await refreshData(page);
      } catch (err) {
        const parsedMsg = parseErrorMessage(err);
        setSessionError((v) => v + 1);
        setScanStatus("error");
        setStatusText("Scan gagal.");
        setLastErrorMessage(parsedMsg);
        toast.error(parsedMsg);
        setBarcodeInput("");
      } finally {
        setLoading(false);
        setTimeout(() => {
          if (inputRef.current) inputRef.current.focus();
        }, 80);
      }
    },
    [loading, page, pushQuickUndo, refreshData]
  );

  const handleScan = async (e) => {
    e.preventDefault();

    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    await submitScan(barcodeInput);
  };

  useEffect(() => {
    if (!isScanning || loading) return;

    const value = barcodeInput.trim();
    if (!value) return;

    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
    }

    autoSubmitTimerRef.current = setTimeout(() => {
      submitScan(value);
      autoSubmitTimerRef.current = null;
    }, 45);

    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, [barcodeInput, isScanning, loading, submitScan]);

  const handleUndo = useCallback(
    async (nomor_seri, sku, skipConfirm = false) => {
      if (!skipConfirm && !window.confirm(`Batalkan scan terakhir untuk ${sku} (${nomor_seri})?`)) return;

      const key = `${nomor_seri}-${sku}`;
      setUndoLoadingKey(key);
      try {
        await API.delete("/qc-lolos/undo", {
          data: { nomor_seri, sku },
        });
        toast.success("Scan terakhir berhasil dibatalkan.");
        setStatusText(`Undo berhasil untuk ${sku} / ${nomor_seri}.`);
        setPendingUndo(null);
        await refreshData(page);

        if (
          lastScanResult &&
          lastScanResult.nomor_seri === nomor_seri &&
          lastScanResult.sku === sku
        ) {
          setLastScanResult(null);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal membatalkan scan.");
      } finally {
        setUndoLoadingKey("");
      }
    },
    [lastScanResult, page, refreshData]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && isScanning) {
        e.preventDefault();
        deactivateScanMode();
      }

      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        if (pendingUndo) {
          e.preventDefault();
          handleUndo(pendingUndo.nomor_seri, pendingUndo.sku, true);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo, isScanning, pendingUndo]);

  useEffect(() => {
    return () => {
      if (quickUndoTimerRef.current) {
        clearTimeout(quickUndoTimerRef.current);
      }
    };
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatRelativeTime = useCallback(
    (dateStr) => {
      if (!dateStr) return "-";

      const diffMs = Math.max(0, nowTs - new Date(dateStr).getTime());
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 10) return "baru saja";
      if (diffSec < 60) return `${diffSec} dtk lalu`;

      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} mnt lalu`;

      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} jam lalu`;

      const diffDay = Math.floor(diffHour / 24);
      return `${diffDay} hari lalu`;
    },
    [nowTs]
  );

  const sessionElapsedMinutes = useMemo(() => {
    const diff = nowTs - sessionStartRef.current;
    return Math.max(1 / 60, diff / 60000);
  }, [nowTs]);

  const scansPerMinute = useMemo(() => sessionSuccess / sessionElapsedMinutes, [sessionSuccess, sessionElapsedMinutes]);
  const targetProgress = useMemo(
    () => Math.min(100, (sessionSuccess / SESSION_TARGET) * 100),
    [sessionSuccess]
  );

  const filteredTotalItem = useMemo(
    () => reportRows.reduce((sum, r) => sum + Number(r.total_jumlah), 0),
    [reportRows]
  );

  const statusMeta = STATUS_META[scanStatus] || STATUS_META.idle;
  const quickUndoSeconds = pendingUndo ? Math.max(0, Math.ceil((pendingUndo.expiresAt - nowTs) / 1000)) : 0;

  const totalRows = reportRows.length;
  const startIndex = Math.max(0, Math.floor(tableScrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    totalRows,
    startIndex + Math.ceil(TABLE_VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2
  );
  const visibleRows = reportRows.slice(startIndex, endIndex);
  const topSpacerHeight = startIndex * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalRows - endIndex) * ROW_HEIGHT);

  return (
    <div className="qc-container">
      <ToastContainer position="top-right" autoClose={2600} hideProgressBar theme="light" />

      <header className="qc-header">
        <div className="qc-header-content">
          <div className="qc-title-wrapper">
            <h1 className="qc-title">QC Lolos</h1>
            <p className="qc-subtitle">
              Scan-first workspace untuk operator QC.
            </p>
            <div className="qc-shortcut-row">
              <span className="qc-shortcut-pill"><FiCommand /> Esc: Keluar Scan</span>
              <span className="qc-shortcut-pill"><FiCommand /> Ctrl+Z: Undo Cepat</span>
            </div>
          </div>
          <div className="qc-header-actions">
            <button
              className="qc-btn-ghost"
              onClick={() => refreshData(page)}
              disabled={fetchingData}
              title="Refresh data"
              type="button"
            >
              <FiRefreshCw className={fetchingData ? "icon spin" : "icon"} />
              <span>{fetchingData ? "Memuat..." : "Refresh"}</span>
            </button>
            <button
              className={`qc-scan-toggle ${isScanning ? "scanning" : ""}`}
              onClick={isScanning ? deactivateScanMode : activateScanMode}
              type="button"
            >
              {isScanning ? <FiX className="icon" /> : <FiCamera className="icon" />}
              <span>{isScanning ? "Akhiri Scan" : "Mulai Scan"}</span>
            </button>
          </div>
        </div>
      </header>

      <section className="qc-cockpit-grid">
        <div className={`qc-scan-panel scan-hero ${isScanning ? "active" : ""}`}>
          <div className="qc-scan-topbar">
            <div className={`qc-status-badge ${statusMeta.className}`}>
              <span className="dot"></span>
              {statusMeta.label}
            </div>
            <span className="qc-status-text">{statusText}</span>
          </div>

          {lastErrorMessage && (
            <div className="qc-error-banner">
              <FiAlertCircle />
              <span>{lastErrorMessage}</span>
            </div>
          )}

          <form onSubmit={handleScan} className="qc-scan-form">
            <div className="qc-input-group">
              <FiSearch className="qc-input-icon" />
              <input
                ref={inputRef}
                type="text"
                className="qc-scan-input"
                placeholder="Contoh: SKU|NOMOR_SERI"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                disabled={!isScanning || loading}
                autoComplete="off"
              />
              {loading && <div className="qc-spinner small"></div>}
            </div>
            <button
              type="submit"
              className="qc-btn-primary"
              disabled={loading || !barcodeInput.trim() || !isScanning}
            >
              {loading ? "Memproses..." : "Proses"}
            </button>
          </form>
          <p className="qc-scan-helper">
            Saat mode scan aktif, satu barcode akan auto-submit dalam milidetik setelah scanner selesai mengirim data.
          </p>

          {pendingUndo && quickUndoSeconds > 0 && (
            <div className="qc-quick-undo">
              <span>
                Scan {pendingUndo.sku}/{pendingUndo.nomor_seri} tersimpan.
                <strong> Undo dalam {quickUndoSeconds} dtk</strong>
              </span>
              <button
                type="button"
                className="qc-btn-outline"
                onClick={() => handleUndo(pendingUndo.nomor_seri, pendingUndo.sku, true)}
              >
                <FiCornerUpLeft className="icon" /> Undo Cepat
              </button>
            </div>
          )}

          {lastScanResult && (
            <div className="qc-scan-result">
              <div className="qc-result-header">
                <FiCheckCircle className="icon-success" />
                <span>Scan terakhir berhasil</span>
              </div>
              <div className="qc-result-data">
                <div className="qc-result-item">
                  <span className="label">SKU</span>
                  <span className="value font-mono">{lastScanResult.sku}</span>
                </div>
                <div className="qc-result-item">
                  <span className="label">Nomor Seri</span>
                  <span className="value font-mono">{lastScanResult.nomor_seri}</span>
                </div>
                <div className="qc-result-item">
                  <span className="label">Akumulasi</span>
                  <span className="value highlight">
                    {lastScanResult.jumlah_scan} scan ({lastScanResult.total_jumlah} item)
                  </span>
                </div>
                <div className="qc-result-item">
                  <span className="label">Waktu</span>
                  <span className="value" title={formatDate(lastScanResult.scanned_at)}>
                    {formatRelativeTime(lastScanResult.scanned_at)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="qc-session-panel">
          <h3 className="qc-session-title">Session Metrics</h3>
          <div className="qc-session-grid">
            <div className="qc-session-card">
              <span className="label"><FiActivity /> Scan / Menit</span>
              <strong>{scansPerMinute.toFixed(1)}</strong>
            </div>
            <div className="qc-session-card">
              <span className="label"><FiCheckCircle /> Success</span>
              <strong>{sessionSuccess}</strong>
            </div>
            <div className="qc-session-card">
              <span className="label"><FiAlertCircle /> Error</span>
              <strong>{sessionError}</strong>
            </div>
            <div className="qc-session-card">
              <span className="label"><FiClock /> Durasi</span>
              <strong>{Math.floor(sessionElapsedMinutes)}m</strong>
            </div>
          </div>
          <div className="qc-target-wrap">
            <div className="qc-target-head">
              <span>Target shift</span>
              <strong>{sessionSuccess}/{SESSION_TARGET}</strong>
            </div>
            <div className="qc-target-track">
              <div className="qc-target-bar" style={{ width: `${targetProgress}%` }}></div>
            </div>
          </div>
        </aside>
      </section>

      <section className="qc-stats-grid">
        <div className="qc-stat-card">
          <div className="qc-stat-icon"><FiBox /></div>
          <div className="qc-stat-details">
            <span className="qc-stat-label">Total Item Lolos</span>
            <strong className="qc-stat-value">{summary.total_item.toLocaleString()}</strong>
          </div>
        </div>
        <div className="qc-stat-card">
          <div className="qc-stat-icon"><FiZap /></div>
          <div className="qc-stat-details">
            <span className="qc-stat-label">Total Scan</span>
            <strong className="qc-stat-value">{summary.total_scan.toLocaleString()}</strong>
          </div>
        </div>
        <div className="qc-stat-card">
          <div className="qc-stat-icon"><FiLayers /></div>
          <div className="qc-stat-details">
            <span className="qc-stat-label">Total Grup (Seri x SKU)</span>
            <strong className="qc-stat-value">{summary.total_group.toLocaleString()}</strong>
          </div>
        </div>
      </section>

      <section className="qc-table-section">
        <div className="qc-table-header">
          <div>
            <h2 className="qc-table-title">Riwayat Scan QC Lolos</h2>
            <p className="qc-table-subtitle">Server-side pagination, filter debounce, dan virtualized rows aktif.</p>
          </div>

          <div className="qc-table-tools">
            <div className="qc-filter-chips" role="tablist" aria-label="Filter waktu">
              <button
                type="button"
                className={`qc-chip ${timeFilter === "all" ? "active" : ""}`}
                onClick={() => setTimeFilter("all")}
              >
                Semua
              </button>
              <button
                type="button"
                className={`qc-chip ${timeFilter === "today" ? "active" : ""}`}
                onClick={() => setTimeFilter("today")}
              >
                Hari Ini
              </button>
              <button
                type="button"
                className={`qc-chip ${timeFilter === "hour" ? "active" : ""}`}
                onClick={() => setTimeFilter("hour")}
              >
                1 Jam
              </button>
            </div>

            <div className="qc-search-block">
              <select
                className="qc-sku-filter"
                value={skuFilter}
                onChange={(e) => setSkuFilter(e.target.value)}
                aria-label="Filter SKU"
              >
                {skuOptions.map((sku) => (
                  <option key={sku} value={sku}>{sku === "all" ? "Semua SKU" : sku}</option>
                ))}
              </select>

              <div className="qc-search-wrapper">
                <FiSearch className="qc-search-icon" />
                <input
                  type="text"
                  className="qc-search-input"
                  placeholder="Cari SKU atau nomor seri..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              {searchInput && (
                <button type="button" className="qc-btn-clear" onClick={() => setSearchInput("")}>Reset</button>
              )}
            </div>
          </div>
        </div>

        <div className="qc-table-container" onScroll={(e) => setTableScrollTop(e.currentTarget.scrollTop)}>
          {fetchingData ? (
            <div className="qc-skeleton-wrap">
              <div className="qc-skeleton-line"></div>
              <div className="qc-skeleton-line"></div>
              <div className="qc-skeleton-line"></div>
            </div>
          ) : reportRows.length === 0 ? (
            <div className="qc-empty-state">
              <FiFileText className="qc-empty-icon" />
              <h3>Belum ada data</h3>
              <p>Data barang yang lolos QC akan tampil di sini.</p>
            </div>
          ) : (
            <table className="qc-data-table">
              <thead>
                <tr>
                  <th className="th-center">No</th>
                  <th>Nomor Seri</th>
                  <th>SKU</th>
                  <th className="th-center">Total Item</th>
                  <th className="th-center">Scan Count</th>
                  <th>Terakhir Scan</th>
                  <th className="th-action">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {topSpacerHeight > 0 && (
                  <tr className="qc-spacer-row">
                    <td colSpan={7} style={{ height: `${topSpacerHeight}px` }}></td>
                  </tr>
                )}

                {visibleRows.map((row, idx) => {
                  const key = `${row.nomor_seri}-${row.sku}`;
                  const isUndoing = undoLoadingKey === key;
                  const no = (page - 1) * perPage + startIndex + idx + 1;

                  return (
                    <tr key={key}>
                      <td className="td-center text-muted">{no}</td>
                      <td>
                        <code className="qc-code">{row.nomor_seri}</code>
                      </td>
                      <td>
                        <code className="qc-code">{row.sku}</code>
                      </td>
                      <td className="td-center">
                        <span className="qc-pill qc-pill-success">
                          {Number(row.total_jumlah).toLocaleString()}
                        </span>
                      </td>
                      <td className="td-center text-muted">
                        {row.jumlah_scan}x
                      </td>
                      <td className="text-muted text-small" title={formatDate(row.last_scan)}>
                        {formatRelativeTime(row.last_scan)}
                      </td>
                      <td className="td-action">
                        <button
                          className="qc-btn-outline"
                          onClick={() => handleUndo(row.nomor_seri, row.sku)}
                          disabled={isUndoing}
                          title="Batalkan scan terakhir"
                          type="button"
                        >
                          <FiCornerUpLeft className="icon" />
                          <span>{isUndoing ? "Memproses..." : "Undo"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {bottomSpacerHeight > 0 && (
                  <tr className="qc-spacer-row">
                    <td colSpan={7} style={{ height: `${bottomSpacerHeight}px` }}></td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="qc-pagination">
          <div className="qc-pagination-info">
            <span className="text-muted">
              Halaman {reportMeta.current_page} / {reportMeta.last_page} - Total grup terfilter {reportMeta.total.toLocaleString()}
            </span>
            <span className="font-medium">
              Total item pada halaman: <span className="text-primary">{filteredTotalItem.toLocaleString()} item</span>
            </span>
          </div>
          <div className="qc-pagination-actions">
            <select
              className="qc-per-page"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {[25, 50, 100, 200].map((size) => (
                <option key={size} value={size}>{size}/hal</option>
              ))}
            </select>

            <button
              type="button"
              className="qc-btn-ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || fetchingData}
            >
              Prev
            </button>
            <button
              type="button"
              className="qc-btn-ghost"
              onClick={() => setPage((p) => Math.min(reportMeta.last_page || 1, p + 1))}
              disabled={page >= (reportMeta.last_page || 1) || fetchingData}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QCLolos;



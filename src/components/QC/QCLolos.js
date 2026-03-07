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
} from "react-icons/fi";

const QCLolos = () => {
  const [scanData, setScanData] = useState([]);
  const [totalItem, setTotalItem] = useState(0);
  const [totalScan, setTotalScan] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [undoLoadingKey, setUndoLoadingKey] = useState("");
  const inputRef = useRef(null);

  const fetchData = useCallback(async () => {
    setFetchingData(true);
    try {
      const res = await API.get("/qc-lolos");
      setScanData(res.data.data || []);
      setTotalItem(res.data.total_item || 0);
      setTotalScan(res.data.total_scan || 0);
    } catch {
      toast.error("Gagal memuat data scan.");
    } finally {
      setFetchingData(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isScanning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isScanning]);

  const activateScanMode = () => {
    setIsScanning(true);
    setBarcodeInput("");
    setLastScanResult(null);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  const deactivateScanMode = () => {
    setIsScanning(false);
    setBarcodeInput("");
    setLastScanResult(null);
  };

  const handleScan = async (e) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    setLoading(true);
    try {
      const res = await API.post("/qc-lolos/scan", { barcode });
      const result = res.data;
      setLastScanResult({ ...result, scanned_at: new Date().toISOString() });
      toast.success(`Scan berhasil: ${result.sku} - ${result.nomor_seri}`);
      setBarcodeInput("");
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || "Scan gagal. Silakan cek format barcode.";
      toast.error(msg);
      setBarcodeInput("");
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  };

  const handleUndo = async (nomor_seri, sku) => {
    if (!window.confirm(`Batalkan scan terakhir untuk ${sku} (${nomor_seri})?`)) return;
    const key = `${nomor_seri}-${sku}`;
    setUndoLoadingKey(key);
    try {
      await API.delete("/qc-lolos/undo", {
        data: { nomor_seri, sku },
      });
      toast.success("Scan terakhir berhasil dibatalkan.");
      fetchData();
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
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredData = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const sorted = [...scanData].sort(
      (a, b) => new Date(b.last_scan || 0).getTime() - new Date(a.last_scan || 0).getTime()
    );

    if (!q) return sorted;

    return sorted.filter(
      (d) =>
        d.nomor_seri?.toLowerCase().includes(q) ||
        d.sku?.toLowerCase().includes(q)
    );
  }, [scanData, searchTerm]);

  const filteredTotalItem = useMemo(
    () => filteredData.reduce((sum, r) => sum + Number(r.total_jumlah), 0),
    [filteredData]
  );

  return (
    <div className="qc-container">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar theme="light" />

      <header className="qc-header">
        <div className="qc-header-content">
          <div className="qc-title-wrapper">
            <h1 className="qc-title">QC Lolos</h1>
            <p className="qc-subtitle">Verifikasi cepat hasil QC. Scan beruntun, pantau hasil, lalu koreksi dengan undo bila perlu.</p>
          </div>
          <div className="qc-header-actions">
            <button
              className="qc-btn-ghost"
              onClick={fetchData}
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

      <section className="qc-stats-grid">
        <div className="qc-stat-card">
          <div className="qc-stat-icon"><FiBox /></div>
          <div className="qc-stat-details">
            <span className="qc-stat-label">Total Item Lolos</span>
            <strong className="qc-stat-value">{totalItem.toLocaleString()}</strong>
          </div>
        </div>
        <div className="qc-stat-card">
          <div className="qc-stat-icon"><FiZap /></div>
          <div className="qc-stat-details">
            <span className="qc-stat-label">Total Scan</span>
            <strong className="qc-stat-value">{totalScan.toLocaleString()}</strong>
          </div>
        </div>
        <div className="qc-stat-card">
          <div className="qc-stat-icon"><FiLayers /></div>
          <div className="qc-stat-details">
            <span className="qc-stat-label">Total Grup (Seri x SKU)</span>
            <strong className="qc-stat-value">{scanData.length}</strong>
          </div>
        </div>
      </section>

      {isScanning && (
        <section className="qc-scan-section">
          <div className="qc-scan-panel">
            <div className="qc-scan-header">
              <span className="qc-live-indicator"></span>
              <span className="qc-scan-instruction">Mode scan aktif. Tempel barcode dari scanner lalu tekan Enter.</span>
            </div>

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
                  disabled={loading}
                  autoComplete="off"
                />
                {loading && <div className="qc-spinner small"></div>}
              </div>
              <button
                type="submit"
                className="qc-btn-primary"
                disabled={loading || !barcodeInput.trim()}
              >
                {loading ? "Memproses..." : "Proses"}
              </button>
            </form>
            <p className="qc-scan-helper">Tips: fokus akan kembali otomatis ke input agar scan beruntun lebih cepat.</p>

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
                    <span className="label">Item Tercatat</span>
                    <span className="value highlight">
                      {lastScanResult.jumlah_scan} scan ({lastScanResult.total_jumlah} item)
                    </span>
                  </div>
                  <div className="qc-result-item">
                    <span className="label">Waktu</span>
                    <span className="value">{formatDate(lastScanResult.scanned_at)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="qc-table-section">
        <div className="qc-table-header">
          <div>
            <h2 className="qc-table-title">Riwayat Scan QC Lolos</h2>
            <p className="qc-table-subtitle">Data diurutkan dari scan terbaru ke terlama.</p>
          </div>
          <div className="qc-search-block">
            <div className="qc-search-wrapper">
              <FiSearch className="qc-search-icon" />
              <input
                type="text"
                className="qc-search-input"
                placeholder="Cari SKU atau nomor seri..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <button type="button" className="qc-btn-clear" onClick={() => setSearchTerm("")}>Reset</button>
            )}
          </div>
        </div>

        <div className="qc-table-container">
          {fetchingData ? (
            <div className="qc-empty-state">
              <div className="qc-spinner"></div>
              <p>Memuat data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="qc-empty-state">
              <FiFileText className="qc-empty-icon" />
              <h3>{searchTerm ? "Data tidak ditemukan" : "Belum ada data"}</h3>
              <p>
                {searchTerm
                  ? "Coba kata kunci lain atau reset pencarian."
                  : "Data barang yang lolos QC akan tampil di sini."}
              </p>
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
                {filteredData.map((row, idx) => {
                  const key = `${row.nomor_seri}-${row.sku}`;
                  const isUndoing = undoLoadingKey === key;

                  return (
                    <tr key={key}>
                      <td className="td-center text-muted">{idx + 1}</td>
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
                      <td className="text-muted text-small">{formatDate(row.last_scan)}</td>
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
              </tbody>
            </table>
          )}
        </div>

        {filteredData.length > 0 && (
          <div className="qc-table-footer">
            <span className="text-muted">
              Menampilkan {filteredData.length} dari {scanData.length} grup
            </span>
            <span className="font-medium">
              Total item tercatat: <span className="text-primary">{filteredTotalItem.toLocaleString()} item</span>
            </span>
          </div>
        )}
      </section>
    </div>
  );
};

export default QCLolos;

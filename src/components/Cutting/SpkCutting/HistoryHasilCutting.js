import React, { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiBell,
  FiBox,
  FiChevronRight,
  FiClock,
  FiSearch,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";
import API from "../../../api";
import "../../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import "./HistoryHasilCutting.css";

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumber = (value) =>
  new Intl.NumberFormat("id-ID").format(Number(value) || 0);

const formatKg = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return `${Number(value).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
};

const statusClassMap = (status = "") => {
  const raw = String(status).toLowerCase();
  if (raw.includes("lebih berat")) return "history-cutting-status-heavy";
  if (raw.includes("lebih ringan")) return "history-cutting-status-light";
  if (raw.includes("sama")) return "history-cutting-status-even";
  return "history-cutting-status-neutral";
};

const getLastUpdate = (history = []) => {
  if (!Array.isArray(history) || history.length === 0) return null;
  return history.reduce((latest, current) => {
    const currentTime = new Date(current.created_at).getTime();
    const latestTime = latest ? new Date(latest).getTime() : 0;
    return currentTime > latestTime ? current.created_at : latest;
  }, null);
};

const HistoryHasilCutting = () => {
  const [historyData, setHistoryData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProduk, setSelectedProduk] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState({});

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await API.get("/hasil-cutting/history-by-produk");
        if (response.data && response.data.data) {
          setHistoryData(response.data.data || []);
        } else {
          setHistoryData([]);
        }
      } catch (fetchError) {
        console.error("Gagal mengambil history hasil cutting:", fetchError);
        setError("Gagal mengambil data history hasil cutting.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowDetailModal(false);
      }
    };

    if (showDetailModal) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showDetailModal]);

  const filteredHistoryData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return historyData;

    return historyData.filter((produk) => {
      const nama = String(produk.nama_produk || "").toLowerCase();
      const produkId = String(produk.produk_id || "").toLowerCase();
      return nama.includes(query) || produkId.includes(query);
    });
  }, [historyData, searchQuery]);

  const totalHistoryCount = useMemo(
    () => historyData.reduce((sum, item) => sum + (Number(item.total_history) || 0), 0),
    [historyData]
  );

  const totalDetailCount = useMemo(
    () =>
      historyData.reduce(
        (sum, item) =>
          sum +
          (item.history || []).reduce(
            (detailSum, historyItem) => detailSum + (historyItem.detail || []).length,
            0
          ),
        0
      ),
    [historyData]
  );

  const openDetail = (produk) => {
    setSelectedProduk(produk);
    setShowDetailModal(true);
  };

  const closeDetail = () => {
    setShowDetailModal(false);
    setSelectedProduk(null);
  };

  const onImageError = (produkId) => {
    setFailedImageIds((prev) => ({ ...prev, [produkId]: true }));
  };

  return (
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>History Hasil Cutting</h1>
          <span className="ks-header-sub">Riwayat hasil cutting per produk dan detail perbandingan berat</span>
        </div>
        <div className="ks-header-actions">
           <button type="button" className="ks-btn" onClick={() => window.location.reload()}>
             <FiRefreshCw /> Refresh
           </button>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Total Produk</span>
          <span className="ks-stat-value">{formatNumber(historyData.length)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Total Riwayat</span>
          <span className="ks-stat-value" style={{ color: "var(--brand-600)" }}>{formatNumber(totalHistoryCount)} kali</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Detail Item</span>
          <span className="ks-stat-value" style={{ color: "var(--success-color, #059669)" }}>{formatNumber(totalDetailCount)} baris</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Hasil Pencarian</span>
          <span className="ks-stat-value">{formatNumber(filteredHistoryData.length)} produk</span>
        </div>
      </div>

      <section className="ks-board" style={{ margin: "20px" }}>
        <div className="ks-toolbar">
          <div style={{ display: "flex", gap: "16px", alignItems: "center", width: "100%", flexWrap: "wrap" }}>
             <div className="ks-search" style={{ flex: 1, maxWidth: "400px" }}>
                <FiSearch className="ks-search-icon" />
                <input
                   type="text"
                   placeholder="Cari nama produk atau ID produk..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                   <FiX style={{ cursor: "pointer", marginLeft: "-24px" }} onClick={() => setSearchQuery("")} />
                )}
             </div>
          </div>
        </div>

        {error && !loading && (
          <div style={{ padding: "16px 20px", color: "#ef4444", display: "flex", alignItems: "center", gap: "8px" }}>
             <FiAlertCircle /> {error}
          </div>
        )}

        <div className="ks-grid-scroll" style={{ padding: "0 20px 20px 20px" }}>
          {loading ? (
             <div style={{ padding: "32px", textAlign: "center" }}>Memuat data history...</div>
          ) : !error && (
             <table className="ks-grid">
               <thead>
                 <tr>
                    <th style={{ width: "60px", textAlign: "center" }}>No</th>
                    <th>Produk</th>
                    <th>Total History</th>
                    <th>Update Terakhir</th>
                    <th style={{ textAlign: "right" }}>Aksi</th>
                 </tr>
               </thead>
               <tbody>
                  {filteredHistoryData.length > 0 ? (
                    filteredHistoryData.map((produk, index) => {
                      const hasImage = produk.gambar_produk && !failedImageIds[produk.produk_id];
                      return (
                        <tr key={produk.produk_id || index}>
                          <td style={{ textAlign: "center", color: "var(--ks-text-soft)", fontWeight: 500 }}>{index + 1}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {hasImage ? (
                                <img
                                  src={produk.gambar_produk}
                                  alt={`Produk ${produk.nama_produk || produk.produk_id}`}
                                  style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--ks-line)" }}
                                  onError={() => onImageError(produk.produk_id)}
                                />
                              ) : (
                                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", border: "1px solid var(--ks-line)" }} aria-hidden="true">
                                  <FiBox size={20} />
                                </div>
                              )}
                              <div>
                                <p style={{ margin: 0, fontWeight: 600, color: "var(--ks-text)" }}>
                                  {produk.nama_produk || `Produk ID ${produk.produk_id}`}
                                </p>
                                <span style={{ fontSize: "12px", color: "var(--ks-text-soft)" }}>
                                  ID: {produk.produk_id || "-"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ display: "inline-block", background: "var(--brand-50)", color: "var(--brand-600)", padding: "4px 8px", borderRadius: "4px", fontSize: "13px", fontWeight: 600, border: "1px solid var(--brand-200)" }}>
                              {formatNumber(produk.total_history)} kali
                            </span>
                          </td>
                          <td style={{ color: "var(--ks-text-soft)" }}>{formatDate(getLastUpdate(produk.history || []))}</td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => openDetail(produk)}
                              style={{ background: "transparent", border: "none", color: "var(--brand-600)", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "14px" }}
                            >
                              Lihat History <FiChevronRight />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "48px 0", color: "var(--ks-text-soft)" }}>
                        <FiBox size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
                        <p style={{ margin: 0, fontWeight: 500, color: "var(--ks-text)" }}>Data history belum tersedia</p>
                        <p style={{ margin: "4px 0 0 0", fontSize: "13px" }}>Tidak ada data yang cocok dengan pencarian saat ini.</p>
                      </td>
                    </tr>
                  )}
               </tbody>
             </table>
          )}
        </div>
      </section>

      {showDetailModal && selectedProduk && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={closeDetail}>
          <div style={{ background: "var(--ks-page)", width: "100%", maxWidth: "1200px", maxHeight: "90vh", borderRadius: "16px", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--ks-line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--ks-text)" }}>Detail History Produk</h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--ks-text-soft)" }}>{selectedProduk.nama_produk || `Produk ID ${selectedProduk.produk_id}`}</p>
              </div>
              <button type="button" onClick={closeDetail} style={{ background: "transparent", border: "none", color: "var(--ks-text-soft)", cursor: "pointer", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseOver={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "var(--ks-text)"; }} onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ks-text-soft)"; }}>
                <FiX size={20} />
              </button>
            </div>

            <div style={{ padding: "0", overflowX: "auto", overflowY: "auto", flex: 1 }}>
              {selectedProduk.history && selectedProduk.history.length > 0 ? (
                <table className="ks-grid" style={{ minWidth: "1200px", borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: "0", borderBottom: "none" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ width: "80px", background: "#f8fafc" }}>History</th>
                      <th style={{ width: "120px", background: "#f8fafc" }}>SPK</th>
                      <th style={{ width: "150px", background: "#f8fafc" }}>Tanggal</th>
                      <th style={{ background: "#f8fafc" }}>Bagian</th>
                      <th style={{ background: "#f8fafc" }}>Bahan</th>
                      <th style={{ background: "#f8fafc" }}>Warna</th>
                      <th style={{ textAlign: "right", background: "#f8fafc" }}>Berat</th>
                      <th style={{ textAlign: "right", background: "#f8fafc" }}>Qty</th>
                      <th style={{ textAlign: "right", background: "#f8fafc" }}>Lembar</th>
                      <th style={{ textAlign: "right", background: "#f8fafc" }}>Jml Produk</th>
                      <th style={{ textAlign: "right", background: "#f8fafc" }}>Total</th>
                      <th style={{ textAlign: "right", background: "#f8fafc" }}>Br/Produk</th>
                      <th style={{ textAlign: "center", background: "#f8fafc" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduk.history.map((item, index) => {
                      const details = item.detail && item.detail.length > 0 ? item.detail : [null];
                      return details.map((detail, detailIndex) => (
                        <tr key={`${item.id || index}-${detailIndex}`} style={{ borderBottom: detailIndex === details.length - 1 ? "2px solid var(--ks-line)" : "1px solid var(--ks-line)" }}>
                          {detailIndex === 0 && (
                            <>
                              <td rowSpan={details.length} style={{ verticalAlign: "top", background: "#f8fafc", fontWeight: 600, color: "var(--ks-text)" }}>
                                #{index + 1}
                              </td>
                              <td rowSpan={details.length} style={{ verticalAlign: "top", background: "#f8fafc", fontWeight: 600, color: "var(--brand-600)" }}>
                                {item.id_spk_cutting || "-"}
                              </td>
                              <td rowSpan={details.length} style={{ verticalAlign: "top", background: "#f8fafc", color: "var(--ks-text-soft)", fontSize: "13px" }}>
                                {formatDate(item.created_at)}
                              </td>
                            </>
                          )}
                          
                          {detail ? (
                            <>
                              <td style={{ fontWeight: 500 }}>{detail.nama_bagian || "-"}</td>
                              <td style={{ color: "var(--ks-text-soft)" }}>{detail.nama_bahan || "-"}</td>
                              <td>
                                <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>{detail.warna || "-"}</span>
                              </td>
                              <td style={{ textAlign: "right" }}>{formatKg(detail.berat)}</td>
                              <td style={{ textAlign: "right" }}>{formatNumber(detail.qty)}</td>
                              <td style={{ textAlign: "right" }}>{formatNumber(detail.jumlah_lembar)}</td>
                              <td style={{ textAlign: "right" }}>{formatNumber(detail.jumlah_produk)}</td>
                              <td style={{ textAlign: "right", fontWeight: 600, color: "var(--ks-text)" }}>
                                {formatNumber(detail.total_produk)}
                              </td>
                              <td style={{ textAlign: "right", color: "var(--brand-600)", fontWeight: 600 }}>{formatKg(detail.berat_per_produk)}</td>
                              <td style={{ textAlign: "center" }}>
                                {detail.status_perbandingan ? (
                                  <span style={{
                                    display: "inline-block", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap",
                                    background: String(detail.status_perbandingan).toLowerCase().includes("lebih berat") ? "#fef2f2" : String(detail.status_perbandingan).toLowerCase().includes("lebih ringan") ? "#fffbeb" : String(detail.status_perbandingan).toLowerCase().includes("sama") ? "#ecfdf5" : "#f1f5f9",
                                    color: String(detail.status_perbandingan).toLowerCase().includes("lebih berat") ? "#dc2626" : String(detail.status_perbandingan).toLowerCase().includes("lebih ringan") ? "#d97706" : String(detail.status_perbandingan).toLowerCase().includes("sama") ? "#059669" : "#475569",
                                    border: `1px solid ${String(detail.status_perbandingan).toLowerCase().includes("lebih berat") ? "#fecaca" : String(detail.status_perbandingan).toLowerCase().includes("lebih ringan") ? "#fde68a" : String(detail.status_perbandingan).toLowerCase().includes("sama") ? "#a7f3d0" : "#e2e8f0"}`
                                  }}>
                                    {detail.status_perbandingan}
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>-</span>
                                )}
                              </td>
                            </>
                          ) : (
                            <td colSpan={10} style={{ textAlign: "center", color: "var(--ks-text-soft)", fontSize: "14px", fontStyle: "italic", padding: "16px" }}>
                              Tidak ada detail bahan untuk history ini.
                            </td>
                          )}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ks-text-soft)" }}>
                  <FiAlertCircle size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
                  <p style={{ margin: 0, fontWeight: 500, color: "var(--ks-text)" }}>Produk ini belum memiliki history.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryHasilCutting;

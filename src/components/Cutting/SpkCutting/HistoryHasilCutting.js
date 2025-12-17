import React, { useState, useEffect } from "react";
import "./HasilCutting.css";
import API from "../../../api";

const HistoryHasilCutting = () => {
  const [historyData, setHistoryData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedProduk, setSelectedProduk] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch history data
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await API.get("/hasil-cutting/history-by-produk");
        if (response.data && response.data.data) {
          setHistoryData(response.data.data || []);
        }
      } catch (error) {
        console.error("Gagal mengambil history hasil cutting:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Handle lihat detail
  const handleLihatDetail = (produk) => {
    setSelectedProduk(produk);
    setShowDetailModal(true);
  };

  // Format tanggal
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    if (!status) return "hasil-cutting-status-badge-empty";
    if (status.includes("lebih berat")) return "hasil-cutting-status-badge-heavier";
    if (status.includes("lebih ringan")) return "hasil-cutting-status-badge-lighter";
    return "hasil-cutting-status-badge-same";
  };

  // Filter data berdasarkan search nama produk
  const filteredHistoryData = historyData.filter((produk) => {
    const nama = (produk.nama_produk || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return nama.includes(query);
  });

  return (
    <div className="hasil-cutting-container">
      <div className="hasil-cutting-header-card">
        <div>
          <h1 className="hasil-cutting-header-title">📜 History Hasil Cutting</h1>
          <p className="hasil-cutting-header-subtitle">Riwayat hasil cutting berdasarkan produk</p>
        </div>
      </div>

      <div className="hasil-cutting-table-card">
        {/* Search Produk */}
        <div className="hasil-cutting-form-group" style={{ marginBottom: "16px" }}>
          <label className="hasil-cutting-form-label">🔍 Cari Produk</label>
          <div className="hasil-cutting-form-input-wrapper">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Ketik nama produk untuk mencari history..." className="hasil-cutting-form-input" />
            <i className="fas fa-search hasil-cutting-form-search-icon"></i>
          </div>
        </div>

        {loading ? (
          <div className="hasil-cutting-loading-container">
            <div className="hasil-cutting-loading-spinner"></div>
            <p className="hasil-cutting-loading-text">Memuat data...</p>
          </div>
        ) : filteredHistoryData.length > 0 ? (
          <table className="penjahit-table">
            <thead>
              <tr>
                <th>NO</th>
                <th>GAMBAR</th>
                <th>NAMA PRODUK</th>
                <th>TOTAL HISTORY</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistoryData.map((produk, index) => (
                <tr key={produk.produk_id} className="hasil-cutting-table-row">
                  <td className="hasil-cutting-table-no">{index + 1}</td>
                  <td>
                    {produk.gambar_produk ? (
                      <img
                        src={produk.gambar_produk}
                        alt={produk.nama_produk || `Produk ${produk.produk_id}`}
                        style={{
                          width: "60px",
                          height: "60px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                        }}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/60?text=No+Image";
                        }}
                      />
                    ) : (
                      <img
                        src="https://via.placeholder.com/60?text=No+Image"
                        alt="No Image"
                        style={{
                          width: "60px",
                          height: "60px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                    )}
                  </td>
                  <td className="hasil-cutting-table-product">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <i className="fas fa-box" style={{ color: "#667eea", fontSize: "16px" }}></i>
                      <span>{produk.nama_produk || `Produk ID: ${produk.produk_id}`}</span>
                    </div>
                  </td>
                  <td>
                    <span className="hasil-cutting-badge hasil-cutting-badge-success">{produk.total_history} kali</span>
                  </td>
                  <td>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <button onClick={() => handleLihatDetail(produk)} className="hasil-cutting-action-button hasil-cutting-action-button-info" style={{ position: "relative" }}>
                        <i className="fas fa-eye"></i>
                        Lihat History
                        <i className="fas fa-chevron-down" style={{ marginLeft: "8px", fontSize: "10px" }}></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="hasil-cutting-empty-state">
            <div className="hasil-cutting-empty-state-icon">📜</div>
            <h3 className="hasil-cutting-empty-state-title">Belum Ada History</h3>
            <p className="hasil-cutting-empty-state-text">Belum ada riwayat hasil cutting yang tersimpan</p>
          </div>
        )}
      </div>

      {/* Modal Detail History */}
      {showDetailModal && selectedProduk && (
        <div className="hasil-cutting-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="hasil-cutting-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90%", width: "1200px" }}>
            {/* Header Modal */}
            <div className="hasil-cutting-modal-header">
              <h2 className="hasil-cutting-modal-title">📋 Detail History - {selectedProduk.nama_produk || `Produk ID: ${selectedProduk.produk_id}`}</h2>
              <button onClick={() => setShowDetailModal(false)} className="hasil-cutting-modal-close-button">
                <i className="fas fa-times"></i>
                Tutup
              </button>
            </div>

            {/* Content Modal */}
            <div className="hasil-cutting-modal-body">
              {selectedProduk.history && selectedProduk.history.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {selectedProduk.history.map((item, index) => (
                    <div
                      key={item.id}
                      style={{
                        border: "1px solid #e0e0e0",
                        borderRadius: "12px",
                        overflow: "hidden",
                        background: "#f9fafb",
                      }}
                    >
                      {/* History Item Header */}
                      <div
                        style={{
                          padding: "16px 20px",
                          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                          borderBottom: "1px solid #e0e0e0",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                          <span
                            style={{
                              padding: "6px 12px",
                              background: "white",
                              borderRadius: "8px",
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "#667eea",
                            }}
                          >
                            History #{index + 1}
                          </span>
                          <div>
                            <div style={{ fontSize: "15px", fontWeight: "600", color: "#333" }}>SPK: {item.id_spk_cutting || "-"}</div>
                            <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                              <i className="far fa-calendar" style={{ marginRight: "6px" }}></i>
                              {formatDate(item.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detail Table */}
                      {item.detail && item.detail.length > 0 && (
                        <div style={{ padding: "16px", background: "white" }}>
                          <table className="penjahit-table" style={{ margin: 0 }}>
                            <thead>
                              <tr>
                                <th>Bagian</th>
                                <th>Bahan</th>
                                <th>Warna</th>
                                <th>Berat (KG)</th>
                                <th>Qty</th>
                                <th>Jml Lembar</th>
                                <th>Jml Produk</th>
                                <th>Total Produk</th>
                                <th>Berat/Produk</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.detail.map((detail, detailIndex) => (
                                <tr key={detailIndex}>
                                  <td>{detail.nama_bagian || "-"}</td>
                                  <td>{detail.nama_bahan || "-"}</td>
                                  <td>
                                    <span
                                      style={{
                                        padding: "4px 8px",
                                        background: "#e0e7ff",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        fontWeight: "500",
                                        color: "#4338ca",
                                      }}
                                    >
                                      {detail.warna || "-"}
                                    </span>
                                  </td>
                                  <td>
                                    {detail.berat
                                      ? `${Number(detail.berat).toLocaleString("id-ID", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })} kg`
                                      : "-"}
                                  </td>
                                  <td>{detail.qty || "-"}</td>
                                  <td>{detail.jumlah_lembar || "-"}</td>
                                  <td>{detail.jumlah_produk || "-"}</td>
                                  <td>
                                    <span className="hasil-cutting-badge hasil-cutting-badge-success">{detail.total_produk?.toLocaleString("id-ID") || "0"}</span>
                                  </td>
                                  <td>
                                    {detail.berat_per_produk
                                      ? `${Number(detail.berat_per_produk).toLocaleString("id-ID", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })} kg`
                                      : "-"}
                                  </td>
                                  <td>{detail.status_perbandingan ? <span className={getStatusBadgeClass(detail.status_perbandingan)}>{detail.status_perbandingan}</span> : <span className="hasil-cutting-status-badge-empty">-</span>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                  <i className="fas fa-info-circle" style={{ fontSize: "48px", color: "#999", marginBottom: "16px" }}></i>
                  <p>Tidak ada history untuk produk ini</p>
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

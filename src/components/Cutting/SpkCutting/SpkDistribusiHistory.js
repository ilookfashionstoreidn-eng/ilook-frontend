import React, { useState, useEffect } from "react";
import "./SpkDistribusiHistory.css";
import API from "../../../api";

const SpkDistribusiHistory = () => {
  const [distribusiList, setDistribusiList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDistribusi, setSelectedDistribusi] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch history data
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await API.get("/spk-cutting-distribusi/history");
        if (response.data && response.data.data) {
          setDistribusiList(response.data.data || []);
        }
      } catch (error) {
        console.error("Gagal mengambil history distribusi SPK:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Handle lihat detail
  const handleLihatDetail = (distribusi) => {
    setSelectedDistribusi(distribusi);
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

  // Get tipe badge class
  const getTipeBadgeClass = (tipe) => {
    switch (tipe) {
      case "cutting":
        return "distribusi-history-badge-cutting";
      case "jasa":
        return "distribusi-history-badge-jasa";
      case "cmt":
        return "distribusi-history-badge-cmt";
      default:
        return "distribusi-history-badge-default";
    }
  };

  // Get tipe label
  const getTipeLabel = (tipe) => {
    switch (tipe) {
      case "cutting":
        return "CUTTING";
      case "jasa":
        return "JASA";
      case "cmt":
        return "CMT";
      default:
        return tipe?.toUpperCase() || "-";
    }
  };

  // Filter data berdasarkan search kode seri atau SPK Cutting ID
  const filteredDistribusiList = distribusiList.filter((distribusi) => {
    const kodeSeri = (distribusi.kode_seri || "").toLowerCase();
    const spkCuttingId = (distribusi.spk_cutting_id || "").toString().toLowerCase();
    const query = searchQuery.toLowerCase();
    return kodeSeri.includes(query) || spkCuttingId.includes(query);
  });

  return (
    <div className="distribusi-history-container">
      <div className="distribusi-history-header-card">
        <div>
          <h1 className="distribusi-history-header-title">📜 History Distribusi SPK Cutting</h1>
          <p className="distribusi-history-header-subtitle">Riwayat distribusi dan timeline status SPK Cutting</p>
        </div>
      </div>

      <div className="distribusi-history-table-card">
        {/* Search */}
        <div className="distribusi-history-form-group" style={{ marginBottom: "16px" }}>
          <label className="distribusi-history-form-label">🔍 Cari Kode Seri atau SPK Cutting ID</label>
          <div className="distribusi-history-form-input-wrapper">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik kode seri atau SPK Cutting ID untuk mencari..."
              className="distribusi-history-form-input"
            />
            <i className="fas fa-search distribusi-history-form-search-icon"></i>
          </div>
        </div>

        {loading ? (
          <div className="distribusi-history-loading-container">
            <div className="distribusi-history-loading-spinner"></div>
            <p className="distribusi-history-loading-text">Memuat data...</p>
          </div>
        ) : filteredDistribusiList.length > 0 ? (
          <table className="penjahit-table">
            <thead>
              <tr>
                <th>NO</th>
                <th>KODE SERI</th>
                <th>SPK CUTTING ID</th>
                <th>JUMLAH PRODUK</th>
                <th>TOTAL HISTORY</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredDistribusiList.map((distribusi, index) => (
                <tr key={distribusi.distribusi_id} className="distribusi-history-table-row">
                  <td className="distribusi-history-table-no">{index + 1}</td>
                  <td className="distribusi-history-table-kode">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <i className="fas fa-barcode" style={{ color: "#667eea", fontSize: "16px" }}></i>
                      <span>{distribusi.kode_seri || "-"}</span>
                    </div>
                  </td>
                  <td>
                    <span className="distribusi-history-badge distribusi-history-badge-info">
                      {distribusi.spk_cutting_id || "-"}
                    </span>
                  </td>
                  <td>
                    <span className="distribusi-history-badge distribusi-history-badge-success">
                      {distribusi.jumlah_produk?.toLocaleString("id-ID") || "0"} produk
                    </span>
                  </td>
                  <td>
                    <span className="distribusi-history-badge distribusi-history-badge-primary">
                      {distribusi.history?.length || 0} event
                    </span>
                  </td>
                  <td>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <button
                        onClick={() => handleLihatDetail(distribusi)}
                        className="distribusi-history-action-button distribusi-history-action-button-info"
                        style={{ position: "relative" }}
                      >
                        <i className="fas fa-eye"></i>
                        Lihat Timeline
                        <i className="fas fa-chevron-down" style={{ marginLeft: "8px", fontSize: "10px" }}></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="distribusi-history-empty-state">
            <div className="distribusi-history-empty-state-icon">📜</div>
            <h3 className="distribusi-history-empty-state-title">Belum Ada History</h3>
            <p className="distribusi-history-empty-state-text">Belum ada riwayat distribusi SPK Cutting yang tersimpan</p>
          </div>
        )}
      </div>

      {/* Modal Detail Timeline */}
      {showDetailModal && selectedDistribusi && (
        <div className="distribusi-history-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div
            className="distribusi-history-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90%", width: "1200px" }}
          >
            {/* Header Modal */}
            <div className="distribusi-history-modal-header">
              <h2 className="distribusi-history-modal-title">
                📋 Timeline History - {selectedDistribusi.kode_seri || `Distribusi ID: ${selectedDistribusi.distribusi_id}`}
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="distribusi-history-modal-close-button">
                <i className="fas fa-times"></i>
                Tutup
              </button>
            </div>

            {/* Content Modal */}
            <div className="distribusi-history-modal-body">
              {/* Info Distribusi */}
              <div className="distribusi-history-info-card">
                <div className="distribusi-history-info-grid">
                  <div className="distribusi-history-info-item">
                    <div className="distribusi-history-info-label">Kode Seri</div>
                    <div className="distribusi-history-info-value">{selectedDistribusi.kode_seri || "-"}</div>
                  </div>
                  <div className="distribusi-history-info-item">
                    <div className="distribusi-history-info-label">SPK Cutting ID</div>
                    <div className="distribusi-history-info-value">{selectedDistribusi.spk_cutting_id || "-"}</div>
                  </div>
                  <div className="distribusi-history-info-item">
                    <div className="distribusi-history-info-label">Jumlah Produk</div>
                    <div className="distribusi-history-info-value">
                      {selectedDistribusi.jumlah_produk?.toLocaleString("id-ID") || "0"} produk
                    </div>
                  </div>
                  <div className="distribusi-history-info-item">
                    <div className="distribusi-history-info-label">Total Event</div>
                    <div className="distribusi-history-info-value">{selectedDistribusi.history?.length || 0} event</div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              {selectedDistribusi.history && selectedDistribusi.history.length > 0 ? (
                <div className="distribusi-history-timeline-container">
                  <h3 className="distribusi-history-timeline-title">Timeline History</h3>
                  <div className="distribusi-history-timeline">
                    {selectedDistribusi.history.map((item, index) => (
                      <div key={index} className="distribusi-history-timeline-item">
                        <div className="distribusi-history-timeline-marker">
                          <div className={`distribusi-history-timeline-icon ${getTipeBadgeClass(item.tipe)}`}>
                            {item.tipe === "cutting" && <i className="fas fa-cut"></i>}
                            {item.tipe === "jasa" && <i className="fas fa-tools"></i>}
                            {item.tipe === "cmt" && <i className="fas fa-tshirt"></i>}
                          </div>
                          {index < selectedDistribusi.history.length - 1 && <div className="distribusi-history-timeline-line"></div>}
                        </div>
                        <div className="distribusi-history-timeline-content">
                          <div className="distribusi-history-timeline-header">
                            <span className={`distribusi-history-badge ${getTipeBadgeClass(item.tipe)}`}>
                              {getTipeLabel(item.tipe)}
                            </span>
                            <span className="distribusi-history-timeline-time">{formatDate(item.waktu)}</span>
                          </div>
                          <div className="distribusi-history-timeline-status">
                            <strong>Status:</strong> {item.status || "-"}
                          </div>
                          {item.keterangan && (
                            <div className="distribusi-history-timeline-keterangan">
                              <strong>Keterangan:</strong> {item.keterangan}
                            </div>
                          )}
                          {item.ref_id && (
                            <div className="distribusi-history-timeline-ref">
                              <strong>Ref ID:</strong> {item.ref_id}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                  <i className="fas fa-info-circle" style={{ fontSize: "48px", color: "#999", marginBottom: "16px" }}></i>
                  <p>Tidak ada history untuk distribusi ini</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpkDistribusiHistory;

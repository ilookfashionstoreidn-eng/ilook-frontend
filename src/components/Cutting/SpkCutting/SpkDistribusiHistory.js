import React, { useState, useEffect } from "react";
import "../../Jahit/Penjahit.css";
import "./SpkDistribusiHistory.css";
import API from "../../../api";
import { FaSearch, FaEye, FaTimes, FaCalendarAlt } from "react-icons/fa";

const SpkDistribusiHistory = () => {
  const [distribusiList, setDistribusiList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });

  const [selectedDistribusi, setSelectedDistribusi] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch history data
  const fetchHistory = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const response = await API.get(`/spk-cutting-distribusi/history?page=${page}&q=${search}`);
      if (response.data && response.data.data) {
        setDistribusiList(response.data.data);
        setPagination(response.data.meta || {
          current_page: 1,
          last_page: 1,
          total: 0,
          per_page: 10,
        });
      }
    } catch (error) {
      console.error("Gagal mengambil history distribusi SPK:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchHistory(1, searchQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      fetchHistory(newPage, searchQuery);
    }
  };

  // Handle lihat detail
  const handleLihatDetail = async (distribusiId) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    setSelectedDistribusi(null); // Reset previous data
    try {
      const response = await API.get(`/spk-cutting-distribusi/${distribusiId}/history`);
      if (response.data) {
        setSelectedDistribusi(response.data);
      }
    } catch (error) {
      console.error("Gagal mengambil detail history:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  // Format tanggal
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        <div className="distribusi-history-form-group">
          <label className="distribusi-history-form-label">🔍 Cari Kode Seri</label>
          <div className="distribusi-history-form-input-wrapper">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Kode Seri atau SPK Cutting ID..."
              className="distribusi-history-form-input"
            />
            <FaSearch className="distribusi-history-form-search-icon" />
          </div>
        </div>

        {loading ? (
          <div className="distribusi-history-loading-container">
            <div className="distribusi-history-loading-spinner"></div>
            <p className="distribusi-history-loading-text">Memuat data...</p>
          </div>
        ) : distribusiList.length > 0 ? (
          <>
            <div className="table-responsive">
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
                  {distribusiList.map((distribusi, index) => (
                    <tr key={distribusi.distribusi_id} className="distribusi-history-table-row">
                      <td className="distribusi-history-table-no">{((pagination?.current_page || 1) - 1) * (pagination?.per_page || 10) + index + 1}</td>
                      <td>
                        <div className="distribusi-history-table-kode">
                          {distribusi.kode_seri || "-"}
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
                        <button
                          onClick={() => handleLihatDetail(distribusi.distribusi_id)}
                          className="distribusi-history-action-button distribusi-history-action-button-info"
                        >
                          <FaEye /> Lihat Timeline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="distribusi-history-pagination">
              <button
                className="distribusi-history-pagination-button"
                disabled={(pagination?.current_page || 1) === 1}
                onClick={() => handlePageChange((pagination?.current_page || 1) - 1)}
              >
                Previous
              </button>
              <span className="distribusi-history-pagination-info">
                Page {pagination?.current_page || 1} of {pagination?.last_page || 1}
              </span>
              <button
                className="distribusi-history-pagination-button"
                disabled={(pagination?.current_page || 1) === (pagination?.last_page || 1)}
                onClick={() => handlePageChange((pagination?.current_page || 1) + 1)}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="distribusi-history-empty-state">
            <div className="distribusi-history-empty-state-icon">📜</div>
            <h3 className="distribusi-history-empty-state-title">Belum Ada History</h3>
            <p className="distribusi-history-empty-state-text">Belum ada riwayat distribusi SPK Cutting yang tersimpan</p>
          </div>
        )}
      </div>

      {/* Modal Detail Timeline */}
      {showDetailModal && (
        <div className="distribusi-history-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div
            className="distribusi-history-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="distribusi-history-modal-header">
              <h2 className="distribusi-history-modal-title">
                📋 Timeline History
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="distribusi-history-modal-close-button">
                <FaTimes /> Tutup
              </button>
            </div>

            <div className="distribusi-history-modal-body">
              {detailLoading ? (
                <div className="distribusi-history-loading-container">
                  <div className="distribusi-history-loading-spinner"></div>
                  <p className="distribusi-history-loading-text">Memuat timeline...</p>
                </div>
              ) : selectedDistribusi ? (
                <>
                  <div className="distribusi-history-info-card">
                    <div className="distribusi-history-info-grid">
                      <div className="distribusi-history-info-item">
                        <div className="distribusi-history-info-label">Kode Seri</div>
                        <div className="distribusi-history-info-value">{selectedDistribusi.kode_seri}</div>
                      </div>
                      <div className="distribusi-history-info-item">
                        <div className="distribusi-history-info-label">Tukang Cutting</div>
                        <div className="distribusi-history-info-value">{selectedDistribusi.nama_tukang_cutting || "-"}</div>
                      </div>
                      <div className="distribusi-history-info-item">
                        <div className="distribusi-history-info-label">Tukang Jasa</div>
                        <div className="distribusi-history-info-value">{selectedDistribusi.nama_tukang_jasa || "-"}</div>
                      </div>
                      <div className="distribusi-history-info-item">
                        <div className="distribusi-history-info-label">CMT</div>
                        <div className="distribusi-history-info-value">{selectedDistribusi.nama_cmt || "-"}</div>
                      </div>
                    </div>
                  </div>

                  <h3 className="distribusi-history-timeline-title">Timeline Events</h3>
                  <div className="distribusi-history-timeline">
                    {selectedDistribusi.history && selectedDistribusi.history.length > 0 ? (
                      selectedDistribusi.history.map((item, idx) => (
                        <div key={idx} className="distribusi-history-timeline-item">
                          <div className="distribusi-history-timeline-marker">
                            <div
                              className="distribusi-history-timeline-icon"
                              style={{
                                backgroundColor: item.tipe === "cutting" ? "#4299e1" : item.tipe === "jasa" ? "#ecc94b" : "#48bb78",
                              }}
                            >
                            </div>
                            {idx !== selectedDistribusi.history.length - 1 && <div className="distribusi-history-timeline-line"></div>}
                          </div>
                          <div className="distribusi-history-timeline-content">
                            <div className="distribusi-history-timeline-header">
                              <span
                                className={`distribusi-history-badge distribusi-history-badge-${
                                  item.tipe === "cutting" ? "cutting" : item.tipe === "jasa" ? "jasa" : "cmt"
                                }`}
                                style={{ textTransform: "uppercase" }}
                              >
                                {item.tipe}
                              </span>
                              <span className="distribusi-history-timeline-time">
                                <FaCalendarAlt style={{ marginRight: "5px" }} />
                                {formatDate(item.waktu)}
                              </span>
                            </div>
                            <div className="distribusi-history-timeline-status">
                              <strong>{item.status}</strong>
                            </div>
                            {item.keterangan && <div className="distribusi-history-timeline-keterangan">"{item.keterangan}"</div>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "#718096", fontStyle: "italic" }}>Tidak ada event history.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="error-text">Gagal memuat data detail.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpkDistribusiHistory;
import React, { useEffect, useState } from "react";
import "./HistoryPendapatanPabrik.css";
import API from "../../api";
import { FaHistory, FaEye, FaBuilding, FaMoneyBillWave } from "react-icons/fa";

const HistoryPendapatanPabrik = () => {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await API.get("/pendapatan-pabrik/history/all");
        if (res.data && res.data.success) {
          setHistoryList(res.data.data || []);
        } else {
          setHistoryList(res.data || []);
        }
      } catch (e) {
        setError("Gagal memuat riwayat pendapatan.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Handle lihat detail
  const handleLihatDetail = (history) => {
    setSelectedHistory(history);
    setShowDetailModal(true);
  };

  // Format rupiah
  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  // Format tanggal
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Filter history
  const filteredHistory = historyList.filter((h) => {
    const namaPabrik = (h.nama_pabrik || "").toLowerCase();
    const keterangan = (h.keterangan || "").toLowerCase();
    const query = searchTerm.toLowerCase();
    return namaPabrik.includes(query) || keterangan.includes(query);
  });

  return (
    <div className="history-pendapatan-pabrik-page">
      <div className="history-pendapatan-pabrik-header">
        <div className="history-pendapatan-pabrik-header-icon">
          <FaHistory />
        </div>
        <h1>Riwayat Pendapatan Pabrik</h1>
      </div>

      <div className="history-pendapatan-pabrik-table-container">
        <div className="history-pendapatan-pabrik-filter-header">
          <div className="history-pendapatan-pabrik-search-bar">
            <input
              type="text"
              placeholder="Cari nama pabrik atau keterangan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="history-pendapatan-pabrik-loading">Memuat data...</p>
        ) : error ? (
          <p className="history-pendapatan-pabrik-error">{error}</p>
        ) : filteredHistory.length === 0 ? (
          <p className="history-pendapatan-pabrik-loading">Belum ada riwayat pendapatan</p>
        ) : (
          <table className="history-pendapatan-pabrik-table">
            <thead>
              <tr>
                <th>NO</th>
                <th>ID</th>
                <th>NAMA PABRIK</th>
                <th>TANGGAL BAYAR</th>
                <th>TOTAL BAYAR</th>
                <th>JUMLAH PEMBELIAN</th>
                <th>KETERANGAN</th>
                <th style={{ textAlign: "center" }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((history, index) => (
                <tr key={history.id}>
                  <td>{index + 1}</td>
                  <td>
                    <span className="history-pendapatan-pabrik-badge history-pendapatan-pabrik-badge-info">
                      #{history.id}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <FaBuilding style={{ color: "#0487d8", fontSize: "18px" }} />
                      <span>{history.nama_pabrik}</span>
                    </div>
                  </td>
                  <td>{formatDate(history.tanggal_bayar)}</td>
                  <td>
                    <span className="history-pendapatan-pabrik-badge history-pendapatan-pabrik-badge-success">
                      {formatRupiah(history.total_bayar)}
                    </span>
                  </td>
                  <td>
                    <span className="history-pendapatan-pabrik-badge history-pendapatan-pabrik-badge-primary">
                      {history.jumlah_pembelian} item
                    </span>
                  </td>
                  <td>{history.keterangan || "-"}</td>
                  <td>
                    <button
                      className="history-pendapatan-pabrik-btn-icon view"
                      onClick={() => handleLihatDetail(history)}
                      title="Lihat Detail"
                    >
                      <FaEye /> Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Detail */}
      {showDetailModal && selectedHistory && (
        <div className="history-pendapatan-pabrik-modal" onClick={() => setShowDetailModal(false)}>
          <div className="history-pendapatan-pabrik-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="history-pendapatan-pabrik-modal-header">
              <h2>Detail Pendapatan - {selectedHistory.nama_pabrik}</h2>
              <button onClick={() => setShowDetailModal(false)} className="history-pendapatan-pabrik-modal-close">
                ×
              </button>
            </div>

            <div className="history-pendapatan-pabrik-modal-body">
              <div className="history-pendapatan-pabrik-info-card">
                <div className="history-pendapatan-pabrik-info-item">
                  <strong>ID Pendapatan:</strong>
                  <span>#{selectedHistory.id}</span>
                </div>
                <div className="history-pendapatan-pabrik-info-item">
                  <strong>Nama Pabrik:</strong>
                  <span>{selectedHistory.nama_pabrik}</span>
                </div>
                <div className="history-pendapatan-pabrik-info-item">
                  <strong>Tanggal Bayar:</strong>
                  <span>{formatDate(selectedHistory.tanggal_bayar)}</span>
                </div>
                <div className="history-pendapatan-pabrik-info-item">
                  <strong>Total Bayar:</strong>
                  <span className="history-pendapatan-pabrik-total-bayar">
                    {formatRupiah(selectedHistory.total_bayar)}
                  </span>
                </div>
                <div className="history-pendapatan-pabrik-info-item">
                  <strong>Jumlah Pembelian:</strong>
                  <span>{selectedHistory.jumlah_pembelian} item</span>
                </div>
                {selectedHistory.keterangan && (
                  <div className="history-pendapatan-pabrik-info-item" style={{ gridColumn: "1 / -1" }}>
                    <strong>Keterangan:</strong>
                    <span>{selectedHistory.keterangan}</span>
                  </div>
                )}
              </div>

              <h3 style={{ marginTop: "30px", marginBottom: "15px", color: "#17457c" }}>Detail Pembelian</h3>
              {selectedHistory.detail && selectedHistory.detail.length > 0 ? (
                <div className="history-pendapatan-pabrik-detail-table-container">
                  <table className="history-pendapatan-pabrik-detail-table">
                    <thead>
                      <tr>
                        <th>NO</th>
                        <th>SPK BAHAN ID</th>
                        <th>BAHAN</th>
                        <th>TANGGAL KIRIM</th>
                        <th>NOMINAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedHistory.detail.map((detail, index) => (
                        <tr key={detail.id}>
                          <td>{index + 1}</td>
                          <td>
                            {detail.spk_bahan_id ? (
                              <span className="history-pendapatan-pabrik-badge history-pendapatan-pabrik-badge-info">
                                #{detail.spk_bahan_id}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>{detail.bahan}</td>
                          <td>{formatDate(detail.tanggal_kirim)}</td>
                          <td className="history-pendapatan-pabrik-price">{formatRupiah(detail.nominal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: "center", padding: "20px", color: "#666" }}>Tidak ada detail pembelian</p>
              )}
            </div>

            <div className="history-pendapatan-pabrik-form-actions">
              <button
                className="history-pendapatan-pabrik-btn history-pendapatan-pabrik-btn-secondary"
                onClick={() => setShowDetailModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPendapatanPabrik;

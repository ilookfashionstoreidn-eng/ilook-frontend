import React, { useEffect, useMemo, useState } from "react";
import "./HistoryPendapatanPabrik.css";
import API from "../../api";
import {
  FaHistory,
  FaEye,
  FaBuilding,
  FaMoneyBillWave,
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaTimes,
} from "react-icons/fa";

const HistoryPendapatanPabrik = () => {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    from: 0,
    to: 0,
  });

  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const res = await API.get("/pendapatan-pabrik/history/all", {
        params: {
          page,
          search: searchTerm,
          per_page: 10,
        },
      });

      if (res.data?.success) {
        const data = res.data.data;
        setHistoryList(data?.data || []);
        setPagination({
          current_page: data.current_page,
          last_page: data.last_page,
          total: data.total,
          from: data.from,
          to: data.to,
        });
      } else {
        setHistoryList([]);
      }
    } catch (err) {
      setError("Gagal memuat riwayat pendapatan.");
      setHistoryList([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleLihatDetail = (history) => {
    setSelectedHistory(history);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedHistory(null);
  };

  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const currentPageTotal = useMemo(
    () => historyList.reduce((sum, item) => sum + Number(item.total_bayar || 0), 0),
    [historyList]
  );

  const currentPageAverage = useMemo(() => {
    if (!historyList.length) return 0;
    return currentPageTotal / historyList.length;
  }, [historyList, currentPageTotal]);

  return (
    <div className="hpp-page">
      <div className="hpp-shell">
        <section className="hpp-content">
          <header className="hpp-topbar">
            <div className="hpp-title-group">
              <div className="hpp-brand-icon">
                <FaHistory />
              </div>
              <div className="hpp-brand-text">
                <h1>Riwayat Pendapatan Pabrik</h1>
                <p>Monitoring histori pembayaran pabrik untuk kebutuhan audit dan kontrol keuangan.</p>
              </div>
            </div>

            <div className="hpp-kpi-row">
              <div className="hpp-kpi-card">
                <span className="hpp-kpi-label">Total Transaksi</span>
                <strong className="hpp-kpi-value">{pagination.total || 0}</strong>
              </div>
              <div className="hpp-kpi-card">
                <span className="hpp-kpi-label">Nominal Halaman Ini</span>
                <strong className="hpp-kpi-value">{formatRupiah(currentPageTotal)}</strong>
              </div>
              <div className="hpp-kpi-card hpp-kpi-card-accent">
                <span className="hpp-kpi-icon">
                  <FaMoneyBillWave />
                </span>
                <div className="hpp-kpi-content">
                  <span className="hpp-kpi-label">Rata-rata Transaksi</span>
                  <strong className="hpp-kpi-value">{formatRupiah(currentPageAverage)}</strong>
                </div>
              </div>
            </div>
          </header>

          <main className="hpp-main">
            <section className="hpp-table-card">
              <div className="hpp-table-header">
                <div className="hpp-table-title">
                  <h3>Daftar Riwayat Pendapatan</h3>
                  <p>
                    Menampilkan {historyList.length} baris pada halaman ini (data {pagination.from || 0} - {pagination.to || 0}) dari total {pagination.total || 0} transaksi.
                  </p>
                </div>

                <div className="hpp-search-wrap">
                  <FaSearch className="hpp-search-icon" />
                  <input
                    type="text"
                    placeholder="Cari nama pabrik atau keterangan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="hpp-search-input"
                  />
                </div>
              </div>

              {loading ? (
                <p className="hpp-state">Memuat data riwayat...</p>
              ) : error ? (
                <p className="hpp-state hpp-state-error">{error}</p>
              ) : historyList.length === 0 ? (
                <p className="hpp-state">Belum ada riwayat pendapatan yang tersedia.</p>
              ) : (
                <>
                  <div className="hpp-table-wrap">
                    <table className="hpp-table">
                      <thead>
                        <tr>
                          <th>No</th>
                          <th>ID</th>
                          <th>Nama Pabrik</th>
                          <th>Tanggal Bayar</th>
                          <th>Jatuh Tempo</th>
                          <th>Total Bayar</th>
                          <th>Jumlah Pembelian</th>
                          <th>Keterangan</th>
                          <th className="hpp-text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyList.map((history, index) => (
                          <tr key={history.id}>
                            <td>{(pagination.current_page - 1) * 10 + index + 1}</td>
                            <td>
                              <span className="hpp-id-badge">#{history.id}</span>
                            </td>
                            <td>
                              <div className="hpp-factory-cell">
                                <FaBuilding className="hpp-factory-icon" />
                                <span>{history.nama_pabrik || "-"}</span>
                              </div>
                            </td>
                            <td>{formatDate(history.tanggal_bayar)}</td>
                            <td>{history.tanggal_jatuh_tempo ? formatDate(history.tanggal_jatuh_tempo) : "-"}</td>
                            <td>
                              <span className="hpp-money-badge">{formatRupiah(history.total_bayar)}</span>
                            </td>
                            <td>
                              <span className="hpp-item-badge">{history.jumlah_pembelian || 0} item</span>
                            </td>
                            <td>{history.keterangan || "-"}</td>
                            <td className="hpp-text-center">
                              <button
                                className="hpp-action-btn"
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
                  </div>

                  <div className="hpp-pagination">
                    <span className="hpp-pagination-info">
                      Halaman {pagination.current_page} dari {pagination.last_page}
                    </span>
                    <div className="hpp-pagination-buttons">
                      <button
                        disabled={pagination.current_page === 1}
                        onClick={() => fetchHistory(pagination.current_page - 1)}
                        className="hpp-pagination-btn"
                      >
                        <FaChevronLeft /> Sebelumnya
                      </button>
                      <button
                        disabled={pagination.current_page === pagination.last_page}
                        onClick={() => fetchHistory(pagination.current_page + 1)}
                        className="hpp-pagination-btn"
                      >
                        Selanjutnya <FaChevronRight />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </main>
        </section>
      </div>

      {showDetailModal && selectedHistory && (
        <div className="hpp-modal" onClick={closeDetailModal}>
          <div className="hpp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hpp-modal-header">
              <div>
                <h2>Detail Pendapatan</h2>
                <p>{selectedHistory.nama_pabrik || "-"}</p>
              </div>
              <button onClick={closeDetailModal} className="hpp-modal-close" aria-label="Tutup">
                <FaTimes />
              </button>
            </div>

            <div className="hpp-modal-body">
              <div className="hpp-info-grid">
                <div className="hpp-info-item">
                  <span>ID Pendapatan</span>
                  <strong>#{selectedHistory.id}</strong>
                </div>
                <div className="hpp-info-item">
                  <span>Nama Pabrik</span>
                  <strong>{selectedHistory.nama_pabrik || "-"}</strong>
                </div>
                <div className="hpp-info-item">
                  <span>Tanggal Bayar</span>
                  <strong>{formatDate(selectedHistory.tanggal_bayar)}</strong>
                </div>
                <div className="hpp-info-item">
                  <span>Tanggal Jatuh Tempo</span>
                  <strong>
                    {selectedHistory.tanggal_jatuh_tempo
                      ? formatDate(selectedHistory.tanggal_jatuh_tempo)
                      : "-"}
                  </strong>
                </div>
                <div className="hpp-info-item">
                  <span>Total Bayar</span>
                  <strong className="hpp-info-money">{formatRupiah(selectedHistory.total_bayar)}</strong>
                </div>
                <div className="hpp-info-item">
                  <span>Jumlah Pembelian</span>
                  <strong>{selectedHistory.jumlah_pembelian || 0} item</strong>
                </div>
                {selectedHistory.keterangan && (
                  <div className="hpp-info-item hpp-info-item-full">
                    <span>Keterangan</span>
                    <strong>{selectedHistory.keterangan}</strong>
                  </div>
                )}
              </div>

              <h3 className="hpp-detail-title">Detail Pembelian</h3>

              {selectedHistory.detail && selectedHistory.detail.length > 0 ? (
                <div className="hpp-detail-table-wrap">
                  <table className="hpp-detail-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>SPK Bahan ID</th>
                        <th>Bahan</th>
                        <th>Tanggal Kirim</th>
                        <th>Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedHistory.detail.map((detail, index) => (
                        <tr key={detail.id}>
                          <td>{index + 1}</td>
                          <td>{detail.spk_bahan_id ? `#${detail.spk_bahan_id}` : "-"}</td>
                          <td>{detail.bahan || "-"}</td>
                          <td>{formatDate(detail.tanggal_kirim)}</td>
                          <td className="hpp-detail-money">{formatRupiah(detail.nominal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="hpp-empty-detail">Tidak ada detail pembelian.</p>
              )}
            </div>

            <div className="hpp-modal-footer">
              <button className="hpp-secondary-btn" onClick={closeDetailModal}>
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


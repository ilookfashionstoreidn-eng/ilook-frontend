import React, { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiBell,
  FiBox,
  FiChevronRight,
  FiClock,
  FiSearch,
  FiX,
} from "react-icons/fi";
import API from "../../../api";
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
    <div className="history-cutting-erp-container">
      <header className="history-cutting-erp-header">
        <div className="history-cutting-erp-header-top">
          <div className="history-cutting-title-group">
            <div className="history-cutting-brand-icon">
              <FiClock />
            </div>
            <div className="history-cutting-title-wrap">
              <div className="history-cutting-module-pill">Cutting Module</div>
              <h1>History Hasil Cutting</h1>
              <p>Riwayat hasil cutting per produk dan detail perbandingan berat</p>
            </div>
          </div>

          <div className="history-cutting-header-actions">
            <div className="history-cutting-search-wrap">
              <FiSearch className="history-cutting-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama produk atau ID produk..."
                className="history-cutting-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="history-cutting-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Hapus pencarian"
                >
                  <FiX />
                </button>
              )}
            </div>

            <button type="button" className="history-cutting-icon-btn" aria-label="Notifikasi">
              <FiBell />
              <span className="history-cutting-dot" />
            </button>

            <div className="history-cutting-avatar" title="Cutting Team">
              CT
            </div>
          </div>
        </div>
      </header>

      <main className="history-cutting-main">
        <section className="history-cutting-stats">
          <article className="history-cutting-stat-item">
            <p className="history-cutting-stat-label">Total Produk</p>
            <p className="history-cutting-stat-value">{formatNumber(historyData.length)}</p>
          </article>

          <article className="history-cutting-stat-item">
            <p className="history-cutting-stat-label">Total Riwayat</p>
            <p className="history-cutting-stat-value history-cutting-stat-value-info">
              {formatNumber(totalHistoryCount)} kali
            </p>
          </article>

          <article className="history-cutting-stat-item">
            <p className="history-cutting-stat-label">Detail Item</p>
            <p className="history-cutting-stat-value history-cutting-stat-value-success">
              {formatNumber(totalDetailCount)} baris
            </p>
          </article>

          <article className="history-cutting-stat-item">
            <p className="history-cutting-stat-label">Hasil Pencarian</p>
            <p className="history-cutting-stat-value history-cutting-stat-value-muted">
              {formatNumber(filteredHistoryData.length)} produk
            </p>
          </article>
        </section>

        <section className="history-cutting-table-wrapper">
          <div className="history-cutting-table-header">
            <div>
              <h3>Data History Per Produk</h3>
              <p>
                Menampilkan {filteredHistoryData.length} dari {historyData.length} produk
              </p>
            </div>
          </div>

          {loading ? (
            <div className="history-cutting-loading">
              <div className="history-cutting-spinner" />
              <p>Memuat data history...</p>
            </div>
          ) : error ? (
            <div className="history-cutting-empty-state">
              <FiAlertCircle className="history-cutting-empty-icon" />
              <p className="history-cutting-empty-title error">{error}</p>
            </div>
          ) : filteredHistoryData.length > 0 ? (
            <div className="history-cutting-table-scroll">
              <table className="history-cutting-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Produk</th>
                    <th>Total History</th>
                    <th>Update Terakhir</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistoryData.map((produk, index) => {
                    const hasImage =
                      produk.gambar_produk && !failedImageIds[produk.produk_id];
                    return (
                      <tr key={produk.produk_id || index}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="history-cutting-product-cell">
                            {hasImage ? (
                              <img
                                src={produk.gambar_produk}
                                alt={`Produk ${produk.nama_produk || produk.produk_id}`}
                                className="history-cutting-product-image"
                                onError={() => onImageError(produk.produk_id)}
                              />
                            ) : (
                              <div className="history-cutting-product-fallback" aria-hidden="true">
                                <FiBox />
                              </div>
                            )}
                            <div className="history-cutting-product-info">
                              <p className="history-cutting-product-name">
                                {produk.nama_produk || `Produk ID ${produk.produk_id}`}
                              </p>
                              <span className="history-cutting-product-id">
                                ID: {produk.produk_id || "-"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="history-cutting-badge">
                            {formatNumber(produk.total_history)} kali
                          </span>
                        </td>
                        <td>{formatDate(getLastUpdate(produk.history || []))}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => openDetail(produk)}
                            className="history-cutting-action-btn"
                          >
                            Lihat History <FiChevronRight />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="history-cutting-empty-state">
              <FiBox className="history-cutting-empty-icon" />
              <p className="history-cutting-empty-title">Data history belum tersedia</p>
              <p className="history-cutting-empty-text">
                Tidak ada data yang cocok dengan pencarian saat ini.
              </p>
            </div>
          )}
        </section>
      </main>

      {showDetailModal && selectedProduk && (
        <div className="history-cutting-modal-overlay" onClick={closeDetail}>
          <div className="history-cutting-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="history-cutting-modal-header">
              <div>
                <h2>Detail History Produk</h2>
                <p>{selectedProduk.nama_produk || `Produk ID ${selectedProduk.produk_id}`}</p>
              </div>
              <button type="button" className="history-cutting-modal-close" onClick={closeDetail}>
                <FiX />
              </button>
            </div>

            <div className="history-cutting-modal-body">
              {selectedProduk.history && selectedProduk.history.length > 0 ? (
                <div className="history-cutting-history-list">
                  {selectedProduk.history.map((item, index) => (
                    <article key={item.id || index} className="history-cutting-history-card">
                      <header className="history-cutting-history-header">
                        <div className="history-cutting-history-index">History #{index + 1}</div>
                        <div className="history-cutting-history-meta">
                          <span>SPK: {item.id_spk_cutting || "-"}</span>
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </header>

                      {item.detail && item.detail.length > 0 ? (
                        <div className="history-cutting-detail-table-wrap">
                          <table className="history-cutting-detail-table">
                            <thead>
                              <tr>
                                <th>Bagian</th>
                                <th>Bahan</th>
                                <th>Warna</th>
                                <th>Berat</th>
                                <th>Qty</th>
                                <th>Lembar</th>
                                <th>Jml Produk</th>
                                <th>Total Produk</th>
                                <th>Berat/Produk</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.detail.map((detail, detailIndex) => (
                                <tr key={`${item.id || index}-${detailIndex}`}>
                                  <td>{detail.nama_bagian || "-"}</td>
                                  <td>{detail.nama_bahan || "-"}</td>
                                  <td>
                                    <span className="history-cutting-chip">{detail.warna || "-"}</span>
                                  </td>
                                  <td>{formatKg(detail.berat)}</td>
                                  <td>{formatNumber(detail.qty)}</td>
                                  <td>{formatNumber(detail.jumlah_lembar)}</td>
                                  <td>{formatNumber(detail.jumlah_produk)}</td>
                                  <td>
                                    <span className="history-cutting-badge">
                                      {formatNumber(detail.total_produk)}
                                    </span>
                                  </td>
                                  <td>{formatKg(detail.berat_per_produk)}</td>
                                  <td>
                                    {detail.status_perbandingan ? (
                                      <span className={`history-cutting-status ${statusClassMap(detail.status_perbandingan)}`}>
                                        {detail.status_perbandingan}
                                      </span>
                                    ) : (
                                      <span className="history-cutting-status history-cutting-status-neutral">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="history-cutting-empty-inline">
                          Tidak ada detail untuk history ini.
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="history-cutting-empty-state inline">
                  <FiAlertCircle className="history-cutting-empty-icon" />
                  <p className="history-cutting-empty-title">Produk ini belum memiliki history.</p>
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

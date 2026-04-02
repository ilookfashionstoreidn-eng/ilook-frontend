import React, { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiBell,
  FiCalendar,
  FiChevronRight,
  FiClock,
  FiEye,
  FiHash,
  FiSearch,
  FiX,
} from "react-icons/fi";
import API from "../../../api";
import "./SpkDistribusiHistory.css";

const defaultPagination = {
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 10,
};

const PAGE_SIZE = 10;

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumber = (value) =>
  new Intl.NumberFormat("id-ID").format(Number(value) || 0);

const typeClassMap = (type = "") => {
  const rawType = String(type).toLowerCase();
  if (rawType === "cutting") return "distribusi-erp-type-cutting";
  if (rawType === "jasa") return "distribusi-erp-type-jasa";
  if (rawType === "cmt") return "distribusi-erp-type-cmt";
  return "distribusi-erp-type-default";
};

const SpkDistribusiHistory = () => {
  const [distribusiList, setDistribusiList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(defaultPagination);

  const [selectedDistribusi, setSelectedDistribusi] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchHistory = async (page = 1, search = "") => {
    setLoading(true);
    setError(null);

    try {
      const response = await API.get("/spk-cutting-distribusi/history", {
        params: {
          page,
          per_page: PAGE_SIZE,
          q: search,
        },
      });

      if (response.data && response.data.data) {
        const sortedData = [...(response.data.data || [])].sort(
          (a, b) => {
            const timeA = a?.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b?.created_at ? new Date(b.created_at).getTime() : 0;

            if (timeA !== timeB) return timeB - timeA;
            return Number(b?.distribusi_id || 0) - Number(a?.distribusi_id || 0);
          }
        );
        setDistribusiList(sortedData);

        if (response.data.meta) {
          setPagination({
            ...defaultPagination,
            ...response.data.meta,
            per_page: Number(response.data.meta.per_page) || PAGE_SIZE,
          });
        } else {
          setPagination({
            current_page: 1,
            last_page: 1,
            total: sortedData.length,
            per_page: PAGE_SIZE,
          });
        }
      } else {
        setDistribusiList([]);
        setPagination(defaultPagination);
      }
    } catch (fetchError) {
      console.error("Gagal mengambil history distribusi SPK:", fetchError);
      setError("Gagal mengambil data history distribusi SPK Cutting.");
      setDistribusiList([]);
      setPagination(defaultPagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchHistory(1, searchQuery);
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      fetchHistory(newPage, searchQuery);
    }
  };

  const openTimeline = async (distribusiId) => {
    setDetailLoading(true);
    setDetailError(null);
    setShowDetailModal(true);
    setSelectedDistribusi(null);

    try {
      const response = await API.get(`/spk-cutting-distribusi/${distribusiId}/history`);
      if (response.data) {
        setSelectedDistribusi(response.data);
      } else {
        setDetailError("Data detail timeline tidak ditemukan.");
      }
    } catch (fetchError) {
      console.error("Gagal mengambil detail history:", fetchError);
      setDetailError("Gagal mengambil detail timeline distribusi.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeTimeline = () => {
    setShowDetailModal(false);
    setSelectedDistribusi(null);
    setDetailError(null);
  };

  const totalHistoryEvents = useMemo(
    () => distribusiList.reduce((sum, item) => sum + ((item.history || []).length || 0), 0),
    [distribusiList]
  );

  const totalProduk = useMemo(
    () => distribusiList.reduce((sum, item) => sum + (Number(item.jumlah_produk) || 0), 0),
    [distribusiList]
  );

  const timelineItems = selectedDistribusi?.history || [];

  return (
    <div className="distribusi-erp-container">
      <header className="distribusi-erp-header">
        <div className="distribusi-erp-header-top">
          <div className="distribusi-erp-title-group">
            <div className="distribusi-erp-brand-icon">
              <FiClock />
            </div>
            <div className="distribusi-erp-title-wrap">
              <div className="distribusi-erp-module-pill">Cutting Module</div>
              <h1>History Distribusi SPK Cutting</h1>
              <p>Riwayat distribusi, timeline status, dan progres SPK Cutting</p>
            </div>
          </div>

          <div className="distribusi-erp-actions">
            <div className="distribusi-erp-search-wrap">
              <FiSearch className="distribusi-erp-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode seri atau SPK Cutting ID..."
                className="distribusi-erp-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="distribusi-erp-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Hapus pencarian"
                >
                  <FiX />
                </button>
              )}
            </div>

            <button type="button" className="distribusi-erp-icon-btn" aria-label="Notifikasi">
              <FiBell />
              <span className="distribusi-erp-dot" />
            </button>

            <div className="distribusi-erp-avatar" title="Distribusi Team">
              DS
            </div>
          </div>
        </div>
      </header>

      <main className="distribusi-erp-main">
        <section className="distribusi-erp-stats">
          <article className="distribusi-erp-stat-item">
            <p className="distribusi-erp-stat-label">Total Data (Halaman)</p>
            <p className="distribusi-erp-stat-value">{formatNumber(distribusiList.length)}</p>
          </article>

          <article className="distribusi-erp-stat-item">
            <p className="distribusi-erp-stat-label">Total Produk (Halaman)</p>
            <p className="distribusi-erp-stat-value distribusi-erp-stat-value-success">
              {formatNumber(totalProduk)}
            </p>
          </article>

          <article className="distribusi-erp-stat-item">
            <p className="distribusi-erp-stat-label">Total Event (Halaman)</p>
            <p className="distribusi-erp-stat-value distribusi-erp-stat-value-info">
              {formatNumber(totalHistoryEvents)}
            </p>
          </article>

          <article className="distribusi-erp-stat-item">
            <p className="distribusi-erp-stat-label">Total Keseluruhan</p>
            <p className="distribusi-erp-stat-value distribusi-erp-stat-value-muted">
              {formatNumber(pagination.total)}
            </p>
          </article>
        </section>

        <section className="distribusi-erp-table-wrapper">
          <div className="distribusi-erp-table-header">
            <div>
              <h3>Data Distribusi SPK</h3>
              <p>
                Halaman {pagination.current_page} dari {pagination.last_page} | Menampilkan {distribusiList.length} data
              </p>
            </div>
          </div>

          {loading ? (
            <div className="distribusi-erp-loading">
              <div className="distribusi-erp-spinner" />
              <p>Memuat data history distribusi...</p>
            </div>
          ) : error ? (
            <div className="distribusi-erp-empty-state">
              <FiAlertCircle className="distribusi-erp-empty-icon" />
              <p className="distribusi-erp-empty-title error">{error}</p>
            </div>
          ) : distribusiList.length > 0 ? (
            <>
              <div className="distribusi-erp-table-scroll">
                <table className="distribusi-erp-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Kode Seri</th>
                      <th>SPK Cutting ID</th>
                      <th>Jumlah Produk</th>
                      <th>Total History</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distribusiList.map((distribusi, index) => (
                      <tr key={distribusi.distribusi_id || index}>
                        <td>
                          {((pagination.current_page || 1) - 1) * (pagination.per_page || 10) + index + 1}
                        </td>
                        <td>
                          <div className="distribusi-erp-kode-cell">
                            <FiHash />
                            <span>{distribusi.kode_seri || "-"}</span>
                          </div>
                        </td>
                        <td>
                          <span className="distribusi-erp-badge distribusi-erp-badge-info">
                            {distribusi.spk_cutting_id || "-"}
                          </span>
                        </td>
                        <td>
                          <span className="distribusi-erp-badge distribusi-erp-badge-success">
                            {formatNumber(distribusi.jumlah_produk)} produk
                          </span>
                        </td>
                        <td>
                          <span className="distribusi-erp-badge distribusi-erp-badge-primary">
                            {(distribusi.history || []).length} event
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => openTimeline(distribusi.distribusi_id)}
                            className="distribusi-erp-action-btn"
                          >
                            <FiEye /> Lihat Timeline <FiChevronRight />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="distribusi-erp-pagination">
                <button
                  type="button"
                  className="distribusi-erp-pagination-btn"
                  disabled={pagination.current_page === 1}
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                >
                  Previous
                </button>
                <span className="distribusi-erp-pagination-info">
                  Page {pagination.current_page} of {pagination.last_page}
                </span>
                <button
                  type="button"
                  className="distribusi-erp-pagination-btn"
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="distribusi-erp-empty-state">
              <FiClock className="distribusi-erp-empty-icon" />
              <p className="distribusi-erp-empty-title">Belum ada data history distribusi</p>
              <p className="distribusi-erp-empty-text">Coba ubah kata kunci pencarian atau cek data distribusi terlebih dahulu.</p>
            </div>
          )}
        </section>
      </main>

      {showDetailModal && (
        <div className="distribusi-erp-modal-overlay" onClick={closeTimeline}>
          <div className="distribusi-erp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="distribusi-erp-modal-header">
              <div>
                <h2>Timeline History Distribusi</h2>
                <p>{selectedDistribusi?.kode_seri || "-"}</p>
              </div>
              <button type="button" className="distribusi-erp-modal-close" onClick={closeTimeline}>
                <FiX />
              </button>
            </div>

            <div className="distribusi-erp-modal-body">
              {detailLoading ? (
                <div className="distribusi-erp-loading">
                  <div className="distribusi-erp-spinner" />
                  <p>Memuat timeline distribusi...</p>
                </div>
              ) : detailError ? (
                <div className="distribusi-erp-empty-state inline">
                  <FiAlertCircle className="distribusi-erp-empty-icon" />
                  <p className="distribusi-erp-empty-title error">{detailError}</p>
                </div>
              ) : selectedDistribusi ? (
                <>
                  <div className="distribusi-erp-info-card">
                    <div className="distribusi-erp-info-grid">
                      <div className="distribusi-erp-info-item">
                        <div className="distribusi-erp-info-label">Kode Seri</div>
                        <div className="distribusi-erp-info-value">{selectedDistribusi.kode_seri || "-"}</div>
                      </div>
                      <div className="distribusi-erp-info-item">
                        <div className="distribusi-erp-info-label">Tukang Cutting</div>
                        <div className="distribusi-erp-info-value">{selectedDistribusi.nama_tukang_cutting || "-"}</div>
                      </div>
                      <div className="distribusi-erp-info-item">
                        <div className="distribusi-erp-info-label">Tukang Jasa</div>
                        <div className="distribusi-erp-info-value">{selectedDistribusi.nama_tukang_jasa || "-"}</div>
                      </div>
                      <div className="distribusi-erp-info-item">
                        <div className="distribusi-erp-info-label">CMT</div>
                        <div className="distribusi-erp-info-value">{selectedDistribusi.nama_cmt || "-"}</div>
                      </div>
                    </div>
                  </div>

                  <h3 className="distribusi-erp-timeline-title">Timeline Events</h3>
                  <div className="distribusi-erp-timeline">
                    {timelineItems.length > 0 ? (
                      timelineItems.map((item, idx) => (
                        <div key={`${item.tipe}-${item.waktu}-${idx}`} className="distribusi-erp-timeline-item">
                          <div className="distribusi-erp-timeline-marker">
                            <div className={`distribusi-erp-timeline-icon ${typeClassMap(item.tipe)}`}></div>
                            {idx !== timelineItems.length - 1 && <div className="distribusi-erp-timeline-line"></div>}
                          </div>

                          <div className="distribusi-erp-timeline-content">
                            <div className="distribusi-erp-timeline-header">
                              <span className={`distribusi-erp-type-badge ${typeClassMap(item.tipe)}`}>
                                {String(item.tipe || "-").toUpperCase()}
                              </span>
                              <span className="distribusi-erp-timeline-time">
                                <FiCalendar /> {formatDate(item.waktu)}
                              </span>
                            </div>
                            <div className="distribusi-erp-timeline-status">
                              <strong>{item.status || "-"}</strong>
                            </div>
                            {item.keterangan && (
                              <div className="distribusi-erp-timeline-note">"{item.keterangan}"</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="distribusi-erp-empty-note">Tidak ada event history.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="distribusi-erp-empty-state inline">
                  <FiAlertCircle className="distribusi-erp-empty-icon" />
                  <p className="distribusi-erp-empty-title error">Gagal memuat data detail timeline.</p>
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

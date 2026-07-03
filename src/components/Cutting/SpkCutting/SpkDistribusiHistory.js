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
import "../../Jahit/KodeSeriBelumDikerjakanOptimized.css";

const defaultPagination = {
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 50,
};

const PAGE_SIZE = 50;

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
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>History Distribusi SPK Cutting</h1>
          <span className="ks-header-sub">Riwayat distribusi, timeline status, dan progres SPK Cutting</span>
        </div>

        <div className="ks-header-actions">
          <div className="ks-search">
            <FiSearch className="ks-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode seri atau SPK Cutting ID..."
              className="ks-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="ks-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Hapus pencarian"
              >
                <FiX />
              </button>
            )}
          </div>
          <button className="ks-icon-btn">
            <FiBell />
            <span className="ks-icon-badge" />
          </button>
          <div className="ks-avatar">DS</div>
        </div>
      </header>

      <div style={{ padding: "32px" }}>
        <section className="ks-statrail" style={{ marginBottom: "32px" }}>
          <div className="ks-stat">
            <span className="ks-stat-label">Total Data (Halaman)</span>
            <span className="ks-stat-value">{formatNumber(distribusiList.length)}</span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">Total Produk (Halaman)</span>
            <span className="ks-stat-value" style={{ color: "var(--ks-success)" }}>
              {formatNumber(totalProduk)}
            </span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">Total Event (Halaman)</span>
            <span className="ks-stat-value" style={{ color: "var(--brand-600)" }}>
              {formatNumber(totalHistoryEvents)}
            </span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">Total Keseluruhan</span>
            <span className="ks-stat-value" style={{ color: "var(--ks-text-soft)" }}>
              {formatNumber(pagination.total)}
            </span>
          </div>
        </section>

        <section>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--brand-600)" }}>
              <div className="ks-spinner" style={{ margin: "0 auto 16px auto", width: "32px", height: "32px", border: "3px solid rgba(14, 165, 233, 0.2)", borderTopColor: "var(--brand-600)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <p style={{ fontWeight: 500, margin: 0 }}>Memuat data history distribusi...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ks-error)" }}>
              <FiAlertCircle size={48} style={{ opacity: 0.5, marginBottom: "16px" }} />
              <p style={{ fontWeight: 500, margin: 0 }}>{error}</p>
            </div>
          ) : distribusiList.length > 0 ? (
            <>
              <div style={{ overflowX: "auto" }}>
                <table className="ks-grid">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Kode Seri</th>
                      <th>SPK Cutting ID</th>
                      <th>Jumlah Produk</th>
                      <th>Total History</th>
                      <th style={{ textAlign: "right" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distribusiList.map((distribusi, index) => (
                      <tr key={distribusi.distribusi_id || index}>
                        <td>
                          {((pagination.current_page || 1) - 1) * (pagination.per_page || 10) + index + 1}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "var(--ks-text)" }}>
                            <div style={{ background: "#f1f5f9", padding: "6px", borderRadius: "6px", color: "var(--brand-600)" }}><FiHash size={16} /></div>
                            {distribusi.kode_seri || "-"}
                          </div>
                        </td>
                        <td>
                          <span className="ks-badge" style={{ background: "var(--brand-100)", color: "var(--brand-700)" }}>
                            {distribusi.spk_cutting_id || "-"}
                          </span>
                        </td>
                        <td>
                          <span className="ks-badge" style={{ background: "rgba(34, 197, 94, 0.1)", color: "var(--ks-success)" }}>
                            {formatNumber(distribusi.jumlah_produk)} produk
                          </span>
                        </td>
                        <td>
                          <span className="ks-badge" style={{ background: "var(--brand-100)", color: "var(--brand-700)" }}>
                            {(distribusi.history || []).length} event
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => openTimeline(distribusi.distribusi_id)}
                            className="ks-btn"
                          >
                            <FiEye /> Lihat Timeline
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
                <span style={{ fontSize: "14px", color: "var(--ks-text-soft)" }}>
                  Halaman {pagination.current_page} dari {pagination.last_page}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="ks-btn"
                    style={{ background: "#fff", border: "1px solid var(--ks-line)", color: "var(--ks-text)" }}
                    disabled={pagination.current_page === 1}
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="ks-btn"
                    style={{ background: "#fff", border: "1px solid var(--ks-line)", color: "var(--ks-text)" }}
                    disabled={pagination.current_page === pagination.last_page}
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ks-text-soft)" }}>
              <FiClock size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
              <p style={{ margin: 0, fontWeight: 500, color: "var(--ks-text)", fontSize: "16px" }}>Belum ada data history distribusi</p>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px" }}>Coba ubah kata kunci pencarian atau cek data distribusi terlebih dahulu.</p>
            </div>
          )}
        </section>
      </div>

      {showDetailModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={closeTimeline}>
          <div style={{ background: "var(--ks-surface)", width: "100%", maxWidth: "800px", maxHeight: "90vh", borderRadius: "16px", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--ks-line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--ks-bg)" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--ks-text)" }}>Timeline History Distribusi</h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--ks-text-soft)" }}>{selectedDistribusi?.kode_seri || "-"}</p>
              </div>
              <button onClick={closeTimeline} style={{ background: "none", border: "none", color: "var(--ks-text-soft)", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", transition: "all 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.background = "var(--ks-hover)"; e.currentTarget.style.color = "var(--ks-overdue)"; }} onMouseOut={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--ks-text-soft)"; }}>
                <FiX size={20} />
              </button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {detailLoading ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ks-accent)" }}>
                  <div className="ks-spinner" style={{ margin: "0 auto 16px auto", width: "32px", height: "32px", border: "3px solid rgba(36, 88, 206, 0.2)", borderTopColor: "var(--ks-accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <p style={{ fontWeight: 500, margin: 0 }}>Memuat timeline distribusi...</p>
                </div>
              ) : detailError ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ks-overdue)" }}>
                  <FiAlertCircle size={48} style={{ opacity: 0.5, marginBottom: "16px" }} />
                  <p style={{ fontWeight: 500, margin: 0 }}>{detailError}</p>
                </div>
              ) : selectedDistribusi ? (
                <>
                  <div style={{ background: "var(--ks-bg)", border: "1px solid var(--ks-line)", borderRadius: "12px", padding: "20px", marginBottom: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "20px" }}>
                    <div>
                      <div style={{ fontSize: "13px", color: "var(--ks-text-soft)", marginBottom: "4px" }}>Kode Seri</div>
                      <div style={{ fontWeight: 600, color: "var(--ks-text)" }}>{selectedDistribusi.kode_seri || "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", color: "var(--ks-text-soft)", marginBottom: "4px" }}>Tukang Cutting</div>
                      <div style={{ fontWeight: 600, color: "var(--ks-text)" }}>{selectedDistribusi.nama_tukang_cutting || "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", color: "var(--ks-text-soft)", marginBottom: "4px" }}>Tukang Jasa</div>
                      <div style={{ fontWeight: 600, color: "var(--ks-text)" }}>{selectedDistribusi.nama_tukang_jasa || "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", color: "var(--ks-text-soft)", marginBottom: "4px" }}>CMT</div>
                      <div style={{ fontWeight: 600, color: "var(--ks-text)" }}>{selectedDistribusi.nama_cmt || "-"}</div>
                    </div>
                  </div>

                  <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: 700, color: "var(--ks-text)" }}>Timeline Events</h3>
                  <div>
                    {timelineItems.length > 0 ? (
                      timelineItems.map((item, idx) => (
                        <div key={`${item.tipe}-${item.waktu}-${idx}`} style={{ display: "flex", gap: "20px", marginBottom: idx === timelineItems.length - 1 ? 0 : "24px" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: typeClassMap(item.tipe) === "distribusi-erp-type-cutting" ? "var(--ks-accent)" : typeClassMap(item.tipe) === "distribusi-erp-type-jasa" ? "#8b5cf6" : typeClassMap(item.tipe) === "distribusi-erp-type-cmt" ? "var(--ks-safe)" : "var(--ks-text-soft)", zIndex: 1, border: "3px solid var(--ks-surface)", boxShadow: "0 0 0 1px var(--ks-line)" }}></div>
                            {idx !== timelineItems.length - 1 && <div style={{ width: "2px", flexGrow: 1, background: "var(--ks-line)", margin: "4px 0" }}></div>}
                          </div>

                          <div style={{ flex: 1, background: "var(--ks-surface)", border: "1px solid var(--ks-line)", borderRadius: "12px", padding: "16px", marginTop: "-6px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "100px", background: typeClassMap(item.tipe) === "distribusi-erp-type-cutting" ? "var(--brand-50)" : typeClassMap(item.tipe) === "distribusi-erp-type-jasa" ? "#f5f3ff" : typeClassMap(item.tipe) === "distribusi-erp-type-cmt" ? "#f0fdf4" : "#f1f5f9", color: typeClassMap(item.tipe) === "distribusi-erp-type-cutting" ? "var(--brand-700)" : typeClassMap(item.tipe) === "distribusi-erp-type-jasa" ? "#6d28d9" : typeClassMap(item.tipe) === "distribusi-erp-type-cmt" ? "var(--ks-success)" : "var(--ks-text-soft)" }}>
                                {String(item.tipe || "-").toUpperCase()}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--ks-text-soft)" }}>
                                <FiCalendar /> {formatDate(item.waktu)}
                              </span>
                            </div>
                            <div style={{ fontWeight: 600, color: "var(--ks-text)", fontSize: "15px", marginBottom: item.keterangan ? "8px" : "0" }}>
                              {item.status || "-"}
                            </div>
                            {item.keterangan && (
                              <div style={{ fontSize: "14px", color: "var(--ks-text-soft)", fontStyle: "italic", background: "#f8fafc", padding: "12px", borderRadius: "8px", borderLeft: "3px solid var(--brand-300)" }}>"{item.keterangan}"</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "var(--ks-text-soft)", fontStyle: "italic", textAlign: "center", padding: "24px 0" }}>Tidak ada event history.</p>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ks-error)" }}>
                  <FiAlertCircle size={48} style={{ opacity: 0.5, marginBottom: "16px" }} />
                  <p style={{ fontWeight: 500, margin: 0 }}>Gagal memuat data detail timeline.</p>
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

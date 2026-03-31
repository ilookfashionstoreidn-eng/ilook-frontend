import React, { useEffect, useState, useCallback } from "react";
import "./StokPerBahan.css";
import API from "../../api";
import {
  FaChevronDown,
  FaChevronUp,
  FaBoxes,
  FaWarehouse,
  FaRuler,
  FaDollarSign,
  FaSearch,
} from "react-icons/fa";

const formatNumber = (value, options = {}) =>
  (Number(value) || 0).toLocaleString("id-ID", options);

const formatCurrency = (value) =>
  `Rp ${formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatWeight = (value) =>
  formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const WARNA_PALETTE = {
  hitam: "#111827",
  putih: "#f8fafc",
  merah: "#dc2626",
  marun: "#7f1d1d",
  biru: "#2563eb",
  "biru tua": "#1e3a8a",
  navy: "#1e3a8a",
  "biru dongker": "#1e3a8a",
  "biru muda": "#60a5fa",
  "biru langit": "#38bdf8",
  hijau: "#16a34a",
  "hijau tua": "#166534",
  "hijau muda": "#86efac",
  "hijau army": "#4b5320",
  olive: "#4b5320",
  kuning: "#facc15",
  mustard: "#ca8a04",
  orange: "#f97316",
  oranye: "#f97316",
  coklat: "#8b5a2b",
  "coklat tua": "#6b4423",
  "coklat muda": "#b08968",
  cream: "#fef3c7",
  krem: "#fef3c7",
  beige: "#f5f5dc",
  abu: "#9ca3af",
  "abu abu": "#9ca3af",
  "abu-abu": "#9ca3af",
  abuabu: "#9ca3af",
  silver: "#cbd5e1",
  ungu: "#7c3aed",
  violet: "#7c3aed",
  pink: "#ec4899",
  magenta: "#db2777",
  peach: "#fdba74",
  turkis: "#14b8a6",
  tosca: "#14b8a6",
};

const normalizeHex = (value) => {
  const hex = String(value || "").trim();
  if (!/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.test(hex)) {
    return null;
  }
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }
  return hex.toLowerCase();
};

const hexToRgb = (hex) => {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return null;
  }
  const num = parseInt(normalized.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const getReadableTextColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return "#0f172a";
  }
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 160 ? "#0f172a" : "#ffffff";
};

const toRgba = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return `rgba(148, 163, 184, ${alpha})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const resolveWarnaColor = (warnaValue) => {
  const fallback = {
    backgroundColor: "#edf4ff",
    color: "#1e40af",
    borderColor: "#dbe6ff",
  };

  const raw = String(warnaValue || "").trim();
  if (!raw) {
    return fallback;
  }

  const directHex = normalizeHex(raw);
  let baseColor = directHex;

  if (!baseColor) {
    const key = raw.toLowerCase().replace(/\s+/g, " ").trim();
    baseColor = WARNA_PALETTE[key] || null;

    if (!baseColor) {
      const matchedKey = Object.keys(WARNA_PALETTE)
        .sort((a, b) => b.length - a.length)
        .find((name) => key.includes(name));

      if (matchedKey) {
        baseColor = WARNA_PALETTE[matchedKey];
      }
    }
  }

  if (!baseColor) {
    return fallback;
  }

  return {
    backgroundColor: toRgba(baseColor, 0.2),
    color: getReadableTextColor(baseColor),
    borderColor: toRgba(baseColor, 0.45),
  };
};

const toTitleStatus = (value) => {
  if (!value || value === "-") {
    return "-";
  }
  const lower = String(value).toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const statusClassName = (status) => {
  const key = String(status || "").toLowerCase();
  if (key === "utuh") {
    return "is-utuh";
  }
  if (key === "sisa") {
    return "is-sisa";
  }
  return "is-neutral";
};

const StokPerBahan = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedBahan, setExpandedBahan] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [summaryRoll, setSummaryRoll] = useState({
    total_semua: 0,
    total_utuh: 0,
    total_sisa: 0,
  });
  const [dashboardStats, setDashboardStats] = useState({
    total_bahan: 0,
    total_roll: 0,
    total_berat_kg: 0,
    total_berat_yard: 0,
    total_harga: 0,
    total_roll_utuh: 0,
    total_roll_sisa: 0,
  });
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchStokPerBahan = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const res = await API.get("/stok-bahan/per-bahan", { params });
      const dataArray = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setData(dataArray);
      setLastSyncAt(new Date().toISOString());
    } catch (e) {
      const errorMessage =
        e.response?.data?.message || e.message || "Gagal memuat data stok per bahan.";
      setError(errorMessage);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchSummaryRoll = useCallback(async () => {
    try {
      const res = await API.get("/stok-bahan/summary-total-roll");
      if (res.data) {
        setSummaryRoll({
          total_semua: res.data.total_semua || 0,
          total_utuh: res.data.total_utuh || 0,
          total_sisa: res.data.total_sisa || 0,
        });
      }
    } catch (e) {
      setSummaryRoll({
        total_semua: 0,
        total_utuh: 0,
        total_sisa: 0,
      });
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const res = await API.get("/stok-bahan/dashboard-stats", { params });
      if (res.data) {
        setDashboardStats({
          total_bahan: res.data.total_bahan || 0,
          total_roll: res.data.total_roll || 0,
          total_berat_kg: res.data.total_berat_kg || 0,
          total_berat_yard: res.data.total_berat_yard || 0,
          total_harga: res.data.total_harga || 0,
          total_roll_utuh: res.data.total_roll_utuh || 0,
          total_roll_sisa: res.data.total_roll_sisa || 0,
        });
      }
    } catch (e) {
      setDashboardStats({
        total_bahan: 0,
        total_roll: 0,
        total_berat_kg: 0,
        total_berat_yard: 0,
        total_harga: 0,
        total_roll_utuh: 0,
        total_roll_sisa: 0,
      });
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchStokPerBahan();
    fetchSummaryRoll();
    fetchDashboardStats();
  }, [fetchStokPerBahan, fetchSummaryRoll, fetchDashboardStats]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const toggleExpand = (namaBahan) => {
    setExpandedBahan((prev) => ({
      ...prev,
      [namaBahan]: !prev[namaBahan],
    }));
  };

  const calculateFilteredTotals = (item) => ({
    totalRol: item.total_rol || 0,
    totalBerat: item.total_berat || 0,
    filteredWarna: item.warna || [],
  });

  const filtered = data.filter((item) =>
    (item.nama_bahan || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="stok-bahan-page">
      <div className="stok-bahan-shell">
        <header className="stok-bahan-topbar">
          <div className="stok-bahan-topbar-left">
            <p className="stok-bahan-breadcrumb">Inventory / Bahan / Monitoring Stok</p>
            <div className="stok-bahan-title-group">
              <div className="stok-bahan-title-icon">
                <FaWarehouse />
              </div>
              <div>
                <h1>Kontrol Stok Bahan</h1>
                <p>Monitoring inventori bahan baku untuk operasional</p>
              </div>
            </div>
          </div>
          <div className="stok-bahan-topbar-right">
            <div className="stok-bahan-topbar-meta">
              <span>Data Tersaring</span>
              <span>Data Tersaring</span>
              <strong>{formatNumber(filtered.length)}</strong>
            </div>
            <div className="stok-bahan-sync-meta">
              <span>Terakhir Sinkron</span>
              <strong>{formatDateTime(lastSyncAt)}</strong>
            </div>
          </div>
        </header>

        <section className="stok-bahan-dashboard">
          <article className="stok-bahan-dashboard-card tone-primary">
            <div className="stok-bahan-dashboard-icon">
              <FaWarehouse />
            </div>
            <div className="stok-bahan-dashboard-content">
              <p>Total Bahan</p>
              <h3>{formatNumber(dashboardStats.total_bahan)}</h3>
              <small>Jenis bahan aktif</small>
            </div>
          </article>

          <article className="stok-bahan-dashboard-card tone-indigo">
            <div className="stok-bahan-dashboard-icon">
              <FaBoxes />
            </div>
            <div className="stok-bahan-dashboard-content">
              <p>Total Roll</p>
              <h3>{formatNumber(dashboardStats.total_roll)}</h3>
              <small>
                Utuh {formatNumber(dashboardStats.total_roll_utuh)} | Sisa{" "}
                {formatNumber(dashboardStats.total_roll_sisa)}
              </small>
            </div>
          </article>

          <article className="stok-bahan-dashboard-card tone-cyan">
            <div className="stok-bahan-dashboard-icon">
              <FaRuler />
            </div>
            <div className="stok-bahan-dashboard-content">
              <p>Total Berat (KG)</p>
              <h3>{formatWeight(dashboardStats.total_berat_kg)}</h3>
              <small>Akumulasi berat material</small>
            </div>
          </article>

          <article className="stok-bahan-dashboard-card tone-amber">
            <div className="stok-bahan-dashboard-icon">
              <FaRuler />
            </div>
            <div className="stok-bahan-dashboard-content">
              <p>Total Yard</p>
              <h3>{formatWeight(dashboardStats.total_berat_yard)}</h3>
              <small>Akumulasi panjang material</small>
            </div>
          </article>

          <article className="stok-bahan-dashboard-card tone-emerald">
            <div className="stok-bahan-dashboard-icon">
              <FaDollarSign />
            </div>
            <div className="stok-bahan-dashboard-content">
              <p>Total Nilai Stok</p>
              <h3>{formatCurrency(dashboardStats.total_harga)}</h3>
              <small>Estimasi nilai persediaan saat ini</small>
            </div>
          </article>
        </section>

        <section className="stok-bahan-table-card">
          <div className="stok-bahan-table-head">
            <div>
              <h2>Daftar Stok per Bahan</h2>
              <p>Ringkasan stok berdasarkan bahan, warna, status roll, dan nilai persediaan.</p>
            </div>
            <div className="stok-bahan-summary-inline">
              <span className="summary-chip">Semua: {formatNumber(summaryRoll.total_semua)}</span>
              <span className="summary-chip">Utuh: {formatNumber(summaryRoll.total_utuh)}</span>
              <span className="summary-chip">Sisa: {formatNumber(summaryRoll.total_sisa)}</span>
            </div>
          </div>

          <div className="stok-bahan-controls">
            <div className="stok-bahan-filter-buttons">
              <button
                className={`stok-bahan-btn-filter tone-all ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
                type="button"
              >
                Semua
                <span>{formatNumber(summaryRoll.total_semua)}</span>
              </button>
              <button
                className={`stok-bahan-btn-filter tone-utuh ${statusFilter === "utuh" ? "active" : ""}`}
                onClick={() => setStatusFilter("utuh")}
                type="button"
              >
                Utuh
                <span>{formatNumber(summaryRoll.total_utuh)}</span>
              </button>
              <button
                className={`stok-bahan-btn-filter tone-sisa ${statusFilter === "sisa" ? "active" : ""}`}
                onClick={() => setStatusFilter("sisa")}
                type="button"
              >
                Sisa
                <span>{formatNumber(summaryRoll.total_sisa)}</span>
              </button>
            </div>

            <label className="stok-bahan-search-bar">
              <FaSearch className="stok-bahan-search-icon" />
              <input
                type="text"
                placeholder="Cari nama bahan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
            <div className="stok-bahan-status-legend">
              <span className="legend-item legend-utuh">Utuh</span>
              <span className="legend-item legend-sisa">Sisa</span>
            </div>
          </div>

          {loading ? (
            <p className="stok-bahan-loading">Memuat data stok...</p>
          ) : error ? (
            <p className="stok-bahan-error">{error}</p>
          ) : (
            <>
              <div className="stok-bahan-table-wrapper">
                <table className="stok-bahan-table">
                  <thead>
                    <tr>
                      <th className="cell-no">No</th>
                      <th>Pabrik</th>
                      <th>Nama Bahan</th>
                      <th>Warna</th>
                      <th className="cell-right">Total Roll</th>
                      <th className="cell-right">Total Berat (kg)</th>
                      <th className="cell-right">Total Harga</th>
                      <th>Status</th>
                      <th>SKU</th>
                      <th className="cell-action">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="stok-bahan-empty-cell">
                          {statusFilter !== "all"
                            ? `Tidak ada data stok dengan status ${toTitleStatus(statusFilter)}`
                            : "Tidak ada data stok"}
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((item, index) => {
                        const keyBase = `${item.nama_bahan || "bahan"}-${indexOfFirstItem + index}`;
                        const isExpanded = !!expandedBahan[item.nama_bahan];
                        const { totalRol, totalBerat, filteredWarna } = calculateFilteredTotals(item);

                        const rawStatus =
                          statusFilter === "utuh"
                            ? "utuh"
                            : statusFilter === "sisa"
                              ? "sisa"
                              : item.status || "-";
                        const displayStatus = toTitleStatus(rawStatus);

                        return (
                          <React.Fragment key={keyBase}>
                            <tr>
                              <td>{indexOfFirstItem + index + 1}</td>
                              <td>
                                {item.pabrik && item.pabrik.length > 0
                                  ? item.pabrik.join(", ")
                                  : "-"}
                              </td>
                              <td className="cell-name">{item.nama_bahan || "-"}</td>
                              <td>
                                <div className="stok-bahan-chip-wrap">
                                  {filteredWarna && filteredWarna.length > 0 ? (
                                    filteredWarna.map((warna, idx) => (
                                      <span
                                        key={`${keyBase}-warna-${idx}`}
                                        className="stok-bahan-warna-chip"
                                        style={resolveWarnaColor(warna)}
                                      >
                                        {warna}
                                      </span>
                                    ))
                                  ) : (
                                    <span>-</span>
                                  )}
                                </div>
                              </td>
                              <td className="cell-right">{formatNumber(totalRol)}</td>
                              <td className="cell-right">{formatWeight(totalBerat)}</td>
                              <td className="cell-price cell-right">
                                {item.total_harga > 0 ? formatCurrency(item.total_harga) : "-"}
                              </td>
                              <td>
                                <span className={`stok-bahan-status ${statusClassName(displayStatus)}`}>
                                  {displayStatus}
                                </span>
                              </td>
                              <td>{item.sku || "-"}</td>
                              <td className="cell-action">
                                <button
                                  type="button"
                                  className="stok-bahan-detail-btn"
                                  onClick={() => toggleExpand(item.nama_bahan)}
                                  aria-label={`Toggle detail ${item.nama_bahan || "bahan"}`}
                                >
                                  {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                                </button>
                              </td>
                            </tr>

                            {isExpanded && item.detail && item.detail.length > 0 && (
                              (() => {
                                const filteredDetails = item.detail.filter((detail) => {
                                  if (statusFilter === "utuh") {
                                    return (detail.keterangan || "").toLowerCase() === "utuh";
                                  }
                                  if (statusFilter === "sisa") {
                                    return (detail.keterangan || "").toLowerCase() === "sisa";
                                  }
                                  return true;
                                });

                                const filteredTotalRol = filteredDetails.length;
                                const filteredTotalBerat = filteredDetails.reduce(
                                  (sum, detail) => sum + (parseFloat(detail.berat) || 0),
                                  0
                                );
                                const filteredWarnaDetail = [
                                  ...new Set(filteredDetails.map((detail) => detail.warna).filter(Boolean)),
                                ];

                                const warnaGroups = filteredDetails.reduce((acc, detail) => {
                                  const warnaKey =
                                    String(detail.warna || "Tidak Diketahui").trim() || "Tidak Diketahui";

                                  if (!acc[warnaKey]) {
                                    acc[warnaKey] = {
                                      count: 0,
                                      berat: 0,
                                      utuh: 0,
                                      sisa: 0,
                                    };
                                  }

                                  acc[warnaKey].count += 1;
                                  acc[warnaKey].berat += parseFloat(detail.berat) || 0;

                                  const keterangan = String(detail.keterangan || "").toLowerCase();
                                  if (keterangan === "utuh") {
                                    acc[warnaKey].utuh += 1;
                                  } else if (keterangan === "sisa") {
                                    acc[warnaKey].sisa += 1;
                                  }

                                  return acc;
                                }, {});

                                const warnaEntries = Object.entries(warnaGroups);

                                return (
                                  <tr>
                                    <td colSpan="10" className="stok-bahan-detail-cell">
                                      <div className="stok-bahan-detail-panel">
                                        <div className="stok-bahan-detail-header">
                                          <h4>Detail Stok - {item.nama_bahan || "-"}</h4>
                                          <p>Analisis rincian per warna dan status roll.</p>
                                        </div>

                                        {filteredDetails.length === 0 ? (
                                          <div className="stok-bahan-detail-empty">
                                            Tidak ada detail yang sesuai dengan filter status saat ini.
                                          </div>
                                        ) : (
                                          <>
                                            <div className="stok-bahan-detail-summary-grid">
                                              <div className="stok-bahan-detail-summary-card">
                                                <span>Total Roll</span>
                                                <strong>{formatNumber(filteredTotalRol)}</strong>
                                              </div>
                                              <div className="stok-bahan-detail-summary-card">
                                                <span>Total Warna</span>
                                                <strong>{formatNumber(filteredWarnaDetail.length)}</strong>
                                              </div>
                                              <div className="stok-bahan-detail-summary-card">
                                                <span>Total Berat</span>
                                                <strong>{formatWeight(filteredTotalBerat)} kg</strong>
                                              </div>
                                            </div>

                                            <div className="stok-bahan-detail-breakdown">
                                              <h5>Rincian per Warna</h5>
                                              <div className="stok-bahan-detail-breakdown-grid">
                                                {warnaEntries.map(([warna, detailData]) => (
                                                  <div key={`${keyBase}-${warna}`} className="stok-bahan-warna-card">
                                                    <span
                                                      className="stok-bahan-warna-label"
                                                      style={resolveWarnaColor(warna)}
                                                    >
                                                      {warna}
                                                    </span>
                                                    <div className="stok-bahan-warna-metric">
                                                      <span>Total Roll</span>
                                                      <strong>{formatNumber(detailData.count)}</strong>
                                                    </div>
                                                    <div className="stok-bahan-warna-metric-row">
                                                      <div>
                                                        <span>Utuh</span>
                                                        <strong>{formatNumber(detailData.utuh)}</strong>
                                                      </div>
                                                      <div>
                                                        <span>Sisa</span>
                                                        <strong>{formatNumber(detailData.sisa)}</strong>
                                                      </div>
                                                    </div>
                                                    <div className="stok-bahan-warna-metric">
                                                      <span>Total Berat</span>
                                                      <strong>{formatWeight(detailData.berat)} kg</strong>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })()
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="stok-bahan-pagination">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>

                  {(() => {
                    const maxVisible = 7;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                    if (endPage - startPage < maxVisible - 1) {
                      startPage = Math.max(1, endPage - maxVisible + 1);
                    }

                    const pages = [];

                    if (startPage > 1) {
                      pages.push(
                        <button
                          type="button"
                          key={1}
                          className={currentPage === 1 ? "active" : ""}
                          onClick={() => goToPage(1)}
                        >
                          1
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(
                          <span key="ellipsis1" className="stok-bahan-ellipsis">
                            ...
                          </span>
                        );
                      }
                    }

                    for (let i = startPage; i <= endPage; i += 1) {
                      pages.push(
                        <button
                          type="button"
                          key={i}
                          className={currentPage === i ? "active" : ""}
                          onClick={() => goToPage(i)}
                        >
                          {i}
                        </button>
                      );
                    }

                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="ellipsis2" className="stok-bahan-ellipsis">
                            ...
                          </span>
                        );
                      }

                      pages.push(
                        <button
                          type="button"
                          key={totalPages}
                          className={currentPage === totalPages ? "active" : ""}
                          onClick={() => goToPage(totalPages)}
                        >
                          {totalPages}
                        </button>
                      );
                    }

                    return pages;
                  })()}

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>

                  <span className="stok-bahan-pagination-info">
                    Halaman {currentPage} dari {totalPages} ({formatNumber(filtered.length)} data)
                  </span>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default StokPerBahan;

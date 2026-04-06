import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FiAlertTriangle,
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiPackage,
  FiRefreshCw,
  FiScissors,
  FiSearch,
  FiTool,
} from "react-icons/fi";
import "./KodeSeriBelumDikerjakan.css";
import API from "../../api";

const initialStatistics = {
  jumlah_spk: 0,
  jumlah_produk: 0,
  jumlah_qty: 0,
  jumlah_over_deadline: 0,
  jumlah_belum_deadline: 0,
  count_cutting: 0,
  count_jasa: 0,
};

const formatNumber = (value) => new Intl.NumberFormat("id-ID").format(Number(value) || 0);

const formatTanggal = (tanggal) => {
  if (!tanggal) return "-";

  const date = new Date(tanggal);

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatTimestamp = (dateValue) => {
  if (!dateValue) return "Belum tersinkron";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateValue);
};

const toNumber = (value) => Number(value) || 0;

const KodeSeriBelumDikerjakan = () => {
  const [data, setData] = useState([]);
  const [statistics, setStatistics] = useState(initialStatistics);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await API.get("/kode-seri-belum-dikerjakan");
      setData(response.data.data || []);
      setStatistics({
        ...initialStatistics,
        ...(response.data.statistics || {}),
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
      alert(error.response?.data?.message || "Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  const isOverDeadline = (deadline) => {
    if (!deadline) return false;

    const deadlineDate = new Date(deadline);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    return deadlineDate < today;
  };

  const matchesKeyword = (item) => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return true;

    const kodeSeri = (item.kode_seri || "").toLowerCase();
    const namaProduk = (item.nama_produk || "").toLowerCase();

    return kodeSeri.includes(keyword) || namaProduk.includes(keyword);
  };

  const searchScopedData = data.filter(matchesKeyword);

  const filteredData = searchScopedData.filter((item) => {
    if (typeFilter === "all") return true;

    return (item.distribusi_list || []).some((dist) => dist.type === typeFilter);
  });

  const countByType = (type) => {
    if (type === "all") {
      return searchScopedData.length;
    }

    return searchScopedData.reduce((total, item) => {
      const hasType = (item.distribusi_list || []).some((dist) => dist.type === type);
      return hasType ? total + 1 : total;
    }, 0);
  };

  const tableRows = filteredData.flatMap((item) => {
    const scopedDistribusi = (item.distribusi_list || []).filter((dist) => {
      if (typeFilter === "all") return true;
      return dist.type === typeFilter;
    });

    if (scopedDistribusi.length === 0) {
      return [];
    }

    const totalQty =
      typeFilter === "all"
        ? toNumber(item.jumlah)
        : scopedDistribusi.reduce((sum, dist) => sum + toNumber(dist.jumlah_qty), 0);

    return scopedDistribusi.map((dist, index) => ({
      key: `${item.kode_seri || "seri"}-${dist.type || "proses"}-${index}`,
      kodeSeri: item.kode_seri || "-",
      namaProduk: item.nama_produk || "-",
      deadline: item.deadline,
      overDeadline: isOverDeadline(item.deadline),
      distribusiType: dist.type || "-",
      totalQty,
      rowSpan: scopedDistribusi.length,
      isFirstRow: index === 0,
    }));
  });

  const visibleMetrics = filteredData.reduce(
    (accumulator, item) => {
      const scopedDistribusi = (item.distribusi_list || []).filter((dist) => {
        if (typeFilter === "all") return true;
        return dist.type === typeFilter;
      });

      if (scopedDistribusi.length === 0) {
        return accumulator;
      }

      accumulator.series += 1;
      accumulator.processLines += scopedDistribusi.length;
      accumulator.totalQty +=
        typeFilter === "all"
          ? toNumber(item.jumlah)
          : scopedDistribusi.reduce((sum, dist) => sum + toNumber(dist.jumlah_qty), 0);

      if (isOverDeadline(item.deadline)) {
        accumulator.overDeadline += 1;
      } else {
        accumulator.onTrack += 1;
      }

      return accumulator;
    },
    {
      series: 0,
      processLines: 0,
      totalQty: 0,
      overDeadline: 0,
      onTrack: 0,
    }
  );

  const statCards = [
    {
      label: "Total SPK",
      value: formatNumber(statistics.jumlah_spk),
      note: "order aktif",
      tone: "slate",
      icon: FiClipboard,
    },
    {
      label: "Produk tertahan",
      value: formatNumber(statistics.jumlah_produk),
      note: "SKU backlog",
      tone: "blue",
      icon: FiBox,
    },
    {
      label: "Qty menunggu proses",
      value: formatNumber(statistics.jumlah_qty),
      note: "unit belum dikerjakan",
      tone: "cyan",
      icon: FiPackage,
    },
    {
      label: "Over deadline",
      value: formatNumber(statistics.jumlah_over_deadline),
      note: "butuh perhatian",
      tone: "rose",
      icon: FiAlertTriangle,
    },
    {
      label: "Distribusi cutting",
      value: formatNumber(statistics.count_cutting),
      note: "jalur cutting aktif",
      tone: "indigo",
      icon: FiScissors,
    },
    {
      label: "Distribusi jasa",
      value: formatNumber(statistics.count_jasa),
      note: "jalur jasa aktif",
      tone: "teal",
      icon: FiTool,
    },
  ];

  const filterOptions = [
    { value: "all", label: "Semua Proses", count: countByType("all") },
    { value: "cutting", label: "Cutting", count: countByType("cutting") },
    { value: "jasa", label: "Jasa", count: countByType("jasa") },
  ];

  const getProcessClassName = (value) => {
    if (value === "cutting") return "is-cutting";
    if (value === "jasa") return "is-jasa";
    return "is-neutral";
  };

  const getProcessLabel = (value) => {
    if (value === "cutting") return "Cutting";
    if (value === "jasa") return "Jasa";
    return value || "-";
  };

  return (
    <div className="kode-seri-page">
      <div className="kode-seri-shell">
        <section className="kode-seri-content">
          <header className="kode-seri-topbar">
            <div className="kode-seri-title-group">
              <div className="kode-seri-brand-icon">
                <FiPackage size={24} />
              </div>
              <div className="kode-seri-brand-copy">
                <span className="kode-seri-eyebrow">ERP Production Queue</span>
                <h1>Kode Seri Belum Dikerjakan</h1>
                <p>Monitor backlog produksi jahit dan cutting dalam satu tampilan operasional yang lebih rapi.</p>
              </div>
            </div>

            <div className="kode-seri-topbar-actions">
              <label className="kode-seri-searchbox" aria-label="Cari kode seri atau produk">
                <FiSearch className="kode-seri-search-icon" />
                <input
                  type="text"
                  placeholder="Cari kode seri atau nama produk..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>

              <button type="button" className="kode-seri-refresh-btn" onClick={fetchData} disabled={loading}>
                <FiRefreshCw className={loading ? "is-spinning" : ""} />
                {loading ? "Memuat" : "Refresh Data"}
              </button>
            </div>
          </header>

          <main className="kode-seri-main">
            <motion.section
              className="kode-seri-overview-grid"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <article className="kode-seri-spotlight-card">
                <div className="kode-seri-spotlight-head">
                  <span className="kode-seri-chip">Live Monitor</span>
                  <div className="kode-seri-updated-at">
                    <FiCalendar size={14} />
                    <span>{formatTimestamp(lastUpdated)}</span>
                  </div>
                </div>

                <h2>Ringkas antrean kerja yang masih tertahan sebelum masuk proses produksi.</h2>
                <p>
                  Fokus halaman ini diarahkan untuk kontrol harian: jumlah seri yang terlihat, jalur distribusi aktif,
                  dan kesehatan deadline setelah pencarian maupun filter diterapkan.
                </p>

                <div className="kode-seri-spotlight-stats">
                  <div>
                    <span>Seri terlihat</span>
                    <strong>{formatNumber(visibleMetrics.series)}</strong>
                  </div>
                  <div>
                    <span>Jalur proses</span>
                    <strong>{formatNumber(visibleMetrics.processLines)}</strong>
                  </div>
                  <div>
                    <span>Qty aktif</span>
                    <strong>{formatNumber(visibleMetrics.totalQty)}</strong>
                  </div>
                  <div>
                    <span>On schedule</span>
                    <strong>{formatNumber(visibleMetrics.onTrack)}</strong>
                  </div>
                </div>

                <div className="kode-seri-spotlight-footer">
                  <span className={`kode-seri-status-pill ${visibleMetrics.overDeadline > 0 ? "is-overdue" : "is-safe"}`}>
                    {visibleMetrics.overDeadline > 0
                      ? `${formatNumber(visibleMetrics.overDeadline)} seri perlu follow up`
                      : "Seluruh seri masih dalam target"}
                  </span>
                  <span className="kode-seri-active-filter">
                    Filter aktif: {typeFilter === "all" ? "Semua proses" : getProcessLabel(typeFilter)}
                  </span>
                </div>
              </article>

              {statCards.map((card, index) => {
                const Icon = card.icon;

                return (
                  <motion.article
                    key={card.label}
                    className="kode-seri-stat-card"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.08 + index * 0.04 }}
                  >
                    <div className={`kode-seri-stat-icon tone-${card.tone}`}>
                      <Icon size={18} />
                    </div>
                    <div className="kode-seri-stat-copy">
                      <span>{card.label}</span>
                      <strong>{card.value}</strong>
                      <small>{card.note}</small>
                    </div>
                  </motion.article>
                );
              })}
            </motion.section>

            <motion.section
              className="kode-seri-table-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
            >
              <div className="kode-seri-table-head">
                <div>
                  <span className="kode-seri-section-label">Work Queue</span>
                  <h3>Daftar kode seri yang belum diproses</h3>
                  <p>Gunakan filter jalur kerja untuk membaca backlog per proses dengan lebih cepat.</p>
                </div>

                <div className="kode-seri-filter-tabs" role="tablist" aria-label="Filter jalur proses">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`kode-seri-filter-tab ${typeFilter === option.value ? "is-active" : ""}`}
                      onClick={() => setTypeFilter(option.value)}
                    >
                      <span>{option.label}</span>
                      <strong>{formatNumber(option.count)}</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className="kode-seri-table-meta">
                <span className="kode-seri-meta-pill">{formatNumber(filteredData.length)} kode seri tampil</span>
                <span className="kode-seri-meta-pill">{formatNumber(tableRows.length)} baris distribusi</span>
                <span className="kode-seri-meta-pill">{formatNumber(visibleMetrics.totalQty)} qty aktif</span>
              </div>

              <div className="kode-seri-table-wrap">
                <table className="kode-seri-table">
                  <thead>
                    <tr>
                      <th>Kode Seri</th>
                      <th>Distribusi</th>
                      <th>Nama Produk</th>
                      <th>Deadline</th>
                      <th>Qty Aktif</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6">
                          <div className="kode-seri-empty-state">
                            <div className="kode-seri-empty-icon is-loading">
                              <FiRefreshCw size={18} />
                            </div>
                            <h4>Memuat antrean produksi</h4>
                            <p>Data backlog sedang disinkronkan dari server.</p>
                          </div>
                        </td>
                      </tr>
                    ) : tableRows.length === 0 ? (
                      <tr>
                        <td colSpan="6">
                          <div className="kode-seri-empty-state">
                            <div className="kode-seri-empty-icon">
                              <FiSearch size={18} />
                            </div>
                            <h4>Data tidak ditemukan</h4>
                            <p>
                              {searchTerm
                                ? `Tidak ada hasil yang cocok dengan kata kunci "${searchTerm}".`
                                : "Belum ada kode seri yang tertahan untuk filter saat ini."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      tableRows.map((row) => (
                        <tr key={row.key}>
                          {row.isFirstRow && (
                            <td rowSpan={row.rowSpan} className="kode-seri-cell-focus">
                              <div className="kode-seri-series-block">
                                <strong>{row.kodeSeri}</strong>
                                <span>{formatNumber(row.rowSpan)} jalur proses</span>
                              </div>
                            </td>
                          )}

                          <td>
                            <span className={`kode-seri-process-pill ${getProcessClassName(row.distribusiType)}`}>
                              {getProcessLabel(row.distribusiType)}
                            </span>
                          </td>

                          {row.isFirstRow && (
                            <>
                              <td rowSpan={row.rowSpan}>
                                <div className="kode-seri-product-cell">{row.namaProduk}</div>
                              </td>
                              <td rowSpan={row.rowSpan}>
                                <div className="kode-seri-deadline-cell">
                                  <strong>{formatTanggal(row.deadline)}</strong>
                                  <span className={row.overDeadline ? "is-overdue" : "is-safe"}>
                                    {row.overDeadline ? "Melewati target" : "Masih sesuai target"}
                                  </span>
                                </div>
                              </td>
                              <td rowSpan={row.rowSpan} className="kode-seri-qty-cell">
                                {formatNumber(row.totalQty)}
                              </td>
                              <td rowSpan={row.rowSpan}>
                                <span className={`kode-seri-status-pill ${row.overDeadline ? "is-overdue" : "is-safe"}`}>
                                  {row.overDeadline ? <FiAlertTriangle size={14} /> : <FiCheckCircle size={14} />}
                                  {row.overDeadline ? "Over deadline" : "On track"}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.section>
          </main>
        </section>
      </div>
    </div>
  );
};

export default KodeSeriBelumDikerjakan;


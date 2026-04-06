import React, { startTransition, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FiAlertTriangle,
  FiArrowDown,
  FiArrowUp,
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiClipboard,
  FiPackage,
  FiRefreshCw,
  FiScissors,
  FiSearch,
  FiTool,
} from "react-icons/fi";
import "./KodeSeriBelumDikerjakanOptimized.css";
import API from "../../api";

const ROW_HEIGHT = 76;
const TABLE_BODY_HEIGHT = 560;
const OVERSCAN = 6;

const initialStatistics = {
  jumlah_spk: 0,
  jumlah_produk: 0,
  jumlah_qty: 0,
  jumlah_over_deadline: 0,
  jumlah_belum_deadline: 0,
  count_cutting: 0,
  count_jasa: 0,
  process_lines: 0,
};

const initialMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 50,
  total: 0,
  from: 0,
  to: 0,
  search: "",
  type_filter: "all",
  sort_by: "deadline",
  sort_direction: "asc",
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

const useDebouncedValue = (value, delay = 450) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setDebouncedValue(value.trim());
      });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [value, delay]);

  return debouncedValue;
};

const getProcessLabel = (value) => {
  if (value === "cutting") return "Cutting";
  if (value === "jasa") return "Jasa";
  return value || "-";
};

const getProcessClassName = (value) => {
  if (value === "cutting") return "is-cutting";
  if (value === "jasa") return "is-jasa";
  return "is-neutral";
};

const SortHeaderButton = ({ id, label, sortBy, sortDirection, onSort, align = "left" }) => {
  const isActive = sortBy === id;
  const Icon = isActive && sortDirection === "asc" ? FiArrowUp : FiArrowDown;

  return (
    <button
      type="button"
      className={`kode-seri-sort-btn ${isActive ? "is-active" : ""} ${align === "right" ? "align-right" : ""}`}
      onClick={() => onSort(id)}
    >
      <span>{label}</span>
      <Icon size={14} />
    </button>
  );
};

const VirtualizedQueueTable = ({ rows, sortBy, sortDirection, onSort }) => {
  const bodyRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    setScrollTop(0);

    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [rows.length]);

  const totalHeight = rows.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    rows.length,
    Math.ceil((scrollTop + TABLE_BODY_HEIGHT) / ROW_HEIGHT) + OVERSCAN
  );
  const visibleRows = rows.slice(startIndex, endIndex);

  return (
    <div className="kode-seri-virtual-table">
      <div className="kode-seri-virtual-header">
        <div className="kode-seri-virtual-header-row">
          <SortHeaderButton id="kode_seri" label="Kode Seri" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
          <SortHeaderButton id="type" label="Jalur Proses" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
          <SortHeaderButton id="nama_produk" label="Nama Produk" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
          <SortHeaderButton id="deadline" label="Deadline" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
          <SortHeaderButton id="jumlah" label="Qty Antre" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} align="right" />
          <div className="kode-seri-sort-placeholder">Status</div>
        </div>
      </div>

      <div
        ref={bodyRef}
        className="kode-seri-virtual-body"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div className="kode-seri-virtual-spacer" style={{ height: `${totalHeight}px` }}>
          {visibleRows.map((row, index) => {
            const absoluteIndex = startIndex + index;

            return (
              <div
                key={row.key}
                className={`kode-seri-virtual-row ${row.isContinuation ? "is-continuation" : ""}`}
                style={{
                  top: `${absoluteIndex * ROW_HEIGHT}px`,
                  height: `${ROW_HEIGHT}px`,
                }}
              >
                <div className={`kode-seri-virtual-cell ${row.isContinuation ? "is-repeated" : ""}`}>
                  <div className="kode-seri-grid-primary">{row.kodeSeri}</div>
                  <div className="kode-seri-grid-secondary">
                    {row.isContinuation
                      ? `lanjutan ${row.rowIndex + 1} dari ${row.rowSpan}`
                      : `${formatNumber(row.rowSpan)} jalur proses`}
                  </div>
                </div>

                <div className="kode-seri-virtual-cell">
                  <span className={`kode-seri-process-pill ${getProcessClassName(row.distribusiType)}`}>
                    {getProcessLabel(row.distribusiType)}
                  </span>
                </div>

                <div className={`kode-seri-virtual-cell ${row.isContinuation ? "is-repeated" : ""}`}>
                  <div className="kode-seri-grid-primary kode-seri-truncate" title={row.namaProduk}>
                    {row.namaProduk}
                  </div>
                  <div className="kode-seri-grid-secondary">Produk pada seri ini</div>
                </div>

                <div className={`kode-seri-virtual-cell ${row.isContinuation ? "is-repeated" : ""}`}>
                  <div className="kode-seri-grid-primary">{formatTanggal(row.deadline)}</div>
                  <div className={`kode-seri-grid-secondary ${row.overDeadline ? "is-overdue" : "is-safe"}`}>
                    {row.overDeadline ? "Sudah lewat target" : "Masih aman"}
                  </div>
                </div>

                <div className={`kode-seri-virtual-cell align-right ${row.isContinuation ? "is-repeated" : ""}`}>
                  <div className="kode-seri-grid-primary kode-seri-qty-inline">{formatNumber(row.totalQty)}</div>
                  <div className="kode-seri-grid-secondary">Total qty di seri</div>
                </div>

                <div className={`kode-seri-virtual-cell ${row.isContinuation ? "is-repeated" : ""}`}>
                  <span className={`kode-seri-status-pill ${row.overDeadline ? "is-overdue" : "is-safe"}`}>
                    {row.overDeadline ? <FiAlertTriangle size={14} /> : <FiCheckCircle size={14} />}
                    {row.overDeadline ? "Perlu diprioritaskan" : "Masih sesuai jalur"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const KodeSeriBelumDikerjakanPage = () => {
  const [items, setItems] = useState([]);
  const [statistics, setStatistics] = useState(initialStatistics);
  const [querySummary, setQuerySummary] = useState(initialStatistics);
  const [filterCounts, setFilterCounts] = useState({ all: 0, cutting: 0, jasa: 0 });
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline");
  const [sortDirection, setSortDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [lastUpdated, setLastUpdated] = useState(null);

  const debouncedSearch = useDebouncedValue(searchInput);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await API.get("/kode-seri-belum-dikerjakan", {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          type: typeFilter,
          sort_by: sortBy,
          sort_direction: sortDirection,
        },
      });

      const payload = response.data || {};

      setItems(payload.data || []);
      setStatistics({
        ...initialStatistics,
        ...(payload.statistics || {}),
      });
      setQuerySummary({
        ...initialStatistics,
        ...(payload.query_summary || {}),
      });
      setFilterCounts({
        all: payload.filter_counts?.all || 0,
        cutting: payload.filter_counts?.cutting || 0,
        jasa: payload.filter_counts?.jasa || 0,
      });
      setMeta({
        ...initialMeta,
        ...(payload.meta || {}),
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMessage(error.response?.data?.message || "Gagal mengambil data antrean.");
      setItems([]);
      setMeta({
        ...initialMeta,
        current_page: page,
        per_page: perPage,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [debouncedSearch, typeFilter, sortBy, sortDirection, page, perPage]);

  const flattenedRows = [];
  items.forEach((item) => {
    const distribusiList = item.distribusi_list?.length
      ? item.distribusi_list
      : [
          {
            id_distribusi: null,
            id_jasa: null,
            type: item.preferred_type || typeFilter,
            jumlah_qty: item.jumlah,
          },
        ];

    distribusiList.forEach((dist, rowIndex) => {
      flattenedRows.push({
        key: `${item.kode_seri}-${dist.type}-${dist.id_distribusi ?? "x"}-${dist.id_jasa ?? rowIndex}`,
        kodeSeri: item.kode_seri,
        namaProduk: item.nama_produk,
        deadline: item.deadline,
        totalQty: item.jumlah,
        overDeadline: item.is_over_deadline,
        distribusiType: dist.type,
        rowIndex,
        rowSpan: distribusiList.length,
        isContinuation: rowIndex > 0,
      });
    });
  });

  const statCards = [
    {
      label: "Total SPK",
      value: formatNumber(statistics.jumlah_spk),
      note: "jumlah seri yang masih menunggu",
      tone: "slate",
      icon: FiClipboard,
    },
    {
      label: "Produk tertahan",
      value: formatNumber(statistics.jumlah_produk),
      note: "produk yang belum lanjut proses",
      tone: "blue",
      icon: FiBox,
    },
    {
      label: "Qty menunggu proses",
      value: formatNumber(statistics.jumlah_qty),
      note: "total barang yang masih antre",
      tone: "cyan",
      icon: FiPackage,
    },
    {
      label: "Over deadline",
      value: formatNumber(statistics.jumlah_over_deadline),
      note: "yang sudah perlu didahulukan",
      tone: "rose",
      icon: FiAlertTriangle,
    },
    {
      label: "Distribusi cutting",
      value: formatNumber(statistics.count_cutting),
      note: "seri yang masih ada di jalur cutting",
      tone: "indigo",
      icon: FiScissors,
    },
    {
      label: "Distribusi jasa",
      value: formatNumber(statistics.count_jasa),
      note: "seri yang masuk jalur jasa",
      tone: "teal",
      icon: FiTool,
    },
  ];

  const filterOptions = [
    { value: "all", label: "Semua Proses", count: filterCounts.all, tone: "all" },
    { value: "cutting", label: "Cutting", count: filterCounts.cutting, tone: "cutting" },
    { value: "jasa", label: "Jasa", count: filterCounts.jasa, tone: "jasa" },
  ];

  const handleSort = (nextSortBy) => {
    if (sortBy === nextSortBy) {
      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(nextSortBy);
      setSortDirection(nextSortBy === "deadline" ? "asc" : "desc");
    }

    setPage(1);
  };

  const handleTypeFilter = (nextType) => {
    setTypeFilter(nextType);
    setPage(1);
  };

  const handlePerPageChange = (event) => {
    setPerPage(Number(event.target.value));
    setPage(1);
  };

  const pageNumbers = [];
  const pageStart = Math.max(1, meta.current_page - 2);
  const pageEnd = Math.min(meta.last_page, meta.current_page + 2);

  for (let currentPage = pageStart; currentPage <= pageEnd; currentPage += 1) {
    pageNumbers.push(currentPage);
  }

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
                <span className="kode-seri-eyebrow">Pantauan Produksi</span>
                <h1>Kode Seri Belum Dikerjakan</h1>
                <p>Layar pantau buat lihat seri yang masih antre, cek yang perlu dikejar, dan bantu tim jaga ritme kerja harian.</p>
              </div>
            </div>

            <div className="kode-seri-topbar-actions">
              <label className="kode-seri-searchbox" aria-label="Cari kode seri atau produk">
                <FiSearch className="kode-seri-search-icon" />
                <input
                  type="text"
                  placeholder="Cari kode seri atau nama produk..."
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                    setPage(1);
                  }}
                />
              </label>

              <button type="button" className="kode-seri-refresh-btn" onClick={loadData} disabled={loading}>
                <FiRefreshCw className={loading ? "is-spinning" : ""} />
                {loading ? "Memuat" : "Muat Ulang"}
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
                  <span className="kode-seri-chip">Pantauan Hari Ini</span>
                  <div className="kode-seri-updated-at">
                    <FiCalendar size={14} />
                    <span>{formatTimestamp(lastUpdated)}</span>
                  </div>
                </div>

                <h2>Semua antrean kerja bisa dicek dari satu layar, jadi lebih cepat lihat mana yang aman dan mana yang perlu didorong duluan.</h2>
                <p>
                  Menu ini bantu pantau kode seri yang masih nunggu proses, pisahkan jalur cutting dan jasa,
                  lalu cek qty dan deadline tanpa harus bongkar data satu-satu.
                </p>

                <div className="kode-seri-spotlight-stats">
                  <div>
                    <span>Seri yang tampil</span>
                    <strong>{formatNumber(querySummary.jumlah_spk)}</strong>
                  </div>
                  <div>
                    <span>Jalur yang jalan</span>
                    <strong>{formatNumber(querySummary.process_lines)}</strong>
                  </div>
                  <div>
                    <span>Qty yang kebaca</span>
                    <strong>{formatNumber(querySummary.jumlah_qty)}</strong>
                  </div>
                  <div>
                    <span>Masih aman</span>
                    <strong>{formatNumber(querySummary.jumlah_belum_deadline)}</strong>
                  </div>
                </div>

                <div className="kode-seri-spotlight-footer">
                  <span className={`kode-seri-status-pill ${querySummary.jumlah_over_deadline > 0 ? "is-overdue" : "is-safe"}`}>
                    {querySummary.jumlah_over_deadline > 0
                      ? `${formatNumber(querySummary.jumlah_over_deadline)} seri perlu diprioritaskan`
                      : "Semua seri yang tampil masih sesuai target"}
                  </span>
                  <span className="kode-seri-active-filter">
                    Tampilan aktif: {typeFilter === "all" ? "Semua proses" : getProcessLabel(typeFilter)}
                  </span>
                </div>
              </article>

              <div className="kode-seri-stat-grid">
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
              </div>
            </motion.section>

            <motion.section
              className="kode-seri-table-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
            >
              <div className="kode-seri-table-head">
                <div>
                  <span className="kode-seri-section-label">Daftar Antrian</span>
                  <h3>Daftar kode seri yang masih menunggu proses</h3>
                  <p>Pakai pencarian, filter, dan urutan untuk bantu cek kerjaan yang perlu jalan lebih dulu.</p>
                </div>

                <div className="kode-seri-filter-tabs" role="tablist" aria-label="Filter jalur proses">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`kode-seri-filter-tab tone-${option.tone} ${typeFilter === option.value ? "is-active" : ""}`}
                      onClick={() => handleTypeFilter(option.value)}
                    >
                      <span>{option.label}</span>
                      <strong>{formatNumber(option.count)}</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className="kode-seri-table-meta">
                <span className="kode-seri-meta-pill">
                  {meta.from || 0}-{meta.to || 0} dari {formatNumber(meta.total)} seri
                </span>
                <span className="kode-seri-meta-pill">{formatNumber(querySummary.process_lines)} jalur proses</span>
                <span className="kode-seri-meta-pill">{formatNumber(flattenedRows.length)} baris di halaman ini</span>
                <span className="kode-seri-meta-pill">{formatNumber(querySummary.jumlah_qty)} qty yang tampil</span>
              </div>

              {loading ? (
                <div className="kode-seri-empty-state">
                  <div className="kode-seri-empty-icon is-loading">
                    <FiRefreshCw size={18} />
                  </div>
                  <h4>Data antrean sedang disiapkan</h4>
                  <p>Kita lagi ambil data terbaru supaya tampilan yang keluar tetap sesuai kondisi terakhir.</p>
                </div>
              ) : errorMessage ? (
                <div className="kode-seri-empty-state">
                  <div className="kode-seri-empty-icon">
                    <FiAlertTriangle size={18} />
                  </div>
                  <h4>Daftar belum bisa dimunculkan</h4>
                  <p>{errorMessage}</p>
                </div>
              ) : flattenedRows.length === 0 ? (
                <div className="kode-seri-empty-state">
                  <div className="kode-seri-empty-icon">
                    <FiSearch size={18} />
                  </div>
                  <h4>Belum ada data yang cocok</h4>
                  <p>
                    {debouncedSearch
                      ? `Belum ada seri yang cocok dengan kata kunci "${debouncedSearch}".`
                      : "Untuk tampilan ini belum ada kode seri yang sedang menunggu proses."}
                  </p>
                </div>
              ) : (
                <>
                  <VirtualizedQueueTable
                    rows={flattenedRows}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />

                  <div className="kode-seri-pagination">
                    <div className="kode-seri-pagination-info">
                      <span>Halaman {formatNumber(meta.current_page)} dari {formatNumber(meta.last_page)}</span>
                      <label className="kode-seri-page-size">
                        <span>Tampil per halaman</span>
                        <select value={perPage} onChange={handlePerPageChange}>
                          {[25, 50, 100, 200].map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="kode-seri-pagination-actions">
                      <button type="button" className="kode-seri-page-btn" onClick={() => setPage(1)} disabled={meta.current_page <= 1}>
                        <FiChevronsLeft size={16} />
                      </button>
                      <button
                        type="button"
                        className="kode-seri-page-btn"
                        onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                        disabled={meta.current_page <= 1}
                      >
                        <FiChevronLeft size={16} />
                      </button>

                      {pageNumbers.map((pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          className={`kode-seri-page-btn ${meta.current_page === pageNumber ? "is-active" : ""}`}
                          onClick={() => setPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="kode-seri-page-btn"
                        onClick={() => setPage((currentPage) => Math.min(meta.last_page, currentPage + 1))}
                        disabled={meta.current_page >= meta.last_page}
                      >
                        <FiChevronRight size={16} />
                      </button>
                      <button
                        type="button"
                        className="kode-seri-page-btn"
                        onClick={() => setPage(meta.last_page)}
                        disabled={meta.current_page >= meta.last_page}
                      >
                        <FiChevronsRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.section>
          </main>
        </section>
      </div>
    </div>
  );
};

export default KodeSeriBelumDikerjakanPage;

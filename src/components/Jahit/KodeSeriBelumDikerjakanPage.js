import React, { startTransition, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FiAlertTriangle,
  FiArrowDown,
  FiArrowUp,
  FiBox,
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
  FiDownload
} from "react-icons/fi";
import "./KodeSeriBelumDikerjakanOptimized.css";
import API from "../../api";
import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";

const initialStatistics = {
  jumlah_spk: 0,
  jumlah_produk: 0,
  jumlah_qty: 0,
  jumlah_over_deadline: 0,
  jumlah_warning_deadline: 0,
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
    month: "short",
    year: "numeric",
  }).format(date);
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
      <Icon size={13} />
    </button>
  );
};

const QueueTable = ({ rows, sortBy, sortDirection, onSort }) => (
  <div className="kode-seri-normal-table-container">
    <table className="kode-seri-normal-table">
      <thead>
        <tr>
          <th><SortHeaderButton id="created_at" label="Tanggal Buat" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></th>
          <th><SortHeaderButton id="kode_seri" label="Kode Seri" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></th>
          <th><SortHeaderButton id="deadline" label="Deadline" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></th>
          <th><div className="kode-seri-sort-placeholder">Running Days</div></th>
          <th><SortHeaderButton id="nama_produk" label="Nama Produk" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></th>
          <th><div className="kode-seri-sort-placeholder">Size</div></th>
          <th className="align-right"><SortHeaderButton id="jumlah" label="Qty" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} align="right" /></th>
          <th><div className="kode-seri-sort-placeholder">Potong</div></th>
          <th><div className="kode-seri-sort-placeholder">Status</div></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className={row.isContinuation ? "is-continuation" : ""}>
            <td className={row.isContinuation ? "is-repeated" : ""}>{formatTanggal(row.createdAt)}</td>
            <td className={row.isContinuation ? "is-repeated" : ""} style={{ fontWeight: 700, color: '#1e40af' }}>{row.kodeSeri}</td>
            <td className={row.isContinuation ? "is-repeated" : ""}>{formatTanggal(row.deadline)}</td>
            <td className={row.isContinuation ? "is-repeated" : ""}>
              {row.deadline ? (() => {
                const days = Math.floor((new Date() - new Date(row.deadline)) / (1000 * 60 * 60 * 24));
                return (
                  <span style={{ color: days > 0 ? '#b91c1c' : '#166534', fontWeight: 600 }}>{days}</span>
                );
              })() : '-'}
            </td>
            <td className={`kode-seri-truncate ${row.isContinuation ? "is-repeated" : ""}`} title={row.namaProduk}>
              <strong style={{ fontSize: '12px', color: '#0f172a' }}>{row.namaProduk}</strong>
            </td>
            <td className={row.isContinuation ? "is-repeated" : ""}>{row.productSize || '-'}</td>
            <td className={`align-right ${row.isContinuation ? "is-repeated" : ""}`}>
              <span className="kode-seri-qty-inline">{formatNumber(row.totalQty)}</span>
            </td>
            <td className={row.isContinuation ? "is-repeated" : ""}>
              <span className={`kode-seri-status-pill ${row.hasilCuttingId ? "is-sudah-potong" : "is-belum-potong"}`}>
                {row.hasilCuttingId ? <FiCheckCircle size={12} /> : <FiScissors size={12} />}
                {row.hasilCuttingId ? "Sudah Potong" : "Belum Potong"}
              </span>
            </td>
            <td className={row.isContinuation ? "is-repeated" : ""}>
              <span className={`kode-seri-status-pill ${row.overDeadline ? "is-overdue" : "is-safe"}`}>
                {row.overDeadline ? <FiAlertTriangle size={12} /> : <FiCheckCircle size={12} />}
                {row.overDeadline ? "Overdue" : "Aman"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const KodeSeriBelumDikerjakanPage = () => {
  const [items, setItems] = useState([]);
  const [statistics, setStatistics] = useState(initialStatistics);
  const [filterCounts, setFilterCounts] = useState({ all: 0, cutting: 0, jasa: 0 });
  const [potongCounts, setPotongCounts] = useState({ all: 0, belum: 0, sudah: 0 });
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [potongFilter, setPotongFilter] = useState("belum");
  const [sortBy, setSortBy] = useState("deadline");
  const [sortDirection, setSortDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

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
          potong: potongFilter,
          sort_by: sortBy,
          sort_direction: sortDirection,
        },
      });

      const payload = response.data || {};

      setItems(payload.data || []);
      setStatistics({ ...initialStatistics, ...(payload.statistics || {}) });
      setFilterCounts({
        all: payload.filter_counts?.all || 0,
        cutting: payload.filter_counts?.cutting || 0,
        jasa: payload.filter_counts?.jasa || 0,
      });
      setPotongCounts({
        all: payload.potong_counts?.all || 0,
        belum: payload.potong_counts?.belum || 0,
        sudah: payload.potong_counts?.sudah || 0,
      });
      setMeta({ ...initialMeta, ...(payload.meta || {}) });
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMessage(error.response?.data?.message || "Gagal mengambil data antrean.");
      setItems([]);
      setMeta({ ...initialMeta, current_page: page, per_page: perPage });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [debouncedSearch, typeFilter, potongFilter, sortBy, sortDirection, page, perPage]);

  const flattenedRows = [];
  items.forEach((item) => {
    const distribusiList = item.distribusi_list?.length
      ? item.distribusi_list
      : [{ id_distribusi: null, id_jasa: null, type: item.preferred_type || typeFilter, jumlah_qty: item.jumlah }];

    distribusiList.forEach((dist, rowIndex) => {
      flattenedRows.push({
        key: `${item.kode_seri}-${dist.type}-${dist.id_distribusi ?? "x"}-${dist.id_jasa ?? rowIndex}`,
        kodeSeri: item.kode_seri,
        namaProduk: item.nama_produk,
        productSize: item.product_size,
        productColour: item.product_colour,
        createdAt: item.created_at,
        deadline: item.deadline,
        totalQty: item.jumlah,
        overDeadline: item.is_over_deadline,
        distribusiType: dist.type,
        rowIndex,
        rowSpan: distribusiList.length,
        isContinuation: rowIndex > 0,
        hasilCuttingId: item.hasil_cutting_id,
      });
    });
  });

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text("Laporan Kode Seri Belum Dikerjakan", 14, 15);
    const tableColumn = ["Tanggal Buat", "Kode Seri", "Deadline", "Running Days", "Nama Produk", "Size", "Qty", "Potong", "Status"];
    const tableRows = flattenedRows.map(row => {
      const runningDays = row.deadline ? Math.floor((new Date() - new Date(row.deadline)) / (1000 * 60 * 60 * 24)) : '-';
      return [
        formatTanggal(row.createdAt), row.kodeSeri, formatTanggal(row.deadline), runningDays.toString(),
        row.namaProduk, row.productSize || '-', formatNumber(row.totalQty),
        row.hasilCuttingId ? "Sudah" : "Belum", row.overDeadline ? "Overdue" : "Aman"
      ];
    });
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20, theme: 'grid' });
    doc.save("Laporan_Kode_Seri_Belum_Dikerjakan.pdf");
  };

  const handleExportPNG = async () => {
    const tableElement = document.querySelector(".kode-seri-table-card");
    if (!tableElement) return;
    try {
      const canvas = await html2canvas(tableElement, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imgData;
      link.download = "Laporan_Kode_Seri_Belum_Dikerjakan.png";
      link.click();
    } catch (err) {
      console.error("Failed to export PNG", err);
      alert("Gagal mengekspor PNG");
    }
  };

  const statCards = [
    { label: "Total SPK", value: formatNumber(statistics.jumlah_spk), tone: "slate", icon: FiClipboard },
    { label: "Produk Pending", value: formatNumber(statistics.jumlah_produk), tone: "blue", icon: FiBox },
    { label: "Qty Pending", value: formatNumber(statistics.jumlah_qty), tone: "cyan", icon: FiPackage },
    { label: "Over Deadline", value: formatNumber(statistics.jumlah_over_deadline), tone: "rose", icon: FiAlertTriangle },
    { label: "Warning", value: formatNumber(statistics.jumlah_warning_deadline), tone: "amber", icon: FiAlertTriangle },
    { label: "Proses Cutting", value: formatNumber(statistics.count_cutting), tone: "indigo", icon: FiScissors },
    { label: "Proses Jasa", value: formatNumber(statistics.count_jasa), tone: "teal", icon: FiTool },
  ];

  const filterOptions = [
    { value: "all", label: "Semua Proses", count: filterCounts.all, tone: "all" },
    { value: "cutting", label: "Cutting", count: filterCounts.cutting, tone: "cutting" },
    { value: "jasa", label: "Jasa", count: filterCounts.jasa, tone: "jasa" },
  ];

  const potongOptions = [
    { value: "belum", label: "Belum Potong", count: potongCounts.belum, tone: "cutting" },
    { value: "sudah", label: "Sudah Potong", count: potongCounts.sudah, tone: "jasa" },
    { value: "all", label: "Semua", count: potongCounts.all, tone: "all" },
  ];

  const handleSort = (nextSortBy) => {
    if (sortBy === nextSortBy) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(nextSortBy);
      setSortDirection(nextSortBy === "deadline" ? "asc" : "desc");
    }
    setPage(1);
  };

  const pageNumbers = [];
  const pageStart = Math.max(1, meta.current_page - 2);
  const pageEnd = Math.min(meta.last_page, meta.current_page + 2);
  for (let i = pageStart; i <= pageEnd; i++) pageNumbers.push(i);

  return (
    <div className="kode-seri-page">
      <div className="kode-seri-shell">
        <section className="kode-seri-content">
          {/* ── Topbar ── */}
          <header className="kode-seri-topbar">
            <div className="kode-seri-title-group">
              <div className="kode-seri-brand-icon">
                <FiPackage size={20} />
              </div>
              <div className="kode-seri-brand-copy">
                <span className="kode-seri-eyebrow">Laporan Pekerjaan Tersedia</span>
                <h1>Kode Seri Belum Dikerjakan</h1>
              </div>
            </div>
            <div className="kode-seri-topbar-actions">
              <button type="button" className="kode-seri-refresh-btn" onClick={handleExportPDF} disabled={loading || flattenedRows.length === 0}>
                <FiDownload size={14} /> PDF
              </button>
              <button type="button" className="kode-seri-refresh-btn" onClick={handleExportPNG} disabled={loading || flattenedRows.length === 0}>
                <FiDownload size={14} /> PNG
              </button>
              <button type="button" className="kode-seri-refresh-btn" onClick={loadData} disabled={loading}>
                <FiRefreshCw size={14} className={loading ? "is-spinning" : ""} />
                {loading ? "Memuat..." : "Muat Ulang"}
              </button>
            </div>
          </header>

          {/* ── Main ── */}
          <main className="kode-seri-main">
            {/* Stats */}
            <motion.section
              className="kode-seri-overview-grid"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="kode-seri-stat-grid">
                {statCards.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <motion.article
                      key={card.label}
                      className="kode-seri-stat-card"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.05 + i * 0.03 }}
                    >
                      <div className={`kode-seri-stat-icon tone-${card.tone}`}>
                        <Icon size={20} />
                      </div>
                      <div className="kode-seri-stat-copy">
                        <span>{card.label}</span>
                        <strong>{card.value}</strong>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </motion.section>

            {/* Table Card */}
            <motion.section
              className="kode-seri-table-card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <div className="kode-seri-table-head">
                <div>
                  <div>
                    <span className="kode-seri-section-label">Daftar Pekerjaan</span>
                    <h3>Seri Yang Belum Di Ambil Penjahit</h3>
                  </div>
                </div>
                <div className="kode-seri-table-actions">
                  <div className="kode-seri-filter-tabs" role="tablist">
                    {potongOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`kode-seri-filter-tab tone-${opt.tone} ${potongFilter === opt.value ? "is-active" : ""}`}
                        onClick={() => { setPotongFilter(opt.value); setPage(1); }}
                      >
                        <span>{opt.label}</span>
                        <strong>{formatNumber(opt.count)}</strong>
                      </button>
                    ))}
                  </div>

                  <div className="kode-seri-separator" />

                  <div className="kode-seri-filter-tabs" role="tablist">
                    {filterOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`kode-seri-filter-tab tone-${opt.tone} ${typeFilter === opt.value ? "is-active" : ""}`}
                        onClick={() => { setTypeFilter(opt.value); setPage(1); }}
                      >
                        <span>{opt.label}</span>
                        <strong>{formatNumber(opt.count)}</strong>
                      </button>
                    ))}
                  </div>

                  <label className="kode-seri-searchbox">
                    <FiSearch className="kode-seri-search-icon" />
                    <input
                      type="text"
                      placeholder="Cari kode seri atau nama produk..."
                      value={searchInput}
                      onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
                    />
                  </label>
                </div>
              </div>

              {loading ? (
                <div className="kode-seri-empty-state">
                  <div className="kode-seri-empty-icon is-loading"><FiRefreshCw size={18} /></div>
                  <h4>Data antrean sedang disiapkan</h4>
                  <p>Mengambil data terbaru, mohon tunggu sebentar...</p>
                </div>
              ) : errorMessage ? (
                <div className="kode-seri-empty-state">
                  <div className="kode-seri-empty-icon"><FiAlertTriangle size={18} /></div>
                  <h4>Daftar belum bisa dimunculkan</h4>
                  <p>{errorMessage}</p>
                </div>
              ) : flattenedRows.length === 0 ? (
                <div className="kode-seri-empty-state">
                  <div className="kode-seri-empty-icon"><FiSearch size={18} /></div>
                  <h4>Belum ada data yang cocok</h4>
                  <p>{debouncedSearch ? `Tidak ditemukan seri dengan kata kunci "${debouncedSearch}".` : "Belum ada kode seri yang sedang menunggu proses."}</p>
                </div>
              ) : (
                <>
                  <QueueTable rows={flattenedRows} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                  <div className="kode-seri-pagination">
                    <div className="kode-seri-pagination-info">
                      <span>Halaman {formatNumber(meta.current_page)} dari {formatNumber(meta.last_page)}</span>
                      <label className="kode-seri-page-size">
                        <span>Tampil</span>
                        <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
                          {[25, 50, 100, 200].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="kode-seri-pagination-actions">
                      <button type="button" className="kode-seri-page-btn" onClick={() => setPage(1)} disabled={meta.current_page <= 1}><FiChevronsLeft size={15} /></button>
                      <button type="button" className="kode-seri-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.current_page <= 1}><FiChevronLeft size={15} /></button>
                      {pageNumbers.map((n) => (
                        <button key={n} type="button" className={`kode-seri-page-btn ${meta.current_page === n ? "is-active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                      ))}
                      <button type="button" className="kode-seri-page-btn" onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={meta.current_page >= meta.last_page}><FiChevronRight size={15} /></button>
                      <button type="button" className="kode-seri-page-btn" onClick={() => setPage(meta.last_page)} disabled={meta.current_page >= meta.last_page}><FiChevronsRight size={15} /></button>
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

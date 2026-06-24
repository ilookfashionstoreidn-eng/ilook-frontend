import React, { startTransition, useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowDown,
  FiArrowUp,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiRefreshCw,
  FiSearch,
  FiDownload,
  FiInbox,
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
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

const getRunningDays = (deadline) => {
  if (!deadline) return null;
  return Math.floor((Date.now() - new Date(deadline)) / 86400000);
};

// Urgency derived from how far past (or before) the deadline a row is.
const getUrgency = (days) => {
  if (days === null) return "none";
  if (days > 0) return "overdue";
  if (days >= -3) return "warning";
  return "safe";
};

const URGENCY_LABEL = { overdue: "Overdue", warning: "Mendekati", safe: "Aman", none: "—" };

const useDebouncedValue = (value, delay = 450) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => setDebouncedValue(value.trim()));
    }, delay);
    return () => window.clearTimeout(timeoutId);
  }, [value, delay]);
  return debouncedValue;
};

const SortHead = ({ id, label, sortBy, sortDirection, onSort, align = "left" }) => {
  const isActive = sortBy === id;
  const Icon = isActive && sortDirection === "asc" ? FiArrowUp : FiArrowDown;
  return (
    <button
      type="button"
      className={`ks-th-btn ${isActive ? "is-active" : ""} ${align === "right" ? "align-right" : ""}`}
      onClick={() => onSort(id)}
    >
      <span>{label}</span>
      {isActive && <Icon size={12} />}
    </button>
  );
};

const QueueTable = ({ rows, sortBy, sortDirection, onSort }) => (
  <div className="ks-grid-scroll">
    <table className="ks-grid">
      <thead>
        <tr>
          <th className="ks-col-dot" aria-label="Status" />
          <th><SortHead id="kode_seri" label="Kode Seri" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></th>
          <th><SortHead id="nama_produk" label="Produk" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></th>
          <th className="ks-col-size">Size</th>
          <th className="align-right"><SortHead id="jumlah" label="Qty" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} align="right" /></th>
          <th><SortHead id="created_at" label="Dibuat" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></th>
          <th><SortHead id="deadline" label="Deadline" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></th>
          <th className="align-right ks-col-run">Run</th>
          <th className="ks-col-potong">Potong</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const days = getRunningDays(row.deadline);
          const urgency = getUrgency(days);
          return (
            <tr key={row.key} className={row.isContinuation ? "is-continuation" : ""}>
              <td className="ks-col-dot">
                <span className={`ks-dot tone-${urgency}`} title={URGENCY_LABEL[urgency]} />
              </td>
              <td className={`ks-cell-code ${row.isContinuation ? "is-repeated" : ""}`}>{row.kodeSeri}</td>
              <td className={`ks-cell-product ${row.isContinuation ? "is-repeated" : ""}`} title={row.namaProduk}>{row.namaProduk}</td>
              <td className={`ks-col-size ks-muted ${row.isContinuation ? "is-repeated" : ""}`}>{row.productSize || "-"}</td>
              <td className={`align-right ks-cell-num ${row.isContinuation ? "is-repeated" : ""}`}>{formatNumber(row.totalQty)}</td>
              <td className={`ks-muted ${row.isContinuation ? "is-repeated" : ""}`}>{formatTanggal(row.createdAt)}</td>
              <td className={row.isContinuation ? "is-repeated" : ""}>{formatTanggal(row.deadline)}</td>
              <td className={`align-right ks-cell-num ${row.isContinuation ? "is-repeated" : ""}`}>
                {days === null ? <span className="ks-muted">-</span> : (
                  <span className={`ks-run tone-${urgency}`}>{days > 0 ? `+${days}` : days}d</span>
                )}
              </td>
              <td className={row.isContinuation ? "is-repeated" : ""}>
                <span className={`ks-tag ${row.hasilCuttingId ? "is-sudah" : "is-belum"}`}>
                  {row.hasilCuttingId ? "Sudah" : "Belum"}
                </span>
              </td>
            </tr>
          );
        })}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const doc = new jsPDF("landscape");
    doc.text("Laporan Kode Seri Belum Dikerjakan", 14, 15);
    const tableColumn = ["Kode Seri", "Produk", "Size", "Qty", "Dibuat", "Deadline", "Run (hari)", "Potong", "Status"];
    const tableRows = flattenedRows.map((row) => {
      const days = getRunningDays(row.deadline);
      return [
        row.kodeSeri, row.namaProduk, row.productSize || "-", formatNumber(row.totalQty),
        formatTanggal(row.createdAt), formatTanggal(row.deadline),
        days === null ? "-" : days.toString(),
        row.hasilCuttingId ? "Sudah" : "Belum", URGENCY_LABEL[getUrgency(days)],
      ];
    });
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20, theme: "grid", styles: { fontSize: 8 } });
    doc.save("Laporan_Kode_Seri_Belum_Dikerjakan.pdf");
  };

  const handleExportPNG = async () => {
    const tableElement = document.querySelector(".ks-board");
    if (!tableElement) return;
    try {
      const canvas = await html2canvas(tableElement, { scale: 2 });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "Laporan_Kode_Seri_Belum_Dikerjakan.png";
      link.click();
    } catch (err) {
      console.error("Failed to export PNG", err);
      alert("Gagal mengekspor PNG");
    }
  };

  const statRail = [
    { label: "Seri", value: statistics.jumlah_spk },
    { label: "Produk", value: statistics.jumlah_produk },
    { label: "Qty", value: statistics.jumlah_qty },
    { label: "Overdue", value: statistics.jumlah_over_deadline, tone: "overdue" },
    { label: "Mendekati", value: statistics.jumlah_warning_deadline, tone: "warning" },
    { label: "Aman", value: statistics.jumlah_belum_deadline, tone: "safe" },
    { label: "Cutting", value: statistics.count_cutting },
    { label: "Jasa", value: statistics.count_jasa },
  ];

  const filterOptions = [
    { value: "all", label: "Semua", count: filterCounts.all },
    { value: "cutting", label: "Cutting", count: filterCounts.cutting },
    { value: "jasa", label: "Jasa", count: filterCounts.jasa },
  ];

  const potongOptions = [
    { value: "belum", label: "Belum Potong", count: potongCounts.belum },
    { value: "sudah", label: "Sudah Potong", count: potongCounts.sudah },
    { value: "all", label: "Semua", count: potongCounts.all },
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
    <div className="ks-page">
      {/* ── Header ── */}
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Kode Seri Belum Dikerjakan</h1>
          <span className="ks-header-sub">Antrean seri yang belum diambil penjahit</span>
        </div>
        <div className="ks-header-actions">
          <button type="button" className="ks-btn" onClick={handleExportPDF} disabled={loading || flattenedRows.length === 0}>
            <FiDownload size={13} /> PDF
          </button>
          <button type="button" className="ks-btn" onClick={handleExportPNG} disabled={loading || flattenedRows.length === 0}>
            <FiDownload size={13} /> PNG
          </button>
          <button type="button" className="ks-btn is-primary" onClick={loadData} disabled={loading}>
            <FiRefreshCw size={13} className={loading ? "is-spinning" : ""} />
            {loading ? "Memuat" : "Muat Ulang"}
          </button>
        </div>
      </header>

      {/* ── Stat rail ── */}
      <div className="ks-statrail">
        {statRail.map((s) => (
          <div className="ks-stat" key={s.label}>
            <span className="ks-stat-label">{s.label}</span>
            <span className={`ks-stat-value ${s.tone ? `tone-${s.tone}` : ""}`}>
              {s.tone && <span className={`ks-dot tone-${s.tone}`} />}
              {formatNumber(s.value)}
            </span>
          </div>
        ))}
      </div>

      {/* ── Board ── */}
      <section className="ks-board">
        <div className="ks-toolbar">
          <div className="ks-segment" role="tablist">
            {potongOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`ks-seg-btn ${potongFilter === opt.value ? "is-active" : ""}`}
                onClick={() => { setPotongFilter(opt.value); setPage(1); }}
              >
                {opt.label}<em>{formatNumber(opt.count)}</em>
              </button>
            ))}
          </div>
          <div className="ks-segment" role="tablist">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`ks-seg-btn ${typeFilter === opt.value ? "is-active" : ""}`}
                onClick={() => { setTypeFilter(opt.value); setPage(1); }}
              >
                {opt.label}<em>{formatNumber(opt.count)}</em>
              </button>
            ))}
          </div>
          <label className="ks-search">
            <FiSearch className="ks-search-icon" size={14} />
            <input
              type="text"
              placeholder="Cari kode seri / produk…"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            />
          </label>
        </div>

        {loading ? (
          <div className="ks-empty">
            <FiRefreshCw className="is-spinning" size={20} />
            <p>Memuat antrean…</p>
          </div>
        ) : errorMessage ? (
          <div className="ks-empty">
            <FiAlertTriangle size={20} />
            <p>{errorMessage}</p>
          </div>
        ) : flattenedRows.length === 0 ? (
          <div className="ks-empty">
            <FiInbox size={20} />
            <p>{debouncedSearch ? `Tidak ada hasil untuk "${debouncedSearch}".` : "Belum ada kode seri menunggu proses."}</p>
          </div>
        ) : (
          <>
            <QueueTable rows={flattenedRows} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
            <div className="ks-footer">
              <div className="ks-footer-info">
                <span>Hal. {formatNumber(meta.current_page)}/{formatNumber(meta.last_page)} · {formatNumber(meta.total)} baris</span>
                <label className="ks-pagesize">
                  Tampil
                  <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
                    {[25, 50, 100, 200].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              <div className="ks-pager">
                <button type="button" className="ks-pg-btn" onClick={() => setPage(1)} disabled={meta.current_page <= 1}><FiChevronsLeft size={14} /></button>
                <button type="button" className="ks-pg-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.current_page <= 1}><FiChevronLeft size={14} /></button>
                {pageNumbers.map((n) => (
                  <button key={n} type="button" className={`ks-pg-btn ${meta.current_page === n ? "is-active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                ))}
                <button type="button" className="ks-pg-btn" onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={meta.current_page >= meta.last_page}><FiChevronRight size={14} /></button>
                <button type="button" className="ks-pg-btn" onClick={() => setPage(meta.last_page)} disabled={meta.current_page >= meta.last_page}><FiChevronsRight size={14} /></button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default KodeSeriBelumDikerjakanPage;

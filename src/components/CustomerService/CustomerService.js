import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "../../api";
import dayjs from "dayjs";
import "../Cutting/SpkCutting/DashboardCutting.css";
import "./CustomerService.css";
import {
  FaHeadset, FaSyncAlt, FaSearch, FaCommentDots, FaStickyNote, FaLayerGroup,
  FaDownload, FaCopy, FaCheck, FaTimes, FaPalette, FaExclamationTriangle,
  FaBoxOpen, FaPen, FaChevronLeft, FaChevronRight, FaAngleDoubleLeft, FaAngleDoubleRight,
  FaCog,
} from "react-icons/fa";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

// Kolom yang boleh disembunyikan lewat Pengaturan Tampilan. No. Order, Pelanggan,
// Status, Catatan Pembeli, checkbox, dan Aksi tetap wajib tampil (inti data + aksi).
const OPTIONAL_COLUMNS = [
  { key: "waktu", label: "Waktu" },
  { key: "noResi", label: "No. Resi" },
  { key: "batasKirim", label: "Batas Kirim" },
  { key: "toko", label: "Toko" },
  { key: "platform", label: "Platform" },
  { key: "provinsi", label: "Provinsi" },
  { key: "catatanPenjual", label: "Catatan Penjual" },
  { key: "followUp", label: "Follow-up CS" },
];
const DEFAULT_VISIBLE_COLS = Object.fromEntries(OPTIONAL_COLUMNS.map((c) => [c.key, true]));
const VISIBLE_COLS_STORAGE_KEY = "csn_visible_cols";
const PAGE_SIZE_STORAGE_KEY = "csn_page_size";

const nf = (value) => Number(value || 0).toLocaleString("id-ID");
const formatDateTime = (value) => (value ? dayjs(value).format("DD MMM YYYY, HH:mm") : "-");

// Nilai asli di kolom order.status: CANCELLED, DELIVERED, PAID, PENDING_PAYMENT,
// READY_TO_SHIP, SHIPPING (dicek langsung ke DB — tidak ada RETURNED/SHIPPED).
const STATUS_LABEL = {
  PAID: "Sudah Dibayar", PENDING_PAYMENT: "Menunggu Bayar", READY_TO_SHIP: "Siap Kirim",
  DELIVERED: "Terkirim", CANCELLED: "Batal", SHIPPING: "Dikirim",
};
const statusLabel = (s) => STATUS_LABEL[s] || s;
const statusTagClass = (status) =>
  status === "PAID" || status === "DELIVERED" ? "is-paid"
  : status === "CANCELLED" ? "is-cancelled"
  : status === "SHIPPING" ? "is-shipping"
  : "is-default";

// "Terkirim" = sudah dikirim/sampai ke pembeli; "Belum Terkirim" = masih
// menunggu bayar/proses/siap kirim, atau batal (tidak pernah terkirim).
const SHIPPED_STATUSES = new Set(["SHIPPING", "DELIVERED"]);
const isShipped = (n) => SHIPPED_STATUSES.has(n.status);
const matchesShip = (n, s) => (s === "ALL" ? true : s === "SUDAH" ? isShipped(n) : !isShipped(n));

// Status follow-up CS. `tone` dipetakan ke class tag warna iLook sendiri
// (bukan palet next-dashboard) supaya tetap konsisten sama sisa halaman.
const FOLLOWUP_OPTIONS = [
  { value: "PENDING", label: "Belum diproses", tone: "is-default" },
  { value: "CONTACTED", label: "Sudah dihubungi", tone: "is-shipping" },
  { value: "UNREACHABLE", label: "Tidak bisa dihubungi", tone: "is-warning" },
  { value: "CONFIRMED", label: "Konfirmasi / Setuju", tone: "is-paid" },
  { value: "RESCHEDULED", label: "Reschedule disepakati", tone: "is-shipping" },
  { value: "COLOR_CHANGE", label: "Ganti warna / varian", tone: "is-warning" },
  { value: "CANCELLED", label: "Batal / Refund", tone: "is-cancelled" },
  { value: "DONE", label: "Selesai", tone: "is-paid" },
];
const FOLLOWUP_LABEL = Object.fromEntries(FOLLOWUP_OPTIONS.map((o) => [o.value, o.label]));
const FOLLOWUP_TONE = Object.fromEntries(FOLLOWUP_OPTIONS.map((o) => [o.value, o.tone]));

const isFollowedUp = (n) => !!n.follow_up?.status && n.follow_up.status !== "PENDING";

const PRIORITY_TABS = ["ALL", "REQUEST_JADWAL", "REQUEST_WARNA", "WARNA_MISMATCH", "CATATAN_BIASA"];
const tabLabel = (t) =>
  t === "ALL" ? "Semua"
  : t === "REQUEST_JADWAL" ? "Request Jadwal"
  : t === "REQUEST_WARNA" ? "Request Warna"
  : t === "WARNA_MISMATCH" ? "Warna Tidak Cocok"
  : t === "CATATAN_BIASA" ? "Catatan Biasa"
  : statusLabel(t);

const matchesTab = (n, t) =>
  t === "ALL" ? true
  : t === "REQUEST_JADWAL" ? !!n.is_date_request
  : t === "REQUEST_WARNA" ? (!!n.is_color_request && !n.color_mismatch)
  : t === "WARNA_MISMATCH" ? !!n.color_mismatch
  : t === "CATATAN_BIASA" ? (!n.is_date_request && !n.is_color_request)
  : n.status === t;

const matchesFollowUp = (n, fu) =>
  fu === "ALL" ? true : fu === "DONE" ? isFollowedUp(n) : !isFollowedUp(n);

const klas = (n) =>
  n.color_mismatch ? "Warna Tidak Cocok"
  : n.is_color_request ? "Request Warna"
  : n.is_date_request ? "Request Jadwal"
  : "Catatan Biasa";

const csvEscape = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const FollowUpCell = ({ row, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(row.follow_up?.status || "PENDING");
  const [note, setNote] = useState(row.follow_up?.note || "");
  const [saving, setSaving] = useState(false);

  const saved = row.follow_up || { status: "PENDING", note: "", performed_by: "", updated_at: null };
  const dirty = status !== saved.status || note !== (saved.note || "");

  const cancel = () => { setStatus(saved.status); setNote(saved.note || ""); setOpen(false); };

  const save = async () => {
    try {
      setSaving(true);
      const res = await API.post("/orders/customer-notes/follow-up", { order_id: row.id, status, note });
      onSaved(row.id, res.data.follow_up);
      setOpen(false);
    } catch (err) {
      alert(err?.response?.data?.message || "Gagal menyimpan follow-up");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="csn-followup-cell">
      <button className="csn-followup-trigger" onClick={() => setOpen((o) => !o)} title="Catat / ubah hasil follow-up">
        <span className={`csn-tag ${FOLLOWUP_TONE[saved.status] || "is-default"}`}>
          {FOLLOWUP_LABEL[saved.status] || "Belum diproses"} <FaPen size={9} />
        </span>
      </button>

      {!open && saved.note && <div className="csn-followup-preview" title={saved.note}>&ldquo;{saved.note}&rdquo;</div>}
      {!open && saved.performed_by && (
        <div className="csn-followup-meta">
          oleh {saved.performed_by}{saved.updated_at ? ` · ${dayjs(saved.updated_at).format("D MMM")}` : ""}
        </div>
      )}

      {open && (
        <div className="csn-followup-editor">
          <select className="csn-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {FOLLOWUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <textarea
            className="csn-input csn-followup-textarea"
            rows={3}
            placeholder="Tulis hasil follow-up..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="csn-followup-editor-actions">
            <button className="ks-btn" onClick={cancel} disabled={saving}>Batal</button>
            <button className="ks-btn is-primary" onClick={save} disabled={saving || !dirty}>
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomerService = () => {
  const [startDate, setStartDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, buyer_message: 0, seller_memo: 0, both: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState("ALL");
  const [fu, setFu] = useState("ALL");
  const [ship, setShip] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [copied, setCopied] = useState(null);

  const [bulkStatus, setBulkStatus] = useState("CONTACTED");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);

  const [showFilters, setShowFilters] = useState(true);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(VISIBLE_COLS_STORAGE_KEY));
      return saved ? { ...DEFAULT_VISIBLE_COLS, ...saved } : DEFAULT_VISIBLE_COLS;
    } catch {
      return DEFAULT_VISIBLE_COLS;
    }
  });
  const [pageSize, setPageSize] = useState(() => {
    const saved = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : 50;
  });

  useEffect(() => { localStorage.setItem(VISIBLE_COLS_STORAGE_KEY, JSON.stringify(visibleCols)); }, [visibleCols]);
  useEffect(() => { localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize)); }, [pageSize]);

  const toggleCol = (key) => setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }));

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = { start_date: startDate, end_date: endDate, type: "all", per_page: 100 };
      const firstRes = await API.get("/orders/customer-notes", { params: { ...params, page: 1 } });
      
      let allData = Array.isArray(firstRes.data.data) ? firstRes.data.data : [];
      const summary = firstRes.data.summary || { total: 0, buyer_message: 0, seller_memo: 0, both: 0 };
      
      // Calculate last page dynamically if the backend doesn't explicitly return it
      let lastPage = firstRes.data.last_page || firstRes.data.meta?.last_page;
      if (!lastPage && summary.total > allData.length && allData.length > 0) {
        lastPage = Math.ceil(summary.total / allData.length);
      }
      lastPage = lastPage || 1;
      
      if (lastPage > 1) {
        const promises = [];
        for (let i = 2; i <= lastPage; i++) {
          promises.push(() => API.get("/orders/customer-notes", { params: { ...params, page: i } }));
        }
        
        // Proses dalam batch of 10 agar lebih cepat namun tetap stabil
        const chunkSize = 10;
        for (let i = 0; i < promises.length; i += chunkSize) {
          const chunk = promises.slice(i, i + chunkSize).map(fn => fn());
          const results = await Promise.all(chunk);
          results.forEach(res => {
            if (Array.isArray(res.data.data)) {
              allData = allData.concat(res.data.data);
            }
          });
        }
      }

      setRows(allData);
      setSummary(summary);
    } catch (err) {
      setRows([]);
      setError(err?.response?.data?.message || "Gagal memuat catatan pelanggan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setPage(1); setSelected(new Set()); }, [tab, fu, ship, search, pageSize]);

  const matchesSearch = (n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (n.buyer_message || "").toLowerCase().includes(q)
      || (n.seller_memo || "").toLowerCase().includes(q)
      || (n.order_number || "").toLowerCase().includes(q)
      || (n.tracking_number || "").toLowerCase().includes(q)
      || (n.customer_name || "").toLowerCase().includes(q)
      || (n.store || "").toLowerCase().includes(q)
      || (n.province || "").toLowerCase().includes(q);
  };

  // Tiga dimensi filter (Kategori/tab, Follow-up CS/fu, Status Kirim/ship) + pencarian
  // saling independen — tiap chip-nya menghitung count dengan dua dimensi LAIN tetap
  // dan dirinya sendiri divariasikan, supaya angkanya selalu konsisten dipilih apa pun.
  const withTabSearch = useMemo(() => rows.filter((n) => matchesTab(n, tab) && matchesSearch(n)), [rows, tab, search]);
  const withTabSearchFu = useMemo(() => withTabSearch.filter((n) => matchesFollowUp(n, fu)), [withTabSearch, fu]);
  const withTabSearchShip = useMemo(() => withTabSearch.filter((n) => matchesShip(n, ship)), [withTabSearch, ship]);
  const filtered = useMemo(() => withTabSearchFu.filter((n) => matchesShip(n, ship)), [withTabSearchFu, ship]);

  const statusTabs = useMemo(
    () => Array.from(new Set(rows.map((r) => r.status))).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [rows]
  );
  const availableTabs = [...PRIORITY_TABS, ...statusTabs];

  const getCount = (t) => rows.filter((n) => matchesTab(n, t) && matchesSearch(n) && matchesFollowUp(n, fu) && matchesShip(n, ship)).length;
  const fuCounts = {
    ALL: withTabSearchShip.length,
    PENDING: withTabSearchShip.filter((n) => !isFollowedUp(n)).length,
    DONE: withTabSearchShip.filter(isFollowedUp).length,
  };
  const shipCounts = {
    ALL: withTabSearchFu.length,
    BELUM: withTabSearchFu.filter((n) => !isShipped(n)).length,
    SUDAH: withTabSearchFu.filter(isShipped).length,
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const someSelected = selected.size > 0;
  const allFilteredSelected = filtered.length > 0 && filtered.every((n) => selected.has(n.id));
  const targetRows = someSelected ? filtered.filter((n) => selected.has(n.id)) : filtered;

  const toggleRow = (id) => setSelected((prev) => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });
  const toggleAll = () => setSelected(allFilteredSelected ? new Set() : new Set(filtered.map((n) => n.id)));
  const clearSelection = () => setSelected(new Set());

  const headCbRef = useRef(null);
  useEffect(() => {
    if (headCbRef.current) headCbRef.current.indeterminate = someSelected && !allFilteredSelected;
  }, [someSelected, allFilteredSelected]);

  const handleFollowUpSaved = (orderId, followUp) => {
    setRows((prev) => prev.map((r) => (r.id === orderId ? { ...r, follow_up: followUp } : r)));
  };

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      alert("Gagal menyalin. Coba blok teksnya manual.");
    }
  };

  const exportCsv = () => {
    const headers = [
      "Waktu", "Order ID", "No. Resi", "Batas Kirim", "Pelanggan", "Toko", "Platform", "Provinsi",
      "Status", "Catatan Pembeli", "Klasifikasi", "Tgl Diminta", "Catatan Penjual",
      "Follow-up CS", "Catatan Follow-up", "Follow-up oleh",
    ];
    const lines = [headers.join(",")];
    targetRows.forEach((n) => {
      lines.push([
        formatDateTime(n.order_date), n.order_number, n.tracking_number, formatDateTime(n.shipping_deadline),
        n.customer_name, n.store, n.platform, n.province, n.status, n.buyer_message, klas(n), n.extracted_date || "",
        n.seller_memo, FOLLOWUP_LABEL[n.follow_up?.status] || "Belum diproses", n.follow_up?.note || "", n.follow_up?.performed_by || "",
      ].map(csvEscape).join(","));
    });
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catatan-pelanggan-${dayjs().format("YYYYMMDD-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyBulkFollowUp = async () => {
    if (targetRows.length === 0) return;
    try {
      setBulkSaving(true);
      await API.post("/orders/customer-notes/follow-up/bulk", {
        order_ids: targetRows.map((n) => n.id),
        status: bulkStatus,
        note: bulkNote || undefined,
      });
      const ids = new Set(targetRows.map((n) => n.id));
      const now = new Date().toISOString();
      setRows((prev) => prev.map((r) => (ids.has(r.id)
        ? { ...r, follow_up: { status: bulkStatus, note: bulkNote || r.follow_up?.note || "", performed_by: r.follow_up?.performed_by || "Anda", updated_at: now } }
        : r)));
      setBulkDone(true);
      setBulkNote("");
      setSelected(new Set());
      setTimeout(() => setBulkDone(false), 2500);
    } catch (err) {
      alert(err?.response?.data?.message || "Gagal menyimpan follow-up massal");
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="ks-page dc-page csn-page">
      <nav className="csn-breadcrumb">
        <span>Dashboard</span> <span className="csn-breadcrumb-sep">/</span> <span>Customer Service</span> <span className="csn-breadcrumb-sep">/</span> <span className="csn-breadcrumb-current">Monitoring Notes</span>
      </nav>

      <header className="ks-header">
        <div className="ks-header-id">
          <div className="dc-title">
            <FaHeadset style={{ color: "#2458ce" }} />
            <h1>Monitoring Notes Pelanggan</h1>
          </div>
          <span className="ks-header-sub">
            {nf(summary.total)} order dengan catatan — {nf(rows.filter(isFollowedUp).length)} sudah difollow-up, {nf(rows.length - rows.filter(isFollowedUp).length)} belum
          </span>
        </div>
        <div className="ks-header-actions">
          <div className="csn-settings-wrap">
            <button className="ks-btn" onClick={() => setSettingsOpen((o) => !o)} title="Pengaturan tampilan">
              <FaCog />
              <span>Pengaturan</span>
            </button>
            {settingsOpen && (
              <div className="csn-settings-panel">
                <div className="csn-settings-section">
                  <div className="csn-settings-title">Kolom Ditampilkan</div>
                  {OPTIONAL_COLUMNS.map((c) => (
                    <label key={c.key} className="csn-settings-check">
                      <input type="checkbox" checked={!!visibleCols[c.key]} onChange={() => toggleCol(c.key)} />
                      {c.label}
                    </label>
                  ))}
                </div>
                <div className="csn-settings-section">
                  <div className="csn-settings-title">Baris per Halaman</div>
                  <select className="csn-input" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                    {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <button className="ks-btn is-primary csn-settings-close" onClick={() => setSettingsOpen(false)}>Selesai</button>
              </div>
            )}
          </div>
          <button className="ks-btn" onClick={fetchNotes} disabled={loading}>
            <FaSyncAlt className={loading ? "is-spinning" : ""} />
            <span>Segarkan</span>
          </button>
        </div>
      </header>

      <main className="dc-main">
        {error && <div className="dc-error">{error}</div>}

        <section className="dc-card csn-filter-card">
          <div className="csn-filter-row">
            <div className="csn-filter-group">
              <span className="csn-filter-label">Tanggal Order</span>
              <div className="csn-date-range">
                <input type="date" className="csn-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <span className="csn-date-sep">–</span>
                <input type="date" className="csn-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <button className="ks-btn is-primary csn-filter-btn" onClick={fetchNotes} disabled={loading}>
              Tampilkan
            </button>
          </div>
        </section>

        <section className="dc-card csn-toolbar-card">
          <div className="csn-toolbar">
            <div className="csn-search-wrap csn-toolbar-search">
              <FaSearch className="csn-search-icon" />
              <input
                type="text"
                className="csn-input csn-search-input"
                placeholder="Cari teks catatan, order ID, toko, atau pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="csn-toolbar-spacer" />
            {bulkDone && <span className="csn-tag is-paid"><FaCheck size={10} /> Follow-up tersimpan</span>}
            <button className="ks-btn" onClick={() => setShowFilters(f => !f)} title="Sembunyikan/Tampilkan Filter">
              <FaLayerGroup size={12} /> {showFilters ? "Sembunyikan Filter" : "Tampilkan Filter"}
            </button>
            {!someSelected && (
              <>
                <button className="ks-btn" disabled={filtered.length === 0} onClick={exportCsv} title="Unduh baris yang sedang tampil sebagai CSV">
                  <FaDownload size={12} /> Export CSV ({nf(filtered.length)})
                </button>
                <button className="ks-btn" disabled={filtered.length === 0}
                  onClick={() => copy("__bulk", filtered.map((n) => n.order_number).join("\n"))}
                  title="Salin seluruh Order ID yang sedang tampil">
                  {copied === "__bulk" ? <><FaCheck size={12} /> Disalin!</> : <><FaCopy size={12} /> Salin {nf(filtered.length)} Order ID</>}
                </button>
              </>
            )}
          </div>

          {someSelected && (
            <div className="csn-selection-bar">
              <span className="csn-sel-count">{selected.size} dipilih</span>
              <span className="csn-sel-sep" />
              <span className="csn-sel-label">Set Follow-up CS:</span>
              <select className="csn-input" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} disabled={bulkSaving}>
                {FOLLOWUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input className="csn-input csn-sel-note" placeholder="Catatan (opsional)" value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} disabled={bulkSaving} />
              <button className="ks-btn is-primary" onClick={applyBulkFollowUp} disabled={bulkSaving}>
                {bulkSaving ? "Menyimpan…" : `Terapkan ke ${targetRows.length}`}
              </button>
              <span className="csn-sel-sep" />
              <button className="ks-btn" onClick={exportCsv} title="Unduh baris terpilih sebagai CSV">
                <FaDownload size={12} /> Export ({targetRows.length})
              </button>
              <button className="ks-btn" onClick={() => copy("__bulk", targetRows.map((n) => n.order_number).join("\n"))} title="Salin Order ID terpilih">
                {copied === "__bulk" ? <><FaCheck size={12} /> Disalin!</> : <><FaCopy size={12} /> Salin</>}
              </button>
              <button className="ks-btn" onClick={clearSelection}><FaTimes size={12} /> Batal</button>
            </div>
          )}

          {showFilters && (
            <div className="csn-chip-filters">
              <div className="csn-chip-row">
                <span className="csn-chip-label">Status Kirim</span>
                <div className="csn-chip-group">
                  <button onClick={() => setShip("ALL")} className={`csn-chip ${ship === "ALL" ? "is-active" : ""}`}>Semua ({nf(shipCounts.ALL)})</button>
                  <button onClick={() => setShip("BELUM")} className={`csn-chip ${ship === "BELUM" ? "is-active" : ""}`}>Belum Terkirim ({nf(shipCounts.BELUM)})</button>
                  <button onClick={() => setShip("SUDAH")} className={`csn-chip ${ship === "SUDAH" ? "is-active" : ""}`}>Terkirim ({nf(shipCounts.SUDAH)})</button>
                </div>
              </div>
              <div className="csn-chip-row">
                <span className="csn-chip-label">Follow-up CS</span>
                <div className="csn-chip-group">
                  <button onClick={() => setFu("ALL")} className={`csn-chip ${fu === "ALL" ? "is-active" : ""}`}>Semua ({nf(fuCounts.ALL)})</button>
                  <button onClick={() => setFu("PENDING")} className={`csn-chip ${fu === "PENDING" ? "is-active" : ""}`}>Belum di-follow-up ({nf(fuCounts.PENDING)})</button>
                  <button onClick={() => setFu("DONE")} className={`csn-chip ${fu === "DONE" ? "is-active" : ""}`}>Sudah di-follow-up ({nf(fuCounts.DONE)})</button>
                </div>
              </div>
              <div className="csn-chip-row">
                <span className="csn-chip-label">Kategori</span>
                <div className="csn-chip-group">
                  {availableTabs.map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`csn-chip ${tab === t ? "is-active" : ""}`}>
                      {tabLabel(t)} ({nf(getCount(t))})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="dc-kpi-row">
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-blue"><FaLayerGroup /></span>
              <span className="dc-kpi-label">Total Catatan</span>
            </div>
            <div className="dc-kpi-value">{nf(summary.total)}</div>
            <div className="dc-kpi-foot">Order dengan pesan pada rentang ini</div>
          </div>
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-green"><FaCommentDots /></span>
              <span className="dc-kpi-label">Pesan Pembeli</span>
            </div>
            <div className="dc-kpi-value">{nf(summary.buyer_message)}</div>
            <div className="dc-kpi-foot">Order dengan buyer message</div>
          </div>
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-purple"><FaStickyNote /></span>
              <span className="dc-kpi-label">Catatan Penjual</span>
            </div>
            <div className="dc-kpi-value">{nf(summary.seller_memo)}</div>
            <div className="dc-kpi-foot">Order dengan seller memo</div>
          </div>
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-orange"><FaHeadset /></span>
              <span className="dc-kpi-label">Ada Keduanya</span>
            </div>
            <div className="dc-kpi-value dc-val-orange">{nf(summary.both)}</div>
            <div className="dc-kpi-foot">Perlu perhatian ekstra</div>
          </div>
        </section>

        <section className="dc-card csn-table-card">
          {loading ? (
            <div className="dc-empty">Memuat catatan...</div>
          ) : filtered.length === 0 ? (
            <div className="dc-empty">Tidak ada catatan yang cocok dengan filter atau pencarian ini.</div>
          ) : (
            <div className="csn-table-wrapper">
              <table className="csn-table">
                <thead>
                  <tr>
                    <th className="csn-th-checkbox">
                      <input ref={headCbRef} type="checkbox" checked={allFilteredSelected} onChange={toggleAll} title="Pilih / batal semua hasil filter" />
                    </th>
                    {visibleCols.waktu && <th style={{ width: "8%" }}>Waktu</th>}
                    <th style={{ width: "9%" }}>No. Order</th>
                    {visibleCols.noResi && <th style={{ width: "8%" }}>No. Resi</th>}
                    {visibleCols.batasKirim && <th style={{ width: "8%" }}>Batas Kirim</th>}
                    <th style={{ width: "8%" }}>Pelanggan</th>
                    {visibleCols.toko && <th style={{ width: "6%" }}>Toko</th>}
                    {visibleCols.platform && <th style={{ width: "6%" }}>Platform</th>}
                    {visibleCols.provinsi && <th style={{ width: "7%" }}>Provinsi</th>}
                    <th style={{ width: "6%" }}>Status</th>
                    <th style={{ width: "14%" }}>Catatan Pembeli</th>
                    {visibleCols.catatanPenjual && <th style={{ width: "10%" }}>Catatan Penjual</th>}
                    {visibleCols.followUp && <th style={{ width: "10%" }}>Follow-up CS</th>}
                    <th style={{ width: "6%" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((n) => (
                    <tr key={n.id} className={`${isFollowedUp(n) ? "csn-row-followed" : ""} ${selected.has(n.id) ? "csn-row-selected" : ""}`}>
                      <td className="csn-td-mid csn-td-center">
                        <input type="checkbox" checked={selected.has(n.id)} onChange={() => toggleRow(n.id)} title="Pilih baris ini" />
                      </td>
                      {visibleCols.waktu && <td className="csn-td-mid"><div className="csn-datetime">{formatDateTime(n.order_date)}</div></td>}
                      <td className="csn-td-mid"><div className="csn-order-id">{n.order_number || "-"}</div></td>
                      {visibleCols.noResi && <td className="csn-td-mid"><div className="csn-tracking">{n.tracking_number || "-"}</div></td>}
                      {visibleCols.batasKirim && <td className="csn-td-mid"><div className="csn-datetime">{formatDateTime(n.shipping_deadline)}</div></td>}
                      <td className="csn-td-mid"><div className="csn-order-id">{n.customer_name || "-"}</div></td>
                      {visibleCols.toko && <td className="csn-td-mid"><span className="csn-platform">{n.store || "Lainnya"}</span></td>}
                      {visibleCols.platform && <td className="csn-td-mid"><span className="csn-platform">{n.platform || "-"}</span></td>}
                      {visibleCols.provinsi && <td className="csn-td-mid"><span className="csn-muted">{n.province || "—"}</span></td>}
                      <td className="csn-td-mid"><span className={`csn-tag ${statusTagClass(n.status)}`}>{statusLabel(n.status) || "-"}</span></td>
                      <td>
                        {n.buyer_message ? (
                          <>
                            <div className="csn-classify-row">
                              <span className={`csn-classify-tag ${n.color_mismatch ? "is-mismatch" : n.is_color_request ? "is-color" : n.is_date_request ? "is-date" : "is-general"}`}>
                                {n.is_date_request && <>📅 {n.extracted_date}</>}
                                {n.is_color_request && !n.is_date_request && (
                                  <><FaPalette size={9} /> Minta: {n.requested_colors.join(", ")}</>
                                )}
                                {!n.is_date_request && !n.is_color_request && "Catatan Biasa"}
                              </span>
                              {n.color_mismatch && (
                                <span className="csn-classify-tag is-mismatch">
                                  <FaExclamationTriangle size={9} /> Tidak ada di SKU: {n.mismatch_colors.join(", ")}
                                </span>
                              )}
                            </div>
                            <div className="csn-message-text" title={n.buyer_message}>&ldquo;{n.buyer_message}&rdquo;</div>
                          </>
                        ) : <span className="csn-muted">—</span>}
                        {n.items && n.items.length > 0 && (
                          <div className="csn-produk-box">
                            <div className="csn-produk-head"><FaBoxOpen size={11} /> Produk Dipesan:</div>
                            <ul className="csn-produk-list">
                              {n.items.map((item, idx) => <li key={idx}>{item.quantity}x {item.sku || "NO-SKU"}</li>)}
                            </ul>
                          </div>
                        )}
                      </td>
                      {visibleCols.catatanPenjual && <td>{n.seller_memo ? <div className="csn-message-text" title={n.seller_memo}>{n.seller_memo}</div> : <span className="csn-muted">—</span>}</td>}
                      {visibleCols.followUp && <td><FollowUpCell row={n} onSaved={handleFollowUpSaved} /></td>}
                      <td className="csn-td-mid csn-td-center">
                        <button className="ks-btn" onClick={() => copy(n.order_number, n.order_number)} title="Salin Order ID">
                          {copied === n.order_number ? <><FaCheck size={11} /> OK</> : <><FaCopy size={11} /> Salin</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="csn-pagination">
              <span className="csn-pagination-label">
                Menampilkan <b>{pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)}</b> dari <b>{nf(filtered.length)}</b> catatan
              </span>
              <div className="csn-pagination-nav">
                <button className="ks-btn" disabled={safePage <= 1} onClick={() => setPage(1)} title="Halaman pertama"><FaAngleDoubleLeft size={11} /></button>
                <button className="ks-btn" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><FaChevronLeft size={11} /> Sebelumnya</button>
                <span className="csn-pagination-page">Hal {safePage} / {totalPages}</span>
                <button className="ks-btn" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Berikutnya <FaChevronRight size={11} /></button>
                <button className="ks-btn" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)} title="Halaman terakhir"><FaAngleDoubleRight size={11} /></button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default CustomerService;

import React, { useEffect, useState } from "react";
import API from "../../api";
import dayjs from "dayjs";
import "../Cutting/SpkCutting/DashboardCutting.css";
import "./CustomerService.css";
import {
  FaHeadset, FaSyncAlt, FaSearch, FaCommentDots, FaStickyNote, FaLayerGroup,
} from "react-icons/fa";

const PER_PAGE_OPTIONS = [25, 50, 100];
const TYPE_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "buyer", label: "Pesan Pembeli" },
  { value: "seller", label: "Catatan Penjual" },
];

const nf = (value) => Number(value || 0).toLocaleString("id-ID");

const formatDateTime = (value) => (value ? dayjs(value).format("DD MMM YYYY : HH:mm") : "-");

const DATE_REQUEST_KEYWORDS = [
  "tanggal", "tgl", "besok", "lusa", "hari ini", "minggu depan", "bulan depan",
  "senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu",
  "januari", "februari", "maret", "april", "mei", "juni", "juli",
  "agustus", "september", "oktober", "november", "desember",
  "paling lambat", "sebelum jam", "sebelum tanggal", "deadline", "sampai jam", "sampai tanggal",
];
const DATE_REQUEST_PATTERN = /\b\d{1,2}\s*[/-]\s*\d{1,2}\b/;

const COLOR_REQUEST_KEYWORDS = [
  "warna", "warnanya", "hitam", "putih", "merah", "biru", "hijau", "kuning",
  "coklat", "cokelat", "abu-abu", "abu2", "pink", "ungu", "oren", "orange",
  "navy", "cream", "krem", "silver", "emas", "gold", "maroon", "tosca", "toska",
  "salem", "dusty", "baby blue", "babyblue", "army", "olive", "milo", "mocca",
];

const classifyBuyerMessage = (message) => {
  if (!message || !message.trim()) return [];
  const text = message.toLowerCase();
  const tags = [];
  if (DATE_REQUEST_KEYWORDS.some((k) => text.includes(k)) || DATE_REQUEST_PATTERN.test(text)) {
    tags.push("Request Tanggal");
  }
  if (COLOR_REQUEST_KEYWORDS.some((k) => text.includes(k))) {
    tags.push("Request Warna");
  }
  if (tags.length === 0) tags.push("Catatan Biasa");
  return tags;
};

const CLASSIFICATION_CLASS = {
  "Request Tanggal": "is-date",
  "Request Warna": "is-color",
  "Catatan Biasa": "is-general",
};

const CLASSIFY_FILTER_OPTIONS = [
  { value: "all", label: "Semua Klasifikasi" },
  { value: "Request Tanggal", label: "Request Tanggal" },
  { value: "Request Warna", label: "Request Warna" },
  { value: "Catatan Biasa", label: "Catatan Biasa" },
];

const CustomerService = () => {
  const [startDate, setStartDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [classifyFilter, setClassifyFilter] = useState("all");
  const [perPage, setPerPage] = useState(25);

  const [notes, setNotes] = useState([]);
  const [summary, setSummary] = useState({ total: 0, buyer_message: 0, seller_memo: 0, both: 0 });
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotes = async (page = 1, pageSize = perPage) => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/orders/customer-notes", {
        params: {
          start_date: startDate,
          end_date: endDate,
          search: search || undefined,
          type,
          per_page: pageSize,
          page,
        },
      });
      setNotes(Array.isArray(res.data.data) ? res.data.data : []);
      setSummary(res.data.summary || { total: 0, buyer_message: 0, seller_memo: 0, both: 0 });
      setPagination({
        current_page: res.data.current_page || 1,
        last_page: res.data.last_page || 1,
      });
    } catch (err) {
      setNotes([]);
      setError(err?.response?.data?.message || "Gagal memuat catatan pelanggan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes(1, perPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = () => fetchNotes(1, perPage);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFilter();
    }
  };

  const handlePerPageChange = (e) => {
    const next = Number(e.target.value) || 25;
    setPerPage(next);
    fetchNotes(1, next);
  };

  const visibleNotes = classifyFilter === "all"
    ? notes
    : notes.filter((note) => classifyBuyerMessage(note.buyer_message).includes(classifyFilter));

  return (
    <div className="ks-page dc-page csn-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <div className="dc-title">
            <FaHeadset style={{ color: "#2458ce" }} />
            <h1>Monitoring Notes Pelanggan</h1>
          </div>
          <span className="ks-header-sub">Pesan pembeli & catatan penjual hasil sync Ginee per order</span>
        </div>
        <div className="ks-header-actions">
          <button className="ks-btn" onClick={() => fetchNotes(pagination.current_page, perPage)} disabled={loading}>
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
            <div className="csn-filter-group csn-filter-grow">
              <span className="csn-filter-label">Cari</span>
              <div className="csn-search-wrap">
                <FaSearch className="csn-search-icon" />
                <input
                  type="text"
                  className="csn-input csn-search-input"
                  placeholder="No. Order / Resi / Pelanggan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            </div>
            <div className="csn-filter-group">
              <span className="csn-filter-label">Tipe Catatan</span>
              <select className="csn-input csn-select" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="csn-filter-group">
              <span className="csn-filter-label">Klasifikasi Pesan</span>
              <select className="csn-input csn-select" value={classifyFilter} onChange={(e) => setClassifyFilter(e.target.value)}>
                {CLASSIFY_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <button className="ks-btn is-primary csn-filter-btn" onClick={handleFilter} disabled={loading}>
              Tampilkan
            </button>
          </div>
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
          ) : notes.length === 0 ? (
            <div className="dc-empty">Tidak ada catatan pelanggan pada filter ini.</div>
          ) : visibleNotes.length === 0 ? (
            <div className="dc-empty">Tidak ada pesan dengan klasifikasi "{classifyFilter}" pada halaman ini.</div>
          ) : (
            <div className="csn-order-list">
              {visibleNotes.map((note) => (
                <article key={note.id} className="csn-order-card">
                  <div className="csn-order-layer csn-layer-1">
                    <div className="csn-field csn-field-order">
                      <span className="csn-field-label">Order</span>
                      <span className="csn-field-value csn-strong">{note.order_number || "-"}</span>
                    </div>
                    <div className="csn-field">
                      <span className="csn-field-label">Pelanggan</span>
                      <span className="csn-field-value">{note.customer_name || "-"}</span>
                    </div>
                    <div className="csn-field">
                      <span className="csn-field-label">Resi</span>
                      <span className="csn-field-value csn-mono">{note.tracking_number || "-"}</span>
                    </div>
                    <div className="csn-field">
                      <span className="csn-field-label">Status</span>
                      <span className="csn-tag">{note.status || "-"}</span>
                    </div>
                    <div className="csn-field">
                      <span className="csn-field-label">Platform</span>
                      <span className="csn-field-value">{note.platform || "-"}</span>
                    </div>
                  </div>

                  <div className="csn-order-layer csn-layer-2">
                    <div className="csn-field">
                      <span className="csn-field-label">Tanggal Order</span>
                      <span className="csn-field-value csn-muted">{formatDateTime(note.order_date)}</span>
                    </div>
                    <div className="csn-field">
                      <span className="csn-field-label">Batas Kirim</span>
                      <span className="csn-field-value csn-muted">{formatDateTime(note.shipping_deadline)}</span>
                    </div>
                    <div className="csn-field csn-field-product">
                      <span className="csn-field-label">Product</span>
                      {note.items && note.items.length > 0 ? (
                        <ul className="csn-product-list">
                          {note.items.map((item, idx) => (
                            <li key={idx}>
                              {item.product_name || item.sku || "-"}
                              {item.quantity ? <span className="csn-qty"> ×{item.quantity}</span> : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="csn-field-value csn-muted">—</span>
                      )}
                    </div>
                    <div className="csn-field csn-field-note">
                      <span className="csn-field-label">Pesan Pembeli</span>
                      {note.buyer_message ? (
                        <>
                          <div className="csn-classify-row">
                            {classifyBuyerMessage(note.buyer_message).map((tag) => (
                              <span key={tag} className={`csn-classify-tag ${CLASSIFICATION_CLASS[tag] || "is-general"}`}>{tag}</span>
                            ))}
                          </div>
                          <span className="csn-field-value">{note.buyer_message}</span>
                        </>
                      ) : (
                        <span className="csn-field-value csn-muted">—</span>
                      )}
                    </div>
                    <div className="csn-field csn-field-note">
                      <span className="csn-field-label">Catatan Penjual</span>
                      <span className="csn-field-value">{note.seller_memo || <span className="csn-muted">—</span>}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="csn-pagination">
            <div className="csn-pagination-size">
              <span>Tampilkan</span>
              <select className="csn-input csn-select" value={perPage} onChange={handlePerPageChange} disabled={loading}>
                {PER_PAGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <span>per halaman</span>
            </div>
            <div className="csn-pagination-nav">
              <button
                className="ks-btn"
                disabled={pagination.current_page <= 1 || loading}
                onClick={() => fetchNotes(pagination.current_page - 1, perPage)}
              >
                Prev
              </button>
              <span className="csn-pagination-label">Hal {pagination.current_page} / {pagination.last_page}</span>
              <button
                className="ks-btn"
                disabled={pagination.current_page >= pagination.last_page || loading}
                onClick={() => fetchNotes(pagination.current_page + 1, perPage)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CustomerService;

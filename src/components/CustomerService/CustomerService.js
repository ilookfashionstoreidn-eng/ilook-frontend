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

const CustomerService = () => {
  const [startDate, setStartDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
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
          <div className="dc-table-wrap">
            <table className="dc-grid">
              <thead>
                <tr>
                  <th>No. Order</th>
                  <th>No. Resi</th>
                  <th>Pelanggan</th>
                  <th>Platform</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th>Tanggal Order</th>
                  <th>Pesan Pembeli</th>
                  <th>Catatan Penjual</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="dc-empty">Memuat catatan...</td></tr>
                ) : notes.length === 0 ? (
                  <tr><td colSpan={8} className="dc-empty">Tidak ada catatan pelanggan pada filter ini.</td></tr>
                ) : (
                  notes.map((note) => (
                    <tr key={note.id}>
                      <td className="csn-strong">{note.order_number || "-"}</td>
                      <td className="csn-mono">{note.tracking_number || "-"}</td>
                      <td>{note.customer_name || "-"}</td>
                      <td>{note.platform || "-"}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className="csn-tag">{note.status || "-"}</span>
                      </td>
                      <td className="csn-muted">{note.order_date ? dayjs(note.order_date).format("DD MMM YYYY") : "-"}</td>
                      <td className="csn-note-cell">
                        {note.buyer_message ? <span title={note.buyer_message}>{note.buyer_message}</span> : <span className="csn-muted">—</span>}
                      </td>
                      <td className="csn-note-cell">
                        {note.seller_memo ? <span title={note.seller_memo}>{note.seller_memo}</span> : <span className="csn-muted">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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

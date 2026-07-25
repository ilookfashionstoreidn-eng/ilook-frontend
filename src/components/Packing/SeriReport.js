import React, { useCallback, useEffect, useState } from "react";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import "./SeriReport.css";
import API from "../../api";
import {
  FiBarChart2, FiFilter, FiRefreshCw, FiChevronDown, FiChevronRight,
  FiDownload, FiCalendar, FiLayers, FiTag
} from "react-icons/fi";
import dayjs from "dayjs";

const SOURCE_OPTIONS = [
  { value: "all", label: "Semua Sumber" },
  { value: "Pengiriman CMT", label: "Pengiriman CMT" },
  { value: "Form Seri", label: "Form Seri" },
];

const GROUP_OPTIONS = [
  { value: "nomor_seri", label: "Per Nomor Seri" },
  { value: "sku", label: "Per SKU" },
  { value: "date", label: "Per Tanggal" },
];

const pctTone = (pct) => {
  if (pct >= 100) return "tone-safe";
  if (pct >= 50) return "tone-warning";
  return "tone-overdue";
};

const SeriReport = () => {
  const today = dayjs().format("YYYY-MM-DD");
  const thirtyDaysAgo = dayjs().subtract(30, "day").format("YYYY-MM-DD");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});

  const [filters, setFilters] = useState({
    date_from: thirtyDaysAgo,
    date_to: today,
    source: "all",
    group_by: "nomor_seri",
  });

  const fetchReport = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.date_from) params.append("date_from", f.date_from);
      if (f.date_to) params.append("date_to", f.date_to);
      if (f.source && f.source !== "all") params.append("source", f.source);
      params.append("group_by", f.group_by);

      const res = await API.get(`/seri/report?${params.toString()}`);
      setSummary(res.data.summary);
      const rows = res.data.data || [];
      setData(rows);
      // Auto-expand first 5
      const exp = {};
      rows.slice(0, 5).forEach((g) => { exp[g.group_key] = true; });
      setExpandedGroups(exp);
    } catch (err) {
      console.error("Gagal load report:", err);
      setError(err?.response?.data?.message || "Gagal memuat laporan. Pastikan server backend aktif.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(filters); }, []); // eslint-disable-line

  const handleFilter = () => fetchReport(filters);

  const toggleGroup = (key) =>
    setExpandedGroups((p) => ({ ...p, [key]: !p[key] }));

  const expandAll  = () => { const e = {}; data.forEach((g) => (e[g.group_key] = true));  setExpandedGroups(e); };
  const collapseAll = () => setExpandedGroups({});

  const exportCsv = () => {
    let csv = "Nomor Seri,SKU,Jumlah,Scanned,Belum Scan,Progress (%),Sumber,Tanggal\n";
    data.forEach((g) =>
      (g.rows || []).forEach((r) => {
        csv += `${r.nomor_seri},${r.sku},${r.jumlah},${r.scanned},${r.unscanned},${r.pct},${r.source},${dayjs(r.created_at).format("DD-MM-YYYY")}\n`;
      })
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `laporan-seri-${today}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ks-page">

      {/* ── Header ── */}
      <div className="ks-header">
        <div className="ks-header-id">
          <h1>Laporan &amp; Controlling Seri</h1>
          <span className="ks-header-sub">Monitor progres scan QR per nomor seri, SKU, dan sumber pembuatan</span>
        </div>
        <div className="ks-header-actions">
          <button className="ks-btn" onClick={exportCsv}>
            <FiDownload size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Stat Rail ── */}
      {summary && (
        <div className="ks-statrail">
          <div className="ks-stat">
            <span className="ks-stat-label">Total Barang</span>
            <span className="ks-stat-value">{summary.total_barang.toLocaleString()}</span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">Sudah Di-scan</span>
            <span className="ks-stat-value tone-safe">{summary.total_scanned.toLocaleString()}</span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">Belum Di-scan</span>
            <span className="ks-stat-value tone-overdue">{summary.total_unscanned.toLocaleString()}</span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">Progress Scan</span>
            <span className={`ks-stat-value ${pctTone(summary.pct_scanned)}`}>{summary.pct_scanned}%</span>
          </div>
          {Object.entries(summary.by_source || {}).map(([src, s]) => (
            <div className="ks-stat" key={src}>
              <span className="ks-stat-label">{src === "Pengiriman CMT" ? "📦" : "📝"} {src}</span>
              <span className="ks-stat-value">{s.jumlah.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Board ── */}
      <div className="ks-board">

        {/* Toolbar / Filters */}
        <div className="ks-toolbar sr-toolbar">
          <FiCalendar size={13} style={{ color: "var(--ks-muted)" }} />
          <input
            type="date"
            className="sr-date-input"
            value={filters.date_from}
            onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))}
          />
          <span style={{ fontSize: 12, color: "var(--ks-muted)" }}>—</span>
          <input
            type="date"
            className="sr-date-input"
            value={filters.date_to}
            onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))}
          />

          <FiTag size={13} style={{ color: "var(--ks-muted)", marginLeft: 8 }} />
          <select
            className="sr-select"
            value={filters.source}
            onChange={(e) => setFilters((p) => ({ ...p, source: e.target.value }))}
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <FiLayers size={13} style={{ color: "var(--ks-muted)", marginLeft: 8 }} />
          <select
            className="sr-select"
            value={filters.group_by}
            onChange={(e) => setFilters((p) => ({ ...p, group_by: e.target.value }))}
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            className="ks-btn is-primary"
            onClick={handleFilter}
            disabled={loading}
            style={{ marginLeft: 4 }}
          >
            {loading ? <FiRefreshCw size={13} className="is-spinning" /> : <FiFilter size={13} />}
            {loading ? "Loading…" : "Tampilkan"}
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {data.length > 0 && (
            <div style={{ display: "flex", gap: 6 }}>
              <button className="ks-btn" onClick={expandAll}>Buka Semua</button>
              <button className="ks-btn" onClick={collapseAll}>Tutup Semua</button>
            </div>
          )}
        </div>

        {/* Overall progress bar */}
        {summary && summary.total_barang > 0 && (
          <div className="sr-overall-bar-wrap">
            <div className="sr-overall-bar-track">
              <div
                className={`sr-overall-bar-fill sr-bar-${pctTone(summary.pct_scanned)}`}
                style={{ width: `${summary.pct_scanned}%` }}
              />
            </div>
            <span className={`sr-overall-pct ks-run ${pctTone(summary.pct_scanned)}`}>
              {summary.pct_scanned}% terscan
            </span>
          </div>
        )}

        {/* Group Accordion Table */}
        <div className="ks-grid-scroll">
          {loading && (
            <div style={{ padding: "12px 0" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="sr-group-header" style={{ cursor: "default", opacity: 0.5 }}>
                  <div className="sr-group-left">
                    <div style={{ width: 14, height: 14, background: "var(--ks-line-strong)", borderRadius: 3 }} />
                    <div style={{ width: 120, height: 13, background: "var(--ks-line-strong)", borderRadius: 4 }} />
                    <div style={{ width: 50, height: 20, background: "var(--ks-line)", borderRadius: 5 }} />
                  </div>
                  <div className="sr-group-right">
                    <div className="sr-mini-bar-track"><div className="sr-mini-bar-fill sr-bar-tone-warning" style={{ width: "60%" }} /></div>
                    <div style={{ width: 40, height: 13, background: "var(--ks-line-strong)", borderRadius: 4 }} />
                    <div style={{ width: 80, height: 13, background: "var(--ks-line)", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="ks-empty">
              <FiRefreshCw size={28} style={{ color: "var(--ks-overdue)" }} />
              <p style={{ color: "var(--ks-overdue)", fontWeight: 600 }}>{error}</p>
              <button className="ks-btn is-primary" onClick={handleFilter} style={{ marginTop: 8 }}>
                Coba Lagi
              </button>
            </div>
          )}

          {!error && data.length === 0 && !loading && (
            <div className="ks-empty">
              <FiBarChart2 size={32} />
              <p>Tidak ada data pada filter yang dipilih.<br />Coba ubah rentang tanggal atau sumber.</p>
            </div>
          )}

          {data.map((group) => {
            const isOpen = !!expandedGroups[group.group_key];
            return (
              <div className="sr-group" key={group.group_key}>

                {/* Group header row */}
                <div
                  className="sr-group-header"
                  onClick={() => toggleGroup(group.group_key)}
                  role="button"
                >
                  <div className="sr-group-left">
                    {isOpen
                      ? <FiChevronDown size={14} style={{ color: "var(--ks-muted)", flexShrink: 0 }} />
                      : <FiChevronRight size={14} style={{ color: "var(--ks-muted)", flexShrink: 0 }} />
                    }
                    <span className="ks-cell-code sr-group-key">{group.group_key}</span>
                    <span className="ks-tag is-belum" style={{ marginLeft: 6 }}>{group.rows?.length} SKU</span>
                  </div>
                  <div className="sr-group-right">
                    <div className="sr-mini-bar-track">
                      <div
                        className={`sr-mini-bar-fill sr-bar-${pctTone(group.pct)}`}
                        style={{ width: `${group.pct}%` }}
                      />
                    </div>
                    <span className={`ks-run ${pctTone(group.pct)}`} style={{ minWidth: 42, textAlign: "right" }}>
                      {group.pct}%
                    </span>
                    <span style={{ fontSize: 12, color: "var(--ks-muted)", minWidth: 90, textAlign: "right" }}>
                      {group.scanned}/{group.total} scan
                    </span>
                  </div>
                </div>

                {/* Detail table (expanded) */}
                {isOpen && (
                  <table className="ks-grid sr-detail-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>No</th>
                        <th>Nomor Seri</th>
                        <th>SKU</th>
                        <th className="align-right">Jumlah</th>
                        <th className="align-right">Scanned</th>
                        <th className="align-right">Belum</th>
                        <th style={{ width: 160 }}>Progress</th>
                        <th>Sumber</th>
                        <th>Tanggal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows?.map((r, i) => (
                        <tr key={r.id}>
                          <td style={{ color: "var(--ks-muted)", textAlign: "center" }}>{i + 1}</td>
                          <td>
                            <div className="seri-serial">
                              <span className="seri-serial-dot" />
                              <span className="seri-serial-text">{r.nomor_seri}</span>
                            </div>
                          </td>
                          <td>
                            <span className="seri-sku-chip">{r.sku}</span>
                          </td>
                          <td className="align-right ks-cell-num">{r.jumlah}</td>
                          <td className="align-right">
                            <span className={`ks-run ${r.scanned > 0 ? "tone-safe" : "tone-none"}`}>{r.scanned}</span>
                          </td>
                          <td className="align-right">
                            <span className={`ks-run ${r.unscanned > 0 ? "tone-overdue" : "tone-safe"}`}>{r.unscanned}</span>
                          </td>
                          <td>
                            <div className="sr-row-bar-wrap">
                              <div className="sr-row-bar-track">
                                <div
                                  className={`sr-row-bar-fill sr-bar-${pctTone(r.pct)}`}
                                  style={{ width: `${r.pct}%` }}
                                />
                              </div>
                              <span className={`ks-run ${pctTone(r.pct)}`} style={{ minWidth: 38 }}>{r.pct}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`ks-tag ${r.source === "Pengiriman CMT" ? "is-cmt" : "is-belum"}`}>
                              {r.source === "Pengiriman CMT" ? "📦 CMT" : "📝 Form"}
                            </span>
                          </td>
                          <td className="seri-date">{dayjs(r.created_at).format("DD/MM/YY")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="sr-foot-row">
                        <td colSpan={3}><strong>Total</strong></td>
                        <td className="align-right"><strong>{group.total}</strong></td>
                        <td className="align-right"><strong className="ks-run tone-safe">{group.scanned}</strong></td>
                        <td className="align-right"><strong className="ks-run tone-overdue">{group.total - group.scanned}</strong></td>
                        <td colSpan={3}>
                          <strong className={`ks-run ${pctTone(group.pct)}`}>{group.pct}%</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer count */}
        {data.length > 0 && (
          <div className="ks-footer">
            <div className="ks-footer-info">
              <span>{data.length} kelompok</span>
              {summary && <span>{summary.total_seri} baris seri</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriReport;

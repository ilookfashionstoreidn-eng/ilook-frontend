import React, { useEffect, useMemo, useState } from "react";
import "./DashboardCutting.css";
import API from "../../../api";
import { Line, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import {
  FaCalendarAlt, FaExclamationTriangle, FaClock, FaBoxOpen, FaFire,
  FaArrowUp, FaArrowDown, FaMinus, FaSyncAlt, FaBullseye, FaLayerGroup,
} from "react-icons/fa";

const formatDateParam = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatLongDate = (date) =>
  date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value || 0);

const nf = (value) => Number(value || 0).toLocaleString("id-ID");

const createEmptySummary = () => ({
  all: 0,
  belum_diambil: { count: 0, total_asumsi_produk: 0 },
  sudah_diambil: 0,
  selesai: 0,
  chart_data: [],
});

const DashboardCutting = () => {
  const [summary, setSummary] = useState(createEmptySummary);
  const [spkList, setSpkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceRange, setPerformanceRange] = useState("today");
  const [incomeList, setIncomeList] = useState([]);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cuttingStats, setCuttingStats] = useState({
    monthly_target: 250000, monthly_total: 0,
    weekly_target: 50000, weekly_total: 0,
    daily_target: 8333, daily_total: 0,
  });

  const today = useMemo(() => new Date(), []);

  const getRangeForType = (type) => {
    const base = new Date(today);
    if (type === "today") {
      const s = formatDateParam(base);
      return { start: s, end: s };
    }
    if (type === "week") {
      const off = (base.getDay() + 6) % 7;
      const start = new Date(base); start.setDate(base.getDate() - off);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return { start: formatDateParam(start), end: formatDateParam(end) };
    }
    const ms = new Date(base.getFullYear(), base.getMonth(), 1);
    const me = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return { start: formatDateParam(ms), end: formatDateParam(me) };
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true); setError(null);
      const dateStr = formatDateParam(today);
      const range = getRangeForType("week");
      const params = { per_page: 100, progress_status: "belum_diambil", start_date: dateStr, end_date: dateStr, daily_date: dateStr, weekly_start: range.start, weekly_end: range.end };
      const res = await API.get("/spk_cutting", { params });
      const payload = res.data || {};
      setSummary(payload.summary || createEmptySummary());
      setSpkList(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal memuat data");
      setSummary(createEmptySummary());
      setSpkList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    try {
      setPerformanceLoading(true);
      const range = getRangeForType(performanceRange);
      const params = { per_page: 500 };
      if (performanceRange === "today") params.daily_date = range.start;
      else { params.weekly_start = range.start; params.weekly_end = range.end; }
      const res = await API.get("/hasil_cutting", { params });
      const raw = res.data?.data || [];
      const grouped = {};
      raw.forEach((item) => {
        const id = item.tukang_cutting_id || "unknown";
        if (!grouped[id]) grouped[id] = { tukang_cutting_id: id, nama_tukang_cutting: item.nama_tukang_cutting || "-", spk_ids: new Set(), total_produk: 0 };
        if (item.spk_cutting_id) grouped[id].spk_ids.add(item.spk_cutting_id);
        grouped[id].total_produk += item.total_produk || 0;
      });
      setPerformance(
        Object.values(grouped)
          .map(i => ({ ...i, jumlah_spk: i.spk_ids.size }))
          .filter(i => i.jumlah_spk > 0 && i.total_produk > 0)
          .sort((a, b) => b.total_produk - a.total_produk)
          .slice(0, 6)
      );
    } catch { setPerformance([]); } finally { setPerformanceLoading(false); }
  };

  const fetchCuttingStats = async () => {
    try {
      const res = await API.get("/hasil_cutting");
      const s = res.data?.stats || {};
      setCuttingStats(prev => ({
        monthly_target: s.monthly_target ?? prev.monthly_target,
        monthly_total: s.monthly_total ?? prev.monthly_total,
        weekly_target: s.weekly_target ?? prev.weekly_target,
        weekly_total: s.weekly_total ?? prev.weekly_total,
        daily_target: s.daily_target ?? prev.daily_target,
        daily_total: s.daily_total ?? prev.daily_total,
      }));
    } catch {}
  };

  const fetchIncomeWeekly = async () => {
    try {
      setIncomeLoading(true);
      const range = getRangeForType("week");
      const res = await API.get("/pendapatan/mingguan/cutting", { params: { start_date: range.start, end_date: range.end } });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setIncomeList(data.map(i => ({ tukang_cutting_id: i.tukang_cutting_id, nama_tukang_cutting: i.nama_tukang_cutting ?? "-", total_transfer: i.total_transfer ?? 0 })).filter(i => i.total_transfer > 0).sort((a, b) => b.total_transfer - a.total_transfer).slice(0, 6));
    } catch { setIncomeList([]); } finally { setIncomeLoading(false); }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchCuttingStats(), fetchPerformance(), fetchIncomeWeekly()]);
    setRefreshing(false);
  };

  useEffect(() => { fetchDashboard(); fetchCuttingStats(); fetchIncomeWeekly(); }, []);
  useEffect(() => { fetchPerformance(); }, [performanceRange]);

  // ── Derived values ──
  const totalBelum = summary.belum_diambil?.count || 0;
  const totalBelumQty = summary.belum_diambil?.total_asumsi_produk || 0;
  const totalProses = summary.sudah_diambil || 0;
  const totalSelesai = summary.selesai || 0;
  const totalSpk = summary.all || 0;
  const completionPct = totalSpk > 0 ? (totalSelesai / totalSpk) * 100 : 0;

  const dailyTotal = cuttingStats.daily_total || 0;
  const dailyTarget = cuttingStats.daily_target || 8333;
  const dailyPct = dailyTarget > 0 ? Math.min(100, (dailyTotal / dailyTarget) * 100) : 0;
  const dailyRemaining = Math.max(0, dailyTarget - dailyTotal);

  const weeklyTotal = cuttingStats.weekly_total || 0;
  const weeklyTarget = cuttingStats.weekly_target || 50000;
  const weeklyPct = weeklyTarget > 0 ? Math.min(100, (weeklyTotal / weeklyTarget) * 100) : 0;
  const weeklyRemaining = Math.max(0, weeklyTarget - weeklyTotal);

  const monthlyTotal = cuttingStats.monthly_total || 0;
  const monthlyTarget = cuttingStats.monthly_target || 250000;
  const monthlyPct = monthlyTarget > 0 ? Math.min(100, (monthlyTotal / monthlyTarget) * 100) : 0;

  // Monthly projection (analytics): extrapolate current pace to end of month
  const projection = useMemo(() => {
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const projected = dayOfMonth > 0 ? Math.round((monthlyTotal / dayOfMonth) * daysInMonth) : 0;
    const onTrack = projected >= monthlyTarget;
    const daysLeft = daysInMonth - dayOfMonth;
    const remaining = Math.max(0, monthlyTarget - monthlyTotal);
    const paceNeeded = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;
    return { projected, onTrack, paceNeeded, daysLeft };
  }, [monthlyTotal, monthlyTarget, today]);

  // ── Deadline urgency from spkList (belum diambil) ──
  const deadlineGroups = useMemo(() => {
    const over = [], urgent = [], safe = [];
    spkList.forEach(item => {
      if (item.sisa_hari === null || item.sisa_hari === undefined) return;
      if (item.sisa_hari < 0) over.push(item);
      else if (item.sisa_hari <= 7) urgent.push(item);
      else safe.push(item);
    });
    over.sort((a, b) => a.sisa_hari - b.sisa_hari);
    urgent.sort((a, b) => a.sisa_hari - b.sisa_hari);
    return { over, urgent, safe };
  }, [spkList]);

  const alertItems = useMemo(() => [...deadlineGroups.over, ...deadlineGroups.urgent].slice(0, 8), [deadlineGroups]);

  // ── Trend analytics from chart_data (14 days) ──
  const trend = useMemo(() => {
    const raw = Array.isArray(summary.chart_data) ? summary.chart_data : [];
    if (raw.length === 0) return null;
    const vals = raw.map(i => Number(i.total_qty) || 0);
    if (!vals.some(v => v > 0)) return null;
    const total = vals.reduce((a, b) => a + b, 0);
    const avg = Math.round(total / vals.length);
    const max = Math.max(...vals);
    const maxIdx = vals.indexOf(max);
    const last = vals[vals.length - 1] ?? 0;
    const prev = vals[vals.length - 2] ?? 0;
    const delta = last - prev;
    const deltaPct = prev > 0 ? (delta / prev) * 100 : null;
    return { raw, vals, total, avg, max, bestDate: raw[maxIdx]?.date, delta, deltaPct };
  }, [summary]);

  const trendChartData = useMemo(() => {
    if (!trend) return null;
    const labels = trend.raw.map(i => new Date(i.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }));
    return {
      labels,
      datasets: [
        {
          label: "Volume", data: trend.vals,
          borderColor: "#2458ce", backgroundColor: (ctx) => {
            const { chart } = ctx;
            const g = chart.ctx.createLinearGradient(0, 0, 0, chart.height);
            g.addColorStop(0, "rgba(36,88,206,0.18)");
            g.addColorStop(1, "rgba(36,88,206,0)");
            return g;
          },
          borderWidth: 2.5, fill: true, tension: 0.4,
          pointRadius: 0, pointHoverRadius: 6, pointBackgroundColor: "#2458ce", pointHoverBorderColor: "#fff", pointHoverBorderWidth: 2,
        },
        {
          label: "Rata² 14h", data: trend.raw.map(() => trend.avg),
          borderColor: "rgba(148,163,184,0.8)", borderWidth: 1.5, borderDash: [5, 4],
          fill: false, pointRadius: 0, tension: 0,
        },
      ],
    };
  }, [trend]);

  const chartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1c1c1f", padding: 10, cornerRadius: 8, titleFont: { size: 12 }, bodyFont: { size: 12 },
        callbacks: { label: ctx => `${ctx.dataset.label}: ${nf(ctx.parsed.y)} pcs` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#9a9aa3", font: { size: 10.5 } } },
      y: { beginAtZero: true, grid: { color: "rgba(148,163,184,0.12)" }, ticks: { color: "#9a9aa3", font: { size: 10.5 }, maxTicksLimit: 5 } },
    },
  }), []);

  // ── Status distribution donut ──
  const donutData = useMemo(() => ({
    labels: ["Antrian", "Proses", "Selesai"],
    datasets: [{
      data: [totalBelum, totalProses, totalSelesai],
      backgroundColor: ["#f59e0b", "#2458ce", "#22c55e"],
      borderWidth: 0, hoverOffset: 4,
    }],
  }), [totalBelum, totalProses, totalSelesai]);

  const donutOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false, cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1c1c1f", padding: 10, cornerRadius: 8,
        callbacks: {
          label: ctx => {
            const pct = totalSpk > 0 ? ((ctx.parsed / totalSpk) * 100).toFixed(1) : 0;
            return `${ctx.label}: ${nf(ctx.parsed)} (${pct}%)`;
          },
        },
      },
    },
  }), [totalSpk]);

  const statusLegend = [
    { label: "Antrian", value: totalBelum, color: "#f59e0b" },
    { label: "Proses", value: totalProses, color: "#2458ce" },
    { label: "Selesai", value: totalSelesai, color: "#22c55e" },
  ];

  const maxPerfProduk = useMemo(() => performance.reduce((m, i) => i.total_produk > m ? i.total_produk : m, 0), [performance]);
  const perfRanges = [{ k: "today", l: "Hari Ini" }, { k: "week", l: "Minggu Ini" }, { k: "month", l: "Bulan Ini" }];

  const getDeadlineBadge = (sisa) => {
    if (sisa < 0) return { label: `${Math.abs(sisa)}h telat`, cls: "dbd-over" };
    if (sisa === 0) return { label: "Hari ini", cls: "dbd-warn" };
    if (sisa <= 3) return { label: `${sisa} hari`, cls: "dbd-warn" };
    return { label: `${sisa} hari`, cls: "dbd-safe" };
  };

  const DeltaChip = ({ delta, pct }) => {
    if (delta === 0 || delta == null) return <span className="dc-delta dc-delta-flat"><FaMinus />0</span>;
    const up = delta > 0;
    return (
      <span className={`dc-delta ${up ? "dc-delta-up" : "dc-delta-down"}`}>
        {up ? <FaArrowUp /> : <FaArrowDown />}
        {pct != null ? `${Math.abs(pct).toFixed(0)}%` : nf(Math.abs(delta))}
      </span>
    );
  };

  return (
    <div className="ks-page dc-page">
      {/* Header */}
      <header className="ks-header">
        <div className="ks-header-id">
          <div className="dc-title">
            <FaLayerGroup style={{ color: "#2458ce" }} />
            <h1>Dashboard Produksi Cutting</h1>
          </div>
          <span className="ks-header-sub">{formatLongDate(today)}</span>
        </div>
        <div className="ks-header-actions">
          <button className="ks-btn" onClick={refreshAll} disabled={refreshing}>
            <FaSyncAlt className={refreshing ? "is-spinning" : ""} />
            <span>Segarkan</span>
          </button>
        </div>
      </header>

      <main className="dc-main">
        {error && <div className="dc-error"><FaExclamationTriangle /><span>{error}</span></div>}

        {/* ── Row 1: KPI cards ── */}
        <section className="dc-kpi-row">

          {/* Produksi Hari Ini */}
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-blue"><FaFire /></span>
              <span className="dc-kpi-label">Produksi Hari Ini</span>
            </div>
            <div className="dc-kpi-value">{nf(dailyTotal)} <span className="dc-unit">pcs</span></div>
            <div className="dc-progress-wrap">
              <div className="dc-progress-track"><div className="dc-progress-fill dc-fill-blue" style={{ width: `${dailyPct}%` }} /></div>
              <span className="dc-progress-pct">{Math.round(dailyPct)}%</span>
            </div>
            <div className="dc-kpi-foot">
              {dailyRemaining > 0 ? <>Sisa <strong>{nf(dailyRemaining)}</strong> dari target {nf(dailyTarget)}</> : <span className="dc-ok">Target harian tercapai ✓</span>}
            </div>
          </div>

          {/* Produksi Minggu Ini */}
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-green"><FaClock /></span>
              <span className="dc-kpi-label">Produksi Minggu Ini</span>
            </div>
            <div className="dc-kpi-value">{nf(weeklyTotal)} <span className="dc-unit">pcs</span></div>
            <div className="dc-progress-wrap">
              <div className="dc-progress-track"><div className="dc-progress-fill dc-fill-green" style={{ width: `${weeklyPct}%` }} /></div>
              <span className="dc-progress-pct">{Math.round(weeklyPct)}%</span>
            </div>
            <div className="dc-kpi-foot">
              {weeklyRemaining > 0 ? <>Sisa <strong>{nf(weeklyRemaining)}</strong> dari target {nf(weeklyTarget)}</> : <span className="dc-ok">Target mingguan tercapai ✓</span>}
            </div>
          </div>

          {/* Produksi Bulan Ini + Proyeksi */}
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-purple"><FaCalendarAlt /></span>
              <span className="dc-kpi-label">Produksi Bulan Ini</span>
              <span className={`dc-track-badge ${projection.onTrack ? "is-ontrack" : "is-behind"}`}>
                {projection.onTrack ? "On track" : "Di bawah"}
              </span>
            </div>
            <div className="dc-kpi-value">{nf(monthlyTotal)} <span className="dc-unit">pcs</span></div>
            <div className="dc-progress-wrap">
              <div className="dc-progress-track"><div className="dc-progress-fill dc-fill-purple" style={{ width: `${monthlyPct}%` }} /></div>
              <span className="dc-progress-pct">{Math.round(monthlyPct)}%</span>
            </div>
            <div className="dc-kpi-foot">
              <FaBullseye style={{ marginRight: 4, color: "#9a9aa3" }} />
              Proyeksi <strong>{nf(projection.projected)}</strong> / target {nf(monthlyTarget)}
            </div>
          </div>

          {/* Antrian belum diambil */}
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-orange"><FaBoxOpen /></span>
              <span className="dc-kpi-label">Antrian Belum Diambil</span>
            </div>
            <div className="dc-kpi-value dc-val-orange">{nf(totalBelum)} <span className="dc-unit">SPK</span></div>
            <div className="dc-kpi-foot dc-foot-lg">
              Est. <strong>{nf(totalBelumQty)}</strong> pcs menunggu cutting
            </div>
            <div className="dc-kpi-foot">
              {deadlineGroups.over.length > 0 && <span className="dc-mini-over">{deadlineGroups.over.length} lewat deadline</span>}
              {deadlineGroups.urgent.length > 0 && <span className="dc-mini-warn">{deadlineGroups.urgent.length} mepet</span>}
              {deadlineGroups.over.length === 0 && deadlineGroups.urgent.length === 0 && <span className="dc-ok">Tidak ada yang mepet</span>}
            </div>
          </div>

        </section>

        {/* ── Row 2: Trend chart + Status donut ── */}
        <section className="dc-analytics-row">

          {/* Trend chart */}
          <div className="dc-card dc-chart-card">
            <div className="dc-card-head">
              <span className="dc-card-title">Tren Volume Produksi · 14 Hari</span>
              <div className="dc-legend-inline">
                <span><i className="dc-sw dc-sw-line" /> Volume</span>
                <span><i className="dc-sw dc-sw-dash" /> Rata²</span>
              </div>
            </div>
            <div className="dc-chart-area">
              {loading && <div className="dc-empty">Memuat grafik…</div>}
              {!loading && !trendChartData && <div className="dc-empty">Belum ada data produksi</div>}
              {!loading && trendChartData && <Line data={trendChartData} options={chartOptions} />}
            </div>
            {trend && (
              <div className="dc-chart-foot">
                <div className="dc-foot-stat">
                  <span className="dc-foot-label">Total 14 hari</span>
                  <span className="dc-foot-value">{nf(trend.total)}</span>
                </div>
                <div className="dc-foot-stat">
                  <span className="dc-foot-label">Rata² / hari</span>
                  <span className="dc-foot-value">{nf(trend.avg)}</span>
                </div>
                <div className="dc-foot-stat">
                  <span className="dc-foot-label">Tertinggi</span>
                  <span className="dc-foot-value">{nf(trend.max)}</span>
                </div>
                <div className="dc-foot-stat">
                  <span className="dc-foot-label">Hari ini vs kemarin</span>
                  <span className="dc-foot-value"><DeltaChip delta={trend.delta} pct={trend.deltaPct} /></span>
                </div>
              </div>
            )}
          </div>

          {/* Status donut */}
          <div className="dc-card dc-donut-card">
            <div className="dc-card-head">
              <span className="dc-card-title">Distribusi Status SPK</span>
            </div>
            <div className="dc-donut-area">
              <div className="dc-donut-wrap">
                {totalSpk > 0 ? <Doughnut data={donutData} options={donutOptions} /> : <div className="dc-empty">—</div>}
                <div className="dc-donut-center">
                  <span className="dc-donut-total">{nf(totalSpk)}</span>
                  <span className="dc-donut-cap">Total SPK</span>
                </div>
              </div>
              <ul className="dc-legend">
                {statusLegend.map((s) => {
                  const pct = totalSpk > 0 ? (s.value / totalSpk) * 100 : 0;
                  return (
                    <li key={s.label}>
                      <span className="dc-legend-dot" style={{ background: s.color }} />
                      <span className="dc-legend-name">{s.label}</span>
                      <span className="dc-legend-val">{nf(s.value)}</span>
                      <span className="dc-legend-pct">{pct.toFixed(0)}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="dc-donut-foot">
              Tingkat penyelesaian <strong>{completionPct.toFixed(1)}%</strong>
            </div>
          </div>

        </section>

        {/* ── Row 3: Performance + Income + Deadline ── */}
        <section className="dc-bottom-row">

          {/* Performa Tukang */}
          <div className="dc-card dc-perf-card">
            <div className="dc-card-head">
              <span className="dc-card-title">Performa Tukang</span>
              <div className="ks-segment">
                {perfRanges.map(r => (
                  <button key={r.k} type="button"
                    className={`ks-seg-btn${performanceRange === r.k ? " is-active" : ""}`}
                    onClick={() => setPerformanceRange(r.k)}>
                    {r.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="dc-table-wrap">
              {performanceLoading ? (
                <div className="dc-empty">Memuat performa…</div>
              ) : performance.length === 0 ? (
                <div className="dc-empty">Belum ada data performa</div>
              ) : (
                <table className="dc-grid">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>#</th>
                      <th>Tukang</th>
                      <th style={{ textAlign: "center", width: 56 }}>SPK</th>
                      <th>Total Pcs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.map((item, idx) => {
                      const pct = maxPerfProduk > 0 ? Math.max(6, (item.total_produk / maxPerfProduk) * 100) : 0;
                      const colors = ["dc-fill-blue", "dc-fill-green", "dc-fill-purple", "dc-fill-orange", "dc-fill-red", "dc-fill-teal"];
                      const name = item.nama_tukang_cutting || "-";
                      return (
                        <tr key={item.tukang_cutting_id || idx}>
                          <td className="dc-rank">{idx + 1}</td>
                          <td>
                            <div className="dc-user-cell">
                              <div className={`dc-avatar dc-avatar-${idx % 6}`}><span>{name.charAt(0).toUpperCase()}</span></div>
                              <span className="dc-user-name">{name}</span>
                            </div>
                          </td>
                          <td className="dc-num">{item.jumlah_spk}</td>
                          <td>
                            <div className="dc-pcs-cell">
                              <div className="dc-pcs-bar"><div className={`dc-pcs-fill ${colors[idx % colors.length]}`} style={{ width: `${pct}%` }} /></div>
                              <span className="dc-pcs-value">{nf(item.total_produk)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pendapatan Tukang */}
          <div className="dc-card dc-income-card">
            <div className="dc-card-head">
              <span className="dc-card-title">Pendapatan Tukang</span>
              <span className="dc-tag">Minggu Ini</span>
            </div>
            <div className="dc-income-wrap">
              {incomeLoading ? (
                <div className="dc-empty">Memuat pendapatan…</div>
              ) : incomeList.length === 0 ? (
                <div className="dc-empty">Belum ada data pendapatan</div>
              ) : (
                <ul className="dc-income-list">
                  {incomeList.map((item, idx) => {
                    const name = item.nama_tukang_cutting || "-";
                    return (
                      <li key={item.tukang_cutting_id || idx} className="dc-income-item">
                        <span className="dc-rank">{idx + 1}</span>
                        <div className="dc-user-cell">
                          <div className={`dc-avatar dc-avatar-${idx % 6}`}><span>{name.charAt(0).toUpperCase()}</span></div>
                          <span className="dc-user-name">{name}</span>
                        </div>
                        <span className="dc-income-amount">{formatRupiah(item.total_transfer)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Deadline Alert */}
          <div className="dc-card dc-alert-card">
            <div className="dc-card-head">
              <span className="dc-card-title">
                <FaExclamationTriangle style={{ color: "#d99019", marginRight: 6 }} />
                SPK Deadline Mepet
              </span>
              <div className="dc-alert-badges">
                {deadlineGroups.over.length > 0 && <span className="dc-badge-over">{deadlineGroups.over.length} lewat</span>}
                {deadlineGroups.urgent.length > 0 && <span className="dc-badge-warn">{deadlineGroups.urgent.length} mepet</span>}
              </div>
            </div>
            {alertItems.length === 0 ? (
              <div className="dc-empty" style={{ flex: 1 }}>{loading ? "Memuat…" : "Semua SPK aman ✓"}</div>
            ) : (
              <div className="dc-alert-list">
                {alertItems.map((item, i) => {
                  const badge = getDeadlineBadge(item.sisa_hari);
                  const produk = item.nama_produk || item.produk?.nama_produk || "-";
                  return (
                    <div key={i} className={`dc-alert-item ${item.sisa_hari < 0 ? "dc-alert-over" : "dc-alert-urgent"}`}>
                      <div className="dc-alert-left">
                        <div className="dc-alert-id">#{item.kode_seri || item.id || i + 1}</div>
                        <div className="dc-alert-product">{produk}</div>
                        <div className="dc-alert-penjahit">{item.penjahit?.nama_penjahit || item.nama_penjahit || "—"}</div>
                      </div>
                      <span className={`dc-deadline-badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </section>
      </main>
    </div>
  );
};

export default DashboardCutting;

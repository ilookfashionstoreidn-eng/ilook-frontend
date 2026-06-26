import React, { useEffect, useMemo, useState } from "react";
import "./DashboardCutting.css";
import API from "../../../api";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { FaCalendarAlt, FaExclamationTriangle, FaClock, FaCheckCircle, FaBoxOpen, FaFire } from "react-icons/fa";

const formatDateParam = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatLongDate = (date) =>
  date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value || 0);

const createEmptySummary = () => ({
  all: 0,
  belum_diambil: { count: 0, total_asumsi_produk: 0 },
  sudah_diambil: 0,
  selesai: 0,
  in_progress_weekly: { count: 0, total_asumsi_produk: 0, target: 50000, remaining: 50000 },
  in_progress_daily: { count: 0, total_asumsi_produk: 0, target: 7143, remaining: 7143 },
});

const DashboardCutting = () => {
  const [summary, setSummary] = useState(createEmptySummary);
  const [spkList, setSpkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceRange, setPerformanceRange] = useState("today");
  const [performanceFilterOpen, setPerformanceFilterOpen] = useState(false);
  const [incomeList, setIncomeList] = useState([]);
  const [incomeLoading, setIncomeLoading] = useState(false);
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

  useEffect(() => { fetchDashboard(); fetchCuttingStats(); }, []);
  useEffect(() => { fetchPerformance(); }, [performanceRange]);
  useEffect(() => { fetchIncomeWeekly(); }, []);

  // Derived values
  const totalBelum = summary.belum_diambil?.count || 0;
  const totalBelumQty = summary.belum_diambil?.total_asumsi_produk || 0;
  const totalProses = summary.sudah_diambil || 0;
  const totalSelesai = summary.selesai || 0;
  const totalSpk = summary.all || 0;

  const dailyTotal = cuttingStats.daily_total || 0;
  const dailyTarget = cuttingStats.daily_target || 8333;
  const dailyPct = dailyTarget > 0 ? Math.min(100, (dailyTotal / dailyTarget) * 100) : 0;

  const weeklyTotal = cuttingStats.weekly_total || 0;
  const weeklyTarget = cuttingStats.weekly_target || 50000;
  const weeklyPct = weeklyTarget > 0 ? Math.min(100, (weeklyTotal / weeklyTarget) * 100) : 0;

  const monthlyTotal = cuttingStats.monthly_total || 0;
  const monthlyTarget = cuttingStats.monthly_target || 250000;
  const monthlyPct = monthlyTarget > 0 ? Math.min(100, (monthlyTotal / monthlyTarget) * 100) : 0;

  // Deadline urgency from spkList (belum diambil)
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

  // Chart
  const dailyChartData = useMemo(() => {
    const raw = summary.chart_data;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const labels = raw.map(i => new Date(i.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }));
    const values = raw.map(i => Number(i.total_qty) || 0);
    if (!values.some(v => v > 0)) return null;
    return {
      labels,
      datasets: [
        {
          label: "Produksi",
          data: values,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.12)",
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: "#2563eb",
        },
        {
          label: "Target Harian",
          data: raw.map(() => dailyTarget),
          borderColor: "rgba(239,68,68,0.5)",
          borderWidth: 1.5,
          borderDash: [6, 4],
          fill: false,
          pointRadius: 0,
          tension: 0,
        },
      ],
    };
  }, [summary, dailyTarget]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString("id-ID")} pcs` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#6b7280", font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: "rgba(148,163,184,0.15)" }, ticks: { color: "#6b7280", font: { size: 11 } } },
    },
  }), []);

  const maxPerfProduk = useMemo(() => performance.reduce((m, i) => i.total_produk > m ? i.total_produk : m, 0), [performance]);

  const perfFilterLabel = performanceRange === "today" ? "Hari Ini" : performanceRange === "week" ? "Minggu Ini" : "Bulan Ini";

  const getDeadlineBadge = (sisa) => {
    if (sisa < 0) return { label: `${Math.abs(sisa)}h terlambat`, cls: "dbd-over" };
    if (sisa === 0) return { label: "Hari ini!", cls: "dbd-warn" };
    if (sisa <= 3) return { label: `${sisa} hari`, cls: "dbd-warn" };
    return { label: `${sisa} hari`, cls: "dbd-safe" };
  };

  return (
    <div className="cutting-dashboard-page">
      {/* Header */}
      <div className="cutting-dashboard-header">
        <div className="cutting-dashboard-title">
          <h1>Dashboard Produksi Cutting</h1>
          <div className="cutting-dashboard-date">
            <FaCalendarAlt />
            <span>{formatLongDate(today)}</span>
          </div>
        </div>
      </div>

      {error && <div className="cutting-dashboard-error"><span>{error}</span></div>}

      {/* ── Row 1: 5 stat cards ── */}
      <div className="dc-stat-row">

        {/* SPK Overview */}
        <div className="dc-stat-card dc-stat-spk">
          <div className="dc-stat-icon"><FaCheckCircle /></div>
          <div className="dc-stat-body">
            <div className="dc-stat-label">Total SPK</div>
            <div className="dc-stat-value">{totalSpk.toLocaleString("id-ID")}</div>
            <div className="dc-stat-pills">
              <span className="dc-pill dc-pill-orange">Antrian {totalBelum}</span>
              <span className="dc-pill dc-pill-blue">Proses {totalProses}</span>
              <span className="dc-pill dc-pill-green">Selesai {totalSelesai}</span>
            </div>
          </div>
        </div>

        {/* Antrian + estimasi qty */}
        <div className="dc-stat-card dc-stat-antrian">
          <div className="dc-stat-icon dc-icon-orange"><FaBoxOpen /></div>
          <div className="dc-stat-body">
            <div className="dc-stat-label">Antrian Belum Diambil</div>
            <div className="dc-stat-value dc-val-orange">{totalBelum.toLocaleString("id-ID")} <span className="dc-stat-unit">SPK</span></div>
            <div className="dc-stat-sub">Est. <strong>{totalBelumQty.toLocaleString("id-ID")}</strong> pcs belum cutting</div>
          </div>
        </div>

        {/* Produksi Hari Ini */}
        <div className="dc-stat-card dc-stat-daily">
          <div className="dc-stat-icon dc-icon-blue"><FaFire /></div>
          <div className="dc-stat-body">
            <div className="dc-stat-label">Produksi Hari Ini</div>
            <div className="dc-stat-value">{dailyTotal.toLocaleString("id-ID")} <span className="dc-stat-unit">pcs</span></div>
            <div className="dc-progress-wrap">
              <div className="dc-progress-track">
                <div className="dc-progress-fill dc-fill-blue" style={{ width: `${dailyPct}%` }} />
              </div>
              <span className="dc-progress-pct">{Math.round(dailyPct)}%</span>
            </div>
            <div className="dc-stat-sub">Target {dailyTarget.toLocaleString("id-ID")} pcs</div>
          </div>
        </div>

        {/* Progress Mingguan */}
        <div className="dc-stat-card dc-stat-weekly">
          <div className="dc-stat-icon dc-icon-green"><FaClock /></div>
          <div className="dc-stat-body">
            <div className="dc-stat-label">Produksi Minggu Ini</div>
            <div className="dc-stat-value">{weeklyTotal.toLocaleString("id-ID")} <span className="dc-stat-unit">pcs</span></div>
            <div className="dc-progress-wrap">
              <div className="dc-progress-track">
                <div className="dc-progress-fill dc-fill-green" style={{ width: `${weeklyPct}%` }} />
              </div>
              <span className="dc-progress-pct">{Math.round(weeklyPct)}%</span>
            </div>
            <div className="dc-stat-sub">Target {weeklyTarget.toLocaleString("id-ID")} pcs</div>
          </div>
        </div>

        {/* Progress Bulanan */}
        <div className="dc-stat-card dc-stat-monthly">
          <div className="dc-stat-icon dc-icon-purple"><FaCalendarAlt /></div>
          <div className="dc-stat-body">
            <div className="dc-stat-label">Produksi Bulan Ini</div>
            <div className="dc-stat-value">{monthlyTotal.toLocaleString("id-ID")} <span className="dc-stat-unit">pcs</span></div>
            <div className="dc-progress-wrap">
              <div className="dc-progress-track">
                <div className="dc-progress-fill dc-fill-purple" style={{ width: `${monthlyPct}%` }} />
              </div>
              <span className="dc-progress-pct">{Math.round(monthlyPct)}%</span>
            </div>
            <div className="dc-stat-sub">Target {monthlyTarget.toLocaleString("id-ID")} pcs</div>
          </div>
        </div>

      </div>

      {/* ── Row 2: Chart + Deadline Alert ── */}
      <div className="dc-mid-row">

        {/* Grafik harian */}
        <div className="cutting-card dc-chart-card">
          <div className="cutting-card-header">
            <span className="cutting-card-label">Grafik Produksi Harian</span>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "#64748b" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ display: "inline-block", width: 22, height: 3, background: "#2563eb", borderRadius: 2 }} /> Aktual</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ display: "inline-block", width: 22, height: 2, borderTop: "2px dashed rgba(239,68,68,0.6)" }} /> Target</span>
            </div>
          </div>
          <div style={{ height: 240, marginTop: 8 }}>
            {loading && <div className="cutting-empty-text">Memuat grafik…</div>}
            {!loading && !dailyChartData && <div className="cutting-empty-text">Belum ada data produksi</div>}
            {!loading && dailyChartData && <Line data={dailyChartData} options={chartOptions} />}
          </div>
        </div>

        {/* Deadline Alert */}
        <div className="cutting-card dc-alert-card">
          <div className="cutting-card-header">
            <span className="cutting-card-label">
              <FaExclamationTriangle style={{ color: "#f59e0b", marginRight: 6 }} />
              SPK Deadline Mepet
            </span>
            <div style={{ display: "flex", gap: 6, fontSize: 11 }}>
              {deadlineGroups.over.length > 0 && <span className="dc-badge-over">{deadlineGroups.over.length} lewat</span>}
              {deadlineGroups.urgent.length > 0 && <span className="dc-badge-warn">{deadlineGroups.urgent.length} mepet</span>}
            </div>
          </div>
          {alertItems.length === 0 ? (
            <div className="cutting-empty-text" style={{ height: 200 }}>
              {loading ? "Memuat…" : "Semua SPK aman ✓"}
            </div>
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

      </div>

      {/* ── Row 3: Performa + Pendapatan ── */}
      <div className="cutting-performance-section">

        {/* Performa Tukang */}
        <div className="cutting-card cutting-card-performance">
          <div className="cutting-card-header performance-header-row">
            <span className="cutting-card-label">Performa Tukang</span>
            <div className="performance-filter-pill" onClick={() => setPerformanceFilterOpen(o => !o)}>
              <span>{perfFilterLabel}</span>
            </div>
          </div>
          {performanceFilterOpen && (
            <div className="performance-filter-dropdown">
              {["today", "week", "month"].map(r => (
                <button key={r} type="button"
                  className={`performance-filter-option${performanceRange === r ? " performance-filter-option-active" : ""}`}
                  onClick={() => { setPerformanceRange(r); setPerformanceFilterOpen(false); }}>
                  {r === "today" ? "Hari Ini" : r === "week" ? "Minggu Ini" : "Bulan Ini"}
                </button>
              ))}
            </div>
          )}
          <div className="performance-table-wrapper">
            {performanceLoading ? (
              <div className="cutting-empty-text">Memuat performa…</div>
            ) : performance.length === 0 ? (
              <div className="cutting-empty-text">Belum ada data performa</div>
            ) : (
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tukang</th>
                    <th style={{ textAlign: "center" }}>SPK</th>
                    <th>Total Pcs</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((item, idx) => {
                    const pct = maxPerfProduk > 0 ? Math.max(8, (item.total_produk / maxPerfProduk) * 100) : 0;
                    const colors = ["dc-fill-blue", "dc-fill-green", "dc-fill-purple", "dc-fill-orange", "dc-fill-red", "dc-fill-teal"];
                    const name = item.nama_tukang_cutting || "-";
                    return (
                      <tr key={item.tukang_cutting_id || idx}>
                        <td style={{ color: "#94a3b8", fontWeight: 700, fontSize: 12, width: 28 }}>{idx + 1}</td>
                        <td>
                          <div className="performance-user-cell">
                            <div className={`performance-avatar dc-avatar-${idx % 6}`}>
                              <span>{name.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="performance-name">{name}</span>
                          </div>
                        </td>
                        <td className="performance-number">{item.jumlah_spk}</td>
                        <td>
                          <div className="performance-pcs-cell">
                            <div className="performance-pcs-bar">
                              <div className={`performance-pcs-bar-fill ${colors[idx % colors.length]}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="performance-pcs-value">{item.total_produk.toLocaleString("id-ID")}</span>
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
        <div className="cutting-card cutting-card-income">
          <div className="cutting-card-header performance-header-row">
            <span className="cutting-card-label">Pendapatan Tukang</span>
            <div className="performance-filter-pill income-filter-pill"><span>Minggu Ini</span></div>
          </div>
          <div className="income-list-wrapper">
            {incomeLoading ? (
              <div className="cutting-empty-text">Memuat pendapatan…</div>
            ) : incomeList.length === 0 ? (
              <div className="cutting-empty-text">Belum ada data pendapatan</div>
            ) : (
              <ul className="income-list">
                {incomeList.map((item, idx) => {
                  const name = item.nama_tukang_cutting || "-";
                  const colorCls = ["income-amount-green", "income-amount-blue", "income-amount-orange", "income-amount-red"][idx] || "income-amount-green";
                  return (
                    <li key={item.tukang_cutting_id || idx} className="income-item">
                      <span className="income-rank">{idx + 1}.</span>
                      <div className="income-user">
                        <div className="income-avatar"><span>{name.charAt(0).toUpperCase()}</span></div>
                        <span className="income-name">{name}</span>
                      </div>
                      <span className={`income-amount ${colorCls}`}>{formatRupiah(item.total_transfer)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardCutting;

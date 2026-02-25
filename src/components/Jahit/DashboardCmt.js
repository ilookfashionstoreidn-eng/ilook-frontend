import React, { useEffect, useMemo, useState } from "react";
import "./DashboardCmt.css";
import API from "../../api";
import { Line, Doughnut } from "react-chartjs-2";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { FaCalendarAlt } from "react-icons/fa";

const createEmptySummary = () => ({
  all: 0,
  pending: {
    count: 0,
    qty: 0,
  },
  in_progress: {
    count: 0,
    qty: 0,
  },
  completed: {
    count: 0,
    qty: 0,
  },
  in_progress_weekly: {
    count: 0,
    total_qty: 0,
    target: 5000, // Example target
    remaining: 5000,
  },
  in_progress_daily: {
    count: 0,
    total_qty: 0,
    target: 500, // Example target
    remaining: 500,
  },
});

const formatDateParam = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatLongDate = (date) => {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const DashboardCmt = () => {
  const [summary, setSummary] = useState(createEmptySummary);
  const [spkList, setSpkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState("today");
  const [performance, setPerformance] = useState([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [revenueRows, setRevenueRows] = useState([]);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueError, setRevenueError] = useState(null);

  const today = useMemo(() => new Date(), []);

  const buildParams = () => {
    const base = {
      per_page: 50,
      progress_status: "In Progress", // Default status for progress tracking
    };

    if (timeFilter === "today") {
      const dateStr = formatDateParam(today);
      return {
        ...base,
        start_date: dateStr,
        end_date: dateStr,
        daily_date: dateStr,
        weekly_start: dateStr,
        weekly_end: dateStr,
      };
    }

    if (timeFilter === "week") {
      const baseDate = new Date(today);
      const day = baseDate.getDay();
      const offsetToMonday = (day + 6) % 7;
      const start = new Date(baseDate);
      start.setDate(start.getDate() - offsetToMonday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startStr = formatDateParam(start);
      const endStr = formatDateParam(end);
      return {
        ...base,
        start_date: startStr,
        end_date: endStr,
        weekly_start: startStr,
        weekly_end: endStr,
      };
    }

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startStr = formatDateParam(monthStart);
    const endStr = formatDateParam(monthEnd);
    return {
      ...base,
      start_date: startStr,
      end_date: endStr,
      weekly_start: startStr,
      weekly_end: endStr,
    };
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = buildParams();
      // Using /spkcmt endpoint (sesuai routes/api.php)
      const response = await API.get("/spkcmt", { params });
      const payload = response.data || {};
      
      // Map backend summary structure to state if needed, or use directly
      // Backend returns: all, pending, in_progress, completed, in_progress_weekly, in_progress_daily
      setSummary(payload.summary || createEmptySummary());
      
      // Backend returns spk list in payload.spk.data (paginated) or payload.spk (if allData?)
      // Check controller: return response()->json(['spk' => $spk, 'summary' => $summary]);
      // And $spk is paginator object.
      const spkData = payload.spk?.data || [];
      setSpkList(Array.isArray(spkData) ? spkData : []);
      
    } catch (err) {
      const message =
        err?.response?.data?.message || "Gagal memuat data dashboard CMT";
      setError(message);
      setSummary(createEmptySummary());
      setSpkList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    try {
      setPerformanceLoading(true);
      const response = await API.get("/kinerja-cmt");
      const data = response.data || {};
      
      // Transform object to array
      const performanceArray = Object.keys(data).map(key => ({
        name: key,
        ...data[key]
      }));

      // Sort by score (rata_rata) descending
      const sorted = performanceArray.sort((a, b) => b.rata_rata - a.rata_rata).slice(0, 5);
      
      setPerformance(sorted);
    } catch (err) {
      console.error("Gagal memuat kinerja CMT", err);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const fetchRevenue = async () => {
    try {
      setRevenueLoading(true);
      setRevenueError(null);
      const params = buildParams();
      const response = await API.get("/spkcmt/pendapatan", {
        params: {
          start_date: params.start_date,
          end_date: params.end_date,
          status: "completed",
        },
      });
      const payload = response.data || {};
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      setRevenueRows(rows);
    } catch (err) {
      setRevenueError("Gagal memuat pendapatan CMT");
      setRevenueRows([]);
    } finally {
      setRevenueLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchPerformance();
    fetchRevenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter]);

  const totalSpk = summary.all || 0;
  
  // Mapping statuses from backend
  const totalPending = summary.pending?.count || 0;
  const totalInProgress = summary.in_progress?.count || 0;
  const totalCompleted = summary.completed?.count || 0;

  // Counts per status (untuk kartu ringkasan dan donut)
  const statusCounts = useMemo(() => {
    const counts = {
      belum_diambil: 0,
      sudah_diambil: 0,
      pending: 0,
      completed: 0,
    };
    spkList.forEach((item) => {
      const s = item.status;
      if (s === "belum_diambil") counts.belum_diambil += 1;
      else if (s === "sudah_diambil") counts.sudah_diambil += 1;
      else if (s === "pending") counts.pending += 1;
      else if (s === "completed") counts.completed += 1;
    });
    return counts;
  }, [spkList]);

  // Progress metrics (using In Progress status as configured in buildParams)
  const dailyTotal = summary.in_progress_daily?.total_qty || 0;
  const dailyTarget = 500; // Hardcoded target for now
  const dailyProgressPercent =
    dailyTarget > 0 ? Math.min(100, (dailyTotal / dailyTarget) * 100) : 0;

  const weeklyTotal = summary.in_progress_weekly?.total_qty || 0;
  const weeklyTarget = 5000; // Hardcoded target for now
  const weeklyProgressPercent =
    weeklyTarget > 0 ? Math.min(100, (weeklyTotal / weeklyTarget) * 100) : 0;

  // Deadline items for the list
  const deadlineItems = useMemo(() => {
    const source = statusFilter === "all" ? spkList : spkList.filter((i) => i.status === statusFilter);
    const withDeadline = source.filter((item) => item.sisa_hari !== null && item.sisa_hari !== undefined);
    const sorted = withDeadline.sort((a, b) => {
      const aVal = a.sisa_hari;
      const bVal = b.sisa_hari;
      if (aVal === bVal) return 0;
      return aVal < bVal ? -1 : 1;
    });
    return sorted.slice(0, 4);
  }, [spkList, statusFilter]);

  // Chart Data: Daily Production (based on created_at and jumlah_produk)
  const dailyChartData = useMemo(() => {
    if (!Array.isArray(spkList) || spkList.length === 0) {
      return null;
    }

    const labels = [];
    const values = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = formatDateParam(date);
      labels.push(
        date.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        })
      );
      
      // Calculate total quantity for this day
      const total = spkList
        .filter((item) => {
          if (!item.created_at) return false;
          const createdDate = formatDateParam(new Date(item.created_at));
          return createdDate === key;
        })
        .reduce((sum, item) => {
          const jumlah = item.jumlah_produk || 0;
          return sum + Number(jumlah);
        }, 0);
      values.push(total);
    }

    const hasValue = values.some((v) => v > 0);
    // Return empty chart structure even if no values to avoid breaking UI? 
    // DashboardCutting returns null if no values.
    if (!hasValue) {
        // Return a default empty chart to keep layout
        return {
            labels,
            datasets: [{
                label: "Produksi",
                data: values,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.16)",
                borderWidth: 2,
                fill: true,
                tension: 0.4,
            }]
        };
    }

    return {
      labels,
      datasets: [
        {
          label: "Produksi",
          data: values,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.16)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#2563eb",
        },
      ],
    };
  }, [spkList, today]);

  const dailyChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) =>
              `${context.parsed.y.toLocaleString("id-ID")} pcs`,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#6b7280",
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(148, 163, 184, 0.2)",
          },
          ticks: {
            color: "#6b7280",
          },
        },
      },
    }),
    []
  );

  const statusChartData = useMemo(() => {
    const total = statusCounts.belum_diambil + statusCounts.sudah_diambil + statusCounts.pending + statusCounts.completed;
    if (total === 0) {
      return {
        labels: ["Belum Diambil", "Sudah Diambil", "Pending", "Completed"],
        datasets: [
          {
            data: [1, 1, 1, 1],
            backgroundColor: ["#f97316", "#0ea5e9", "#f59e0b", "#22c55e"],
            borderWidth: 0,
          },
        ],
      };
    }
    return {
      labels: ["Belum Diambil", "Sudah Diambil", "Pending", "Completed"],
      datasets: [
        {
          data: [
            statusCounts.belum_diambil,
            statusCounts.sudah_diambil,
            statusCounts.pending,
            statusCounts.completed,
          ],
          backgroundColor: ["#f97316", "#0ea5e9", "#f59e0b", "#22c55e"],
          borderWidth: 0,
        },
      ],
    };
  }, [statusCounts]);

  const statusChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed;
              const data = context.dataset.data || [];
              const total = data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return `${context.label}: ${value.toLocaleString("id-ID")} SPK (${pct}%)`;
            },
          },
        },
        datalabels: {
          color: "#334155",
          formatter: (value, ctx) => {
            const data = ctx.dataset.data || [];
            const total = data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return pct > 0 ? `${pct}%` : "";
          },
          font: { weight: "700" },
        },
      },
      cutout: "72%",
    }),
    []
  );

  const renderDeadlineBadge = (sisaHari) => {
    if (sisaHari === null || sisaHari === undefined) {
      return {
        label: "Tidak ada data",
        className: "cmt-deadline-badge-neutral",
      };
    }
    if (sisaHari < 0) {
      return {
        label: "Telat",
        className: "cmt-deadline-badge-danger",
      };
    }
    if (sisaHari === 0) {
      return {
        label: "Hari ini",
        className: "cmt-deadline-badge-warning",
      };
    }
    if (sisaHari === 1) {
      return {
        label: "1 Hari",
        className: "cmt-deadline-badge-warning",
      };
    }
    if (sisaHari <= 3) {
      return {
        label: `${sisaHari} Hari`,
        className: "cmt-deadline-badge-warning",
      };
    }
    return {
      label: `${sisaHari} Hari`,
      className: "cmt-deadline-badge-safe",
    };
  };

  const formattedDate = formatLongDate(today);
  Chart.register(ChartDataLabels);

  return (
    <div className="cmt-dashboard-page">
      <div className="cmt-dashboard-header">
        <div className="cmt-dashboard-title">
          <h1>Dashboard Produksi CMT</h1>
          <div className="cmt-dashboard-date">
            <FaCalendarAlt />
            <span>{formattedDate}</span>
          </div>
        </div>
        <div className="cmt-dashboard-controls">
          <button className="cmt-date-filter">
            <span>Filter Tanggal</span>
          </button>
          <select
            className="cmt-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            title="Filter status untuk daftar deadline"
          >
            <option value="all">Semua Status</option>
            <option value="belum_diambil">Belum Diambil</option>
            <option value="sudah_diambil">Sudah Diambil</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <div className="cmt-tab-group">
            <button
              type="button"
              className={
                timeFilter === "today"
                  ? "cmt-tab cmt-tab-active"
                  : "cmt-tab"
              }
              onClick={() => setTimeFilter("today")}
            >
              Hari Ini
            </button>
            <button
              type="button"
              className={
                timeFilter === "week"
                  ? "cmt-tab cmt-tab-active"
                  : "cmt-tab"
              }
              onClick={() => setTimeFilter("week")}
            >
              Minggu Ini
            </button>
            <button
              type="button"
              className={
                timeFilter === "month"
                  ? "cmt-tab cmt-tab-active"
                  : "cmt-tab"
              }
              onClick={() => setTimeFilter("month")}
            >
              Bulan Ini
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="cmt-dashboard-error">
          <span>{error}</span>
        </div>
      )}

      <div className="cmt-dashboard-content">
      <div className="cmt-dashboard-top-grid">
        <div className="cmt-card cmt-card-total">
          <div className="cmt-card-header">
            <span className="cmt-card-label">Total SPK</span>
          </div>
          <div className="cmt-card-main-value">{totalSpk}</div>
          <div className="cmt-card-footer">
            <span className="cmt-trend-up">
              SPK periode ini
            </span>
          </div>
        </div>

        <div className="cmt-card cmt-card-today">
          <div className="cmt-card-header">
            <span className="cmt-card-label">Produksi Hari Ini</span>
            <span className="cmt-target-badge">
              Target: {dailyTarget.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="cmt-card-main-value">
            {dailyTotal.toLocaleString("id-ID")} pcs
          </div>
          <div className="cmt-progress-bar-container">
            <div
              className="cmt-progress-bar-fill"
              style={{ width: `${dailyProgressPercent}%` }}
            />
          </div>
          <div className="cmt-card-footer">
            <span>{dailyProgressPercent.toFixed(1)}% dari target harian</span>
          </div>
        </div>

        <div className="cmt-card cmt-card-week">
          <div className="cmt-card-header">
            <span className="cmt-card-label">Progress Mingguan</span>
            <span className="cmt-target-badge">
              Target: {weeklyTarget.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="cmt-card-main-value">
            {weeklyTotal.toLocaleString("id-ID")} pcs
          </div>
          <div className="cmt-progress-bar-container">
            <div
              className="cmt-progress-bar-fill"
              style={{ width: `${weeklyProgressPercent}%` }}
            />
          </div>
          <div className="cmt-card-footer">
            <span>{weeklyProgressPercent.toFixed(1)}% dari target mingguan</span>
          </div>
        </div>
      </div>

      {/* Ringkasan 4 Status */}
      <div className="cmt-status-summary-grid">
        <div className="cmt-status-summary-card">
          <div className="cmt-status-chip cmt-chip-belum">Belum Diambil</div>
          <div className="cmt-status-summary-value">{statusCounts.belum_diambil}</div>
        </div>
        <div className="cmt-status-summary-card">
          <div className="cmt-status-chip cmt-chip-proses">Sudah Diambil</div>
          <div className="cmt-status-summary-value">{statusCounts.sudah_diambil}</div>
        </div>
        <div className="cmt-status-summary-card">
          <div className="cmt-status-chip cmt-chip-pending">Pending</div>
          <div className="cmt-status-summary-value">{statusCounts.pending}</div>
        </div>
        <div className="cmt-status-summary-card">
          <div className="cmt-status-chip cmt-chip-selesai">Completed</div>
          <div className="cmt-status-summary-value">{statusCounts.completed}</div>
        </div>
      </div>

      <div className="cmt-dashboard-main-grid">
        {/* Kolom Kiri: Chart Harian + List Deadline */}
        <div className="cmt-dashboard-left-col">
          <div className="cmt-chart-card">
            <div className="cmt-section-header">
              <h3>Grafik Produksi Harian</h3>
            </div>
            <div className="cmt-chart-container">
              {dailyChartData ? (
                <Line data={dailyChartData} options={dailyChartOptions} />
              ) : (
                <div className="cmt-empty-chart">Tidak ada data produksi</div>
              )}
            </div>
          </div>

          <div className="cmt-deadline-card">
            <div className="cmt-section-header">
              <h3>SPK Mendekati Deadline</h3>
            </div>
            <div className="cmt-deadline-list">
              {deadlineItems.length > 0 ? (
                deadlineItems.map((item) => {
                  const badge = renderDeadlineBadge(item.sisa_hari);
                  return (
                    <div key={item.id_spk} className="cmt-deadline-item">
                      <div className="cmt-deadline-info">
                        <span className="cmt-deadline-spk">
                           {item.penjahit?.nama_penjahit || "Tanpa Penjahit"}
                        </span>
                        <span className="cmt-deadline-date">
                          Deadline: {item.deadline || "-"}
                        </span>
                         <span className="cmt-deadline-product">
                          {item.nama_produk}
                        </span>
                      </div>
                      <div className={`cmt-deadline-badge ${badge.className}`}>
                        {badge.label}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="cmt-empty-state">Tidak ada SPK mendekati deadline</div>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Performa Penjahit */}
        <div className="cmt-dashboard-right-col">
          <div className="cmt-card cmt-performance-card">
            <div className="cmt-card-header">
              <span className="cmt-card-label">Top 5 Penjahit (Kinerja)</span>
            </div>
            <div className="cmt-performance-list">
              {performanceLoading ? (
                <div className="cmt-loading-small">Memuat...</div>
              ) : performance.length > 0 ? (
                performance.map((item, index) => (
                  <div key={index} className="cmt-performance-item">
                    <div className="cmt-performance-rank">{index + 1}</div>
                    <div className="cmt-performance-info">
                      <span className="cmt-performance-name">{item.name}</span>
                      <span className="cmt-performance-score">
                        Skor: {Number(item.rata_rata).toFixed(1)} ({item.kategori})
                      </span>
                    </div>
                    <div className="cmt-performance-count">
                      {item.total_spk} SPK
                    </div>
                  </div>
                ))
              ) : (
                <div className="cmt-empty-state">Belum ada data kinerja</div>
              )}
            </div>
          </div>

          <div className="cmt-chart-card">
            <div className="cmt-section-header">
              <h3>Status SPK</h3>
            </div>
            <div className="cmt-chart-container-doughnut">
              <Doughnut data={statusChartData} options={statusChartOptions} />
              <div className="cmt-doughnut-center">
                <div className="cmt-doughnut-value">
                  {statusCounts.belum_diambil +
                    statusCounts.sudah_diambil +
                    statusCounts.pending +
                    statusCounts.completed}
                </div>
                <div className="cmt-doughnut-label">Total</div>
              </div>
            </div>
            <div className="cmt-legend-list">
              <div className="cmt-legend-item">
                <span className="cmt-legend-dot" style={{ backgroundColor: "#f97316" }} />
                <span className="cmt-legend-label">Belum Diambil</span>
                <span className="cmt-legend-value">
                  {statusCounts.belum_diambil} ({(statusCounts.belum_diambil /
                    (statusCounts.belum_diambil + statusCounts.sudah_diambil + statusCounts.pending + statusCounts.completed || 1)
                  * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="cmt-legend-item">
                <span className="cmt-legend-dot" style={{ backgroundColor: "#0ea5e9" }} />
                <span className="cmt-legend-label">Sudah Diambil</span>
                <span className="cmt-legend-value">
                  {statusCounts.sudah_diambil} ({(statusCounts.sudah_diambil /
                    (statusCounts.belum_diambil + statusCounts.sudah_diambil + statusCounts.pending + statusCounts.completed || 1)
                  * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="cmt-legend-item">
                <span className="cmt-legend-dot" style={{ backgroundColor: "#f59e0b" }} />
                <span className="cmt-legend-label">Pending</span>
                <span className="cmt-legend-value">
                  {statusCounts.pending} ({(statusCounts.pending /
                    (statusCounts.belum_diambil + statusCounts.sudah_diambil + statusCounts.pending + statusCounts.completed || 1)
                  * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="cmt-legend-item">
                <span className="cmt-legend-dot" style={{ backgroundColor: "#22c55e" }} />
                <span className="cmt-legend-label">Completed</span>
                <span className="cmt-legend-value">
                  {statusCounts.completed} ({(statusCounts.completed /
                    (statusCounts.belum_diambil + statusCounts.sudah_diambil + statusCounts.pending + statusCounts.completed || 1)
                  * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>
          
          <div className="cmt-card">
            <div className="cmt-section-header">
              <h3>Pendapatan CMT (Per Penjahit)</h3>
            </div>
            {revenueLoading ? (
              <div className="cmt-loading-small">Memuat...</div>
            ) : revenueError ? (
              <div className="cmt-dashboard-error"><span>{revenueError}</span></div>
            ) : revenueRows.length > 0 ? (
              <div className="cmt-table-wrap">
                <table className="cmt-table">
                  <thead>
                    <tr>
                      <th>Penjahit</th>
                      <th style={{ textAlign: "right" }}>Total SPK</th>
                      <th style={{ textAlign: "right" }}>Total Qty</th>
                      <th style={{ textAlign: "right" }}>Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueRows.map((row, idx) => (
                      <tr key={`${row.id_penjahit}-${idx}`}>
                        <td>{row.nama_penjahit}</td>
                        <td style={{ textAlign: "right" }}>{Number(row.total_spk).toLocaleString("id-ID")}</td>
                        <td style={{ textAlign: "right" }}>{Number(row.total_qty).toLocaleString("id-ID")}</td>
                        <td style={{ textAlign: "right" }} className="cmt-money">
                          Rp {Number(row.total_pendapatan).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="cmt-empty-state">Belum ada data pendapatan</div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default DashboardCmt;

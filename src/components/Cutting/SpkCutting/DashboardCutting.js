import React, { useEffect, useMemo, useState } from "react";
import "./DashboardCutting.css";
import API from "../../../api";
import { Line, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import { FaCalendarAlt } from "react-icons/fa";

const createEmptySummary = () => ({
  all: 0,
  belum_diambil: {
    count: 0,
    total_asumsi_produk: 0,
  },
  sudah_diambil: 0,
  selesai: 0,
  in_progress_weekly: {
    count: 0,
    total_asumsi_produk: 0,
    target: 50000,
    remaining: 50000,
  },
  in_progress_daily: {
    count: 0,
    total_asumsi_produk: 0,
    target: 7143,
    remaining: 7143,
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

const DashboardCutting = () => {
  const [summary, setSummary] = useState(createEmptySummary);
  const [spkList, setSpkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState("today");
  const [performance, setPerformance] = useState([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState(null);
  const [performanceRange, setPerformanceRange] = useState("today");
  const [performanceFilterOpen, setPerformanceFilterOpen] = useState(false);
  const [incomeList, setIncomeList] = useState([]);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [incomeError, setIncomeError] = useState(null);
  const [cuttingStats, setCuttingStats] = useState({
    weekly_target: 50000,
    weekly_total: 0,
    daily_target: 7143,
    daily_total: 0,
  });

  const today = useMemo(() => new Date(), []);

  const buildParams = () => {
    const base = {
      per_page: 50,
      progress_status: "belum_diambil",
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
      const response = await API.get("/spk_cutting", { params });
      const payload = response.data || {};
      setSummary(payload.summary || createEmptySummary());
      setSpkList(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      const message =
        err?.response?.data?.message || "Gagal memuat data dashboard cutting";
      setError(message);
      setSummary(createEmptySummary());
      setSpkList([]);
    } finally {
      setLoading(false);
    }
  };

  const getRangeForType = (type) => {
    const baseDate = new Date(today);

    if (type === "today") {
      const dateStr = formatDateParam(baseDate);
      return {
        start: dateStr,
        end: dateStr,
      };
    }

    if (type === "week") {
      const day = baseDate.getDay();
      const offsetToMonday = (day + 6) % 7;
      const start = new Date(baseDate);
      start.setDate(start.getDate() - offsetToMonday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return {
        start: formatDateParam(start),
        end: formatDateParam(end),
      };
    }

    const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    return {
      start: formatDateParam(monthStart),
      end: formatDateParam(monthEnd),
    };
  };

  const fetchPerformance = async () => {
    try {
      setPerformanceLoading(true);
      setPerformanceError(null);
      const range = getRangeForType(performanceRange);
      const params = {
        per_page: 500,
      };

      if (performanceRange === "today") {
        params.daily_date = range.start;
      } else {
        params.weekly_start = range.start;
        params.weekly_end = range.end;
      }

      const response = await API.get("/hasil_cutting", {
        params,
      });

      const raw = response.data?.data || [];

      const grouped = {};

      raw.forEach((item) => {
        const tukangId = item.tukang_cutting_id || "unknown";
        const nama = item.nama_tukang_cutting || "-";
        const spkId = item.spk_cutting_id;
        const totalProdukItem = item.total_produk || 0;

        if (!grouped[tukangId]) {
          grouped[tukangId] = {
            tukang_cutting_id: tukangId,
            nama_tukang_cutting: nama,
            spk_ids: new Set(),
            total_produk: 0,
          };
        }

        if (spkId) {
          grouped[tukangId].spk_ids.add(spkId);
        }
        grouped[tukangId].total_produk += totalProdukItem;
      });

      const aggregated = Object.values(grouped)
        .map((item) => ({
          tukang_cutting_id: item.tukang_cutting_id,
          nama_tukang_cutting: item.nama_tukang_cutting,
          jumlah_spk: item.spk_ids.size,
          total_produk: item.total_produk,
        }))
        .filter((item) => item.jumlah_spk > 0 && item.total_produk > 0)
        .sort((a, b) => b.total_produk - a.total_produk)
        .slice(0, 4);

      setPerformance(aggregated);
    } catch (err) {
      setPerformanceError("Gagal memuat performa tukang cutting");
      setPerformance([]);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const fetchCuttingStats = async () => {
    try {
      const response = await API.get("/hasil_cutting");
      const stats = response.data?.stats || {};
      setCuttingStats((prev) => ({
        ...prev,
        weekly_target:
          stats.weekly_target ?? prev.weekly_target,
        weekly_total:
          stats.weekly_total ?? prev.weekly_total,
        daily_target:
          stats.daily_target ?? prev.daily_target,
        daily_total:
          stats.daily_total ?? prev.daily_total,
      }));
    } catch (err) {
      // Biarkan menggunakan nilai sebelumnya jika gagal
    }
  };

  const fetchIncomeWeekly = async () => {
    try {
      setIncomeLoading(true);
      setIncomeError(null);
      const range = getRangeForType("week");

      const response = await API.get("/pendapatan/mingguan/cutting", {
        params: {
          start_date: range.start,
          end_date: range.end,
        },
      });

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      const sorted = data
        .map((item) => ({
          tukang_cutting_id: item.tukang_cutting_id,
          nama_tukang_cutting: item.nama_tukang_cutting ?? "-",
          total_transfer: item.total_transfer ?? 0,
        }))
        .filter((item) => item.total_transfer > 0)
        .sort((a, b) => b.total_transfer - a.total_transfer)
        .slice(0, 4);

      setIncomeList(sorted);
    } catch (err) {
      setIncomeError("Gagal memuat pendapatan tukang cutting");
      setIncomeList([]);
    } finally {
      setIncomeLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchCuttingStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter]);

  useEffect(() => {
    fetchPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performanceRange]);

  useEffect(() => {
    fetchIncomeWeekly();
  }, []);

  const totalSpk = summary.all || 0;
  const totalBelum = summary.belum_diambil?.count || 0;
  const totalProses = summary.sudah_diambil || 0;
  const totalSelesai = summary.selesai || 0;

  const dailyTotal = cuttingStats.daily_total || 0;
  const dailyTarget = cuttingStats.daily_target || 7143;
  const dailyProgressPercent =
    dailyTarget > 0 ? Math.min(100, (dailyTotal / dailyTarget) * 100) : 0;

  const weeklyTotal = cuttingStats.weekly_total || 0;
  const weeklyTarget = cuttingStats.weekly_target || 50000;
  const weeklyProgressPercent =
    weeklyTarget > 0 ? Math.min(100, (weeklyTotal / weeklyTarget) * 100) : 0;

  const deadlineItems = useMemo(() => {
    const withDeadline = spkList.filter(
      (item) => item.sisa_hari !== null && item.sisa_hari !== undefined
    );
    const sorted = withDeadline.sort((a, b) => {
      const aVal = a.sisa_hari;
      const bVal = b.sisa_hari;
      if (aVal === bVal) return 0;
      return aVal < bVal ? -1 : 1;
    });
    return sorted.slice(0, 4);
  }, [spkList]);

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
      const total = spkList
        .filter((item) => {
          if (!item.created_at) return false;
          const createdDate = formatDateParam(new Date(item.created_at));
          return createdDate === key;
        })
        .reduce((sum, item) => {
          const jumlah = item.jumlah_asumsi_produk || 0;
          return sum + Number(jumlah);
        }, 0);
      values.push(total);
    }

    const hasValue = values.some((v) => v > 0);
    if (!hasValue) {
      return null;
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
    const total = totalSpk || 0;
    if (total === 0) {
      return {
        labels: ["Belum Diambil", "Proses", "Selesai"],
        datasets: [
          {
            data: [1, 1, 1],
            backgroundColor: ["#e5e7eb", "#e5e7eb", "#e5e7eb"],
            borderWidth: 0,
          },
        ],
      };
    }

    return {
      labels: ["Belum Diambil", "Proses", "Selesai"],
      datasets: [
        {
          data: [totalBelum, totalProses, totalSelesai],
          backgroundColor: ["#f97316", "#0ea5e9", "#22c55e"],
          borderWidth: 0,
        },
      ],
    };
  }, [totalSpk, totalBelum, totalProses, totalSelesai]);

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
            label: (context) =>
              `${context.label}: ${context.parsed.toLocaleString("id-ID")} SPK`,
          },
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
        className: "deadline-badge-neutral",
      };
    }
    if (sisaHari < 0) {
      return {
        label: "Telat",
        className: "deadline-badge-danger",
      };
    }
    if (sisaHari === 0) {
      return {
        label: "Hari ini",
        className: "deadline-badge-warning",
      };
    }
    if (sisaHari === 1) {
      return {
        label: "1 Hari",
        className: "deadline-badge-warning",
      };
    }
    if (sisaHari <= 3) {
      return {
        label: `${sisaHari} Hari`,
        className: "deadline-badge-warning",
      };
    }
    return {
      label: `${sisaHari} Hari`,
      className: "deadline-badge-safe",
    };
  };

  const formattedDate = formatLongDate(today);

  const performanceFilterLabel =
    performanceRange === "today"
      ? "Hari Ini"
      : performanceRange === "week"
      ? "Minggu Ini"
      : "Bulan Ini";

  const maxPerformanceProduk = useMemo(() => {
    if (!performance || performance.length === 0) return 0;
    return performance.reduce(
      (max, item) =>
        item.total_produk > max ? item.total_produk : max,
      0
    );
  }, [performance]);

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value || 0);

  return (
    <div className="cutting-dashboard-page">
      <div className="cutting-dashboard-header">
        <div className="cutting-dashboard-title">
          <h1>Dashboard Produksi Cutting</h1>
          <div className="cutting-dashboard-date">
            <FaCalendarAlt />
            <span>{formattedDate}</span>
          </div>
        </div>
        <div className="cutting-dashboard-controls">
          <button className="cutting-date-filter">
            <span>Filter Tanggal</span>
          </button>
          <div className="cutting-tab-group">
            <button
              type="button"
              className={
                timeFilter === "today"
                  ? "cutting-tab cutting-tab-active"
                  : "cutting-tab"
              }
              onClick={() => setTimeFilter("today")}
            >
              Hari Ini
            </button>
            <button
              type="button"
              className={
                timeFilter === "week"
                  ? "cutting-tab cutting-tab-active"
                  : "cutting-tab"
              }
              onClick={() => setTimeFilter("week")}
            >
              Minggu Ini
            </button>
            <button
              type="button"
              className={
                timeFilter === "month"
                  ? "cutting-tab cutting-tab-active"
                  : "cutting-tab"
              }
              onClick={() => setTimeFilter("month")}
            >
              Bulan Ini
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="cutting-dashboard-error">
          <span>{error}</span>
        </div>
      )}

      <div className="cutting-dashboard-top-grid">
        <div className="cutting-card cutting-card-total">
          <div className="cutting-card-header">
            <span className="cutting-card-label">Total SPK</span>
          </div>
          <div className="cutting-card-main-value">{totalSpk}</div>
          <div className="cutting-card-status-row">
            <div className="cutting-card-status-item">
              <span className="status-dot status-dot-orange" />
              <span className="status-name">Belum Diambil</span>
              <span className="status-value">{totalBelum}</span>
            </div>
            <div className="cutting-card-status-item">
              <span className="status-dot status-dot-blue" />
              <span className="status-name">Proses</span>
              <span className="status-value">{totalProses}</span>
            </div>
            <div className="cutting-card-status-item">
              <span className="status-dot status-dot-green" />
              <span className="status-name">Selesai</span>
              <span className="status-value">{totalSelesai}</span>
            </div>
          </div>
        </div>

        <div className="cutting-card cutting-card-today">
          <div className="cutting-card-header">
            <span className="cutting-card-label">Produksi Hari Ini</span>
          </div>
          <div className="cutting-card-main-value">
            {dailyTotal.toLocaleString("id-ID")} pcs
          </div>
          <div className="cutting-card-sub">
            Target: {dailyTarget.toLocaleString("id-ID")} pcs
          </div>
          <div className="cutting-progress-bar">
            <div
              className="cutting-progress-bar-fill"
              style={{ width: `${dailyProgressPercent}%` }}
            />
          </div>
        </div>

        <div className="cutting-card cutting-card-week">
          <div className="cutting-card-header">
            <span className="cutting-card-label">Progress Mingguan</span>
          </div>
          <div className="cutting-card-main-value">
            {weeklyTotal.toLocaleString("id-ID")} pcs
          </div>
          <div className="cutting-card-sub">
            {weeklyTarget > 0
              ? `${Math.round(
                  weeklyProgressPercent
                )}% dari target ${weeklyTarget.toLocaleString("id-ID")} pcs`
              : "Belum ada target"}
          </div>
          <div className="cutting-progress-bar cutting-progress-bar-week">
            <div
              className="cutting-progress-bar-fill-week"
              style={{ width: `${weeklyProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="cutting-dashboard-bottom-grid">
        <div className="cutting-card cutting-card-deadline">
          <div className="cutting-card-header-row">
            <span className="cutting-card-label">SPK Deadline</span>
            <button type="button" className="cutting-link-button">
              Lihat Semua
            </button>
          </div>
          <div className="cutting-deadline-list">
            {loading && (
              <div className="cutting-empty-text">Memuat data deadline</div>
            )}
            {!loading && deadlineItems.length === 0 && (
              <div className="cutting-empty-text">
                Belum ada SPK dengan deadline
              </div>
            )}
            {!loading &&
              deadlineItems.map((item) => {
                const badge = renderDeadlineBadge(item.sisa_hari);
                return (
                  <div
                    key={item.id}
                    className="cutting-deadline-item"
                  >
                    <div className="cutting-deadline-main">
                      <span className="cutting-deadline-id">
                        {item.id_spk_cutting}
                      </span>
                      <span className="cutting-deadline-product">
                        {item.produk?.nama_produk || "-"}
                      </span>
                    </div>
                    <div className="cutting-deadline-meta">
                      <span className={badge.className}>{badge.label}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="cutting-card cutting-card-chart">
          <div className="cutting-card-header">
            <span className="cutting-card-label">Grafik Produksi Harian</span>
          </div>
          <div className="cutting-chart-wrapper">
            {loading && (
              <div className="cutting-empty-text">Memuat grafik</div>
            )}
            {!loading && !dailyChartData && (
              <div className="cutting-empty-text">Belum ada data produksi</div>
            )}
            {!loading && dailyChartData && (
              <Line data={dailyChartData} options={dailyChartOptions} />
            )}
          </div>
        </div>

        <div className="cutting-card cutting-card-status">
          <div className="cutting-card-header">
            <span className="cutting-card-label">Distribusi Status SPK</span>
          </div>
          <div className="cutting-status-content">
            <div className="cutting-status-chart">
              <Doughnut data={statusChartData} options={statusChartOptions} />
              <div className="cutting-status-center">
                <span className="cutting-status-center-value">
                  {totalSpk.toLocaleString("id-ID")}
                </span>
                <span className="cutting-status-center-label">Total SPK</span>
              </div>
            </div>
            <div className="cutting-status-legend">
              <div className="cutting-status-legend-item">
                <span className="status-dot status-dot-orange" />
                <div className="cutting-status-legend-text">
                  <span>Belum Diambil</span>
                  <span className="cutting-status-legend-sub">
                    {totalSpk > 0
                      ? `${Math.round(
                          (totalBelum / totalSpk) * 100
                        )}% dari total`
                      : "0%"}
                  </span>
                </div>
                <span className="cutting-status-legend-value">
                  {totalBelum}
                </span>
              </div>
              <div className="cutting-status-legend-item">
                <span className="status-dot status-dot-blue" />
                <div className="cutting-status-legend-text">
                  <span>Proses</span>
                  <span className="cutting-status-legend-sub">
                    {totalSpk > 0
                      ? `${Math.round(
                          (totalProses / totalSpk) * 100
                        )}% dari total`
                      : "0%"}
                  </span>
                </div>
                <span className="cutting-status-legend-value">
                  {totalProses}
                </span>
              </div>
              <div className="cutting-status-legend-item">
                <span className="status-dot status-dot-green" />
                <div className="cutting-status-legend-text">
                  <span>Selesai</span>
                  <span className="cutting-status-legend-sub">
                    {totalSpk > 0
                      ? `${Math.round(
                          (totalSelesai / totalSpk) * 100
                        )}% dari total`
                      : "0%"}
                  </span>
                </div>
                <span className="cutting-status-legend-value">
                  {totalSelesai}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="cutting-performance-section">
        <div className="cutting-card cutting-card-performance">
          <div className="cutting-card-header performance-header-row">
            <span className="cutting-card-label">Performa Tukang</span>
            <div
              className="performance-filter-pill"
              onClick={() =>
                setPerformanceFilterOpen((open) => !open)
              }
            >
              <span>{performanceFilterLabel}</span>
            </div>
          </div>
          {performanceFilterOpen && (
            <div className="performance-filter-dropdown">
              <button
                type="button"
                className={
                  performanceRange === "today"
                    ? "performance-filter-option performance-filter-option-active"
                    : "performance-filter-option"
                }
                onClick={() => {
                  setPerformanceRange("today");
                  setPerformanceFilterOpen(false);
                }}
              >
                Hari Ini
              </button>
              <button
                type="button"
                className={
                  performanceRange === "week"
                    ? "performance-filter-option performance-filter-option-active"
                    : "performance-filter-option"
                }
                onClick={() => {
                  setPerformanceRange("week");
                  setPerformanceFilterOpen(false);
                }}
              >
                Minggu Ini
              </button>
              <button
                type="button"
                className={
                  performanceRange === "month"
                    ? "performance-filter-option performance-filter-option-active"
                    : "performance-filter-option"
                }
                onClick={() => {
                  setPerformanceRange("month");
                  setPerformanceFilterOpen(false);
                }}
              >
                Bulan Ini
              </button>
            </div>
          )}
          {performanceError && (
            <div className="cutting-dashboard-error performance-error">
              <span>{performanceError}</span>
            </div>
          )}
          <div className="performance-table-wrapper">
            {performanceLoading ? (
              <div className="cutting-empty-text">
                Memuat performa tukang
              </div>
            ) : performance.length === 0 ? (
              <div className="cutting-empty-text">
                Belum ada data performa tukang
              </div>
            ) : (
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Tukang</th>
                    <th>SPK</th>
                    <th>Total Pcs</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((item, index) => {
                    const totalProduk = item.total_produk || 0;
                    const widthPercent =
                      maxPerformanceProduk > 0
                        ? Math.max(
                            10,
                            (totalProduk / maxPerformanceProduk) *
                              100
                          )
                        : 0;
                    const colorClass =
                      index === 0
                        ? "performance-bar-fill-blue"
                        : index === 1
                        ? "performance-bar-fill-green"
                        : index === 2
                        ? "performance-bar-fill-red"
                        : "performance-bar-fill-orange";
                    const name =
                      item.nama_tukang_cutting || "-";
                    const initial =
                      name && name.trim().length > 0
                        ? name.trim().charAt(0).toUpperCase()
                        : "?";
                    return (
                      <tr key={item.tukang_cutting_id || index}>
                        <td>
                          <div className="performance-user-cell">
                            <div className="performance-avatar">
                              <span>{initial}</span>
                            </div>
                            <span className="performance-name">
                              {name}
                            </span>
                          </div>
                        </td>
                        <td className="performance-number">
                          {item.jumlah_spk || 0}
                        </td>
                        <td>
                          <div className="performance-pcs-cell">
                            <div className="performance-pcs-bar">
                              <div
                                className={`performance-pcs-bar-fill ${colorClass}`}
                                style={{
                                  width: `${widthPercent}%`,
                                }}
                              />
                            </div>
                            <span className="performance-pcs-value">
                              {totalProduk.toLocaleString("id-ID")}
                            </span>
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
        <div className="cutting-card cutting-card-income">
          <div className="cutting-card-header performance-header-row">
            <span className="cutting-card-label">Pendapatan Tukang</span>
            <div className="performance-filter-pill income-filter-pill">
              <span>Minggu Ini</span>
            </div>
          </div>
          {incomeError && (
            <div className="cutting-dashboard-error performance-error">
              <span>{incomeError}</span>
            </div>
          )}
          <div className="income-list-wrapper">
            {incomeLoading ? (
              <div className="cutting-empty-text">
                Memuat pendapatan tukang
              </div>
            ) : incomeList.length === 0 ? (
              <div className="cutting-empty-text">
                Belum ada data pendapatan minggu ini
              </div>
            ) : (
              <ul className="income-list">
                {incomeList.map((item, index) => {
                  const name = item.nama_tukang_cutting || "-";
                  const initial =
                    name && name.trim().length > 0
                      ? name.trim().charAt(0).toUpperCase()
                      : "?";

                  const colorClass =
                    index === 0
                      ? "income-amount-green"
                      : index === 1
                      ? "income-amount-blue"
                      : index === 2
                      ? "income-amount-orange"
                      : "income-amount-red";

                  return (
                    <li
                      key={item.tukang_cutting_id || index}
                      className="income-item"
                    >
                      <span className="income-rank">{index + 1}.</span>
                      <div className="income-user">
                        <div className="income-avatar">
                          <span>{initial}</span>
                        </div>
                        <span className="income-name">{name}</span>
                      </div>
                      <span
                        className={`income-amount ${colorClass}`}
                      >
                        {formatRupiah(item.total_transfer)}
                      </span>
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

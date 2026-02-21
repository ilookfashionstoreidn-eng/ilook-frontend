import React, { useEffect, useMemo, useState } from "react";
import "./DashboardJasa.css";
import API from "../../api";
import { Line, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import { FaCalendarAlt } from "react-icons/fa";
import { Link } from "react-router-dom";

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

const DashboardJasa = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState("today");
  const [data, setData] = useState(null);

  const today = useMemo(() => new Date(), []);

  const buildParams = () => {
    if (timeFilter === "today") {
      const dateStr = formatDateParam(today);
      return {
        type: "today",
        start_date: dateStr,
        end_date: dateStr,
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
      return {
        type: "week",
        start_date: formatDateParam(start),
        end_date: formatDateParam(end),
      };
    }

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      type: "month",
      start_date: formatDateParam(monthStart),
      end_date: formatDateParam(monthEnd),
    };
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = buildParams();
      const response = await API.get("/SpkJasa/dashboard", { params });
      setData(response.data);
    } catch (err) {
      const message =
        err?.response?.data?.message || "Gagal memuat data dashboard jasa";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter]);

  const summary = data?.summary || {};
  const production = data?.production || {};
  const chartData = data?.chart || [];
  const deadlines = data?.deadlines || [];
  const performance = data?.performance || [];
  const incomeList = data?.income || [];

  const totalSpk = summary.all || 0;
  const totalBelum = summary.belum_diambil?.count || 0;
  const totalProses = summary.sudah_diambil || 0;
  const totalSelesai = summary.selesai || 0;

  const dailyTotal = production.daily || 0;
  const dailyTarget = production.daily_target || 1000;
  const dailyProgressPercent =
    dailyTarget > 0 ? Math.min(100, (dailyTotal / dailyTarget) * 100) : 0;

  const periodTotal = production.period || 0;
  const periodTarget = production.period_target || 7000;
  const periodProgressPercent =
    periodTarget > 0 ? Math.min(100, (periodTotal / periodTarget) * 100) : 0;

  const dailyChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return null;
    }

    const labels = chartData.map(item => {
        const d = new Date(item.date);
        return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    });
    const values = chartData.map(item => item.total);

    const hasValue = values.some((v) => v > 0);
    if (!hasValue) {
      // return null; // Uncomment if want to hide empty chart
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
  }, [chartData]);

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

  const maxPerformanceProduk = useMemo(() => {
    if (!performance || performance.length === 0) return 0;
    return performance.reduce(
      (max, item) =>
        (parseInt(item.total_produksi) || 0) > max ? (parseInt(item.total_produksi) || 0) : max,
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
    <div className="jasa-dashboard-page">
      <div className="jasa-dashboard-header">
        <div className="jasa-dashboard-title">
          <h1>Dashboard Produksi Jasa</h1>
          <div className="jasa-dashboard-date">
            <FaCalendarAlt />
            <span>{formattedDate}</span>
          </div>
        </div>
        <div className="jasa-dashboard-controls">
          <button className="jasa-date-filter">
            <span>Filter Tanggal</span>
          </button>
          <div className="jasa-tab-group">
            <button
              type="button"
              className={
                timeFilter === "today"
                  ? "jasa-tab jasa-tab-active"
                  : "jasa-tab"
              }
              onClick={() => setTimeFilter("today")}
            >
              Hari Ini
            </button>
            <button
              type="button"
              className={
                timeFilter === "week"
                  ? "jasa-tab jasa-tab-active"
                  : "jasa-tab"
              }
              onClick={() => setTimeFilter("week")}
            >
              Minggu Ini
            </button>
            <button
              type="button"
              className={
                timeFilter === "month"
                  ? "jasa-tab jasa-tab-active"
                  : "jasa-tab"
              }
              onClick={() => setTimeFilter("month")}
            >
              Bulan Ini
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="jasa-dashboard-error">
          <span>{error}</span>
        </div>
      )}

      <div className="jasa-dashboard-top-grid">
        <div className="jasa-card jasa-card-total">
          <div className="jasa-card-header">
            <span className="jasa-card-label">Total SPK</span>
          </div>
          <div className="jasa-card-main-value">{totalSpk}</div>
          <div className="jasa-card-status-row">
            <div className="jasa-card-status-item">
              <span className="status-dot status-dot-orange" />
              <span className="status-name">Belum Diambil</span>
              <span className="status-value">{totalBelum}</span>
            </div>
            <div className="jasa-card-status-item">
              <span className="status-dot status-dot-blue" />
              <span className="status-name">Proses</span>
              <span className="status-value">{totalProses}</span>
            </div>
            <div className="jasa-card-status-item">
              <span className="status-dot status-dot-green" />
              <span className="status-name">Selesai</span>
              <span className="status-value">{totalSelesai}</span>
            </div>
          </div>
        </div>

        <div className="jasa-card jasa-card-today">
          <div className="jasa-card-header">
            <span className="jasa-card-label">Produksi Hari Ini</span>
          </div>
          <div className="jasa-card-main-value">
            {dailyTotal.toLocaleString("id-ID")} pcs
          </div>
          <div className="jasa-card-sub">
            Target: {dailyTarget.toLocaleString("id-ID")} pcs
          </div>
          <div className="jasa-progress-bar">
            <div
              className="jasa-progress-bar-fill"
              style={{ width: `${dailyProgressPercent}%` }}
            />
          </div>
        </div>

        <div className="jasa-card jasa-card-week">
          <div className="jasa-card-header">
            <span className="jasa-card-label">Progress Periode Ini</span>
          </div>
          <div className="jasa-card-main-value">
            {periodTotal.toLocaleString("id-ID")} pcs
          </div>
          <div className="jasa-card-sub">
            {periodTarget > 0
              ? `${Math.round(
                  periodProgressPercent
                )}% dari target ${periodTarget.toLocaleString("id-ID")} pcs`
              : "Belum ada target"}
          </div>
          <div className="jasa-progress-bar jasa-progress-bar-week">
            <div
              className="jasa-progress-bar-fill-week"
              style={{ width: `${periodProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="jasa-dashboard-bottom-grid">
        <div className="jasa-card jasa-card-deadline">
          <div className="jasa-card-header-row">
            <span className="jasa-card-label">SPK Deadline</span>
            <Link to="/spkjasa" className="jasa-link-button">
              Lihat Semua
            </Link>
          </div>
          <div className="jasa-deadline-list">
            {loading && (
              <div className="jasa-empty-text">Memuat data deadline</div>
            )}
            {!loading && deadlines.length === 0 && (
              <div className="jasa-empty-text">
                Belum ada SPK dengan deadline
              </div>
            )}
            {!loading &&
              deadlines.map((item) => {
                const badge = renderDeadlineBadge(item.sisa_hari);
                return (
                  <div
                    key={item.id}
                    className="jasa-deadline-item"
                  >
                    <div className="jasa-deadline-main">
                      <span className="jasa-deadline-id">
                        {item.tukang}
                      </span>
                      <span className="jasa-deadline-product">
                        {item.produk || "-"}
                      </span>
                    </div>
                    <div className="jasa-deadline-meta">
                      <span className={badge.className}>{badge.label}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="jasa-card jasa-card-chart">
          <div className="jasa-card-header">
            <span className="jasa-card-label">Grafik Produksi Harian</span>
          </div>
          <div className="jasa-chart-wrapper">
            {loading && (
              <div className="jasa-empty-text">Memuat grafik</div>
            )}
            {!loading && !dailyChartData && (
              <div className="jasa-empty-text">Belum ada data produksi</div>
            )}
            {!loading && dailyChartData && (
              <Line data={dailyChartData} options={dailyChartOptions} />
            )}
          </div>
        </div>

        <div className="jasa-card jasa-card-status">
          <div className="jasa-card-header">
            <span className="jasa-card-label">Distribusi Status SPK</span>
          </div>
          <div className="jasa-status-content">
            <div className="jasa-status-chart">
              <Doughnut data={statusChartData} options={statusChartOptions} />
              <div className="jasa-status-center">
                <span className="jasa-status-center-value">
                  {totalSpk.toLocaleString("id-ID")}
                </span>
                <span className="jasa-status-center-label">Total SPK</span>
              </div>
            </div>
            <div className="jasa-status-legend">
              <div className="jasa-status-legend-item">
                <span className="status-dot status-dot-orange" />
                <div className="jasa-status-legend-text">
                  <span>Belum Diambil</span>
                  <span className="jasa-status-legend-sub">
                    {totalSpk > 0
                      ? `${Math.round(
                          (totalBelum / totalSpk) * 100
                        )}% dari total`
                      : "0%"}
                  </span>
                </div>
                <span className="jasa-status-legend-value">
                  {totalBelum}
                </span>
              </div>
              <div className="jasa-status-legend-item">
                <span className="status-dot status-dot-blue" />
                <div className="jasa-status-legend-text">
                  <span>Proses</span>
                  <span className="jasa-status-legend-sub">
                    {totalSpk > 0
                      ? `${Math.round(
                          (totalProses / totalSpk) * 100
                        )}% dari total`
                      : "0%"}
                  </span>
                </div>
                <span className="jasa-status-legend-value">
                  {totalProses}
                </span>
              </div>
              <div className="jasa-status-legend-item">
                <span className="status-dot status-dot-green" />
                <div className="jasa-status-legend-text">
                  <span>Selesai</span>
                  <span className="jasa-status-legend-sub">
                    {totalSpk > 0
                      ? `${Math.round(
                          (totalSelesai / totalSpk) * 100
                        )}% dari total`
                      : "0%"}
                  </span>
                </div>
                <span className="jasa-status-legend-value">
                  {totalSelesai}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="jasa-performance-section">
        <div className="jasa-card jasa-card-performance">
          <div className="jasa-card-header performance-header-row">
            <span className="jasa-card-label">Performa Tukang</span>
          </div>
         
          <div className="performance-table-wrapper">
            {loading ? (
              <div className="jasa-empty-text">
                Memuat performa tukang
              </div>
            ) : performance.length === 0 ? (
              <div className="jasa-empty-text">
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
                    const totalProduk = parseInt(item.total_produksi) || 0;
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
                      item.nama || "-";
                    const initial =
                      name && name.trim().length > 0
                        ? name.trim().charAt(0).toUpperCase()
                        : "?";
                    return (
                      <tr key={item.id || index}>
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
                          {item.total_spk || 0}
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
        <div className="jasa-card jasa-card-income">
          <div className="jasa-card-header performance-header-row">
            <span className="jasa-card-label">Pendapatan Tukang</span>
          </div>
        
          <div className="income-list-wrapper">
            {loading ? (
              <div className="jasa-empty-text">
                Memuat pendapatan tukang
              </div>
            ) : incomeList.length === 0 ? (
              <div className="jasa-empty-text">
                Belum ada data pendapatan
              </div>
            ) : (
              <ul className="income-list">
                {incomeList.map((item, index) => {
                  const name = item.nama || "-";
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
                      key={item.id || index}
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
                        {formatRupiah(item.total_pendapatan)}
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

export default DashboardJasa;

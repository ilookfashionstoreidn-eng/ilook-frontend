import React, { useEffect, useMemo, useState } from "react";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import {
    FiActivity,
    FiAlertTriangle,
    FiBarChart2,
    FiCalendar,
    FiClock,
    FiPackage,
    FiRefreshCw,
    FiSearch,
    FiTrendingDown,
    FiTrendingUp,
    FiTruck,
    FiUsers,
} from "react-icons/fi";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import "./Penjahit.css";
import "./DataDikerjakanPengirimanCmt.css";
import API from "../../api";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const PERIOD_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);
const TOTAL_STATIC_COLUMNS = 9;
const FONT_FAMILY = "'Plus Jakarta Sans', sans-serif";

const DataDikerjakanPengirimanCmt = () => {
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [weekRange, setWeekRange] = useState(5);
    const [periodeInfo, setPeriodeInfo] = useState([]);
    const [lastUpdated, setLastUpdated] = useState("");

    const selectedPeriods = useMemo(() => {
        const periods = [];
        for (let i = 0; i < weekRange; i += 1) {
            periods.push(-i);
        }
        return periods.sort((a, b) => b - a);
    }, [weekRange]);

    useEffect(() => {
        fetchData();
    }, [selectedPeriods]);

    const formatNumber = (num) => {
        if (num === null || num === undefined) return "0";
        return new Intl.NumberFormat("id-ID").format(num);
    };

    const formatSignedNumber = (num) => {
        const value = Number(num) || 0;
        if (value === 0) return "0";
        return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
    };

    const formatDate = (date) => {
        if (!date) return "-";
        return new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(date));
    };

    const formatDateTime = (date) => {
        if (!date) return "-";
        return new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(date));
    };

    const calculatePercentage = (value, total) => {
        if (!total || total === 0) return 0;
        return Math.round((value / total) * 100);
    };

    const calculatePercentageChangeVsAverage = () => {
        if (!data.length || !summary.total_rata_rata) {
            return { percentage: 0, isPositive: false };
        }

        const totalMingguIni = summary.total_pengiriman_minggu_ini || 0;
        const totalRataRata = summary.total_rata_rata || 0;
        const percentage = ((totalMingguIni - totalRataRata) / totalRataRata) * 100;

        return {
            percentage: Math.round(percentage * 10) / 10,
            isPositive: percentage >= 0,
        };
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await API.get("/cmt/data-dikerjakan-pengiriman", {
                params: {
                    periode: selectedPeriods,
                },
            });

            if (response.data) {
                setData(response.data.data || []);
                setSummary(response.data.summary || {});
                setPeriodeInfo(response.data.periode || []);
                setLastUpdated(formatDateTime(new Date()));
            }
        } catch (fetchError) {
            console.error("Error fetching data:", fetchError);
            setError(fetchError.message || "Gagal mengambil data");
        } finally {
            setLoading(false);
        }
    };

    const handleWeekRangeChange = (value) => {
        setWeekRange(Number(value));
    };

    const filteredData = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword) return data;

        return data.filter((item) => {
            const cmtName = item.nama_cmt?.toLowerCase() || "";
            const rowNumber = String(item.no || "").toLowerCase();
            return cmtName.includes(keyword) || rowNumber.includes(keyword);
        });
    }, [data, searchTerm]);

    const tableTotals = useMemo(() => {
        const initialPeriods = selectedPeriods.reduce((accumulator, offset) => {
            accumulator[`periode_${offset}`] = 0;
            return accumulator;
        }, {});

        return filteredData.reduce(
            (accumulator, item) => {
                accumulator.total_lebih_deadline += Number(item.lebih_dari_deadline) || 0;
                accumulator.total_masih_deadline += Number(item.masih_dalam_deadline) || 0;
                accumulator.total_pengiriman_minggu_ini += Number(item.pengiriman_minggu_ini) || 0;
                accumulator.total_rata_rata_pengiriman_mingguan += Number(item.rata_rata_pengiriman_mingguan) || 0;
                accumulator.total_kenaikan_penurunan_dari_rata2 += Number(item.kenaikan_penurunan_dari_rata2) || 0;
                accumulator.total_pengiriman_tertinggi += Number(item.pengiriman_tertinggi) || 0;
                accumulator.total_kenaikan_penurunan_dari_tertinggi += Number(item.kenaikan_penurunan_dari_tertinggi) || 0;

                selectedPeriods.forEach((offset) => {
                    const key = `periode_${offset}`;
                    accumulator.periods[key] += Number(item[key]) || 0;
                });

                return accumulator;
            },
            {
                total_lebih_deadline: 0,
                total_masih_deadline: 0,
                total_pengiriman_minggu_ini: 0,
                total_rata_rata_pengiriman_mingguan: 0,
                total_kenaikan_penurunan_dari_rata2: 0,
                total_pengiriman_tertinggi: 0,
                total_kenaikan_penurunan_dari_tertinggi: 0,
                periods: { ...initialPeriods },
            }
        );
    }, [filteredData, selectedPeriods]);

    const topShipment = useMemo(() => {
        if (!data.length) return null;
        return [...data].sort((a, b) => (b.pengiriman_minggu_ini || 0) - (a.pengiriman_minggu_ini || 0))[0];
    }, [data]);

    const topRiskCmt = useMemo(() => {
        if (!data.length) return null;
        return [...data].sort((a, b) => (b.lebih_dari_deadline || 0) - (a.lebih_dari_deadline || 0))[0];
    }, [data]);

    const percentageChangeVsAverage = calculatePercentageChangeVsAverage();
    const persentaseMelebihiDeadline = calculatePercentage(summary.total_lebih_deadline, summary.total_dikerjakan);
    const isFilteredView = searchTerm.trim().length > 0;

    const summaryCards = useMemo(
        () => [
            {
                key: "wip",
                label: "Volume Dikerjakan",
                value: formatNumber(summary.total_dikerjakan || 0),
                note: `${formatNumber(data.length)} partner CMT dipantau`,
                icon: <FiPackage />,
                tone: "primary",
            },
            {
                key: "deadline",
                label: "Risiko Deadline",
                value: formatNumber(summary.total_lebih_deadline || 0),
                note: `${persentaseMelebihiDeadline}% dari total workload`,
                icon: <FiAlertTriangle />,
                tone: "danger",
            },
            {
                key: "shipment",
                label: "Kirim Minggu Ini",
                value: formatNumber(summary.total_pengiriman_minggu_ini || 0),
                note: topShipment ? `${topShipment.nama_cmt} jadi kontributor tertinggi` : "Belum ada pengiriman tercatat",
                icon: <FiTruck />,
                tone: "success",
            },
            {
                key: "performance",
                label: "Vs Rata-rata Mingguan",
                value: `${percentageChangeVsAverage.isPositive ? "+" : ""}${percentageChangeVsAverage.percentage}%`,
                note: percentageChangeVsAverage.isPositive ? "Performa di atas baseline" : "Performa masih di bawah baseline",
                icon: percentageChangeVsAverage.isPositive ? <FiTrendingUp /> : <FiTrendingDown />,
                tone: percentageChangeVsAverage.isPositive ? "success" : "warning",
            },
        ],
        [data.length, percentageChangeVsAverage, persentaseMelebihiDeadline, summary, topShipment]
    );

    const barChartData = useMemo(() => {
        if (!data.length) return null;

        const sortedData = [...data]
            .filter((item) => item.pengiriman_minggu_ini > 0)
            .sort((a, b) => b.pengiriman_minggu_ini - a.pengiriman_minggu_ini)
            .slice(0, 8);

        const labels = sortedData.map((item) => item.nama_cmt || "Unknown");
        const values = sortedData.map((item) => item.pengiriman_minggu_ini || 0);
        const colors = sortedData.map((item) => {
            if (item.kenaikan_penurunan_dari_rata2 > 0) return "#0f9f6e";
            if (item.kenaikan_penurunan_dari_rata2 < 0) return "#c24141";
            return "#64748b";
        });

        return {
            labels,
            datasets: [
                {
                    label: "Pengiriman Minggu Ini",
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1,
                    borderRadius: 10,
                    maxBarThickness: 40,
                },
            ],
        };
    }, [data]);

    const lineChartData = useMemo(() => {
        if (!periodeInfo.length) return null;

        const recentPeriods = [...periodeInfo]
            .sort((a, b) => b.offset - a.offset)
            .slice(0, 4)
            .reverse();

        const labels = recentPeriods.map((period) => (period.offset === 0 ? "Minggu Ini" : `${Math.abs(period.offset)} Minggu Lalu`));
        const totals = recentPeriods.map((period) => {
            return data.reduce((sum, item) => {
                const key = `periode_${period.offset}`;
                return sum + (item[key] || 0);
            }, 0);
        });

        return {
            labels,
            datasets: [
                {
                    label: "Total Pengiriman",
                    data: totals,
                    borderColor: "#155eef",
                    backgroundColor: "rgba(21, 94, 239, 0.12)",
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#155eef",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                },
            ],
        };
    }, [data, periodeInfo]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: "rgba(255, 255, 255, 0.98)",
                titleColor: "#0f172a",
                bodyColor: "#475569",
                borderColor: "#dbe5f1",
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                cornerRadius: 12,
                titleFont: {
                    size: 13,
                    weight: "600",
                    family: FONT_FAMILY,
                },
                bodyFont: {
                    size: 12,
                    family: FONT_FAMILY,
                },
                callbacks: {
                    label: (context) => `${formatNumber(context.parsed.y)} pcs`,
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => formatNumber(value),
                    font: {
                        size: 11,
                        family: FONT_FAMILY,
                    },
                    color: "#64748b",
                    padding: 8,
                },
                grid: {
                    color: "rgba(148, 163, 184, 0.18)",
                    drawBorder: false,
                },
            },
            x: {
                ticks: {
                    font: {
                        size: 11,
                        family: FONT_FAMILY,
                    },
                    color: "#64748b",
                    padding: 8,
                    maxRotation: 0,
                },
                grid: {
                    display: false,
                    drawBorder: false,
                },
            },
        },
        interaction: {
            intersect: false,
            mode: "index",
        },
    };

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF("landscape", "mm", "a4");

            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("Dashboard Data Dikerjakan dan Pengiriman CMT", 14, 15);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Tanggal Export: ${formatDate(new Date())}`, 14, 22);

            const tableData = filteredData.map((item, index) => {
                const row = [
                    item.no || index + 1,
                    item.nama_cmt || "",
                    formatNumber(item.lebih_dari_deadline || 0),
                    formatNumber(item.masih_dalam_deadline || 0),
                    formatNumber(item.pengiriman_minggu_ini || 0),
                    formatNumber(item.rata_rata_pengiriman_mingguan || 0),
                ];

                selectedPeriods.forEach((offset) => {
                    row.push(formatNumber(item[`periode_${offset}`] || 0));
                });

                row.push(formatSignedNumber(item.kenaikan_penurunan_dari_rata2 || 0));
                row.push(formatNumber(item.pengiriman_tertinggi || 0));
                row.push(formatSignedNumber(item.kenaikan_penurunan_dari_tertinggi || 0));

                return row;
            });

            const headers = [
                "No",
                "Nama CMT",
                "Lewat Deadline",
                "Dalam Deadline",
                "Kirim Minggu Ini",
                "Rata-Rata",
            ];

            selectedPeriods.forEach((offset) => {
                headers.push(offset === 0 ? "Minggu Ini" : `${Math.abs(offset)} M.Lalu`);
            });

            headers.push("Delta vs Rata-Rata");
            headers.push("Puncak Periode");
            headers.push("Delta vs Puncak");

            doc.autoTable({
                head: [headers],
                body: tableData,
                startY: 28,
                styles: { fontSize: 7, cellPadding: 2.5 },
                headStyles: { fillColor: [21, 94, 239], textColor: 255, fontStyle: "bold" },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { top: 28, left: 14, right: 14 },
            });

            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Ringkasan Dashboard", 14, finalY);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(`Total Volume Dikerjakan: ${formatNumber(summary.total_dikerjakan || 0)}`, 14, finalY + 7);
            doc.text(`Deadline Risk: ${formatNumber(summary.total_lebih_deadline || 0)}`, 14, finalY + 12);
            doc.text(`Kirim Minggu Ini: ${formatNumber(summary.total_pengiriman_minggu_ini || 0)}`, 14, finalY + 17);
            doc.text(`Rata-rata Mingguan: ${formatNumber(summary.total_rata_rata || 0)}`, 14, finalY + 22);

            doc.save(`data-dikerjakan-pengiriman-cmt-${new Date().toISOString().split("T")[0]}.pdf`);
        } catch (exportError) {
            console.error("Error exporting PDF:", exportError);
            alert("Gagal export data ke PDF");
        }
    };

    const handleExportExcel = async () => {
        try {
            const response = await API.get("/cmt/data-dikerjakan-pengiriman/export/excel", {
                params: {
                    periode: selectedPeriods,
                },
                responseType: "blob",
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `data-dikerjakan-pengiriman-cmt-${new Date().toISOString().split("T")[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (exportError) {
            console.error("Error exporting Excel:", exportError);
            if (exportError.response?.status === 404) {
                alert("Fitur export Excel belum tersedia. Silakan hubungi administrator.");
            } else {
                alert(exportError.response?.data?.message || "Gagal export data ke Excel");
            }
        }
    };

    const renderPeriodLabel = (offset) => {
        const period = periodeInfo.find((item) => item.offset === offset);
        return {
            title: offset === 0 ? "Minggu Ini" : `${Math.abs(offset)} Minggu Lalu`,
            subtitle: period?.start_formatted && period?.end_formatted ? `${period.start_formatted} - ${period.end_formatted}` : "Periode kerja mingguan",
        };
    };

    const getDeltaClass = (value) => {
        if (value > 0) return "is-positive";
        if (value < 0) return "is-negative";
        return "is-flat";
    };

    return (
        <div className="penjahit-page ddpcmt-page">
            <div className="penjahit-shell ddpcmt-shell">
                <section className="ddpcmt-hero-card">
                    <div className="ddpcmt-hero-main">
                        <span className="ddpcmt-eyebrow">CMT Delivery Control</span>
                        <div className="ddpcmt-title-row">
                            <div className="ddpcmt-title-icon">
                                <FiTruck />
                            </div>
                            <div>
                                <h1>Data Dikerjakan & Pengiriman CMT</h1>
                                <p>
                                    Satu dashboard. Semua kendali operasional — backlog, deadline, dan performa pengiriman.
                                </p>
                            </div>
                        </div>
                        <div className="ddpcmt-chip-row">
                            <span className="ddpcmt-chip ddpcmt-chip-primary">
                                <FiCalendar /> {weekRange} minggu terakhir
                            </span>
                            <span className="ddpcmt-chip">
                                <FiClock /> Update {lastUpdated || formatDateTime(new Date())}
                            </span>
                            {topShipment && (
                                <span className="ddpcmt-chip">
                                    <FiTrendingUp /> Top delivery {topShipment.nama_cmt}
                                </span>
                            )}
                        </div>
                    </div>

                    <aside className="ddpcmt-hero-side">
                        <div className="ddpcmt-side-card">
                            <span className="ddpcmt-side-label">Operational Snapshot</span>
                            <strong>{formatNumber(summary.total_pengiriman_minggu_ini || 0)} pcs</strong>
                            <p>
                                Output minggu ini terhadap baseline rata-rata {formatNumber(summary.total_rata_rata || 0)} pcs per periode.
                            </p>
                            <div className="ddpcmt-side-grid">
                                <div>
                                    <span>Partner Aktif</span>
                                    <strong>{formatNumber(data.length)}</strong>
                                </div>
                                <div>
                                    <span>Risk Tertinggi</span>
                                    <strong>{topRiskCmt?.nama_cmt || "-"}</strong>
                                </div>
                            </div>
                        </div>
                    </aside>
                </section>

                <section className="ddpcmt-summary-grid">
                    {summaryCards.map((card) => (
                        <article key={card.key} className={`ddpcmt-summary-card tone-${card.tone}`}>
                            <div className="ddpcmt-summary-icon">{card.icon}</div>
                            <div>
                                <span>{card.label}</span>
                                <strong>{card.value}</strong>
                                <p>{card.note}</p>
                            </div>
                        </article>
                    ))}
                </section>

                <section className="ddpcmt-visual-grid">
                    <article className="ddpcmt-panel">
                        <div className="ddpcmt-panel-header">
                            <div>
                                <span className="ddpcmt-panel-eyebrow">Shipment Comparison</span>
                                <h2>Top performa pengiriman per CMT</h2>
                                <p>Warna menunjukkan posisi terhadap rata-rata mingguan masing-masing partner.</p>
                            </div>
                            <div className="ddpcmt-panel-badge">
                                <FiBarChart2 /> Top 8 CMT
                            </div>
                        </div>
                        <div className="ddpcmt-chart-area">
                            {!loading && barChartData ? (
                                <Bar data={barChartData} options={chartOptions} />
                            ) : (
                                <div className="ddpcmt-chart-empty">Belum ada data chart untuk ditampilkan.</div>
                            )}
                        </div>
                    </article>

                    <article className="ddpcmt-panel">
                        <div className="ddpcmt-panel-header">
                            <div>
                                <span className="ddpcmt-panel-eyebrow">Weekly Trend</span>
                                <h2>Arah pengiriman 4 minggu terakhir</h2>
                                <p>Memudahkan melihat momentum naik atau turun sebelum closing pengiriman.</p>
                            </div>
                            <div className="ddpcmt-panel-badge subtle">
                                <FiActivity /> Trendline
                            </div>
                        </div>
                        <div className="ddpcmt-chart-area">
                            {!loading && lineChartData ? (
                                <Line data={lineChartData} options={chartOptions} />
                            ) : (
                                <div className="ddpcmt-chart-empty">Belum ada data trend untuk ditampilkan.</div>
                            )}
                        </div>
                    </article>
                </section>

                <section className="ddpcmt-table-card">
                    <div className="ddpcmt-table-head">
                        <div>
                            <span className="ddpcmt-panel-eyebrow">Operational Table</span>
                            <h2>Detail backlog dan pengiriman per partner</h2>
                            <p>
                                Menampilkan {formatNumber(filteredData.length)} dari {formatNumber(data.length)} partner CMT yang terdaftar.
                            </p>
                        </div>

                        <div className="ddpcmt-toolbar">
                            <label className="ddpcmt-search-field">
                                <FiSearch />
                                <input
                                    type="text"
                                    placeholder="Cari partner CMT atau nomor baris"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                />
                            </label>

                            <button type="button" className="ddpcmt-btn ddpcmt-btn-subtle" onClick={fetchData}>
                                <FiRefreshCw /> Refresh
                            </button>
                            <button type="button" className="ddpcmt-btn ddpcmt-btn-secondary" onClick={handleExportPDF}>
                                <FaFilePdf /> PDF
                            </button>
                            <button type="button" className="ddpcmt-btn ddpcmt-btn-primary" onClick={handleExportExcel}>
                                <FaFileExcel /> Excel
                            </button>
                        </div>
                    </div>

                    <div className="ddpcmt-inline-stats">
                        <div className="ddpcmt-inline-stat">
                            <span>View</span>
                            <strong>{isFilteredView ? "Filtered" : "Overall"}</strong>
                        </div>
                        <div className="ddpcmt-inline-stat">
                            <span>Top Delivery</span>
                            <strong>{topShipment?.nama_cmt || "-"}</strong>
                        </div>
                        <div className="ddpcmt-inline-stat">
                            <span>Highest Risk</span>
                            <strong>{topRiskCmt?.nama_cmt || "-"}</strong>
                        </div>
                        <div className="ddpcmt-inline-stat">
                            <span>Rata-rata Weekly</span>
                            <strong>{formatNumber(summary.total_rata_rata || 0)} pcs</strong>
                        </div>
                    </div>

                    {loading && !data.length ? (
                        <div className="ddpcmt-state-card">
                            <div className="ddpcmt-spinner" />
                            <strong>Memuat dashboard pengiriman</strong>
                            <p>Data sedang disiapkan agar tampilan operasional tetap sinkron dengan periode yang dipilih.</p>
                        </div>
                    ) : error && !data.length ? (
                        <div className="ddpcmt-state-card error">
                            <div className="ddpcmt-state-icon">!</div>
                            <strong>Data belum dapat dimuat</strong>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="table-wrapper ddpcmt-table-wrap">
                            <table className="data-dikerjakan-table ddpcmt-table">
                                <thead>
                                    <tr>
                                        <th rowSpan="2" className="header-neutral sticky-col sticky-no">
                                            No
                                        </th>
                                        <th rowSpan="2" className="header-neutral sticky-col sticky-name">
                                            Partner CMT
                                        </th>
                                        <th colSpan="2" className="header-danger-soft">
                                            Backlog WIP / pcs
                                        </th>
                                        <th rowSpan="2" className="header-success-soft">
                                            Kirim Minggu Ini
                                        </th>
                                        <th rowSpan="2" className="header-warning-soft">
                                            Rata-rata Mingguan
                                        </th>
                                        <th colSpan={selectedPeriods.length} className="header-period-group">
                                            <div className="ddpcmt-period-group">
                                                <span>Riwayat Pengiriman</span>
                                                <label className="ddpcmt-period-picker">
                                                    <FiCalendar />
                                                    <select value={weekRange} onChange={(event) => handleWeekRangeChange(event.target.value)}>
                                                        {PERIOD_OPTIONS.map((option) => (
                                                            <option key={option} value={option}>
                                                                {option} Minggu Terakhir
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </div>
                                        </th>
                                        <th rowSpan="2" className="header-neutral">
                                            Delta vs Rata-rata
                                        </th>
                                        <th rowSpan="2" className="header-neutral">
                                            Puncak Periode
                                        </th>
                                        <th rowSpan="2" className="header-neutral">
                                            Delta vs Puncak
                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="header-danger">Lewat Deadline</th>
                                        <th className="header-info">Dalam Deadline</th>
                                        {selectedPeriods.map((offset) => {
                                            const periodLabel = renderPeriodLabel(offset);
                                            return (
                                                <th key={offset} className="header-period-cell">
                                                    <div className="ddpcmt-period-label">
                                                        <strong>{periodLabel.title}</strong>
                                                        <span>{periodLabel.subtitle}</span>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.length === 0 ? (
                                        <tr>
                                            <td colSpan={TOTAL_STATIC_COLUMNS + selectedPeriods.length} className="ddpcmt-empty-row">
                                                <div className="ddpcmt-empty-content">
                                                    <FiUsers />
                                                    <strong>Tidak ada partner yang sesuai filter</strong>
                                                    <span>Coba ubah kata kunci pencarian atau refresh data periode.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredData.map((item, index) => (
                                            <tr key={item.no || `${item.nama_cmt}-${index}`}>
                                                <td className="sticky-col sticky-no">{item.no || index + 1}</td>
                                                <td className="sticky-col sticky-name">
                                                    <div className="ddpcmt-name-cell">
                                                        <strong>{item.nama_cmt || "-"}</strong>
                                                        <span>
                                                            {item.pengiriman_minggu_ini > 0
                                                                ? `Kirim minggu ini ${formatNumber(item.pengiriman_minggu_ini)} pcs`
                                                                : "Belum ada pengiriman minggu ini"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={`metric-cell metric-cell-danger${item.lebih_dari_deadline > 0 ? " metric-emphasis" : ""}`}>
                                                    {formatNumber(item.lebih_dari_deadline || 0)}
                                                </td>
                                                <td className="metric-cell metric-cell-info">{formatNumber(item.masih_dalam_deadline || 0)}</td>
                                                <td className="metric-cell metric-cell-success">{formatNumber(item.pengiriman_minggu_ini || 0)}</td>
                                                <td className="metric-cell metric-cell-warning">
                                                    {formatNumber(item.rata_rata_pengiriman_mingguan || 0)}
                                                </td>
                                                {selectedPeriods.map((offset) => {
                                                    const key = `periode_${offset}`;
                                                    return (
                                                        <td key={offset} className="metric-cell metric-cell-period">
                                                            {formatNumber(item[key] || 0)}
                                                        </td>
                                                    );
                                                })}
                                                <td className={`metric-cell delta-cell ${getDeltaClass(item.kenaikan_penurunan_dari_rata2 || 0)}`}>
                                                    {formatSignedNumber(item.kenaikan_penurunan_dari_rata2 || 0)}
                                                </td>
                                                <td className="metric-cell metric-cell-neutral">{formatNumber(item.pengiriman_tertinggi || 0)}</td>
                                                <td className={`metric-cell delta-cell ${getDeltaClass(item.kenaikan_penurunan_dari_tertinggi || 0)}`}>
                                                    {formatSignedNumber(item.kenaikan_penurunan_dari_tertinggi || 0)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {filteredData.length > 0 && (
                                    <tfoot>
                                        <tr className="footer-row">
                                            <td colSpan="2" className="footer-label">
                                                {isFilteredView ? "Total Hasil Filter" : "Total Keseluruhan"}
                                            </td>
                                            <td className={`metric-cell metric-cell-danger${tableTotals.total_lebih_deadline > 0 ? " metric-emphasis" : ""}`}>
                                                <strong>{formatNumber(tableTotals.total_lebih_deadline)}</strong>
                                            </td>
                                            <td className="metric-cell metric-cell-info">
                                                <strong>{formatNumber(tableTotals.total_masih_deadline)}</strong>
                                            </td>
                                            <td className="metric-cell metric-cell-success">
                                                <strong>{formatNumber(tableTotals.total_pengiriman_minggu_ini)}</strong>
                                            </td>
                                            <td className="metric-cell metric-cell-warning">
                                                <strong>{formatNumber(tableTotals.total_rata_rata_pengiriman_mingguan)}</strong>
                                            </td>
                                            {selectedPeriods.map((offset) => {
                                                const key = `periode_${offset}`;
                                                return (
                                                    <td key={offset} className="metric-cell metric-cell-period">
                                                        <strong>{formatNumber(tableTotals.periods[key] || 0)}</strong>
                                                    </td>
                                                );
                                            })}
                                            <td className={`metric-cell delta-cell ${getDeltaClass(tableTotals.total_kenaikan_penurunan_dari_rata2)}`}>
                                                <strong>{formatSignedNumber(tableTotals.total_kenaikan_penurunan_dari_rata2)}</strong>
                                            </td>
                                            <td className="metric-cell metric-cell-neutral">
                                                <strong>{formatNumber(tableTotals.total_pengiriman_tertinggi)}</strong>
                                            </td>
                                            <td className={`metric-cell delta-cell ${getDeltaClass(tableTotals.total_kenaikan_penurunan_dari_tertinggi)}`}>
                                                <strong>{formatSignedNumber(tableTotals.total_kenaikan_penurunan_dari_tertinggi)}</strong>
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default DataDikerjakanPengirimanCmt;

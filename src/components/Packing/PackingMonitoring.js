import React, { useState, useEffect, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faTruck, faCheckCircle, faTimesCircle, faBoxOpen, faCalendarAlt, faCheckDouble, faPercent, faChartLine, faBolt, faSearch, faListUl } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import { Line, Doughnut, Scatter } from 'react-chartjs-2';
import 'chart.js/auto';
import '../Cutting/SpkCutting/DashboardCutting.css';
import './PackingMonitoring.css';

const formatNum = (n) => Number(n || 0).toLocaleString('id-ID');

const getCourier = (trackingNumber) => {
    if (!trackingNumber) return '-';
    const num = trackingNumber.toUpperCase();
    if (num.startsWith('SPX')) return 'Shopee Xpress';
    if (num.startsWith('JX')) return 'J&T Cargo';
    if (num.startsWith('JT')) return 'J&T Express';
    if (num.startsWith('TK')) return 'J&T Express';
    if (num.startsWith('ID')) return 'ID Express';
    if (num.startsWith('00')) return 'SiCepat';
    if (num.startsWith('NL')) return 'Ninja Xpress';
    if (num.startsWith('LX')) return 'Lex Express';
    return 'Lainnya';
};

// Konfigurasi status yang bisa dilacak langsung
const STATUS_FILTERS = [
    { key: 'ALL', label: 'Semua' },
    { key: 'SHIPPING', label: 'Dalam Perjalanan' },
    { key: 'OTHER', label: 'Menunggu Kurir' },
    { key: 'CANCELLED', label: 'Reject / Batal' },
    { key: 'DELIVERED', label: 'Selesai' },
];

const statusPillClass = (status) => {
    const map = { SHIPPING: 'is-shipping', DELIVERED: 'is-delivered', CANCELLED: 'is-cancelled' };
    return `pm-status-pill ${map[status] || 'is-other'}`;
};

const PackingMonitoring = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ total: 0, shipping: 0, delivered: 0, cancelled: 0, other: 0, chart_data: [] });
    const [orders, setOrders] = useState([]);
    const [statusFilter, setStatusFilter] = useState('SHIPPING');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/orders/daily-monitoring`, {
                params: { start_date: startDate, end_date: endDate },
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(res.data.summary);
            setOrders(Array.isArray(res.data.data) ? res.data.data : []);
        } catch (error) {
            console.error(error);
            toast.error('Gagal mengambil data monitoring');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    const dailyChartData = useMemo(() => {
        const rawData = summary.chart_data || [];
        if (!Array.isArray(rawData) || rawData.length === 0) return null;

        const labels = rawData.map(item => dayjs(item.date).format('DD MMM YYYY'));
        const totalData = rawData.map(item => Number(item.total_qty) || 0);
        const shippingData = rawData.map(item => Number(item.shipping_qty) || 0);
        const deliveredData = rawData.map(item => Number(item.delivered_qty) || 0);
        const cancelledData = rawData.map(item => Number(item.cancelled_qty) || 0);
        const otherData = rawData.map(item => Number(item.other_qty) || 0);

        return {
            labels,
            datasets: [
                {
                    label: "Total Dipacking",
                    data: totalData,
                    borderColor: "#0ea5e9", // Blue
                    backgroundColor: "rgba(14, 165, 233, 0.1)",
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: "#0ea5e9",
                },
                {
                    label: "Dalam Perjalanan",
                    data: shippingData,
                    borderColor: "#10b981", // Green
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: "#10b981",
                },
                {
                    label: "Selesai",
                    data: deliveredData,
                    borderColor: "#a855f7", // Purple
                    backgroundColor: "rgba(168, 85, 247, 0.1)",
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: "#a855f7",
                },
                {
                    label: "Menunggu Kurir",
                    data: otherData,
                    borderColor: "#f59e0b", // Yellow
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: "#f59e0b",
                },
                {
                    label: "Reject / Batal",
                    data: cancelledData,
                    borderColor: "#ef4444", // Red
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: "#ef4444",
                }
            ],
        };
    }, [summary.chart_data]);

    // Metrik analitis turunan dari summary
    const analytics = useMemo(() => {
        const total = Number(summary.total) || 0;
        const delivered = Number(summary.delivered) || 0;
        const shipping = Number(summary.shipping) || 0;
        const cancelled = Number(summary.cancelled) || 0;
        const rows = Array.isArray(summary.chart_data) ? summary.chart_data : [];
        const activeDays = rows.length || 0;

        const pct = (val) => (total > 0 ? (val / total) * 100 : 0);

        // Hari dengan output packing tertinggi
        let peak = null;
        rows.forEach((r) => {
            const qty = Number(r.total_qty) || 0;
            if (!peak || qty > peak.qty) peak = { date: r.date, qty };
        });

        return {
            total,
            completionRate: pct(delivered),
            inTransitRate: pct(shipping),
            cancelRate: pct(cancelled),
            awaitingRate: pct(Number(summary.other) || 0),
            avgPerDay: activeDays > 0 ? total / activeDays : 0,
            activeDays,
            peak,
        };
    }, [summary]);

    const awaitingScatterData = useMemo(() => {
        if (!orders || orders.length === 0) return null;

        const countsByDay = {};
        let maxDay = 0;
        let hasData = false;

        orders.forEach(o => {
            if (o.status !== 'SHIPPING' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED') {
                const days = o.picked_at ? dayjs().diff(dayjs(o.picked_at), 'day') : 0;
                countsByDay[days] = (countsByDay[days] || 0) + 1;
                if (days > maxDay) maxDay = days;
                hasData = true;
            }
        });

        if (!hasData) return null;

        const data = [];
        for (let i = 0; i <= maxDay; i++) {
            if (countsByDay[i] > 0) {
                data.push({ x: i, y: countsByDay[i] });
            }
        }

        return {
            datasets: [{
                label: 'Jumlah Pesanan',
                data,
                backgroundColor: '#f59e0b',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        };
    }, [orders]);

    const shippingScatterData = useMemo(() => {
        if (!orders || orders.length === 0) return null;

        const countsByDay = {};
        let maxDay = 0;
        let hasData = false;

        orders.forEach(o => {
            if (o.status === 'SHIPPING' && o.picked_at) {
                const days = Math.max(1, dayjs().diff(dayjs(o.picked_at), 'day'));
                countsByDay[days] = (countsByDay[days] || 0) + 1;
                if (days > maxDay) maxDay = days;
                hasData = true;
            }
        });

        if (!hasData) return null;

        const data = [];
        for (let i = 1; i <= maxDay; i++) {
            if (countsByDay[i] > 0) {
                data.push({ x: i, y: countsByDay[i] });
            }
        }

        return {
            datasets: [{
                label: 'Jumlah Pesanan',
                data,
                backgroundColor: '#0ea5e9',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        };
    }, [orders]);

    const scatterOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 13 },
                displayColors: false,
                callbacks: {
                    label: (ctx) => `${ctx.parsed.y} pesanan (${ctx.parsed.x} Hari)`
                }
            }
        },
        scales: {
            y: { beginAtZero: true, grid: { borderDash: [4, 4] }, title: { display: true, text: 'Jumlah Pesanan' } },
            x: { 
                type: 'linear', 
                grid: { display: false }, 
                title: { display: true, text: 'Durasi (Hari)' },
                ticks: { stepSize: 1 } 
            }
        }
    }), []);

    const matchStatus = (order, key) => {
        if (key === 'ALL') return true;
        if (key === 'OTHER') return !['SHIPPING', 'DELIVERED', 'CANCELLED'].includes(order.status);
        return order.status === key;
    };

    const statusCounts = useMemo(() => ({
        ALL: orders.length,
        SHIPPING: orders.filter((o) => matchStatus(o, 'SHIPPING')).length,
        OTHER: orders.filter((o) => matchStatus(o, 'OTHER')).length,
        CANCELLED: orders.filter((o) => matchStatus(o, 'CANCELLED')).length,
        DELIVERED: orders.filter((o) => matchStatus(o, 'DELIVERED')).length,
    }), [orders]);

    const filteredOrders = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return orders.filter((o) => {
            if (!matchStatus(o, statusFilter)) return false;
            if (!q) return true;
            return (
                (o.order_number || '').toLowerCase().includes(q) ||
                (o.tracking_number || '').toLowerCase().includes(q) ||
                (o.customer_name || '').toLowerCase().includes(q)
            );
        });
    }, [orders, statusFilter, searchQuery]);

    const statusDoughnutData = useMemo(() => {
        const segments = [
            { label: 'Selesai', value: Number(summary.delivered) || 0, color: '#a855f7' },
            { label: 'Dalam Perjalanan', value: Number(summary.shipping) || 0, color: '#10b981' },
            { label: 'Menunggu Kurir', value: Number(summary.other) || 0, color: '#f59e0b' },
            { label: 'Reject / Batal', value: Number(summary.cancelled) || 0, color: '#ef4444' },
        ].filter((s) => s.value > 0);

        if (segments.length === 0) return null;

        return {
            labels: segments.map((s) => s.label),
            datasets: [{
                data: segments.map((s) => s.value),
                backgroundColor: segments.map((s) => s.color),
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 6,
            }],
        };
    }, [summary]);

    const doughnutOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: { usePointStyle: true, boxWidth: 8, color: '#475569', padding: 14, font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: 11 } }
            },
            tooltip: {
                callbacks: {
                    label: (ctx) => {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const val = ctx.parsed;
                        const p = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                        return `${ctx.label}: ${val.toLocaleString('id-ID')} (${p}%)`;
                    }
                }
            }
        }
    }), []);

    const dailyChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                display: true, 
                position: 'top',
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    color: '#475569',
                    font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' }
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.parsed.y.toLocaleString("id-ID")} Pesanan`
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: "#6b7280", font: { family: "'Plus Jakarta Sans', sans-serif" } } },
            y: { beginAtZero: true, grid: { color: "rgba(148, 163, 184, 0.2)" }, ticks: { color: "#6b7280", font: { family: "'Plus Jakarta Sans', sans-serif" } } }
        }
    }), []);

    const statusCards = [
        { key: 'ALL', label: 'Total Dipacking', value: summary.total, icon: faBoxOpen, iconClass: 'pm-i-blue', ring: '#2458ce' },
        { key: 'SHIPPING', label: 'Dalam Perjalanan', value: summary.shipping, icon: faTruck, iconClass: 'pm-i-green', ring: '#16a34a' },
        { key: 'DELIVERED', label: 'Selesai', value: summary.delivered, icon: faCheckDouble, iconClass: 'pm-i-purple', ring: '#7c3aed' },
        { key: 'CANCELLED', label: 'Reject / Batal', value: summary.cancelled, icon: faTimesCircle, iconClass: 'pm-i-red', ring: '#e5484d' },
        { key: 'OTHER', label: 'Menunggu Kurir', value: summary.other, icon: faCheckCircle, iconClass: 'pm-i-amber', ring: '#d97706' },
    ];

    const insightCards = [
        { label: 'Tingkat Selesai', val: analytics.completionRate.toFixed(1) + '%', sub: formatNum(summary.delivered) + ' terkirim', icon: faPercent, iconClass: 'pm-i-purple' },
        { label: 'Tingkat Reject', val: analytics.cancelRate.toFixed(1) + '%', sub: formatNum(summary.cancelled) + ' batal', icon: faTimesCircle, iconClass: 'pm-i-red' },
        { label: 'Tunggu Kurir', val: analytics.awaitingRate.toFixed(1) + '%', sub: formatNum(summary.other) + ' blm pickup', icon: faBoxOpen, iconClass: 'pm-i-amber' },
        { label: 'Dlm Perjalanan', val: analytics.inTransitRate.toFixed(1) + '%', sub: formatNum(summary.shipping) + ' otw', icon: faTruck, iconClass: 'pm-i-green' },
        { label: 'Rata-rata/Hari', val: formatNum(Math.round(analytics.avgPerDay)), sub: analytics.activeDays + ' hari aktif', icon: faChartLine, iconClass: 'pm-i-teal' },
        { label: 'Hari Tertinggi', val: analytics.peak ? formatNum(analytics.peak.qty) : '-', sub: analytics.peak ? dayjs(analytics.peak.date).format('DD MMM') : 'Belum ada data', icon: faBolt, iconClass: 'pm-i-blue' },
    ];

    return (
        <div className="ks-page dc-page pm-page">
            <header className="ks-header">
                <div className="ks-header-id">
                    <div className="dc-title">
                        <FontAwesomeIcon icon={faTruck} style={{ color: '#2458ce' }} />
                        <h1>Monitoring Hasil Packing</h1>
                    </div>
                    <span className="ks-header-sub">
                        <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: 6, color: '#2458ce' }} />
                        Pantau pergerakan status pesanan secara real-time
                    </span>
                </div>
                <div className="ks-header-actions">
                    <button className="ks-btn pm-back-btn" onClick={() => navigate('/packing')} title="Kembali">
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <div className="pm-date-range">
                        <span className="pm-date-label">Mulai</span>
                        <input type="date" className="pm-date-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="Tanggal Mulai" />
                        <span className="pm-date-sep">–</span>
                        <span className="pm-date-label">Sampai</span>
                        <input type="date" className="pm-date-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="Tanggal Akhir" />
                    </div>
                </div>
            </header>

            <main className="dc-main">
                {loading ? (
                    <div className="pm-loading">
                        <Spinner animation="border" style={{ color: '#2458ce', width: '3rem', height: '3rem' }} />
                        <span>Memuat data monitoring...</span>
                    </div>
                ) : (
                    <>
                        <section className="pm-status-row">
                            {statusCards.map((card) => {
                                const active = statusFilter === card.key;
                                return (
                                    <div
                                        key={card.key}
                                        className={`dc-card pm-status-card${active ? ' is-active' : ''}`}
                                        style={{ '--pm-ring': card.ring, '--pm-ring-bg': `${card.ring}0d`, '--pm-ring-shadow': `${card.ring}22` }}
                                        onClick={() => setStatusFilter(card.key)}
                                        title={`Lacak pesanan: ${card.label}`}
                                    >
                                        <div className="dc-kpi-head">
                                            <span className={`dc-kpi-icon ${card.iconClass}`}><FontAwesomeIcon icon={card.icon} /></span>
                                            <span className="dc-kpi-label">{card.label}</span>
                                        </div>
                                        <div className="dc-kpi-value">{formatNum(card.value)}</div>
                                    </div>
                                );
                            })}
                        </section>

                        <section className="pm-insight-row">
                            {insightCards.map((insight, idx) => (
                                <div key={idx} className="dc-card pm-insight-card">
                                    <span className={`dc-kpi-icon ${insight.iconClass}`}><FontAwesomeIcon icon={insight.icon} /></span>
                                    <div className="pm-insight-body">
                                        <span className="dc-kpi-label">{insight.label}</span>
                                        <span className="pm-insight-value">{insight.val}</span>
                                        <span className="pm-insight-sub">{insight.sub}</span>
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className="pm-analytics-row">
                            <div className="dc-card dc-chart-card">
                                <div className="dc-card-head"><span className="dc-card-title">Grafik Produksi Harian</span></div>
                                <div className="dc-chart-area">
                                    {!dailyChartData ? (
                                        <div className="dc-empty">Belum ada data hasil packing</div>
                                    ) : (
                                        <Line data={dailyChartData} options={dailyChartOptions} />
                                    )}
                                </div>
                            </div>

                            <div className="dc-card dc-chart-card">
                                <div className="dc-card-head"><span className="dc-card-title">Distribusi Status</span></div>
                                <div className="dc-chart-area">
                                    {!statusDoughnutData ? (
                                        <div className="dc-empty">Belum ada data status</div>
                                    ) : (
                                        <Doughnut data={statusDoughnutData} options={doughnutOptions} />
                                    )}
                                </div>
                            </div>

                            <div className="dc-card dc-chart-card">
                                <div className="dc-card-head"><span className="dc-card-title">Durasi Menunggu Kurir</span></div>
                                <div className="dc-chart-area">
                                    {!awaitingScatterData ? (
                                        <div className="dc-empty pm-empty-pad">Semua pesanan sudah dibawa kurir</div>
                                    ) : (
                                        <Scatter data={awaitingScatterData} options={scatterOptions} />
                                    )}
                                </div>
                            </div>

                            <div className="dc-card dc-chart-card">
                                <div className="dc-card-head"><span className="dc-card-title">Durasi Dalam Perjalanan</span></div>
                                <div className="dc-chart-area">
                                    {!shippingScatterData ? (
                                        <div className="dc-empty pm-empty-pad">Belum ada data pengiriman aktif</div>
                                    ) : (
                                        <Scatter data={shippingScatterData} options={scatterOptions} />
                                    )}
                                </div>
                            </div>
                        </section>

                        <div className="dc-card pm-table-card">
                            <div className="dc-card-head pm-table-head">
                                <span className="dc-card-title pm-table-title">
                                    <FontAwesomeIcon icon={faListUl} style={{ color: '#2458ce', marginRight: 6 }} />
                                    Detail Pesanan untuk Dilacak ({formatNum(filteredOrders.length)})
                                </span>
                                <div className="pm-table-tools">
                                    <div className="pm-search-wrap">
                                        <FontAwesomeIcon icon={faSearch} className="pm-search-icon" />
                                        <input
                                            type="text"
                                            className="pm-search-input"
                                            placeholder="Cari order / resi / pelanggan..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="pm-select"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        {STATUS_FILTERS.map((f) => (
                                            <option key={f.key} value={f.key}>{f.label} ({formatNum(statusCounts[f.key] || 0)})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="dc-table-wrap pm-table-scroll">
                                <table className="dc-grid">
                                    <thead>
                                        <tr>
                                            {['No. Order', 'No. Resi', 'Kurir', 'Pelanggan', 'Qty', 'Status', 'Tanggal Beli', 'Tanggal Kirim', 'Notes'].map((h, i) => (
                                                <th key={i} style={(h === 'Qty' || h === 'Status' || h === 'Kurir') ? { textAlign: 'center' } : undefined}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" className="dc-empty">Tidak ada pesanan pada status / pencarian ini.</td>
                                            </tr>
                                        ) : (
                                            filteredOrders.map((order) => (
                                                <tr key={order.id}>
                                                    <td className="pm-order-cell">
                                                        <span>{order.order_number || '-'}</span>
                                                        {order.order_type === 'PRE_ORDER' && <span className="pm-po-tag">PO</span>}
                                                    </td>
                                                    <td className="pm-mono">{order.tracking_number || '-'}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className="pm-tag">{getCourier(order.tracking_number)}</span>
                                                    </td>
                                                    <td>{order.customer_name || '-'}</td>
                                                    <td className="dc-num">{order.total_qty}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={statusPillClass(order.status)}>{order.status || '-'}</span>
                                                    </td>
                                                    <td className="pm-muted">{order.order_date ? dayjs(order.order_date).format('DD MMM YYYY, HH:mm') : '-'}</td>
                                                    <td className="pm-muted">{order.picked_at ? dayjs(order.picked_at).format('DD MMM YYYY, HH:mm') : '-'}</td>
                                                    <td className="pm-muted">
                                                        {order.status === 'SHIPPING' && order.picked_at ? (
                                                            <span className="pm-duration-pill is-shipping">
                                                                <FontAwesomeIcon icon={faTruck} style={{ marginRight: 5 }} />
                                                                {dayjs().diff(dayjs(order.picked_at), 'day')} Hari
                                                            </span>
                                                        ) : (order.status !== 'SHIPPING' && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.picked_at) ? (
                                                            <span className="pm-duration-pill is-waiting">
                                                                <FontAwesomeIcon icon={faBoxOpen} style={{ marginRight: 5 }} />
                                                                {dayjs().diff(dayjs(order.picked_at), 'day')} Hari
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default PackingMonitoring;

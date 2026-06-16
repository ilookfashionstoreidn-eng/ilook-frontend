import React, { useState, useEffect, useMemo } from 'react';
import { Spinner, Form, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faTruck, faCheckCircle, faTimesCircle, faBoxOpen, faCalendarAlt, faCheckDouble, faPercent, faChartLine, faBolt, faCalendarDay, faSearch, faListUl } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import { Line, Doughnut, Scatter } from 'react-chartjs-2';
import 'chart.js/auto';
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

const statusBadgeStyle = (status) => {
    const map = {
        SHIPPING: { bg: '#dcfce7', color: '#166534' },
        DELIVERED: { bg: '#f3e8ff', color: '#6b21a8' },
        CANCELLED: { bg: '#fee2e2', color: '#991b1b' },
    };
    const s = map[status] || { bg: '#fef3c7', color: '#92400e' };
    return { backgroundColor: s.bg, color: s.color, padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap', display: 'inline-block' };
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

    return (
        <div className="packing-dashboard-page">
            <div className="packing-dashboard-header">
                <div className="packing-title-row">
                    <button className="packing-back-btn" onClick={() => navigate('/packing')} title="Kembali">
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <div className="packing-dashboard-title">
                        <h1>Monitoring Hasil Packing</h1>
                        <div className="packing-dashboard-subtitle">
                            <FontAwesomeIcon icon={faCalendarAlt} className="me-2" style={{ color: '#0ea5e9' }} />
                            Pantau pergerakan status pesanan secara real-time
                        </div>
                    </div>
                </div>

                <div className="packing-dashboard-controls">
                    <Form.Control 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        style={{ border: '1px solid rgba(148, 163, 184, 0.6)', borderRadius: '999px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', color: '#0f172a', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)', width: '150px' }}
                        title="Tanggal Mulai"
                    />
                    <span style={{ color: '#64748b', fontWeight: '600' }}>-</span>
                    <Form.Control 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        style={{ border: '1px solid rgba(148, 163, 184, 0.6)', borderRadius: '999px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', color: '#0f172a', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)', width: '150px' }}
                        title="Tanggal Akhir"
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
                    <Spinner animation="border" style={{ color: '#0ea5e9', width: '3rem', height: '3rem' }} />
                    <span style={{ marginTop: '16px', color: '#64748b', fontWeight: '500' }}>Memuat data monitoring...</span>
                </div>
            ) : (
                <>
                    <div className="packing-dashboard-top-grid">
                        {[
                            { key: 'ALL', label: 'Total Dipacking', value: summary.total, icon: faBoxOpen, grad: 'bg-blue-gradient', ring: '#0ea5e9' },
                            { key: 'SHIPPING', label: 'Dalam Perjalanan', value: summary.shipping, icon: faTruck, grad: 'bg-green-gradient', ring: '#10b981' },
                            { key: 'DELIVERED', label: 'Selesai', value: summary.delivered, icon: faCheckDouble, grad: 'bg-purple-gradient', ring: '#a855f7' },
                            { key: 'CANCELLED', label: 'Reject / Batal', value: summary.cancelled, icon: faTimesCircle, grad: 'bg-red-gradient', ring: '#ef4444' },
                            { key: 'OTHER', label: 'Menunggu Kurir', value: summary.other, icon: faCheckCircle, grad: 'bg-yellow-gradient', ring: '#f59e0b' },
                        ].map((card) => (
                            <div
                                key={card.key}
                                className="packing-card packing-card-clickable"
                                onClick={() => setStatusFilter(card.key)}
                                style={statusFilter === card.key ? { borderColor: card.ring, boxShadow: `0 0 0 2px ${card.ring}33`, cursor: 'pointer' } : { cursor: 'pointer' }}
                                title={`Lacak pesanan: ${card.label}`}
                            >
                                <div className="packing-card-header">
                                    <span className="packing-card-label">{card.label}</span>
                                    <div className={`packing-icon-wrapper ${card.grad}`}>
                                        <FontAwesomeIcon icon={card.icon} size="lg" />
                                    </div>
                                </div>
                                <div className="packing-card-main-value">{formatNum(card.value)}</div>
                            </div>
                        ))}
                    </div>

                    <div className="packing-insight-row">
                        <div className="packing-insight-chip">
                            <div className="chip-icon bg-purple-gradient"><FontAwesomeIcon icon={faPercent} /></div>
                            <div className="chip-body">
                                <span className="chip-label">Tingkat Selesai</span>
                                <span className="chip-value">{analytics.completionRate.toFixed(1)}%</span>
                                <span className="chip-sub">{formatNum(summary.delivered)} pesanan terkirim</span>
                            </div>
                        </div>
                        <div className="packing-insight-chip">
                            <div className="chip-icon bg-red-gradient"><FontAwesomeIcon icon={faTimesCircle} /></div>
                            <div className="chip-body">
                                <span className="chip-label">Tingkat Reject</span>
                                <span className="chip-value">{analytics.cancelRate.toFixed(1)}%</span>
                                <span className="chip-sub">{formatNum(summary.cancelled)} pesanan batal</span>
                            </div>
                        </div>
                        <div className="packing-insight-chip">
                            <div className="chip-icon bg-yellow-gradient"><FontAwesomeIcon icon={faBoxOpen} /></div>
                            <div className="chip-body">
                                <span className="chip-label">Tunggu Kurir</span>
                                <span className="chip-value">{analytics.awaitingRate.toFixed(1)}%</span>
                                <span className="chip-sub">{formatNum(summary.other)} blm dipickup</span>
                            </div>
                        </div>
                        <div className="packing-insight-chip">
                            <div className="chip-icon bg-green-gradient"><FontAwesomeIcon icon={faTruck} /></div>
                            <div className="chip-body">
                                <span className="chip-label">Dlm Perjalanan</span>
                                <span className="chip-value">{analytics.inTransitRate.toFixed(1)}%</span>
                                <span className="chip-sub">{formatNum(summary.shipping)} otw</span>
                            </div>
                        </div>
                        <div className="packing-insight-chip">
                            <div className="chip-icon bg-teal-gradient"><FontAwesomeIcon icon={faChartLine} /></div>
                            <div className="chip-body">
                                <span className="chip-label">Rata-rata / Hari</span>
                                <span className="chip-value">{formatNum(Math.round(analytics.avgPerDay))}</span>
                                <span className="chip-sub">{analytics.activeDays} hari aktif packing</span>
                            </div>
                        </div>
                        <div className="packing-insight-chip">
                            <div className="chip-icon bg-blue-gradient"><FontAwesomeIcon icon={faBolt} /></div>
                            <div className="chip-body">
                                <span className="chip-label">Hari Tertinggi</span>
                                <span className="chip-value">{analytics.peak ? formatNum(analytics.peak.qty) : '-'}</span>
                                <span className="chip-sub">
                                    <FontAwesomeIcon icon={faCalendarDay} className="me-1" />
                                    {analytics.peak ? dayjs(analytics.peak.date).format('DD MMM YYYY') : 'Belum ada data'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="packing-analytics-grid mt-2" style={{ gridTemplateColumns: '7fr 1.2fr 1.2fr 1.2fr' }}>
                        <div className="packing-card packing-card-chart">
                            <div className="packing-card-header">
                                <span className="packing-card-label">Grafik Produksi Harian</span>
                            </div>
                            <div className="packing-chart-wrapper compact">
                                {!dailyChartData ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                        Belum ada data hasil packing
                                    </div>
                                ) : (
                                    <Line data={dailyChartData} options={dailyChartOptions} />
                                )}
                            </div>
                        </div>

                        <div className="packing-card">
                            <div className="packing-card-header">
                                <span className="packing-card-label">Distribusi Status</span>
                            </div>
                            <div className="packing-chart-wrapper compact">
                                {!statusDoughnutData ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                        Belum ada data status
                                    </div>
                                ) : (
                                    <Doughnut data={statusDoughnutData} options={doughnutOptions} />
                                )}
                            </div>
                        </div>
                        <div className="packing-card">
                            <div className="packing-card-header">
                                <span className="packing-card-label">Durasi Menunggu Kurir</span>
                            </div>
                            <div className="packing-chart-wrapper compact">
                                {!awaitingScatterData ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                                        Semua pesanan sudah dibawa kurir
                                    </div>
                                ) : (
                                    <Scatter data={awaitingScatterData} options={scatterOptions} />
                                )}
                            </div>
                        </div>

                        <div className="packing-card">
                            <div className="packing-card-header">
                                <span className="packing-card-label">Durasi Dalam Perjalanan</span>
                            </div>
                            <div className="packing-chart-wrapper compact">
                                {!shippingScatterData ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                                        Belum ada data pengiriman aktif
                                    </div>
                                ) : (
                                    <Scatter data={shippingScatterData} options={scatterOptions} />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="packing-card mt-2" style={{ padding: '20px' }}>
                        <div className="packing-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                            <span className="packing-card-label">
                                <FontAwesomeIcon icon={faListUl} className="me-2" style={{ color: '#0ea5e9' }} />
                                Detail Pesanan untuk Dilacak ({formatNum(filteredOrders.length)})
                            </span>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative' }}>
                                    <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }} />
                                    <Form.Control
                                        type="text"
                                        placeholder="Cari order / resi / pelanggan..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 14px 8px 38px', fontSize: '13px', width: '260px', backgroundColor: '#f8fafc' }}
                                    />
                                </div>
                                <Form.Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', color: '#475569', padding: '8px 36px 8px 14px', cursor: 'pointer', backgroundColor: '#f8fafc', width: 'auto' }}
                                >
                                    {STATUS_FILTERS.map((f) => (
                                        <option key={f.key} value={f.key}>{f.label} ({formatNum(statusCounts[f.key] || 0)})</option>
                                    ))}
                                </Form.Select>
                            </div>
                        </div>

                        <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                            <Table hover style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
                                <thead>
                                    <tr>
                                        {['No. Order', 'No. Resi', 'Kurir', 'Pelanggan', 'Qty', 'Status', 'Tanggal Beli', 'Tanggal Kirim', 'Notes'].map((h, i) => (
                                            <th key={i} style={{ backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '600', padding: '12px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10, fontSize: '12.5px', textAlign: (h === 'Qty' || h === 'Status' || h === 'Kurir') ? 'center' : 'left' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="text-center" style={{ padding: '28px', color: '#94a3b8' }}>
                                                Tidak ada pesanan pada status / pencarian ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrders.map((order) => (
                                            <tr key={order.id}>
                                                <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>{order.order_number || '-'}</td>
                                                <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontFamily: 'monospace', fontSize: '12.5px', color: '#334155' }}>{order.tracking_number || '-'}</td>
                                                <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    <span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>{getCourier(order.tracking_number)}</span>
                                                </td>
                                                <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontSize: '13px', color: '#334155' }}>{order.customer_name || '-'}</td>
                                                <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: '13px' }}>{order.total_qty}</td>
                                                <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    <span style={statusBadgeStyle(order.status)}>{order.status || '-'}</span>
                                                </td>
                                                <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontSize: '12.5px', color: '#64748b' }}>{order.order_date ? dayjs(order.order_date).format('DD MMM YYYY, HH:mm') : '-'}</td>
                                                <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontSize: '12.5px', color: '#64748b' }}>{order.picked_at ? dayjs(order.picked_at).format('DD MMM YYYY, HH:mm') : '-'}</td>
                                                <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontSize: '12.5px', color: '#64748b', fontWeight: '500' }}>
                                                    {order.status === 'SHIPPING' && order.picked_at ? (
                                                        <span style={{ color: '#ea580c', backgroundColor: '#ffedd5', padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                                            <FontAwesomeIcon icon={faTruck} className="me-1" />
                                                            {dayjs().diff(dayjs(order.picked_at), 'day')} Hari
                                                        </span>
                                                    ) : (order.status !== 'SHIPPING' && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.picked_at) ? (
                                                        <span style={{ color: '#ca8a04', backgroundColor: '#fef08a', padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                                            <FontAwesomeIcon icon={faBoxOpen} className="me-1" />
                                                            {dayjs().diff(dayjs(order.picked_at), 'day')} Hari
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PackingMonitoring;

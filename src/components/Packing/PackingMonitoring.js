import React, { useState, useEffect, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
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
        <div className="ks-page">
            <header className="ks-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <button className="ks-btn" onClick={() => navigate('/packing')} title="Kembali" style={{ height: '36px', width: '36px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <div className="ks-header-id" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#0f172a' }}>Monitoring Hasil Packing</h1>
                        <span className="ks-header-sub">
                            <FontAwesomeIcon icon={faCalendarAlt} className="me-2" style={{ color: '#0ea5e9' }} />
                            Pantau pergerakan status pesanan secara real-time
                        </span>
                    </div>
                </div>
                <div className="ks-header-actions">
                    <div className="ks-toolbar" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Mulai:</span>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            style={{ height: '36px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 12px', fontSize: '13px', outline: 'none', color: '#0f172a', background: '#fff' }}
                            title="Tanggal Mulai"
                        />
                        <span style={{ color: '#64748b', fontWeight: '600', margin: '0 4px' }}>-</span>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Sampai:</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            style={{ height: '36px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 12px', fontSize: '13px', outline: 'none', color: '#0f172a', background: '#fff' }}
                            title="Tanggal Akhir"
                        />
                    </div>
                </div>
            </header>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
                    <Spinner animation="border" style={{ color: '#0ea5e9', width: '3rem', height: '3rem' }} />
                    <span style={{ marginTop: '16px', color: '#64748b', fontWeight: '500' }}>Memuat data monitoring...</span>
                </div>
            ) : (
                <>
                    <div className="ks-statrail" style={{ marginTop: '16px', padding: '0 20px', gap: '16px' }}>
                        {[
                            { key: 'ALL', label: 'Total Dipacking', value: summary.total, icon: faBoxOpen, grad: 'bg-blue-gradient', ring: '#0ea5e9' },
                            { key: 'SHIPPING', label: 'Dalam Perjalanan', value: summary.shipping, icon: faTruck, grad: 'bg-green-gradient', ring: '#10b981' },
                            { key: 'DELIVERED', label: 'Selesai', value: summary.delivered, icon: faCheckDouble, grad: 'bg-purple-gradient', ring: '#a855f7' },
                            { key: 'CANCELLED', label: 'Reject / Batal', value: summary.cancelled, icon: faTimesCircle, grad: 'bg-red-gradient', ring: '#ef4444' },
                            { key: 'OTHER', label: 'Menunggu Kurir', value: summary.other, icon: faCheckCircle, grad: 'bg-yellow-gradient', ring: '#f59e0b' },
                        ].map((card) => (
                            <div
                                key={card.key}
                                className="ks-board"
                                onClick={() => setStatusFilter(card.key)}
                                style={{ margin: 0, padding: '16px 20px', cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                    border: statusFilter === card.key ? `2px solid ${card.ring}` : '1px solid #e2e8f0',
                                    backgroundColor: statusFilter === card.key ? `${card.ring}0d` : '#fff',
                                    boxShadow: statusFilter === card.key ? `0 4px 12px ${card.ring}22` : '0 1px 2px rgba(15, 23, 42, 0.06)',
                                    transition: 'all 0.2s ease'
                                }}
                                title={`Lacak pesanan: ${card.label}`}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>{card.label}</span>
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1 }}>{formatNum(card.value)}</div>
                                </div>
                                <div className={`packing-icon-wrapper ${card.grad}`} style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', color: '#fff' }}>
                                    <FontAwesomeIcon icon={card.icon} size="lg" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', padding: '0 20px', margin: '0 0 16px 0' }}>
                        {[
                            { label: 'Tingkat Selesai', val: analytics.completionRate.toFixed(1) + '%', sub: formatNum(summary.delivered) + ' terkirim', icon: faPercent, grad: 'bg-purple-gradient' },
                            { label: 'Tingkat Reject', val: analytics.cancelRate.toFixed(1) + '%', sub: formatNum(summary.cancelled) + ' batal', icon: faTimesCircle, grad: 'bg-red-gradient' },
                            { label: 'Tunggu Kurir', val: analytics.awaitingRate.toFixed(1) + '%', sub: formatNum(summary.other) + ' blm pickup', icon: faBoxOpen, grad: 'bg-yellow-gradient' },
                            { label: 'Dlm Perjalanan', val: analytics.inTransitRate.toFixed(1) + '%', sub: formatNum(summary.shipping) + ' otw', icon: faTruck, grad: 'bg-green-gradient' },
                            { label: 'Rata-rata/Hari', val: formatNum(Math.round(analytics.avgPerDay)), sub: analytics.activeDays + ' hari aktif', icon: faChartLine, grad: 'bg-teal-gradient' },
                            { label: 'Hari Tertinggi', val: analytics.peak ? formatNum(analytics.peak.qty) : '-', sub: analytics.peak ? dayjs(analytics.peak.date).format('DD MMM') : 'Belum ada data', icon: faBolt, grad: 'bg-blue-gradient' }
                        ].map((insight, idx) => (
                            <div key={idx} className="ks-board" style={{ padding: '16px', display: 'flex', flexDirection: 'row', gap: '14px', alignItems: 'center', borderRadius: '12px', margin: 0 }}>
                                <div className={`chip-icon ${insight.grad}`} style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                                    <FontAwesomeIcon icon={insight.icon} size="lg" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{insight.label}</span>
                                    <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{insight.val}</span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{insight.sub}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', padding: '16px 20px' }}>
                        <div className="ks-board" style={{ padding: '16px' }}>
                            <div style={{ marginBottom: '12px', fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>Grafik Produksi Harian</div>
                            <div className="packing-chart-wrapper compact" style={{ height: '220px' }}>
                                {!dailyChartData ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                        Belum ada data hasil packing
                                    </div>
                                ) : (
                                    <Line data={dailyChartData} options={{...dailyChartOptions, maintainAspectRatio: false}} />
                                )}
                            </div>
                        </div>

                        <div className="ks-board" style={{ padding: '16px' }}>
                            <div style={{ marginBottom: '12px', fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>Distribusi Status</div>
                            <div className="packing-chart-wrapper compact" style={{ height: '220px' }}>
                                {!statusDoughnutData ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                        Belum ada data status
                                    </div>
                                ) : (
                                    <Doughnut data={statusDoughnutData} options={{...doughnutOptions, maintainAspectRatio: false}} />
                                )}
                            </div>
                        </div>

                        <div className="ks-board" style={{ padding: '16px' }}>
                            <div style={{ marginBottom: '12px', fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>Durasi Menunggu Kurir</div>
                            <div className="packing-chart-wrapper compact" style={{ height: '220px' }}>
                                {!awaitingScatterData ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                                        Semua pesanan sudah dibawa kurir
                                    </div>
                                ) : (
                                    <Scatter data={awaitingScatterData} options={{...scatterOptions, maintainAspectRatio: false}} />
                                )}
                            </div>
                        </div>

                        <div className="ks-board" style={{ padding: '16px' }}>
                            <div style={{ marginBottom: '12px', fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>Durasi Dalam Perjalanan</div>
                            <div className="packing-chart-wrapper compact" style={{ height: '220px' }}>
                                {!shippingScatterData ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                                        Belum ada data pengiriman aktif
                                    </div>
                                ) : (
                                    <Scatter data={shippingScatterData} options={{...scatterOptions, maintainAspectRatio: false}} />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="ks-board" style={{ margin: '16px 20px 20px', padding: '16px' }}>
                        <div className="ks-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                            <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '15px' }}>
                                <FontAwesomeIcon icon={faListUl} className="me-2" style={{ color: '#0ea5e9' }} />
                                Detail Pesanan untuk Dilacak ({formatNum(filteredOrders.length)})
                            </span>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative' }}>
                                    <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }} />
                                    <input
                                        type="text"
                                        placeholder="Cari order / resi / pelanggan..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 12px 0 34px', fontSize: '13px', width: '240px', backgroundColor: '#f8fafc', height: '36px', outline: 'none' }}
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{ borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '500', color: '#475569', padding: '0 32px 0 12px', cursor: 'pointer', backgroundColor: '#f8fafc', height: '36px', outline: 'none', appearance: 'none', background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 12px center', backgroundSize: '12px' }}
                                >
                                    {STATUS_FILTERS.map((f) => (
                                        <option key={f.key} value={f.key}>{f.label} ({formatNum(statusCounts[f.key] || 0)})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="ks-grid-scroll" style={{ maxHeight: '420px' }}>
                            <table className="ks-grid">
                                <thead>
                                    <tr>
                                        {['No. Order', 'No. Resi', 'Kurir', 'Pelanggan', 'Qty', 'Status', 'Tanggal Beli', 'Tanggal Kirim', 'Notes'].map((h, i) => (
                                            <th key={i} style={{ textAlign: (h === 'Qty' || h === 'Status' || h === 'Kurir') ? 'center' : 'left' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                                                Tidak ada pesanan pada status / pencarian ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrders.map((order) => (
                                            <tr key={order.id}>
                                                <td style={{ fontWeight: '600' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span>{order.order_number || '-'}</span>
                                                        {order.order_type === 'PRE_ORDER' && (
                                                            <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px' }}>PO</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ fontFamily: 'monospace', color: '#334155' }}>{order.tracking_number || '-'}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>{getCourier(order.tracking_number)}</span>
                                                </td>
                                                <td>{order.customer_name || '-'}</td>
                                                <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>{order.total_qty}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={statusBadgeStyle(order.status)}>{order.status || '-'}</span>
                                                </td>
                                                <td style={{ color: '#64748b' }}>{order.order_date ? dayjs(order.order_date).format('DD MMM YYYY, HH:mm') : '-'}</td>
                                                <td style={{ color: '#64748b' }}>{order.picked_at ? dayjs(order.picked_at).format('DD MMM YYYY, HH:mm') : '-'}</td>
                                                <td style={{ color: '#64748b', fontWeight: '500' }}>
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
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PackingMonitoring;

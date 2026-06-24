import React, { useState, useEffect, useMemo } from 'react';
import { Spinner, Form, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBoxOpen, faCalendarAlt, faInbox, faClock, faCubes, faLayerGroup, faChartColumn } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Doughnut, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import './PackingMonitoring.css';
import './PackingDailyPackingReport.css';

// Distinct, stable palette per packing mode.
const MODE_COLORS = {
    'Normal': '#10b981',
    'Random': '#0ea5e9',
    'Pendingan': '#f59e0b',
    'Belum Barcode': '#8b5cf6',
    'Inject Data': '#ec4899',
    'No Data Ginee': '#ef4444',
};
const fallbackColor = (i) => ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#64748b'][i % 7];

const PackingDailyPackingReport = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [hourlyData, setHourlyData] = useState([]);
    const [byMode, setByMode] = useState([]);
    const [summary, setSummary] = useState({ total_orders: 0, total_items: 0, total_operators: 0, peak_hour: null, peak_hour_count: 0 });

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/orders/daily-packing-report`, {
                params: { start_date: startDate, end_date: endDate },
                headers: { Authorization: `Bearer ${token}` }
            });
            setReportData(res.data.data || []);
            setHourlyData(res.data.hourly_chart || []);
            setByMode(res.data.by_mode || []);
            setSummary(res.data.summary || { total_orders: 0, total_items: 0, total_operators: 0, peak_hour: null, peak_hour_count: 0 });
        } catch (error) {
            console.error(error);
            toast.error('Gagal mengambil laporan packing harian');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    const nf = (n) => Number(n || 0).toLocaleString('id-ID');

    // ── Heatmap matrix: rows = days (newest first), cols = hours 0-23 ──
    const heatmap = useMemo(() => {
        const byDate = {};
        let max = 0;
        hourlyData.forEach((d) => {
            const date = d.date;
            const hour = parseInt(d.hour, 10);
            const val = parseInt(d.total_packed || 0, 10);
            if (!byDate[date]) byDate[date] = {};
            byDate[date][hour] = (byDate[date][hour] || 0) + val;
            if (byDate[date][hour] > max) max = byDate[date][hour];
        });
        const dates = Object.keys(byDate).sort((a, b) => (a < b ? 1 : -1));
        return { byDate, dates, max };
    }, [hourlyData]);

    const heatColor = (val) => {
        if (!val) return '#f1f5f9';
        const alpha = 0.15 + 0.85 * (val / (heatmap.max || 1));
        return `rgba(16, 185, 129, ${alpha.toFixed(3)})`;
    };

    // Jumlah hari yang punya aktivitas packing dalam rentang (untuk rata-rata per hari).
    const activeDays = useMemo(() => new Set(hourlyData.map((d) => d.date)).size, [hourlyData]);

    // ── Hourly bar chart: rata-rata order per jam per hari aktif ──
    const hourlyChart = useMemo(() => {
        const totals = Array(24).fill(0);
        hourlyData.forEach((d) => {
            totals[parseInt(d.hour, 10)] += parseInt(d.total_packed || 0, 10);
        });
        const divisor = activeDays || 1;
        const avg = totals.map((t) => Math.round((t / divisor) * 10) / 10);
        return {
            labels: avg.map((_, h) => `${h.toString().padStart(2, '0')}`),
            datasets: [{
                label: 'Rata-rata order/hari',
                data: avg,
                backgroundColor: totals.map((_, h) => (h === summary.peak_hour ? '#f59e0b' : 'rgba(16, 185, 129, 0.55)')),
                hoverBackgroundColor: totals.map((_, h) => (h === summary.peak_hour ? '#d97706' : '#10b981')),
                borderRadius: 4,
                borderSkipped: false,
                maxBarThickness: 22,
            }],
        };
    }, [hourlyData, activeDays, summary.peak_hour]);

    const hourlyChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            datalabels: { display: false },
            tooltip: {
                callbacks: {
                    title: (items) => `Jam ${items[0].label}:00`,
                    label: (ctx) => ` ${ctx.parsed.y.toLocaleString('id-ID', { maximumFractionDigits: 1 })} order/hari (rata-rata)`,
                },
            },
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 9.5 }, maxRotation: 0, autoSkip: false, callback: (v, i) => (i % 2 === 0 ? `${i.toString().padStart(2, '0')}` : '') } },
            y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } }, grid: { color: '#f1f5f9' } },
        },
    };

    // ── Mode donut ──
    const modeChart = useMemo(() => {
        const rows = (byMode || []).filter((m) => m.total_orders > 0);
        return {
            labels: rows.map((m) => m.mode_label),
            datasets: [{
                data: rows.map((m) => m.total_orders),
                backgroundColor: rows.map((m, i) => MODE_COLORS[m.mode_label] || fallbackColor(i)),
                borderColor: '#fff',
                borderWidth: 2,
            }],
        };
    }, [byMode]);

    const modeChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
            legend: { display: false },
            datalabels: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => {
                        const total = ctx.dataset.data.reduce((s, v) => s + v, 0) || 1;
                        const pct = ((ctx.parsed / total) * 100).toFixed(1);
                        return ` ${ctx.label}: ${ctx.parsed.toLocaleString('id-ID')} order (${pct}%)`;
                    }
                }
            }
        }
    };

    const avgPeakPerDay = summary.peak_hour != null
        ? Math.round((summary.peak_hour_count / (activeDays || 1)) * 10) / 10
        : 0;

    const peakHourLabel = summary.peak_hour != null
        ? `${summary.peak_hour.toString().padStart(2, '0')}:00`
        : '—';

    return (
        <div className="packing-dashboard-page">
            <div className="packing-dashboard-header" style={{ flexShrink: 0 }}>
                <div className="packing-title-row">
                    <button className="packing-back-btn" onClick={() => navigate('/packing')} title="Kembali">
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <div className="packing-dashboard-title">
                        <h1>Laporan Packing Harian</h1>
                        <div className="packing-dashboard-subtitle">
                            <FontAwesomeIcon icon={faBoxOpen} className="me-2" style={{ color: '#10b981' }} />
                            Analitik packing: volume, petugas, mode, & jam sibuk
                        </div>
                    </div>
                </div>

                <div className="packing-dashboard-controls">
                    <div className="pdr-daterange">
                        <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="Tanggal Mulai" />
                        <span className="pdr-daterange-sep">—</span>
                        <Form.Control type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="Tanggal Akhir" />
                    </div>
                    {loading && <Spinner animation="border" size="sm" style={{ color: '#0ea5e9', marginLeft: 12 }} />}
                </div>
            </div>

            <div className="packing-dashboard-content">
                {/* ── KPI ── */}
                <div className="pdr-kpi-grid">
                    <div className="pdr-stat-card">
                        <div className="pdr-stat-icon bg-green-gradient"><FontAwesomeIcon icon={faBoxOpen} /></div>
                        <div className="pdr-stat-body">
                            <span className="pdr-stat-label">Total Order Dipacking</span>
                            <span className="pdr-stat-value" style={{ color: '#10b981' }}>{nf(summary.total_orders)}</span>
                            <span className="pdr-stat-sub">order dalam periode ini</span>
                        </div>
                    </div>
                    <div className="pdr-stat-card">
                        <div className="pdr-stat-icon" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}><FontAwesomeIcon icon={faCubes} /></div>
                        <div className="pdr-stat-body">
                            <span className="pdr-stat-label">Total Barang</span>
                            <span className="pdr-stat-value" style={{ color: '#0ea5e9' }}>{nf(summary.total_items)}</span>
                            <span className="pdr-stat-sub">item terpacking</span>
                        </div>
                    </div>
                    <div className="pdr-stat-card">
                        <div className="pdr-stat-icon" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}><FontAwesomeIcon icon={faClock} /></div>
                        <div className="pdr-stat-body">
                            <span className="pdr-stat-label">Jam Tersibuk</span>
                            <span className="pdr-stat-value" style={{ color: '#f59e0b' }}>{peakHourLabel}</span>
                            <span className="pdr-stat-sub">{summary.peak_hour != null ? `≈ ${avgPeakPerDay.toLocaleString('id-ID', { maximumFractionDigits: 1 })} order/hari pada jam ini` : 'belum ada data'}</span>
                        </div>
                    </div>
                </div>

                {/* ── Heatmap + chart per jam ── */}
                <div className="pdr-analytics-grid">
                    <div className="packing-card pdr-card">
                        <div className="packing-card-header pdr-card-head">
                            <span className="packing-card-label">
                                <FontAwesomeIcon icon={faClock} className="me-2" style={{ color: '#10b981' }} />
                                Heatmap Aktivitas Packing (Jam × Hari)
                            </span>
                        </div>
                        {heatmap.dates.length > 0 ? (
                            <div className="pdr-heatmap-scroll">
                                <div className="pdr-heatmap">
                                    <div className="pdr-heat-row pdr-heat-head">
                                        <div className="pdr-heat-daylabel" />
                                        {Array.from({ length: 24 }).map((_, h) => (
                                            <div key={h} className="pdr-heat-hourlabel">{h.toString().padStart(2, '0')}</div>
                                        ))}
                                    </div>
                                    {heatmap.dates.map((date) => (
                                        <div key={date} className="pdr-heat-row">
                                            <div className="pdr-heat-daylabel">{dayjs(date).locale('id').format('DD MMM')}</div>
                                            {Array.from({ length: 24 }).map((_, h) => {
                                                const val = heatmap.byDate[date][h] || 0;
                                                return (
                                                    <div
                                                        key={h}
                                                        className="pdr-heat-cell"
                                                        style={{ background: heatColor(val) }}
                                                        title={`${dayjs(date).locale('id').format('DD MMM')} ${h.toString().padStart(2, '0')}:00 — ${val} order`}
                                                    >
                                                        {val > 0 ? val : ''}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="pdr-empty">{loading ? 'Memuat…' : 'Tidak ada aktivitas packing.'}</div>
                        )}
                    </div>

                    <div className="packing-card pdr-card">
                        <div className="packing-card-header pdr-card-head">
                            <span className="packing-card-label">
                                <FontAwesomeIcon icon={faChartColumn} className="me-2" style={{ color: '#10b981' }} />
                                Order per Jam <span className="pdr-card-hint">· rata-rata/hari</span>
                            </span>
                            {summary.peak_hour != null && (
                                <span className="pdr-peak-chip"><FontAwesomeIcon icon={faClock} className="me-1" />Puncak {peakHourLabel}</span>
                            )}
                        </div>
                        <div className="pdr-hourly-chart">
                            {hourlyData.length > 0 ? (
                                <Bar data={hourlyChart} options={hourlyChartOptions} />
                            ) : (
                                <div className="pdr-empty">{loading ? 'Memuat…' : 'Tidak ada aktivitas packing.'}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Mode donut + Breakdown harian ── */}
                <div className="pdr-bottom-grid">
                    <div className="packing-card pdr-card">
                        <div className="packing-card-header pdr-card-head">
                            <span className="packing-card-label">
                                <FontAwesomeIcon icon={faLayerGroup} className="me-2" style={{ color: '#8b5cf6' }} />
                                Komposisi Mode Packing
                            </span>
                        </div>
                        {modeChart.labels.length > 0 ? (
                            <div className="pdr-mode-wrap">
                                <div className="pdr-donut">
                                    <Doughnut data={modeChart} options={modeChartOptions} />
                                    <div className="pdr-donut-center">
                                        <span className="pdr-donut-num">{nf(summary.total_orders)}</span>
                                        <span className="pdr-donut-lbl">order</span>
                                    </div>
                                </div>
                                <div className="pdr-mode-legend">
                                    {byMode.filter((m) => m.total_orders > 0).map((m, i) => {
                                        const pct = summary.total_orders ? ((m.total_orders / summary.total_orders) * 100).toFixed(1) : 0;
                                        return (
                                            <div key={m.action || i} className="pdr-mode-item">
                                                <span className="pdr-mode-dot" style={{ background: MODE_COLORS[m.mode_label] || fallbackColor(i) }} />
                                                <span className="pdr-mode-name">{m.mode_label}</span>
                                                <span className="pdr-mode-val">{nf(m.total_orders)} <span className="pdr-mode-pct">({pct}%)</span></span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="pdr-empty">{loading ? 'Memuat…' : 'Tidak ada data mode.'}</div>
                        )}
                    </div>

                    {/* ── Breakdown harian ── */}
                    <div className="packing-card pdr-card">
                        <div className="packing-card-header pdr-card-head">
                            <span className="packing-card-label">Breakdown Harian ({reportData.length} Hari)</span>
                        </div>
                    <div className="table-responsive">
                        <Table hover className="pdr-table">
                            <thead>
                                <tr>
                                    <th>Tanggal Packing</th>
                                    <th style={{ textAlign: 'center' }}>Order</th>
                                    <th style={{ textAlign: 'center' }}>Barang</th>
                                    <th style={{ textAlign: 'center' }}>Ready to Ship</th>
                                    <th style={{ textAlign: 'center' }}>Shipping</th>
                                    <th style={{ textAlign: 'center' }}>Delivered</th>
                                    <th style={{ textAlign: 'center' }}>Cancelled</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7">
                                            <div className="pdr-empty">
                                                <FontAwesomeIcon icon={faInbox} className="fa-icon" />
                                                {loading ? 'Memuat data…' : 'Tidak ada data packing pada rentang tanggal ini.'}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    reportData.map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="pdr-date">
                                                <FontAwesomeIcon icon={faCalendarAlt} className="fa-icon" />
                                                {dayjs(row.pack_date).locale('id').format('DD MMMM YYYY')}
                                            </td>
                                            <td style={{ textAlign: 'center' }}><span className="pdr-num green">{nf(row.total_packed)}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="pdr-num" style={{ color: '#0ea5e9' }}>{nf(row.total_items)}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="pdr-num" style={{ color: '#eab308' }}>{nf(row.total_ready_to_ship)}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="pdr-num" style={{ color: '#0ea5e9' }}>{nf(row.total_shipping)}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="pdr-num" style={{ color: '#3b82f6' }}>{nf(row.total_delivered)}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="pdr-num red">{nf(row.total_cancelled)}</span></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PackingDailyPackingReport;

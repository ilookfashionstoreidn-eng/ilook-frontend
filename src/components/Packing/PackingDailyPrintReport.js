import React, { useState, useEffect, useMemo } from 'react';
import { Spinner, Form, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPrint, faBoxOpen, faBoxesStacked, faClock, faPercent, faCalendarAlt, faInbox, faChartBar, faChartLine } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/id';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import './PackingMonitoring.css';
import './PackingDailyPrintReport.css';

dayjs.extend(relativeTime);

const PackingDailyPrintReport = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [hourlyData, setHourlyData] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/orders/daily-print-report`, {
                params: {
                    start_date: startDate,
                    end_date: endDate,
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setReportData(res.data.data || []);
            setHourlyData(res.data.hourly_chart || []);
        } catch (error) {
            console.error(error);
            toast.error('Gagal mengambil laporan cetak harian');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    const summary = useMemo(() => {
        const totalPrinted = reportData.reduce((s, r) => s + Number(r.total_printed || 0), 0);
        const totalPacked = reportData.reduce((s, r) => s + Number(r.total_packed || 0), 0);
        const totalUnpacked = reportData.reduce((s, r) => s + Number(r.total_unpacked || 0), 0);
        const rate = totalPrinted ? (totalPacked / totalPrinted) * 100 : 0;
        return { totalPrinted, totalPacked, totalUnpacked, rate };
    }, [reportData]);

    const nf = (n) => Number(n || 0).toLocaleString('id-ID');

    const rateColor = (pct) => (pct >= 90 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444');

    const chartData = useMemo(() => {
        const isSingleDay = dayjs(startDate).isSame(dayjs(endDate), 'day');
        const filledData = [];
        
        for (let h = 0; h < 24; h++) {
            const totalForHour = hourlyData
                .filter(d => parseInt(d.hour) === h)
                .reduce((sum, d) => sum + parseInt(d.total_packed || 0), 0);
                
            filledData.push({
                label: `${h.toString().padStart(2, '0')}:00`,
                total: totalForHour
            });
        }

        return {
            labels: filledData.map(d => d.label),
            datasets: [
                {
                    label: isSingleDay ? 'Pesanan Dipacking' : `Total Pesanan Dipacking (${dayjs(startDate).format('DD/MM')} - ${dayjs(endDate).format('DD/MM')})`,
                    data: filledData.map(d => d.total),
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    borderColor: '#10b981',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        };
    }, [hourlyData, startDate, endDate]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            datalabels: {
                display: function(context) {
                    return context.dataset.data[context.dataIndex] > 0;
                },
                color: '#fff',
                font: { weight: 'bold', size: 10 }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        return `${context.parsed.y} pesanan`;
                    }
                }
            }
        },
        scales: {
            x: { 
                grid: { display: false },
                ticks: { maxRotation: 45, minRotation: 0 }
            },
            y: { beginAtZero: true, ticks: { precision: 0 } }
        }
    };

    return (
        <div className="packing-dashboard-page">
            <div className="packing-dashboard-header" style={{ flexShrink: 0 }}>
                <div className="packing-title-row">
                    <button className="packing-back-btn" onClick={() => navigate('/packing')} title="Kembali">
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <div className="packing-dashboard-title">
                        <h1>Laporan Cetak Harian</h1>
                        <div className="packing-dashboard-subtitle">
                            <FontAwesomeIcon icon={faPrint} className="me-2" style={{ color: '#0ea5e9' }} />
                            Breakdown resi yang dicetak per tanggal dan status packing
                        </div>
                    </div>
                </div>

                <div className="packing-dashboard-controls">
                    <div className="pdr-daterange">
                        <Form.Control
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            title="Tanggal Mulai"
                        />
                        <span className="pdr-daterange-sep">—</span>
                        <Form.Control
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            title="Tanggal Akhir"
                        />
                    </div>
                </div>
            </div>

            <div className="packing-dashboard-content">
                {/* Summary stat cards */}
                <div className="pdr-stats-grid">
                    <div className="pdr-stat-card">
                        <div className="pdr-stat-icon bg-blue-gradient"><FontAwesomeIcon icon={faPrint} /></div>
                        <div className="pdr-stat-body">
                            <span className="pdr-stat-label">Total Resi Dicetak</span>
                            <span className="pdr-stat-value">{nf(summary.totalPrinted)}</span>
                            <span className="pdr-stat-sub">{reportData.length} hari periode</span>
                        </div>
                    </div>
                    <div className="pdr-stat-card">
                        <div className="pdr-stat-icon bg-green-gradient"><FontAwesomeIcon icon={faBoxesStacked} /></div>
                        <div className="pdr-stat-body">
                            <span className="pdr-stat-label">Sudah Dipacking</span>
                            <span className="pdr-stat-value" style={{ color: '#10b981' }}>{nf(summary.totalPacked)}</span>
                            <span className="pdr-stat-sub">{summary.rate.toFixed(1)}% dari total</span>
                        </div>
                    </div>
                    <div className="pdr-stat-card">
                        <div className="pdr-stat-icon bg-red-gradient"><FontAwesomeIcon icon={faBoxOpen} /></div>
                        <div className="pdr-stat-body">
                            <span className="pdr-stat-label">Belum Dipacking</span>
                            <span className="pdr-stat-value" style={{ color: '#ef4444' }}>{nf(summary.totalUnpacked)}</span>
                            <span className="pdr-stat-sub">menunggu diproses</span>
                        </div>
                    </div>
                    <div className="pdr-stat-card">
                        <div className="pdr-stat-icon bg-yellow-gradient"><FontAwesomeIcon icon={faPercent} /></div>
                        <div className="pdr-stat-body">
                            <span className="pdr-stat-label">Tingkat Packing</span>
                            <span className="pdr-stat-value" style={{ color: rateColor(summary.rate) }}>{summary.rate.toFixed(1)}%</span>
                            <span className="pdr-stat-sub">rasio packing keseluruhan</span>
                        </div>
                    </div>
                </div>

                <div className="packing-dashboard-bottom-grid">
                    {/* CHART CARD */}
                    <div className="packing-card" style={{ padding: 20, height: '280px', display: 'flex', flexDirection: 'column' }}>
                        <div className="packing-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <span className="packing-card-label">
                                <FontAwesomeIcon icon={faChartLine} className="me-2" style={{ color: '#0ea5e9' }} />
                                Aktivitas Packing per Jam
                            </span>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            {hourlyData.length > 0 ? (
                                <Line data={chartData} options={chartOptions} />
                            ) : (
                                <div className="pdr-empty" style={{ padding: '20px' }}>
                                    {loading ? 'Memuat grafik...' : 'Tidak ada aktivitas packing.'}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="packing-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
                        <div className="packing-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginBottom: 14 }}>
                            <span className="packing-card-label">Breakdown Harian ({reportData.length} Hari)</span>
                            {loading && <Spinner animation="border" size="sm" style={{ color: '#0ea5e9' }} />}
                        </div>

                        <div className="table-responsive" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            <Table hover className="pdr-table">
                                <thead>
                                    <tr>
                                        <th>Tanggal Cetak</th>
                                        <th style={{ textAlign: 'center' }}>Total Resi</th>
                                        <th style={{ textAlign: 'center' }}>Sudah Dipacking</th>
                                        <th style={{ textAlign: 'center' }}>Belum Dipacking</th>
                                        <th style={{ minWidth: 150 }}>Tingkat Packing</th>
                                        <th style={{ textAlign: 'center' }}>Batas Kirim Terdekat</th>
                                        <th style={{ textAlign: 'center' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.length === 0 ? (
                                        <tr>
                                            <td colSpan="7">
                                                <div className="pdr-empty">
                                                    <FontAwesomeIcon icon={faInbox} className="fa-icon" />
                                                    {loading ? 'Memuat data…' : 'Tidak ada data cetak resi pada rentang tanggal ini.'}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        reportData.map((row, idx) => {
                                            const printed = Number(row.total_printed || 0);
                                            const packed = Number(row.total_packed || 0);
                                            const pct = printed ? (packed / printed) * 100 : 0;
                                            const overdue = row.earliest_shipping_deadline && dayjs(row.earliest_shipping_deadline).isBefore(dayjs());
                                            return (
                                                <tr key={idx}>
                                                    <td className="pdr-date">
                                                        <FontAwesomeIcon icon={faCalendarAlt} className="fa-icon" />
                                                        {dayjs(row.print_date).locale('id').format('DD MMMM YYYY')}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}><span className="pdr-num">{nf(printed)}</span></td>
                                                    <td style={{ textAlign: 'center' }}><span className="pdr-num green">{nf(packed)}</span></td>
                                                    <td style={{ textAlign: 'center' }}><span className="pdr-num red">{nf(row.total_unpacked)}</span></td>
                                                    <td>
                                                        <div className="pdr-rate">
                                                            <div className="pdr-rate-top">
                                                                <span className="pdr-rate-pct" style={{ color: rateColor(pct) }}>{pct.toFixed(0)}%</span>
                                                            </div>
                                                            <div className="pdr-rate-track">
                                                                <div className="pdr-rate-fill" style={{ width: `${pct}%`, background: rateColor(pct) }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {row.earliest_shipping_deadline ? (
                                                            <div className="pdr-deadline">
                                                                <span className="pdr-deadline-time" style={{ color: overdue ? '#ef4444' : '#475569' }}>
                                                                    {dayjs(row.earliest_shipping_deadline).format('DD MMM, HH:mm')}
                                                                </span>
                                                                <span className="pdr-deadline-rel" style={{ color: overdue ? '#ef4444' : '#d97706' }}>
                                                                    <FontAwesomeIcon icon={faClock} className="me-1" />
                                                                    {overdue ? 'Lewat batas' : dayjs(row.earliest_shipping_deadline).fromNow(true) + ' lagi'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="pdr-muted">—</span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            className="pdr-detail-btn"
                                                            onClick={() => navigate(`/packing-printed?date=${row.print_date}`)}
                                                        >
                                                            Lihat Detail
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
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

export default PackingDailyPrintReport;

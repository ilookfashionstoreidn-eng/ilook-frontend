import React, { useState, useEffect, useMemo } from 'react';
import { Spinner, Form, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBoxOpen, faCalendarAlt, faChartLine, faInbox } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import './PackingMonitoring.css';
import './PackingDailyPackingReport.css';

const PackingDailyPackingReport = () => {
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
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/orders/daily-packing-report`, {
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
            toast.error('Gagal mengambil laporan packing harian');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    const summary = useMemo(() => {
        const totalPacked = reportData.reduce((s, r) => s + Number(r.total_packed || 0), 0);
        return { totalPacked };
    }, [reportData]);

    const nf = (n) => Number(n || 0).toLocaleString('id-ID');

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
                        <h1>Laporan Packing Harian</h1>
                        <div className="packing-dashboard-subtitle">
                            <FontAwesomeIcon icon={faBoxOpen} className="me-2" style={{ color: '#10b981' }} />
                            Breakdown jumlah pesanan yang dipacking per hari
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
                <div className="pdr-stats-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '320px', marginBottom: '16px' }}>
                    <div className="pdr-stat-card">
                        <div className="pdr-stat-icon bg-green-gradient"><FontAwesomeIcon icon={faBoxOpen} /></div>
                        <div className="pdr-stat-body">
                            <span className="pdr-stat-label">Total Dipacking</span>
                            <span className="pdr-stat-value" style={{ color: '#10b981' }}>{nf(summary.totalPacked)}</span>
                            <span className="pdr-stat-sub">pesanan dalam periode ini</span>
                        </div>
                    </div>
                </div>

                <div className="packing-dashboard-bottom-grid">
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
                                        <th>Tanggal Packing</th>
                                        <th style={{ textAlign: 'center' }}>Total Pesanan Dipacking</th>
                                        <th style={{ textAlign: 'center' }}>Ready to Ship</th>
                                        <th style={{ textAlign: 'center' }}>Shipping</th>
                                        <th style={{ textAlign: 'center' }}>Delivered</th>
                                        <th style={{ textAlign: 'center' }}>Cancelled</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.length === 0 ? (
                                        <tr>
                                            <td colSpan="6">
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
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="pdr-num green">{nf(row.total_packed)}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="pdr-num" style={{ color: '#eab308' }}>{nf(row.total_ready_to_ship)}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="pdr-num" style={{ color: '#0ea5e9' }}>{nf(row.total_shipping)}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="pdr-num" style={{ color: '#3b82f6' }}>{nf(row.total_delivered)}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="pdr-num red">{nf(row.total_cancelled)}</span>
                                                </td>
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

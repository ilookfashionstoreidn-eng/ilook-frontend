import React, { useState, useEffect, useMemo } from 'react';
import { Spinner, Form, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPrint, faBoxOpen, faBoxesStacked, faClock, faPercent, faCalendarAlt, faInbox } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/id';
import './PackingMonitoring.css';
import './PackingDailyPrintReport.css';

dayjs.extend(relativeTime);

const PackingDailyPrintReport = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);

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
            setReportData(res.data.data);
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

    return (
        <div className="packing-dashboard-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 0 }}>
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

            <div className="packing-dashboard-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 24 }}>
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

                <div className="packing-dashboard-bottom-grid" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="packing-card" style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: 0 }}>
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

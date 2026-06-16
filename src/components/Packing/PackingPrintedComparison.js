import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Spinner, Form, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPrint, faBoxOpen, faHourglassHalf, faSearch, faPercent, faStopwatch, faTriangleExclamation, faTruckFast } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/id';
import './PackingMonitoring.css';

dayjs.extend(relativeTime);

const COURIER_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#6366f1', '#64748b'];

const formatDuration = (minutes) => {
    if (minutes === null || minutes === undefined || isNaN(minutes)) return '-';
    const total = Math.round(Number(minutes));
    if (total < 60) return `${total}m`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m > 0 ? `${h}j ${m}m` : `${h}j`;
};

const getCourier = (trackingNumber) => {
    if (!trackingNumber) return '-';
    const num = trackingNumber.toUpperCase();
    if (num.startsWith('SPX')) return 'Shopee Xpress';
    if (num.startsWith('JT')) return 'J&T Express';
    if (num.startsWith('JX')) return 'J&T Cargo';
    if (num.startsWith('ID')) return 'ID Express';
    if (num.startsWith('00')) return 'SiCepat';
    if (num.startsWith('TK')) return 'J&T Express';
    if (num.startsWith('NL')) return 'Ninja Xpress';
    if (num.startsWith('LX')) return 'Lex Express';
    return 'Lainnya';
};

const PackingPrintedComparison = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState('semua');
    
    const [summary, setSummary] = useState({ total_in_window: 0, packed: 0, unpacked: 0, avg_pack_minutes: null, oldest_unpacked_print: null, courier_breakdown: [] });
    const [orders, setOrders] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [pagination, setPagination] = useState({ next_cursor: null, prev_cursor: null, has_more: false });
    const prevSearch = useRef(searchQuery);

    const fetchData = async (currentCursor = cursor) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/orders/monitor`, {
                params: { 
                    start_date: startDate, 
                    end_date: endDate,
                    label_print_status: 'printed',
                    q: searchQuery,
                    packed: activeTab === 'semua' ? '' : (activeTab === 'sudah' ? 'packed' : 'unpacked'),
                    per_page: 50,
                    cursor: currentCursor
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(res.data.summary);
            setOrders(res.data.data);
            setPagination(res.data.pagination || { next_cursor: null, prev_cursor: null, has_more: false });
        } catch (error) {
            console.error(error);
            toast.error('Gagal mengambil data perbandingan cetak resi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCursor(null);
        if (prevSearch.current !== searchQuery) {
            prevSearch.current = searchQuery;
            const timer = setTimeout(() => {
                fetchData(null);
            }, 500); // debounce search
            return () => clearTimeout(timer);
        } else {
            // For tab clicks or date changes, fetch instantly without delay
            fetchData(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate, searchQuery, activeTab]);

    const handleNext = () => {
        if (pagination.next_cursor) {
            setCursor(pagination.next_cursor);
            fetchData(pagination.next_cursor);
        }
    };

    const handlePrev = () => {
        if (pagination.prev_cursor) {
            setCursor(pagination.prev_cursor);
            fetchData(pagination.prev_cursor);
        }
    };

    const analytics = useMemo(() => {
        const total = Number(summary.total_in_window) || 0;
        const packed = Number(summary.packed) || 0;
        const couriers = Array.isArray(summary.courier_breakdown) ? summary.courier_breakdown : [];
        const maxCourier = couriers.reduce((max, c) => Math.max(max, Number(c.total) || 0), 0);

        return {
            packingRate: total > 0 ? (packed / total) * 100 : 0,
            couriers,
            maxCourier,
        };
    }, [summary]);

    return (
        <div className="packing-dashboard-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: '0' }}>
            <div className="packing-dashboard-header" style={{ flexShrink: 0 }}>
                <div className="packing-title-row">
                    <button className="back-btn" onClick={() => navigate('/packing')}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <div className="packing-dashboard-title">
                        <h1>Cetak vs Packing</h1>
                        <div className="packing-dashboard-subtitle">
                            <FontAwesomeIcon icon={faPrint} className="me-2" style={{ color: '#0ea5e9' }} />
                            Pantau pesanan yang sudah dicetak resinya namun belum dipacking
                        </div>
                    </div>
                </div>

                <div className="packing-dashboard-controls">
                    <div style={{ position: 'relative' }}>
                        <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <Form.Control 
                            type="text" 
                            placeholder="Cari No. Order / Resi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 16px 10px 42px', fontSize: '14px', fontWeight: '500', color: '#0f172a', width: '280px', backgroundColor: '#f8fafc' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '2px' }}>
                        <Form.Control 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            style={{ border: 'none', backgroundColor: 'transparent', padding: '8px 12px', fontSize: '14px', fontWeight: '500', color: '#0f172a', width: '140px' }}
                            title="Tanggal Mulai"
                        />
                        <span style={{ color: '#94a3b8', fontWeight: '600', padding: '0 8px' }}>-</span>
                        <Form.Control 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            style={{ border: 'none', backgroundColor: 'transparent', padding: '8px 12px', fontSize: '14px', fontWeight: '500', color: '#0f172a', width: '140px' }}
                            title="Tanggal Akhir"
                        />
                    </div>
                </div>
            </div>

            <div className="packing-dashboard-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: '24px' }}>
                <div className="packing-metric-strip" style={{ flexShrink: 0 }}>
                    <div className="packing-insight-chip">
                        <div className="chip-icon bg-blue-gradient"><FontAwesomeIcon icon={faPrint} /></div>
                        <div className="chip-body">
                            <span className="chip-label">Total Resi Dicetak</span>
                            <span className="chip-value">{Number(summary.total_in_window || 0).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                    <div className="packing-insight-chip">
                        <div className="chip-icon bg-green-gradient"><FontAwesomeIcon icon={faBoxOpen} /></div>
                        <div className="chip-body">
                            <span className="chip-label">Sudah Dipacking</span>
                            <span className="chip-value">{Number(summary.packed || 0).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                    <div className="packing-insight-chip">
                        <div className="chip-icon bg-red-gradient"><FontAwesomeIcon icon={faHourglassHalf} /></div>
                        <div className="chip-body">
                            <span className="chip-label">Belum Dipacking</span>
                            <span className="chip-value" style={{ color: '#ef4444' }}>{Number(summary.unpacked || 0).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                    <div className="packing-insight-chip">
                        <div className="chip-icon bg-purple-gradient"><FontAwesomeIcon icon={faPercent} /></div>
                        <div className="chip-body">
                            <span className="chip-label">Tingkat Packing</span>
                            <span className="chip-value">{analytics.packingRate.toFixed(1)}%</span>
                            <div className="packing-progress-track" style={{ marginTop: '5px' }}>
                                <div className="packing-progress-fill" style={{ width: `${Math.min(analytics.packingRate, 100)}%`, background: 'linear-gradient(90deg, #10b981, #059669)' }} />
                            </div>
                        </div>
                    </div>
                    <div className="packing-insight-chip">
                        <div className="chip-icon bg-teal-gradient"><FontAwesomeIcon icon={faStopwatch} /></div>
                        <div className="chip-body">
                            <span className="chip-label">Cetak &rarr; Packing</span>
                            <span className="chip-value">{formatDuration(summary.avg_pack_minutes)}</span>
                            <span className="chip-sub">rata-rata</span>
                        </div>
                    </div>
                    <div className="packing-insight-chip">
                        <div className="chip-icon bg-yellow-gradient"><FontAwesomeIcon icon={faTriangleExclamation} /></div>
                        <div className="chip-body">
                            <span className="chip-label">Backlog Tertua</span>
                            <span className="chip-value">{summary.oldest_unpacked_print ? dayjs(summary.oldest_unpacked_print).locale('id').fromNow(true) : '-'}</span>
                            <span className="chip-sub">{summary.oldest_unpacked_print ? dayjs(summary.oldest_unpacked_print).format('DD MMM, HH:mm') : 'tidak ada backlog'}</span>
                        </div>
                    </div>
                </div>

                {analytics.couriers.length > 0 && (
                    <div className="packing-card" style={{ padding: '14px 20px', marginBottom: '16px', flexShrink: 0 }}>
                        <div className="packing-card-header" style={{ marginBottom: '8px' }}>
                            <span className="packing-card-label">Distribusi per Ekspedisi ({analytics.couriers.length})</span>
                            <FontAwesomeIcon icon={faTruckFast} style={{ color: '#94a3b8' }} />
                        </div>
                        <div className="packing-courier-grid">
                            {analytics.couriers.map((c, i) => {
                                const total = Number(c.total) || 0;
                                const packed = Number(c.packed) || 0;
                                const rate = total > 0 ? (packed / total) * 100 : 0;
                                const widthPct = analytics.maxCourier > 0 ? (total / analytics.maxCourier) * 100 : 0;
                                const color = COURIER_COLORS[i % COURIER_COLORS.length];
                                return (
                                    <div className="packing-courier-row" key={c.courier}>
                                        <span className="packing-courier-name" style={{ width: '150px', flexShrink: 0 }} title={c.courier}>{c.courier}</span>
                                        <div className="packing-progress-track" style={{ flex: 1 }}>
                                            <div className="packing-progress-fill" style={{ width: `${widthPct}%`, background: color }} />
                                        </div>
                                        <span className="packing-courier-meta" style={{ width: '150px', flexShrink: 0, textAlign: 'right' }}>
                                            {total.toLocaleString('id-ID')} resi &middot; {rate.toFixed(0)}% packed
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            <div className="packing-dashboard-bottom-grid mt-4" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="packing-card" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: 0 }}>
                    <div className="packing-card-header mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <span className="packing-card-label">Detail Pesanan ({orders.length} Data)</span>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            {loading && <Spinner animation="border" size="sm" style={{ color: '#0ea5e9' }} />}
                            <Form.Select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value)}
                                style={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', color: '#475569', padding: '6px 36px 6px 16px', cursor: 'pointer', backgroundColor: '#f8fafc', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)' }}
                            >
                                <option value="semua">Semua Status</option>
                                <option value="belum">Belum Packing</option>
                                <option value="sudah">Sudah Packing</option>
                            </Form.Select>
                        </div>
                    </div>
                    
                    <div className="table-responsive" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                        <Table hover style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
                            <thead>
                                <tr>
                                    <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '600', padding: '14px 12px', borderBottom: '1px solid #e2e8f0', width: '200px', position: 'sticky', top: 0, zIndex: 10 }}>No. Order / Resi</th>
                                    <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '600', padding: '14px 12px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>Item / SKU</th>
                                    <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '600', padding: '14px 12px', borderBottom: '1px solid #e2e8f0', width: '100px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Kurir</th>
                                    <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '600', padding: '14px 12px', borderBottom: '1px solid #e2e8f0', width: '60px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Qty</th>
                                    <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '600', padding: '14px 12px', borderBottom: '1px solid #e2e8f0', width: '140px', position: 'sticky', top: 0, zIndex: 10 }}>Waktu Order</th>
                                    <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '600', padding: '14px 12px', borderBottom: '1px solid #e2e8f0', width: '140px', position: 'sticky', top: 0, zIndex: 10 }}>Waktu Cetak</th>
                                    <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '600', padding: '14px 12px', borderBottom: '1px solid #e2e8f0', width: '130px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Status Order</th>
                                    <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '600', padding: '14px 12px', borderBottom: '1px solid #e2e8f0', width: '140px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Status Packing</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center" style={{ padding: '24px', color: '#94a3b8' }}>
                                            Tidak ada data pesanan yang dicetak pada rentang tanggal ini.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order, idx) => (
                                        <tr key={idx} style={{ transition: 'background-color 0.2s ease' }}>
                                            <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                                                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px', letterSpacing: '0.5px' }}>{order.order_number}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>{order.tracking_number || '-'}</div>
                                            </td>
                                            <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', color: '#334155', fontSize: '13px', fontWeight: '500' }}>
                                                {order.sku || '-'}
                                            </td>
                                            <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>
                                                    {getCourier(order.tracking_number)}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', color: '#475569', fontWeight: '600', textAlign: 'center', fontSize: '13px' }}>
                                                {order.total_qty}
                                            </td>
                                            <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', color: '#475569', fontSize: '12.5px' }}>
                                                {order.order_date ? dayjs(order.order_date).format('DD MMM, HH:mm') : '-'}
                                            </td>
                                            <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', color: '#475569', fontSize: '12.5px' }}>
                                                {order.label_print_time ? dayjs(order.label_print_time).format('DD MMM, HH:mm') : '-'}
                                            </td>
                                            <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <span style={{ backgroundColor: order.status === 'CANCELLED' ? '#fee2e2' : '#e0f2fe', color: order.status === 'CANCELLED' ? '#991b1b' : '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                    {order.status || '-'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', textAlign: 'center' }}>
                                                {order.is_packed ? (
                                                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap' }}>
                                                        Sudah Dipacking
                                                    </span>
                                                ) : (
                                                    <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap' }}>
                                                        Belum Dipacking
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>

                    <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Menampilkan {orders.length} baris per halaman</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                onClick={handlePrev} 
                                disabled={!pagination.prev_cursor || loading}
                                style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (!pagination.prev_cursor || loading) ? '#f8fafc' : 'white', color: (!pagination.prev_cursor || loading) ? '#94a3b8' : '#0f172a', fontWeight: '600', fontSize: '13px', cursor: (!pagination.prev_cursor || loading) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                            >
                                Sebelumnya
                            </button>
                            <button 
                                onClick={handleNext} 
                                disabled={!pagination.next_cursor || loading}
                                style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (!pagination.next_cursor || loading) ? '#f8fafc' : 'white', color: (!pagination.next_cursor || loading) ? '#94a3b8' : '#0f172a', fontWeight: '600', fontSize: '13px', cursor: (!pagination.next_cursor || loading) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                            >
                                Selanjutnya
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default PackingPrintedComparison;

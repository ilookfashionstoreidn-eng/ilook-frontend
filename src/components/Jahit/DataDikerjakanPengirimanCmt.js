import React, { useEffect, useState, useMemo } from "react";
import { FaSync, FaFilePdf, FaFileExcel, FaChartBar, FaChartLine } from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
    Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import "./Penjahit.css";
import "./DataDikerjakanPengirimanCmt.css";
import API from "../../api";

// Register Chart.js components
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

const DataDikerjakanPengirimanCmt = () => {
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [weekRange, setWeekRange] = useState(5); // Default: 5 minggu terakhir
    const [periodeInfo, setPeriodeInfo] = useState([]);

    // Generate selectedPeriods dari weekRange
    const selectedPeriods = useMemo(() => {
        const periods = [];
        for (let i = 0; i < weekRange; i++) {
            periods.push(-i);
        }
        return periods.sort((a, b) => b - a); // Sort descending: [0, -1, -2, -3, -4]
    }, [weekRange]);

    useEffect(() => {
        fetchData();
    }, [selectedPeriods]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await API.get('/cmt/data-dikerjakan-pengiriman', {
                params: {
                    periode: selectedPeriods
                }
            });
            
            if (response.data) {
                setData(response.data.data || []);
                setSummary(response.data.summary || {});
                setPeriodeInfo(response.data.periode || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setError(error.message || 'Gagal mengambil data');
        } finally {
            setLoading(false);
        }
    };

    const handleWeekRangeChange = (value) => {
        setWeekRange(parseInt(value));
    };

    // Filter data berdasarkan searchTerm
    const filteredData = useMemo(() => {
        return data.filter((item) =>
            item.nama_cmt?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    // Format number dengan pemisah ribuan
    const formatNumber = (num) => {
        if (num === null || num === undefined) return '0';
        // Intl.NumberFormat otomatis menampilkan minus untuk angka negatif
        return new Intl.NumberFormat('id-ID').format(num);
    };

    // Format tanggal Indonesia
    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    // Hitung persentase perubahan vs rata-rata mingguan
    const calculatePercentageChangeVsAverage = () => {
        if (!data || data.length === 0 || !summary.total_rata_rata || summary.total_rata_rata === 0) {
            return { percentage: 0, isPositive: false };
        }
        const totalMingguIni = summary.total_pengiriman_minggu_ini || 0;
        const totalRataRata = summary.total_rata_rata || 0;
        const percentage = ((totalMingguIni - totalRataRata) / totalRataRata) * 100;
        return {
            percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
            isPositive: percentage >= 0
        };
    };

    // Handle export PDF
    const handleExportPDF = () => {
        try {
            const doc = new jsPDF('landscape', 'mm', 'a4');
            
            // Header
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Data Yang Dikerjakan dan Pengiriman CMT', 14, 15);
            
            // Date info
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Tanggal Export: ${getCurrentDate()}`, 14, 22);

            // Prepare table data
            const tableData = filteredData.map((item, index) => {
                const row = [
                    index + 1,
                    item.nama_cmt || '',
                    formatNumber(item.lebih_dari_deadline || 0),
                    formatNumber(item.masih_dalam_deadline || 0),
                    formatNumber(item.pengiriman_minggu_ini || 0),
                    formatNumber(item.rata_rata_pengiriman_mingguan || 0),
                ];

                // Add periode columns
                selectedPeriods.forEach((offset) => {
                    const key = `periode_${offset}`;
                    row.push(formatNumber(item[key] || 0));
                });

                row.push(formatNumber(item.kenaikan_penurunan_dari_rata2 || 0));
                row.push(formatNumber(item.pengiriman_tertinggi || 0));
                row.push(formatNumber(item.kenaikan_penurunan_dari_tertinggi || 0));

                return row;
            });

            // Table headers
            const headers = [
                'No',
                'Nama CMT',
                'Lebih Deadline',
                'Masih Deadline',
                'Pengiriman Minggu Ini',
                'Rata-Rata',
            ];

            // Add periode headers
            selectedPeriods.forEach((offset) => {
                const label = offset === 0 ? 'Minggu Ini' : `${Math.abs(offset)} M.Lalu`;
                headers.push(label);
            });

            headers.push('Kenaikan/Penurunan Rata2');
            headers.push('Pengiriman Tertinggi');
            headers.push('Kenaikan/Penurunan Tertinggi');

            // Generate table
            doc.autoTable({
                head: [headers],
                body: tableData,
                startY: 28,
                styles: { fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 249, 250] },
                margin: { top: 28, left: 14, right: 14 },
            });

            // Footer with summary
            if (summary && Object.keys(summary).length > 0) {
                const finalY = doc.lastAutoTable.finalY + 10;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('Summary:', 14, finalY);
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text(`Total Dikerjakan: ${formatNumber(summary.total_dikerjakan || 0)}`, 14, finalY + 7);
                doc.text(`Total Lebih Deadline: ${formatNumber(summary.total_lebih_deadline || 0)}`, 14, finalY + 12);
                doc.text(`Total Masih Deadline: ${formatNumber(summary.total_masih_deadline || 0)}`, 14, finalY + 17);
                doc.text(`Total Pengiriman Minggu Ini: ${formatNumber(summary.total_pengiriman_minggu_ini || 0)}`, 14, finalY + 22);
            }

            // Save PDF
            const fileName = `data-dikerjakan-pengiriman-cmt-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Gagal export data ke PDF');
        }
    };

    // Handle export Excel
    const handleExportExcel = async () => {
        try {
            const params = {
                periode: selectedPeriods
            };


            const response = await API.get('/cmt/data-dikerjakan-pengiriman/export/excel', {
                params,
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            const fileName = `data-dikerjakan-pengiriman-cmt-${new Date().toISOString().split('T')[0]}.xlsx`;
            link.setAttribute('download', fileName);
            
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting Excel:', error);
            // If backend endpoint doesn't exist, show alert
            if (error.response?.status === 404) {
                alert('Fitur export Excel belum tersedia. Silakan hubungi administrator.');
            } else {
                alert(error.response?.data?.message || 'Gagal export data ke Excel');
            }
        }
    };

    // Get current date
    const getCurrentDate = () => {
        return formatDate(new Date());
    };

    // Calculate percentage
    const calculatePercentage = (value, total) => {
        if (!total || total === 0) return 0;
        return Math.round((value / total) * 100);
    };

    const percentageChangeVsAverage = calculatePercentageChangeVsAverage();
    const persentaseMelebihiDeadline = calculatePercentage(summary.total_lebih_deadline, summary.total_dikerjakan);

    // Chart data untuk Bar Chart - Pengiriman per CMT (Top 8)
    const barChartData = useMemo(() => {
        if (!data || data.length === 0) return null;

        // Sort berdasarkan pengiriman minggu ini (descending)
        const sortedData = [...data]
            .filter(item => item.pengiriman_minggu_ini > 0)
            .sort((a, b) => b.pengiriman_minggu_ini - a.pengiriman_minggu_ini)
            .slice(0, 8); // Ambil top 8

        const labels = sortedData.map(item => item.nama_cmt || 'Unknown');
        const values = sortedData.map(item => item.pengiriman_minggu_ini || 0);

        // Warna sesuai design system: Success untuk naik, Danger untuk turun
        const colors = sortedData.map(item => {
            if (item.kenaikan_penurunan_dari_rata2 > 0) return '#198754'; // Success (naik)
            if (item.kenaikan_penurunan_dari_rata2 < 0) return '#DC3545'; // Danger (turun)
            return '#6c757d'; // Neutral (stabil)
        });

        return {
            labels,
            datasets: [{
                label: 'Pengiriman Minggu Ini',
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(c => {
                    // Border sedikit lebih gelap untuk depth
                    if (c === '#198754') return '#157347';
                    if (c === '#DC3545') return '#bb2d3b';
                    return '#5c636a';
                }),
                borderWidth: 1,
                borderRadius: 4,
                barThickness: 'flex',
                maxBarThickness: 50,
            }]
        };
    }, [data]);

    // Chart data untuk Line Chart - Trend 4 Minggu
    const lineChartData = useMemo(() => {
        if (!periodeInfo || periodeInfo.length === 0) return null;

        // Ambil 4 periode terakhir (dari yang terbaru)
        const recentPeriods = [...periodeInfo]
            .sort((a, b) => b.offset - a.offset)
            .slice(0, 4)
            .reverse(); // Reverse agar dari lama ke baru

        const labels = recentPeriods.map(p => {
            if (p.offset === 0) return 'Minggu Ini';
            return `${Math.abs(p.offset)} M.Lalu`;
        });

        // Hitung total pengiriman per periode
        const totals = recentPeriods.map(p => {
            return data.reduce((sum, item) => {
                const key = `periode_${p.offset}`;
                return sum + (item[key] || 0);
            }, 0);
        });

        return {
            labels,
            datasets: [{
                label: 'Total Pengiriman',
                data: totals,
                borderColor: '#0D6EFD',
                backgroundColor: '#CFE2FF',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#0D6EFD',
                pointBorderColor: '#FFFFFF',
                pointBorderWidth: 2,
            }]
        };
    }, [data, periodeInfo]);

    // Chart options (shared) - Sesuai design system
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 10,
                bottom: 10,
                left: 10,
                right: 10
            }
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                titleColor: '#212529',
                bodyColor: '#6c757d',
                borderColor: '#dee2e6',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                titleFont: {
                    size: 13,
                    weight: '600',
                    family: "'Inter', sans-serif"
                },
                bodyFont: {
                    size: 13,
                    family: "'Inter', sans-serif"
                },
                callbacks: {
                    label: function(context) {
                        return new Intl.NumberFormat('id-ID').format(context.parsed.y) + ' pcs';
                    }
                },
                displayColors: true,
                cornerRadius: 8,
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return new Intl.NumberFormat('id-ID').format(value);
                    },
                    font: {
                        size: 11,
                        family: "'Inter', sans-serif"
                    },
                    color: '#6c757d',
                    padding: 8,
                    maxTicksLimit: 8
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                    drawBorder: false,
                    lineWidth: 1
                }
            },
            x: {
                ticks: {
                    font: {
                        size: 11,
                        family: "'Inter', sans-serif"
                    },
                    color: '#6c757d',
                    maxRotation: 45,
                    minRotation: 0,
                    padding: 8,
                    autoSkip: true,
                    maxTicksLimit: 10
                },
                grid: {
                    display: false,
                    drawBorder: false
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    };

    return (
        <div className="data-dikerjakan-container">
            {/* Header */}
            <div className="data-dikerjakan-header">
                <h1>Data Yang Dikerjakan dan Pengiriman CMT</h1>
            </div>

            {/* KPI SUMMARY Section */}
            {summary && Object.keys(summary).length > 0 && (
                <div className="kpi-summary-section">
                    <div className="kpi-summary-title">
                        <FaChartBar /> KPI Summary
                    </div>
                    <div className="kpi-cards">
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: '#667eea' }}>📊</div>
                            <div className="kpi-content">
                                <div className="kpi-label">Total CMT</div>
                                <div className="kpi-value">{formatNumber(summary.total_dikerjakan)}</div>
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: '#f5576c' }}>⚠️</div>
                            <div className="kpi-content">
                                <div className="kpi-label">Melebihi Deadline</div>
                                <div className="kpi-value" style={{ color: '#c53030' }}>
                                    {formatNumber(summary.total_lebih_deadline)} ({persentaseMelebihiDeadline}%)
                                </div>
                            </div> 
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: '#4facfe' }}>📦</div>
                            <div className="kpi-content">
                                <div className="kpi-label">Pengiriman Minggu Ini</div>
                                <div className="kpi-value">{formatNumber(summary.total_pengiriman_minggu_ini)}</div>
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ 
                                background: percentageChangeVsAverage.isPositive ? '#198754' : '#DC3545' 
                            }}>
                                {percentageChangeVsAverage.isPositive ? '📈' : '📉'}
                            </div>
                            <div className="kpi-content">
                                <div className="kpi-label">Perbandingan Performa</div>
                                <div className="kpi-value" style={{ 
                                    color: percentageChangeVsAverage.isPositive ? '#198754' : '#DC3545',
                                    fontWeight: 700
                                }}>
                                    {percentageChangeVsAverage.isPositive ? '+' : ''}{percentageChangeVsAverage.percentage}%
                                </div>
                                <div className="kpi-subtitle" style={{ 
                                    fontSize: '0.85em', 
                                    color: '#6c757d',
                                    marginTop: '4px'
                                }}>
                                    {percentageChangeVsAverage.isPositive ? 'Above average' : 'Below average'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CHARTS Section */}
            {!loading && data.length > 0 && (
                <div className="charts-section">
                    <div className="charts-section-title">
                        <FaChartLine /> Charts
                    </div>
                    <div className="charts-container">
                        <div className="chart-wrapper">
                            <div className="chart-header">
                                <h3 className="chart-title">Bar Chart: Pengiriman/CMT</h3>
                                <div className="chart-legend">
                                    <span className="legend-item">
                                        <span className="legend-color" style={{backgroundColor: '#198754'}}></span>
                                        Naik
                                    </span>
                                    <span className="legend-item">
                                        <span className="legend-color" style={{backgroundColor: '#DC3545'}}></span>
                                        Turun
                                    </span>
                                    <span className="legend-item">
                                        <span className="legend-color" style={{backgroundColor: '#6c757d'}}></span>
                                        Stabil
                                    </span>
                                </div>
                            </div>
                            {barChartData ? (
                                <div className="chart-container">
                                    <Bar data={barChartData} options={chartOptions} />
                                </div>
                            ) : (
                                <div className="chart-empty">Tidak ada data</div>
                            )}
                        </div>
                        <div className="chart-wrapper">
                            <div className="chart-header">
                                <h3 className="chart-title">Line Chart: Trend 4 Minggu</h3>
                            </div>
                            {lineChartData ? (
                                <div className="chart-container">
                                    <Line data={lineChartData} options={chartOptions} />
                                </div>
                            ) : (
                                <div className="chart-empty">Tidak ada data</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Table Section */}
            <div className="table-section">
                <div className="table-section-header">
                    <h2>Data Detail</h2>
                </div>
                <div className="filter-header">
                    <div className="kode-seri-search">
                        <input
                            type="text"
                            placeholder="Cari nama CMT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="table-actions">
                        <button className="export-btn" onClick={handleExportPDF}>
                            <FaFilePdf /> Export PDF
                        </button>
                        <button className="export-btn" onClick={handleExportExcel}>
                            <FaFileExcel /> Export Excel
                        </button>
                        <button className="export-btn" onClick={fetchData}>
                            <FaSync /> Refresh
                        </button>
                    </div>
                </div>
                {loading ? (
                    <div className="loading-message">Memuat data...</div>
                ) : error ? (
                    <div className="error-message">
                        <strong>Terjadi Kesalahan</strong>
                        <span>{error}</span>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-dikerjakan-table">
                            <thead>
                                <tr>
                                    <th rowSpan="2" className="header-blue">NO</th>
                                    <th rowSpan="2" className="header-blue">NAMA CMT</th>
                                    <th colSpan="2" className="header-blue">JML TOTAL YANG MASIH DIKERJAKAN/PCS</th>
                                    <th rowSpan="2" className="header-green">PENGIRIMAN MINGGU INI /PCS</th>
                                    <th rowSpan="2" className="header-yellow">RATA-RATA PENGIRIMAN MINGGUAN</th>
                                    <th colSpan={selectedPeriods.length} className="periode-header-cell">
                                        <div className="periode-header-selector">
                                            <div className="periode-header-label">PENGIRIMAN PERIODE</div>
                                            <div className="periode-dropdown-wrapper">
                                                <select 
                                                    className="periode-range-select"
                                                    value={weekRange}
                                                    onChange={(e) => handleWeekRangeChange(e.target.value)}
                                                >
                                                    <option value={1}>1 Minggu Terakhir</option>
                                                    <option value={2}>2 Minggu Terakhir</option>
                                                    <option value={3}>3 Minggu Terakhir</option>
                                                    <option value={4}>4 Minggu Terakhir</option>
                                                    <option value={5}>5 Minggu Terakhir</option>
                                                    <option value={6}>6 Minggu Terakhir</option>
                                                    <option value={7}>7 Minggu Terakhir</option>
                                                    <option value={8}>8 Minggu Terakhir</option>
                                                    <option value={9}>9 Minggu Terakhir</option>
                                                    <option value={10}>10 Minggu Terakhir</option>
                                                </select>
                                            </div>
                                        </div>
                                    </th>
                                    <th rowSpan="2" className="header-blue-light">JML PCS KENAIKAN / PENURUNAN DARI RATA2 MINGGUAN</th>
                                    <th rowSpan="2" className="header-blue-light">PENGIRIMAN TERTINGGI PERIODE INI</th>
                                    <th rowSpan="2" className="header-blue-light">JML PCS KENAIKAN / PENURUNAN DARI KIRIM TERTINGGI</th>
                                </tr>
                                <tr>
                                    <th className="header-red">LEBIH DARI DEADLINE</th>
                                    <th className="header-blue">MASIH DALAM DEADLINE</th>
                                    {selectedPeriods.map((offset) => {
                                        const periode = periodeInfo.find(p => p.offset === offset);
                                        let label = offset === 0 
                                            ? 'MINGGU INI' 
                                            : `${Math.abs(offset)} MINGGU LALU`;
                                        
                                        // Tambahkan tanggal range jika ada
                                        if (periode && periode.start_formatted && periode.end_formatted) {
                                            label = `${label}<br/><small style="font-weight: normal; font-size: 0.85em;">${periode.start_formatted} - ${periode.end_formatted}</small>`;
                                        }
                                        
                                        return (
                                            <th key={offset} className="header-blue-light" dangerouslySetInnerHTML={{ __html: label }}></th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={7 + selectedPeriods.length} className="no-data">Tidak ada data</td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <tr key={item.no || index}>
                                            <td className="col-no">{item.no}</td>
                                            <td className="nama-cmt">{item.nama_cmt}</td>
                                            <td className={item.lebih_dari_deadline > 0 ? 'col-lebih-deadline red-bg' : 'col-lebih-deadline'}>
                                                <strong>{formatNumber(item.lebih_dari_deadline)}</strong>
                                            </td>
                                            <td className="col-masih-deadline">{formatNumber(item.masih_dalam_deadline)}</td>
                                            <td className="bg-green-light">{formatNumber(item.pengiriman_minggu_ini)}</td>
                                            <td className="bg-yellow-light">{formatNumber(item.rata_rata_pengiriman_mingguan)}</td>
                                            {selectedPeriods.map((offset) => {
                                                const key = `periode_${offset}`;
                                                return (
                                                    <td key={offset} className="col-periode">{formatNumber(item[key] || 0)}</td>
                                                );
                                            })}
                                            <td className={
                                                item.kenaikan_penurunan_dari_rata2 > 0 
                                                    ? 'bg-green-pale' 
                                                    : item.kenaikan_penurunan_dari_rata2 < 0 
                                                        ? 'bg-red-pale' 
                                                        : ''
                                            }>
                                                {formatNumber(item.kenaikan_penurunan_dari_rata2)}
                                            </td>
                                            <td className="bg-blue-light">{formatNumber(item.pengiriman_tertinggi)}</td>
                                            <td className={
                                                item.kenaikan_penurunan_dari_tertinggi < 0 
                                                    ? 'bg-red-pale' 
                                                    : ''
                                            }>
                                                {formatNumber(item.kenaikan_penurunan_dari_tertinggi)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {summary && Object.keys(summary).length > 0 && filteredData.length > 0 && (
                                <tfoot>
                                    <tr className="footer-row">
                                        <td colSpan="2"><strong>TOTAL</strong></td>
                                        <td className={summary.total_lebih_deadline > 0 ? 'col-lebih-deadline red-bg' : 'col-lebih-deadline'}>
                                            <strong>{formatNumber(summary.total_lebih_deadline)}</strong>
                                        </td>
                                        <td className="col-masih-deadline"><strong>{formatNumber(summary.total_masih_deadline)}</strong></td>
                                        <td className="bg-green-light">
                                            <strong>{formatNumber(summary.total_pengiriman_minggu_ini)}</strong>
                                        </td>
                                        <td colSpan={4 + selectedPeriods.length}></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataDikerjakanPengirimanCmt;

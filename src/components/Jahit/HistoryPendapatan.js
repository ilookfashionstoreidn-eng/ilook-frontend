
import React, { useEffect, useState, useCallback } from "react";
import API from "../../api";
import "./HistoryPendapatan.css";
import { FiSearch, FiDollarSign, FiCreditCard, FiActivity, FiAlertCircle, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

const HistoryPendapatan = () => {
  const [pendapatans, setPendapatans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination State
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    from: 0,
    to: 0
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Summary State
  const [summary, setSummary] = useState({
    totalPendapatan: 0,
    totalTransfer: 0,
    sudahDibayar: 0,
    belumDibayar: 0
  });

  const fetchPendapatans = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: page,
        search: searchTerm,
        start_date: startDate,
        end_date: endDate
      };

      const response = await API.get('/pendapatan/history', { params });
      
      const { data, current_page, last_page, total, from, to, summary } = response.data;
      
      // Add artificial delay to show off the skeleton loading (optional, but good for UX demo)
      // await new Promise(resolve => setTimeout(resolve, 300));

      setPendapatans(data || []);
      setPagination({
        currentPage: current_page,
        lastPage: last_page,
        total: total,
        from: from,
        to: to
      });

      if (summary) {
        setSummary(summary);
      }

    } catch (error) {
      console.error("Error fetching pendapatan:", error);
      setError("Gagal mengambil data pendapatan");
      setPendapatans([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, startDate, endDate]);

  // Initial fetch and when filters/page change
  useEffect(() => {
    // Debounce search to prevent too many requests
    const timeoutId = setTimeout(() => {
      fetchPendapatans(1); // Reset to page 1 on filter change
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [fetchPendapatans]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.lastPage) {
      fetchPendapatans(newPage);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusClass = (status) => {
    if (!status) return "";
    const s = status.toLowerCase();
    if (s.includes("sudah")) return "paid";
    if (s.includes("belum")) return "unpaid";
    return "pending";
  };

  // Skeleton Loader Component
  const TableSkeleton = () => {
    return (
      <>
        {[1, 2, 3, 4, 5].map((item) => (
          <tr key={item} className="skeleton-row">
            <td><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
            <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
            <td><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
            <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
            <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
            <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
          </tr>
        ))}
      </>
    );
  };

  return (
    <div className="history-container">
      <div className="history-header">
        <h1>Riwayat Pendapatan (Lunas)</h1>
        <p>Kelola dan pantau riwayat pembayaran penjahit yang sudah dibayarkan.</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon icon-blue">
            <FiDollarSign />
          </div>
          <div className="card-title">Total Pendapatan</div>
          <div className="card-value">{formatCurrency(summary.totalPendapatan)}</div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon icon-green">
            <FiCreditCard />
          </div>
          <div className="card-title">Total Transfer</div>
          <div className="card-value">{formatCurrency(summary.totalTransfer)}</div>
        </div>

        <div className="summary-card">
          <div className="card-icon icon-purple">
            <FiActivity />
          </div>
          <div className="card-title">Transaksi Selesai</div>
          <div className="card-value">{summary.sudahDibayar}</div>
        </div>

        <div className="summary-card">
          <div className="card-icon icon-orange">
            <FiAlertCircle />
          </div>
          <div className="card-title">Belum Dibayar</div>
          <div className="card-value">{summary.belumDibayar}</div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Cari nama penjahit..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={clearSearch} 
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <FiX />
            </button>
          )}
        </div>

        <div className="date-filters">
          <div className="date-input-group">
            <label>Dari:</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="date-input-group">
            <label>Sampai:</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-card">
        {error ? (
            <div className="empty-state">
            <p className="error-text">{error}</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>ID Pendapatan</th>
                    <th>Nama Penjahit</th>
                    <th>Status</th>
                    <th>Total Pendapatan</th>
                    <th>Total Transfer</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton />
                  ) : pendapatans.length > 0 ? (
                    pendapatans.map((pendapatan) => (
                      <tr key={pendapatan.id_pendapatan}>
                        <td>{formatDate(pendapatan.created_at)}</td>
                        <td className="col-id">#{pendapatan.id_pendapatan}</td>
                        <td className="col-name">{pendapatan.penjahit?.nama_penjahit || "-"}</td>
                        <td>
                          <span className={`status-pill ${getStatusClass(pendapatan.status_pembayaran)}`}>
                            {pendapatan.status_pembayaran}
                          </span>
                        </td>
                        <td className="col-money">{formatCurrency(pendapatan.total_pendapatan)}</td>
                        <td className="col-money">{formatCurrency(pendapatan.total_transfer)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6">
                        <div className="empty-state">
                          <div className="empty-icon"><FiSearch /></div>
                          <p className="empty-text">Tidak ada data ditemukan</p>
                          <p className="empty-subtext">Coba sesuaikan filter pencarian atau tanggal Anda.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls - Only show if not loading and has data */}
            {!loading && pendapatans.length > 0 && (
              <div className="pagination-controls">
                  <div className="pagination-info">
                      Menampilkan <span style={{ fontWeight: 'bold', color: '#111827' }}>{pagination.from}</span> - <span style={{ fontWeight: 'bold', color: '#111827' }}>{pagination.to}</span> dari <span style={{ fontWeight: 'bold', color: '#111827' }}>{pagination.total}</span> data
                  </div>
                  <div className="pagination-buttons">
                      <button 
                          className="btn-pagination"
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={pagination.currentPage === 1}
                      >
                          <FiChevronLeft /> Sebelumnya
                      </button>
                      
                      <div className="page-number">
                          Halaman {pagination.currentPage}
                      </div>

                      <button 
                          className="btn-pagination"
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={pagination.currentPage === pagination.lastPage}
                      >
                          Selanjutnya <FiChevronRight />
                      </button>
                  </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HistoryPendapatan;

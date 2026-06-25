
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
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Riwayat Pendapatan (Lunas)</h1>
          <span className="ks-header-sub">Kelola dan pantau riwayat pembayaran penjahit yang sudah dibayarkan.</span>
        </div>
      </header>

      {/* Stat Rail */}
      <div className="ks-statrail" style={{ padding: "0 20px" }}>
        <div className="ks-stat" style={{ flex: 1, minWidth: 0, paddingRight: "16px" }}>
          <span className="ks-stat-label">Total Pendapatan</span>
          <span className="ks-stat-value tone-primary">{formatCurrency(summary.totalPendapatan)}</span>
        </div>
        <div className="ks-stat" style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--ks-line)", paddingLeft: "16px", paddingRight: "16px" }}>
          <span className="ks-stat-label">Total Transfer</span>
          <span className="ks-stat-value tone-safe">{formatCurrency(summary.totalTransfer)}</span>
        </div>
        <div className="ks-stat" style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--ks-line)", paddingLeft: "16px", paddingRight: "16px" }}>
          <span className="ks-stat-label">Transaksi Selesai</span>
          <span className="ks-stat-value">{summary.sudahDibayar}</span>
        </div>
        <div className="ks-stat" style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--ks-line)", paddingLeft: "16px" }}>
          <span className="ks-stat-label">Belum Dibayar</span>
          <span className="ks-stat-value tone-warning">{summary.belumDibayar}</span>
        </div>
      </div>

      <section className="ks-board">
        <div className="ks-toolbar">
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", width: "100%" }}>
            <div className="ks-search">
              <i className="fas fa-search ks-search-icon"></i>
              <input 
                type="text" 
                placeholder="Cari nama penjahit..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ks-search-input"
              />
              {searchTerm && (
                <button 
                  onClick={clearSearch} 
                  className="ks-search-clear"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--ks-text-soft)" }}>Dari:</span>
              <input type="date" className="ks-input" style={{ width: "110px", padding: "4px", fontSize: "11px", height: "24px", borderRadius: 0, backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1" }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--ks-text-soft)" }}>Sampai:</span>
              <input type="date" className="ks-input" style={{ width: "110px", padding: "4px", fontSize: "11px", height: "24px", borderRadius: 0, backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1" }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="ks-grid-scroll">
          {error ? (
            <div className="ks-empty">
              <p>{error}</p>
            </div>
          ) : (
            <>
              <table className="ks-grid">
                <thead>
                  <tr>
                    <th>TANGGAL</th>
                    <th>ID PENDAPATAN</th>
                    <th>NAMA PENJAHIT</th>
                    <th>STATUS</th>
                    <th>TOTAL PENDAPATAN</th>
                    <th>TOTAL TRANSFER</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton />
                  ) : pendapatans.length > 0 ? (
                    pendapatans.map((pendapatan) => (
                      <tr key={pendapatan.id_pendapatan}>
                        <td>{formatDate(pendapatan.created_at)}</td>
                        <td><strong>#{pendapatan.id_pendapatan}</strong></td>
                        <td>{pendapatan.penjahit?.nama_penjahit || "-"}</td>
                        <td>
                          {pendapatan.status_pembayaran}
                        </td>
                        <td>{formatCurrency(pendapatan.total_pendapatan)}</td>
                        <td>{formatCurrency(pendapatan.total_transfer)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "32px 0" }}>
                        Tidak ada data ditemukan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination Controls - Only show if not loading and has data */}
              {!loading && pendapatans.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderTop: "1px solid var(--ks-line)" }}>
                  <div style={{ fontSize: "12px", color: "var(--ks-text-soft)" }}>
                    Menampilkan <span style={{ fontWeight: '600', color: '#0f172a' }}>{pagination.from}</span> - <span style={{ fontWeight: '600', color: '#0f172a' }}>{pagination.to}</span> dari <span style={{ fontWeight: '600', color: '#0f172a' }}>{pagination.total}</span> data
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button 
                      className="ks-btn is-secondary"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      style={{ fontSize: "12px" }}
                    >
                      <FiChevronLeft style={{ marginRight: "4px" }} /> Sebelumnya
                    </button>
                    
                    <div style={{ fontSize: "12px", fontWeight: "500" }}>
                      Halaman {pagination.currentPage}
                    </div>

                    <button 
                      className="ks-btn is-secondary"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.lastPage}
                      style={{ fontSize: "12px" }}
                    >
                      Selanjutnya <FiChevronRight style={{ marginLeft: "4px" }} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default HistoryPendapatan;

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./LaporanDailyProduksi.css";
import API from "../../../api";

// --- Sub-Components ---

const StatCard = ({ icon, label, value, colorClass = "", children, onClick }) => (
  <div 
    className={`crafted-card ${colorClass} animate-fade-in`} 
    onClick={onClick}
    style={onClick ? { cursor: 'pointer' } : {}}
  >
    <div className="card-header">
      <div className="icon-box">{icon}</div>
      {/* Optional Top Right Element */}
    </div>
    <div className="card-content">
      <div className="card-value">{value}</div>
      <div className="card-label">{label}</div>
      {children}
    </div>
  </div>
);

const ListItem = ({ icon, title, subtitle, value, status, badgeText, badgeType, onClick }) => (
  <div className="list-row" onClick={onClick}>
    <div className="row-info">
      <div className={`row-icon ${status}`}>{icon}</div>
      <div className="row-text">
        <h4>{title}</h4>
        <p>{subtitle}</p>
      </div>
    </div>
    <div className="row-value">
      <span className="amount">{value}</span>
      {badgeText && (
        <span className={`status-pill ${badgeType}`}>{badgeText}</span>
      )}
    </div>
  </div>
);

const SkeletonLoader = () => (
  <div className="dashboard-container">
    <div className="dashboard-header">
      <div className="skeleton skeleton-text" style={{ width: '200px', height: '40px' }}></div>
      <div className="skeleton skeleton-text" style={{ width: '150px', height: '40px' }}></div>
    </div>
    <div className="bento-grid">
      <div className="col-span-3 skeleton skeleton-rect"></div>
      <div className="col-span-3 skeleton skeleton-rect"></div>
      <div className="col-span-3 skeleton skeleton-rect"></div>
      <div className="col-span-3 skeleton skeleton-rect"></div>
    </div>
    <div className="bento-grid">
      <div className="col-span-8 skeleton skeleton-rect" style={{ height: '300px' }}></div>
      <div className="col-span-4 skeleton skeleton-rect" style={{ height: '300px' }}></div>
    </div>
  </div>
);

// --- Main Component ---

const LaporanDailyProduksi = () => {
  const navigate = useNavigate();
  const [laporanData, setLaporanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tanggal, setTanggal] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [waitingBahanInput, setWaitingBahanInput] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Helper: Format Number
  const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Helper: Session Storage
  const loadWaitingBahanFromStorage = (date) => {
    const key = `laporan_daily_waiting_bahan_${date}`;
    const saved = sessionStorage.getItem(key);
    return saved ? parseInt(saved, 10) : 0;
  };

  const saveWaitingBahanToStorage = (date, nilai) => {
    const key = `laporan_daily_waiting_bahan_${date}`;
    sessionStorage.setItem(key, nilai.toString());
  };

  // Effect: Load Saved Value
  useEffect(() => {
    const savedValue = loadWaitingBahanFromStorage(tanggal);
    setWaitingBahanInput(savedValue);
  }, [tanggal]);

  // Handler: Manual Input
  const handleWaitingBahanChange = (e) => {
    const value = parseInt(e.target.value, 10) || 0;
    if (value < 0) return;
    setWaitingBahanInput(value);
  };

  const handleSaveManual = () => {
    setIsSaving(true);
    saveWaitingBahanToStorage(tanggal, waitingBahanInput);
    setTimeout(() => setIsSaving(false), 1000);
  };

  // Effect: Fetch Data
  useEffect(() => {
    const fetchLaporanDaily = async () => {
      if (!tanggal) return;

      try {
        setLoading(true);
        setError(null);
        // Simulate slight delay for skeleton demo if needed, but here we just fetch
        const response = await API.get("/laporan-daily-produksi", {
          params: { tanggal: tanggal },
        });
        setLaporanData(response.data.data);
      } catch (err) {
        console.error(err);
        setError("Gagal mengambil data laporan daily produksi");
      } finally {
        setLoading(false);
      }
    };

    fetchLaporanDaily();
  }, [tanggal]);

  // Derived State
  const totalPekerjaan = useMemo(() => {
    if (!laporanData) return 0;
    return (
      waitingBahanInput +
      (laporanData.cutting?.spk_belum_potong?.jml_pcs || 0) +
      (laporanData.cmt?.spk_belum_ambil?.jml_pcs || 0) +
      (laporanData.cmt?.sedang_dikerjakan?.total_jml_pcs || 0)
    );
  }, [laporanData, waitingBahanInput]);

  const persentaseKirim = useMemo(() => {
    const rataRata = laporanData?.cmt?.kemampuan_kirim?.rata_rata_kirim || 0;
    return totalPekerjaan > 0 ? ((rataRata / totalPekerjaan) * 100).toFixed(1) : 0;
  }, [laporanData, totalPekerjaan]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Render
  if (loading) return <SkeletonLoader />;

  if (error) {
    return (
      <div className="error-container animate-fade-in">
        <div className="error-icon">⚠️</div>
        <h2 style={{ color: 'var(--color-dark)' }}>Something went wrong</h2>
        <p style={{ color: 'var(--color-text-light)' }}>{error}</p>
        <button 
          className="tag-pill" 
          style={{ marginTop: '1rem', fontSize: '1rem' }}
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container animate-fade-in">
      {/* HEADER */}
      <div className="dashboard-header">
        <div className="header-welcome">
          <span className="header-subtitle">{getGreeting()}, Team!</span>
          <h1 className="header-title">Production Overview</h1>
        </div>
        <div className="header-controls">
          <div className="control-pill">
            <span role="img" aria-label="calendar">📅</span>
            <input
              type="date"
              className="date-input"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
          <div className="user-avatar">U</div>
        </div>
      </div>

      {!laporanData ? (
        <div className="error-container">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <h3>No Data Available</h3>
          <p style={{ color: 'var(--color-text-light)' }}>Please select a different date.</p>
        </div>
      ) : (
        <>
          {/* TOP STATS GRID */}
          <div className="bento-grid">
            
            {/* 1. SPK Belum Potong */}
            <div className="col-span-3">
              <StatCard
                icon="✂️"
                label="SPK Belum Potong (PCS)"
                value={formatNumber(laporanData.cutting?.spk_belum_potong?.jml_pcs || 0)}
              >
                <div className="action-tags">
                  <span 
                    className="tag-pill"
                    onClick={() => navigate("/spkcutting?jenis_spk=Terjual&status=belum_diambil")}
                  >
                    Sold: <strong>{formatNumber(laporanData.cutting?.spk_belum_potong?.turunan_produk?.terjual || 0)}</strong>
                  </span>
                  <span 
                    className="tag-pill"
                    onClick={() => navigate("/spkcutting?jenis_spk=Fittingan&status=belum_diambil")}
                  >
                    Fitting: <strong>{formatNumber(laporanData.cutting?.spk_belum_potong?.turunan_produk?.fittingan_baru || 0)}</strong>
                  </span>
                </div>
              </StatCard>
            </div>

            {/* 2. Hasil Cutting */}
            <div className="col-span-3">
              <StatCard
                icon="📦"
                label="Hasil Cutting Week"
                value={formatNumber(laporanData.cutting?.hasil_cuttingan_minggu_ini?.total_jml_pcs || 0)}
                onClick={() => navigate("/hasilcutting")}
              >
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
                  Active Cutters: {laporanData.cutting?.hasil_cuttingan_minggu_ini?.tukang_cutting?.length || 0}
                </div>
              </StatCard>
            </div>

            {/* 3. Waiting Bahan (Interactive) */}
            <div className="col-span-3">
              <div className="crafted-card primary-gradient">
                <div className="card-header">
                  <div className="icon-box">⏳</div>
                </div>
                <div className="card-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Waiting Bahan (Est)</div>
                <div className="glass-input-wrapper">
                  <input
                    type="number"
                    className="modern-input"
                    value={waitingBahanInput}
                    onChange={handleWaitingBahanChange}
                    onBlur={handleSaveManual}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveManual()}
                    placeholder="0"
                  />
                  {isSaving && <div className="save-badge">Saved</div>}
                </div>
              </div>
            </div>

            {/* 4. Total Workload */}
            <div className="col-span-3">
              <StatCard
                icon="📊"
                label="Total Workload (PCS)"
                value={formatNumber(totalPekerjaan)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ flex: 1, height: '6px', background: '#E0E5F2', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(persentaseKirim, 100)}%`, height: '100%', background: 'var(--color-primary)' }}></div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>{persentaseKirim}% Cap</span>
                </div>
              </StatCard>
            </div>
          </div>

          {/* MIDDLE SECTION */}
          <div className="bento-grid">
            
            {/* CMT Status List */}
            <div className="col-span-8 crafted-card">
              <div className="card-header">
                <h3 style={{ margin: 0, color: 'var(--color-dark)' }}>CMT Production Status</h3>
                <span className="tag-pill">Live Updates</span>
              </div>
              <div className="list-group">
                <ListItem
                  icon="⏱️"
                  status="blue"
                  title="Masih Deadline"
                  subtitle="Production on schedule"
                  value={`${formatNumber(laporanData.cmt?.sedang_dikerjakan?.masih_dalam_deadline || 0)} PCS`}
                  badgeText="View"
                  badgeType="success"
                  onClick={() => navigate("/spkcmt?status=sudah_diambil&deadline_status=masih_deadline")}
                />
                <ListItem
                  icon="⚠️"
                  status="red"
                  title="Over Deadline"
                  subtitle="Needs immediate attention"
                  value={`${formatNumber(laporanData.cmt?.sedang_dikerjakan?.over_deadline || 0)} PCS`}
                  badgeText="Alert"
                  badgeType="danger"
                  onClick={() => navigate("/spkcmt?status=sudah_diambil&deadline_status=over_deadline")}
                />
                <ListItem
                  icon="🚚"
                  status="green"
                  title="Kirim Minggu Ini"
                  subtitle="Completed & Delivered"
                  value={`${formatNumber(laporanData.cmt?.sedang_dikerjakan?.kirim_minggu_ini || 0)} PCS`}
                  badgeText="Done"
                  badgeType="success"
                  onClick={() => navigate("/spkcmt?status=sudah_diambil&kirim_minggu_ini=true")}
                />
                {/* Summary Item */}
                <div className="list-row" style={{ marginTop: '0.5rem', borderTop: '1px solid #F4F7FE' }}>
                   <div className="row-info">
                     <div className="row-text">
                       <h4>Total In Progress</h4>
                     </div>
                   </div>
                   <div className="row-value">
                     <span className="amount" style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                       {formatNumber(laporanData.cmt?.sedang_dikerjakan?.total_jml_pcs || 0)} PCS
                     </span>
                   </div>
                </div>
              </div>
            </div>

            {/* SPK Belum Ambil (Quick Stat) */}
            <div className="col-span-4 crafted-card" style={{ background: '#FFF7E6', border: 'none' }}>
              <div className="card-header">
                <h3 style={{ margin: 0, color: '#FFB547' }}>SPK Belum Ambil</h3>
                <div className="icon-box" style={{ background: 'white', color: '#FFB547' }}>📥</div>
              </div>
              <div style={{ margin: '2rem 0' }}>
                 <div className="card-value" style={{ color: '#FFB547', fontSize: '3rem' }}>
                   {formatNumber(laporanData.cmt?.spk_belum_ambil?.jml_pcs || 0)}
                 </div>
                 <div className="card-label" style={{ color: '#CC8A29' }}>Total Pieces Waiting</div>
              </div>
              <div className="action-tags">
                <span className="tag-pill" style={{ background: 'white', color: '#CC8A29' }} onClick={() => navigate("/kode-seri-belum-dikerjakan")}>
                  {formatNumber(laporanData.cmt?.spk_belum_ambil?.jml_spk || 0)} SPK
                </span>
                <span className="tag-pill" style={{ background: 'white', color: '#CC8A29' }} onClick={() => navigate("/kode-seri-belum-dikerjakan")}>
                  {formatNumber(laporanData.cmt?.spk_belum_ambil?.jml_produk || 0)} Products
                </span>
              </div>
            </div>

          </div>

          {/* BOTTOM TABLES */}
          <div className="bento-grid">
            
            {/* Table 1: Performance */}
            <div className="col-span-6 crafted-card">
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Cutter Performance</h3>
              </div>
              <div className="modern-table-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Output (PCS)</th>
                      <th>Tasks (SPK)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laporanData.cutting?.hasil_cuttingan_minggu_ini?.tukang_cutting?.slice(0, 5).map((tukang, idx) => (
                      <tr 
                        key={idx}
                        onClick={() => {
                           const today = new Date();
                           const startOfWeek = new Date(today);
                           startOfWeek.setDate(today.getDate() - today.getDay() + 1);
                           const endOfWeek = new Date(startOfWeek);
                           endOfWeek.setDate(startOfWeek.getDate() + 6);
                           const weeklyStart = startOfWeek.toISOString().split('T')[0];
                           const weeklyEnd = endOfWeek.toISOString().split('T')[0];
                           const searchParams = new URLSearchParams({
                              tukang_cutting: tukang.nama,
                              weekly_start: weeklyStart,
                              weekly_end: weeklyEnd
                            });
                           navigate(`/hasilcutting?${searchParams.toString()}`);
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="status-dot" style={{ background: 'var(--color-success)' }}></div>
                            {tukang.nama}
                          </div>
                        </td>
                        <td>{formatNumber(tukang.jml_pcs)}</td>
                        <td>{formatNumber(tukang.jml_spk)}</td>
                      </tr>
                    ))}
                    {(!laporanData.cutting?.hasil_cuttingan_minggu_ini?.tukang_cutting || 
                      laporanData.cutting.hasil_cuttingan_minggu_ini.tukang_cutting.length === 0) && (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', color: 'var(--color-text-light)' }}>No data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: History */}
            <div className="col-span-6 crafted-card">
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Shipping Capacity History</h3>
              </div>
              <div className="modern-table-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Total Shipped</th>
                      <th>Avg Comparison</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laporanData.cmt?.kemampuan_kirim?.periode_4_minggu?.map((periode, idx) => {
                      const avg = laporanData.cmt?.kemampuan_kirim?.rata_rata_kirim || 1;
                      const percent = ((periode.jml_pcs / avg) * 100).toFixed(0);
                      const isHigh = percent >= 100;
                      
                      return (
                        <tr key={idx}>
                          <td>{periode.minggu}</td>
                          <td>{formatNumber(periode.jml_pcs)} PCS</td>
                          <td>
                            <span className={`status-pill ${isHigh ? 'success' : 'warning'}`}>
                              {percent}% of Avg
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                     {(!laporanData.cmt?.kemampuan_kirim?.periode_4_minggu || 
                      laporanData.cmt.kemampuan_kirim.periode_4_minggu.length === 0) && (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', color: 'var(--color-text-light)' }}>No history available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default LaporanDailyProduksi;

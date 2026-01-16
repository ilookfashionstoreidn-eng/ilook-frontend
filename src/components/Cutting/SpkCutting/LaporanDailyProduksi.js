import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LaporanDailyProduksi.css";
import API from "../../../api";

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

  // Format angka dengan thousand separator
  const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Function untuk load dari sessionStorage
  const loadWaitingBahanFromStorage = (tanggal) => {
    const key = `laporan_daily_waiting_bahan_${tanggal}`;
    const saved = sessionStorage.getItem(key);
    return saved ? parseInt(saved, 10) : 0;
  };

  // Function untuk save ke sessionStorage
  const saveWaitingBahanToStorage = (tanggal, nilai) => {
    const key = `laporan_daily_waiting_bahan_${tanggal}`;
    sessionStorage.setItem(key, nilai.toString());
  };

  // Load nilai dari sessionStorage saat tanggal berubah
  useEffect(() => {
    const savedValue = loadWaitingBahanFromStorage(tanggal);
    setWaitingBahanInput(savedValue);
  }, [tanggal]);

  // Handler untuk input change
  const handleWaitingBahanChange = (e) => {
    const value = parseInt(e.target.value, 10) || 0;
    if (value < 0) return; // Validasi: tidak boleh negatif
    setWaitingBahanInput(value);
    setIsSaving(true);
    saveWaitingBahanToStorage(tanggal, value);
    setTimeout(() => setIsSaving(false), 500); // Feedback visual
  };

  useEffect(() => {
    const fetchLaporanDaily = async () => {
      if (!tanggal) return;

      try {
        setLoading(true);
        setError(null);

        const response = await API.get("/laporan-daily-produksi", {
          params: {
            tanggal: tanggal,
          },
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

  return (
    <div className="laporan-daily-container">
      <div className="laporan-daily-header">
        <h1>Laporan Daily Produksi</h1>
        <div className="laporan-daily-filter">
          <label htmlFor="tanggal-filter">Tanggal:</label>
          <input
            id="tanggal-filter"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
      </div>

      {loading && (
        <div className="laporan-daily-loading">
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          Memuat data laporan...
        </div>
      )}

      {error && (
        <div className="laporan-daily-error">
          {error}
        </div>
      )}

      {!loading && !error && laporanData && (
        <div className="laporan-daily-content">
          {/* SECTION CUTTING PRODUK */}
          <section className="laporan-section">
            <h2 className="section-title">CUTTING PRODUK</h2>
            
            <div className="cards-grid">
              {/* Card SPK Belum Potong */}
              <div className="laporan-card card-blue">
                <h3 className="card-title">SPK Belum Potong</h3>
                <div className="card-content">
                  <div className="stat-row">
                    <span className="stat-label">JML Model:</span>
                    <span className="stat-value">{formatNumber(laporanData.cutting?.spk_belum_potong?.jml_model || 0)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">JML PCS:</span>
                    <span className="stat-value">{formatNumber(laporanData.cutting?.spk_belum_potong?.jml_pcs || 0)}</span>
                  </div>
                  
                  {laporanData.cutting?.spk_belum_potong?.turunan_produk && (
                    <div className="turunan-section">
                      <h4 className="turunan-title">Turunan dari Produk:</h4>
                      <div className="turunan-list">
                        <div 
                          className="turunan-item clickable-turunan-item"
                          onClick={() => navigate("/spkcutting?jenis_spk=Terjual&status=belum_diambil")}
                          style={{ cursor: "pointer" }}
                          title="Klik untuk melihat SPK Cutting dengan jenis Terjual"
                        >
                          <span>Terjual:</span>
                          <span className="turunan-value">{formatNumber(laporanData.cutting.spk_belum_potong.turunan_produk.terjual || 0)}</span>
                        </div>
                        <div 
                          className="turunan-item clickable-turunan-item"
                          onClick={() => navigate("/spkcutting?jenis_spk=Fittingan&status=belum_diambil")}
                          style={{ cursor: "pointer" }}
                          title="Klik untuk melihat SPK Cutting dengan jenis Fittingan Baru"
                        >
                          <span>Fitingan Baru:</span>
                          <span className="turunan-value">{formatNumber(laporanData.cutting.spk_belum_potong.turunan_produk.fittingan_baru || 0)}</span>
                        </div>
                        <div 
                          className="turunan-item clickable-turunan-item"
                          onClick={() => navigate("/spkcutting?jenis_spk=Habisin Bahan&status=belum_diambil")}
                          style={{ cursor: "pointer" }}
                          title="Klik untuk melihat SPK Cutting dengan jenis Habisin Bahan"
                        >
                          <span>Habisin Bahan:</span>
                          <span className="turunan-value">{formatNumber(laporanData.cutting.spk_belum_potong.turunan_produk.habisin_bahan || 0)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Hasil Cuttingan Minggu Ini */}
              <div 
                className="laporan-card clickable-card card-green" 
                onClick={() => navigate("/hasilcutting")}
                style={{ cursor: "pointer" }}
                title="Klik untuk melihat detail Hasil Cutting"
              >
                <h3 className="card-title">Hasil Cuttingan Minggu Ini</h3>
                <div className="card-content">
                  <div className="stat-row highlight-stat">
                    <span className="stat-label">Total JML PCS:</span>
                    <span className="stat-value highlight-yellow">{formatNumber(laporanData.cutting?.hasil_cuttingan_minggu_ini?.total_jml_pcs || 0)}</span>
                  </div>
                  
                  {laporanData.cutting?.hasil_cuttingan_minggu_ini?.tukang_cutting && 
                   laporanData.cutting.hasil_cuttingan_minggu_ini.tukang_cutting.length > 0 && (
                    <div className="tukang-cutting-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Tukang Cutting</th>
                            <th>JML PCS</th>
                            <th>JML SPK</th>
                            <th>JML TIM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {laporanData.cutting.hasil_cuttingan_minggu_ini.tukang_cutting.map((tukang, index) => {
                            // Hitung awal dan akhir minggu ini untuk query parameter
                            const today = new Date();
                            const startOfWeek = new Date(today);
                            startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Senin
                            startOfWeek.setHours(0, 0, 0, 0);
                            
                            const endOfWeek = new Date(startOfWeek);
                            endOfWeek.setDate(startOfWeek.getDate() + 6); // Minggu
                            endOfWeek.setHours(23, 59, 59, 999);
                            
                            const weeklyStart = startOfWeek.toISOString().split('T')[0];
                            const weeklyEnd = endOfWeek.toISOString().split('T')[0];
                            
                            const handleRowClick = (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const tukangNama = encodeURIComponent(tukang.nama);
                              const searchParams = new URLSearchParams({
                                tukang_cutting: tukang.nama,
                                weekly_start: weeklyStart,
                                weekly_end: weeklyEnd
                              });
                              const url = `/hasilcutting?${searchParams.toString()}`;
                              console.log('Navigating to:', url);
                              console.log('Tukang:', tukang.nama, 'Weekly Start:', weeklyStart, 'Weekly End:', weeklyEnd);
                              navigate(url);
                            };
                            
                            return (
                              <tr 
                                key={index}
                                className="clickable-table-row"
                                onClick={handleRowClick}
                                style={{ cursor: "pointer" }}
                                title={`Klik untuk melihat hasil cutting dari ${tukang.nama} dalam minggu ini`}
                              >
                                <td>{tukang.nama}</td>
                                <td>{formatNumber(tukang.jml_pcs || 0)}</td>
                                <td>{formatNumber(tukang.jml_spk || 0)}</td>
                                <td>{formatNumber(tukang.jml_tim || 0)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION CMT */}
          <section className="laporan-section">
            <h2 className="section-title">CMT</h2>
            
            <div className="cards-grid">
              {/* Card Perkiraan PCS Waiting Bahan */}
              <div className="laporan-card card-purple">
                <h3 className="card-title">Perkiraan PCS Waiting Bahan</h3>
                <div className="card-content">
                  <div className="input-manual-section">
                    <label htmlFor="waiting-bahan-input" className="input-label">
                      JML PCS (Input Manual):
                    </label>
                    <div className="input-wrapper">
                      <input
                        id="waiting-bahan-input"
                        type="number"
                        min="0"
                        value={waitingBahanInput}
                        onChange={handleWaitingBahanChange}
                        onBlur={handleWaitingBahanChange}
                        placeholder="Masukkan jumlah PCS"
                        className="waiting-bahan-input"
                      />
                      {isSaving && (
                        <span className="save-indicator">✓ Tersimpan</span>
                      )}
                    </div>
                    <div className="input-display-value">
                      Nilai saat ini: <strong>{formatNumber(waitingBahanInput)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card SPK Belum Ambil CMT */}
              <div 
                className="laporan-card clickable-card card-info" 
                onClick={() => navigate("/kode-seri-belum-dikerjakan")}
                style={{ cursor: "pointer" }}
                title="Klik untuk melihat detail Kode Seri Belum Dikerjakan"
              >
                <h3 className="card-title">SPK Belum Ambil CMT</h3>
                <div className="card-content">
                  <div className="stat-row">
                    <span className="stat-label">JML PCS:</span>
                    <span className="stat-value">{formatNumber(laporanData.cmt?.spk_belum_ambil?.jml_pcs || 0)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">JML SPK:</span>
                    <span className="stat-value">{formatNumber(laporanData.cmt?.spk_belum_ambil?.jml_spk || 0)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">JML Produk:</span>
                    <span className="stat-value">{formatNumber(laporanData.cmt?.spk_belum_ambil?.jml_produk || 0)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">JML Model Produk:</span>
                    <span className="stat-value">{formatNumber(laporanData.cmt?.spk_belum_ambil?.jml_model_produk || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Card Sedang Dikerjakan */}
              <div className="laporan-card card-orange">
                <h3 className="card-title">Sedang Dikerjakan</h3>
                <div className="card-content">
                  <div className="stat-row highlight-stat">
                    <span className="stat-label">Total JML PCS:</span>
                    <span className="stat-value">{formatNumber(laporanData.cmt?.sedang_dikerjakan?.total_jml_pcs || 0)}</span>
                  </div>
                  
                  <div className="turunan-section">
                    <h4 className="turunan-title">Turunan:</h4>
                    <div className="turunan-list">
                      <div 
                        className="turunan-item clickable-turunan-item"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const searchParams = new URLSearchParams({
                            status: 'sudah_diambil',
                            deadline_status: 'masih_deadline'
                          });
                          navigate(`/spkcmt?${searchParams.toString()}`);
                        }}
                        style={{ cursor: "pointer" }}
                        title="Klik untuk melihat SPK CMT yang masih dalam deadline"
                      >
                        <span>Masih dalam Deadline:</span>
                        <span className="turunan-value">{formatNumber(laporanData.cmt?.sedang_dikerjakan?.masih_dalam_deadline || 0)}</span>
                      </div>
                      <div 
                        className="turunan-item clickable-turunan-item"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const searchParams = new URLSearchParams({
                            status: 'sudah_diambil',
                            deadline_status: 'over_deadline'
                          });
                          navigate(`/spkcmt?${searchParams.toString()}`);
                        }}
                        style={{ cursor: "pointer" }}
                        title="Klik untuk melihat SPK CMT yang over deadline"
                      >
                        <span>Over Deadline:</span>
                        <span className="turunan-value highlight-red">{formatNumber(laporanData.cmt?.sedang_dikerjakan?.over_deadline || 0)}</span>
                      </div>
                      <div 
                        className="turunan-item clickable-turunan-item"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const searchParams = new URLSearchParams({
                            status: 'sudah_diambil',
                            kirim_minggu_ini: 'true'
                          });
                          navigate(`/spkcmt?${searchParams.toString()}`);
                        }}
                        style={{ cursor: "pointer" }}
                        title="Klik untuk melihat SPK CMT yang sudah kirim minggu ini"
                      >
                        <span>Kirim Minggu Ini:</span>
                        <span className="turunan-value highlight-green">{formatNumber(laporanData.cmt?.sedang_dikerjakan?.kirim_minggu_ini || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Kemampuan Kirim All CMT */}
              <div 
                className="laporan-card clickable-card card-pink" 
                onClick={() => navigate("/data-dikerjakan-pengiriman-cmt")}
                style={{ cursor: "pointer" }}
                title="Klik untuk melihat detail Data Dikerjakan & Pengiriman CMT"
              >
                <h3 className="card-title">Kemampuan Kirim All CMT</h3>
                <div className="card-content">
                  {laporanData.cmt?.kemampuan_kirim?.periode_4_minggu && 
                   laporanData.cmt.kemampuan_kirim.periode_4_minggu.length > 0 && (
                    <div className="periode-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Periode</th>
                            <th>JML PCS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {laporanData.cmt.kemampuan_kirim.periode_4_minggu.map((periode, index) => (
                            <tr key={index}>
                              <td>{periode.minggu}</td>
                              <td>{formatNumber(periode.jml_pcs || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  <div className="stat-row highlight-stat">
                    <span className="stat-label">Rata-rata Kirim /PCS:</span>
                    <span className="stat-value highlight-yellow">{formatNumber(laporanData.cmt?.kemampuan_kirim?.rata_rata_kirim || 0)}</span>
                  </div>
                  
                  <div className="stat-row highlight-stat">
                    <span className="stat-label">Persentase % Kekuatan Pengiriman CMT:</span>
                    <span className="stat-value highlight-blue">
                      {(() => {
                        const rataRataKirim = laporanData.cmt?.kemampuan_kirim?.rata_rata_kirim || 0;
                        const totalPekerjaan = 
                          waitingBahanInput +
                          (laporanData.cutting?.spk_belum_potong?.jml_pcs || 0) +
                          (laporanData.cmt?.spk_belum_ambil?.jml_pcs || 0) +
                          (laporanData.cmt?.sedang_dikerjakan?.total_jml_pcs || 0);
                        const persentase = totalPekerjaan > 0 
                          ? ((rataRataKirim / totalPekerjaan) * 100).toFixed(2)
                          : 0;
                        return formatNumber(persentase);
                      })()}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Jumlah Total Pekerjaan */}
              <div className="laporan-card highlight-card-yellow">
                <h3 className="card-title">Jumlah Total Pekerjaan</h3>
                <div className="card-content">
                  <div className="stat-row highlight-stat">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value highlight-yellow large-text">
                      {formatNumber(
                        waitingBahanInput +
                        (laporanData.cutting?.spk_belum_potong?.jml_pcs || 0) +
                        (laporanData.cmt?.spk_belum_ambil?.jml_pcs || 0) +
                        (laporanData.cmt?.sedang_dikerjakan?.total_jml_pcs || 0)
                      )}
                    </span>
                  </div>
                  <div className="formula-text">
                    <small>
                      PCS Menunggu Bahan ({formatNumber(waitingBahanInput)}) + SPK Belum Potong ({formatNumber(laporanData.cutting?.spk_belum_potong?.jml_pcs || 0)}) + SPK Belum Ambil CMT ({formatNumber(laporanData.cmt?.spk_belum_ambil?.jml_pcs || 0)}) + Sedang Dikerjakan CMT ({formatNumber(laporanData.cmt?.sedang_dikerjakan?.total_jml_pcs || 0)})
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {!loading && !error && !laporanData && (
        <div className="laporan-daily-empty">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Tidak ada data</div>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>Tidak ada data untuk tanggal yang dipilih</div>
        </div>
      )}
    </div>
  );
};

export default LaporanDailyProduksi;

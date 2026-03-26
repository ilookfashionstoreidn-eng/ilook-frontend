import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiAlertTriangle,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiPackage,
  FiScissors,
  FiSearch,
  FiTruck,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import "./LaporanDailyProduksi.css";
import API from "../../../api";

const LaporanDailyProduksi = () => {
  const navigate = useNavigate();
  const [laporanData, setLaporanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tanggal, setTanggal] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [waitingBahanInput, setWaitingBahanInput] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const loadWaitingBahanFromStorage = (date) => {
    const key = `laporan_daily_waiting_bahan_${date}`;
    const saved = sessionStorage.getItem(key);
    return saved ? parseInt(saved, 10) : 0;
  };

  const saveWaitingBahanToStorage = (date, nilai) => {
    const key = `laporan_daily_waiting_bahan_${date}`;
    sessionStorage.setItem(key, nilai.toString());
  };

  useEffect(() => {
    const savedValue = loadWaitingBahanFromStorage(tanggal);
    setWaitingBahanInput(savedValue);
  }, [tanggal]);

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

  useEffect(() => {
    const fetchLaporanDaily = async () => {
      if (!tanggal) return;

      try {
        setLoading(true);
        setError(null);
        const response = await API.get("/laporan-daily-produksi", {
          params: { tanggal },
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

  const getWeekRangeFromDate = (dateString) => {
    const baseDate = new Date(dateString);
    const day = baseDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const startOfWeek = new Date(baseDate);
    startOfWeek.setDate(baseDate.getDate() + diffToMonday);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return {
      weeklyStart: startOfWeek.toISOString().split("T")[0],
      weeklyEnd: endOfWeek.toISOString().split("T")[0],
    };
  };

  const renderSkeleton = () => (
    <div className="ldp-container">
      <div className="ldp-skeleton-row">
        <div className="ldp-skeleton ldp-skeleton-title" />
        <div className="ldp-skeleton ldp-skeleton-control" />
      </div>
      <div className="ldp-skeleton-grid">
        <div className="ldp-skeleton ldp-skeleton-card" />
        <div className="ldp-skeleton ldp-skeleton-card" />
        <div className="ldp-skeleton ldp-skeleton-card" />
        <div className="ldp-skeleton ldp-skeleton-card" />
      </div>
      <div className="ldp-skeleton-grid ldp-skeleton-grid-2">
        <div className="ldp-skeleton ldp-skeleton-panel" />
        <div className="ldp-skeleton ldp-skeleton-panel" />
      </div>
    </div>
  );

  const renderTopbar = () => (
    <header className="ldp-topbar">
      <div className="ldp-title-group">
        <div className="ldp-brand-icon">
          <FiActivity />
        </div>
        <div className="ldp-brand-text">
          <h1 className="ldp-title">Laporan Daily Produksi</h1>
          <p className="ldp-subtitle">Ringkasan kerja cutting dan CMT per tanggal produksi.</p>
        </div>
      </div>
      <div className="ldp-topbar-actions">
        <div className="ldp-sync-pill">
          <FiCheckCircle />
          Update Otomatis
        </div>
        <div className="ldp-date-control">
          <FiCalendar />
          <input
            type="date"
            className="ldp-date-input"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <button className="ldp-icon-btn" type="button" aria-label="Search">
          <FiSearch />
        </button>
        <button className="ldp-icon-btn" type="button" aria-label="Notification">
          <FiBell />
          <span className="ldp-icon-badge">3</span>
        </button>
        <div className="ldp-avatar" aria-hidden="true" />
      </div>
    </header>
  );

  const wrapLayout = (content) => (
    <div className="ldp-page">
      <div className="ldp-shell">
        <section className="ldp-content">
          {renderTopbar()}
          <main className="ldp-main">
            {content}
          </main>
        </section>
      </div>
    </div>
  );

  if (loading) return wrapLayout(renderSkeleton());

  if (error) {
    return wrapLayout(
      <div className="ldp-container">
        <div className="ldp-feedback-card">
          <div className="ldp-feedback-icon"><FiAlertTriangle /></div>
          <h3>Terjadi Kendala</h3>
          <p>{error}</p>
          <button className="ldp-btn-primary" onClick={() => window.location.reload()}>
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  return wrapLayout(
    <div className="ldp-container">
      {!laporanData ? (
        <div className="ldp-feedback-card">
          <div className="ldp-feedback-icon"><FiActivity /></div>
          <h3>Data Tidak Tersedia</h3>
          <p>Silakan pilih tanggal lain untuk melihat laporan.</p>
        </div>
      ) : (
        <>
          <div className="ldp-stat-grid">
            <div className="ldp-stat-card">
              <div className="ldp-stat-head">
                <div className="ldp-stat-icon"><FiScissors /></div>
                <span className="ldp-stat-label">SPK Belum Potong</span>
              </div>
              <div className="ldp-stat-value">{formatNumber(laporanData.cutting?.spk_belum_potong?.jml_pcs || 0)} PCS</div>
              <div className="ldp-chip-row">
                <button
                  className="ldp-chip"
                  onClick={() => navigate("/spkcutting?jenis_spk=Terjual&status=belum_diambil")}
                >
                  Terjual {formatNumber(laporanData.cutting?.spk_belum_potong?.turunan_produk?.terjual || 0)}
                </button>
                <button
                  className="ldp-chip"
                  onClick={() => navigate("/spkcutting?jenis_spk=Fittingan&status=belum_diambil")}
                >
                  Fitting {formatNumber(laporanData.cutting?.spk_belum_potong?.turunan_produk?.fittingan_baru || 0)}
                </button>
              </div>
            </div>

            <div className="ldp-stat-card">
              <div className="ldp-stat-head">
                <div className="ldp-stat-icon"><FiPackage /></div>
                <span className="ldp-stat-label">Hasil Cutting Minggu Ini</span>
              </div>
              <div className="ldp-stat-value">{formatNumber(laporanData.cutting?.hasil_cuttingan_minggu_ini?.total_jml_pcs || 0)} PCS</div>
              <button className="ldp-link-btn" onClick={() => navigate("/hasilcutting")}>
                Lihat Detail
              </button>
            </div>

            <div className="ldp-stat-card ldp-stat-card-emphasis">
              <div className="ldp-stat-head">
                <div className="ldp-stat-icon"><FiClock /></div>
                <span className="ldp-stat-label">Waiting Bahan (Estimasi)</span>
              </div>
              <div className="ldp-input-wrap">
                <input
                  type="number"
                  className="ldp-number-input"
                  value={waitingBahanInput}
                  onChange={handleWaitingBahanChange}
                  onBlur={handleSaveManual}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveManual()}
                  placeholder="0"
                />
                {isSaving && <span className="ldp-save-badge">Tersimpan</span>}
              </div>
            </div>

            <div className="ldp-stat-card">
              <div className="ldp-stat-head">
                <div className="ldp-stat-icon"><FiTrendingUp /></div>
                <span className="ldp-stat-label">Total Pekerjaan</span>
              </div>
              <div className="ldp-stat-value">{formatNumber(totalPekerjaan)} PCS</div>
              <div className="ldp-progress-wrap">
                <div className="ldp-progress-bar">
                  <div className="ldp-progress-fill" style={{ width: `${Math.min(Number(persentaseKirim), 100)}%` }} />
                </div>
                <span className="ldp-progress-text">{persentaseKirim}% Kapasitas Kirim</span>
              </div>
            </div>
          </div>

          <div className="ldp-main-grid">
            <div className="ldp-panel-card">
              <div className="ldp-panel-head">
                <h3>Status Produksi CMT</h3>
              </div>
              <div className="ldp-list">
                <button
                  className="ldp-list-item"
                  onClick={() => navigate("/spkcmt?status=sudah_diambil&deadline_status=masih_deadline")}
                >
                  <div className="ldp-list-left">
                    <span className="ldp-pill-icon ldp-pill-ok"><FiCheckCircle /></span>
                    <div>
                      <strong>Masih Deadline</strong>
                      <p>Produksi masih sesuai target</p>
                    </div>
                  </div>
                  <span>{formatNumber(laporanData.cmt?.sedang_dikerjakan?.masih_dalam_deadline || 0)} PCS</span>
                </button>

                <button
                  className="ldp-list-item"
                  onClick={() => navigate("/spkcmt?status=sudah_diambil&deadline_status=over_deadline")}
                >
                  <div className="ldp-list-left">
                    <span className="ldp-pill-icon ldp-pill-danger"><FiAlertTriangle /></span>
                    <div>
                      <strong>Over Deadline</strong>
                      <p>Perlu prioritas tindak lanjut</p>
                    </div>
                  </div>
                  <span>{formatNumber(laporanData.cmt?.sedang_dikerjakan?.over_deadline || 0)} PCS</span>
                </button>

                <button
                  className="ldp-list-item"
                  onClick={() => navigate("/spkcmt?status=sudah_diambil&kirim_minggu_ini=true")}
                >
                  <div className="ldp-list-left">
                    <span className="ldp-pill-icon ldp-pill-info"><FiTruck /></span>
                    <div>
                      <strong>Kirim Minggu Ini</strong>
                      <p>Order selesai dan terkirim</p>
                    </div>
                  </div>
                  <span>{formatNumber(laporanData.cmt?.sedang_dikerjakan?.kirim_minggu_ini || 0)} PCS</span>
                </button>
              </div>
              <div className="ldp-summary-row">
                <span>Total Sedang Dikerjakan</span>
                <strong>{formatNumber(laporanData.cmt?.sedang_dikerjakan?.total_jml_pcs || 0)} PCS</strong>
              </div>
            </div>

            <div className="ldp-panel-card ldp-warning-panel">
              <div className="ldp-panel-head">
                <h3>SPK Belum Ambil</h3>
              </div>
              <div className="ldp-warning-value">{formatNumber(laporanData.cmt?.spk_belum_ambil?.jml_pcs || 0)} PCS</div>
              <div className="ldp-chip-row">
                <button className="ldp-chip" onClick={() => navigate("/kode-seri-belum-dikerjakan")}>
                  {formatNumber(laporanData.cmt?.spk_belum_ambil?.jml_spk || 0)} SPK
                </button>
                <button className="ldp-chip" onClick={() => navigate("/kode-seri-belum-dikerjakan")}>
                  {formatNumber(laporanData.cmt?.spk_belum_ambil?.jml_produk || 0)} Produk
                </button>
              </div>
            </div>
          </div>

          <div className="ldp-table-grid">
            <div className="ldp-panel-card">
              <div className="ldp-panel-head">
                <h3>Performa Tukang Cutting</h3>
              </div>
              <div className="ldp-table-wrap">
                <table className="ldp-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Output (PCS)</th>
                      <th>Task (SPK)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laporanData.cutting?.hasil_cuttingan_minggu_ini?.tukang_cutting?.slice(0, 5).map((tukang, idx) => {
                      const { weeklyStart, weeklyEnd } = getWeekRangeFromDate(tanggal);
                      const searchParams = new URLSearchParams({
                        tukang_cutting: tukang.nama,
                        weekly_start: weeklyStart,
                        weekly_end: weeklyEnd,
                      });

                      return (
                        <tr key={idx} onClick={() => navigate(`/hasilcutting?${searchParams.toString()}`)}>
                          <td>{tukang.nama}</td>
                          <td>{formatNumber(tukang.jml_pcs)}</td>
                          <td>{formatNumber(tukang.jml_spk)}</td>
                        </tr>
                      );
                    })}
                    {(!laporanData.cutting?.hasil_cuttingan_minggu_ini?.tukang_cutting ||
                      laporanData.cutting.hasil_cuttingan_minggu_ini.tukang_cutting.length === 0) && (
                      <tr>
                        <td colSpan="3" className="ldp-empty-cell">Belum ada data performa.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ldp-panel-card">
              <div className="ldp-panel-head">
                <h3>Riwayat Kapasitas Kirim</h3>
              </div>
              <div className="ldp-table-wrap">
                <table className="ldp-table">
                  <thead>
                    <tr>
                      <th>Periode</th>
                      <th>Total Kirim</th>
                      <th>Perbandingan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laporanData.cmt?.kemampuan_kirim?.periode_4_minggu?.map((periode, idx) => {
                      const avg = laporanData.cmt?.kemampuan_kirim?.rata_rata_kirim || 1;
                      const percent = ((periode.jml_pcs / avg) * 100).toFixed(0);
                      const isHigh = Number(percent) >= 100;

                      return (
                        <tr key={idx}>
                          <td>{periode.minggu}</td>
                          <td>{formatNumber(periode.jml_pcs)} PCS</td>
                          <td>
                            <span className={`ldp-status-pill ${isHigh ? "ldp-status-good" : "ldp-status-warn"}`}>
                              {percent}% dari rata-rata
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {(!laporanData.cmt?.kemampuan_kirim?.periode_4_minggu ||
                      laporanData.cmt.kemampuan_kirim.periode_4_minggu.length === 0) && (
                      <tr>
                        <td colSpan="3" className="ldp-empty-cell">Belum ada data riwayat.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="ldp-footer-note">
            <FiUsers /> Data diperbarui berdasarkan tanggal laporan yang dipilih.
          </div>
        </>
      )}
    </div>
  );
};

export default LaporanDailyProduksi;

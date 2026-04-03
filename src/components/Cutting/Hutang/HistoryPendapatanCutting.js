import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiFilter,
  FiSearch,
  FiX,
} from "react-icons/fi";
import API from "../../../api";
import "./HistoryPendapatanCutting.css";

const formatRupiahDisplay = (angka) => {
  if (!angka && angka !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(angka) || 0);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateDisplay = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const HistoryPendapatanCutting = () => {
  const [pendapatansCutting, setPendapatansCutting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  const isFetching = useRef(false);

  const fetchPendapatansCutting = async ({ showLoading = false } = {}) => {
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      if (showLoading) setLoading(true);
      setError(null);

      const response = await API.get("/pendapatan/cutting");
      const data = Array.isArray(response?.data) ? response.data : response?.data?.data || [];
      setPendapatansCutting(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error("Gagal mengambil data history pendapatan cutting:", fetchError);
      if (fetchError.response?.status === 429) {
        setError("Terlalu banyak permintaan. Silakan tunggu beberapa saat lalu coba lagi.");
      } else {
        setError(fetchError.response?.data?.message || "Gagal mengambil data pendapatan cutting.");
      }
      setPendapatansCutting([]);
    } finally {
      if (showLoading) setLoading(false);
      isFetching.current = false;
    }
  };

  useEffect(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const initialStart = startOfMonth.toISOString().split("T")[0];
    const initialEnd = endOfMonth.toISOString().split("T")[0];

    setStartDate(initialStart);
    setEndDate(initialEnd);
    setAppliedStartDate(initialStart);
    setAppliedEndDate(initialEnd);
  }, []);

  useEffect(() => {
    fetchPendapatansCutting({ showLoading: true });

    return () => {
      isFetching.current = false;
    };
  }, []);

  const filteredPendapatans = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const bySearch = pendapatansCutting.filter((item) => {
      const namaTukang = item.tukang_cutting?.nama_tukang_cutting || item.nama_tukang_cutting || "";
      return namaTukang.toLowerCase().includes(keyword);
    });

    const byDate = bySearch.filter((item) => {
      if (!appliedStartDate && !appliedEndDate) return true;

      const sourceDate = item.created_at || item.updated_at;
      if (!sourceDate) return false;

      const itemDate = new Date(sourceDate);
      if (Number.isNaN(itemDate.getTime())) return false;

      const start = appliedStartDate ? new Date(`${appliedStartDate}T00:00:00`) : null;
      const end = appliedEndDate ? new Date(`${appliedEndDate}T23:59:59`) : null;

      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;

      return true;
    });

    return [...byDate].sort((a, b) => {
      const timeA = new Date(a.created_at || a.updated_at || 0).getTime();
      const timeB = new Date(b.created_at || b.updated_at || 0).getTime();

      if (timeA !== timeB) return timeB - timeA;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [pendapatansCutting, searchTerm, appliedStartDate, appliedEndDate]);

  const stats = useMemo(() => {
    const totalPendapatan = filteredPendapatans.reduce((sum, item) => sum + (Number(item.total_pendapatan) || 0), 0);
    const totalPotongan = filteredPendapatans.reduce(
      (sum, item) => sum + (Number(item.total_hutang) || 0) + (Number(item.total_cashbon) || 0),
      0
    );
    const totalTransfer = filteredPendapatans.reduce((sum, item) => sum + (Number(item.total_transfer) || 0), 0);

    return {
      totalData: filteredPendapatans.length,
      totalPendapatan,
      totalPotongan,
      totalTransfer,
    };
  }, [filteredPendapatans]);

  const handleApplyFilter = () => {
    if (!startDate || !endDate) {
      window.alert("Silakan pilih tanggal mulai dan tanggal akhir terlebih dahulu.");
      return;
    }

    if (startDate > endDate) {
      window.alert("Tanggal mulai tidak boleh lebih besar dari tanggal akhir.");
      return;
    }

    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  return (
    <div className="history-pendapatan-cutting-erp-container">
      <header className="history-pendapatan-cutting-erp-header">
        <div className="history-pendapatan-cutting-erp-header-top">
          <div className="history-pendapatan-cutting-erp-title-group">
            <div className="history-pendapatan-cutting-erp-brand-icon">
              <FiDollarSign />
            </div>
            <div className="history-pendapatan-cutting-erp-title-wrap">
              <div className="history-pendapatan-cutting-erp-module-pill"> Finance Module</div>
              <h1>History Pendapatan Cutting</h1>
              <p>Audit pendapatan, potongan, dan transfer yang sudah tercatat per periode</p>
            </div>
          </div>

          <div className="history-pendapatan-cutting-erp-actions">
            <div className="history-pendapatan-cutting-erp-search-wrap">
              <FiSearch className="history-pendapatan-cutting-erp-search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari nama tukang cutting..."
                className="history-pendapatan-cutting-erp-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="history-pendapatan-cutting-erp-search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Hapus pencarian"
                >
                  <FiX />
                </button>
              )}
            </div>

            <button type="button" className="history-pendapatan-cutting-erp-icon-btn" aria-label="Notifikasi">
              <FiBell />
              <span className="history-pendapatan-cutting-erp-dot" />
            </button>

            <div className="history-pendapatan-cutting-erp-avatar" title="Finance Team">
              FC
            </div>
          </div>
        </div>
      </header>

      <main className="history-pendapatan-cutting-erp-main">
        <section className="history-pendapatan-cutting-erp-stats">
          <article className="history-pendapatan-cutting-erp-stat-item">
            <p className="history-pendapatan-cutting-erp-stat-label">Total Data</p>
            <p className="history-pendapatan-cutting-erp-stat-value">{stats.totalData}</p>
          </article>

          <article className="history-pendapatan-cutting-erp-stat-item">
            <p className="history-pendapatan-cutting-erp-stat-label">Total Pendapatan</p>
            <p className="history-pendapatan-cutting-erp-stat-value history-pendapatan-cutting-erp-stat-value-info">
              {formatRupiahDisplay(stats.totalPendapatan)}
            </p>
          </article>

          <article className="history-pendapatan-cutting-erp-stat-item">
            <p className="history-pendapatan-cutting-erp-stat-label">Total Potongan</p>
            <p className="history-pendapatan-cutting-erp-stat-value history-pendapatan-cutting-erp-stat-value-danger">
              {formatRupiahDisplay(stats.totalPotongan)}
            </p>
          </article>

          <article className="history-pendapatan-cutting-erp-stat-item">
            <p className="history-pendapatan-cutting-erp-stat-label">Total Transfer</p>
            <p className="history-pendapatan-cutting-erp-stat-value history-pendapatan-cutting-erp-stat-value-success">
              {formatRupiahDisplay(stats.totalTransfer)}
            </p>
          </article>
        </section>

        <section className="history-pendapatan-cutting-erp-table-wrapper">
          <div className="history-pendapatan-cutting-erp-table-header">
            <div>
              <h3>Riwayat Pendapatan Tukang Cutting</h3>
              <p>Menampilkan {filteredPendapatans.length} data sesuai kata kunci dan periode aktif.</p>
            </div>

            <div className="history-pendapatan-cutting-erp-filter-row">
              <label className="history-pendapatan-cutting-erp-date-field">
                <span>
                  <FiCalendar /> Dari
                </span>
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </label>

              <label className="history-pendapatan-cutting-erp-date-field">
                <span>
                  <FiCalendar /> Sampai
                </span>
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </label>

              <button type="button" className="history-pendapatan-cutting-erp-filter-btn" onClick={handleApplyFilter}>
                <FiFilter /> Terapkan
              </button>
            </div>
          </div>

          {loading ? (
            <div className="history-pendapatan-cutting-erp-loading">
              <div className="history-pendapatan-cutting-erp-spinner" />
              <p>Memuat history pendapatan cutting...</p>
            </div>
          ) : error ? (
            <div className="history-pendapatan-cutting-erp-empty-state">
              <FiAlertCircle className="history-pendapatan-cutting-erp-empty-icon" />
              <p className="history-pendapatan-cutting-erp-empty-title error">{error}</p>
            </div>
          ) : filteredPendapatans.length > 0 ? (
            <div className="history-pendapatan-cutting-erp-table-scroll">
              <table className="history-pendapatan-cutting-erp-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>ID Pendapatan</th>
                    <th>Nama Tukang Cutting</th>
                    <th>Total Pendapatan</th>
                    <th>Total Hutang</th>
                    <th>Total Cashboan</th>
                    <th>Total Transfer</th>
                    <th>Tanggal Dibuat</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPendapatans.map((pendapatan, index) => (
                    <tr key={pendapatan.id || `${pendapatan.tukang_cutting_id || "history"}-${index}`}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="history-pendapatan-cutting-erp-badge muted">#{pendapatan.id || "-"}</span>
                      </td>
                      <td>
                        <div className="history-pendapatan-cutting-erp-name-cell">
                          <FiClock />
                          <span>{pendapatan.tukang_cutting?.nama_tukang_cutting || pendapatan.nama_tukang_cutting || "-"}</span>
                        </div>
                      </td>
                      <td>
                        <span className="history-pendapatan-cutting-erp-badge info">
                          {formatRupiahDisplay(pendapatan.total_pendapatan || 0)}
                        </span>
                      </td>
                      <td>
                        <span className="history-pendapatan-cutting-erp-badge danger">
                          {formatRupiahDisplay(pendapatan.total_hutang || 0)}
                        </span>
                      </td>
                      <td>
                        <span className="history-pendapatan-cutting-erp-badge danger">
                          {formatRupiahDisplay(pendapatan.total_cashbon || 0)}
                        </span>
                      </td>
                      <td>
                        <span className="history-pendapatan-cutting-erp-badge success">
                          {formatRupiahDisplay(pendapatan.total_transfer || 0)}
                        </span>
                      </td>
                      <td>{formatDateTime(pendapatan.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="history-pendapatan-cutting-erp-empty-state">
              <FiCheckCircle className="history-pendapatan-cutting-erp-empty-icon" />
              <p className="history-pendapatan-cutting-erp-empty-title">Belum ada data history pendapatan</p>
              <p className="history-pendapatan-cutting-erp-empty-text">
                Coba ubah periode filter atau pastikan transaksi pendapatan sudah dibuat.
              </p>
            </div>
          )}
        </section>

        <section className="history-pendapatan-cutting-erp-stats compact">
          <article className="history-pendapatan-cutting-erp-stat-item">
            <p className="history-pendapatan-cutting-erp-stat-label">Periode Aktif</p>
            <p className="history-pendapatan-cutting-erp-stat-value history-pendapatan-cutting-erp-stat-value-small">
              {formatDateDisplay(appliedStartDate)} - {formatDateDisplay(appliedEndDate)}
            </p>
          </article>
        </section>
      </main>
    </div>
  );
};

export default HistoryPendapatanCutting;

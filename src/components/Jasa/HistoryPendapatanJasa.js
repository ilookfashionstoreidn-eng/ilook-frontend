import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiFilter,
  FiSearch,
  FiTool,
  FiX,
} from "react-icons/fi";
import API from "../../api";
import "./HistoryPendapatanJasa.css";

const formatRupiahDisplay = (value) => {
  if (!value && value !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);
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

const normalizePendapatan = (item, index) => {
  const totalPendapatan = Number(item.total_pendapatan) || 0;
  const totalHutang = Number(item.total_hutang ?? item.potongan_hutang) || 0;
  const totalCashboan = Number(item.total_cashbon ?? item.total_cashboan ?? item.potongan_cashbon) || 0;
  const totalTransfer = Number(item.total_transfer) || totalPendapatan - totalHutang - totalCashboan;

  const namaTukangJasa =
    item.tukang_jasa?.nama ||
    item.tukangJasa?.nama ||
    item.nama_tukang_jasa ||
    item.nama ||
    "-";

  const sourceDate =
    item.created_at ||
    item.updated_at ||
    item.tanggal_pendapatan ||
    item.periode?.end ||
    item.periode?.start ||
    null;

  const referenceId = item.id || item.pendapatan_id || `${item.tukang_jasa_id || "jasa"}-${index}`;

  return {
    ...item,
    __reference_id: referenceId,
    __nama_tukang_jasa: namaTukangJasa,
    __source_date: sourceDate,
    total_pendapatan: totalPendapatan,
    total_hutang: totalHutang,
    total_cashbon: totalCashboan,
    total_transfer: totalTransfer,
  };
};

const HistoryPendapatanJasa = () => {
  const [pendapatansJasa, setPendapatansJasa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  const isFetching = useRef(false);

  const fetchPendapatansJasa = async ({ showLoading = false, filterStart = "", filterEnd = "" } = {}) => {
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      if (showLoading) setLoading(true);
      setError(null);

      const params = {};
      if (filterStart) params.start_date = filterStart;
      if (filterEnd) params.end_date = filterEnd;

      const response = await API.get("/pendapatan/jasa/history", { params });
      const rawData = Array.isArray(response?.data) ? response.data : response?.data?.data || [];
      const normalizedData = (Array.isArray(rawData) ? rawData : []).map((item, index) => normalizePendapatan(item, index));
      setPendapatansJasa(normalizedData);
    } catch (fetchError) {
      console.error("Gagal mengambil data history pendapatan jasa:", fetchError);
      if (fetchError.response?.status === 429) {
        setError("Terlalu banyak permintaan. Silakan tunggu beberapa saat lalu coba lagi.");
      } else {
        setError(fetchError.response?.data?.message || "Gagal mengambil data pendapatan jasa.");
      }
      setPendapatansJasa([]);
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
    if (!appliedStartDate || !appliedEndDate) return;

    fetchPendapatansJasa({
      showLoading: true,
      filterStart: appliedStartDate,
      filterEnd: appliedEndDate,
    });

    return () => {
      isFetching.current = false;
    };
  }, [appliedStartDate, appliedEndDate]);

  const filteredPendapatans = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const searchedData = pendapatansJasa.filter((item) => {
      if (!keyword) return true;
      const name = item.__nama_tukang_jasa.toLowerCase();
      const reference = String(item.id || item.pendapatan_id || "").toLowerCase();
      return name.includes(keyword) || reference.includes(keyword);
    });

    return [...searchedData].sort((a, b) => {
      const timeA = new Date(a.__source_date || 0).getTime();
      const timeB = new Date(b.__source_date || 0).getTime();

      if (timeA !== timeB) return timeB - timeA;
      return Number(b.id || b.pendapatan_id || 0) - Number(a.id || a.pendapatan_id || 0);
    });
  }, [pendapatansJasa, searchTerm]);

  const stats = useMemo(() => {
    const totalPendapatan = filteredPendapatans.reduce((sum, item) => sum + (Number(item.total_pendapatan) || 0), 0);
    const totalHutang = filteredPendapatans.reduce((sum, item) => sum + (Number(item.total_hutang) || 0), 0);
    const totalCashboan = filteredPendapatans.reduce((sum, item) => sum + (Number(item.total_cashbon) || 0), 0);
    const totalTransfer = filteredPendapatans.reduce((sum, item) => sum + (Number(item.total_transfer) || 0), 0);

    return {
      totalData: filteredPendapatans.length,
      totalPendapatan,
      totalPotongan: totalHutang + totalCashboan,
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
    <div className="history-pendapatan-jasa-erp-container">
      <header className="history-pendapatan-jasa-erp-header">
        <div className="history-pendapatan-jasa-erp-header-top">
          <div className="history-pendapatan-jasa-erp-title-group">
            <div className="history-pendapatan-jasa-erp-brand-icon">
              <FiDollarSign />
            </div>
            <div className="history-pendapatan-jasa-erp-title-wrap">
              <div className="history-pendapatan-jasa-erp-module-pill">Finance Module</div>
              <h1>History Pendapatan Jasa</h1>
              <p>Riwayat transfer per transaksi pembayaran pendapatan tukang jasa</p>
            </div>
          </div>

          <div className="history-pendapatan-jasa-erp-actions">
            <div className="history-pendapatan-jasa-erp-search-wrap">
              <FiSearch className="history-pendapatan-jasa-erp-search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari nama tukang jasa / ID pendapatan..."
                className="history-pendapatan-jasa-erp-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="history-pendapatan-jasa-erp-search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Hapus pencarian"
                >
                  <FiX />
                </button>
              )}
            </div>

            <button type="button" className="history-pendapatan-jasa-erp-icon-btn" aria-label="Notifikasi">
              <FiBell />
              {stats.totalPotongan > 0 && <span className="history-pendapatan-jasa-erp-dot" />}
            </button>

            <div className="history-pendapatan-jasa-erp-avatar" title="Finance Team">
              FJ
            </div>
          </div>
        </div>
      </header>

      <main className="history-pendapatan-jasa-erp-main">
        <section className="history-pendapatan-jasa-erp-stats">
          <article className="history-pendapatan-jasa-erp-stat-item">
            <p className="history-pendapatan-jasa-erp-stat-label">Total Data</p>
            <p className="history-pendapatan-jasa-erp-stat-value">{stats.totalData}</p>
          </article>

          <article className="history-pendapatan-jasa-erp-stat-item">
            <p className="history-pendapatan-jasa-erp-stat-label">Total Pendapatan</p>
            <p className="history-pendapatan-jasa-erp-stat-value history-pendapatan-jasa-erp-stat-value-info">
              {formatRupiahDisplay(stats.totalPendapatan)}
            </p>
          </article>

          <article className="history-pendapatan-jasa-erp-stat-item">
            <p className="history-pendapatan-jasa-erp-stat-label">Total Potongan</p>
            <p className="history-pendapatan-jasa-erp-stat-value history-pendapatan-jasa-erp-stat-value-danger">
              {formatRupiahDisplay(stats.totalPotongan)}
            </p>
          </article>

          <article className="history-pendapatan-jasa-erp-stat-item">
            <p className="history-pendapatan-jasa-erp-stat-label">Total Transfer</p>
            <p className="history-pendapatan-jasa-erp-stat-value history-pendapatan-jasa-erp-stat-value-success">
              {formatRupiahDisplay(stats.totalTransfer)}
            </p>
          </article>
        </section>

        <section className="history-pendapatan-jasa-erp-table-wrapper">
          <div className="history-pendapatan-jasa-erp-table-header">
            <div>
              <h3>Riwayat Pembayaran Tukang Jasa</h3>
              <p>Menampilkan {filteredPendapatans.length} transaksi pembayaran sesuai periode aktif.</p>
            </div>

            <div className="history-pendapatan-jasa-erp-filter-row">
              <label className="history-pendapatan-jasa-erp-date-field">
                <span>
                  <FiCalendar /> Dari
                </span>
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </label>

              <label className="history-pendapatan-jasa-erp-date-field">
                <span>
                  <FiCalendar /> Sampai
                </span>
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </label>

              <button type="button" className="history-pendapatan-jasa-erp-filter-btn" onClick={handleApplyFilter}>
                <FiFilter /> Terapkan
              </button>
            </div>
          </div>

          {loading ? (
            <div className="history-pendapatan-jasa-erp-loading">
              <div className="history-pendapatan-jasa-erp-spinner" />
              <p>Memuat history pendapatan jasa...</p>
            </div>
          ) : error ? (
            <div className="history-pendapatan-jasa-erp-empty-state">
              <FiAlertCircle className="history-pendapatan-jasa-erp-empty-icon" />
              <p className="history-pendapatan-jasa-erp-empty-title error">{error}</p>
            </div>
          ) : filteredPendapatans.length > 0 ? (
            <div className="history-pendapatan-jasa-erp-table-scroll">
              <table className="history-pendapatan-jasa-erp-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>ID Pendapatan</th>
                    <th>Nama Tukang Jasa</th>
                    <th>Total Pendapatan</th>
                    <th>Total Hutang</th>
                    <th>Total Cashboan</th>
                    <th>Total Transfer</th>
                    <th>Tanggal Pembayaran</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPendapatans.map((pendapatan, index) => (
                    <tr key={pendapatan.__reference_id}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="history-pendapatan-jasa-erp-badge muted">
                          #{pendapatan.id || pendapatan.pendapatan_id || "-"}
                        </span>
                      </td>
                      <td>
                        <div className="history-pendapatan-jasa-erp-name-cell">
                          <FiTool />
                          <span>{pendapatan.__nama_tukang_jasa}</span>
                        </div>
                      </td>
                      <td>
                        <span className="history-pendapatan-jasa-erp-badge info">
                          {formatRupiahDisplay(pendapatan.total_pendapatan)}
                        </span>
                      </td>
                      <td>
                        <span className="history-pendapatan-jasa-erp-badge danger">
                          {formatRupiahDisplay(pendapatan.total_hutang)}
                        </span>
                      </td>
                      <td>
                        <span className="history-pendapatan-jasa-erp-badge danger">
                          {formatRupiahDisplay(pendapatan.total_cashbon)}
                        </span>
                      </td>
                      <td>
                        <span className="history-pendapatan-jasa-erp-badge success">
                          {formatRupiahDisplay(pendapatan.total_transfer)}
                        </span>
                      </td>
                      <td>{formatDateTime(pendapatan.__source_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="history-pendapatan-jasa-erp-empty-state">
              <FiCheckCircle className="history-pendapatan-jasa-erp-empty-icon" />
              <p className="history-pendapatan-jasa-erp-empty-title">Belum ada transaksi pembayaran pendapatan jasa</p>
              <p className="history-pendapatan-jasa-erp-empty-text">
                Coba ubah periode filter atau pastikan transaksi pendapatan jasa sudah diproses.
              </p>
            </div>
          )}
        </section>

        <section className="history-pendapatan-jasa-erp-stats compact">
          <article className="history-pendapatan-jasa-erp-stat-item">
            <p className="history-pendapatan-jasa-erp-stat-label">Periode Aktif</p>
            <p className="history-pendapatan-jasa-erp-stat-value history-pendapatan-jasa-erp-stat-value-small">
              {formatDateDisplay(appliedStartDate)} - {formatDateDisplay(appliedEndDate)}
            </p>
          </article>

          <article className="history-pendapatan-jasa-erp-stat-item">
            <p className="history-pendapatan-jasa-erp-stat-label">Status Monitoring</p>
            <p className="history-pendapatan-jasa-erp-stat-value history-pendapatan-jasa-erp-stat-value-small">
              {stats.totalPotongan > 0 ? "Ada potongan hutang/cashboan pada periode ini" : "Tidak ada potongan pada periode ini"}
            </p>
          </article>
        </section>
      </main>
    </div>
  );
};

export default HistoryPendapatanJasa;

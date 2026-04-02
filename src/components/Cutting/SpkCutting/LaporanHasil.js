import React, { useEffect, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiBell,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";
import API from "../../../api";
import "./LaporanHasil.css";

const formatTanggal = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatAngka = (value) =>
  new Intl.NumberFormat("id-ID").format(Number(value) || 0);

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  return {
    startDate: toInputDate(start),
    endDate: toInputDate(end),
  };
};

const defaultRange = getDefaultRange();

const createTotalByTukang = (rows, tukangList) => {
  const summary = { total: 0 };

  tukangList.forEach((nama) => {
    summary[nama] = 0;
  });

  rows.forEach((row) => {
    tukangList.forEach((nama) => {
      summary[nama] += Number(row[nama]) || 0;
    });
    summary.total += Number(row.total) || 0;
  });

  return summary;
};

const LaporanHasil = () => {
  const [laporan, setLaporan] = useState([]);
  const [tukang, setTukang] = useState([]);
  const [grandTotal, setGrandTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchLaporanPeriode = async () => {
      if (!startDate || !endDate) return;

      try {
        setLoading(true);
        setError(null);

        const response = await API.get("/hasil-cutting/laporan-periode", {
          params: {
            start_date: startDate,
            end_date: endDate,
          },
        });

        setLaporan(response.data.data || []);
        setTukang(response.data.tukang || []);
        setGrandTotal(response.data.grand_total || null);
      } catch (err) {
        console.error(err);
        setError("Gagal mengambil laporan periode.");
      } finally {
        setLoading(false);
      }
    };

    fetchLaporanPeriode();
  }, [startDate, endDate]);

  const filteredLaporan = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return laporan;

    return laporan.filter((row) => {
      const tanggalRaw = String(row.tanggal || "").toLowerCase();
      const tanggalView = formatTanggal(row.tanggal).toLowerCase();
      const totalValue = String(row.total || "").toLowerCase();

      const isMatchOnWorker = tukang.some((nama) => {
        const namaLower = String(nama).toLowerCase();
        const qty = String(row[nama] ?? "").toLowerCase();
        return namaLower.includes(keyword) || qty.includes(keyword);
      });

      return (
        tanggalRaw.includes(keyword) ||
        tanggalView.includes(keyword) ||
        totalValue.includes(keyword) ||
        isMatchOnWorker
      );
    });
  }, [laporan, searchTerm, tukang]);

  const jumlahHari = useMemo(() => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return 0;

    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const totalAll = useMemo(() => {
    if (grandTotal?.total !== undefined) return Number(grandTotal.total) || 0;
    return laporan.reduce((acc, row) => acc + (Number(row.total) || 0), 0);
  }, [grandTotal, laporan]);

  const totalDisplayed = useMemo(
    () => filteredLaporan.reduce((acc, row) => acc + (Number(row.total) || 0), 0),
    [filteredLaporan]
  );

  const footerSummary = useMemo(() => {
    if (searchTerm.trim()) {
      return createTotalByTukang(filteredLaporan, tukang);
    }

    if (grandTotal) {
      return grandTotal;
    }

    return createTotalByTukang(laporan, tukang);
  }, [searchTerm, filteredLaporan, tukang, grandTotal, laporan]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count += 1;
    if (
      startDate !== defaultRange.startDate ||
      endDate !== defaultRange.endDate
    ) {
      count += 1;
    }
    return count;
  }, [searchTerm, startDate, endDate]);

  const handleResetFilter = () => {
    setSearchTerm("");
    setStartDate(defaultRange.startDate);
    setEndDate(defaultRange.endDate);
  };

  return (
    <div className="laporan-erp-container">
      <div className="laporan-erp-shell">
        <header className="laporan-erp-header">
          <div className="laporan-erp-header-top">
            <div className="laporan-erp-title-group">
              <div className="laporan-erp-brand-icon">
                <FiBarChart2 />
              </div>
              <div className="laporan-erp-title-wrap">
                <div className="laporan-erp-module-pill">Cutting Module</div>
                <h1>Laporan Hasil Cutting</h1>
                <p>Monitoring hasil cutting per tukang dan rentang tanggal</p>
              </div>
            </div>

            <div className="laporan-erp-actions">
              <div className="laporan-erp-search-wrap">
                <FiSearch className="laporan-erp-search-icon" />
                <input
                  type="text"
                  className="laporan-erp-search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari tanggal, nama tukang, atau jumlah..."
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="laporan-erp-search-clear"
                    onClick={() => setSearchTerm("")}
                    aria-label="Hapus pencarian"
                  >
                    <FiX />
                  </button>
                )}
              </div>

              <button type="button" className="laporan-erp-icon-btn" aria-label="Notifikasi">
                <FiBell />
                <span className="laporan-erp-dot" />
              </button>

              <div className="laporan-erp-avatar" title="Cutting Team">
                CT
              </div>
            </div>
          </div>
        </header>

        <main className="laporan-erp-main">
          <section className="laporan-erp-stats">
            <article className="laporan-erp-stat-item">
              <p className="laporan-erp-stat-label">Total Hasil Periode</p>
              <p className="laporan-erp-stat-value">{formatAngka(totalAll)}</p>
            </article>

            <article className="laporan-erp-stat-item">
              <p className="laporan-erp-stat-label">Total Hasil Ditampilkan</p>
              <p className="laporan-erp-stat-value laporan-erp-stat-value-info">
                {formatAngka(totalDisplayed)}
              </p>
            </article>

            <article className="laporan-erp-stat-item">
              <p className="laporan-erp-stat-label">Jumlah Tukang</p>
              <p className="laporan-erp-stat-value laporan-erp-stat-value-success">
                {formatAngka(tukang.length)}
              </p>
            </article>

            <article className="laporan-erp-stat-item">
              <p className="laporan-erp-stat-label">Durasi Periode</p>
              <p className="laporan-erp-stat-value laporan-erp-stat-value-muted">
                {formatAngka(jumlahHari)} Hari
              </p>
            </article>
          </section>

          <section className="laporan-erp-table-wrapper">
            <div className="laporan-erp-table-header">
              <div>
                <h3>Rekap Produksi Harian</h3>
                <p>
                  Menampilkan {filteredLaporan.length} dari {laporan.length} data
                  pada periode {formatTanggal(startDate)} - {formatTanggal(endDate)}
                </p>
              </div>

              <div className="laporan-erp-table-header-right">
                {activeFilterCount > 0 && (
                  <span className="laporan-erp-filter-pill">
                    {activeFilterCount} filter aktif
                  </span>
                )}
                <button
                  type="button"
                  className="laporan-erp-reset-btn"
                  onClick={handleResetFilter}
                >
                  <FiRefreshCw /> Reset
                </button>
              </div>
            </div>

            <div className="laporan-erp-filter-section">
              <div className="laporan-erp-date-field">
                <label htmlFor="start-date">Tanggal Mulai</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || undefined}
                />
              </div>

              <div className="laporan-erp-date-field">
                <label htmlFor="end-date">Tanggal Akhir</label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                />
              </div>
            </div>

            {loading && (
              <div className="laporan-erp-loading">
                <div className="laporan-erp-spinner" />
                <p>Memuat data laporan...</p>
              </div>
            )}

            {error && !loading && (
              <div className="laporan-erp-empty-state">
                <p className="laporan-erp-empty-title error">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="laporan-erp-table-scroll">
                <table className="laporan-erp-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      {tukang.map((nama) => (
                        <th key={nama}>{nama}</th>
                      ))}
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredLaporan.length > 0 ? (
                      filteredLaporan.map((row, index) => (
                        <tr key={`${row.tanggal}-${index}`}>
                          <td className="laporan-erp-date-cell">
                            {formatTanggal(row.tanggal)}
                          </td>
                          {tukang.map((nama) => (
                            <td key={`${row.tanggal}-${nama}-${index}`}>
                              {formatAngka(row[nama])}
                            </td>
                          ))}
                          <td className="laporan-erp-total-cell">
                            {formatAngka(row.total)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={tukang.length + 2} className="laporan-erp-empty-row">
                          {searchTerm
                            ? `Tidak ada data yang cocok untuk pencarian "${searchTerm}".`
                            : "Tidak ada data untuk periode yang dipilih."}
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {filteredLaporan.length > 0 && (
                    <tfoot>
                      <tr>
                        <td>{searchTerm ? "Total Tampilan" : "Total Periode"}</td>
                        {tukang.map((nama) => (
                          <td key={`summary-${nama}`}>
                            {formatAngka(footerSummary[nama])}
                          </td>
                        ))}
                        <td>{formatAngka(footerSummary.total)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default LaporanHasil;

import React, { useEffect, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiBell,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiLayers,
  FiInfo,
} from "react-icons/fi";
import API from "../../../api";
import "./LaporanDataAcuan.css";

const formatAngka = (value) =>
  new Intl.NumberFormat("id-ID").format(Number(value) || 0);

const LaporanDataAcuan = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyValid, setOnlyValid] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await API.get("/hasil-cutting/laporan-data-acuan");
      if (response.data?.success) {
        setData(response.data.data || []);
      } else {
        setError("Gagal memuat data acuan.");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat memuat data laporan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    let result = data;

    // Filter only valid (>= 3 SPKs) if checked
    if (onlyValid) {
      result = result.filter((item) => item.is_valid);
    }

    // Filter by search keyword
    const keyword = searchTerm.trim().toLowerCase();
    if (keyword) {
      result = result.filter((item) => {
        return (
          String(item.product || "").toLowerCase().includes(keyword) ||
          String(item.bagian || "").toLowerCase().includes(keyword) ||
          String(item.bahan || "").toLowerCase().includes(keyword) ||
          String(item.warna || "").toLowerCase().includes(keyword) ||
          String(item.group_bahan || "").toLowerCase().includes(keyword)
        );
      });
    }

    return result;
  }, [data, searchTerm, onlyValid]);

  // Statistics calculations
  const stats = useMemo(() => {
    const totalCount = data.length;
    const validCount = data.filter((item) => item.is_valid).length;
    const invalidCount = totalCount - validCount;

    return {
      total: totalCount,
      valid: validCount,
      invalid: invalidCount,
    };
  }, [data]);

  const handleResetFilter = () => {
    setSearchTerm("");
    setOnlyValid(false);
  };

  return (
    <div className="laporan-erp-container">
      <div className="laporan-erp-shell">
        <header className="laporan-erp-header">
          <div className="laporan-erp-header-top">
            <div className="laporan-erp-title-group">
              <div className="laporan-erp-brand-icon">
                <FiLayers />
              </div>
              <div className="laporan-erp-title-wrap">
                <div className="laporan-erp-module-pill">Cutting Module</div>
                <h1>Laporan Data Acuan dalam Cutting</h1>
                <p>Kalkulasi otomatis rata-rata berat / panjang per produk berdasarkan minimal 3 data SPK realisasi.</p>
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
                  placeholder="Cari produk, bagian, bahan, group..."
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

              <button
                type="button"
                className="laporan-erp-icon-btn"
                onClick={fetchData}
                disabled={loading}
                title="Refresh data"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} />
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
              <p className="laporan-erp-stat-label">Total Kombinasi</p>
              <p className="laporan-erp-stat-value">{formatAngka(stats.total)}</p>
            </article>

            <article className="laporan-erp-stat-item">
              <p className="laporan-erp-stat-label">Acuan Valid (>= 3 SPK)</p>
              <p className="laporan-erp-stat-value laporan-erp-stat-value-success">
                {formatAngka(stats.valid)}
              </p>
            </article>

            <article className="laporan-erp-stat-item">
              <p className="laporan-erp-stat-label">Belum Valid (&lt; 3 SPK)</p>
              <p className="laporan-erp-stat-value laporan-erp-stat-value-info">
                {formatAngka(stats.invalid)}
              </p>
            </article>
          </section>

          <section className="laporan-erp-table-wrapper">
            <div className="laporan-erp-table-header">
              <div>
                <h3>Realisasi Berat / Panjang Acuan</h3>
                <p>
                  Menampilkan {formatAngka(filteredData.length)} dari {formatAngka(data.length)} data kombinasi produk
                </p>
              </div>

              <div className="laporan-erp-table-header-right">
                <label className="laporan-erp-checkbox-label">
                  <input
                    type="checkbox"
                    checked={onlyValid}
                    onChange={(e) => setOnlyValid(e.target.checked)}
                  />
                  Hanya Acuan Valid (>= 3 SPK)
                </label>
                
                {(searchTerm || onlyValid) && (
                  <button
                    type="button"
                    className="laporan-erp-reset-btn"
                    onClick={handleResetFilter}
                  >
                    <FiRefreshCw /> Reset
                  </button>
                )}
              </div>
            </div>

            {loading && (
              <div className="laporan-erp-loading">
                <div className="laporan-erp-spinner" />
                <p>Memuat data acuan...</p>
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
                      <th style={{ width: "60px" }}>No</th>
                      <th>Product Group</th>
                      <th>Bagian</th>
                      <th>Group Bahan</th>
                      <th>Nama Bahan</th>
                      <th>Warna</th>
                      <th style={{ textAlign: "center" }}>Jumlah SPK</th>
                      <th style={{ textAlign: "right" }}>Rata-rata / Produk</th>
                      <th style={{ textAlign: "right" }}>Total Produk</th>
                      <th style={{ textAlign: "right" }}>Total Berat / Panjang</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map((row, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td className="laporan-erp-date-cell" style={{ fontWeight: "bold" }}>
                            {row.product}
                          </td>
                          <td>{row.bagian}</td>
                          <td>{row.group_bahan || "-"}</td>
                          <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                            {row.bahan}
                          </td>
                          <td>
                            {row.warna ? (
                              <span className="hasil-cutting-chip hasil-cutting-chip-primary">
                                {row.warna}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`hasil-cutting-chip ${row.spk_count >= 3 ? "hasil-cutting-chip-success" : "hasil-cutting-chip-info"}`}>
                              {row.spk_count} SPK
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "bold", color: "var(--primary-color, #4f46e5)" }}>
                            {row.avg_weight.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {row.satuan || "kg"}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {formatAngka(row.total_produk)} pcs
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {row.total_berat.toLocaleString("id-ID", { minimumFractionDigits: 2 })} {row.satuan || "kg"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {row.is_valid ? (
                              <span className="hasil-cutting-status-badge hasil-cutting-status-badge-same">
                                Acuan Valid
                              </span>
                            ) : (
                              <span className="hasil-cutting-status-badge" style={{ background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}>
                                Belum Valid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="laporan-erp-empty-row">
                          {searchTerm
                            ? `Tidak ada data acuan yang cocok untuk pencarian "${searchTerm}".`
                            : "Tidak ada data acuan yang terdaftar."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="laporan-data-acuan-note">
              <FiInfo className="info-icon" />
              <span>
                <strong>Catatan:</strong> Data acuan dihitung berdasarkan total berat / panjang bahan dibagi dengan total pcs produk yang dihasilkan dari SPK cutting yang sudah selesai. Data acuan dianggap <strong>Valid</strong> jika telah terakumulasi dari minimal 3 SPK cutting yang berbeda untuk produk, bagian, bahan, dan warna yang sama.
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default LaporanDataAcuan;

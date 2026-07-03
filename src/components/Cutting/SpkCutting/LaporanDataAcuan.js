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
import "../../Jahit/KodeSeriBelumDikerjakanOptimized.css";
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
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Laporan Data Acuan dalam Cutting</h1>
          <span className="ks-header-sub">
            Kalkulasi otomatis rata-rata berat / panjang per produk berdasarkan minimal 3 data SPK realisasi.
          </span>
        </div>
        <div className="ks-header-actions">
           <button type="button" className="ks-btn" onClick={fetchData} disabled={loading} title="Refresh data">
             <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
           </button>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Total Kombinasi</span>
          <span className="ks-stat-value">{formatAngka(stats.total)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Acuan Valid (>= 3 SPK)</span>
          <span className="ks-stat-value" style={{ color: "var(--brand-600)" }}>{formatAngka(stats.valid)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Belum Valid (&lt; 3 SPK)</span>
          <span className="ks-stat-value">{formatAngka(stats.invalid)}</span>
        </div>
      </div>

      <section className="ks-board" style={{ margin: "20px" }}>
        <div className="ks-toolbar">
          <div style={{ display: "flex", gap: "16px", alignItems: "center", width: "100%", flexWrap: "wrap", justifyContent: "space-between" }}>
             <div className="ks-search" style={{ flex: 1, maxWidth: "300px" }}>
                <FiSearch className="ks-search-icon" />
                <input
                   type="text"
                   placeholder="Cari produk, bagian, bahan, group..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                   <FiX style={{ cursor: "pointer", marginLeft: "-24px" }} onClick={() => setSearchTerm("")} />
                )}
             </div>
             
             <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--ks-text)", cursor: "pointer", fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={onlyValid}
                    onChange={(e) => setOnlyValid(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  Hanya Acuan Valid (>= 3 SPK)
                </label>
                {(searchTerm || onlyValid) && (
                  <button type="button" className="ks-btn" onClick={handleResetFilter}>
                    <FiRefreshCw /> Reset Filter
                  </button>
                )}
             </div>
          </div>
        </div>

        {error && !loading && (
          <div style={{ padding: "16px 20px", color: "#ef4444", display: "flex", alignItems: "center", gap: "8px" }}>
             <FiInfo /> {error}
          </div>
        )}

        <div className="ks-grid-scroll" style={{ padding: "0 20px" }}>
          {loading ? (
             <div style={{ padding: "32px", textAlign: "center" }}>Memuat data acuan...</div>
          ) : !error && (
             <table className="ks-grid">
               <thead>
                 <tr>
                    <th style={{ width: "60px", textAlign: "center" }}>No</th>
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
                        <td style={{ textAlign: "center", color: "var(--ks-text-soft)", fontWeight: 500 }}>{index + 1}</td>
                        <td style={{ fontWeight: 600, color: "var(--ks-text)", whiteSpace: "nowrap" }}>
                          {row.product}
                        </td>
                        <td>{row.bagian}</td>
                        <td style={{ color: "var(--ks-text-soft)" }}>{row.group_bahan || "-"}</td>
                        <td style={{ fontSize: "13px", color: "var(--ks-text)" }}>
                          {row.bahan}
                        </td>
                        <td>
                          {row.warna ? (
                            <span style={{ background: "var(--brand-50)", color: "var(--brand-600)", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", border: "1px solid var(--brand-200)", fontWeight: 500 }}>
                              {row.warna}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ background: row.spk_count >= 3 ? "#ecfdf5" : "#f1f5f9", color: row.spk_count >= 3 ? "#059669" : "#475569", border: `1px solid ${row.spk_count >= 3 ? '#a7f3d0' : '#e2e8f0'}`, padding: "2px 6px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>
                            {row.spk_count} SPK
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--brand-600)", whiteSpace: "nowrap" }}>
                          {row.avg_weight.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {row.satuan || "kg"}
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {formatAngka(row.total_produk)} pcs
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {row.total_berat.toLocaleString("id-ID", { minimumFractionDigits: 2 })} {row.satuan || "kg"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {row.is_valid ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#f0fdf4", color: "#16a34a", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, border: "1px solid #bbf7d0" }}>
                              Valid
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#f8fafc", color: "#64748b", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, border: "1px solid #e2e8f0" }}>
                              Belum
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} style={{ textAlign: "center", padding: "32px", color: "var(--ks-text-soft)" }}>
                        {searchTerm
                          ? `Tidak ada data acuan yang cocok untuk pencarian "${searchTerm}".`
                          : "Tidak ada data acuan yang terdaftar."}
                      </td>
                    </tr>
                  )}
               </tbody>
             </table>
          )}
        </div>
        
        <div style={{ padding: "16px 20px", background: "#f8fafc", borderTop: "1px solid var(--ks-line)", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px", display: "flex", gap: "12px", alignItems: "flex-start", color: "#475569", fontSize: "13px" }}>
          <FiInfo style={{ flexShrink: 0, marginTop: "2px", color: "#3b82f6" }} size={16} />
          <span>
            <strong>Catatan:</strong> Data acuan dihitung berdasarkan total berat / panjang bahan dibagi dengan total pcs produk yang dihasilkan dari SPK cutting yang sudah selesai. Data acuan dianggap <strong>Valid</strong> jika telah terakumulasi dari minimal 3 SPK cutting yang berbeda untuk produk, bagian, bahan, dan warna yang sama.
          </span>
        </div>
      </section>
    </div>
  );
};

export default LaporanDataAcuan;

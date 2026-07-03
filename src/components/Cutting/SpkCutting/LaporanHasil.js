import React, { useEffect, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiBell,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";
import API from "../../../api";
import "../../Jahit/KodeSeriBelumDikerjakanOptimized.css";
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
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Laporan Hasil Cutting</h1>
          <span className="ks-header-sub">
            Monitoring hasil cutting per tukang dan rentang tanggal
          </span>
        </div>
        <div className="ks-header-actions">
           <button type="button" className="ks-btn" onClick={handleResetFilter}>
             <FiRefreshCw /> Reset
           </button>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Total Hasil Periode</span>
          <span className="ks-stat-value">{formatAngka(totalAll)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Total Hasil Ditampilkan</span>
          <span className="ks-stat-value">{formatAngka(totalDisplayed)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Jumlah Tukang</span>
          <span className="ks-stat-value">{formatAngka(tukang.length)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Durasi Periode</span>
          <span className="ks-stat-value">{formatAngka(jumlahHari)} Hari</span>
        </div>
      </div>

      <section className="ks-board" style={{ margin: "20px" }}>
        <div className="ks-toolbar">
          <div style={{ display: "flex", gap: "16px", alignItems: "center", width: "100%", flexWrap: "wrap", justifyContent: "space-between" }}>
             <div className="ks-search" style={{ flex: 1, maxWidth: "300px" }}>
                <FiSearch className="ks-search-icon" />
                <input
                   type="text"
                   placeholder="Cari data..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                   <FiX style={{ cursor: "pointer", marginLeft: "-24px" }} onClick={() => setSearchTerm("")} />
                )}
             </div>
             
             <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                   <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ks-text-soft)" }}>Tanggal Mulai</span>
                   <input type="date" className="ks-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate || undefined} style={{ padding: "6px 12px", border: "1px solid var(--ks-line)", borderRadius: "6px", outline: "none", color: "var(--ks-text)" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                   <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ks-text-soft)" }}>Tanggal Akhir</span>
                   <input type="date" className="ks-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} style={{ padding: "6px 12px", border: "1px solid var(--ks-line)", borderRadius: "6px", outline: "none", color: "var(--ks-text)" }} />
                </div>
             </div>
          </div>
        </div>

        {error && !loading && (
          <div style={{ padding: "16px 20px", color: "#ef4444", display: "flex", alignItems: "center", gap: "8px" }}>
             <FiBarChart2 /> {error}
          </div>
        )}

        <div className="ks-grid-scroll" style={{ padding: "0 20px 20px 20px" }}>
          {loading ? (
             <div style={{ padding: "32px", textAlign: "center" }}>Memuat data laporan...</div>
          ) : !error && (
             <table className="ks-grid">
               <thead>
                 <tr>
                    <th style={{ whiteSpace: "nowrap" }}>Tanggal</th>
                    {tukang.map((nama) => (
                       <th key={nama} style={{ whiteSpace: "nowrap" }}>{nama}</th>
                    ))}
                    <th style={{ whiteSpace: "nowrap", textAlign: "right" }}>Total</th>
                 </tr>
               </thead>
               <tbody>
                  {filteredLaporan.length > 0 ? (
                    filteredLaporan.map((row, index) => (
                      <tr key={`${row.tanggal}-${index}`}>
                        <td style={{ fontWeight: 500, color: "var(--ks-text-soft)", whiteSpace: "nowrap" }}>
                          {formatTanggal(row.tanggal)}
                        </td>
                        {tukang.map((nama) => (
                          <td key={`${row.tanggal}-${nama}-${index}`} style={{ whiteSpace: "nowrap" }}>
                            {formatAngka(row[nama])}
                          </td>
                        ))}
                        <td style={{ fontWeight: 700, color: "var(--ks-text)", textAlign: "right", whiteSpace: "nowrap" }}>
                          {formatAngka(row.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={tukang.length + 2} style={{ textAlign: "center", padding: "32px", color: "var(--ks-text-soft)" }}>
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
                     <td style={{ fontWeight: 700, color: "var(--ks-text)", background: "var(--ks-page)", whiteSpace: "nowrap" }}>{searchTerm ? "Total Tampilan" : "Total Periode"}</td>
                     {tukang.map((nama) => (
                       <td key={`summary-${nama}`} style={{ fontWeight: 700, color: "var(--ks-text)", background: "var(--ks-page)", whiteSpace: "nowrap" }}>
                         {formatAngka(footerSummary[nama])}
                       </td>
                     ))}
                     <td style={{ fontWeight: 700, color: "var(--brand-600)", background: "var(--ks-page)", textAlign: "right", whiteSpace: "nowrap" }}>
                        {formatAngka(footerSummary.total)}
                     </td>
                   </tr>
                 </tfoot>
               )}
             </table>
          )}
        </div>
      </section>
    </div>
  );
};

export default LaporanHasil;

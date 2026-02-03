import React, { useEffect, useState } from "react"
import "../../Jahit/Penjahit.css";
import "../../Jahit/SpkCmt.css";
import API from "../../../api"; 
import { FaCalendarAlt } from "react-icons/fa";


const LaporanHasil = () => {
const [laporan, setLaporan] = useState([]);
const [tukang, setTukang] = useState([]);
const [grandTotal, setGrandTotal] = useState(null);

const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// contoh controlled date
const [startDate, setStartDate] = useState("2026-01-11");
const [endDate, setEndDate] = useState("2026-01-13");


useEffect(() => {
  const fetchLaporanPeriode = async () => {
    if (!startDate || !endDate) return;

    try { 
      setLoading(true);
      setError(null);

      const response = await API.get(
        "/hasil-cutting/laporan-periode",
        {
          params: {
            start_date: startDate,
            end_date: endDate,
          },
        }
      );

      setLaporan(response.data.data);
      setTukang(response.data.tukang);
      setGrandTotal(response.data.grand_total);

    } catch (err) {
      console.error(err);
      setError("Gagal mengambil laporan periode");
    } finally {
      setLoading(false);
    }
  };

  fetchLaporanPeriode();
}, [startDate, endDate]);


return (
    <div className="spkcmt-container">
      <div className="spkcmt-header">
        <h1>📄 Laporan Hasil Cutting Per Periode</h1>
      </div>

      {/* FILTER TANGGAL */}
      <div className="spkcmt-filters" style={{ justifyContent: 'flex-start', gap: '20px' }}>
        <div className="spkcmt-search" style={{ width: 'auto', padding: '0 15px' }}>
          <FaCalendarAlt className="spkcmt-search-icon" />
          <span style={{ marginRight: '10px', color: '#666' }}>Mulai:</span>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent' }}
          />
        </div>
        <div className="spkcmt-search" style={{ width: 'auto', padding: '0 15px' }}>
          <FaCalendarAlt className="spkcmt-search-icon" />
          <span style={{ marginRight: '10px', color: '#666' }}>Sampai:</span>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent' }}
          />
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          Memuat data laporan...
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="spkcmt-table-container">
          <table className="spkcmt-table">
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
              {laporan.length > 0 ? (
                laporan.map((row, index) => (
                  <tr key={index}>
                    <td>{row.tanggal}</td>
                    {tukang.map((nama) => (
                      <td key={nama}>{row[nama] || 0}</td>
                    ))}
                    <td><strong>{row.total || 0}</strong></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={tukang.length + 2} style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    Tidak ada data untuk periode yang dipilih
                  </td>
                </tr>
              )}
            </tbody>

            {/* GRAND TOTAL */}
            {grandTotal && (
              <tfoot>
                <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                  <td style={{ textAlign: 'right', paddingRight: '20px' }}>Total Periode</td>
                  {tukang.map((nama) => (
                    <td key={nama}>{grandTotal[nama] || 0}</td>
                  ))}
                  <td>{grandTotal.total || 0}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
};


export default LaporanHasil
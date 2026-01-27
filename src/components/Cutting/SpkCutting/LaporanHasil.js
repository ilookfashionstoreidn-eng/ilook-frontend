import React, { useEffect, useState } from "react"
import "./LaporanHasil.css";
import API from "../../../api"; 


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
  <div className="laporan-hasil-container">
    <div className="laporan-hasil-header">
      <h1>Laporan Hasil Cutting Per Periode</h1>
    </div>

    {/* FILTER TANGGAL */}
    <div className="laporan-hasil-filters">
      <div>
        <label htmlFor="start-date">Tanggal Mulai:</label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="end-date">Tanggal Akhir:</label>
        <input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
    </div>

    {loading && (
      <div className="laporan-hasil-loading">
        Memuat data laporan...
      </div>
    )}

    {error && (
      <div className="laporan-hasil-error">
        {error}
      </div>
    )}

    {!loading && !error && (
      <div className="laporan-hasil-table-wrapper">
        <table className="laporan-hasil-table">
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
                  <td>{row.total || 0}</td>
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
              <tr>
                <th>Total Periode</th>
                {tukang.map((nama) => (
                  <th key={nama}>{grandTotal[nama] || 0}</th>
                ))}
                <th>{grandTotal.total || 0}</th>
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
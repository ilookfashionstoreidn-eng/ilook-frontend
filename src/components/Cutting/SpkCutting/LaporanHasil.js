import React, { useEffect, useState } from "react"
import "../../Jahit/Penjahit.css";
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
  <div>
    <div className="penjahit-container">
      <h1>Laporan Hasil Cutting Per Periode</h1>
    </div>

    {/* FILTER TANGGAL */}
    <div className="filter-header1">
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
    </div>

    {loading && <p>Loading...</p>}
    {error && <p className="error">{error}</p>}

    {!loading && !error && (
      <div className="table-container">
        <table className="penjahit-table">
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
            {laporan.map((row, index) => (
              <tr key={index}>
                <td data-label="Tanggal">{row.tanggal}</td>

                {tukang.map((nama) => (
                  <td key={nama} data-label={nama}>
                    {row[nama]}
                  </td>
                ))}

                <td data-label="Total">{row.total}</td>
              </tr>
            ))}
          </tbody>

          {/* GRAND TOTAL */}
          {grandTotal && (
            <tfoot>
              <tr>
                <th>Total Periode</th>

                {tukang.map((nama) => (
                  <th key={nama}>{grandTotal[nama]}</th>
                ))}

                <th>{grandTotal.total}</th>
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
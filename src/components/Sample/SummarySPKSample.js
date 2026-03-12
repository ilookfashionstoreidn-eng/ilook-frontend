import React, { useEffect, useState, useMemo } from "react";
import API from "../../api";
import "./SummarySPKSample.css";
import { FiMonitor } from "react-icons/fi";

const kategoriList = [
  "SET CELANA PANJANG",
  "SET CELANA PENDEK",
  "SET ROK",
  "DASTER",
  "DRESS",
  "BLOUSE (ATASAN)",
  "GAMIS",
  "KAOS",
];

const SummarySPKSample = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await API.get("/spk-sample");
      setData(response.data?.data || []);
    } catch (error) {
      console.error("Gagal mengambil data SPK Sample.", error);
    } finally {
      setLoading(false);
    }
  };

  const getStats = useMemo(() => {
    const stats = kategoriList.map((kategori) => {
      // Allow minor differences in Kategori name like BLOUSE vs BLOUSE (ATASAN)
      const matchingKategori = kategori === "BLOUSE (ATASAN)" ? "BLOUSE" : kategori;

      const items = data.filter(
        (item) => (item.kategori_sample || "").toUpperCase() === matchingKategori || (item.kategori_sample || "").toUpperCase() === kategori
      );

      const polaCount = items.filter((d) => d.tahap_proses === "Pola Sample").length;
      const cuttingCount = items.filter((d) => d.tahap_proses === "Cutting Sample" || d.tahap_proses === "Cutting").length;
      const jahitCount = items.filter((d) => d.tahap_proses === "Jahit Sample").length;
      const preLaunchCount = items.filter((d) => d.tahap_proses === "Pengiriman").length;
      const launchCount = items.filter((d) => d.tahap_proses === "Launching").length;

      // Determine urgency indicator (red if any urgent, green if at least one item but all normal, empty if no items or something else)
      let urgentStatus = "none";
      if (items.some((d) => (d.status_spk || "").toLowerCase() === "urgent")) {
        urgentStatus = "urgent";
      } else if (items.length > 0) {
        urgentStatus = "normal";
      }

      return {
        kategori,
        polaCount,
        cuttingCount,
        jahitCount,
        preLaunchCount,
        launchCount,
        urgentStatus
      };
    });

    return stats;
  }, [data]);

  const totalStats = useMemo(() => {
    let totalPola = 0;
    let totalCutting = 0;
    let totalJahit = 0;
    let totalPreLaunch = 0;
    let totalLaunch = 0;

    getStats.forEach(stat => {
      totalPola += stat.polaCount;
      totalCutting += stat.cuttingCount;
      totalJahit += stat.jahitCount;
      totalPreLaunch += stat.preLaunchCount;
      totalLaunch += stat.launchCount;
    });

    return { totalPola, totalCutting, totalJahit, totalPreLaunch, totalLaunch };
  }, [getStats]);

  return (
    <div className="summary-spk-container">
      <div className="summary-spk-header-box">
        <FiMonitor className="summary-spk-icon" />
        <span>Daftar Jumlah Kategori Sample On Process (Pola, Cutting & Jahit), Pre Launching dan Launching !</span>
      </div>

      <div className="summary-spk-table-wrapper">
        <table className="summary-spk-table">
          <thead>
            <tr>
              <th colSpan={2} style={{ textAlign: "left", paddingLeft: "15px" }}>KATEGORI SAMPLE</th>
              <th style={{ width: "30px", textAlign: "center" }}></th>
              <th>POLA SAMPLE</th>
              <th>CUTTING SAMPLE</th>
              <th>JAHIT SAMPLE</th>
              <th>PRE LAUNCHING</th>
              <th>LAUNCHING</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>Memuat data...</td>
              </tr>
            ) : (
              getStats.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ width: "30px", textAlign: "center", opacity: 0.7 }}>{idx + 1}</td>
                  <td>{row.kategori}</td>
                  <td style={{ textAlign: "center" }}>
                    {row.urgentStatus === "urgent" && <div className="summary-spk-circle urgent-circle"></div>}
                    {row.urgentStatus === "normal" && <div className="summary-spk-circle normal-circle"></div>}
                  </td>
                  <td><div className="summary-spk-value-box">{row.polaCount} MODEL</div></td>
                  <td><div className="summary-spk-value-box">{row.cuttingCount} MODEL</div></td>
                  <td><div className="summary-spk-value-box">{row.jahitCount} MODEL</div></td>
                  <td><div className="summary-spk-value-box">{row.preLaunchCount} MODEL</div></td>
                  <td><span>{row.launchCount} MODEL</span></td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ padding: "0 15px", color: "#5f7697" }}>1</span>
                  <strong>SELURUH KATEGORI SAMPLE</strong>
                </div>
              </td>
              <td><strong>{totalStats.totalPola} MODEL</strong></td>
              <td><strong>{totalStats.totalCutting} MODEL</strong></td>
              <td><strong>{totalStats.totalJahit} MODEL</strong></td>
              <td><strong>{totalStats.totalPreLaunch} MODEL</strong></td>
              <td><strong>{totalStats.totalLaunch} MODEL</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default SummarySPKSample;

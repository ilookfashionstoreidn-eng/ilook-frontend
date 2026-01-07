import React, { useEffect, useState } from "react";
import "./KodeSeriBelumDikerjakan.css";
import API from "../../api";

const KodeSeriBelumDikerjakan = () => {
  const [data, setData] = useState([]);
  const [statistics, setStatistics] = useState({
    jumlah_spk: 0,
    jumlah_produk: 0,
    jumlah_qty: 0,
    jumlah_over_deadline: 0,
    jumlah_belum_deadline: 0,
    count_cutting: 0,
    count_jasa: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all, cutting, jasa

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await API.get("/kode-seri-belum-dikerjakan");
      setData(response.data.data || []);
      setStatistics(response.data.statistics || {});
    } catch (error) {
      console.error("Error fetching data:", error);
      alert(error.response?.data?.message || "Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  const formatTanggal = (tanggal) => {
    if (!tanggal) return "-";
    const date = new Date(tanggal);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const isOverDeadline = (deadline) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  const filteredData = data.filter((item) => {
    // Filter berdasarkan search term
    const matchesSearch = item.kode_seri.toLowerCase().includes(searchTerm.toLowerCase()) || item.nama_produk.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Filter berdasarkan type (cutting/jasa)
    if (typeFilter === "all") return true;

    // Cek apakah ada distribusi dengan type yang sesuai
    if (item.distribusi_list && item.distribusi_list.length > 0) {
      return item.distribusi_list.some((dist) => dist.type === typeFilter);
    }

    return false;
  });

  // Hitung count berdasarkan filter yang aktif
  const getFilteredCount = (type) => {
    if (type === "all") {
      return {
        cutting: statistics.count_cutting || 0,
        jasa: statistics.count_jasa || 0,
      };
    }

    // Hitung dari data yang ter-filter
    const count = filteredData.reduce(
      (acc, item) => {
        if (item.distribusi_list && item.distribusi_list.length > 0) {
          const hasType = item.distribusi_list.some((dist) => dist.type === type);
          if (hasType) {
            acc[type]++;
          }
        }
        return acc;
      },
      { cutting: 0, jasa: 0 }
    );

    return count;
  };

  const filteredCount = getFilteredCount(typeFilter);

  return (
    <div className="kode-seri-wrapper">
      <div className="kode-seri-header">
        <h1>Kode Seri Belum Dikerjakan</h1>
      </div>

      {/* Statistics Cards */}
      <div className="kode-seri-statistics">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            📋
          </div>
          <div className="stat-content">
            <div className="stat-label">Jumlah SPK</div>
            <div className="stat-value">{statistics.jumlah_spk || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}>
            📦
          </div>
          <div className="stat-content">
            <div className="stat-label">Jumlah Produk</div>
            <div className="stat-value">{statistics.jumlah_produk || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }}>
            🔢
          </div>
          <div className="stat-content">
            <div className="stat-label">Jumlah Qty/Barang</div>
            <div className="stat-value">{statistics.jumlah_qty || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }}>
            ⚠️
          </div>
          <div className="stat-content">
            <div className="stat-label">Over Deadline</div>
            <div className="stat-value" style={{ color: "#e53e3e" }}>
              {statistics.jumlah_over_deadline || 0}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)" }}>
            ✅
          </div>
          <div className="stat-content">
            <div className="stat-label">Belum Deadline</div>
            <div className="stat-value" style={{ color: "#48bb78" }}>
              {statistics.jumlah_belum_deadline || 0}
            </div>
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setTypeFilter(typeFilter === "cutting" ? "all" : "cutting")}
          style={{
            cursor: "pointer",
            border: typeFilter === "cutting" ? "2px solid #667eea" : "none",
            boxShadow: typeFilter === "cutting" ? "0 4px 12px rgba(102, 126, 234, 0.3)" : undefined,
          }}
        >
          <div className="stat-icon" style={{ background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }}>
            ✂️
          </div>
          <div className="stat-content">
            <div className="stat-label">Jumlah Cutting</div>
            <div className="stat-value" style={{ color: "#667eea" }}>
              {typeFilter === "cutting" ? filteredCount.cutting : statistics.count_cutting || 0}
            </div>
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setTypeFilter(typeFilter === "jasa" ? "all" : "jasa")}
          style={{
            cursor: "pointer",
            border: typeFilter === "jasa" ? "2px solid #f5576c" : "none",
            boxShadow: typeFilter === "jasa" ? "0 4px 12px rgba(245, 87, 108, 0.3)" : undefined,
          }}
        >
          <div className="stat-icon" style={{ background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }}>
            🛠️
          </div>
          <div className="stat-content">
            <div className="stat-label">Jumlah Jasa</div>
            <div className="stat-value" style={{ color: "#f5576c" }}>
              {typeFilter === "jasa" ? filteredCount.jasa : statistics.count_jasa || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="kode-seri-filters">
        <div className="kode-seri-search">
          <input type="text" placeholder="Cari kode seri atau nama produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {typeFilter !== "all" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px" }}>
            <span style={{ fontSize: "14px", color: "#667eea", fontWeight: 500 }}>Filter: {typeFilter === "cutting" ? "Cutting" : "Jasa"}</span>
            <button
              onClick={() => setTypeFilter("all")}
              style={{
                padding: "6px 12px",
                background: "#e53e3e",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="kode-seri-table-container">
        <div className="kode-seri-table-wrapper">
          <table className="kode-seri-table">
            <thead>
              <tr>
                <th>Kode Seri</th>
                <th>Kode Distribusi</th>
                <th>Nama Produk</th>
                <th>Deadline</th>
                <th>Jumlah</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>
                    Memuat data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#718096" }}>
                    Tidak ada data kode seri belum dikerjakan
                  </td>
                </tr>
              ) : (
                filteredData.flatMap((item, index) => {
                  // Filter distribusi_list berdasarkan typeFilter
                  let filteredDistribusiList = item.distribusi_list || [];
                  if (typeFilter !== "all" && filteredDistribusiList.length > 0) {
                    filteredDistribusiList = filteredDistribusiList.filter((dist) => dist.type === typeFilter);
                  }

                  return filteredDistribusiList.length > 0
                    ? filteredDistribusiList.map((dist, distIndex) => (
                        <tr key={`${index}-${distIndex}`}>
                          {distIndex === 0 && (
                            <>
                              <td rowSpan={filteredDistribusiList.length}>
                                <strong style={{ fontSize: "16px", color: "#1a1a1a" }}>{item.kode_seri}</strong>
                              </td>
                            </>
                          )}
                          <td>
                            <span style={{ color: "#667eea", fontWeight: 500, textTransform: "capitalize" }}>{dist.type}</span>
                          </td>
                          {distIndex === 0 && (
                            <>
                              <td rowSpan={filteredDistribusiList.length}>{item.nama_produk}</td>
                              <td rowSpan={filteredDistribusiList.length}>
                                <span
                                  style={{
                                    color: isOverDeadline(item.deadline) ? "#e53e3e" : "#48bb78",
                                    fontWeight: isOverDeadline(item.deadline) ? 600 : 400,
                                  }}
                                >
                                  {formatTanggal(item.deadline)}
                                </span>
                              </td>
                              <td rowSpan={filteredDistribusiList.length}>
                                <strong>{typeFilter === "all" ? item.jumlah || 0 : filteredDistribusiList.reduce((sum, dist) => sum + (dist.jumlah_qty || 0), 0)}</strong>
                              </td>
                              <td rowSpan={filteredDistribusiList.length}>
                                <span className={`status-badge ${isOverDeadline(item.deadline) ? "over-deadline" : "belum-deadline"}`}>{isOverDeadline(item.deadline) ? "Over Deadline" : "Belum Deadline"}</span>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    : [];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default KodeSeriBelumDikerjakan;

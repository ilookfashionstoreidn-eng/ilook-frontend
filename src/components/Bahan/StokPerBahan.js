import React, { useEffect, useState, useCallback } from "react";
import "./StokPerBahan.css";
import API from "../../api";
import { FaChevronDown, FaChevronUp, FaBoxes, FaWarehouse, FaRuler, FaDollarSign } from "react-icons/fa";

const StokPerBahan = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedBahan, setExpandedBahan] = useState({});
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "utuh", "sisa"
  const [summaryRoll, setSummaryRoll] = useState({
    total_semua: 0,
    total_utuh: 0,
    total_sisa: 0,
  });
  const [dashboardStats, setDashboardStats] = useState({
    total_bahan: 0,
    total_roll: 0,
    total_berat: 0,
    total_harga: 0,
    total_roll_utuh: 0,
    total_roll_sisa: 0,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // === FETCH STOK PER BAHAN ===
  const fetchStokPerBahan = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Kirim parameter status ke backend untuk filtering di server
      const params = {};
      if (statusFilter !== "all") {
        params.status = statusFilter; // 'utuh' atau 'sisa'
      }

      const res = await API.get("/stok-bahan/per-bahan", { params });
      console.log("Response dari API:", res.data);

      // Pastikan data adalah array
      const dataArray = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setData(dataArray);

      if (dataArray.length === 0) {
        console.log("Tidak ada data stok per bahan");
      }
    } catch (e) {
      const errorMessage = e.response?.data?.message || e.message || "Gagal memuat data stok per bahan.";
      setError(errorMessage);
      console.error("Error fetching stok per bahan:", e);
      console.error("Error response:", e.response?.data);
      setData([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // === FETCH SUMMARY TOTAL ROLL ===
  const fetchSummaryRoll = useCallback(async () => {
    try {
      const res = await API.get("/stok-bahan/summary-total-roll");
      if (res.data) {
        setSummaryRoll({
          total_semua: res.data.total_semua || 0,
          total_utuh: res.data.total_utuh || 0,
          total_sisa: res.data.total_sisa || 0,
        });
      }
    } catch (e) {
      console.error("Error fetching summary roll:", e);
      // Set default values jika error
      setSummaryRoll({
        total_semua: 0,
        total_utuh: 0,
        total_sisa: 0,
      });
    }
  }, []);

  // === FETCH DASHBOARD STATS ===
  const fetchDashboardStats = useCallback(async () => {
    try {
      // Kirim parameter status ke backend untuk filtering di server
      const params = {};
      if (statusFilter !== "all") {
        params.status = statusFilter; // 'utuh' atau 'sisa'
      }

      const res = await API.get("/stok-bahan/dashboard-stats", { params });
      if (res.data) {
        setDashboardStats({
          total_bahan: res.data.total_bahan || 0,
          total_roll: res.data.total_roll || 0,
          total_berat_kg: res.data.total_berat_kg || 0,
          total_berat_yard: res.data.total_berat_yard || 0,
          total_harga: res.data.total_harga || 0,
          total_roll_utuh: res.data.total_roll_utuh || 0,
          total_roll_sisa: res.data.total_roll_sisa || 0,
        });
      }
    } catch (e) {
      console.error("Error fetching dashboard stats:", e);
      // Set default values jika error
      setDashboardStats({
        total_bahan: 0,
        total_roll: 0,
        total_berat_kg: 0,
        total_berat_yard: 0,
        total_harga: 0,
        total_roll_utuh: 0,
        total_roll_sisa: 0,
      });
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchStokPerBahan();
    fetchSummaryRoll();
    fetchDashboardStats();
  }, [fetchStokPerBahan, fetchSummaryRoll, fetchDashboardStats]); // Fetch ulang saat statusFilter berubah

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // === TOGGLE EXPAND DETAIL ===
  const toggleExpand = (namaBahan) => {
    setExpandedBahan((prev) => ({
      ...prev,
      [namaBahan]: !prev[namaBahan],
    }));
  };

  // === CALCULATE TOTALS BASED ON FILTER ===
  // Karena filtering sudah dilakukan di backend, data yang diterima sudah sesuai dengan filter
  const calculateFilteredTotals = (item) => {
    // Data dari backend sudah terfilter, jadi langsung gunakan total_rol dan total_berat
    return {
      totalRol: item.total_rol || 0,
      totalBerat: item.total_berat || 0,
      filteredWarna: item.warna || [],
    };
  };

  // === FILTER & PAGINATION ===
  // Filtering status sudah dilakukan di backend, jadi frontend hanya perlu filter berdasarkan search term
  const filtered = data.filter((item) => {
    // Filter berdasarkan search term saja
    const matchesSearch = (item.nama_bahan || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // === RENDER ===
  return (
    <div className="stok-bahan-page">
      <div className="stok-bahan-header">
        <div className="stok-bahan-header-icon">
          <FaBoxes />
        </div>
        <h1>Stok Bahan</h1>
      </div>

      {/* Dashboard Informasi */}
      <div className="stok-bahan-dashboard">
        <div className="stok-bahan-dashboard-card" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
          <div className="stok-bahan-dashboard-icon">
            <FaWarehouse />
          </div>
          <div className="stok-bahan-dashboard-content">
            <div className="stok-bahan-dashboard-label">Total Bahan</div>
            <div className="stok-bahan-dashboard-value">{dashboardStats.total_bahan}</div>
            <div className="stok-bahan-dashboard-subtitle">Jenis Bahan</div>
          </div>
        </div>

        <div className="stok-bahan-dashboard-card" style={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}>
          <div className="stok-bahan-dashboard-icon">
            <FaBoxes />
          </div>
          <div className="stok-bahan-dashboard-content">
            <div className="stok-bahan-dashboard-label">Total Roll</div>
            <div className="stok-bahan-dashboard-value">{(dashboardStats.total_roll || 0).toLocaleString("id-ID")}</div>
            <div className="stok-bahan-dashboard-subtitle">
              Utuh: {dashboardStats.total_roll_utuh} | Sisa: {dashboardStats.total_roll_sisa}
            </div>
          </div>
        </div>

        <div className="stok-bahan-dashboard-card" style={{ background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }}>
          <div className="stok-bahan-dashboard-icon">
            <FaRuler />
          </div>
          <div className="stok-bahan-dashboard-content">
            <div className="stok-bahan-dashboard-label">Total Berat (KG)</div>
            <div className="stok-bahan-dashboard-value">{(dashboardStats.total_berat_kg || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stok-bahan-dashboard-subtitle">Kilogram</div>
          </div>
        </div>

        <div className="stok-bahan-dashboard-card" style={{ background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }}>
          <div className="stok-bahan-dashboard-icon">
            <FaRuler />
          </div>
          <div className="stok-bahan-dashboard-content">
            <div className="stok-bahan-dashboard-label">Total Yard</div>
            <div className="stok-bahan-dashboard-value">{(dashboardStats.total_berat_yard || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stok-bahan-dashboard-subtitle">Panjang (Yard)</div>
          </div>
        </div>

        <div className="stok-bahan-dashboard-card" style={{ background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }}>
          <div className="stok-bahan-dashboard-icon">
            <FaDollarSign />
          </div>
          <div className="stok-bahan-dashboard-content">
            <div className="stok-bahan-dashboard-label">Total Nilai</div>
            <div className="stok-bahan-dashboard-value">Rp {(dashboardStats.total_harga || 0).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="stok-bahan-dashboard-subtitle">Total Harga Stok</div>
          </div>
        </div>
      </div>

      <div className="stok-bahan-table-container">
        <div className="stok-bahan-filter-header">
          <div className="stok-bahan-filter-buttons">
            <button
              className={`stok-bahan-btn-filter ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
              style={{
                borderColor: "#b3d9f2",
                background: statusFilter === "all" ? "linear-gradient(135deg, #0487d8 0%, #17457c 100%)" : "white",
                color: statusFilter === "all" ? "white" : "#17457c",
              }}
            >
              Semua <span style={{ marginLeft: "8px", fontWeight: "bold" }}>({summaryRoll.total_semua})</span>
            </button>
            <button
              className={`stok-bahan-btn-filter ${statusFilter === "utuh" ? "active" : ""}`}
              onClick={() => setStatusFilter("utuh")}
              style={{
                borderColor: "#4caf50",
                background: statusFilter === "utuh" ? "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)" : "white",
                color: statusFilter === "utuh" ? "white" : "#2e7d32",
              }}
            >
              Utuh <span style={{ marginLeft: "8px", fontWeight: "bold" }}>({summaryRoll.total_utuh})</span>
            </button>
            <button
              className={`stok-bahan-btn-filter ${statusFilter === "sisa" ? "active" : ""}`}
              onClick={() => setStatusFilter("sisa")}
              style={{
                borderColor: "#ffc107",
                background: statusFilter === "sisa" ? "linear-gradient(135deg, #ffc107 0%, #f57c00 100%)" : "white",
                color: statusFilter === "sisa" ? "white" : "#f57c00",
              }}
            >
              Sisa <span style={{ marginLeft: "8px", fontWeight: "bold" }}>({summaryRoll.total_sisa})</span>
            </button>
          </div>
          <div className="stok-bahan-search-bar">
            <input type="text" placeholder="Cari nama bahan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <p className="stok-bahan-loading">Memuat data stok...</p>
        ) : error ? (
          <p className="stok-bahan-error">{error}</p>
        ) : (
          <div className="stok-bahan-table-wrapper">
            <table className="stok-bahan-table">
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>No</th>
                  <th style={{ width: "150px" }}>Pabrik</th>
                  <th style={{ width: "200px" }}>Nama Bahan</th>
                  <th style={{ width: "150px" }}>Warna</th>
                  <th style={{ width: "100px" }}>Total Rol</th>
                  <th style={{ width: "120px" }}>Total Berat (kg)</th>
                  <th style={{ width: "150px" }}>Total Harga</th>
                  <th style={{ width: "100px" }}>Status</th>
                  <th style={{ width: "120px" }}>SKU</th>
                  <th style={{ width: "80px" }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: "40px" }}>
                      <div style={{ color: "#666", fontSize: "16px" }}>{statusFilter !== "all" ? `Tidak ada data stok dengan status "${statusFilter === "utuh" ? "Utuh" : "Sisa"}"` : "Tidak ada data stok"}</div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => {
                    const isExpanded = expandedBahan[item.nama_bahan];
                    const { totalRol, totalBerat, filteredWarna } = calculateFilteredTotals(item);
                    // Tentukan status berdasarkan filter
                    const displayStatus = statusFilter === "utuh" ? "Utuh" : statusFilter === "sisa" ? "Sisa" : item.status || "-";
                    return (
                      <React.Fragment key={item.nama_bahan}>
                        <tr>
                          <td>{indexOfFirstItem + index + 1}</td>
                          <td>{item.pabrik && item.pabrik.length > 0 ? <span>{item.pabrik.join(", ")}</span> : <span>-</span>}</td>
                          <td style={{ fontWeight: "bold" }}>{item.nama_bahan}</td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {filteredWarna && filteredWarna.length > 0 ? (
                                filteredWarna.map((w, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      padding: "2px 8px",
                                      borderRadius: "12px",
                                      backgroundColor: "#007bff",
                                      color: "white",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {w}
                                  </span>
                                ))
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                          </td>
                          <td>{totalRol}</td>
                          <td>{totalBerat.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td style={{ fontWeight: "600", color: "#28a745" }}>{item.total_harga > 0 ? `Rp ${item.total_harga.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "-"}</td>
                          <td>
                            <span
                              style={{
                                padding: "4px 12px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "600",
                                backgroundColor: displayStatus === "Utuh" ? "#28a745" : displayStatus === "Sisa" ? "#ffc107" : "#6c757d",
                                color: displayStatus === "Utuh" || displayStatus === "Sisa" ? "white" : "#fff",
                              }}
                            >
                              {displayStatus}
                            </span>
                          </td>
                          <td>{item.sku || "-"}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => toggleExpand(item.nama_bahan)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "16px",
                                color: "#007bff",
                              }}
                            >
                              {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                            </button>
                          </td>
                        </tr>
                        {isExpanded &&
                          item.detail &&
                          item.detail.length > 0 &&
                          (() => {
                            // Filter detail berdasarkan statusFilter
                            const filteredDetails = item.detail.filter((detail) => {
                              if (statusFilter === "utuh") {
                                return (detail.keterangan || "").toLowerCase() === "utuh";
                              } else if (statusFilter === "sisa") {
                                return (detail.keterangan || "").toLowerCase() === "sisa";
                              }
                              return true; // Tampilkan semua jika filter "all"
                            });

                            // Hitung total berdasarkan filtered details
                            const filteredTotalRol = filteredDetails.length;
                            const filteredTotalBerat = filteredDetails.reduce((sum, d) => sum + (parseFloat(d.berat) || 0), 0);
                            const filteredWarna = [...new Set(filteredDetails.map((d) => d.warna).filter(Boolean))];

                            return (
                          <tr>
                                <td colSpan="10" style={{ padding: "0", backgroundColor: "#f8f9fa" }}>
                              <div style={{ padding: "20px" }}>
                                <h4 style={{ marginBottom: "15px", color: "#495057", fontSize: "18px" }}>Detail Stok - {item.nama_bahan}</h4>

                                {/* Summary Info */}
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                    gap: "15px",
                                    marginBottom: "20px",
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: "15px",
                                      backgroundColor: "white",
                                      borderRadius: "8px",
                                      border: "1px solid #dee2e6",
                                    }}
                                  >
                                    <strong style={{ color: "#6c757d", fontSize: "13px", display: "block", marginBottom: "5px" }}>Total Roll</strong>
                                        <p style={{ margin: "0", fontSize: "24px", fontWeight: "bold", color: "#007bff" }}>{filteredTotalRol}</p>
                                  </div>
                                  <div
                                    style={{
                                      padding: "15px",
                                      backgroundColor: "white",
                                      borderRadius: "8px",
                                      border: "1px solid #dee2e6",
                                    }}
                                  >
                                    <strong style={{ color: "#6c757d", fontSize: "13px", display: "block", marginBottom: "5px" }}>Total Warna</strong>
                                        <p style={{ margin: "0", fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>{filteredWarna.length}</p>
                                  </div>
                                  <div
                                    style={{
                                      padding: "15px",
                                      backgroundColor: "white",
                                      borderRadius: "8px",
                                      border: "1px solid #dee2e6",
                                    }}
                                  >
                                    <strong style={{ color: "#6c757d", fontSize: "13px", display: "block", marginBottom: "5px" }}>Total Berat</strong>
                                        <p style={{ margin: "0", fontSize: "24px", fontWeight: "bold", color: "#dc3545" }}>{filteredTotalBerat.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</p>
                                  </div>
                                </div>

                                {/* Breakdown per Warna */}
                                <h5 style={{ marginBottom: "15px", color: "#495057", fontSize: "16px" }}>Rincian Per Warna</h5>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                    gap: "15px",
                                  }}
                                >
                                  {(() => {
                                        // Group by warna dari filteredDetails
                                    const warnaGroups = {};
                                        filteredDetails.forEach((detail) => {
                                      const warna = detail.warna || "Tidak Diketahui";
                                      if (!warnaGroups[warna]) {
                                        warnaGroups[warna] = {
                                          count: 0,
                                          berat: 0,
                                          utuh: 0,
                                          sisa: 0,
                                        };
                                      }
                                      warnaGroups[warna].count += 1;
                                      warnaGroups[warna].berat += parseFloat(detail.berat) || 0;
                                      
                                      // Hitung utuh dan sisa berdasarkan keterangan
                                      const keterangan = detail.keterangan || "";
                                      if (keterangan.toLowerCase() === "utuh") {
                                        warnaGroups[warna].utuh += 1;
                                      } else if (keterangan.toLowerCase() === "sisa") {
                                        warnaGroups[warna].sisa += 1;
                                      }
                                    });

                                    return Object.entries(warnaGroups).map(([warna, data], idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          padding: "15px",
                                          backgroundColor: "white",
                                          borderRadius: "8px",
                                          border: "1px solid #dee2e6",
                                        }}
                                      >
                                        <div
                                          style={{
                                            padding: "4px 12px",
                                            borderRadius: "12px",
                                            backgroundColor: "#007bff",
                                            color: "white",
                                            fontSize: "13px",
                                            fontWeight: "bold",
                                            marginBottom: "10px",
                                            display: "inline-block",
                                            textTransform: "capitalize",
                                          }}
                                        >
                                          {warna}
                                        </div>
                                        <div style={{ marginBottom: "10px" }}>
                                          <strong style={{ color: "#6c757d", fontSize: "13px", display: "block", marginBottom: "5px" }}>Total Roll</strong>
                                          <p style={{ margin: "0", fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>{data.count}</p>
                                        </div>
                                        <div style={{ marginBottom: "10px" }}>
                                          <strong style={{ color: "#6c757d", fontSize: "13px", display: "block", marginBottom: "5px" }}>Utuh</strong>
                                          <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold", color: "#28a745" }}>{data.utuh}</p>
                                        </div>
                                        <div style={{ marginBottom: "10px" }}>
                                          <strong style={{ color: "#6c757d", fontSize: "13px", display: "block", marginBottom: "5px" }}>Sisa</strong>
                                          <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold", color: "#ffc107" }}>{data.sisa}</p>
                                        </div>
                                        <div>
                                          <strong style={{ color: "#6c757d", fontSize: "13px", display: "block", marginBottom: "5px" }}>Total Berat</strong>
                                          <p style={{ margin: "0", fontSize: "24px", fontWeight: "bold", color: "#dc3545" }}>{data.berat.toFixed(2)} kg</p>
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            </td>
                          </tr>
                            );
                          })()}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="stok-bahan-pagination">
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  Previous
                </button>

                {/* Tampilkan maksimal 7 nomor halaman */}
                {(() => {
                  const maxVisible = 7;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                  if (endPage - startPage < maxVisible - 1) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }

                  const pages = [];

                  // Tombol halaman pertama
                  if (startPage > 1) {
                    pages.push(
                      <button key={1} className={currentPage === 1 ? "active" : ""} onClick={() => goToPage(1)}>
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" style={{ padding: "0 5px", color: "#666" }}>
                          ...
                        </span>
                      );
                    }
                  }

                  // Halaman yang terlihat
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button key={i} className={currentPage === i ? "active" : ""} onClick={() => goToPage(i)}>
                        {i}
                      </button>
                    );
                  }

                  // Tombol halaman terakhir
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" style={{ padding: "0 5px", color: "#666" }}>
                          ...
                        </span>
                      );
                    }
                    pages.push(
                      <button key={totalPages} className={currentPage === totalPages ? "active" : ""} onClick={() => goToPage(totalPages)}>
                        {totalPages}
                    </button>
                  );
                  }

                  return pages;
                })()}

                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  Next
                </button>

                <span style={{ padding: "10px", color: "#17457c", fontWeight: 600, fontSize: "14px" }}>
                  Halaman {currentPage} dari {totalPages} ({filtered.length} data)
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StokPerBahan;

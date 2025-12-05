import React, { useEffect, useState } from "react";
import "../Jahit/Penjahit.css";
import "../Cutting/SpkCutting/SpkCuting.css";
import API from "../../api";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

const StokPerBahan = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedBahan, setExpandedBahan] = useState({});

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // === FETCH STOK PER BAHAN ===
  const fetchStokPerBahan = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/stok-bahan/per-bahan");
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
  };

  useEffect(() => {
    fetchStokPerBahan();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // === TOGGLE EXPAND DETAIL ===
  const toggleExpand = (namaBahan) => {
    setExpandedBahan((prev) => ({
      ...prev,
      [namaBahan]: !prev[namaBahan],
    }));
  };

  // === FILTER & PAGINATION ===
  const filtered = data.filter((item) => (item.nama_bahan || "").toLowerCase().includes(searchTerm.toLowerCase()));

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
    <div>
      <div className="penjahit-container">
        <h1>Stok Bahan</h1>
      </div>

      <div className="table-container">
        <div className="filter-header1">
          <div className="search-bar1">
            <input type="text" placeholder="Cari nama bahan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <p>Memuat data stok...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <>
            <table className="penjahit-table">
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>No</th>
                  <th style={{ width: "200px" }}>Nama Bahan</th>
                  <th style={{ width: "100px" }}>Total Berat (kg)</th>
                  <th style={{ width: "100px" }}>Total Rol</th>
                  <th style={{ width: "150px" }}>Warna</th>
                  <th style={{ width: "150px" }}>Gudang</th>
                  <th style={{ width: "150px" }}>Pabrik</th>
                  <th style={{ width: "80px" }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
                      Tidak ada data stok
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => {
                    const isExpanded = expandedBahan[item.nama_bahan];
                    return (
                      <React.Fragment key={item.nama_bahan}>
                        <tr>
                          <td>{indexOfFirstItem + index + 1}</td>
                          <td style={{ fontWeight: "bold" }}>{item.nama_bahan}</td>
                          <td>{item.total_berat.toLocaleString("id-ID")}</td>
                          <td>{item.total_rol}</td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {item.warna && item.warna.length > 0 ? (
                                item.warna.map((w, idx) => (
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
                          <td>{item.gudang && item.gudang.length > 0 ? <span>{item.gudang.join(", ")}</span> : <span>-</span>}</td>
                          <td>{item.pabrik && item.pabrik.length > 0 ? <span>{item.pabrik.join(", ")}</span> : <span>-</span>}</td>
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
                        {isExpanded && item.detail && item.detail.length > 0 && (
                          <tr>
                            <td colSpan="8" style={{ padding: "0", backgroundColor: "#f8f9fa" }}>
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
                                    <p style={{ margin: "0", fontSize: "24px", fontWeight: "bold", color: "#007bff" }}>{item.total_rol}</p>
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
                                    <p style={{ margin: "0", fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>{item.warna ? item.warna.length : 0}</p>
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
                                    <p style={{ margin: "0", fontSize: "24px", fontWeight: "bold", color: "#dc3545" }}>{item.total_berat.toLocaleString("id-ID")} kg</p>
                                  </div>
                                </div>

                                {/* Breakdown per Warna */}
                                <h5 style={{ marginBottom: "15px", color: "#495057", fontSize: "16px" }}>Rincian Per Warna</h5>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                    gap: "15px",
                                  }}
                                >
                                  {(() => {
                                    // Group by warna
                                    const warnaGroups = {};
                                    item.detail.forEach((detail) => {
                                      const warna = detail.warna || "Tidak Diketahui";
                                      if (!warnaGroups[warna]) {
                                        warnaGroups[warna] = {
                                          count: 0,
                                          berat: 0,
                                        };
                                      }
                                      warnaGroups[warna].count += 1;
                                      warnaGroups[warna].berat += parseFloat(detail.berat) || 0;
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
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination" style={{ marginTop: "20px", textAlign: "center" }}>
                <button className="btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button key={page} className={`btn ${currentPage === page ? "btn-primary" : ""}`} onClick={() => goToPage(page)} style={{ margin: "0 4px" }}>
                      {page}
                    </button>
                  );
                })}

                <button className="btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StokPerBahan;

import React, { useEffect, useState } from "react";
import "../Jahit/Penjahit.css";
import "../Cutting/SpkCutting/SpkCuting.css";
import API from "../../api";


const StokBahan = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // === FETCH STOK DATA ===
  const fetchStok = async () => {
    try {
      setLoading(true);
      const res = await API.get("/stok-bahan");
      setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (e) {
      setError("Gagal memuat data stok.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStok();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);



  // === PAGINATION ===
  const filtered = items.filter((item) =>
    (item.barcode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.nama_bahan || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.warna || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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



      {/* Tabel Stok */}
      <div className="table-container">
        <div className="filter-header1">
          <div className="search-bar1">
            <input
              type="text"
              placeholder="Cari barcode, nama bahan, atau warna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                  <th>No</th>
                  <th>Nama Bahan</th>
                  <th>Warna</th>
                  <th>Barcode</th>
                  <th>Berat (kg)</th>
                  <th>Hari di Gudang</th>
                  <th>Tanggal Scan</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={item.id}>
                    <td>{indexOfFirstItem + index + 1}</td>
                    <td>{item.nama_bahan || "-"}</td>
                    <td>{item.warna || "-"}</td>
                    <td>{item.barcode}</td>
                    <td>{item.berat || "-"}</td>
                    <td>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "12px",
                          backgroundColor:
                            item.hari_di_gudang > 30
                              ? "#dc3545"
                              : item.hari_di_gudang > 15
                              ? "#ffc107"
                              : "#28a745",
                          color: "white",
                          fontWeight: "bold",
                        }}
                      >
                        {item.hari_di_gudang} hari
                      </span>
                    </td>
                    <td>{item.scanned_at ? new Date(item.scanned_at).toLocaleDateString("id-ID") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination" style={{ marginTop: "20px", textAlign: "center" }}>
                <button
                  className="btn"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      className={`btn ${currentPage === page ? "btn-primary" : ""}`}
                      onClick={() => goToPage(page)}
                      style={{ margin: "0 4px" }}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  className="btn"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
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

export default StokBahan;
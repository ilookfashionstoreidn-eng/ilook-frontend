import React, { useState, useEffect } from "react";
import "../Jahit/Penjahit.css";
import "../Cutting/SpkCutting/SpkCuting.css";
import API from "../../api";
import { toast } from "react-toastify";

const RiwayatStokBahanKeluar = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchSpkCuttingId, setSearchSpkCuttingId] = useState("");

  useEffect(() => {
    fetchData();
  }, [currentPage, searchSpkCuttingId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
      };

      if (searchSpkCuttingId && searchSpkCuttingId.trim() !== "") {
        params.spk_cutting_id = searchSpkCuttingId.trim();
      }

      const response = await API.get("/stok-bahan-keluar", { params });

      if (response.data.data) {
        setData(response.data.data);
        setCurrentPage(response.data.current_page);
        setLastPage(response.data.last_page);
      } else {
        setData([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengambil data riwayat stok bahan keluar");
      toast.error(err.response?.data?.message || "Gagal mengambil data");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      setCurrentPage(1);
      fetchData();
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div>
      <div className="penjahit-container">
        <h1>Riwayat Stok Bahan Keluar</h1>
      </div>

      <div className="table-container">
        {/* Filter dengan layout seperti Scan Packing / Scan Stok Bahan Keluar */}
        <div className="tracking-card">
          <div className="tracking-input-wrapper">
            <input
              type="text"
              placeholder="Scan / masukkan SPK Cutting ID..."
              value={searchSpkCuttingId}
              onChange={(e) => setSearchSpkCuttingId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
              className="tracking-input-modern"
            />
            <button onClick={handleSearch} className="btn-search-modern" disabled={loading}>
              {loading ? "Loading..." : "Cari SPK Cutting"}
            </button>
          </div>

          {error && (
            <div className="packing-message" style={{ backgroundColor: "#f8d7da", color: "#721c24", borderLeftColor: "#dc3545" }}>
              {error}
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>Memuat data...</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px" }}>Tidak ada data</div>
        ) : (
          <>
            <table className="penjahit-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tanggal Scan</th>
                  <th>SPK Cutting ID</th>
                  <th>Nama Produk</th>
                  <th>Nama Bagian</th>
                  <th>Nama Bahan</th>
                  <th>Warna</th>
                  <th>Barcode</th>
                  <th>Berat (kg)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.id}>
                    <td>{(currentPage - 1) * 20 + index + 1}</td>
                    <td>{item.scanned_at ? new Date(item.scanned_at).toLocaleDateString("id-ID") : item.created_at ? new Date(item.created_at).toLocaleDateString("id-ID") : "-"}</td>
                    <td>{item.spk_cutting?.id_spk_cutting || "-"}</td>
                    <td>{item.spk_cutting?.produk?.nama_produk || "-"}</td>
                    <td>{item.spk_cutting_bahan?.bagian?.nama_bagian || "-"}</td>
                    <td>{item.spk_cutting_bahan?.bahan?.nama_bahan || "-"}</td>
                    <td>{item.spk_cutting_bahan?.warna || "-"}</td>
                    <td>{item.barcode || "-"}</td>
                    <td>{item.berat ? `${item.berat} kg` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {lastPage > 1 && (
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px" }}>
                <button className="btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                  Sebelumnya
                </button>
                <span style={{ padding: "10px" }}>
                  Halaman {currentPage} dari {lastPage}
                </span>
                <button className="btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === lastPage}>
                  Selanjutnya
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RiwayatStokBahanKeluar;

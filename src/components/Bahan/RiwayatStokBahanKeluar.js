import React, { useState, useEffect } from "react";
import "./RiwayatStokBahanKeluar.css";
import API from "../../api";
import { toast } from "react-toastify";
import { FaHistory } from "react-icons/fa";

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
    <div className="riwayat-stok-page">
      <div className="riwayat-stok-header">
        <div className="riwayat-stok-header-icon">
          <FaHistory />
        </div>
        <h1>Riwayat Stok Bahan Keluar</h1>
      </div>

      <div className="riwayat-stok-table-container">
        <div className="riwayat-stok-filter-header">
          <div className="riwayat-stok-search-bar">
            <input type="text" placeholder="Scan / masukkan SPK Cutting ID..." value={searchSpkCuttingId} onChange={(e) => setSearchSpkCuttingId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch(e)} />
            <button className="riwayat-stok-btn-primary" onClick={handleSearch} disabled={loading}>
              {loading ? "Loading..." : "Cari SPK Cutting"}
            </button>
          </div>
        </div>

        {error && <p className="riwayat-stok-error">{error}</p>}

        {/* Table */}
        {loading ? (
          <p className="riwayat-stok-loading">Memuat data...</p>
        ) : data.length === 0 ? (
          <p className="riwayat-stok-loading">Tidak ada data</p>
        ) : (
          <>
            <table className="riwayat-stok-table">
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
              <div className="riwayat-stok-pagination">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                  Previous
                </button>
                <span style={{ padding: "10px", color: "#17457c", fontWeight: 600 }}>
                  Halaman {currentPage} dari {lastPage}
                </span>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === lastPage}>
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

export default RiwayatStokBahanKeluar;

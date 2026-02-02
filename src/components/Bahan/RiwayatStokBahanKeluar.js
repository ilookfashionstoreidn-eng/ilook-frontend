import React, { useState, useEffect, useCallback } from "react";
import "./RiwayatStokBahanKeluar.css";
import API from "../../api";
import { toast } from "react-toastify";
import { FaHistory, FaCalendarAlt } from "react-icons/fa";

const RiwayatStokBahanKeluar = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [searchSpkCuttingId, setSearchSpkCuttingId] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");
  const [filterAktif, setFilterAktif] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        per_page: perPage
      };

      if (searchSpkCuttingId && searchSpkCuttingId.trim() !== "") {
        params.spk_cutting_id = searchSpkCuttingId.trim();
      }

      // Filter tanggal hanya dikirim jika filter aktif
      if (filterAktif) {
        if (tanggalMulai) {
          params.tanggal_mulai = tanggalMulai;
        }

        if (tanggalAkhir) {
          params.tanggal_akhir = tanggalAkhir;
        }
      }

      const response = await API.get("/stok-bahan-keluar", { params });

      if (response.data.data) {
        // Data sudah difilter dari backend, langsung gunakan
        setData(response.data.data);
        
        // Gunakan pagination dari backend
        setCurrentPage(response.data.current_page);
        setLastPage(response.data.last_page);
        setTotalData(response.data.total);
      } else {
        setData([]);
        setCurrentPage(1);
        setLastPage(1);
        setTotalData(0);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengambil data riwayat stok bahan keluar");
      toast.error(err.response?.data?.message || "Gagal mengambil data");
      setData([]);
      if (filterAktif) {
        setCurrentPage(1);
        setLastPage(1);
        setTotalData(0);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, searchSpkCuttingId, filterAktif, tanggalMulai, tanggalAkhir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      setCurrentPage(1);
      fetchData();
    }
  };

  const handleTerapkanFilter = () => {
    if (!tanggalMulai && !tanggalAkhir) {
      alert("Silakan pilih tanggal mulai atau tanggal akhir terlebih dahulu!");
      return;
    }
    setFilterAktif(true);
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setTanggalMulai("");
    setTanggalAkhir("");
    setSearchSpkCuttingId("");
    setFilterAktif(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePerPageChange = (e) => {
    setPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset ke halaman 1 saat mengubah perPage
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
           
          </div>
        </div>

        {/* Filter Tanggal */}
        <div className="riwayat-stok-filter-tanggal">
          <div className="riwayat-stok-filter-tanggal-header">
            <FaCalendarAlt className="riwayat-stok-filter-icon" />
            <h3>Filter Tanggal</h3>
          </div>
          <div className="riwayat-stok-filter-tanggal-inputs">
            <div className="riwayat-stok-form-group">
              <label>Tanggal Mulai</label>
              <input type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} className="riwayat-stok-date-input" />
            </div>
            <div className="riwayat-stok-form-group">
              <label>Tanggal Akhir</label>
              <input type="date" value={tanggalAkhir} onChange={(e) => setTanggalAkhir(e.target.value)} className="riwayat-stok-date-input" />
            </div>
            <div className="riwayat-stok-filter-tanggal-actions">
              <button className="riwayat-stok-btn riwayat-stok-btn-primary" onClick={handleTerapkanFilter} disabled={loading} style={{ marginTop: "20px" }}>
                {loading ? "Memproses..." : "Terapkan Filter"}
              </button>
              <button className="riwayat-stok-btn riwayat-stok-btn-secondary" onClick={handleResetFilter} disabled={loading} style={{ marginTop: "20px" }}>
                Reset Filter
              </button>
            </div>
            {filterAktif && (tanggalMulai || tanggalAkhir) && (
              <div className="riwayat-stok-filter-info">
                <strong>Filter Aktif:</strong>
                <span>
                  {tanggalMulai && tanggalAkhir
                    ? `Tanggal ${new Date(tanggalMulai).toLocaleDateString("id-ID")} - ${new Date(tanggalAkhir).toLocaleDateString("id-ID")}`
                    : tanggalMulai
                    ? `Dari tanggal ${new Date(tanggalMulai).toLocaleDateString("id-ID")}`
                    : `Sampai tanggal ${new Date(tanggalAkhir).toLocaleDateString("id-ID")}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {error && <p className="riwayat-stok-error">{error}</p>}

        {/* Table */}
        {loading ? (
          <p className="riwayat-stok-loading">Memuat data...</p>
        ) : data.length === 0 ? (
          <div className="riwayat-stok-empty-state">
            <div className="riwayat-stok-empty-state-icon">📦</div>
            <p className="riwayat-stok-loading">{filterAktif && (tanggalMulai || tanggalAkhir) ? "Tidak ada data pada tanggal yang dipilih" : "Tidak ada data"}</p>
          </div>
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
                    <td>{(currentPage - 1) * perPage + index + 1}</td>
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
            <div className="riwayat-stok-pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <div className="riwayat-stok-pagination-info">
                <span>Total Data: {totalData}</span>
                <select 
                  value={perPage} 
                  onChange={handlePerPageChange}
                  style={{ marginLeft: '10px', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value={10}>10 per halaman</option>
                  <option value={20}>20 per halaman</option>
                  <option value={50}>50 per halaman</option>
                  <option value={100}>100 per halaman</option>
                </select>
              </div>

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
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RiwayatStokBahanKeluar;

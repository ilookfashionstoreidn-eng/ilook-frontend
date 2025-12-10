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
        let filteredData = response.data.data;

        // Client-side filtering sebagai backup untuk memastikan hanya data di tanggal yang dipilih ditampilkan
        if (filterAktif && (tanggalMulai || tanggalAkhir)) {
          filteredData = filteredData.filter((item) => {
            // Ambil tanggal dari scanned_at atau created_at
            const dateString = item.scanned_at || item.created_at;
            if (!dateString) return false;

            try {
              const scanDate = new Date(dateString);
              if (isNaN(scanDate.getTime())) return false;

              // Format tanggal untuk perbandingan: YYYY-MM-DD
              const itemYear = scanDate.getFullYear();
              const itemMonth = String(scanDate.getMonth() + 1).padStart(2, "0");
              const itemDay = String(scanDate.getDate()).padStart(2, "0");
              const itemDateStr = `${itemYear}-${itemMonth}-${itemDay}`;

              if (tanggalMulai) {
                const startDateStr = tanggalMulai; // Format: YYYY-MM-DD
                if (itemDateStr < startDateStr) {
                  return false;
                }
              }

              if (tanggalAkhir) {
                const endDateStr = tanggalAkhir; // Format: YYYY-MM-DD
                if (itemDateStr > endDateStr) {
                  return false;
                }
              }

              return true;
            } catch (e) {
              return false;
            }
          });
        }

        // Set data yang sudah difilter
        setData(filteredData);

        // Jika filter aktif dan tidak ada data, reset pagination
        if (filterAktif && filteredData.length === 0) {
          setCurrentPage(1);
          setLastPage(1);
        } else {
          // Gunakan pagination dari backend
          setCurrentPage(response.data.current_page);
          setLastPage(response.data.last_page);
        }
      } else {
        setData([]);
        if (filterAktif) {
          setCurrentPage(1);
          setLastPage(1);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengambil data riwayat stok bahan keluar");
      toast.error(err.response?.data?.message || "Gagal mengambil data");
      setData([]);
      if (filterAktif) {
        setCurrentPage(1);
        setLastPage(1);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchSpkCuttingId, filterAktif, tanggalMulai, tanggalAkhir]);

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

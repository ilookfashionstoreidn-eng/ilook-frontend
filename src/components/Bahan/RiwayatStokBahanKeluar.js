import React, { useState, useEffect, useCallback } from "react";
import "./RiwayatStokBahanKeluar.css";
import API from "../../api";
import { toast } from "react-toastify";
import { FaHistory } from "react-icons/fa";
import { FiCalendar, FiFilter, FiRefreshCw, FiSearch } from "react-icons/fi";

const RiwayatStokBahanKeluar = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [searchInput, setSearchInput] = useState("");
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
        per_page: perPage,
      };

      if (searchSpkCuttingId) {
        params.spk_cutting_id = searchSpkCuttingId;
      }

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
        setData(response.data.data);
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
      const message = err.response?.data?.message || "Gagal mengambil data riwayat stok bahan keluar.";
      setError(message);
      toast.error(message);
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

  const refreshFromFirstPage = () => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      return;
    }
    fetchData();
  };

  const handleSearch = () => {
    setSearchSpkCuttingId(searchInput.trim());
    refreshFromFirstPage();
  };

  const handleTerapkanFilter = () => {
    if (!tanggalMulai && !tanggalAkhir) {
      alert("Silakan pilih tanggal mulai atau tanggal akhir terlebih dahulu.");
      return;
    }
    setFilterAktif(true);
    refreshFromFirstPage();
  };

  const handleResetFilter = () => {
    setTanggalMulai("");
    setTanggalAkhir("");
    setSearchInput("");
    setSearchSpkCuttingId("");
    setFilterAktif(false);
    refreshFromFirstPage();
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= lastPage) {
      setCurrentPage(page);
    }
  };

  const handlePerPageChange = (e) => {
    setPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const formatTanggal = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const dataMulai = totalData === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const dataAkhir = totalData === 0 ? 0 : Math.min(currentPage * perPage, totalData);

  return (
    <div className="riwayat-stok-page">
      <div className="riwayat-stok-shell">
        <header className="riwayat-stok-topbar">
          <div className="riwayat-stok-title-group">
            <div className="riwayat-stok-brand-icon">
              <FaHistory />
            </div>
            <div>
              <h1>Riwayat Stok Bahan Keluar</h1>
              <p>Audit trail pengeluaran bahan berdasarkan scan barcode di setiap SPK Cutting.</p>
            </div>
          </div>

          <div className="riwayat-stok-kpi-grid">
            <div className="riwayat-stok-kpi-card">
              <span>Total Data</span>
              <strong>{totalData}</strong>
            </div>
            <div className="riwayat-stok-kpi-card">
              <span>Halaman</span>
              <strong>
                {currentPage}/{lastPage}
              </strong>
            </div>
            <div className="riwayat-stok-kpi-card">
              <span>Status Filter</span>
              <strong>{filterAktif ? "Aktif" : "Tidak"}</strong>
            </div>
          </div>
        </header>

        <main className="riwayat-stok-main">
          <section className="riwayat-stok-card">
            <div className="riwayat-stok-toolbar">
              <div className="riwayat-stok-input-wrap">
                <FiSearch className="riwayat-stok-input-icon" />
                <input
                  type="text"
                  placeholder="Masukkan SPK Cutting ID..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="riwayat-stok-toolbar-actions">
                <button type="button" className="riwayat-stok-btn riwayat-stok-btn-primary" onClick={handleSearch}>
                  Cari
                </button>
                <button type="button" className="riwayat-stok-btn riwayat-stok-btn-secondary" onClick={handleResetFilter}>
                  <FiRefreshCw />
                  Reset
                </button>
              </div>
            </div>

            <div className="riwayat-stok-filter-panel">
              <div className="riwayat-stok-filter-header">
                <FiFilter className="riwayat-stok-filter-icon" />
                <h3>Filter Tanggal</h3>
              </div>
              <div className="riwayat-stok-filter-inputs">
                <div className="riwayat-stok-form-group">
                  <label>Tanggal Mulai</label>
                  <div className="riwayat-stok-date-wrap">
                    <FiCalendar />
                    <input type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} className="riwayat-stok-date-input" />
                  </div>
                </div>
                <div className="riwayat-stok-form-group">
                  <label>Tanggal Akhir</label>
                  <div className="riwayat-stok-date-wrap">
                    <FiCalendar />
                    <input type="date" value={tanggalAkhir} onChange={(e) => setTanggalAkhir(e.target.value)} className="riwayat-stok-date-input" />
                  </div>
                </div>
                <div className="riwayat-stok-filter-actions">
                  <button type="button" className="riwayat-stok-btn riwayat-stok-btn-primary" onClick={handleTerapkanFilter} disabled={loading}>
                    {loading ? "Memproses..." : "Terapkan"}
                  </button>
                </div>
              </div>

              {filterAktif && (tanggalMulai || tanggalAkhir) && (
                <div className="riwayat-stok-filter-info">
                  {tanggalMulai && tanggalAkhir
                    ? `Filter aktif: ${formatTanggal(tanggalMulai)} - ${formatTanggal(tanggalAkhir)}`
                    : tanggalMulai
                    ? `Filter aktif: dari ${formatTanggal(tanggalMulai)}`
                    : `Filter aktif: sampai ${formatTanggal(tanggalAkhir)}`}
                </div>
              )}
            </div>

            {error && <div className="riwayat-stok-alert error">{error}</div>}

            {loading ? (
              <p className="riwayat-stok-loading">Memuat data...</p>
            ) : data.length === 0 ? (
              <div className="riwayat-stok-empty-state">
                <p>{filterAktif && (tanggalMulai || tanggalAkhir) ? "Tidak ada data pada rentang tanggal yang dipilih." : "Tidak ada data riwayat untuk ditampilkan."}</p>
              </div>
            ) : (
              <>
                <div className="riwayat-stok-table-wrap">
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
                          <td>{formatTanggal(item.scanned_at || item.created_at)}</td>
                          <td>{item.spk_cutting?.id_spk_cutting || "-"}</td>
                          <td>{item.spk_cutting?.produk?.nama_produk || "-"}</td>
                          <td>{item.spk_cutting_bahan?.bagian?.nama_bagian || "-"}</td>
                          <td>{item.spk_cutting_bahan?.bahan?.nama_bahan || "-"}</td>
                          <td>{item.spk_cutting_bahan?.warna || "-"}</td>
                          <td className="riwayat-stok-barcode">{item.barcode || "-"}</td>
                          <td>{item.berat ? `${item.berat} kg` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="riwayat-stok-footer">
                  <div className="riwayat-stok-footer-info">
                    <span>
                      Menampilkan {dataMulai}-{dataAkhir} dari {totalData} data
                    </span>
                    <select value={perPage} onChange={handlePerPageChange}>
                      <option value={10}>10 per halaman</option>
                      <option value={20}>20 per halaman</option>
                      <option value={50}>50 per halaman</option>
                      <option value={100}>100 per halaman</option>
                    </select>
                  </div>

                  {lastPage > 1 && (
                    <div className="riwayat-stok-pagination">
                      <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                        Sebelumnya
                      </button>
                      <span>
                        Halaman {currentPage} dari {lastPage}
                      </span>
                      <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === lastPage}>
                        Berikutnya
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default RiwayatStokBahanKeluar;

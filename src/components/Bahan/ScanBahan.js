import React, { useEffect, useRef, useState } from "react";
import "./ScanBahan.css";
import API from "../../api";
import { FaQrcode } from "react-icons/fa";
import { FiBox, FiCalendar, FiFilter, FiRefreshCw, FiSearch } from "react-icons/fi";

const ScanBahan = () => {
  const scanInputRef = useRef(null);
  const barcodeTimeoutRef = useRef(null);
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanStatus, setScanStatus] = useState("");

  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");
  const [filterAktif, setFilterAktif] = useState(false);
  const [stokLoading, setStokLoading] = useState(false);
  const [stokError, setStokError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchStok();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterAktif]);

  useEffect(() => {
    return () => {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, []);

  const fetchStok = async () => {
    try {
      setStokLoading(true);
      const res = await API.get("/stok-bahan");
      setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (e) {
      setStokError("Gagal memuat data stok.");
    } finally {
      setStokLoading(false);
    }
  };

  const filtered = items.filter((item) => {
    const matchesSearch =
      (item.barcode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.nama_bahan || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.warna || "").toLowerCase().includes(searchTerm.toLowerCase());

    let matchesTanggal = true;
    if (filterAktif && (tanggalMulai || tanggalAkhir)) {
      const scanDate = item.scanned_at ? new Date(item.scanned_at) : null;
      if (scanDate) {
        if (tanggalMulai) {
          const startDate = new Date(tanggalMulai);
          startDate.setHours(0, 0, 0, 0);
          if (scanDate < startDate) {
            matchesTanggal = false;
          }
        }
        if (tanggalAkhir) {
          const endDate = new Date(tanggalAkhir);
          endDate.setHours(23, 59, 59, 999);
          if (scanDate > endDate) {
            matchesTanggal = false;
          }
        }
      } else {
        matchesTanggal = false;
      }
    }

    return matchesSearch && matchesTanggal;
  });

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
    setFilterAktif(false);
    setCurrentPage(1);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const stokMelewatiBatas = items.filter((item) => Number(item.hari_di_gudang) > 30).length;
  const ringkasanHalamanMulai = filtered.length === 0 ? 0 : indexOfFirstItem + 1;
  const ringkasanHalamanAkhir = Math.min(indexOfLastItem, filtered.length);

  const formatTanggal = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleBarcodeChange = (value) => {
    setScanInput(value);

    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length >= 8 && scanStatus !== "loading") {
      barcodeTimeoutRef.current = setTimeout(async () => {
        await processScan(trimmedValue);
      }, 200);
    }
  };

  const processScan = async (barcodeValue = null) => {
    const barcodeToScan = barcodeValue || scanInput.trim();

    if (!barcodeToScan) {
      setScanMessage("Barcode tidak boleh kosong.");
      setScanStatus("error");
      return;
    }

    try {
      setScanStatus("loading");
      const response = await API.post("/stok-bahan/scan", { barcode: barcodeToScan });
      setScanMessage(response.data.message);
      setScanStatus("success");
      setScanInput("");
      fetchStok();
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    } catch (error) {
      const msg = error.response?.data?.message || "Gagal memindai barcode.";
      setScanMessage(msg);
      setScanStatus("error");
    } finally {
      setTimeout(() => setScanStatus(""), 3000);
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    await processScan();
  };

  return (
    <div className="scan-bahan-page">
      <div className="scan-bahan-shell">
        <header className="scan-bahan-topbar">
          <div className="scan-bahan-title-group">
            <div className="scan-bahan-brand-icon">
              <FaQrcode />
            </div>
            <div>
              <h1>Scan Bahan</h1>
              <p>Kontrol stok bahan berbasis scan barcode secara real-time</p>
            </div>
          </div>

          <div className="scan-bahan-kpi-grid">
            <div className="scan-bahan-kpi-card">
              <span>Total Stok</span>
              <strong>{items.length}</strong>
            </div>
            <div className="scan-bahan-kpi-card">
              <span>Hasil Filter</span>
              <strong>{filtered.length}</strong>
            </div>
            <div className="scan-bahan-kpi-card">
              <span>Lewat 30 Hari</span>
              <strong>{stokMelewatiBatas}</strong>
            </div>
          </div>
        </header>

        <main className="scan-bahan-main">
          <section className="scan-bahan-card">
            <div className="scan-bahan-card-header">
              <div className="scan-bahan-card-title">
                <FiBox />
                <h3>Scan Barcode Rol</h3>
              </div>
              <p>Input barcode secara otomatis atau tekan Enter untuk memindai manual.</p>
            </div>

            <form onSubmit={handleScan} className="scan-bahan-scan-form">
              <div className="scan-bahan-input-wrap">
                <FiSearch className="scan-bahan-input-icon" />
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => handleBarcodeChange(e.target.value)}
                  placeholder="Scan barcode rol"
                  className="scan-bahan-input"
                />
              </div>
              <button type="submit" disabled={scanStatus === "loading"} className="scan-bahan-btn scan-bahan-btn-primary">
                {scanStatus === "loading" ? "Memindai..." : "Scan"}
              </button>
            </form>

            {scanMessage && <div className={`scan-bahan-alert ${scanStatus === "error" ? "error" : "success"}`}>{scanMessage}</div>}
          </section>

          <section className="scan-bahan-card">
            <div className="scan-bahan-toolbar">
              <div className="scan-bahan-card-title">
                <FiBox />
                <h3>Daftar Stok Bahan</h3>
              </div>
              <div className="scan-bahan-search-bar">
                <FiSearch className="scan-bahan-search-icon" />
                <input type="text" placeholder="Cari barcode, nama bahan, atau warna..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div className="scan-bahan-filter-tanggal">
              <div className="scan-bahan-filter-tanggal-header">
                <FiFilter className="scan-bahan-filter-icon" />
                <h4>Filter Tanggal Scan</h4>
              </div>
              <div className="scan-bahan-filter-tanggal-inputs">
                <div className="scan-bahan-form-group">
                  <label>Tanggal Mulai</label>
                  <div className="scan-bahan-date-wrap">
                    <FiCalendar />
                    <input type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} className="scan-bahan-date-input" />
                  </div>
                </div>
                <div className="scan-bahan-form-group">
                  <label>Tanggal Akhir</label>
                  <div className="scan-bahan-date-wrap">
                    <FiCalendar />
                    <input type="date" value={tanggalAkhir} onChange={(e) => setTanggalAkhir(e.target.value)} className="scan-bahan-date-input" />
                  </div>
                </div>
                <div className="scan-bahan-filter-tanggal-actions">
                  <button type="button" className="scan-bahan-btn scan-bahan-btn-primary" onClick={handleTerapkanFilter} disabled={stokLoading}>
                    {stokLoading ? "Memproses..." : "Terapkan"}
                  </button>
                  <button type="button" className="scan-bahan-btn scan-bahan-btn-secondary" onClick={handleResetFilter} disabled={stokLoading}>
                    <FiRefreshCw />
                    Reset
                  </button>
                </div>
              </div>

              {filterAktif && (tanggalMulai || tanggalAkhir) && (
                <div className="scan-bahan-filter-info">
                  {tanggalMulai && tanggalAkhir
                    ? `Filter aktif: ${formatTanggal(tanggalMulai)} - ${formatTanggal(tanggalAkhir)}`
                    : tanggalMulai
                    ? `Filter aktif: dari ${formatTanggal(tanggalMulai)}`
                    : `Filter aktif: sampai ${formatTanggal(tanggalAkhir)}`}
                </div>
              )}
            </div>

            {stokLoading ? (
              <p className="scan-bahan-loading">Memuat data stok...</p>
            ) : stokError ? (
              <p className="scan-bahan-error">{stokError}</p>
            ) : (
              <>
                <div className="scan-bahan-table-wrap">
                  <table className="scan-bahan-table">
                    <thead>
                      <tr>
                        <th className="table-no">No</th>
                        <th>Nama Bahan</th>
                        <th>Warna</th>
                        <th>Barcode</th>
                        <th>Berat (Kg)</th>
                        <th>Hari di Gudang</th>
                        <th>Tanggal Scan</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="empty-state">
                            Tidak ada data stok yang sesuai filter.
                          </td>
                        </tr>
                      ) : (
                        currentItems.map((item, index) => {
                          const hariDiGudang = Number(item.hari_di_gudang);
                          const badgeHari =
                            !Number.isFinite(hariDiGudang) || hariDiGudang < 0
                              ? "scan-bahan-pill-neutral"
                              : hariDiGudang > 30
                              ? "scan-bahan-pill-danger"
                              : hariDiGudang > 15
                              ? "scan-bahan-pill-warning"
                              : "scan-bahan-pill-fresh";
                          const normalizedStatus = String(item.status || "tersedia").toLowerCase();
                          const statusClass = normalizedStatus.includes("tidak") ? "scan-bahan-pill-tidak-tersedia" : "scan-bahan-pill-tersedia";

                          return (
                            <tr key={item.id}>
                              <td className="table-no">{indexOfFirstItem + index + 1}</td>
                              <td className="table-nama-bahan">{item.nama_bahan || "-"}</td>
                              <td>{item.warna || "-"}</td>
                              <td className="table-barcode">{item.barcode || "-"}</td>
                              <td>{item.berat || "-"}</td>
                              <td>
                                <span className={`scan-bahan-pill ${badgeHari}`}>{Number.isFinite(hariDiGudang) && hariDiGudang >= 0 ? `${hariDiGudang} hari` : "-"}</span>
                              </td>
                              <td>{formatTanggal(item.scanned_at)}</td>
                              <td>
                                <span className={`scan-bahan-pill ${statusClass}`}>{item.status || "tersedia"}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="scan-bahan-table-footer">
                  <p>
                    Menampilkan {ringkasanHalamanMulai}-{ringkasanHalamanAkhir} dari {filtered.length} data
                  </p>
                  {totalPages > 1 && (
                    <div className="scan-bahan-pagination">
                      <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                        Sebelumnya
                      </button>

                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        return (
                          <button key={page} className={currentPage === page ? "active" : ""} onClick={() => goToPage(page)}>
                            {page}
                          </button>
                        );
                      })}

                      <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
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

export default ScanBahan;

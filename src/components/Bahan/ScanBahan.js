import React, { useEffect, useRef, useState } from "react";
import "./ScanBahan.css";
import API from "../../api";
import { FaQrcode, FaChevronDown, FaChevronUp } from "react-icons/fa";

const ScanBahan = () => {
  const scanInputRef = useRef(null);
  const barcodeTimeoutRef = useRef(null);
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanStatus, setScanStatus] = useState("");

  // State untuk tabel stok
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stokLoading, setStokLoading] = useState(false);
  const [stokError, setStokError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchStok();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Cleanup timeout saat component unmount
  useEffect(() => {
    return () => {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, []);

  // === FETCH STOK DATA ===
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

  // === PAGINATION ===
  const filtered = items.filter(
    (item) => (item.barcode || "").toLowerCase().includes(searchTerm.toLowerCase()) || (item.nama_bahan || "").toLowerCase().includes(searchTerm.toLowerCase()) || (item.warna || "").toLowerCase().includes(searchTerm.toLowerCase())
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

  // === TOGGLE EXPAND DETAIL ===
  const toggleExpand = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Handle scan barcode - auto trigger saat input berubah
  const handleBarcodeChange = (value) => {
    setScanInput(value);

    // Clear timeout sebelumnya jika ada
    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }

    const trimmedValue = value.trim();

    // Auto trigger jika barcode sudah lengkap (biasanya barcode scanner mengirim data dengan cepat)
    // Barcode biasanya panjangnya minimal 8 karakter
    if (trimmedValue.length >= 8 && scanStatus !== "loading") {
      // Delay kecil untuk memastikan semua karakter sudah ter-input dari scanner
      barcodeTimeoutRef.current = setTimeout(async () => {
        // Langsung proses karena sudah validasi panjang
        await processScan(trimmedValue);
      }, 200); // Delay 200ms untuk respons lebih cepat
    }
  };

  // Proses scan barcode (dipanggil dari auto-submit atau manual submit)
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
      // Refresh tabel stok setelah scan berhasil
      fetchStok();
      // Focus kembali ke input scan
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

  // Handle form submit (manual dengan Enter atau button)
  const handleScan = async (e) => {
    e.preventDefault();
    await processScan();
  };

  return (
    <div className="scan-bahan-page">
      <div className="scan-bahan-header">
        <div className="scan-bahan-header-icon">
          <FaQrcode />
        </div>
        <h1>Scan Bahan</h1>
      </div>

      {/* Card Scan Barcode */}
      <div className="scan-bahan-table-container">
        <div className="scan-bahan-filter-header">
          <h3 style={{ margin: 0, color: "#17457c" }}>Scan Barcode Rol</h3>
        </div>
        <form onSubmit={handleScan} className="scan-bahan-form" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <input
            ref={scanInputRef}
            type="text"
            value={scanInput}
            onChange={(e) => handleBarcodeChange(e.target.value)}
            placeholder="Scan barcode rol - otomatis terdeteksi"
            className="scan-bahan-form-group"
            style={{ flex: 1, padding: "12px 14px", border: "2px solid #b3d9f2", borderRadius: "10px" }}
          />
          <button type="submit" disabled={scanStatus === "loading"} className="scan-bahan-btn scan-bahan-btn-primary">
            {scanStatus === "loading" ? "Memindai..." : "Scan"}
          </button>
        </form>

        {scanMessage && (
          <div
            className={`scan-bahan-loading ${scanStatus === "error" ? "scan-bahan-error" : ""}`}
            style={{ padding: "15px", marginBottom: "20px", borderRadius: "8px", background: scanStatus === "error" ? "#ffebee" : "#e3f2fd", color: scanStatus === "error" ? "#f44336" : "#17457c" }}
          >
            {scanMessage}
          </div>
        )}
      </div>

      {/* Card Tabel Stok Bahan */}
      <div className="scan-bahan-table-container">
        <div className="scan-bahan-filter-header">
          <h3 style={{ margin: 0, color: "#17457c" }}>Daftar Stok Bahan</h3>
          <div className="scan-bahan-search-bar">
            <input type="text" placeholder="Cari barcode, nama bahan, atau warna..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {stokLoading ? (
          <p className="scan-bahan-loading">Memuat data stok...</p>
        ) : stokError ? (
          <p className="scan-bahan-error">{stokError}</p>
        ) : (
          <>
            <table className="scan-bahan-table">
              <thead>
                <tr>
                  <th>NO</th>
                  <th>NAMA BAHAN</th>
                  <th>WARNA</th>
                  <th>BARCODE</th>
                  <th>BERAT (KG)</th>
                  <th>HARI DI GUDANG</th>
                  <th>TANGGAL SCAN</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "center" }}>DETAIL</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-state">
                      <div className="empty-icon">📦</div>
                      Tidak ada data stok
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => {
                    const isExpanded = expandedItems[item.id];
                    return (
                      <React.Fragment key={item.id}>
                        <tr>
                          <td className="table-no">{indexOfFirstItem + index + 1}</td>
                          <td className="table-nama-bahan">{item.nama_bahan || "-"}</td>
                          <td>{item.warna || "-"}</td>
                          <td className="table-barcode">{item.barcode}</td>
                          <td className="table-berat">{item.berat || "-"}</td>
                          <td>
                            <span className={`badge badge-hari ${item.hari_di_gudang > 30 ? "danger" : item.hari_di_gudang > 15 ? "warning" : "fresh"}`}>{item.hari_di_gudang} hari</span>
                          </td>
                          <td>{item.scanned_at ? new Date(item.scanned_at).toLocaleDateString("id-ID") : "-"}</td>
                          <td>
                            <span className={`badge badge-status ${(item.status || "tersedia") === "tersedia" ? "tersedia" : "tidak-tersedia"}`}>{item.status || "tersedia"}</span>
                          </td>
                          <td className="detail-button-cell">
                            <button onClick={() => toggleExpand(item.id)} className={`detail-button ${isExpanded ? "expanded" : ""}`} title="Lihat detail">
                              {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan="9" className="detail-expanded">
                              <div className="detail-content">
                                <div className="detail-title">
                                  <div className="detail-title-bar" />
                                  <h4>Detail Stok - {item.nama_bahan || item.barcode}</h4>
                                </div>
                                <div className="detail-grid">
                                  <div className="detail-card barcode">
                                    <strong>Barcode</strong>
                                    <p>{item.barcode || "-"}</p>
                                  </div>
                                  <div className="detail-card">
                                    <strong>Nama Bahan</strong>
                                    <p>{item.nama_bahan || "-"}</p>
                                  </div>
                                  <div className="detail-card">
                                    <strong>Warna</strong>
                                    <p>{item.warna || "-"}</p>
                                  </div>
                                  <div className="detail-card berat">
                                    <strong>Berat</strong>
                                    <p>{item.berat ? `${item.berat} kg` : "-"}</p>
                                  </div>
                                  <div className="detail-card">
                                    <strong>Nama Pabrik</strong>
                                    <p>{item.nama_pabrik || "-"}</p>
                                  </div>
                                  <div className="detail-card">
                                    <strong>Nama Gudang</strong>
                                    <p>{item.nama_gudang || "-"}</p>
                                  </div>
                                  <div className="detail-card">
                                    <strong>Hari di Gudang</strong>
                                    <p>{item.hari_di_gudang !== undefined ? `${item.hari_di_gudang} hari` : "-"}</p>
                                  </div>
                                  <div className="detail-card">
                                    <strong>Tanggal Scan</strong>
                                    <p>
                                      {item.scanned_at
                                        ? new Date(item.scanned_at).toLocaleString("id-ID", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : "-"}
                                    </p>
                                  </div>
                                  <div className="detail-card">
                                    <strong>Status</strong>
                                    <p>
                                      <span className={`badge badge-status ${(item.status || "tersedia") === "tersedia" ? "tersedia" : "tidak-tersedia"}`}>{item.status || "tersedia"}</span>
                                    </p>
                                  </div>
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
              <div className="scan-bahan-pagination">
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  Previous
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

export default ScanBahan;

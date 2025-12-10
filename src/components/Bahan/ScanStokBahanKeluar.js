import React, { useState, useRef, useEffect } from "react";
import "./ScanStokBahanKeluar.css";
import API from "../../api";
import { toast } from "react-toastify";
import { FaBarcode } from "react-icons/fa";

const ScanStokBahanKeluar = () => {
  const [spkCuttingId, setSpkCuttingId] = useState("");
  const [spkCuttingBarcode, setSpkCuttingBarcode] = useState("");
  const [spkCuttingDetail, setSpkCuttingDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [barcode, setBarcode] = useState("");
  const [selectedBahan, setSelectedBahan] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);
  const [scanMode, setScanMode] = useState("id"); // "id" atau "barcode"
  const [scanProgress, setScanProgress] = useState({}); // { spk_cutting_bahan_id: jumlah_scan }
  const barcodeTimeoutRef = useRef(null);
  const spkBarcodeTimeoutRef = useRef(null);

  // Cleanup timeout saat component unmount
  useEffect(() => {
    return () => {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
      if (spkBarcodeTimeoutRef.current) {
        clearTimeout(spkBarcodeTimeoutRef.current);
      }
    };
  }, []);

  // Fetch detail SPK Cutting
  const fetchSpkCuttingDetail = async (inputValue = null) => {
    const searchValue = inputValue || (scanMode === "barcode" ? spkCuttingBarcode : spkCuttingId);

    if (!searchValue || searchValue.trim() === "") {
      setError(scanMode === "barcode" ? "Masukkan atau scan barcode SPK Cutting terlebih dahulu" : "Masukkan SPK Cutting ID terlebih dahulu");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSpkCuttingDetail(null);
      setSelectedBahan(null);
      setScanResult(null);
      setScannedItems([]);
      setScanProgress({});

      const response = await API.get(`/stok-bahan-keluar/spk-cutting/${searchValue.trim()}`);
      setSpkCuttingDetail(response.data);

      if (response.data.bahan_detail && response.data.bahan_detail.length > 0) {
        // Auto select bahan pertama jika hanya ada 1
        if (response.data.bahan_detail.length === 1) {
          setSelectedBahan(response.data.bahan_detail[0]);
        }
      }

      // Reset input setelah berhasil
      if (scanMode === "barcode") {
        setSpkCuttingBarcode("");
      } else {
        setSpkCuttingId("");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengambil detail SPK Cutting");
      setSpkCuttingDetail(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle scan barcode SPK Cutting - auto trigger saat input berubah
  const handleSpkCuttingBarcodeChange = (value) => {
    setSpkCuttingBarcode(value);

    // Clear timeout sebelumnya jika ada
    if (spkBarcodeTimeoutRef.current) {
      clearTimeout(spkBarcodeTimeoutRef.current);
    }

    const trimmedValue = value.trim();

    // Auto trigger jika barcode sudah lengkap (dimulai dengan SPKC- dan panjangnya cukup)
    if (trimmedValue.startsWith("SPKC-") && trimmedValue.length >= 10 && !loading) {
      // Delay kecil untuk memastikan semua karakter sudah ter-input dari scanner
      spkBarcodeTimeoutRef.current = setTimeout(async () => {
        // Langsung proses karena sudah validasi format dan panjang
        await fetchSpkCuttingDetail(trimmedValue);
      }, 200); // Kurangi delay menjadi 200ms untuk respons lebih cepat
    }
  };

  // Handle Enter key (opsional, untuk manual input)
  const handleScanSpkCuttingBarcode = async (e) => {
    if (e.key === "Enter" && spkCuttingBarcode.trim() !== "") {
      await fetchSpkCuttingDetail(spkCuttingBarcode.trim());
    }
  };

  // Handle scan barcode bahan - auto trigger saat input berubah
  const handleBarcodeChange = (value) => {
    // Set barcode ke state untuk ditampilkan di input
    setBarcode(value);

    // Clear timeout sebelumnya jika ada
    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }

    const trimmedValue = value.trim();

    // Auto trigger jika barcode sudah lengkap (biasanya barcode scanner mengirim data dengan cepat)
    // Barcode biasanya panjangnya minimal 8 karakter
    if (trimmedValue.length >= 8 && !loading && selectedBahan) {
      // Delay kecil untuk memastikan semua karakter sudah ter-input dari scanner
      barcodeTimeoutRef.current = setTimeout(async () => {
        // Langsung proses karena sudah validasi panjang
        // scanBarcode akan handle clear barcode jika error
        await scanBarcode(trimmedValue);
      }, 200); // Kurangi delay menjadi 200ms untuk respons lebih cepat
    }
  };

  // Handle Enter key (opsional, untuk manual input)
  const handleScanBarcode = async (e) => {
    if (e.key === "Enter" && barcode.trim() !== "") {
      await scanBarcode(barcode.trim());
    }
  };

  const scanBarcode = async (barcodeValue = null) => {
    const barcodeToScan = barcodeValue || barcode;

    if (!selectedBahan) {
      toast.error("Pilih bahan terlebih dahulu");
      // Clear barcode dari input
      setBarcode("");
      return;
    }

    if (!barcodeToScan || barcodeToScan.trim() === "") {
      toast.error("Masukkan barcode terlebih dahulu");
      // Clear barcode dari input
      setBarcode("");
      return;
    }

    // Cek apakah sudah mencapai QTY yang diperlukan
    const currentProgress = scanProgress[selectedBahan.spk_cutting_bahan_id] || 0;
    const requiredQty = selectedBahan.qty || 0;

    if (currentProgress >= requiredQty) {
      toast.warning(`QTY (ROL) untuk bahan ini sudah terpenuhi (${currentProgress}/${requiredQty}). Pilih bahan lain atau reset untuk scan ulang.`);
      // Clear barcode dari input
      setBarcode("");
      // Auto focus kembali ke input
      setTimeout(() => {
        document.getElementById("barcode-input")?.focus();
      }, 100);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!spkCuttingDetail?.spk_cutting?.id) {
        toast.error("Data SPK Cutting tidak valid");
        return;
      }

      const response = await API.post("/stok-bahan-keluar/scan", {
        spk_cutting_id: spkCuttingDetail.spk_cutting.id,
        spk_cutting_bahan_id: selectedBahan.spk_cutting_bahan_id,
        barcode: barcodeToScan.trim(),
      });

      if (response.data.valid) {
        const newProgress = currentProgress + 1;

        // Update progress
        setScanProgress((prev) => ({
          ...prev,
          [selectedBahan.spk_cutting_bahan_id]: newProgress,
        }));

        // Tampilkan pesan sesuai progress
        if (newProgress < requiredQty) {
          toast.success(`${response.data.message || "Barcode berhasil divalidasi"} (${newProgress}/${requiredQty})`);
        } else {
          toast.success(`✓ Lengkap! ${response.data.message || "Barcode berhasil divalidasi"} (${newProgress}/${requiredQty})`);
        }

        setScanResult({
          success: true,
          message: response.data.message,
          data: response.data.data,
        });

        // Tambahkan ke list scanned items
        setScannedItems((prev) => [...prev, response.data.data]);

        // Reset barcode untuk scan berikutnya (HANYA jika sukses)
        setBarcode("");

        // Auto focus ke input barcode jika belum lengkap
        if (newProgress < requiredQty) {
          document.getElementById("barcode-input")?.focus();
        }
      } else {
        // Jika validasi gagal, clear barcode dari input dan tampilkan error
        setBarcode("");
        toast.error(response.data.message || "Validasi gagal");
        setScanResult({
          success: false,
          message: response.data.message,
        });
        // Auto focus kembali ke input untuk scan berikutnya
        setTimeout(() => {
          document.getElementById("barcode-input")?.focus();
        }, 100);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Gagal memvalidasi barcode";
      // Jika error, clear barcode dari input
      setBarcode("");
      toast.error(errorMessage);
      setError(errorMessage);
      setScanResult({
        success: false,
        message: errorMessage,
      });
      // Auto focus kembali ke input untuk scan berikutnya
      setTimeout(() => {
        document.getElementById("barcode-input")?.focus();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scan-stok-page">
      <div className="scan-stok-header">
        <div className="scan-stok-header-icon">
          <FaBarcode />
        </div>
        <h1>Scan Stok Bahan Keluar</h1>
      </div>

      <div className="scan-stok-table-container">
        <div className="scan-stok-filter-header">
          {/* Toggle Mode */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "center" }}>
            <button
              className={scanMode === "id" ? "scan-stok-btn-primary" : "scan-stok-btn-secondary"}
              onClick={() => {
                setScanMode("id");
                setSpkCuttingId("");
                setSpkCuttingBarcode("");
                setSpkCuttingDetail(null);
              }}
              style={{ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer" }}
            >
              Input Manual
            </button>
            <button
              className={scanMode === "barcode" ? "scan-stok-btn-primary" : "scan-stok-btn-secondary"}
              onClick={() => {
                setScanMode("barcode");
                setSpkCuttingId("");
                setSpkCuttingBarcode("");
                setSpkCuttingDetail(null);
              }}
              style={{ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer" }}
            >
              Scan Barcode SPK
            </button>
          </div>

          {/* Input berdasarkan mode - berada di bawah tombol */}
          {scanMode === "barcode" ? (
            <div className="scan-stok-search-bar" style={{ marginTop: "10px" }}>
              <input type="text" placeholder="Scan barcode SPK Cutting (SPKC-XXXXXXXX)" value={spkCuttingBarcode} onChange={(e) => handleSpkCuttingBarcodeChange(e.target.value)} onKeyDown={handleScanSpkCuttingBarcode} autoFocus />
              <button className="scan-stok-btn-primary" onClick={() => fetchSpkCuttingDetail(spkCuttingBarcode.trim())} disabled={loading || !spkCuttingBarcode.trim()}>
                {loading ? "Loading..." : "Cari SPK Cutting"}
              </button>
            </div>
          ) : (
            <div className="scan-stok-search-bar" style={{ marginTop: "10px" }}>
              <input
                type="text"
                placeholder="Masukkan SPK Cutting ID atau Nomor Seri (contoh: NR-01)"
                value={spkCuttingId}
                onChange={(e) => setSpkCuttingId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchSpkCuttingDetail(spkCuttingId.trim())}
                autoFocus
              />
              <button className="scan-stok-btn-primary" onClick={() => fetchSpkCuttingDetail(spkCuttingId.trim())} disabled={loading || !spkCuttingId.trim()}>
                {loading ? "Loading..." : "Cari SPK Cutting"}
              </button>
            </div>
          )}
        </div>

        {error && <p className="scan-stok-error">{error}</p>}

        {/* Detail SPK Cutting */}
        {spkCuttingDetail && (
          <div className="scan-stok-detail-section">
            <h3>SPK Cutting #{spkCuttingDetail.spk_cutting?.id_spk_cutting}</h3>
            <div className="scan-stok-detail-grid">
              <div className="scan-stok-detail-item">
                <strong>Nama Produk</strong>
                <span>{spkCuttingDetail.spk_cutting?.nama_produk || "-"}</span>
              </div>
            </div>

            {/* List Bahan */}
            <h4 style={{ marginBottom: "15px", marginTop: "20px", color: "#17457c" }}>Daftar Bahan:</h4>
            <table className="scan-stok-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Bagian</th>
                  <th>Nama Bahan</th>
                  <th>Warna</th>
                  <th>Qty (Rol)</th>
                  <th>Berat</th>
                  <th>Pilih</th>
                </tr>
              </thead>
              <tbody>
                {spkCuttingDetail.bahan_detail?.map((bahan, index) => (
                  <tr
                    key={bahan.spk_cutting_bahan_id}
                    style={{
                      backgroundColor: selectedBahan?.spk_cutting_bahan_id === bahan.spk_cutting_bahan_id ? "#e3f2fd" : "",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedBahan(bahan)}
                  >
                    <td>{index + 1}</td>
                    <td>{bahan.nama_bagian}</td>
                    <td>{bahan.nama_bahan || "-"}</td>
                    <td>{bahan.warna || "-"}</td>
                    <td>{bahan.qty}</td>
                    <td>{bahan.berat ? `${bahan.berat} kg` : "-"}</td>
                    <td>
                      {selectedBahan?.spk_cutting_bahan_id === bahan.spk_cutting_bahan_id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ color: "#28a745", fontWeight: "bold" }}>✓ Dipilih</span>
                          {(() => {
                            const progress = scanProgress[bahan.spk_cutting_bahan_id] || 0;
                            const qty = bahan.qty || 0;
                            const isComplete = progress >= qty;
                            return (
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: isComplete ? "#28a745" : "#ff9800",
                                  fontWeight: "600",
                                }}
                              >
                                {progress}/{qty} {isComplete ? "✓" : ""}
                              </span>
                            );
                          })()}
                        </div>
                      ) : (
                        <button
                          className="btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBahan(bahan);
                          }}
                        >
                          Pilih
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Scan Barcode Section */}
            {selectedBahan &&
              (() => {
                const currentProgress = scanProgress[selectedBahan.spk_cutting_bahan_id] || 0;
                const requiredQty = selectedBahan.qty || 0;
                const isComplete = currentProgress >= requiredQty;
                const progressPercentage = requiredQty > 0 ? (currentProgress / requiredQty) * 100 : 0;

                return (
                  <div className="scan-stok-scan-section">
                    <div className="scan-stok-detail-grid" style={{ marginBottom: "15px" }}>
                      <div className="scan-stok-detail-item">
                        <strong>Bahan yang dipilih</strong>
                        <span>{selectedBahan.nama_bahan}</span>
                      </div>
                      <div className="scan-stok-detail-item">
                        <strong>Warna</strong>
                        <span>{selectedBahan.warna || "-"}</span>
                      </div>
                      <div className="scan-stok-detail-item">
                        <strong>Progress Scan</strong>
                        <span
                          style={{
                            color: isComplete ? "#28a745" : "#0487d8",
                            fontWeight: "bold",
                            fontSize: "16px",
                          }}
                        >
                          {currentProgress} / {requiredQty} Roll
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: "20px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                          fontSize: "14px",
                          color: "#666",
                        }}
                      >
                        <span>Progress Scanning</span>
                        <span style={{ fontWeight: "600" }}>
                          {currentProgress} dari {requiredQty} roll
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "24px",
                          backgroundColor: "#e0e0e0",
                          borderRadius: "12px",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            width: `${progressPercentage}%`,
                            height: "100%",
                            backgroundColor: isComplete ? "#28a745" : "#0487d8",
                            transition: "width 0.3s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "12px",
                            fontWeight: "600",
                          }}
                        >
                          {isComplete && "✓ Lengkap"}
                        </div>
                      </div>
                      {isComplete && (
                        <p
                          style={{
                            marginTop: "8px",
                            color: "#28a745",
                            fontWeight: "600",
                            fontSize: "14px",
                          }}
                        >
                          ✓ Semua roll untuk bahan ini sudah di-scan
                        </p>
                      )}
                    </div>
                    <div className="scan-stok-form-group">
                      <label>Scan Barcode Bahan</label>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          scanBarcode();
                        }}
                        style={{ display: "flex", gap: "10px" }}
                      >
                        <input
                          id="barcode-input"
                          type="text"
                          placeholder={isComplete ? "QTY sudah terpenuhi, tidak bisa scan lagi" : "Scan barcode bahan - otomatis terdeteksi"}
                          value={barcode}
                          onChange={(e) => handleBarcodeChange(e.target.value)}
                          onKeyDown={handleScanBarcode}
                          autoFocus={!isComplete}
                          disabled={isComplete}
                          style={{
                            flex: 1,
                            padding: "12px 14px",
                            border: `2px solid ${isComplete ? "#28a745" : "#b3d9f2"}`,
                            borderRadius: "10px",
                            backgroundColor: isComplete ? "#f5f5f5" : "white",
                            cursor: isComplete ? "not-allowed" : "text",
                          }}
                        />
                        <button
                          type="submit"
                          className="scan-stok-btn-primary"
                          disabled={loading || !barcode.trim() || isComplete}
                          style={{
                            opacity: isComplete ? 0.6 : 1,
                            cursor: isComplete ? "not-allowed" : "pointer",
                          }}
                        >
                          {loading ? "Memvalidasi..." : isComplete ? "Lengkap" : "Scan"}
                        </button>
                      </form>
                    </div>

                    {/* Scan Result */}
                    {scanResult && (
                      <p
                        className={scanResult.success ? "scan-stok-loading" : "scan-stok-error"}
                        style={{ padding: "15px", marginTop: "15px", borderRadius: "8px", background: scanResult.success ? "#e3f2fd" : "#ffebee", color: scanResult.success ? "#17457c" : "#f44336" }}
                      >
                        <strong>{scanResult.success ? "✓ Berhasil" : "✗ Gagal"}</strong> - {scanResult.message}
                      </p>
                    )}
                  </div>
                );
              })()}

            {/* List Scanned Items */}
            {scannedItems.length > 0 &&
              (() => {
                // Filter scanned items berdasarkan bahan yang dipilih jika ada
                const filteredScannedItems = selectedBahan
                  ? scannedItems.filter((item) => {
                      // Asumsikan ada relasi untuk memfilter berdasarkan spk_cutting_bahan_id
                      // Jika tidak ada, tampilkan semua
                      return true; // Untuk sementara tampilkan semua, bisa disesuaikan dengan struktur data backend
                    })
                  : scannedItems;

                return (
                  <div style={{ marginTop: "30px" }}>
                    <h4 style={{ marginBottom: "15px", color: "#17457c" }}>
                      Barcode yang Berhasil Di-scan
                      {selectedBahan && (
                        <span style={{ fontSize: "14px", color: "#666", marginLeft: "10px" }}>
                          ({scanProgress[selectedBahan.spk_cutting_bahan_id] || 0} dari {selectedBahan.qty} roll)
                        </span>
                      )}
                    </h4>
                    {filteredScannedItems.length > 0 ? (
                      <table className="scan-stok-table">
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Barcode</th>
                            <th>Bahan</th>
                            <th>Warna</th>
                            <th>Berat</th>
                            <th>Waktu Scan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredScannedItems.map((item, index) => (
                            <tr key={item.id || index}>
                              <td>{index + 1}</td>
                              <td>{item.barcode}</td>
                              <td>{item.stok_bahan?.pembelian_bahan?.bahan?.nama_bahan || "-"}</td>
                              <td>{item.stok_bahan?.warna?.warna || "-"}</td>
                              <td>{item.berat ? `${item.berat} kg` : "-"}</td>
                              <td>{item.scanned_at ? new Date(item.scanned_at).toLocaleString("id-ID") : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ color: "#666", fontStyle: "italic" }}>Belum ada barcode yang di-scan untuk bahan ini.</p>
                    )}
                  </div>
                );
              })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanStokBahanKeluar;

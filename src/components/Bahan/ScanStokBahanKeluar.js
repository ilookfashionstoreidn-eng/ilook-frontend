import React, { useState, useRef, useEffect } from "react";
import "./ScanStokBahanKeluar.css";
import API from "../../api";
import { toast } from "react-toastify";
import { FaBarcode } from "react-icons/fa";
import { FiBox, FiCheckCircle, FiSearch, FiTarget } from "react-icons/fi";

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
  const [scanMode, setScanMode] = useState("id");
  const [scanProgress, setScanProgress] = useState({});
  const barcodeTimeoutRef = useRef(null);
  const spkBarcodeTimeoutRef = useRef(null);

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

  const fetchSpkCuttingDetail = async (inputValue = null) => {
    const searchValue = inputValue || (scanMode === "barcode" ? spkCuttingBarcode : spkCuttingId);

    if (!searchValue || searchValue.trim() === "") {
      setError(scanMode === "barcode" ? "Masukkan atau scan barcode SPK Cutting terlebih dahulu." : "Masukkan SPK Cutting ID terlebih dahulu.");
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

      if (response.data.bahan_detail && response.data.bahan_detail.length === 1) {
        setSelectedBahan(response.data.bahan_detail[0]);
      }

      if (scanMode === "barcode") {
        setSpkCuttingBarcode("");
      } else {
        setSpkCuttingId("");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengambil detail SPK Cutting.");
      setSpkCuttingDetail(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSpkCuttingBarcodeChange = (value) => {
    setSpkCuttingBarcode(value);

    if (spkBarcodeTimeoutRef.current) {
      clearTimeout(spkBarcodeTimeoutRef.current);
    }

    const trimmedValue = value.trim();

    if (trimmedValue.startsWith("SPKC-") && trimmedValue.length >= 10 && !loading) {
      spkBarcodeTimeoutRef.current = setTimeout(async () => {
        await fetchSpkCuttingDetail(trimmedValue);
      }, 200);
    }
  };

  const handleScanSpkCuttingBarcode = async (e) => {
    if (e.key === "Enter" && spkCuttingBarcode.trim() !== "") {
      await fetchSpkCuttingDetail(spkCuttingBarcode.trim());
    }
  };

  const handleBarcodeChange = (value) => {
    setBarcode(value);

    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length >= 8 && !loading && selectedBahan) {
      barcodeTimeoutRef.current = setTimeout(async () => {
        await scanBarcode(trimmedValue);
      }, 200);
    }
  };

  const handleScanBarcode = async (e) => {
    if (e.key === "Enter" && barcode.trim() !== "") {
      await scanBarcode(barcode.trim());
    }
  };

  const scanBarcode = async (barcodeValue = null) => {
    const barcodeToScan = barcodeValue || barcode;

    if (!selectedBahan) {
      toast.error("Pilih bahan terlebih dahulu.");
      setBarcode("");
      return;
    }

    if (!barcodeToScan || barcodeToScan.trim() === "") {
      toast.error("Masukkan barcode terlebih dahulu.");
      setBarcode("");
      return;
    }

    const currentProgress = scanProgress[selectedBahan.spk_cutting_bahan_id] || 0;
    const requiredQty = selectedBahan.qty || 0;

    if (currentProgress >= requiredQty) {
      toast.warning(`QTY untuk bahan ini sudah terpenuhi (${currentProgress}/${requiredQty}).`);
      setBarcode("");
      setTimeout(() => {
        document.getElementById("barcode-input")?.focus();
      }, 100);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!spkCuttingDetail?.spk_cutting?.id) {
        toast.error("Data SPK Cutting tidak valid.");
        return;
      }

      const response = await API.post("/stok-bahan-keluar/scan", {
        spk_cutting_id: spkCuttingDetail.spk_cutting.id,
        spk_cutting_bahan_id: selectedBahan.spk_cutting_bahan_id,
        barcode: barcodeToScan.trim(),
      });

      if (response.data.valid) {
        const newProgress = currentProgress + 1;

        setScanProgress((prev) => ({
          ...prev,
          [selectedBahan.spk_cutting_bahan_id]: newProgress,
        }));

        if (newProgress < requiredQty) {
          toast.success(`${response.data.message || "Barcode berhasil divalidasi"} (${newProgress}/${requiredQty})`);
        } else {
          toast.success(`Lengkap. ${response.data.message || "Barcode berhasil divalidasi"} (${newProgress}/${requiredQty})`);
        }

        setScanResult({
          success: true,
          message: response.data.message,
          data: response.data.data,
        });

        setScannedItems((prev) => [...prev, response.data.data]);
        setBarcode("");

        if (newProgress < requiredQty) {
          document.getElementById("barcode-input")?.focus();
        }
      } else {
        setBarcode("");
        toast.error(response.data.message || "Validasi gagal.");
        setScanResult({
          success: false,
          message: response.data.message,
        });
        setTimeout(() => {
          document.getElementById("barcode-input")?.focus();
        }, 100);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Gagal memvalidasi barcode.";
      setBarcode("");
      toast.error(errorMessage);
      setError(errorMessage);
      setScanResult({
        success: false,
        message: errorMessage,
      });
      setTimeout(() => {
        document.getElementById("barcode-input")?.focus();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const totalBahan = spkCuttingDetail?.bahan_detail?.length || 0;
  const selectedProgress = selectedBahan ? scanProgress[selectedBahan.spk_cutting_bahan_id] || 0 : 0;

  return (
    <div className="scan-stok-page">
      <div className="scan-stok-shell">
        <header className="scan-stok-topbar">
          <div className="scan-stok-title-group">
            <div className="scan-stok-brand-icon">
              <FaBarcode />
            </div>
            <div>
              <h1>Scan Stok Bahan Keluar</h1>
              <p>Validasi pengeluaran bahan berdasarkan SPK Cutting dengan kontrol progres real-time.</p>
            </div>
          </div>

          <div className="scan-stok-kpi-grid">
            <div className="scan-stok-kpi-card">
              <span>Mode Input</span>
              <strong>{scanMode === "barcode" ? "Barcode" : "Manual"}</strong>
            </div>
            <div className="scan-stok-kpi-card">
              <span>Total Bahan</span>
              <strong>{totalBahan}</strong>
            </div>
            <div className="scan-stok-kpi-card">
              <span>Progress Aktif</span>
              <strong>{selectedProgress}</strong>
            </div>
          </div>
        </header>

        <main className="scan-stok-main">
          <section className="scan-stok-card">
            <div className="scan-stok-card-header">
              <div className="scan-stok-card-title">
                <FiTarget />
                <h3>Identifikasi SPK Cutting</h3>
              </div>
              <p>Pilih metode identifikasi SPK, lalu lanjutkan ke pemindaian barcode bahan.</p>
            </div>

            <div className="scan-stok-mode-toggle" role="group" aria-label="Pilih mode input SPK">
              <button
                type="button"
                className={`scan-stok-toggle-btn ${scanMode === "id" ? "active" : ""}`}
                onClick={() => {
                  setScanMode("id");
                  setSpkCuttingId("");
                  setSpkCuttingBarcode("");
                  setSpkCuttingDetail(null);
                  setSelectedBahan(null);
                }}
              >
                Input Manual
              </button>
              <button
                type="button"
                className={`scan-stok-toggle-btn ${scanMode === "barcode" ? "active" : ""}`}
                onClick={() => {
                  setScanMode("barcode");
                  setSpkCuttingId("");
                  setSpkCuttingBarcode("");
                  setSpkCuttingDetail(null);
                  setSelectedBahan(null);
                }}
              >
                Scan Barcode SPK
              </button>
            </div>

            {scanMode === "barcode" ? (
              <div className="scan-stok-input-row">
                <div className="scan-stok-input-wrap">
                  <FiSearch className="scan-stok-input-icon" />
                  <input
                    type="text"
                    placeholder="Scan barcode SPK Cutting (SPKC-XXXXXXXX)"
                    value={spkCuttingBarcode}
                    onChange={(e) => handleSpkCuttingBarcodeChange(e.target.value)}
                    onKeyDown={handleScanSpkCuttingBarcode}
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  className="scan-stok-btn scan-stok-btn-primary"
                  onClick={() => fetchSpkCuttingDetail(spkCuttingBarcode.trim())}
                  disabled={loading || !spkCuttingBarcode.trim()}
                >
                  {loading ? "Memuat..." : "Cari SPK"}
                </button>
              </div>
            ) : (
              <div className="scan-stok-input-row">
                <div className="scan-stok-input-wrap">
                  <FiSearch className="scan-stok-input-icon" />
                  <input
                    type="text"
                    placeholder="Masukkan SPK Cutting ID atau nomor seri (contoh: NR-01)"
                    value={spkCuttingId}
                    onChange={(e) => setSpkCuttingId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchSpkCuttingDetail(spkCuttingId.trim())}
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  className="scan-stok-btn scan-stok-btn-primary"
                  onClick={() => fetchSpkCuttingDetail(spkCuttingId.trim())}
                  disabled={loading || !spkCuttingId.trim()}
                >
                  {loading ? "Memuat..." : "Cari SPK"}
                </button>
              </div>
            )}

            {error && <div className="scan-stok-alert error">{error}</div>}
          </section>

          {spkCuttingDetail && (
            <section className="scan-stok-card">
              <div className="scan-stok-card-header">
                <div className="scan-stok-card-title">
                  <FiBox />
                  <h3>SPK #{spkCuttingDetail.spk_cutting?.id_spk_cutting}</h3>
                </div>
                <p>Pilih bahan target terlebih dahulu, lalu scan barcode hingga kuota roll terpenuhi.</p>
              </div>

              <div className="scan-stok-detail-grid">
                <div className="scan-stok-detail-item">
                  <span>Nama Produk</span>
                  <strong>{spkCuttingDetail.spk_cutting?.nama_produk || "-"}</strong>
                </div>
                <div className="scan-stok-detail-item">
                  <span>Total Bahan</span>
                  <strong>{totalBahan}</strong>
                </div>
                <div className="scan-stok-detail-item">
                  <span>Total Scan Tersimpan</span>
                  <strong>{scannedItems.length}</strong>
                </div>
              </div>

              <div className="scan-stok-table-wrap">
                <table className="scan-stok-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Bagian</th>
                      <th>Nama Bahan</th>
                      <th>Warna</th>
                      <th>Qty (Roll)</th>
                      <th>Berat</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spkCuttingDetail.bahan_detail?.map((bahan, index) => {
                      const isSelected = selectedBahan?.spk_cutting_bahan_id === bahan.spk_cutting_bahan_id;
                      const progress = scanProgress[bahan.spk_cutting_bahan_id] || 0;
                      const qty = bahan.qty || 0;
                      const isComplete = progress >= qty && qty > 0;

                      return (
                        <tr key={bahan.spk_cutting_bahan_id} className={isSelected ? "is-selected" : ""} onClick={() => setSelectedBahan(bahan)}>
                          <td>{index + 1}</td>
                          <td>{bahan.nama_bagian || "-"}</td>
                          <td>{bahan.nama_bahan || "-"}</td>
                          <td>{bahan.warna || "-"}</td>
                          <td>{qty || "-"}</td>
                          <td>{bahan.berat ? `${bahan.berat} kg` : "-"}</td>
                          <td>
                            {isSelected ? (
                              <div className="scan-stok-status-wrap">
                                <span className="scan-stok-pill active">Dipilih</span>
                                <span className={`scan-stok-pill ${isComplete ? "done" : "progress"}`}>
                                  {progress}/{qty}
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="scan-stok-btn scan-stok-btn-secondary scan-stok-btn-sm"
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
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selectedBahan &&
                (() => {
                  const currentProgress = scanProgress[selectedBahan.spk_cutting_bahan_id] || 0;
                  const requiredQty = selectedBahan.qty || 0;
                  const isComplete = currentProgress >= requiredQty && requiredQty > 0;
                  const progressPercentage = requiredQty > 0 ? (currentProgress / requiredQty) * 100 : 0;

                  return (
                    <div className="scan-stok-scan-section">
                      <div className="scan-stok-detail-grid compact">
                        <div className="scan-stok-detail-item">
                          <span>Bahan Dipilih</span>
                          <strong>{selectedBahan.nama_bahan || "-"}</strong>
                        </div>
                        <div className="scan-stok-detail-item">
                          <span>Warna</span>
                          <strong>{selectedBahan.warna || "-"}</strong>
                        </div>
                        <div className="scan-stok-detail-item">
                          <span>Progress Scan</span>
                          <strong>
                            {currentProgress} / {requiredQty} roll
                          </strong>
                        </div>
                      </div>

                      <div className="scan-stok-progress">
                        <div className="scan-stok-progress-meta">
                          <span>Progress validasi barcode</span>
                          <strong>
                            {currentProgress} dari {requiredQty} roll
                          </strong>
                        </div>
                        <div className="scan-stok-progress-track">
                          <div className={`scan-stok-progress-fill ${isComplete ? "complete" : ""}`} style={{ width: `${Math.min(progressPercentage, 100)}%` }} />
                        </div>
                        {isComplete && <p className="scan-stok-progress-note">Semua roll untuk bahan ini sudah tervalidasi.</p>}
                      </div>

                      <div className="scan-stok-form-group">
                        <label htmlFor="barcode-input">Scan Barcode Bahan</label>
                        <form
                          className="scan-stok-input-row"
                          onSubmit={(e) => {
                            e.preventDefault();
                            scanBarcode();
                          }}
                        >
                          <div className="scan-stok-input-wrap">
                            <FiSearch className="scan-stok-input-icon" />
                            <input
                              id="barcode-input"
                              type="text"
                              placeholder={isComplete ? "QTY sudah terpenuhi, scan ditutup" : "Scan barcode bahan"}
                              value={barcode}
                              onChange={(e) => handleBarcodeChange(e.target.value)}
                              onKeyDown={handleScanBarcode}
                              autoFocus={!isComplete}
                              disabled={isComplete}
                            />
                          </div>
                          <button type="submit" className="scan-stok-btn scan-stok-btn-primary" disabled={loading || !barcode.trim() || isComplete}>
                            {loading ? "Memvalidasi..." : isComplete ? "Lengkap" : "Scan"}
                          </button>
                        </form>
                      </div>

                      {scanResult && <div className={`scan-stok-alert ${scanResult.success ? "success" : "error"}`}>{scanResult.message}</div>}
                    </div>
                  );
                })()}

              {scannedItems.length > 0 && (
                <div className="scan-stok-scanned-list">
                  <div className="scan-stok-list-header">
                    <h4>Barcode Berhasil Di-scan</h4>
                    {selectedBahan && (
                      <span>
                        {scanProgress[selectedBahan.spk_cutting_bahan_id] || 0} dari {selectedBahan.qty} roll
                      </span>
                    )}
                  </div>

                  <div className="scan-stok-table-wrap">
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
                        {scannedItems.map((item, index) => (
                          <tr key={item.id || index}>
                            <td>{index + 1}</td>
                            <td>{item.barcode || "-"}</td>
                            <td>{item.stok_bahan?.pembelian_bahan?.bahan?.nama_bahan || "-"}</td>
                            <td>{item.stok_bahan?.warna?.warna || "-"}</td>
                            <td>{item.berat ? `${item.berat} kg` : "-"}</td>
                            <td>{item.scanned_at ? new Date(item.scanned_at).toLocaleString("id-ID") : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {spkCuttingDetail && scannedItems.length === 0 && !selectedBahan && (
            <section className="scan-stok-card">
              <div className="scan-stok-empty-state">
                <FiCheckCircle />
                <p>Pilih bahan pada tabel di atas untuk memulai proses scan barcode.</p>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default ScanStokBahanKeluar;

import React, { useState, useRef, useEffect } from "react";
import "./ScanStokBahanKeluar.css";
import API from "../../api";
import { toast } from "react-toastify";
import { FaBarcode } from "react-icons/fa";
import { FiBox, FiCheckCircle, FiSearch, FiTarget, FiXCircle } from "react-icons/fi";

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
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitWeight, setSplitWeight] = useState("");
  const [checkedRollInfo, setCheckedRollInfo] = useState(null);
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

  useEffect(() => {
    setBarcode("");
    setCheckedRollInfo(null);
    setSplitWeight("");
    setScanResult(null);
  }, [selectedBahan]);

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
      setCheckedRollInfo(null);
      setSplitWeight("");

      const response = await API.get(`/stok-bahan-keluar/spk-cutting/${searchValue.trim()}`);
      setSpkCuttingDetail(response.data);

      if (response.data.scanned_items) {
        setScannedItems(response.data.scanned_items);
      }
      if (response.data.scan_progress) {
        setScanProgress(response.data.scan_progress);
      }

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

  const processBarcodeScan = async (barcodeValue) => {
    if (isSplitMode) {
      await checkBarcode(barcodeValue.trim(), selectedBahan);
    } else {
      await scanBarcode(barcodeValue.trim(), null, selectedBahan);
    }
  };

  const handleBarcodeChange = (value) => {
    setBarcode(value);

    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }

    const trimmedValue = value.trim();
    const isPotongKecil = spkCuttingDetail?.spk_cutting?.mode === "potong_kecil";
    const canTrigger = selectedBahan || isPotongKecil;

    if (trimmedValue.length >= 8 && !loading && canTrigger) {
      barcodeTimeoutRef.current = setTimeout(async () => {
        await processBarcodeScan(trimmedValue);
      }, 200);
    }
  };

  const handleScanBarcode = async (e) => {
    if (e.key === "Enter" && barcode.trim() !== "") {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
      await processBarcodeScan(barcode.trim());
    }
  };

  const checkBarcode = async (barcodeValue, targetBahanParam = null) => {
    const activeBahan = targetBahanParam || selectedBahan;
    const isPotongKecil = spkCuttingDetail?.spk_cutting?.mode === "potong_kecil";

    if (!activeBahan && !isPotongKecil) {
      toast.error("Pilih bahan terlebih dahulu.");
      setBarcode("");
      return;
    }

    if (!barcodeValue || barcodeValue.trim() === "") {
      toast.error("Masukkan barcode terlebih dahulu.");
      setBarcode("");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCheckedRollInfo(null);
      setSplitWeight("");

      const response = await API.get(`/stok-bahan/barcode/${barcodeValue.trim()}`);
      const rollData = response.data;

      const isPotongKecil = spkCuttingDetail?.spk_cutting?.mode === "potong_kecil";

      if (!isPotongKecil && activeBahan.nama_bahan && rollData.nama_bahan && 
          rollData.nama_bahan.toLowerCase().trim() !== activeBahan.nama_bahan.toLowerCase().trim()) {
        toast.error(`Bahan tidak sesuai. Diharapkan: ${activeBahan.nama_bahan}, Ditemukan: ${rollData.nama_bahan}`);
        setBarcode("");
        return;
      }

      if (!isPotongKecil && activeBahan.warna && rollData.warna && 
          rollData.warna.toLowerCase().trim() !== activeBahan.warna.toLowerCase().trim()) {
        toast.error(`Warna tidak sesuai. Diharapkan: ${activeBahan.warna}, Ditemukan: ${rollData.warna}`);
        setBarcode("");
        return;
      }

      if (rollData.status === "tidak tersedia") {
        toast.error("Bahan dengan barcode ini sudah tidak tersedia");
        setBarcode("");
        return;
      }

      setCheckedRollInfo(rollData);
      toast.info(`Barcode terdeteksi. Silakan masukkan berat potong (Stok: ${rollData.berat} kg).`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Barcode tidak ditemukan di stok bahan.");
      setBarcode("");
    } finally {
      setLoading(false);
    }
  };

  const scanBarcode = async (barcodeValue = null, beratKeluar = null, targetBahanParam = null) => {
    const barcodeToScan = barcodeValue || barcode;
    const activeBahan = targetBahanParam || selectedBahan;
    const isPotongKecil = spkCuttingDetail?.spk_cutting?.mode === "potong_kecil";

    if (!activeBahan && !isPotongKecil) {
      toast.error("Pilih bahan terlebih dahulu.");
      setBarcode("");
      return;
    }

    if (!barcodeToScan || barcodeToScan.trim() === "") {
      toast.error("Masukkan barcode terlebih dahulu.");
      setBarcode("");
      return;
    }

    const currentProgress = activeBahan ? (scanProgress[activeBahan.spk_cutting_bahan_id] || 0) : 0;
    const requiredQty = activeBahan ? (activeBahan.qty || 0) : 0;

    if (activeBahan && currentProgress >= requiredQty) {
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

      const payload = {
        spk_cutting_id: spkCuttingDetail.spk_cutting.id,
        barcode: barcodeToScan.trim(),
      };

      if (activeBahan) {
        payload.spk_cutting_bahan_id = activeBahan.spk_cutting_bahan_id;
      }

      if (beratKeluar) {
        payload.berat_keluar = parseFloat(beratKeluar);
      }

      const response = await API.post("/stok-bahan-keluar/scan", payload);

      if (response.data.valid) {
        const returnedBahanId = response.data.data?.spk_cutting_bahan_id || (activeBahan?.spk_cutting_bahan_id);
        const currentCount = response.data.current_count;
        const requiredQtyReturned = response.data.required_qty;

        if (returnedBahanId) {
          setScanProgress((prev) => ({
            ...prev,
            [returnedBahanId]: currentCount,
          }));
        }

        if (currentCount < requiredQtyReturned) {
          toast.success(`${response.data.message || "Barcode berhasil divalidasi"} (${currentCount}/${requiredQtyReturned})`);
        } else {
          toast.success(`Lengkap. ${response.data.message || "Barcode berhasil divalidasi"} (${currentCount}/${requiredQtyReturned})`);
        }

        setScanResult({
          success: true,
          message: response.data.message,
          data: response.data.data,
        });

        setScannedItems((prev) => [...prev, response.data.data]);
        setBarcode("");
        setSplitWeight("");
        setCheckedRollInfo(null);

        if (currentCount < requiredQtyReturned || isPotongKecil) {
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
                <p>
                  Pilih bahan target terlebih dahulu, lalu scan barcode hingga kuota roll terpenuhi.
                </p>
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

              {spkCuttingDetail.spk_cutting?.mode !== 'potong_kecil' && (
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
                              <div className="scan-stok-status-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isSelected ? (
                                  <span className="scan-stok-pill active">Dipilih</span>
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
                                <span className={`scan-stok-pill ${isComplete ? "done" : "progress"}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {isComplete ? <FiCheckCircle style={{ color: '#10b981' }} /> : <FiXCircle style={{ color: '#ef4444' }} />} 
                                  <span>{progress}/{qty}</span>
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {(selectedBahan || spkCuttingDetail?.spk_cutting?.mode === "potong_kecil") &&
                (() => {
                  const currentProgress = selectedBahan ? (scanProgress[selectedBahan.spk_cutting_bahan_id] || 0) : 0;
                  const requiredQty = selectedBahan ? (selectedBahan.qty || 0) : 0;
                  const isComplete = selectedBahan ? (currentProgress >= requiredQty && requiredQty > 0) : false;
                  const progressPercentage = requiredQty > 0 ? (currentProgress / requiredQty) * 100 : 0;

                  return (
                    <div className="scan-stok-scan-section">
                      {selectedBahan && (
                        <div className="scan-stok-detail-grid compact">
                          <div className="scan-stok-detail-item">
                            <span>Bahan Dipilih</span>
                            <strong>{selectedBahan ? (selectedBahan.nama_bahan || "-") : "-"}</strong>
                          </div>
                          <div className="scan-stok-detail-item">
                            <span>Warna</span>
                            <strong>{selectedBahan ? (selectedBahan.warna || "-") : "-"}</strong>
                          </div>
                          <div className="scan-stok-detail-item">
                            <span>Progress Scan</span>
                            <strong>
                              {selectedBahan ? `${currentProgress} / ${requiredQty} roll` : "-"}
                            </strong>
                          </div>
                        </div>
                      )}

                      {selectedBahan && (
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
                      )}

                      <div className="scan-stok-split-toggle-container">
                        <label className="scan-stok-switch">
                          <input
                            type="checkbox"
                            checked={isSplitMode}
                            onChange={(e) => {
                              setIsSplitMode(e.target.checked);
                              setBarcode("");
                              setCheckedRollInfo(null);
                              setSplitWeight("");
                            }}
                            disabled={isComplete}
                          />
                          <span className="scan-stok-slider"></span>
                        </label>
                        <span className="scan-stok-toggle-label">Pecah / Potong Stok</span>
                      </div>

                      {isSplitMode && checkedRollInfo && (
                        <div className="scan-stok-roll-preview">
                          <div className="scan-stok-roll-preview-title">
                            <FiCheckCircle style={{ color: '#16a34a' }} /> Detail Roll Terdeteksi
                          </div>
                          <div className="scan-stok-roll-preview-grid">
                            <div className="scan-stok-roll-preview-item">
                              <span>Barcode</span>
                              <strong>{checkedRollInfo.barcode}</strong>
                            </div>
                            <div className="scan-stok-roll-preview-item">
                              <span>Nama Bahan</span>
                              <strong>{checkedRollInfo.nama_bahan || "-"}</strong>
                            </div>
                            <div className="scan-stok-roll-preview-item">
                              <span>Berat Saat Ini</span>
                              <strong>{checkedRollInfo.berat} kg</strong>
                            </div>
                          </div>
                          <div className="scan-stok-split-input-row">
                            <div className="scan-stok-split-field">
                              <label htmlFor="split-weight-input">Berat Potong (kg)</label>
                              <input
                                id="split-weight-input"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={checkedRollInfo.berat}
                                placeholder="Contoh: 15"
                                value={splitWeight}
                                onChange={(e) => setSplitWeight(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <button
                              type="button"
                              className="scan-stok-btn scan-stok-btn-primary"
                              disabled={loading || !splitWeight || parseFloat(splitWeight) <= 0 || parseFloat(splitWeight) > checkedRollInfo.berat}
                              onClick={() => scanBarcode(checkedRollInfo.barcode, splitWeight)}
                            >
                              {loading ? "Memotong..." : "Potong & Scan Keluar"}
                            </button>
                            <button
                              type="button"
                              className="scan-stok-btn scan-stok-btn-secondary"
                              onClick={() => {
                                setCheckedRollInfo(null);
                                setSplitWeight("");
                                setBarcode("");
                              }}
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      )}

                      {(!isSplitMode || !checkedRollInfo) && (
                        <div className="scan-stok-form-group">
                          <label htmlFor="barcode-input">Scan Barcode Bahan</label>
                          <form
                            className="scan-stok-input-row"
                            onSubmit={(e) => {
                              e.preventDefault();
                              processBarcodeScan(barcode.trim());
                            }}
                          >
                            <div className="scan-stok-input-wrap">
                              <FiSearch className="scan-stok-input-icon" />
                              <input
                                id="barcode-input"
                                type="text"
                                placeholder={
                                  isComplete
                                    ? "QTY sudah terpenuhi, scan ditutup"
                                    : isSplitMode
                                    ? "Scan/input barcode untuk diperiksa"
                                    : "Scan barcode bahan"
                                }
                                value={barcode}
                                onChange={(e) => handleBarcodeChange(e.target.value)}
                                onKeyDown={handleScanBarcode}
                                autoFocus={!isComplete}
                                disabled={isComplete}
                              />
                            </div>
                            <button
                              type="submit"
                              className="scan-stok-btn scan-stok-btn-primary"
                              disabled={loading || !barcode.trim() || isComplete}
                            >
                              {loading ? "Memvalidasi..." : isSplitMode ? "Periksa" : isComplete ? "Lengkap" : "Scan"}
                            </button>
                          </form>
                        </div>
                      )}

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
                            <td>{item.stok_bahan?.pembelian_bahan?.bahan?.nama_bahan || item.spk_cutting_bahan?.bahan?.nama_bahan || "-"}</td>
                            <td>{item.stok_bahan?.warna?.warna || item.spk_cutting_bahan?.warna || "-"}</td>
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

import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ScanProdukMasukGudang.css";
import "./GudangProdukWorkspace.css";
import API from "../../api";
import { FaBarcode, FaBoxOpen, FaMapMarkerAlt, FaTrash, FaWarehouse } from "react-icons/fa";
import { FiAlertTriangle, FiBox, FiSearch } from "react-icons/fi";
import useGudangProdukWorkspace from "./useGudangProdukWorkspace";
import { getAllSlots, getSlotStockSummaryMap } from "./GudangProdukMockStore";
import { buildSlotHeadline, GudangLayoutMap } from "./GudangProdukSharedV2";

const formatTanggal = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeScanKey = (value) => String(value || "").trim().toUpperCase();

const collapseRepeatedScanText = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  if (text.includes(" | ")) {
    const skuText = text.split(" | ")[0]?.trim();
    if (skuText) {
      const secondSkuIndex = text.indexOf(skuText, skuText.length + 3);
      if (secondSkuIndex > -1) {
        return text.slice(0, secondSkuIndex).trim();
      }
    }
  }

  for (let chunkLength = Math.floor(text.length / 2); chunkLength >= 8; chunkLength -= 1) {
    if (text.length % chunkLength !== 0) continue;

    const chunk = text.slice(0, chunkLength);
    if (chunk.repeat(text.length / chunkLength) === text) {
      return chunk.trim();
    }
  }

  return text;
};

const getSerialFromBarcode = (value) => {
  const text = collapseRepeatedScanText(value);
  if (text.includes(" | ")) {
    return text.split(" | ").pop()?.trim() || text;
  }
  return text.trim();
};

const getScanKey = (value) => normalizeScanKey(getSerialFromBarcode(value) || value);

const ScanProdukMasukGudang = () => {
  const scanInputRef = useRef(null);
  const barcodeTimeoutRef = useRef(null);
  const scanInProgressRef = useRef(false);
  const submittedScanKeysRef = useRef(new Set());

  // Workspace state (layouts, slots, etc.)
  const { state, setState, isLoading: workspaceLoading, error: workspaceError, refresh } = useGudangProdukWorkspace();

  // Gudang & slot selection
  const [layoutId, setLayoutId] = useState("");
  const [slotId, setSlotId] = useState("");

  // Scan state
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanStatus, setScanStatus] = useState(""); // "", "loading", "success", "error"

  // Scanned items (session list)
  const [scannedItems, setScannedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Auto-select first layout
  useEffect(() => {
    if (!layoutId && state.layouts.length) {
      setLayoutId(String(state.layouts[0].id));
    }
  }, [layoutId, state.layouts]);

  // Reset slot when layout changes
  useEffect(() => {
    setSlotId("");
  }, [layoutId]);

  // Cleanup barcode timeout
  useEffect(() => {
    return () => {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, []);

  // Derived data
  const allSlots = useMemo(() => getAllSlots(state), [state]);
  const stockSummaryBySlot = useMemo(() => getSlotStockSummaryMap(state), [state]);

  const selectedLayout = useMemo(
    () => state.layouts.find((layout) => String(layout.id) === String(layoutId)) || null,
    [layoutId, state.layouts]
  );

  const layoutSlots = useMemo(
    () =>
      selectedLayout
        ? allSlots.filter((slot) => String(slot.layoutId) === String(selectedLayout.id))
        : [],
    [allSlots, selectedLayout]
  );

  const selectedSlot = useMemo(
    () => (slotId ? allSlots.find((slot) => String(slot.id) === String(slotId)) : null),
    [allSlots, slotId]
  );

  const selectedSlotSummary = selectedSlot ? stockSummaryBySlot[selectedSlot.id] : null;

  const canScan = Boolean(selectedLayout && selectedSlot);

  // Filter scanned items
  const filteredItems = scannedItems.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      (item.barcode || "").toLowerCase().includes(term) ||
      (item.sku || "").toLowerCase().includes(term) ||
      (item.produk || "").toLowerCase().includes(term) ||
      (item.kode_seri || "").toLowerCase().includes(term)
    );
  });

  // KPI
  const totalScanHariIni = scannedItems.filter((item) => item.status === "success").length;
  const totalGagal = scannedItems.filter((item) => item.status === "error").length;

  // Barcode handling (auto-scan like ScanBahan)
  const handleBarcodeChange = (value) => {
    setScanInput(value);

    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }

    const trimmedValue = collapseRepeatedScanText(value);

    if (trimmedValue.length >= 8 && scanStatus !== "loading") {
      barcodeTimeoutRef.current = setTimeout(async () => {
        setScanInput("");
        await processScan(trimmedValue);
      }, 200);
    }
  };

  const processScan = async (barcodeValue = null) => {
    // If already loading, prevent duplicate concurrent requests
    if (scanInProgressRef.current || scanStatus === "loading") {
      return;
    }

    const barcodeToScan = collapseRepeatedScanText(barcodeValue || scanInput);
    const scanKey = getScanKey(barcodeToScan);

    if (!barcodeToScan) {
      setScanMessage("Barcode tidak boleh kosong.");
      setScanStatus("error");
      return;
    }

    if (!canScan) {
      setScanMessage("Pilih gudang dan slot terlebih dahulu.");
      setScanStatus("error");
      return;
    }

    scanInProgressRef.current = true;
    setScanInput("");

    // Clear timeout immediately to prevent double processing (auto-scan length + manual submit keypress)
    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }

    // ─── Frontend Duplicate Scan Check ───
    const currentSerial = getSerialFromBarcode(barcodeToScan);
    const isSerialBarcode = currentSerial.includes(".") || barcodeToScan.includes(" | ");

    if (submittedScanKeysRef.current.has(scanKey)) {
      const label = isSerialBarcode ? `Kode seri "${currentSerial}"` : `Barcode "${barcodeToScan}"`;
      setScanMessage(`${label} sudah pernah di-scan masuk dalam sesi ini.`);
      setScanStatus("error");
      scanInProgressRef.current = false;
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
      return;
    }

    submittedScanKeysRef.current.add(scanKey);

    if (isSerialBarcode) {
      const isDuplicateSerial = scannedItems.some(
        (item) =>
          getScanKey(item.barcode || item.kode_seri || item.nomor_seri) === scanKey
      );

      if (isDuplicateSerial) {
        setScanMessage(`Kode seri "${currentSerial}" sudah pernah di-scan masuk dalam sesi ini.`);
        setScanStatus("error");
        scanInProgressRef.current = false;
        return;
      }
    } else {
      // General duplicate check for pure barcodes
      const isDuplicateBarcode = scannedItems.some(
        (item) => getScanKey(item.barcode || item.kode_seri || item.nomor_seri) === scanKey
      );

      if (isDuplicateBarcode) {
        setScanMessage(`Barcode "${barcodeToScan}" sudah pernah di-scan masuk dalam sesi ini.`);
        setScanStatus("error");
        scanInProgressRef.current = false;
        return;
      }
    }

    try {
      setScanStatus("loading");

      const response = await API.post("/gudang-produk-workspace/scan-produk-masuk", {
        barcode: barcodeToScan,
        layout_id: layoutId,
        slot_id: slotId,
      });

      const resultData = response.data?.data || {};
      const message = response.data?.message || "Produk berhasil di-scan dan masuk ke gudang.";
      const resultScanKey = getScanKey(resultData.kode_seri || resultData.nomor_seri || barcodeToScan);

      setScanMessage(message);
      setScanStatus("success");

      // Add to scanned items list
      setScannedItems((prev) => {
        const isAlreadyInRows = prev.some(
          (item) => getScanKey(item.barcode || item.kode_seri || item.nomor_seri) === resultScanKey
        );

        if (isAlreadyInRows) {
          return prev;
        }

        submittedScanKeysRef.current.add(resultScanKey);

        return [
          {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            barcode: barcodeToScan,
            kode_seri: resultData.kode_seri || currentSerial || "-",
            nomor_seri: resultData.nomor_seri || currentSerial || "-",
            sku: resultData.sku || "-",
            produk: resultData.produk || "-",
            slot: resultData.slot || selectedSlot?.slotCode || "-",
            gudang: selectedLayout?.name || "-",
            qty: resultData.qty || 1,
            status: "success",
            scanned_at: new Date().toISOString(),
          },
          ...prev,
        ];
      });

      // Update workspace state if placement data returned
      if (resultData.placement?.stockEntry) {
        setState((currentState) => {
          const nextStockEntries = [...currentState.stockEntries];
          const existingIndex = nextStockEntries.findIndex(
            (entry) => String(entry.id) === String(resultData.placement.stockEntry.id)
          );

          if (existingIndex >= 0) {
            nextStockEntries[existingIndex] = resultData.placement.stockEntry;
          } else {
            nextStockEntries.unshift(resultData.placement.stockEntry);
          }

          const nextActivities = resultData.placement.activity
            ? [resultData.placement.activity, ...currentState.activityLog]
            : currentState.activityLog;

          return {
            ...currentState,
            stockEntries: nextStockEntries,
            activityLog: nextActivities.slice(0, 500),
          };
        });
      }

    } catch (error) {
      const msg = error.response?.data?.message || "Gagal memindai barcode produk.";
      setScanMessage(msg);
      setScanStatus("error");

      // Add failed scan to list
      setScannedItems((prev) => {
        const isAlreadyInRows = prev.some(
          (item) => getScanKey(item.barcode || item.kode_seri || item.nomor_seri) === scanKey
        );

        if (isAlreadyInRows) {
          return prev;
        }

        return [
          {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            barcode: barcodeToScan,
            kode_seri: isSerialBarcode ? currentSerial : "-",
            nomor_seri: isSerialBarcode ? currentSerial : "-",
            sku: "-",
            produk: "-",
            slot: selectedSlot?.slotCode || "-",
            gudang: selectedLayout?.name || "-",
            qty: 0,
            status: "error",
            error_message: msg,
            scanned_at: new Date().toISOString(),
          },
          ...prev,
        ];
      });
    } finally {
      scanInProgressRef.current = false;
      setTimeout(() => setScanStatus(""), 3000);
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    await processScan();
  };

  const handleClearHistory = () => {
    setScannedItems([]);
    submittedScanKeysRef.current.clear();
  };

  return (
    <div className="spm-gudang-page">
      <div className="spm-gudang-shell">
        {/* ─── Topbar ─── */}
        <header className="spm-gudang-topbar">
          <div className="spm-gudang-title-group">
            <div className="spm-gudang-brand-icon">
              <FaBarcode />
            </div>
            <div>
              <h1>Scan Produk Masuk</h1>
              <p>Scan barcode kode seri untuk memasukkan produk ke gudang secara real-time</p>
            </div>
          </div>

          <div className="spm-gudang-kpi-grid">
            <div className="spm-gudang-kpi-card">
              <span>Total Scan</span>
              <strong>{scannedItems.length}</strong>
            </div>
            <div className="spm-gudang-kpi-card">
              <span>Berhasil Masuk</span>
              <strong>{totalScanHariIni}</strong>
            </div>
            <div className="spm-gudang-kpi-card">
              <span>Gagal</span>
              <strong>{totalGagal}</strong>
            </div>
          </div>
        </header>

        <main className="spm-gudang-main">
          {/* ─── Section 1: Pilih Gudang & Slot ─── */}
          <section className="spm-gudang-card">
            <div className="spm-gudang-card-header">
              <div className="spm-gudang-card-title">
                <FaWarehouse />
                <h3>Pilih Gudang & Lokasi</h3>
              </div>
              <p>Pilih gudang tujuan dan slot/rak tempat produk akan disimpan.</p>
            </div>

            {workspaceLoading ? (
              <p className="spm-gudang-loading">Memuat data gudang...</p>
            ) : workspaceError ? (
              <p className="spm-gudang-error-text">{workspaceError}</p>
            ) : (
              <>
                <div className="spm-gudang-selector-grid">
                  <div className="spm-gudang-form-group">
                    <label>Gudang Tujuan</label>
                    <select
                      className="spm-gudang-select"
                      value={layoutId}
                      onChange={(e) => setLayoutId(e.target.value)}
                    >
                      <option value="">-- Pilih Gudang --</option>
                      {state.layouts.map((layout) => (
                        <option key={layout.id} value={layout.id}>
                          {layout.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="spm-gudang-form-group">
                    <label>Slot / Rak Tujuan</label>
                    <select
                      className="spm-gudang-select"
                      value={slotId}
                      onChange={(e) => setSlotId(e.target.value)}
                      disabled={!layoutId}
                    >
                      <option value="">
                        {layoutId ? "-- Pilih Slot --" : "Pilih gudang terlebih dahulu"}
                      </option>
                      {layoutSlots.map((slot) => {
                        const slotSummary = stockSummaryBySlot[slot.id];
                        const label = `${slot.slotCode}${
                          slotSummary ? ` (${slotSummary.qty} pcs, ${slotSummary.skuCount} SKU)` : " (Kosong)"
                        }`;
                        return (
                          <option key={slot.id} value={slot.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {selectedSlot && (
                  <div className="spm-gudang-slot-status">
                    <FaMapMarkerAlt />
                    <span>
                      Lokasi aktif: <strong>{buildSlotHeadline(selectedSlot)}</strong>
                      {selectedSlotSummary
                        ? ` — ${selectedSlotSummary.qty} pcs tersimpan dengan ${selectedSlotSummary.skuCount} SKU`
                        : " — Slot kosong, siap dipakai"}
                    </span>
                  </div>
                )}

                {selectedLayout && (
                  <div className="spm-gudang-visual-map-wrap" style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <FaMapMarkerAlt style={{ color: "#7c3aed" }} />
                      <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a", fontWeight: "700" }}>Peta Visual Layout Gudang</h4>
                    </div>
                    <GudangLayoutMap
                      layout={selectedLayout}
                      selectedSlotId={slotId}
                      onSelectSlot={(slot) => {
                        if (slot && slot.id) {
                          setSlotId(slot.id);
                        }
                      }}
                      stockSummaryBySlot={stockSummaryBySlot}
                      interactive={true}
                    />
                  </div>
                )}
              </>
            )}
          </section>

          {/* ─── Section 2: Scan Barcode ─── */}
          <section className="spm-gudang-card">
            <div className="spm-gudang-card-header">
              <div className="spm-gudang-card-title">
                <FiBox />
                <h3>Scan Barcode Produk</h3>
              </div>
              <p>Input barcode secara otomatis atau tekan Enter untuk memindai manual.</p>
            </div>

            <form onSubmit={handleScan} className="spm-gudang-scan-form">
              <div className="spm-gudang-input-wrap">
                <FiSearch className="spm-gudang-input-icon" />
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => handleBarcodeChange(e.target.value)}
                  placeholder={canScan ? "Scan barcode kode seri produk..." : "Pilih gudang & slot terlebih dahulu"}
                  className="spm-gudang-input"
                  disabled={!canScan || scanStatus === "loading"}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!canScan || scanStatus === "loading"}
                className="spm-gudang-btn spm-gudang-btn-primary"
              >
                {scanStatus === "loading" ? "Memindai..." : "Scan"}
              </button>
            </form>

            {!canScan && !workspaceLoading && (
              <div className="spm-gudang-scan-disabled-hint">
                <FiAlertTriangle />
                <span>Pilih gudang dan slot terlebih dahulu sebelum mulai scan.</span>
              </div>
            )}

            {scanMessage && (
              <div className={`spm-gudang-alert ${scanStatus === "error" ? "error" : "success"}`}>
                {scanMessage}
              </div>
            )}
          </section>

          {/* ─── Section 3: Hasil Scan ─── */}
          <section className="spm-gudang-card">
            <div className="spm-gudang-toolbar">
              <div className="spm-gudang-card-title">
                <FaBoxOpen />
                <h3>Hasil Scan Produk Masuk</h3>
              </div>
              <div className="spm-gudang-toolbar-right">
                {scannedItems.length > 0 && (
                  <button
                    type="button"
                    className="spm-gudang-btn spm-gudang-btn-danger"
                    onClick={handleClearHistory}
                  >
                    <FaTrash />
                    Hapus Riwayat
                  </button>
                )}
              </div>
            </div>

            {scannedItems.length === 0 ? (
              <div className="spm-gudang-empty">
                <FaBarcode />
                <h4>Belum ada produk yang di-scan</h4>
                <p>Mulai scan barcode kode seri untuk memasukkan produk ke gudang.</p>
              </div>
            ) : (
              <>
                <div className="spm-gudang-table-wrap">
                  <table className="spm-gudang-table">
                    <thead>
                      <tr>
                        <th className="spm-gudang-table-no">No</th>
                        <th>Barcode</th>
                        <th>Kode Seri</th>
                        <th>SKU</th>
                        <th>Produk</th>
                        <th>Gudang</th>
                        <th>Slot</th>
                        <th>Qty</th>
                        <th>Waktu Scan</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item, index) => (
                        <tr
                          key={item.id}
                          className={index === 0 ? "spm-gudang-row-new" : ""}
                        >
                          <td className="spm-gudang-table-no">{index + 1}</td>
                          <td className="spm-gudang-table-barcode">{item.barcode}</td>
                          <td>{item.kode_seri}</td>
                          <td className="spm-gudang-table-sku">{item.sku}</td>
                          <td>{item.produk}</td>
                          <td>{item.gudang}</td>
                          <td>{item.slot}</td>
                          <td>{item.qty}</td>
                          <td>{formatTanggal(item.scanned_at)}</td>
                          <td>
                            <span
                              className={`spm-gudang-pill ${
                                item.status === "success"
                                  ? "spm-gudang-pill-success"
                                  : "spm-gudang-pill-error"
                              }`}
                            >
                              {item.status === "success" ? "Berhasil" : "Gagal"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="spm-gudang-table-footer">
                  <p>
                    Menampilkan {filteredItems.length} dari {scannedItems.length} data scan
                  </p>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default ScanProdukMasukGudang;

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaClipboardCheck, FaQrcode, FaCheckCircle, FaChevronLeft, FaMapMarkerAlt, FaBarcode } from "react-icons/fa";
import API from "../../api";
import "./GudangProdukWorkspace.css";
import {
  getAllSlots,
  getSlotStockSummaryMap,
} from "./GudangProdukMockStore";
import {
  GudangActivityTable,
  GudangStatCard,
  buildSlotHeadline,
} from "./GudangProdukSharedV2";
import useGudangProdukWorkspace from "./useGudangProdukWorkspace";
import {
  buildGudangWorkspaceErrorMessage,
  ensureGudangProdukSkuActive,
  fetchGudangProdukWorkspaceCatalog,
  placeGudangProdukSku,
} from "./GudangProdukWorkspaceApi";
import {
  showGudangError,
  showGudangWarning,
} from "./GudangProdukAlerts";

const normalizeScanText = (value) => String(value || "").trim().toUpperCase();

const buildSerialSkuLookupKeys = (value) => {
  const raw = normalizeScanText(value);
  const loose = raw.replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  const compact = loose.replace(/\s+/g, "");

  return [raw, loose, compact].filter(Boolean);
};

const parseScannedSerialCode = (value) => {
  const text = String(value || "").trim();
  const parts = text.split("|").map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return {
      raw: text,
      skuText: parts[0],
      serialText: parts[parts.length - 1],
      lookupValues: [text, parts[parts.length - 1]],
    };
  }

  return {
    raw: text,
    skuText: "",
    serialText: text,
    lookupValues: [text],
  };
};

const SCAN_AUTO_SUBMIT_DELAY_MS = 200;

const STEP_SELECT_LOCATION = 1;
const STEP_SCAN = 2;

const STEP_ITEMS = [
  { num: 1, label: "Pilih Lokasi", icon: FaMapMarkerAlt },
  { num: 2, label: "Scan Seri", icon: FaBarcode },
];

const StepSegment = ({ current, onJump }) => (
  <div className="sog-tabbar">
    <div className="ks-segment">
      {STEP_ITEMS.map(({ num, label, icon: Icon }) => {
        const done = current > num;
        const reachable = num <= current;
        return (
          <button
            key={num}
            type="button"
            className={`ks-seg-btn sog-seg-btn ${current === num ? "is-active" : ""} ${
              done ? "is-done" : ""
            }`}
            disabled={!reachable}
            onClick={() => reachable && onJump(num)}
          >
            {done ? <FaCheckCircle size={12} /> : <Icon size={12} />} {label}{" "}
            <em>{num}</em>
          </button>
        );
      })}
    </div>
  </div>
);

const StokAwalGudangProduk = () => {
  const { state, setState, isLoading, error, refresh } = useGudangProdukWorkspace({
    includeCatalog: true,
    activityLimit: 500,
  });

  const [step, setStep] = useState(STEP_SELECT_LOCATION);

  const [layoutId, setLayoutId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [rackId, setRackId] = useState("");
  const [rowNumber, setRowNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [serialCache, setSerialCache] = useState(new Map());
  const [serialScanValue, setSerialScanValue] = useState("");
  const [serialLoading, setSerialLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scannedRows, setScannedRows] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const serialScanInputRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const lastSubmittedScanRef = useRef("");
  const scanQueueRef = useRef([]);
  const processingQueueRef = useRef(false);

  const scannedRowsRef = useRef(scannedRows);
  useEffect(() => {
    scannedRowsRef.current = scannedRows;
  }, [scannedRows]);

  const skuOptions = useMemo(
    () =>
      [...state.skus].sort((left, right) =>
        String(left.code || left.sku || left.label || "").localeCompare(
          String(right.code || right.sku || right.label || "")
        )
      ),
    [state.skus]
  );

  const serialSkuLookup = useMemo(() => {
    const lookup = new Map();

    skuOptions.forEach((sku) => {
      [sku.code, sku.sku, sku.label].forEach((value) => {
        buildSerialSkuLookupKeys(value).forEach((key) => {
          if (!lookup.has(key)) {
            lookup.set(key, sku);
          }
        });
      });
    });

    return lookup;
  }, [skuOptions]);

  const storedSerialSet = useMemo(() => {
    const set = new Set();

    state.activityLog.forEach((activity) => {
      const notes = String(activity?.notes || "");
      const match = notes.match(/Kode seri:\s*([^|]+)/i);
      if (match?.[1]) {
        set.add(normalizeScanText(match[1]));
      }
    });

    return set;
  }, [state.activityLog]);

  const storedSerialSetRef = useRef(storedSerialSet);
  useEffect(() => {
    storedSerialSetRef.current = storedSerialSet;
  }, [storedSerialSet]);

  const serialCacheRef = useRef(serialCache);
  useEffect(() => {
    serialCacheRef.current = serialCache;
  }, [serialCache]);

  const serialSkuLookupRef = useRef(serialSkuLookup);
  useEffect(() => {
    serialSkuLookupRef.current = serialSkuLookup;
  }, [serialSkuLookup]);

  useEffect(() => {
    if (!layoutId && state.layouts.length) {
      setLayoutId(state.layouts[0].id);
    }
  }, [layoutId, state.layouts]);

  const selectedLayout = useMemo(
    () => state.layouts.find((layout) => String(layout.id) === String(layoutId)) || state.layouts[0] || null,
    [layoutId, state.layouts]
  );

  const floors = useMemo(
    () => [...(selectedLayout?.floors || [])].sort((left, right) => Number(left.number) - Number(right.number)),
    [selectedLayout]
  );

  const selectedFloor = useMemo(
    () => floors.find((floor) => String(floor.id) === String(floorId)) || floors[0] || null,
    [floorId, floors]
  );

  const blocks = useMemo(
    () =>
      [...(selectedFloor?.blocks || [])].sort((left, right) =>
        String(left.code || "").localeCompare(String(right.code || ""))
      ),
    [selectedFloor]
  );

  const selectedBlock = useMemo(
    () => blocks.find((block) => String(block.id) === String(blockId)) || blocks[0] || null,
    [blockId, blocks]
  );

  const racks = useMemo(
    () => [...(selectedBlock?.racks || [])].sort((left, right) => Number(left.number) - Number(right.number)),
    [selectedBlock]
  );

  const selectedRack = useMemo(
    () => racks.find((rack) => String(rack.id) === String(rackId)) || racks[0] || null,
    [rackId, racks]
  );

  useEffect(() => {
    if (selectedFloor && String(selectedFloor.id) !== String(floorId)) {
      setFloorId(selectedFloor.id);
    }
  }, [floorId, selectedFloor]);

  useEffect(() => {
    if (selectedBlock && String(selectedBlock.id) !== String(blockId)) {
      setBlockId(selectedBlock.id);
    }
  }, [blockId, selectedBlock]);

  useEffect(() => {
    if (selectedRack && String(selectedRack.id) !== String(rackId)) {
      setRackId(selectedRack.id);
    }
  }, [rackId, selectedRack]);

  useEffect(() => {
    const maxRows = Number(selectedRack?.rows || 0);
    if (!maxRows) {
      setRowNumber("");
      return;
    }

    if (!rowNumber || Number(rowNumber) > maxRows) {
      setRowNumber("1");
    }
  }, [rowNumber, selectedRack]);

  const allSlots = useMemo(() => getAllSlots(state), [state]);
  const selectedSlot = useMemo(() => {
    if (!selectedLayout || !selectedFloor || !selectedBlock || !selectedRack || !rowNumber) {
      return null;
    }

    return allSlots.find(
      (slot) =>
        String(slot.layoutId) === String(selectedLayout.id) &&
        Number(slot.floorNumber) === Number(selectedFloor.number) &&
        String(slot.blockCode).toUpperCase() === String(selectedBlock.code).toUpperCase() &&
        Number(slot.rackNumber) === Number(selectedRack.number) &&
        Number(slot.rowNumber) === Number(rowNumber)
    ) || null;
  }, [allSlots, rowNumber, selectedBlock, selectedFloor, selectedLayout, selectedRack]);

  const stockSummaryBySlot = useMemo(() => getSlotStockSummaryMap(state), [state]);
  const selectedSlotSummary = selectedSlot ? stockSummaryBySlot[selectedSlot.id] : null;

  const lookupSerial = async (scannedValue, scannedCode) => {
    const lookupKeys = scannedCode.lookupValues.flatMap((value) => buildSerialSkuLookupKeys(value));
    
    // Check in cache first
    let serialItem = lookupKeys.map((key) => serialCacheRef.current.get(key)).find(Boolean) || null;
    if (serialItem) {
      return serialItem;
    }

    if (!scannedCode.skuText) {
      // Query backend lookup endpoint
      const response = await API.get("/seri/lookup", {
        params: { search: scannedValue }
      });
      const data = response.data;
      if (data) {
        // Cache the result
        setSerialCache((prev) => {
          const next = new Map(prev);
          [
            data.nomor_seri,
            data.sku && data.nomor_seri ? `${data.sku} | ${data.nomor_seri}` : "",
          ].forEach((value) => {
            buildSerialSkuLookupKeys(value).forEach((key) => {
              if (key && !next.has(key)) {
                next.set(key, data);
              }
            });
          });
          return next;
        });
        return data;
      }
    }

    return null;
  };

  const totalQty = scannedRows.reduce((total, row) => total + Number(row.qty || 0), 0);
  const activityRows = state.activityLog
    .filter((item) => item.type === "placement")
    .slice(0, 10);

  const resetSession = () => {
    setNotes("");
    setSerialScanValue("");
    setScanMessage("");
    setScannedRows([]);
    lastSubmittedScanRef.current = "";
  };

  const resolveSerialSku = useCallback(
    async (serialItem) => {
      const matchedSku =
        buildSerialSkuLookupKeys(serialItem?.sku)
          .map((key) => serialSkuLookupRef.current.get(key))
          .find(Boolean) || null;

      if (matchedSku?.id) {
        return matchedSku;
      }

      const activation = await ensureGudangProdukSkuActive(serialItem?.sku);
      const nextCatalog = await fetchGudangProdukWorkspaceCatalog();
      setState((currentState) => ({
        ...currentState,
        products: nextCatalog.products,
        skus: nextCatalog.skus,
      }));

      return (
        nextCatalog.skus.find((sku) =>
          buildSerialSkuLookupKeys(serialItem?.sku).some((key) =>
            buildSerialSkuLookupKeys(sku?.code || sku?.sku || sku?.label).includes(key)
          )
        ) ||
        activation.sku ||
        null
      );
    },
    [setState]
  );

  const handleScanSerial = (rawValue = serialScanValue) => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    const rawScanValue = String(rawValue || "").trim();
    if (!rawScanValue) {
      return;
    }

    // Clear input immediately so the next scan can start typing
    setSerialScanValue("");

    if (scanQueueRef.current.includes(rawScanValue) || lastSubmittedScanRef.current === rawScanValue) {
      setTimeout(() => {
        serialScanInputRef.current?.focus();
      }, 50);
      return;
    }

    scanQueueRef.current.push(rawScanValue);
    processScanQueue();
  };

  const processScanQueue = async () => {
    if (processingQueueRef.current) {
      return;
    }
    processingQueueRef.current = true;

    while (scanQueueRef.current.length > 0) {
      const nextScan = scanQueueRef.current.shift();
      lastSubmittedScanRef.current = nextScan;
      await executeScan(nextScan);
    }

    processingQueueRef.current = false;
  };

  const executeScan = async (rawValue) => {
    const scannedCode = parseScannedSerialCode(rawValue);
    const scannedValue = scannedCode.serialText;

    try {
      if (!selectedLayout || !selectedSlot) {
        await showGudangWarning(
          "Lokasi stok awal belum lengkap",
          "Pilih lantai, bilik/blok, rak, dan baris lokasi stok awal sebelum scan kode seri."
        );
        return;
      }

      if (!scannedValue) {
        await showGudangWarning(
          "Kode seri kosong",
          "Scan atau ketik kode seri terlebih dahulu."
        );
        return;
      }

      setIsSubmitting(true);
      setScanMessage("Mencari referensi nomor seri...");

      let serialItem = null;
      try {
        serialItem = await lookupSerial(rawValue, scannedCode);
      } catch (err) {
        // Not found or error
      }
      const serialForPlacement =
        serialItem ||
        (scannedCode.skuText
          ? {
              id: scannedCode.raw,
              nomor_seri: scannedCode.serialText,
              sku: scannedCode.skuText,
              jumlah: 1,
            }
          : null);

      if (!serialForPlacement) {
        setIsSubmitting(false);
        await showGudangWarning(
          "Kode seri tidak ditemukan",
          `${scannedValue} tidak ditemukan di data kode seri. Scan format "SKU | KODE SERI" agar SKU bisa dibaca langsung.`
        );
        setScanMessage(`${scannedValue} tidak ditemukan.`);
        return;
      }

      const normalizedSerial = normalizeScanText(serialForPlacement.nomor_seri);
      if (
        scannedRowsRef.current.some((row) => normalizeScanText(row.nomorSeri) === normalizedSerial) ||
        storedSerialSetRef.current.has(normalizedSerial)
      ) {
        setIsSubmitting(false);
        await showGudangWarning(
          "Kode seri sudah masuk gudang",
          `${serialForPlacement.nomor_seri} sudah pernah discan dan masuk stok awal.`
        );
        setScanMessage(`${serialForPlacement.nomor_seri} sudah masuk gudang.`);
        return;
      }

      setIsSubmitting(true);
      setScanMessage("Memproses scan kode seri...");
      const selectedSku = await resolveSerialSku(serialForPlacement);
      if (!selectedSku?.id) {
        throw new Error("SKU dari kode seri belum bisa ditemukan atau diaktifkan.");
      }

      const locationNote = buildSlotHeadline(selectedSlot);
      const baseNotes = [`Stok awal: ${locationNote}`];
      baseNotes.push(`Kode seri: ${serialForPlacement.nomor_seri || scannedValue}`);
      if (notes.trim()) {
        baseNotes.push(notes.trim());
      }

      const parsedSkuId = parseInt(selectedSku.id, 10);
      const skuId = Number.isNaN(parsedSkuId) ? selectedSku.id : parsedSkuId;
      const qty = Math.max(1, Number(serialForPlacement?.jumlah) || 1);

      await placeGudangProdukSku(
        {
          layoutId: selectedLayout.id,
          slotId: selectedSlot.id,
          skuId,
          qty,
          notes: baseNotes.join(" | "),
        },
        { minimal: true }
      );

      await refresh({ silent: true, includeCatalog: true, activityLimit: 500 });
      setScannedRows((currentRows) => [
        {
          id: `${serialForPlacement.id || scannedValue}_${Date.now()}`,
          nomorSeri: serialForPlacement.nomor_seri || scannedValue,
          qty,
        },
        ...currentRows,
      ]);
      setScanMessage(`Scan berhasil. Total sesi ini ${scannedRowsRef.current.length + 1} kode seri.`);
    } catch (submitError) {
      await showGudangError(
        "Gagal menyimpan stok awal",
        buildGudangWorkspaceErrorMessage(submitError, "Gagal menyimpan stok awal.")
      );
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        serialScanInputRef.current?.focus();
      }, 50);
    }
  };

  const handleSerialKeyDown = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleScanSerial(event.currentTarget.value);
  };

  const handleSerialInputChange = (event) => {
    const value = event.target.value;
    setSerialScanValue(value);

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    if (!value.trim() || serialLoading) {
      return;
    }

    if (value.includes("|")) {
      scanTimeoutRef.current = setTimeout(async () => {
        await handleScanSerial(value);
      }, SCAN_AUTO_SUBMIT_DELAY_MS);
    }
  };

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const handleNextStep = () => {
    if (!selectedSlot) {
      showGudangWarning("Lokasi belum lengkap", "Harap pilih lokasi gudang sampai ke baris rak terlebih dahulu.");
      return;
    }
    setStep(STEP_SCAN);
    setTimeout(() => {
      serialScanInputRef.current?.focus();
    }, 100);
  };

  const handleJumpStep = (num) => {
    if (num === STEP_SELECT_LOCATION) setStep(STEP_SELECT_LOCATION);
    // num === current step -> no-op
  };

  return (
    <div className="ks-page sog-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Stok Awal Gudang</h1>
          <span className="ks-header-sub">
            Input stok awal per lokasi gudang. Pilih lantai, bilik, rak, lalu scan seri.
          </span>
        </div>
        <div className="ks-header-actions">
          <span className={`sog-status-pill`}>
            <span className="sog-status-dot" />
            Langkah {step} dari 2
          </span>
          <button type="button" className="ks-btn" onClick={resetSession}>
            Reset Sesi
          </button>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Langkah</span>
          <span className="ks-stat-value">{step}/2</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Stok Awal Masuk</span>
          <span className="ks-stat-value">
            {totalQty} pcs
          </span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Lokasi Dipilih</span>
          <span className="ks-stat-value">
            {selectedSlot?.slotCode || "—"}
          </span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Status</span>
          <span className="ks-stat-value">
            {isLoading ? "Memuat..." : isSubmitting ? "Menyimpan..." : "Siap"}
          </span>
        </div>
      </div>

      <StepSegment current={step} onJump={handleJumpStep} />

      <section className="ks-board sog-board">
        <div className="sog-scroll">
          <div className="opname-page">
            
            {step === STEP_SELECT_LOCATION ? (
              <div className="opname-step-content">
                <div className="opname-section-header">
                  <h2>
                    <FaMapMarkerAlt className="opname-section-icon" />
                    1. Lokasi Stok Awal
                  </h2>
                  <p>Pilih area fisik gudang tempat stok awal dimasukkan.</p>
                </div>

                {error && <div className="opname-callout opname-callout-error">{error}</div>}

                <div className="gudang-ui-form-grid" style={{ padding: "0 16px 16px", gap: "12px" }}>
                  <label className="gudang-ui-field">
                    <span>Gudang Produk</span>
                    <select className="ks-input" value={layoutId} onChange={(event) => setLayoutId(event.target.value)}>
                      {state.layouts.map((layout) => (
                        <option key={layout.id} value={layout.id}>
                          {layout.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="gudang-ui-field">
                    <span>Lantai</span>
                    <select className="ks-input" value={floorId} onChange={(event) => setFloorId(event.target.value)}>
                      {floors.map((floor) => (
                        <option key={floor.id} value={floor.id}>
                          {floor.label || `Lantai ${floor.number}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="gudang-ui-field">
                    <span>Bilik / Blok</span>
                    <select className="ks-input" value={blockId} onChange={(event) => setBlockId(event.target.value)}>
                      {blocks.map((block) => (
                        <option key={block.id} value={block.id}>
                          {block.label || `Blok ${block.code}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="gudang-ui-field">
                    <span>Rak</span>
                    <select className="ks-input" value={rackId} onChange={(event) => setRackId(event.target.value)}>
                      {racks.map((rack) => (
                        <option key={rack.id} value={rack.id}>
                          {rack.label || `Rak ${String(rack.number).padStart(2, "0")}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="gudang-ui-field">
                    <span>Baris Rak</span>
                    <select className="ks-input" value={rowNumber} onChange={(event) => setRowNumber(event.target.value)}>
                      {Array.from({ length: Number(selectedRack?.rows || 0) }, (_, index) => index + 1).map((number) => (
                        <option key={number} value={number}>
                          Baris {number}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="gudang-ui-field">
                    <span>Catatan Sesi</span>
                    <input
                      className="ks-input"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Opsional, contoh: stok awal Mei"
                    />
                  </label>
                </div>

                <div className="opname-callout opname-callout-info" style={{ margin: "0 16px 16px" }}>
                  {selectedSlot ? buildSlotHeadline(selectedSlot) : "Lokasi belum lengkap."}
                </div>
                
                <div style={{ padding: "0 16px 16px" }}>
                  <button 
                    className="ks-btn ks-btn-primary" 
                    onClick={handleNextStep}
                    disabled={!selectedSlot}
                  >
                    Lanjut ke Scan Seri <FaChevronLeft style={{ transform: "rotate(180deg)", marginLeft: 6 }} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="opname-step-content">
                <div className="opname-scan-header">
                  <button
                    type="button"
                    className="ks-btn opname-back-btn"
                    onClick={() => setStep(STEP_SELECT_LOCATION)}
                    disabled={isSubmitting}
                  >
                    <FaChevronLeft /> Kembali ke Lokasi
                  </button>

                  <div className="opname-scan-meta">
                    <div className="opname-scan-meta-item">
                      <span className="opname-scan-meta-label">Lokasi Terpilih</span>
                      <span className="opname-scan-meta-value">{selectedSlot?.slotCode}</span>
                    </div>
                    <div className="opname-scan-meta-item">
                      <span className="opname-scan-meta-label">Isi Slot Saat Ini</span>
                      <span className="opname-scan-meta-value">
                        {selectedSlotSummary?.qty || 0} pcs
                      </span>
                    </div>
                  </div>
                </div>

                <div className="opname-scan-input-group">
                  <input
                    ref={serialScanInputRef}
                    type="text"
                    className="opname-scan-input"
                    value={serialScanValue}
                    onChange={handleSerialInputChange}
                    onKeyDown={handleSerialKeyDown}
                    placeholder="Scan kode seri ke kotak ini..."
                    disabled={serialLoading || isSubmitting}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="ks-btn ks-btn-primary"
                    onClick={() => handleScanSerial()}
                    disabled={serialLoading || isSubmitting || !serialScanValue.trim()}
                  >
                    {isSubmitting ? "Menyimpan..." : "Submit"}
                  </button>
                </div>

                {scanMessage && (
                  <div className="opname-callout opname-callout-info" style={{ marginTop: 12 }}>
                    {scanMessage}
                  </div>
                )}

                <div className="opname-scanned-list">
                  <div className="opname-scanned-header">
                    <h3>
                      Seri yang masuk di sesi ini ({scannedRows.length} qty)
                    </h3>
                  </div>
                  {scannedRows.length === 0 ? (
                    <div className="opname-empty" style={{ padding: "20px" }}>
                      Belum ada seri yang di-scan pada sesi ini.
                    </div>
                  ) : (
                    <ul className="opname-scanned-items" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {scannedRows.map((row) => (
                        <li key={row.id} className="opname-scanned-item" style={{ padding: "8px 12px", borderBottom: "1px solid var(--ks-line)" }}>
                          <FaCheckCircle style={{ color: "var(--ks-safe)", marginRight: "8px" }} />
                          {row.nomorSeri} ({row.qty} pcs)
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div style={{ marginTop: 32 }}>
                  <div className="opname-section-header">
                    <h2>Riwayat Stok Masuk Terbaru</h2>
                  </div>
                  <GudangActivityTable
                    rows={activityRows}
                    resolveSlotLabel={(slotId) => allSlots.find((slot) => String(slot.id) === String(slotId))?.slotCode || "-"}
                    resolveSkuLabel={(skuId) =>
                      state.skus.find((sku) => String(sku.id) === String(skuId))?.label || skuId
                    }
                  />
                </div>
              </div>
            )}
            
          </div>
        </div>
      </section>
    </div>
  );
};

export default StokAwalGudangProduk;

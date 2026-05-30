import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaClipboardCheck, FaQrcode } from "react-icons/fa";
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
import GudangProdukBaseShell from "./GudangProdukBaseShell";
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

const StokAwalGudangProduk = () => {
  const { state, setState, isLoading, error, refresh } = useGudangProdukWorkspace({
    includeCatalog: true,
    activityLimit: 500,
  });
  const [layoutId, setLayoutId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [rackId, setRackId] = useState("");
  const [rowNumber, setRowNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [serialItems, setSerialItems] = useState([]);
  const [serialScanValue, setSerialScanValue] = useState("");
  const [serialLoading, setSerialLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scannedRows, setScannedRows] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const serialScanInputRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const lastSubmittedScanRef = useRef("");

  useEffect(() => {
    if (!layoutId && state.layouts.length) {
      setLayoutId(state.layouts[0].id);
    }
  }, [layoutId, state.layouts]);

  useEffect(() => {
    let isMounted = true;

    const fetchSerials = async () => {
      try {
        setSerialLoading(true);
        const response = await API.get("/seri", { params: { all: 1 } });
        if (!isMounted) return;
        setSerialItems(Array.isArray(response?.data?.data) ? response.data.data : []);
      } catch (fetchError) {
        if (!isMounted) return;
        setScanMessage(
          fetchError?.response?.data?.message ||
            fetchError?.message ||
            "Gagal memuat data kode seri."
        );
      } finally {
        if (isMounted) {
          setSerialLoading(false);
        }
      }
    };

    fetchSerials();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const serialLookup = useMemo(() => {
    const lookup = new Map();

    serialItems.forEach((item) => {
      [
        item?.nomor_seri,
        item?.barcode,
        item?.sku && item?.nomor_seri ? `${item.sku} | ${item.nomor_seri}` : "",
      ].forEach((value) => {
        buildSerialSkuLookupKeys(value).forEach((key) => {
          if (key && !lookup.has(key)) {
            lookup.set(key, item);
          }
        });
      });
    });

    return lookup;
  }, [serialItems]);

  const totalQty = scannedRows.reduce((total, row) => total + Number(row.qty || 0), 0);
  const activityRows = state.activityLog
    .filter((item) => item.type === "placement")
    .slice(0, 10);
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
          .map((key) => serialSkuLookup.get(key))
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
    [serialSkuLookup, setState]
  );

  const handleScanSerial = async (rawValue = serialScanValue) => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    const rawScanValue = String(rawValue || "").trim();
    if (!rawScanValue) {
      return;
    }

    if (lastSubmittedScanRef.current === rawScanValue) {
      return;
    }

    lastSubmittedScanRef.current = rawScanValue;
    const scannedCode = parseScannedSerialCode(rawValue);
    const scannedValue = scannedCode.serialText;

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

    const serialItem =
      scannedCode.lookupValues
        .flatMap((value) => buildSerialSkuLookupKeys(value))
        .map((key) => serialLookup.get(key))
        .find(Boolean) ||
      null;
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
      await showGudangWarning(
        "Kode seri tidak ditemukan",
        `${scannedValue} tidak ditemukan di data kode seri. Scan format "SKU | KODE SERI" agar SKU bisa dibaca langsung.`
      );
      setScanMessage(`${scannedValue} tidak ditemukan.`);
      lastSubmittedScanRef.current = "";
      return;
    }

    const normalizedSerial = normalizeScanText(serialForPlacement.nomor_seri);
    if (
      scannedRows.some((row) => normalizeScanText(row.nomorSeri) === normalizedSerial) ||
      storedSerialSet.has(normalizedSerial)
    ) {
      await showGudangWarning(
        "Kode seri sudah masuk gudang",
        `${serialForPlacement.nomor_seri} sudah pernah discan dan masuk stok awal.`
      );
      setSerialScanValue("");
      setScanMessage(`${serialForPlacement.nomor_seri} sudah masuk gudang.`);
      lastSubmittedScanRef.current = "";
      setTimeout(() => {
        serialScanInputRef.current?.focus();
      }, 50);
      return;
    }

    try {
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
      setSerialScanValue("");
      setScanMessage(`Scan berhasil. Total sesi ini ${scannedRows.length + 1} kode seri.`);
      setTimeout(() => {
        serialScanInputRef.current?.focus();
      }, 50);
    } catch (submitError) {
      lastSubmittedScanRef.current = "";
      await showGudangError(
        "Gagal menyimpan stok awal",
        buildGudangWorkspaceErrorMessage(submitError, "Gagal menyimpan stok awal.")
      );
    } finally {
      setIsSubmitting(false);
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

    if (!value.trim() || isSubmitting || serialLoading) {
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

  return (
    <GudangProdukBaseShell
      title="Stok Awal"
      subtitle="Input stok awal per lokasi gudang. Pilih lantai, bilik/blok, rak, lalu masukkan beberapa SKU dalam satu sesi."
      icon={FaClipboardCheck}
      statusLabel={
        isLoading
          ? "Memuat workspace..."
          : isSubmitting
            ? "Menyimpan stok awal..."
            : selectedSlot
              ? `Lokasi ${selectedSlot.slotCode}`
              : "Pilih Lokasi Stok Awal"
      }
    >
      {error ? (
        <div className="gudang-ui-empty-panel" style={{ marginBottom: 20 }}>
          {error}
        </div>
      ) : null}

      <div className="gudang-ui-stat-grid">
        <GudangStatCard label="Stok Awal Masuk" value={`${totalQty} pcs`} helper={`${scannedRows.length} kode seri sesi ini`} />
        <GudangStatCard label="Scan Berhasil" value={scannedRows.length} helper="kode seri masuk stok awal" />
        <GudangStatCard label="Lokasi Dipilih" value={selectedSlot?.slotCode || "-"} helper="slot tujuan stok" />
        <GudangStatCard label="Isi Slot Saat Ini" value={selectedSlotSummary?.qty || 0} helper="pcs sebelum input stok awal" />
      </div>

      <div className="gudang-ui-grid split-hero">
        <section className="gudang-ui-form-card">
          <div className="gudang-ui-section-head">
            <div>
              <h2>1. Lokasi Stok Awal</h2>
              <p>Pilih area fisik gudang tempat stok awal dimasukkan.</p>
            </div>
          </div>

          <div className="gudang-ui-form-grid">
            <label className="gudang-ui-field">
              <span>Gudang Produk</span>
              <select value={layoutId} onChange={(event) => setLayoutId(event.target.value)}>
                {state.layouts.map((layout) => (
                  <option key={layout.id} value={layout.id}>
                    {layout.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="gudang-ui-field">
              <span>Lantai</span>
              <select value={floorId} onChange={(event) => setFloorId(event.target.value)}>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.label || `Lantai ${floor.number}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="gudang-ui-field">
              <span>Bilik / Blok</span>
              <select value={blockId} onChange={(event) => setBlockId(event.target.value)}>
                {blocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.label || `Blok ${block.code}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="gudang-ui-field">
              <span>Rak</span>
              <select value={rackId} onChange={(event) => setRackId(event.target.value)}>
                {racks.map((rack) => (
                  <option key={rack.id} value={rack.id}>
                    {rack.label || `Rak ${String(rack.number).padStart(2, "0")}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="gudang-ui-field">
              <span>Baris Rak</span>
              <select value={rowNumber} onChange={(event) => setRowNumber(event.target.value)}>
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
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Opsional, contoh: stok awal Mei"
              />
            </label>
          </div>

          <div className="gudang-ui-empty-panel" style={{ marginTop: 14, textAlign: "left" }}>
            {selectedSlot ? buildSlotHeadline(selectedSlot) : "Lokasi belum lengkap."}
          </div>
        </section>

        <section className="gudang-ui-form-card">
          <div className="gudang-ui-section-head">
            <div>
              <h2>2. Scan Stok Awal</h2>
              <p>Scan kode seri, lalu sistem otomatis mengambil SKU dan memasukkannya ke lokasi stok awal.</p>
            </div>
          </div>

          <label className="gudang-ui-field">
            <span>Kode Seri</span>
            <div className="gudang-stok-awal-scan-row">
              <input
                ref={serialScanInputRef}
                value={serialScanValue}
                onChange={handleSerialInputChange}
                onKeyDown={handleSerialKeyDown}
                placeholder="Scan kode seri"
                disabled={isSubmitting || serialLoading}
                autoComplete="off"
              />
              <button
                className="gudang-ui-button"
                type="button"
                onClick={() => handleScanSerial()}
                disabled={isSubmitting || serialLoading || !serialScanValue.trim()}
              >
                <FaQrcode /> Scan Masuk
              </button>
            </div>
          </label>

          <div className="gudang-stok-awal-scan-status">
            {serialLoading
              ? "Memuat data kode seri..."
              : scanMessage || "Scanner siap. Pastikan lokasi stok awal sudah dipilih."}
          </div>

          <div className="gudang-stok-awal-session-summary">
            <span>Sudah discan sesi ini</span>
            <strong>{scannedRows.length}</strong>
            <small>{totalQty} pcs stok awal sudah masuk ke gudang.</small>
          </div>

          <div className="gudang-ui-form-actions">
            <button className="gudang-ui-button-secondary" type="button" onClick={resetSession}>
              Reset Sesi
            </button>
          </div>
        </section>
      </div>

      <section className="gudang-ui-panel" style={{ marginTop: 20 }}>
        <div className="gudang-ui-section-head">
          <div>
            <h2>Riwayat Stok Masuk Terbaru</h2>
            <p>Stok awal tersimpan sebagai stok masuk pada lokasi yang dipilih.</p>
          </div>
        </div>
        <GudangActivityTable
          rows={activityRows}
          resolveSlotLabel={(slotId) => allSlots.find((slot) => String(slot.id) === String(slotId))?.slotCode || "-"}
          resolveSkuLabel={(skuId) =>
            state.skus.find((sku) => String(sku.id) === String(skuId))?.label || skuId
          }
        />
      </section>
    </GudangProdukBaseShell>
  );
};

export default StokAwalGudangProduk;

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaArrowRight, FaBarcode, FaCheck, FaExchangeAlt, FaMapMarkerAlt, FaTrash } from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import {
  getAllSlots,
  getSlotStockSummaryMap,
} from "./GudangProdukMockStore";
import {
  GudangActivityTable,
  GudangLayoutMap,
  GudangStatCard,
  formatGudangDate,
} from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
import useGudangProdukWorkspace from "./useGudangProdukWorkspace";
import {
  buildGudangWorkspaceErrorMessage,
  mutateGudangProdukSku,
} from "./GudangProdukWorkspaceApi";
import {
  showGudangError,
  showGudangSuccess,
  showGudangWarning,
} from "./GudangProdukAlerts";

const normalizeBarcodeToken = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

const normalizeSkuLookupKey = (value) =>
  normalizeBarcodeToken(value)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^A-Z0-9]/g, "");

const parseMutationBarcode = (rawBarcode) => {
  const barcode = String(rawBarcode || "").trim();
  if (!barcode) {
    return { error: "Barcode masih kosong." };
  }

  const parts = barcode
    .split("|")
    .map((part) => normalizeBarcodeToken(part))
    .filter(Boolean);

  if (parts.length < 2) {
    return {
      error: "Format barcode tidak valid. Gunakan format SKU | NOMOR_SERI.",
    };
  }

  return {
    barcode,
    skuCode: parts[0],
    serialCode: parts.slice(1).join(" | "),
    key: normalizeBarcodeToken(barcode),
  };
};

const WizardButton = ({ isActive, scene, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: "grid",
      gridTemplateColumns: "34px 1fr",
      gap: 10,
      alignItems: "center",
      minHeight: 74,
      border: `1px solid ${isActive ? "#2458ce" : scene.complete ? "#bbf7d0" : "#e2e8f0"}`,
      borderRadius: 8,
      background: isActive ? "#eff6ff" : scene.complete ? "#f0fdf4" : "#fff",
      color: "#0f172a",
      textAlign: "left",
      padding: 12,
      cursor: "pointer",
    }}
  >
    <span
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: isActive ? "#2458ce" : scene.complete ? "#16a34a" : "#e2e8f0",
        color: isActive || scene.complete ? "#fff" : "#64748b",
        fontWeight: 800,
      }}
    >
      {scene.complete ? <FaCheck size={13} /> : scene.id}
    </span>
    <span style={{ minWidth: 0 }}>
      <strong style={{ display: "block", fontSize: 13, lineHeight: 1.25 }}>{scene.title}</strong>
      <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "#64748b" }}>{scene.helper}</span>
    </span>
  </button>
);

const SlotSkuList = ({ emptyText, lines, resolveSkuLabel }) => (
  <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
    {lines.length ? (
      lines.map((line, index) => (
        <div
          key={line.skuId}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 10,
            alignItems: "center",
            padding: "9px 10px",
            borderTop: index ? "1px solid #e2e8f0" : 0,
          }}
        >
          <strong style={{ minWidth: 0, fontSize: 12, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {resolveSkuLabel(line.skuId)}
          </strong>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#2458ce" }}>{line.qty} pcs</span>
        </div>
      ))
    ) : (
      <div style={{ padding: 12, fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
        {emptyText}
      </div>
    )}
  </div>
);

const MutasiGudangProduk = () => {
  const { state, setState, isLoading, error } = useGudangProdukWorkspace();
  const [sourceLayoutId, setSourceLayoutId] = useState("");
  const [destinationLayoutId, setDestinationLayoutId] = useState("");
  const [sourceSlot, setSourceSlot] = useState(null);
  const [destinationSlot, setDestinationSlot] = useState(null);
  const [sourceSkuId, setSourceSkuId] = useState("");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedBarcodes, setScannedBarcodes] = useState([]);
  const [scanMessage, setScanMessage] = useState("Scan barcode produk untuk menentukan SKU dan qty mutasi.");
  const [activeScene, setActiveScene] = useState(1);
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    if (!sourceLayoutId && state.layouts.length) {
      setSourceLayoutId(state.layouts[0].id);
    }
    if (!destinationLayoutId && state.layouts.length) {
      setDestinationLayoutId(state.layouts[0].id);
    }
  }, [destinationLayoutId, sourceLayoutId, state.layouts]);

  const sourceLayout = useMemo(
    () => state.layouts.find((layout) => layout.id === sourceLayoutId) || state.layouts[0] || null,
    [sourceLayoutId, state.layouts]
  );
  const destinationLayout = useMemo(
    () => state.layouts.find((layout) => layout.id === destinationLayoutId) || state.layouts[0] || null,
    [destinationLayoutId, state.layouts]
  );

  const stockSummaryBySlot = useMemo(() => getSlotStockSummaryMap(state), [state]);
  const allSlots = useMemo(() => getAllSlots(state), [state]);
  const sourceLines = sourceSlot ? stockSummaryBySlot[sourceSlot.id]?.lines || [] : [];
  const destinationLines = destinationSlot ? stockSummaryBySlot[destinationSlot.id]?.lines || [] : [];
  const selectedSourceLine =
    sourceLines.find((line) => String(line.skuId) === String(sourceSkuId)) || null;
  const mutationRows = state.activityLog.filter((item) => item.type === "mutation").slice(0, 10);

  const findSkuByBarcode = (skuCode) => {
    const lookupKey = normalizeSkuLookupKey(skuCode);

    return (
      state.skus.find((sku) => normalizeSkuLookupKey(sku.code) === lookupKey) ||
      state.skus.find((sku) => normalizeSkuLookupKey(sku.label) === lookupKey) ||
      null
    );
  };

  const findSourceSlotForSku = (skuId) => {
    const stockedEntries = state.stockEntries.filter(
      (entry) => String(entry.skuId) === String(skuId) && Number(entry.qty || 0) > 0
    );

    if (stockedEntries.length !== 1) {
      return null;
    }

    return allSlots.find((slot) => String(slot.id) === String(stockedEntries[0].slotId)) || null;
  };

  useEffect(() => {
    if (sourceSlot && sourceLayout && sourceSlot.layoutId !== sourceLayout.id) {
      setSourceSlot(null);
      setSourceSkuId("");
    }
  }, [sourceLayout, sourceSlot]);

  useEffect(() => {
    if (destinationSlot && destinationLayout && destinationSlot.layoutId !== destinationLayout.id) {
      setDestinationSlot(null);
    }
  }, [destinationLayout, destinationSlot]);

  useEffect(() => {
    if (!sourceLines.length) {
      setSourceSkuId("");
      setScannedBarcodes((currentItems) => (currentItems.length ? [] : currentItems));
      return;
    }

    const stillExists = sourceLines.some((line) => String(line.skuId) === String(sourceSkuId));
    if (!stillExists) {
      setSourceSkuId("");
      setScannedBarcodes((currentItems) => (currentItems.length ? [] : currentItems));
    }
  }, [sourceLines, sourceSkuId]);

  useEffect(() => {
    if (!selectedSourceLine) {
      setQty(1);
      return;
    }

    if (qty > selectedSourceLine.qty) {
      setQty(selectedSourceLine.qty);
    }
  }, [qty, selectedSourceLine]);

  useEffect(() => {
    if (scannedBarcodes.length) {
      setQty(scannedBarcodes.length);
    }
  }, [scannedBarcodes]);

  useEffect(() => {
    if (activeScene === 2) {
      window.setTimeout(() => barcodeInputRef.current?.focus(), 0);
    }
  }, [activeScene]);

  const summary = {
    mutationCount: mutationRows.length,
    availableSourceSlots: Object.values(stockSummaryBySlot).filter((slot) => slot.qty > 0).length,
    sourceQty: selectedSourceLine?.qty || 0,
    targetQty: destinationSlot ? stockSummaryBySlot[destinationSlot.id]?.qty || 0 : 0,
  };

  const resetBarcodeScan = () => {
    setBarcodeInput("");
    setScannedBarcodes([]);
    setSourceSkuId("");
    setQty(1);
    setScanMessage("Scan barcode produk untuk menentukan SKU dan qty mutasi.");
    window.setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  const handleGoToScene = async (nextScene) => {
    if (nextScene > 1 && !sourceSlot) {
      await showGudangWarning(
        "Lokasi sumber belum dipilih",
        "Pilih lokasi sumber terlebih dahulu sebelum lanjut scan."
      );
      return;
    }

    if (nextScene > 2 && !scannedBarcodes.length) {
      await showGudangWarning(
        "Barcode belum discan",
        "Scan minimal satu barcode produk sebelum memilih lokasi tujuan."
      );
      return;
    }

    setActiveScene(nextScene);
  };

  const handleScanBarcode = async () => {
    const parsed = parseMutationBarcode(barcodeInput);

    if (parsed.error) {
      setScanMessage(parsed.error);
      await showGudangWarning("Barcode tidak valid", parsed.error);
      return;
    }

    if (scannedBarcodes.some((item) => item.key === parsed.key)) {
      setBarcodeInput("");
      setScanMessage(`Barcode ${parsed.serialCode} sudah discan.`);
      await showGudangWarning("Barcode duplikat", "Barcode ini sudah masuk daftar mutasi.");
      barcodeInputRef.current?.focus();
      return;
    }

    const matchedSku = findSkuByBarcode(parsed.skuCode);
    if (!matchedSku) {
      setScanMessage(`SKU ${parsed.skuCode} tidak ditemukan di master gudang.`);
      await showGudangWarning(
        "SKU tidak ditemukan",
        `SKU ${parsed.skuCode} belum tersedia di data gudang produk.`
      );
      return;
    }

    let activeSourceSlot = sourceSlot;
    if (!activeSourceSlot) {
      activeSourceSlot = findSourceSlotForSku(matchedSku.id);
      if (activeSourceSlot) {
        setSourceLayoutId(activeSourceSlot.layoutId);
        setSourceSlot(activeSourceSlot);
      }
    }

    if (!activeSourceSlot) {
      setSourceSkuId(matchedSku.id);
      setScanMessage("Pilih slot asal yang berisi SKU ini, lalu scan ulang barcode.");
      await showGudangWarning(
        "Slot asal belum dipilih",
        "SKU ditemukan, tetapi lokasi asal belum bisa dipastikan. Pilih slot asal di peta terlebih dahulu."
      );
      return;
    }

    const sourceLine = stockSummaryBySlot[activeSourceSlot.id]?.lines?.find(
      (line) => String(line.skuId) === String(matchedSku.id)
    );

    if (!sourceLine) {
      setScanMessage(`${matchedSku.code || matchedSku.label} tidak ada di slot asal ${activeSourceSlot.slotCode}.`);
      await showGudangWarning(
        "SKU tidak ada di slot asal",
        "Barcode yang discan tidak sesuai dengan stok pada slot asal."
      );
      return;
    }

    if (sourceSkuId && String(sourceSkuId) !== String(matchedSku.id)) {
      await showGudangWarning(
        "SKU berbeda",
        "Satu tiket mutasi hanya boleh berisi barcode dari SKU yang sama."
      );
      return;
    }

    if (scannedBarcodes.length + 1 > Number(sourceLine.qty || 0)) {
      await showGudangWarning(
        "Qty melebihi stok",
        `Stok ${matchedSku.code || matchedSku.label} di slot asal hanya ${sourceLine.qty} pcs.`
      );
      return;
    }

    setSourceSkuId(matchedSku.id);
    setScannedBarcodes((currentItems) => [
      ...currentItems,
      {
        key: parsed.key,
        barcode: parsed.barcode,
        skuCode: parsed.skuCode,
        serialCode: parsed.serialCode,
      },
    ]);
    setBarcodeInput("");
    setScanMessage(`${parsed.serialCode} masuk daftar mutasi.`);
    barcodeInputRef.current?.focus();
  };

  const handleBarcodeKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleScanBarcode();
  };

  const handleRemoveScannedBarcode = (barcodeKey) => {
    setScannedBarcodes((currentItems) => currentItems.filter((item) => item.key !== barcodeKey));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!sourceSlot || !destinationSlot || !selectedSourceLine || !scannedBarcodes.length) {
      await showGudangWarning(
        "Data mutasi belum lengkap",
        "Pilih slot asal, scan barcode produk, dan pilih slot tujuan terlebih dahulu."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await mutateGudangProdukSku({
        skuId: selectedSourceLine.skuId,
        fromSlotId: sourceSlot.id,
        toSlotId: destinationSlot.id,
        qty: scannedBarcodes.length,
        notes: [
          notes.trim(),
          `Barcode: ${scannedBarcodes.map((item) => item.serialCode).join(", ")}`,
        ]
          .filter(Boolean)
          .join(" | "),
      });
      setState(response.workspace);
      const matchedLabel = state.skus.find((sku) => String(sku.id) === String(selectedSourceLine.skuId))?.label || selectedSourceLine.skuId;
      await showGudangSuccess(
        "Mutasi berhasil disimpan",
        `Mutasi berhasil: ${matchedLabel} ke ${destinationSlot.slotCode}.`
      );
      setQty(1);
      setNotes("");
      setBarcodeInput("");
      setScannedBarcodes([]);
      setSourceSkuId("");
      setDestinationSlot(null);
      setActiveScene(1);
      barcodeInputRef.current?.focus();
    } catch (error) {
      await showGudangError(
        "Gagal menyimpan mutasi",
        buildGudangWorkspaceErrorMessage(error, "Gagal menyimpan mutasi.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveSlotLabel = (slotId) => allSlots.find((slot) => slot.id === slotId)?.slotCode || "-";
  const resolveSkuLabel = (skuId) =>
    state.skus.find((sku) => String(sku.id) === String(skuId))?.label || skuId;

  const wizardScenes = [
    {
      id: 1,
      title: "Pilih lokasi sumber",
      helper: sourceSlot ? sourceSlot.slotCode : "Belum dipilih",
      complete: Boolean(sourceSlot),
    },
    {
      id: 2,
      title: "Scan",
      helper: `${scannedBarcodes.length} barcode`,
      complete: scannedBarcodes.length > 0,
    },
    {
      id: 3,
      title: "Pilih lokasi untuk yang dipindah",
      helper: destinationSlot ? destinationSlot.slotCode : "Belum dipilih",
      complete: Boolean(destinationSlot),
    },
  ];

  const scannedList = (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
      {scannedBarcodes.length ? (
        scannedBarcodes.map((item, index) => (
          <div
            key={item.key}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 32px",
              alignItems: "center",
              gap: 8,
              padding: "9px 10px",
              borderTop: index ? "1px solid #e2e8f0" : 0,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>{index + 1}</span>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 12, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.serialCode}
              </strong>
              <span style={{ display: "block", fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.skuCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveScannedBarcode(item.key)}
              disabled={isSubmitting}
              style={{
                width: 28,
                height: 28,
                border: "1px solid #fee2e2",
                borderRadius: 8,
                background: "#fff5f5",
                color: "#dc2626",
                cursor: "pointer",
              }}
              title="Hapus barcode"
            >
              <FaTrash size={12} />
            </button>
          </div>
        ))
      ) : (
        <div style={{ padding: 12, fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
          Belum ada barcode discan.
        </div>
      )}
    </div>
  );

  return (
    <GudangProdukBaseShell
      title="Mutasi Gudang Produk"
      subtitle="Pindahkan stok antar slot, antar rak, atau antar gudang dengan alur visual. Qty asal akan berkurang otomatis dan riwayat mutasi tersimpan."
      icon={FaExchangeAlt}
      statusLabel={
        isLoading
          ? "Memuat workspace..."
          : isSubmitting
            ? "Menyimpan mutasi..."
            : `${summary.mutationCount} riwayat mutasi`
      }
    >
      {error ? (
        <div className="gudang-ui-empty-panel" style={{ marginBottom: 20 }}>
          {error}
        </div>
      ) : null}

      <div className="gudang-ui-stat-grid">
        <GudangStatCard label="Riwayat Mutasi" value={summary.mutationCount} helper="baris log terbaru" />
        <GudangStatCard label="Slot Sumber Aktif" value={summary.availableSourceSlots} helper="punya stok untuk dipilih" />
        <GudangStatCard label="Qty SKU Asal" value={summary.sourceQty} helper="stok sumber saat ini" />
        <GudangStatCard label="Qty Slot Tujuan" value={summary.targetQty} helper="isi target sebelum mutasi" />
      </div>

      <form onSubmit={handleSubmit}>
        <section className="gudang-ui-panel" style={{ marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            {wizardScenes.map((scene) => (
              <WizardButton
                key={scene.id}
                scene={scene}
                isActive={activeScene === scene.id}
                onClick={() => handleGoToScene(scene.id)}
              />
            ))}
          </div>
        </section>

        <div className="gudang-master-workspace-grid">
          <div className="gudang-master-main" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {activeScene === 1 ? (
              <section className="gudang-ui-panel">
                <div className="gudang-ui-panel-head" style={{ marginBottom: 12, alignItems: "flex-start" }}>
                  <div>
                    <h2>Scene 1: Pilih lokasi sumber</h2>
                    <p>Pilih gudang asal dan klik slot yang berisi stok produk.</p>
                  </div>
                  <div style={{ minWidth: 220 }}>
                    <select
                      className="gudang-ui-field"
                      style={{ width: "100%", margin: 0, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, backgroundColor: "#f8fafc" }}
                      value={sourceLayoutId}
                      onChange={(event) => setSourceLayoutId(event.target.value)}
                    >
                      {state.layouts.map((layout) => (
                        <option key={layout.id} value={layout.id}>{layout.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <GudangLayoutMap
                  layout={sourceLayout}
                  selectedSlotId={sourceSlot?.id}
                  onSelectSlot={setSourceSlot}
                  stockSummaryBySlot={stockSummaryBySlot}
                />
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: "#334155", textTransform: "uppercase" }}>
                      SKU di Slot Sumber
                    </label>
                    <strong style={{ fontSize: 13, color: "#2458ce" }}>
                      {sourceLines.reduce((total, line) => total + Number(line.qty || 0), 0)} pcs
                    </strong>
                  </div>
                  <SlotSkuList
                    lines={sourceLines}
                    resolveSkuLabel={resolveSkuLabel}
                    emptyText={sourceSlot ? "Slot sumber ini kosong." : "Pilih slot sumber untuk melihat SKU."}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button
                    type="button"
                    className="gudang-ui-button"
                    disabled={!sourceSlot}
                    onClick={() => handleGoToScene(2)}
                  >
                    Lanjut Scan <FaArrowRight />
                  </button>
                </div>
              </section>
            ) : null}

            {activeScene === 2 ? (
              <section className="gudang-ui-panel">
                <div className="gudang-ui-panel-head" style={{ marginBottom: 16 }}>
                  <div>
                    <h2>Scene 2: Scan</h2>
                    <p>Scan barcode satu per satu. Qty otomatis mengikuti jumlah barcode unik.</p>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="gudang-ui-field" style={{ marginBottom: 10 }}>
                    <label>Scan Barcode Produk</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        ref={barcodeInputRef}
                        value={barcodeInput}
                        onChange={(event) => setBarcodeInput(event.target.value)}
                        onKeyDown={handleBarcodeKeyDown}
                        placeholder="SKU | NOMOR_SERI"
                        autoComplete="off"
                        disabled={isSubmitting}
                        style={{ flex: 1, fontSize: 14, fontWeight: 700 }}
                      />
                      <button
                        type="button"
                        className="gudang-ui-button"
                        disabled={isSubmitting || !barcodeInput.trim()}
                        onClick={handleScanBarcode}
                        style={{ minWidth: 46, justifyContent: "center", padding: "0 12px" }}
                        title="Proses barcode"
                      >
                        <FaBarcode />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{scanMessage}</div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: "#334155", textTransform: "uppercase" }}>
                      Barcode Discan
                    </label>
                    <strong style={{ fontSize: 13, color: "#2458ce" }}>
                      {scannedBarcodes.length} / {selectedSourceLine?.qty || 0} pcs
                    </strong>
                  </div>
                  {scannedList}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => handleGoToScene(1)}
                    style={{ border: "1px solid #dbe4ef", borderRadius: 10, background: "#fff", color: "#64748b", fontWeight: 700, padding: "9px 12px", cursor: "pointer" }}
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    className="gudang-ui-button"
                    disabled={!scannedBarcodes.length}
                    onClick={() => handleGoToScene(3)}
                  >
                    Pilih Lokasi Tujuan <FaArrowRight />
                  </button>
                </div>
              </section>
            ) : null}

            {activeScene === 3 ? (
              <section className="gudang-ui-panel">
                <div className="gudang-ui-panel-head" style={{ marginBottom: 12, alignItems: "flex-start" }}>
                  <div>
                    <h2>Scene 3: Pilih lokasi untuk yang dipindah</h2>
                    <p>Pilih gudang tujuan dan klik slot tempat barcode hasil scan akan dipindahkan.</p>
                  </div>
                  <div style={{ minWidth: 220 }}>
                    <select
                      className="gudang-ui-field"
                      style={{ width: "100%", margin: 0, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, backgroundColor: "#f8fafc" }}
                      value={destinationLayoutId}
                      onChange={(event) => setDestinationLayoutId(event.target.value)}
                    >
                      {state.layouts.map((layout) => (
                        <option key={layout.id} value={layout.id}>{layout.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <GudangLayoutMap
                  layout={destinationLayout}
                  selectedSlotId={destinationSlot?.id}
                  onSelectSlot={setDestinationSlot}
                  stockSummaryBySlot={stockSummaryBySlot}
                />
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: "#334155", textTransform: "uppercase" }}>
                      SKU di Slot Tujuan
                    </label>
                    <strong style={{ fontSize: 13, color: "#2458ce" }}>
                      {destinationLines.reduce((total, line) => total + Number(line.qty || 0), 0)} pcs
                    </strong>
                  </div>
                  <SlotSkuList
                    lines={destinationLines}
                    resolveSkuLabel={resolveSkuLabel}
                    emptyText={destinationSlot ? "Slot tujuan ini kosong." : "Pilih slot tujuan untuk melihat SKU."}
                  />
                </div>

                <div className="gudang-ui-field" style={{ marginTop: 16, marginBottom: 20 }}>
                  <label>Catatan Opsional</label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Alasan mutasi..."
                    style={{ fontSize: 13, minHeight: 60 }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => handleGoToScene(2)}
                    style={{ border: "1px solid #dbe4ef", borderRadius: 10, background: "#fff", color: "#64748b", fontWeight: 700, padding: "9px 12px", cursor: "pointer" }}
                  >
                    Kembali Scan
                  </button>
                  <button
                    type="submit"
                    className="gudang-ui-button"
                    disabled={isSubmitting || !sourceSlot || !destinationSlot || !selectedSourceLine || !scannedBarcodes.length}
                  >
                    <FaExchangeAlt /> {isSubmitting ? "Memproses..." : `Eksekusi ${scannedBarcodes.length || 0} Barcode`}
                  </button>
                </div>
              </section>
            ) : null}

            <section className="gudang-ui-panel">
              <div className="gudang-ui-panel-head">
                <div>
                  <h2>Riwayat Mutasi Terbaru</h2>
                  <p>{formatGudangDate(mutationRows[0]?.createdAt || null)}</p>
                </div>
              </div>
              <GudangActivityTable
                rows={mutationRows}
                resolveSlotLabel={resolveSlotLabel}
                resolveSkuLabel={resolveSkuLabel}
              />
            </section>
          </div>

          <div className="gudang-master-visual-stack">
            <aside className="gudang-ui-panel" style={{ position: "sticky", top: 20 }}>
              <div className="gudang-ui-panel-head" style={{ marginBottom: 16 }}>
                <div>
                  <h2 style={{ color: "#2458ce" }}>Tiket Mutasi</h2>
                  <p>Ringkasan alur pemindahan stok.</p>
                </div>
              </div>

              <div style={{ marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, backgroundColor: "#f8fafc" }}>
                <strong style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 8, textTransform: "uppercase" }}>Slot Sumber</strong>
                {sourceSlot ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{sourceSlot.slotCode}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>{resolveSlotLabel(sourceSlot.id)}</div>
                    <div style={{ fontSize: 12, color: selectedSourceLine ? "#0f766e" : "#94a3b8", lineHeight: 1.5 }}>
                      {selectedSourceLine
                        ? `${resolveSkuLabel(selectedSourceLine.skuId)} tersedia ${selectedSourceLine.qty} pcs`
                        : sourceLines.length
                          ? "Scan barcode untuk mengunci SKU dari slot ini."
                          : "Slot ini kosong."}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <SlotSkuList
                        lines={sourceLines}
                        resolveSkuLabel={resolveSkuLabel}
                        emptyText="Slot sumber ini kosong."
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Klik slot di peta sumber.</div>
                )}
              </div>

              <div style={{ textAlign: "center", color: "#cbd5e1", marginBottom: 16 }}>
                <FaArrowRight style={{ transform: "rotate(90deg)" }} />
              </div>

              <div style={{ marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, backgroundColor: scannedBarcodes.length ? "#eff6ff" : "#f8fafc" }}>
                <strong style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 8, textTransform: "uppercase" }}>Barcode Discan</strong>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Qty mutasi</span>
                  <strong style={{ fontSize: 18, color: "#2458ce" }}>{scannedBarcodes.length}</strong>
                </div>
              </div>

              <div style={{ marginBottom: 20, border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, backgroundColor: destinationSlot ? "#ecfdf5" : "#f8fafc" }}>
                <strong style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 8, textTransform: "uppercase" }}>Slot Tujuan</strong>
                {destinationSlot ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", marginBottom: 2 }}>{destinationSlot.slotCode}</div>
                    <div style={{ fontSize: 11, color: "#0f5f59" }}>
                      {resolveSlotLabel(destinationSlot.id)} - Isi Saat Ini: {stockSummaryBySlot[destinationSlot.id]?.qty || 0} pcs
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <SlotSkuList
                        lines={destinationLines}
                        resolveSkuLabel={resolveSkuLabel}
                        emptyText="Slot tujuan ini kosong."
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Klik slot di peta tujuan.</div>
                )}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <button
                  type="button"
                  className="gudang-ui-button"
                  onClick={() => handleGoToScene(Math.min(activeScene + 1, 3))}
                  disabled={(activeScene === 1 && !sourceSlot) || (activeScene === 2 && !scannedBarcodes.length) || activeScene === 3}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {activeScene === 3 ? <FaMapMarkerAlt /> : <FaArrowRight />} {activeScene === 3 ? "Lengkapi Tujuan" : "Lanjut"}
                </button>

                {scannedBarcodes.length ? (
                  <button
                    type="button"
                    onClick={resetBarcodeScan}
                    disabled={isSubmitting}
                    style={{
                      width: "100%",
                      border: "1px solid #dbe4ef",
                      borderRadius: 10,
                      background: "#fff",
                      color: "#64748b",
                      fontWeight: 700,
                      padding: "9px 12px",
                      cursor: "pointer",
                    }}
                  >
                    Reset Scan
                  </button>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </form>
    </GudangProdukBaseShell>
  );
};

export default MutasiGudangProduk;

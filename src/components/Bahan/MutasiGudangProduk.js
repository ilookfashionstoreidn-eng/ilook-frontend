import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaArrowRight,
  FaBarcode,
  FaCheck,
  FaExchangeAlt,
  FaMapMarkerAlt,
  FaSave,
  FaSpinner,
  FaTrash,
} from "react-icons/fa";
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
  deleteMutationSession,
  executeMutationSession,
  fetchMutationSessions,
  storeMutationSession,
} from "./GudangProdukWorkspaceApi";
import {
  showGudangError,
  showGudangSuccess,
  showGudangWarning,
} from "./GudangProdukAlerts";

// ─── Barcode Helpers ──────────────────────────────────────────────────────────

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

// ─── Serial helpers ───────────────────────────────────────────────────────────

const getSerialsInSlot = (skuId, slotId, activityLog) => {
  if (!slotId || !activityLog || !activityLog.length) return [];

  const sortedLogs = [...activityLog].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  const serialLocations = {};

  sortedLogs.forEach((log) => {
    if (String(log.skuId) !== String(skuId)) return;

    const serials = [];
    const notes = log.notes || "";
    const parts = notes.split(" | ");

    if (log.type === "placement") {
      const nomorSeriPart = parts.find((p) =>
        p.trim().startsWith("Nomor seri:")
      );
      if (nomorSeriPart) {
        const val = nomorSeriPart.replace(/Nomor seri:\s*/i, "").trim();
        if (val.includes("-")) {
          const [start, end] = val.split("-").map((s) => s.trim());
          const lastDotStart = start.lastIndexOf(".");
          const lastDotEnd = end.lastIndexOf(".");
          if (lastDotStart !== -1 && lastDotEnd !== -1) {
            const base = start.slice(0, lastDotStart);
            const startNum = parseInt(start.slice(lastDotStart + 1), 10);
            const endNum = parseInt(end.slice(lastDotEnd + 1), 10);
            if (!isNaN(startNum) && !isNaN(endNum)) {
              for (let i = startNum; i <= endNum; i++) {
                serials.push(`${base}.${i}`);
              }
            }
          }
        } else {
          serials.push(val);
        }
      } else {
        const kodeSeriPart = parts.find((p) =>
          p.trim().startsWith("Kode seri:")
        );
        if (kodeSeriPart) {
          const val = kodeSeriPart.replace(/Kode seri:\s*/i, "").trim();
          serials.push(val);
        }
      }

      serials.forEach((s) => {
        const key = s.trim().toUpperCase();
        if (log.toSlotId) serialLocations[key] = log.toSlotId;
      });
    } else if (log.type === "mutation") {
      const barcodePart = parts.find((p) => p.trim().startsWith("Barcode:"));
      if (barcodePart) {
        const val = barcodePart.replace(/Barcode:\s*/i, "").trim();
        const barcodeList = val
          .split(",")
          .map((b) => {
            const clean = b.trim();
            if (clean.includes("|")) {
              const subParts = clean.split("|").map((sp) => sp.trim());
              return subParts[subParts.length - 1];
            }
            return clean;
          })
          .filter(Boolean);

        barcodeList.forEach((s) => {
          const key = s.trim().toUpperCase();
          if (log.toSlotId) {
            serialLocations[key] = log.toSlotId;
          } else {
            delete serialLocations[key];
          }
        });
      }
    }
  });

  return Object.entries(serialLocations)
    .filter(([, currentSlotId]) => String(currentSlotId) === String(slotId))
    .map(([serial]) => serial);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      border: `1px solid ${
        isActive ? "#2458ce" : scene.complete ? "#bbf7d0" : "#e2e8f0"
      }`,
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
        background: isActive
          ? "#2458ce"
          : scene.complete
          ? "#16a34a"
          : "#e2e8f0",
        color: isActive || scene.complete ? "#fff" : "#64748b",
        fontWeight: 800,
      }}
    >
      {scene.complete ? <FaCheck size={13} /> : scene.id}
    </span>
    <span style={{ minWidth: 0 }}>
      <strong style={{ display: "block", fontSize: 13, lineHeight: 1.25 }}>
        {scene.title}
      </strong>
      <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "#64748b" }}>
        {scene.helper}
      </span>
    </span>
  </button>
);

const SkuRowWithSerials = ({ line, index, resolveSkuLabel, activityLog, slotId }) => {
  const [showAll, setShowAll] = useState(false);
  const serials = useMemo(
    () => getSerialsInSlot(line.skuId, slotId, activityLog),
    [line.skuId, slotId, activityLog]
  );

  const visibleSerials = showAll ? serials : serials.slice(0, 5);
  const hasMore = serials.length > 5;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "9px 10px",
        borderTop: index ? "1px solid #e2e8f0" : 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <strong
          style={{
            minWidth: 0,
            fontSize: 12,
            color: "#0f172a",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {resolveSkuLabel(line.skuId)}
        </strong>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#2458ce", flexShrink: 0 }}>
          {line.qty} pcs
        </span>
      </div>
      {serials.length > 0 && (
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginRight: 2 }}>Seri:</span>
          {visibleSerials.map((s, idx) => (
            <span
              key={idx}
              style={{
                fontSize: 10,
                background: "#eff6ff",
                color: "#1e40af",
                padding: "1px 5px",
                borderRadius: 4,
                border: "1px solid #bfdbfe",
                fontWeight: 600,
              }}
            >
              {s}
            </span>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              style={{
                border: "none",
                background: "none",
                color: "#2563eb",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                padding: "1px 4px",
                marginLeft: 2,
              }}
            >
              {showAll ? "Sembunyikan" : `+${serials.length - 5} lagi`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const SlotSkuList = ({ emptyText, lines, resolveSkuLabel, activityLog, slotId }) => (
  <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
    {lines.length ? (
      lines.map((line, index) => (
        <SkuRowWithSerials
          key={line.skuId}
          line={line}
          index={index}
          resolveSkuLabel={resolveSkuLabel}
          activityLog={activityLog}
          slotId={slotId}
        />
      ))
    ) : (
      <div style={{ padding: 12, fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
        {emptyText}
      </div>
    )}
  </div>
);

// ─── Session Panel ────────────────────────────────────────────────────────────

const SessionCard = ({ session, resolveSkuLabel, resolveSlotLabel, onSelectSession, onDeleteSession, isDeleting }) => {
  const barcodeCount = Array.isArray(session.barcodes) ? session.barcodes.length : 0;
  const skuLabel = resolveSkuLabel(session.skuId);
  const slotLabel = resolveSlotLabel(session.fromSlotId);

  return (
    <div
      style={{
        border: "1px solid #bfdbfe",
        borderRadius: 12,
        padding: "12px 14px",
        backgroundColor: "#eff6ff",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: 13, color: "#1e3a8a", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {skuLabel}
          </strong>
          <span style={{ fontSize: 11, color: "#2563eb" }}>
            Dari: <strong>{slotLabel || session.fromSlotId}</strong> · {barcodeCount} barcode
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            background: "#dbeafe",
            color: "#1d4ed8",
            padding: "2px 7px",
            borderRadius: 20,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          PENDING
        </span>
      </div>

      {session.notes ? (
        <div style={{ fontSize: 11, color: "#475569", fontStyle: "italic", borderTop: "1px solid #bfdbfe", paddingTop: 6 }}>
          {session.notes}
        </div>
      ) : null}

      <div style={{ fontSize: 10, color: "#64748b" }}>
        {formatGudangDate(session.createdAt)}
      </div>

      {/* Barcode preview */}
      {barcodeCount > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {(session.barcodes || []).slice(0, 6).map((b, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                background: "#fff",
                border: "1px solid #bfdbfe",
                borderRadius: 4,
                padding: "1px 5px",
                color: "#1e40af",
                fontWeight: 600,
              }}
            >
              {b.serialCode}
            </span>
          ))}
          {barcodeCount > 6 && (
            <span style={{ fontSize: 10, color: "#64748b" }}>+{barcodeCount - 6} lagi</span>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          type="button"
          className="gudang-ui-button"
          onClick={() => onSelectSession(session)}
          style={{ flex: 1, justifyContent: "center", fontSize: 12 }}
        >
          <FaMapMarkerAlt size={11} /> Tentukan Tujuan
        </button>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => onDeleteSession(session.id)}
          style={{
            width: 36,
            height: 36,
            border: "1px solid #fee2e2",
            borderRadius: 8,
            background: "#fff5f5",
            color: "#dc2626",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Batalkan sesi"
        >
          {isDeleting ? <FaSpinner size={12} /> : <FaTrash size={12} />}
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const MutasiGudangProduk = () => {
  const { state, setState, isLoading, error } = useGudangProdukWorkspace();

  // Source selection (Scene 1)
  const [sourceLayoutId, setSourceLayoutId] = useState("");
  const [sourceSlot, setSourceSlot] = useState(null);
  const [sourceSkuId, setSourceSkuId] = useState("");

  // Scan (Scene 2)
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedBarcodes, setScannedBarcodes] = useState([]);
  const [scanMessage, setScanMessage] = useState(
    "Scan barcode produk untuk menentukan SKU dan qty mutasi."
  );
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");

  // Destination selection – for executing a session (Scene 3)
  const [activeSession, setActiveSession] = useState(null); // session being executed
  const [destinationLayoutId, setDestinationLayoutId] = useState("");
  const [destinationSlot, setDestinationSlot] = useState(null);
  const [execNotes, setExecNotes] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  // Session list
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Wizard
  const [activeScene, setActiveScene] = useState(1);

  const barcodeInputRef = useRef(null);

  // ── Defaults ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sourceLayoutId && state.layouts.length) {
      setSourceLayoutId(state.layouts[0].id);
    }
    if (!destinationLayoutId && state.layouts.length) {
      setDestinationLayoutId(state.layouts[0].id);
    }
  }, [destinationLayoutId, sourceLayoutId, state.layouts]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const sourceLayout = useMemo(
    () =>
      state.layouts.find((layout) => layout.id === sourceLayoutId) ||
      state.layouts[0] ||
      null,
    [sourceLayoutId, state.layouts]
  );

  const destinationLayout = useMemo(
    () =>
      state.layouts.find((layout) => layout.id === destinationLayoutId) ||
      state.layouts[0] ||
      null,
    [destinationLayoutId, state.layouts]
  );

  const stockSummaryBySlot = useMemo(() => getSlotStockSummaryMap(state), [state]);
  const allSlots = useMemo(() => getAllSlots(state), [state]);
  const sourceLines = sourceSlot ? stockSummaryBySlot[sourceSlot.id]?.lines || [] : [];
  const destinationLines = destinationSlot
    ? stockSummaryBySlot[destinationSlot.id]?.lines || []
    : [];

  const selectedSourceLine =
    sourceLines.find((line) => String(line.skuId) === String(sourceSkuId)) || null;

  const mutationRows = state.activityLog
    .filter((item) => item.type === "mutation")
    .slice(0, 10);

  // ── Session loading ──────────────────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const data = await fetchMutationSessions();
      setSessions(data);
    } catch {
      // silent – non-critical
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Slot / SKU guards ────────────────────────────────────────────────────────

  useEffect(() => {
    if (sourceSlot && sourceLayout && sourceSlot.layoutId !== sourceLayout.id) {
      setSourceSlot(null);
      setSourceSkuId("");
    }
  }, [sourceLayout, sourceSlot]);

  useEffect(() => {
    if (
      destinationSlot &&
      destinationLayout &&
      destinationSlot.layoutId !== destinationLayout.id
    ) {
      setDestinationSlot(null);
    }
  }, [destinationLayout, destinationSlot]);

  useEffect(() => {
    if (!sourceLines.length) {
      setSourceSkuId("");
      setScannedBarcodes((c) => (c.length ? [] : c));
      return;
    }
    const stillExists = sourceLines.some(
      (line) => String(line.skuId) === String(sourceSkuId)
    );
    if (!stillExists) {
      setSourceSkuId("");
      setScannedBarcodes((c) => (c.length ? [] : c));
    }
  }, [sourceLines, sourceSkuId]);

  useEffect(() => {
    if (activeScene === 2) {
      window.setTimeout(() => barcodeInputRef.current?.focus(), 0);
    }
  }, [activeScene]);

  // ── Helper fns ───────────────────────────────────────────────────────────────

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
      (entry) =>
        String(entry.skuId) === String(skuId) && Number(entry.qty || 0) > 0
    );
    if (stockedEntries.length !== 1) return null;
    return allSlots.find((slot) => String(slot.id) === String(stockedEntries[0].slotId)) || null;
  };

  const resolveSlotLabel = (slotId) =>
    allSlots.find((slot) => String(slot.id) === String(slotId))?.slotCode || slotId || "-";

  const resolveSkuLabel = (skuId) =>
    state.skus.find((sku) => String(sku.id) === String(skuId))?.label || String(skuId);

  const summary = {
    pendingSessions: sessions.length,
    mutationCount: mutationRows.length,
    availableSourceSlots: Object.values(stockSummaryBySlot).filter(
      (slot) => slot.qty > 0
    ).length,
    sourceQty: selectedSourceLine?.qty || 0,
  };

  // ── Scene navigation ─────────────────────────────────────────────────────────

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
        "Scan minimal satu barcode produk sebelum menyimpan sesi."
      );
      return;
    }
    setActiveScene(nextScene);
  };

  // ── Scene 2 – Scan ───────────────────────────────────────────────────────────

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
      setScanMessage(
        `${matchedSku.code || matchedSku.label} tidak ada di slot asal ${activeSourceSlot.slotCode}.`
      );
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
    setScannedBarcodes((items) => [
      ...items,
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
    setScannedBarcodes((items) => items.filter((item) => item.key !== barcodeKey));
  };

  const resetBarcodeScan = () => {
    setBarcodeInput("");
    setScannedBarcodes([]);
    setSourceSkuId("");
    setSessionNotes("");
    setScanMessage("Scan barcode produk untuk menentukan SKU dan qty mutasi.");
    window.setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  // ── Save Session ─────────────────────────────────────────────────────────────

  const handleSaveSession = async () => {
    if (!sourceSlot || !sourceSkuId || !scannedBarcodes.length) {
      await showGudangWarning(
        "Data belum lengkap",
        "Pilih slot sumber dan scan minimal satu barcode sebelum menyimpan sesi."
      );
      return;
    }

    try {
      setIsSavingSession(true);
      await storeMutationSession({
        fromSlotId: sourceSlot.id,
        skuId: sourceSkuId,
        barcodes: scannedBarcodes,
        notes: sessionNotes.trim() || null,
      });

      await showGudangSuccess(
        "Sesi disimpan",
        `${scannedBarcodes.length} barcode berhasil disimpan sebagai sesi. Pilih tujuan kapan saja.`
      );

      // Reset scan state
      setScannedBarcodes([]);
      setSourceSkuId("");
      setBarcodeInput("");
      setSessionNotes("");
      setScanMessage("Scan barcode produk untuk menentukan SKU dan qty mutasi.");
      setActiveScene(1);

      // Reload sessions list
      await loadSessions();
    } catch (err) {
      await showGudangError(
        "Gagal menyimpan sesi",
        buildGudangWorkspaceErrorMessage(err, "Gagal menyimpan sesi scan.")
      );
    } finally {
      setIsSavingSession(false);
    }
  };


  // ── Session actions ──────────────────────────────────────────────────────────

  const handleSelectSession = (session) => {
    setActiveSession(session);
    setDestinationSlot(null);
    setExecNotes("");
    if (state.layouts.length && !destinationLayoutId) {
      setDestinationLayoutId(state.layouts[0].id);
    }
    setActiveScene(3);
  };

  const handleDeleteSession = async (sessionId) => {
    setDeletingId(sessionId);
    try {
      await deleteMutationSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      await showGudangSuccess("Sesi dibatalkan", "Sesi scan telah dihapus.");
    } catch (err) {
      await showGudangError(
        "Gagal menghapus sesi",
        buildGudangWorkspaceErrorMessage(err, "Gagal menghapus sesi.")
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ── Execute Session (Scene 3) ────────────────────────────────────────────────

  const handleExecuteSession = async (event) => {
    event.preventDefault();

    if (!activeSession || !destinationSlot) {
      await showGudangWarning(
        "Tujuan belum dipilih",
        "Pilih slot tujuan terlebih dahulu."
      );
      return;
    }

    if (destinationSlot.id === activeSession.fromSlotId) {
      await showGudangWarning(
        "Slot sama",
        "Slot tujuan harus berbeda dari slot asal."
      );
      return;
    }

    try {
      setIsExecuting(true);
      const result = await executeMutationSession(activeSession.id, {
        toSlotId: destinationSlot.id,
        notes: execNotes.trim() || null,
      });
      setState(result.workspace);

      const skuLabel = resolveSkuLabel(activeSession.skuId);
      await showGudangSuccess(
        "Mutasi berhasil",
        `${scannedBarcodes.length || activeSession.barcodes?.length || 0} barcode "${skuLabel}" berhasil dipindah ke ${destinationSlot.slotCode}.`
      );

      // Clean up
      setActiveSession(null);
      setDestinationSlot(null);
      setExecNotes("");
      setActiveScene(1);
      await loadSessions();
    } catch (err) {
      await showGudangError(
        "Gagal mengeksekusi mutasi",
        buildGudangWorkspaceErrorMessage(err, "Gagal mengeksekusi mutasi dari sesi.")
      );
    } finally {
      setIsExecuting(false);
    }
  };

  // ── Wizard scenes config ──────────────────────────────────────────────────────

  const wizardScenes = [
    {
      id: 1,
      title: "Pilih lokasi sumber",
      helper: sourceSlot ? sourceSlot.slotCode : "Belum dipilih",
      complete: Boolean(sourceSlot),
    },
    {
      id: 2,
      title: "Scan & Simpan Sesi",
      helper: `${scannedBarcodes.length} barcode discan`,
      complete: scannedBarcodes.length > 0,
    },
    {
      id: 3,
      title: "Tentukan tujuan sesi",
      helper: activeSession
        ? `Sesi #${activeSession.id} · ${destinationSlot ? destinationSlot.slotCode : "pilih slot"}`
        : "Pilih sesi dari daftar",
      complete: Boolean(activeSession && destinationSlot),
    },
  ];

  // ── Scanned list render ───────────────────────────────────────────────────────

  const scannedList = (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
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
              <strong
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "#0f172a",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.serialCode}
              </strong>
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "#64748b",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.skuCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveScannedBarcode(item.key)}
              disabled={isSavingSession}
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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <GudangProdukBaseShell
      title="Mutasi Gudang Produk"
      subtitle="Scan barcode produk dan simpan sebagai sesi. Tentukan lokasi tujuan kapan saja dari daftar sesi pending."
      icon={FaExchangeAlt}
      statusLabel={
        isLoading
          ? "Memuat workspace..."
          : isExecuting
          ? "Mengeksekusi mutasi..."
          : `${summary.pendingSessions} sesi pending · ${summary.mutationCount} riwayat`
      }
    >
      {error ? (
        <div className="gudang-ui-empty-panel" style={{ marginBottom: 20 }}>
          {error}
        </div>
      ) : null}

      {/* Stat cards */}
      <div className="gudang-ui-stat-grid">
        <GudangStatCard
          label="Sesi Pending"
          value={summary.pendingSessions}
          helper="menunggu tujuan"
        />
        <GudangStatCard
          label="Riwayat Mutasi"
          value={summary.mutationCount}
          helper="log terbaru"
        />
        <GudangStatCard
          label="Slot Aktif"
          value={summary.availableSourceSlots}
          helper="punya stok"
        />
        <GudangStatCard
          label="Qty SKU Asal"
          value={summary.sourceQty}
          helper="stok sumber dipilih"
        />
      </div>

      {/* Wizard step indicator */}
      <section className="gudang-ui-panel" style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          {wizardScenes.map((scene) => (
            <WizardButton
              key={scene.id}
              scene={scene}
              isActive={activeScene === scene.id}
              onClick={() => {
                if (scene.id <= 2) handleGoToScene(scene.id);
              }}
            />
          ))}
        </div>
      </section>

      <div className="gudang-master-workspace-grid">
        <div className="gudang-master-main" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Scene 1: Pilih slot sumber ── */}
          {activeScene === 1 && (
            <section className="gudang-ui-panel">
              <div className="gudang-ui-panel-head" style={{ marginBottom: 12, alignItems: "flex-start" }}>
                <div>
                  <h2>Scene 1: Pilih lokasi sumber</h2>
                  <p>Pilih gudang asal dan klik slot yang berisi stok produk.</p>
                </div>
                <div style={{ minWidth: 220 }}>
                  <select
                    className="gudang-ui-field"
                    style={{
                      width: "100%",
                      margin: 0,
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      fontSize: 13,
                      backgroundColor: "#f8fafc",
                    }}
                    value={sourceLayoutId}
                    onChange={(e) => setSourceLayoutId(e.target.value)}
                  >
                    {state.layouts.map((layout) => (
                      <option key={layout.id} value={layout.id}>
                        {layout.name}
                      </option>
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#334155",
                      textTransform: "uppercase",
                    }}
                  >
                    SKU di Slot Sumber
                  </label>
                  <strong style={{ fontSize: 13, color: "#2458ce" }}>
                    {sourceLines.reduce((t, l) => t + Number(l.qty || 0), 0)} pcs
                  </strong>
                </div>
                <SlotSkuList
                  lines={sourceLines}
                  resolveSkuLabel={resolveSkuLabel}
                  emptyText={sourceSlot ? "Slot sumber ini kosong." : "Pilih slot sumber untuk melihat SKU."}
                  activityLog={state.activityLog}
                  slotId={sourceSlot?.id}
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
          )}

          {/* ── Scene 2: Scan & Simpan Sesi ── */}
          {activeScene === 2 && (
            <section className="gudang-ui-panel">
              <div className="gudang-ui-panel-head" style={{ marginBottom: 16 }}>
                <div>
                  <h2>Scene 2: Scan Barcode</h2>
                  <p>
                    Scan barcode satu per satu lalu tekan <strong>Simpan Sesi</strong>.
                    Tujuan slot akan ditentukan setelah ini.
                  </p>
                </div>
              </div>

              {/* Barcode input */}
              <div style={{ marginBottom: 16 }}>
                <div className="gudang-ui-field" style={{ marginBottom: 10 }}>
                  <label>Scan Barcode Produk</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      ref={barcodeInputRef}
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={handleBarcodeKeyDown}
                      placeholder="SKU | NOMOR_SERI"
                      autoComplete="off"
                      disabled={isSavingSession}
                      style={{ flex: 1, fontSize: 14, fontWeight: 700 }}
                    />
                    <button
                      type="button"
                      className="gudang-ui-button"
                      disabled={isSavingSession || !barcodeInput.trim()}
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

              {/* Scanned list */}
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#334155",
                      textTransform: "uppercase",
                    }}
                  >
                    Barcode Discan
                  </label>
                  <strong style={{ fontSize: 13, color: "#2458ce" }}>
                    {scannedBarcodes.length} / {selectedSourceLine?.qty || 0} pcs
                  </strong>
                </div>
                {scannedList}
              </div>

              {/* Optional notes for session */}
              <div className="gudang-ui-field" style={{ marginBottom: 16 }}>
                <label>Catatan Sesi (opsional)</label>
                <input
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Catatan untuk sesi ini..."
                  disabled={isSavingSession}
                  style={{ fontSize: 13 }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => handleGoToScene(1)}
                  style={{
                    border: "1px solid #dbe4ef",
                    borderRadius: 10,
                    background: "#fff",
                    color: "#64748b",
                    fontWeight: 700,
                    padding: "9px 12px",
                    cursor: "pointer",
                  }}
                >
                  Kembali
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  {scannedBarcodes.length > 0 && (
                    <button
                      type="button"
                      onClick={resetBarcodeScan}
                      disabled={isSavingSession}
                      style={{
                        border: "1px solid #dbe4ef",
                        borderRadius: 10,
                        background: "#fff",
                        color: "#64748b",
                        fontWeight: 700,
                        padding: "9px 12px",
                        cursor: "pointer",
                      }}
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    className="gudang-ui-button"
                    disabled={isSavingSession || !scannedBarcodes.length}
                    onClick={handleSaveSession}
                    style={{ gap: 8 }}
                  >
                    <FaSave size={13} />
                    {isSavingSession ? "Menyimpan..." : `Simpan Sesi (${scannedBarcodes.length})`}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ── Scene 3: Tentukan tujuan sesi ── */}
          {activeScene === 3 && activeSession && (
            <section className="gudang-ui-panel">
              <div className="gudang-ui-panel-head" style={{ marginBottom: 12, alignItems: "flex-start" }}>
                <div>
                  <h2>Scene 3: Tentukan Lokasi Tujuan</h2>
                  <p>
                    Sesi <strong>#{activeSession.id}</strong> ·{" "}
                    {resolveSkuLabel(activeSession.skuId)} ·{" "}
                    {(activeSession.barcodes || []).length} barcode dari{" "}
                    <strong>{resolveSlotLabel(activeSession.fromSlotId)}</strong>
                  </p>
                </div>
                <div style={{ minWidth: 220 }}>
                  <select
                    className="gudang-ui-field"
                    style={{
                      width: "100%",
                      margin: 0,
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      fontSize: 13,
                      backgroundColor: "#f8fafc",
                    }}
                    value={destinationLayoutId}
                    onChange={(e) => setDestinationLayoutId(e.target.value)}
                  >
                    {state.layouts.map((layout) => (
                      <option key={layout.id} value={layout.id}>
                        {layout.name}
                      </option>
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#334155",
                      textTransform: "uppercase",
                    }}
                  >
                    SKU di Slot Tujuan
                  </label>
                  <strong style={{ fontSize: 13, color: "#2458ce" }}>
                    {destinationLines.reduce((t, l) => t + Number(l.qty || 0), 0)} pcs
                  </strong>
                </div>
                <SlotSkuList
                  lines={destinationLines}
                  resolveSkuLabel={resolveSkuLabel}
                  emptyText={
                    destinationSlot ? "Slot tujuan ini kosong." : "Pilih slot tujuan untuk melihat SKU."
                  }
                  activityLog={state.activityLog}
                  slotId={destinationSlot?.id}
                />
              </div>

              <div className="gudang-ui-field" style={{ marginTop: 16, marginBottom: 20 }}>
                <label>Catatan Tambahan (opsional)</label>
                <textarea
                  value={execNotes}
                  onChange={(e) => setExecNotes(e.target.value)}
                  placeholder="Catatan eksekusi mutasi..."
                  style={{ fontSize: 13, minHeight: 60 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveScene(1);
                    setActiveSession(null);
                    setDestinationSlot(null);
                  }}
                  style={{
                    border: "1px solid #dbe4ef",
                    borderRadius: 10,
                    background: "#fff",
                    color: "#64748b",
                    fontWeight: 700,
                    padding: "9px 12px",
                    cursor: "pointer",
                  }}
                >
                  Kembali
                </button>
                <button
                  type="button"
                  className="gudang-ui-button"
                  disabled={isExecuting || !destinationSlot}
                  onClick={handleExecuteSession}
                >
                  <FaExchangeAlt />{" "}
                  {isExecuting
                    ? "Memproses..."
                    : `Eksekusi ${(activeSession.barcodes || []).length} Barcode`}
                </button>
              </div>
            </section>
          )}

          {/* ── Daftar Sesi Pending ── */}
          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head" style={{ marginBottom: 16 }}>
              <div>
                <h2>Sesi Scan Pending</h2>
                <p>
                  {sessions.length
                    ? `${sessions.length} sesi menunggu penentuan lokasi tujuan.`
                    : "Belum ada sesi yang tersimpan."}
                </p>
              </div>
              <button
                type="button"
                onClick={loadSessions}
                disabled={isLoadingSessions}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "6px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {isLoadingSessions ? <FaSpinner size={11} /> : null}
                Refresh
              </button>
            </div>

            {sessions.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "28px 20px",
                  color: "#94a3b8",
                  fontSize: 13,
                  background: "#f8fafc",
                  borderRadius: 10,
                  border: "1px dashed #e2e8f0",
                }}
              >
                Scan barcode di Scene 2 lalu tekan <strong>Simpan Sesi</strong> untuk menambahkan sesi ke sini.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    resolveSkuLabel={resolveSkuLabel}
                    resolveSlotLabel={resolveSlotLabel}
                    onSelectSession={handleSelectSession}
                    onDeleteSession={handleDeleteSession}
                    isDeleting={deletingId === session.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Riwayat Mutasi ── */}
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

        {/* ── Sidebar: Tiket ── */}
        <div className="gudang-master-visual-stack">
          <aside className="gudang-ui-panel" style={{ position: "sticky", top: 20 }}>
            <div className="gudang-ui-panel-head" style={{ marginBottom: 16 }}>
              <div>
                <h2 style={{ color: "#2458ce" }}>Tiket Mutasi</h2>
                <p>Ringkasan alur pemindahan stok.</p>
              </div>
            </div>

            {/* Slot Sumber */}
            <div
              style={{
                marginBottom: 16,
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 12,
                backgroundColor: "#f8fafc",
              }}
            >
              <strong
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  display: "block",
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Slot Sumber
              </strong>
              {sourceSlot ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
                    {sourceSlot.slotCode}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>
                    {resolveSlotLabel(sourceSlot.id)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: selectedSourceLine ? "#0f766e" : "#94a3b8",
                      lineHeight: 1.5,
                    }}
                  >
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
                      activityLog={state.activityLog}
                      slotId={sourceSlot?.id}
                    />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                  Klik slot di peta sumber.
                </div>
              )}
            </div>

            <div style={{ textAlign: "center", color: "#cbd5e1", marginBottom: 16 }}>
              <FaArrowRight style={{ transform: "rotate(90deg)" }} />
            </div>

            {/* Barcode Discan */}
            <div
              style={{
                marginBottom: 16,
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 12,
                backgroundColor: scannedBarcodes.length ? "#eff6ff" : "#f8fafc",
              }}
            >
              <strong
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  display: "block",
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Barcode Discan
              </strong>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>Qty scan</span>
                <strong style={{ fontSize: 18, color: "#2458ce" }}>{scannedBarcodes.length}</strong>
              </div>
            </div>

            <div style={{ textAlign: "center", color: "#cbd5e1", marginBottom: 16 }}>
              <FaArrowRight style={{ transform: "rotate(90deg)" }} />
            </div>

            {/* Sesi aktif / tujuan */}
            <div
              style={{
                marginBottom: 20,
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 12,
                backgroundColor:
                  activeSession && destinationSlot
                    ? "#ecfdf5"
                    : activeSession
                    ? "#fef9c3"
                    : "#f8fafc",
              }}
            >
              <strong
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  display: "block",
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Slot Tujuan
              </strong>
              {activeSession ? (
                <>
                  <div style={{ fontSize: 11, color: "#92400e", marginBottom: 4 }}>
                    Sesi #{activeSession.id} dipilih
                  </div>
                  {destinationSlot ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", marginBottom: 2 }}>
                        {destinationSlot.slotCode}
                      </div>
                      <div style={{ fontSize: 11, color: "#0f5f59" }}>
                        {resolveSlotLabel(destinationSlot.id)} · Isi:{" "}
                        {stockSummaryBySlot[destinationSlot.id]?.qty || 0} pcs
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <SlotSkuList
                          lines={destinationLines}
                          resolveSkuLabel={resolveSkuLabel}
                          emptyText="Slot tujuan ini kosong."
                          activityLog={state.activityLog}
                          slotId={destinationSlot?.id}
                        />
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#92400e", fontStyle: "italic" }}>
                      Klik slot di peta tujuan.
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                  Pilih sesi dari daftar pending di bawah.
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div style={{ display: "grid", gap: 10 }}>
              {activeScene < 3 && (
                <button
                  type="button"
                  className="gudang-ui-button"
                  onClick={() => handleGoToScene(Math.min(activeScene + 1, 2))}
                  disabled={
                    (activeScene === 1 && !sourceSlot) ||
                    (activeScene === 2 && !scannedBarcodes.length)
                  }
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <FaArrowRight /> Lanjut
                </button>
              )}

              {scannedBarcodes.length > 0 && (
                <button
                  type="button"
                  onClick={resetBarcodeScan}
                  disabled={isSavingSession}
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
              )}
            </div>
          </aside>
        </div>
      </div>
    </GudangProdukBaseShell>
  );
};

export default MutasiGudangProduk;

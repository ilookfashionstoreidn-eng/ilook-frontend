import React, { useEffect, useMemo, useState } from "react";
import { FaArrowRight, FaExchangeAlt } from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import {
  getAllSlots,
  getSlotStockSummaryMap,
} from "./GudangProdukMockStore";
import {
  GudangActivityTable,
  GudangLayoutMap,
  GudangStatCard,
  buildSlotHeadline,
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

const normalizeSelectNumber = (value) => {
  if (value === "") {
    return "";
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
};

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
  const selectedSourceLine =
    sourceLines.find((line) => String(line.skuId) === String(sourceSkuId)) || null;
  const mutationRows = state.activityLog.filter((item) => item.type === "mutation").slice(0, 10);

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
      return;
    }

    const stillExists = sourceLines.some((line) => String(line.skuId) === String(sourceSkuId));
    if (!stillExists) {
      setSourceSkuId(sourceLines[0].skuId);
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

  const summary = {
    mutationCount: mutationRows.length,
    availableSourceSlots: Object.values(stockSummaryBySlot).filter((slot) => slot.qty > 0).length,
    sourceQty: selectedSourceLine?.qty || 0,
    targetQty: destinationSlot ? stockSummaryBySlot[destinationSlot.id]?.qty || 0 : 0,
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!sourceSlot || !destinationSlot || !selectedSourceLine) {
      await showGudangWarning(
        "Data mutasi belum lengkap",
        "Pilih slot asal, SKU, dan slot tujuan terlebih dahulu."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await mutateGudangProdukSku({
        skuId: selectedSourceLine.skuId,
        fromSlotId: sourceSlot.id,
        toSlotId: destinationSlot.id,
        qty,
        notes,
      });
      setState(response.workspace);
      const matchedLabel = state.skus.find((sku) => String(sku.id) === String(selectedSourceLine.skuId))?.label || selectedSourceLine.skuId;
      await showGudangSuccess(
        "Mutasi berhasil disimpan",
        `Mutasi berhasil: ${matchedLabel} ke ${destinationSlot.slotCode}.`
      );
      setQty(1);
      setNotes("");
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

      <div className="gudang-master-workspace-grid">
        {/* KOLOM KIRI: Peta dan Tabel Utama */}
        <div className="gudang-master-main" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head" style={{ marginBottom: 12, alignItems: "flex-start" }}>
              <div>
                <h2>1. Tentukan Lokasi Sumber</h2>
                <p>Pilih gudang asal dan klik slot di peta yang berisi stok SKU yang ingin dipindahkan.</p>
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
          </section>

          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head" style={{ marginBottom: 12, alignItems: "flex-start" }}>
              <div>
                <h2>2. Tentukan Lokasi Tujuan</h2>
                <p>Pilih gudang tujuan dan klik slot kosong atau slot yang sudah ada produk sejenis.</p>
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
          </section>

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

        {/* KOLOM KANAN: Form Mutasi Sticky */}
        <div className="gudang-master-visual-stack">
          <form className="gudang-ui-panel" style={{ position: "sticky", top: 20 }} onSubmit={handleSubmit}>
            <div className="gudang-ui-panel-head" style={{ marginBottom: 16 }}>
              <div>
                <h2 style={{ color: "#2458ce" }}>Form Tiket Mutasi</h2>
                <p>Selesaikan perpindahan stok.</p>
              </div>
            </div>

            {/* Kotak Sumber */}
            <div style={{ marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, backgroundColor: "#f8fafc" }}>
              <strong style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 8, textTransform: "uppercase" }}>Slot Sumber (Asal)</strong>
              {sourceSlot ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{sourceSlot.slotCode}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>{resolveSlotLabel(sourceSlot.id)}</div>
                  
                  <div className="gudang-ui-field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Pilih Varian di Slot ini</label>
                    <select
                      value={sourceSkuId === "" ? "" : String(sourceSkuId)}
                      onChange={(event) => setSourceSkuId(event.target.value)}
                      disabled={!sourceLines.length}
                      style={{ padding: "6px 10px", fontSize: 13 }}
                    >
                      <option value="">{sourceLines.length ? "--- Pilih SKU ---" : "Slot ini kosong"}</option>
                      {sourceLines.map((line) => (
                        <option key={line.skuId} value={line.skuId}>
                          {resolveSkuLabel(line.skuId)} ({line.qty} pcs)
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>← Klik slot di Peta Asal</div>
              )}
            </div>

            <div style={{ textAlign: "center", color: "#cbd5e1", marginBottom: 16 }}>
              <FaArrowRight style={{ transform: "rotate(90deg)" }} />
            </div>

            {/* Kotak Tujuan */}
            <div style={{ marginBottom: 20, border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, backgroundColor: destinationSlot ? "#ecfdf5" : "#f8fafc" }}>
              <strong style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 8, textTransform: "uppercase" }}>Slot Tujuan</strong>
              {destinationSlot ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", marginBottom: 2 }}>{destinationSlot.slotCode}</div>
                  <div style={{ fontSize: 11, color: "#0f5f59" }}>{resolveSlotLabel(destinationSlot.id)} · Isi Saat Ini: {stockSummaryBySlot[destinationSlot.id]?.qty || 0} pcs</div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>← Klik slot di Peta Tujuan</div>
              )}
            </div>

            <hr style={{ border: 0, borderTop: "1px dashed #cbd5e1", margin: "0 -20px 20px" }} />

            {/* Form Input */}
            <div className="gudang-ui-field" style={{ marginBottom: 14 }}>
              <label>Jumlah Pindah (Qty)</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="number"
                  min="1"
                  max={selectedSourceLine?.qty || 1}
                  value={qty}
                  disabled={!selectedSourceLine}
                  onChange={(event) =>
                    setQty(
                      Math.min(
                        selectedSourceLine?.qty || Number.MAX_SAFE_INTEGER,
                        Math.max(1, Number(event.target.value) || 1)
                      )
                    )
                  }
                  style={{ flex: 1, fontSize: 15, fontWeight: 700 }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>/ {selectedSourceLine?.qty || 0}</span>
              </div>
            </div>

            <div className="gudang-ui-field" style={{ marginBottom: 20 }}>
              <label>Catatan Opsional</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Alasan mutasi..."
                style={{ fontSize: 13, minHeight: 60 }}
              />
            </div>

            <button 
              type="submit" 
              className="gudang-ui-button" 
              disabled={isSubmitting || !sourceSlot || !destinationSlot || !selectedSourceLine}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <FaExchangeAlt /> {isSubmitting ? "Memproses..." : "Eksekusi Mutasi"}
            </button>
            
          </form>
        </div>
      </div>
    </GudangProdukBaseShell>
  );
};

export default MutasiGudangProduk;

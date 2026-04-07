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
      await showGudangSuccess(
        "Mutasi berhasil disimpan",
        `Mutasi berhasil: ${selectedSourceLine.sku?.label} ke ${destinationSlot.slotCode}.`
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

      <div className="gudang-ui-grid split-hero">
        <section className="gudang-ui-panel">
          <div className="gudang-ui-panel-head">
            <div>
              <h2>Form Mutasi</h2>
              <p>Pilih lokasi asal lebih dulu, lalu tentukan slot tujuan.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="gudang-ui-form-grid">
              <div className="gudang-ui-field">
                <label>Gudang Asal</label>
                <select value={sourceLayoutId} onChange={(event) => setSourceLayoutId(event.target.value)}>
                  {state.layouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="gudang-ui-field">
                <label>Gudang Tujuan</label>
                <select
                  value={destinationLayoutId}
                  onChange={(event) => setDestinationLayoutId(event.target.value)}
                >
                  {state.layouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="gudang-ui-field">
                <label>SKU pada Slot Asal</label>
                <select
                  value={sourceSkuId === "" ? "" : String(sourceSkuId)}
                  onChange={(event) => setSourceSkuId(normalizeSelectNumber(event.target.value))}
                  disabled={!sourceLines.length}
                >
                  <option value="">{sourceLines.length ? "Pilih SKU" : "Pilih slot asal dahulu"}</option>
                  {sourceLines.map((line) => (
                    <option key={line.skuId} value={line.skuId}>
                      {line.sku?.label} | {line.qty} pcs
                    </option>
                  ))}
                </select>
              </div>

              <div className="gudang-ui-field">
                <label>Qty Mutasi</label>
                <input
                  type="number"
                  min="1"
                  max={selectedSourceLine?.qty || 1}
                  value={qty}
                  onChange={(event) =>
                    setQty(
                      Math.min(
                        selectedSourceLine?.qty || Number.MAX_SAFE_INTEGER,
                        Math.max(1, Number(event.target.value) || 1)
                      )
                    )
                  }
                />
              </div>

              <div className="gudang-ui-field" style={{ gridColumn: "1 / -1" }}>
                <label>Catatan</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Contoh: redistribusi ke gudang showroom"
                />
              </div>
            </div>

            <div className="gudang-ui-callout" style={{ marginTop: 18 }}>
              {sourceSlot && destinationSlot && selectedSourceLine ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <FaExchangeAlt />
                  <strong>
                    {selectedSourceLine.sku?.label} | {qty} pcs
                  </strong>
                  <span>dari</span>
                  <strong>{sourceSlot.slotCode}</strong>
                  <FaArrowRight />
                  <strong>{destinationSlot.slotCode}</strong>
                </div>
              ) : (
                "Tentukan lokasi asal, SKU, dan lokasi tujuan untuk memulai mutasi."
              )}
            </div>

            <div className="gudang-ui-form-actions">
              <button type="submit" className="gudang-ui-button" disabled={isSubmitting}>
                <FaExchangeAlt /> Simpan Mutasi
              </button>
            </div>
          </form>

          <div className="gudang-ui-grid" style={{ marginTop: 18 }}>
            <div className="gudang-ui-detail-box">
              <h4>Slot Asal</h4>
              {sourceSlot ? (
                <>
                  <p>{buildSlotHeadline(sourceSlot)}</p>
                  <div className="gudang-ui-pill-list" style={{ marginTop: 12 }}>
                    {sourceLines.map((line) => (
                      <span key={line.id} className="gudang-ui-pill">
                        {line.sku?.label} | {line.qty} pcs
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p>Belum ada slot asal dipilih.</p>
              )}
            </div>

            <div className="gudang-ui-detail-box">
              <h4>Slot Tujuan</h4>
              {destinationSlot ? (
                <>
                  <p>{buildSlotHeadline(destinationSlot)}</p>
                  <p style={{ marginTop: 8 }}>
                    Isi saat ini: {stockSummaryBySlot[destinationSlot.id]?.qty || 0} pcs
                  </p>
                </>
              ) : (
                <p>Belum ada slot tujuan dipilih.</p>
              )}
            </div>
          </div>
        </section>

        <section className="gudang-ui-grid">
          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head">
              <div>
                <h2>Peta Asal</h2>
                <p>Klik slot yang berisi stok sebagai sumber mutasi.</p>
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
            <div className="gudang-ui-panel-head">
              <div>
                <h2>Peta Tujuan</h2>
                <p>Klik slot tujuan pada gudang yang diinginkan.</p>
              </div>
            </div>
            <GudangLayoutMap
              layout={destinationLayout}
              selectedSlotId={destinationSlot?.id}
              onSelectSlot={setDestinationSlot}
              stockSummaryBySlot={stockSummaryBySlot}
            />
          </section>
        </section>
      </div>

      <section className="gudang-ui-panel" style={{ marginTop: 20 }}>
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
    </GudangProdukBaseShell>
  );
};

export default MutasiGudangProduk;

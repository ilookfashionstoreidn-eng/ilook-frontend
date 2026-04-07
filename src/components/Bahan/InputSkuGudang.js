import React, { useEffect, useMemo, useState } from "react";
import { FaArrowRight, FaBoxOpen, FaSave } from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import {
  getAllSlots,
  getSkusByProductId,
  getSlotStockSummaryMap,
} from "./GudangProdukMockStore";
import {
  GudangActivityTable,
  GudangLayoutMap,
  GudangStatCard,
  buildGlobalSummary,
  buildSlotHeadline,
} from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
import useGudangProdukWorkspace from "./useGudangProdukWorkspace";
import {
  buildGudangWorkspaceErrorMessage,
  placeGudangProdukSku,
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

const InputSkuGudang = () => {
  const { state, setState, isLoading, error } = useGudangProdukWorkspace();
  const [layoutId, setLayoutId] = useState("");
  const [productId, setProductId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!layoutId && state.layouts.length) {
      setLayoutId(state.layouts[0].id);
    }
  }, [layoutId, state.layouts]);

  const selectedLayout = useMemo(
    () => state.layouts.find((layout) => layout.id === layoutId) || state.layouts[0] || null,
    [layoutId, state.layouts]
  );

  const selectedProduct =
    state.products.find((product) => String(product.id) === String(productId)) || null;
  const selectedSku = state.skus.find((sku) => String(sku.id) === String(skuId)) || null;
  const skuOptions = productId ? getSkusByProductId(state, productId) : [];
  const allSlots = useMemo(() => getAllSlots(state), [state]);
  const stockSummaryBySlot = getSlotStockSummaryMap(state);
  const globalSummary = buildGlobalSummary(state);
  const placementRows = state.activityLog.filter((item) => item.type === "placement").slice(0, 8);

  useEffect(() => {
    if (!selectedLayout || !selectedSlot) return;
    if (selectedSlot.layoutId !== selectedLayout.id) {
      setSelectedSlot(null);
    }
  }, [selectedLayout, selectedSlot]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedLayout || !selectedSlot || !selectedSku) {
      await showGudangWarning(
        "Data penempatan belum lengkap",
        "Pilih gudang, SKU, dan slot tujuan terlebih dahulu."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await placeGudangProdukSku({
        layoutId: selectedLayout.id,
        slotId: selectedSlot.id,
        skuId: Number(selectedSku.id),
        qty: Number(qty),
        notes,
      });
      setState(response.workspace);
      await showGudangSuccess(
        "Produk berhasil ditempatkan",
        `Produk berhasil dimasukkan ke ${selectedSlot.slotCode}.`
      );
      setQty(1);
      setNotes("");
    } catch (error) {
      await showGudangError(
        "Gagal menyimpan placement",
        buildGudangWorkspaceErrorMessage(error, "Gagal menyimpan placement.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveSlotLabel = (slotId) => allSlots.find((slot) => slot.id === slotId)?.slotCode || "-";

  const resolveSkuLabel = (currentSkuId) =>
    state.skus.find((sku) => String(sku.id) === String(currentSkuId))?.label || currentSkuId;

  return (
    <GudangProdukBaseShell
      title="Input SKU ke Gudang"
      subtitle="Pilih produk dan SKU, tentukan gudang tujuan, lalu klik slot pada layout visual untuk menyimpan stok masuk ke lokasi yang tepat."
      icon={FaBoxOpen}
      statusLabel={
        isLoading ? "Memuat workspace..." : isSubmitting ? "Menyimpan placement..." : "Direct Save Placement"
      }
    >
      {error ? (
        <div className="gudang-ui-empty-panel" style={{ marginBottom: 20 }}>
          {error}
        </div>
      ) : null}

      <div className="gudang-ui-stat-grid">
        <GudangStatCard label="Gudang Aktif" value={globalSummary.layoutCount} helper="siap dipakai" />
        <GudangStatCard label="Total Slot" value={globalSummary.slotCount} helper="hasil layout master" />
        <GudangStatCard label="Slot Terisi" value={globalSummary.filledSlots} helper="punya stok aktif" />
        <GudangStatCard label="Qty Tersimpan" value={globalSummary.totalQty} helper="stok aktif saat ini" />
      </div>

      <div className="gudang-ui-grid split-hero">
        <section className="gudang-ui-panel">
          <div className="gudang-ui-panel-head">
            <div>
              <h2>Form Penempatan</h2>
              <p>Setiap penempatan langsung tersimpan ke backend workspace.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="gudang-ui-form-grid">
              <div className="gudang-ui-field">
                <label>Gudang Produk</label>
                <select value={layoutId} onChange={(event) => setLayoutId(event.target.value)}>
                  {state.layouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="gudang-ui-field">
                <label>Produk</label>
                <select
                  value={productId === "" ? "" : String(productId)}
                  onChange={(event) => {
                    setProductId(normalizeSelectNumber(event.target.value));
                    setSkuId("");
                  }}
                >
                  <option value="">Pilih produk</option>
                  {state.products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="gudang-ui-field">
                <label>SKU</label>
                <select
                  value={skuId === "" ? "" : String(skuId)}
                  onChange={(event) => setSkuId(normalizeSelectNumber(event.target.value))}
                  disabled={!productId}
                >
                  <option value="">{productId ? "Pilih SKU" : "Pilih produk dahulu"}</option>
                  {skuOptions.map((sku) => (
                    <option key={sku.id} value={sku.id}>
                      {sku.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="gudang-ui-field">
                <label>Qty</label>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
                />
              </div>

              <div className="gudang-ui-field" style={{ gridColumn: "1 / -1" }}>
                <label>Catatan</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Contoh: stok datang dari QC / stok pindahan display"
                />
              </div>
            </div>

            <div className="gudang-ui-callout" style={{ marginTop: 18 }}>
              {selectedSlot ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <FaArrowRight />
                  <strong>
                    {selectedProduct?.name || "Produk"} / {selectedSku?.label || "SKU"} akan masuk ke{" "}
                    {selectedSlot.slotCode}
                  </strong>
                </div>
              ) : (
                "Klik salah satu slot pada layout untuk memilih lokasi penempatan."
              )}
            </div>

            <div className="gudang-ui-form-actions">
              <button type="submit" className="gudang-ui-button" disabled={isSubmitting}>
                <FaSave /> Simpan ke Gudang
              </button>
            </div>
          </form>

          <div className="gudang-ui-grid" style={{ marginTop: 18 }}>
            <div className="gudang-ui-detail-box">
              <h4>Slot Terpilih</h4>
              {selectedSlot ? (
                <>
                  <p>{buildSlotHeadline(selectedSlot)}</p>
                  {selectedSlot.alias ? <p style={{ marginTop: 8 }}>Alias: {selectedSlot.alias}</p> : null}
                </>
              ) : (
                <p>Belum ada slot dipilih.</p>
              )}
            </div>

            <div className="gudang-ui-detail-box">
              <h4>Isi Slot Saat Ini</h4>
              {selectedSlot && stockSummaryBySlot[selectedSlot.id]?.lines?.length ? (
                <div className="gudang-ui-pill-list">
                  {stockSummaryBySlot[selectedSlot.id].lines.map((line) => (
                    <span key={line.id} className="gudang-ui-pill">
                      {line.sku?.label} | {line.qty} pcs
                    </span>
                  ))}
                </div>
              ) : (
                <p>Slot masih kosong.</p>
              )}
            </div>
          </div>
        </section>

        <section className="gudang-ui-panel">
          <div className="gudang-ui-panel-head">
            <div>
              <h2>Layout Gudang</h2>
              <p>Klik slot untuk memilih tujuan penempatan.</p>
            </div>
          </div>

          <GudangLayoutMap
            layout={selectedLayout}
            selectedSlotId={selectedSlot?.id}
            onSelectSlot={setSelectedSlot}
            stockSummaryBySlot={stockSummaryBySlot}
          />
        </section>
      </div>

      <section className="gudang-ui-panel" style={{ marginTop: 20 }}>
          <div className="gudang-ui-panel-head">
            <div>
              <h2>Riwayat Placement Terbaru</h2>
              <p>Log placement backend terbaru untuk lokasi gudang.</p>
            </div>
          </div>

        <GudangActivityTable
          rows={placementRows}
          resolveSlotLabel={resolveSlotLabel}
          resolveSkuLabel={resolveSkuLabel}
        />
      </section>
    </GudangProdukBaseShell>
  );
};

export default InputSkuGudang;

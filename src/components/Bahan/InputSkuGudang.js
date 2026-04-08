import React, { useEffect, useMemo, useState } from "react";
import {
  FaArrowRight,
  FaBoxOpen,
  FaCheckCircle,
  FaMapMarkedAlt,
  FaSave,
} from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import {
  getAllSlots,
  getSkusByProductId,
  getSlotStockSummaryMap,
} from "./GudangProdukMockStore";
import {
  GudangActivityTable,
  GudangLayoutMap,
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
import InputSeriGudang from "./InputSeriGudang";

const normalizeSelectValue = (value) => (value === "" ? "" : value);

const buildSuggestionDescription = (item) => {
  if (item.hasSameSku) {
    return `SKU ini sudah ada ${item.sameSkuQty} pcs di slot ini.`;
  }

  if (item.isEmpty) {
    return "Slot kosong dan siap dipakai.";
  }

  return `${item.summary?.qty || 0} pcs tersimpan dengan ${item.summary?.skuCount || 0} SKU aktif.`;
};

const InputSkuGudang = () => {
  const { state, setState, isLoading, error } = useGudangProdukWorkspace();
  const [inputMode, setInputMode] = useState("sku");
  const [layoutId, setLayoutId] = useState("");
  const [productId, setProductId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!layoutId && state.layouts.length) {
      setLayoutId(String(state.layouts[0].id));
    }
  }, [layoutId, state.layouts]);

  const selectedLayout = useMemo(
    () =>
      state.layouts.find((layout) => String(layout.id) === String(layoutId)) ||
      state.layouts[0] ||
      null,
    [layoutId, state.layouts]
  );

  const selectedProduct =
    state.products.find((product) => String(product.id) === String(productId)) || null;
  const selectedSku = state.skus.find((sku) => String(sku.id) === String(skuId)) || null;
  const skuOptions = productId ? getSkusByProductId(state, productId) : [];
  const allSlots = useMemo(() => getAllSlots(state), [state]);
  const stockSummaryBySlot = useMemo(() => getSlotStockSummaryMap(state), [state]);
  const placementRows = state.activityLog
    .filter((item) => item.type === "placement")
    .slice(0, 5);

  useEffect(() => {
    if (!productId || !skuOptions.length) {
      if (skuId) {
        setSkuId("");
      }
      return;
    }

    const hasSelectedSku = skuOptions.some((sku) => String(sku.id) === String(skuId));
    if (!hasSelectedSku) {
      setSkuId(String(skuOptions[0].id));
    }
  }, [productId, skuId, skuOptions]);

  useEffect(() => {
    if (!selectedLayout || !selectedSlot) return;
    if (selectedSlot.layoutId !== selectedLayout.id) {
      setSelectedSlot(null);
    }
  }, [selectedLayout, selectedSlot]);

  const selectedLayoutSlots = useMemo(
    () =>
      selectedLayout
        ? allSlots.filter((slot) => String(slot.layoutId) === String(selectedLayout.id))
        : [],
    [allSlots, selectedLayout]
  );

  const selectedSlotLines = selectedSlot ? stockSummaryBySlot[selectedSlot.id]?.lines || [] : [];

  const sameSkuSlots = useMemo(() => {
    if (!selectedSku) {
      return [];
    }

    return selectedLayoutSlots.filter((slot) =>
      (stockSummaryBySlot[slot.id]?.lines || []).some(
        (line) => String(line.skuId) === String(selectedSku.id)
      )
    );
  }, [selectedLayoutSlots, selectedSku, stockSummaryBySlot]);

  const sameSkuTotalQty = useMemo(
    () =>
      sameSkuSlots.reduce((total, slot) => {
        const sameSkuQty = (stockSummaryBySlot[slot.id]?.lines || [])
          .filter((line) => String(line.skuId) === String(selectedSku?.id))
          .reduce((subtotal, line) => subtotal + Number(line.qty || 0), 0);

        return total + sameSkuQty;
      }, 0),
    [sameSkuSlots, selectedSku, stockSummaryBySlot]
  );

  const suggestedSlots = useMemo(() => {
    if (!selectedLayout) {
      return [];
    }

    return selectedLayoutSlots
      .map((slot) => {
        const summary = stockSummaryBySlot[slot.id];
        const sameSkuLines = selectedSku
          ? (summary?.lines || []).filter(
              (line) => String(line.skuId) === String(selectedSku.id)
            )
          : [];

        return {
          slot,
          summary,
          hasSameSku: sameSkuLines.length > 0,
          sameSkuQty: sameSkuLines.reduce((total, line) => total + Number(line.qty || 0), 0),
          isEmpty: !summary?.qty,
        };
      })
      .sort((left, right) => {
        if (left.hasSameSku !== right.hasSameSku) {
          return Number(right.hasSameSku) - Number(left.hasSameSku);
        }

        if (left.isEmpty !== right.isEmpty) {
          return Number(right.isEmpty) - Number(left.isEmpty);
        }

        if ((left.summary?.skuCount || 0) !== (right.summary?.skuCount || 0)) {
          return (left.summary?.skuCount || 0) - (right.summary?.skuCount || 0);
        }

        if ((left.summary?.qty || 0) !== (right.summary?.qty || 0)) {
          return (left.summary?.qty || 0) - (right.summary?.qty || 0);
        }

        return String(left.slot.slotCode).localeCompare(String(right.slot.slotCode));
      })
      .slice(0, 6);
  }, [selectedLayout, selectedLayoutSlots, selectedSku, stockSummaryBySlot]);

  const progressSteps = [
    {
      key: "barang",
      number: "1",
      title: "Pilih barang",
      description: selectedSku
        ? `${selectedProduct?.name || "Produk"} - ${selectedSku.label}`
        : "Pilih gudang, produk, lalu SKU yang ingin masuk.",
      isComplete: Boolean(selectedSku),
    },
    {
      key: "lokasi",
      number: "2",
      title: "Pilih lokasi",
      description: selectedSlot
        ? `${selectedSlot.slotCode} sudah dipilih.`
        : "Gunakan rekomendasi cepat atau klik slot di layout.",
      isComplete: Boolean(selectedSlot),
    },
    {
      key: "simpan",
      number: "3",
      title: "Simpan",
      description:
        selectedSku && selectedSlot
          ? "Ringkasan sudah lengkap dan siap disimpan."
          : "Lengkapi barang dan lokasi agar tombol simpan aktif.",
      isComplete: Boolean(selectedSku && selectedSlot),
    },
  ];

  const isFormReady = Boolean(selectedLayout && selectedSku && selectedSlot && Number(qty) > 0);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedLayout || !selectedSlot || !selectedSku) {
      await showGudangWarning(
        "Data penempatan belum lengkap",
        "Pilih SKU dan slot tujuan terlebih dahulu."
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
        `SKU berhasil dimasukkan ke ${selectedSlot.slotCode}.`
      );
      setQty(1);
      setNotes("");
      setSelectedSlot(null);
    } catch (submitError) {
      await showGudangError(
        "Gagal menyimpan placement",
        buildGudangWorkspaceErrorMessage(submitError, "Gagal menyimpan placement.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveSlotLabel = (slotId) => allSlots.find((slot) => slot.id === slotId)?.slotCode || "-";

  const resolveSkuLabel = (currentSkuId) =>
    state.skus.find((sku) => String(sku.id) === String(currentSkuId))?.label || currentSkuId;

  const getSkuLayoutSummary = (currentSku) => {
    const matchingSlots = selectedLayoutSlots.filter((slot) =>
      (stockSummaryBySlot[slot.id]?.lines || []).some(
        (line) => String(line.skuId) === String(currentSku.id)
      )
    );

    if (!matchingSlots.length) {
      return "Belum ada stok SKU ini di gudang terpilih.";
    }

    const totalQty = matchingSlots.reduce((total, slot) => {
      const sameSkuQty = (stockSummaryBySlot[slot.id]?.lines || [])
        .filter((line) => String(line.skuId) === String(currentSku.id))
        .reduce((subtotal, line) => subtotal + Number(line.qty || 0), 0);

      return total + sameSkuQty;
    }, 0);

    return `${totalQty} pcs tersimpan di ${matchingSlots.length} slot.`;
  };

  return (
    <GudangProdukBaseShell
      title="Input Stok ke Gudang"
      subtitle="Satu menu untuk dua kebutuhan input: bisa lewat SKU biasa atau langsung dari kode seri, dengan alur yang tetap sederhana untuk operator gudang."
      icon={FaBoxOpen}
      statusLabel={
        isLoading
          ? "Memuat workspace..."
          : isSubmitting
            ? "Menyimpan input..."
            : inputMode === "seri"
              ? "Mode Kode Seri"
              : isFormReady
                ? "Form Siap Disimpan"
                : "Panduan 3 Langkah"
      }
    >
      {error ? (
        <div className="gudang-ui-empty-panel" style={{ marginBottom: 20 }}>
          {error}
        </div>
      ) : null}

      <section className="gudang-ui-panel" style={{ marginBottom: 20 }}>
        <div className="gudang-ui-panel-head">
          <div>
            <h2>Pilih Jenis Input</h2>
            <p>Gunakan satu menu ini untuk input lewat SKU biasa atau dari kode seri.</p>
          </div>
        </div>

        <div className="gudang-serial-mode-switch">
          <button
            type="button"
            className={`gudang-serial-mode-button ${inputMode === "sku" ? "active" : ""}`}
            onClick={() => setInputMode("sku")}
          >
            Input per SKU
          </button>
          <button
            type="button"
            className={`gudang-serial-mode-button ${inputMode === "seri" ? "active" : ""}`}
            onClick={() => setInputMode("seri")}
          >
            Input dari Kode Seri
          </button>
        </div>
      </section>

      {inputMode === "seri" ? (
        <InputSeriGudang embedded />
      ) : (
        <>
      <div className="gudang-ui-grid gudang-simple-flow-grid">
        <section className="gudang-ui-panel gudang-simple-progress-panel">
          <div className="gudang-ui-panel-head">
            <div>
              <h2>Alur Input Cepat</h2>
              <p>User cukup ikuti 3 langkah di bawah ini tanpa harus paham istilah layout gudang.</p>
            </div>
          </div>

          <div className="gudang-simple-step-grid">
            {progressSteps.map((step) => (
              <div
                key={step.key}
                className={`gudang-simple-step-card ${step.isComplete ? "complete" : ""}`}
              >
                <div className="gudang-simple-step-badge">{step.number}</div>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
                {step.isComplete ? <FaCheckCircle className="gudang-simple-step-icon" /> : null}
              </div>
            ))}
          </div>

          <div className="gudang-ui-callout gudang-simple-callout">
            {selectedSku ? (
              <>
                <FaArrowRight />
                <strong>
                  {selectedSku.label} siap ditempatkan ke {selectedSlot?.slotCode || "slot yang dipilih"}.
                </strong>
              </>
            ) : (
              "Mulai dari pilih produk terlebih dahulu, lalu sistem akan menampilkan SKU yang bisa dipilih."
            )}
          </div>
        </section>

        <section className="gudang-ui-panel gudang-simple-summary-panel">
          <div className="gudang-ui-panel-head">
            <div>
              <h2>Ringkasan Input</h2>
              <p>Panel ini membantu user mengecek ulang sebelum klik simpan.</p>
            </div>
          </div>

          <div className="gudang-simple-summary-list">
            <div className="gudang-simple-summary-item">
              <span>Gudang</span>
              <strong>{selectedLayout?.name || "-"}</strong>
            </div>
            <div className="gudang-simple-summary-item">
              <span>Produk</span>
              <strong>{selectedProduct?.name || "-"}</strong>
            </div>
            <div className="gudang-simple-summary-item">
              <span>SKU</span>
              <strong>{selectedSku?.label || "-"}</strong>
            </div>
            <div className="gudang-simple-summary-item">
              <span>Qty</span>
              <strong>{qty || 0} pcs</strong>
            </div>
            <div className="gudang-simple-summary-item">
              <span>Lokasi Tujuan</span>
              <strong>{selectedSlot?.slotCode || "-"}</strong>
            </div>
          </div>

          <div className={`gudang-simple-review-badge ${isFormReady ? "ready" : ""}`}>
            {isFormReady
              ? "Data sudah lengkap dan aman untuk disimpan."
              : "Lengkapi barang dan lokasi agar input bisa disimpan."}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="gudang-ui-form-actions gudang-simple-submit-row">
              <button
                type="submit"
                className="gudang-ui-button"
                disabled={!isFormReady || isSubmitting}
              >
                <FaSave /> Simpan ke Gudang
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="gudang-ui-grid split-hero">
        <section className="gudang-ui-panel">
          <div className="gudang-ui-panel-head">
            <div>
              <h2>1. Pilih Barang</h2>
              <p>Field dibuat lebih ringkas supaya user tinggal pilih barang lalu lanjut ke lokasi.</p>
            </div>
          </div>

          <div className="gudang-ui-form-grid">
            <div className="gudang-ui-field">
              <label>Gudang Tujuan</label>
              <select
                value={layoutId === "" ? "" : String(layoutId)}
                onChange={(event) => setLayoutId(normalizeSelectValue(event.target.value))}
              >
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
                onChange={(event) => setProductId(normalizeSelectValue(event.target.value))}
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
              <label>Jumlah Masuk</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
              />
            </div>

            <div className="gudang-ui-field">
              <label>Catatan Opsional</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Contoh: stok datang dari QC, stok transfer, atau stok retur"
              />
            </div>
          </div>

          <div className="gudang-simple-sku-section">
            <div className="gudang-simple-section-label">
              <strong>SKU yang bisa dipilih</strong>
              <span>{productId ? "Klik salah satu SKU agar user tidak perlu buka dropdown lagi." : "Pilih produk dulu agar daftar SKU muncul."}</span>
            </div>

            {productId ? (
              skuOptions.length ? (
                <div className="gudang-simple-sku-grid">
                  {skuOptions.map((sku) => (
                    <button
                      key={sku.id}
                      type="button"
                      className={`gudang-simple-sku-card ${
                        String(selectedSku?.id) === String(sku.id) ? "active" : ""
                      }`}
                      onClick={() => setSkuId(String(sku.id))}
                    >
                      <strong>{sku.label}</strong>
                      <span>{sku.code || `SKU #${sku.id}`}</span>
                      <small>{getSkuLayoutSummary(sku)}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="gudang-ui-empty-panel">Produk ini belum memiliki SKU.</div>
              )
            ) : (
              <div className="gudang-ui-empty-panel">Pilih produk untuk menampilkan pilihan SKU.</div>
            )}
          </div>
        </section>

        <section className="gudang-ui-panel">
          <div className="gudang-ui-panel-head">
            <div>
              <h2>2. Pilih Lokasi</h2>
              <p>Lokasi disederhanakan dengan rekomendasi cepat, lalu tetap bisa dicek di layout visual.</p>
            </div>
          </div>

          {selectedSku ? (
            <>
              <div className="gudang-ui-callout gudang-simple-location-note">
                <FaMapMarkedAlt />
                <strong>
                  {sameSkuSlots.length
                    ? `SKU ini sudah tersimpan ${sameSkuTotalQty} pcs di ${sameSkuSlots.length} slot pada gudang ini.`
                    : "SKU ini belum pernah disimpan di gudang ini, jadi sistem memprioritaskan slot kosong."}
                </strong>
              </div>

              <div className="gudang-simple-section-label">
                <strong>Rekomendasi lokasi cepat</strong>
                <span>Pilih salah satu jika ingin input lebih cepat tanpa membaca seluruh peta.</span>
              </div>

              <div className="gudang-simple-slot-grid">
                {suggestedSlots.map((item) => (
                  <button
                    key={item.slot.id}
                    type="button"
                    className={`gudang-simple-slot-card ${
                      String(selectedSlot?.id) === String(item.slot.id) ? "active" : ""
                    }`}
                    onClick={() => setSelectedSlot(item.slot)}
                  >
                    <strong>{item.slot.slotCode}</strong>
                    <span>{buildSlotHeadline(item.slot)}</span>
                    <small>{buildSuggestionDescription(item)}</small>
                  </button>
                ))}
              </div>

              <div className="gudang-ui-grid gudang-simple-slot-detail-grid">
                <div className="gudang-ui-detail-box">
                  <h4>Slot Terpilih</h4>
                  {selectedSlot ? (
                    <>
                      <p>{buildSlotHeadline(selectedSlot)}</p>
                      {selectedSlot.alias ? <p className="gudang-simple-inline-note">Alias: {selectedSlot.alias}</p> : null}
                    </>
                  ) : (
                    <p>Belum ada slot dipilih. Klik rekomendasi atau pilih langsung dari layout di sebelah.</p>
                  )}
                </div>

                <div className="gudang-ui-detail-box">
                  <h4>Isi Slot Saat Ini</h4>
                  {selectedSlotLines.length ? (
                    <div className="gudang-ui-pill-list">
                      {selectedSlotLines.map((line) => (
                        <span key={line.id} className="gudang-ui-pill">
                          {line.sku?.label} | {line.qty} pcs
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p>Slot masih kosong dan siap dipakai.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="gudang-ui-empty-panel">
              Setelah SKU dipilih, rekomendasi lokasi akan muncul di sini.
            </div>
          )}
        </section>
      </div>

      <section className="gudang-ui-panel" style={{ marginTop: 20 }}>
        <div className="gudang-ui-panel-head">
          <div>
            <h2>Layout Gudang</h2>
            <p>Klik slot pada peta bila user ingin memastikan posisi lokasi secara visual.</p>
          </div>
        </div>

        <GudangLayoutMap
          layout={selectedLayout}
          selectedSlotId={selectedSlot?.id}
          onSelectSlot={setSelectedSlot}
          stockSummaryBySlot={stockSummaryBySlot}
        />
      </section>

      <section className="gudang-ui-panel" style={{ marginTop: 20 }}>
        <div className="gudang-ui-panel-head">
          <div>
            <h2>Riwayat Placement Terbaru</h2>
            <p>Riwayat singkat ini membantu user memastikan input terakhir sudah tercatat.</p>
          </div>
        </div>

        <GudangActivityTable
          rows={placementRows}
          resolveSlotLabel={resolveSlotLabel}
          resolveSkuLabel={resolveSkuLabel}
        />
      </section>
        </>
      )}
    </GudangProdukBaseShell>
  );
};

export default InputSkuGudang;

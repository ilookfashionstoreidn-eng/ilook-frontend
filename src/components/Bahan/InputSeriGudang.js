import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "../../api";
import { FaArrowRight, FaBarcode, FaCheckCircle, FaMapMarkedAlt, FaSave, FaSearch } from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import { getAllSlots, getSlotStockSummaryMap } from "./GudangProdukMockStore";
import { GudangLayoutMap, buildSlotHeadline } from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
import useGudangProdukWorkspace from "./useGudangProdukWorkspace";
import {
  buildGudangWorkspaceErrorMessage,
  ensureGudangProdukSkuActive,
  placeGudangProdukSku,
} from "./GudangProdukWorkspaceApi";
import { showGudangError, showGudangSuccess, showGudangWarning } from "./GudangProdukAlerts";
import {
  SERIAL_SKU_AUTO_MATCH_SCORE,
  buildSerialSkuSuggestions,
  findBestSerialSkuMatch,
  isSkuSearchMatch,
  normalizeLooseText,
} from "./GudangProdukSerialSkuUtils";

const normalizeSelectValue = (value) => (value === "" ? "" : value);

const buildSuggestionDescription = (item) => {
  if (item.hasSameSku) return `SKU ini sudah ada ${item.sameSkuQty} pcs di slot ini.`;
  if (item.isEmpty) return "Slot kosong dan siap dipakai.";
  return `${item.summary?.qty || 0} pcs tersimpan dengan ${item.summary?.skuCount || 0} SKU aktif.`;
};

const InputSeriGudang = ({ embedded = false }) => {
  const { state, setState, isLoading, error, refresh } = useGudangProdukWorkspace();
  const [layoutId, setLayoutId] = useState("");
  const [serialQuery, setSerialQuery] = useState("");
  const [selectedSerialId, setSelectedSerialId] = useState("");
  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [skuQuery, setSkuQuery] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [serialItems, setSerialItems] = useState([]);
  const [serialLoading, setSerialLoading] = useState(true);
  const [serialError, setSerialError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActivatingSerialSku, setIsActivatingSerialSku] = useState(false);
  const [isSerialDropdownOpen, setIsSerialDropdownOpen] = useState(false);
  const serialComboboxRef = useRef(null);

  useEffect(() => {
    if (!layoutId && state.layouts.length) {
      setLayoutId(String(state.layouts[0].id));
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
        setSerialError("");
      } catch (fetchError) {
        if (!isMounted) return;
        setSerialError(fetchError?.response?.data?.message || fetchError?.message || "Gagal memuat data kode seri.");
      } finally {
        if (isMounted) setSerialLoading(false);
      }
    };
    fetchSerials();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!serialComboboxRef.current?.contains(event.target)) {
        setIsSerialDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLayout = useMemo(
    () => state.layouts.find((layout) => String(layout.id) === String(layoutId)) || state.layouts[0] || null,
    [layoutId, state.layouts]
  );

  const allSlots = useMemo(() => getAllSlots(state), [state]);
  const stockSummaryBySlot = useMemo(() => getSlotStockSummaryMap(state), [state]);

  const serialCatalog = useMemo(
    () =>
      serialItems.map((item) => {
        const bestSkuMatch = findBestSerialSkuMatch(state.skus, item.sku);
        const matchedSku = bestSkuMatch?.score >= SERIAL_SKU_AUTO_MATCH_SCORE ? bestSkuMatch.sku : null;
        const matchedProduct = matchedSku?.productId
          ? state.products.find((product) => String(product.id) === String(matchedSku.productId)) || null
          : null;

        return {
          ...item,
          quantityHint: Math.max(1, Number(item.jumlah) || 1),
          matchedSku,
          matchedSkuScore: bestSkuMatch?.score || 0,
          matchedSkuId: matchedSku?.id || "",
          matchedProduct,
          matchedProductId: matchedProduct?.id || "",
        };
      }),
    [serialItems, state.products, state.skus]
  );

  const serialResults = useMemo(() => {
    const keyword = serialQuery.trim().toLowerCase();
    return serialCatalog.filter((item) => {
      if (!keyword) return true;
      return [item.nomor_seri, item.sku, item.matchedSku?.label, item.matchedProduct?.name].some((value) =>
        String(value || "").toLowerCase().includes(keyword)
      );
    });
  }, [serialCatalog, serialQuery]);

  const selectedSerial = serialCatalog.find((item) => String(item.id) === String(selectedSerialId)) || null;

  const hasAutomaticSkuOptions = Boolean(selectedSerial?.matchedProductId || selectedSerial?.matchedSku);

  const suggestedSerialSkuOptions = useMemo(() => {
    if (!selectedSerial || hasAutomaticSkuOptions) return [];
    return buildSerialSkuSuggestions(state.skus, selectedSerial.sku);
  }, [hasAutomaticSkuOptions, selectedSerial, state.skus]);

  const serialSkuBaseOptions = useMemo(() => {
    if (!selectedSerial) return [];
    if (selectedSerial.matchedProductId) {
      return state.skus.filter((sku) => String(sku.productId) === String(selectedSerial.matchedProductId));
    }
    if (selectedSerial.matchedSku) {
      return [selectedSerial.matchedSku];
    }
    if (suggestedSerialSkuOptions.length) {
      return suggestedSerialSkuOptions;
    }
    return state.skus;
  }, [selectedSerial, state.skus, suggestedSerialSkuOptions]);

  const serialSkuOptions = useMemo(() => {
    const keyword = normalizeLooseText(skuQuery);
    let options = serialSkuBaseOptions;

    if (keyword) {
      options = options.filter((sku) => isSkuSearchMatch(sku, keyword));
    }

    if (!keyword && !hasAutomaticSkuOptions && !suggestedSerialSkuOptions.length) {
      return options.slice(0, 12);
    }

    return options;
  }, [hasAutomaticSkuOptions, serialSkuBaseOptions, skuQuery, suggestedSerialSkuOptions.length]);

  const selectedSku = state.skus.find((sku) => String(sku.id) === String(selectedSkuId)) || null;

  useEffect(() => {
    if (!selectedSerial) {
      setSelectedSkuId("");
      setSkuQuery("");
      return;
    }

    const productSkus = selectedSerial.matchedProductId
      ? state.skus.filter((sku) => String(sku.productId) === String(selectedSerial.matchedProductId))
      : [];

    const preferredSkuId =
      selectedSerial.matchedSkuId ||
      (selectedSerial.matchedProductId ? productSkus[0]?.id || "" : "");

    setSelectedSkuId(preferredSkuId ? String(preferredSkuId) : "");
    setSkuQuery("");
    setQty(selectedSerial.quantityHint);
    setSelectedSlot(null);
  }, [selectedSerial, state.skus]);

  useEffect(() => {
    if (!selectedSkuId) return;
    if (!serialSkuBaseOptions.some((sku) => String(sku.id) === String(selectedSkuId))) {
      setSelectedSkuId("");
    }
  }, [selectedSkuId, serialSkuBaseOptions]);

  useEffect(() => {
    if (!selectedLayout || !selectedSlot) return;
    if (String(selectedSlot.layoutId) !== String(selectedLayout.id)) {
      setSelectedSlot(null);
    }
  }, [selectedLayout, selectedSlot]);

  const selectedLayoutSlots = useMemo(
    () => (selectedLayout ? allSlots.filter((slot) => String(slot.layoutId) === String(selectedLayout.id)) : []),
    [allSlots, selectedLayout]
  );
  const selectedSlotLines = selectedSlot ? stockSummaryBySlot[selectedSlot.id]?.lines || [] : [];

  const sameSkuSlots = useMemo(() => {
    if (!selectedSku) return [];
    return selectedLayoutSlots.filter((slot) =>
      (stockSummaryBySlot[slot.id]?.lines || []).some((line) => String(line.skuId) === String(selectedSku.id))
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
    if (!selectedLayout) return [];
    return selectedLayoutSlots
      .map((slot) => {
        const summary = stockSummaryBySlot[slot.id];
        const sameSkuLines = selectedSku
          ? (summary?.lines || []).filter((line) => String(line.skuId) === String(selectedSku.id))
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
        if (left.hasSameSku !== right.hasSameSku) return Number(right.hasSameSku) - Number(left.hasSameSku);
        if (left.isEmpty !== right.isEmpty) return Number(right.isEmpty) - Number(left.isEmpty);
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

  const placementRows = state.activityLog.filter((item) => item.type === "placement").slice(0, 5);

  const progressSteps = [
    { key: "seri", number: "1", title: "Pilih kode seri", description: selectedSerial ? `${selectedSerial.nomor_seri} sudah dipilih.` : "Cari dan pilih kode seri dari dropdown searchable.", isComplete: Boolean(selectedSerial) },
    { key: "sku", number: "2", title: "Pilih SKU", description: selectedSku ? `${selectedSku.label} siap dimasukkan.` : "Setelah kode seri dipilih, tentukan SKU yang ingin dimasukkan.", isComplete: Boolean(selectedSku) },
    { key: "lokasi", number: "3", title: "Pilih lokasi dan simpan", description: selectedSlot ? `${selectedSlot.slotCode} sudah dipilih dan siap disimpan.` : "Gunakan rekomendasi slot atau klik langsung di layout gudang.", isComplete: Boolean(selectedSlot) },
  ];

  const isFormReady = Boolean(selectedLayout && selectedSerial && selectedSku && selectedSlot && Number(qty) > 0);
  const resolveSlotLabel = (slotId) => allSlots.find((slot) => slot.id === slotId)?.slotCode || "-";
  const resolveSkuLabel = (currentSkuId) => state.skus.find((sku) => String(sku.id) === String(currentSkuId))?.label || currentSkuId;

  const getSkuLayoutSummary = (currentSku) => {
    const matchingSlots = selectedLayoutSlots.filter((slot) =>
      (stockSummaryBySlot[slot.id]?.lines || []).some((line) => String(line.skuId) === String(currentSku.id))
    );
    if (!matchingSlots.length) return "Belum ada stok SKU ini di gudang terpilih.";
    const totalQty = matchingSlots.reduce((total, slot) => {
      const sameSkuQty = (stockSummaryBySlot[slot.id]?.lines || [])
        .filter((line) => String(line.skuId) === String(currentSku.id))
        .reduce((subtotal, line) => subtotal + Number(line.qty || 0), 0);
      return total + sameSkuQty;
    }, 0);
    return `${totalQty} pcs tersimpan di ${matchingSlots.length} slot.`;
  };

  const handleSelectSerial = (item) => {
    setSelectedSerialId(String(item.id));
    setSerialQuery(item.nomor_seri);
    setIsSerialDropdownOpen(false);
  };

  const handleSerialInputChange = (event) => {
    setSerialQuery(event.target.value);
    setSelectedSerialId("");
    setSelectedSkuId("");
    setSelectedSlot(null);
    setIsSerialDropdownOpen(true);
  };

  const handleActivateSelectedSerialSku = async () => {
    if (!selectedSerial?.sku) {
      await showGudangWarning(
        "SKU seri belum tersedia",
        "Kode seri ini belum memiliki SKU yang bisa dijadikan aktif."
      );
      return;
    }

    try {
      setIsActivatingSerialSku(true);

      const result = await ensureGudangProdukSkuActive(selectedSerial.sku);
      const nextState = await refresh({ silent: true });
      const activatedSku = nextState.skus.find(
        (sku) =>
          String(sku.code || "").trim().toUpperCase() ===
          String(selectedSerial.sku || "").trim().toUpperCase()
      );

      if (activatedSku?.id) {
        setSelectedSkuId(String(activatedSku.id));
      }

      await showGudangSuccess(
        "SKU aktif siap dipakai",
        `${activatedSku?.label || result.sku?.sku || selectedSerial.sku} sudah dijadikan SKU aktif.`
      );
    } catch (activationError) {
      await showGudangError(
        "Gagal menjadikan SKU aktif",
        buildGudangWorkspaceErrorMessage(
          activationError,
          "Gagal menjadikan SKU dari kode seri sebagai SKU aktif."
        )
      );
    } finally {
      setIsActivatingSerialSku(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedSerial || !selectedSku || !selectedLayout || !selectedSlot) {
      await showGudangWarning("Data input seri belum lengkap", "Pilih kode seri, SKU, dan lokasi gudang terlebih dahulu.");
      return;
    }
    try {
      setIsSubmitting(true);
      const serialNotes = [`Kode seri: ${selectedSerial.nomor_seri}`];
      if (notes.trim()) serialNotes.push(notes.trim());
      const response = await placeGudangProdukSku({
        layoutId: selectedLayout.id,
        slotId: selectedSlot.id,
        skuId: Number(selectedSku.id),
        qty: Number(qty),
        notes: serialNotes.join(" | "),
      });
      setState(response.workspace);
      await showGudangSuccess("Stok dari kode seri berhasil disimpan", `${selectedSerial.nomor_seri} berhasil dimasukkan ke ${selectedSlot.slotCode}.`);
      setSelectedSerialId("");
      setSelectedSkuId("");
      setSelectedSlot(null);
      setSerialQuery("");
      setQty(1);
      setNotes("");
    } catch (submitError) {
      await showGudangError("Gagal menyimpan stok dari kode seri", buildGudangWorkspaceErrorMessage(submitError, "Gagal menyimpan stok dari kode seri."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <>
      {error ? <div className="gudang-ui-empty-panel" style={{ marginBottom: 20 }}>{error}</div> : null}
      {serialError ? <div className="gudang-ui-empty-panel" style={{ marginBottom: 20 }}>{serialError}</div> : null}

      <div className="gudang-ui-grid gudang-simple-flow-grid">
        <section className="gudang-ui-panel gudang-simple-progress-panel">
          <div className="gudang-ui-panel-head"><div><h2>Alur Input Seri</h2><p>Flow seri dibuat lurus: pilih kode seri, pilih SKU, lalu tentukan lokasi gudang.</p></div></div>
          <div className="gudang-simple-step-grid">
            {progressSteps.map((step) => (
              <div key={step.key} className={`gudang-simple-step-card ${step.isComplete ? "complete" : ""}`}>
                <div className="gudang-simple-step-badge">{step.number}</div>
                <div><strong>{step.title}</strong><p>{step.description}</p></div>
                {step.isComplete ? <FaCheckCircle className="gudang-simple-step-icon" /> : null}
              </div>
            ))}
          </div>
          <div className="gudang-ui-callout gudang-simple-callout">
            {selectedSerial ? <><FaArrowRight /><strong>{selectedSerial.nomor_seri} / {selectedSku?.label || "Pilih SKU"} akan masuk ke {selectedSlot?.slotCode || "slot yang dipilih"}.</strong></> : "Cari kode seri terlebih dahulu, lalu sistem akan menampilkan pilihan SKU yang relevan."}
          </div>
        </section>

        <section className="gudang-ui-panel gudang-simple-summary-panel">
          <div className="gudang-ui-panel-head"><div><h2>Ringkasan Seri</h2><p>Panel ini membantu cek kode seri, SKU, qty, dan lokasi sebelum simpan.</p></div></div>
          <div className="gudang-simple-summary-list">
            <div className="gudang-simple-summary-item"><span>Kode Seri</span><strong>{selectedSerial?.nomor_seri || "-"}</strong></div>
            <div className="gudang-simple-summary-item"><span>Referensi Produk</span><strong>{selectedSerial?.matchedProduct?.name || "-"}</strong></div>
            <div className="gudang-simple-summary-item"><span>SKU Terpilih</span><strong>{selectedSku?.label || "-"}</strong></div>
            <div className="gudang-simple-summary-item"><span>Qty Masuk</span><strong>{qty || 0} pcs</strong></div>
            <div className="gudang-simple-summary-item"><span>Lokasi Tujuan</span><strong>{selectedSlot?.slotCode || "-"}</strong></div>
          </div>
          <div className={`gudang-simple-review-badge ${isFormReady ? "ready" : ""}`}>
            {selectedSerial && !hasAutomaticSkuOptions
              ? "SKU dari kode seri belum ada di katalog aktif, jadi pilih manual dari daftar SKU aktif di bawah."
              : isFormReady
                ? "Data seri dan lokasi sudah lengkap, stok siap disimpan."
                : "Lengkapi kode seri, SKU, qty, dan lokasi agar input bisa disimpan."}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="gudang-ui-form-actions gudang-simple-submit-row">
              <button type="submit" className="gudang-ui-button" disabled={!isFormReady || isSubmitting}><FaSave /> Simpan ke Gudang</button>
            </div>
          </form>
        </section>
      </div>

      <div className="gudang-ui-grid split-hero">
        <section className="gudang-ui-panel">
          <div className="gudang-ui-panel-head"><div><h2>1. Pilih Kode Seri</h2><p>Pilih kode seri dari dropdown searchable, lalu lanjut pilih SKU yang ingin dimasukkan.</p></div></div>
          <div className="gudang-ui-form-grid">
            <div className="gudang-ui-field">
              <label>Gudang Tujuan</label>
              <select value={layoutId === "" ? "" : String(layoutId)} onChange={(event) => setLayoutId(normalizeSelectValue(event.target.value))}>
                {state.layouts.map((layout) => <option key={layout.id} value={layout.id}>{layout.name}</option>)}
              </select>
            </div>
            <div className="gudang-ui-field">
              <label>Jumlah Masuk</label>
              <input type="number" min="1" value={qty} onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))} disabled={!selectedSerial} />
            </div>
            <div className="gudang-ui-field" style={{ gridColumn: "1 / -1" }}>
              <label>Kode Seri</label>
              <div className="gudang-serial-combobox" ref={serialComboboxRef}>
                <div className="gudang-simple-searchbox">
                  <FaSearch />
                  <input value={serialQuery} onChange={handleSerialInputChange} onFocus={() => setIsSerialDropdownOpen(true)} placeholder="Cari kode seri, SKU, atau nama produk..." />
                </div>
                {isSerialDropdownOpen ? (
                  <div className="gudang-serial-dropdown">
                    {serialLoading ? <div className="gudang-serial-option muted">Memuat daftar kode seri...</div> : serialResults.length ? serialResults.slice(0, 10).map((item) => (
                      <button key={item.id} type="button" className={`gudang-serial-option ${String(selectedSerialId) === String(item.id) ? "active" : ""}`} onClick={() => handleSelectSerial(item)}>
                        <strong>{item.nomor_seri}</strong>
                        <span>{item.matchedProduct?.name || "Produk belum ditemukan"} / {item.matchedSku?.label || item.sku}</span>
                      </button>
                    )) : <div className="gudang-serial-option muted">Tidak ada kode seri yang cocok dengan pencarian ini.</div>}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="gudang-ui-field" style={{ gridColumn: "1 / -1" }}>
              <label>Catatan Opsional</label>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Contoh: stok masuk dari hasil scan QR, retur toko, atau stock opname" />
            </div>
          </div>

          {selectedSerial ? (
            <div className="gudang-serial-picker-section">
              <div className="gudang-ui-callout"><FaBarcode /><strong>Kode seri terpilih: {selectedSerial.nomor_seri}{selectedSerial.matchedProduct?.name ? ` / ${selectedSerial.matchedProduct.name}` : ""}</strong></div>
              {!hasAutomaticSkuOptions ? (
                <div className="gudang-ui-callout gudang-simple-warning-callout gudang-serial-warning-callout">
                  <div className="gudang-serial-warning-message">
                    <FaArrowRight />
                    <strong>SKU seri: {selectedSerial.sku || "-"} belum ada di SKU aktif gudang. SKU dari sini bisa langsung dijadikan aktif atau pilih manual dari daftar aktif di bawah.</strong>
                  </div>
                  <button
                    type="button"
                    className="gudang-ui-button-secondary"
                    onClick={handleActivateSelectedSerialSku}
                    disabled={isActivatingSerialSku}
                  >
                    {isActivatingSerialSku ? "Menjadikan aktif..." : "Jadikan SKU Aktif"}
                  </button>
                </div>
              ) : null}
              <div className="gudang-simple-sku-section">
                <div className="gudang-simple-section-label">
                  <strong>SKU yang bisa dipilih</strong>
                  <span>
                    {hasAutomaticSkuOptions
                      ? "Klik salah satu SKU di bawah ini untuk melanjutkan input."
                      : !skuQuery && !suggestedSerialSkuOptions.length && state.skus.length > 12
                        ? "SKU seri tidak ditemukan otomatis. Menampilkan 12 SKU aktif pertama, gunakan pencarian untuk mencari SKU lain."
                        : "SKU seri tidak ditemukan otomatis. Cari lalu pilih SKU aktif yang sesuai."}
                  </span>
                </div>
                <div className="gudang-simple-searchbox">
                  <FaSearch />
                  <input
                    value={skuQuery}
                    onChange={(event) => setSkuQuery(event.target.value)}
                    placeholder={hasAutomaticSkuOptions ? "Cari di daftar SKU ini..." : "Cari SKU aktif manual..."}
                  />
                </div>
                {serialSkuOptions.length ? (
                  <div className="gudang-simple-sku-grid">
                    {serialSkuOptions.map((sku) => (
                      <button key={sku.id} type="button" className={`gudang-simple-sku-card ${String(selectedSku?.id) === String(sku.id) ? "active" : ""}`} onClick={() => setSelectedSkuId(String(sku.id))}>
                        <strong>{sku.label}</strong>
                        <span>{sku.code || `SKU #${sku.id}`}</span>
                        <small>{getSkuLayoutSummary(sku)}</small>
                      </button>
                    ))}
                  </div>
                ) : <div className="gudang-ui-empty-panel">{skuQuery ? "Tidak ada SKU aktif yang cocok dengan pencarian ini." : "Belum ada SKU aktif yang bisa ditampilkan."}</div>}
              </div>
            </div>
          ) : <div className="gudang-ui-empty-panel" style={{ marginTop: 20 }}>Pilih kode seri untuk menampilkan pilihan SKU.</div>}
        </section>

        <section className="gudang-ui-panel">
          <div className="gudang-ui-panel-head"><div><h2>2. Pilih Lokasi</h2><p>Setelah SKU dipilih, sistem akan menampilkan rekomendasi lokasi cepat seperti flow input produk.</p></div></div>
          {selectedSku ? (
            <>
              <div className="gudang-ui-callout gudang-simple-location-note"><FaMapMarkedAlt /><strong>{sameSkuSlots.length ? `SKU ini sudah tersimpan ${sameSkuTotalQty} pcs di ${sameSkuSlots.length} slot pada gudang ini.` : "SKU ini belum pernah disimpan di gudang ini, jadi sistem memprioritaskan slot kosong."}</strong></div>
              <div className="gudang-simple-section-label"><strong>Rekomendasi lokasi cepat</strong><span>Pilih salah satu jika ingin input cepat tanpa membaca seluruh peta.</span></div>
              <div className="gudang-simple-slot-grid">
                {suggestedSlots.map((item) => (
                  <button key={item.slot.id} type="button" className={`gudang-simple-slot-card ${String(selectedSlot?.id) === String(item.slot.id) ? "active" : ""}`} onClick={() => setSelectedSlot(item.slot)}>
                    <strong>{item.slot.slotCode}</strong><span>{buildSlotHeadline(item.slot)}</span><small>{buildSuggestionDescription(item)}</small>
                  </button>
                ))}
              </div>
              <div className="gudang-ui-grid gudang-simple-slot-detail-grid">
                <div className="gudang-ui-detail-box"><h4>Kode Seri & SKU</h4><p>{selectedSerial?.nomor_seri || "-"}</p><p className="gudang-simple-inline-note">{selectedSku.label}</p></div>
                <div className="gudang-ui-detail-box">
                  <h4>Slot Tujuan</h4>
                  {selectedSlot ? <><p>{buildSlotHeadline(selectedSlot)}</p>{selectedSlot.alias ? <p className="gudang-simple-inline-note">Alias: {selectedSlot.alias}</p> : null}</> : <p>Belum ada slot dipilih. Klik rekomendasi atau pilih langsung dari layout.</p>}
                </div>
                <div className="gudang-ui-detail-box">
                  <h4>Isi Slot Saat Ini</h4>
                  {selectedSlotLines.length ? <div className="gudang-ui-pill-list">{selectedSlotLines.map((line) => <span key={line.id} className="gudang-ui-pill">{line.sku?.label} | {line.qty} pcs</span>)}</div> : <p>Slot masih kosong dan siap dipakai.</p>}
                </div>
              </div>
            </>
          ) : <div className="gudang-ui-empty-panel">Setelah kode seri dan SKU dipilih, rekomendasi lokasi akan muncul di sini.</div>}
        </section>
      </div>

      <section className="gudang-ui-panel" style={{ marginTop: 20 }}>
        <div className="gudang-ui-panel-head"><div><h2>Layout Gudang</h2><p>Klik slot pada peta jika user ingin memastikan posisi lokasi secara visual.</p></div></div>
        <GudangLayoutMap layout={selectedLayout} selectedSlotId={selectedSlot?.id} onSelectSlot={setSelectedSlot} stockSummaryBySlot={stockSummaryBySlot} />
      </section>

      <section className="gudang-ui-panel" style={{ marginTop: 20 }}>
        <div className="gudang-ui-panel-head"><div><h2>Riwayat Placement Terbaru</h2><p>Riwayat ini membantu user memastikan input stok terakhir sudah tercatat.</p></div></div>
        <div className="gudang-ui-table-shell">
          <table className="gudang-ui-table">
            <thead><tr><th>Waktu</th><th>SKU</th><th>Tujuan</th><th>Qty</th><th>Catatan</th></tr></thead>
            <tbody>
              {placementRows.length ? placementRows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString("id-ID")}</td>
                  <td>{resolveSkuLabel(row.skuId)}</td>
                  <td>{resolveSlotLabel(row.toSlotId)}</td>
                  <td>{row.qty}</td>
                  <td>{row.notes || "-"}</td>
                </tr>
              )) : <tr><td colSpan="5">Belum ada aktivitas placement.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  if (embedded) return content;

  return (
    <GudangProdukBaseShell
      title="Input Stok dari Kode Seri"
      subtitle="Pilih kode seri dari dropdown searchable, lanjut pilih SKU, lalu simpan ke lokasi gudang yang tepat."
      icon={FaBarcode}
      statusLabel={isLoading || serialLoading ? "Memuat data..." : isSubmitting ? "Menyimpan stok..." : isFormReady ? "Siap Disimpan" : "Flow Seri Gudang"}
    >
      {content}
    </GudangProdukBaseShell>
  );
};

export default InputSeriGudang;

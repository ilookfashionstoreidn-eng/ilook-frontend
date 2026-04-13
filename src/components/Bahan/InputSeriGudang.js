import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "../../api";
import { FaBarcode, FaCheckCircle, FaMapMarkedAlt, FaSave, FaSearch, FaTimes } from "react-icons/fa";
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
import { SERIAL_SKU_AUTO_MATCH_SCORE, findBestSerialSkuMatch } from "./GudangProdukSerialSkuUtils";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const normalizeSelectValue = (v) => (v === "" ? "" : v);

const buildSuggestionDescription = (item) => {
  if (item.hasSameSku) return `SKU ini sudah ada ${item.sameSkuQty} pcs di slot ini.`;
  if (item.isEmpty) return "Slot kosong — siap dipakai.";
  return `${item.summary?.qty || 0} pcs dengan ${item.summary?.skuCount || 0} SKU.`;
};

/* ─── step badge ───────────────────────────────────────────────────────────── */
const Step = ({ number, label, done }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: "10px",
    padding: "12px 16px",
    borderRadius: "12px",
    background: done ? "linear-gradient(135deg,#ecfdf5,#f0fdf4)" : "#f8fafc",
    border: `1px solid ${done ? "#b7e4d8" : "#e2e8f0"}`,
    flex: 1,
  }}>
    <div style={{
      width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: done ? "#0f766e" : "#e2e8f0",
      color: done ? "#fff" : "#64748b", fontWeight: "800", fontSize: "13px",
    }}>
      {done ? <FaCheckCircle size={14} /> : number}
    </div>
    <span style={{ fontSize: "13px", fontWeight: "600", color: done ? "#0f766e" : "#334155" }}>{label}</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
const InputSeriGudang = ({ embedded = false }) => {
  const { state, setState, isLoading, error, refresh } = useGudangProdukWorkspace();

  /* ── form state ── */
  const [layoutId, setLayoutId]               = useState("");
  const [serialQuery, setSerialQuery]         = useState("");
  const [selectedSerialId, setSelectedSerialId] = useState("");
  const [selectedSkuId, setSelectedSkuId]     = useState("");
  const [selectedSlot, setSelectedSlot]       = useState(null);
  const [qty, setQty]                         = useState(1);
  const [notes, setNotes]                     = useState("");

  /* ── async state ── */
  const [serialItems, setSerialItems] = useState([]);
  const [serialLoading, setSerialLoading] = useState(true);
  const [serialError, setSerialError]     = useState("");
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [isSerialDropdownOpen, setIsSerialDropdownOpen] = useState(false);

  const serialComboboxRef = useRef(null);

  /* ── default layout ── */
  useEffect(() => {
    if (!layoutId && state.layouts.length) setLayoutId(String(state.layouts[0].id));
  }, [layoutId, state.layouts]);

  /* ── fetch seri ── */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setSerialLoading(true);
        const res = await API.get("/seri", { params: { all: 1 } });
        if (!mounted) return;
        setSerialItems(Array.isArray(res?.data?.data) ? res.data.data : []);
        setSerialError("");
      } catch (e) {
        if (!mounted) return;
        setSerialError(e?.response?.data?.message || e?.message || "Gagal memuat data kode seri.");
      } finally {
        if (mounted) setSerialLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /* ── click-outside ── */
  useEffect(() => {
    const handler = (e) => {
      if (!serialComboboxRef.current?.contains(e.target)) setIsSerialDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ═══════ derived ═══════ */
  const selectedLayout = useMemo(
    () => state.layouts.find((l) => String(l.id) === String(layoutId)) || state.layouts[0] || null,
    [layoutId, state.layouts]
  );

  const allSlots           = useMemo(() => getAllSlots(state), [state]);
  const stockSummaryBySlot = useMemo(() => getSlotStockSummaryMap(state), [state]);

  /* enrich seri with matched sku/product */
  const serialCatalog = useMemo(() =>
    serialItems.map((item) => {
      const best = findBestSerialSkuMatch(state.skus, item.sku);
      const matchedSku     = best?.score >= SERIAL_SKU_AUTO_MATCH_SCORE ? best.sku : null;
      const matchedProduct = matchedSku?.productId
        ? state.products.find((p) => String(p.id) === String(matchedSku.productId)) || null
        : null;
      return {
        ...item,
        quantityHint: Math.max(1, Number(item.jumlah) || 1),
        matchedSku,
        matchedSkuId: matchedSku?.id || "",
        matchedProduct,
        matchedProductId: matchedProduct?.id || "",
      };
    }),
    [serialItems, state.products, state.skus]
  );

  /* search filter for serial dropdown */
  const serialResults = useMemo(() => {
    const kw = serialQuery.trim().toLowerCase();
    if (!kw) return serialCatalog;
    return serialCatalog.filter((item) =>
      [item.nomor_seri, item.sku, item.matchedSku?.label, item.matchedProduct?.name]
        .some((v) => String(v || "").toLowerCase().includes(kw))
    );
  }, [serialCatalog, serialQuery]);

  const selectedSerial = serialCatalog.find((i) => String(i.id) === String(selectedSerialId)) || null;

  /* also show the raw sku from seri if not in state.skus yet */
  const rawSeriSkuLabel = selectedSerial?.sku || "";

  /* 
   * SKU options: HANYA tampilkan SKU yang secara persis cocok dari hasil scan Seri 
   * sehingga operator tidak bisa menginputkan ke SKU lain yang salah.
   */
  const allSkuOptions = useMemo(() => {
    if (!selectedSerial?.matchedSkuId) return [];
    
    const matchedSku = state.skus.find(s => String(s.id) === String(selectedSerial.matchedSkuId));
    return matchedSku ? [matchedSku] : [];
  }, [state.skus, selectedSerial]);

  const rawSkuAlreadyInList = allSkuOptions.some(
    (s) => String(s.code || "").toUpperCase() === rawSeriSkuLabel.toUpperCase()
  );

  const selectedSku = selectedSkuId === "__raw__" 
    ? { id: "__raw__", label: rawSeriSkuLabel } 
    : (state.skus.find((s) => String(s.id) === String(selectedSkuId)) || null);

  /* auto-select SKU when serial changes */
  useEffect(() => {
    if (!selectedSerial) {
      setSelectedSkuId("");
      return;
    }
    setQty(selectedSerial.quantityHint);
    setSelectedSlot(null);
    if (selectedSerial.matchedSkuId) {
      setSelectedSkuId(String(selectedSerial.matchedSkuId));
    } else if (selectedSerial.sku) {
      setSelectedSkuId("__raw__");
    } else {
      setSelectedSkuId("");
    }
  }, [selectedSerial]);

  /* clear slot when layout changes */
  useEffect(() => {
    if (!selectedLayout || !selectedSlot) return;
    if (String(selectedSlot.layoutId) !== String(selectedLayout.id)) setSelectedSlot(null);
  }, [selectedLayout, selectedSlot]);

  /* layout-level slot lists */
  const selectedLayoutSlots = useMemo(
    () => selectedLayout ? allSlots.filter((s) => String(s.layoutId) === String(selectedLayout.id)) : [],
    [allSlots, selectedLayout]
  );
  const selectedSlotLines = selectedSlot ? stockSummaryBySlot[selectedSlot.id]?.lines || [] : [];

  const sameSkuSlots = useMemo(() => {
    if (!selectedSku) return [];
    return selectedLayoutSlots.filter((slot) =>
      (stockSummaryBySlot[slot.id]?.lines || []).some((l) => String(l.skuId) === String(selectedSku.id))
    );
  }, [selectedLayoutSlots, selectedSku, stockSummaryBySlot]);

  const sameSkuTotalQty = useMemo(
    () => sameSkuSlots.reduce((acc, slot) => {
      const q = (stockSummaryBySlot[slot.id]?.lines || [])
        .filter((l) => String(l.skuId) === String(selectedSku?.id))
        .reduce((s, l) => s + Number(l.qty || 0), 0);
      return acc + q;
    }, 0),
    [sameSkuSlots, selectedSku, stockSummaryBySlot]
  );

  const suggestedSlots = useMemo(() => {
    if (!selectedLayout) return [];
    return selectedLayoutSlots
      .map((slot) => {
        const summary = stockSummaryBySlot[slot.id];
        const sameLines = selectedSku
          ? (summary?.lines || []).filter((l) => String(l.skuId) === String(selectedSku.id))
          : [];
        return {
          slot, summary,
          hasSameSku: sameLines.length > 0,
          sameSkuQty: sameLines.reduce((s, l) => s + Number(l.qty || 0), 0),
          isEmpty: !summary?.qty,
        };
      })
      .sort((a, b) => {
        if (a.hasSameSku !== b.hasSameSku) return Number(b.hasSameSku) - Number(a.hasSameSku);
        if (a.isEmpty !== b.isEmpty)       return Number(b.isEmpty) - Number(a.isEmpty);
        return String(a.slot.slotCode).localeCompare(String(b.slot.slotCode));
      })
      .slice(0, 6);
  }, [selectedLayout, selectedLayoutSlots, selectedSku, stockSummaryBySlot]);

  const hasValidSku = Boolean(selectedSku) || selectedSkuId === "__raw__";
  const isFormReady = Boolean(selectedLayout && selectedSerial && hasValidSku && selectedSlot && Number(qty) > 0);
  const placementRows = state.activityLog.filter((i) => i.type === "placement").slice(0, 5);
  const resolveSlotLabel = (id) => allSlots.find((s) => s.id === id)?.slotCode || "-";
  const resolveSkuLabel  = (id) => state.skus.find((s) => String(s.id) === String(id))?.label || id;

  /* ─── submit ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSerial || !selectedSlot) {
      await showGudangWarning("Data belum lengkap", "Pilih kode seri dan lokasi gudang terlebih dahulu.");
      return;
    }

    try {
      setIsSubmitting(true);

      let finalSkuId = selectedSku?.id;

      // Jika user memilih SKU dari raw seri (belum ada di state), aktivasi dulu secara silent
      if (!finalSkuId && rawSeriSkuLabel) {
        const activated = await ensureGudangProdukSkuActive(rawSeriSkuLabel);
        const nextState = await refresh({ silent: true });
        const found = nextState.skus.find(
          (s) => String(s.code || "").trim().toUpperCase() === rawSeriSkuLabel.trim().toUpperCase()
        );
        finalSkuId = found?.id || activated?.sku?.id;
      }

      if (!finalSkuId) {
        await showGudangWarning("SKU tidak ditemukan", "Pilih SKU terlebih dahulu.");
        return;
      }

      const serialNotes = [`Kode seri: ${selectedSerial.nomor_seri}`];
      if (notes.trim()) serialNotes.push(notes.trim());

      const response = await placeGudangProdukSku({
        layoutId: selectedLayout.id,
        slotId:   selectedSlot.id,
        skuId:    Number(finalSkuId),
        qty:      Number(qty),
        notes:    serialNotes.join(" | "),
      });

      setState(response.workspace);
      await showGudangSuccess(
        "Stok berhasil disimpan!",
        `${selectedSerial.nomor_seri} → ${selectedSlot.slotCode}, ${qty} pcs.`
      );

      // reset
      setSelectedSerialId("");
      setSelectedSkuId("");
      setSelectedSlot(null);
      setSerialQuery("");
      setQty(1);
      setNotes("");
    } catch (err) {
      await showGudangError(
        "Gagal menyimpan stok",
        buildGudangWorkspaceErrorMessage(err, "Terjadi kesalahan saat menyimpan stok dari kode seri.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ═══════ JSX ═══════ */
  const content = (
    <>
      {error       ? <div className="gudang-ui-empty-panel" style={{ marginBottom: 16 }}>{error}</div>       : null}
      {serialError ? <div className="gudang-ui-empty-panel" style={{ marginBottom: 16 }}>{serialError}</div> : null}

      {/* ── Step indicator ── */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <Step number="1" label="Pilih kode seri"   done={Boolean(selectedSerial)} />
        <Step number="2" label="Pilih SKU"          done={Boolean(selectedSku)} />
        <Step number="3" label="Pilih lokasi & simpan" done={Boolean(selectedSlot)} />
      </div>

      {/* ══════════════════ WORKSPACE GRID ══════════════════ */}
      <div className="gudang-master-workspace-grid">

        {/* ── LEFT: Form ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* CARD 1: Seri + Gudang + Qty */}
          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head">
              <div>
                <h2>1. Informasi Dasar</h2>
                <p>Pilih kode seri, gudang tujuan, dan jumlah stok yang ingin dimasukkan.</p>
              </div>
            </div>

            <div className="gudang-ui-form-grid">
              {/* Serial combobox */}
              <div className="gudang-ui-field" style={{ gridColumn: "1 / -1" }}>
                <label>Kode Seri</label>
                <div style={{ position: "relative" }} ref={serialComboboxRef}>
                  <div style={{ position: "relative" }}>
                    <FaSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                    <input
                      className="gudang-ui-search-input"
                      style={{ paddingLeft: 40 }}
                      value={serialQuery}
                      onChange={(e) => { setSerialQuery(e.target.value); setSelectedSerialId(""); setIsSerialDropdownOpen(true); }}
                      onFocus={() => setIsSerialDropdownOpen(true)}
                      placeholder="Cari nomor seri, SKU, atau nama produk..."
                    />
                    {selectedSerial && (
                      <button
                        type="button"
                        onClick={() => { setSelectedSerialId(""); setSerialQuery(""); setSelectedSkuId(""); }}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
                      ><FaTimes /></button>
                    )}
                  </div>

                  {isSerialDropdownOpen && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
                      background: "#fff", border: "1px solid #d1dbe8", borderRadius: 14,
                      padding: 8, maxHeight: 280, overflowY: "auto",
                      boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
                    }}>
                      {serialLoading ? (
                        <div style={{ padding: "12px 16px", color: "#64748b", fontSize: 13 }}>Memuat data kode seri...</div>
                      ) : serialResults.length ? serialResults.slice(0, 12).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => { setSelectedSerialId(String(item.id)); setSerialQuery(item.nomor_seri); setIsSerialDropdownOpen(false); }}
                          style={{
                            width: "100%", display: "block", textAlign: "left", border: "none",
                            background: String(selectedSerialId) === String(item.id) ? "linear-gradient(135deg,#edf4ff,#f0f9ff)" : "transparent",
                            borderRadius: 10, padding: "10px 14px", cursor: "pointer", marginBottom: 4,
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{item.nomor_seri}</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            {item.matchedProduct?.name
                              ? `${item.matchedProduct.name} / ${item.matchedSku?.label || item.sku}`
                              : item.sku}
                            {item.jumlah > 1 && <span style={{ marginLeft: 8, fontWeight: 700, color: "#2458ce" }}>{item.jumlah} pcs</span>}
                          </div>
                        </button>
                      )) : (
                        <div style={{ padding: "12px 16px", color: "#64748b", fontSize: 13 }}>
                          Tidak ada kode seri yang cocok.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Gudang */}
              <div className="gudang-ui-field">
                <label>Gudang Tujuan</label>
                <select
                  value={layoutId === "" ? "" : String(layoutId)}
                  onChange={(e) => setLayoutId(normalizeSelectValue(e.target.value))}
                >
                  {state.layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              {/* Qty */}
              <div className="gudang-ui-field">
                <label>Jumlah Masuk (pcs)</label>
                <input
                  type="number" min="1"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>

              {/* Notes */}
              <div className="gudang-ui-field" style={{ gridColumn: "1 / -1" }}>
                <label>Catatan (opsional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: stok dari QC, retur toko, stock opname..."
                  style={{ minHeight: 72 }}
                />
              </div>
            </div>

            {/* Serial info callout */}
            {selectedSerial && (
              <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 12, background: "linear-gradient(135deg,#edf4ff,#f8fbff)", border: "1px solid #c8d8f6", display: "flex", gap: 12, alignItems: "center" }}>
                <FaBarcode style={{ color: "#2458ce", flexShrink: 0, fontSize: 18 }} />
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{selectedSerial.nomor_seri}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {selectedSerial.matchedProduct?.name
                      ? `${selectedSerial.matchedProduct.name} / ${selectedSerial.matchedSku?.label || selectedSerial.sku}`
                      : selectedSerial.sku}
                    {" · "}{selectedSerial.quantityHint} pcs (hint)
                    {selectedSerial.matchedSkuId
                      ? <span style={{ marginLeft: 8, color: "#0f766e", fontWeight: 700 }}>✓ SKU terdeteksi otomatis</span>
                      : <span style={{ marginLeft: 8, color: "#0f766e", fontWeight: 700 }}>✓ SKU baru otomatis terpilih</span>
                    }
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* CARD 2: Konfirmasi SKU Terpilih */}
          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head">
              <div>
                <h2>{selectedSerial ? "2. Konfirmasi SKU" : "2. Pilih SKU"}</h2>
                <p>
                  {selectedSerial
                    ? selectedSerial.matchedSkuId
                      ? "Berdasarkan kode seri, SKU di bawah ini dikunci (tidak bisa memilih SKU lain pengecualian kesalahan user)."
                      : `SKU "${rawSeriSkuLabel}" siap didaftarkan otomatis saat Anda menyimpan form.`
                    : "Pilih kode seri terlebih dahulu untuk menampilkan SKU."}
                </p>
              </div>
            </div>

            {/* Raw seri SKU shortcut — jika tidak ada di state.skus */}
            {selectedSerial && !rawSkuAlreadyInList && rawSeriSkuLabel && (
              <div
                style={{
                  width: "100%", textAlign: "left", border: `2px solid #2458ce`,
                  borderRadius: 12, padding: "12px 16px", background: "#edf4ff",
                  marginBottom: 12, display: "flex", gap: "10px", alignItems: "center"
                }}
              >
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#2458ce" }} />
                <div style={{ fontWeight: 700, fontSize: 13, color: "#2458ce" }}>
                  {rawSeriSkuLabel} <span style={{ fontWeight: 400, color: "#64748b" }}>— (SKU Baru Terkunci)</span>
                </div>
              </div>
            )}

            {/* SKU grid */}
            {allSkuOptions.map((sku) => {
              // Hanya merender 1 SKU karena sudah dikunci dari filter
              return (
                <div
                  key={sku.id}
                  style={{
                    border: `2px solid #2458ce`,
                    borderRadius: 12,
                    padding: 14,
                    background: "#edf4ff",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#2458ce" }} />
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{sku.label}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                      {sku.code || `#${sku.id}`} · (SKU Eksisting Terkunci)
                    </div>
                  </div>
                </div>
              );
            })}
            
            {!selectedSerial && (
              <div className="gudang-ui-empty-panel">
                Pilih seri terlebih dahulu.
              </div>
            )}
            
            {selectedSerial && allSkuOptions.length === 0 && !rawSeriSkuLabel && (
              <div className="gudang-ui-empty-panel">
                Seri ini tidak memiliki data SKU yang dapat didaftarkan.
              </div>
            )}
          </section>

          {/* CARD 3: Pilih Lokasi */}
          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head">
              <div>
                <h2>3. Pilih Lokasi Slot</h2>
                <p>
                  {selectedSku
                    ? sameSkuSlots.length
                      ? `SKU ini sudah tersimpan di ${sameSkuSlots[0].slotCode}. Aturan Gudang: 1 SKU tidak boleh di banyak rak.`
                      : "SKU ini belum pernah masuk gudang. Slot kosong diprioritaskan."
                    : "Pilih SKU di atas untuk melihat rekomendasi lokasi."}
                </p>
              </div>
            </div>

            {selectedSku ? (
              <>
                {/* Recommended slots */}
                {suggestedSlots.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
                    {suggestedSlots.map((item) => {
                      const isSelected = String(selectedSlot?.id) === String(item.slot.id);
                      return (
                        <button
                          key={item.slot.id}
                          type="button"
                          onClick={() => setSelectedSlot(item.slot)}
                          style={{
                            border: `2px solid ${isSelected ? "#2458ce" : item.hasSameSku ? "#b7e4d8" : "#e2e8f0"}`,
                            borderRadius: 12, padding: "12px 14px", textAlign: "left", cursor: "pointer",
                            background: isSelected ? "linear-gradient(135deg,#edf4ff,#f8fbff)" : item.hasSameSku ? "linear-gradient(135deg,#ecfdf5,#f7fff9)" : "#fff",
                            boxShadow: isSelected ? "0 0 0 3px rgba(36,88,206,0.1)" : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: 15, color: isSelected ? "#2458ce" : "#0f172a", marginBottom: 3 }}>{item.slot.slotCode}</div>
                          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>{buildSlotHeadline(item.slot)}</div>
                          <span style={{
                            display: "inline-block", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                            background: item.hasSameSku ? "#d1fae5" : item.isEmpty ? "#f0fdf4" : "#f1f5f9",
                            color: item.hasSameSku ? "#065f46" : item.isEmpty ? "#166534" : "#475569",
                          }}>
                            {buildSuggestionDescription(item)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Slot detail + layout map */}
                {selectedSlot && (
                  <div style={{ marginBottom: 20, padding: 16, borderRadius: 13, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <FaMapMarkedAlt style={{ color: "#2458ce", fontSize: 18, flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{selectedSlot.slotCode}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{buildSlotHeadline(selectedSlot)}</div>
                      {selectedSlotLines.length > 0 && (
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {selectedSlotLines.map((line) => (
                            <span key={line.id} className="gudang-ui-pill">{line.sku?.label} | {line.qty} pcs</span>
                          ))}
                        </div>
                      )}
                      {!selectedSlotLines.length && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "#0f766e", fontWeight: 600 }}>Slot kosong — siap diisi.</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(null)}
                      style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
                    ><FaTimes /></button>
                  </div>
                )}

                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#2458ce", userSelect: "none", padding: "8px 0" }}>
                    Tampilkan layout visual gudang
                  </summary>
                  <div style={{ marginTop: 12 }}>
                    <GudangLayoutMap
                      layout={selectedLayout}
                      selectedSlotId={selectedSlot?.id}
                      onSelectSlot={setSelectedSlot}
                      stockSummaryBySlot={stockSummaryBySlot}
                    />
                  </div>
                </details>
              </>
            ) : (
              <div className="gudang-ui-empty-panel">
                Setelah SKU dipilih, rekomendasi slot akan muncul di sini.
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT: Summary + Submit ── */}
        <div className="gudang-master-visual-stack">
          <section className="gudang-ui-panel gudang-master-overview-panel">
            <div className="gudang-ui-panel-head">
              <div>
                <h2>Ringkasan Input</h2>
                <p>Cek kembali sebelum menekan tombol simpan.</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
              {[
                { label: "Kode Seri",    value: selectedSerial?.nomor_seri || "—" },
                { label: "Gudang",       value: selectedLayout?.name || "—" },
                { label: "SKU",          value: selectedSkuId === "__raw__" ? rawSeriSkuLabel : (selectedSku?.label || "—") },
                { label: "Qty",          value: `${qty} pcs` },
                { label: "Lokasi Slot",  value: selectedSlot?.slotCode || "—" },
              ].map((row, i, arr) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "11px 0",
                  borderBottom: i < arr.length - 1 ? "1px solid #eef2f6" : "none",
                  fontSize: 13,
                }}>
                  <span style={{ color: "#64748b" }}>{row.label}</span>
                  <strong style={{ color: "#0f172a", textAlign: "right", maxWidth: "60%" }}>{row.value}</strong>
                </div>
              ))}
            </div>

            {/* Status callout */}
            <div style={{
              marginBottom: 20, padding: "13px 16px", borderRadius: 12, display: "flex", gap: 10, alignItems: "flex-start",
              background: isFormReady ? "#ecfdf5" : "#fffbeb",
              border: `1px solid ${isFormReady ? "#b7e4d8" : "#fde68a"}`,
              color: isFormReady ? "#0f766e" : "#b45309",
            }}>
              <FaCheckCircle style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
                {isFormReady
                  ? "Semua data sudah terisi. Siap disimpan!"
                  : !selectedSerial
                    ? "Pilih kode seri terlebih dahulu."
                    : !selectedSku && selectedSkuId !== "__raw__"
                      ? "Pilih SKU yang sesuai."
                      : !selectedSlot
                        ? "Pilih slot lokasi gudang."
                        : "Pastikan semua data terisi."}
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              <button
                type="submit"
                className="gudang-ui-button"
                disabled={!isFormReady || isSubmitting}
                style={{
                  width: "100%", padding: "14px 20px", fontSize: 14,
                  display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
                  opacity: isFormReady && !isSubmitting ? 1 : 0.55,
                }}
              >
                <FaSave />
                {isSubmitting ? "Menyimpan stok..." : "Simpan ke Gudang"}
              </button>
            </form>
          </section>

          {/* Log terbaru */}
          {placementRows.length > 0 && (
            <section className="gudang-ui-panel">
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: "#17457c", fontSize: 14 }}>Log Placement Terbaru</strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {placementRows.map((row) => (
                  <div key={row.id} style={{ fontSize: 12, padding: "8px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{resolveSkuLabel(row.skuId)}</div>
                    <div style={{ color: "#64748b", marginTop: 2 }}>→ {resolveSlotLabel(row.toSlotId)} · {row.qty} pcs</div>
                    {row.notes && <div style={{ color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.notes}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <GudangProdukBaseShell
      title="Input Stok dari Kode Seri"
      subtitle="Pilih kode seri, tentukan SKU, lalu simpan ke lokasi gudang — tanpa perlu aktivasi manual SKU."
      icon={FaBarcode}
      statusLabel={
        isLoading || serialLoading ? "Memuat data..." :
        isSubmitting ? "Menyimpan stok..." :
        isFormReady ? "Siap Disimpan" :
        "Flow Kode Seri"
      }
    >
      {content}
    </GudangProdukBaseShell>
  );
};

export default InputSeriGudang;

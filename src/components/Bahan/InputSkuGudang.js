import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "../../api";
import {
  FaArrowRight,
  FaBarcode,
  FaBoxOpen,
  FaCheckCircle,
  FaMapMarkedAlt,
  FaSave,
  FaSearch,
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
  ensureGudangProdukSkuActive,
  placeGudangProdukSku,
} from "./GudangProdukWorkspaceApi";
import {
  showGudangError,
  showGudangSuccess,
  showGudangWarning,
} from "./GudangProdukAlerts";
import {
  SERIAL_SKU_AUTO_MATCH_SCORE,
  buildSerialSkuSuggestions,
  findBestSerialSkuMatch,
} from "./GudangProdukSerialSkuUtils";
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
  const { state, setState, isLoading, error, refresh } = useGudangProdukWorkspace();
  const [inputMode, setInputMode] = useState("sku");
  const [layoutId, setLayoutId] = useState("");
  const [productId, setProductId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serialQuery, setSerialQuery] = useState("");
  const [selectedSerialId, setSelectedSerialId] = useState("");
  const [serialItems, setSerialItems] = useState([]);
  const [serialLoading, setSerialLoading] = useState(true);
  const [serialError, setSerialError] = useState("");
  const [isSerialDropdownOpen, setIsSerialDropdownOpen] = useState(false);
  const [isActivatingSerialSku, setIsActivatingSerialSku] = useState(false);
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

        setSerialError(
          fetchError?.response?.data?.message ||
            fetchError?.message ||
            "Gagal memuat data kode seri jadi."
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!serialComboboxRef.current?.contains(event.target)) {
        setIsSerialDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedLayout = useMemo(
    () =>
      state.layouts.find((layout) => String(layout.id) === String(layoutId)) ||
      state.layouts[0] ||
      null,
    [layoutId, state.layouts]
  );

  const serialCatalog = useMemo(
    () =>
      serialItems.map((item) => {
        const bestSkuMatch = findBestSerialSkuMatch(state.skus, item.sku);
        const matchedSku =
          bestSkuMatch?.score >= SERIAL_SKU_AUTO_MATCH_SCORE ? bestSkuMatch.sku : null;
        const matchedProduct = matchedSku?.productId
          ? state.products.find((product) => String(product.id) === String(matchedSku.productId)) ||
            null
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

  const serialResults = useMemo(() => {
    const keyword = serialQuery.trim().toLowerCase();

    return serialCatalog.filter((item) => {
      if (!keyword) return true;

      return [
        item.nomor_seri,
        item.sku,
        item.matchedSku?.label,
        item.matchedProduct?.name,
      ].some((value) => String(value || "").toLowerCase().includes(keyword));
    });
  }, [serialCatalog, serialQuery]);

  const selectedSerial =
    serialCatalog.find((item) => String(item.id) === String(selectedSerialId)) || null;

  const suggestedSerialSkuOptions = useMemo(() => {
    if (!selectedSerial || selectedSerial.matchedSkuId) {
      return [];
    }

    return buildSerialSkuSuggestions(state.skus, selectedSerial.sku);
  }, [selectedSerial, state.skus]);

  const selectedProduct =
    state.products.find((product) => String(product.id) === String(productId)) || null;
  const selectedSku = state.skus.find((sku) => String(sku.id) === String(skuId)) || null;
  const productSkuOptions = productId ? getSkusByProductId(state, productId) : [];
  const skuOptions = productId ? productSkuOptions : suggestedSerialSkuOptions;
  const allSlots = useMemo(() => getAllSlots(state), [state]);
  const stockSummaryBySlot = useMemo(() => getSlotStockSummaryMap(state), [state]);
  const placementRows = state.activityLog
    .filter((item) => item.type === "placement")
    .slice(0, 5);

  useEffect(() => {
    if (!productId || !productSkuOptions.length) {
      if (skuId) {
        setSkuId("");
      }
      return;
    }

    const hasSelectedSku = productSkuOptions.some((sku) => String(sku.id) === String(skuId));
    if (!hasSelectedSku) {
      setSkuId(String(productSkuOptions[0].id));
    }
  }, [productId, productSkuOptions, skuId]);

  useEffect(() => {
    if (!selectedSerial) {
      return;
    }

    setProductId(
      selectedSerial.matchedProductId ? String(selectedSerial.matchedProductId) : ""
    );
    setSkuId(selectedSerial.matchedSkuId ? String(selectedSerial.matchedSkuId) : "");
    setQty(selectedSerial.quantityHint);
    setSelectedSlot(null);
  }, [selectedSerial]);

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
        ? selectedSerial
          ? `${selectedSerial.nomor_seri} - ${selectedSku.label}`
          : `${selectedProduct?.name || "Produk"} - ${selectedSku.label}`
        : selectedSerial
          ? `${selectedSerial.nomor_seri} dipilih, lanjut cek SKU-nya.`
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

    const parsedSkuId = parseInt(selectedSku.id, 10);
    if (!parsedSkuId || isNaN(parsedSkuId)) {
      await showGudangWarning(
        "SKU tidak valid",
        "ID SKU yang dipilih tidak valid. Coba pilih ulang SKU dari daftar."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const noteParts = [];
      if (selectedSerial) {
        noteParts.push(`Kode seri: ${selectedSerial.nomor_seri}`);
      }
      if (notes.trim()) {
        noteParts.push(notes.trim());
      }

      const response = await placeGudangProdukSku({
        layoutId: selectedLayout.id,
        slotId: selectedSlot.id,
        skuId: parsedSkuId,
        qty: Number(qty),
        notes: noteParts.join(" | "),
      });
      setState(response.workspace);
      await showGudangSuccess(
        "Produk berhasil ditempatkan",
        selectedSerial
          ? `SKU dari ${selectedSerial.nomor_seri} berhasil dimasukkan ke ${selectedSlot.slotCode}.`
          : `SKU berhasil dimasukkan ke ${selectedSlot.slotCode}.`
      );
      setQty(1);
      setNotes("");
      setSelectedSlot(null);
      if (selectedSerial) {
        setSelectedSerialId("");
        setSerialQuery("");
      }
    } catch (submitError) {
      await showGudangError(
        "Gagal menyimpan stok",
        buildGudangWorkspaceErrorMessage(submitError, "Gagal menyimpan stok ke gudang.")
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

  const handleSelectSerial = (item) => {
    setSelectedSerialId(String(item.id));
    setSerialQuery(item.nomor_seri);
    setIsSerialDropdownOpen(false);
  };

  const handleSerialInputChange = (event) => {
    setSerialQuery(event.target.value);
    setSelectedSerialId("");
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
        setSkuId(String(activatedSku.id));
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

  const handleSelectSku = (sku) => {
    if (!sku?.id) return;
    if (sku?.productId) {
      setProductId(String(sku.productId));
    }
    setSkuId(String(sku.id));
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

        <div style={{ display: "flex", gap: "10px", background: "#f1f5f9", padding: "6px", borderRadius: "12px", width: "max-content", flexWrap: "wrap" }}>
          <button
            type="button"
            style={{ 
              border: "none", background: inputMode === "sku" ? "#fff" : "transparent", color: inputMode === "sku" ? "#0f172a" : "#64748b",
              fontWeight: "700", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", boxShadow: inputMode === "sku" ? "0 2px 4px rgba(0,0,0,0.05)" : "none", transition: "0.2s"
            }}
            onClick={() => setInputMode("sku")}
          >
            Input per SKU
          </button>
          <button
            type="button"
            style={{ 
              border: "none", background: inputMode === "seri" ? "#fff" : "transparent", color: inputMode === "seri" ? "#0f172a" : "#64748b",
              fontWeight: "700", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", boxShadow: inputMode === "seri" ? "0 2px 4px rgba(0,0,0,0.05)" : "none", transition: "0.2s"
            }}
            onClick={() => setInputMode("seri")}
          >
            Input dari Kode Seri
          </button>
        </div>
      </section>

      {inputMode === "seri" ? (
        <InputSeriGudang embedded />
      ) : (
        <div className="gudang-master-workspace-grid">
          <div className="gudang-master-main" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <section className="gudang-ui-panel">
              <div className="gudang-ui-panel-head">
                <div>
                  <h2>1. Pilih Barang & Produk</h2>
                  <p>SKU bisa dipilih manual dari produk atau diambil cepat dari kode seri jadi.</p>
                </div>
              </div>

              <div className="gudang-ui-form-grid" style={{ marginBottom: "20px" }}>
                <div className="gudang-ui-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Kode Seri Jadi (Opsional)</label>
                  <div style={{ position: "relative" }} ref={serialComboboxRef}>
                    <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                      <FaSearch style={{ position: "absolute", left: "14px", color: "#64748b" }} />
                      <input
                        className="gudang-ui-search-input"
                        style={{ paddingLeft: "38px" }}
                        value={serialQuery}
                        onChange={handleSerialInputChange}
                        onFocus={() => setIsSerialDropdownOpen(true)}
                        placeholder="Cari kode seri jadi, SKU, atau nama produk..."
                      />
                    </div>
                    {isSerialDropdownOpen ? (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "#fff", border: "1px solid #d1dbe8", borderRadius: "12px", padding: "8px", marginTop: "4px", maxHeight: "300px", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
                        {serialLoading ? (
                          <div style={{ padding: "12px", color: "#64748b", fontSize: "13px" }}>
                            Memuat daftar kode seri jadi...
                          </div>
                        ) : serialResults.length ? (
                          serialResults.slice(0, 10).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className={`gudang-ui-list-item clickable ${
                                String(selectedSerialId) === String(item.id) ? "active" : ""
                              }`}
                              onClick={() => handleSelectSerial(item)}
                              style={{ marginBottom: "4px", border: "none", width: "100%", padding: "10px 14px", display: "block" }}
                            >
                              <strong style={{ display: "block", fontSize: "14px", color: "#16324f" }}>{item.nomor_seri}</strong>
                              <span style={{ fontSize: "12px", color: "#64748b" }}>
                                {item.matchedProduct?.name || "Produk belum ditemukan"} /{" "}
                                {item.matchedSku?.label || item.sku}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div style={{ padding: "12px", color: "#64748b", fontSize: "13px" }}>
                            Tidak ada kode seri yang cocok dengan pencarian ini.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {serialError ? (
                    <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: "8px" }}>
                      {serialError}
                    </div>
                  ) : null}
                </div>

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

              {selectedSerial ? (
                <div style={{ marginBottom: "20px", display: "grid", gap: "10px" }}>
                  <div className="gudang-ui-callout" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <FaBarcode />
                    <strong>
                      Kode seri terpilih: {selectedSerial.nomor_seri}
                      {selectedSerial.matchedProduct?.name
                        ? ` / ${selectedSerial.matchedProduct.name}`
                        : ""}
                    </strong>
                  </div>
                  <div
                    className="gudang-ui-callout"
                    style={{
                      background: selectedSerial.matchedSkuId ? "#ecfdf5" : "#fff5f5",
                      borderColor: selectedSerial.matchedSkuId ? "#b7e4d8" : "#fecaca",
                      color: selectedSerial.matchedSkuId ? "#0f766e" : "#b91c1c",
                      display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", justifyContent: "space-between"
                    }}
                  >
                    {selectedSerial.matchedSkuId ? (
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <FaArrowRight />
                        <strong>
                          {`${selectedSerial.matchedSku?.label} otomatis terpilih berdasarkan kode seri.`}
                        </strong>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <FaArrowRight />
                          <strong>
                            {suggestedSerialSkuOptions.length
                              ? "SKU dari kode seri belum cocok otomatis."
                              : `SKU seri: ${selectedSerial.sku || "-"} belum ditemukan di SKU aktif.`}
                          </strong>
                        </div>
                        <button
                          type="button"
                          className="gudang-ui-button"
                          style={{ background: "#b91c1c", padding: "8px 12px", fontSize: "12px" }}
                          onClick={handleActivateSelectedSerialSku}
                          disabled={isActivatingSerialSku}
                        >
                          {isActivatingSerialSku ? "Memproses..." : "Aktifkan SKU"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              <div style={{ borderTop: "1px solid #e4e9f0", paddingTop: "18px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "14px" }}>
                  <strong style={{ color: "#375a7f", fontSize: "13px", textTransform: "uppercase" }}>SKU Aktif yang Bisa Dipilih</strong>
                  <span style={{ fontSize: "13px", color: "#6b7f95" }}>
                    {selectedSerial && !productId && suggestedSerialSkuOptions.length
                      ? "Pilih salah satu saran SKU. Produk dan SKU akan terisi otomatis."
                      : productId
                        ? "Pilih SKU untuk dimasukkan ke gudang."
                        : "Pilih produk / kode seri untuk memunculkan opsi SKU."}
                  </span>
                </div>

                {productId || suggestedSerialSkuOptions.length ? (
                  skuOptions.length ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                      {skuOptions.map((sku) => (
                        <button
                          key={sku.id}
                          type="button"
                          className={`gudang-layout-slot-button ${
                            String(selectedSku?.id) === String(sku.id) ? "selected filled" : ""
                          }`}
                          onClick={() => handleSelectSku(sku)}
                        >
                          <strong style={{ fontSize: "14px", display: "block" }}>{sku.label}</strong>
                          <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "6px" }}>{sku.code || `SKU #${sku.id}`}</span>
                          <span className="gudang-ui-pill" style={{ display: "inline-block", background: "#f8fbff", border: "1px solid #dce8f4", color: "#3a6a9b", fontSize: "11px" }}>
                            {getSkuLayoutSummary(sku)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="gudang-ui-empty-panel">
                      {productId ? "Produk ini belum memiliki SKU." : "Belum ada saran SKU yang cocok."}
                    </div>
                  )
                ) : (
                  <div className="gudang-ui-empty-panel">
                    Pilih produk atau kode seri jadi untuk menampilkan pilihan SKU.
                  </div>
                )}
              </div>
            </section>

            <section className="gudang-ui-panel">
              <div className="gudang-ui-panel-head">
                <div>
                  <h2>2. Pilih Lokasi & Rekomendasi</h2>
                  <p>Klik salah satu rekomendasi slot di bawah, atau pilih dari layout visual.</p>
                </div>
              </div>

              {selectedSku ? (
                <>
                  <div className="gudang-ui-callout" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
                    <FaMapMarkedAlt />
                    <strong>
                      {sameSkuSlots.length
                        ? `Aturan Gudang: 1 SKU tidak boleh di banyak rak. SKU ini wajib disimpan di ${sameSkuSlots[0].slotCode} (${sameSkuTotalQty} pcs eksisting).`
                        : "SKU ini belum pernah disimpan di gudang ini. Prioritas slot kosong."}
                    </strong>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px", marginBottom: "24px" }}>
                    {suggestedSlots.map((item) => (
                      <button
                        key={item.slot.id}
                        type="button"
                        className={`gudang-layout-slot-button ${
                          String(selectedSlot?.id) === String(item.slot.id) ? "selected" : ""
                        }`}
                        onClick={() => setSelectedSlot(item.slot)}
                      >
                        <strong style={{ fontSize: "15px", display: "block" }}>{item.slot.slotCode}</strong>
                        <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "6px" }}>{buildSlotHeadline(item.slot)}</span>
                        <span className="gudang-ui-pill" style={{ display: "inline-block", background: item.hasSameSku ? "#ecfdf5" : "#f1f5f9", borderColor: item.hasSameSku ? "#b7e4d8" : "#cbd5e1", color: item.hasSameSku ? "#0f766e" : "#475569", fontSize: "11px" }}>
                          {buildSuggestionDescription(item)}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="gudang-ui-grid two-columns" style={{ marginBottom: "24px", gridTemplateColumns: "1fr 1fr" }}>
                    <div className="gudang-ui-detail-box">
                      <h4 style={{ margin: "0 0 10px", color: "#17457c", fontSize: "14px" }}>Slot Terpilih</h4>
                      {selectedSlot ? (
                        <>
                          <p style={{ margin: 0, fontWeight: "bold", color: "#0f172a" }}>{buildSlotHeadline(selectedSlot)}</p>
                          {selectedSlot.alias ? <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>Alias: {selectedSlot.alias}</p> : null}
                        </>
                      ) : (
                        <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Belum ada slot yang dipilih.</p>
                      )}
                    </div>
                    <div className="gudang-ui-detail-box">
                      <h4 style={{ margin: "0 0 10px", color: "#17457c", fontSize: "14px" }}>Isi Slot Saat Ini</h4>
                      {selectedSlotLines.length ? (
                        <div className="gudang-ui-pill-list">
                          {selectedSlotLines.map((line) => (
                            <span key={line.id} className="gudang-ui-pill">
                              {line.sku?.label} | {line.qty} pcs
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Slot masih kosong & siap diisi.</p>
                      )}
                    </div>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px dashed #cbd5e1", margin: "24px 0" }} />

                  <div className="gudang-ui-panel-head">
                    <div>
                      <h3>Visual Layout Gudang</h3>
                      <p>Visualisasi pemetaan slot pada layout yang sedang aktif.</p>
                    </div>
                  </div>
                  <GudangLayoutMap
                    layout={selectedLayout}
                    selectedSlotId={selectedSlot?.id}
                    onSelectSlot={setSelectedSlot}
                    stockSummaryBySlot={stockSummaryBySlot}
                  />
                </>
              ) : (
                <div className="gudang-ui-empty-panel">
                  Setelah SKU dipilih, rekomendasi lokasi & visual layout akan muncul di sini.
                </div>
              )}
            </section>
          </div>

          <div className="gudang-master-visual-stack">
            <section className="gudang-ui-panel gudang-master-overview-panel">
              <div className="gudang-ui-panel-head">
                <div>
                  <h2>Ringkasan Input</h2>
                  <p>Pastikan data valid sebelum simpan.</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                {[
                  { label: "Gudang", value: selectedLayout?.name || "-" },
                  { label: "Kode Seri", value: selectedSerial?.nomor_seri || "-" },
                  { label: "Produk", value: selectedProduct?.name || "-" },
                  { label: "SKU", value: selectedSku?.label || "-" },
                  { label: "Qty", value: `${qty || 0} pcs` },
                  { label: "Lokasi", value: selectedSlot?.slotCode || "-" }
                ].map((item, index) => (
                  <div key={index} style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid #eef2f6", fontSize: "13px" }}>
                    <span style={{ color: "#64748b" }}>{item.label}</span>
                    <strong style={{ color: "#0f172a", textAlign: "right", maxWidth: "60%" }}>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="gudang-ui-callout" style={{ 
                marginBottom: "20px", 
                background: isFormReady ? "#ecfdf5" : "#fffbeb", 
                borderColor: isFormReady ? "#b7e4d8" : "#fde68a",
                color: isFormReady ? "#0f766e" : "#b45309",
                display: "flex", gap: "10px", alignItems: "center"
              }}>
                <FaCheckCircle style={{ fontSize: "18px", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", fontWeight: "600", lineHeight: "1.4" }}>
                  {isFormReady ? "Data sudah lengkap dan aman disave." : "Lengkapi barang dan lokasi agar form input bisa disimpan."}
                </span>
              </div>

              <form onSubmit={handleSubmit}>
                <button
                  type="submit"
                  className="gudang-ui-button"
                  disabled={!isFormReady || isSubmitting}
                  style={{ width: "100%", padding: "14px", fontSize: "14px", display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", opacity: isFormReady ? 1 : 0.6 }}
                >
                  <FaSave /> {isSubmitting ? "Menyimpan..." : "Simpan Placement"}
                </button>
              </form>
            </section>

            <section className="gudang-ui-panel">
              <div className="gudang-ui-panel-head" style={{ marginBottom: "14px" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#17457c", fontSize: "16px" }}>Log Terbaru</h3>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <GudangActivityTable
                  rows={placementRows}
                  resolveSlotLabel={resolveSlotLabel}
                  resolveSkuLabel={resolveSkuLabel}
                />
              </div>
            </section>
          </div>
        </div>
      )}
    </GudangProdukBaseShell>
  );
};

export default InputSkuGudang;

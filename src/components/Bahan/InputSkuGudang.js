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
        skuId: Number(selectedSku.id),
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
              <span>Kode Seri</span>
              <strong>{selectedSerial?.nomor_seri || "-"}</strong>
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
              <p>SKU bisa dipilih manual dari produk atau diambil cepat dari kode seri jadi.</p>
            </div>
          </div>

          <div className="gudang-ui-form-grid">
            <div className="gudang-ui-field" style={{ gridColumn: "1 / -1" }}>
              <label>Kode Seri Jadi (Opsional)</label>
              <div className="gudang-serial-combobox" ref={serialComboboxRef}>
                <div className="gudang-simple-searchbox">
                  <FaSearch />
                  <input
                    value={serialQuery}
                    onChange={handleSerialInputChange}
                    onFocus={() => setIsSerialDropdownOpen(true)}
                    placeholder="Cari kode seri jadi, SKU, atau nama produk..."
                  />
                </div>
                {isSerialDropdownOpen ? (
                  <div className="gudang-serial-dropdown">
                    {serialLoading ? (
                      <div className="gudang-serial-option muted">
                        Memuat daftar kode seri jadi...
                      </div>
                    ) : serialResults.length ? (
                      serialResults.slice(0, 10).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`gudang-serial-option ${
                            String(selectedSerialId) === String(item.id) ? "active" : ""
                          }`}
                          onClick={() => handleSelectSerial(item)}
                        >
                          <strong>{item.nomor_seri}</strong>
                          <span>
                            {item.matchedProduct?.name || "Produk belum ditemukan"} /{" "}
                            {item.matchedSku?.label || item.sku}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="gudang-serial-option muted">
                        Tidak ada kode seri yang cocok dengan pencarian ini.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              {serialError ? (
                <div className="gudang-simple-inline-note" style={{ marginTop: 8 }}>
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
            <div className="gudang-serial-picker-section">
              <div className="gudang-ui-callout">
                <FaBarcode />
                <strong>
                  Kode seri terpilih: {selectedSerial.nomor_seri}
                  {selectedSerial.matchedProduct?.name
                    ? ` / ${selectedSerial.matchedProduct.name}`
                    : ""}
                </strong>
              </div>
              <div
                className={`gudang-ui-callout ${
                  selectedSerial.matchedSkuId
                    ? ""
                    : "gudang-simple-warning-callout gudang-serial-warning-callout"
                }`}
              >
                {selectedSerial.matchedSkuId ? (
                  <>
                    <FaArrowRight />
                    <strong>
                      {`${selectedSerial.matchedSku?.label} sudah dipilih otomatis dari kode seri dan bisa langsung diinputkan.`}
                    </strong>
                  </>
                ) : (
                  <>
                    <div className="gudang-serial-warning-message">
                      <FaArrowRight />
                      <strong>
                        {suggestedSerialSkuOptions.length
                          ? "SKU dari kode seri belum cocok otomatis. SKU dari sini bisa dijadikan aktif atau pilih saran SKU di bawah."
                          : `SKU seri: ${
                              selectedSerial.sku || "-"
                            } belum ditemukan di SKU aktif. SKU dari sini bisa dijadikan aktif atau pilih produk/SKU manual di bawah.`}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="gudang-ui-button-secondary"
                      onClick={handleActivateSelectedSerialSku}
                      disabled={isActivatingSerialSku}
                    >
                      {isActivatingSerialSku ? "Menjadikan aktif..." : "Jadikan SKU Aktif"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : null}

          <div className="gudang-simple-sku-section">
            <div className="gudang-simple-section-label">
              <strong>SKU yang bisa dipilih</strong>
              <span>
                {selectedSerial && !productId && suggestedSerialSkuOptions.length
                  ? "Daftar ini adalah saran SKU dari kode seri yang dipilih. Klik salah satu agar produk dan SKU langsung terisi."
                  : productId
                    ? "Klik salah satu SKU agar user tidak perlu buka dropdown lagi."
                    : "Pilih produk dulu atau gunakan kode seri jadi agar daftar SKU muncul."}
              </span>
            </div>

            {productId || suggestedSerialSkuOptions.length ? (
              skuOptions.length ? (
                <div className="gudang-simple-sku-grid">
                  {skuOptions.map((sku) => (
                    <button
                      key={sku.id}
                      type="button"
                      className={`gudang-simple-sku-card ${
                        String(selectedSku?.id) === String(sku.id) ? "active" : ""
                      }`}
                      onClick={() => handleSelectSku(sku)}
                    >
                      <strong>{sku.label}</strong>
                      <span>{sku.code || `SKU #${sku.id}`}</span>
                      <small>{getSkuLayoutSummary(sku)}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="gudang-ui-empty-panel">
                  {productId
                    ? "Produk ini belum memiliki SKU."
                    : "Belum ada saran SKU yang cocok dari kode seri ini."}
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

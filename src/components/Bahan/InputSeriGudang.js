import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";
import {
  FaBarcode,
  FaCheckCircle,
  FaDownload,
  FaMapMarkedAlt,
  FaPlus,
  FaSave,
  FaTimes,
} from "react-icons/fa";
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
import {
  confirmGudangAction,
  showGudangError,
  showGudangSuccess,
  showGudangWarning,
} from "./GudangProdukAlerts";

const makeSkuRow = () => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  sku: "",
  qty: 1,
});

const normalizeText = (value) => String(value || "").trim().toUpperCase();

const normalizeSkuLookupKey = (value) =>
  normalizeText(value)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^A-Z0-9]/g, "");

const normalizeSelectValue = (value) => (value === "" ? "" : value);

const getProductListSkuName = (item) => String(item?.sku_name || item?.sku || "").trim();

const getProductListOptionLabel = (item) => {
  const skuName = getProductListSkuName(item);
  const productName = String(item?.product || "").trim();
  const details = [item?.product_colour, item?.product_size].filter(Boolean).join(" ");

  return [skuName, productName, details].filter(Boolean).join(" - ");
};

const buildSuggestionDescription = (item) => {
  if (item.hasSameSku) {
    return `SKU ini sudah ada ${item.sameSkuQty} pcs di slot ini.`;
  }

  if (item.isEmpty) {
    return "Slot kosong dan siap dipakai.";
  }

  return `${item.summary?.qty || 0} pcs tersimpan dengan ${item.summary?.skuCount || 0} SKU aktif.`;
};

const Step = ({ number, label, done, active, disabled, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    style={{
      appearance: "none",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "12px 16px",
      borderRadius: "12px",
      background: active ? "#edf4ff" : done ? "#ecfdf5" : "#f8fafc",
      border: `1px solid ${active ? "#2458ce" : done ? "#b7e4d8" : "#e2e8f0"}`,
      flex: 1,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      textAlign: "left",
    }}
  >
    <span
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "#2458ce" : done ? "#0f766e" : "#e2e8f0",
        color: active || done ? "#fff" : "#64748b",
        fontWeight: "800",
        fontSize: "13px",
      }}
    >
      {done ? <FaCheckCircle size={14} /> : number}
    </span>
    <span
      style={{
        fontSize: "13px",
        fontWeight: "700",
        color: active ? "#2458ce" : done ? "#0f766e" : "#334155",
      }}
    >
      Section {number}: {label}
    </span>
  </button>
);

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const sanitizeDownloadName = (value) =>
  String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

const getBarcodeDownloadErrorMessage = async (error, fallback) => {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    const text = await data.text();

    try {
      const parsed = JSON.parse(text);
      return parsed?.message || fallback;
    } catch {
      return text || fallback;
    }
  }

  return buildGudangWorkspaceErrorMessage(error, fallback);
};

const InputSeriGudang = ({ embedded = false }) => {
  const { state, setState, isLoading, error } = useGudangProdukWorkspace();
  const [isSerialInputModalOpen, setIsSerialInputModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(1);
  const [layoutId, setLayoutId] = useState("");
  const [serialBase, setSerialBase] = useState("");
  const [skuRows, setSkuRows] = useState([makeSkuRow()]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadingRowId, setDownloadingRowId] = useState("");
  const [productListOptions, setProductListOptions] = useState([]);
  const [productListLoading, setProductListLoading] = useState(false);
  const [productListError, setProductListError] = useState("");
  const [activeProductListRowId, setActiveProductListRowId] = useState("");
  const [debouncedProductListSearch, setDebouncedProductListSearch] = useState("");

  const activeProductListSearch = useMemo(() => {
    const activeRow = skuRows.find((row) => row.id === activeProductListRowId);
    return String(activeRow?.sku || "").trim();
  }, [activeProductListRowId, skuRows]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedProductListSearch(activeProductListSearch);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [activeProductListSearch]);

  useEffect(() => {
    if (!layoutId && state.layouts.length) {
      setLayoutId(String(state.layouts[0].id));
    }
  }, [layoutId, state.layouts]);

  useEffect(() => {
    if (!isSerialInputModalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSerialInputModalOpen]);

  useEffect(() => {
    if (!isSerialInputModalOpen && embedded) return undefined;

    let ignore = false;

    const fetchProductListOptions = async () => {
      try {
        setProductListLoading(true);
        setProductListError("");

        const response = await API.get("/product-list", {
          params: {
            search: debouncedProductListSearch || "",
            page: 1,
            per_page: 500,
            sortBy: "sku_name",
            sortOrder: "asc",
          },
        });

        if (ignore) return;

        setProductListOptions(Array.isArray(response?.data?.data) ? response.data.data : []);
      } catch (fetchError) {
        if (ignore) return;

        setProductListOptions([]);
        setProductListError(
          fetchError?.response?.data?.message ||
            fetchError?.message ||
            "Gagal mengambil data Product List."
        );
      } finally {
        if (!ignore) {
          setProductListLoading(false);
        }
      }
    };

    fetchProductListOptions();

    return () => {
      ignore = true;
    };
  }, [debouncedProductListSearch, embedded, isSerialInputModalOpen]);

  const selectedLayout = useMemo(
    () =>
      state.layouts.find((layout) => String(layout.id) === String(layoutId)) ||
      state.layouts[0] ||
      null,
    [layoutId, state.layouts]
  );

  const allSlots = useMemo(() => getAllSlots(state), [state]);
  const stockSummaryBySlot = useMemo(() => getSlotStockSummaryMap(state), [state]);

  const selectedLayoutSlots = useMemo(
    () =>
      selectedLayout
        ? allSlots.filter((slot) => String(slot.layoutId) === String(selectedLayout.id))
        : [],
    [allSlots, selectedLayout]
  );

  useEffect(() => {
    if (!selectedLayout || !selectedSlot) return;
    if (String(selectedSlot.layoutId) !== String(selectedLayout.id)) {
      setSelectedSlot(null);
    }
  }, [selectedLayout, selectedSlot]);

  const normalizedRows = useMemo(() => {
    let cursor = 1;

    return skuRows.map((row) => {
      const skuText = normalizeText(row.sku);
      const skuLookupKey = normalizeSkuLookupKey(row.sku);
      const qty = Math.max(1, Number(row.qty) || 1);
      const matchedProductList =
        productListOptions.find(
          (item) => normalizeSkuLookupKey(getProductListSkuName(item)) === skuLookupKey
        ) ||
        null;
      const matchedSku =
        state.skus.find((sku) => normalizeSkuLookupKey(sku.code) === skuLookupKey) ||
        state.skus.find((sku) => normalizeSkuLookupKey(sku.label) === skuLookupKey) ||
        null;
      const startNumber = cursor;
      const endNumber = cursor + qty - 1;
      cursor += qty;

      return {
        ...row,
        skuText,
        skuLookupKey,
        qty,
        matchedProductList,
        matchedSku,
        startNumber,
        endNumber,
        serialRange:
          qty === 1
            ? `${normalizeText(serialBase)}.${startNumber}`
            : `${normalizeText(serialBase)}.${startNumber} - ${normalizeText(serialBase)}.${endNumber}`,
      };
    });
  }, [productListOptions, serialBase, skuRows, state.skus]);

  const validRows = normalizedRows.filter(
    (row) => row.skuText && (row.matchedProductList || row.matchedSku) && row.qty > 0
  );
  const totalQty = validRows.reduce((total, row) => total + row.qty, 0);
  const serialReady = Boolean(normalizeText(serialBase));
  const skuReady = serialReady && validRows.length === skuRows.length && totalQty > 0;

  const selectedSlotLines = selectedSlot ? stockSummaryBySlot[selectedSlot.id]?.lines || [] : [];
  const primarySku = validRows.find((row) => row.matchedSku)?.matchedSku || null;
  const slotConflictRows = useMemo(() => {
    if (!selectedSlot) return [];

    return validRows.filter((row) =>
      state.stockEntries.some(
        (entry) =>
          Number(entry.qty || 0) > 0 &&
          row.matchedSku &&
          String(entry.skuId) === String(row.matchedSku.id) &&
          String(entry.slotId) !== String(selectedSlot.id)
      )
    );
  }, [selectedSlot, state.stockEntries, validRows]);
  const isFormReady = Boolean(selectedLayout && skuReady && selectedSlot && !slotConflictRows.length);

  const sameSkuSlots = useMemo(() => {
    if (!primarySku) return [];

    return selectedLayoutSlots.filter((slot) =>
      (stockSummaryBySlot[slot.id]?.lines || []).some(
        (line) => String(line.skuId) === String(primarySku.id)
      )
    );
  }, [primarySku, selectedLayoutSlots, stockSummaryBySlot]);

  const suggestedSlots = useMemo(() => {
    if (!selectedLayout) return [];

    return selectedLayoutSlots
      .map((slot) => {
        const summary = stockSummaryBySlot[slot.id];
        const sameSkuLines = primarySku
          ? (summary?.lines || []).filter((line) => String(line.skuId) === String(primarySku.id))
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

        return String(left.slot.slotCode).localeCompare(String(right.slot.slotCode));
      })
      .slice(0, 6);
  }, [primarySku, selectedLayout, selectedLayoutSlots, stockSummaryBySlot]);

  const placementRows = state.activityLog.filter((item) => item.type === "placement").slice(0, 5);

  const resolveSlotLabel = (slotId) => allSlots.find((slot) => slot.id === slotId)?.slotCode || "-";

  const resolveSkuLabel = (skuId) =>
    state.skus.find((sku) => String(sku.id) === String(skuId))?.label || skuId;

  const handleRowChange = (rowId, field, value) => {
    if (field === "sku") {
      setActiveProductListRowId(rowId);
    }

    setSkuRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: field === "qty" ? Math.max(1, Number(value) || 1) : value.toUpperCase(),
            }
          : row
      )
    );
  };

  const handleSelectProductListSku = (rowId, item) => {
    const skuName = getProductListSkuName(item).toUpperCase();
    if (!skuName) return;

    setSkuRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, sku: skuName } : row))
    );
    setActiveProductListRowId("");
  };

  const getProductListMatches = (row) => {
    const keyword = String(row.sku || "").trim().toLowerCase();

    return productListOptions
      .filter((item) => {
        if (!keyword) return true;

        return [
          item?.sku_name,
          item?.product,
          item?.product_group,
          item?.product_source,
          item?.product_colour,
          item?.product_size,
        ].some((value) => String(value || "").toLowerCase().includes(keyword));
      })
      .slice(0, 12);
  };

  const handleAddSkuRow = () => {
    setSkuRows((currentRows) => [...currentRows, makeSkuRow()]);
  };

  const handleRemoveSkuRow = (rowId) => {
    setSkuRows((currentRows) =>
      currentRows.length === 1 ? currentRows : currentRows.filter((row) => row.id !== rowId)
    );
  };

  const buildBarcodePayload = (rows) => ({
    serial_base: normalizeText(serialBase),
    items: rows.map((row) => ({
      sku: row.skuText,
      qty: row.qty,
      start_number: row.startNumber,
    })),
  });

  const handleDownloadBarcode = async (row = null) => {
    const rows = row ? [row] : validRows;

    if (!serialReady) {
      await showGudangWarning("Barcode belum siap", "Isi kode seri terlebih dahulu.");
      return;
    }

    if (!rows.length) {
      await showGudangWarning("Barcode belum siap", "Pilih minimal satu SKU dari Product List terlebih dahulu.");
      return;
    }

    const invalidRows = rows.filter((item) => !item.matchedProductList && !item.matchedSku);
    if (invalidRows.length) {
      await showGudangWarning(
        "SKU belum valid",
        "Pilih SKU dari dropdown Product List atau gunakan SKU yang sudah terdeteksi otomatis."
      );
      return;
    }

    try {
      setDownloadingRowId(row?.id || "__all__");

      const response = await API.post(
        "/gudang-produk-workspace/serial-barcodes",
        buildBarcodePayload(rows),
        { responseType: "blob" }
      );
      const contentType = String(response?.headers?.["content-type"] || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const text = await response.data.text();
        const parsed = JSON.parse(text);
        throw new Error(parsed?.message || "Backend mengembalikan error saat membuat barcode.");
      }

      const suffix = row ? row.skuText : "semua-sku";
      downloadBlob(
        response.data,
        `barcode-${sanitizeDownloadName(normalizeText(serialBase))}-${sanitizeDownloadName(suffix)}.pdf`
      );
    } catch (downloadError) {
      await showGudangError(
        "Gagal unduh barcode",
        await getBarcodeDownloadErrorMessage(downloadError, "Barcode kode seri tidak bisa diunduh.")
      );
    } finally {
      setDownloadingRowId("");
    }
  };

  const handleSectionChange = (section) => {
    if (section === 2 && !skuReady) return;
    if (section === 3 && !isFormReady) return;
    setActiveSection(section);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isFormReady) {
      await showGudangWarning(
        "Data belum lengkap",
        slotConflictRows.length
          ? "Ada SKU yang sudah tersimpan di slot lain. Pilih lokasi SKU tersebut atau pisahkan inputnya."
          : "Isi kode seri, SKU, qty, dan lokasi gudang terlebih dahulu."
      );
      return;
    }

    const isConfirmed = await confirmGudangAction({
      title: "Input stok ke gudang?",
      text: `${validRows.length} SKU / ${totalQty} pcs akan dimasukkan ke ${selectedSlot.slotCode}.`,
      confirmButtonText: "Ya, inputkan",
      cancelButtonText: "Cek lagi",
    });

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSubmitting(true);

      const placements = [];
      for (const row of validRows) {
        const activeSkuResult = row.matchedSku
          ? { sku: { id: row.matchedSku.id } }
          : await ensureGudangProdukSkuActive(row.skuText);
        const parsedSkuId = parseInt(activeSkuResult?.sku?.id, 10);

        if (!parsedSkuId || isNaN(parsedSkuId)) {
          throw new Error(`SKU ${row.skuText} tidak valid atau gagal dibuat aktif.`);
        }

        const response = await placeGudangProdukSku(
          {
            layoutId: selectedLayout.id,
            slotId: selectedSlot.id,
            skuId: parsedSkuId,
            qty: row.qty,
            notes: [
              `Kode seri: ${normalizeText(serialBase)}`,
              `Nomor seri: ${row.serialRange}`,
              notes.trim(),
            ]
              .filter(Boolean)
              .join(" | "),
          },
          { minimal: true }
        );

        placements.push(response.placement);
      }

      setState((currentState) => {
        const nextStockEntries = [...currentState.stockEntries];
        const nextActivities = [];

        placements.forEach((placement) => {
          if (!placement?.stockEntry) return;

          const existingIndex = nextStockEntries.findIndex(
            (entry) => String(entry.id) === String(placement.stockEntry.id)
          );

          if (existingIndex >= 0) {
            nextStockEntries[existingIndex] = placement.stockEntry;
          } else {
            nextStockEntries.unshift(placement.stockEntry);
          }

          if (placement.activity) {
            nextActivities.push(placement.activity);
          }
        });

        return {
          ...currentState,
          stockEntries: nextStockEntries,
          activityLog: [...nextActivities, ...currentState.activityLog].slice(0, 500),
        };
      });

      await showGudangSuccess(
        "Kode seri berhasil disimpan",
        `${validRows.length} SKU / ${totalQty} pcs berhasil dimasukkan ke ${selectedSlot.slotCode}.`
      );

      setSerialBase("");
      setSkuRows([makeSkuRow()]);
      setSelectedSlot(null);
      setNotes("");
      setActiveSection(1);
      setIsSerialInputModalOpen(false);
    } catch (submitError) {
      await showGudangError(
        "Gagal menyimpan stok",
        buildGudangWorkspaceErrorMessage(submitError, "Terjadi kesalahan saat menyimpan stok dari kode seri.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <>
      {error ? (
        <div className="gudang-ui-empty-panel" style={{ marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <Step
          number="1"
          label="Input Kode Seri"
          done={skuReady}
          active={activeSection === 1}
          onClick={() => handleSectionChange(1)}
        />
        <Step
          number="2"
          label="Pilih Lokasi Slot"
          done={Boolean(selectedSlot)}
          active={activeSection === 2}
          disabled={!skuReady}
          onClick={() => handleSectionChange(2)}
        />
        <Step
          number="3"
          label="Ringkasan"
          done={isFormReady}
          active={activeSection === 3}
          disabled={!isFormReady}
          onClick={() => handleSectionChange(3)}
        />
      </div>

      <div className="gudang-master-workspace-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {activeSection === 1 ? (
            <section className="gudang-ui-panel">
              <div className="gudang-ui-panel-head">
                <div>
                  <h2>1. Input Kode Seri</h2>
                  <p>Masukkan kode seri dasar, SKU, dan qty. Nomor urut barcode dibuat otomatis mengikuti urutan SKU.</p>
                </div>
              </div>

              <div className="gudang-ui-form-grid">
                <div className="gudang-ui-field">
                  <label>Kode Seri</label>
                  <input
                    value={serialBase}
                    onChange={(event) => setSerialBase(event.target.value.toUpperCase())}
                    placeholder="Contoh: 3100.112"
                  />
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

                <div className="gudang-ui-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Catatan (opsional)</label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Contoh: stok dari QC, retur toko, stock opname..."
                    style={{ minHeight: 72 }}
                  />
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 1 ? (
            <section className="gudang-ui-panel">
              <div className="gudang-ui-panel-head">
                <div>
                  <h2>SKU dan Qty</h2>
                  <p>Satu kode seri bisa berisi banyak SKU. Nomor seri dibuat berurutan mengikuti urutan baris.</p>
                </div>
                <button
                  type="button"
                  className="gudang-ui-button"
                  onClick={handleAddSkuRow}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <FaPlus /> Tambah SKU
                </button>
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                {productListError ? (
                  <div
                    className="gudang-ui-callout"
                    style={{ background: "#fff5f5", borderColor: "#fecaca", color: "#b91c1c" }}
                  >
                    <strong>{productListError}</strong>
                  </div>
                ) : null}

                {normalizedRows.map((row, index) => (
                  <div
                    key={row.id}
                    style={{
                      border: "1px solid #d5e3f8",
                      borderRadius: "14px",
                      background: "#f8fbff",
                      padding: "14px",
                      display: "grid",
                      gridTemplateColumns: "minmax(220px, 1fr) 120px auto auto",
                      gap: "12px",
                      alignItems: "end",
                    }}
                  >
                    <div className="gudang-ui-field">
                      <label>Nama SKU #{index + 1}</label>
                      <div style={{ position: "relative" }}>
                        <input
                          value={row.sku}
                          onChange={(event) => handleRowChange(row.id, "sku", event.target.value)}
                          onFocus={() => setActiveProductListRowId(row.id)}
                          onBlur={() => {
                            window.setTimeout(() => {
                              setActiveProductListRowId((currentRowId) =>
                                currentRowId === row.id ? "" : currentRowId
                              );
                            }, 120);
                          }}
                          placeholder="Cari product / SKU dari Product List"
                          autoComplete="off"
                        />

                        {activeProductListRowId === row.id ? (
                          <div
                            style={{
                              position: "absolute",
                              top: "calc(100% + 6px)",
                              left: 0,
                              right: 0,
                              zIndex: 20,
                              background: "#fff",
                              border: "1px solid #d1dbe8",
                              borderRadius: 12,
                              boxShadow: "0 16px 32px rgba(15, 23, 42, 0.12)",
                              padding: 8,
                              maxHeight: 300,
                              overflowY: "auto",
                            }}
                          >
                            {productListLoading ? (
                              <div style={{ padding: "10px 12px", color: "#64748b", fontSize: 13 }}>
                                Memuat Product List...
                              </div>
                            ) : getProductListMatches(row).length ? (
                              getProductListMatches(row).map((item) => {
                                const skuName = getProductListSkuName(item);
                                return (
                                  <button
                                    key={item.id || skuName}
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => handleSelectProductListSku(row.id, item)}
                                    style={{
                                      width: "100%",
                                      display: "block",
                                      textAlign: "left",
                                      border: "none",
                                      background:
                                        normalizeSkuLookupKey(skuName) === row.skuLookupKey
                                          ? "#edf4ff"
                                          : "transparent",
                                      borderRadius: 8,
                                      padding: "9px 10px",
                                      cursor: "pointer",
                                      marginBottom: 2,
                                    }}
                                  >
                                    <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>
                                      {skuName || "-"}
                                    </strong>
                                    <span style={{ display: "block", color: "#64748b", fontSize: 12, marginTop: 2 }}>
                                      {[item.product, item.product_colour, item.product_size].filter(Boolean).join(" | ") || "Product List"}
                                    </span>
                                  </button>
                                );
                              })
                            ) : (
                              <div style={{ padding: "10px 12px", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
                                Product List tidak ditemukan untuk "{row.sku}".
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="gudang-ui-field">
                      <label>Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={row.qty}
                        onChange={(event) => handleRowChange(row.id, "qty", event.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      className="gudang-ui-button-secondary"
                      onClick={() => handleDownloadBarcode(row)}
                      disabled={downloadingRowId === row.id || downloadingRowId === "__all__"}
                      style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "44px" }}
                    >
                      <FaDownload /> {downloadingRowId === row.id ? "Unduh..." : "Barcode"}
                    </button>

                    <button
                      type="button"
                      className="gudang-ui-button-secondary"
                      onClick={() => handleRemoveSkuRow(row.id)}
                      disabled={skuRows.length === 1}
                      style={{ height: "44px", minWidth: "44px", padding: "0 12px" }}
                      aria-label="Hapus SKU"
                    >
                      <FaTimes />
                    </button>

                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                      <span className="gudang-ui-pill" style={{ background: "#fff", borderColor: "#c8d8f6", color: "#2458ce" }}>
                        {row.skuText ? row.serialRange : "Isi SKU untuk melihat nomor seri"}
                      </span>
                      {row.matchedSku ? (
                        <span className="gudang-ui-pill" style={{ background: "#ecfdf5", borderColor: "#b7e4d8", color: "#0f766e" }}>
                          SKU terdeteksi otomatis
                        </span>
                      ) : row.matchedProductList ? (
                        <span className="gudang-ui-pill" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#b45309" }}>
                          SKU akan diaktifkan otomatis saat simpan
                        </span>
                      ) : row.skuText ? (
                        <span className="gudang-ui-pill" style={{ background: "#fff5f5", borderColor: "#fecaca", color: "#b91c1c" }}>
                          Pilih SKU dari Product List
                        </span>
                      ) : null}
                      {row.matchedProductList ? (
                        <span className="gudang-ui-pill" style={{ background: "#f8fafc", borderColor: "#dbe4ef", color: "#475569" }}>
                          {row.matchedProductList.product || "Product List"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <strong style={{ color: "#0f172a", fontSize: 13 }}>
                  Total {validRows.length} SKU / {totalQty} pcs
                </strong>
                <button
                  type="button"
                  className="gudang-ui-button"
                  onClick={() => handleDownloadBarcode()}
                  disabled={downloadingRowId === "__all__"}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <FaDownload /> {downloadingRowId === "__all__" ? "Mengunduh..." : "Unduh Semua Barcode"}
                </button>
              </div>
            </section>
          ) : null}

          {activeSection === 2 ? (
            <section className="gudang-ui-panel">
              <div className="gudang-ui-panel-head">
                <div>
                  <h2>2. Pilih Lokasi Slot</h2>
                  <p>Pilih satu lokasi untuk menyimpan semua SKU pada kode seri ini.</p>
                </div>
              </div>

              {sameSkuSlots.length ? (
                <div className="gudang-ui-callout" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
                  <FaMapMarkedAlt />
                  <strong>
                    SKU utama sudah tersimpan di {sameSkuSlots[0].slotCode}. Gunakan lokasi yang sama agar SKU tidak tersebar.
                  </strong>
                </div>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
                {suggestedSlots.map((item) => {
                  const isSelected = String(selectedSlot?.id) === String(item.slot.id);
                  return (
                    <button
                      key={item.slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(item.slot)}
                      className={`gudang-layout-slot-button ${isSelected ? "selected" : ""}`}
                    >
                      <strong style={{ fontSize: 15, display: "block" }}>{item.slot.slotCode}</strong>
                      <span style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>
                        {buildSlotHeadline(item.slot)}
                      </span>
                      <span className="gudang-ui-pill" style={{ fontSize: 11 }}>
                        {buildSuggestionDescription(item)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedSlot ? (
                <div className="gudang-ui-detail-box" style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: "0 0 10px", color: "#17457c", fontSize: 14 }}>Slot Terpilih</h4>
                  <p style={{ margin: 0, fontWeight: "bold", color: "#0f172a" }}>{buildSlotHeadline(selectedSlot)}</p>
                  {selectedSlotLines.length ? (
                    <div className="gudang-ui-pill-list" style={{ marginTop: 8 }}>
                      {selectedSlotLines.map((line) => (
                        <span key={line.id} className="gudang-ui-pill">
                          {line.sku?.label} | {line.qty} pcs
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: "6px 0 0", color: "#0f766e", fontSize: 12, fontWeight: 700 }}>
                      Slot kosong dan siap diisi.
                    </p>
                  )}
                </div>
              ) : null}

              {slotConflictRows.length ? (
                <div
                  className="gudang-ui-callout"
                  style={{
                    marginBottom: 20,
                    background: "#fff5f5",
                    borderColor: "#fecaca",
                    color: "#b91c1c",
                  }}
                >
                  <strong>
                    {slotConflictRows.map((row) => row.skuText).join(", ")} sudah tersimpan di slot lain. Aturan gudang tidak mengizinkan 1 SKU tersebar di banyak slot.
                  </strong>
                </div>
              ) : null}

              <details>
                <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#2458ce", padding: "8px 0" }}>
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
            </section>
          ) : null}

          {activeSection === 3 ? (
            <section className="gudang-ui-panel">
              <div className="gudang-ui-panel-head">
                <div>
                  <h2>3. Ringkasan Input</h2>
                  <p>Pastikan data di bawah sudah benar sebelum stok dimasukkan ke gudang.</p>
                </div>
              </div>

              <div style={{ display: "grid", gap: "12px", marginBottom: 18 }}>
                {[
                  { label: "Kode Seri", value: normalizeText(serialBase) || "-" },
                  { label: "Gudang", value: selectedLayout?.name || "-" },
                  { label: "Lokasi Slot", value: selectedSlot?.slotCode || "-" },
                  { label: "Total SKU", value: `${validRows.length} SKU` },
                  { label: "Total Qty", value: `${totalQty} pcs` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="gudang-ui-detail-box"
                    style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}
                  >
                    <span style={{ color: "#64748b", fontSize: 13 }}>{item.label}</span>
                    <strong style={{ color: "#0f172a", textAlign: "right" }}>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
                {validRows.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>{row.skuText}</strong>
                      <span style={{ color: "#64748b", fontSize: 12 }}>{row.serialRange}</span>
                    </div>
                    <strong style={{ color: "#2458ce", fontSize: 13 }}>{row.qty} pcs</strong>
                  </div>
                ))}
              </div>

              <div
                className="gudang-ui-callout"
                style={{
                  marginBottom: 20,
                  background: "#ecfdf5",
                  borderColor: "#b7e4d8",
                  color: "#0f766e",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                <FaCheckCircle style={{ flexShrink: 0 }} />
                <strong>Apakah yakin data ini akan diinputkan ke gudang?</strong>
              </div>

              <button
                type="button"
                className="gudang-ui-button"
                disabled={!isFormReady || isSubmitting}
                onClick={handleSubmit}
                style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
              >
                <FaSave />
                {isSubmitting ? "Menyimpan stok..." : "Ya, Simpan ke Gudang"}
              </button>
            </section>
          ) : null}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="gudang-ui-button-secondary"
              disabled={activeSection === 1}
              onClick={() => setActiveSection((section) => Math.max(1, section - 1))}
            >
              Kembali
            </button>
            {activeSection < 3 ? (
              <button
                type="button"
                className="gudang-ui-button"
                disabled={activeSection === 1 ? !skuReady : !isFormReady}
                onClick={() => setActiveSection((section) => Math.min(3, section + 1))}
              >
                Lanjut ke Section {activeSection + 1}
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>

        <div className="gudang-master-visual-stack">
          {placementRows.length > 0 ? (
            <section className="gudang-ui-panel">
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: "#17457c", fontSize: 14 }}>Log Placement Terbaru</strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {placementRows.map((row) => (
                  <div key={row.id} style={{ fontSize: 12, padding: "8px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{resolveSkuLabel(row.skuId)}</div>
                    <div style={{ color: "#64748b", marginTop: 2 }}>
                      {resolveSlotLabel(row.toSlotId)} | {row.qty} pcs
                    </div>
                    {row.notes ? (
                      <div style={{ color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.notes}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return (
      <>
        <section className="gudang-ui-panel gudang-sku-input-launch-panel">
          <div className="gudang-ui-panel-head">
            <div>
              <h2>Input dari Kode Seri</h2>
              <p>Input kode seri manual, tambahkan banyak SKU, lalu unduh barcode berurutan.</p>
            </div>
            <button
              type="button"
              className="gudang-ui-button"
              onClick={() => {
                setActiveSection(1);
                setIsSerialInputModalOpen(true);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <FaBarcode /> Tambahkan Produk
            </button>
          </div>

          <div className="gudang-sku-input-launch-summary">
            {[
              { label: "Kode Seri", value: normalizeText(serialBase) || "Belum diisi" },
              { label: "SKU", value: validRows.length ? `${validRows.length} SKU` : "Belum diisi" },
              { label: "Qty", value: `${totalQty || 0} pcs` },
              { label: "Lokasi Slot", value: selectedSlot?.slotCode || "Belum dipilih" },
            ].map((item) => (
              <div key={item.label} className="gudang-ui-detail-box">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        {isSerialInputModalOpen ? (
          <div
            className="gudang-sku-input-modal-backdrop"
            role="presentation"
            onMouseDown={() => {
              if (!isSubmitting) {
                setIsSerialInputModalOpen(false);
              }
            }}
          >
            <div
              className="gudang-sku-input-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="gudang-serial-input-modal-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="gudang-sku-input-modal-head">
                <div>
                  <h2 id="gudang-serial-input-modal-title">Input Kode Seri</h2>
                  <p>Ikuti 3 section: input kode seri, pilih lokasi slot, lalu cek ringkasan sebelum simpan.</p>
                </div>
                <button
                  type="button"
                  className="gudang-ui-button-secondary"
                  onClick={() => setIsSerialInputModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Tutup
                </button>
              </div>

              <div className="gudang-sku-input-modal-body">{content}</div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <GudangProdukBaseShell
      title="Input Stok dari Kode Seri"
      subtitle="Input kode seri manual beserta SKU dan qty, lalu pilih lokasi gudang."
      icon={FaBarcode}
      statusLabel={
        isLoading
          ? "Memuat data..."
          : isSubmitting
            ? "Menyimpan stok..."
            : isFormReady
              ? "Siap Disimpan"
              : "Flow Kode Seri"
      }
    >
      {content}
    </GudangProdukBaseShell>
  );
};

export default InputSeriGudang;

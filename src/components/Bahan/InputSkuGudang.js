import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import API from "../../api";
import {
  FaArrowRight,
  FaBarcode,
  FaBoxOpen,
  FaCheckCircle,
  FaDownload,
  FaFileExcel,
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
  fetchGudangProdukWorkspaceCatalog,
  placeGudangProdukSku,
} from "./GudangProdukWorkspaceApi";
import {
  confirmGudangAction,
  showGudangError,
  showGudangSuccess,
  showGudangWarning,
} from "./GudangProdukAlerts";
import {
  buildSerialSkuSuggestions,
  normalizeLooseText,
} from "./GudangProdukSerialSkuUtils";
import InputSeriGudang from "./InputSeriGudang";

const normalizeSelectValue = (value) => (value === "" ? "" : value);

const IMPORT_COLUMN_ALIASES = {
  sku: ["sku", "kode_sku", "kode sku", "sku_code", "sku code", "kode barang"],
  slot: [
    "slot",
    "kode_slot",
    "kode slot",
    "lokasi",
    "kode_lokasi",
    "kode lokasi",
    "rak",
  ],
  qty: ["qty", "quantity", "jumlah", "jumlah_masuk", "jumlah masuk", "pcs"],
  layout: ["gudang", "warehouse", "layout", "layout_id", "layout id", "gudang_tujuan"],
  notes: ["catatan", "notes", "note", "keterangan"],
};

const normalizeImportHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeImportLookupValue = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const SERIAL_SEARCH_RESULT_LIMIT = 50;

const buildSerialSkuLookupKeys = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  const loose = normalizeLooseText(value);
  const compact = loose.replace(/\s+/g, "");

  return [raw, loose, compact].filter(Boolean);
};

const findImportColumnIndex = (headers, aliases) => {
  const normalizedHeaders = headers.map(normalizeImportHeader);
  const normalizedAliases = aliases.map(normalizeImportHeader);

  return normalizedHeaders.findIndex((header) => normalizedAliases.includes(header));
};

const getImportCellValue = (row, index) => {
  if (index === undefined || index === null || index < 0) {
    return "";
  }

  return row[index] ?? "";
};

const parseImportQty = (value) => {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  const text = String(value || "").trim();
  if (!text) return null;

  const compactText = text.replace(/\s/g, "");
  const isThousandsFormat = /^\d{1,3}([.,]\d{3})+$/.test(compactText);
  const normalizedText = isThousandsFormat
    ? compactText.replace(/[.,]/g, "")
    : compactText.replace(",", ".");
  const parsed = Number(normalizedText);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const addImportLookupItem = (lookup, value, item) => {
  const key = normalizeImportLookupValue(value);
  if (!key) return;

  if (!lookup.has(key)) {
    lookup.set(key, []);
  }

  lookup.get(key).push(item);
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

const InputSkuGudang = () => {
  const { state, setState, isLoading, error } = useGudangProdukWorkspace({
    includeCatalog: false,
    activityLimit: 20,
  });
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
  const [serialLoading, setSerialLoading] = useState(false);
  const [serialError, setSerialError] = useState("");
  const [isSerialDropdownOpen, setIsSerialDropdownOpen] = useState(false);
  const [isActivatingSerialSku, setIsActivatingSerialSku] = useState(false);
  const serialComboboxRef = useRef(null);
  const serialRequestStartedRef = useRef(false);
  const importInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [replaceExistingStock, setReplaceExistingStock] = useState(false);
  const [isSkuInputModalOpen, setIsSkuInputModalOpen] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    if (!layoutId && state.layouts.length) {
      setLayoutId(String(state.layouts[0].id));
    }
  }, [layoutId, state.layouts]);

  useEffect(() => {
    if (!isSkuInputModalOpen || serialRequestStartedRef.current) {
      return undefined;
    }

    serialRequestStartedRef.current = true;
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
  }, [isSkuInputModalOpen]);

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

  useEffect(() => {
    if (!isSkuInputModalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSkuInputModalOpen]);

  const hasCatalog = state.products.length > 0 || state.skus.length > 0;

  const ensureCatalogLoaded = useCallback(async () => {
    if (hasCatalog) {
      return true;
    }

    try {
      setIsCatalogLoading(true);
      setCatalogError("");

      const catalog = await fetchGudangProdukWorkspaceCatalog();
      setState((currentState) => ({
        ...currentState,
        products: catalog.products,
        skus: catalog.skus,
      }));

      return true;
    } catch (fetchError) {
      const message = buildGudangWorkspaceErrorMessage(
        fetchError,
        "Gagal memuat katalog produk dan SKU."
      );

      setCatalogError(message);
      await showGudangError("Katalog gagal dimuat", message);
      return false;
    } finally {
      setIsCatalogLoading(false);
    }
  }, [hasCatalog, setState]);

  const selectedLayout = useMemo(
    () =>
      state.layouts.find((layout) => String(layout.id) === String(layoutId)) ||
      state.layouts[0] ||
      null,
    [layoutId, state.layouts]
  );

  const productById = useMemo(() => {
    const lookup = new Map();

    state.products.forEach((product) => {
      lookup.set(String(product.id), product);
    });

    return lookup;
  }, [state.products]);

  const serialSkuLookup = useMemo(() => {
    const lookup = new Map();

    state.skus.forEach((sku) => {
      [sku.code, sku.label].forEach((value) => {
        buildSerialSkuLookupKeys(value).forEach((key) => {
          if (!lookup.has(key)) {
            lookup.set(key, sku);
          }
        });
      });
    });

    return lookup;
  }, [state.skus]);

  const buildSerialViewItem = useCallback(
    (item) => {
      const lookupMatchedSku =
        buildSerialSkuLookupKeys(item?.sku)
          .map((key) => serialSkuLookup.get(key))
          .find(Boolean) || null;
      const matchedProduct = lookupMatchedSku?.productId
        ? productById.get(String(lookupMatchedSku.productId)) || null
        : null;

      return {
        ...item,
        quantityHint: Math.max(1, Number(item?.jumlah) || 1),
        matchedSku: lookupMatchedSku,
        matchedSkuId: lookupMatchedSku?.id || "",
        matchedProduct,
        matchedProductId: matchedProduct?.id || "",
      };
    },
    [productById, serialSkuLookup]
  );

  const serialResults = useMemo(() => {
    const keyword = serialQuery.trim().toLowerCase();
    if (!isSerialDropdownOpen && !keyword) {
      return [];
    }

    const results = [];

    for (const item of serialItems) {
      const serialViewItem = buildSerialViewItem(item);
      const isMatch =
        !keyword ||
        [
        item.nomor_seri,
        item.sku,
          serialViewItem.matchedSku?.label,
          serialViewItem.matchedProduct?.name,
        ].some((value) => String(value || "").toLowerCase().includes(keyword));

      if (!isMatch) {
        continue;
      }

      results.push(serialViewItem);
      if (results.length >= SERIAL_SEARCH_RESULT_LIMIT) {
        break;
      }
    }

    return results;
  }, [buildSerialViewItem, isSerialDropdownOpen, serialItems, serialQuery]);

  const selectedSerial = useMemo(() => {
    const rawSerial = serialItems.find((item) => String(item.id) === String(selectedSerialId));

    return rawSerial ? buildSerialViewItem(rawSerial) : null;
  }, [buildSerialViewItem, selectedSerialId, serialItems]);

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
  const shouldBuildStockSummary = isSkuInputModalOpen || inputMode === "seri";
  const stockSummaryBySlot = useMemo(
    () => (shouldBuildStockSummary ? getSlotStockSummaryMap(state) : {}),
    [shouldBuildStockSummary, state]
  );
  const skuImportLookup = useMemo(() => {
    const lookup = new Map();

    state.skus.forEach((sku) => {
      [sku.id, sku.code, sku.label].forEach((value) => {
        const key = normalizeImportLookupValue(value);
        if (key && !lookup.has(key)) {
          lookup.set(key, sku);
        }
      });
    });

    return lookup;
  }, [state.skus]);
  const layoutImportLookup = useMemo(() => {
    const lookup = new Map();

    state.layouts.forEach((layout) => {
      [layout.id, layout.name].forEach((value) => {
        const key = normalizeImportLookupValue(value);
        if (key && !lookup.has(key)) {
          lookup.set(key, layout);
        }
      });
    });

    return lookup;
  }, [state.layouts]);
  const slotImportLookup = useMemo(() => {
    const lookup = new Map();

    allSlots.forEach((slot) => {
      [slot.id, slot.slotCode, slot.alias, buildSlotHeadline(slot)].forEach((value) => {
        addImportLookupItem(lookup, value, slot);
      });
    });

    return lookup;
  }, [allSlots]);
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

  const readImportRows = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", raw: false, cellDates: false });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("Sheet Excel tidak ditemukan.");
    }

    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    });
  };

  const detectImportColumns = (rows) => {
    const maxHeaderScan = Math.min(rows.length, 15);

    for (let rowIndex = 0; rowIndex < maxHeaderScan; rowIndex += 1) {
      const headers = rows[rowIndex] || [];
      const columnMap = {
        sku: findImportColumnIndex(headers, IMPORT_COLUMN_ALIASES.sku),
        slot: findImportColumnIndex(headers, IMPORT_COLUMN_ALIASES.slot),
        qty: findImportColumnIndex(headers, IMPORT_COLUMN_ALIASES.qty),
        layout: findImportColumnIndex(headers, IMPORT_COLUMN_ALIASES.layout),
        notes: findImportColumnIndex(headers, IMPORT_COLUMN_ALIASES.notes),
      };

      if (columnMap.sku >= 0 && columnMap.slot >= 0 && columnMap.qty >= 0) {
        return {
          headerRowIndex: rowIndex,
          columnMap,
        };
      }
    }

    return null;
  };

  const resolveImportSku = (value) =>
    skuImportLookup.get(normalizeImportLookupValue(value)) || null;

  const resolveImportLayout = (value) => {
    if (!String(value || "").trim()) {
      return selectedLayout || null;
    }

    return layoutImportLookup.get(normalizeImportLookupValue(value)) || null;
  };

  const resolveImportSlot = (value, rowLayout) => {
    const key = normalizeImportLookupValue(value);
    const matches = slotImportLookup.get(key) || [];
    const scopedMatches = rowLayout
      ? matches.filter((slot) => String(slot.layoutId) === String(rowLayout.id))
      : matches;

    if (scopedMatches.length === 1) {
      return {
        slot: scopedMatches[0],
        error: "",
      };
    }

    if (scopedMatches.length > 1) {
      return {
        slot: null,
        error: "Slot cocok lebih dari satu. Isi kolom Gudang agar lokasi jelas.",
      };
    }

    if (rowLayout) {
      return {
        slot: null,
        error: `Slot tidak ditemukan di ${rowLayout.name}.`,
      };
    }

    if (matches.length > 1) {
      return {
        slot: null,
        error: "Slot cocok lebih dari satu. Isi kolom Gudang agar lokasi jelas.",
      };
    }

    return {
      slot: null,
      error: "Slot tidak ditemukan.",
    };
  };

  const buildImportRowsFromFile = async (file) => {
    const rows = await readImportRows(file);
    const detected = detectImportColumns(rows);

    if (!detected) {
      throw new Error("Header wajib berisi kolom SKU, Slot, dan Qty.");
    }

    const { headerRowIndex, columnMap } = detected;
    const parsedRows = [];
    const validationErrors = [];
    const importedSlotBySku = new Map();

    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const excelRowNumber = rowIndex + 1;

      if (row.every((cell) => !String(cell || "").trim())) {
        continue;
      }

      const rawSku = getImportCellValue(row, columnMap.sku);
      const rawSlot = getImportCellValue(row, columnMap.slot);
      const rawQty = getImportCellValue(row, columnMap.qty);
      const rawLayout = getImportCellValue(row, columnMap.layout);
      const rawNotes = getImportCellValue(row, columnMap.notes);

      if (!String(rawSku || "").trim()) {
        validationErrors.push(`Row ${excelRowNumber}: SKU wajib diisi.`);
        continue;
      }

      if (!String(rawSlot || "").trim()) {
        validationErrors.push(`Row ${excelRowNumber}: Slot wajib diisi.`);
        continue;
      }

      const importSku = resolveImportSku(rawSku);
      if (!importSku) {
        validationErrors.push(`Row ${excelRowNumber}: SKU "${rawSku}" tidak ditemukan di SKU aktif.`);
        continue;
      }

      const importSkuId = parseInt(importSku.id, 10);
      if (!importSkuId || isNaN(importSkuId)) {
        validationErrors.push(`Row ${excelRowNumber}: ID SKU "${rawSku}" tidak valid.`);
        continue;
      }

      const importQty = parseImportQty(rawQty);
      if (!importQty) {
        validationErrors.push(`Row ${excelRowNumber}: Qty harus angka bulat lebih dari 0.`);
        continue;
      }

      const importLayout = resolveImportLayout(rawLayout);
      if (String(rawLayout || "").trim() && !importLayout) {
        validationErrors.push(`Row ${excelRowNumber}: Gudang "${rawLayout}" tidak ditemukan.`);
        continue;
      }

      const { slot: importSlot, error: slotError } = resolveImportSlot(rawSlot, importLayout);
      if (!importSlot) {
        validationErrors.push(`Row ${excelRowNumber}: ${slotError}`);
        continue;
      }

      const existingStock = state.stockEntries.find(
        (entry) =>
          String(entry.skuId) === String(importSku.id) &&
          Number(entry.qty || 0) > 0
      );

      if (existingStock && String(existingStock.slotId) !== String(importSlot.id)) {
        validationErrors.push(
          `Row ${excelRowNumber}: SKU sudah tersimpan di ${resolveSlotLabel(existingStock.slotId)}.`
        );
        continue;
      }

      const skuKey = String(importSku.id);
      const previousImportedSlotId = importedSlotBySku.get(skuKey);
      if (previousImportedSlotId && String(previousImportedSlotId) !== String(importSlot.id)) {
        validationErrors.push(
          `Row ${excelRowNumber}: SKU yang sama tidak boleh diarahkan ke slot berbeda dalam satu file.`
        );
        continue;
      }
      importedSlotBySku.set(skuKey, importSlot.id);

      parsedRows.push({
        rowNumber: excelRowNumber,
        layoutId: importSlot.layoutId,
        slot: importSlot,
        sku: importSku,
        skuId: importSkuId,
        qty: importQty,
        notes: [
          `Import Excel: ${file.name} row ${excelRowNumber}`,
          String(rawNotes || "").trim(),
        ]
          .filter(Boolean)
          .join(" | "),
      });
    }

    return {
      rows: parsedRows,
      errors: validationErrors,
    };
  };

  const formatImportErrors = (errors) =>
    errors.slice(0, 6).join("\n") +
    (errors.length > 6 ? `\n...dan ${errors.length - 6} catatan lain.` : "");

  const isRecoverableImportError = (importError) => importError?.response?.status === 422;

  const handleImportButtonClick = async () => {
    const isCatalogReady = await ensureCatalogLoaded();
    if (!isCatalogReady) return;

    importInputRef.current?.click();
  };

  const handleDownloadImportTemplate = async () => {
    const isCatalogReady = await ensureCatalogLoaded();
    if (!isCatalogReady) return;

    const sampleSku = state.skus[0];
    const sampleSlot = selectedLayoutSlots[0];
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["sku_name", "qty", "mapping"],
      [
        sampleSku?.label || sampleSku?.code || "NAMA SKU",
        1,
        sampleSlot?.slotCode || "L3B08/1",
      ],
    ]);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "migrate");
    XLSX.writeFile(workbook, "template-migrasi-stok-gudang.xlsx");
  };

  const handleOpenSkuInputModal = async () => {
    setIsSkuInputModalOpen(true);
    await ensureCatalogLoaded();
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!selectedLayout?.id) {
      await showGudangWarning(
        "Gudang belum dipilih",
        "Pilih gudang tujuan terlebih dahulu sebelum import file Excel."
      );
      return;
    }

    const isCatalogReady = await ensureCatalogLoaded();
    if (!isCatalogReady) return;

    try {
      setImportResult(null);

      const isConfirmed = await confirmGudangAction({
        title: "Import SKU ke Gudang?",
        text: `File "${file.name}" akan diproses ke ${
          selectedLayout?.name || "gudang terpilih"
        }. Format wajib: sku_name, qty, mapping.${
          replaceExistingStock
            ? " Stok lama SKU yang sudah ada di lokasi lain akan dihapus lebih dulu."
            : ""
        }`,
        confirmButtonText: "Import Excel",
        cancelButtonText: "Batal",
      });

      if (!isConfirmed) return;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("layoutId", selectedLayout.id);
      formData.append("replaceExistingStock", replaceExistingStock ? "1" : "0");
      setIsImporting(true);
      setImportProgress({
        message: replaceExistingStock
          ? "Mengirim file dan mengganti stok lama di server..."
          : "Mengirim dan memproses file di server...",
      });

      const response = await API.post("/gudang-produk-workspace/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const result = response?.data || {};
      const createdSkuCount = Number(result.created_skus || 0);
      const activatedSkuCount = Number(result.activated_skus || 0);
      const replacedStockEntries = Number(result.replaced_stock_entries || 0);
      const replacedStockQty = Number(result.replaced_stock_qty || 0);
      const skippedRows = Number(result.skipped_rows || 0);
      const skuImportNotes = [
        createdSkuCount > 0 ? `${createdSkuCount} SKU baru dibuat` : "",
        activatedSkuCount > 0 ? `${activatedSkuCount} SKU diaktifkan` : "",
        replacedStockEntries > 0
          ? `${replacedStockEntries} stok lama dihapus (${replacedStockQty} pcs)`
          : "",
        skippedRows > 0 ? `${skippedRows} baris kosong dilewati` : "",
      ].filter(Boolean);

      setImportResult({
        total: Number(result.processed || 0),
        success: Number(result.processed || 0),
        failed: 0,
        created: Number(result.created || 0),
        updated: Number(result.updated || 0),
        createdSkus: createdSkuCount,
        activatedSkus: activatedSkuCount,
        replacedStockEntries,
        replacedStockQty,
        skippedRows,
        errors: [],
      });
      if (result.data) {
        setState((currentState) => ({
          ...currentState,
          ...result.data,
          products: currentState.products,
          skus: currentState.skus,
        }));
      }

      await showGudangSuccess(
        "Import Excel selesai",
        `${Number(result.processed || 0)} baris berhasil dimasukkan ke ${selectedLayout.name}${
          skuImportNotes.length ? ` (${skuImportNotes.join(", ")})` : ""
        }.`
      );
    } catch (importError) {
      const responseErrors = importError?.response?.data?.errors;
      const errorMessages = Array.isArray(responseErrors)
        ? responseErrors.map((item) =>
            typeof item === "string"
              ? item
              : `Row ${item.row || "-"}: ${item.message || "Data tidak valid."}`
          )
        : responseErrors && typeof responseErrors === "object"
          ? Object.entries(responseErrors).flatMap(([field, messages]) =>
              (Array.isArray(messages) ? messages : [messages]).map((message) =>
                `${field}: ${String(message)}`
              )
            )
          : [];

      setImportResult({
        total: Number(importError?.response?.data?.total_rows || 0),
        success: 0,
        failed: errorMessages.length,
        createdSkus: 0,
        activatedSkus: 0,
        replacedStockEntries: 0,
        replacedStockQty: 0,
        skippedRows: Number(importError?.response?.data?.skipped_rows || 0),
        errors: errorMessages,
      });

      await showGudangError(
        "Import Excel gagal",
        errorMessages.length
          ? `${importError?.response?.data?.message || "File Excel tidak bisa diimport."}\n${formatImportErrors(
              errorMessages
            )}`
          : buildGudangWorkspaceErrorMessage(importError, "File Excel tidak bisa diimport.")
      );
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

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
      }, { minimal: true });

      if (response.placement?.stockEntry) {
        setState((currentState) => {
          const nextStockEntries = [...currentState.stockEntries];
          const existingIndex = nextStockEntries.findIndex(
            (entry) => String(entry.id) === String(response.placement.stockEntry.id)
          );

          if (existingIndex >= 0) {
            nextStockEntries[existingIndex] = response.placement.stockEntry;
          } else {
            nextStockEntries.unshift(response.placement.stockEntry);
          }

          return {
            ...currentState,
            stockEntries: nextStockEntries,
            activityLog: response.placement.activity
              ? [response.placement.activity, ...currentState.activityLog].slice(0, 20)
              : currentState.activityLog,
          };
        });
      }
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
      setIsSkuInputModalOpen(false);
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
      const nextCatalog = await fetchGudangProdukWorkspaceCatalog();
      setState((currentState) => ({
        ...currentState,
        products: nextCatalog.products,
        skus: nextCatalog.skus,
      }));
      const activatedSku = nextCatalog.skus.find(
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
          : isCatalogLoading
            ? "Memuat katalog..."
          : isImporting
            ? "Mengimport Excel..."
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

      {catalogError ? (
        <div className="gudang-ui-empty-panel" style={{ marginBottom: 20 }}>
          {catalogError}
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
        <>
          <section className="gudang-ui-panel" style={{ marginBottom: 20 }}>
            <div className="gudang-ui-panel-head">
              <div>
                <h2>Import Excel SKU ke Gudang</h2>
                <p>Gunakan format migrasi: sku_name, qty, mapping. Mapping adalah kode slot pada gudang terpilih.</p>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportFileChange}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="gudang-ui-button"
                  onClick={handleImportButtonClick}
                  disabled={isImporting || isLoading || isCatalogLoading}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <FaFileExcel /> {isImporting ? "Import..." : "Import Excel"}
                </button>
                <button
                  type="button"
                  className="gudang-ui-button-secondary"
                  onClick={handleDownloadImportTemplate}
                  disabled={isImporting || isCatalogLoading}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <FaDownload /> Template
                </button>
              </div>
            </div>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "12px",
                fontSize: "13px",
                color: "#334155",
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={replaceExistingStock}
                onChange={(event) => setReplaceExistingStock(event.target.checked)}
                disabled={isImporting}
              />
              Hapus stok lama SKU yang sudah ada sebelum import
            </label>

            {importProgress ? (
              <div
                className="gudang-ui-callout"
                style={{ marginBottom: importResult ? "12px" : 0 }}
              >
                <strong>
                  {importProgress.message || "Mengimport file Excel..."}
                </strong>
              </div>
            ) : null}

            {importResult ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "10px",
                }}
              >
                {[
                  { label: "Total", value: importResult.total },
                  { label: "Berhasil", value: importResult.success },
                  { label: "Stok Baru", value: importResult.created || 0 },
                  { label: "Stok Update", value: importResult.updated || 0 },
                  { label: "SKU Baru", value: importResult.createdSkus || 0 },
                  { label: "SKU Aktif", value: importResult.activatedSkus || 0 },
                  { label: "Stok Lama", value: importResult.replacedStockEntries || 0 },
                  { label: "Dilewati", value: importResult.skippedRows || 0 },
                  { label: "Gagal", value: importResult.failed },
                ].map((item) => (
                  <div key={item.label} className="gudang-ui-detail-box" style={{ padding: "12px" }}>
                    <span style={{ display: "block", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
                      {item.label}
                    </span>
                    <strong style={{ color: "#0f172a", fontSize: "20px" }}>{item.value}</strong>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="gudang-ui-panel gudang-sku-input-launch-panel" style={{ marginBottom: 20 }}>
            <div className="gudang-ui-panel-head">
              <div>
                <h2>Input SKU ke Gudang</h2>
                <p>Form input dipindahkan ke modal agar halaman utama tetap ringkas dan operator fokus satu alur.</p>
              </div>
              <button
                type="button"
                className="gudang-ui-button"
                onClick={handleOpenSkuInputModal}
                disabled={isCatalogLoading}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <FaBoxOpen /> {isCatalogLoading ? "Memuat Katalog..." : "Buka Modal Input"}
              </button>
            </div>

            <div className="gudang-sku-input-launch-summary">
              {[
                { label: "Gudang", value: selectedLayout?.name || "-" },
                { label: "SKU", value: selectedSku?.label || "Belum dipilih" },
                { label: "Qty", value: `${qty || 0} pcs` },
                { label: "Lokasi", value: selectedSlot?.slotCode || "Belum dipilih" },
              ].map((item) => (
                <div key={item.label} className="gudang-ui-detail-box">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          {isSkuInputModalOpen ? (
            <div
              className="gudang-sku-input-modal-backdrop"
              role="presentation"
              onMouseDown={() => {
                if (!isSubmitting) {
                  setIsSkuInputModalOpen(false);
                }
              }}
            >
              <div
                className="gudang-sku-input-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="gudang-sku-input-modal-title"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="gudang-sku-input-modal-head">
                  <div className="gudang-sku-input-modal-title">
                    <span className="gudang-sku-input-modal-kicker">Workflow SKU Placement</span>
                    <h2 id="gudang-sku-input-modal-title">Input SKU ke Gudang</h2>
                    <p>Pilih barang, tentukan lokasi gudang, lalu simpan placement dari satu modal ini.</p>
                  </div>
                  <div className="gudang-sku-input-modal-progress" aria-label="Progress input SKU">
                    {progressSteps.map((step) => (
                      <div
                        key={step.key}
                        className={`gudang-sku-input-progress-card ${
                          step.isComplete ? "complete" : ""
                        }`}
                      >
                        <span>{step.isComplete ? <FaCheckCircle /> : step.number}</span>
                        <div>
                          <strong>{step.title}</strong>
                          <small>{step.description}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="gudang-ui-button-secondary gudang-sku-input-close-button"
                    onClick={() => setIsSkuInputModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Tutup
                  </button>
                </div>

                <div className="gudang-sku-input-modal-body">
          <div className="gudang-master-workspace-grid gudang-sku-input-workspace">
          <div className="gudang-master-main gudang-sku-input-main">
            
            <section className="gudang-ui-panel gudang-sku-input-section">
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

            <section className="gudang-ui-panel gudang-sku-input-section">
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

          <div className="gudang-master-visual-stack gudang-sku-input-sidebar">
            <section className="gudang-ui-panel gudang-master-overview-panel gudang-sku-input-summary-panel">
              <div className="gudang-ui-panel-head">
                <div>
                  <h2>Ringkasan Input</h2>
                  <p>Pastikan data valid sebelum simpan.</p>
                </div>
              </div>

              <div className="gudang-sku-input-summary-list">
                {[
                  { label: "Gudang", value: selectedLayout?.name || "-" },
                  { label: "Kode Seri", value: selectedSerial?.nomor_seri || "-" },
                  { label: "Produk", value: selectedProduct?.name || "-" },
                  { label: "SKU", value: selectedSku?.label || "-" },
                  { label: "Qty", value: `${qty || 0} pcs` },
                  { label: "Lokasi", value: selectedSlot?.slotCode || "-" }
                ].map((item, index) => (
                  <div key={index} className="gudang-sku-input-summary-row">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div
                className={`gudang-sku-input-review-card ${
                  isFormReady ? "ready" : "pending"
                }`}
              >
                <FaCheckCircle />
                <span>
                  {isFormReady ? "Data sudah lengkap dan aman disave." : "Lengkapi barang dan lokasi agar form input bisa disimpan."}
                </span>
              </div>

              <form onSubmit={handleSubmit}>
                <button
                  type="submit"
                  className="gudang-ui-button gudang-sku-input-submit-button"
                  disabled={!isFormReady || isSubmitting}
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
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </GudangProdukBaseShell>
  );
};

export default InputSkuGudang;

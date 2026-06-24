import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./ScanProdukMasukGudang.css";
import "./GudangProdukWorkspace.css";
import API from "../../api";
import {
  FaBarcode,
  FaBoxOpen,
  FaMapMarkerAlt,
  FaTrash,
  FaWarehouse,
  FaTimes,
  FaCheck,
  FaArrowRight,
  FaSave,
  FaSpinner,
  FaExchangeAlt,
} from "react-icons/fa";
import { FiAlertTriangle, FiBox, FiSearch } from "react-icons/fi";
import useGudangProdukWorkspace from "./useGudangProdukWorkspace";
import {
  getAllSlots,
  getSlotStockSummaryMap,
  getSkuById,
  getProductById,
} from "./GudangProdukMockStore";
import { buildSlotHeadline, GudangLayoutMap, formatGudangDate, GudangStatCard } from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
import {
  fetchPlacementSessions,
  storePlacementSession,
  deletePlacementSession,
  executePlacementSession,
  buildGudangWorkspaceErrorMessage,
} from "./GudangProdukWorkspaceApi";
import {
  showGudangError,
  showGudangSuccess,
  showGudangWarning,
} from "./GudangProdukAlerts";

const formatTanggal = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTanggalPendek = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isOlderThan15Days = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const diffMs = Date.now() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 15;
};

const getSerialFromBarcode = (bc) => {
  if (bc.includes(" | ")) {
    return bc.split(" | ")[1]?.trim() || bc;
  }
  return bc.trim();
};

const getKodeSeriFromSerial = (serial) => {
  const lastDot = serial.lastIndexOf(".");
  return lastDot !== -1 ? serial.slice(0, lastDot) : serial;
};

const getScanKey = (barcode) => {
  const serial = getSerialFromBarcode(barcode);
  const isSerialBarcode = serial.includes(".") || barcode.includes(" | ");
  return isSerialBarcode ? `serial:${serial}` : `barcode:${barcode}`;
};

const findSkuMatch = (skus, seriSku) => {
  if (!seriSku) return null;
  const cleanSeriSku = String(seriSku).trim();
  const normSeriSku = cleanSeriSku.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // 1. Exact match code
  let found = skus.find(s => s.code === cleanSeriSku);
  if (found) return found;

  // 2. Exact match label
  found = skus.find(s => s.label === cleanSeriSku);
  if (found) return found;

  // 3. Normalized alphanumeric match
  found = skus.find(s => {
    const normCode = String(s.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const normLabel = String(s.label || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return normCode === normSeriSku || normLabel === normSeriSku;
  });
  if (found) return found;

  // 4. Loose contains match
  found = skus.find(s => {
    const normCode = String(s.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const normLabel = String(s.label || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normCode || !normSeriSku) return false;

    const minLenCode = Math.min(normCode.length, normSeriSku.length);
    const maxLenCode = Math.max(normCode.length, normSeriSku.length);
    if (minLenCode >= 4 && (minLenCode / maxLenCode) >= 0.5) {
      if (normCode.includes(normSeriSku) || normSeriSku.includes(normCode)) return true;
    }

    if (normLabel) {
      const minLenLabel = Math.min(normLabel.length, normSeriSku.length);
      const maxLenLabel = Math.max(normLabel.length, normSeriSku.length);
      if (minLenLabel >= 4 && (minLenLabel / maxLenLabel) >= 0.5) {
        if (normLabel.includes(normSeriSku) || normSeriSku.includes(normLabel)) return true;
      }
    }

    return false;
  });
  return found || null;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const WizardButton = ({ isActive, scene, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: "grid",
      gridTemplateColumns: "34px 1fr",
      gap: 10,
      alignItems: "center",
      minHeight: 74,
      border: `1px solid ${
        isActive ? "#7c3aed" : scene.complete ? "#bbf7d0" : "#e2e8f0"
      }`,
      borderRadius: 8,
      background: isActive ? "#f5f3ff" : scene.complete ? "#f0fdf4" : "#fff",
      color: "#0f172a",
      textAlign: "left",
      padding: 12,
      cursor: "pointer",
    }}
  >
    <span
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: isActive
          ? "#7c3aed"
          : scene.complete
          ? "#16a34a"
          : "#e2e8f0",
        color: isActive || scene.complete ? "#fff" : "#64748b",
        fontWeight: 800,
      }}
    >
      {scene.complete ? <FaCheck size={13} /> : scene.id}
    </span>
    <span style={{ minWidth: 0 }}>
      <strong style={{ display: "block", fontSize: 13, lineHeight: 1.25 }}>
        {scene.title}
      </strong>
      <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "#64748b" }}>
        {scene.helper}
      </span>
    </span>
  </button>
);

const SessionCard = ({ session, resolveSkuLabel, resolveSeriLabel, isSelected, onToggleSelection, onDeleteSession, isDeleting }) => {
  const barcodeCount = Array.isArray(session.barcodes) ? session.barcodes.length : 0;
  const resolved = resolveSkuLabel(session.skuId);
  const skuLabel = String(resolved) === String(session.skuId) && session.skuCode ? session.skuCode : resolved;
  const resolvedSeri = resolveSeriLabel(session.seriId);
  const seriLabel = String(resolvedSeri) === String(session.seriId) && session.seriNumber ? session.seriNumber : resolvedSeri;

  return (
    <div
      onClick={() => onToggleSelection(session.id)}
      style={{
        border: isSelected ? "2px solid #7c3aed" : "1px solid #ddd6fe",
        borderRadius: 8,
        padding: "10px",
        backgroundColor: isSelected ? "#f3e8ff" : "#f5f3ff",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        cursor: "pointer",
        transition: "all 0.2s"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", minWidth: 0 }}>
          <input 
            type="checkbox" 
            checked={isSelected} 
            readOnly 
            style={{ marginTop: 2, width: 14, height: 14, accentColor: "#7c3aed", cursor: "pointer", flexShrink: 0 }} 
          />
          <div style={{ minWidth: 0, lineHeight: 1.3 }}>
            <strong style={{ fontSize: 13, color: "#1e293b", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={session.skuCode && session.skuCode !== skuLabel ? `${skuLabel} (${session.skuCode})` : skuLabel}>
              {skuLabel} {session.skuCode && session.skuCode !== skuLabel ? `(${session.skuCode})` : ""}
            </strong>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              Seri: <strong style={{ color: "#7c3aed" }}>{seriLabel}</strong> &bull; QTY: <strong>{barcodeCount}</strong> pcs
            </span>
          </div>
        </div>
        <span style={{ fontSize: 10, background: "#ede9fe", color: "#6d28d9", padding: "2px 6px", borderRadius: 12, fontWeight: 700, flexShrink: 0 }}>PENDING</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: 22 }}>
        <div style={{ fontSize: 10, color: "#94a3b8", display: "flex", gap: 12 }}>
          <span>{formatTanggal(session.createdAt)}</span>
          {session.creatorName && <span>Oleh: <strong>{session.creatorName}</strong></span>}
        </div>
        
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
          disabled={isDeleting}
          style={{ background: "none", border: "none", color: "#ef4444", cursor: isDeleting ? "not-allowed" : "pointer", padding: "4px", fontSize: 13, opacity: 0.7 }}
          title="Hapus Sesi"
        >
          {isDeleting ? <FaSpinner className="gudang-ui-spin" /> : <FaTrash />}
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ScanProdukMasukGudang = () => {
  const scanInputRef = useRef(null);
  const barcodeTimeoutRef = useRef(null);
  const activeScanKeysRef = useRef(new Set());

  // Workspace state (layouts, slots, etc.)
  const { state, setState, isLoading: workspaceLoading, error: workspaceError, refresh } = useGudangProdukWorkspace();

  // Main Tab state
  const [activeMainTab, setActiveMainTab] = useState("scan"); // "scan" | "putaway" | "history"

  // Seri list & selection (Scene 1 - optional search selector)
  const [seriList, setSeriList] = useState([]);
  const [selectedSeriNumber, setSelectedSeriNumber] = useState("");
  const [selectedSeriId, setSelectedSeriId] = useState("");
  const [selectedSeriItem, setSelectedSeriItem] = useState(null);
  const [seriDetails, setSeriDetails] = useState(null);
  const [loadingSeriDetails, setLoadingSeriDetails] = useState(false);
  const [seriQuery, setSeriQuery] = useState("");
  const [isSeriDropdownOpen, setIsSeriDropdownOpen] = useState(false);
  const seriComboboxRef = useRef(null);

  // Scan state (Scene 1)
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanStatus, setScanStatus] = useState(""); // "", "loading", "success", "error"
  const [scannedBarcodes, setScannedBarcodes] = useState([]);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [cancelingPrintKey, setCancelingPrintKey] = useState("");

  // Destination selection – for executing a session (Scene 2)
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [layoutId, setLayoutId] = useState("");
  const [filterFloor, setFilterFloor] = useState("");
  const [filterBlock, setFilterBlock] = useState("");
  const [slotId, setSlotId] = useState("");
  const [execNotes, setExecNotes] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  // Sessions list state
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Search filter for history
  const [searchTerm, setSearchTerm] = useState("");

  // Search filter for pending sessions
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");

  // ── Session Loading ─────────────────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const data = await fetchPlacementSessions();
      setSessions(data);
    } catch (err) {
      console.error("Gagal memuat sesi pending", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Fetch list of nomor seri with search query
  const fetchSeriList = async (search = "") => {
    try {
      const response = await API.get("/seri", {
        params: {
          all: 1,
          search: search
        }
      });
      setSeriList(response.data?.data || []);
    } catch (err) {
      console.error("Gagal memuat list nomor seri", err);
    }
  };

  // Load nomor seri directory on mount
  useEffect(() => {
    fetchSeriList("");
  }, []);

  // Debounced search for serial directory dropdown
  useEffect(() => {
    if (!isSeriDropdownOpen) return;
    const delayDebounce = setTimeout(() => {
      fetchSeriList(seriQuery.trim());
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [seriQuery, isSeriDropdownOpen]);

  // Click outside to close combobox dropdown
  useEffect(() => {
    const handler = (e) => {
      if (!seriComboboxRef.current?.contains(e.target)) {
        setIsSeriDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSeriDetails = async (seriId, nomorSeri, options = {}) => {
    const { silent = false } = options;
    if (!seriId) {
      setSeriDetails(null);
      return;
    }
    try {
      if (!silent) {
        setLoadingSeriDetails(true);
      }
      const response = await API.get("/gudang-produk-workspace/seri-details", {
        params: { seri_id: seriId, nomor_seri: nomorSeri },
      });
      const details = response.data?.data || null;
      setSeriDetails(details);
      if (details) {
        setSelectedSeriItem(details);
      }
    } catch (err) {
      console.error("Gagal mengambil detail seri", err);
      if (!silent) {
        setSeriDetails(null);
      }
    } finally {
      if (!silent) {
        setLoadingSeriDetails(false);
      }
    }
  };

  const handleSeriChange = (seriItem) => {
    setSelectedSeriNumber(seriItem.nomor_seri);
    setSelectedSeriId(seriItem.id);
    setSelectedSeriItem(seriItem);
    fetchSeriDetails(seriItem.id, seriItem.nomor_seri);
  };

  // Filtered serial items based on search query
  const filteredSeriList = useMemo(() => {
    const kw = seriQuery.trim().toLowerCase();
    if (!kw) return seriList;
    return seriList.filter((seriItem) =>
      String(seriItem.nomor_seri || "").toLowerCase().includes(kw) ||
      String(seriItem.sku || "").toLowerCase().includes(kw)
    );
  }, [seriList, seriQuery]);

  // Selected serial label to display in the input search combobox
  const selectedSeriLabel = useMemo(() => {
    const found = selectedSeriItem || seriList.find((seriItem) => seriItem.id === selectedSeriId);
    if (!found) return "";
    const scanned = found.scanned_count ?? 0;
    return `${found.nomor_seri} (${found.sku} - ${scanned}/${found.jumlah} pcs)`;
  }, [selectedSeriId, seriList, selectedSeriItem]);

  // Auto-select first layout for Scene 2
  useEffect(() => {
    if (!layoutId && state.layouts.length) {
      setLayoutId(String(state.layouts[0].id));
    }
  }, [layoutId, state.layouts]);

  // Reset slot when layout changes in Scene 2
  useEffect(() => {
    setSlotId("");
  }, [layoutId]);

  // Cleanup barcode timeout
  useEffect(() => {
    return () => {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, []);

  // Derived workspace data
  const allSlots = useMemo(() => getAllSlots(state), [state]);
  const stockSummaryBySlot = useMemo(() => getSlotStockSummaryMap(state), [state]);

  const selectedLayout = useMemo(
    () => state.layouts.find((layout) => String(layout.id) === String(layoutId)) || null,
    [layoutId, state.layouts]
  );

  const layoutSlots = useMemo(
    () =>
      selectedLayout
        ? allSlots.filter((slot) => String(slot.layoutId) === String(selectedLayout.id))
        : [],
    [allSlots, selectedLayout]
  );

  const layoutFloors = useMemo(() => {
    const map = new Map();
    layoutSlots.forEach((s) => map.set(String(s.floorId), s.floorLabel || s.floorNumber));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [layoutSlots]);

  const layoutBlocks = useMemo(() => {
    const map = new Map();
    layoutSlots
      .filter((s) => !filterFloor || String(s.floorId) === String(filterFloor))
      .forEach((s) => map.set(String(s.blockId), s.blockLabel || s.blockCode));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [layoutSlots, filterFloor]);

  const filteredSlots = useMemo(() => {
    return layoutSlots.filter((s) => {
      if (filterFloor && String(s.floorId) !== String(filterFloor)) return false;
      if (filterBlock && String(s.blockId) !== String(filterBlock)) return false;
      return true;
    });
  }, [layoutSlots, filterFloor, filterBlock]);

  const filteredLayout = useMemo(() => {
    if (!selectedLayout) return null;
    if (!filterFloor && !filterBlock) return selectedLayout;

    return {
      ...selectedLayout,
      floors: selectedLayout.floors
        .filter(floor => !filterFloor || String(floor.id) === String(filterFloor))
        .map(floor => {
          if (!filterBlock) return floor;
          return {
            ...floor,
            blocks: floor.blocks.filter(block => String(block.id) === String(filterBlock))
          };
        })
        .filter(floor => floor.blocks.length > 0)
    };
  }, [selectedLayout, filterFloor, filterBlock]);

  const selectedSlot = useMemo(
    () => (slotId ? allSlots.find((slot) => String(slot.id) === String(slotId)) : null),
    [allSlots, slotId]
  );

  const selectedSlotSummary = selectedSlot ? stockSummaryBySlot[selectedSlot.id] : null;

  const canScan = activeMainTab === "scan";

  const orderedSeriPrints = useMemo(() => {
    if (!seriDetails?.prints) return [];
    return [...seriDetails.prints].sort(
      (a, b) => (Number(b.print_seq) || 0) - (Number(a.print_seq) || 0)
    );
  }, [seriDetails]);

  const activeSeriPrintCount = seriDetails?.prints?.filter((print) => !print.is_cancelled).length || 0;

  const scannedSeriPrintCount = useMemo(() => {
    if (!seriDetails?.prints) return 0;
    return seriDetails.prints.filter((print) => {
      if (print.is_cancelled) return false;
      if (print.is_scanned) return true;
      return scannedBarcodes.some((sb) => getSerialFromBarcode(sb.barcode) === print.barcode_seri);
    }).length;
  }, [seriDetails, scannedBarcodes]);

  const seriProgressPercent = activeSeriPrintCount
    ? (scannedSeriPrintCount / activeSeriPrintCount) * 100
    : 0;

  // Sound effects
  const playSound = (type) => {
    const soundMap = {
      success: "/sounds/scanmasukberhasil.mp3",
      error: "/sounds/scanmasukgagal.mp3",
    };
    const targetSound = soundMap[type];
    if (!targetSound) return;

    const audio = new Audio(targetSound);
    audio.play().catch(() => {
      // Ignore autoplay failures.
    });
  };

  const focusScanInput = () => {
    setTimeout(() => {
      scanInputRef.current?.focus();
      scanInputRef.current?.select();
    }, 50);
  };

  useEffect(() => {
    if (activeMainTab === "scan") {
      focusScanInput();
    }
  }, [activeMainTab]);



  // Barcode handling: Enter scans instantly, with a tiny fallback for scanners without Enter.
  const handleBarcodeChange = (value) => {
    setScanInput(value);

    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }

    const trimmedValue = value.trim();

    // Prevent premature processing by checking if it's a prefix of expected formats:
    const sku = selectedSeriItem?.sku || "";
    const nomorSeri = selectedSeriNumber || "";
    const expectedPrefix = sku && nomorSeri ? `${sku} | ${nomorSeri}.` : "";
    const expectedPlainPrefix = nomorSeri ? `${nomorSeri}.` : "";

    const isPrefix = (expectedPrefix && expectedPrefix.startsWith(trimmedValue)) ||
                     (expectedPlainPrefix && expectedPlainPrefix.startsWith(trimmedValue));

    if (trimmedValue.length >= 8 && !isPrefix) {
      barcodeTimeoutRef.current = setTimeout(async () => {
        if (scanInputRef.current) {
          scanInputRef.current.value = "";
        }
        setScanInput("");
        await processScan(trimmedValue);
      }, 300);
    }
  };

  const processScan = async (barcodeValue = null) => {
    let barcodeToScan = (barcodeValue || scanInput).trim();
    let autoSavedMsg = "";

    if (!barcodeToScan) {
      setScanMessage("Barcode tidak boleh kosong.");
      setScanStatus("error");
      playSound("error");
      return;
    }

    if (!canScan) {
      setScanMessage("Pilih mode scan.");
      setScanStatus("error");
      playSound("error");
      return;
    }

    // Automatically prepend SKU if the barcode is scanned/typed as a plain serial number (without " | ")
    if (selectedSeriItem && selectedSeriItem.sku && selectedSeriNumber) {
      if (!barcodeToScan.includes(" | ") && barcodeToScan.startsWith(selectedSeriNumber)) {
        barcodeToScan = `${selectedSeriItem.sku} | ${barcodeToScan}`;
      }
    }

    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }

    const currentSerial = getSerialFromBarcode(barcodeToScan);
    const parsedKodeSeri = getKodeSeriFromSerial(currentSerial);

    const lastDot = currentSerial.lastIndexOf(".");
    const parsedSeq = lastDot !== -1 ? parseInt(currentSerial.slice(lastDot + 1), 10) : null;

    // If selectedSeriNumber is already set, validate it or handle auto-saving/auto-switching
    let activeSeriId = selectedSeriId;
    let activeSeriNumber = selectedSeriNumber;
    let activeSeriItem = selectedSeriItem;
    let activeSeriDetails = seriDetails;

    // Check if the current serial actually belongs to the active series details.
    // If the active series details doesn't have this print barcode (e.g. scanning 700.4 when active series only has 700.1-700.3),
    // we should treat it as a different series and auto-switch.
    const hasActivePrints = activeSeriDetails && Array.isArray(activeSeriDetails.prints);
    const currentSerialBelongsToActive = hasActivePrints 
      ? activeSeriDetails.prints.some((p) => p.barcode_seri === currentSerial)
      : false;

    const needsLoad = !activeSeriNumber || parsedKodeSeri !== activeSeriNumber || !currentSerialBelongsToActive;

    if (needsLoad) {
      setScanStatus("loading");
      setScanMessage("Mencari data nomor seri...");
      try {
        const response = await API.get("/gudang-produk-workspace/seri-details", {
          params: { nomor_seri: parsedKodeSeri, sequence: parsedSeq, barcode: barcodeToScan },
        });
        const data = response.data?.data;
        if (!data) {
          throw new Error(`Nomor seri "${parsedKodeSeri}" tidak terdaftar di sistem.`);
        }

        // If we are switching to a different series record, auto-save the old session
        if (activeSeriId && data.id !== activeSeriId) {
          if (scannedBarcodes.length === 0) {
            // Automatically switch series since current scan list is empty
            setScannedBarcodes([]);
            setSessionNotes("");
          } else {
            // Automatically save the current session draft first, then switch to the new series
            setScanMessage(`Menyimpan sesi ${activeSeriNumber} secara otomatis...`);
            const skuId = activeSeriItem?.sku_id || activeSeriDetails?.sku_id || findSkuMatch(state.skus, activeSeriItem?.sku)?.id;
            if (!skuId) {
              const availableSkusStr = state.skus.slice(0, 15).map(s => s.code || s.label).join(", ");
              throw new Error(`SKU "${activeSeriItem?.sku}" tidak ditemukan di database. (SKU tersedia: ${availableSkusStr || "kosong"})`);
            }

            await storePlacementSession({
              seriId: activeSeriId,
              skuId: skuId,
              barcodes: scannedBarcodes,
              notes: sessionNotes.trim() || null,
            });

            // Play success sound and reload pending sessions list
            playSound("success");
            await loadSessions();
            fetchSeriList();
            refresh({ silent: true });

            autoSavedMsg = `Sesi ${activeSeriNumber} disimpan otomatis. Memulai sesi baru untuk ${parsedKodeSeri}. `;

            // Reset scan list and clear active series state locally to prepare for loading the new series
            setScannedBarcodes([]);
            setSessionNotes("");
          }
        }

        setSelectedSeriId(data.id);
        setSelectedSeriNumber(data.nomor_seri);
        setSelectedSeriItem(data);
        setSeriDetails(data);

        activeSeriId = data.id;
        activeSeriNumber = data.nomor_seri;
        activeSeriItem = data;
        activeSeriDetails = data;

        setScanStatus("");

        // Prepend SKU to the scanned barcode now that we resolved the details
        if (activeSeriDetails && activeSeriDetails.sku && activeSeriNumber) {
          if (!barcodeToScan.includes(" | ") && barcodeToScan.startsWith(activeSeriNumber)) {
            barcodeToScan = `${activeSeriDetails.sku} | ${barcodeToScan}`;
          }
        }
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || "Gagal memproses nomor seri.";
        setScanMessage(`ERROR: ${errMsg}`);
        setScanStatus("error");
        if (scanInputRef.current) {
          scanInputRef.current.value = "";
        }
        setScanInput("");
        playSound("error");
        setTimeout(() => focusScanInput(), 100);
        return;
      }
    }

    // Now validate against prints list (not cancelled, etc.)
    if (activeSeriDetails && activeSeriDetails.prints) {
      const matchedPrint = activeSeriDetails.prints.find((p) => p.barcode_seri === currentSerial);
      if (!matchedPrint) {
        setScanMessage(`WARNING: Barcode "${barcodeToScan}" tidak terdaftar dalam cetakan aktif untuk Nomor Seri "${parsedKodeSeri}".`);
        setScanStatus("error");
        if (scanInputRef.current) {
          scanInputRef.current.value = "";
        }
        setScanInput("");
        playSound("error");
        setTimeout(() => focusScanInput(), 100);
        return;
      }

      if (matchedPrint.is_cancelled) {
        setScanMessage(`WARNING: Barcode "${barcodeToScan}" sudah dibatalkan dan tidak bisa di-scan masuk.`);
        setScanStatus("error");
        if (scanInputRef.current) {
          scanInputRef.current.value = "";
        }
        setScanInput("");
        playSound("error");
        setTimeout(() => focusScanInput(), 100);
        return;
      }

      // Check duplicate database print status
      if (matchedPrint.is_scanned) {
        setScanMessage(`Kode seri "${currentSerial}" sudah pernah di-scan masuk sebelumnya.`);
        setScanStatus("error");
        if (scanInputRef.current) {
          scanInputRef.current.value = "";
        }
        setScanInput("");
        playSound("error");
        setTimeout(() => focusScanInput(), 100);
        return;
      }
    }

    // Check if the barcode is already in any of the database draft sessions (pending sessions)
    const duplicateSession = sessions.find((sess) => {
      if (sess.status !== "pending") return false;
      const barcodes = Array.isArray(sess.barcodes) ? sess.barcodes : [];
      return barcodes.some((b) => {
        const serialCode = b.serialCode || getSerialFromBarcode(b.barcode || "");
        return serialCode === currentSerial;
      });
    });

    if (duplicateSession) {
      setScanMessage(`WARNING: Barcode "${currentSerial}" sudah ada di sesi scan pending #${duplicateSession.id}.`);
      setScanStatus("error");
      if (scanInputRef.current) {
        scanInputRef.current.value = "";
      }
      setScanInput("");
      playSound("error");
      setTimeout(() => focusScanInput(), 100);
      return;
    }

    const scanKey = getScanKey(barcodeToScan);

    if (scannedBarcodes.some((item) => item.key === scanKey)) {
      setScanMessage(`Barcode "${barcodeToScan}" sudah di-scan.`);
      setScanStatus("error");
      if (scanInputRef.current) {
        scanInputRef.current.value = "";
      }
      setScanInput("");
      playSound("error");
      setTimeout(() => focusScanInput(), 100);
      return;
    }

    // Add to active scanned list locally
    const newItem = {
      key: scanKey,
      barcode: barcodeToScan,
      skuCode: activeSeriDetails?.sku || "-",
      serialCode: currentSerial || "-",
    };

    setScannedBarcodes((prev) => [...prev, newItem]);
    setScanMessage(`${autoSavedMsg}Barcode ${currentSerial} masuk daftar penempatan.`);
    setScanStatus("success");
    playSound("success");

    if (scanInputRef.current) {
      scanInputRef.current.value = "";
    }
    setScanInput("");
    focusScanInput();
  };

  const handleScan = async (e) => {
    e.preventDefault();
    const val = scanInput.trim();
    if (scanInputRef.current) {
      scanInputRef.current.value = "";
    }
    setScanInput("");
    await processScan(val);
  };

  const handleScanKeyDown = async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }
    const val = e.currentTarget.value.trim();
    e.currentTarget.value = "";
    setScanInput("");
    await processScan(val);
  };

  const handleCancelSeriPrint = async (print) => {
    if (!print || print.is_scanned || print.is_cancelled) {
      return;
    }

    if (!window.confirm(`Batalkan kode seri "${print.barcode_seri}" karena kelebihan cetak?`)) {
      if (activeMainTab === "scan") focusScanInput();
      return;
    }

    try {
      setCancelingPrintKey(print.barcode_seri);
      const response = await API.post("/gudang-produk-workspace/cancel-print-seri", {
        seri_id: selectedSeriId,
        barcode_seri: print.barcode_seri,
        reason: "Kelebihan cetak",
      });

      setScanMessage(response.data?.message || `Kode seri "${print.barcode_seri}" berhasil dibatalkan.`);
      setScanStatus("success");
      setSeriDetails((prevDetails) => {
        if (!prevDetails?.prints) return prevDetails;
        return {
          ...prevDetails,
          prints: prevDetails.prints.map((item) =>
            item.barcode_seri === print.barcode_seri
              ? {
                  ...item,
                  is_cancelled: true,
                  cancelled_at: response.data?.data?.cancelled_at || new Date().toISOString(),
                }
              : item
          ),
        };
      });

      fetchSeriDetails(selectedSeriId, selectedSeriNumber, { silent: true });
      fetchSeriList();
    } catch (err) {
      console.error("Gagal membatalkan kode seri", err);
      setScanMessage(err.response?.data?.message || "Gagal membatalkan kode seri.");
      setScanStatus("error");
      playSound("error");
    } finally {
      setCancelingPrintKey("");
      setTimeout(() => setScanStatus(""), 3000);
      if (activeMainTab === "scan") setTimeout(() => focusScanInput(), 20);
    }
  };

  // ── Save Session ─────────────────────────────────────────────────────────────

  const handleSaveSession = async () => {
    if (!selectedSeriId || !scannedBarcodes.length) {
      await showGudangWarning(
        "Data belum lengkap",
        "Pilih nomor seri atau scan minimal satu barcode sebelum menyimpan sesi."
      );
      return;
    }

    try {
      setIsSavingSession(true);
      
      // Get SKU id matching the seri sku
      const skuId = selectedSeriItem?.sku_id || seriDetails?.sku_id || findSkuMatch(state.skus, selectedSeriItem?.sku)?.id;

      if (!skuId) {
        const availableSkusStr = state.skus.slice(0, 15).map(s => s.code || s.label).join(", ");
        throw new Error(
          `SKU "${selectedSeriItem?.sku}" tidak ditemukan di database. (SKU tersedia: ${availableSkusStr || "kosong"})`
        );
      }

      await storePlacementSession({
        seriId: selectedSeriId,
        skuId: skuId,
        barcodes: scannedBarcodes,
        notes: sessionNotes.trim() || null,
      });

      await showGudangSuccess(
        "Sesi disimpan",
        `${scannedBarcodes.length} barcode berhasil disimpan sebagai sesi scan masuk.`
      );

      // Reset scan state but retain selected series
      const savedSeriId = selectedSeriId;
      const savedSeriNumber = selectedSeriNumber;

      setScannedBarcodes([]);
      setSessionNotes("");
      setScanMessage("");
      setScanInput("");
      setActiveMainTab("putaway"); // Move to putaway tab to place it

      // Reload sessions list
      await loadSessions();
      fetchSeriList();
      refresh({ silent: true });

      if (savedSeriId && savedSeriNumber) {
        fetchSeriDetails(savedSeriId, savedSeriNumber, { silent: true });
      }
    } catch (err) {
      await showGudangError(
        "Gagal menyimpan sesi",
        buildGudangWorkspaceErrorMessage(err, "Gagal menyimpan sesi scan.")
      );
    } finally {
      setIsSavingSession(false);
    }
  };

  // ── Session Actions ──────────────────────────────────────────────────────────

  const toggleSessionSelection = (sessionId) => {
    setSelectedSessionIds((prev) => 
      prev.includes(sessionId) 
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const toggleSelectAllSessions = (filteredSessions) => {
    if (selectedSessionIds.length === filteredSessions.length && filteredSessions.length > 0) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(filteredSessions.map((s) => s.id));
    }
  };

  const handleDeleteSession = async (sessionId) => {
    setDeletingId(sessionId);
    try {
      await deletePlacementSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      // Remove from selected list if it's there
      setSelectedSessionIds((prev) => prev.filter((id) => id !== sessionId));
      await showGudangSuccess("Sesi dibatalkan", "Sesi scan masuk telah dihapus.");
    } catch (err) {
      await showGudangError(
        "Gagal menghapus sesi",
        buildGudangWorkspaceErrorMessage(err, "Gagal menghapus sesi.")
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleExecuteSession = async (event) => {
    event.preventDefault();

    if (!selectedSessionIds.length || !slotId) {
      await showGudangWarning(
        "Tujuan belum dipilih",
        "Pilih minimal satu sesi dan slot tujuan terlebih dahulu."
      );
      return;
    }

    try {
      setIsExecuting(true);
      
      const promises = selectedSessionIds.map(id => 
        executePlacementSession(id, {
          layoutId,
          slotId,
          notes: execNotes.trim() || null,
        })
      );

      await Promise.all(promises);

      // Refresh workspace state
      refresh({ silent: true });

      await showGudangSuccess(
        "Penempatan berhasil",
        `${selectedSessionIds.length} sesi berhasil dimasukkan ke ${selectedSlot?.slotCode || slotId}.`
      );

      // Clean up
      setSelectedSessionIds([]);
      setSlotId("");
      setExecNotes("");
      setActiveMainTab("scan");
      await loadSessions();
      fetchSeriList();
    } catch (err) {
      await showGudangError(
        "Gagal mengeksekusi penempatan",
        buildGudangWorkspaceErrorMessage(err, "Gagal menempatkan produk dari sesi.")
      );
    } finally {
      setIsExecuting(false);
    }
  };

  // Delete single placement activity log (revert placement)
  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus scan item "${item.barcode}" dari gudang?`)) {
      return;
    }

    try {
      setScanStatus("loading");
      await API.post("/gudang-produk-workspace/delete-scan-produk", {
        activity_id: item.activity_id,
      });

      setScanMessage(`Scan item "${item.barcode}" berhasil dihapus dari gudang.`);
      setScanStatus("success");

      // Refresh layout/stocks
      refresh({ silent: true });

      // Refresh active serial details and dropdown list
      if (selectedSeriId) {
        fetchSeriDetails(selectedSeriId, selectedSeriNumber);
      }
      fetchSeriList();
      await loadSessions();
    } catch (err) {
      console.error("Gagal menghapus scan item", err);
      const errMsg = err.response?.data?.message || "Gagal menghapus scan item dari gudang.";
      setScanMessage(errMsg);
      setScanStatus("error");
      playSound("error");
    } finally {
      setTimeout(() => setScanStatus(""), 3000);
    }
  };

  // ── Derived history rows ─────────────────────────────────────────────────────

  const placementRows = useMemo(() => {
    return state.activityLog
      .filter((item) => item.type === "placement")
      .slice(0, 30);
  }, [state.activityLog]);

  const formattedHistoryItems = useMemo(() => {
    return placementRows
      .map((log) => {
        const sku = getSkuById(state, log.skuId);
        const product = sku ? getProductById(state, sku.productId) : null;
        const slot = allSlots.find((s) => String(s.id) === String(log.toSlotId));

        // Parse nomor_seri and kode_seri from notes if available
        let kodeSeri = "-";
        let nomorSeri = "-";
        const notes = log.notes || "";
        if (notes.includes("Kode seri:")) {
          const parts = notes.split(" | ");
          const seriPart = parts.find((p) => p.trim().startsWith("Kode seri:"));
          if (seriPart) {
            const val = seriPart.replace(/Kode seri:\s*/i, "").trim();
            nomorSeri = val;
            const lastDot = val.lastIndexOf(".");
            kodeSeri = lastDot !== -1 ? val.slice(0, lastDot) : val;
          }
        }

        return {
          id: log.id,
          barcode: nomorSeri !== "-" ? `${sku?.code || "-"} | ${nomorSeri}` : (sku?.code || "-"),
          kode_seri: kodeSeri,
          nomor_seri: nomorSeri,
          sku: sku?.code || "-",
          produk: product?.name || "-",
          slot: slot?.slotCode || log.toSlotId || "-",
          gudang: slot?.layoutName || "-",
          qty: log.qty,
          scanned_at: log.createdAt,
          status: "success",
          activity_id: log.id,
          creator_name: log.creatorName || "System",
        };
      })
      .filter((item) => {
        const term = searchTerm.toLowerCase();
        return (
          (item.barcode || "").toLowerCase().includes(term) ||
          (item.sku || "").toLowerCase().includes(term) ||
          (item.produk || "").toLowerCase().includes(term) ||
          (item.kode_seri || "").toLowerCase().includes(term) ||
          (item.slot || "").toLowerCase().includes(term)
        );
      });
  }, [placementRows, state, allSlots, searchTerm]);

  // Summary counts
  const summary = {
    pendingSessions: sessions.length,
    scannedQty: scannedBarcodes.length,
    totalPrints: activeSeriPrintCount,
    successCount: formattedHistoryItems.length,
  };

  const resolveSkuLabel = (skuId) =>
    state.skus.find((sku) => String(sku.id) === String(skuId))?.label || String(skuId);

  const resolveSeriLabel = (seriId) =>
    seriList.find((s) => String(s.id) === String(seriId))?.nomor_seri || String(seriId);

  // Filter pending sessions by multi-keyword search
  const filteredSessions = useMemo(() => {
    const raw = pendingSearchTerm.trim().toLowerCase();
    if (!raw) return sessions;

    const keywords = raw.split(/\s+/).filter(Boolean);

    return sessions.filter((session) => {
      // Build a searchable string from all session fields
      const skuLabel = resolveSkuLabel(session.skuId);
      const seriLabel = resolveSeriLabel(session.seriId);
      const barcodes = Array.isArray(session.barcodes)
        ? session.barcodes.map((b) => b.serialCode || b.barcode || "").join(" ")
        : "";
      const haystack = [
        skuLabel,
        seriLabel,
        session.skuCode || "",
        session.seriNumber || "",
        session.notes || "",
        session.creatorName || "",
        barcodes,
        String(session.id),
      ]
        .join(" ")
        .toLowerCase();

      // All keywords must match (AND logic)
      return keywords.every((kw) => haystack.includes(kw));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, pendingSearchTerm, state.skus, seriList]);

  // ── Wizard Config ───────────────────────────────────────────────────────────

  const wizardScenes = [
    {
      id: 1,
      title: "Scan & Simpan Sesi",
      helper: selectedSeriNumber
        ? `${scannedBarcodes.length} pcs dari ${selectedSeriNumber}`
        : "Silakan langsung scan barcode",
      complete: scannedBarcodes.length > 0,
    },
    {
      id: 2,
      title: "Tentukan Tujuan Sesi",
      helper: selectedSessionIds.length > 0
        ? `${selectedSessionIds.length} Sesi Terpilih · ${selectedSlot ? selectedSlot.slotCode : "pilih slot"}`
        : "Pilih sesi dari daftar",
      complete: Boolean(selectedSessionIds.length > 0 && slotId),
    },
  ];

  const scannedList = (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
      {scannedBarcodes.length ? (
        scannedBarcodes.map((item, index) => (
          <div key={item.key} style={{ display: "grid", gridTemplateColumns: "28px 1fr 32px", alignItems: "center", gap: 8, padding: "9px 10px", borderTop: index ? "1px solid #e2e8f0" : 0 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>{index + 1}</span>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 12, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.serialCode}
              </strong>
              <span style={{ display: "block", fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.skuCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setScannedBarcodes((prev) => prev.filter((i) => i.key !== item.key));
              }}
              style={{ width: 28, height: 28, border: "1px solid #fee2e2", borderRadius: 8, background: "#fff5f5", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <FaTrash size={12} />
            </button>
          </div>
        ))
      ) : (
        <div style={{ padding: 12, fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
          Belum ada barcode discan.
        </div>
      )}
    </div>
  );

  return (
    <GudangProdukBaseShell
      title="Scan Produk Masuk Gudang"
      subtitle="Scan barcode kode seri produk untuk dimasukkan ke gudang secara per sesi real-time."
      icon={FaBoxOpen}
      statusLabel={
        workspaceLoading
          ? "Memuat workspace..."
          : isExecuting
          ? "Mengeksekusi penempatan..."
          : `${summary.pendingSessions} sesi pending`
      }
    >
      {workspaceError ? (
        <div className="gudang-ui-empty-panel" style={{ marginBottom: 20 }}>
          {workspaceError}
        </div>
      ) : null}


      {/* Main Tabs Navigation */}
      <div className="gudang-ui-tabs" style={{ marginBottom: 20, display: "flex", gap: 8, borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
        <button
          type="button"
          onClick={() => { setActiveMainTab("scan"); setSelectedSessionIds([]); setSlotId(""); }}
          style={{
            padding: "8px 16px",
            background: activeMainTab === "scan" ? "#7c3aed" : "transparent",
            color: activeMainTab === "scan" ? "#fff" : "#64748b",
            border: activeMainTab === "scan" ? "none" : "1px solid transparent",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
            transition: "all 0.2s ease",
          }}
        >
          Scan Barcode Masuk
        </button>
        <button
          type="button"
          onClick={() => setActiveMainTab("putaway")}
          style={{
            padding: "8px 16px",
            background: activeMainTab === "putaway" ? "#7c3aed" : "transparent",
            color: activeMainTab === "putaway" ? "#fff" : "#64748b",
            border: activeMainTab === "putaway" ? "none" : "1px solid transparent",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
            transition: "all 0.2s ease",
          }}
        >
          Penempatan Sesi
        </button>
        <button
          type="button"
          onClick={() => { setActiveMainTab("history"); setSelectedSessionIds([]); setSlotId(""); }}
          style={{
            padding: "8px 16px",
            background: activeMainTab === "history" ? "#7c3aed" : "transparent",
            color: activeMainTab === "history" ? "#fff" : "#64748b",
            border: activeMainTab === "history" ? "none" : "1px solid transparent",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
            transition: "all 0.2s ease",
          }}
        >
          Riwayat Penempatan
        </button>
      </div>

      <div className="gudang-master-workspace-grid" style={{ gridTemplateColumns: activeMainTab !== "scan" ? "1fr" : undefined }}>
        <div className="gudang-master-main" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Scene 1: Scan & Simpan Sesi ── */}
          {activeMainTab === "scan" && (
            <section className="gudang-ui-panel">
              <div className="gudang-ui-panel-head" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2>Scan Barcode Produk Masuk</h2>
                  <p>
                    Silakan langsung scan barcode. System otomatis mendeteksi Nomor Seri aktif pada scan pertama.
                  </p>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {scannedBarcodes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setScannedBarcodes([]);
                        setSelectedSeriId("");
                        setSelectedSeriNumber("");
                        setSelectedSeriItem(null);
                        setSeriDetails(null);
                        setScanMessage("");
                      }}
                      style={{ border: "1px solid #dbe4ef", borderRadius: 8, background: "#fff", color: "#64748b", fontWeight: 700, padding: "9px 16px", cursor: "pointer", height: "40px", display: "inline-flex", alignItems: "center" }}
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    className="gudang-ui-button"
                    style={{ background: "#7c3aed", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8, height: "40px" }}
                    disabled={isSavingSession || !scannedBarcodes.length}
                    onClick={handleSaveSession}
                  >
                    {isSavingSession ? <FaSpinner className="gudang-ui-spin" /> : <FaSave />}
                    {isSavingSession ? "Menyimpan..." : `Simpan Sesi (${scannedBarcodes.length})`}
                  </button>
                </div>
              </div>

              {/* Barcode scan input - Moved to top & Made Huge */}
              <div style={{ marginBottom: 24, padding: "20px", background: scannedBarcodes.length > 0 ? "#faf5ff" : "#f8fafc", borderRadius: "16px", border: `2px dashed ${scannedBarcodes.length > 0 ? "#c084fc" : "#cbd5e1"}`, transition: "all 0.3s ease" }}>
                <div className="gudang-ui-field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 13, color: "#6d28d9", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <FaBarcode size={16} /> Arahkan Kursor & Scan Barcode
                  </label>
                  <div style={{ display: "flex", gap: 12 }}>
                    <input
                      ref={scanInputRef}
                      value={scanInput}
                      onChange={(e) => handleBarcodeChange(e.target.value)}
                      onKeyDown={handleScanKeyDown}
                      placeholder={
                        selectedSeriNumber
                          ? `Scan barcode untuk seri ${selectedSeriNumber}...`
                          : "Scan barcode kode seri di sini..."
                      }
                      autoComplete="off"
                      autoFocus
                      style={{ flex: 1, fontSize: 24, fontWeight: 800, padding: "16px 20px", border: "2px solid #a855f7", borderRadius: 12, outline: "none", color: "#3b0764", background: "#fff", boxShadow: "0 4px 14px -4px rgba(168, 85, 247, 0.4)" }}
                    />
                    <button
                      type="button"
                      className="gudang-ui-button"
                      disabled={!scanInput.trim()}
                      onClick={() => processScan()}
                      style={{ minWidth: 64, justifyContent: "center", padding: "0 20px", background: "#7c3aed", color: "#fff", borderRadius: 12, border: "none" }}
                    >
                      <FaArrowRight size={20} />
                    </button>
                  </div>
                </div>
                {scanMessage && (
                  <div className={`spm-gudang-alert ${scanStatus === "error" ? "error" : "success"}`} style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                    {scanMessage}
                  </div>
                )}
              </div>

              {/* Optional Search / Manual Dropdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div className="gudang-ui-field" style={{ position: "relative", marginBottom: 0 }} ref={seriComboboxRef}>
                  <label>Pilih Nomor Seri (Otomatis terisi saat scan)</label>
                  <div style={{ position: "relative" }}>
                    <FiSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                    <input
                      type="text"
                      disabled={scannedBarcodes.length > 0}
                      className="spm-gudang-select"
                      style={{ paddingLeft: 38, paddingRight: 38, background: scannedBarcodes.length > 0 ? "#f1f5f9" : "#fff", border: "1px solid #cbd5e1", borderRadius: 10, width: "100%", padding: "12px 14px 12px 38px", cursor: scannedBarcodes.length > 0 ? "not-allowed" : "pointer", fontSize: 13 }}
                      value={seriQuery}
                      onChange={(e) => {
                        setSeriQuery(e.target.value);
                        setIsSeriDropdownOpen(true);
                        if (selectedSeriNumber) {
                          setSelectedSeriNumber("");
                          setSelectedSeriId("");
                          setSelectedSeriItem(null);
                          setSeriDetails(null);
                        }
                      }}
                      onFocus={() => {
                        if (scannedBarcodes.length === 0) {
                          setIsSeriDropdownOpen(true);
                        }
                      }}
                      placeholder={selectedSeriLabel || "Cari manual..."}
                    />
                    {selectedSeriId && !seriQuery && scannedBarcodes.length === 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSeriId("");
                          setSelectedSeriNumber("");
                          setSelectedSeriItem(null);
                          setSeriDetails(null);
                          setSeriQuery("");
                        }}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
                      >
                        <FaTimes />
                      </button>
                    ) : null}
                  </div>

                  {isSeriDropdownOpen && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      borderRadius: 10,
                      padding: 8,
                      maxHeight: 280,
                      overflowY: "auto",
                      boxShadow: "0 10px 25px rgba(15,23,42,0.15)"
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSeriId("");
                          setSelectedSeriNumber("");
                          setSelectedSeriItem(null);
                          setSeriDetails(null);
                          setSeriQuery("");
                          setIsSeriDropdownOpen(false);
                        }}
                        style={{
                          width: "100%",
                          display: "block",
                          textAlign: "left",
                          border: "none",
                          background: selectedSeriId === "" ? "#f0fdf4" : "transparent",
                          color: selectedSeriId === "" ? "#166534" : "#0f172a",
                          borderRadius: 6,
                          padding: "8px 12px",
                          cursor: "pointer",
                          marginBottom: 2,
                          fontWeight: selectedSeriId === "" ? 700 : 500,
                          fontSize: 13
                        }}
                      >
                        -- Pilih Nomor Seri --
                      </button>
                      {filteredSeriList.length ? (
                        filteredSeriList.map((seriItem) => {
                          const isSelected = selectedSeriId === seriItem.id;
                          const scanned = seriItem.scanned_count ?? 0;
                          const jumlah = seriItem.jumlah ?? 0;
                          const isFullyScanned = jumlah > 0 && scanned >= jumlah;
                          const isOld = isOlderThan15Days(seriItem.created_at);

                          if (isFullyScanned || isOld) return null;

                          return (
                            <button
                              key={seriItem.id}
                              type="button"
                              onClick={() => {
                                handleSeriChange(seriItem);
                                setSeriQuery("");
                                setIsSeriDropdownOpen(false);
                              }}
                              style={{
                                width: "100%",
                                display: "block",
                                textAlign: "left",
                                border: "none",
                                background: isSelected ? "linear-gradient(135deg,#edf4ff,#f0f9ff)" : "transparent",
                                borderRadius: 6,
                                padding: "8px 12px",
                                cursor: "pointer",
                                marginBottom: 2
                              }}
                            >
                              <div style={{ fontWeight: isSelected ? 700 : 500, fontSize: 13, color: "#0f172a" }}>
                                {seriItem.nomor_seri}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                SKU: {seriItem.sku} &bull; Progress: {scanned} / {jumlah} pcs
                              </div>
                              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
                                Dibuat: {formatTanggalPendek(seriItem.created_at)}
                              </div>
                            </button>
                          );
                        })
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Notes for session */}
                <div className="gudang-ui-field" style={{ marginBottom: 0 }}>
                  <label>Catatan Sesi (opsional)</label>
                  <input
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Catatan tambahan..."
                    style={{ fontSize: 13, padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 10, width: "100%" }}
                  />
                </div>
              </div>



              {/* Scanned items local list */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifySpaceBetween: "space-between", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>
                    Daftar Scan Sesi Ini
                  </label>
                  <strong style={{ fontSize: 13, color: "#7c3aed" }}>
                    {scannedBarcodes.length} pcs
                  </strong>
                </div>
                {scannedList}
              </div>




            </section>
          )}

          {/* ── Tab Penempatan Sesi (3 Kolom) ── */}
          {activeMainTab === "putaway" && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: 20, height: "calc(100vh - 200px)" }}>
              
              {/* Kolom 1: Daftar Sesi Pending */}
              <section className="gudang-ui-panel" style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div className="gudang-ui-panel-head" style={{ marginBottom: 16 }}>
                  <div>
                    <h2>Sesi Scan Pending</h2>
                    <p>
                      {sessions.length
                        ? `${sessions.length} sesi menunggu penempatan.`
                        : "Belum ada sesi scan masuk pending."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadSessions}
                    disabled={isLoadingSessions}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      background: "#f8fafc",
                      color: "#475569",
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "6px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {isLoadingSessions ? <FaSpinner className="gudang-ui-spin" /> : null}
                    Refresh
                  </button>
                </div>

                {/* Search bar for pending sessions */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <FiSearch style={{ position: "absolute", left: 12, color: "#94a3b8", pointerEvents: "none" }} size={15} />
                    <input
                      type="text"
                      value={pendingSearchTerm}
                      onChange={(e) => setPendingSearchTerm(e.target.value)}
                      placeholder="Cari sesi... (multi-search)"
                      style={{
                        width: "100%",
                        padding: "9px 14px 9px 36px",
                        border: "1px solid #ddd6fe",
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "inherit",
                        background: "#faf5ff",
                        color: "#1e293b",
                        outline: "none",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "#7c3aed"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#ddd6fe"; e.target.style.boxShadow = "none"; }}
                    />
                    {pendingSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setPendingSearchTerm("")}
                        style={{ position: "absolute", right: 10, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}
                      >
                        <FaTimes size={12} />
                      </button>
                    )}
                  </div>
                  {pendingSearchTerm.trim() && (
                    <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 6, fontWeight: 600 }}>
                      Menampilkan {filteredSessions.length} dari {sessions.length} sesi
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 4 }}>
                  {sessions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "28px 20px", color: "#94a3b8", fontSize: 13, background: "#f8fafc", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
                      Silakan lakukan scan masuk di Scene 1, lalu simpan untuk memproses penempatan.
                    </div>
                  ) : filteredSessions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "28px 20px", color: "#94a3b8", fontSize: 13, background: "#f8fafc", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
                      Tidak ada sesi yang cocok dengan pencarian "{pendingSearchTerm}".
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#475569" }}>
                          <input
                            type="checkbox"
                            checked={selectedSessionIds.length === filteredSessions.length && filteredSessions.length > 0}
                            onChange={() => toggleSelectAllSessions(filteredSessions)}
                            style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#7c3aed" }}
                          />
                          Pilih Semua ({filteredSessions.length})
                        </label>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{selectedSessionIds.length} terpilih</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {filteredSessions.map((session) => (
                          <SessionCard
                            key={session.id}
                            session={session}
                            resolveSkuLabel={resolveSkuLabel}
                            resolveSeriLabel={resolveSeriLabel}
                            isSelected={selectedSessionIds.includes(session.id)}
                            onToggleSelection={toggleSessionSelection}
                            onDeleteSession={handleDeleteSession}
                            isDeleting={deletingId === session.id}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Kolom 2: Lokasi Penempatan & Map */}
              <section className="gudang-ui-panel" style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, opacity: selectedSessionIds.length ? 1 : 0.6, pointerEvents: selectedSessionIds.length ? "auto" : "none" }}>
                <div className="gudang-ui-panel-head" style={{ marginBottom: 16 }}>
                  <h2>Pilih Lokasi Tujuan</h2>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div className="gudang-ui-field" style={{ marginBottom: 0 }}>
                    <label>Gudang / Layout</label>
                    <select
                      className="gudang-ui-field"
                      style={{ width: "100%", margin: 0, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, backgroundColor: "#f8fafc" }}
                      value={layoutId}
                      onChange={(e) => {
                        setLayoutId(e.target.value);
                        setFilterFloor("");
                        setFilterBlock("");
                        setSlotId("");
                      }}
                    >
                      <option value="">-- Pilih Gudang --</option>
                      {state.layouts.map((layout) => (
                        <option key={layout.id} value={layout.id}>{layout.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="gudang-ui-field" style={{ marginBottom: 0 }}>
                    <label>Lantai</label>
                    <select
                      className="gudang-ui-field"
                      style={{ width: "100%", margin: 0, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, backgroundColor: "#f8fafc" }}
                      value={filterFloor}
                      onChange={(e) => {
                        setFilterFloor(e.target.value);
                        setFilterBlock("");
                        setSlotId("");
                      }}
                      disabled={!layoutId}
                    >
                      <option value="">Semua Lantai</option>
                      {layoutFloors.map((floor) => (
                        <option key={floor.id} value={floor.id}>{floor.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="gudang-ui-field" style={{ marginBottom: 0 }}>
                    <label>Blok</label>
                    <select
                      className="gudang-ui-field"
                      style={{ width: "100%", margin: 0, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, backgroundColor: "#f8fafc" }}
                      value={filterBlock}
                      onChange={(e) => {
                        setFilterBlock(e.target.value);
                        setSlotId("");
                      }}
                      disabled={!layoutId}
                    >
                      <option value="">Semua Blok</option>
                      {layoutBlocks.map((block) => (
                        <option key={block.id} value={block.id}>{block.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="gudang-ui-field" style={{ marginBottom: 16 }}>
                  <label>Slot / Rak Tujuan</label>
                  <select
                    className="spm-gudang-select"
                    value={slotId}
                    onChange={(e) => setSlotId(e.target.value)}
                    disabled={!layoutId}
                  >
                    <option value="">{layoutId ? "-- Pilih Slot --" : "Pilih gudang terlebih dahulu"}</option>
                    {filteredSlots.map((slot) => {
                      const slotSummary = stockSummaryBySlot[slot.id];
                      const label = `${slot.slotCode}${slotSummary ? ` (${slotSummary.qty} pcs, ${slotSummary.skuCount} SKU)` : " (Kosong)"}`;
                      return <option key={slot.id} value={slot.id}>{label}</option>;
                    })}
                  </select>
                  {selectedSlot && (
                    <div className="spm-gudang-slot-status" style={{ marginTop: 8 }}>
                      <FaMapMarkerAlt />
                      <span>
                        Lokasi: <strong>{buildSlotHeadline(selectedSlot)}</strong>
                        <br/>
                        {selectedSlotSummary ? `${selectedSlotSummary.qty} pcs tersimpan dengan ${selectedSlotSummary.skuCount} SKU` : "Slot kosong, siap digunakan"}
                      </span>
                    </div>
                  )}
                </div>

                {selectedLayout && (
                  <div style={{ flex: 1, minHeight: 0, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "auto", background: "#f8fafc" }}>
                    <GudangLayoutMap
                      layout={filteredLayout}
                      selectedSlotId={slotId}
                      onSelectSlot={(slot) => { if (slot && slot.id) setSlotId(slot.id); }}
                      stockSummaryBySlot={stockSummaryBySlot}
                      interactive={true}
                    />
                  </div>
                )}
              </section>

              {/* Kolom 3: Eksekusi */}
              <section className="gudang-ui-panel" style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, opacity: selectedSessionIds.length ? 1 : 0.6, pointerEvents: selectedSessionIds.length ? "auto" : "none" }}>
                <div className="gudang-ui-panel-head" style={{ marginBottom: 16 }}>
                  <h2>Eksekusi Penempatan</h2>
                </div>

                <div style={{ marginBottom: 20, padding: 16, background: "#f5f3ff", borderRadius: 12, border: "1px solid #ddd6fe" }}>
                  <h4 style={{ fontSize: 12, color: "#6d28d9", textTransform: "uppercase", marginBottom: 8 }}>Ringkasan Penempatan</h4>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#475569" }}>Sesi Terpilih:</span>
                    <strong style={{ fontSize: 13, color: "#1e293b" }}>{selectedSessionIds.length} Sesi</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, paddingBottom: 12, borderBottom: "1px dashed #c4b5fd" }}>
                    <span style={{ fontSize: 13, color: "#475569" }}>Total Item:</span>
                    <strong style={{ fontSize: 13, color: "#7c3aed" }}>
                      {sessions.filter(s => selectedSessionIds.includes(s.id)).reduce((sum, s) => sum + (s.barcodes?.length || 0), 0)} pcs
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#475569" }}>Tujuan:</span>
                    <strong style={{ fontSize: 13, color: slotId ? "#059669" : "#dc2626" }}>
                      {slotId ? selectedSlot?.slotCode : "Belum Dipilih"}
                    </strong>
                  </div>
                </div>

                <div className="gudang-ui-field" style={{ marginBottom: 20, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <label>Catatan Tambahan (opsional)</label>
                  <textarea
                    value={execNotes}
                    onChange={(e) => setExecNotes(e.target.value)}
                    placeholder="Catatan penempatan ke slot..."
                    style={{ fontSize: 13, height: "100%", minHeight: 120, width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: 8, resize: "none" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    type="button"
                    className="gudang-ui-button"
                    style={{ background: "#7c3aed", color: "#fff", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "12px", fontSize: 14 }}
                    disabled={isExecuting || !slotId || !selectedSessionIds.length}
                    onClick={handleExecuteSession}
                  >
                    {isExecuting ? <FaSpinner className="gudang-ui-spin" /> : <FaExchangeAlt />}
                    {isExecuting ? "Mengeksekusi..." : "Eksekusi Penempatan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSessionIds([]);
                      setSlotId("");
                    }}
                    style={{ border: "1px solid #dbe4ef", borderRadius: 8, background: "#fff", color: "#64748b", fontWeight: 700, padding: "10px", cursor: "pointer", textAlign: "center", fontSize: 13 }}
                  >
                    Batalkan Pilihan
                  </button>
                </div>
              </section>

            </div>
          )}

          {/* ── Riwayat Hasil Scan ── */}
          {activeMainTab === "history" && (
            <section className="spm-gudang-card">
            <div className="spm-gudang-toolbar">
              <div className="spm-gudang-card-title">
                <FaBoxOpen />
                <h3>Riwayat Penempatan Gudang</h3>
              </div>
              <div className="spm-gudang-toolbar-right">
                <div className="spm-gudang-input-wrap" style={{ width: 220 }}>
                  <FiSearch className="spm-gudang-input-icon" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari riwayat..."
                    className="spm-gudang-input"
                    style={{ paddingLeft: 34, fontSize: 13 }}
                  />
                </div>
              </div>
            </div>

            {formattedHistoryItems.length === 0 ? (
              <div className="spm-gudang-empty">
                <FaBarcode />
                <h4>Belum ada riwayat masuk</h4>
                <p>Riwayat penempatan stok akan tampil setelah sesi scan dieksekusi.</p>
              </div>
            ) : (
              <>
                <div className="spm-gudang-table-wrap">
                  <table className="spm-gudang-table">
                    <thead>
                      <tr>
                        <th className="spm-gudang-table-no">No</th>
                        <th>Barcode</th>
                        <th>Kode Seri</th>
                        <th>SKU</th>
                        <th>Produk</th>
                        <th>Gudang</th>
                        <th>Slot</th>
                        <th>Qty</th>
                        <th>Petugas</th>
                        <th>Waktu Penempatan</th>
                        <th>Status</th>
                        <th style={{ textAlign: "center" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formattedHistoryItems.map((item, index) => (
                        <tr key={item.id}>
                          <td className="spm-gudang-table-no">{index + 1}</td>
                          <td className="spm-gudang-table-barcode">{item.barcode}</td>
                          <td>{item.kode_seri}</td>
                          <td className="spm-gudang-table-sku">{item.sku}</td>
                          <td>{item.produk}</td>
                          <td>{item.gudang}</td>
                          <td>{item.slot}</td>
                          <td>{item.qty} pcs</td>
                          <td>{item.creator_name}</td>
                          <td>{formatTanggal(item.scanned_at)}</td>
                          <td>
                            <span className="spm-gudang-pill spm-gudang-pill-success">
                              Berhasil
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="spm-gudang-btn spm-gudang-btn-danger"
                              style={{ padding: "6px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                              onClick={() => handleDeleteItem(item)}
                            >
                              <FaTrash size={10} /> Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="spm-gudang-table-footer">
                  <p>
                    Menampilkan {formattedHistoryItems.length} data penempatan
                  </p>
                </div>
              </>
            )}
            </section>
          )}
        </div>

        {/* ── Sidebar: Monitoring Cetakan Nomor Seri & Tiket ── */}
        {activeMainTab === "scan" && (
          <div className="spm-gudang-right-col" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Tiket Penempatan */}
          <aside className="gudang-ui-panel">
            <div className="gudang-ui-panel-head" style={{ marginBottom: 16 }}>
              <div>
                <h2 style={{ color: "#7c3aed" }}>Tiket Scan Masuk</h2>
                <p>Ringkasan alur masuk produk.</p>
              </div>
            </div>

            {/* Nomor Seri Asal */}
            <div style={{ marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, backgroundColor: "#f8fafc" }}>
              <strong style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 8, textTransform: "uppercase" }}>
                Nomor Seri Aktif
              </strong>
              {selectedSeriId ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
                    {selectedSeriNumber}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    SKU: {selectedSeriItem?.sku} &bull; Total: {selectedSeriItem?.jumlah} pcs
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                  Mulai scan barcode atau pilih secara manual.
                </div>
              )}
            </div>

            {/* Progress scan */}
            <div style={{ marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, backgroundColor: scannedBarcodes.length ? "#f5f3ff" : "#f8fafc" }}>
              <strong style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 8, textTransform: "uppercase" }}>
                Barcode Scan Sesi
              </strong>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>Qty scan</span>
                <strong style={{ fontSize: 18, color: "#7c3aed" }}>{scannedBarcodes.length} pcs</strong>
              </div>
            </div>

            {/* Target Slot */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, backgroundColor: selectedSessionIds.length > 0 && slotId ? "#ecfdf5" : selectedSessionIds.length > 0 ? "#fffbeb" : "#f8fafc" }}>
              <strong style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 8, textTransform: "uppercase" }}>
                Lokasi Penempatan
              </strong>
              {selectedSessionIds.length > 0 ? (
                <>
                  <div style={{ fontSize: 11, color: "#92400e", marginBottom: 4 }}>
                    {selectedSessionIds.length} Sesi terpilih
                  </div>
                  {slotId ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", marginBottom: 2 }}>
                        {selectedSlot?.slotCode}
                      </div>
                      <div style={{ fontSize: 11, color: "#0f5f59" }}>
                        Isi: {stockSummaryBySlot[slotId]?.qty || 0} pcs
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#92400e", fontStyle: "italic" }}>
                      Pilih slot tujuan di Scene 2.
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                  Pilih sesi pending terlebih dahulu.
                </div>
              )}
            </div>
          </aside>

          {/* Status Cetak Kode Seri */}
          <section className="spm-gudang-card" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="spm-gudang-card-header">
              <div className="spm-gudang-card-title">
                <FaBarcode style={{ color: "#7c3aed" }} />
                <h3>Status Cetak Kode Seri</h3>
              </div>
            </div>

            {!selectedSeriNumber ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 10px", color: "#64748b", textAlign: "center" }}>
                <FaBarcode size={40} style={{ marginBottom: "12px", opacity: 0.3 }} />
                <h4 style={{ fontSize: "14px", margin: 0 }}>Mulai Scan Barcode</h4>
                <p style={{ fontSize: "12px", marginTop: "6px", maxWidth: "240px" }}>
                  Scan barcode kode seri pertama, dan sistem akan langsung menampilkan progress serta daftar kode seri cetak di sini.
                </p>
              </div>
            ) : loadingSeriDetails ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                <p>Memuat status cetak...</p>
              </div>
            ) : seriDetails ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                {/* Progress Header */}
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                    <span style={{ fontWeight: 600, color: "#334155" }}>
                      Seri: <span style={{ color: "#7c3aed" }}>{seriDetails.nomor_seri}</span>
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                    <span>Progress Scan Masuk</span>
                    <span style={{ fontWeight: 600 }}>
                      {scannedSeriPrintCount} / {activeSeriPrintCount} pcs
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: "100%", height: "8px", background: "#cbd5e1", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{
                      width: `${seriProgressPercent}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #10b981, #059669)",
                      transition: "width 0.4s ease"
                    }} />
                  </div>
                </div>

                {/* Grid list of print codes */}
                <div style={{
                  flex: 1,
                  overflowY: "auto",
                  maxHeight: "480px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: "10px",
                  paddingRight: "4px"
                }}>
                  {orderedSeriPrints.map((print) => {
                    const isCancelled = Boolean(print.is_cancelled);
                    const isScannedInDb = Boolean(print.is_scanned);
                    const isScannedInCurrentSession = scannedBarcodes.some((sb) => getSerialFromBarcode(sb.barcode) === print.barcode_seri);
                    const isScanned = isScannedInDb || isScannedInCurrentSession;
                    const isCanceling = cancelingPrintKey === print.barcode_seri;

                    const borderColor = isCancelled ? "#fecaca" : isScanned ? "#a7f3d0" : "#e2e8f0";
                    const backgroundColor = isCancelled ? "#fff1f2" : isScanned ? "#f0fdf4" : "#ffffff";
                    const textColor = isCancelled ? "#be123c" : isScanned ? "#15803d" : "#475569";
                    const dotColor = isCancelled ? "#ef4444" : isScanned ? "#10b981" : "#94a3b8";

                    return (
                      <div
                        key={print.barcode_seri}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: `1px solid ${borderColor}`,
                          background: backgroundColor,
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                          fontSize: "12px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 700, color: textColor }}>
                            #{print.print_seq}
                          </span>
                          <span style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: dotColor
                          }} />
                        </div>

                        <span style={{ fontFamily: "monospace", fontSize: "11px", color: isCancelled ? "#9f1239" : isScanned ? "#166534" : "#64748b" }}>
                          {print.barcode_seri}
                        </span>

                        {isScanned ? (
                          <div style={{
                            marginTop: "4px",
                            fontSize: "10px",
                            color: "#15803d",
                            fontWeight: 600,
                            background: "#d1fae5",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            width: "fit-content"
                          }}>
                            {isScannedInCurrentSession ? "Sesi scan" : (print.slot_code || "Ter-scan")}
                          </div>
                        ) : isCancelled ? (
                          <div style={{
                            marginTop: "4px",
                            fontSize: "10px",
                            color: "#be123c",
                            fontWeight: 700,
                            background: "#ffe4e6",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            width: "fit-content"
                          }}>
                            Batal
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginTop: "4px" }}>
                            <div style={{
                              fontSize: "10px",
                              color: "#64748b",
                              background: "#f1f5f9",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              width: "fit-content"
                            }}>
                              Belum
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCancelSeriPrint(print)}
                              disabled={isCanceling}
                              title="Batalkan kode seri kelebihan cetak"
                              style={{
                                border: "1px solid #fecaca",
                                background: isCanceling ? "#f1f5f9" : "#fff1f2",
                                color: isCanceling ? "#94a3b8" : "#dc2626",
                                borderRadius: "5px",
                                padding: "2px 6px",
                                fontSize: "10px",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                cursor: isCanceling ? "wait" : "pointer"
                              }}
                            >
                              <FaTimes size={9} />
                              {isCanceling ? "..." : "Batal"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {orderedSeriPrints.every((p) => Boolean(p.is_scanned)) && orderedSeriPrints.length > 0 && (
                    <div style={{
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      padding: "32px 16px",
                      color: "#15803d",
                      background: "#f0fdf4",
                      borderRadius: "10px",
                      border: "1px solid #a7f3d0"
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Semua kode seri sudah di-scan!</div>
                      <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}>Nomor seri ini telah selesai diproses.</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#ef4444" }}>
                <p>Gagal memuat detail nomor seri.</p>
              </div>
            )}
          </section>
        </div>
        )}
      </div>
    </GudangProdukBaseShell>
  );
};

export default ScanProdukMasukGudang;

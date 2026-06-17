import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ScanProdukMasukGudang.css";
import "./GudangProdukWorkspace.css";
import API from "../../api";
import { FaBarcode, FaBoxOpen, FaMapMarkerAlt, FaTrash, FaWarehouse, FaTimes } from "react-icons/fa";
import { FiAlertTriangle, FiBox, FiSearch } from "react-icons/fi";
import useGudangProdukWorkspace from "./useGudangProdukWorkspace";
import { getAllSlots, getSlotStockSummaryMap } from "./GudangProdukMockStore";
import { buildSlotHeadline, GudangLayoutMap } from "./GudangProdukSharedV2";

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

const ScanProdukMasukGudang = () => {
  const scanInputRef = useRef(null);
  const barcodeTimeoutRef = useRef(null);
  const activeScanKeysRef = useRef(new Set());

  // Workspace state (layouts, slots, etc.)
  const { state, setState, isLoading: workspaceLoading, error: workspaceError, refresh } = useGudangProdukWorkspace();

  // Gudang & slot selection
  const [layoutId, setLayoutId] = useState("");
  const [slotId, setSlotId] = useState("");

  // Seri list & selection
  const [seriList, setSeriList] = useState([]);
  const [selectedSeriNumber, setSelectedSeriNumber] = useState("");
  const [selectedSeriId, setSelectedSeriId] = useState("");
  const [selectedSeriItem, setSelectedSeriItem] = useState(null);
  const [seriDetails, setSeriDetails] = useState(null);
  const [loadingSeriDetails, setLoadingSeriDetails] = useState(false);
  const [seriQuery, setSeriQuery] = useState("");
  const [isSeriDropdownOpen, setIsSeriDropdownOpen] = useState(false);
  const seriComboboxRef = useRef(null);

  // Scan state
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanStatus, setScanStatus] = useState(""); // "", "loading", "success", "error"
  const [cancelingPrintKey, setCancelingPrintKey] = useState("");

  // Scanned items (session list)
  const [scannedItems, setScannedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

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
      setSeriDetails(response.data?.data || null);
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

  // Auto-select first layout
  useEffect(() => {
    if (!layoutId && state.layouts.length) {
      setLayoutId(String(state.layouts[0].id));
    }
  }, [layoutId, state.layouts]);

  // Reset slot when layout changes
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

  // Derived data
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

  const selectedSlot = useMemo(
    () => (slotId ? allSlots.find((slot) => String(slot.id) === String(slotId)) : null),
    [allSlots, slotId]
  );

  const selectedSlotSummary = selectedSlot ? stockSummaryBySlot[selectedSlot.id] : null;

  const canScan = Boolean(selectedLayout && selectedSlot && selectedSeriId);
  const orderedSeriPrints = useMemo(() => {
    if (!seriDetails?.prints) return [];
    return [...seriDetails.prints].sort(
      (a, b) => (Number(b.print_seq) || 0) - (Number(a.print_seq) || 0)
    );
  }, [seriDetails]);
  const activeSeriPrintCount = seriDetails?.prints?.filter((print) => !print.is_cancelled).length || 0;
  const scannedSeriPrintCount =
    seriDetails?.prints?.filter((print) => print.is_scanned && !print.is_cancelled).length || 0;
  const seriProgressPercent = activeSeriPrintCount
    ? (scannedSeriPrintCount / activeSeriPrintCount) * 100
    : 0;

  // Filter scanned items
  const filteredItems = scannedItems.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      (item.barcode || "").toLowerCase().includes(term) ||
      (item.sku || "").toLowerCase().includes(term) ||
      (item.produk || "").toLowerCase().includes(term) ||
      (item.kode_seri || "").toLowerCase().includes(term)
    );
  });

  // KPI
  const totalScanHariIni = scannedItems.filter((item) => item.status === "success").length;
  const totalGagal = scannedItems.filter((item) => item.status === "error").length;

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
    if (canScan) {
      focusScanInput();
    }
  }, [canScan]);

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

  // Barcode handling: Enter scans instantly, with a tiny fallback for scanners without Enter.
  const handleBarcodeChange = (value) => {
    setScanInput(value);

    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }

    const trimmedValue = value.trim();

    // Prevent premature processing by checking if it's a prefix of expected formats:
    // 1. "SKU | nomor_seri."
    // 2. "nomor_seri."
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
      }, 300); // 300ms delay to prevent race conditions during scanner input while staying fast
    }
  };

  const processScan = async (barcodeValue = null) => {
    let barcodeToScan = (barcodeValue || scanInput).trim();

    if (!barcodeToScan) {
      setScanMessage("Barcode tidak boleh kosong.");
      setScanStatus("error");
      playSound("error");
      return;
    }

    if (!canScan) {
      setScanMessage("Pilih gudang dan slot terlebih dahulu.");
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

    // Clear timeout immediately to prevent double processing (auto-scan length + manual submit keypress)
    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }

    // ─── Frontend Duplicate Scan Check ───
    const currentSerial = getSerialFromBarcode(barcodeToScan);
    const parsedKodeSeri = getKodeSeriFromSerial(currentSerial);

    // Validate against selected Nomor Seri
    if (parsedKodeSeri !== selectedSeriNumber) {
      setScanMessage(`WARNING: Kode seri "${parsedKodeSeri}" tidak cocok dengan Nomor Seri aktif "${selectedSeriNumber}".`);
      setScanStatus("error");
      if (scanInputRef.current) {
        scanInputRef.current.value = "";
      }
      setScanInput("");
      playSound("error");
      setTimeout(() => focusScanInput(), 100);
      return;
    }

    if (seriDetails && seriDetails.prints) {
      const matchedPrint = seriDetails.prints.find((p) => p.barcode_seri === currentSerial);
      if (!matchedPrint) {
        setScanMessage(`WARNING: Barcode "${barcodeToScan}" tidak terdaftar dalam cetakan aktif untuk Nomor Seri "${selectedSeriNumber}".`);
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
    }

    const isSerialBarcode = currentSerial.includes(".") || barcodeToScan.includes(" | ");
    const scanKey = getScanKey(barcodeToScan);

    if (activeScanKeysRef.current.has(scanKey)) {
      setScanMessage(`Barcode "${barcodeToScan}" sedang diproses.`);
      setScanStatus("error");
      if (scanInputRef.current) {
        scanInputRef.current.value = "";
      }
      setScanInput("");
      playSound("error");
      setTimeout(() => focusScanInput(), 20);
      return;
    }

    if (isSerialBarcode) {
      // Check in local session history
      const isDuplicateSerialLocal = scannedItems.some(
        (item) =>
          item.status === "success" &&
          getSerialFromBarcode(item.barcode) === currentSerial
      );

      // Check in fetched database print details
      const isDuplicateSerialDb = seriDetails && seriDetails.prints
         ? seriDetails.prints.some((p) => p.barcode_seri === currentSerial && p.is_scanned)
         : false;

      const isDuplicateSerial = isDuplicateSerialLocal || isDuplicateSerialDb;

      if (isDuplicateSerial) {
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
    } else {
      // General duplicate check for pure barcodes
      const isDuplicateBarcode = scannedItems.some(
        (item) => item.barcode === barcodeToScan && item.status === "success"
      );

      if (isDuplicateBarcode) {
        setScanMessage(`Barcode "${barcodeToScan}" sudah pernah di-scan masuk dalam sesi ini.`);
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

    // 1. Tambahkan item optimistik secara instan ke state scannedItems
    const tempId = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimisticItem = {
      id: tempId,
      barcode: barcodeToScan,
      kode_seri: parsedKodeSeri || "-",
      nomor_seri: currentSerial || "-",
      sku: seriDetails?.sku || "-",
      produk: seriDetails?.produk || "-",
      slot: selectedSlot?.slotCode || "-",
      gudang: selectedLayout?.name || "-",
      qty: 1,
      status: "loading", // Tampilkan sebagai "Memindai..." di tabel
      scanned_at: new Date().toISOString(),
      isOptimistic: true,
    };

    setScannedItems((prev) => [optimisticItem, ...prev]);

    // 2. Tandai juga secara optimistik pada grid cetakan nomor seri (kanan) menjadi hijau
    setSeriDetails((prevDetails) => {
      if (!prevDetails?.prints) return prevDetails;
      return {
        ...prevDetails,
        prints: prevDetails.prints.map((print) =>
          print.barcode_seri === currentSerial
            ? {
                ...print,
                is_scanned: true,
                slot_code: selectedSlot?.slotCode || print.slot_code,
              }
            : print
        ),
      };
    });

    // 3. Daftarkan kunci scan aktif agar tidak ter-scan ganda di frontend
    activeScanKeysRef.current.add(scanKey);

    // 4. Kosongkan input scan & fokus kembali secara instan agar scanner siap memindai berikutnya
    if (scanInputRef.current) {
      scanInputRef.current.value = "";
    }
    setScanInput("");
    focusScanInput();

    // 5. Panggil API di background (tanpa menggunakan await yang memblokir pengerjaan/input berikutnya)
    API.post("/gudang-produk-workspace/scan-produk-masuk", {
      barcode: barcodeToScan,
      layout_id: layoutId,
      slot_id: slotId,
    })
      .then((response) => {
        const resultData = response.data?.data || {};
        const message = response.data?.message || "Produk berhasil di-scan dan masuk ke gudang.";

        setScanMessage(message);
        setScanStatus("success");
        playSound("success");

        // Perbarui item optimistik tadi menjadi sukses di tabel
        setScannedItems((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  status: "success",
                  barcode: resultData.barcode || item.barcode,
                  kode_seri: resultData.kode_seri || item.kode_seri,
                  nomor_seri: resultData.nomor_seri || item.nomor_seri,
                  sku: resultData.sku || item.sku,
                  produk: resultData.produk || item.produk,
                  slot: resultData.slot || item.slot,
                  qty: resultData.qty || item.qty,
                  activity_id: resultData.placement?.activity?.id,
                }
              : item
          )
        );

        // Update workspace state
        if (resultData.placement?.stockEntry) {
          setState((currentState) => {
            const nextStockEntries = [...currentState.stockEntries];
            const existingIndex = nextStockEntries.findIndex(
              (entry) => String(entry.id) === String(resultData.placement.stockEntry.id)
            );

            if (existingIndex >= 0) {
              nextStockEntries[existingIndex] = resultData.placement.stockEntry;
            } else {
              nextStockEntries.unshift(resultData.placement.stockEntry);
            }

            const nextActivities = resultData.placement.activity
              ? [resultData.placement.activity, ...currentState.activityLog]
              : currentState.activityLog;

            return {
              ...currentState,
              stockEntries: nextStockEntries,
              activityLog: nextActivities.slice(0, 500),
            };
          });
        }

        // Sinkronisasi data detail seri
        setSeriDetails((prevDetails) => {
          if (!prevDetails?.prints) return prevDetails;
          return {
            ...prevDetails,
            prints: prevDetails.prints.map((print) =>
              print.barcode_seri === currentSerial
                ? {
                    ...print,
                    is_scanned: true,
                    slot_code: resultData.slot || selectedSlot?.slotCode || print.slot_code,
                  }
                : print
            ),
          };
        });

        fetchSeriDetails(selectedSeriId, selectedSeriNumber, { silent: true });
        fetchSeriList();
      })
      .catch((error) => {
        const msg = error.response?.data?.message || "Gagal memindai barcode produk.";
        setScanMessage(msg);
        playSound("error");

        // Perbarui item optimistik menjadi gagal/error
        setScannedItems((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  status: "error",
                  error_message: msg,
                  qty: 0,
                }
              : item
          )
        );

        // Kembalikan status cetakan seri (kanan) ke belum ter-scan
        setSeriDetails((prevDetails) => {
          if (!prevDetails?.prints) return prevDetails;
          return {
            ...prevDetails,
            prints: prevDetails.prints.map((print) =>
              print.barcode_seri === currentSerial
                ? {
                    ...print,
                    is_scanned: false,
                    slot_code: null,
                  }
                : print
            ),
          };
        });
      })
      .finally(() => {
        activeScanKeysRef.current.delete(scanKey);
        setTimeout(() => {
          focusScanInput();
        }, 20);
      });
  };

  const handleCancelSeriPrint = async (print) => {
    if (!print || print.is_scanned || print.is_cancelled) {
      return;
    }

    if (!window.confirm(`Batalkan kode seri "${print.barcode_seri}" karena kelebihan cetak?`)) {
      focusScanInput();
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
      setTimeout(() => focusScanInput(), 20);
    }
  };

  const handleDeleteItem = async (item) => {
    if (item.status === "error") {
      // If it was a failed scan, it was never added to the database. Just remove it locally.
      setScannedItems((prev) => prev.filter((prevItem) => prevItem.id !== item.id));
      return;
    }

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

      // Remove from frontend history
      setScannedItems((prev) => prev.filter((prevItem) => prevItem.id !== item.id));

      // Refresh layout/stocks
      refresh({ silent: true });

      // Refresh active serial details and dropdown list
      if (selectedSeriId) {
        fetchSeriDetails(selectedSeriId, selectedSeriNumber);
      }
      fetchSeriList();
    } catch (err) {
      console.error("Gagal menghapus scan item", err);
      const errMsg = err.response?.data?.message || "Gagal menghapus scan item dari gudang.";
      setScanMessage(errMsg);
      setScanStatus("error");
      playSound("error");
    } finally {
      setTimeout(() => setScanStatus(""), 3000);
      setTimeout(() => {
        focusScanInput();
      }, 100);
    }
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

  const handleClearHistory = () => {
    setScannedItems([]);
  };

  return (
    <div className="spm-gudang-page">
      <div className="spm-gudang-shell">
        {/* ─── Topbar ─── */}
        <header className="spm-gudang-topbar">
          <div className="spm-gudang-title-group">
            <div className="spm-gudang-brand-icon">
              <FaBarcode />
            </div>
            <div> 
              <h1>Scan Produk Masuk</h1>
              <p>Scan barcode kode seri untuk memasukkan produk ke gudang secara real-time</p>
            </div>
          </div>

          <div className="spm-gudang-kpi-grid">
            <div className="spm-gudang-kpi-card">
              <span>Total Scan</span>
              <strong>{scannedItems.length}</strong>
            </div>
            <div className="spm-gudang-kpi-card">
              <span>Berhasil Masuk</span>
              <strong>{totalScanHariIni}</strong>
            </div>
            <div className="spm-gudang-kpi-card">
              <span>Gagal</span>
              <strong>{totalGagal}</strong>
            </div>
          </div>
        </header>

        <main className="spm-gudang-main" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: "24px", alignItems: "start" }}>
          {/* ─── Kolom Kiri: Input, Peta & Riwayat Scan ─── */}
          <div className="spm-gudang-left-col" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* ─── Section 1: Pilih Gudang & Slot ─── */}
            <section className="spm-gudang-card">
              <div className="spm-gudang-card-header">
                <div className="spm-gudang-card-title">
                  <FaWarehouse />
                  <h3>Pilih Gudang & Lokasi</h3>
                </div>
                <p>Pilih gudang tujuan dan slot/rak tempat produk akan disimpan.</p>
              </div>

              {workspaceLoading ? (
                <p className="spm-gudang-loading">Memuat data gudang...</p>
              ) : workspaceError ? (
                <p className="spm-gudang-error-text">{workspaceError}</p>
              ) : (
                <>
                  <div className="spm-gudang-selector-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                    <div className="spm-gudang-form-group">
                      <label>Gudang Tujuan</label>
                      <select
                        className="spm-gudang-select"
                        value={layoutId}
                        onChange={(e) => setLayoutId(e.target.value)}
                      >
                        <option value="">-- Pilih Gudang --</option>
                        {state.layouts.map((layout) => (
                          <option key={layout.id} value={layout.id}>
                            {layout.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="spm-gudang-form-group">
                      <label>Slot / Rak Tujuan</label>
                      <select
                        className="spm-gudang-select"
                        value={slotId}
                        onChange={(e) => setSlotId(e.target.value)}
                        disabled={!layoutId}
                      >
                        <option value="">
                          {layoutId ? "-- Pilih Slot --" : "Pilih gudang terlebih dahulu"}
                        </option>
                        {layoutSlots.map((slot) => {
                          const slotSummary = stockSummaryBySlot[slot.id];
                          const label = `${slot.slotCode}${
                            slotSummary ? ` (${slotSummary.qty} pcs, ${slotSummary.skuCount} SKU)` : " (Kosong)"
                          }`;
                          return (
                            <option key={slot.id} value={slot.id}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="spm-gudang-form-group" style={{ position: "relative" }} ref={seriComboboxRef}>
                      <label>Nomor Seri Tujuan</label>
                      <div style={{ position: "relative" }}>
                        <FiSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                        <input
                          type="text"
                          className="spm-gudang-select"
                          style={{ paddingLeft: 38, paddingRight: 38, background: "#fff" }}
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
                          onFocus={() => setIsSeriDropdownOpen(true)}
                          placeholder={selectedSeriLabel || "Cari dan pilih Nomor Seri..."}
                        />
                        {selectedSeriId && !seriQuery ? (
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

                              // Sembunyikan jika sudah fully scanned atau lebih dari 15 hari
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
                          {filteredSeriList.filter((seriItem) => {
                            const scanned = seriItem.scanned_count ?? 0;
                            const jumlah = seriItem.jumlah ?? 0;
                            const isFullyScanned = jumlah > 0 && scanned >= jumlah;
                            const isOld = isOlderThan15Days(seriItem.created_at);
                            return !isFullyScanned && !isOld;
                          }).length === 0 && (
                            <div style={{ padding: "8px 12px", color: "#64748b", fontSize: 13 }}>
                              Nomor seri tidak ditemukan.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedSlot && (
                    <div className="spm-gudang-slot-status">
                      <FaMapMarkerAlt />
                      <span>
                        Lokasi aktif: <strong>{buildSlotHeadline(selectedSlot)}</strong>
                        {selectedSlotSummary
                          ? ` — ${selectedSlotSummary.qty} pcs tersimpan dengan ${selectedSlotSummary.skuCount} SKU`
                          : " — Slot kosong, siap dipakai"}
                      </span>
                    </div>
                  )}

                  {selectedLayout && (
                    <div className="spm-gudang-visual-map-wrap" style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #e2e8f0" }}>
                      <details style={{ width: "100%" }}>
                        <summary style={{ cursor: "pointer", fontWeight: 700, color: "#7c3aed", userSelect: "none", display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "15px" }}>
                          <FaMapMarkerAlt />
                          <span>Peta Visual Layout Gudang (Klik untuk Tampil/Sembunyi)</span>
                        </summary>
                        <div style={{ marginTop: "16px" }}>
                          <GudangLayoutMap
                            layout={selectedLayout}
                            selectedSlotId={slotId}
                            onSelectSlot={(slot) => {
                              if (slot && slot.id) {
                                setSlotId(slot.id);
                              }
                            }}
                            stockSummaryBySlot={stockSummaryBySlot}
                            interactive={true}
                          />
                        </div>
                      </details>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ─── Section 2: Scan Barcode ─── */}
            <section className="spm-gudang-card">
              <div className="spm-gudang-card-header">
                <div className="spm-gudang-card-title">
                  <FiBox />
                  <h3>Scan Barcode Produk</h3>
                </div>
                <p>Input barcode secara otomatis atau tekan Enter untuk memindai manual.</p>
              </div>

              <form onSubmit={handleScan} className="spm-gudang-scan-form">
                <div className="spm-gudang-input-wrap">
                  <FiSearch className="spm-gudang-input-icon" />
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => handleBarcodeChange(e.target.value)}
                    onKeyDown={handleScanKeyDown}
                    placeholder={
                      !layoutId || !slotId
                        ? "Pilih gudang & slot terlebih dahulu"
                        : !selectedSeriNumber
                        ? "Pilih nomor seri terlebih dahulu"
                        : "Scan barcode kode seri produk..."
                    }
                    className="spm-gudang-input"
                    disabled={!canScan}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!canScan}
                  className="spm-gudang-btn spm-gudang-btn-primary"
                >
                  {scanStatus === "loading" ? "Memindai..." : "Scan"}
                </button>
              </form>

              {!canScan && !workspaceLoading && (
                <div className="spm-gudang-scan-disabled-hint">
                  <FiAlertTriangle />
                  <span>
                    {!layoutId || !slotId
                      ? "Pilih gudang dan slot terlebih dahulu sebelum mulai scan."
                      : "Pilih nomor seri terlebih dahulu sebelum mulai scan."}
                  </span>
                </div>
              )}

              {scanMessage && (
                <div className={`spm-gudang-alert ${scanStatus === "error" ? "error" : "success"}`}>
                  {scanMessage}
                </div>
              )}
            </section>

            {/* ─── Section 3: Hasil Scan ─── */}
            <section className="spm-gudang-card">
              <div className="spm-gudang-toolbar">
                <div className="spm-gudang-card-title">
                  <FaBoxOpen />
                  <h3>Hasil Scan Produk Masuk</h3>
                </div>
                <div className="spm-gudang-toolbar-right">
                  {scannedItems.length > 0 && (
                    <button
                      type="button"
                      className="spm-gudang-btn spm-gudang-btn-danger"
                      onClick={handleClearHistory}
                    >
                      <FaTrash />
                      Hapus Riwayat
                    </button>
                  )}
                </div>
              </div>

              {scannedItems.length === 0 ? (
                <div className="spm-gudang-empty">
                  <FaBarcode />
                  <h4>Belum ada produk yang di-scan</h4>
                  <p>Mulai scan barcode kode seri untuk memasukkan produk ke gudang.</p>
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
                          <th>Waktu Scan</th>
                          <th>Status</th>
                          <th style={{ textAlign: "center" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item, index) => (
                          <tr
                            key={item.id}
                            className={index === 0 ? "spm-gudang-row-new" : ""}
                          >
                            <td className="spm-gudang-table-no">{index + 1}</td>
                            <td className="spm-gudang-table-barcode">{item.barcode}</td>
                            <td>{item.kode_seri}</td>
                            <td className="spm-gudang-table-sku">{item.sku}</td>
                            <td>{item.produk}</td>
                            <td>{item.gudang}</td>
                            <td>{item.slot}</td>
                            <td>{item.qty}</td>
                            <td>{formatTanggal(item.scanned_at)}</td>
                            <td>
                              <span
                                className={`spm-gudang-pill ${
                                  item.status === "success"
                                    ? "spm-gudang-pill-success"
                                    : "spm-gudang-pill-error"
                                }`}
                              >
                                {item.status === "success" ? "Berhasil" : "Gagal"}
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
                      Menampilkan {filteredItems.length} dari {scannedItems.length} data scan
                    </p>
                  </div>
                </>
              )}
            </section>
          </div>

          {/* ─── Kolom Kanan: Monitoring Cetakan Nomor Seri ─── */}
          <div className="spm-gudang-right-col" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <section className="spm-gudang-card" style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
              <div className="spm-gudang-card-header">
                <div className="spm-gudang-card-title">
                  <FaBarcode style={{ color: "#7c3aed" }} />
                  <h3>Status Cetak Kode Seri</h3>
                </div>
                <p>Status pemindaian per index print untuk nomor seri aktif</p>
              </div>

              {!selectedSeriNumber ? (
                <div style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "60px 20px",
                  color: "#64748b",
                  textAlign: "center"
                }}>
                  <FaBarcode size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
                  <h4>Pilih Nomor Seri Terlebih Dahulu</h4>
                  <p style={{ fontSize: "13px", marginTop: "8px", maxWidth: "280px" }}>
                    Silakan pilih nomor seri tujuan di panel sebelah kiri untuk melihat daftar barcode cetak.
                  </p>
                </div>
              ) : loadingSeriDetails ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
                  <p>Memuat status cetak kode seri...</p>
                </div>
              ) : seriDetails ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                  {/* Progress Header */}
                  <div style={{
                    padding: "16px",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>
                        Nomor Seri: <span style={{ color: "#7c3aed" }}>{seriDetails.nomor_seri}</span>
                      </span>
                      <span style={{ color: "#64748b" }}>
                        SKU: <strong>{seriDetails.sku}</strong>
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
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
                    maxHeight: "560px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                    gap: "10px",
                    paddingRight: "4px"
                  }}>
                    {orderedSeriPrints.map((print) => {
                      const isCancelled = Boolean(print.is_cancelled);
                      const isScanned = Boolean(print.is_scanned);
                      const isCanceling = cancelingPrintKey === print.barcode_seri;

                      // Sembunyikan card yang sudah di-scan
                      if (isScanned) return null;

                      const borderColor = isCancelled ? "#fecaca" : "#e2e8f0";
                      const backgroundColor = isCancelled ? "#fff1f2" : "#ffffff";
                      const textColor = isCancelled ? "#be123c" : "#475569";
                      const dotColor = isCancelled ? "#ef4444" : "#94a3b8";

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

                          <span style={{ fontFamily: "monospace", fontSize: "11px", color: isCancelled ? "#9f1239" : "#64748b" }}>
                            {print.barcode_seri}
                          </span>

                          {isCancelled ? (
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
        </main>
      </div>
    </div>
  );
};

export default ScanProdukMasukGudang;

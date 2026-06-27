import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiRefreshCw,
  FiX,
  FiFilter,
  FiPrinter,
  FiEdit,
  FiTrash2
} from "react-icons/fi";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import {
  buildGudangWorkspaceErrorMessage,
  fetchGudangProdukStokAwalHistory,
  fetchGudangProdukWorkspace,
  updateGudangProdukStokAwalLocation,
  deleteGudangProdukStokAwal,
} from "./GudangProdukWorkspaceApi";
import { getAllSlots } from "./GudangProdukMockStore";
import {
  confirmGudangAction,
  showGudangSuccess,
  showGudangError,
} from "./GudangProdukAlerts";

const EMPTY_SUMMARY = {
  total_rows: 0,
  total_qty: 0,
  total_sku: 0,
  total_seri: 0,
  total_locations: 0,
};

const EMPTY_PAGINATION = {
  current_page: 1,
  per_page: 50,
  total: 0,
  last_page: 1,
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const formatNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString("id-ID") : "0";
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getToday = () => new Date().toISOString().slice(0, 10);

const formatDateForFile = (value) => String(value || "").replace(/[^0-9]/g, "") || "semua";

const cleanSerial = (serial) => {
  let clean = String(serial || "").trim();
  // 1. Remove leading uppercase letter prefix followed by dot or hyphen (e.g. EK-, EK., SA-, TS-, RTN-)
  clean = clean.replace(/^[A-Z]+[-.]/i, "");
  // 2. Remove trailing print sequence suffix (e.g. .1, .12, .123 at the end of the serial)
  clean = clean.replace(/\.\d+$/, "");
  return clean || serial;
};

const formatSeriSummaryForPdf = (value) => {
  const serialGroups = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((groups, serial) => {
      const baseSerial = cleanSerial(serial);
      groups.set(baseSerial, (groups.get(baseSerial) || 0) + 1);
      return groups;
    }, new Map());

  if (serialGroups.size === 0) {
    return "-";
  }

  return Array.from(serialGroups.entries())
    .map(([serial, count]) => `${serial} Qty ${count}`)
    .join("\n");
};

const parseSeriGroups = (value) => {
  const serialGroups = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((groups, serial) => {
      const baseSerial = cleanSerial(serial);
      groups.set(baseSerial, (groups.get(baseSerial) || 0) + 1);
      return groups;
    }, new Map());

  return Array.from(serialGroups.entries()).map(([serial, count]) => ({
    serial,
    count,
  }));
};

const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightText = (value, keyword) => {
  const text = String(value || "");
  const cleanKeyword = String(keyword || "").trim();

  if (!cleanKeyword || !text) {
    return text || "-";
  }

  const matcher = new RegExp(`(${escapeRegExp(cleanKeyword)})`, "ig");
  return text.split(matcher).map((part, index) =>
    part.toLowerCase() === cleanKeyword.toLowerCase() ? (
      <mark key={`${part}_${index}`}>{part}</mark>
    ) : (
      <React.Fragment key={`${part}_${index}`}>{part}</React.Fragment>
    )
  );
};

const HistoryStokAwalGudang = () => {
  const today = getToday();
  const [rows, setRows] = useState([]);
  const [editModal, setEditModal] = useState({
    show: false,
    row: null,
    workspace: null,
    isLoading: false,
    layoutId: "",
    floorId: "",
    blockId: "",
    rackId: "",
    rowNumber: "",
    isSaving: false,
    error: "",
  });

  const handleOpenEditModal = async (row) => {
    setEditModal({
      show: true,
      row,
      workspace: null,
      isLoading: true,
      layoutId: "",
      floorId: "",
      blockId: "",
      rackId: "",
      rowNumber: "",
      isSaving: false,
      error: "",
    });

    try {
      const workspace = await fetchGudangProdukWorkspace({ activityLimit: 0 });
      const allSlots = getAllSlots(workspace);
      const currentSlot = allSlots.find(slot => String(slot.id) === String(row.slot_id)) || null;

      let initialLayoutId = "";
      let initialFloorId = "";
      let initialBlockId = "";
      let initialRackId = "";
      let initialRowNumber = "";

      if (currentSlot) {
        initialLayoutId = currentSlot.layoutId || "";
        const layout = workspace.layouts.find(l => String(l.id) === String(currentSlot.layoutId));
        if (layout) {
          const floor = layout.floors.find(f => Number(f.number) === Number(currentSlot.floorNumber));
          if (floor) {
            initialFloorId = floor.id;
            const block = floor.blocks.find(b => String(b.code).toUpperCase() === String(currentSlot.blockCode).toUpperCase());
            if (block) {
              initialBlockId = block.id;
              const rack = block.racks.find(r => Number(r.number) === Number(currentSlot.rackNumber));
              if (rack) {
                initialRackId = rack.id;
                initialRowNumber = String(currentSlot.rowNumber);
              }
            }
          }
        }
      }

      if (!initialLayoutId && workspace.layouts.length > 0) {
        const layout = workspace.layouts[0];
        initialLayoutId = layout.id;
        if (layout.floors.length > 0) {
          const floor = layout.floors[0];
          initialFloorId = floor.id;
          if (floor.blocks.length > 0) {
            const block = floor.blocks[0];
            initialBlockId = block.id;
            if (block.racks.length > 0) {
              const rack = block.racks[0];
              initialRackId = rack.id;
              initialRowNumber = "1";
            }
          }
        }
      }

      setEditModal(prev => ({
        ...prev,
        workspace,
        isLoading: false,
        layoutId: initialLayoutId,
        floorId: initialFloorId,
        blockId: initialBlockId,
        rackId: initialRackId,
        rowNumber: initialRowNumber,
      }));
    } catch (err) {
      setEditModal(prev => ({
        ...prev,
        isLoading: false,
        error: "Gagal memuat layout gudang.",
      }));
    }
  };

  const editSelectedLayout = useMemo(() => {
    if (!editModal.workspace || !editModal.layoutId) return null;
    return editModal.workspace.layouts.find(l => String(l.id) === String(editModal.layoutId)) || editModal.workspace.layouts[0] || null;
  }, [editModal.workspace, editModal.layoutId]);

  const editFloors = useMemo(() => {
    if (!editSelectedLayout) return [];
    return [...(editSelectedLayout.floors || [])].sort((left, right) => Number(left.number) - Number(right.number));
  }, [editSelectedLayout]);

  const editSelectedFloor = useMemo(() => {
    if (!editFloors.length || !editModal.floorId) return null;
    return editFloors.find(f => String(f.id) === String(editModal.floorId)) || editFloors[0] || null;
  }, [editFloors, editModal.floorId]);

  const editBlocks = useMemo(() => {
    if (!editSelectedFloor) return [];
    return [...(editSelectedFloor.blocks || [])].sort((left, right) => String(left.code || "").localeCompare(String(right.code || "")));
  }, [editSelectedFloor]);

  const editSelectedBlock = useMemo(() => {
    if (!editBlocks.length || !editModal.blockId) return null;
    return editBlocks.find(b => String(b.id) === String(editModal.blockId)) || editBlocks[0] || null;
  }, [editBlocks, editModal.blockId]);

  const editRacks = useMemo(() => {
    if (!editSelectedBlock) return [];
    return [...(editSelectedBlock.racks || [])].sort((left, right) => Number(left.number) - Number(right.number));
  }, [editSelectedBlock]);

  const editSelectedRack = useMemo(() => {
    if (!editRacks.length || !editModal.rackId) return null;
    return editRacks.find(r => String(r.id) === String(editModal.rackId)) || editRacks[0] || null;
  }, [editRacks, editModal.rackId]);

  const editSelectedSlot = useMemo(() => {
    if (!editModal.workspace || !editSelectedLayout || !editSelectedFloor || !editSelectedBlock || !editSelectedRack || !editModal.rowNumber) {
      return null;
    }
    const allSlots = getAllSlots(editModal.workspace);
    return allSlots.find(
      (slot) =>
        String(slot.layoutId) === String(editSelectedLayout.id) &&
        Number(slot.floorNumber) === Number(editSelectedFloor.number) &&
        String(slot.blockCode).toUpperCase() === String(editSelectedBlock.code).toUpperCase() &&
        Number(slot.rackNumber) === Number(editSelectedRack.number) &&
        Number(slot.rowNumber) === Number(editModal.rowNumber)
    ) || null;
  }, [editModal.workspace, editSelectedLayout, editSelectedFloor, editSelectedBlock, editSelectedRack, editModal.rowNumber]);

  const handleEditLayoutChange = (e) => {
    const nextLayoutId = e.target.value;
    const layout = editModal.workspace?.layouts.find(l => String(l.id) === String(nextLayoutId));
    let nextFloorId = "";
    let nextBlockId = "";
    let nextRackId = "";
    let nextRowNumber = "";

    if (layout && layout.floors.length) {
      const floor = layout.floors[0];
      nextFloorId = floor.id;
      if (floor.blocks.length) {
        const block = floor.blocks[0];
        nextBlockId = block.id;
        if (block.racks.length) {
          const rack = block.racks[0];
          nextRackId = rack.id;
          nextRowNumber = "1";
        }
      }
    }

    setEditModal(prev => ({
      ...prev,
      layoutId: nextLayoutId,
      floorId: nextFloorId,
      blockId: nextBlockId,
      rackId: nextRackId,
      rowNumber: nextRowNumber,
    }));
  };

  const handleEditFloorChange = (e) => {
    const nextFloorId = e.target.value;
    const floor = editFloors.find(f => String(f.id) === String(nextFloorId));
    let nextBlockId = "";
    let nextRackId = "";
    let nextRowNumber = "";

    if (floor && floor.blocks.length) {
      const block = floor.blocks[0];
      nextBlockId = block.id;
      if (block.racks.length) {
        const rack = block.racks[0];
        nextRackId = rack.id;
        nextRowNumber = "1";
      }
    }

    setEditModal(prev => ({
      ...prev,
      floorId: nextFloorId,
      blockId: nextBlockId,
      rackId: nextRackId,
      rowNumber: nextRowNumber,
    }));
  };

  const handleEditBlockChange = (e) => {
    const nextBlockId = e.target.value;
    const block = editBlocks.find(b => String(b.id) === String(nextBlockId));
    let nextRackId = "";
    let nextRowNumber = "";

    if (block && block.racks.length) {
      const rack = block.racks[0];
      nextRackId = rack.id;
      nextRowNumber = "1";
    }

    setEditModal(prev => ({
      ...prev,
      blockId: nextBlockId,
      rackId: nextRackId,
      rowNumber: nextRowNumber,
    }));
  };

  const handleEditRackChange = (e) => {
    const nextRackId = e.target.value;
    setEditModal(prev => ({
      ...prev,
      rackId: nextRackId,
      rowNumber: "1",
    }));
  };

  const handleSaveEditLocation = async () => {
    if (!editSelectedSlot) {
      setEditModal(prev => ({ ...prev, error: "Silakan pilih lokasi tujuan yang valid." }));
      return;
    }

    if (String(editSelectedSlot.id) === String(editModal.row.slot_id)) {
      setEditModal(prev => ({ ...prev, error: "Lokasi baru sama dengan lokasi lama." }));
      return;
    }

    setEditModal(prev => ({ ...prev, isSaving: true, error: "" }));

    try {
      await updateGudangProdukStokAwalLocation({
        sku_id: editModal.row.sku_id,
        old_slot_id: editModal.row.slot_id,
        new_layout_id: editSelectedLayout.id,
        new_slot_id: editSelectedSlot.id,
      });

      setEditModal({
        show: false,
        row: null,
        workspace: null,
        isLoading: false,
        layoutId: "",
        floorId: "",
        blockId: "",
        rackId: "",
        rowNumber: "",
        isSaving: false,
        error: "",
      });

      refreshRows();
    } catch (err) {
      const errMsg = buildGudangWorkspaceErrorMessage(err, "Gagal memperbarui lokasi stok awal.");
      setEditModal(prev => ({ ...prev, isSaving: false, error: errMsg }));
    }
  };

  const handleDeleteStokAwal = async (row) => {
    const confirmed = await confirmGudangAction({
      title: "Hapus History Stok Awal",
      text: `Apakah Anda yakin ingin menghapus history stok awal SKU ${row.sku} pada lokasi ${row.lokasi}? Tindakan ini akan mengurangi stok gudang sebanyak ${row.qty} pcs secara otomatis.`,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      icon: "warning",
    });

    if (!confirmed) return;

    try {
      await deleteGudangProdukStokAwal({
        sku_id: row.sku_id,
        slot_id: row.slot_id,
      });

      await showGudangSuccess(
        "Berhasil Dihapus",
        "History stok awal telah dihapus dan stok gudang berhasil disesuaikan."
      );
      
      refreshRows();
    } catch (err) {
      const errMsg = buildGudangWorkspaceErrorMessage(
        err,
        "Gagal menghapus history stok awal."
      );
      await showGudangError("Gagal", errMsg);
    }
  };
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearchInput = useDeferredValue(searchInput);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [singleDate, setSingleDate] = useState(today);
  const [query, setQuery] = useState({
    page: 1,
    perPage: 50,
    search: "",
    startDate: today,
    endDate: today,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = deferredSearchInput.trim();

      startTransition(() => {
        setQuery((current) => {
          if (current.search === nextSearch && current.page === 1) {
            return current;
          }

          return {
            ...current,
            search: nextSearch,
            page: 1,
          };
        });
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [deferredSearchInput]);

  useEffect(() => {
    let ignore = false;

    const loadRows = async () => {
      setIsLoading(true);

      try {
        const result = await fetchGudangProdukStokAwalHistory({
          page: query.page,
          per_page: query.perPage,
          search: query.search,
          start_date: query.startDate,
          end_date: query.endDate,
        });

        if (ignore) {
          return;
        }

        setRows(result.data);
        setSummary(result.summary);
        setPagination(result.pagination);
        setError("");
        setHasLoadedOnce(true);
      } catch (fetchError) {
        if (ignore) {
          return;
        }

        if (!hasLoadedOnce) {
          setRows([]);
          setSummary(EMPTY_SUMMARY);
          setPagination({
            ...EMPTY_PAGINATION,
            current_page: query.page,
            per_page: query.perPage,
          });
        }

        setError(
          buildGudangWorkspaceErrorMessage(
            fetchError,
            "Gagal memuat history stok awal."
          )
        );
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadRows();

    return () => {
      ignore = true;
    };
  }, [query]);

  const openDatePicker = (event) => {
    const input = event.currentTarget;

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch (pickerError) {
        // Browser can block repeated picker calls.
      }
    }
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
    setSingleDate("");
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
    setSingleDate("");
  };

  const handleSingleDateChange = (event) => {
    const selectedDate = event.target.value;

    setSingleDate(selectedDate);
    if (selectedDate) {
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    }
  };

  const applyFilter = () => {
    startTransition(() => {
      setQuery((current) => ({
        ...current,
        startDate,
        endDate,
        page: 1,
      }));
    });
  };

  const refreshRows = () => {
    startTransition(() => {
      setQuery((current) => ({ ...current }));
    });
  };

  const clearSearch = () => {
    setSearchInput("");

    startTransition(() => {
      setQuery((current) => ({
        ...current,
        search: "",
        page: 1,
      }));
    });
  };

  const handlePerPageChange = (event) => {
    const nextPerPage = Number(event.target.value) || 50;

    startTransition(() => {
      setQuery((current) => ({
        ...current,
        perPage: nextPerPage,
        page: 1,
      }));
    });
  };

  const goToPage = (page) => {
    startTransition(() => {
      setQuery((current) => ({
        ...current,
        page,
      }));
    });
  };

  const fetchAllExportRows = async () => {
    const perPage = 200;
    let page = 1;
    let lastPage = 1;
    const exportRows = [];

    do {
      const result = await fetchGudangProdukStokAwalHistory({
        page,
        per_page: perPage,
        search: query.search,
        start_date: query.startDate,
        end_date: query.endDate,
      });

      exportRows.push(...result.data);
      lastPage = Math.max(Number(result.pagination?.last_page) || 1, 1);
      page += 1;
    } while (page <= lastPage);

    return exportRows;
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) {
      return;
    }

    setIsExportingPdf(true);

    try {
      const exportRows = await fetchAllExportRows();
      const generatedAt = new Date().toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const totalQty = exportRows.reduce((total, row) => total + (Number(row.qty) || 0), 0);
      const doc = new jsPDF("portrait", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 10;
      const fileStart = formatDateForFile(query.startDate);
      const fileEnd = formatDateForFile(query.endDate);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text("History Stok Awal Gudang Produk", marginX, 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Tanggal: ${query.startDate || "-"} s/d ${query.endDate || "-"}`, marginX, 19);
      doc.text(`Search: ${query.search || "-"} | Export: ${generatedAt}`, marginX, 24);
      doc.text(
        `Total baris: ${formatNumber(exportRows.length)} | Total qty: ${formatNumber(totalQty)}`,
        marginX,
        29
      );

      // Flatten rows: each seri group becomes its own PDF row
      const pdfBody = [];
      if (exportRows.length > 0) {
        exportRows.forEach((row, index) => {
          const groups = parseSeriGroups(row.seri);
          if (groups.length === 0) {
            pdfBody.push([
              index + 1,
              formatDateTime(row.tgl),
              row.sku || "-",
              "-",
              "-",
              formatNumber(row.qty),
              row.lokasi || "-",
            ]);
          } else {
            groups.forEach((g, gIdx) => {
              pdfBody.push([
                gIdx === 0 ? index + 1 : "",
                gIdx === 0 ? formatDateTime(row.tgl) : "",
                gIdx === 0 ? (row.sku || "-") : "",
                g.serial,
                String(g.count),
                gIdx === 0 ? formatNumber(row.qty) : "",
                gIdx === 0 ? (row.lokasi || "-") : "",
              ]);
            });
          }
        });
      } else {
        pdfBody.push(["-", "-", "Tidak ada data", "-", "-", "-", "-"]);
      }

      doc.autoTable({
        startY: 35,
        head: [["No", "TGL", "SKU", "SERI", "QTY Seri", "QTY Total", "Lokasi"]],
        body: pdfBody,
        theme: "grid",
        margin: { left: marginX, right: marginX, top: 12, bottom: 12 },
        styles: {
          fontSize: 6.5,
          cellPadding: 2,
          overflow: "linebreak",
          valign: "middle",
          textColor: [15, 23, 42],
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [36, 88, 206],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 27 },
          2: { cellWidth: 38 },
          3: { cellWidth: 30, halign: "center" },
          4: { cellWidth: 20, halign: "center" },
          5: { cellWidth: 22, halign: "center" },
          6: { cellWidth: pageWidth - marginX * 2 - 147 },
        },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.getHeight();
          const pageNumber = doc.internal.getNumberOfPages();

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(`Halaman ${pageNumber}`, pageWidth - marginX, pageHeight - 6, {
            align: "right",
          });
        },
      });

      doc.save(`history-stok-awal-${fileStart}-${fileEnd}.pdf`);
    } catch (exportError) {
      setError(
        buildGudangWorkspaceErrorMessage(
          exportError,
          "Gagal export PDF history stok awal."
        )
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const isInitialLoading = isLoading && !hasLoadedOnce;
  const isRefreshing = isLoading && hasLoadedOnce;
  const activeSearch = query.search;
  const isSearchDirty = searchInput.trim() !== query.search;
  const hasRows = rows.length > 0;
  const resultFrom = hasRows
    ? (pagination.current_page - 1) * pagination.per_page + 1
    : 0;
  const resultTo = hasRows
    ? Math.min(pagination.current_page * pagination.per_page, pagination.total)
    : 0;

  const visibleRows = useMemo(
    () =>
      rows.map((row, index) => ({
        ...row,
        rowNumber: resultFrom + index,
      })),
    [resultFrom, rows]
  );

  return (
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>History Stok Awal</h1>
          <span className="ks-header-sub">Riwayat input stok awal gudang produk berdasarkan tanggal, SKU, seri, qty, dan lokasi.</span>
        </div>
        <div className="ks-header-actions">
          <button type="button" className="ks-btn" onClick={handleExportPdf} disabled={isExportingPdf || isInitialLoading}>
            <FiPrinter size={13} /> {isExportingPdf ? "Menyiapkan PDF..." : "Export PDF"}
          </button>
          <button type="button" className="ks-btn is-primary" onClick={refreshRows} disabled={isLoading}>
            <FiRefreshCw size={13} className={isRefreshing ? "is-spinning" : ""} />
            {isLoading ? "Memuat" : "Muat Ulang"}
          </button>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Total Baris</span>
          <span className="ks-stat-value">{formatNumber(summary.total_rows)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Total Qty</span>
          <span className="ks-stat-value">{formatNumber(summary.total_qty)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">SKU Berbeda</span>
          <span className="ks-stat-value">{formatNumber(summary.total_sku)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Lokasi</span>
          <span className="ks-stat-value">{formatNumber(summary.total_locations)}</span>
        </div>
      </div>

      <section className="ks-board">
        <div className="ks-toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="ks-search" style={{ flex: '1 1 300px' }}>
            <FiSearch className="ks-search-icon" size={14} />
            <input
              type="text"
              placeholder="Cari SKU, seri, atau lokasi..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
             <button type="button" className="ks-btn is-primary" onClick={applyFilter}>
               <FiFilter size={13} /> Tampilkan
             </button>
             {(activeSearch || startDate || endDate) && (
               <button type="button" className="ks-btn" onClick={clearSearch}>
                 <FiX size={13} /> Reset
               </button>
             )}
          </div>
        </div>

        {error ? (
          <div className="ks-empty" style={{ color: '#ef4444' }}>
             {error}
          </div>
        ) : null}

        <div className="ks-grid-scroll">

        {isInitialLoading ? (
          <div className="ks-empty">
            <FiRefreshCw className="is-spinning" size={20} />
            <p>Memuat history stok awal...</p>
          </div>
        ) : hasRows ? (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="ks-grid">
                  <colgroup>
                    <col style={{ width: '130px' }} />
                    <col />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '90px' }} />
                    <col style={{ width: '140px' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>TGL</th>
                      <th>SKU</th>
                      <th>SERI</th>
                      <th>QTY Seri</th>
                      <th>QTY Total</th>
                      <th>Lokasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => {
                      const seriGroups = parseSeriGroups(row.seri);
                      const spanCount = Math.max(seriGroups.length, 1);

                      if (seriGroups.length === 0) {
                        return (
                          <tr key={row.id} className="stok-awal-row-first">
                            <td>{formatDateTime(row.tgl)}</td>
                            <td>
                              <strong>{highlightText(row.sku, activeSearch)}</strong>
                            </td>
                            <td>-</td>
                            <td>-</td>
                            <td className="align-right">
                              <strong>
                                {formatNumber(row.qty)}
                              </strong>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="ks-badge tone-warning">
                                  {highlightText(row.lokasi, activeSearch)}
                                </span>
                                {row.sku_id && row.slot_id && (
                                  <>
                                    <button
                                      type="button"
                                      className="ks-btn"
                                      onClick={() => handleOpenEditModal(row)}
                                      title="Edit Lokasi"
                                      style={{ padding: "4px" }}
                                    >
                                      <FiEdit size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="ks-btn"
                                      onClick={() => handleDeleteStokAwal(row)}
                                      title="Hapus History"
                                      style={{ padding: "4px", color: "#dc2626" }}
                                    >
                                      <FiTrash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return seriGroups.map((group, idx) => (
                        <tr
                          key={`${row.id}_${group.serial}`}
                          className={idx === 0 ? "stok-awal-row-first" : "stok-awal-row-sub"}
                        >
                          {idx === 0 && (
                            <>
                              <td rowSpan={spanCount} className="stok-awal-cell-span">
                                {formatDateTime(row.tgl)}
                              </td>
                              <td rowSpan={spanCount} className="stok-awal-cell-span">
                                <strong>{highlightText(row.sku, activeSearch)}</strong>
                              </td>
                            </>
                          )}
                          <td style={{ verticalAlign: 'top' }}>
                            <span>
                              {highlightText(group.serial, activeSearch)}
                            </span>
                          </td>
                          <td className="align-right" style={{ verticalAlign: 'top' }}>
                            <span>
                              {formatNumber(group.count)}
                            </span>
                          </td>
                          {idx === 0 && (
                            <>
                              <td rowSpan={spanCount} className="align-right" style={{ verticalAlign: 'top' }}>
                                <strong>
                                  {formatNumber(row.qty)}
                                </strong>
                              </td>
                              <td rowSpan={spanCount} style={{ verticalAlign: 'top' }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span className="ks-badge tone-warning">
                                    {highlightText(row.lokasi, activeSearch)}
                                  </span>
                                  {row.sku_id && row.slot_id && (
                                    <>
                                      <button
                                        type="button"
                                        className="ks-btn"
                                        onClick={() => handleOpenEditModal(row)}
                                        title="Edit Lokasi"
                                        style={{ padding: "4px" }}
                                      >
                                        <FiEdit size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        className="ks-btn"
                                        onClick={() => handleDeleteStokAwal(row)}
                                        title="Hapus History"
                                        style={{ padding: "4px", color: "#dc2626" }}
                                      >
                                        <FiTrash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>

            {pagination.last_page > 1 ? (
              <div className="ks-footer">
                <div className="ks-footer-info">
                  <span>Hal. {formatNumber(pagination.current_page)}/{formatNumber(pagination.last_page)} · {formatNumber(pagination.total)} baris</span>
                  <label className="ks-pagesize">
                    Tampil
                    <select value={query.perPage} onChange={handlePerPageChange}>
                      {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
                <div className="ks-pager">
                  <button type="button" className="ks-pg-btn" onClick={() => goToPage(Math.max(1, pagination.current_page - 1))} disabled={pagination.current_page <= 1}><FiChevronLeft size={14} /></button>
                  <button type="button" className={`ks-pg-btn is-active`}>{pagination.current_page}</button>
                  <button type="button" className="ks-pg-btn" onClick={() => goToPage(Math.min(pagination.last_page, pagination.current_page + 1))} disabled={pagination.current_page >= pagination.last_page}><FiChevronRight size={14} /></button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="ks-empty">
            <p>Tidak ada history stok awal pada filter ini. Ubah tanggal atau kata kunci pencarian untuk melihat data lain.</p>
          </div>
        )}
        </div>
      </section>

      {editModal.show && (
        <div className="gudang-edit-location-modal-overlay">
          <div className="gudang-edit-location-modal-content" style={{ borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}>
            <div className="gudang-edit-location-modal-header" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Edit Lokasi Stok Awal</h3>
              <button
                type="button"
                className="gudang-edit-location-modal-close-btn"
                onClick={() => setEditModal(prev => ({ ...prev, show: false }))}
              >
                <FiX />
              </button>
            </div>
            
            <div className="gudang-edit-location-modal-body">
              {editModal.error && (
                <div className="ks-empty" style={{ color: '#ef4444', marginBottom: '16px' }}>
                  {editModal.error}
                </div>
              )}

              <div className="gudang-edit-location-modal-row-info">
                <div className="gudang-edit-location-modal-info-item">
                  <span>SKU</span>
                  <strong>{editModal.row?.sku}</strong>
                </div>
                <div className="gudang-edit-location-modal-info-item">
                  <span>Qty Total</span>
                  <strong>{formatNumber(editModal.row?.qty)} pcs</strong>
                </div>
                <div className="gudang-edit-location-modal-info-item" style={{ gridColumn: "span 2", marginTop: "8px" }}>
                  <span>Lokasi Saat Ini</span>
                  <strong>{editModal.row?.lokasi}</strong>
                </div>
              </div>

              {editModal.isLoading ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b" }}>
                  Memuat data layout gudang...
                </div>
              ) : (
                <div className="gudang-edit-location-modal-form">
                  <label className="gudang-ui-field gudang-edit-location-modal-form-full">
                    <span>Gudang Produk</span>
                    <select
                      value={editModal.layoutId}
                      onChange={handleEditLayoutChange}
                      disabled={editModal.isSaving}
                      style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none', width: '100%' }}
                    >
                      <option value="">-- Pilih Gudang --</option>
                      {editModal.workspace?.layouts.map((layout) => (
                        <option key={layout.id} value={layout.id}>
                          {layout.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="gudang-ui-field">
                    <span>Lantai</span>
                    <select
                      value={editModal.floorId}
                      onChange={handleEditFloorChange}
                      disabled={editModal.isSaving || !editModal.layoutId}
                      style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none', width: '100%' }}
                    >
                      <option value="">-- Pilih Lantai --</option>
                      {editFloors.map((floor) => (
                        <option key={floor.id} value={floor.id}>
                          {floor.label || `Lantai ${floor.number}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="gudang-ui-field">
                    <span>Bilik / Blok</span>
                    <select
                      value={editModal.blockId}
                      onChange={handleEditBlockChange}
                      disabled={editModal.isSaving || !editModal.floorId}
                      style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none', width: '100%' }}
                    >
                      <option value="">-- Pilih Blok --</option>
                      {editBlocks.map((block) => (
                        <option key={block.id} value={block.id}>
                          {block.label || `Blok ${block.code}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="gudang-ui-field">
                    <span>Rak</span>
                    <select
                      value={editModal.rackId}
                      onChange={handleEditRackChange}
                      disabled={editModal.isSaving || !editModal.blockId}
                      style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none', width: '100%' }}
                    >
                      <option value="">-- Pilih Rak --</option>
                      {editRacks.map((rack) => (
                        <option key={rack.id} value={rack.id}>
                          {rack.label || `Rak ${String(rack.number).padStart(2, "0")}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="gudang-ui-field">
                    <span>Baris Rak</span>
                    <select
                      value={editModal.rowNumber}
                      onChange={(e) => setEditModal(prev => ({ ...prev, rowNumber: e.target.value }))}
                      disabled={editModal.isSaving || !editModal.rackId}
                      style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none', width: '100%' }}
                    >
                      <option value="">-- Pilih Baris --</option>
                      {Array.from({ length: Number(editSelectedRack?.rows || 0) }, (_, index) => index + 1).map((number) => (
                        <option key={number} value={number}>
                          Baris {number}
                        </option>
                      ))}
                    </select>
                  </label>

                  {editSelectedSlot && (
                    <div className="gudang-edit-location-modal-form-full">
                      <div className="gudang-edit-location-modal-preview">
                        Lokasi Baru: {editSelectedLayout?.name} - {editSelectedSlot.slotCode}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="gudang-edit-location-modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="ks-btn"
                onClick={() => setEditModal(prev => ({ ...prev, show: false }))}
                disabled={editModal.isSaving}
              >
                Batal
              </button>
              <button
                type="button"
                className="ks-btn is-primary"
                onClick={handleSaveEditLocation}
                disabled={editModal.isSaving || editModal.isLoading || !editSelectedSlot}
              >
                {editModal.isSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryStokAwalGudang;

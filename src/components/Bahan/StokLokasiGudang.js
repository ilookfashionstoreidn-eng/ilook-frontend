import React, { useEffect, useMemo, useState, useRef } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { FaBoxes, FaDownload, FaSearchLocation, FaSearch, FaTimes } from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import {
  getAllSlots,
  getOrderedRacksForBlock,
  getSlotStockSummaryMap,
  normalizeBlockCanvas,
} from "./GudangProdukMockStore";
import { GudangLayoutMap, GudangStatCard, buildSlotHeadline } from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
import useGudangProdukWorkspace from "./useGudangProdukWorkspace";

const buildRackKey = (layoutId, floorNumber, blockCode, rackNumber) =>
  `${layoutId}__F${floorNumber}__B${String(blockCode).toUpperCase()}__R${rackNumber}`;

const formatRackNumber = (rackNumber) => String(rackNumber).padStart(2, "0");

const truncateText = (value, maxLength) => {
  if (!value) return "";
  return value.length > maxLength ? `${value.slice(0, Math.max(maxLength - 1, 1))}...` : value;
};

const getRackPreviewDensity = (slotCount) => {
  if (slotCount <= 2) return "micro";
  if (slotCount <= 4) return "compact";
  return "regular";
};

const buildRackSkuPreviewText = (skuItems = [], density = "regular") => {
  if (!skuItems.length) return "Belum ada SKU";

  const limitByDensity = {
    micro: 1,
    compact: 2,
    regular: 3,
  };
  const labelLengthByDensity = {
    micro: 16,
    compact: 22,
    regular: 26,
  };
  const limit = limitByDensity[density] || limitByDensity.regular;
  const labelLength = labelLengthByDensity[density] || labelLengthByDensity.regular;
  const labels = skuItems.slice(0, limit).map((item) => truncateText(item.label, labelLength));
  const remainingCount = Math.max(skuItems.length - limit, 0);

  return remainingCount ? `${labels.join(", ")} +${remainingCount} SKU` : labels.join(", ");
};

const clampPdfLines = (lines = [], maxLines = 1) => {
  if (lines.length <= maxLines) return lines;

  const visibleLines = lines.slice(0, maxLines);
  const lastLine = String(visibleLines[maxLines - 1] || "")
    .replace(/[.,;:\s]+$/g, "")
    .trim();

  visibleLines[maxLines - 1] = `${lastLine || visibleLines[maxLines - 1]}...`;
  return visibleLines;
};

const buildRackSummaryMap = (slots, selectedSkuId = "") => {
  const map = {};

  slots.forEach((slot) => {
    const rackKey = buildRackKey(slot.layoutId, slot.floorNumber, slot.blockCode, slot.rackNumber);

    if (!map[rackKey]) {
      map[rackKey] = {
        key: rackKey,
        layoutId: slot.layoutId,
        floorNumber: slot.floorNumber,
        floorLabel: slot.floorLabel,
        blockCode: String(slot.blockCode).toUpperCase(),
        blockLabel: slot.blockLabel,
        rackNumber: slot.rackNumber,
        rackLabel: slot.rackLabel,
        slotCount: 0,
        filledSlotCount: 0,
        totalQty: 0,
        slotEntries: [],
        skuMap: {},
      };
    }

    const summary = map[rackKey];
    summary.slotCount += 1;
    summary.totalQty += Number(slot.totalQty || 0);
    if (Number(slot.totalQty || 0) > 0) {
      summary.filledSlotCount += 1;
    }
    summary.slotEntries.push({
      rowNumber: slot.rowNumber,
      slotCode: slot.slotCode,
      slotId: slot.id,
    });

    (slot.lines || []).forEach((line) => {
      const skuKey = String(line.skuId || line.sku?.id || line.sku?.code || line.id);

      if (!summary.skuMap[skuKey]) {
        summary.skuMap[skuKey] = {
          skuId: line.skuId,
          code: line.sku?.code || "-",
          label: line.sku?.label || line.product?.name || "SKU tanpa nama",
          qty: 0,
          slotCodes: [],
          rowNumbers: [],
        };
      }

      summary.skuMap[skuKey].qty += Number(line.qty || 0);
      summary.skuMap[skuKey].slotCodes.push(slot.slotCode);
      summary.skuMap[skuKey].rowNumbers.push(slot.rowNumber);
    });
  });

  Object.values(map).forEach((summary) => {
    summary.slotEntries.sort((left, right) => left.rowNumber - right.rowNumber);
    summary.slotCodes = summary.slotEntries.map((entry) => entry.slotCode);
    summary.skuItems = Object.values(summary.skuMap)
      .map((item) => ({
        ...item,
        slotCodes: Array.from(new Set(item.slotCodes)),
        rowNumbers: Array.from(new Set(item.rowNumbers)).sort((left, right) => left - right),
      }))
      .sort((left, right) => {
        const leftIsSelected =
          selectedSkuId && String(left.skuId) === String(selectedSkuId) ? 1 : 0;
        const rightIsSelected =
          selectedSkuId && String(right.skuId) === String(selectedSkuId) ? 1 : 0;

        return (
          rightIsSelected - leftIsSelected ||
          right.qty - left.qty ||
          left.label.localeCompare(right.label)
        );
      });
    summary.hasSelectedSku = selectedSkuId
      ? summary.skuItems.some((item) => String(item.skuId) === String(selectedSkuId))
      : false;
    summary.previewText = buildRackSkuPreviewText(
      summary.skuItems,
      getRackPreviewDensity(summary.slotCount)
    );
    delete summary.skuMap;
  });

  return map;
};

const buildRackHierarchy = (rackSummaries = []) => {
  const floorMap = new Map();

  rackSummaries.forEach((rack) => {
    const floorKey = String(rack.floorNumber);
    const blockCode = String(rack.blockCode || "").toUpperCase();
    const blockKey = `${floorKey}__${blockCode}`;

    if (!floorMap.has(floorKey)) {
      floorMap.set(floorKey, {
        key: floorKey,
        floorNumber: rack.floorNumber,
        floorLabel: rack.floorLabel || `Lantai ${rack.floorNumber}`,
        blockMap: new Map(),
        rackCount: 0,
        slotCount: 0,
        filledSlotCount: 0,
        totalQty: 0,
      });
    }

    const floorGroup = floorMap.get(floorKey);
    floorGroup.rackCount += 1;
    floorGroup.slotCount += Number(rack.slotCount || 0);
    floorGroup.filledSlotCount += Number(rack.filledSlotCount || 0);
    floorGroup.totalQty += Number(rack.totalQty || 0);

    if (!floorGroup.blockMap.has(blockKey)) {
      floorGroup.blockMap.set(blockKey, {
        key: blockKey,
        blockCode,
        blockLabel: rack.blockLabel || `Blok ${blockCode}`,
        racks: [],
        rackCount: 0,
        slotCount: 0,
        filledSlotCount: 0,
        totalQty: 0,
      });
    }

    const blockGroup = floorGroup.blockMap.get(blockKey);
    blockGroup.rackCount += 1;
    blockGroup.slotCount += Number(rack.slotCount || 0);
    blockGroup.filledSlotCount += Number(rack.filledSlotCount || 0);
    blockGroup.totalQty += Number(rack.totalQty || 0);
    blockGroup.racks.push(rack);
  });

  return Array.from(floorMap.values())
    .sort((left, right) => Number(left.floorNumber || 0) - Number(right.floorNumber || 0))
    .map((floorGroup) => {
      const blocks = Array.from(floorGroup.blockMap.values())
        .sort((left, right) => String(left.blockCode).localeCompare(String(right.blockCode)))
        .map((blockGroup) => ({
          ...blockGroup,
          racks: [...blockGroup.racks].sort(
            (left, right) => Number(left.rackNumber || 0) - Number(right.rackNumber || 0)
          ),
        }));

      return {
        ...floorGroup,
        blockCount: blocks.length,
        blocks,
      };
    });
};

const buildSlotHierarchy = (slots = []) => {
  const floorMap = new Map();

  slots.forEach((slot) => {
    const floorKey = String(slot.floorNumber);
    const blockCode = String(slot.blockCode || "").toUpperCase();
    const blockKey = `${floorKey}__${blockCode}`;

    if (!floorMap.has(floorKey)) {
      floorMap.set(floorKey, {
        key: floorKey,
        floorNumber: slot.floorNumber,
        floorLabel: slot.floorLabel || `Lantai ${slot.floorNumber}`,
        blockMap: new Map(),
        slotCount: 0,
        filledSlotCount: 0,
        totalQty: 0,
      });
    }

    const floorGroup = floorMap.get(floorKey);
    floorGroup.slotCount += 1;
    floorGroup.totalQty += Number(slot.totalQty || 0);
    if (Number(slot.totalQty || 0) > 0) {
      floorGroup.filledSlotCount += 1;
    }

    if (!floorGroup.blockMap.has(blockKey)) {
      floorGroup.blockMap.set(blockKey, {
        key: blockKey,
        blockCode,
        blockLabel: slot.blockLabel || `Blok ${blockCode}`,
        slots: [],
        slotCount: 0,
        filledSlotCount: 0,
        totalQty: 0,
      });
    }

    const blockGroup = floorGroup.blockMap.get(blockKey);
    blockGroup.slotCount += 1;
    blockGroup.totalQty += Number(slot.totalQty || 0);
    if (Number(slot.totalQty || 0) > 0) {
      blockGroup.filledSlotCount += 1;
    }
    blockGroup.slots.push(slot);
  });

  return Array.from(floorMap.values())
    .sort((left, right) => Number(left.floorNumber || 0) - Number(right.floorNumber || 0))
    .map((floorGroup) => {
      const blocks = Array.from(floorGroup.blockMap.values())
        .sort((left, right) => String(left.blockCode).localeCompare(String(right.blockCode)))
        .map((blockGroup) => ({
          ...blockGroup,
          slots: [...blockGroup.slots].sort(
            (left, right) =>
              Number(left.rackNumber || 0) - Number(right.rackNumber || 0) ||
              Number(left.rowNumber || 0) - Number(right.rowNumber || 0) ||
              String(left.slotCode).localeCompare(String(right.slotCode))
          ),
        }));

      return {
        ...floorGroup,
        blockCount: blocks.length,
        blocks,
      };
    });
};

const drawPdfChip = (doc, text, x, y, options = {}) => {
  const {
    fillColor = [237, 244, 255],
    textColor = [36, 88, 206],
    borderColor = [215, 228, 244],
  } = options;
  const safeText = String(text || "");
  const textWidth = doc.getTextWidth(safeText);
  const width = Math.max(textWidth + 8, 24);

  doc.setFillColor(...fillColor);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(x, y, width, 7, 3.5, 3.5, "FD");
  doc.setTextColor(...textColor);
  doc.setFontSize(8);
  doc.text(safeText, x + width / 2, y + 4.7, { align: "center" });

  return width;
};

const drawPdfLayoutPage = ({
  doc,
  layout,
  floor,
  block,
  canvas,
  rackItems,
  rackSummaryByKey,
  selectedSkuLabel,
}) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const headerX = margin;
  const headerY = 12;
  const headerWidth = pageWidth - margin * 2;
  const headerHeight = 22;
  const mapX = margin;
  const mapY = headerY + headerHeight + 6;
  const mapWidth = pageWidth - margin * 2;
  const mapHeight = 98;
  const generatedAtLabel = new Date().toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  doc.setFillColor(249, 251, 255);
  doc.setDrawColor(219, 230, 244);
  doc.roundedRect(headerX, headerY, headerWidth, headerHeight, 7, 7, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.text(layout.name || "Layout Gudang", headerX + 6, headerY + 8);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text(
    `${floor.label || `Lantai ${floor.number}`} | ${block.label || `Blok ${block.code}`} | Dibuat ${generatedAtLabel}`,
    headerX + 6,
    headerY + 14
  );

  let chipX = headerX + 6;
  chipX += drawPdfChip(doc, `Grid ${canvas.columns} x ${canvas.rows}`, chipX, headerY + 16);
  chipX += 3;
  chipX += drawPdfChip(doc, `Rak ${rackItems.length}`, chipX, headerY + 16, {
    fillColor: [255, 255, 255],
    textColor: [71, 98, 127],
    borderColor: [216, 229, 241],
  });

  if (selectedSkuLabel) {
    chipX += 3;
    drawPdfChip(doc, `Highlight SKU: ${truncateText(selectedSkuLabel, 32)}`, chipX, headerY + 16, {
      fillColor: [236, 253, 245],
      textColor: [15, 118, 110],
      borderColor: [183, 228, 216],
    });
  }

  doc.setFillColor(252, 253, 255);
  doc.setDrawColor(217, 228, 242);
  doc.roundedRect(mapX, mapY, mapWidth, mapHeight, 8, 8, "FD");

  doc.setDrawColor(230, 238, 248);
  doc.setLineWidth(0.18);
  for (let column = 1; column < canvas.columns; column += 1) {
    const x = mapX + (column / canvas.columns) * mapWidth;
    doc.line(x, mapY, x, mapY + mapHeight);
  }
  for (let row = 1; row < canvas.rows; row += 1) {
    const y = mapY + (row / canvas.rows) * mapHeight;
    doc.line(mapX, y, mapX + mapWidth, y);
  }

  rackItems.forEach(({ rack, position }) => {
    const rackKey = buildRackKey(layout.id, floor.number, block.code, rack.number);
    const rackSummary = rackSummaryByKey[rackKey];
    const x = mapX + ((position.x - 1) / canvas.columns) * mapWidth;
    const y = mapY + ((position.y - 1) / canvas.rows) * mapHeight;
    const width = (position.w / canvas.columns) * mapWidth;
    const height = (position.h / canvas.rows) * mapHeight;
    const density =
      width <= 22 || height <= 16 ? "micro" : width <= 34 || height <= 24 ? "compact" : "regular";
    const slotCodesText = rackSummary?.slotCodes?.join(", ") || `${rack.rows} slot`;
    const previewText = rackSummary?.previewText || "Kosong";
    const slotFontSize = density === "micro" ? 4.2 : density === "compact" ? 5 : 5.7;
    const slotLineHeight = density === "micro" ? 2.1 : 2.6;
    const slotLines = clampPdfLines(
      doc.splitTextToSize(slotCodesText, Math.max(width - 5, 14)),
      density === "micro" ? 3 : 2
    );
    const previewFontSize = density === "micro" ? 5.4 : density === "compact" ? 6 : 6.8;
    const previewLines = clampPdfLines(
      doc.splitTextToSize(previewText, Math.max(width - 5, 14)),
      density === "regular" ? 2 : 1
    );
    const footerText = rackSummary
      ? `${rackSummary.filledSlotCount}/${rackSummary.slotCount} baris | ${rackSummary.totalQty} pcs`
      : `${rack.rows} baris`;

    if (rackSummary?.hasSelectedSku) {
      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(15, 118, 110);
    } else if (rackSummary?.totalQty) {
      doc.setFillColor(248, 250, 255);
      doc.setDrawColor(36, 88, 206);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(191, 219, 254);
    }

    doc.roundedRect(x, y, width, height, 4, 4, "FD");

    doc.setFillColor(rackSummary?.hasSelectedSku ? 15 : 36, rackSummary?.hasSelectedSku ? 118 : 88, rackSummary?.hasSelectedSku ? 110 : 206);
    doc.roundedRect(x + 2, y + 1, Math.max(width - 4, 2), 1.2, 1, 1, "F");

    doc.setTextColor(18, 53, 91);
    doc.setFontSize(density === "micro" ? 7 : 8.5);
    doc.text(`R${formatRackNumber(rack.number)}`, x + width / 2, y + 6, { align: "center" });

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(density === "micro" ? 5.2 : 6.2);
    doc.text(
      truncateText(rack.label || `${rack.rows} baris`, density === "micro" ? 12 : 20),
      x + width / 2,
      y + 10,
      { align: "center", maxWidth: Math.max(width - 6, 12) }
    );

    const contentBottomLimit = y + height - 4.8;
    const slotStartY = y + 13.2;

    doc.setTextColor(37, 99, 235);
    doc.setFontSize(slotFontSize);
    slotLines.forEach((line, index) => {
      const lineY = slotStartY + index * slotLineHeight;
      if (lineY <= contentBottomLimit) {
        doc.text(line, x + width / 2, lineY, {
          align: "center",
          maxWidth: Math.max(width - 5, 14),
        });
      }
    });

    const previewStartY = slotStartY + slotLines.length * slotLineHeight + 1;
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(previewFontSize);
    previewLines.forEach((line, index) => {
      const lineY =
        previewStartY + index * (density === "micro" ? 2.5 : density === "compact" ? 2.8 : 3.1);
      if (lineY <= contentBottomLimit) {
        doc.text(line, x + width / 2, lineY, { align: "center", maxWidth: Math.max(width - 5, 14) });
      }
    });

    doc.setTextColor(71, 98, 127);
    doc.setFontSize(5.8);
    doc.text(footerText, x + width / 2, y + height - 2.5, {
      align: "center",
      maxWidth: Math.max(width - 5, 14),
    });
  });

  const blockRows = rackItems.map(({ rack }) => {
    const rackKey = buildRackKey(layout.id, floor.number, block.code, rack.number);
    const rackSummary = rackSummaryByKey[rackKey];

    return {
      hasSelectedSku: Boolean(rackSummary?.hasSelectedSku),
      row: [
        `Rak ${formatRackNumber(rack.number)}\n${rack.label || "Tanpa label"}`,
        rackSummary?.slotCodes?.join(", ") || "-",
        rackSummary?.skuItems?.length
          ? rackSummary.skuItems
              .map(
                (item) =>
                  `${item.label} (${item.qty} pcs) - ${item.slotCodes.join(", ")}`
              )
              .join("\n")
          : "Kosong",
        `${rackSummary?.totalQty || 0} pcs`,
      ],
    };
  });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text("Daftar SKU per Rak", margin, mapY + mapHeight + 8);

  doc.autoTable({
    startY: mapY + mapHeight + 11,
    head: [["Rak", "Slot", "SKU di Rak", "Qty"]],
    body: blockRows.map((item) => item.row),
    theme: "grid",
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [219, 230, 244],
      lineWidth: 0.2,
      textColor: [22, 50, 79],
      valign: "middle",
    },
    headStyles: {
      fillColor: [36, 88, 206],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 255],
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 46 },
      2: { cellWidth: pageWidth - margin * 2 - 96 },
      3: { cellWidth: 20, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;

      const rowData = blockRows[data.row.index];
      if (!rowData?.hasSelectedSku) return;

      data.cell.styles.fillColor = [236, 253, 245];
      data.cell.styles.textColor = [15, 95, 89];
    },
  });

  if (doc.lastAutoTable?.finalY && doc.lastAutoTable.finalY < pageHeight - 8) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text(
      "Ringkasan ini mengikuti layout aktif dan menampilkan SKU pada setiap rak.",
      margin,
      doc.lastAutoTable.finalY + 6
    );
  }
};

const downloadLayoutPdf = ({ layout, rackSummaries, selectedSkuLabel = "" }) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const rackSummaryByKey = rackSummaries.reduce((map, summary) => {
    map[summary.key] = summary;
    return map;
  }, {});
  const floors = [...(layout?.floors || [])].sort((left, right) => left.number - right.number);
  let hasRenderedPage = false;

  floors.forEach((floor) => {
    [...(floor.blocks || [])]
      .sort((left, right) => String(left.code).localeCompare(String(right.code)))
      .forEach((block) => {
        const rackItems = getOrderedRacksForBlock(block);

        if (!hasRenderedPage) {
          hasRenderedPage = true;
        } else {
          doc.addPage("a4", "landscape");
        }

        drawPdfLayoutPage({
          doc,
          layout,
          floor,
          block,
          canvas: normalizeBlockCanvas(block),
          rackItems,
          rackSummaryByKey,
          selectedSkuLabel,
        });
      });
  });

  if (!hasRenderedPage) {
    doc.setFontSize(16);
    doc.text(layout?.name || "Layout Gudang", 14, 20);
    doc.setFontSize(11);
    doc.text("Layout belum memiliki blok atau rak untuk dicetak.", 14, 30);
  }

  const safeName = String(layout?.name || "layout-gudang")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  doc.save(`layout-${safeName || "gudang"}-${timestamp}.pdf`);
};

const StokLokasiGudang = () => {
  const { state, isLoading, error } = useGudangProdukWorkspace();
  const [layoutId, setLayoutId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [skuFilter, setSkuFilter] = useState("");
  const [skuQuery, setSkuQuery] = useState("");
  const [isSkuDropdownOpen, setIsSkuDropdownOpen] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [expandedRackKey, setExpandedRackKey] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState(null);
  const skuComboboxRef = useRef(null);
  const focusedSkuLineRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!skuComboboxRef.current?.contains(e.target)) setIsSkuDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredSkus = useMemo(() => {
    const kw = skuQuery.trim().toLowerCase();
    if (!kw) return state.skus;
    return state.skus.filter((sku) =>
      String(sku.label || "").toLowerCase().includes(kw) ||
      String(sku.code || "").toLowerCase().includes(kw)
    );
  }, [state.skus, skuQuery]);

  useEffect(() => {
    if (!layoutId && state.layouts.length) {
      setLayoutId(state.layouts[0].id);
    }
  }, [layoutId, state.layouts]);

  const selectedLayout = useMemo(
    () => state.layouts.find((layout) => layout.id === layoutId) || state.layouts[0] || null,
    [layoutId, state.layouts]
  );
  const selectedSkuLabel = useMemo(
    () =>
      state.skus.find((sku) => String(sku.id) === String(skuFilter))?.label || "",
    [skuFilter, state.skus]
  );

  const stockSummaryBySlot = useMemo(() => getSlotStockSummaryMap(state), [state]);
  const slotRows = useMemo(() => {
    const slots = getAllSlots(state).map((slot) => {
      const summary = stockSummaryBySlot[slot.id];
      return {
        ...slot,
        totalQty: summary?.qty || 0,
        skuCount: summary?.skuCount || 0,
        lines: summary?.lines || [],
      };
    });

    return slots.filter((slot) => (selectedLayout ? slot.layoutId === selectedLayout.id : true));
  }, [selectedLayout, state, stockSummaryBySlot]);
  const rackSummaryByKey = useMemo(
    () => buildRackSummaryMap(slotRows, skuFilter),
    [slotRows, skuFilter]
  );
  const rackSummaries = useMemo(
    () =>
      Object.values(rackSummaryByKey).sort(
        (left, right) =>
          Number(right.hasSelectedSku) - Number(left.hasSelectedSku) ||
          left.floorNumber - right.floorNumber ||
          String(left.blockCode).localeCompare(String(right.blockCode)) ||
          left.rackNumber - right.rackNumber
      ),
    [rackSummaryByKey]
  );
  const rackHierarchy = useMemo(() => buildRackHierarchy(rackSummaries), [rackSummaries]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return slotRows.filter((slot) => {
      const matchSearch =
        !term ||
        slot.slotCode.toLowerCase().includes(term) ||
        String(slot.alias || "").toLowerCase().includes(term) ||
        String(slot.blockCode || "").toLowerCase().includes(term) ||
        String(slot.rackLabel || "").toLowerCase().includes(term) ||
        slot.lines.some(
          (line) =>
            line.sku?.label?.toLowerCase().includes(term) ||
            line.sku?.code?.toLowerCase().includes(term) ||
            line.product?.name?.toLowerCase().includes(term)
        );

      const matchSku =
        !skuFilter || slot.lines.some((line) => String(line.skuId) === String(skuFilter));
      const matchFilled = showEmpty || slot.totalQty > 0;
      const selectedSlotLinesForFilter = selectedSlot
        ? stockSummaryBySlot[selectedSlot.id]?.lines || selectedSlot.lines || []
        : [];
      const selectedSlotMatchesSku =
        selectedSlot &&
        skuFilter &&
        selectedSlotLinesForFilter.some((line) => String(line.skuId) === String(skuFilter));
      const matchSelectedSlot =
        !selectedSlot || (skuFilter && !selectedSlotMatchesSku) || slot.id === selectedSlot.id;

      return matchSearch && matchSku && matchFilled && matchSelectedSlot;
    });
  }, [searchTerm, selectedSlot, showEmpty, skuFilter, slotRows, stockSummaryBySlot]);
  const slotHierarchy = useMemo(() => buildSlotHierarchy(filteredRows), [filteredRows]);

  const highlightedSlotIds = useMemo(
    () =>
      skuFilter
        ? slotRows
            .filter((slot) => slot.lines.some((line) => String(line.skuId) === String(skuFilter)))
            .map((slot) => slot.id)
        : [],
    [skuFilter, slotRows]
  );
  const skuAutoFocusSlot = useMemo(
    () =>
      skuFilter
        ? slotRows.find((slot) =>
            slot.lines.some((line) => String(line.skuId) === String(skuFilter))
          ) || null
        : null,
    [skuFilter, slotRows]
  );
  const selectedSlotMatchesSkuFilter = useMemo(
    () =>
      Boolean(
        selectedSlot &&
          skuFilter &&
          (stockSummaryBySlot[selectedSlot.id]?.lines || selectedSlot.lines || []).some(
            (line) => String(line.skuId) === String(skuFilter)
          )
      ),
    [selectedSlot, skuFilter, stockSummaryBySlot]
  );
  const focusedSlot = useMemo(() => {
    if (!skuFilter) {
      return selectedSlot;
    }

    return selectedSlotMatchesSkuFilter ? selectedSlot : skuAutoFocusSlot;
  }, [selectedSlot, selectedSlotMatchesSkuFilter, skuAutoFocusSlot, skuFilter]);
  const focusedSlotLines = useMemo(() => {
    const lines = focusedSlot ? stockSummaryBySlot[focusedSlot.id]?.lines || [] : [];

    if (!skuFilter) {
      return lines;
    }

    return [...lines].sort((left, right) => {
      const leftIsMatch = String(left.skuId) === String(skuFilter) ? 1 : 0;
      const rightIsMatch = String(right.skuId) === String(skuFilter) ? 1 : 0;

      return (
        rightIsMatch - leftIsMatch ||
        Number(right.qty || 0) - Number(left.qty || 0) ||
        String(left.sku?.label || "").localeCompare(String(right.sku?.label || ""))
      );
    });
  }, [focusedSlot, skuFilter, stockSummaryBySlot]);
  const focusedSlotHasSkuFilter = useMemo(
    () =>
      Boolean(
        skuFilter &&
          focusedSlotLines.some((line) => String(line.skuId) === String(skuFilter))
      ),
    [focusedSlotLines, skuFilter]
  );
  const selectedRackKey = useMemo(
    () =>
      focusedSlot
        ? buildRackKey(
            focusedSlot.layoutId,
            focusedSlot.floorNumber,
            focusedSlot.blockCode,
            focusedSlot.rackNumber
          )
        : "",
    [focusedSlot]
  );

  const summary = {
    slotCount: filteredRows.length,
    filledSlots: filteredRows.filter((slot) => slot.totalQty > 0).length,
    emptySlots: filteredRows.filter((slot) => slot.totalQty === 0).length,
    totalQty: filteredRows.reduce((total, slot) => total + slot.totalQty, 0),
  };

  useEffect(() => {
    if (selectedSlot && selectedLayout && selectedSlot.layoutId !== selectedLayout.id) {
      setSelectedSlot(null);
    }
  }, [selectedLayout, selectedSlot]);

  useEffect(() => {
    if (!focusedSlotHasSkuFilter) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      focusedSkuLineRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }, 80);

    return () => window.clearTimeout(timerId);
  }, [focusedSlot?.id, focusedSlotHasSkuFilter, skuFilter]);

  const handleDownloadPdf = () => {
    if (!selectedLayout || isExportingPdf) {
      return;
    }

    try {
      setIsExportingPdf(true);
      setPdfFeedback(null);
      downloadLayoutPdf({
        layout: selectedLayout,
        rackSummaries,
        selectedSkuLabel,
      });
      setPdfFeedback({
        type: "success",
        message: `PDF layout ${selectedLayout.name} berhasil disiapkan dan diunduh.`,
      });
    } catch (pdfError) {
      console.error("Gagal membuat PDF layout gudang:", pdfError);
      setPdfFeedback({
        type: "error",
        message: "Gagal membuat PDF layout. Coba ulangi lagi.",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <GudangProdukBaseShell
      title="Stok per Lokasi Gudang"
      subtitle="Lihat isi setiap slot gudang berdasarkan layout visual. Filter dapat mempersempit tampilan per gudang, per SKU, atau langsung dari slot di peta."
      icon={FaBoxes}
      statusLabel={isLoading ? "Memuat workspace..." : `${summary.filledSlots} slot terisi`}
      headerActions={[
        {
          key: "download-layout-pdf",
          label: isExportingPdf ? "Menyiapkan PDF..." : "Download PDF Layout",
          icon: FaDownload,
          variant: "primary",
          onClick: handleDownloadPdf,
        },
      ]}
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Cari slot, alias, SKU, atau produk..."
    >
      {error ? (
        <div className="gudang-ui-empty-panel" style={{ marginBottom: 20 }}>
          {error}
        </div>
      ) : null}

      <div className="gudang-ui-stat-grid">
        <GudangStatCard label="Slot Ditampilkan" value={summary.slotCount} helper="hasil filter aktif" />
        <GudangStatCard label="Slot Terisi" value={summary.filledSlots} helper="lokasi dengan stok" />
        <GudangStatCard label="Slot Kosong" value={summary.emptySlots} helper="tetap terlihat bila diaktifkan" />
        <GudangStatCard label="Total Qty" value={summary.totalQty} helper="qty semua slot hasil filter" />
      </div>

      <div className="gudang-master-workspace-grid">
        <div className="gudang-master-main" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head">
              <div>
                <h2>1. Filter Lokasi</h2>
                <p>Pilih gudang dan SKU, lalu klik slot di peta bila ingin fokus ke satu lokasi.</p>
              </div>
            </div>

            <div className="gudang-ui-form-grid">
              <div className="gudang-ui-field">
                <label>Gudang Produk</label>
                <select value={layoutId} onChange={(event) => setLayoutId(event.target.value)}>
                  {state.layouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="gudang-ui-field" style={{ position: "relative" }} ref={skuComboboxRef}>
                <label>Filter SKU</label>
                <div style={{ position: "relative" }}>
                  <FaSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                  <input
                    type="text"
                    className="gudang-ui-search-input"
                    style={{ paddingLeft: 40, width: "100%", background: "#fff", cursor: "pointer" }}
                    value={skuQuery}
                    onChange={(e) => {
                      setSkuQuery(e.target.value);
                      setIsSkuDropdownOpen(true);
                      if (skuFilter) setSkuFilter("");
                    }}
                    onFocus={() => setIsSkuDropdownOpen(true)}
                    placeholder={selectedSkuLabel ? truncateText(selectedSkuLabel, 35) : "Cari dan pilih SKU..."}
                  />
                  {skuFilter && !skuQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSkuFilter("");
                        setSkuQuery("");
                      }}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
                    ><FaTimes /></button>
                  )}
                </div>

                {isSkuDropdownOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                    background: "#fff", border: "1px solid #d1dbe8", borderRadius: 10,
                    padding: 8, maxHeight: 280, overflowY: "auto",
                    boxShadow: "0 10px 25px rgba(15,23,42,0.1)",
                  }}>
                    {filteredSkus.length ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { setSkuFilter(""); setSkuQuery(""); setIsSkuDropdownOpen(false); }}
                          style={{
                            width: "100%", display: "block", textAlign: "left", border: "none",
                            background: skuFilter === "" ? "#f0fdf4" : "transparent",
                            color: skuFilter === "" ? "#166534" : "#0f172a",
                            borderRadius: 6, padding: "8px 12px", cursor: "pointer", marginBottom: 2,
                            fontWeight: skuFilter === "" ? 700 : 500, fontSize: 13
                          }}
                        >
                          Semua SKU
                        </button>
                        {filteredSkus.map((sku) => (
                          <button
                            key={sku.id}
                            type="button"
                            onClick={() => {
                              setSkuFilter(String(sku.id));
                              setSkuQuery("");
                              setIsSkuDropdownOpen(false);
                            }}
                            style={{
                              width: "100%", display: "block", textAlign: "left", border: "none",
                              background: String(skuFilter) === String(sku.id) ? "linear-gradient(135deg,#edf4ff,#f0f9ff)" : "transparent",
                              borderRadius: 6, padding: "8px 12px", cursor: "pointer", marginBottom: 2,
                            }}
                          >
                            <div style={{ fontWeight: String(skuFilter) === String(sku.id) ? 700 : 500, fontSize: 13, color: "#0f172a" }}>
                              {sku.label}
                            </div>
                            {sku.code && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{sku.code}</div>}
                          </button>
                        ))}
                      </>
                    ) : (
                      <div style={{ padding: "8px 12px", color: "#64748b", fontSize: 13 }}>
                        SKU tidak ditemukan.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="gudang-ui-form-actions">
              <button
                type="button"
                className="gudang-ui-button-secondary"
                onClick={() => setShowEmpty((prev) => !prev)}
              >
                <FaBoxes /> {showEmpty ? "Sembunyikan Slot Kosong" : "Tampilkan Slot Kosong"}
              </button>
              {selectedSlot ? (
                <button
                  type="button"
                  className="gudang-ui-button-secondary"
                  onClick={() => setSelectedSlot(null)}
                >
                  Reset Fokus Slot
                </button>
              ) : null}
            </div>

            {skuFilter ? (
              <div className="gudang-ui-callout gudang-ui-callout-highlight" style={{ marginTop: 16 }}>
                <strong>Highlight SKU aktif</strong>
                <div style={{ marginTop: 6 }}>
                  {selectedSkuLabel || "SKU terpilih"} ditemukan di {highlightedSlotIds.length} lokasi pada peta.
                </div>
              </div>
            ) : null}

            {pdfFeedback ? (
              <div
                className="gudang-ui-callout"
                style={{
                  marginTop: 16,
                  background:
                    pdfFeedback.type === "error"
                      ? "linear-gradient(135deg, rgba(254, 226, 226, 0.9), rgba(255, 255, 255, 0.98))"
                      : "linear-gradient(135deg, rgba(236, 253, 245, 0.95), rgba(255, 255, 255, 0.98))",
                  borderColor:
                    pdfFeedback.type === "error" ? "rgba(220, 38, 38, 0.12)" : "rgba(15, 118, 110, 0.12)",
                  color: pdfFeedback.type === "error" ? "#991b1b" : "#0f5f59",
                }}
              >
                <strong>{pdfFeedback.type === "error" ? "PDF gagal dibuat" : "PDF berhasil dibuat"}</strong>
                <div style={{ marginTop: 6 }}>{pdfFeedback.message}</div>
              </div>
            ) : null}
          </section>

          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head">
              <div>
                <h2>2. Peta Visual Lokasi</h2>
              <p>Klik pada slot di peta untuk menyorot isinya di panel sebelah kanan.</p>
              </div>
            </div>
            <GudangLayoutMap
              layout={selectedLayout}
              selectedSlotId={focusedSlot?.id}
              onSelectSlot={setSelectedSlot}
              stockSummaryBySlot={stockSummaryBySlot}
              highlightedSlotIds={highlightedSlotIds}
            />
          </section>

          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head">
              <div>
                <h2>3. Daftar Lengkap Slot</h2>
                <p>Ringkasan stok per lokasi berdasarkan data workspace yang aktif.</p>
              </div>
            </div>

            {filteredRows.length ? (
              <div className="gudang-ui-table-shell">
                <table className="gudang-ui-table">
                  <thead>
                    <tr>
                      <th>Lokasi</th>
                      <th>Detail Rak</th>
                      <th>Stok</th>
                      <th>Isi Varian SKU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotHierarchy.map((floorGroup) => (
                      <React.Fragment key={floorGroup.key}>
                        <tr className="gudang-stoklokasi-table-floor-row">
                          <td colSpan={4}>
                            <div className="gudang-stoklokasi-table-group-line">
                              <strong>{floorGroup.floorLabel}</strong>
                              <span>
                                {floorGroup.blockCount} blok &middot; {floorGroup.filledSlotCount}/
                                {floorGroup.slotCount} slot terisi &middot; {floorGroup.totalQty} pcs
                              </span>
                            </div>
                          </td>
                        </tr>
                        {floorGroup.blocks.map((blockGroup) => (
                          <React.Fragment key={blockGroup.key}>
                            <tr className="gudang-stoklokasi-table-block-row">
                              <td colSpan={4}>
                                <div className="gudang-stoklokasi-table-group-line">
                                  <strong>{blockGroup.blockLabel}</strong>
                                  <span>
                                    {blockGroup.filledSlotCount}/{blockGroup.slotCount} slot terisi
                                    &middot; {blockGroup.totalQty} pcs
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {blockGroup.slots.map((slot) => (
                              <tr
                                key={slot.id}
                                style={
                                  selectedSlot?.id === slot.id ? { backgroundColor: "#f0fdf4" } : {}
                                }
                              >
                                <td>
                                  <strong>{slot.slotCode}</strong>
                                  <div style={{ marginTop: 6, color: "#6b7f95" }}>
                                    Lantai {slot.floorNumber} | Blok {slot.blockCode} | Baris{" "}
                                    {slot.rowNumber}
                                  </div>
                                </td>
                                <td>
                                  Rak {String(slot.rackNumber).padStart(2, "0")}
                                  <div style={{ marginTop: 6, color: "#6b7f95" }}>
                                    {slot.rackLabel || "Tanpa Label"}
                                  </div>
                                </td>
                                <td>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: slot.totalQty ? "#0f172a" : "#94a3b8",
                                    }}
                                  >
                                    {slot.totalQty} pcs
                                  </span>
                                </td>
                                <td>
                                  {slot.lines.length ? (
                                    <div className="gudang-ui-pill-list gudang-stoklokasi-slot-pill-shell">
                                      {slot.lines.map((line) => (
                                        <span
                                          key={line.id}
                                          className="gudang-ui-pill"
                                          style={
                                            skuFilter === String(line.skuId)
                                              ? { background: "#ecfdf5", color: "#0f766e" }
                                              : {}
                                          }
                                        >
                                          {line.sku?.label} | {line.qty}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ color: "#6b7f95" }}>Kosong</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="gudang-ui-empty-panel">
                <FaSearchLocation style={{ marginBottom: 10, fontSize: 24, color: "#94a3b8" }} />
                <div>Tidak ada slot yang cocok dengan filter saat ini.</div>
              </div>
            )}
          </section>
        </div>

        <div className="gudang-master-visual-stack">
          {focusedSlot || skuFilter ? (
            <div className="gudang-ui-panel" style={{ position: "sticky", top: 20 }}>
              <div className="gudang-ui-panel-head" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ color: "#0f766e" }}>
                    {focusedSlot ? `Slot Fokus: ${focusedSlot.slotCode}` : "Slot Fokus"}
                  </h2>
                  <p>
                    {focusedSlot
                      ? buildSlotHeadline(focusedSlot)
                      : `${selectedSkuLabel || "SKU terpilih"} belum ditemukan pada layout ini.`}
                  </p>
                </div>
              </div>

              {focusedSlot ? (
                focusedSlotLines.length > 0 ? (
                  <div className="gudang-stoklokasi-focus-list">
                    {focusedSlotLines.map((line) => {
                      const isHighlightedSku = Boolean(
                        skuFilter && String(line.skuId) === String(skuFilter)
                      );

                      return (
                        <div
                          key={line.id}
                          ref={isHighlightedSku ? focusedSkuLineRef : null}
                          className={`gudang-stoklokasi-focus-row ${
                            isHighlightedSku ? "sku-highlight" : ""
                          }`}
                        >
                          <span className="gudang-stoklokasi-focus-sku">
                            {line.sku?.label}
                            {isHighlightedSku ? <small>SKU difilter</small> : null}
                          </span>
                          <span className="gudang-stoklokasi-focus-qty">{line.qty} pcs</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="gudang-ui-empty-panel" style={{ padding: "30px 10px" }}>
                    <p style={{ margin: 0, fontSize: 13 }}>Slot ini masih kosong.</p>
                  </div>
                )
              ) : (
                <div className="gudang-ui-empty-panel" style={{ padding: "30px 10px" }}>
                  <p style={{ margin: 0, fontSize: 13 }}>
                    SKU ini belum punya stok pada layout/filter aktif.
                  </p>
                </div>
              )}
              
              <button
                type="button"
                className="gudang-ui-button-secondary"
                style={{ width: "100%", marginTop: 20 }}
                onClick={() => {
                  setSelectedSlot(null);
                  if (skuFilter) {
                    setSkuFilter("");
                    setSkuQuery("");
                  }
                }}
              >
                {skuFilter ? "Bersihkan Filter SKU" : "Tutup Fokus Slot"}
              </button>
            </div>
          ) : (

          <div className="gudang-ui-panel">
            <div className="gudang-ui-panel-head" style={{ marginBottom: 12 }}>
              <div>
                <h2>Ringkasan per Rak</h2>
                <p>Lihat per lantai, per blok, lalu per rak supaya alur bacanya lebih cepat.</p>
              </div>
            </div>

            {rackHierarchy.length ? (
              <div className="gudang-ui-rack-collection gudang-stoklokasi-rack-collection">
                <div className="gudang-stoklokasi-group-stack">
                  {rackHierarchy.map((floorGroup) => (
                    <section key={floorGroup.key} className="gudang-stoklokasi-floor-group">
                      <div className="gudang-stoklokasi-floor-head">
                        <div>
                          <h3>{floorGroup.floorLabel}</h3>
                          <p>
                            {floorGroup.blockCount} blok &middot; {floorGroup.rackCount} rak &middot;{" "}
                            {floorGroup.totalQty} pcs
                          </p>
                        </div>
                        <span className="gudang-ui-rack-mini-chip soft">
                          {floorGroup.filledSlotCount}/{floorGroup.slotCount} slot terisi
                        </span>
                      </div>

                      <div className="gudang-stoklokasi-block-stack">
                        {floorGroup.blocks.map((blockGroup) => (
                          <article key={blockGroup.key} className="gudang-stoklokasi-block-group">
                            <div className="gudang-stoklokasi-block-head">
                              <div className="gudang-stoklokasi-block-main">
                                <strong>{blockGroup.blockLabel}</strong>
                                <span>
                                  {blockGroup.rackCount} rak &middot; {blockGroup.filledSlotCount}/
                                  {blockGroup.slotCount} slot terisi
                                </span>
                              </div>
                              <div className="gudang-ui-rack-compact-meta">
                                <span
                                  className="gudang-ui-rack-mini-chip"
                                  style={{
                                    background: blockGroup.totalQty ? "#eff6ff" : "#f1f5f9",
                                    color: blockGroup.totalQty ? "#1e40af" : "#64748b",
                                  }}
                                >
                                  {blockGroup.totalQty} pcs
                                </span>
                                {blockGroup.totalQty ? (
                                  <span className="gudang-ui-rack-mini-chip soft">Aktif</span>
                                ) : (
                                  <span className="gudang-ui-rack-mini-chip soft">Kosong</span>
                                )}
                              </div>
                            </div>

                            <div className="gudang-ui-rack-grid-compact">
                              {blockGroup.racks.map((rack) => {
                                const isSelectedRack = selectedRackKey === rack.key;
                                const isExpandedRack = expandedRackKey === rack.key;
                                const previewItems = rack.skuItems.slice(0, 3);
                                const hiddenSkuCount = Math.max(rack.skuItems.length - previewItems.length, 0);
                                const firstSlotId = rack.slotEntries[0]?.slotId || "";
                                const focusRack = () => {
                                  if (!firstSlotId) {
                                    return;
                                  }

                                  const targetSlot = slotRows.find(
                                    (slot) => String(slot.id) === String(firstSlotId)
                                  );
                                  if (targetSlot) {
                                    setSelectedSlot(targetSlot);
                                  }
                                };

                                return (
                                  <article
                                    key={rack.key}
                                    className={`gudang-ui-rack-compact-card ${
                                      isSelectedRack ? "active" : ""
                                    }`}
                                    style={{
                                      background: rack.hasSelectedSku
                                        ? "linear-gradient(135deg, rgba(236, 253, 245, 0.96), #fff)"
                                        : undefined,
                                      borderColor: rack.hasSelectedSku ? "#b7e4d8" : undefined,
                                      boxShadow: isSelectedRack
                                        ? "0 0 0 3px rgba(36, 88, 206, 0.12)"
                                        : undefined,
                                    }}
                                  >
                                    <div className="gudang-ui-rack-compact-top">
                                      <div className="gudang-ui-rack-compact-main">
                                        <strong>Rak {formatRackNumber(rack.rackNumber)}</strong>
                                        <span>
                                          Lt.{rack.floorNumber} - Blk.{rack.blockCode} &middot;{" "}
                                          {rack.filledSlotCount}/{rack.slotCount} terisi
                                        </span>
                                        <span>{rack.skuItems.length} SKU aktif di rak ini</span>
                                      </div>
                                      <div className="gudang-ui-rack-compact-meta">
                                        <span
                                          className="gudang-ui-rack-mini-chip"
                                          style={{
                                            background: rack.totalQty ? "#eff6ff" : "#f1f5f9",
                                            color: rack.totalQty ? "#1e40af" : "#64748b",
                                          }}
                                        >
                                          {rack.totalQty} pcs
                                        </span>
                                        {rack.hasSelectedSku ? (
                                          <span className="gudang-ui-rack-mini-chip soft">
                                            Fokus SKU
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>

                                    <div className="gudang-stoklokasi-rack-preview">
                                      <div className="gudang-ui-chip-row" style={{ gap: 6 }}>
                                        {previewItems.map((item) => (
                                          <span
                                            key={`${rack.key}_${item.skuId || item.label}`}
                                            className="gudang-ui-pill"
                                            style={{
                                              fontSize: 11,
                                              padding: "4px 8px",
                                              background:
                                                skuFilter && String(item.skuId) === String(skuFilter)
                                                  ? "#ecfdf5"
                                                  : undefined,
                                              color:
                                                skuFilter && String(item.skuId) === String(skuFilter)
                                                  ? "#0f766e"
                                                  : undefined,
                                            }}
                                          >
                                            {item.label} <strong>({item.qty})</strong>
                                          </span>
                                        ))}
                                        {hiddenSkuCount > 0 ? (
                                          <span className="gudang-ui-rack-mini-chip soft">
                                            +{hiddenSkuCount} lainnya
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>

                                    <div
                                      className="gudang-stoklokasi-rack-actions"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        className="gudang-stoklokasi-rack-button secondary"
                                        onClick={focusRack}
                                      >
                                        <FaSearchLocation /> Fokus
                                      </button>
                                      <button
                                        type="button"
                                        className="gudang-stoklokasi-rack-button"
                                        onClick={() =>
                                          setExpandedRackKey((current) =>
                                            current === rack.key ? "" : rack.key
                                          )
                                        }
                                      >
                                        {isExpandedRack ? "Sembunyikan detail" : "Lihat detail"}
                                      </button>
                                    </div>

                                    {isExpandedRack ? (
                                      <div className="gudang-stoklokasi-rack-detail">
                                        {rack.skuItems.map((item) => (
                                          <div
                                            key={`${rack.key}_${item.skuId || item.label}_detail`}
                                            className="gudang-stoklokasi-rack-row"
                                          >
                                            <div className="gudang-stoklokasi-rack-row-main">
                                              <strong>{item.label}</strong>
                                              <span>
                                                {item.slotCodes.slice(0, 2).join(", ")}
                                                {item.slotCodes.length > 2
                                                  ? ` +${item.slotCodes.length - 2}`
                                                  : ""}
                                              </span>
                                            </div>
                                            <span className="gudang-stoklokasi-rack-row-qty">
                                              {item.qty} pcs
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </article>
                                );
                              })}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            ) : (
              <div className="gudang-ui-empty-panel">Belum ada rak tercatat pada sistem layout ini.</div>
            )}
          </div>
          )}
        </div>
      </div>
    </GudangProdukBaseShell>
  );
};

export default StokLokasiGudang;

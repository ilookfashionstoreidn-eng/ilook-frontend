import React, { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import {
  buildSlotsFromLayout,
  generateSlotCode,
  getOrderedRacksForBlock,
  getSlotStockSummaryMap,
  normalizeBlockCanvas,
} from "./GudangProdukMockStore";

export const formatGudangDate = (value) => {
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

export const countLayoutSummary = (layout, stockSummaryBySlot = {}) => {
  const slots = buildSlotsFromLayout(layout);

  return slots.reduce(
    (summary, slot) => {
      const slotSummary = stockSummaryBySlot[slot.id];

      summary.slotCount += 1;
      if (slotSummary) {
        summary.filledSlotCount += 1;
        summary.totalQty += slotSummary.qty;
      }

      return summary;
    },
    {
      slotCount: 0,
      filledSlotCount: 0,
      totalQty: 0,
    }
  );
};

export const buildLayoutOptionLabel = (layout) =>
  `${layout.name} | ${layout.floors?.length || 0} lantai`;

export const buildSlotHeadline = (slot) => {
  if (!slot) return "-";

  return `${slot.slotCode} | Lantai ${slot.floorNumber} / Blok ${slot.blockCode} / Rak ${String(
    slot.rackNumber
  ).padStart(2, "0")} / Baris ${slot.rowNumber}`;
};

export const getEmptyLayoutDraft = () => ({
  id: "",
  name: "",
  address: "",
  pic: "",
  description: "",
  slotAliases: {},
  floors: [],
});

export const GudangStatCard = ({ label, value, helper }) => (
  <div className="gudang-ui-stat-card">
    <span className="gudang-ui-stat-label">{label}</span>
    <strong className="gudang-ui-stat-value">{value}</strong>
    {helper ? <span className="gudang-ui-stat-helper">{helper}</span> : null}
  </div>
);

const buildCanvasStyle = (canvas) => ({
  "--gudang-canvas-columns": canvas.columns,
  "--gudang-canvas-rows": canvas.rows,
  "--gudang-canvas-column-size": `${100 / canvas.columns}%`,
  "--gudang-canvas-row-size": `${100 / canvas.rows}%`,
});

const buildRackCardStyle = (position, canvas) => ({
  left: `${((position.x - 1) / canvas.columns) * 100}%`,
  top: `${((position.y - 1) / canvas.rows) * 100}%`,
  width: `${(position.w / canvas.columns) * 100}%`,
  height: `${(position.h / canvas.rows) * 100}%`,
});

const shouldUseRackPopup = (position, rack) => {
  const width = Number(position?.w || 0);
  const height = Number(position?.h || 0);
  const availablePreviewRows = Math.max(height - 1, 1);

  return Number(rack?.rows || 0) > 1 && (Number(rack?.rows || 0) > availablePreviewRows || width <= 3);
};

const getRackCardDensity = (position) => {
  const width = Number(position?.w || 0);
  const height = Number(position?.h || 0);

  if (width <= 2 || (width <= 3 && height <= 3)) {
    return "micro";
  }

  if (width <= 3 || height <= 4) {
    return "compact";
  }

  return "regular";
};

export const GudangLayoutMap = ({
  layout,
  selectedSlotId,
  onSelectSlot,
  stockSummaryBySlot = {},
  highlightedSlotIds = [],
  interactive = true,
}) => {
  const [activeRackPopup, setActiveRackPopup] = useState(null);
  const highlightedSlotIdSet = useMemo(
    () => new Set((highlightedSlotIds || []).map((slotId) => String(slotId))),
    [highlightedSlotIds]
  );
  const hasHighlightedSkuFilter = highlightedSlotIdSet.size > 0;

  const slotLookup = useMemo(() => {
    const map = {};

    buildSlotsFromLayout(layout).forEach((slot) => {
      map[slot.id] = slot;
    });

    return map;
  }, [layout]);

  useEffect(() => {
    setActiveRackPopup(null);
  }, [layout, selectedSlotId]);

  if (!layout) {
    return <div className="gudang-ui-empty-panel">Pilih gudang terlebih dahulu.</div>;
  }

  if (!layout.floors?.length) {
    return (
      <div className="gudang-ui-empty-panel">
        Gudang ini belum punya layout. Tambahkan lantai, blok, dan rak untuk mulai membuat slot.
      </div>
    );
  }

  return (
    <div className="gudang-layout-map">
      {[...(layout.floors || [])]
        .sort((a, b) => a.number - b.number)
        .map((floor) => (
          <section key={floor.id} className="gudang-layout-floor">
            <div className="gudang-layout-floor-head">
              <div>
                <h3>{floor.label || `Lantai ${floor.number}`}</h3>
                <p>{(floor.blocks || []).length} blok aktif</p>
              </div>
            </div>

            <div className="gudang-layout-blocks">
              {[...(floor.blocks || [])]
                .sort((a, b) => String(a.code).localeCompare(String(b.code)))
                .map((block) => {
                  const canvas = normalizeBlockCanvas(block);
                  const rackItems = getOrderedRacksForBlock(block);
                  const blockSummary = rackItems.reduce(
                    (summary, { rack }) => {
                      summary.rackCount += 1;

                      for (let rowNumber = 1; rowNumber <= rack.rows; rowNumber += 1) {
                        const slotId = `${layout.id}__F${floor.number}__B${String(
                          block.code
                        ).toUpperCase()}__R${rack.number}__ROW${rowNumber}`;

                        summary.slotCount += 1;
                        if (stockSummaryBySlot[slotId]?.qty) {
                          summary.filledSlotCount += 1;
                        }
                        if (highlightedSlotIdSet.has(String(slotId))) {
                          summary.highlightedSlotCount += 1;
                        }
                      }

                      return summary;
                    },
                    {
                      rackCount: 0,
                      slotCount: 0,
                      filledSlotCount: 0,
                      highlightedSlotCount: 0,
                    }
                  );
                  const blockSummaryLabel = blockSummary.filledSlotCount
                    ? `${blockSummary.rackCount} rak aktif • ${blockSummary.filledSlotCount}/${blockSummary.slotCount} slot terisi`
                    : `${blockSummary.rackCount} rak aktif • ${blockSummary.slotCount} slot siap dipakai`;

                  return (
                    <article key={block.id} className="gudang-layout-block">
                      <div className="gudang-layout-block-head professional">
                        <div className="gudang-layout-block-title-group">
                          <span className="gudang-layout-block-kicker">Warehouse Blueprint</span>
                          <strong>{block.label || `Blok ${block.code}`}</strong>
                          <p className="gudang-layout-block-subtitle">{blockSummaryLabel}</p>
                        </div>

                        <div className="gudang-layout-block-meta">
                          <span className="gudang-layout-block-chip">
                            Grid {canvas.columns} x {canvas.rows}
                          </span>
                          <span className="gudang-layout-block-chip soft">Kode {block.code}</span>
                          {hasHighlightedSkuFilter ? (
                            <span
                              className={[
                                "gudang-layout-block-chip",
                                "highlight",
                                blockSummary.highlightedSlotCount ? "positive" : "muted",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {blockSummary.highlightedSlotCount
                                ? `${blockSummary.highlightedSlotCount} lokasi SKU`
                                : "SKU tidak ada"}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {rackItems.length ? (
                        <div className="gudang-layout-canvas" style={buildCanvasStyle(canvas)}>
                          {rackItems.map(({ rack, position }) => {
                            const slotItems = Array.from({ length: rack.rows }, (_, index) => {
                              const rowNumber = index + 1;
                              const slotId = `${layout.id}__F${floor.number}__B${String(
                                block.code
                              ).toUpperCase()}__R${rack.number}__ROW${rowNumber}`;
                              const slotCode = generateSlotCode(
                                floor.number,
                                block.code,
                                rack.number,
                                rowNumber
                              );
                              const slotSummary = stockSummaryBySlot[slotId];
                              const isSelected = selectedSlotId === slotId;
                              const hasStock = Boolean(slotSummary?.qty);
                              const isSkuHighlighted = highlightedSlotIdSet.has(String(slotId));
                              const alias = layout.slotAliases?.[slotId];

                              return {
                                rowNumber,
                                slotId,
                                slotCode,
                                slotSummary,
                                isSelected,
                                hasStock,
                                isSkuHighlighted,
                                alias,
                                slot: slotLookup[slotId],
                              };
                            });

                            const useRackPopup = shouldUseRackPopup(position, rack);
                            const selectedRackSlot = slotItems.find((slot) => slot.isSelected);
                            const filledRackSlot = slotItems.find((slot) => slot.hasStock);
                            const highlightedRackSlots = slotItems.filter((slot) => slot.isSkuHighlighted);
                            const previewSlot = selectedRackSlot || filledRackSlot || slotItems[0] || null;
                            const filledRackSlotCount = slotItems.filter((slot) => slot.hasStock).length;
                            const rackIsActive = slotItems.some((slot) => slot.isSelected);
                            const rackMatchesSkuFilter = highlightedRackSlots.length > 0;
                            const rackDensity = getRackCardDensity(position);
                            const rackNumberLabel = String(rack.number).padStart(2, "0");
                            const rackDisplayTitle =
                              rackDensity === "micro" ? `R${rackNumberLabel}` : `Rak ${rackNumberLabel}`;
                            const rackDisplaySubtitle =
                              rackDensity === "regular"
                                ? rack.label || "Tanpa label"
                                : rackDensity === "compact"
                                  ? rack.label || `Rak ${rackNumberLabel}`
                                  : "";
                            const rackChipLabel =
                              rackDensity === "micro"
                                ? `${rack.rows}B`
                                : rackDensity === "compact"
                                  ? `${rack.rows} BARIS`
                                  : `${rack.rows} baris`;
                            const rackStatusText = filledRackSlotCount
                              ? `${filledRackSlotCount}/${slotItems.length} baris punya stok`
                              : `${slotItems.length} baris siap dipakai`;
                            const rackFooterStatusText =
                              rackDensity === "micro"
                                ? filledRackSlotCount
                                  ? `${filledRackSlotCount}/${slotItems.length} aktif`
                                  : `${slotItems.length} slot siap`
                                : rackStatusText;
                            const rackPreviewSecondary =
                              hasHighlightedSkuFilter
                                ? rackDensity === "micro"
                                  ? rackMatchesSkuFilter
                                    ? `${highlightedRackSlots.length} match`
                                    : "No match"
                                  : rackMatchesSkuFilter
                                    ? `${highlightedRackSlots.length} baris berisi SKU ini`
                                    : "SKU ini tidak tersimpan di rak ini"
                                : rackDensity === "micro"
                                  ? filledRackSlotCount
                                    ? `${filledRackSlotCount}/${slotItems.length} aktif`
                                    : `${slotItems.length} slot`
                                  : previewSlot?.alias || rackStatusText;

                            if (useRackPopup) {
                              return (
                                <button
                                  key={rack.id}
                                  type="button"
                                  className={[
                                    "gudang-layout-rack-card",
                                    "freeform",
                                    "popup-trigger",
                                    rackDensity,
                                    hasHighlightedSkuFilter
                                      ? rackMatchesSkuFilter
                                        ? "sku-highlight"
                                        : "sku-dimmed"
                                      : "",
                                    rackIsActive ? "active" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  style={buildRackCardStyle(position, canvas)}
                                  onClick={() =>
                                    setActiveRackPopup({
                                      rack,
                                      floor,
                                      block,
                                      slotItems,
                                    })
                                  }
                                >
                                  <div className="gudang-layout-rack-head">
                                    <div className="gudang-layout-rack-title-group">
                                      <strong>{rackDisplayTitle}</strong>
                                      {rackDisplaySubtitle ? <span>{rackDisplaySubtitle}</span> : null}
                                    </div>
                                    <span className="gudang-layout-rack-chip">{rackChipLabel}</span>
                                  </div>

                                  <div className="gudang-layout-rack-preview">
                                    <div className="gudang-layout-rack-preview-main">
                                      <strong>{previewSlot?.slotCode || rackDisplayTitle}</strong>
                                      <span>{rackPreviewSecondary}</span>
                                    </div>
                                    <div className="gudang-layout-rack-preview-footer">
                                      <small>
                                        {hasHighlightedSkuFilter
                                          ? rackMatchesSkuFilter
                                            ? `${highlightedRackSlots.length} lokasi cocok SKU`
                                            : "Tidak ada lokasi SKU"
                                          : rackFooterStatusText}
                                      </small>
                                      <small>
                                        {rackDensity === "micro"
                                          ? "Klik untuk buka"
                                          : "Klik untuk lihat semua baris"}
                                      </small>
                                    </div>
                                  </div>
                                </button>
                              );
                            }

                            return (
                              <div
                                key={rack.id}
                                className={[
                                  "gudang-layout-rack-card",
                                  "freeform",
                                  hasHighlightedSkuFilter
                                    ? highlightedRackSlots.length
                                      ? "sku-highlight"
                                      : "sku-dimmed"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                style={buildRackCardStyle(position, canvas)}
                              >
                                <div className="gudang-layout-rack-head">
                                  <div className="gudang-layout-rack-title-group">
                                    <strong>Rak {String(rack.number).padStart(2, "0")}</strong>
                                    <span>{rack.label || "Tanpa label"}</span>
                                  </div>
                                  <span className="gudang-layout-rack-chip">{rack.rows} baris</span>
                                </div>

                                <div className="gudang-layout-slot-grid compact">
                                  {slotItems.map((slot) => (
                                    <button
                                      key={slot.slotId}
                                      type="button"
                                      className={[
                                        "gudang-layout-slot-button",
                                        slot.isSelected ? "selected" : "",
                                        slot.hasStock ? "filled" : "empty",
                                        hasHighlightedSkuFilter
                                          ? slot.isSkuHighlighted
                                            ? "sku-highlight"
                                            : "sku-dimmed"
                                          : "",
                                        !interactive ? "static" : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                      onClick={() =>
                                        interactive && onSelectSlot
                                          ? onSelectSlot(slot.slot)
                                          : null
                                      }
                                    >
                                      <strong>{slot.slotCode}</strong>
                                      <span>Baris {slot.rowNumber}</span>
                                      <small>
                                        {slot.hasStock
                                          ? `${slot.slotSummary.qty} pcs | ${slot.slotSummary.skuCount} SKU`
                                          : slot.alias || "Kosong"}
                                      </small>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="gudang-ui-empty-panel">Belum ada rak pada blok ini.</div>
                      )}
                    </article>
                  );
                })}
            </div>
          </section>
        ))}

      {activeRackPopup ? (
        <div
          className="gudang-layout-rack-popup-backdrop"
          onClick={() => setActiveRackPopup(null)}
        >
          <div
            className="gudang-layout-rack-popup"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="gudang-layout-rack-popup-head">
              <div>
                <h4>Rak {String(activeRackPopup.rack.number).padStart(2, "0")}</h4>
                <p>
                  {activeRackPopup.floor.label || `Lantai ${activeRackPopup.floor.number}`} /{" "}
                  {activeRackPopup.block.label || `Blok ${activeRackPopup.block.code}`} /{" "}
                  {activeRackPopup.rack.rows} baris
                </p>
              </div>

              <button
                type="button"
                className="gudang-ui-icon-button"
                onClick={() => setActiveRackPopup(null)}
                aria-label="Tutup popup rak"
              >
                <FaTimes />
              </button>
            </div>

            <div className="gudang-layout-rack-popup-grid">
              {activeRackPopup.slotItems.map((slot) => (
                <button
                  key={slot.slotId}
                  type="button"
                  className={[
                    "gudang-layout-slot-button",
                    "popup",
                    slot.isSelected ? "selected" : "",
                    slot.hasStock ? "filled" : "empty",
                    hasHighlightedSkuFilter
                      ? slot.isSkuHighlighted
                        ? "sku-highlight"
                        : "sku-dimmed"
                      : "",
                    !interactive ? "static" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (interactive && onSelectSlot) {
                      onSelectSlot(slot.slot);
                    }
                    setActiveRackPopup(null);
                  }}
                >
                  <strong>{slot.slotCode}</strong>
                  <span>Baris {slot.rowNumber}</span>
                  <small>
                    {slot.hasStock
                      ? `${slot.slotSummary.qty} pcs | ${slot.slotSummary.skuCount} SKU`
                      : slot.alias || "Kosong"}
                  </small>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const GudangActivityTable = ({ rows, resolveSlotLabel, resolveSkuLabel }) => {
  if (!rows.length) {
    return <div className="gudang-ui-empty-panel">Belum ada aktivitas.</div>;
  }

  return (
    <div className="gudang-ui-table-shell">
      <table className="gudang-ui-table">
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Tipe</th>
            <th>SKU</th>
            <th>Asal</th>
            <th>Tujuan</th>
            <th>Qty</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatGudangDate(row.createdAt)}</td>
              <td>
                <span className={`gudang-ui-badge ${row.type}`}>
                  {row.type === "placement" ? "Placement" : "Mutasi"}
                </span>
              </td>
              <td>{resolveSkuLabel(row.skuId)}</td>
              <td>{row.fromSlotId ? resolveSlotLabel(row.fromSlotId) : "-"}</td>
              <td>{row.toSlotId ? resolveSlotLabel(row.toSlotId) : "-"}</td>
              <td>{row.qty}</td>
              <td>{row.notes || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const buildGlobalSummary = (state) => {
  const stockSummaryBySlot = getSlotStockSummaryMap(state);
  const filledSlots = Object.keys(stockSummaryBySlot).length;
  const totalQty = Object.values(stockSummaryBySlot).reduce(
    (total, item) => total + item.qty,
    0
  );

  return {
    layoutCount: state.layouts.length,
    slotCount: state.layouts.reduce(
      (count, layout) => count + buildSlotsFromLayout(layout).length,
      0
    ),
    filledSlots,
    totalQty,
  };
};

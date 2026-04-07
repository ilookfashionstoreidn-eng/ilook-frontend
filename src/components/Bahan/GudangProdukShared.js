import React, { useMemo } from "react";
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

export const GudangLayoutMap = ({
  layout,
  selectedSlotId,
  onSelectSlot,
  stockSummaryBySlot = {},
  interactive = true,
}) => {
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
                .map((block) => (
                  <article key={block.id} className="gudang-layout-block">
                    <div className="gudang-layout-block-head">
                      <strong>{block.label || `Blok ${block.code}`}</strong>
                      <span>Kode {block.code}</span>
                    </div>

                    <div
                      className="gudang-layout-racks"
                      style={{
                        gridTemplateColumns: `repeat(${Math.min(
                          Math.max(Number(block.layoutColumns) || 3, 1),
                          4
                        )}, minmax(220px, 1fr))`,
                      }}
                    >
                      {(block.racks || []).map((rack) => (
                          <div key={rack.id} className="gudang-layout-rack-card">
                            <div className="gudang-layout-rack-head">
                              <strong>
                                Rak {String(rack.number).padStart(2, "0")}
                              </strong>
                              <span>{rack.label || "Tanpa label"}</span>
                            </div>

                            <div className="gudang-layout-slot-grid">
                              {Array.from({ length: rack.rows }, (_, index) => {
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
                                const alias = layout.slotAliases?.[slotId];

                                return (
                                  <button
                                    key={slotId}
                                    type="button"
                                    className={[
                                      "gudang-layout-slot-button",
                                      isSelected ? "selected" : "",
                                      hasStock ? "filled" : "empty",
                                      !interactive ? "static" : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                    onClick={() =>
                                      interactive && onSelectSlot
                                        ? onSelectSlot(
                                            buildSlotsFromLayout(layout).find(
                                              (slot) => slot.id === slotId
                                            )
                                          )
                                        : null
                                    }
                                  >
                                    <strong>{slotCode}</strong>
                                    <span>Baris {rowNumber}</span>
                                    <small>
                                      {hasStock
                                        ? `${slotSummary.qty} pcs • ${slotSummary.skuCount} SKU`
                                        : alias || "Kosong"}
                                    </small>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))}
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

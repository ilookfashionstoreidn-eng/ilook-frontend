const STORAGE_KEY = "ilook_gudang_produk_mock_v1";

export const DEFAULT_BLOCK_CANVAS = Object.freeze({
  columns: 12,
  rows: 10,
});

export const BLOCK_CANVAS_LIMITS = Object.freeze({
  minColumns: 6,
  maxColumns: 30,
  minRows: 4,
  maxRows: 30,
  minRackSpan: 2,
  maxAutoGridColumns: 20,
});

const nowIso = () => new Date().toISOString();

export const createId = (prefix = "id") =>
  `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;

const clampNumber = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const createRack = (id, number, rows, label = "", layoutPosition = null) => ({
  id,
  number,
  rows,
  label,
  layoutPosition,
});

const createBlock = (
  id,
  code,
  label,
  racks,
  layoutColumns = 3,
  layoutCanvas = DEFAULT_BLOCK_CANVAS
) => ({
  id,
  code,
  label,
  layoutColumns,
  layoutCanvas: {
    ...DEFAULT_BLOCK_CANVAS,
    ...(layoutCanvas || {}),
  },
  racks,
});

const createFloor = (id, number, label, blocks) => ({
  id,
  number,
  label,
  blocks,
});

const defaultLayouts = [
  {
    id: "layout_rumah_besar",
    name: "Gudang Rumah Besar",
    address: "Jl. Raya Utama No. 18",
    pic: "Rina",
    description: "Gudang produk utama untuk stok siap kirim.",
    slotAliases: {
      "layout_rumah_besar__F3__BB__R4__ROW3": "Rak bestseller lantai 3",
      "layout_rumah_besar__F2__BA__R2__ROW1": "Produk promo depan",
    },
    floors: [
      createFloor("floor_1", 1, "Lantai 1", [
        createBlock("block_1a", "A", "Blok A", [
          createRack("rack_1a_1", 1, 4, "Rak Display"),
          createRack("rack_1a_2", 2, 4, "Rak Ready"),
        ]),
        createBlock("block_1b", "B", "Blok B", [
          createRack("rack_1b_1", 1, 3, "Rak Outer"),
        ]),
      ]),
      createFloor("floor_2", 2, "Lantai 2", [
        createBlock("block_2a", "A", "Blok A", [
          createRack("rack_2a_1", 1, 4, "Rak Kaos"),
          createRack("rack_2a_2", 2, 4, "Rak Celana"),
        ]),
      ]),
      createFloor("floor_3", 3, "Lantai 3", [
        createBlock("block_3b", "B", "Blok Besar", [
          createRack("rack_3b_3", 3, 4, "Rak Hoodie"),
          createRack("rack_3b_4", 4, 4, "Rak Bestseller"),
        ]),
      ]),
    ],
  },
  {
    id: "layout_showroom",
    name: "Gudang Showroom",
    address: "Ruko Depan Showroom",
    pic: "Dian",
    description: "Gudang satelit untuk stok display dan restock cepat.",
    slotAliases: {},
    floors: [
      createFloor("showroom_floor_1", 1, "Lantai 1", [
        createBlock("showroom_block_a", "A", "Blok A", [
          createRack("showroom_rack_a1", 1, 3, "Rak Depan"),
          createRack("showroom_rack_a2", 2, 3, "Rak Tengah"),
        ]),
      ]),
    ],
  },
];

const defaultProducts = [
  { id: "prd_001", name: "Kaos Basic" },
  { id: "prd_002", name: "Hoodie Zip" },
  { id: "prd_003", name: "Celana Cargo" },
];

const defaultSkus = [
  {
    id: "sku_001",
    productId: "prd_001",
    code: "KAOS-BASIC-HITAM-M",
    label: "KAOS BASIC - HITAM M",
  },
  {
    id: "sku_002",
    productId: "prd_001",
    code: "KAOS-BASIC-PUTIH-L",
    label: "KAOS BASIC - PUTIH L",
  },
  {
    id: "sku_003",
    productId: "prd_002",
    code: "HOODIE-ZIP-NAVY-L",
    label: "HOODIE ZIP - NAVY L",
  },
  {
    id: "sku_004",
    productId: "prd_003",
    code: "CARGO-OLIVE-32",
    label: "CELANA CARGO - OLIVE 32",
  },
];

const defaultStockEntries = [
  {
    id: "stock_001",
    layoutId: "layout_rumah_besar",
    slotId: "layout_rumah_besar__F3__BB__R4__ROW3",
    skuId: "sku_003",
    qty: 24,
    updatedAt: "2026-04-06T09:30:00.000Z",
  },
  {
    id: "stock_002",
    layoutId: "layout_rumah_besar",
    slotId: "layout_rumah_besar__F2__BA__R2__ROW1",
    skuId: "sku_001",
    qty: 18,
    updatedAt: "2026-04-06T10:00:00.000Z",
  },
  {
    id: "stock_003",
    layoutId: "layout_showroom",
    slotId: "layout_showroom__F1__BA__R1__ROW2",
    skuId: "sku_002",
    qty: 10,
    updatedAt: "2026-04-06T10:15:00.000Z",
  },
  {
    id: "stock_004",
    layoutId: "layout_rumah_besar",
    slotId: "layout_rumah_besar__F2__BA__R2__ROW1",
    skuId: "sku_004",
    qty: 7,
    updatedAt: "2026-04-06T11:30:00.000Z",
  },
];

const defaultActivityLog = [
  {
    id: "activity_001",
    type: "placement",
    skuId: "sku_003",
    fromSlotId: null,
    toSlotId: "layout_rumah_besar__F3__BB__R4__ROW3",
    qty: 24,
    createdAt: "2026-04-06T09:30:00.000Z",
    notes: "Stok awal hoodie",
  },
  {
    id: "activity_002",
    type: "placement",
    skuId: "sku_001",
    fromSlotId: null,
    toSlotId: "layout_rumah_besar__F2__BA__R2__ROW1",
    qty: 18,
    createdAt: "2026-04-06T10:00:00.000Z",
    notes: "Restock kaos",
  },
  {
    id: "activity_003",
    type: "mutation",
    skuId: "sku_002",
    fromSlotId: "layout_rumah_besar__F1__BA__R1__ROW1",
    toSlotId: "layout_showroom__F1__BA__R1__ROW2",
    qty: 10,
    createdAt: "2026-04-06T10:15:00.000Z",
    notes: "Pindah stok display",
  },
];

const defaultState = {
  layouts: defaultLayouts,
  products: defaultProducts,
  skus: defaultSkus,
  stockEntries: defaultStockEntries,
  activityLog: defaultActivityLog,
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const areIdsEqual = (left, right) => {
  if (left === null || left === undefined || right === null || right === undefined) {
    return false;
  }

  return String(left) === String(right);
};

export const generateSlotId = (layoutId, floorNumber, blockCode, rackNumber, rowNumber) =>
  `${layoutId}__F${floorNumber}__B${String(blockCode).toUpperCase()}__R${rackNumber}__ROW${rowNumber}`;

export const generateSlotCode = (floorNumber, blockCode, rackNumber, rowNumber) =>
  `L${floorNumber}${String(blockCode).toUpperCase()}${String(rackNumber).padStart(2, "0")}${rowNumber}`;

export const normalizeBlockCanvas = (block) => ({
  columns: clampNumber(
    block?.layoutCanvas?.columns,
    BLOCK_CANVAS_LIMITS.minColumns,
    BLOCK_CANVAS_LIMITS.maxColumns,
    DEFAULT_BLOCK_CANVAS.columns
  ),
  rows: clampNumber(
    block?.layoutCanvas?.rows,
    BLOCK_CANVAS_LIMITS.minRows,
    BLOCK_CANVAS_LIMITS.maxRows,
    DEFAULT_BLOCK_CANVAS.rows
  ),
});

export const getBlockLayoutColumnsLimit = (blockOrCanvasColumns) => {
  const canvasColumns =
    typeof blockOrCanvasColumns === "number"
      ? blockOrCanvasColumns
      : normalizeBlockCanvas(blockOrCanvasColumns).columns;

  return Math.max(
    Math.min(
      Math.floor(canvasColumns / BLOCK_CANVAS_LIMITS.minRackSpan),
      BLOCK_CANVAS_LIMITS.maxAutoGridColumns
    ),
    1
  );
};

export const getDefaultRackLayoutPosition = (rack, rackIndex, block) => {
  const canvas = normalizeBlockCanvas(block);
  const rackCount = Math.max((block?.racks || []).length, 1);
  const preferredColumns = clampNumber(
    block?.layoutColumns,
    1,
    getBlockLayoutColumnsLimit(canvas.columns),
    3
  );
  const racksPerRow = Math.min(preferredColumns, rackCount);
  const defaultWidth = Math.max(
    2,
    Math.min(3, Math.floor(canvas.columns / Math.max(racksPerRow, 1)))
  );
  const rowCount = Math.max(Math.ceil(rackCount / Math.max(racksPerRow, 1)), 1);
  const defaultHeight = 2;
  const columnIndex = rackIndex % Math.max(racksPerRow, 1);
  const rowIndex = Math.floor(rackIndex / Math.max(racksPerRow, 1));

  return {
    x: Math.min(columnIndex * defaultWidth + 1, Math.max(canvas.columns - defaultWidth + 1, 1)),
    y: Math.min(rowIndex * defaultHeight + 1, Math.max(canvas.rows - defaultHeight + 1, 1)),
    w: Math.min(defaultWidth, canvas.columns),
    h: Math.min(
      Math.max(
        Math.min(Number(rack?.rows) + 1 || defaultHeight, defaultHeight),
        2
      ),
      canvas.rows
    ),
  };
};

export const resolveRackLayoutPosition = (rack, rackIndex, block) => {
  const canvas = normalizeBlockCanvas(block);
  const fallback = getDefaultRackLayoutPosition(rack, rackIndex, block);
  const width = clampNumber(rack?.layoutPosition?.w, 2, canvas.columns, fallback.w);
  const height = clampNumber(rack?.layoutPosition?.h, 2, canvas.rows, fallback.h);

  return {
    x: clampNumber(
      rack?.layoutPosition?.x,
      1,
      Math.max(canvas.columns - width + 1, 1),
      fallback.x
    ),
    y: clampNumber(
      rack?.layoutPosition?.y,
      1,
      Math.max(canvas.rows - height + 1, 1),
      fallback.y
    ),
    w: width,
    h: height,
  };
};

export const getOrderedRacksForBlock = (block) =>
  (block?.racks || [])
    .map((rack, index) => ({
      rack,
      index,
      position: resolveRackLayoutPosition(rack, index, block),
    }))
    .sort(
      (left, right) =>
        left.position.y - right.position.y ||
        left.position.x - right.position.x ||
        left.rack.number - right.rack.number
    );

export const getGudangProdukMockState = () => {
  if (typeof window === "undefined") {
    return clone(defaultState);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(defaultState);
    }

    const parsed = JSON.parse(raw);
    return {
      ...clone(defaultState),
      ...parsed,
      layouts: Array.isArray(parsed?.layouts) ? parsed.layouts : clone(defaultLayouts),
      products: Array.isArray(parsed?.products) ? parsed.products : clone(defaultProducts),
      skus: Array.isArray(parsed?.skus) ? parsed.skus : clone(defaultSkus),
      stockEntries: Array.isArray(parsed?.stockEntries) ? parsed.stockEntries : clone(defaultStockEntries),
      activityLog: Array.isArray(parsed?.activityLog) ? parsed.activityLog : clone(defaultActivityLog),
    };
  } catch (error) {
    return clone(defaultState);
  }
};

export const saveGudangProdukMockState = (state) => {
  if (typeof window === "undefined") {
    return state;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("gudang-produk-mock-updated"));
  return state;
};

export const resetGudangProdukMockState = () => saveGudangProdukMockState(clone(defaultState));

export const getLayoutById = (state, layoutId) =>
  state.layouts.find((layout) => layout.id === layoutId) || null;

export const getProductById = (state, productId) =>
  state.products.find((product) => areIdsEqual(product.id, productId)) || null;

export const getSkuById = (state, skuId) =>
  state.skus.find((sku) => areIdsEqual(sku.id, skuId)) || null;

export const getSkusByProductId = (state, productId) =>
  state.skus.filter((sku) => areIdsEqual(sku.productId, productId));

export const buildSlotsFromLayout = (layout) => {
  if (!layout) return [];

  const slots = [];
  const floors = [...(layout.floors || [])].sort((a, b) => a.number - b.number);

  floors.forEach((floor) => {
    const blocks = [...(floor.blocks || [])].sort((a, b) =>
      String(a.code).localeCompare(String(b.code))
    );

    blocks.forEach((block) => {
      getOrderedRacksForBlock(block).forEach(({ rack }) => {
        for (let rowNumber = 1; rowNumber <= rack.rows; rowNumber += 1) {
          const slotId = generateSlotId(layout.id, floor.number, block.code, rack.number, rowNumber);
          slots.push({
            id: slotId,
            layoutId: layout.id,
            layoutName: layout.name,
            floorId: floor.id,
            floorNumber: floor.number,
            floorLabel: floor.label,
            blockId: block.id,
            blockCode: block.code,
            blockLabel: block.label,
            rackId: rack.id,
            rackNumber: rack.number,
            rackLabel: rack.label,
            rowNumber,
            slotCode: generateSlotCode(floor.number, block.code, rack.number, rowNumber),
            alias: layout.slotAliases?.[slotId] || "",
          });
        }
      });
    });
  });

  return slots;
};

export const getAllSlots = (state) =>
  state.layouts.flatMap((layout) => buildSlotsFromLayout(layout));

export const getStockEntriesWithMeta = (state) => {
  const slots = getAllSlots(state);

  return state.stockEntries
    .filter((entry) => entry.qty > 0)
    .map((entry) => {
      const slot = slots.find((item) => item.id === entry.slotId);
      const sku = getSkuById(state, entry.skuId);
      const product = sku ? getProductById(state, sku.productId) : null;

      return {
        ...entry,
        slot,
        sku,
        product,
      };
    });
};

export const getSlotStockSummaryMap = (state) => {
  const map = {};

  getStockEntriesWithMeta(state).forEach((entry) => {
    if (!entry.slot) return;

    if (!map[entry.slotId]) {
      map[entry.slotId] = {
        qty: 0,
        skuCount: 0,
        lines: [],
      };
    }

    map[entry.slotId].qty += entry.qty;
    map[entry.slotId].skuCount += 1;
    map[entry.slotId].lines.push(entry);
  });

  return map;
};

export const upsertLayout = (state, newLayout) => {
  const exists = state.layouts.some((layout) => layout.id === newLayout.id);
  const layouts = exists
    ? state.layouts.map((layout) => (layout.id === newLayout.id ? newLayout : layout))
    : [...state.layouts, newLayout];

  return saveGudangProdukMockState({
    ...state,
    layouts,
  });
};

export const deleteLayout = (state, layoutId) => {
  const layouts = state.layouts.filter((layout) => layout.id !== layoutId);
  const validSlotIds = new Set(buildSlotsFromLayout({ id: "__temp__", floors: [] }).map((slot) => slot.id));
  const nextState = {
    ...state,
    layouts,
    stockEntries: state.stockEntries.filter((entry) => entry.layoutId !== layoutId),
    activityLog: state.activityLog.filter(
      (activity) =>
        !String(activity.fromSlotId || "").startsWith(`${layoutId}__`) &&
        !String(activity.toSlotId || "").startsWith(`${layoutId}__`)
    ),
  };

  return saveGudangProdukMockState({
    ...nextState,
    stockEntries: nextState.stockEntries.filter(
      (entry) => validSlotIds.size === 0 || !String(entry.slotId).startsWith(`${layoutId}__`)
    ),
  });
};

export const addPlacement = (state, { layoutId, slotId, skuId, qty, notes = "" }) => {
  const parsedQty = Number(qty);
  if (!slotId || !skuId || !Number.isFinite(parsedQty) || parsedQty <= 0) {
    throw new Error("Data penempatan belum lengkap.");
  }

  let entryUpdated = false;
  const stockEntries = state.stockEntries.map((entry) => {
    if (entry.slotId === slotId && areIdsEqual(entry.skuId, skuId)) {
      entryUpdated = true;
      return {
        ...entry,
        qty: entry.qty + parsedQty,
        updatedAt: nowIso(),
      };
    }

    return entry;
  });

  if (!entryUpdated) {
    stockEntries.push({
      id: createId("stock"),
      layoutId,
      slotId,
      skuId,
      qty: parsedQty,
      updatedAt: nowIso(),
    });
  }

  return saveGudangProdukMockState({
    ...state,
    stockEntries,
    activityLog: [
      {
        id: createId("activity"),
        type: "placement",
        skuId,
        fromSlotId: null,
        toSlotId: slotId,
        qty: parsedQty,
        createdAt: nowIso(),
        notes,
      },
      ...state.activityLog,
    ],
  });
};

export const addMutation = (state, { skuId, fromSlotId, toSlotId, qty, notes = "" }) => {
  const parsedQty = Number(qty);

  if (!skuId || !fromSlotId || !toSlotId || fromSlotId === toSlotId) {
    throw new Error("Lokasi asal dan tujuan harus berbeda.");
  }

  if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
    throw new Error("Qty mutasi harus lebih besar dari 0.");
  }

  const sourceEntry = state.stockEntries.find(
    (entry) => areIdsEqual(entry.skuId, skuId) && entry.slotId === fromSlotId && entry.qty > 0
  );

  if (!sourceEntry || sourceEntry.qty < parsedQty) {
    throw new Error("Stok di lokasi asal tidak mencukupi.");
  }

  let destinationLayoutId = sourceEntry.layoutId;
  const targetSlot = getAllSlots(state).find((slot) => slot.id === toSlotId);
  if (targetSlot) {
    destinationLayoutId = targetSlot.layoutId;
  }

  const stockEntries = [];
  let destinationUpdated = false;

  state.stockEntries.forEach((entry) => {
    if (entry.id === sourceEntry.id) {
      const nextQty = entry.qty - parsedQty;
      if (nextQty > 0) {
        stockEntries.push({
          ...entry,
          qty: nextQty,
          updatedAt: nowIso(),
        });
      }
      return;
    }

    if (areIdsEqual(entry.skuId, skuId) && entry.slotId === toSlotId) {
      destinationUpdated = true;
      stockEntries.push({
        ...entry,
        qty: entry.qty + parsedQty,
        updatedAt: nowIso(),
      });
      return;
    }

    stockEntries.push(entry);
  });

  if (!destinationUpdated) {
    stockEntries.push({
      id: createId("stock"),
      layoutId: destinationLayoutId,
      slotId: toSlotId,
      skuId,
      qty: parsedQty,
      updatedAt: nowIso(),
    });
  }

  return saveGudangProdukMockState({
    ...state,
    stockEntries,
    activityLog: [
      {
        id: createId("activity"),
        type: "mutation",
        skuId,
        fromSlotId,
        toSlotId,
        qty: parsedQty,
        createdAt: nowIso(),
        notes,
      },
      ...state.activityLog,
    ],
  });
};

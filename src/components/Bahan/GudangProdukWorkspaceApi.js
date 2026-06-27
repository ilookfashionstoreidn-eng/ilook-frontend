import API from "../../api";
import {
  getAllSlots,
  getProductById,
  getSkuById,
  getBlockLayoutColumnsLimit,
  normalizeBlockCanvas,
  resolveRackLayoutPosition,
} from "./GudangProdukMockStore";

export const emptyGudangWorkspaceState = {
  layouts: [],
  products: [],
  skus: [],
  stockEntries: [],
  activityLog: [],
};

const emptyGudangStockListSummary = {
  total_rows: 0,
  total_qty_awal: 0,
  total_qty_masuk: 0,
  total_qty_keluar: 0,
  total_qty_sisa: 0,
  total_locations: 0,
};

const emptyGudangStockListPagination = {
  current_page: 1,
  per_page: 50,
  total: 0,
  last_page: 1,
};

const emptyGudangProdukHistorySummary = {
  total_rows: 0,
  total_qty: 0,
  total_sku: 0,
  total_seri: 0,
};

const emptyGudangProdukHistoryPagination = {
  current_page: 1,
  per_page: 50,
  total: 0,
  last_page: 1,
};

const emptyGudangProdukStokAwalHistorySummary = {
  total_rows: 0,
  total_qty: 0,
  total_sku: 0,
  total_seri: 0,
  total_locations: 0,
};

const emptyGudangProdukStokAwalHistoryPagination = {
  current_page: 1,
  per_page: 50,
  total: 0,
  last_page: 1,
};

const normalizeWorkspaceState = (payload = {}) => ({
  layouts: Array.isArray(payload.layouts) ? payload.layouts : [],
  products: Array.isArray(payload.products) ? payload.products : [],
  skus: Array.isArray(payload.skus) ? payload.skus : [],
  stockEntries: Array.isArray(payload.stockEntries) ? payload.stockEntries : [],
  activityLog: Array.isArray(payload.activityLog) ? payload.activityLog : [],
});

const normalizeGudangStockListPayload = (payload = {}) => ({
  data: Array.isArray(payload.data) ? payload.data : [],
  locations: Array.isArray(payload.locations) ? payload.locations : [],
  summary: {
    ...emptyGudangStockListSummary,
    ...(payload.summary || {}),
  },
  pagination: {
    ...emptyGudangStockListPagination,
    ...(payload.pagination || {}),
  },
});

const normalizeGudangProdukHistoryPayload = (payload = {}) => ({
  data: Array.isArray(payload.data) ? payload.data : [],
  summary: {
    ...emptyGudangProdukHistorySummary,
    ...(payload.summary || {}),
  },
  pagination: {
    ...emptyGudangProdukHistoryPagination,
    ...(payload.pagination || {}),
  },
});

const normalizeGudangProdukStokAwalHistoryRow = (row = {}) => ({
  id: row.id,
  tgl: row.tgl || row.happenedAt || row.createdAt || row.keluarPada || null,
  sku: row.sku || row.skuCode || "-",
  seri: row.seri || row.kodeSeri || row.serialNumber || "-",
  qty: Number(row.qty || row.scannedQty || 0),
  lokasi: row.lokasi || row.location || row.namaGudang || row.slotLabel || "-",
  sku_id: row.sku_id || row.skuId || null,
  slot_id: row.slot_id || row.slotId || null,
});

const normalizeGudangProdukStokAwalHistoryPayload = (payload = {}) => ({
  data: Array.isArray(payload.data)
    ? payload.data.map(normalizeGudangProdukStokAwalHistoryRow)
    : [],
  summary: {
    ...emptyGudangProdukStokAwalHistorySummary,
    ...(payload.summary || {}),
  },
  pagination: {
    ...emptyGudangProdukStokAwalHistoryPagination,
    ...(payload.pagination || {}),
  },
});

const areIdsEqual = (left, right) =>
  left !== null &&
  left !== undefined &&
  right !== null &&
  right !== undefined &&
  String(left) === String(right);

const normalizeSearchText = (value) => String(value || "").trim().toLowerCase();

const extractStokAwalSeries = (notes) => {
  const text = String(notes || "");
  const match = text.match(/Kode seri:\s*([^|]+)/i);

  return match?.[1]?.trim() || "-";
};

const groupStokAwalHistoryRows = (rows = []) => {
  const groupedRows = new Map();

  rows.forEach((row) => {
    const sku = String(row.sku || "-").trim();
    const lokasi = String(row.lokasi || "-").trim();
    const groupKey = `${sku}__${lokasi}`;
    const current = groupedRows.get(groupKey);
    const series = String(row.seri || "").trim();
    const nextSeries = series && series !== "-" ? [series] : [];

    if (!current) {
      groupedRows.set(groupKey, {
        ...row,
        id: groupKey,
        sku,
        lokasi,
        seriList: nextSeries,
        qty: Number(row.qty) || 0,
      });
      return;
    }

    const currentDate = new Date(current.tgl || 0);
    const rowDate = new Date(row.tgl || 0);

    groupedRows.set(groupKey, {
      ...current,
      tgl:
        Number.isNaN(rowDate.getTime()) || rowDate <= currentDate
          ? current.tgl
          : row.tgl,
      qty: (Number(current.qty) || 0) + (Number(row.qty) || 0),
      seriList: [...current.seriList, ...nextSeries],
    });
  });

  return Array.from(groupedRows.values()).map((row) => ({
    ...row,
    seri: Array.from(new Set(row.seriList)).join(", ") || "-",
  }));
};

const getActivityQtyForSlot = (activityLog = [], skuId, slotId, direction) =>
  activityLog.reduce((total, activity) => {
    const targetSlotId = direction === "in" ? activity?.toSlotId : activity?.fromSlotId;

    if (!areIdsEqual(activity?.skuId, skuId) || String(targetSlotId || "") !== String(slotId || "")) {
      return total;
    }

    return total + (Number(activity?.qty) || 0);
  }, 0);

const buildGudangStockListFromWorkspace = (workspacePayload = {}, params = {}) => {
  const state = normalizeWorkspaceState(workspacePayload);
  const slots = getAllSlots(state);
  const search = normalizeSearchText(params.search);
  const page = Math.max(Number(params.page) || 1, 1);
  const perPage = Math.max(Number(params.per_page || params.perPage) || 50, 1);
  const filterLayoutId = params.layout_id || params.layoutId || "";
  const filterLocation = params.location || "";

  const allRows = state.stockEntries
    .filter((entry) => Number(entry?.qty) > 0)
    .map((entry) => {
      const slot = slots.find((item) => String(item.id) === String(entry.slotId));
      const sku = getSkuById(state, entry.skuId);
      const product = sku ? getProductById(state, sku.productId) : null;
      const qtySisa = Number(entry.qty) || 0;

      // Find the earliest placement activity log for this sku and slot
      const placements = state.activityLog.filter(
        (activity) =>
          activity?.type === "placement" &&
          areIdsEqual(activity?.skuId, entry.skuId) &&
          String(activity?.toSlotId || "") === String(entry.slotId || "")
      );
      let qtyAwal = qtySisa;
      if (placements.length > 0) {
        const earliestPlacement = [...placements].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        )[0];
        qtyAwal = Number(earliestPlacement?.qty) || qtySisa;
      }

      const qtyKeluar = getActivityQtyForSlot(state.activityLog, entry.skuId, entry.slotId, "out");
      const qtyMasuk = Math.max(0, qtySisa + qtyKeluar - qtyAwal);
      const locationParts = [
        slot?.layoutName,
        slot?.alias || slot?.slotCode,
      ].filter(Boolean);

      return {
        id: entry.id || `${entry.slotId}_${entry.skuId}`,
        skuId: entry.skuId,
        slotId: entry.slotId,
        sku: sku?.code || entry.sku || "-",
        productName: product?.name || "",
        qtyAwal,
        qtyMasuk,
        qtyKeluar,
        qtySisa,
        namaGudang: locationParts.join(" - ") || entry.slotId || "-",
        updatedAt: entry.updatedAt || null,
        layoutId: slot?.layoutId || entry.layoutId || "",
      };
    })
    .filter((row) => {
      if (filterLayoutId && row.layoutId !== filterLayoutId) return false;
      if (filterLocation && row.namaGudang !== filterLocation) return false;
      if (!search) return true;

      return [
        row.sku,
        row.productName,
        row.namaGudang,
      ].some((value) => normalizeSearchText(value).includes(search));
    })
    .sort((left, right) => String(left.sku).localeCompare(String(right.sku)));

  const total = allRows.length;
  const paginatedRows = allRows.slice((page - 1) * perPage, page * perPage);
  const locations = Array.from(new Set(allRows.map((row) => row.namaGudang).filter(Boolean))).sort();

  return normalizeGudangStockListPayload({
    data: paginatedRows,
    locations,
    summary: {
      total_rows: total,
      total_qty_awal: allRows.reduce((sum, row) => sum + row.qtyAwal, 0),
      total_qty_masuk: allRows.reduce((sum, row) => sum + row.qtyMasuk, 0),
      total_qty_keluar: allRows.reduce((sum, row) => sum + row.qtyKeluar, 0),
      total_qty_sisa: allRows.reduce((sum, row) => sum + row.qtySisa, 0),
      total_locations: locations.length,
    },
    pagination: {
      current_page: page,
      per_page: perPage,
      total,
      last_page: Math.max(Math.ceil(total / perPage), 1),
    },
  });
};

const clampNumber = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const sanitizeLayoutPayload = (layout) => ({
  ...layout,
  floors: (layout?.floors || []).map((floor) => ({
    ...floor,
    blocks: (floor?.blocks || []).map((block) => {
      const layoutCanvas = normalizeBlockCanvas(block);
      const layoutColumns = clampNumber(
        block?.layoutColumns,
        1,
        getBlockLayoutColumnsLimit(layoutCanvas.columns),
        3
      );
      const sanitizedBlock = {
        ...block,
        layoutCanvas,
        layoutColumns,
      };

      return {
        ...sanitizedBlock,
        racks: (block?.racks || []).map((rack, rackIndex) => ({
          ...rack,
          layoutPosition: resolveRackLayoutPosition(rack, rackIndex, sanitizedBlock),
        })),
      };
    }),
  })),
});

export const buildGudangWorkspaceErrorMessage = (error, fallbackMessage) => {
  const validationErrors = error?.response?.data?.errors;
  if (validationErrors && typeof validationErrors === "object") {
    const firstError = Object.values(validationErrors)?.[0];
    if (Array.isArray(firstError) && firstError[0]) {
      return firstError[0];
    }
  }

  return error?.response?.data?.message || error?.message || fallbackMessage;
};

export const fetchGudangProdukWorkspace = async (options = {}) => {
  const params = {};

  if (options.includeCatalog === false) {
    params.without_catalog = 1;
  }

  if (options.activityLimit !== undefined) {
    params.activity_limit = options.activityLimit;
  }

  const response = await API.get("/gudang-produk-workspace", { params });
  return normalizeWorkspaceState(response?.data?.data);
};

export const fetchGudangProdukWorkspaceCatalog = async () => {
  const response = await API.get("/gudang-produk-workspace", {
    params: { only: "catalog" },
  });

  return {
    products: Array.isArray(response?.data?.data?.products) ? response.data.data.products : [],
    skus: Array.isArray(response?.data?.data?.skus) ? response.data.data.skus : [],
  };
};

export const fetchGudangProdukWorkspaceStockList = async (params = {}) => {
  try {
    const response = await API.get("/gudang-produk-workspace/list-stok-product", { params });
    return normalizeGudangStockListPayload(response?.data);
  } catch (error) {
    if (error?.response?.status !== 404) {
      throw error;
    }

    const response = await API.get("/gudang-produk-workspace");
    return buildGudangStockListFromWorkspace(response?.data?.data, params);
  }
};

/**
 * Ambil daftar kode seri yang tersedia untuk kombinasi SKU + slot tertentu.
 * @param {{ skuId: number, slotId: string }} params
 */
export const fetchStokSeriDetail = async ({ skuId, slotId }) => {
  const response = await API.get(
    "/gudang-produk-workspace/list-stok-product/seri-detail",
    { params: { sku_id: skuId, slot_id: slotId } }
  );
  return response?.data ?? { seri: [], total_seri: 0, qty_sisa: 0, sku: "-" };
};

export const fetchGudangProdukHistory = async (params = {}) => {
  const response = await API.get("/gudang-produk/history", { params });
  return normalizeGudangProdukHistoryPayload(response?.data);
};

const buildGudangProdukStokAwalHistoryFromWorkspace = (workspacePayload = {}, params = {}) => {
  const state = normalizeWorkspaceState(workspacePayload);
  const slots = getAllSlots(state);
  const slotById = new Map(slots.map((slot) => [String(slot.id), slot]));
  const skuById = new Map((state.skus || []).map((sku) => [String(sku.id), sku]));
  const search = normalizeSearchText(params.search);
  const startDate = params.start_date || params.startDate || "";
  const endDate = params.end_date || params.endDate || "";
  const page = Math.max(Number(params.page) || 1, 1);
  const perPage = Math.max(Number(params.per_page || params.perPage) || 50, 1);

  const allRows = groupStokAwalHistoryRows((state.activityLog || [])
    .filter((activity) =>
      activity?.type === "placement" &&
      String(activity?.notes || "").toLowerCase().startsWith("stok awal")
    )
    .map((activity) => {
      const slotId = activity?.toSlotId || activity?.fromSlotId || "";
      const slot = slotById.get(String(slotId));
      const sku = skuById.get(String(activity?.skuId));
      const locationParts = [
        slot?.layoutName,
        slot?.alias || slot?.slotCode || slotId,
      ].filter(Boolean);

      return {
        id: activity.id || `${activity.skuId}_${slotId}_${activity.createdAt}`,
        tgl: activity.createdAt || null,
        sku: sku?.code || activity?.sku || "-",
        seri: extractStokAwalSeries(activity?.notes),
        qty: Number(activity?.qty) || 0,
        lokasi: locationParts.join(" - ") || slotId || "-",
      };
    })
    .filter((row) => {
      if (startDate && String(row.tgl || "").slice(0, 10) < startDate) {
        return false;
      }

      if (endDate && String(row.tgl || "").slice(0, 10) > endDate) {
        return false;
      }

      return true;
    })
  )
    .filter((row) => {
      if (!search) {
        return true;
      }

      return [row.sku, row.seri, row.lokasi].some((value) =>
        normalizeSearchText(value).includes(search)
      );
    })
    .sort((left, right) => new Date(right.tgl || 0) - new Date(left.tgl || 0));

  const total = allRows.length;
  const paginatedRows = allRows.slice((page - 1) * perPage, page * perPage);

  return normalizeGudangProdukStokAwalHistoryPayload({
    data: paginatedRows,
    summary: {
      total_rows: total,
      total_qty: allRows.reduce((sum, row) => sum + row.qty, 0),
      total_sku: new Set(allRows.map((row) => row.sku).filter(Boolean)).size,
      total_seri: new Set(allRows.map((row) => row.seri).filter(Boolean)).size,
      total_locations: new Set(allRows.map((row) => row.lokasi).filter(Boolean)).size,
    },
    pagination: {
      current_page: page,
      per_page: perPage,
      total,
      last_page: Math.max(Math.ceil(total / perPage), 1),
    },
  });
};

export const fetchGudangProdukStokAwalHistory = async (params = {}) => {
  try {
    const response = await API.get("/gudang-produk-workspace/stok-awal/history", {
      params,
    });
    return normalizeGudangProdukStokAwalHistoryPayload(response?.data);
  } catch (error) {
    if (error?.response?.status !== 404) {
      throw error;
    }

    const response = await API.get("/gudang-produk-workspace", {
      params: { activity_limit: 500 },
    });

    return buildGudangProdukStokAwalHistoryFromWorkspace(response?.data?.data, params);
  }
};

export const createGudangProdukLayout = async (payload) => {
  const response = await API.post("/gudang-produk-workspace/layouts", sanitizeLayoutPayload(payload));

  return {
    workspace: normalizeWorkspaceState(response?.data?.data),
    layout: response?.data?.layout || null,
    message: response?.data?.message || "Gudang berhasil dibuat.",
  };
};

export const saveGudangProdukLayout = async (layout) => {
  const response = await API.put(
    `/gudang-produk-workspace/layouts/${layout.id}`,
    sanitizeLayoutPayload(layout)
  );

  return {
    workspace: normalizeWorkspaceState(response?.data?.data),
    layout: response?.data?.layout || null,
    message: response?.data?.message || "Layout berhasil diperbarui.",
  };
};

export const placeGudangProdukSku = async (payload, options = {}) => {
  const response = await API.post("/gudang-produk-workspace/placements", payload, {
    params: options.minimal ? { minimal: 1 } : undefined,
  });

  return {
    workspace: options.minimal ? null : normalizeWorkspaceState(response?.data?.data),
    placement: options.minimal ? response?.data?.data || null : null,
    message: response?.data?.message || "Placement berhasil disimpan.",
  };
};

export const mutateGudangProdukSku = async (payload) => {
  const response = await API.post("/gudang-produk-workspace/mutations", payload);

  return {
    workspace: normalizeWorkspaceState(response?.data?.data),
    message: response?.data?.message || "Mutasi berhasil disimpan.",
  };
};

const normalizeSkuCode = (value) => String(value || "").trim().toUpperCase();

const extractSkuCollection = (response) => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  return [];
};

export const ensureGudangProdukSkuActive = async (rawSkuCode) => {
  const skuCode = normalizeSkuCode(rawSkuCode);

  if (!skuCode) {
    throw new Error("SKU dari kode seri tidak tersedia.");
  }

  const existingResponse = await API.get("/skus");
  const existingSku = extractSkuCollection(existingResponse).find(
    (item) => normalizeSkuCode(item?.sku) === skuCode
  );

  if (existingSku) {
    if (existingSku.is_active) {
      return {
        sku: existingSku,
        message: "SKU sudah aktif.",
      };
    }

    const updateResponse = await API.patch(`/skus/${existingSku.id}`, {
      sku: skuCode,
      is_active: true,
    });

    return {
      sku: updateResponse?.data?.data || updateResponse?.data || existingSku,
      message: updateResponse?.data?.message || "SKU berhasil diaktifkan.",
    };
  }

  const createResponse = await API.post("/skus", {
    sku: skuCode,
  });

  return {
    sku: createResponse?.data?.data || createResponse?.data || null,
    message: createResponse?.data?.message || "SKU berhasil ditambahkan.",
  };
};

const normalizeProductListSkuKey = (value) =>
  normalizeSkuCode(value)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^A-Z0-9]/g, "");

// ─── Stok Opname API ─────────────────────────────────────────────────────────

const getProductListProductName = (item = {}) =>
  String(item?.product || item?.product_group || item?.sku_name || "").trim();

const getProductListSkuName = (item = {}) =>
  String(item?.sku_name || item?.sku || "").trim();

const findProductListRowsForProduct = async (product) => {
  if (Array.isArray(product?.productListItems)) {
    return product.productListItems;
  }

  const response = await API.get("/product-list", {
    params: {
      search: String(product?.name || "").trim(),
      page: 1,
      per_page: 100,
      sortBy: "sku_name",
      sortOrder: "asc",
    },
  });
  const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
  const productName = String(product?.name || "").trim().toLowerCase();

  return rows.filter(
    (item) => getProductListProductName(item).toLowerCase() === productName
  );
};

/**
 * Ambil daftar produk dari Product List.
 * Jika all=false, tampilkan hanya produk Product List yang SKU-nya sudah punya stok gudang.
 * @param {object} params - { search?: string, all?: boolean }
 */
export const fetchOpnameProducts = async (params = {}) => {
  const response = await API.get("/product-list", {
    params: {
      opname_products: 1,
      search: params.search || "",
      all: params.all ? 1 : undefined,
    },
  });

  return Array.isArray(response?.data?.data) ? response.data.data : [];
};

/**
 * Ambil daftar SKU + stok per slot untuk produk tertentu.
 * @param {object|number|string} product
 */
export const fetchOpnameSkus = async (product) => {
  const workspace = await fetchGudangProdukWorkspace({ activityLimit: 0 });
  const productListRows = await findProductListRowsForProduct(product);
  const productListSkuKeys = new Set(
    productListRows
      .map((item) => normalizeProductListSkuKey(getProductListSkuName(item)))
      .filter(Boolean)
  );
  const productListBySkuKey = new Map(
    productListRows.map((item) => [
      normalizeProductListSkuKey(getProductListSkuName(item)),
      item,
    ])
  );
  const slots = getAllSlots(workspace);
  const slotsById = new Map(slots.map((slot) => [String(slot.id), slot]));
  const layoutsById = new Map(
    (workspace.layouts || []).map((layout) => [String(layout.id), layout])
  );
  const skusById = new Map(
    (workspace.skus || []).map((sku) => [String(sku.id), sku])
  );

  return (workspace.stockEntries || [])
    .filter((entry) => Number(entry?.qty) > 0)
    .map((entry) => {
      const sku = skusById.get(String(entry?.skuId));
      const skuKey = normalizeProductListSkuKey(sku?.code);
      if (!sku || !productListSkuKeys.has(skuKey)) {
        return null;
      }

      const productListItem = productListBySkuKey.get(skuKey) || {};
      const slot = slotsById.get(String(entry?.slotId));
      const layout = layoutsById.get(String(entry?.layoutId));
      const variant = [
        productListItem.product_colour,
        productListItem.product_size,
      ]
        .filter(Boolean)
        .join(" ");

      return {
        entryId: entry.id || `${entry.slotId}_${entry.skuId}`,
        skuId: sku.id,
        skuCode: sku.code,
        warna: productListItem.product_colour || "",
        ukuran: productListItem.product_size || "",
        variant,
        slotId: entry.slotId,
        slotCode: slot?.alias || slot?.slotCode || entry.slotId,
        layoutId: entry.layoutId,
        layoutName: slot?.layoutName || layout?.name || "-",
        qtyGudang: Number(entry.qty) || 0,
        updatedAt: entry.updatedAt || null,
      };
    })
    .filter(Boolean)
    .sort((left, right) =>
      String(left.skuCode).localeCompare(String(right.skuCode)) ||
      String(left.layoutName).localeCompare(String(right.layoutName)) ||
      String(left.slotCode).localeCompare(String(right.slotCode))
    );
};

/**
 * Commit hasil opname — ganti qty slot dengan jumlah seri yang di-scan.
 * @param {{ skuId, slotId, layoutId, scannedQty, scannedSeries, notes }} payload
 */
export const commitOpname = async (payload) => {
  const response = await API.post(
    "/gudang-produk-workspace/opname/commit",
    payload
  );
  return {
    data: response?.data?.data || null,
    message: response?.data?.message || "Opname berhasil disimpan.",
  };
};

/**
 * Ambil daftar riwayat stok opname gudang.
 * @param {object} params - { search, page, per_page }
 */
export const fetchOpnameHistory = async (params = {}) => {
  const response = await API.get("/gudang-produk-workspace/opname/history", { params });
  return {
    data: Array.isArray(response?.data?.data) ? response.data.data : [],
    pagination: response?.data?.pagination || {
      current_page: 1,
      per_page: 50,
      total: 0,
      last_page: 1,
    }
  };
};

// ─── Mutation Sessions ────────────────────────────────────────────────────────

/**
 * Ambil daftar sesi mutasi yang masih pending.
 */
export const fetchMutationSessions = async () => {
  const response = await API.get("/gudang-produk-workspace/mutation-sessions");
  return Array.isArray(response?.data?.data) ? response.data.data : [];
};

/**
 * Simpan sesi scan baru.
 * @param {{ layoutId, fromSlotId, skuId, barcodes, notes? }} payload
 */
export const storeMutationSession = async (payload) => {
  const response = await API.post(
    "/gudang-produk-workspace/mutation-sessions",
    payload
  );
  return {
    data: response?.data?.data || null,
    message: response?.data?.message || "Sesi scan berhasil disimpan.",
  };
};

/**
 * Batalkan / hapus sesi yang masih pending.
 * @param {number|string} id
 */
export const deleteMutationSession = async (id) => {
  const response = await API.delete(
    `/gudang-produk-workspace/mutation-sessions/${id}`
  );
  return {
    message: response?.data?.message || "Sesi dibatalkan.",
  };
};

/**
 * Eksekusi sesi — pindahkan stok ke slot tujuan.
 * @param {number|string} id
 * @param {{ toSlotId: string, notes?: string }} payload
 */
export const executeMutationSession = async (id, payload) => {
  const response = await API.post(
    `/gudang-produk-workspace/mutation-sessions/${id}/execute`,
    payload
  );
  return {
    workspace: normalizeWorkspaceState(response?.data?.data),
    message: response?.data?.message || "Mutasi dari sesi berhasil dieksekusi.",
  };
};

/**
 * Membatalkan eksekusi sesi — pindahkan stok kembali ke rak asal.
 * @param {number|string} id
 */
export const revertMutationSession = async (id) => {
  const response = await API.post(
    `/gudang-produk-workspace/mutation-sessions/${id}/revert`
  );
  return {
    workspace: normalizeWorkspaceState(response?.data?.data),
    message: response?.data?.message || "Mutasi berhasil dibatalkan.",
  };
};

// ─── Placement Sessions ────────────────────────────────────────────────────────

/**
 * Ambil daftar sesi scan masuk yang masih pending.
 */
export const fetchPlacementSessions = async () => {
  const response = await API.get("/gudang-produk-workspace/placement-sessions");
  return Array.isArray(response?.data?.data) ? response.data.data : [];
};

/**
 * Simpan sesi scan masuk baru.
 * @param {{ seriId, skuId, barcodes, notes? }} payload
 */
export const storePlacementSession = async (payload) => {
  const response = await API.post(
    "/gudang-produk-workspace/placement-sessions",
    payload
  );
  return {
    data: response?.data?.data || null,
    message: response?.data?.message || "Sesi scan masuk berhasil disimpan.",
  };
};

/**
 * Batalkan / hapus sesi scan masuk yang masih pending.
 * @param {number|string} id
 */
export const deletePlacementSession = async (id) => {
  const response = await API.delete(
    `/gudang-produk-workspace/placement-sessions/${id}`
  );
  return {
    message: response?.data?.message || "Sesi scan masuk dibatalkan.",
  };
};

/**
 * Eksekusi sesi scan masuk — tempatkan stok ke slot tujuan.
 * @param {number|string} id
 * @param {{ layoutId: string, slotId: string, notes?: string }} payload
 */
export const executePlacementSession = async (id, payload) => {
  const response = await API.post(
    `/gudang-produk-workspace/placement-sessions/${id}/execute`,
    payload
  );
  return {
    workspace: normalizeWorkspaceState(response?.data?.data),
    message: response?.data?.message || "Penempatan dari sesi berhasil dieksekusi.",
  };
};

/**
 * Membatalkan eksekusi sesi scan masuk — kembalikan status ke pending.
 * @param {number|string} id
 */
export const revertPlacementSession = async (id) => {
  const response = await API.post(
    `/gudang-produk-workspace/placement-sessions/${id}/revert`
  );
  return {
    workspace: normalizeWorkspaceState(response?.data?.data),
    message: response?.data?.message || "Penempatan berhasil dibatalkan.",
  };
};


export const fetchGudangProdukMutationHistory = async (params = {}) => {
  const response = await API.get("/gudang-produk/history-mutations", { params });
  return response?.data;
};

export const fetchGudangProdukHistoryOutCheck = async (params = {}) => {
  const response = await API.get("/gudang-produk/history-out-check", { params });
  return response?.data;
};

export const updateGudangProdukStokAwalLocation = async (payload) => {
  const response = await API.post(
    "/gudang-produk-workspace/stok-awal/update-location",
    payload
  );
  return response?.data;
};

export const deleteGudangProdukStokAwal = async ({ sku_id, slot_id }) => {
  const response = await API.delete("/gudang-produk-workspace/stok-awal", {
    data: { sku_id, slot_id },
  });
  return response?.data;
};

export const fetchPencarianSeriGudang = async (params) => {
  const response = await API.get("/gudang-produk-workspace/pencarian-seri", {
    params,
  });
  return response?.data;
};

export const fetchOpnameHistory = async (params = {}) => {
  const response = await API.get("/gudang-produk-workspace/opname/history", { params });
  return response?.data;
};

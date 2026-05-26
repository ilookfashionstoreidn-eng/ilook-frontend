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

const normalizeWorkspaceState = (payload = {}) => ({
  layouts: Array.isArray(payload.layouts) ? payload.layouts : [],
  products: Array.isArray(payload.products) ? payload.products : [],
  skus: Array.isArray(payload.skus) ? payload.skus : [],
  stockEntries: Array.isArray(payload.stockEntries) ? payload.stockEntries : [],
  activityLog: Array.isArray(payload.activityLog) ? payload.activityLog : [],
});

const normalizeGudangStockListPayload = (payload = {}) => ({
  data: Array.isArray(payload.data) ? payload.data : [],
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

const areIdsEqual = (left, right) =>
  left !== null &&
  left !== undefined &&
  right !== null &&
  right !== undefined &&
  String(left) === String(right);

const normalizeSearchText = (value) => String(value || "").trim().toLowerCase();

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

  const allRows = state.stockEntries
    .filter((entry) => Number(entry?.qty) > 0)
    .map((entry) => {
      const slot = slots.find((item) => String(item.id) === String(entry.slotId));
      const sku = getSkuById(state, entry.skuId);
      const product = sku ? getProductById(state, sku.productId) : null;
      const qtySisa = Number(entry.qty) || 0;
      const qtyKeluar = getActivityQtyForSlot(state.activityLog, entry.skuId, entry.slotId, "out");
      const qtyMasukFromLog = getActivityQtyForSlot(state.activityLog, entry.skuId, entry.slotId, "in");
      const qtyMasuk = Math.max(qtyMasukFromLog, qtySisa + qtyKeluar);
      const locationParts = [
        slot?.layoutName,
        slot?.alias || slot?.slotCode,
      ].filter(Boolean);

      return {
        id: entry.id || `${entry.slotId}_${entry.skuId}`,
        sku: sku?.code || entry.sku || "-",
        productName: product?.name || "",
        qtyMasuk,
        qtyKeluar,
        qtySisa,
        namaGudang: locationParts.join(" - ") || entry.slotId || "-",
        updatedAt: entry.updatedAt || null,
      };
    })
    .filter((row) => {
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

  return normalizeGudangStockListPayload({
    data: paginatedRows,
    summary: {
      total_rows: total,
      total_qty_masuk: allRows.reduce((sum, row) => sum + row.qtyMasuk, 0),
      total_qty_keluar: allRows.reduce((sum, row) => sum + row.qtyKeluar, 0),
      total_qty_sisa: allRows.reduce((sum, row) => sum + row.qtySisa, 0),
      total_locations: new Set(allRows.map((row) => row.namaGudang).filter(Boolean)).size,
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

export const fetchGudangProdukWorkspace = async () => {
  const response = await API.get("/gudang-produk-workspace");
  return normalizeWorkspaceState(response?.data?.data);
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

export const fetchGudangProdukHistory = async (params = {}) => {
  const response = await API.get("/gudang-produk/history", { params });
  return normalizeGudangProdukHistoryPayload(response?.data);
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

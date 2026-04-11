import API from "../../api";

export const emptyGudangWorkspaceState = {
  layouts: [],
  products: [],
  skus: [],
  stockEntries: [],
  activityLog: [],
};

const normalizeWorkspaceState = (payload = {}) => ({
  layouts: Array.isArray(payload.layouts) ? payload.layouts : [],
  products: Array.isArray(payload.products) ? payload.products : [],
  skus: Array.isArray(payload.skus) ? payload.skus : [],
  stockEntries: Array.isArray(payload.stockEntries) ? payload.stockEntries : [],
  activityLog: Array.isArray(payload.activityLog) ? payload.activityLog : [],
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

export const createGudangProdukLayout = async (payload) => {
  const response = await API.post("/gudang-produk-workspace/layouts", payload);

  return {
    workspace: normalizeWorkspaceState(response?.data?.data),
    layout: response?.data?.layout || null,
    message: response?.data?.message || "Gudang berhasil dibuat.",
  };
};

export const saveGudangProdukLayout = async (layout) => {
  const response = await API.put(`/gudang-produk-workspace/layouts/${layout.id}`, layout);

  return {
    workspace: normalizeWorkspaceState(response?.data?.data),
    layout: response?.data?.layout || null,
    message: response?.data?.message || "Layout berhasil diperbarui.",
  };
};

export const placeGudangProdukSku = async (payload) => {
  const response = await API.post("/gudang-produk-workspace/placements", payload);

  return {
    workspace: normalizeWorkspaceState(response?.data?.data),
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

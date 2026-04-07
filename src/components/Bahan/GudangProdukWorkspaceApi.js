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

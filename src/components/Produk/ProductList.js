import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ProductList.css";
import API from "../../api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import {
  FaChevronDown,
  FaCheck,
  FaDownload,
  FaEdit,
  FaFileExcel,
  FaImage,
  FaInfoCircle,
  FaLayerGroup,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
  FaTimesCircle,
  FaTrash,
  FaUpload,
} from "react-icons/fa";
import { FiCopy } from "react-icons/fi"; // [DUPLIKAT] - ditambahkan

const emptyMaterial = {
  material: "",
  colour: "",
  material_group: "",
  kind: "kombinasi",
};

const initialForm = {
  product: "",
  sku_name: "",
  product_group: "",
  product_size: "",
  product_source: "",
  product_colour: "",
  materials: [{ ...emptyMaterial, kind: "utama" }],
  product_accecories: "",
  product_accecories_colour: "",
  estimasi_cutting: "",
  estimasi_combi: "",
  berat_panjang: "",
  satuan_berat_panjang: "",
  berat_panjang_combi: "",
  satuan_berat_panjang_combi: "",
  LD: "",
  pj_dress: "",
  pj_celana: "",
  pj_baju: "",
  price_cmt: "",
  price_cutting: "",
  notes_spk: "",
};

const numericFields = [
  "estimasi_cutting",
  "estimasi_combi",
  "berat_panjang",
  "berat_panjang_combi",
  "LD",
  "pj_dress",
  "pj_baju",
  "price_cmt",
  "price_cutting",
];

const exportColumnGroups = [
  {
    title: "Identitas Produk",
    columns: [
      { key: "id", label: "ID" },
      { key: "sku_name", label: "SKU Name" },
      { key: "product", label: "Product" },
      { key: "product_group", label: "Product Group" },
      { key: "product_size", label: "Product Size" },
      { key: "product_source", label: "Product Source" },
      { key: "product_colour", label: "Product Colour" },
    ],
  },
  {
    title: "Material Utama",
    columns: [
      { key: "product_material_group_1", label: "product_material_group_1" },
      { key: "product_colour_1", label: "product_colour_1" },
    ],
  },
  {
    title: "Material Kombinasi",
    columns: [
      { key: "product_material_group_2", label: "product_material_group_2" },
      { key: "product_colour_2", label: "product_colour_2" },
      { key: "product_accecories", label: "product_accecories" },
      { key: "product_accecories_colour", label: "product_accecories_colour" },
    ],
  },
  {
    title: "Estimasi dan Ukuran",
    columns: [
      { key: "estimasi_cutting", label: "Estimasi Cutting" },
      { key: "estimasi_combi", label: "Estimasi Combi" },
      { key: "berat_panjang", label: "berat_panjang" },
      { key: "satuan_berat_panjang", label: "satuan_berat_panjang" },
      { key: "berat_panjang_combi", label: "berat_panjang_combi" },
      { key: "satuan_berat_panjang_combi", label: "satuan_berat_panjang_combi" },
      { key: "LD", label: "LD" },
      { key: "pj_dress", label: "PJ Dress" },
      { key: "pj_celana", label: "PJ Celana" },
      { key: "pj_baju", label: "PJ Baju" },
    ],
  },
  {
    title: "Harga dan Catatan",
    columns: [
      { key: "notes_spk", label: "notes_spk" },
      { key: "price_cmt", label: "Price CMT" },
      { key: "price_cutting", label: "Price Cutting" },
      { key: "material_count", label: "Total Material" },
      { key: "created_at", label: "Created At" },
      { key: "updated_at", label: "Updated At" },
    ],
  },
];

const allExportColumns = exportColumnGroups.flatMap((group) => group.columns.map((column) => column.key));
const defaultExportColumns = [
  "sku_name",
  "product",
  "product_group",
  "product_size",
  "product_source",
  "product_colour",
  "product_material_group_1",
  "product_colour_1",
  "product_material_group_2",
  "product_colour_2",
  "product_accecories",
  "product_accecories_colour",
  "estimasi_cutting",
  "estimasi_combi",
  "berat_panjang",
  "satuan_berat_panjang",
  "berat_panjang_combi",
  "satuan_berat_panjang_combi",
  "LD",
  "pj_dress",
  "pj_celana",
  "pj_baju",
  "notes_spk",
  "price_cmt",
  "price_cutting",
];

const normalizeSkuNameValue = (value) => String(value ?? "").trim().replace(/\s+/g, " "); // [DUPLIKAT] - ditambahkan
const PRODUCT_SIZE_SUFFIXES = [
  "ALL SIZE",
  "ONE SIZE",
  "ONESIZE",
  "XXXL",
  "XXL",
  "XL",
  "XS",
  "S",
  "M",
  "L",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
];

const parseProductFieldsFromSku = (value) => {
  const normalizedSku = normalizeSkuNameValue(value).replace(/[\u2013\u2014]/g, "-").toUpperCase();
  const [rawGroup, ...rawDescriptionParts] = normalizedSku.split("-");
  const productGroup = normalizeSkuNameValue(rawGroup);
  const description = normalizeSkuNameValue(rawDescriptionParts.join("-"));

  if (!productGroup || !description) {
    return null;
  }

  const productSize = PRODUCT_SIZE_SUFFIXES.find((size) => {
    if (description === size) {
      return true;
    }

    return description.endsWith(` ${size}`);
  });

  if (!productSize) {
    return null;
  }

  const productColour = normalizeSkuNameValue(description.slice(0, -productSize.length));
  const product = normalizeSkuNameValue(productGroup.replace(/^SET\s+/i, ""));

  if (!product || !productColour) {
    return null;
  }

  return {
    product,
    product_group: productGroup,
    product_size: productSize,
    product_source: `${productGroup} ${productSize}`,
    product_colour: productColour,
  };
};
const MAX_PRODUCT_IMAGE_UPLOAD_SIZE = 5 * 1024 * 1024;

const ProductList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalStep, setImageModalStep] = useState(1);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageAssigning, setImageAssigning] = useState(false);
  const [productImages, setProductImages] = useState([]);
  const [selectedProductImageId, setSelectedProductImageId] = useState("");
  const [imageProductSearch, setImageProductSearch] = useState("");
  const [debouncedImageProductSearch, setDebouncedImageProductSearch] = useState("");
  const [imageProductOptions, setImageProductOptions] = useState([]);
  const [imageProductLoading, setImageProductLoading] = useState(false);
  const [imageProductError, setImageProductError] = useState("");
  const [imageProductTotal, setImageProductTotal] = useState(0);
  const [selectedImageProductIds, setSelectedImageProductIds] = useState([]);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [selectedMaterialGroup1, setSelectedMaterialGroup1] = useState("");
  const [materialGroup1DropdownOpen, setMaterialGroup1DropdownOpen] = useState(false);
  const [materialGroup1SearchTerm, setMaterialGroup1SearchTerm] = useState("");
  const [selectedMaterialGroup2, setSelectedMaterialGroup2] = useState("");
  const [materialGroup2DropdownOpen, setMaterialGroup2DropdownOpen] = useState(false);
  const [materialGroup2SearchTerm, setMaterialGroup2SearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    total: 0,
    products: [],
    groups: [],
    sources: [],
    material_groups_1: [],
    material_groups_2: [],
    material_rows: 0,
  });
  const [modalMode, setModalMode] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState(defaultExportColumns);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false); // [DUPLIKAT] - ditambahkan
  const [duplicateSourceSkuName, setDuplicateSourceSkuName] = useState(""); // [DUPLIKAT] - ditambahkan
  const [form, setForm] = useState(initialForm);

  // --- MULTI-SKU MODE STATES ---
  const [isMultiSkuMode, setIsMultiSkuMode] = useState(false);


  const [multiSkuRows, setMultiSkuRows] = useState([
    { sku_name: "", product_colour: "", LD: "", material_colours: [""] }
  ]);

  const importInputRef = useRef(null);
  const groupDropdownRef = useRef(null);
  const skuNameInputRef = useRef(null); // [DUPLIKAT] - ditambahkan

  const groupOptions = useMemo(() => (summary.groups || []).filter(Boolean), [summary.groups]);
  const filteredGroupOptions = useMemo(() => {
    const term = groupSearchTerm.trim().toLowerCase();
    if (!term) return groupOptions;
    return groupOptions.filter((group) => String(group).toLowerCase().includes(term));
  }, [groupOptions, groupSearchTerm]);

  const productOptions = useMemo(() => (summary.products || []).filter(Boolean), [summary.products]);

  const materialGroup1Options = useMemo(() => (summary.material_groups_1 || []).filter(Boolean), [summary.material_groups_1]);
  const filteredMaterialGroup1Options = useMemo(() => {
    const term = materialGroup1SearchTerm.trim().toLowerCase();
    if (!term) return materialGroup1Options;
    return materialGroup1Options.filter((group) => String(group).toLowerCase().includes(term));
  }, [materialGroup1Options, materialGroup1SearchTerm]);

  const materialGroup2Options = useMemo(() => (summary.material_groups_2 || []).filter(Boolean), [summary.material_groups_2]);
  const filteredMaterialGroup2Options = useMemo(() => {
    const term = materialGroup2SearchTerm.trim().toLowerCase();
    if (!term) return materialGroup2Options;
    return materialGroup2Options.filter((group) => String(group).toLowerCase().includes(term));
  }, [materialGroup2Options, materialGroup2SearchTerm]);

  const showSuccessAlert = (title, text) => {
    return Swal.fire({
      icon: "success",
      title,
      text,
      timer: 1800,
      showConfirmButton: false,
      timerProgressBar: true,
    });
  };

  const showErrorAlert = (title, text) => {
    return Swal.fire({
      icon: "error",
      title,
      text,
      confirmButtonText: "Mengerti",
      confirmButtonColor: "#2563eb",
    });
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const getProductImageObject = (item = {}) =>
    item?.product_list_image || item?.productListImage || item?.product_image || item?.image || null;

  const getProductImageUrl = (source = {}) => {
    const image = getProductImageObject(source) || source;
    const rawUrl = image?.image_url || "";

    if (rawUrl) {
      if (rawUrl.startsWith("/") || rawUrl.startsWith("blob:")) {
        return rawUrl;
      }

      try {
        const parsedUrl = new URL(rawUrl);
        if (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1") {
          return parsedUrl.pathname;
        }

        return rawUrl;
      } catch {
        return rawUrl;
      }
    }

    const imagePath = image?.image_path || "";
    const filename = String(imagePath).split("/").filter(Boolean).pop();

    if (!filename) {
      return "";
    }

    const apiBaseUrl = (process.env.REACT_APP_API_URL || "/api").replace(/\/$/, "");
    return `${apiBaseUrl}/product-list-images/${encodeURIComponent(filename)}`;
  };

  const normalizeMaterials = (materials) => {
    const source = Array.isArray(materials) ? materials : [];
    const normalized = source.map((item, index) => ({
      material: String(item?.material || "").trim(),
      colour: String(item?.colour || "").trim(),
      material_group: String(item?.material_group || "").trim(),
      kind: (() => {
        const raw = String(item?.kind || "").trim().toLowerCase();
        if (raw === "utama" || raw === "kombinasi" || raw === "aksesoris") {
          return raw;
        }
        return index === 0 ? "utama" : "kombinasi";
      })(),
    }));

    const filled = normalized.filter((item) => item.material || item.colour || item.material_group);
    return filled.length ? filled : [{ ...emptyMaterial, kind: "utama" }];
  };

  const toForm = (item = {}) => ({
    product: item.product || "",
    sku_name: item.sku_name || "",
    product_group: item.product_group || "",
    product_size: item.product_size || "",
    product_source: item.product_source || "",
    product_colour: item.product_colour || "",
    materials: normalizeMaterials(item.materials),
    product_accecories: item.product_accecories || "",
    product_accecories_colour: item.product_accecories_colour || "",
    estimasi_cutting: item.estimasi_cutting ?? "",
    estimasi_combi: item.estimasi_combi ?? "",
    berat_panjang: item.berat_panjang ?? "",
    satuan_berat_panjang: item.satuan_berat_panjang || "",
    berat_panjang_combi: item.berat_panjang_combi ?? "",
    satuan_berat_panjang_combi: item.satuan_berat_panjang_combi || "",
    LD: item.LD ?? "",
    pj_dress: item.pj_dress ?? "",
    pj_celana: item.pj_celana ?? "",
    pj_baju: item.pj_baju ?? "",
    price_cmt: item.price_cmt ?? "",
    price_cutting: item.price_cutting ?? "",
    notes_spk: item.notes_spk || "",
  });

  const buildPayload = () => {
    const payload = {
      ...form,
      materials: normalizeMaterials(form.materials).filter(
        (item) => item.material || item.colour || item.material_group
      ),
    };

    numericFields.forEach((field) => {
      payload[field] = payload[field] === "" || payload[field] === null ? null : payload[field];
    });

    return payload;
  };

  const getApiErrorMessage = (err, fallback) => {
    if (!err?.response) {
      return "Gagal menghubungi backend API. Pastikan Laravel berjalan di http://localhost:8000.";
    }

    const validationErrors = err?.response?.data?.errors;
    if (validationErrors && typeof validationErrors === "object") {
      const firstError = Object.values(validationErrors)[0];
      if (Array.isArray(firstError) && firstError.length) {
        return firstError[0];
      }
    }

    const status = err.response?.status;
    const message = err?.response?.data?.message || fallback;

    return status ? `${message} (HTTP ${status})` : message;
  };

  const getBlobErrorMessage = async (err, fallback) => {
    const data = err?.response?.data;

    if (data instanceof Blob) {
      const text = await data.text();

      try {
        const parsed = JSON.parse(text);
        return parsed.message || fallback;
      } catch {
        return text || fallback;
      }
    }

    return getApiErrorMessage(err, fallback);
  };

  const getDownloadFileName = (headers, fallback) => {
    const disposition = headers?.["content-disposition"] || headers?.["Content-Disposition"] || "";
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const plainMatch = disposition.match(/filename="?([^";]+)"?/i);

    if (utfMatch?.[1]) {
      return decodeURIComponent(utfMatch[1]);
    }

    return plainMatch?.[1] || fallback;
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    const numeric = Number(value);

    if (Number.isNaN(numeric)) {
      return value;
    }

    return numeric.toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });
  };

  const fetchProductLists = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await API.get("/product-list", {
        params: {
          search: debouncedSearchTerm || "",
          product_group: selectedGroup || "",
          material_group_1: selectedMaterialGroup1 || "",
          material_group_2: selectedMaterialGroup2 || "",
          page: currentPage,
          per_page: 50,
        },
      });

      setItems(response.data.data || []);
      setCurrentPage(response.data.current_page || 1);
      setLastPage(response.data.last_page || 1);
      setTotal(response.data.total || 0);
      setSummary(
        response.data.summary || {
          total: response.data.total || 0,
          products: [],
          groups: [],
          sources: [],
          material_groups_1: [],
          material_groups_2: [],
          material_rows: 0,
        }
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Gagal mengambil data Product List."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductLists();
  }, [debouncedSearchTerm, selectedGroup, selectedMaterialGroup1, selectedMaterialGroup2, currentPage]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchInput.trim());
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target)) {
        setGroupDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedImageProductSearch(imageProductSearch.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [imageProductSearch]);

  useEffect(() => {
    if (!imageModalOpen || imageModalStep !== 2) {
      return;
    }

    let ignore = false;

    const fetchImageProductOptions = async () => {
      try {
        setImageProductLoading(true);
        setImageProductError("");

        const response = await API.get("/product-list", {
          params: {
            search: debouncedImageProductSearch || "",
            page: 1,
            per_page: 100,
          },
        });

        if (ignore) return;

        const rows = response.data.data || [];
        setImageProductOptions(rows);
        setImageProductTotal(Number(response.data.total) || rows.length);
      } catch (err) {
        if (ignore) return;
        setImageProductOptions([]);
        setImageProductTotal(0);
        setImageProductError(getApiErrorMessage(err, "Gagal mencari data Product List."));
      } finally {
        if (!ignore) {
          setImageProductLoading(false);
        }
      }
    };

    fetchImageProductOptions();

    return () => {
      ignore = true;
    };
  }, [imageModalOpen, imageModalStep, debouncedImageProductSearch]);

  const handleGroupSelect = (value) => {
    setCurrentPage(1);
    setSelectedGroup(value);
    setGroupSearchTerm("");
    setGroupDropdownOpen(false);
  };

  const duplicateProductToForm = (item = {}) => ({ // [DUPLIKAT] - ditambahkan
    ...item,
    id: null,
    created_at: undefined,
    updated_at: undefined,
  });

  useEffect(() => { // [DUPLIKAT] - ditambahkan
    if (!isDuplicate || modalMode !== "add") return;

    const focusTimer = window.setTimeout(() => {
      skuNameInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [isDuplicate, modalMode]);


  const openAddModal = () => {
    setSelectedItem(null);
    setIsDuplicate(false); // [DUPLIKAT] - ditambahkan
    setDuplicateSourceSkuName(""); // [DUPLIKAT] - ditambahkan
    setForm(initialForm);
    setIsMultiSkuMode(false);
    setMultiSkuRows([{ sku_name: "", product_colour: "", LD: "", material_colours: initialForm.materials.map(() => "") }]);
    setModalMode("add");
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setIsDuplicate(false); // [DUPLIKAT] - ditambahkan
    setDuplicateSourceSkuName(""); // [DUPLIKAT] - ditambahkan
    setForm(toForm(item));
    setIsMultiSkuMode(false);
    setModalMode("edit");
  };

  const handleDuplicate = (item) => { // [DUPLIKAT] - ditambahkan
    const duplicatedItem = duplicateProductToForm(item);
    setSelectedItem(item);
    setIsDuplicate(true);
    setDuplicateSourceSkuName(item?.sku_name || ""); // [DUPLIKAT] - ditambahkan
    setForm(toForm(duplicatedItem));
    setIsMultiSkuMode(false);
    setModalMode("add");
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setIsDuplicate(false); // [DUPLIKAT] - ditambahkan
    setDuplicateSourceSkuName(""); // [DUPLIKAT] - ditambahkan
    setModalMode("detail");
  };

  const closeModal = (force = false) => {
    if (saving && !force) return;
    setModalMode(null);
    setSelectedItem(null);
    setIsDuplicate(false); // [DUPLIKAT] - ditambahkan
    setDuplicateSourceSkuName(""); // [DUPLIKAT] - ditambahkan
    setForm(initialForm);
    setIsMultiSkuMode(false);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      if (name !== "sku_name") {
        const nextForm = { ...prev, [name]: value };
        if (name === "product_group" || name === "product_size") {
          const pg = name === "product_group" ? value : prev.product_group;
          const ps = name === "product_size" ? value : prev.product_size;
          nextForm.product_source = `${pg || ""} ${ps || ""}`.trim();
        }
        return nextForm;
      }

      const parsedProductFields = parseProductFieldsFromSku(value);

      return {
        ...prev,
        sku_name: value,
        ...(parsedProductFields || {}),
      };
    });
  };

  const handleMaterialChange = (index, field, value) => {
    setForm((prev) => {
      const nextMaterials = [...prev.materials];
      nextMaterials[index] = {
        ...nextMaterials[index],
        [field]: value,
      };
      return { ...prev, materials: nextMaterials };
    });
  };

  const addMaterialRow = () => {
    setForm((prev) => ({
      ...prev,
      materials: [...prev.materials, { ...emptyMaterial, kind: "kombinasi" }],
    }));
    setMultiSkuRows(prev => prev.map(row => ({
      ...row,
      material_colours: [...row.material_colours, ""]
    })));
  };

  const removeMaterialRow = (index) => {
    setForm((prev) => {
      if (prev.materials.length === 1) {
        return { ...prev, materials: [{ ...emptyMaterial, kind: "utama" }] };
      }

      return {
        ...prev,
        materials: prev.materials.filter((_, materialIndex) => materialIndex !== index),
      };
    });
    setMultiSkuRows(prev => prev.map(row => {
      const newMaterialColours = [...row.material_colours];
      if (newMaterialColours.length > 1) {
        newMaterialColours.splice(index, 1);
      }
      return { ...row, material_colours: newMaterialColours };
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isDuplicate && normalizeSkuNameValue(form.sku_name) === normalizeSkuNameValue(duplicateSourceSkuName)) { // [DUPLIKAT] - dimodifikasi
      await showErrorAlert(
        "SKU Name Belum Diubah",
        "SKU Name harus diubah dulu sebelum duplikat disimpan."
      );
      return;
    }

    try {
      setSaving(true);

      if (isMultiSkuMode) {
        // Mode Multi-SKU (Bulk Insert)
        const validRows = multiSkuRows.filter(r => r.sku_name.trim());
        if (validRows.length === 0) {
          await showErrorAlert("Tabel Kosong", "Masukkan minimal 1 Varian (SKU Name tidak boleh kosong).");
          setSaving(false);
          return;
        }

        Swal.fire({
          title: "Menyimpan Varian...",
          text: `Menyimpan 0 dari ${validRows.length} varian.`,
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => Swal.showLoading(),
        });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < validRows.length; i++) {
          const row = validRows[i];

          // Clone form base materials
          const materialsClone = form.materials.map((m, index) => ({
            ...m,
            colour: row.material_colours[index] || m.colour
          }));

          const rowPayload = {
            ...form,
            sku_name: row.sku_name,
            product_colour: row.product_colour,
            LD: row.LD,
            materials: normalizeMaterials(materialsClone).filter(
              (item) => item.material || item.colour || item.material_group
            ),
          };

          numericFields.forEach((field) => {
            rowPayload[field] = rowPayload[field] === "" || rowPayload[field] === null ? null : rowPayload[field];
          });

          try {
            await API.post("/product-list", rowPayload);
            successCount++;
          } catch (err) {
            console.error("Gagal simpan varian:", row.sku_name, err);
            failCount++;
          }

          Swal.update({
            text: `Menyimpan ${i + 1} dari ${validRows.length} varian.`,
          });
        }

        closeModal(true);
        await fetchProductLists();

        if (failCount > 0) {
          await Swal.fire({
            icon: "warning",
            title: "Simpan Selesai dengan Error",
            text: `Berhasil menyimpan ${successCount} varian, Gagal menyimpan ${failCount} varian.`,
          });
        } else {
          await showSuccessAlert("Berhasil", `${successCount} Varian berhasil ditambahkan.`);
        }

      } else {
        // Single Insert / Update Mode
        const payload = buildPayload();

        if (!isDuplicate && modalMode === "edit" && selectedItem?.id) { // [DUPLIKAT] - dimodifikasi
          await API.put(`/product-list/${selectedItem.id}`, payload);
          closeModal(true);
          await fetchProductLists();
          await showSuccessAlert("Berhasil", "Product List berhasil diperbarui.");
        } else {
          await API.post("/product-list", payload);
          closeModal(true);
          await fetchProductLists();
          await showSuccessAlert("Berhasil", isDuplicate ? "Product List berhasil diduplikasi." : "Product List berhasil ditambahkan."); // [DUPLIKAT] - dimodifikasi
        }
      }
    } catch (err) {
      Swal.close();
      await showErrorAlert("Gagal Menyimpan", getApiErrorMessage(err, "Data Product List gagal disimpan."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus Product List?",
      text: `Data "${item.product}"${item.sku_name ? ` / ${item.sku_name}` : ""} akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#be123c",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await API.delete(`/product-list/${item.id}`);
      await fetchProductLists();
      await showSuccessAlert("Terhapus", "Product List berhasil dihapus.");
    } catch (err) {
      await showErrorAlert("Gagal Menghapus", getApiErrorMessage(err, "Product List gagal dihapus."));
    }
  };

  const handleImportButtonClick = () => {
    importInputRef.current?.click();
  };

  const openExportModal = () => {
    setExportModalOpen(true);
  };

  const closeExportModal = () => {
    if (exporting) return;
    setExportModalOpen(false);
  };

  const resetImageModalState = () => {
    setImageModalOpen(false);
    setImageModalStep(1);
    setImageFile(null);
    setImagePreview("");
    setProductImages([]);
    setSelectedProductImageId("");
    setImageProductSearch("");
    setDebouncedImageProductSearch("");
    setImageProductOptions([]);
    setImageProductError("");
    setImageProductTotal(0);
    setSelectedImageProductIds([]);
  };

  const openImageModal = () => {
    setModalMode(null);
    setExportModalOpen(false);
    setImageModalOpen(true);
    setImageModalStep(1);
    setImageProductError("");
  };

  const closeImageModal = () => {
    if (imageUploading || imageAssigning) return;
    resetImageModalState();
  };

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showErrorAlert("File Tidak Valid", "File harus berupa gambar JPG, PNG, atau WEBP.");
      return;
    }

    if (file.size > MAX_PRODUCT_IMAGE_UPLOAD_SIZE) {
      showErrorAlert("Gambar Terlalu Besar", "Ukuran gambar maksimal 5 MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageUpload = async () => {
    if (!imageFile) {
      await showErrorAlert("Pilih Foto", "Upload foto produk terlebih dahulu.");
      return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      setImageUploading(true);
      const response = await API.post("/product-list/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedImage = response.data.data;

      if (uploadedImage?.id) {
        setProductImages((prev) => [
          uploadedImage,
          ...prev.filter((image) => image.id !== uploadedImage.id),
        ]);
        setSelectedProductImageId(uploadedImage.id);
      }

      setImageModalStep(2);
    } catch (err) {
      await showErrorAlert("Upload Gagal", getApiErrorMessage(err, "Foto produk gagal diupload."));
    } finally {
      setImageUploading(false);
    }
  };

  const toggleImageProductSelection = (productId) => {
    setSelectedImageProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleImageAssign = async (event) => {
    event.preventDefault();

    if (!selectedProductImageId) {
      await showErrorAlert("Pilih Foto", "Pilih foto yang akan di-assign ke Product List.");
      return;
    }

    if (selectedImageProductIds.length === 0) {
      await showErrorAlert("Pilih Product", "Pilih minimal satu product untuk foto ini.");
      return;
    }

    try {
      setImageAssigning(true);
      await API.post("/product-list/assign-image", {
        product_list_image_id: selectedProductImageId,
        product_list_ids: selectedImageProductIds,
      });
      resetImageModalState();
      await fetchProductLists();
      await showSuccessAlert("Berhasil", "Foto berhasil di-assign ke Product List.");
    } catch (err) {
      await showErrorAlert("Assign Gagal", getApiErrorMessage(err, "Foto gagal di-assign ke Product List."));
    } finally {
      setImageAssigning(false);
    }
  };

  const openProductImagePreview = (imageUrl, title) => {
    if (!imageUrl) return;

    Swal.fire({
      title: title || "Preview Foto Produk",
      imageUrl,
      imageAlt: title || "Preview Foto Produk",
      confirmButtonText: "Tutup",
      confirmButtonColor: "#2563eb",
      width: 720,
    });
  };

  const toggleExportColumn = (columnKey) => {
    setSelectedExportColumns((prev) => {
      const nextSet = new Set(prev);

      if (prev.includes(columnKey)) {
        nextSet.delete(columnKey);
      } else {
        nextSet.add(columnKey);
      }

      return allExportColumns.filter((column) => nextSet.has(column));
    });
  };

  const selectAllExportColumns = () => {
    setSelectedExportColumns(allExportColumns);
  };

  const resetDefaultExportColumns = () => {
    setSelectedExportColumns(defaultExportColumns);
  };

  const handleExport = async () => {
    if (!selectedExportColumns.length) {
      await showErrorAlert("Kolom Belum Dipilih", "Pilih minimal satu kolom untuk export Excel.");
      return;
    }

    try {
      setExporting(true);
      Swal.fire({
        title: "Menyiapkan export...",
        text: "Mohon tunggu sampai file Excel selesai dibuat.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await API.post(
        "/product-list/export",
        {
          columns: selectedExportColumns,
          search: debouncedSearchTerm || "",
          product_group: selectedGroup || "",
          sortBy: "id",
          sortOrder: "desc",
        },
        {
          responseType: "blob",
          timeout: 600000,
        }
      );

      const fileName = getDownloadFileName(
        response.headers,
        `product-list-${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setExportModalOpen(false);
      await showSuccessAlert("Export Selesai", "File Excel berhasil dibuat.");
    } catch (err) {
      Swal.close();
      await showErrorAlert("Export Gagal", await getBlobErrorMessage(err, "File Excel gagal diexport."));
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      Swal.fire({
        title: "Menyiapkan Template...",
        text: "Mohon tunggu sebentar.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await API.get("/product-list/template", {
        responseType: "blob",
        timeout: 600000,
      });

      const fileName = "template_product_list.xlsx";
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      Swal.close();
    } catch (err) {
      Swal.close();
      await showErrorAlert("Gagal", "Gagal mengunduh template Excel.");
    }
  };

  const handleImportChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const confirm = await Swal.fire({
      icon: "question",
      title: "Import Product List?",
      text: `File "${file.name}" akan diproses ke database Product List.`,
      showCancelButton: true,
      confirmButtonText: "Import",
      cancelButtonText: "Batal",
      confirmButtonColor: "#047857",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setImporting(true);
      Swal.fire({
        title: "Mengimport data...",
        text: "Mohon tunggu sampai proses selesai.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await API.post("/product-list/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600000,
      });

      await fetchProductLists();

      const result = response.data || {};
      const errors = Array.isArray(result.errors) ? result.errors : [];
      const errorList = errors
        .slice(0, 8)
        .map((item) => `<li>Row ${escapeHtml(item.row)}: ${escapeHtml(item.message)}</li>`)
        .join("");

      await Swal.fire({
        icon: result.total_errors > 0 ? "warning" : "success",
        title: "Import Selesai",
        html: `
          <div class="product-list-import-result">
            <div><strong>${Number(result.processed || 0).toLocaleString("id-ID")}</strong><span>Diproses</span></div>
            <div><strong>${Number(result.created || 0).toLocaleString("id-ID")}</strong><span>Data baru</span></div>
            <div><strong>${Number(result.updated || 0).toLocaleString("id-ID")}</strong><span>Update</span></div>
            <div><strong>${Number(result.skipped || 0).toLocaleString("id-ID")}</strong><span>Skip</span></div>
            <div><strong>${Number(result.empty_sku_rows || 0).toLocaleString("id-ID")}</strong><span>SKU kosong</span></div>
            <div><strong>${Number(result.duplicate_sku_rows || 0).toLocaleString("id-ID")}</strong><span>SKU duplikat</span></div>
          </div>
          ${errorList
            ? `<div class="product-list-import-errors"><p>Catatan:</p><ul>${errorList}</ul></div>`
            : ""
          }
        `,
        confirmButtonText: "Selesai",
        confirmButtonColor: "#2563eb",
      });
    } catch (err) {
      Swal.close();
      await showErrorAlert("Import Gagal", getApiErrorMessage(err, "File Excel gagal diimport."));
    } finally {
      setImporting(false);
    }
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > lastPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getMaterialRoleLabel = (index, kind) => {
    if (index === 0) return "Utama";
    return kind === "aksesoris" ? "Aksesoris" : "Kombinasi";
  };
  const getMaterialRoleClass = (index) => (index === 0 ? "main" : "combo");
  const tableValue = (value) => (value === null || value === undefined || value === "" ? "-" : value);
  const getMaterialTableValue = (materials, index, field) => {
    const material = normalizeMaterials(materials)[index] || {};
    return tableValue(material[field]);
  };

  const renderMaterialText = (materials) => {
    const normalized = normalizeMaterials(materials).filter(
      (item) => item.material || item.colour || item.material_group
    );

    if (!normalized.length) {
      return <span className="product-list-muted">-</span>;
    }

    return normalized
      .map((material) =>
        [material.material_group || material.material, material.colour].filter(Boolean).join(" / ")
      )
      .filter(Boolean)
      .join(" | ");
  };

  const renderModal = () => {
    if (!modalMode) return null;

    if (modalMode === "detail") {
      const materials = normalizeMaterials(selectedItem?.materials).filter(
        (item) => item.material || item.colour || item.material_group
      );
      const imageUrl = getProductImageUrl(selectedItem);

      return (
        <div className="product-list-modal-backdrop" onClick={closeModal}>
          <div className="product-list-modal detail" onClick={(event) => event.stopPropagation()}>
            <div className="product-list-modal-header">
              <div>
                <p className="product-list-modal-kicker">Detail Product List</p>
                <h2>{selectedItem?.product || "-"}</h2>
              </div>
              <button className="product-list-icon-button" onClick={closeModal} type="button">
                <FaTimes />
              </button>
            </div>

            <div className="product-list-detail-photo">
              <button
                className={`product-list-detail-photo-frame${imageUrl ? " has-image" : ""}`}
                type="button"
                onClick={() => openProductImagePreview(imageUrl, selectedItem?.sku_name || selectedItem?.product)}
                disabled={!imageUrl}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt={selectedItem?.sku_name || selectedItem?.product || "Foto produk"} />
                ) : (
                  <span>
                    <FaImage />
                    Belum ada foto
                  </span>
                )}
              </button>
              <div>
                <h3>Foto Produk</h3>
                <p>{imageUrl ? "Klik foto untuk preview ukuran besar." : "Foto belum di-assign ke product ini."}</p>
              </div>
            </div>

            <div className="product-list-detail-grid">
              <DetailItem label="Product Group" value={selectedItem?.product_group} />
              <DetailItem label="SKU Name" value={selectedItem?.sku_name} />
              <DetailItem label="Product Size" value={selectedItem?.product_size} />
              <DetailItem label="Product Source" value={selectedItem?.product_source} />
              <DetailItem label="Product Colour" value={selectedItem?.product_colour} />
              <DetailItem label="Product Accessories" value={selectedItem?.product_accecories} />
              <DetailItem label="Product Accessories Colour" value={selectedItem?.product_accecories_colour} />
              <DetailItem label="Estimasi Cutting" value={selectedItem?.estimasi_cutting} suffix=" pcs" />
              <DetailItem label="Estimasi Combi" value={selectedItem?.estimasi_combi} suffix=" pcs" />
              <DetailItem label="Berat Panjang" value={selectedItem?.berat_panjang} />
              <DetailItem label="Satuan Berat Panjang" value={selectedItem?.satuan_berat_panjang} />
              <DetailItem label="Berat Panjang Combi" value={selectedItem?.berat_panjang_combi} />
              <DetailItem label="Satuan Berat Panjang Combi" value={selectedItem?.satuan_berat_panjang_combi} />
              <DetailItem label="LD" value={selectedItem?.LD} />
              <DetailItem label="PJ Dress" value={selectedItem?.pj_dress} />
              <DetailItem label="PJ Celana" value={selectedItem?.pj_celana} />
              <DetailItem label="PJ Baju" value={selectedItem?.pj_baju} />
              <DetailItem label="Price CMT" value={formatCurrency(selectedItem?.price_cmt)} />
              <DetailItem label="Price Cutting" value={formatCurrency(selectedItem?.price_cutting)} />
            </div>

            <div className="product-list-detail-section">
              <h3>Material</h3>
              {materials.length ? (
                <div className="product-list-detail-materials">
                  {materials.map((material, index) => (
                    <div
                      className={`product-list-detail-material ${getMaterialRoleClass(index)}`}
                      key={`${material.material}-${index}`}
                    >
                      <span>#{index + 1}</span>
                      <div className="product-list-detail-material-copy">
                        <em>
                          {index === 0
                            ? "Material Utama"
                            : `${getMaterialRoleLabel(index, material.kind)} ${index}`}
                        </em>
                        <strong>{material.material_group || material.material || "-"}</strong>
                        <small>{material.colour || "-"}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="product-list-empty-note">Belum ada material.</p>
              )}
            </div>

            <div className="product-list-detail-section">
              <h3>Notes SPK</h3>
              <p className="product-list-notes">{selectedItem?.notes_spk || "-"}</p>
            </div>
          </div>
        </div>
      );
    }

    const modalTitle = isDuplicate ? "DUPLIKAT PRODUCT LIST" : modalMode === "edit" ? "EDIT PRODUCT LIST" : "TAMBAH PRODUCT LIST"; // [DUPLIKAT] - ditambahkan
    const modalHeading = isDuplicate ? "DUPLIKAT PRODUCT LIST" : modalMode === "edit" ? form.product || "Edit data" : "Data produk baru"; // [DUPLIKAT] - ditambahkan
    const isDuplicateSkuLocked = isDuplicate && normalizeSkuNameValue(form.sku_name) === normalizeSkuNameValue(duplicateSourceSkuName); // [DUPLIKAT] - ditambahkan

    return (
      <div className="product-list-modal-backdrop" onClick={closeModal}>
        <form className="product-list-modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
          <div className="product-list-modal-header">
            <div>
              <p className="product-list-modal-kicker">
                {modalTitle}{/* [DUPLIKAT] - dimodifikasi */}
              </p>
              <h2>{modalHeading}{/* [DUPLIKAT] - dimodifikasi */}</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {modalMode === "add" && !isDuplicate && (
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", background: isMultiSkuMode ? "#e0e7ff" : "#f1f5f9", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", color: isMultiSkuMode ? "#4338ca" : "#475569", transition: "all 0.2s" }}>
                  <input type="checkbox" checked={isMultiSkuMode} onChange={(e) => setIsMultiSkuMode(e.target.checked)} style={{ width: "18px", height: "18px", accentColor: "#4f46e5", cursor: "pointer" }} />
                  Mode Multi-SKU (Banyak Varian)
                </label>
              )}
              <button className="product-list-icon-button" onClick={closeModal} type="button">
                <FaTimes />
              </button>
            </div>
          </div>

          <div className="product-list-form-section">
            <h3>Informasi Produk {isMultiSkuMode && <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>(Kolom SKU dan Warna dikunci saat Multi-SKU aktif)</span>}</h3>
            <div className="product-list-form-grid">
              <Field label="Product" name="product" value={form.product} onChange={handleInputChange} required />
              <Field label="SKU Name" name="sku_name" value={isMultiSkuMode ? "Diisi di tabel bawah" : form.sku_name} onChange={handleInputChange} inputRef={skuNameInputRef} autoFocus={isDuplicate} required={!isMultiSkuMode && modalMode !== "edit"} disabled={isMultiSkuMode} />
              <Field label="Product Group" name="product_group" value={form.product_group} onChange={handleInputChange} />
              <Field label="Product Size" name="product_size" value={form.product_size} onChange={handleInputChange} />
              <Field label="Product Source" name="product_source" value={form.product_source} disabled={true} onChange={handleInputChange} />
              <Field label="Product Colour" name="product_colour" value={isMultiSkuMode ? "Diisi di tabel bawah" : form.product_colour} onChange={handleInputChange} disabled={isMultiSkuMode} />
            </div>
          </div>

          <div className="product-list-form-section">
            <div className="product-list-section-heading">
              <h3>Material Produk</h3>
              <button className="product-list-secondary-button" type="button" onClick={addMaterialRow}>
                <FaPlus /> Kombinasi
              </button>
            </div>
            <div className="product-list-material-editor">
              {form.materials.map((material, index) => (
                <div
                  className={`product-list-material-row ${getMaterialRoleClass(index)}`}
                  key={`material-row-${index}`}
                >
                  <div className="product-list-material-role">
                    <span className="product-list-row-index">{index + 1}</span>
                    <span className="product-list-material-role-badge">
                      {index === 0 ? (
                        "Material Utama"
                      ) : (
                        <select
                          className="product-list-material-kind-select"
                          value={material.kind || "kombinasi"}
                          onChange={(event) => handleMaterialChange(index, "kind", event.target.value)}
                        >
                          <option value="kombinasi">{`Kombinasi ${index}`}</option>
                          <option value="aksesoris">{`Aksesoris ${index}`}</option>
                        </select>
                      )}
                    </span>
                  </div>
                  <Field
                    label="Material Group"
                    value={material.material_group}
                    onChange={(event) => handleMaterialChange(index, "material_group", event.target.value)}
                  />
                  <Field
                    label="Product Colour"
                    value={isMultiSkuMode ? "Diisi di tabel" : material.colour}
                    onChange={(event) => handleMaterialChange(index, "colour", event.target.value)}
                    disabled={isMultiSkuMode}
                  />
                  <button
                    className="product-list-icon-button danger"
                    type="button"
                    onClick={() => removeMaterialRow(index)}
                    title="Hapus material"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="product-list-form-section">
            <h3>Aksesoris, Estimasi, Ukuran, dan Price</h3>
            <div className="product-list-form-grid">
              <Field
                label="Product Accessories"
                name="product_accecories"
                value={form.product_accecories}
                onChange={handleInputChange}
              />
              <Field
                label="Product Accessories Colour"
                name="product_accecories_colour"
                value={form.product_accecories_colour}
                onChange={handleInputChange}
              />
              <Field
                label="Estimasi Cutting"
                name="estimasi_cutting"
                type="number"
                value={form.estimasi_cutting}
                onChange={handleInputChange}
              />
              <Field
                label="Estimasi Combi"
                name="estimasi_combi"
                type="number"
                value={form.estimasi_combi}
                onChange={handleInputChange}
              />
              <Field label="Berat Panjang" name="berat_panjang" type="number" value={form.berat_panjang} onChange={handleInputChange} />
              <Field label="Satuan Berat Panjang" name="satuan_berat_panjang" value={form.satuan_berat_panjang} onChange={handleInputChange} />
              <Field label="Berat Panjang Combi" name="berat_panjang_combi" type="number" value={form.berat_panjang_combi} onChange={handleInputChange} />
              <Field label="Satuan Berat Panjang Combi" name="satuan_berat_panjang_combi" value={form.satuan_berat_panjang_combi} onChange={handleInputChange} />
              <Field label="LD" name="LD" type={isMultiSkuMode ? "text" : "number"} value={isMultiSkuMode ? "Diisi di tabel" : form.LD} onChange={handleInputChange} disabled={isMultiSkuMode} />
              <Field label="PJ Dress" name="pj_dress" type="number" value={form.pj_dress} onChange={handleInputChange} />
              <Field label="PJ Celana" name="pj_celana" value={form.pj_celana} onChange={handleInputChange} />
              <Field label="PJ Baju" name="pj_baju" type="number" value={form.pj_baju} onChange={handleInputChange} />
              <Field label="Price CMT" name="price_cmt" type="number" value={form.price_cmt} onChange={handleInputChange} />
              <Field
                label="Price Cutting"
                name="price_cutting"
                type="number"
                value={form.price_cutting}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="product-list-form-section">
            <label className="product-list-field full">
              <span>Notes SPK</span>
              <textarea
                name="notes_spk"
                value={form.notes_spk}
                onChange={handleInputChange}
                placeholder="Catatan tambahan untuk SPK"
                rows={4}
              />
            </label>
          </div>

          {isMultiSkuMode && (
            <div className="product-list-form-section" style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, color: "#334155" }}>Tabel Varian Multi-SKU</h3>
                <button
                  type="button"
                  onClick={() => setMultiSkuRows(prev => [...prev, { sku_name: "", product_colour: "", LD: "", material_colours: form.materials.map(() => "") }])}
                  style={{ background: "#4f46e5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <FaPlus /> Tambah Varian
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ background: "#e2e8f0", color: "#475569" }}>
                      <th style={{ padding: "10px", textAlign: "left", borderRadius: "6px 0 0 0" }}>#</th>
                      <th style={{ padding: "10px", textAlign: "left" }}>SKU Name*</th>
                      <th style={{ padding: "10px", textAlign: "left" }}>Product Colour</th>
                      <th style={{ padding: "10px", textAlign: "left" }}>LD</th>
                      {form.materials.map((m, idx) => (
                        <th key={idx} style={{ padding: "10px", textAlign: "left" }}>Warna {idx === 0 ? "Bahan Utama" : "Bahan Kombinasi " + idx}</th>
                      ))}
                      <th style={{ padding: "10px", textAlign: "center", borderRadius: "0 6px 0 0" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {multiSkuRows.map((row, rowIndex) => (
                      <tr key={rowIndex} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px", color: "#64748b" }}>{rowIndex + 1}</td>
                        <td style={{ padding: "8px" }}>
                          <input type="text" value={row.sku_name} onChange={(e) => { const newRows = [...multiSkuRows]; newRows[rowIndex].sku_name = e.target.value; setMultiSkuRows(newRows); }} style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }} placeholder="SKU Varian" required />
                        </td>
                        <td style={{ padding: "8px" }}>
                          <input type="text" value={row.product_colour} onChange={(e) => { const newRows = [...multiSkuRows]; newRows[rowIndex].product_colour = e.target.value; setMultiSkuRows(newRows); }} style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }} placeholder="Warna" />
                        </td>
                        <td style={{ padding: "8px" }}>
                          <input type="number" value={row.LD} onChange={(e) => { const newRows = [...multiSkuRows]; newRows[rowIndex].LD = e.target.value; setMultiSkuRows(newRows); }} style={{ width: "80px", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }} placeholder="LD" />
                        </td>
                        {form.materials.map((m, matIndex) => (
                          <td key={matIndex} style={{ padding: "8px" }}>
                            <input type="text" value={row.material_colours[matIndex] || ""} onChange={(e) => { const newRows = [...multiSkuRows]; newRows[rowIndex].material_colours[matIndex] = e.target.value; setMultiSkuRows(newRows); }} style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }} placeholder="Warna Bahan" />
                          </td>
                        ))}
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          <button type="button" onClick={() => { if (multiSkuRows.length > 1) { setMultiSkuRows(prev => prev.filter((_, i) => i !== rowIndex)); } }} disabled={multiSkuRows.length <= 1} style={{ background: "none", border: "none", color: multiSkuRows.length <= 1 ? "#cbd5e1" : "#ef4444", cursor: multiSkuRows.length <= 1 ? "not-allowed" : "pointer", padding: "4px" }}>
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="product-list-modal-actions">
            <button className="product-list-ghost-button" type="button" onClick={closeModal}>
              Batal
            </button>
            <button className="product-list-primary-button" type="submit" disabled={saving || isDuplicateSkuLocked}> {/* [DUPLIKAT] - dimodifikasi */}
              <FaSave /> {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderExportModal = () => {
    if (!exportModalOpen) return null;

    return (
      <div className="product-list-modal-backdrop" onClick={closeExportModal}>
        <div className="product-list-modal export" onClick={(event) => event.stopPropagation()}>
          <div className="product-list-modal-header">
            <div>
              <p className="product-list-modal-kicker">Export Product List</p>
              <h2>Pilih kolom Excel</h2>
            </div>
            <button className="product-list-icon-button" onClick={closeExportModal} type="button">
              <FaTimes />
            </button>
          </div>

          <div className="product-list-form-section">
            <div className="product-list-export-toolbar">
              <div>
                <h3>Kolom Export</h3>
                <p>{selectedExportColumns.length} dari {allExportColumns.length} kolom dipilih</p>
              </div>
              <div className="product-list-export-toolbar-actions">
                <button className="product-list-ghost-button" type="button" onClick={resetDefaultExportColumns}>
                  Default
                </button>
                <button className="product-list-secondary-button" type="button" onClick={selectAllExportColumns}>
                  Pilih Semua
                </button>
              </div>
            </div>

            <div className="product-list-export-grid">
              {exportColumnGroups.map((group) => (
                <section className="product-list-export-group" key={group.title}>
                  <h4>{group.title}</h4>
                  <div className="product-list-export-options">
                    {group.columns.map((column) => (
                      <label className="product-list-export-option" key={column.key}>
                        <input
                          type="checkbox"
                          checked={selectedExportColumns.includes(column.key)}
                          onChange={() => toggleExportColumn(column.key)}
                        />
                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="product-list-modal-actions">
            <button className="product-list-ghost-button" type="button" onClick={closeExportModal}>
              Batal
            </button>
            <button className="product-list-primary-button" type="button" onClick={handleExport} disabled={exporting}>
              <FaDownload /> {exporting ? "Mengexport..." : "Export Excel"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderProductImageModal = () => {
    if (!imageModalOpen) return null;

    const busy = imageUploading || imageAssigning;

    return (
      <div className="product-list-modal-backdrop" onClick={closeImageModal}>
        <form className="product-list-modal image" onSubmit={handleImageAssign} onClick={(event) => event.stopPropagation()}>
          <div className="product-list-modal-header">
            <div>
              <p className="product-list-modal-kicker">Foto Product List</p>
              <h2>Tambah dan Assign Foto</h2>
            </div>
            <button className="product-list-icon-button" onClick={closeImageModal} type="button" disabled={busy}>
              <FaTimes />
            </button>
          </div>

          <div className="product-list-image-steps">
            <button
              type="button"
              className={`product-list-image-step ${imageModalStep === 1 ? "active" : ""} ${imageFile ? "done" : ""}`}
              onClick={() => setImageModalStep(1)}
              disabled={busy}
            >
              <span>{imageFile ? <FaCheck /> : "1"}</span>
              Upload Foto
            </button>
            <button
              type="button"
              className={`product-list-image-step ${imageModalStep === 2 ? "active" : ""} ${selectedImageProductIds.length ? "done" : ""}`}
              onClick={() => setImageModalStep(2)}
              disabled={(!selectedProductImageId && productImages.length === 0) || busy}
            >
              <span>{selectedImageProductIds.length ? <FaCheck /> : "2"}</span>
              Pilih Product
            </button>
          </div>

          {imageModalStep === 1 ? (
            <div className="product-list-form-section">
              <div className="product-list-image-upload-grid">
                <label className={`product-list-image-dropzone${imagePreview ? " has-preview" : ""}`}>
                  <input type="file" accept="image/*" onChange={handleImageFileChange} disabled={busy} />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview foto produk" />
                  ) : (
                    <span>
                      <FaUpload />
                      <strong>Upload Foto</strong>
                      <small>JPG, PNG, atau WEBP maksimal 5 MB</small>
                    </span>
                  )}
                </label>

                <div className="product-list-image-upload-copy">
                  <h3>Foto Baru</h3>
                  <p>Upload foto produk terlebih dahulu. Setelah tersimpan, pilih foto dan product yang akan memakai foto tersebut.</p>
                  {imageFile && (
                    <div className="product-list-image-file-info">
                      <span>{imageFile.name}</span>
                      <strong>{(imageFile.size / 1024 / 1024).toFixed(2)} MB</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="product-list-form-section">
              <div className="product-list-image-assign-grid">
                <section className="product-list-image-picker">
                  <div className="product-list-image-panel-heading">
                    <h3>Pilih Foto</h3>
                    <button
                      className="product-list-ghost-button"
                      type="button"
                      onClick={() => {
                        setProductImages([]);
                        setSelectedProductImageId("");
                        setImageFile(null);
                        setImagePreview("");
                        setSelectedImageProductIds([]);
                      }}
                      disabled={busy || productImages.length === 0}
                    >
                      Reset Sesi
                    </button>
                  </div>

                  <div className="product-list-image-gallery">
                    {productImages.length === 0 ? (
                      <div className="product-list-image-state">Belum ada foto di sesi ini.</div>
                    ) : (
                      productImages.map((image) => {
                        const imageUrl = getProductImageUrl(image);
                        const selected = String(selectedProductImageId) === String(image.id);

                        return (
                          <label className={`product-list-image-choice${selected ? " selected" : ""}`} key={image.id}>
                            <input
                              type="radio"
                              name="product_list_image_id"
                              checked={selected}
                              onChange={() => setSelectedProductImageId(image.id)}
                              disabled={busy}
                            />
                            <span className="product-list-image-choice-frame">
                              {imageUrl ? <img src={imageUrl} alt={`Foto #${image.id}`} /> : <FaImage />}
                            </span>
                            <span className="product-list-image-choice-copy">
                              <strong>Foto sesi</strong>
                              <small>Dipakai hanya pada modal yang sedang dibuka</small>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="product-list-image-product-picker">
                  <div className="product-list-image-panel-heading">
                    <div>
                      <h3>Pilih Product</h3>
                      <p>
                        {selectedImageProductIds.length} dipilih
                        {imageProductTotal > 0 ? ` dari ${imageProductTotal} data` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="product-list-image-search">
                    <FaSearch />
                    <input
                      type="text"
                      value={imageProductSearch}
                      onChange={(event) => setImageProductSearch(event.target.value)}
                      placeholder="Cari product, SKU, group, warna..."
                      disabled={busy}
                    />
                    {imageProductSearch && (
                      <button type="button" onClick={() => setImageProductSearch("")} disabled={busy}>
                        <FaTimes />
                      </button>
                    )}
                  </div>

                  <div className="product-list-image-product-list">
                    {imageProductLoading ? (
                      <div className="product-list-image-state">Mencari Product List...</div>
                    ) : imageProductError ? (
                      <div className="product-list-image-state error">{imageProductError}</div>
                    ) : imageProductOptions.length === 0 ? (
                      <div className="product-list-image-state">
                        {debouncedImageProductSearch ? "Product tidak ditemukan." : "Belum ada data Product List."}
                      </div>
                    ) : (
                      imageProductOptions.map((item) => {
                        const selected = selectedImageProductIds.includes(item.id);
                        const existingImageUrl = getProductImageUrl(item);

                        return (
                          <label className={`product-list-image-product-option${selected ? " selected" : ""}`} key={item.id}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleImageProductSelection(item.id)}
                              disabled={busy}
                            />
                            <span className="product-list-image-product-copy">
                              <strong>{item.product || "-"}</strong>
                              <small>{item.sku_name || "-"} | {item.product_group || "-"} | {item.product_colour || "-"} {item.product_size || ""}</small>
                            </span>
                            {existingImageUrl && <em>Sudah ada foto</em>}
                          </label>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}

          <div className="product-list-modal-actions">
            {imageModalStep === 1 ? (
              <>
                <button className="product-list-ghost-button" type="button" onClick={closeImageModal} disabled={busy}>
                  Batal
                </button>
                <button className="product-list-primary-button" type="button" onClick={handleImageUpload} disabled={busy || !imageFile}>
                  <FaUpload /> {imageUploading ? "Mengupload..." : "Upload & Lanjut"}
                </button>
              </>
            ) : (
              <>
                <button className="product-list-ghost-button" type="button" onClick={() => setImageModalStep(1)} disabled={busy}>
                  Kembali
                </button>
                <button className="product-list-primary-button" type="submit" disabled={busy || !selectedProductImageId || selectedImageProductIds.length === 0}>
                  <FaSave /> {imageAssigning ? "Menyimpan..." : "Simpan Assign"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="product-list-page">
      <header className="product-list-header">
        <div className="product-list-title-group">
          <div className="product-list-brand-icon">
            <FaLayerGroup />
          </div>
          <div>
            <p className="product-list-pill">Produk</p>
            <h1>Product List</h1>
            <span>Database detail produk, material, aksesoris, estimasi, ukuran, price, dan notes SPK.</span>
          </div>
        </div>
      </header>

      <main className="product-list-main">

        <section className="product-list-table-card">
          <div className="product-list-table-header">
            <div>
              <h2>Semua Data Product List</h2>
              <p>{total} data ditemukan</p>
            </div>
            <div className="product-list-table-actions">
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportChange}
                className="product-list-file-input"
              />
              <button
                className="product-list-secondary-button photo"
                type="button"
                onClick={openImageModal}
                disabled={imageUploading || imageAssigning}
                title="Tambah Foto"
                style={{ width: "38px", padding: 0, justifyContent: "center" }}
              >
                <FaImage />
              </button>
              <button
                className="product-list-secondary-button import"
                type="button"
                onClick={handleImportButtonClick}
                disabled={importing}
                title="Import Excel"
                style={{ width: "38px", padding: 0, justifyContent: "center" }}
              >
                <FaFileExcel />
              </button>
              <button
                className="product-list-secondary-button export"
                type="button"
                onClick={openExportModal}
                disabled={exporting}
                title="Export Excel"
                style={{ width: "38px", padding: 0, justifyContent: "center" }}
              >
                <FaDownload />
              </button>
              <button
                className="product-list-secondary-button template"
                type="button"
                onClick={handleDownloadTemplate}
                title="Download Template Excel"
                style={{ width: "38px", padding: 0, justifyContent: "center", color: "#059669", borderColor: "#34d399", background: "#ecfdf5" }}
              >
                <FaFileExcel />
              </button>
              <button
                className="product-list-primary-button product-list-add-button"
                type="button"
                onClick={openAddModal}
                title="Tambah Data"
                style={{ width: "38px", padding: 0, justifyContent: "center" }}
              >
                <FaPlus />
              </button>
            </div>
          </div>

          <div className="product-list-filter-bar">
            <div className="product-list-search">
              <FaSearch />
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Cari product, SKU name, group, colour, aksesoris..."
              />
              {searchInput && (
                <button type="button" onClick={() => setSearchInput("")}>
                  <FaTimes />
                </button>
              )}
            </div>

            <div
              className={`product-list-searchable-select${groupDropdownOpen ? " open" : ""}`}
              ref={groupDropdownRef}
            >
              <button
                className="product-list-searchable-select-trigger"
                type="button"
                onClick={() => { setGroupDropdownOpen((prev) => !prev); setMaterialGroup1DropdownOpen(false); setMaterialGroup2DropdownOpen(false); }}
                aria-haspopup="listbox"
                aria-expanded={groupDropdownOpen}
              >
                <span>{selectedGroup || "Product Group"}</span>
                <FaChevronDown />
              </button>

              {groupDropdownOpen && (
                <div className="product-list-searchable-select-menu">
                  <div className="product-list-searchable-select-search">
                    <FaSearch />
                    <input
                      type="text"
                      value={groupSearchTerm}
                      onChange={(event) => setGroupSearchTerm(event.target.value)}
                      placeholder="Cari product group..."
                      autoFocus
                    />
                    {groupSearchTerm && (
                      <button type="button" onClick={() => setGroupSearchTerm("")}>
                        <FaTimes />
                      </button>
                    )}
                  </div>

                  <div className="product-list-searchable-select-options" role="listbox">
                    <button
                      className={`product-list-searchable-option${selectedGroup === "" ? " selected" : ""}`}
                      type="button"
                      onClick={() => handleGroupSelect("")}
                      role="option"
                      aria-selected={selectedGroup === ""}
                    >
                      Semua Product Group
                    </button>

                    {filteredGroupOptions.length ? (
                      filteredGroupOptions.map((group) => (
                        <button
                          className={`product-list-searchable-option${selectedGroup === group ? " selected" : ""}`}
                          type="button"
                          key={group}
                          onClick={() => handleGroupSelect(group)}
                          role="option"
                          aria-selected={selectedGroup === group}
                        >
                          {group}
                        </button>
                      ))
                    ) : (
                      <div className="product-list-searchable-empty">Product Group tidak ditemukan.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className={`product-list-searchable-select${materialGroup1DropdownOpen ? " open" : ""}`}
            >
              <button
                className="product-list-searchable-select-trigger"
                type="button"
                onClick={() => { setMaterialGroup1DropdownOpen((prev) => !prev); setGroupDropdownOpen(false); setMaterialGroup2DropdownOpen(false); }}
              >
                <span>{selectedMaterialGroup1 || "Bahan Utama"}</span>
                <FaChevronDown />
              </button>

              {materialGroup1DropdownOpen && (
                <div className="product-list-searchable-select-menu">
                  <div className="product-list-searchable-select-search">
                    <FaSearch />
                    <input
                      type="text"
                      value={materialGroup1SearchTerm}
                      onChange={(event) => setMaterialGroup1SearchTerm(event.target.value)}
                      placeholder="Cari Material Bahan Utama"
                      autoFocus
                    />
                    {materialGroup1SearchTerm && (
                      <button type="button" onClick={() => setMaterialGroup1SearchTerm("")}>
                        <FaTimes />
                      </button>
                    )}
                  </div>

                  <div className="product-list-searchable-select-options">
                    <button
                      className={`product-list-searchable-option${selectedMaterialGroup1 === "" ? " selected" : ""}`}
                      type="button"
                      onClick={() => { setSelectedMaterialGroup1(""); setMaterialGroup1DropdownOpen(false); setCurrentPage(1); }}
                    >
                      Semua Material Bahan Utama
                    </button>

                    {filteredMaterialGroup1Options.length ? (
                      filteredMaterialGroup1Options.map((group) => (
                        <button
                          className={`product-list-searchable-option${selectedMaterialGroup1 === group ? " selected" : ""}`}
                          type="button"
                          key={group}
                          onClick={() => { setSelectedMaterialGroup1(group); setMaterialGroup1DropdownOpen(false); setCurrentPage(1); }}
                        >
                          {group}
                        </button>
                      ))
                    ) : (
                      <div className="product-list-searchable-empty">Material Group 1 tidak ditemukan.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className={`product-list-searchable-select${materialGroup2DropdownOpen ? " open" : ""}`}
            >
              <button
                className="product-list-searchable-select-trigger"
                type="button"
                onClick={() => { setMaterialGroup2DropdownOpen((prev) => !prev); setGroupDropdownOpen(false); setMaterialGroup1DropdownOpen(false); }}
              >
                <span>{selectedMaterialGroup2 || "Bahan Kombinasi"}</span>
                <FaChevronDown />
              </button>

              {materialGroup2DropdownOpen && (
                <div className="product-list-searchable-select-menu">
                  <div className="product-list-searchable-select-search">
                    <FaSearch />
                    <input
                      type="text"
                      value={materialGroup2SearchTerm}
                      onChange={(event) => setMaterialGroup2SearchTerm(event.target.value)}
                      placeholder="Cari Material Bahan Kombinasi"
                      autoFocus
                    />
                    {materialGroup2SearchTerm && (
                      <button type="button" onClick={() => setMaterialGroup2SearchTerm("")}>
                        <FaTimes />
                      </button>
                    )}
                  </div>

                  <div className="product-list-searchable-select-options">
                    <button
                      className={`product-list-searchable-option${selectedMaterialGroup2 === "" ? " selected" : ""}`}
                      type="button"
                      onClick={() => { setSelectedMaterialGroup2(""); setMaterialGroup2DropdownOpen(false); setCurrentPage(1); }}
                    >
                      Material Bahan Kombinasi
                    </button>

                    {filteredMaterialGroup2Options.length ? (
                      filteredMaterialGroup2Options.map((group) => (
                        <button
                          className={`product-list-searchable-option${selectedMaterialGroup2 === group ? " selected" : ""}`}
                          type="button"
                          key={group}
                          onClick={() => { setSelectedMaterialGroup2(group); setMaterialGroup2DropdownOpen(false); setCurrentPage(1); }}
                        >
                          {group}
                        </button>
                      ))
                    ) : (
                      <div className="product-list-searchable-empty">Material Group 2 tidak ditemukan.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <div className="product-list-error">{error}</div>}

          <div className="product-list-table-scroll">
            <table className="product-list-table">
              <thead>
                <tr>
                  <th>SKU Name</th>
                  <th>Product</th>
                  <th>Product Group</th>
                  <th>Product Size</th>
                  <th>Product Source</th>
                  <th>Product Colour</th>
                  <th>Material Group 1</th>
                  <th>Colour 1</th>
                  <th>Material Group 2</th>
                  <th>Colour 2</th>
                  <th>Accessories</th>
                  <th>Accessories Colour</th>
                  <th>Estimasi Cutting</th>
                  <th>Estimasi Combi</th>
                  <th>Berat Panjang</th>
                  <th>Satuan Berat Panjang</th>
                  <th>Berat Panjang Combi</th>
                  <th>Satuan Berat Panjang Combi</th>
                  <th>LD</th>
                  <th>PJ Dress</th>
                  <th>PJ Celana</th>
                  <th>PJ Baju</th>
                  <th>Notes SPK</th>
                  <th>Price CMT</th>
                  <th>Price Cutting</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="26" className="product-list-state-cell">
                      Memuat data Product List...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="26" className="product-list-state-cell">
                      Belum ada data Product List.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{tableValue(item.sku_name)}</strong></td>
                      <td>{tableValue(item.product)}</td>
                      <td>{tableValue(item.product_group)}</td>
                      <td>{tableValue(item.product_size)}</td>
                      <td>{tableValue(item.product_source)}</td>
                      <td>{tableValue(item.product_colour)}</td>
                      <td>{getMaterialTableValue(item.materials, 0, "material_group")}</td>
                      <td>{getMaterialTableValue(item.materials, 0, "colour")}</td>
                      <td>{getMaterialTableValue(item.materials, 1, "material_group")}</td>
                      <td>{getMaterialTableValue(item.materials, 1, "colour")}</td>
                      <td>{tableValue(item.product_accecories)}</td>
                      <td>{tableValue(item.product_accecories_colour)}</td>
                      <td>{tableValue(item.estimasi_cutting)}</td>
                      <td>{tableValue(item.estimasi_combi)}</td>
                      <td>{tableValue(item.berat_panjang)}</td>
                      <td>{tableValue(item.satuan_berat_panjang)}</td>
                      <td>{tableValue(item.berat_panjang_combi)}</td>
                      <td>{tableValue(item.satuan_berat_panjang_combi)}</td>
                      <td>{tableValue(item.LD)}</td>
                      <td>{tableValue(item.pj_dress)}</td>
                      <td>{tableValue(item.pj_celana)}</td>
                      <td>{tableValue(item.pj_baju)}</td>
                      <td className="product-list-notes-cell">{item.notes_spk || "-"}</td>
                      <td>{tableValue(item.price_cmt)}</td>
                      <td>{tableValue(item.price_cutting)}</td>
                      <td>
                        <div className="product-list-actions">
                          <button className="product-list-icon-button info" type="button" onClick={() => openDetailModal(item)} title="Detail">
                            <FaInfoCircle />
                          </button>
                          <button className="product-list-icon-button" type="button" onClick={() => handleDuplicate(item)} title="Duplikat">
                            <FiCopy />
                          </button>{/* [DUPLIKAT] - ditambahkan */}
                          <button className="product-list-icon-button" type="button" onClick={() => openEditModal(item)} title="Edit">
                            <FaEdit />
                          </button>
                          <button className="product-list-icon-button danger" type="button" onClick={() => handleDelete(item)} title="Hapus">
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="product-list-pagination">
            <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
              Sebelumnya
            </button>
            <span>
              Halaman {currentPage} dari {lastPage}
            </span>
            <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= lastPage}>
              Berikutnya
            </button>
          </div>
        </section>
      </main>


      {renderModal()}
      {renderExportModal()}
      {renderProductImageModal()}
    </div>
  );
};

const Field = ({ label, name, value, onChange, type = "text", required = false, inputRef = null, autoFocus = false }) => ( // [DUPLIKAT] - dimodifikasi
  <label className="product-list-field">
    <span>{label}</span>
    <input
      ref={inputRef}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      autoFocus={autoFocus}
      step={type === "number" ? "0.01" : undefined}
      placeholder={label}
    />
  </label>
);

const DetailItem = ({ label, value, suffix = "" }) => (
  <div className="product-list-detail-item">
    <span>{label}</span>
    <strong>{value !== null && value !== undefined && value !== "" ? `${value}${suffix}` : "-"}</strong>
  </div>
);

export default ProductList;

import React, { useEffect, useMemo, useState } from "react";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import "../Produk/ProductList.css";
import API from "../../api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Select from "react-select";
import {
  FaBoxOpen,
  FaArrowLeft,
  FaCheck,
  FaDownload,
  FaEdit,
  FaEye,
  FaFileImport,
  FaFilePdf,
  FaImage,
  FaPlus,
  FaSearch,
  FaTag,
  FaTimes,
  FaTrash,
  FaUpload,
} from "react-icons/fa";
import { FiBox } from "react-icons/fi";

const SATUAN_OPTIONS = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "yard", label: "Yard" },
];

const DEFAULT_PER_PAGE = 25;
const MAX_IMAGE_UPLOAD_SIZE = 2 * 1024 * 1024;
const TEMPLATE_HEADERS = ["nama_bahan", "deskripsi", "group_bahan", "pabrik_bahan", "warna_bahan", "stok_bahan"];
const REQUIRED_TEMPLATE_HEADERS = ["nama_bahan", "group_bahan", "pabrik_bahan", "warna_bahan", "stok_bahan"];
const swalButtonColors = {
  confirmButtonColor: "#2458ce",
  cancelButtonColor: "#64748b",
};

const bahanNameSelectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 2200 }),
};

const formatHargaInput = (value) => {
  const digitsOnly = String(value || "").replace(/\D/g, "");
  if (!digitsOnly) return "";
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const formatHargaFromData = (value) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "";
  return formatHargaInput(Math.trunc(numericValue));
};

const parseHargaInput = (value) => {
  const normalized = String(value || "").replace(/\./g, "");
  return normalized ? Number(normalized) : NaN;
};

const parseNumberInput = (value) => {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").trim().replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;

  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }

  if (/^-?\d+,\d+$/.test(cleaned)) {
    return Number(cleaned.replace(",", "."));
  }

  return Number(cleaned);
};

const normalizeExcelHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getApiErrorMessage = (error, fallbackMessage) => {
  const validationErrors = error?.response?.data?.errors;
  if (validationErrors && typeof validationErrors === "object") {
    const firstError = Object.values(validationErrors)?.[0];
    if (Array.isArray(firstError) && firstError.length > 0) {
      return firstError[0];
    }
  }

  return error?.response?.data?.message || fallbackMessage;
};

const getBahanImageUrl = (image) => {
  const rawUrl = image?.image_url || "";
  if (rawUrl) {
    if (rawUrl.startsWith("/")) return rawUrl;
    if (rawUrl.startsWith("blob:")) return rawUrl;

    try {
      const parsedUrl = new URL(rawUrl);
      if (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1") {
        return parsedUrl.pathname;
      }

      return rawUrl;
    } catch (error) {
      return rawUrl;
    }
  }

  const imagePath = image?.image_path || "";
  const filename = String(imagePath).split("/").filter(Boolean).pop();

  if (!filename) {
    return "";
  }

  const apiBaseUrl = (process.env.REACT_APP_API_URL || "/api").replace(/\/$/, "");
  return `${apiBaseUrl}/bahan-images/${encodeURIComponent(filename)}`;
};

const splitBahanByImage = (rows) => {
  const withoutImage = [];
  const grouped = new Map();

  rows.forEach((item) => {
    const image = item.bahan_image || item.bahanImage || null;
    const imageId = item.bahan_image_id || image?.id;

    if (!imageId || !image) {
      withoutImage.push(item);
      return;
    }

    if (!grouped.has(imageId)) {
      grouped.set(imageId, {
        id: imageId,
        image,
        items: [],
      });
    }

    grouped.get(imageId).items.push(item);
  });

  return {
    bahanWithoutImage: withoutImage,
    groupedBahanImages: Array.from(grouped.values()),
  };
};

const imageUrlToPdfDataUrl = async (imageUrl) => {
  if (!imageUrl) return "";

  const resolvedUrl = new URL(imageUrl, window.location.origin).href;
  const response = await fetch(resolvedUrl);
  if (!response.ok) {
    throw new Error("Gagal memuat gambar bahan.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 720;
        const scale = image.naturalWidth > maxWidth ? maxWidth / image.naturalWidth : 1;
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Gambar bahan tidak bisa diproses."));
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.82),
          width: canvas.width,
          height: canvas.height,
        });
      };
      image.onerror = () => reject(new Error("Gambar bahan tidak bisa diproses."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const Bahan = () => {
  const [items, setItems] = useState([]);
  const [warnaInput, setWarnaInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedBahanName, setSelectedBahanName] = useState("");
  const [selectedPabrik, setSelectedPabrik] = useState("");
  const [selectedSatuan, setSelectedSatuan] = useState("");
  const [bahanNameOptions, setBahanNameOptions] = useState([]);
  const [bahanNameLoading, setBahanNameLoading] = useState(false);
  const [pabrikOptions, setPabrikOptions] = useState([]);
  const [stats, setStats] = useState({
    total_bahan: 0,
    total_group: 0,
    total_warna: 0,
    total_stok: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [newItem, setNewItem] = useState({
    group_bahan: "",
    pabrik_bahan: "-",
    nama_bahan: "",
    deskripsi: "",
    harga: "",
    satuan: "kg",
    warna_bahan: [],
    stok_bahan: "",
  });
  const [editItem, setEditItem] = useState({
    id: null,
    group_bahan: "",
    pabrik_bahan: "-",
    nama_bahan: "",
    deskripsi: "",
    harga: "",
    satuan: "kg",
    warna_bahan: "",
    stok_bahan: "",
  });
  const [detailItem, setDetailItem] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalStep, setImageModalStep] = useState(1);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [selectedImageBahanIds, setSelectedImageBahanIds] = useState([]);
  const [imageBahanSearch, setImageBahanSearch] = useState("");
  const [debouncedImageBahanSearch, setDebouncedImageBahanSearch] = useState("");
  const [imageBahanOptions, setImageBahanOptions] = useState([]);
  const [imageBahanLoading, setImageBahanLoading] = useState(false);
  const [imageBahanError, setImageBahanError] = useState("");
  const [imageBahanTotal, setImageBahanTotal] = useState(0);
  const [imageSubmitting, setImageSubmitting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportBahanRows, setExportBahanRows] = useState([]);
  const [exportBahanLoading, setExportBahanLoading] = useState(false);
  const [exportBahanSearch, setExportBahanSearch] = useState("");
  const [selectedExportBahanIds, setSelectedExportBahanIds] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedImageBahanSearch(imageBahanSearch);
    }, 250);

    return () => clearTimeout(timer);
  }, [imageBahanSearch]);

  const activeSearchTerm = selectedBahanName || debouncedSearchTerm;
  const selectedBahanNameOption = bahanNameOptions.find((option) => option.value === selectedBahanName) || null;
  const isFiltering = Boolean(activeSearchTerm || selectedPabrik || selectedSatuan);
  const totalPages = lastPage;
  const totalBahan = stats.total_bahan;
  const totalGroup = stats.total_group;
  const totalWarna = stats.total_warna;
  const totalStok = stats.total_stok;
  const pabrikSelectOptions = pabrikOptions.includes("-") ? pabrikOptions : ["-", ...pabrikOptions];
  const { bahanWithoutImage, groupedBahanImages } = useMemo(() => splitBahanByImage(items), [items]);

  const handleAddWarna = () => {
    const trimmed = warnaInput.trim();
    if (!trimmed) return;

    if (newItem.warna_bahan.includes(trimmed)) {
      Swal.fire({
        icon: "warning",
        title: "Warna sudah ada",
        text: `Warna "${trimmed}" sudah ditambahkan.`,
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    setNewItem((prev) => ({
      ...prev,
      warna_bahan: [...prev.warna_bahan, trimmed],
    }));
    setWarnaInput("");
  };

  const handleRemoveWarna = (indexToRemove) => {
    setNewItem((prev) => ({
      ...prev,
      warna_bahan: prev.warna_bahan.filter((_, index) => index !== indexToRemove),
    }));
  };
  const filteredExportBahanRows = useMemo(() => {
    const search = exportBahanSearch.trim().toLowerCase();
    if (!search) return exportBahanRows;

    return exportBahanRows.filter((item) =>
      [
        item.id,
        item.group_bahan,
        item.pabrik_bahan,
        item.nama_bahan,
        item.deskripsi,
        item.satuan,
        item.warna_bahan,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .some((value) => value.includes(search))
    );
  }, [exportBahanRows, exportBahanSearch]);
  const selectedExportBahanRows = useMemo(() => {
    const selectedIds = new Set(selectedExportBahanIds.map((id) => String(id)));
    return exportBahanRows.filter((item) => selectedIds.has(String(item.id)));
  }, [exportBahanRows, selectedExportBahanIds]);

  const fetchBahanNameOptions = async () => {
    try {
      setBahanNameLoading(true);
      const res = await API.get("/bahan", {
        params: { all: 1 },
      });
      const payload = res.data || {};
      const rows = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
      const names = rows
        .map((row) => String(row?.nama_bahan || "").trim())
        .filter(Boolean);
      const uniqueNames = [...new Set(names)].sort((a, b) => a.localeCompare(b, "id", { numeric: true, sensitivity: "base" }));

      setBahanNameOptions(uniqueNames.map((name) => ({ value: name, label: name })));
    } catch (optionError) {
      setBahanNameOptions([]);
    } finally {
      setBahanNameLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/bahan", {
        params: {
          all: 1,
          search: activeSearchTerm || undefined,
          pabrik_bahan: selectedPabrik || undefined,
          satuan: selectedSatuan || undefined,
        },
      });

      const payload = res.data || {};
      const rows = Array.isArray(payload.data) ? payload.data : [];
      setItems(rows);
      setCurrentPage(1);
      setLastPage(1);
      setTotalRows(rows.length);
      setStats({
        total_bahan: Number(payload.stats?.total_bahan) || 0,
        total_group: Number(payload.stats?.total_group) || 0,
        total_warna: Number(payload.stats?.total_warna) || 0,
        total_stok: Number(payload.stats?.total_stok) || 0,
      });
      setPabrikOptions(Array.isArray(payload.filters?.pabriks) ? payload.filters.pabriks : []);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Gagal memuat data bahan."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBahanNameOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, selectedBahanName, selectedPabrik, selectedSatuan]);

  useEffect(() => {
    if (!showImageModal || imageModalStep !== 2) {
      return;
    }

    let ignore = false;

    const fetchImageBahanOptions = async () => {
      try {
        setImageBahanLoading(true);
        setImageBahanError("");

        const res = await API.get("/bahan", {
          params: {
            page: 1,
            per_page: 100,
            search: debouncedImageBahanSearch || undefined,
          },
        });

        if (ignore) return;

        const payload = res.data || {};
        const rows = Array.isArray(payload.data) ? payload.data : [];
        setImageBahanOptions(rows);
        setImageBahanTotal(Number(payload.total) || rows.length);
      } catch (searchError) {
        if (ignore) return;
        setImageBahanOptions([]);
        setImageBahanTotal(0);
        setImageBahanError(getApiErrorMessage(searchError, "Gagal mencari data bahan."));
      } finally {
        if (!ignore) {
          setImageBahanLoading(false);
        }
      }
    };

    fetchImageBahanOptions();

    return () => {
      ignore = true;
    };
  }, [showImageModal, imageModalStep, debouncedImageBahanSearch]);

  const currentItems = items;
  const indexOfFirstItem = (currentPage - 1) * DEFAULT_PER_PAGE;
  const getItemPageNumber = (item) => {
    const itemIndex = currentItems.findIndex((row) => row.id === item.id);
    return indexOfFirstItem + (itemIndex >= 0 ? itemIndex : 0) + 1;
  };
  const uniqueGroupValues = (rows, field) => {
    const values = rows
      .map((row) => String(row?.[field] ?? "").trim())
      .filter(Boolean);

    return [...new Set(values)];
  };
  const renderGroupedValues = (rows, field, emptyLabel = "-") => {
    const values = uniqueGroupValues(rows, field);

    if (values.length === 0) {
      return <span className="bahan-grouped-muted">{emptyLabel}</span>;
    }

    return (
      <div className="bahan-grouped-value-list">
        {values.map((value) => (
          <span key={value} title={value}>
            {value}
          </span>
        ))}
      </div>
    );
  };
  const getGroupedStockTotal = (rows) =>
    rows.reduce((total, item) => total + (Number(item.stok_bahan) || 0), 0);
  const bahanWithImageItemCount = groupedBahanImages.reduce((total, group) => total + group.items.length, 0);
  const bahanWithoutImageCount = bahanWithoutImage.length;
  const renderEmptyTableRow = (colSpan, message) => (
    <tr className="bahan-table-empty-row">
      <td colSpan={colSpan}>{message}</td>
    </tr>
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const resetForm = () => {
    setNewItem({ group_bahan: "", pabrik_bahan: "-", nama_bahan: "", deskripsi: "", harga: "", satuan: "kg", warna_bahan: [], stok_bahan: "" });
    setEditItem({ id: null, group_bahan: "", pabrik_bahan: "-", nama_bahan: "", deskripsi: "", harga: "", satuan: "kg", warna_bahan: "", stok_bahan: "" });
    setWarnaInput("");
    setShowForm(false);
    setShowEditForm(false);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setDetailItem(null);
  };

  const closePreviewImage = () => {
    setPreviewImage(null);
  };

  const openPreviewImage = (imageUrl, title) => {
    if (!imageUrl) return;
    setPreviewImage({
      url: imageUrl,
      title: title || "Preview gambar bahan",
    });
  };

  const clearImageModalState = () => {
    setShowImageModal(false);
    setImageModalStep(1);
    setImageFile(null);
    setImagePreview("");
    setSelectedImageBahanIds([]);
    setImageBahanSearch("");
    setDebouncedImageBahanSearch("");
    setImageBahanOptions([]);
    setImageBahanError("");
    setImageBahanTotal(0);
  };

  const openImageModal = () => {
    setShowForm(false);
    setShowEditForm(false);
    setShowImageModal(true);
    setImageModalStep(1);
    setImageBahanOptions([]);
    setImageBahanError("");
  };

  const closeImageModal = () => {
    if (imageSubmitting) return;
    clearImageModalState();
  };

  const handleBahanImageFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire({ icon: "warning", title: "File tidak valid", text: "File harus berupa gambar.", ...swalButtonColors });
      return;
    }

    if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
      Swal.fire({ icon: "warning", title: "Gambar terlalu besar", text: "Ukuran gambar maksimal 2 MB.", ...swalButtonColors });
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const toggleImageBahanSelection = (bahanId) => {
    setSelectedImageBahanIds((prev) =>
      prev.includes(bahanId) ? prev.filter((id) => id !== bahanId) : [...prev, bahanId]
    );
  };

  const handleBahanImageSubmit = async (event) => {
    event.preventDefault();

    if (!imageFile) {
      setImageModalStep(1);
      Swal.fire({ icon: "warning", title: "Pilih gambar", text: "Upload gambar bahan terlebih dahulu.", ...swalButtonColors });
      return;
    }

    if (selectedImageBahanIds.length === 0) {
      setImageModalStep(2);
      Swal.fire({ icon: "warning", title: "Pilih bahan", text: "Pilih minimal satu bahan untuk gambar ini.", ...swalButtonColors });
      return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);
    selectedImageBahanIds.forEach((id) => {
      formData.append("bahan_ids[]", id);
    });

    try {
      setImageSubmitting(true);
      await API.post("/bahan/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      clearImageModalState();
      await fetchData(currentPage);
      await Swal.fire({ icon: "success", title: "Berhasil", text: "Gambar bahan berhasil ditambahkan.", ...swalButtonColors });
    } catch (uploadError) {
      const errMsg = getApiErrorMessage(uploadError, "Gagal menyimpan gambar bahan.");
      Swal.fire({ icon: "error", title: "Upload gagal", text: errMsg, ...swalButtonColors });
    } finally {
      setImageSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "harga") {
      const formattedValue = formatHargaInput(value);
      if (showEditForm) {
        setEditItem((prev) => ({ ...prev, [name]: formattedValue }));
      } else {
        setNewItem((prev) => ({ ...prev, [name]: formattedValue }));
      }
      return;
    }

    if (name === "stok_bahan") {
      const nextValue = String(value || "").replace(/[^\d.,]/g, "");
      if (showEditForm) {
        setEditItem((prev) => ({ ...prev, [name]: nextValue }));
      } else {
        setNewItem((prev) => ({ ...prev, [name]: nextValue }));
      }
      return;
    }

    if (showEditForm) {
      setEditItem((prev) => ({ ...prev, [name]: value }));
    } else {
      setNewItem((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const hargaNumeric = parseHargaInput(newItem.harga);
    const stokNumeric = parseNumberInput(newItem.stok_bahan);

    if (!newItem.harga || Number.isNaN(hargaNumeric) || hargaNumeric < 0) {
      Swal.fire({ icon: "warning", title: "Harga tidak valid", text: "Harga harus diisi dan tidak boleh negatif.", ...swalButtonColors });
      return;
    }

    if (Number.isNaN(stokNumeric) || stokNumeric < 0) {
      Swal.fire({ icon: "warning", title: "Stok tidak valid", text: "Stok bahan tidak boleh negatif.", ...swalButtonColors });
      return;
    }

    try {
      Swal.fire({
        title: "Menyimpan bahan...",
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      const payload = {
        group_bahan: newItem.group_bahan || undefined,
        pabrik_bahan: newItem.pabrik_bahan || "-",
        nama_bahan: newItem.nama_bahan,
        deskripsi: newItem.deskripsi || undefined,
        harga: hargaNumeric,
        satuan: newItem.satuan,
        warna_bahan: newItem.warna_bahan && newItem.warna_bahan.length > 0 ? newItem.warna_bahan : undefined,
        stok_bahan: stokNumeric,
      };

      await API.post("/bahan", payload);
      resetForm();
      setCurrentPage(1);
      await fetchData(1);
      await fetchBahanNameOptions();
      Swal.close();
      await Swal.fire({ icon: "success", title: "Berhasil", text: "Bahan berhasil ditambahkan.", ...swalButtonColors });
    } catch (submitError) {
      Swal.close();
      const errMsg = getApiErrorMessage(submitError, "Gagal menambah bahan.");
      Swal.fire({ icon: "error", title: "Gagal Menyimpan", text: errMsg, ...swalButtonColors });
    }
  };

  const handleEditClick = (item) => {
    setEditItem({
      id: item.id,
      group_bahan: item.group_bahan || "",
      pabrik_bahan: item.pabrik_bahan || "-",
      nama_bahan: item.nama_bahan || "",
      deskripsi: item.deskripsi || "",
      harga: formatHargaFromData(item.harga),
      satuan: item.satuan || "kg",
      warna_bahan: item.warna_bahan || "",
      stok_bahan: item.stok_bahan || "",
    });
    setShowForm(false);
    setShowEditForm(true);
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();
    const hargaNumeric = parseHargaInput(editItem.harga);
    const stokNumeric = parseNumberInput(editItem.stok_bahan);

    if (!editItem.harga || Number.isNaN(hargaNumeric) || hargaNumeric < 0) {
      Swal.fire({ icon: "warning", title: "Harga tidak valid", text: "Harga harus diisi dan tidak boleh negatif.", ...swalButtonColors });
      return;
    }

    if (Number.isNaN(stokNumeric) || stokNumeric < 0) {
      Swal.fire({ icon: "warning", title: "Stok tidak valid", text: "Stok bahan tidak boleh negatif.", ...swalButtonColors });
      return;
    }

    try {
      Swal.fire({
        title: "Memperbarui bahan...",
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      const payload = {
        group_bahan: editItem.group_bahan || undefined,
        pabrik_bahan: editItem.pabrik_bahan || "-",
        nama_bahan: editItem.nama_bahan,
        deskripsi: editItem.deskripsi || undefined,
        harga: hargaNumeric,
        satuan: editItem.satuan,
        warna_bahan: editItem.warna_bahan || undefined,
        stok_bahan: stokNumeric,
      };

      await API.put(`/bahan/${editItem.id}`, payload);
      resetForm();
      await fetchData(currentPage);
      await fetchBahanNameOptions();
      Swal.close();
      await Swal.fire({ icon: "success", title: "Berhasil", text: "Data bahan berhasil diperbarui.", ...swalButtonColors });
    } catch (updateError) {
      Swal.close();
      const errMsg = getApiErrorMessage(updateError, "Gagal memperbarui bahan.");
      Swal.fire({ icon: "error", title: "Gagal Memperbarui", text: errMsg, ...swalButtonColors });
    }
  };

  const handleDelete = async (id, nama) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Hapus bahan?",
      text: `Yakin ingin menghapus bahan "${nama}"?`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      ...swalButtonColors,
    });

    if (!confirm.isConfirmed) return;

    try {
      Swal.fire({
        title: "Menghapus bahan...",
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
      await API.delete(`/bahan/${id}`);
      const targetPage = currentItems.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(targetPage);
      await fetchData(targetPage);
      await fetchBahanNameOptions();
      Swal.close();
      await Swal.fire({ icon: "success", title: "Berhasil", text: "Bahan berhasil dihapus.", ...swalButtonColors });
    } catch (deleteError) {
      Swal.close();
      const deleteErrorData = deleteError?.response?.data;

      if (deleteError?.response?.status === 409 && deleteErrorData?.code === "BAHAN_SEDANG_DIGUNAKAN") {
        const usageRows = Array.isArray(deleteErrorData.usage)
          ? deleteErrorData.usage
              .map((item) => `<li><strong>${item.module}</strong>: ${formatNumber(item.count)} data</li>`)
              .join("")
          : "";

        Swal.fire({
          icon: "info",
          title: deleteErrorData.title || "Bahan Tidak Dapat Dihapus",
          html: `
            <div style="text-align:left;line-height:1.55">
              <p>${deleteErrorData.message || "Data bahan masih dipakai pada transaksi ERP."}</p>
              ${usageRows ? `<p style="margin-bottom:6px"><strong>Referensi aktif:</strong></p><ul style="margin:0 0 12px 18px;padding:0">${usageRows}</ul>` : ""}
              <p>${deleteErrorData.detail || ""}</p>
              
          `,
          confirmButtonText: "Mengerti",
          ...swalButtonColors,
        });
        return;
      }

      const errMsg = getApiErrorMessage(deleteError, "Gagal menghapus bahan.");
      Swal.fire({ icon: "error", title: "Gagal Menghapus", text: errMsg, ...swalButtonColors });
    }
  };

  const handleDetailClick = (item) => {
    setDetailItem(item);
    setShowDetailModal(true);
  };

  const formatRupiah = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getSatuanLabel = (value) => {
    const option = SATUAN_OPTIONS.find((item) => item.value === value);
    return option ? option.label : value;
  };

  const clearFilters = () => {
    setCurrentPage(1);
    setSearchTerm("");
    setSelectedBahanName("");
    setSelectedPabrik("");
    setSelectedSatuan("");
  };

  const formatNumber = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "0";
    return numericValue.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  };

  const parseWorkbookRows = async (file) => {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false, cellDates: false });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });

    if (!rows.length) {
      throw new Error("File Excel kosong.");
    }

    const headers = rows[0].map(normalizeExcelHeader);
    const missingHeaders = REQUIRED_TEMPLATE_HEADERS.filter((header) => !headers.includes(header));

    if (missingHeaders.length > 0) {
      throw new Error(`Template tidak sesuai. Kolom wajib belum ada: ${missingHeaders.join(", ")}.`);
    }

    return rows
      .slice(1)
      .map((row, index) => {
        const getCell = (header) => {
          const cellIndex = headers.indexOf(header);
          return cellIndex >= 0 ? row[cellIndex] : "";
        };

        return {
          row_number: index + 2,
          nama_bahan: String(getCell("nama_bahan") || "").trim(),
          deskripsi: String(getCell("deskripsi") || "").trim(),
          group_bahan: String(getCell("group_bahan") || "").trim(),
          pabrik_bahan: String(getCell("pabrik_bahan") || "").trim(),
          warna_bahan: String(getCell("warna_bahan") || "").trim(),
          stok_bahan: parseNumberInput(getCell("stok_bahan")),
          harga: 0,
          satuan: "kg",
        };
      })
      .filter((row) => row.nama_bahan || row.deskripsi || row.group_bahan || row.pabrik_bahan || row.warna_bahan || row.stok_bahan);
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const rows = await parseWorkbookRows(file);
      const invalidRow = rows.find((row) => !row.nama_bahan || Number.isNaN(row.stok_bahan) || row.stok_bahan < 0);

      if (!rows.length) {
        Swal.fire({ icon: "warning", title: "File kosong", text: "Tidak ada baris bahan yang dapat diimport.", ...swalButtonColors });
        return;
      }

      if (invalidRow) {
        Swal.fire({
          icon: "warning",
          title: "Data tidak valid",
          text: `Cek baris ${invalidRow.row_number}. Nama bahan wajib diisi dan stok tidak boleh negatif.`,
          ...swalButtonColors,
        });
        return;
      }

      const confirm = await Swal.fire({
        icon: "question",
        title: "Import data bahan?",
        html: `File <strong>${file.name}</strong> berisi <strong>${rows.length}</strong> baris bahan.`,
        showCancelButton: true,
        confirmButtonText: "Ya, import",
        cancelButtonText: "Batal",
        ...swalButtonColors,
      });

      if (!confirm.isConfirmed) return;

      Swal.fire({
        title: "Mengimport data bahan...",
        text: "Mohon tunggu sampai proses selesai.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await API.post("/bahan/import", { rows });
      const summary = response.data?.summary || {};
      setCurrentPage(1);
      await fetchData(1);
      await fetchBahanNameOptions();
      Swal.close();
      await Swal.fire({
        icon: "success",
        title: "Import selesai",
        html: `Tambah: <strong>${summary.created || 0}</strong><br/>Update: <strong>${summary.updated || 0}</strong><br/>Lewati: <strong>${summary.skipped || 0}</strong>`,
        ...swalButtonColors,
      });
    } catch (importError) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Import gagal",
        text: importError.message || getApiErrorMessage(importError, "Gagal mengimport data bahan."),
        ...swalButtonColors,
      });
    }
  };

  const handleDownloadTemplate = async () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ["CONTOH KAIN COTTON LEBAR 210", "GRAMASI 170-180 LEBAR 210", "COTTON", "PABRIK A", "NAVY", 10],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "bahan");
    XLSX.writeFile(workbook, "template-register-bahan.xlsx");

    await Swal.fire({ icon: "success", title: "Template dibuat", text: "Template register bahan berhasil dibuat.", ...swalButtonColors });
  };

  const buildBahanPdf = async (rows, { scopeLabel = "data bahan" } = {}) => {
      const {
        bahanWithoutImage: exportWithoutImage,
        groupedBahanImages: exportImageGroups,
      } = splitBahanByImage(rows);
      const imageMap = new Map();

      for (const group of exportImageGroups) {
        const imageUrl = getBahanImageUrl(group.image);
        if (!imageUrl) continue;

        try {
          imageMap.set(group.id, await imageUrlToPdfDataUrl(imageUrl));
        } catch (imageError) {
          console.warn("Gagal memuat gambar bahan untuk PDF:", imageError);
        }
      }

      const doc = new jsPDF("landscape", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 8;
      const marginBottom = 12;
      const generatedAt = new Date();
      const pdfDate = generatedAt.toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const withImageCount = exportImageGroups.reduce((total, group) => total + group.items.length, 0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text("Master Bahan", marginX, 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Export ${scopeLabel} - ${pdfDate}`, marginX, 18);
      doc.text(`Total: ${formatNumber(rows.length)} data | Bergambar: ${formatNumber(withImageCount)} data | Tanpa gambar: ${formatNumber(exportWithoutImage.length)} data`, marginX, 23);

      let cursorY = 31;
      const drawSectionTitle = (title, subtitle) => {
        if (cursorY > pageHeight - 28) {
          doc.addPage();
          cursorY = 14;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(title, marginX, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(subtitle, marginX, cursorY + 4);
        cursorY += 8;
      };

      const formatUniquePdfValues = (rows, field, formatter = (value) => value, emptyLabel = "-") => {
        const values = uniqueGroupValues(rows, field);
        if (values.length === 0) return emptyLabel;
        return values.map((value) => formatter(value)).join("\n");
      };

      drawSectionTitle(
        "Bahan Sudah Punya Gambar",
        `${formatNumber(withImageCount)} data dalam ${formatNumber(exportImageGroups.length)} grup gambar`
      );

      const imageTableRows = exportImageGroups.map((group, index) => [
        index + 1,
        "",
        formatUniquePdfValues(group.items, "nama_bahan"),
        formatUniquePdfValues(group.items, "deskripsi"),
        formatUniquePdfValues(group.items, "harga", formatRupiah),
        formatUniquePdfValues(group.items, "satuan", getSatuanLabel),
        formatNumber(getGroupedStockTotal(group.items)),
        group.items.map((item) => `${formatNumber(item.stok_bahan)} ${item.warna_bahan || "-"}`).join("\n") || "-",
      ]);

      doc.autoTable({
        startY: cursorY,
        head: [["No", "Gambar", "Nama Bahan", "Deskripsi", "Harga", "Satuan", "Stok", "Warna Bahan"]],
        body: imageTableRows.length > 0 ? imageTableRows : [["-", "-", "Belum ada bahan bergambar", "-", "-", "-", "-", "-"]],
        theme: "grid",
        margin: { left: marginX, right: marginX, top: 12, bottom: marginBottom },
        styles: {
          fontSize: 6,
          cellPadding: 1.8,
          overflow: "linebreak",
          valign: "top",
          textColor: [15, 23, 42],
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [244, 247, 250],
          textColor: [51, 65, 85],
          fontStyle: "bold",
          halign: "left",
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 58, minCellHeight: 58 },
          2: { cellWidth: 42 },
          3: { cellWidth: 36 },
          4: { cellWidth: 24 },
          5: { cellWidth: 22 },
          6: { cellWidth: 14, halign: "right" },
          7: { cellWidth: 63 },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            data.cell.styles.minCellHeight = 58;
          }
        },
        didDrawCell: (data) => {
          if (data.section !== "body" || data.column.index !== 1) return;
          const group = exportImageGroups[data.row.index];
          const imageData = group ? imageMap.get(group.id) : null;
          if (!imageData?.dataUrl) return;

          const maxWidth = data.cell.width - 3;
          const maxHeight = data.cell.height - 3;
          const ratio = Math.min(maxWidth / imageData.width, maxHeight / imageData.height);
          const imageWidth = imageData.width * ratio;
          const imageHeight = imageData.height * ratio;
          const imageX = data.cell.x + (data.cell.width - imageWidth) / 2;
          const imageY = data.cell.y + (data.cell.height - imageHeight) / 2;
          doc.addImage(imageData.dataUrl, "JPEG", imageX, imageY, imageWidth, imageHeight);
        },
      });

      cursorY = (doc.lastAutoTable?.finalY || cursorY) + 9;
      drawSectionTitle("Bahan Belum Ada Gambar", `${formatNumber(exportWithoutImage.length)} data tanpa gambar`);

      const withoutImageRows = exportWithoutImage.map((item, index) => [
        index + 1,
        item.group_bahan || "-",
        item.pabrik_bahan || "-",
        item.nama_bahan || "-",
        item.deskripsi || "-",
        formatRupiah(item.harga),
        getSatuanLabel(item.satuan),
        formatNumber(item.stok_bahan),
        item.warna_bahan || "-",
      ]);

      doc.autoTable({
        startY: cursorY,
        head: [["No", "Group Bahan", "Pabrik", "Nama Bahan", "Deskripsi", "Harga", "Satuan", "Stok", "Warna Bahan"]],
        body: withoutImageRows.length > 0 ? withoutImageRows : [["-", "-", "-", "Tidak ada bahan tanpa gambar", "-", "-", "-", "-", "-"]],
        theme: "grid",
        margin: { left: marginX, right: marginX, top: 12, bottom: marginBottom },
        styles: {
          fontSize: 6,
          cellPadding: 1.8,
          overflow: "linebreak",
          valign: "top",
          textColor: [15, 23, 42],
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [244, 247, 250],
          textColor: [51, 65, 85],
          fontStyle: "bold",
          halign: "left",
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 34 },
          2: { cellWidth: 28 },
          3: { cellWidth: 46 },
          4: { cellWidth: 43 },
          5: { cellWidth: 28 },
          6: { cellWidth: 25 },
          7: { cellWidth: 16, halign: "right" },
          8: { cellWidth: 52 },
        },
      });

      const totalPdfPages = doc.getNumberOfPages();
      for (let pageIndex = 1; pageIndex <= totalPdfPages; pageIndex += 1) {
        doc.setPage(pageIndex);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Halaman ${pageIndex} dari ${totalPdfPages}`, pageWidth - marginX, pageHeight - 5, { align: "right" });
      }

      const fileDate = generatedAt.toISOString().slice(0, 10);
      doc.save(`master-bahan-${fileDate}.pdf`);
  };

  const fetchAllBahanRows = async () => {
    const response = await API.get("/bahan", {
      params: { all: 1 },
    });
    const payload = response.data || {};
    return Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
  };

  const openExportModal = async () => {
    setShowExportModal(true);
    setExportBahanSearch("");

    try {
      setExportBahanLoading(true);
      const rows = await fetchAllBahanRows();
      const validIds = new Set(rows.map((item) => String(item.id)));
      setExportBahanRows(rows);
      setSelectedExportBahanIds((prev) => prev.filter((id) => validIds.has(String(id))));
    } catch (exportLoadError) {
      setExportBahanRows([]);
      Swal.fire({
        icon: "error",
        title: "Gagal memuat bahan",
        text: getApiErrorMessage(exportLoadError, "Gagal mengambil daftar bahan untuk export PDF."),
        ...swalButtonColors,
      });
    } finally {
      setExportBahanLoading(false);
    }
  };

  const closeExportModal = () => {
    if (exportingPdf) return;
    setShowExportModal(false);
  };

  const toggleExportBahanSelection = (bahanId) => {
    setSelectedExportBahanIds((prev) =>
      prev.includes(bahanId) ? prev.filter((id) => id !== bahanId) : [...prev, bahanId]
    );
  };

  const selectAllVisibleExportBahan = () => {
    const visibleIds = filteredExportBahanRows.map((item) => item.id);
    setSelectedExportBahanIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearVisibleExportBahan = () => {
    const visibleIds = new Set(filteredExportBahanRows.map((item) => String(item.id)));
    setSelectedExportBahanIds((prev) => prev.filter((id) => !visibleIds.has(String(id))));
  };

  const handleExportSelectedPdf = async () => {
    if (selectedExportBahanRows.length === 0) {
      Swal.fire({ icon: "warning", title: "Pilih bahan", text: "Pilih minimal satu bahan untuk export PDF.", ...swalButtonColors });
      return;
    }

    try {
      setExportingPdf(true);
      Swal.fire({
        title: "Menyiapkan PDF...",
        text: `Menyusun ${selectedExportBahanRows.length} data terpilih.`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      await buildBahanPdf(selectedExportBahanRows, { scopeLabel: "data bahan terpilih" });
      Swal.close();
      setShowExportModal(false);
      await Swal.fire({ icon: "success", title: "PDF dibuat", text: "Data bahan berhasil diexport ke PDF.", ...swalButtonColors });
    } catch (exportError) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Export PDF gagal",
        text: getApiErrorMessage(exportError, "Gagal membuat PDF data bahan."),
        ...swalButtonColors,
      });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="ks-page pl-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Master Bahan</h1>
          <span className="ks-header-sub">
            {totalBahan} bahan terdaftar, {totalGroup} group aktif, {totalWarna} warna tercatat, total stok {formatNumber(totalStok)} — Manajemen material, group, warna, harga, dan satuan produksi
          </span>
        </div>
      </header>

      <section className="ks-board">
        <div className="ks-toolbar">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1, flexWrap: "wrap" }}>
            <div className="ks-search" style={{ flex: 1, minWidth: "200px" }}>
              <FaSearch style={{ position: "absolute", left: "10px", color: "var(--ks-muted, #9a9aa3)", pointerEvents: "none", fontSize: "12px" }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSelectedBahanName("");
                  setSearchTerm(e.target.value);
                }}
                placeholder="Cari nama bahan, group, atau warna..."
                style={{ paddingLeft: "30px", width: "100%" }}
              />
              {searchTerm && (
                <button type="button" className="pl-search-clear" onClick={() => setSearchTerm("")}>
                  <FaTimes />
                </button>
              )}
            </div>
            
            <select
              value={selectedPabrik}
              onChange={(e) => {
                setCurrentPage(1);
                setSelectedPabrik(e.target.value);
              }}
              style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", outline: "none" }}
            >
              <option value="">Semua Pabrik</option>
              {pabrikOptions.map((pabrik) => (
                <option key={pabrik} value={pabrik}>
                  {pabrik}
                </option>
              ))}
            </select>
            
            <select
              value={selectedSatuan}
              onChange={(e) => {
                setCurrentPage(1);
                setSelectedSatuan(e.target.value);
              }}
              style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", outline: "none" }}
            >
              <option value="">Semua Satuan</option>
              {SATUAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            <button className="ks-btn is-secondary" onClick={handleDownloadTemplate} title="Download Template">
              <FaDownload />
            </button>
            <button className="ks-btn is-secondary" onClick={openExportModal} disabled={exportingPdf} title="Export PDF">
              <FaFilePdf />
            </button>
            <label className="ks-btn is-secondary" style={{ cursor: "pointer", margin: 0 }} title="Import Excel">
              <FaFileImport />
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFileChange} style={{ display: "none" }} />
            </label>
            <button className="ks-btn is-secondary" onClick={openImageModal}>
              <FaImage /> Tambah Gambar
            </button>
            <button
              className="ks-btn is-primary"
              onClick={() => {
                setShowEditForm(false);
                setShowForm(true);
              }}
            >
              <FaPlus /> Tambah Bahan
            </button>
          </div>
        </div>

        <div className="ks-grid-scroll">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Memuat data bahan...</div>
          ) : error ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#ef4444", fontWeight: 600 }}>{error}</div>
          ) : currentItems.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>
              {isFiltering ? "Tidak ada bahan yang sesuai dengan filter yang Anda pilih." : "Belum ada data bahan."}
            </div>
          ) : (
            <table className="ks-grid">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Gambar</th>
                  <th>Group Bahan</th>
                  <th>Pabrik</th>
                  <th>Nama Bahan</th>
                  <th>Deskripsi</th>
                  <th>Harga</th>
                  <th>Satuan</th>
                  <th>Stok</th>
                  <th>Warna Bahan</th>
                  <th style={{ width: "120px", textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item) => {
                  const image = item.bahan_image || item.bahanImage || null;
                  const imageUrl = image ? getBahanImageUrl(image) : null;
                  const groupTitle = item.group_bahan || item.nama_bahan;
                  return (
                    <tr key={item.id}>
                      <td className="ks-cell-code">
                        <strong>{getItemPageNumber(item)}</strong>
                      </td>
                      <td>
                        {imageUrl ? (
                          <button
                            type="button"
                            onClick={() => openPreviewImage(imageUrl, groupTitle)}
                            title="Klik untuk melihat gambar"
                            style={{ padding: 0, border: "none", background: "none", cursor: "pointer", borderRadius: "6px", overflow: "hidden" }}
                          >
                            <img src={imageUrl} alt={groupTitle} style={{ width: '40px', height: '40px', objectFit: 'cover', display: 'block' }} />
                          </button>
                        ) : (
                          <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '6px', color: '#94a3b8' }}>
                            <FaImage />
                          </div>
                        )}
                      </td>
                      <td>{item.group_bahan || <span style={{ color: "#94a3b8" }}>-</span>}</td>
                      <td>{item.pabrik_bahan || <span style={{ color: "#94a3b8" }}>-</span>}</td>
                      <td>
                        <span style={{ fontSize: "0.9em", fontWeight: 600 }}>{item.nama_bahan}</span>
                      </td>
                      <td>{item.deskripsi || <span style={{ color: "#94a3b8" }}>-</span>}</td>
                      <td>
                        <strong style={{ color: "#10b981" }}>{formatRupiah(item.harga)}</strong>
                      </td>
                      <td>
                        <span style={{ display: "inline-block", padding: "2px 6px", background: "#f1f5f9", borderRadius: "4px", fontSize: "11px", color: "#64748b" }}>
                          <FaTag style={{ marginRight: "4px" }} />
                          {getSatuanLabel(item.satuan)}
                        </span>
                      </td>
                      <td>
                        <strong>{formatNumber(item.stok_bahan)}</strong>
                      </td>
                      <td>{item.warna_bahan || <span style={{ color: "#94a3b8" }}>-</span>}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button className="ks-icon-btn" onClick={() => handleDetailClick(item)} title="Detail" style={{ border: "none", background: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}>
                            <FaEye />
                          </button>
                          <button className="ks-icon-btn" onClick={() => handleEditClick(item)} title="Edit" style={{ border: "none", background: "none", color: "#3b82f6", cursor: "pointer", padding: "4px" }}>
                            <FaEdit />
                          </button>
                          <button className="ks-icon-btn" onClick={() => handleDelete(item.id, item.nama_bahan)} title="Hapus" style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}>
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {(showForm || showEditForm) && (
        <div className="product-list-modal-backdrop" onClick={resetForm}>
          <form className="product-list-modal" onSubmit={showEditForm ? handleFormUpdate : handleFormSubmit} onClick={(e) => e.stopPropagation()}>
            <div className="product-list-modal-header">
              <div>
                <p className="product-list-modal-kicker">Data Bahan</p>
                <h2>{showEditForm ? "Edit Bahan" : "Tambah Bahan Baru"}</h2>
              </div>
              <button className="product-list-icon-button" type="button" onClick={resetForm}>
                <FaTimes />
              </button>
            </div>

            <div className="product-list-form-section" style={{ maxHeight: "65vh", overflowY: "auto" }}>
              <div className="product-list-form-grid">
                <label className="product-list-field" style={{ gridColumn: "span 1" }}>
                  <span>Group Bahan</span>
                  <input
                    type="text"
                    name="group_bahan"
                    value={showEditForm ? editItem.group_bahan : newItem.group_bahan}
                    onChange={handleInputChange}
                    placeholder="Contoh: Kain Utama"
                  />
                </label>

                <label className="product-list-field" style={{ gridColumn: "span 1" }}>
                  <span>Pabrik Bahan</span>
                  <select
                    name="pabrik_bahan"
                    value={showEditForm ? editItem.pabrik_bahan : newItem.pabrik_bahan}
                    onChange={handleInputChange}
                  >
                    {pabrikSelectOptions.map((pabrik) => (
                      <option key={pabrik} value={pabrik}>
                        {pabrik}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="product-list-field" style={{ gridColumn: "1 / -1" }}>
                  <span>Nama Bahan *</span>
                  <input
                    type="text"
                    name="nama_bahan"
                    value={showEditForm ? editItem.nama_bahan : newItem.nama_bahan}
                    onChange={handleInputChange}
                    required
                    placeholder="Contoh: Katun Combed"
                  />
                </label>

                {showEditForm ? (
                  <label className="product-list-field" style={{ gridColumn: "1 / -1" }}>
                    <span>Warna Bahan</span>
                    <input
                      type="text"
                      name="warna_bahan"
                      value={editItem.warna_bahan}
                      onChange={handleInputChange}
                      placeholder="Contoh: Navy"
                    />
                  </label>
                ) : (
                  <label className="product-list-field" style={{ gridColumn: "1 / -1" }}>
                    <span>Warna Bahan</span>
                    <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                      <input
                        type="text"
                        placeholder="Masukkan warna..."
                        value={warnaInput}
                        onChange={(e) => setWarnaInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddWarna();
                          }
                        }}
                        style={{ flex: 1 }}
                      />
                      <button type="button" className="product-list-primary-button" style={{ padding: "0 12px", whiteSpace: "nowrap" }} onClick={handleAddWarna}>
                        Tambah
                      </button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                      {newItem.warna_bahan && newItem.warna_bahan.length > 0 ? (
                        newItem.warna_bahan.map((warna, idx) => (
                          <span key={idx} style={{ background: "#e0f2fe", color: "#0284c7", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                            {warna}
                            <button
                              type="button"
                              onClick={() => handleRemoveWarna(idx)}
                              style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Belum ada warna yang ditambahkan</span>
                      )}
                    </div>
                  </label>
                )}

                <label className="product-list-field" style={{ gridColumn: "1 / -1" }}>
                  <span>Deskripsi</span>
                  <textarea
                    name="deskripsi"
                    value={showEditForm ? editItem.deskripsi : newItem.deskripsi}
                    onChange={handleInputChange}
                    rows="2"
                    placeholder="Tuliskan detail penggunaan atau karakter bahan"
                    style={{ width: "100%", padding: "10px", border: "1px solid var(--ks-border, #e2e8f0)", borderRadius: "6px", outline: "none", fontSize: "14px", resize: "vertical" }}
                  />
                </label>

                <label className="product-list-field" style={{ gridColumn: "span 1" }}>
                  <span>Harga (Rp) *</span>
                  <input
                    type="text"
                    name="harga"
                    value={showEditForm ? editItem.harga : newItem.harga}
                    onChange={handleInputChange}
                    required
                    placeholder="Contoh: 50.000"
                  />
                </label>

                <label className="product-list-field" style={{ gridColumn: "span 1" }}>
                  <span>Satuan</span>
                  <select
                    name="satuan"
                    value={showEditForm ? editItem.satuan : newItem.satuan}
                    onChange={handleInputChange}
                    required
                  >
                    {SATUAN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="product-list-field" style={{ gridColumn: "span 1" }}>
                  <span>Stok Bahan</span>
                  <input
                    type="text"
                    name="stok_bahan"
                    value={showEditForm ? editItem.stok_bahan : newItem.stok_bahan}
                    onChange={handleInputChange}
                    placeholder="Contoh: 10"
                  />
                </label>
              </div>
            </div>

            <div className="product-list-modal-actions">
              <button className="product-list-ghost-button" type="button" onClick={resetForm}>
                Batal
              </button>
              <button className="product-list-primary-button" type="submit">
                {showEditForm ? "Perbarui" : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showExportModal && (
        <div className="product-list-modal-backdrop" onClick={closeExportModal}>
          <div className="product-list-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="product-list-modal-header">
              <div>
                <p className="product-list-modal-kicker">Data Bahan</p>
                <h2>Export PDF Bahan</h2>
              </div>
              <button className="product-list-icon-button" type="button" onClick={closeExportModal} disabled={exportingPdf}>
                <FaTimes />
              </button>
            </div>
            
            <div className="product-list-form-section" style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "60vh" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <div className="ks-search" style={{ flex: 1 }}>
                  <FaSearch style={{ position: "absolute", left: "10px", color: "var(--ks-muted, #9a9aa3)", pointerEvents: "none", fontSize: "12px" }} />
                  <input
                    type="text"
                    value={exportBahanSearch}
                    onChange={(e) => setExportBahanSearch(e.target.value)}
                    placeholder="Cari nama bahan, group..."
                    style={{ paddingLeft: "30px", width: "100%", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px" }}
                    disabled={exportingPdf}
                  />
                </div>
                <button type="button" className="product-list-ghost-button" onClick={selectAllVisibleExportBahan} disabled={exportingPdf || filteredExportBahanRows.length === 0}>
                  Pilih Semua
                </button>
                <button type="button" className="product-list-ghost-button" onClick={clearVisibleExportBahan} disabled={exportingPdf || filteredExportBahanRows.length === 0}>
                  Hapus
                </button>
              </div>

              <div style={{ fontSize: "12px", color: "#64748b" }}>
                <span>{selectedExportBahanRows.length} bahan dipilih dari {filteredExportBahanRows.length} tampil</span>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflowY: "auto", flex: 1, padding: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {exportBahanLoading ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Memuat...</div>
                ) : filteredExportBahanRows.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Bahan tidak ditemukan.</div>
                ) : (
                  filteredExportBahanRows.map((item) => {
                    const selected = selectedExportBahanIds.includes(item.id);
                    return (
                      <label key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "8px", borderRadius: "4px", background: selected ? "#f0f9ff" : "transparent", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleExportBahanSelection(item.id)}
                          disabled={exportingPdf}
                          style={{ marginTop: "3px" }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", fontSize: "13px" }}>
                          <strong style={{ color: "#334155" }}>{item.nama_bahan || "-"}</strong>
                          <span style={{ color: "#64748b", fontSize: "11px" }}>#{item.id} | {item.group_bahan || "-"} | {item.warna_bahan || "-"}</span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="product-list-modal-actions">
              <button className="product-list-ghost-button" type="button" onClick={closeExportModal} disabled={exportingPdf}>
                Batal
              </button>
              <button className="product-list-primary-button" type="button" onClick={handleExportSelectedPdf} disabled={exportingPdf || selectedExportBahanRows.length === 0}>
                <FaFilePdf /> {exportingPdf ? "Menyiapkan PDF..." : `Export ${selectedExportBahanRows.length} Bahan`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className="product-list-modal-backdrop" onClick={closeImageModal}>
          <form className="product-list-modal" onSubmit={handleBahanImageSubmit} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="product-list-modal-header">
              <div>
                <p className="product-list-modal-kicker">Data Bahan</p>
                <h2>Tambah Gambar Bahan</h2>
              </div>
              <button className="product-list-icon-button" type="button" onClick={closeImageModal} disabled={imageSubmitting}>
                <FaTimes />
              </button>
            </div>
            
            <div className="product-list-form-section" style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "60vh", overflowY: "auto" }}>
              
              <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
                <button
                  type="button"
                  onClick={() => setImageModalStep(1)}
                  disabled={imageSubmitting}
                  style={{ flex: 1, padding: "8px", border: "none", background: imageModalStep === 1 ? "#eff6ff" : "transparent", color: imageModalStep === 1 ? "#2563eb" : "#64748b", fontWeight: imageModalStep === 1 ? 600 : 400, borderRadius: "6px", cursor: "pointer" }}
                >
                  1. Upload Gambar
                </button>
                <button
                  type="button"
                  onClick={() => imageFile && setImageModalStep(2)}
                  disabled={!imageFile || imageSubmitting}
                  style={{ flex: 1, padding: "8px", border: "none", background: imageModalStep === 2 ? "#eff6ff" : "transparent", color: imageModalStep === 2 ? "#2563eb" : "#64748b", fontWeight: imageModalStep === 2 ? 600 : 400, borderRadius: "6px", cursor: imageFile ? "pointer" : "not-allowed", opacity: !imageFile ? 0.5 : 1 }}
                >
                  2. Pilih Bahan
                </button>
              </div>

              {imageModalStep === 1 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "20px 0" }}>
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "200px", border: "2px dashed #cbd5e1", borderRadius: "8px", cursor: "pointer", background: "#f8fafc", position: "relative", overflow: "hidden" }}>
                    <input type="file" accept="image/*" onChange={handleBahanImageFileChange} disabled={imageSubmitting} style={{ display: "none" }} />
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <>
                        <FaUpload style={{ fontSize: "24px", color: "#94a3b8", marginBottom: "8px" }} />
                        <span style={{ color: "#475569", fontWeight: 500 }}>Upload gambar</span>
                        <span style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>JPG, PNG, atau WEBP maksimal 2 MB</span>
                      </>
                    )}
                  </label>
                  {imageFile && (
                    <div style={{ fontSize: "13px", color: "#475569" }}>
                      {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                  <div className="ks-search">
                    <FaSearch style={{ position: "absolute", left: "10px", color: "var(--ks-muted, #9a9aa3)", pointerEvents: "none", fontSize: "12px" }} />
                    <input
                      type="text"
                      value={imageBahanSearch}
                      onChange={(e) => setImageBahanSearch(e.target.value)}
                      placeholder="Cari bahan..."
                      style={{ paddingLeft: "30px", width: "100%", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px" }}
                      disabled={imageSubmitting}
                    />
                  </div>
                  
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflowY: "auto", flex: 1, padding: "8px", display: "flex", flexDirection: "column", gap: "4px", minHeight: "200px" }}>
                    {imageBahanLoading ? (
                      <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Memuat...</div>
                    ) : imageBahanOptions.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Bahan tidak ditemukan.</div>
                    ) : (
                      imageBahanOptions.map((item) => {
                        const selected = selectedImageBahanIds.includes(item.id);
                        return (
                          <label key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "8px", borderRadius: "4px", background: selected ? "#f0f9ff" : "transparent", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleImageBahanSelection(item.id)}
                              disabled={imageSubmitting}
                              style={{ marginTop: "3px" }}
                            />
                            <div style={{ display: "flex", flexDirection: "column", fontSize: "13px" }}>
                              <strong style={{ color: "#334155" }}>{item.nama_bahan || "-"}</strong>
                              <span style={{ color: "#64748b", fontSize: "11px" }}>{item.group_bahan || "-"} | {item.warna_bahan || "-"}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="product-list-modal-actions">
              {imageModalStep === 1 ? (
                <>
                  <button className="product-list-ghost-button" type="button" onClick={closeImageModal} disabled={imageSubmitting}>
                    Batal
                  </button>
                  <button
                    className="product-list-primary-button"
                    type="button"
                    onClick={() => {
                      if (!imageFile) {
                        Swal.fire({ icon: "warning", title: "Pilih gambar", text: "Upload gambar bahan terlebih dahulu.", ...swalButtonColors });
                        return;
                      }
                      setImageModalStep(2);
                    }}
                  >
                    Lanjut Pilih Bahan
                  </button>
                </>
              ) : (
                <>
                  <button className="product-list-ghost-button" type="button" onClick={() => setImageModalStep(1)} disabled={imageSubmitting}>
                    <FaArrowLeft /> Kembali
                  </button>
                  <button className="product-list-primary-button" type="submit" disabled={imageSubmitting || selectedImageBahanIds.length === 0}>
                    {imageSubmitting ? "Menyimpan..." : "Simpan Gambar"}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      )}

      {showDetailModal && detailItem && (
        <div className="product-list-modal-backdrop" onClick={closeDetailModal}>
          <div className="product-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="product-list-modal-header">
              <div>
                <p className="product-list-modal-kicker">Data Bahan</p>
                <h2>Detail Data Bahan</h2>
              </div>
              <button className="product-list-icon-button" type="button" onClick={closeDetailModal}>
                <FaTimes />
              </button>
            </div>

            <div className="product-list-form-section">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px", color: "#334155" }}>
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                  <span style={{ fontWeight: 600, color: "#64748b" }}>ID Bahan</span>
                  <span>#{detailItem.id}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                  <span style={{ fontWeight: 600, color: "#64748b" }}>Nama Bahan</span>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>{detailItem.nama_bahan || "-"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                  <span style={{ fontWeight: 600, color: "#64748b" }}>Group</span>
                  <span>{detailItem.group_bahan || "-"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                  <span style={{ fontWeight: 600, color: "#64748b" }}>Pabrik</span>
                  <span>{detailItem.pabrik_bahan || "-"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                  <span style={{ fontWeight: 600, color: "#64748b" }}>Warna</span>
                  <span>{detailItem.warna_bahan || "-"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                  <span style={{ fontWeight: 600, color: "#64748b" }}>Stok</span>
                  <span>{formatNumber(detailItem.stok_bahan)} {getSatuanLabel(detailItem.satuan)}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                  <span style={{ fontWeight: 600, color: "#64748b" }}>Harga</span>
                  <span style={{ fontWeight: 600, color: "#10b981" }}>{formatRupiah(detailItem.harga)}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                  <span style={{ fontWeight: 600, color: "#64748b" }}>Deskripsi</span>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    {detailItem.deskripsi || <span style={{ color: "#94a3b8" }}>Tidak ada deskripsi</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="product-list-modal-actions">
              <button className="product-list-ghost-button" type="button" onClick={closeDetailModal}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="product-list-modal-backdrop" onClick={closePreviewImage}>
          <div className="product-list-modal" onClick={(e) => e.stopPropagation()} style={{ background: "transparent", boxShadow: "none", border: "none" }}>
            <div style={{ position: "relative", display: "inline-block", background: "#fff", padding: "8px", borderRadius: "8px" }}>
              <button
                type="button"
                onClick={closePreviewImage}
                style={{ position: "absolute", top: "-12px", right: "-12px", width: "30px", height: "30px", borderRadius: "15px", background: "#fff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, color: "#64748b" }}
              >
                <FaTimes />
              </button>
              <img src={previewImage.url} alt={previewImage.title} style={{ maxWidth: "80vw", maxHeight: "80vh", objectFit: "contain", display: "block", borderRadius: "4px" }} />
              <div style={{ padding: "8px 4px 4px", fontSize: "14px", fontWeight: 500, color: "#334155", textAlign: "center" }}>
                {previewImage.title}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Bahan;

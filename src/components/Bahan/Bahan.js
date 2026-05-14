import React, { useEffect, useMemo, useState } from "react";
import "./Bahan.css";
import API from "../../api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import * as XLSX from "xlsx";
import Select from "react-select";
import {
  FaBoxOpen,
  FaArrowLeft,
  FaCheck,
  FaDownload,
  FaEdit,
  FaEye,
  FaFileImport,
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

const Bahan = () => {
  const [items, setItems] = useState([]);
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
    warna_bahan: "",
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
  const { bahanWithoutImage, groupedBahanImages } = useMemo(() => {
    const withoutImage = [];
    const grouped = new Map();

    items.forEach((item) => {
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
  }, [items]);

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

  const fetchData = async (page = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/bahan", {
        params: {
          page,
          per_page: DEFAULT_PER_PAGE,
          search: activeSearchTerm || undefined,
          pabrik_bahan: selectedPabrik || undefined,
          satuan: selectedSatuan || undefined,
        },
      });

      const payload = res.data || {};
      const rows = Array.isArray(payload.data) ? payload.data : [];
      setItems(rows);
      setCurrentPage(Number(payload.current_page) || page);
      setLastPage(Number(payload.last_page) || 1);
      setTotalRows(Number(payload.total) || rows.length);
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
    fetchData(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearchTerm, selectedBahanName, selectedPabrik, selectedSatuan]);

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

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const resetForm = () => {
    setNewItem({ group_bahan: "", pabrik_bahan: "-", nama_bahan: "", deskripsi: "", harga: "", satuan: "kg", warna_bahan: "", stok_bahan: "" });
    setEditItem({ id: null, group_bahan: "", pabrik_bahan: "-", nama_bahan: "", deskripsi: "", harga: "", satuan: "kg", warna_bahan: "", stok_bahan: "" });
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
        warna_bahan: newItem.warna_bahan || undefined,
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

  return (
    <div className="bahan-container">
      <header className="bahan-header">
        <div className="bahan-header-top">
          <div className="bahan-title-group">
            <div className="bahan-brand-icon">
              <FiBox />
            </div>
            <div className="bahan-title-wrap">
              <div className="bahan-module-pill">Material Module</div>
              <h1>Master Bahan</h1>
              <p className="bahan-header-subtitle">Manajemen material, group, warna, harga, dan satuan produksi</p>
            </div>
          </div>
          <div className="bahan-search-wrap">
            <input
              type="text"
              className="bahan-search-input"
              placeholder="Cari nama bahan..."
              value={searchTerm}
              onChange={(e) => {
                setSelectedBahanName("");
                setSearchTerm(e.target.value);
              }}
            />
            {searchTerm && (
              <button className="bahan-search-clear" onClick={() => setSearchTerm("")} title="Hapus pencarian">
                x
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="bahan-main">
        <section className="bahan-stats">
          <article className="bahan-stat-item">
            <div className="bahan-stat-label">Total Bahan</div>
            <div className="bahan-stat-value">{totalBahan}</div>
          </article>
          <article className="bahan-stat-item">
            <div className="bahan-stat-label">Group Aktif</div>
            <div className="bahan-stat-value bahan-stat-value-info">{totalGroup}</div>
          </article>
          <article className="bahan-stat-item">
            <div className="bahan-stat-label">Warna Tercatat</div>
            <div className="bahan-stat-value bahan-stat-value-success">{totalWarna}</div>
          </article>
          <article className="bahan-stat-item">
            <div className="bahan-stat-label">Total Stok</div>
            <div className="bahan-stat-value bahan-stat-value-price">{formatNumber(totalStok)}</div>
          </article>
        </section>

        <section className="bahan-table-wrapper">
          <div className="bahan-table-header">
            <div>
              <h3>Semua Data Bahan</h3>
              <p>{isFiltering ? `Menampilkan ${totalRows} data sesuai filter` : `Menampilkan ${currentItems.length} data pada halaman ini`}</p>
            </div>
            <div className="bahan-table-actions">
              <button className="bahan-btn-secondary" onClick={handleDownloadTemplate}>
                <FaDownload /> Template
              </button>
              <label className="bahan-btn-secondary bahan-btn-file">
                <FaFileImport /> Import Excel
                <input className="bahan-import-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFileChange} />
              </label>
              <button className="bahan-btn-secondary" onClick={openImageModal}>
                <FaImage /> Tambah Gambar
              </button>
              <button
                className="bahan-btn-primary"
                onClick={() => {
                  setShowEditForm(false);
                  setShowForm(true);
                }}
              >
                <FaPlus /> Tambah Bahan
              </button>
            </div>
          </div>

          <div className="bahan-filter-section">
            <div className="bahan-filter-wrap bahan-name-filter-wrap">
              <Select
                className="bahan-name-filter-select"
                classNamePrefix="bahan-name-select"
                value={selectedBahanNameOption}
                options={bahanNameOptions}
                onChange={(option) => {
                  setCurrentPage(1);
                  setSearchTerm("");
                  setSelectedBahanName(option?.value || "");
                }}
                placeholder="Semua Nama Bahan"
                isSearchable
                isClearable
                isLoading={bahanNameLoading}
                loadingMessage={() => "Memuat nama bahan..."}
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? `Nama bahan "${inputValue}" tidak ditemukan` : "Belum ada nama bahan"
                }
                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                menuPosition="fixed"
                styles={bahanNameSelectStyles}
                aria-label="Filter nama bahan"
              />
            </div>
            <div className="bahan-filter-wrap">
              <select
                value={selectedPabrik}
                onChange={(e) => {
                  setCurrentPage(1);
                  setSelectedPabrik(e.target.value);
                }}
                className="bahan-filter-select"
              >
                <option value="">Semua Pabrik</option>
                {pabrikOptions.map((pabrik) => (
                  <option key={pabrik} value={pabrik}>
                    {pabrik}
                  </option>
                ))}
              </select>
              {selectedPabrik && (
                <span
                  className="bahan-filter-badge"
                  onClick={() => {
                    setCurrentPage(1);
                    setSelectedPabrik("");
                  }}
                  title="Hapus filter"
                >
                  {selectedPabrik} x
                </span>
              )}
            </div>
            <div className="bahan-filter-wrap">
              <select
                value={selectedSatuan}
                onChange={(e) => {
                  setCurrentPage(1);
                  setSelectedSatuan(e.target.value);
                }}
                className="bahan-filter-select"
              >
                <option value="">Semua Satuan</option>
                {SATUAN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {selectedSatuan && (
                <span
                  className="bahan-filter-badge"
                  onClick={() => {
                    setCurrentPage(1);
                    setSelectedSatuan("");
                  }}
                  title="Hapus filter"
                >
                  {selectedSatuan} x
                </span>
              )}
            </div>
            <div className="bahan-filter-summary">
              Stok: {formatNumber(totalStok)}
            </div>
          </div>

          {loading ? (
            <div className="bahan-loading">
              <div className="bahan-spinner"></div>
              <div className="bahan-loading-title">Memuat data bahan...</div>
              <div className="bahan-loading-subtitle">Mohon tunggu sebentar</div>
            </div>
          ) : error ? (
            <div className="bahan-empty-state">
              <div className="bahan-empty-icon">!</div>
              <h3 className="bahan-empty-title error">Terjadi Kesalahan</h3>
              <p className="bahan-empty-text">{error}</p>
              <button className="bahan-btn-primary" onClick={() => window.location.reload()}>
                Muat Ulang Halaman
              </button>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="bahan-empty-state">
              <div className="bahan-empty-icon">-</div>
              <h3 className="bahan-empty-title">Belum Ada Data Bahan</h3>
              <p className="bahan-empty-text">
                {isFiltering ? "Tidak ada bahan yang sesuai dengan filter yang Anda pilih" : "Mulai dengan menambahkan bahan pertama Anda"}
              </p>
              {isFiltering && (
                <button className="bahan-btn-secondary bahan-empty-cta" onClick={clearFilters}>
                  Hapus Filter
                </button>
              )}
              {!isFiltering && (
                <button
                  className="bahan-btn-primary bahan-empty-cta"
                  onClick={() => {
                    setShowEditForm(false);
                    setShowForm(true);
                  }}
                >
                  <FaPlus /> Tambah Bahan Pertama
                </button>
              )}
            </div>
          ) : (
            <>
              {groupedBahanImages.length > 0 && (
                <div className="bahan-table-scroll bahan-image-table-scroll">
                  <table className="bahan-table bahan-image-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Gambar</th>
                        <th>Nama Bahan</th>
                        <th>Deskripsi</th>
                        <th>Harga</th>
                        <th>Satuan</th>
                        <th>Stok</th>
                        <th>Warna Bahan</th>
                        <th className="align-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedBahanImages.map((group) => {
                        const firstItem = group.items[0] || {};
                        const imageUrl = getBahanImageUrl(group.image);
                        const groupTitle = uniqueGroupValues(group.items, "group_bahan").join(" / ") || `Gambar bahan ${group.id}`;

                        return (
                          <tr className="bahan-image-table-row" key={group.id}>
                            <td>
                              <strong>{getItemPageNumber(firstItem)}</strong>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="bahan-table-image-frame bahan-table-image-button"
                                onClick={() => openPreviewImage(imageUrl, groupTitle)}
                                title="Klik untuk melihat gambar"
                              >
                                {imageUrl ? (
                                  <img src={imageUrl} alt={groupTitle} />
                                ) : (
                                  <div className="bahan-image-placeholder">
                                    <FaImage />
                                  </div>
                                )}
                              </button>
                            </td>
                            <td>{renderGroupedValues(group.items, "nama_bahan")}</td>
                            <td>{renderGroupedValues(group.items, "deskripsi")}</td>
                            <td>
                              <div className="bahan-grouped-value-list">
                                {uniqueGroupValues(group.items, "harga").map((harga) => (
                                  <strong className="bahan-harga-value" key={harga}>
                                    {formatRupiah(harga)}
                                  </strong>
                                ))}
                              </div>
                            </td>
                            <td>
                              <div className="bahan-grouped-satuan-list">
                                {uniqueGroupValues(group.items, "satuan").map((satuan) => (
                                  <span className="bahan-status-badge bahan-status-satuan" key={satuan}>
                                    <FaTag /> {getSatuanLabel(satuan)}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <strong className="bahan-stok-value">{formatNumber(getGroupedStockTotal(group.items))}</strong>
                            </td>
                            <td>
                              <div className="bahan-image-item-list">
                                {group.items.map((item) => (
                                  <div className="bahan-image-item-row" key={item.id}>
                                    <strong>{formatNumber(item.stok_bahan)}</strong>
                                    <span title={item.warna_bahan || "-"}>{item.warna_bahan || "-"}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td>
                              <div className="bahan-image-item-list bahan-image-item-list-actions">
                                {group.items.map((item) => (
                                  <div className="bahan-image-action-row" key={item.id}>
                                    <span title={item.warna_bahan || item.nama_bahan || "-"}>{item.warna_bahan || item.nama_bahan || "-"}</span>
                                    <div className="bahan-actions">
                                      <button className="bahan-icon-btn edit" onClick={() => handleEditClick(item)} title="Edit">
                                        <FaEdit />
                                      </button>
                                      <button className="bahan-icon-btn info" onClick={() => handleDetailClick(item)} title="Detail">
                                        <FaEye />
                                      </button>
                                      <button className="bahan-icon-btn delete" onClick={() => handleDelete(item.id, item.nama_bahan)} title="Hapus">
                                        <FaTrash />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {bahanWithoutImage.length > 0 && <div className="bahan-table-split-label">Bahan tanpa gambar</div>}
                </div>
              )}

              {bahanWithoutImage.length > 0 && (
                <div className={`bahan-table-scroll ${groupedBahanImages.length > 0 ? "bahan-table-scroll-plain" : ""}`}>
                  <table className="bahan-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Group Bahan</th>
                        <th>Pabrik</th>
                        <th>Nama Bahan</th>
                        <th>Deskripsi</th>
                        <th>Harga</th>
                        <th>Satuan</th>
                        <th>Stok</th>
                        <th>Warna Bahan</th>
                        <th className="align-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bahanWithoutImage.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{getItemPageNumber(item)}</strong>
                          </td>
                          <td className="bahan-plain-cell" title={item.group_bahan || "-"}>
                            {item.group_bahan || "-"}
                          </td>
                          <td title={item.pabrik_bahan || "-"}>{item.pabrik_bahan || "-"}</td>
                          <td className="bahan-name-cell" title={item.nama_bahan || "-"}>
                            <strong>{item.nama_bahan}</strong>
                          </td>
                          <td title={item.deskripsi || "-"}>{item.deskripsi || "-"}</td>
                          <td>
                            <strong className="bahan-harga-value">{formatRupiah(item.harga)}</strong>
                          </td>
                          <td>
                            <span className="bahan-status-badge bahan-status-satuan">
                              <FaTag /> {getSatuanLabel(item.satuan)}
                            </span>
                          </td>
                          <td>
                            <strong className="bahan-stok-value">{formatNumber(item.stok_bahan)}</strong>
                          </td>
                          <td className="bahan-plain-cell bahan-color-cell" title={item.warna_bahan || "-"}>
                            {item.warna_bahan || "-"}
                          </td>
                          <td>
                            <div className="bahan-actions">
                              <button className="bahan-icon-btn edit" onClick={() => handleEditClick(item)} title="Edit">
                                <FaEdit />
                              </button>
                              <button className="bahan-icon-btn info" onClick={() => handleDetailClick(item)} title="Detail">
                                <FaEye />
                              </button>
                              <button className="bahan-icon-btn delete" onClick={() => handleDelete(item.id, item.nama_bahan)} title="Hapus">
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="bahan-pagination">
                  <button className="bahan-pagination-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                    Sebelumnya
                  </button>
                  <div className="bahan-pagination-info">
                    <span>
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <span className="bahan-pagination-total">(Total: {totalRows} data)</span>
                  </div>
                  <button className="bahan-pagination-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                    Selanjutnya
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {(showForm || showEditForm) && (
        <div className="bahan-modal-overlay" onClick={resetForm}>
          <div className="bahan-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="bahan-modal-header">
              <h2>{showEditForm ? "Edit Bahan" : "Tambah Bahan"}</h2>
              <button className="bahan-modal-close" onClick={resetForm} type="button">
                <FaTimes />
              </button>
            </div>
            <div className="bahan-modal-body">

            <form onSubmit={showEditForm ? handleFormUpdate : handleFormSubmit} className="bahan-modal-form">
                <div className="bahan-form-group">
                  <label>Group Bahan</label>
                  <input
                    type="text"
                    name="group_bahan"
                    value={showEditForm ? editItem.group_bahan : newItem.group_bahan}
                    onChange={handleInputChange}
                    placeholder="Contoh: Kain Utama"
                    className="bahan-form-input"
                  />
                </div>

                <div className="bahan-form-group">
                  <label>Pabrik Bahan</label>
                  <select
                    name="pabrik_bahan"
                    value={showEditForm ? editItem.pabrik_bahan : newItem.pabrik_bahan}
                    onChange={handleInputChange}
                    className="bahan-form-select"
                  >
                    {pabrikSelectOptions.map((pabrik) => (
                      <option key={pabrik} value={pabrik}>
                        {pabrik}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bahan-form-group">
                  <label>Nama Bahan</label>
                  <input
                    type="text"
                    name="nama_bahan"
                    value={showEditForm ? editItem.nama_bahan : newItem.nama_bahan}
                    onChange={handleInputChange}
                    required
                    placeholder="Contoh: Katun Combed"
                    className="bahan-form-input"
                  />
                </div>

              <div className="bahan-form-group">
                <label>Warna Bahan</label>
                <input
                  type="text"
                  name="warna_bahan"
                  value={showEditForm ? editItem.warna_bahan : newItem.warna_bahan}
                  onChange={handleInputChange}
                  placeholder="Contoh: Navy"
                  className="bahan-form-input"
                />
              </div>

              <div className="bahan-form-group">
                <label>Deskripsi</label>
                <textarea
                  name="deskripsi"
                  value={showEditForm ? editItem.deskripsi : newItem.deskripsi}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Tuliskan detail penggunaan atau karakter bahan"
                  className="bahan-form-input bahan-form-textarea"
                />
              </div>

                <div className="bahan-form-group">
                  <label>Harga (Rp)</label>
                  <div className="bahan-price-input-wrap">
                    <span className="bahan-price-prefix">Rp.</span>
                    <input
                      type="text"
                      name="harga"
                      value={showEditForm ? editItem.harga : newItem.harga}
                      onChange={handleInputChange}
                      required
                      placeholder="Contoh: 50.000"
                      className="bahan-form-input bahan-input-with-prefix"
                    />
                  </div>
                </div>

                <div className="bahan-form-group">
                  <label>Satuan</label>
                  <select
                    name="satuan"
                    value={showEditForm ? editItem.satuan : newItem.satuan}
                    onChange={handleInputChange}
                    required
                    className="bahan-form-select"
                  >
                    {SATUAN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bahan-form-group">
                  <label>Stok Bahan</label>
                  <input
                    type="text"
                    name="stok_bahan"
                    value={showEditForm ? editItem.stok_bahan : newItem.stok_bahan}
                    onChange={handleInputChange}
                    placeholder="Contoh: 10"
                    className="bahan-form-input"
                  />
                </div>

              <div className="bahan-form-actions">
                <button type="submit" className="bahan-btn-submit">
                  {showEditForm ? "Perbarui Data" : "Simpan Data"}
                </button>
                <button type="button" className="bahan-btn-cancel" onClick={resetForm}>
                  Batal
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className="bahan-modal-overlay" onClick={closeImageModal}>
          <div className="bahan-modal-content bahan-image-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bahan-modal-header">
              <h2>Tambah Gambar Bahan</h2>
              <button className="bahan-modal-close" onClick={closeImageModal} type="button" disabled={imageSubmitting}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleBahanImageSubmit}>
              <div className="bahan-modal-body">
                <div className="bahan-image-steps">
                  <button
                    type="button"
                    className={`bahan-image-step ${imageModalStep === 1 ? "active" : ""} ${imageFile ? "done" : ""}`}
                    onClick={() => setImageModalStep(1)}
                    disabled={imageSubmitting}
                  >
                    <span>{imageFile ? <FaCheck /> : "1"}</span>
                    Upload Gambar
                  </button>
                  <button
                    type="button"
                    className={`bahan-image-step ${imageModalStep === 2 ? "active" : ""} ${selectedImageBahanIds.length > 0 ? "done" : ""}`}
                    onClick={() => imageFile && setImageModalStep(2)}
                    disabled={!imageFile || imageSubmitting}
                  >
                    <span>{selectedImageBahanIds.length > 0 ? <FaCheck /> : "2"}</span>
                    Pilih Bahan
                  </button>
                </div>

                {imageModalStep === 1 ? (
                  <div className="bahan-image-upload-panel">
                    <label className={`bahan-image-dropzone ${imagePreview ? "has-preview" : ""}`}>
                      <input type="file" accept="image/*" onChange={handleBahanImageFileChange} disabled={imageSubmitting} />
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview gambar bahan" />
                      ) : (
                        <span className="bahan-image-dropzone-empty">
                          <FaUpload />
                          <strong>Upload gambar</strong>
                          <small>JPG, PNG, atau WEBP maksimal 2 MB</small>
                        </span>
                      )}
                    </label>
                    {imageFile && (
                      <div className="bahan-image-file-info">
                        <span>{imageFile.name}</span>
                        <strong>{(imageFile.size / 1024 / 1024).toFixed(2)} MB</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bahan-image-select-panel">
                    <div className="bahan-image-select-header">
                      <span>
                        Data bahan
                        {imageBahanTotal > 0 && (
                          <small>{imageBahanOptions.length} dari {imageBahanTotal}</small>
                        )}
                      </span>
                      <strong>{selectedImageBahanIds.length} dipilih</strong>
                    </div>
                    <div className="bahan-image-search-wrap">
                      <FaSearch />
                      <input
                        type="text"
                        value={imageBahanSearch}
                        onChange={(e) => setImageBahanSearch(e.target.value)}
                        placeholder="Cari nama bahan, group, pabrik, atau warna..."
                        disabled={imageSubmitting}
                      />
                      {imageBahanSearch && (
                        <button type="button" onClick={() => setImageBahanSearch("")} disabled={imageSubmitting} title="Hapus pencarian">
                          <FaTimes />
                        </button>
                      )}
                    </div>
                    <div className="bahan-image-select-list">
                      {imageBahanLoading ? (
                        <div className="bahan-image-list-state">
                          <div className="bahan-spinner"></div>
                          <span>Mencari data bahan...</span>
                        </div>
                      ) : imageBahanError ? (
                        <div className="bahan-image-list-state error">{imageBahanError}</div>
                      ) : imageBahanOptions.length === 0 ? (
                        <div className="bahan-image-list-state">
                          {debouncedImageBahanSearch ? "Bahan tidak ditemukan." : "Belum ada data bahan."}
                        </div>
                      ) : (
                        imageBahanOptions.map((item) => {
                          const selected = selectedImageBahanIds.includes(item.id);
                          const hasImage = Boolean(item.bahan_image_id || item.bahan_image || item.bahanImage);
                          return (
                            <label className={`bahan-image-option ${selected ? "selected" : ""}`} key={item.id}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleImageBahanSelection(item.id)}
                                disabled={imageSubmitting}
                              />
                              <span className="bahan-image-option-copy">
                                <strong>{item.nama_bahan || "-"}</strong>
                                <small>{item.group_bahan || "-"} | {item.pabrik_bahan || "-"} | {item.warna_bahan || "-"}</small>
                              </span>
                              {hasImage && <em>Sudah ada gambar</em>}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="bahan-image-modal-footer">
                {imageModalStep === 1 ? (
                  <>
                    <button type="button" className="bahan-btn-cancel" onClick={closeImageModal} disabled={imageSubmitting}>
                      Batal
                    </button>
                    <button
                      type="button"
                      className="bahan-btn-submit"
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
                    <button type="button" className="bahan-btn-secondary" onClick={() => setImageModalStep(1)} disabled={imageSubmitting}>
                      <FaArrowLeft /> Kembali
                    </button>
                    <button type="submit" className="bahan-btn-submit" disabled={imageSubmitting || selectedImageBahanIds.length === 0}>
                      {imageSubmitting ? "Menyimpan..." : "Simpan Gambar"}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && detailItem && (
        <div className="bahan-modal-overlay" onClick={closeDetailModal}>
          <div className="bahan-modal-content bahan-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bahan-modal-header">
              <h3>Detail Data Bahan</h3>
              <button className="bahan-modal-close" onClick={closeDetailModal} type="button">
                <FaTimes />
              </button>
            </div>
            <div className="bahan-detail-body">
              <div className="bahan-detail-top">
                <div className="bahan-detail-hero">
                  <div className="bahan-detail-icon">
                    <FaBoxOpen />
                  </div>
                  <div className="bahan-detail-name">{detailItem.nama_bahan || "-"}</div>
                  <div className="bahan-detail-badges">
                    <span className="bahan-badge bahan-badge-primary">{detailItem.group_bahan || "Tanpa Group"}</span>
                    <span className="bahan-badge bahan-badge-muted">{detailItem.pabrik_bahan || "Tanpa Pabrik"}</span>
                    <span className="bahan-badge bahan-badge-muted">{detailItem.warna_bahan || "Tanpa Warna"}</span>
                  </div>
                </div>
                <div className="bahan-detail-summary">
                  <div className="bahan-detail-summary-item">
                    <div className="label">ID Bahan</div>
                    <div className="value">#{detailItem.id}</div>
                  </div>
                  <div className="bahan-detail-summary-item">
                    <div className="label">Satuan</div>
                    <div className="value">{getSatuanLabel(detailItem.satuan)}</div>
                  </div>
                  <div className="bahan-detail-summary-item">
                    <div className="label">Stok Bahan</div>
                    <div className="value">{formatNumber(detailItem.stok_bahan)}</div>
                  </div>
                  <div className="bahan-detail-summary-item highlight">
                    <div className="label">Harga</div>
                    <div className="value big">{formatRupiah(detailItem.harga)}</div>
                  </div>
                </div>
              </div>
              <div className="bahan-detail-section">
                <h4>Deskripsi Bahan</h4>
                <div className="bahan-feedback-box">
                  <p>{detailItem.deskripsi || "Tidak ada deskripsi untuk bahan ini."}</p>
                </div>
              </div>
            </div>
            <div className="bahan-detail-footer">
              <button type="button" className="bahan-btn-close" onClick={closeDetailModal}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="bahan-modal-overlay" onClick={closePreviewImage}>
          <div className="bahan-modal-content bahan-image-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bahan-modal-header">
              <h3>{previewImage.title}</h3>
              <button className="bahan-modal-close" onClick={closePreviewImage} type="button">
                <FaTimes />
              </button>
            </div>
            <div className="bahan-image-preview-body">
              <img src={previewImage.url} alt={previewImage.title} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Bahan;

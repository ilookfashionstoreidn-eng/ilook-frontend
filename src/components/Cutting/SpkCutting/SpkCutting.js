import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Select from "react-select";

import "./SpkCutting.css";

import API from "../../../api";

import { FaPlus, FaInfoCircle, FaEdit, FaDownload, FaFileExcel, FaTrash, FaCheckCircle, FaTimesCircle, FaFileImage } from "react-icons/fa";
import { FiCalendar, FiCheckCircle, FiClock, FiFilter, FiMinus, FiScissors, FiSearch, FiTarget, FiX, FiTrash2 } from "react-icons/fi";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SWEETALERT_CDN = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js";

const STATUS_LABELS = {
  all: "Semua",
  belum_diambil: "Belum Diambil",
  sudah_diambil: "Sudah Diambil",
  selesai: "Selesai",
};

const ASUMSI_PRODUK_PER_ROLL = 60;

const normalizeApiList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const getBahanOptionLabel = (bahan) => {
  const bahanName = String(bahan.nama_bahan || "");
  const bahanNameKey = bahanName.trim().toLowerCase();
  const details = [bahan.group_bahan, bahan.pabrik_bahan, bahan.satuan].filter((detail) => {
    const normalizedDetail = String(detail || "").trim();
    return normalizedDetail && normalizedDetail !== "-" && normalizedDetail.toLowerCase() !== bahanNameKey;
  });

  return details.length ? `${bahan.nama_bahan} (${details.join(" - ")})` : bahan.nama_bahan;
};

const normalizeBahanText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const hasAvailableWarnaStock = (warnaData) =>
  Array.isArray(warnaData) &&
  warnaData.some((item) => {
    const warna = typeof item === "string" ? item : item?.warna;
    const stok = typeof item === "object" ? Number(item?.stok || 0) : 999;

    return warna && stok > 0;
  });

const calculateAssumptionFromBagian = (bagianList, estimasiCutting, estimasiCombi) => {
  const multiplierCutting = Number(estimasiCutting) > 0 ? Number(estimasiCutting) : ASUMSI_PRODUK_PER_ROLL;
  const multiplierCombi = Number(estimasiCombi) > 0 ? Number(estimasiCombi) : ASUMSI_PRODUK_PER_ROLL;

  const totalAsumsi = (bagianList || []).reduce((sum, bagian) => {
    const namaBagian = String(bagian?.nama_bagian || "").trim().toLowerCase();
    if (isAksesorisBagian(namaBagian)) return sum;

    const isCombi = namaBagian.includes("combi") || namaBagian.includes("kombinasi");
    const multiplier = isCombi ? multiplierCombi : multiplierCutting;

    const bahanTotalRoll = (bagian.bahan || []).reduce((total, bahan) => total + (parseFloat(bahan.qty) || 0), 0);
    return sum + (bahanTotalRoll * multiplier);
  }, 0);

  return Math.round(totalAsumsi);
};

const getProdukOptionLabel = (produk) => {
  const productGroup = String(produk.product_group || "").trim();
  if (productGroup) return productGroup;

  const product = String(produk.product || produk.nama_produk || "").trim();
  if (product) return product;

  return produk.nama_produk || "-";
};

const getProdukOptionValue = (produk) => {
  if (produk?.id) return String(produk.id);
  const product = String(produk?.product || produk?.nama_produk || "").trim();
  return product ? `product-list:${product}` : "";
};

const getSpkProductListId = (spk) => spk?.product_list_id || spk?.productList?.id || spk?.product_list?.id || spk?.produk_id || spk?.produk?.id || "";

const getSpkProductLabel = (spk) => {
  const productList = spk?.productList || spk?.product_list;
  return productList?.product_group || productList?.product || spk?.produk?.product_group || spk?.produk?.nama_produk || "-";
};

const getSpkSkuLabel = (spk) => {
  const productList = spk?.productList || spk?.product_list;
  return productList?.sku_name || spk?.sku?.sku_name || spk?.sku?.sku || "-";
};

const getSpkSizeLabel = (spk) => {
  const productList = spk?.productList || spk?.product_list;
  const skuSize = spk?.sku?.product_size || spk?.sku?.ukuran;
  return skuSize || productList?.product_size || spk?.produk?.product_size || spk?.ukuran || "-";
};

const calculateTotalRoll = (spk) => {
  let total = 0;
  if (Array.isArray(spk?.bagian)) {
    spk.bagian.forEach((bag) => {
      if (Array.isArray(bag.bahan)) {
        bag.bahan.forEach((bah) => {
          if (bah.sumber_komponen === "bahan") {
            total += parseFloat(bah.qty) || 0;
          }
        });
      }
    });
  }
  return total;
};

const getSpkWarnaBahan = (spk) => {
  const colors = [];
  if (Array.isArray(spk?.bagian)) {
    spk.bagian.forEach((bag) => {
      if (Array.isArray(bag.bahan)) {
        bag.bahan.forEach((bah) => {
          if (bah.sumber_komponen === "bahan" && bah.warna) {
            const trimmedColor = String(bah.warna).trim();
            if (trimmedColor && trimmedColor !== "-" && !colors.includes(trimmedColor)) {
              colors.push(trimmedColor);
            }
          }
        });
      }
    });
  }
  return colors.length > 0 ? colors.join(", ") : "-";
};

const getSpkWarnaDetail = (spk) => {
  const colorMap = {};
  const multiplierCutting = parseFloat(spk?.productList?.estimasi_cutting || 60);
  const multiplierCombi = parseFloat(spk?.productList?.estimasi_combi || 60);

  if (Array.isArray(spk?.bagian)) {
    spk.bagian.forEach((bag) => {
      const namaBagian = String(bag.nama_bagian || "").toLowerCase();
      if (namaBagian.includes('aksesor') || namaBagian.includes('accessor')) return;
      
      const isCombi = namaBagian.includes('combi') || namaBagian.includes('kombinasi');
      const multiplier = isCombi ? multiplierCombi : multiplierCutting;

      if (Array.isArray(bag.bahan)) {
        bag.bahan.forEach((bah) => {
          if (bah.sumber_komponen === "bahan" && bah.warna) {
            const trimmedColor = String(bah.warna).trim();
            if (trimmedColor && trimmedColor !== "-") {
              const totalRollQty = parseFloat(bah.qty) || 0;
              
              if (Array.isArray(bah.skus) && bah.skus.length > 0) {
                const sizesInBahan = Array.from(new Set(bah.skus.map(s => s.product_size || s.ukuran || "-")));
                const rollQtyPerSize = sizesInBahan.length > 0 ? totalRollQty / sizesInBahan.length : totalRollQty;
                
                sizesInBahan.forEach(sizeLabel => {
                  const key = `${trimmedColor}___${sizeLabel}`;
                  if (!colorMap[key]) {
                    colorMap[key] = { qty: 0, estimasi: 0, skus: [], warna: trimmedColor, size: sizeLabel };
                  }
                  colorMap[key].qty += rollQtyPerSize;
                  colorMap[key].estimasi += rollQtyPerSize * multiplier;
                  
                  const matchingSkus = bah.skus.filter(s => (s.product_size || s.ukuran || "-") === sizeLabel);
                  colorMap[key].skus.push(...matchingSkus);
                });
              } else {
                const sizeLabel = spk?.sku?.product_size || spk?.sku?.ukuran || spk?.productList?.product_size || spk?.produk?.product_size || spk?.ukuran || "-";
                const key = `${trimmedColor}___${sizeLabel}`;
                if (!colorMap[key]) {
                  colorMap[key] = { qty: 0, estimasi: 0, skus: [], warna: trimmedColor, size: sizeLabel };
                }
                colorMap[key].qty += totalRollQty;
                colorMap[key].estimasi += totalRollQty * multiplier;
              }
            }
          }
        });
      }
    });
  }
  return Object.values(colorMap).map(data => {
    const uniqueSkus = Array.from(
      new Map(
        data.skus
          .filter(s => s && (s.sku_name || s.sku || s.product_size || s.ukuran))
          .map(s => [s.sku_id || s.id || s.sku_name, s])
      ).values()
    );

    return {
      warna: data.warna,
      qty: data.qty,
      estimasi: Math.round(data.estimasi),
      totalJasa: Math.round(data.estimasi) * (parseFloat(spk.harga_per_pcs) || 0),
      skus: uniqueSkus,
      sizeLabel: data.size
    };
  });
};

const calculateTotalBiayaJasa = (hargaJasa, jumlahAsumsi, satuanHarga) => {
  const price = parseFloat(hargaJasa || 0);
  const qty = parseFloat(jumlahAsumsi || 0);
  if (!price || !qty) return 0;
  
  if (String(satuanHarga).toLowerCase() === "lusin") {
    return (price / 12) * qty;
  }
  return price * qty;
};

const getSkuLabel = (sku) => {
  const skuName = String(sku?.sku_name || sku?.sku || "").trim();
  const warna = String(sku?.product_colour || sku?.warna || "").trim();
  const ukuran = String(sku?.product_size || sku?.ukuran || "").trim();
  const details = [warna, ukuran].filter(Boolean).join(" - ");
  return details ? `${skuName || "SKU"} (${details})` : skuName || `SKU #${sku?.id || "-"}`;
};

const SKU_SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "ALL SIZE", "FREE SIZE"];

const normalizeSkuSizeLabel = (value) => {
  const normalized = String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase();

  if (!normalized) return "";
  if (["ALLSIZE", "ALL SIZE"].includes(normalized)) return "ALL SIZE";
  if (["FREESIZE", "FREE SIZE"].includes(normalized)) return "FREE SIZE";
  return normalized;
};

const extractSkuSizeFromText = (value) => {
  const text = String(value || "").toUpperCase();
  const knownSizes = ["XXXXL", "XXXL", "XXL", "XL", "XXS", "XS", "M", "L", "S"];
  const foundSize = knownSizes.find((size) => new RegExp(`(^|[^A-Z0-9])${size}([^A-Z0-9]|$)`).test(text));
  if (foundSize) return foundSize;

  if (/(^|[^A-Z0-9])ALL\s*SIZE([^A-Z0-9]|$)/.test(text)) return "ALL SIZE";
  if (/(^|[^A-Z0-9])FREE\s*SIZE([^A-Z0-9]|$)/.test(text)) return "FREE SIZE";

  return "";
};

const getSkuSizeGroup = (sku) => {
  const explicitSize = normalizeSkuSizeLabel(sku?.product_size || sku?.ukuran || sku?.size);
  if (explicitSize) return explicitSize;

  const inferredSize = extractSkuSizeFromText([sku?.sku_name, sku?.sku, sku?.nama_sku, sku?.product_name].filter(Boolean).join(" "));
  return inferredSize || "Tanpa Ukuran";
};

const getSkuSizeOrder = (size) => {
  const normalizedSize = normalizeSkuSizeLabel(size);
  const index = SKU_SIZE_ORDER.indexOf(normalizedSize);
  return index === -1 ? SKU_SIZE_ORDER.length : index;
};

const groupSkusBySize = (skus) => {
  const grouped = (skus || []).reduce((groups, sku) => {
    const size = getSkuSizeGroup(sku);
    if (!groups[size]) {
      groups[size] = [];
    }
    groups[size].push(sku);
    return groups;
  }, {});

  return Object.entries(grouped).sort(([sizeA], [sizeB]) => {
    const orderA = getSkuSizeOrder(sizeA);
    const orderB = getSkuSizeOrder(sizeB);

    if (orderA !== orderB) return orderA - orderB;
    return sizeA.localeCompare(sizeB);
  });
};

const normalizeMaterialText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeMaterialKey = (value) => normalizeMaterialText(value).toLowerCase();

const getAutoBagianName = (_material, index) => {
  return index === 0 ? "Bahan Utama" : "Combinasi";
};

const NAMA_BAGIAN_OPTIONS = ["Bahan Utama", "Combinasi", "Aksesoris"];

const isAksesorisBagian = (namaBagian) => {
  const value = String(namaBagian || "").trim().toLowerCase();
  return value.includes("aksesor") || value.includes("accessor");
};

const makeKomponenPayload = (bagian, item) => {
  const isAksesoris = isAksesorisBagian(bagian?.nama_bagian);

  return {
    sumber_komponen: isAksesoris ? "aksesoris" : "bahan",
    bahan_id: isAksesoris ? null : parseInt(item.bahan_id, 10),
    aksesoris_id: isAksesoris ? parseInt(item.aksesoris_id, 10) : null,
    warna: isAksesoris ? null : item.warna || null,
    qty: parseFloat(item.qty || 0),
    skus: item.skus || [],
  };
};

const SpkCutting = () => {
  const [searchParams] = useSearchParams();
  
  const [spkCutting, setSpkCutting] = useState([]);

  const [error, setError] = useState(null);

  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [showEditForm, setShowEditForm] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  // Baca statusFilter dari URL atau default "all"
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  
  // Baca jenis_spk dari URL
  const [jenisSpkFilter, setJenisSpkFilter] = useState(searchParams.get("jenis_spk") || "");

  // Filter periode untuk card In Progress (juga digunakan untuk filter tabel)
  const [weeklyStart, setWeeklyStart] = useState("");
  const [weeklyEnd, setWeeklyEnd] = useState("");
  const [dailyDate, setDailyDate] = useState("");

  const [summary, setSummary] = useState({
    all: 0,

    belum_diambil: {
      count: 0,
      total_asumsi_produk: 0,
    },

    sudah_diambil: 0,
    selesai: 0,
    in_progress_weekly: {
      count: 0,
      total_asumsi_produk: 0,
      target: 50000,
      remaining: 50000,
    },
    in_progress_daily: {
      count: 0,
      total_asumsi_produk: 0,
      target: 7143,
      remaining: 7143,
    },
  });

  const [produkList, setProdukList] = useState([]);

  const [tukangList, setTukangList] = useState([]);

  const [tukangPolaList, setTukangPolaList] = useState([]);

  const [bahanList, setBahanList] = useState([]);
  const [aksesorisList, setAksesorisList] = useState([]);

  const [selectedDetailSpk, setSelectedDetailSpk] = useState(null);
  const [downloadingSpkId, setDownloadingSpkId] = useState(null);

  const [skuModalConfig, setSkuModalConfig] = useState({
    isOpen: false,
    type: "", // 'create' or 'edit'
    bagianIndex: null,
    bahanIndex: null,
    selectedIds: []
  });

  const openSkuModal = (type, bagianIndex, bahanIndex) => {
    let currentSkus = [];
    if (type === "create") {
      const bahanItem = newSpkCutting.bagian?.[bagianIndex]?.bahan?.[bahanIndex];
      currentSkus = bahanItem?.skus || [];
    } else if (type === "edit") {
      const bahanItem = editSpkCutting.bagian?.[bagianIndex]?.bahan?.[bahanIndex];
      currentSkus = bahanItem?.skus || [];
    }
    
    setSkuModalConfig({
      isOpen: true,
      type,
      bagianIndex,
      bahanIndex,
      selectedIds: currentSkus.map(s => s && typeof s === 'object' ? (s.sku_id || s.id)?.toString() : (typeof s === 'string' || typeof s === 'number' ? s.toString() : null)).filter(Boolean)
    });
  };

  const closeSkuModal = () => {
    setSkuModalConfig({
      isOpen: false,
      type: "",
      bagianIndex: null,
      bahanIndex: null,
      selectedIds: []
    });
  };

  const handleSaveSkus = (selectedSkus) => {
    const { type, bagianIndex, bahanIndex } = skuModalConfig;
    
    if (type === "create") {
      const newBagian = [...(newSpkCutting.bagian || [])];
      if (newBagian[bagianIndex] && newBagian[bagianIndex].bahan && newBagian[bagianIndex].bahan[bahanIndex]) {
        const oldSkus = newBagian[bagianIndex].bahan[bahanIndex].skus || [];
        const newSkusObjects = selectedSkus.map(id => {
          const existing = oldSkus.find(s => s && typeof s === 'object' ? (s.sku_id?.toString() === id.toString() || s.id?.toString() === id.toString()) : s?.toString() === id.toString());
          return existing && typeof existing === 'object' ? { ...existing, qty: 0 } : { sku_id: id, qty: 0 };
        });
        newBagian[bagianIndex].bahan[bahanIndex].skus = newSkusObjects;
        setNewSpkCutting({ ...newSpkCutting, bagian: newBagian });
      }
    } else if (type === "edit") {
      const editBagian = [...(editSpkCutting.bagian || [])];
      if (editBagian[bagianIndex] && editBagian[bagianIndex].bahan && editBagian[bagianIndex].bahan[bahanIndex]) {
        const oldSkus = editBagian[bagianIndex].bahan[bahanIndex].skus || [];
        const newSkusObjects = selectedSkus.map(id => {
          const existing = oldSkus.find(s => s && typeof s === 'object' ? (s.sku_id?.toString() === id.toString() || s.id?.toString() === id.toString()) : s?.toString() === id.toString());
          return existing && typeof existing === 'object' ? { ...existing, qty: 0 } : { sku_id: id, qty: 0 };
        });
        editBagian[bagianIndex].bahan[bahanIndex].skus = newSkusObjects;
        setEditSpkCutting({ ...editSpkCutting, bagian: editBagian });
      }
    }
    closeSkuModal();
  };

  // ✅ OPTIMASI: Server-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: 0,
    from: 0,
    to: 0,
  });

  // State untuk SKU
  const [skuList, setSkuList] = useState([]);
  const [selectedSkuIds, setSelectedSkuIds] = useState([]);
  const [editSelectedSkuIds, setEditSelectedSkuIds] = useState([]);

  const bahanOptions = useMemo(
    () => {
      const seenLabels = new Set();

      return bahanList.reduce((options, bahan) => {
        const label = getBahanOptionLabel(bahan);
        const labelKey = normalizeBahanText(label);

        if (seenLabels.has(labelKey)) {
          return options;
        }

        seenLabels.add(labelKey);
        options.push({
          value: String(bahan.id),
          label,
        });

        return options;
      }, []);
    },
    [bahanList]
  );

  const aksesorisOptions = useMemo(
    () =>
      aksesorisList.map((aksesoris) => ({
        value: String(aksesoris.id),
        label: aksesoris.satuan ? `${aksesoris.nama_aksesoris} (${aksesoris.satuan})` : aksesoris.nama_aksesoris,
      })),
    [aksesorisList]
  );

  const produkOptions = useMemo(
    () =>
      produkList
        .map((produk) => ({
          value: getProdukOptionValue(produk),
          label: getProdukOptionLabel(produk),
        }))
        .filter((option) => option.value),
    [produkList]
  );

  const bahanSelectPortalTarget = typeof document !== "undefined" ? document.body : null;

  const ensureSweetAlert = () =>
    new Promise((resolve, reject) => {
      if (window.Swal) {
        resolve(window.Swal);
        return;
      }

      const existingScript = document.querySelector('script[data-sweetalert2="cdn"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.Swal), { once: true });
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = SWEETALERT_CDN;
      script.async = true;
      script.setAttribute("data-sweetalert2", "cdn");
      script.onload = () => resolve(window.Swal);
      script.onerror = reject;
      document.body.appendChild(script);
    });

  const showStatusAlert = async (icon, title, text) => {
    try {
      const Swal = await ensureSweetAlert();
      if (!Swal) throw new Error("SweetAlert2 tidak tersedia");

      await Swal.fire({
        icon: icon || "info",
        title: title || "Informasi",
        text: text || "",
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          popup: "spk-swal-popup",
          confirmButton: "spk-swal-btn spk-swal-btn-primary",
        },
      });
      return true;
    } catch (alertError) {
      console.error("Gagal menampilkan SweetAlert:", alertError);
      window.alert(text || title || "Terjadi kesalahan");
      return false;
    }
  };

  const showConfirmAlert = async ({ title, text, confirmText, icon = "question" }) => {
    try {
      const Swal = await ensureSweetAlert();
      if (!Swal) throw new Error("SweetAlert2 tidak tersedia");

      const result = await Swal.fire({
        icon,
        title: title || "Konfirmasi",
        text: text || "Lanjutkan aksi ini?",
        showCancelButton: true,
        confirmButtonText: confirmText || "Ya, Lanjutkan",
        cancelButtonText: "Batal",
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
          popup: "spk-swal-popup",
          confirmButton: "spk-swal-btn spk-swal-btn-danger",
          cancelButton: "spk-swal-btn spk-swal-btn-cancel",
        },
      });

      return !!result.isConfirmed;
    } catch (alertError) {
      console.error("Gagal menampilkan konfirmasi SweetAlert:", alertError);
      return window.confirm(text || title || "Lanjutkan aksi ini?");
    }
  };

  // Fungsi untuk fetch nomor seri SPK dari backend berdasarkan tukang cutting

  const fetchSpkNumber = async (tukangCuttingId = null) => {
    try {
      const payload = {};
      if (tukangCuttingId) {
        payload.tukang_cutting_id = tukangCuttingId;
      }
      const response = await API.post("/spk_cutting/generate-number", payload);
      setNewSpkCutting(prev => ({ ...prev, id_spk_cutting: response.data.id_spk_cutting || response.data.generated_number || "" }));
    } catch (error) {
      console.error("Gagal generate nomor seri:", error);
    }
  };

  const [newSpkCutting, setNewSpkCutting] = useState({
    id_spk_cutting: "",
    pic: "",
    produk_id: "",
    tanggal_buat: (() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'); })(),
    tanggal_batas_kirim: "",
    harga_jasa: "",
    harga_jasaDisplay: "", // Untuk format rupiah di input
    satuan_harga: "Pcs",
    jumlah_asumsi_produk: "",
    jumlah_asumsi_produkDisplay: "", // Untuk format ribuan di input
    jenis_spk: "",
    keterangan: "",
    tukang_cutting_id: "",
    tukang_pola_id: "",
    bagian: [],
  });

  const [editSpkCutting, setEditSpkCutting] = useState({
    id: null,
    id_spk_cutting: "",
    pic: "",
    produk_id: "",
    tanggal_buat: "",
    tanggal_batas_kirim: "",
    harga_jasa: "",
    satuan_harga: "Pcs",
    jumlah_asumsi_produk: "",
    jenis_spk: "",
    keterangan: "",
    tukang_cutting_id: "",
    tukang_pola_id: "",
    bagian: [],
  });

  // Ref untuk search term agar tidak memicu re-creation fetchSpkCutting
  const searchTermRef = React.useRef(searchTerm);
  
  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);

  // ✅ OPTIMASI: Server-side pagination dengan search (Stabil dengan useRef)
  const fetchSpkCutting = useCallback(async (page = 1) => {
    try {
      setLoading(true);

      const params = {
        page,
        per_page: 50,
      };

      // Gunakan nilai dari ref
      if (searchTermRef.current) {
        params.search = searchTermRef.current;
      }

      if (statusFilter && statusFilter !== "all") {
        params.status = statusFilter;
      }

      // Tambahkan filter jenis_spk jika ada
      if (jenisSpkFilter) {
        params.jenis_spk = jenisSpkFilter;
      }

      // Gunakan filter tanggal dari card progress untuk filter tabel
      // Prioritas: jika dailyDate ada, gunakan dailyDate; jika tidak, gunakan weeklyStart/weeklyEnd
      if (dailyDate) {
        // Filter tabel berdasarkan dailyDate
        params.start_date = dailyDate;
        params.end_date = dailyDate;
        params.daily_date = dailyDate;
      } else if (weeklyStart && weeklyEnd) {
        // Filter tabel berdasarkan weeklyStart dan weeklyEnd
        params.start_date = weeklyStart;
        params.end_date = weeklyEnd;
        params.weekly_start = weeklyStart;
        params.weekly_end = weeklyEnd;
      }
      // Jika tidak ada filter tanggal yang dipilih, tabel menampilkan semua data (tidak ada start_date/end_date)

      // Tambahkan parameter status filter untuk grafik
      if (statusFilter && statusFilter !== "all") {
        params.progress_status = statusFilter;
      } else {
        params.progress_status = "all"; // Tampilkan semua di grafik jika filter "Semua"
      }

      const response = await API.get("/spk_cutting", { params });

      // ✅ DEBUG: Log response untuk troubleshooting
      console.log("API Response:", {
        hasData: !!response.data.data,
        dataLength: response.data.data?.length || 0,
        hasPagination: !!response.data.pagination,
        pagination: response.data.pagination,
        hasSummary: !!response.data.summary,
        fullResponse: response.data
      });

      // ✅ OPTIMASI: Data sudah di-sort dan di-paginate di backend
      const data = response.data.data || [];

      if (!Array.isArray(data)) {
        console.error("Data is not an array:", data);
        setError("Format data tidak valid dari server");
        setSpkCutting([]);
        return;
      }

      setSpkCutting(data);

      // ✅ OPTIMASI: Set pagination info dari backend dengan fallback
      if (response.data.pagination) {
        const paginationData = {
          current_page: parseInt(response.data.pagination.current_page) || 1,
          last_page: parseInt(response.data.pagination.last_page) || 1,
          per_page: parseInt(response.data.pagination.per_page) || 50, // ✅ Fix: Convert to number
          total: parseInt(response.data.pagination.total) || 0,
          from: parseInt(response.data.pagination.from) || 0,
          to: parseInt(response.data.pagination.to) || 0,
        };
        console.log("Setting pagination:", paginationData);
        setPagination(paginationData);
        setCurrentPage(parseInt(response.data.pagination.current_page) || 1);
      } else {
        // Fallback jika pagination tidak ada di response
        console.warn("Pagination tidak ada di response, menggunakan fallback");
        setPagination(prev => ({
          ...prev,
          total: data.length,
          from: data.length > 0 ? 1 : 0,
          to: data.length,
          last_page: 1,
        }));
      }

      // Set summary jika ada
      if (response.data.summary) {
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error("Error fetching SPK Cutting:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        fullError: error
      });
      setError(error.response?.data?.message || "Gagal mengambil data");
      setSpkCutting([]);
      setPagination({
        current_page: 1,
        last_page: 1,
        per_page: 50,
        total: 0,
        from: 0,
        to: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, jenisSpkFilter, weeklyStart, weeklyEnd, dailyDate]);

  // Update statusFilter dan jenisSpkFilter dari URL saat component mount atau URL berubah
  useEffect(() => {
    const statusFromUrl = searchParams.get("status");
    const jenisSpkFromUrl = searchParams.get("jenis_spk");
    
    if (statusFromUrl) {
      setStatusFilter(statusFromUrl);
    }
    if (jenisSpkFromUrl) {
      setJenisSpkFilter(jenisSpkFromUrl);
    }
  }, [searchParams]);

  // ✅ OPTIMASI: Initial load saat component mount
  useEffect(() => {
    fetchSpkCutting(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Hanya sekali saat mount

  useEffect(() => {
    if (showForm) {
      fetchSpkNumber();
    }
  }, [showForm]);

  useEffect(() => {
    const fetchProduk = async () => {
      try {
        setLoading(true);

        const response = await API.get("/product-list/spk-options");

        setProdukList(normalizeApiList(response.data));
      } catch (error) {
        setError("Gagal mengambil data produk.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduk();
  }, []);

  useEffect(() => {
    const fetchTukang = async () => {
      try {
        setLoading(true);

        const response = await API.get("/tukang_cutting");

        setTukangList(response.data);
      } catch (error) {
        setError("Gagal mengambil data tukang cutting.");
      } finally {
        setLoading(false);
      }
    };

    fetchTukang();
  }, []);

  useEffect(() => {
    const fetchTukangPola = async () => {
      try {
        setLoading(true);
        const response = await API.get("/tukang_pola");
        setTukangPolaList(response.data);
      } catch (error) {
        setError("Gagal mengambil data tukang pola.");
      } finally {
        setLoading(false);
      }
    };
    fetchTukangPola();
  }, []);

  useEffect(() => {
    const fetchBahan = async () => {
      try {
        setLoading(true);

        const response = await API.get("/bahan", {
          params: { all: 1 },
        });

        setBahanList(normalizeApiList(response.data));
      } catch (error) {
        setError("Gagal mengambil data bahan.");
      } finally {
        setLoading(false);
      }
    };

    fetchBahan();
  }, []);

  useEffect(() => {
    const fetchAksesoris = async () => {
      try {
        setLoading(true);

        const response = await API.get("/aksesoris", {
          params: { all: 1 },
        });

        setAksesorisList(normalizeApiList(response.data));
      } catch (error) {
        setError("Gagal mengambil data aksesoris.");
      } finally {
        setLoading(false);
      }
    };

    fetchAksesoris();
  }, []);

  // Fungsi untuk fetch SKU berdasarkan produk yang dipilih
  const fetchSkuByProduk = async (produkId) => {
    if (!produkId) {
      setSkuList([]);
      return;
    }

    const selectedProduk = getSelectedProduk(produkId);
    setSkuList(Array.isArray(selectedProduk?.skus) ? selectedProduk.skus : []);
  };

  // Fungsi untuk fetch warna berdasarkan bahan_id

  const fetchWarnaByBahan = async (bahanId) => {
    if (!bahanId) {
      return [];
    }

    try {
      const response = await API.get("/stok-bahan/warna-dengan-stok", {
        params: { bahan_id: bahanId },
      });

      return response.data || [];
    } catch (error) {
      console.error("Gagal mengambil data warna:", error);

      // Fallback ke list warna default jika API error
      return [
        { warna: "Putih", stok: 0 },
        { warna: "Hitam", stok: 0 },
        { warna: "Merah", stok: 0 },
        { warna: "Biru", stok: 0 },
        { warna: "Hijau", stok: 0 },
        { warna: "Kuning", stok: 0 },
        { warna: "Abu-abu", stok: 0 },
        { warna: "Coklat", stok: 0 },
        { warna: "Pink", stok: 0 },
        { warna: "Ungu", stok: 0 },
        { warna: "Orange", stok: 0 },
        { warna: "Navy", stok: 0 },
        { warna: "Maroon", stok: 0 },
        { warna: "Beige", stok: 0 },
        { warna: "Khaki", stok: 0 },
      ];
    }
  };

  const resolveBahanSelectionWithWarna = async (bahanId) => {
    const selectedBahanId = String(bahanId || "");
    const warnaData = await fetchWarnaByBahan(selectedBahanId);
    return { bahanId: selectedBahanId, warnaData };
  };

  // ✅ OPTIMASI: Reset ke page 1 saat filter berubah, lalu fetch data
  useEffect(() => {
    // Abaikan jika component baru mount karena ada effect lain yang handle ini
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchSpkCutting(1);
    }
  }, [statusFilter, jenisSpkFilter, weeklyStart, weeklyEnd, dailyDate, fetchSpkCutting]);

  // ✅ OPTIMASI: Debounce search yang BENAR
  useEffect(() => {
    const timer = setTimeout(() => {
      // Hanya ganti ke halaman 1 jika belum di halaman 1
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        // Jika sudah halaman 1, fetch manual
        fetchSpkCutting(1);
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [searchTerm]); // HANYA dijalankan saat searchTerm berubah

  // ✅ OPTIMASI: Fetch data saat page berubah
  useEffect(() => {
    fetchSpkCutting(currentPage);
  }, [currentPage, fetchSpkCutting]);

  // ✅ OPTIMASI: Hapus client-side filtering - sekarang di backend
  // Data sudah di-filter dan di-paginate di backend
  const currentItems = spkCutting;

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.last_page) {
      setCurrentPage(page);
    }
  };

  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return "-";

    return new Intl.NumberFormat("id-ID", {
      style: "currency",

      currency: "IDR",

      minimumFractionDigits: 0,
    }).format(angka);
  };

  // Helper function untuk format rupiah untuk input (tanpa Rp, hanya angka dengan titik)
  const formatRupiahInput = (value) => {
    // Hapus semua karakter non-numeric
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";
    // Format dengan titik sebagai pemisah ribuan
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Helper function untuk parse rupiah ke angka
  const parseRupiah = (value) => {
    return value.replace(/\D/g, "");
  };

  // Helper function untuk format ribuan (tanpa titik, hanya angka dengan titik)
  const formatRibuan = (value) => {
    // Hapus semua karakter non-numeric
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";
    // Format dengan titik sebagai pemisah ribuan
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Helper function untuk parse ribuan ke angka
  const parseRibuan = (value) => {
    return value.replace(/\D/g, "");
  };

  const getAssumptionFieldsForProduct = (bagianList, selectedProduk) => {
    const estimasiCutting = selectedProduk?.estimasi_cutting;
    const estimasiCombi = selectedProduk?.estimasi_combi;

    const jumlahAsumsi = calculateAssumptionFromBagian(bagianList, estimasiCutting, estimasiCombi);

    return {
      jumlah_asumsi_produk: jumlahAsumsi > 0 ? jumlahAsumsi.toString() : "",
      jumlah_asumsi_produkDisplay: jumlahAsumsi > 0 ? formatRibuan(jumlahAsumsi.toString()) : "",
    };
  };

  const getAssumptionFields = (bagianList) => {
    const isEdit = showEditForm;
    const produkId = isEdit ? editSpkCutting.produk_id : newSpkCutting.produk_id;
    const selectedProduk = getSelectedProduk(produkId);
    return getAssumptionFieldsForProduct(bagianList, selectedProduk);
  };

  const getSelectedProduk = (produkId) => produkList.find((produk) => getProdukOptionValue(produk) === String(produkId));

  const getSelectedProdukOption = (produkId) => produkOptions.find((option) => option.value === String(produkId)) || null;

  const makeInputEvent = (name, value) => ({
    target: {
      name,
      value: value || "",
    },
  });

  const isBahanMatchMaterial = (bahan, material) => {
    const materialKey = normalizeMaterialKey(material);
    if (!materialKey) return false;

    const candidates = [bahan?.group_bahan, bahan?.nama_bahan, bahan?.deskripsi].map(normalizeMaterialKey).filter(Boolean);
    return candidates.some((candidate) => candidate === materialKey || candidate.includes(materialKey) || materialKey.includes(candidate));
  };

  const getBahanByMaterialGroup = (materialGroup, materialName = "") => {
    const groupMatches = bahanList.filter((bahan) => isBahanMatchMaterial(bahan, materialGroup));
    if (groupMatches.length > 0) return groupMatches;

    return bahanList.filter((bahan) => isBahanMatchMaterial(bahan, materialName));
  };

  const resolveAutoBahanId = (material) => {
    const materialGroupKey = normalizeMaterialKey(material?.material_group);
    const materialNameKey = normalizeMaterialKey(material?.material);
    const candidates = getBahanByMaterialGroup(material?.material_group, material?.material);

    if (candidates.length === 1) {
      return String(candidates[0].id);
    }

    const matchingBahan = candidates.find((bahan) => {
      const groupKey = normalizeMaterialKey(bahan.group_bahan);
      const nameKey = normalizeMaterialKey(bahan.nama_bahan);
      return (materialGroupKey && groupKey === materialGroupKey) || (materialNameKey && nameKey === materialNameKey);
    });

    return matchingBahan ? String(matchingBahan.id) : "";
  };

  const fetchProductGroupCatalog = async (produk) => {
    if (!produk) {
      return null;
    }

    const komponen = Array.isArray(produk?.komponen) ? produk.komponen : [];
    const materials = komponen
      .filter((item) => item?.sumber_komponen === "bahan")
      .map((item) => ({
        material: item?.bahan?.nama_bahan || "",
        material_group: item?.bahan?.group_bahan || item?.jenis_komponen || "",
      }));

    return {
      product: produk?.product || produk?.nama_produk || "",
      product_group: produk?.product_group || produk?.kategori_produk || "",
      price_cutting: produk?.price_cutting || produk?.harga_jasa_cutting || 0,
      notes_spk: "",
      materials,
      sku_items: Array.isArray(produk?.skus) ? produk.skus : [],
    };
  };

  const buildProductAutoFields = async (produkId) => {
    const selectedProduk = getSelectedProduk(produkId);
    const catalog = await fetchProductGroupCatalog(selectedProduk);
    const catalogHargaJasa = Number(catalog?.price_cutting || 0);
    const hargaJasa = catalogHargaJasa;
    const hargaJasaString = hargaJasa !== null && hargaJasa !== undefined && hargaJasa !== "" ? String(Math.round(Number(hargaJasa) || 0)) : "";

    const catalogMaterials = Array.isArray(catalog?.materials) ? catalog.materials : [];
    const bagian = await Promise.all(
      catalogMaterials
        .filter((material) => normalizeMaterialText(material?.material) || normalizeMaterialText(material?.material_group))
        .map(async (material, index) => {
          const bahanId = resolveAutoBahanId(material);
          const warnaList = bahanId ? await fetchWarnaByBahan(bahanId) : [];

          return {
            nama_bagian: getAutoBagianName(material, index),
            material_group: normalizeMaterialText(material?.material_group),
            is_auto_bagian: true,
            bahan: [
              {
                bahan_id: bahanId,
                material_group: normalizeMaterialText(material?.material_group),
                warna: "",
                warna_custom: "",
                qty: "",
                warnaList,
              },
            ],
          };
        })
    );

    const autoBagianFields = bagian.length ? { bagian, ...getAssumptionFieldsForProduct(bagian, selectedProduk) } : {};

    return {
      produk_id: produkId,
      harga_jasa: hargaJasaString,
      harga_jasaDisplay: hargaJasaString ? formatRupiahInput(hargaJasaString) : "",
      satuan_harga: "Lusin",
      keterangan: catalog?.notes_spk || "",
      ...autoBagianFields,
    };
  };

  // Handler untuk reset filter tanggal mingguan
  const handleResetWeekly = () => {
    setWeeklyStart("");
    setWeeklyEnd("");
  };

  // Handler untuk reset filter tanggal harian
  const handleResetDaily = () => {
    setDailyDate("");
  };

  // Handler untuk perubahan filter tanggal mingguan
  const handleWeeklyStartChange = (e) => {
    const newValue = e.target.value;
    if (newValue && dailyDate) {
      void showStatusAlert("warning", "Filter Periode Tidak Valid", "Anda hanya bisa memilih salah satu filter: Mingguan atau Harian. Silakan reset filter harian terlebih dahulu.");
      return;
    }
    setWeeklyStart(newValue);
  };

  const handleWeeklyEndChange = (e) => {
    const newValue = e.target.value;
    if (newValue && dailyDate) {
      void showStatusAlert("warning", "Filter Periode Tidak Valid", "Anda hanya bisa memilih salah satu filter: Mingguan atau Harian. Silakan reset filter harian terlebih dahulu.");
      return;
    }
    setWeeklyEnd(newValue);
  };

  // Handler untuk perubahan filter tanggal harian
  const handleDailyDateChange = (e) => {
    const newValue = e.target.value;
    if (newValue && (weeklyStart || weeklyEnd)) {
      void showStatusAlert("warning", "Filter Periode Tidak Valid", "Anda hanya bisa memilih salah satu filter: Mingguan atau Harian. Silakan reset filter mingguan terlebih dahulu.");
      return;
    }
    setDailyDate(newValue);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Validasi nomor seri SPK harus ada (akan di-generate otomatis oleh backend jika kosong)

    if (!newSpkCutting.tukang_cutting_id) {
      await showStatusAlert("warning", "Validasi Data", "Pilih tukang cutting terlebih dahulu!");

      return;
    }

    if (!newSpkCutting.produk_id) {
      await showStatusAlert("warning", "Validasi Data", "Pilih Product terlebih dahulu!");
      return;
    }

    if (!newSpkCutting.tanggal_batas_kirim) {
      await showStatusAlert("warning", "Validasi Data", "Pilih tanggal batas kirim terlebih dahulu!");
      return;
    }

    // Global SKU validation removed. SKU is now validated per-bahan.

    // Validasi frontend sebelum submit

    if (!newSpkCutting.bagian || newSpkCutting.bagian.length === 0) {
      await showStatusAlert("warning", "Validasi Data", "Minimal harus ada 1 bagian!");

      return;
    }

    // Validasi setiap bagian dan bahan

    for (let i = 0; i < newSpkCutting.bagian.length; i++) {
      const bagian = newSpkCutting.bagian[i];

      if (!bagian.nama_bagian || bagian.nama_bagian.trim() === "") {
        await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}: Nama bagian harus diisi!`);

        return;
      }

      if (!bagian.bahan || bagian.bahan.length === 0) {
        await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}: Minimal harus ada 1 bahan!`);

        return;
      }

      for (let j = 0; j < bagian.bahan.length; j++) {
        const bahan = bagian.bahan[j];
        const isAksesoris = isAksesorisBagian(bagian.nama_bagian);

        if (isAksesoris && (!bahan.aksesoris_id || bahan.aksesoris_id === "")) {
          await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}, Aksesoris ${j + 1}: Pilih aksesoris terlebih dahulu!`);

          return;
        }

        if (!isAksesoris && (!bahan.bahan_id || bahan.bahan_id === "")) {
          await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}, Bahan ${j + 1}: Pilih bahan terlebih dahulu!`);

          return;
        }



        if (!bahan.qty || bahan.qty <= 0) {
          await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}, Bahan ${j + 1}: Qty harus lebih dari 0!`);

          return;
        }

        if (!isAksesoris && (!bahan.skus || bahan.skus.length === 0)) {
          await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}, Bahan ${j + 1}: Pilih alokasi SKU produk terlebih dahulu!`);
          return;
        }

        if (!isAksesoris && (!bahan.skus || bahan.skus.length === 0)) {
          await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}, Bahan ${j + 1}: Pilih alokasi SKU produk terlebih dahulu!`);
          return;
        }
      }
    }

    // Konversi bahan_id menjadi integer

    // Sertakan id_spk_cutting dari input manual
    const dataToSend = {
      ...newSpkCutting,
      product_list_id: parseInt(newSpkCutting.produk_id, 10),
      produk_id: null,
      harga_jasa: newSpkCutting.harga_jasa ? parseFloat(newSpkCutting.harga_jasa) : null,
      jumlah_asumsi_produk: newSpkCutting.jumlah_asumsi_produk ? parseInt(newSpkCutting.jumlah_asumsi_produk, 10) : null,
      jenis_spk: newSpkCutting.jenis_spk || null,
      tukang_pola_id: newSpkCutting.tukang_pola_id ? parseInt(newSpkCutting.tukang_pola_id) : null,
      produk_sku_ids: selectedSkuIds.map((id) => parseInt(id, 10)),
      bagian: newSpkCutting.bagian.map((bagian) => ({
        ...bagian,

        bahan: bagian.bahan.map((bahan) => makeKomponenPayload(bagian, bahan)),
      })),
    };

    console.log("Data SPK Cutting yang dikirim:", dataToSend);

    try {
      const response = await API.post("/spk_cutting", dataToSend);

      console.log("Response:", response.data);

      await showStatusAlert("success", "Berhasil", "SPK Cutting berhasil ditambahkan!");

      // Refresh data dan summary

      await fetchSpkCutting();

      // Reset form

      setNewSpkCutting({
        id_spk_cutting: "",
        pic: "",
        produk_id: "",
        tanggal_buat: (() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'); })(),
        tanggal_batas_kirim: "",
        harga_jasa: "",
        harga_jasaDisplay: "",
        satuan_harga: "Pcs",
        jumlah_asumsi_produk: "",
        jumlah_asumsi_produkDisplay: "",
        jenis_spk: "",
        keterangan: "",
        tukang_cutting_id: "",
        tukang_pola_id: "",
        bagian: [],
      });

      setSelectedSkuIds([]);
      setSkuList([]);
      setShowForm(false);
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);

      // Tampilkan error detail dari backend

      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;

        const errorMessages = Object.keys(errors)

          .map((key) => {
            return `${key}: ${errors[key].join(", ")}`;
          })

          .join("\n");

        await showStatusAlert("error", "Validasi Gagal", errorMessages);
      } else {
        await showStatusAlert("error", "Simpan Data Gagal", error.response?.data?.message || "Terjadi kesalahan saat menyimpan SPK Cutting.");
      }
    }
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;

    // Handle format untuk harga_jasa
    if (name === "harga_jasa") {
      const formatted = formatRupiahInput(value);
      const numeric = parseRupiah(value);
      setNewSpkCutting((prev) => ({
        ...prev,
        harga_jasa: numeric,
        harga_jasaDisplay: formatted,
      }));
      return;
    }

    // Handle format untuk jumlah_asumsi_produk
    if (name === "jumlah_asumsi_produk") {
      const formatted = formatRibuan(value);
      const numeric = parseRibuan(value);
      setNewSpkCutting((prev) => ({
        ...prev,
        jumlah_asumsi_produk: numeric,
        jumlah_asumsi_produkDisplay: formatted,
      }));
      return;
    }

    if (name === "produk_id") {
      const autoFields = await buildProductAutoFields(value);
      setNewSpkCutting((prev) => ({ ...prev, produk_id: value, ...autoFields }));
      await fetchSkuByProduk(value);
      setSelectedSkuIds([]);
      return;
    }

    setNewSpkCutting((prev) => ({ ...prev, [name]: value }));
  };

  const handleBagianChange = (index, key, value) => {
    const updated = [...newSpkCutting.bagian];

    updated[index][key] = value;

    if (key === "nama_bagian") {
      const sumberKomponen = isAksesorisBagian(value) ? "aksesoris" : "bahan";
      updated[index].bahan = (updated[index].bahan || []).map((bahan) => ({
        ...bahan,
        sumber_komponen: sumberKomponen,
        bahan_id: sumberKomponen === "bahan" ? bahan.bahan_id || "" : "",
        aksesoris_id: sumberKomponen === "aksesoris" ? bahan.aksesoris_id || "" : "",
        warna: sumberKomponen === "bahan" ? bahan.warna || "" : "",
        warna_custom: "",
        warnaList: sumberKomponen === "bahan" ? bahan.warnaList || [] : [],
      }));
    }

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const handleBahanChange = async (bagianIndex, bahanIndex, key, value) => {
    const updated = [...newSpkCutting.bagian];

    updated[bagianIndex].bahan[bahanIndex][key] = value;

    // Jika bahan_id berubah, fetch warna untuk bahan tersebut dan reset warna

    if (key === "bahan_id") {
      const resolvedSelection = value
        ? await resolveBahanSelectionWithWarna(value)
        : { bahanId: "", warnaData: [] };

      updated[bagianIndex].bahan[bahanIndex].bahan_id = resolvedSelection.bahanId;
      updated[bagianIndex].bahan[bahanIndex].warna = "";
      updated[bagianIndex].bahan[bahanIndex].warna_custom = "";
      updated[bagianIndex].bahan[bahanIndex].warnaList = resolvedSelection.warnaData;
    }

    // Reset warna_custom when warna changes
    if (key === "warna") {
      updated[bagianIndex].bahan[bahanIndex].warna_custom = "";
    }

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const handleWarnaCustomChange = (bagianIndex, bahanIndex, value) => {
    const updated = [...newSpkCutting.bagian];

    updated[bagianIndex].bahan[bahanIndex].warna_custom = value;

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const addBagian = () => {
    setNewSpkCutting((prev) => {
      const updated = [...prev.bagian, { nama_bagian: "", bahan: [] }];
      return { ...prev, bagian: updated, ...getAssumptionFields(updated) };
    });
  };

  const removeBagian = async (bagianIndex) => {
    if (newSpkCutting.bagian[bagianIndex]?.is_auto_bagian) {
      await showStatusAlert("warning", "Bagian Default", "Bagian default dari Product List tidak bisa dihapus.");
      return;
    }

    const confirmed = await showConfirmAlert({
      icon: "warning",
      title: "Hapus Bagian?",
      text: "Bagian tambahan dan seluruh bahan di dalamnya akan dihapus dari form SPK.",
      confirmText: "Ya, Hapus",
    });

    if (!confirmed) {
      return;
    }

    const updated = [...newSpkCutting.bagian];
    updated.splice(bagianIndex, 1);

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const handleAksesorisChange = (bagianIndex, bahanIndex, value) => {
    const updated = [...newSpkCutting.bagian];

    updated[bagianIndex].bahan[bahanIndex] = {
      ...updated[bagianIndex].bahan[bahanIndex],
      sumber_komponen: "aksesoris",
      aksesoris_id: value,
      bahan_id: "",
      warna: "",
      warna_custom: "",
      warnaList: [],
      skus: [],
    };

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  
  const handleBahanSkuChange = (bagianIndex, bahanIndex, selectedOptions) => {
    const updated = [...newSpkCutting.bagian];
    const currentSkus = updated[bagianIndex].bahan[bahanIndex].skus || [];
    
    updated[bagianIndex].bahan[bahanIndex].skus = selectedOptions.map(opt => {
      const existing = currentSkus.find(s => s.sku_id === opt.value);
      return existing || { sku_id: opt.value, qty: "" };
    });
    
    setNewSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const handleBahanSkuQtyChange = (bagianIndex, bahanIndex, skuIndex, qtyValue) => {
    const updated = [...newSpkCutting.bagian];
    updated[bagianIndex].bahan[bahanIndex].skus[skuIndex].qty = qtyValue;
    setNewSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const handleEditBahanSkuChange = (bagianIndex, bahanIndex, selectedOptions) => {
    const updated = [...editSpkCutting.bagian];
    const currentSkus = updated[bagianIndex].bahan[bahanIndex].skus || [];
    
    updated[bagianIndex].bahan[bahanIndex].skus = selectedOptions.map(opt => {
      const existing = currentSkus.find(s => s.sku_id === opt.value);
      return existing || { sku_id: opt.value, qty: "" };
    });
    
    setEditSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const handleEditBahanSkuQtyChange = (bagianIndex, bahanIndex, skuIndex, qtyValue) => {
    const updated = [...editSpkCutting.bagian];
    updated[bagianIndex].bahan[bahanIndex].skus[skuIndex].qty = qtyValue;
    setEditSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const addBahan = (bagianIndex) => {
    const updated = [...newSpkCutting.bagian];

    updated[bagianIndex].bahan.push({
      sumber_komponen: isAksesorisBagian(updated[bagianIndex].nama_bagian) ? "aksesoris" : "bahan",
      bahan_id: "",
      aksesoris_id: "",
      material_group: updated[bagianIndex].material_group || "",
      warna: "",
      warna_custom: "",
      qty: "",
    });

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const removeBahan = async (bagianIndex, bahanIndex) => {
    const confirmed = await showConfirmAlert({
      icon: "warning",
      title: "Hapus Bahan?",
      text: "Baris bahan yang dipilih akan dihapus dari form SPK.",
      confirmText: "Ya, Hapus",
    });

    if (!confirmed) {
      return;
    }

    const updated = [...newSpkCutting.bagian];

    updated[bagianIndex].bahan.splice(bahanIndex, 1);

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));

    await showStatusAlert("success", "Berhasil", "Bahan berhasil dihapus dari form.");
  };

  const handleDetailClick = (spk, suffixInfo = null) => {
    setSelectedDetailSpk({ ...spk, _suffixInfo: suffixInfo });
  };

  const handleDownloadQr = async (spk) => {
    try {
      setDownloadingSpkId(spk.id);

      const response = await API.get(`/spk_cutting/${spk.id}/download-qr`, {
        responseType: "blob", // Penting untuk download file
      });

      // Buat URL untuk blob

      const url = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement("a");

      link.href = url;

      const productName = getSpkProductLabel(spk);
      const cleanProduct = productName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim().replace(/\s+/g, '-');
      const filename = `SPK-${cleanProduct}-${spk.id_spk_cutting}-${spk.barcode || 'NOBARCODE'}.pdf`;

      link.setAttribute("download", filename);

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
      void showStatusAlert("success", "Download Berhasil", "Barcode berhasil diunduh.");
    } catch (error) {
      console.error("Error downloading QR code:", error);

      await showStatusAlert("error", "Download Gagal", error.response?.data?.message || "Gagal mengunduh barcode.");
    } finally {
      setDownloadingSpkId(null);
    }
  };

  const handleDownloadPng = async (spk) => {
    try {
      setDownloadingSpkId(spk.id);

      // Pastikan pdf.js sudah dimuat untuk konversi yang identik dengan PDF
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Ambil file PDF dari backend
      const response = await API.get(`/spk_cutting/${spk.id}/download-qr`, {
        responseType: "arraybuffer", 
      });

      const pdfData = new Uint8Array(response.data);
      const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1); // Hanya ambil halaman 1

      const scale = 3; // Kualitas resolusi tinggi (3x)
      const viewport = page.getViewport({ scale: scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      canvas.toBlob((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const productName = getSpkProductLabel(spk);
        const cleanProduct = productName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim().replace(/\s+/g, '-');
        const filename = `SPK-${cleanProduct}-${spk.id_spk_cutting}-${spk.barcode || 'NOBARCODE'}.png`;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        setDownloadingSpkId(null);
        void showStatusAlert("success", "Download Berhasil", "SPK berhasil diunduh dalam format PNG dengan rapi.");
      }, "image/png");

    } catch (error) {
      console.error("Error downloading PNG:", error);
      setDownloadingSpkId(null);
      void showStatusAlert("error", "Download Gagal", "Gagal mengunduh SPK dalam format PNG.");
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = {};

      if (statusFilter && statusFilter !== "all") {
        params.status = statusFilter;
      }

      // Gunakan filter tanggal dari card progress untuk export
      if (dailyDate) {
        params.start_date = dailyDate;
        params.end_date = dailyDate;
      } else if (weeklyStart && weeklyEnd) {
        params.start_date = weeklyStart;
        params.end_date = weeklyEnd;
      }

      const response = await API.get("/spk_cutting/export/excel", {
        params,

        responseType: "blob", // Penting untuk download file
      });

      // Buat URL untuk blob

      const url = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement("a");

      link.href = url;

      const fileName = `spk-cutting-${new Date().toISOString().split("T")[0]}.xlsx`;

      link.setAttribute("download", fileName);

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
      void showStatusAlert("success", "Export Berhasil", "Data SPK Cutting berhasil diexport ke Excel.");
    } catch (error) {
      console.error("Error exporting to Excel:", error);

      await showStatusAlert("error", "Export Gagal", error.response?.data?.message || "Gagal export data ke Excel.");
    }
  };

  // Fungsi untuk mendapatkan warna status berdasarkan status
  const getStatusColor = (status) => {
    if (status === "belum_diambil") {
      return "#A31D1D"; // Merah
    }
    if (status === "sudah_diambil") {
      return "#3B82F6"; // Biru
    }
    if (status === "selesai") {
      return "#22C55E"; // Hijau
    }
    return "#2458ce"; // Default
  };

  const getRowToneClass = (status) => {
    if (status === "belum_diambil") return "spk-cutting-row-tone-danger";
    if (status === "sudah_diambil") return "spk-cutting-row-tone-info";
    if (status === "selesai") return "spk-cutting-row-tone-success";
    return "";
  };

  const getSisaHariToneClass = (sisaHari) => {
    if (sisaHari === null || sisaHari === undefined || sisaHari === "") return "is-muted";
    const numericDay = Number(sisaHari);
    if (!Number.isFinite(numericDay)) return "is-muted";
    if (numericDay <= 0) return "is-danger";
    if (numericDay <= 3) return "is-warning";
    if (numericDay <= 7) return "is-info";
    return "is-safe";
  };

  const getJenisSpkToneClass = (jenisSpk) => {
    const normalizedJenis = String(jenisSpk || "").toLowerCase();
    if (normalizedJenis.includes("terjual")) return "is-terjual";
    if (normalizedJenis.includes("fitting")) return "is-fittingan";
    if (normalizedJenis.includes("habisin")) return "is-habisin";
    return "is-default";
  };

  const getTahapToneClass = (tahap) => {
    const normalized = String(tahap || "").toLowerCase();
    if (normalized.includes("cmt")) return "is-habisin";
    if (normalized.includes("jasa")) return "is-terjual";
    if (normalized.includes("distribusi")) return "is-warning";
    if (normalized.includes("hasil")) return "is-safe";
    if (normalized.includes("spk cutting")) return "is-info";
    return "is-default";
  };

  const renderBahanSelect = ({ value, onChange, materialGroup }) => {
    const selectedValue = String(value || "");
    const selectedBahan = bahanList.find((bahan) => String(bahan.id) === selectedValue);
    const recommendedBahanIds = new Set(getBahanByMaterialGroup(materialGroup).map((bahan) => String(bahan.id)));
    const orderedBahanOptions = [...bahanOptions].sort((a, b) => {
      const aRecommended = recommendedBahanIds.has(a.value) ? 0 : 1;
      const bRecommended = recommendedBahanIds.has(b.value) ? 0 : 1;
      if (aRecommended !== bRecommended) return aRecommended - bRecommended;
      return a.label.localeCompare(b.label, "id", { numeric: true, sensitivity: "base" });
    });
    const selectedOption =
      orderedBahanOptions.find((option) => option.value === selectedValue) ||
      (selectedBahan
        ? {
            value: selectedValue,
            label: getBahanOptionLabel(selectedBahan),
          }
        : null);

    return (
      <Select
        className="spk-cutting-bahan-select"
        classNamePrefix="spk-cutting-react-select"
        options={orderedBahanOptions}
        value={selectedOption}
        onChange={(option) => onChange(option?.value || "")}
        placeholder="Pilih bahan dari Master Bahan"
        isClearable
        isSearchable
        noOptionsMessage={() => "Bahan master tidak ditemukan"}
        menuPortalTarget={bahanSelectPortalTarget}
        styles={{
          control: (base) => ({ ...base, borderRadius: '0px' }),
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          menu: (base) => ({ ...base, borderRadius: '0px' }),
        }}
      />
    );
  };

  const renderAksesorisSelect = ({ value, onChange }) => {
    const selectedValue = String(value || "");
    const selectedOption = aksesorisOptions.find((option) => option.value === selectedValue) || null;

    return (
      <Select
        className="spk-cutting-bahan-select"
        classNamePrefix="spk-cutting-react-select"
        options={aksesorisOptions}
        value={selectedOption}
        onChange={(option) => onChange(option?.value || "")}
        placeholder="Pilih Aksesoris"
        isClearable
        isSearchable
        noOptionsMessage={() => "Aksesoris tidak ditemukan"}
        menuPortalTarget={bahanSelectPortalTarget}
        styles={{
          control: (base) => ({ ...base, borderRadius: '0px' }),
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          menu: (base) => ({ ...base, borderRadius: '0px' }),
        }}
      />
    );
  };

  // Fungsi untuk update status langsung dari dropdown
  const handleStatusChangeDirect = async (spkId, newStatus, currentStatus) => {
    if (newStatus === currentStatus) {
      return;
    }

    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    const confirmed = await showConfirmAlert({
      icon: "question",
      title: "Ubah Status SPK?",
      text: `Status SPK akan diubah menjadi "${statusLabel}".`,
      confirmText: "Ya, Ubah",
    });

    if (!confirmed) {
      await fetchSpkCutting(currentPage);
      return;
    }

    try {
      const response = await API.patch(`/spk-cutting/${spkId}/status`, {
        status: newStatus,
      });

      // Update state lokal dengan status baru
      setSpkCutting((prevSpkCutting) =>
        prevSpkCutting.map((spk) => (spk.id === spkId ? { ...spk, status_cutting: newStatus } : spk))
      );

      // Refresh data
      await fetchSpkCutting();

      // Tampilkan notifikasi sukses (opsional)
      console.log("Status berhasil diupdate:", response.data.message);
      void showStatusAlert("success", "Status Diperbarui", `Status SPK berhasil diubah menjadi ${statusLabel}.`);
    } catch (error) {
      console.error("Error updating status:", error);
      await showStatusAlert("error", "Update Status Gagal", error.response?.data?.message || error.message);

      // Revert perubahan jika error - refetch data
      await fetchSpkCutting();
    }
  };

  const handleDeleteClick = async (spk) => {
    const confirmed = await showConfirmAlert({
      title: "Hapus SPK Cutting?",
      text: `Apakah Anda yakin ingin menghapus SPK Cutting ${spk.id_spk_cutting}? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Ya, Hapus"
    });

    if (confirmed) {
      try {
        await API.delete(`/spk_cutting/${spk.id}`);
        await showStatusAlert("success", "Berhasil", "SPK Cutting berhasil dihapus.");
        fetchSpkCutting();
      } catch (error) {
        await showStatusAlert("error", "Gagal Menghapus", error.response?.data?.message || "Terjadi kesalahan saat menghapus SPK Cutting.");
      }
    }
  };

  const handleEditClick = async (spk) => {
    try {
      const response = await API.get(`/spk_cutting/${spk.id}`);

      const data = response.data.data || response.data;

      // Set selected SKU IDs dari data yang sudah ada
      const productListSkus = data.productListSkus || data.product_list_skus;
      const existingSkus = Array.isArray(productListSkus) && productListSkus.length > 0 ? productListSkus : data.skus;
      if (existingSkus && Array.isArray(existingSkus)) {
        setEditSelectedSkuIds(existingSkus.map((sku) => sku.id.toString()));
      } else {
        setEditSelectedSkuIds([]);
      }

      // Fetch SKU list untuk produk yang dipilih
      const productListId = getSpkProductListId(data);
      if (productListId) {
        await fetchSkuByProduk(productListId);
      }

      // Transform data untuk form edit

      const bagianData = await Promise.all(
        (data.bagian || []).map(async (bagian) => {
          const bahanData = await Promise.all(
            (bagian.bahan || []).map(async (bahan) => {
              const sumberKomponen = bahan.sumber_komponen || (bahan.aksesoris_id ? "aksesoris" : "bahan");
              const bahanId = bahan.bahan_id?.toString() || "";

              // Fetch warna untuk bahan ini

              const warnaData = sumberKomponen === "bahan" && bahanId ? await fetchWarnaByBahan(bahanId) : [];

              return {
                sumber_komponen: sumberKomponen,
                bahan_id: bahanId,
                aksesoris_id: bahan.aksesoris_id?.toString() || "",

                warna: bahan.warna || "",

                warna_custom: warnaData.some((item) => {
                  const warnaItem = typeof item === "string" ? item : item.warna;

                  return warnaItem === bahan.warna;
                })
                  ? ""
                  : bahan.warna || "",

                qty: bahan.qty?.toString() || "",

                warnaList: warnaData,

                skus: Array.isArray(bahan.skus) ? bahan.skus.map(s => ({
                  sku_id: s.id,
                  qty: s.pivot ? s.pivot.qty : ""
                })) : [],
              };
            })
          );

          return {
            nama_bagian: bagian.nama_bagian || "",

            bahan: bahanData,
          };
        })
      );

      setEditSpkCutting({
        id: data.id,

        id_spk_cutting: data.id_spk_cutting || "",
        pic: data.pic || "",

        produk_id: productListId ? productListId.toString() : "",

        tanggal_buat: data.created_at ? data.created_at.substring(0, 10) : "",
        tanggal_batas_kirim: data.tanggal_batas_kirim || "",

        harga_jasa: data.harga_jasa?.toString() || "",
        harga_jasaDisplay: data.harga_jasa ? formatRupiahInput(data.harga_jasa.toString()) : "",

        satuan_harga: data.satuan_harga || "Pcs",

        jumlah_asumsi_produk: data.jumlah_asumsi_produk?.toString() || "",
        jumlah_asumsi_produkDisplay: data.jumlah_asumsi_produk ? formatRibuan(data.jumlah_asumsi_produk.toString()) : "",

        jenis_spk: data.jenis_spk || "",

        keterangan: data.keterangan || "",

        tukang_cutting_id: data.tukang_cutting_id?.toString() || "",
        tukang_pola_id: data.tukang_pola_id?.toString() || "",

        bagian: bagianData.length > 0 ? bagianData : [{ nama_bagian: "", bahan: [] }],
      });

      setShowEditForm(true);
    } catch (error) {
      console.error("Error loading SPK for edit:", error);

      await showStatusAlert("error", "Gagal Memuat Data", "Gagal memuat data untuk edit.");
    }
  };

  const handleEditInputChange = async (e) => {
    const { name, value } = e.target;

    // Handle format untuk harga_jasa
    if (name === "harga_jasa") {
      const formatted = formatRupiahInput(value);
      const numeric = parseRupiah(value);
      setEditSpkCutting((prev) => ({
        ...prev,
        harga_jasa: numeric,
        harga_jasaDisplay: formatted,
      }));
      return;
    }

    // Handle format untuk jumlah_asumsi_produk
    if (name === "jumlah_asumsi_produk") {
      const formatted = formatRibuan(value);
      const numeric = parseRibuan(value);
      setEditSpkCutting((prev) => ({
        ...prev,
        jumlah_asumsi_produk: numeric,
        jumlah_asumsi_produkDisplay: formatted,
      }));
      return;
    }

    if (name === "produk_id") {
      const autoFields = await buildProductAutoFields(value);
      setEditSpkCutting((prev) => ({ ...prev, produk_id: value, ...autoFields }));
      await fetchSkuByProduk(value);
      setEditSelectedSkuIds([]);
      return;
    }

    setEditSpkCutting((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditBagianChange = (index, key, value) => {
    const updated = [...editSpkCutting.bagian];

    updated[index][key] = value;

    if (key === "nama_bagian") {
      const sumberKomponen = isAksesorisBagian(value) ? "aksesoris" : "bahan";
      updated[index].bahan = (updated[index].bahan || []).map((bahan) => ({
        ...bahan,
        sumber_komponen: sumberKomponen,
        bahan_id: sumberKomponen === "bahan" ? bahan.bahan_id || "" : "",
        aksesoris_id: sumberKomponen === "aksesoris" ? bahan.aksesoris_id || "" : "",
        warna: sumberKomponen === "bahan" ? bahan.warna || "" : "",
        warna_custom: "",
        warnaList: sumberKomponen === "bahan" ? bahan.warnaList || [] : [],
      }));
    }

    setEditSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const handleEditBahanChange = async (bagianIndex, bahanIndex, key, value) => {
    const updated = [...editSpkCutting.bagian];

    updated[bagianIndex].bahan[bahanIndex][key] = value;

    if (key === "bahan_id") {
      const resolvedSelection = value
        ? await resolveBahanSelectionWithWarna(value)
        : { bahanId: "", warnaData: [] };

      updated[bagianIndex].bahan[bahanIndex].bahan_id = resolvedSelection.bahanId;
      updated[bagianIndex].bahan[bahanIndex].warna = "";
      updated[bagianIndex].bahan[bahanIndex].warna_custom = "";
      updated[bagianIndex].bahan[bahanIndex].warnaList = resolvedSelection.warnaData;
    }

    if (key === "warna") {
      updated[bagianIndex].bahan[bahanIndex].warna_custom = "";
    }

    setEditSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const handleEditAksesorisChange = (bagianIndex, bahanIndex, value) => {
    const updated = [...editSpkCutting.bagian];

    updated[bagianIndex].bahan[bahanIndex] = {
      ...updated[bagianIndex].bahan[bahanIndex],
      sumber_komponen: "aksesoris",
      aksesoris_id: value,
      bahan_id: "",
      warna: "",
      warna_custom: "",
      warnaList: [],
      skus: [],
    };

    setEditSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const handleEditWarnaCustomChange = (bagianIndex, bahanIndex, value) => {
    const updated = [...editSpkCutting.bagian];

    updated[bagianIndex].bahan[bahanIndex].warna_custom = value;

    setEditSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const addEditBagian = () => {
    setEditSpkCutting((prev) => {
      const updated = [...prev.bagian, { nama_bagian: "", bahan: [] }];
      return { ...prev, bagian: updated, ...getAssumptionFields(updated) };
    });
  };

  const removeEditBagian = async (bagianIndex) => {
    if (editSpkCutting.bagian[bagianIndex]?.is_auto_bagian) {
      await showStatusAlert("warning", "Bagian Default", "Bagian default dari Product List tidak bisa dihapus.");
      return;
    }

    const confirmed = await showConfirmAlert({
      icon: "warning",
      title: "Hapus Bagian?",
      text: "Bagian tambahan dan seluruh bahan di dalamnya akan dihapus dari form edit SPK.",
      confirmText: "Ya, Hapus",
    });

    if (!confirmed) {
      return;
    }

    const updated = [...editSpkCutting.bagian];
    updated.splice(bagianIndex, 1);

    setEditSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const addEditBahan = (bagianIndex) => {
    const updated = [...editSpkCutting.bagian];

    updated[bagianIndex].bahan.push({
      sumber_komponen: isAksesorisBagian(updated[bagianIndex].nama_bagian) ? "aksesoris" : "bahan",
      bahan_id: "",
      aksesoris_id: "",
      material_group: updated[bagianIndex].material_group || "",
      warna: "",
      warna_custom: "",
      qty: "",
    });

    setEditSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));
  };

  const removeEditBahan = async (bagianIndex, bahanIndex) => {
    const confirmed = await showConfirmAlert({
      icon: "warning",
      title: "Hapus Bahan?",
      text: "Baris bahan yang dipilih akan dihapus dari form edit SPK.",
      confirmText: "Ya, Hapus",
    });

    if (!confirmed) {
      return;
    }

    const updated = [...editSpkCutting.bagian];

    updated[bagianIndex].bahan.splice(bahanIndex, 1);

    setEditSpkCutting((prev) => ({ ...prev, bagian: updated, ...getAssumptionFields(updated) }));

    await showStatusAlert("success", "Berhasil", "Bahan berhasil dihapus dari form edit.");
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();

    // Global SKU validation for Edit Form removed. SKU is now validated per-bahan.

    if (!editSpkCutting.produk_id) {
      await showStatusAlert("warning", "Validasi Data", "Pilih Product terlebih dahulu!");
      return;
    }

    // Validasi

    if (editSpkCutting.bagian.length === 0) {
      await showStatusAlert("warning", "Validasi Data", "Minimal harus ada 1 bagian!");

      return;
    }

    for (let i = 0; i < editSpkCutting.bagian.length; i++) {
      const bagian = editSpkCutting.bagian[i];

      if (!bagian.nama_bagian || bagian.nama_bagian.trim() === "") {
        await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}: Nama bagian harus diisi!`);

        return;
      }

      if (bagian.bahan.length === 0) {
        await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}: Minimal harus ada 1 bahan!`);

        return;
      }

      for (let j = 0; j < bagian.bahan.length; j++) {
        const bahan = bagian.bahan[j];
        const isAksesoris = isAksesorisBagian(bagian.nama_bagian);

        if (isAksesoris && (!bahan.aksesoris_id || bahan.aksesoris_id === "")) {
          await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}, Aksesoris ${j + 1}: Aksesoris harus dipilih!`);

          return;
        }

        if (!isAksesoris && !bahan.bahan_id) {
          await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}, Bahan ${j + 1}: Bahan harus dipilih!`);

          return;
        }



        if (!bahan.qty || bahan.qty <= 0) {
          await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}, Bahan ${j + 1}: Qty harus lebih dari 0!`);

          return;
        }

        if (!isAksesoris && (!bahan.skus || bahan.skus.length === 0)) {
          await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}, Bahan ${j + 1}: Pilih alokasi SKU produk terlebih dahulu!`);
          return;
        }

        if (!isAksesoris && (!bahan.skus || bahan.skus.length === 0)) {
          await showStatusAlert("warning", "Validasi Data", `Bagian ${i + 1}, Bahan ${j + 1}: Pilih alokasi SKU produk terlebih dahulu!`);
          return;
        }
      }
    }

    // Konversi bahan_id menjadi integer

    const dataToSend = {
      id_spk_cutting: editSpkCutting.id_spk_cutting || "",
      pic: editSpkCutting.pic || "",
      product_list_id: parseInt(editSpkCutting.produk_id, 10),
      tanggal_batas_kirim: editSpkCutting.tanggal_batas_kirim,
      produk_id: null,
      harga_jasa: editSpkCutting.harga_jasa ? parseFloat(editSpkCutting.harga_jasa) : null,
      satuan_harga: editSpkCutting.satuan_harga,
      jumlah_asumsi_produk: editSpkCutting.jumlah_asumsi_produk ? parseInt(editSpkCutting.jumlah_asumsi_produk, 10) : null,
      jenis_spk: editSpkCutting.jenis_spk || null,
      keterangan: editSpkCutting.keterangan || "",
      tukang_cutting_id: parseInt(editSpkCutting.tukang_cutting_id),
      tukang_pola_id: editSpkCutting.tukang_pola_id ? parseInt(editSpkCutting.tukang_pola_id) : null,
      produk_sku_ids: editSelectedSkuIds.map((id) => parseInt(id, 10)),
      bagian: editSpkCutting.bagian.map((bagian) => ({
        nama_bagian: bagian.nama_bagian,

        bahan: bagian.bahan.map((bahan) => makeKomponenPayload(bagian, bahan)),
      })),
    };

    console.log("Data SPK Cutting yang dikirim untuk update:", dataToSend);

    try {
      const response = await API.put(`/spk_cutting/${editSpkCutting.id}`, dataToSend);

      console.log("Response:", response.data);

      await showStatusAlert("success", "Berhasil", "SPK Cutting berhasil diperbarui!");

      // Refresh data dan summary

      await fetchSpkCutting();

      // Reset form

      setEditSpkCutting({
        id: null,
        id_spk_cutting: "",
        pic: "",
        produk_id: "",
        tanggal_buat: "",
        tanggal_batas_kirim: "",
        harga_jasa: "",
        harga_jasaDisplay: "",
        satuan_harga: "Pcs",
        jumlah_asumsi_produk: "",
        jumlah_asumsi_produkDisplay: "",
        jenis_spk: "",
        keterangan: "",
        tukang_cutting_id: "",
        tukang_pola_id: "",
        bagian: [],
      });

      setEditSelectedSkuIds([]);
      setSkuList([]);
      setShowEditForm(false);
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);

      // Tampilkan error detail dari backend

      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;

        const errorMessages = Object.keys(errors)

          .map((key) => {
            return `${key}: ${errors[key].join(", ")}`;
          })

          .join("\n");

        await showStatusAlert("error", "Validasi Gagal", errorMessages);
      } else {
        await showStatusAlert("error", "Perbarui Data Gagal", error.response?.data?.message || "Terjadi kesalahan saat memperbarui SPK Cutting.");
      }
    }
  };

  const activeSummaryLabel = STATUS_LABELS[statusFilter] || STATUS_LABELS.all;
  const activeSummaryValue =
    statusFilter === "all"
      ? summary.all
      : statusFilter === "belum_diambil"
      ? summary.belum_diambil?.count || 0
      : statusFilter === "sudah_diambil"
      ? summary.sudah_diambil || 0
      : summary.selesai || 0;

  const weeklyCardTitle =
    statusFilter === "selesai"
      ? "Selesai Mingguan"
      : statusFilter === "belum_diambil"
      ? "Belum Diambil Mingguan"
      : statusFilter === "sudah_diambil"
      ? "Sudah Diambil Mingguan"
      : "Belum Diambil Mingguan";

  const dailyCardTitle =
    statusFilter === "selesai"
      ? "Selesai Harian"
      : statusFilter === "belum_diambil"
      ? "Belum Diambil Harian"
      : statusFilter === "sudah_diambil"
      ? "Sudah Diambil Harian"
      : "Belum Diambil Harian";

  const SkuSelectorModal = ({ produkId, initialSelectedIds, onSave, onClose }) => {
    const [localSelectedIds, setLocalSelectedIds] = useState(initialSelectedIds);
    return (
    <div className="spk-cutting-modal" style={{ zIndex: 1100 }}>
      <div className="spk-cutting-modal-content" style={{ maxWidth: '1200px', width: '90%' }}>
        <div className="spk-cutting-create-header">
          <div className="spk-cutting-create-title">
            <span>Alokasi</span>
            <h2>Pilih Alokasi SKU</h2>
          </div>
          <button type="button" className="spk-cutting-create-close" onClick={onClose}><FiX /></button>
        </div>
        <div className="spk-cutting-create-body" style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>

    <div className="spk-cutting-form-row">
      <div className="spk-cutting-form-group spk-cutting-form-group-full">
        <label>
          SKU Produk: <span className="spk-cutting-required">*</span>
        </label>
        <div className={`spk-cutting-sku-selector ${!produkId || skuList.length === 0 ? "is-disabled" : ""}`}>
          {skuList.length > 0 ? (
            (() => {
              const skuGroups = groupSkusBySize(skuList);
              const maxSkuRows = Math.max(...skuGroups.map(([, skus]) => skus.length));

              return (
                <div className="spk-cutting-sku-table-wrap">
                  <table className="spk-cutting-sku-table">
                    <thead>
                      <tr>
                        {skuGroups.map(([size, skus]) => (
                          <th key={size}>
                            <span>SKU Ukuran {size}</span>
                            <small>{skus.length} SKU</small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: maxSkuRows }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                          {skuGroups.map(([size, skus]) => {
                            const sku = skus[rowIndex];
                            if (!sku) {
                              return <td key={size} className="spk-cutting-sku-table-empty" />;
                            }

                            const skuId = sku.id.toString();
                            const isSelected = localSelectedIds.includes(skuId);

                            return (
                              <td key={sku.id}>
                                <label className={`spk-cutting-sku-item ${isSelected ? "is-selected" : ""}`}>
                                  <input
                                    type="checkbox"
                                    className="spk-cutting-sku-checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setLocalSelectedIds((prev) => (prev.includes(skuId) ? prev : [...prev, skuId]));
                                      } else {
                                        setLocalSelectedIds((prev) => prev.filter((id) => id !== skuId));
                                      }
                                    }}
                                    disabled={!produkId || skuList.length === 0}
                                  />
                                  <span className="spk-cutting-sku-text">{getSkuLabel(sku)}</span>
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()
          ) : (
            <div className="spk-cutting-sku-empty">{produkId ? "Tidak ada SKU untuk produk ini" : "Pilih produk terlebih dahulu"}</div>
          )}
        </div>
        <small className="spk-cutting-form-hint">Centang checkbox untuk memilih SKU.</small>
      </div>
    </div>
        </div>
        <div className="spk-cutting-form-actions" style={{ padding: '20px' }}>
          <button type="button" className="spk-cutting-btn spk-cutting-btn-primary" onClick={() => onSave(localSelectedIds)}>
            Simpan Pilihan
          </button>
          <button type="button" className="spk-cutting-btn spk-cutting-btn-secondary" onClick={onClose}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
  };

  return (
    <div className="spk-cutting-page">
      <div className="spk-cutting-header">
        <div className="spk-cutting-header-top">
          <div className="spk-cutting-title-group">
            <div className="spk-cutting-brand-icon">
              <FiScissors />
            </div>
            <div className="spk-cutting-title-wrap">
              <p className="spk-cutting-module-pill">Cutting Module</p>
              <h1>Data SPK Cutting</h1>
              <p className="spk-cutting-header-subtitle">Pemantauan progres, target, dan dokumen kerja cutting.</p>
            </div>
          </div>
        </div>
      </div>



      <div className="spk-cutting-table-container">
        <div className="spk-cutting-filter-header">
          <div className="spk-cutting-action-buttons">
            <button
              className="spk-cutting-btn-add"
              onClick={() => {
                // Reset form saat membuka

                setNewSpkCutting({
                  id_spk_cutting: "",
                  pic: "",

                  produk_id: "",
                  tanggal_buat: "",
                  tanggal_batas_kirim: "",

                  harga_jasa: "",
                  harga_jasaDisplay: "",

                  satuan_harga: "Pcs",

                  jumlah_asumsi_produk: "",
                  jumlah_asumsi_produkDisplay: "",

                  keterangan: "",

                  tukang_cutting_id: "",
                  tukang_pola_id: "",

                  bagian: [],
                });

                setSelectedSkuIds([]);
                setSkuList([]);
                setShowForm(true);
              }}
            >
              <FaPlus /> Tambah SPK Cutting
            </button>

            <button className="spk-cutting-btn-export" onClick={handleExportExcel}>
              <FaFileExcel /> Export Excel
            </button>
          </div>

          <div className="spk-cutting-filter-group">
            <div className="spk-cutting-search-bar">
              <input type="text" placeholder="Cari ID, Nomor SPK, Tukang, atau Produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {searchTerm ? (
                <button type="button" className="spk-cutting-search-clear" onClick={() => setSearchTerm("")} title="Hapus pencarian">
                  <FiX />
                </button>
              ) : (
                <span className="spk-cutting-search-icon">
                  <FiSearch />
                </span>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <p className="spk-cutting-loading">Memuat data...</p>
        ) : error ? (
          <p className="spk-cutting-error">{error}</p>
        ) : (
          <>
            <div className="spk-cutting-table-scroll">
              <table className="spk-cutting-table">
              <thead>
                <tr>
                 
                  <th>Tanggal Buat</th>
                  <th>SPK Cutting ID</th>
                  <th>Deadline</th>
                  <th>Sisa Hari</th>
                  <th>Tukang Cutting</th>
                  <th>Jenis SPK</th>
                  <th>Status Tahap</th>
                  <th>Product</th>
                  <th>Size</th>
                  <th>SKU</th>
                  <th>Warna Bahan</th>
                  <th>Jumlah Rol</th>
                  <th>Harga Jasa</th>
                  <th>Harga Per Pcs</th>
                  <th>Estimasi Cutting</th>
                  <th>Total Estimasi Jasa</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {currentItems.map((spk, index) => {
                  const warnaDetails = getSpkWarnaDetail(spk);
                  const hasDetails = warnaDetails.length > 0;
                  
                  const sizeGroups = {};
                  const sizeKeys = [];
                  if (hasDetails) {
                    warnaDetails.forEach(item => {
                      const sizeLabel = item.sizeLabel || getSpkSizeLabel(spk);
                      if (!sizeGroups[sizeLabel]) {
                        sizeGroups[sizeLabel] = [];
                        sizeKeys.push(sizeLabel);
                      }
                      sizeGroups[sizeLabel].push(item);
                    });
                  }
                  
                  const addSubtotals = hasDetails && sizeKeys.length > 0;
                  const rowCount = hasDetails ? warnaDetails.length + (addSubtotals ? sizeKeys.length : 0) : 1;
                  
                  return (
                    <React.Fragment key={spk.id}>
                      {hasDetails ? (
                        (() => {
                          let overallIdx = 0;
                          return sizeKeys.map((sizeKey, sizeIdx) => {
                            const groupItems = sizeGroups[sizeKey];
                            const groupRowCount = groupItems.length + 1; // +1 for the subtotal row
                            const suffix = sizeKeys.length > 1 ? `-${String.fromCharCode(65 + sizeIdx)}` : "";
                            const mergedId = `${spk.id_spk_cutting}${suffix}`;

                            const groupTotalQty = groupItems.reduce((acc, curr) => acc + curr.qty, 0);
                            const groupTotalEstimasi = groupItems.reduce((acc, curr) => acc + curr.estimasi, 0);
                            const groupTotalJasa = groupItems.reduce((acc, curr) => acc + curr.totalJasa, 0);

                            const suffixInfo = { suffix, sizeKey, groupItems, groupTotalQty, groupTotalEstimasi, groupTotalJasa };

                            const rows = groupItems.map((item, localIdx) => {
                              return (
                                <tr key={`${spk.id}-${sizeIdx}-${localIdx}`} className={`spk-cutting-row ${getRowToneClass(spk.status_cutting)}`}>
                                  <td>{spk.created_at ? new Date(spk.created_at).toLocaleDateString('id-ID') : "-"}</td>
                                  <td>
                                    {mergedId}
                                    <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: '600' }}>
                                      {spk.is_bahan_scanned ? (
                                        <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <FaCheckCircle /> Bahan Discan
                                        </span>
                                      ) : (
                                        <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <FaTimesCircle /> Belum Discan
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td>{spk.tanggal_batas_kirim || "-"}</td>
                                  <td>
                                    <span className={`spk-cutting-sisa-badge ${getSisaHariToneClass(spk.sisa_hari)}`}>
                                      {spk.sisa_hari !== null ? spk.sisa_hari + " hari" : "Belum ada deadline"}
                                    </span>
                                  </td>
                                  <td>{spk.tukang_cutting?.nama_tukang_cutting || "-"}</td>
                                  <td>
                                    <span className={`spk-cutting-jenis-chip ${getJenisSpkToneClass(spk.jenis_spk)}`}>{spk.jenis_spk || "-"}</span>
                                  </td>
                                  <td>
                                    <span className={`spk-cutting-sisa-badge ${getTahapToneClass(spk.tahap_terakhir)}`}>
                                      {spk.tahap_terakhir || "SPK Cutting"}
                                    </span>
                                  </td>
                                  <td>{getSpkProductLabel(spk)}</td>
                                  <td>{sizeKey}</td>
                                  <td>{item.skus?.length > 0 ? item.skus.map(s => s.sku_name || s.sku || "-").join(", ") : getSpkSkuLabel(spk)}</td>
                                  <td>{item.warna}</td>
                                  <td>{Number.isInteger(item.qty) ? item.qty : Number(item.qty).toFixed(2)}</td>
                                  <td className="spk-cutting-price">{formatRupiah(spk.harga_jasa)} / {spk.satuan_harga}</td>
                                  <td className="spk-cutting-price">{formatRupiah(spk.harga_per_pcs)}</td>
                                  <td>{item.estimasi.toLocaleString("id-ID")}</td>
                                  <td className="spk-cutting-price">{formatRupiah(item.totalJasa)}</td>
                                  <td>
                                    <div className="spk-cutting-row-actions">
                                      <button className="spk-cutting-btn-icon view" onClick={() => handleDetailClick(spk, suffixInfo)} title="Lihat Detail">
                                        <FaInfoCircle />
                                      </button>
                                      <button className="spk-cutting-btn-icon edit" onClick={() => handleEditClick(spk)} title="Edit">
                                        <FaEdit />
                                      </button>
                                      <button className="spk-cutting-btn-icon delete" onClick={() => handleDeleteClick(spk)} title="Hapus" style={{ color: '#ef4444', backgroundColor: '#fee2e2', border: '1px solid #fecaca' }}>
                                        <FaTrash />
                                      </button>
                                      <button
                                        className="spk-cutting-btn-icon download"
                                        onClick={() => handleDownloadQr(spk)}
                                        title={downloadingSpkId === spk.id ? "Sedang menyiapkan barcode..." : "Download PDF"}
                                        disabled={!spk.barcode || downloadingSpkId === spk.id}
                                      >
                                        <FaDownload />
                                      </button>
                                      <button
                                        className="spk-cutting-btn-icon download"
                                        onClick={() => handleDownloadPng(spk)}
                                        title={downloadingSpkId === spk.id ? "Sedang menyiapkan gambar..." : "Download PNG"}
                                        disabled={!spk.barcode || downloadingSpkId === spk.id}
                                        style={{ backgroundColor: '#e0f2fe', color: '#0ea5e9', border: '1px solid #bae6fd' }}
                                      >
                                        <FaFileImage />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                            
                            
                            rows.push(
                              <tr key={`${spk.id}-subtotal-${sizeIdx}`} className="spk-cutting-summary-row" style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                                <td colSpan={9}></td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', fontStyle: 'italic', fontSize: '0.9em', color: '#64748b' }}>Subtotal :</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', fontStyle: 'italic', fontSize: '0.9em', color: '#64748b' }}>{groupItems.length} Warna</td>
                                <td style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '0.9em', color: '#64748b' }}>{Number.isInteger(groupTotalQty) ? groupTotalQty : Number(groupTotalQty).toFixed(2)}</td>
                                <td></td>
                                <td></td>
                                <td style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '0.9em', color: '#64748b' }}>{groupTotalEstimasi.toLocaleString("id-ID")}</td>
                                <td style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '0.9em', color: '#64748b' }}>{formatRupiah(groupTotalJasa)}</td>
                                <td></td>
                              </tr>
                            );
                            
                            return rows;
                          });
                        })()
                      ) : (
                        <tr key={spk.id} className={`spk-cutting-row ${getRowToneClass(spk.status_cutting)}`}>
                          <td>{spk.created_at ? new Date(spk.created_at).toLocaleDateString('id-ID') : "-"}</td>
                          <td>{spk.id_spk_cutting}</td>
                          <td>{spk.tanggal_batas_kirim || "-"}</td>
                          <td>
                            <span className={`spk-cutting-sisa-badge ${getSisaHariToneClass(spk.sisa_hari)}`}>
                              {spk.sisa_hari !== null ? spk.sisa_hari + " hari" : "Belum ada deadline"}
                            </span>
                          </td>
                          <td>{spk.tukang_cutting?.nama_tukang_cutting || "-"}</td>
                          <td>
                            <span className={`spk-cutting-jenis-chip ${getJenisSpkToneClass(spk.jenis_spk)}`}>{spk.jenis_spk || "-"}</span>
                          </td>
                          <td>
                            <span className={`spk-cutting-sisa-badge ${getTahapToneClass(spk.tahap_terakhir)}`}>
                              {spk.tahap_terakhir || "SPK Cutting"}
                            </span>
                          </td>
                          <td>{getSpkProductLabel(spk)}</td>
                          <td>{getSpkSizeLabel(spk)}</td>
                          <td>{getSpkSkuLabel(spk)}</td>
                          <td>{getSpkWarnaBahan(spk)}</td>
                          <td>{calculateTotalRoll(spk)}</td>
                          <td className="spk-cutting-price">{formatRupiah(spk.harga_jasa)} / {spk.satuan_harga}</td>
                          <td className="spk-cutting-price">{formatRupiah(spk.harga_per_pcs)}</td>
                          <td>{spk.jumlah_asumsi_produk !== null && spk.jumlah_asumsi_produk !== undefined ? spk.jumlah_asumsi_produk.toLocaleString("id-ID") : "-"}</td>
                          <td className="spk-cutting-price">{formatRupiah((spk.jumlah_asumsi_produk || 0) * (spk.harga_per_pcs || 0))}</td>
                          <td>
                            <div className="spk-cutting-row-actions">
                              <button className="spk-cutting-btn-icon view" onClick={() => handleDetailClick(spk)} title="Lihat Detail">
                                <FaInfoCircle />
                              </button>
                              <button className="spk-cutting-btn-icon edit" onClick={() => handleEditClick(spk)} title="Edit">
                                <FaEdit />
                              </button>
                              <button className="spk-cutting-btn-icon delete" onClick={() => handleDeleteClick(spk)} title="Hapus" style={{ color: '#ef4444', backgroundColor: '#fee2e2', border: '1px solid #fecaca' }}>
                                <FaTrash />
                              </button>
                              <button
                                className="spk-cutting-btn-icon download"
                                onClick={() => handleDownloadQr(spk)}
                                title={downloadingSpkId === spk.id ? "Sedang menyiapkan barcode..." : "Download PDF"}
                                disabled={!spk.barcode || downloadingSpkId === spk.id}
                              >
                                <FaDownload />
                              </button>
                              <button
                                className="spk-cutting-btn-icon download"
                                onClick={() => handleDownloadPng(spk)}
                                title={downloadingSpkId === spk.id ? "Sedang menyiapkan gambar..." : "Download PNG"}
                                disabled={!spk.barcode || downloadingSpkId === spk.id}
                                style={{ backgroundColor: '#e0f2fe', color: '#0ea5e9', border: '1px solid #bae6fd' }}
                              >
                                <FaFileImage />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {hasDetails && (
                        <tr className="spk-cutting-summary-row" style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                          <td colSpan={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total ({spk.id_spk_cutting}) :</td>
                          <td style={{ fontWeight: 'bold' }}>{warnaDetails.length} Warna</td>
                          <td style={{ fontWeight: 'bold' }}>{calculateTotalRoll(spk)}</td>
                          <td colSpan={4}></td>
                          <td style={{ fontWeight: 'bold' }}>{spk.jumlah_asumsi_produk?.toLocaleString("id-ID") || "-"}</td>
                          <td style={{ fontWeight: 'bold' }} className="spk-cutting-price">{formatRupiah((spk.jumlah_asumsi_produk || 0) * (spk.harga_per_pcs || 0))}</td>
                          <td colSpan={3}></td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              </table>
            </div>

            {/* ✅ OPTIMASI: Server-side Pagination - Tampilkan selalu jika ada data */}
            {pagination.total > 0 && (
              <div className="spk-cutting-pagination">
                <div className="spk-cutting-pagination-summary">
                  Menampilkan {pagination.from || 0} - {pagination.to || 0} dari {pagination.total.toLocaleString("id-ID")} data
                </div>

                {pagination.last_page > 1 && (
                  <div className="spk-cutting-pagination-controls">
                    <button className="spk-cutting-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                      Sebelumnya
                    </button>

                    <span className="spk-cutting-page-indicator">
                      Halaman {pagination.current_page} dari {pagination.last_page}
                    </span>

                    <button className="spk-cutting-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pagination.last_page}>
                      Selanjutnya
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Tambah SPK Cutting */}
      {showForm && (
        <div className="spk-cutting-modal">
          <div className="spk-cutting-modal-content spk-cutting-modal-content-create">
            <div className="spk-cutting-create-header">
              <div className="spk-cutting-create-title">
                <span>Cutting Module</span>
                <h2>Tambah SPK Cutting</h2>
              </div>
              <button type="button" className="spk-cutting-create-close" onClick={() => setShowForm(false)} aria-label="Tutup modal tambah SPK">
                <FiX />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="spk-cutting-form spk-cutting-create-form">
              <div className="spk-cutting-create-body">
                <div className="spk-cutting-create-columns">
                <section className="spk-cutting-create-section spk-cutting-create-section-info">
                  <div className="spk-cutting-create-section-header">
                    <div>
                      <span className="spk-cutting-create-section-number">01</span>
                      <h3>Informasi Cutting</h3>
                    </div>
                    <span className="spk-cutting-create-section-pill">Identitas</span>
                  </div>

                  <div className="spk-cutting-create-section-body spk-cutting-create-section-body-identity" style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {/* Group 1: Tukang & Identitas SPK (Kiri / Left Column) */}
                      <div className="spk-cutting-form-group-section" style={{ border: '1px solid #e2e8f0', borderRadius: '0px', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 className="spk-cutting-group-title" style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                          Tukang & Identitas SPK
                        </h4>
                        <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                          <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Tukang Cutting: <span className="spk-cutting-required">*</span></label>
                          <select name="tukang_cutting_id" value={newSpkCutting.tukang_cutting_id} onChange={handleInputChange} required style={{ flex: 1 }}>
                            <option value="">Pilih Tukang</option>
                            {tukangList.map((tukang) => (
                              <option key={tukang.id} value={tukang.id}>
                                {tukang.nama_tukang_cutting}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                          <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Tukang Pola:</label>
                          <select name="tukang_pola_id" value={newSpkCutting.tukang_pola_id} onChange={handleInputChange} style={{ flex: 1 }}>
                            <option value=""></option>
                            {tukangPolaList.map((tukangPola) => (
                              <option key={tukangPola.id} value={tukangPola.id}>
                                {tukangPola.nama}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                          <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>PIC:</label>
                          <input type="text" name="pic" value={newSpkCutting.pic} onChange={handleInputChange} placeholder="Nama PIC" style={{ flex: 1 }} />
                        </div>

                        <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                          <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Nomor Seri SPK:</label>
                          <input type="text" name="id_spk_cutting" value={newSpkCutting.id_spk_cutting || ""} onChange={handleInputChange} placeholder="Input Nomor Seri" style={{ flex: 1 }} />
                        </div>
                      </div>

                      {/* Group 2: Spesifikasi Produk & SPK (Tengah / Middle Column) */}
                      <div className="spk-cutting-form-group-section" style={{ border: '1px solid #e2e8f0', borderRadius: '0px', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 className="spk-cutting-group-title" style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                          Spesifikasi Produk & SPK
                        </h4>
                        <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                          <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Product: <span className="spk-cutting-required">*</span></label>
                          <div style={{ flex: 1 }}>
                            <Select
                              className="spk-cutting-bahan-select"
                              classNamePrefix="spk-cutting-react-select"
                              options={produkOptions}
                              value={getSelectedProdukOption(newSpkCutting.produk_id)}
                              onChange={(option) => handleInputChange(makeInputEvent("produk_id", option?.value))}
                              placeholder="Cari / pilih Product"
                              isClearable
                              isSearchable
                              noOptionsMessage={() => "Product tidak ditemukan"}
                              menuPortalTarget={bahanSelectPortalTarget}
                              styles={{
                                control: (base) => ({ ...base, minHeight: '40px', width: '100%', borderRadius: '0px' }),
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                menu: (base) => ({ ...base, borderRadius: '0px' }),
                              }}
                            />
                          </div>
                        </div>

                        <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                          <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Jenis SPK:</label>
                          <select name="jenis_spk" value={newSpkCutting.jenis_spk} onChange={handleInputChange} style={{ flex: 1 }}>
                            <option value="">Pilih Jenis SPK</option>
                            <option value="Terjual">Terjual</option>
                            <option value="Fittingan">Fittingan</option>
                            <option value="Habisin Bahan">Habisin Bahan</option>
                          </select>
                        </div>

                        <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                          <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Tanggal Buat: <span className="spk-cutting-required">*</span></label>
                          <input type="date" name="tanggal_buat" value={newSpkCutting.tanggal_buat} onChange={handleInputChange} required style={{ flex: 1 }} />
                        </div>

                        <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                          <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Batas Kirim: <span className="spk-cutting-required">*</span></label>
                          <input type="date" name="tanggal_batas_kirim" value={newSpkCutting.tanggal_batas_kirim} onChange={handleInputChange} required style={{ flex: 1 }} />
                        </div>
                      </div>

                      {/* Group 3: Estimasi Cutting & Biaya Jasa (Kanan / Right Column) */}
                      <div className="spk-cutting-form-group-section" style={{ border: '1px solid #e2e8f0', borderRadius: '0px', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 className="spk-cutting-group-title" style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                          Estimasi Cutting & Biaya Jasa
                        </h4>
                        <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                          <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Estimasi Cutting:</label>
                          <input type="text" name="jumlah_asumsi_produk" value={newSpkCutting.jumlah_asumsi_produkDisplay} onChange={handleInputChange} placeholder="Otomatis" readOnly style={{ background: '#f1f5f9', flex: 1 }} />
                        </div>

                        <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                          <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Harga Jasa: <span className="spk-cutting-required">*</span></label>
                          <div className="spk-cutting-currency-input" style={{ flex: 1, display: 'flex' }}>
                            <span className="spk-cutting-currency-prefix">Rp</span>
                            <input
                              type="text"
                              name="harga_jasa"
                              className="spk-cutting-input-with-prefix"
                              value={newSpkCutting.harga_jasaDisplay}
                              onChange={handleInputChange}
                              placeholder="0"
                              readOnly
                              required
                              style={{ background: '#f1f5f9', flex: 1, width: '100%' }}
                            />
                          </div>
                        </div>

                        <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                          <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Satuan Harga: <span className="spk-cutting-required">*</span></label>
                          <select name="satuan_harga" value={newSpkCutting.satuan_harga} onChange={handleInputChange} required style={{ flex: 1 }}>
                            <option value="Pcs">Pcs</option>
                            <option value="Lusin">Lusin</option>
                          </select>
                        </div>

                        <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                          <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Total Biaya:</label>
                          <div className="spk-cutting-currency-input" style={{ flex: 1, display: 'flex' }}>
                            <span className="spk-cutting-currency-prefix">Rp</span>
                            <input
                              type="text"
                              className="spk-cutting-input-with-prefix"
                              value={formatRupiahInput(Math.round(calculateTotalBiayaJasa(newSpkCutting.harga_jasa, newSpkCutting.jumlah_asumsi_produk, newSpkCutting.satuan_harga)).toString())}
                              readOnly
                              disabled
                              style={{ background: '#f1f5f9', fontWeight: 'bold', color: '#1d4ed8', flex: 1, width: '100%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="spk-cutting-form-group spk-cutting-form-group-full" style={{ padding: '0', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px' }}>
                      <label style={{ width: '130px', flexShrink: 0, marginTop: '8px', marginBottom: 0 }}>Keterangan:</label>
                      <textarea name="keterangan" value={newSpkCutting.keterangan} onChange={handleInputChange} readOnly style={{ background: '#f1f5f9', flex: 1 }} />
                    </div>
                  </div>
                </section>

                <section className="spk-cutting-create-section spk-cutting-create-section-production">
                  <div className="spk-cutting-create-section-header">
                    <div>
                      <span className="spk-cutting-create-section-number">02</span>
                      <h3>Bagian & Bahan</h3>
                    </div>
                    <span className="spk-cutting-create-section-pill">Bahan</span>
                  </div>

                  <div className="spk-cutting-create-section-body">
                    <div className="spk-cutting-bagian-toolbar">
                      <h3>Daftar Bahan</h3>
                      <button type="button" className="spk-cutting-btn-icon-circle add" onClick={addBagian} title="Tambah Bagian">
                        <FaPlus />
                      </button>
                    </div>

                    {newSpkCutting.bagian.map((bagian, bagianIndex) => (
                      <div key={bagianIndex} className="spk-cutting-bagian-section">
                        <div className="spk-cutting-bagian-header">
                          <h4>Bagian {bagianIndex + 1}</h4>
                          {!bagian.is_auto_bagian && (
                            <button type="button" className="spk-cutting-btn-icon-circle remove" onClick={() => removeBagian(bagianIndex)} title="Hapus Bagian">
                              <FiMinus />
                            </button>
                          )}
                        </div>
                                   {/* Table Header Row */}
                        <div className="spk-cutting-bagian-columns-header" style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid #e2e8f0', fontSize: '11px', fontWeight: '600', color: '#475569' }}>
                          <div style={{ flex: '1 1 160px', minWidth: '130px' }}>Nama Bagian</div>
                          <div style={{ flex: '1 1 220px', minWidth: '180px' }}>Nama Bahan</div>
                          <div style={{ flex: '1 1 140px', minWidth: '110px' }}>Warna Bahan</div>
                          <div style={{ flex: '0 0 auto', width: '200px' }}>Alokasi SKU</div>
                          <div style={{ flex: '0 0 80px' }}>Qty (Rol)</div>
                          <div style={{ flex: '0 0 36px', textAlign: 'center' }}></div>
                        </div>

                        <div className="spk-cutting-bagian-lines">
                          {(bagian.bahan.length ? bagian.bahan : [null]).map((bahan, bahanIndex) => (
                            <div key={bahan ? bahanIndex : "empty"} className="spk-cutting-bagian-line" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'flex-start', gap: '8px', width: '100%', marginBottom: '6px' }}>
                              
                              {/* 1. Nama Bagian */}
                              <div className="spk-cutting-form-group" style={{ flex: '1 1 160px', minWidth: '130px', marginBottom: 0 }}>
                                {bahanIndex === 0 ? (
                                  bagian.is_auto_bagian ? (
                                    <>
                                      <input type="text" value={bagian.nama_bagian || ""} readOnly style={{ background: '#f1f5f9', width: '100%', height: '40px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '0px', boxSizing: 'border-box' }} />
                                      {bagian.material_group && <small className="spk-cutting-form-hint" style={{ marginTop: '2px' }}>Group: {bagian.material_group}</small>}
                                    </>
                                  ) : (
                                    <select value={bagian.nama_bagian || ""} onChange={(e) => handleBagianChange(bagianIndex, "nama_bagian", e.target.value)} required style={{ width: '100%', height: '40px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '0px', boxSizing: 'border-box' }}>
                                      <option value="">Pilih Bagian</option>
                                      {NAMA_BAGIAN_OPTIONS.map((nama) => (
                                        <option key={nama} value={nama}>{nama}</option>
                                      ))}
                                    </select>
                                  )
                                ) : null}
                              </div>

                              {bahan ? (
                                <>
                                  {/* 2. Nama Bahan */}
                                  <div className="spk-cutting-form-group" style={{ flex: '1 1 220px', minWidth: '180px', marginBottom: 0 }}>
                                    {isAksesorisBagian(bagian.nama_bagian)
                                      ? renderAksesorisSelect({
                                          value: bahan.aksesoris_id,
                                          onChange: (value) => handleAksesorisChange(bagianIndex, bahanIndex, value),
                                        })
                                      : renderBahanSelect({
                                          value: bahan.bahan_id,
                                          materialGroup: bahan.material_group || bagian.material_group,
                                          onChange: (value) => handleBahanChange(bagianIndex, bahanIndex, "bahan_id", value),
                                        })}
                                  </div>

                                  {/* 3. Warna Bahan */}
                                  <div className="spk-cutting-form-group" style={{ flex: '1 1 140px', minWidth: '110px', marginBottom: 0 }}>
                                    {isAksesorisBagian(bagian.nama_bagian) ? (
                                      <input type="text" value="Aksesoris" readOnly style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '0px', width: '100%', height: '40px', boxSizing: 'border-box', background: '#f1f5f9' }} />
                                    ) : (
                                      <>
                                        <select value={bahan.warna || ""} onChange={(e) => handleBahanChange(bagianIndex, bahanIndex, "warna", e.target.value)} disabled={!bahan.bahan_id} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '0px', width: '100%', height: '40px', boxSizing: 'border-box' }}>
                                          <option value="">{bahan.bahan_id ? "Pilih Warna" : "Pilih Bahan"}</option>
                                          {(bahan.warnaList || []).map((item, idx) => {
                                            const warna = typeof item === "string" ? item : item.warna;
                                            const stok = typeof item === "object" ? item.stok : 999;
                                            const isDisabled = stok === 0;
                                            return (
                                              <option key={idx} value={warna} disabled={isDisabled} style={isDisabled ? { color: "#999", opacity: 0.5 } : {}}>
                                                {warna} {stok !== 999 && `(Stok: ${stok})`}
                                              </option>
                                            );
                                          })}
                                        </select>
                                      </>
                                    )}
                                  </div>

                                  {/* 4. Alokasi SKU */}
                                  <div style={{ flex: '0 0 auto', width: '200px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0, height: '40px' }}>
                                    <button type="button" className="spk-cutting-btn spk-cutting-btn-primary" onClick={() => openSkuModal('create', bagianIndex, bahanIndex)} style={{ height: '40px', padding: '0 12px', margin: 0, flexShrink: 0 }}>
                                      Pilih Alokasi SKU
                                    </button>
                                    {bahan.skus && bahan.skus.length > 0 ? (
                                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a', whiteSpace: 'nowrap' }}>{bahan.skus.length} Size</span>
                                    ) : (
                                      <span style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap' }}>Belum alokasi *</span>
                                    )}
                                  </div>

                                  {/* 5. Qty */}
                                  <div className="spk-cutting-form-group" style={{ flex: '0 0 80px', marginBottom: 0 }}>
                                    <input type="number" placeholder={isAksesorisBagian(bagian.nama_bagian) ? "Qty" : "Rol"} value={bahan.qty || ""} onChange={(e) => handleBahanChange(bagianIndex, bahanIndex, "qty", e.target.value)} required style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '0px', width: '100%', boxSizing: 'border-box', height: '40px' }} />
                                  </div>

                                  {/* 6. Aksi */}
                                  <div style={{ flex: '0 0 36px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 0 }}>
                                    {!bagian.is_auto_bagian && (
                                      <button type="button" className="spk-cutting-btn-icon-circle remove" onClick={() => removeBahan(bagianIndex, bahanIndex)} title="Hapus Bahan" style={{ width: '32px', height: '32px' }}>
                                        <FiTrash2 />
                                      </button>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="spk-cutting-bahan-empty-action" style={{ flex: '1 1 auto' }}>
                                  {!bagian.is_auto_bagian && (
                                    <button type="button" className="spk-cutting-btn spk-cutting-btn-success" onClick={() => addBahan(bagianIndex)}>
                                      <FaPlus /> Tambah Bahan
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}

                          {bagian.bahan.length > 0 && !bagian.is_auto_bagian && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px', paddingLeft: '0' }}>
                              <button type="button" className="spk-cutting-btn-icon-circle add" onClick={() => addBahan(bagianIndex)} title="Tambah Bahan" style={{ width: '28px', height: '28px' }}>
                                <FaPlus style={{ fontSize: '10px' }} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                </div>
              </div>

              <div className="spk-cutting-form-actions spk-cutting-create-actions">
                <button type="button" className="spk-cutting-btn spk-cutting-btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <div className="spk-cutting-create-actions-right">
                  <button type="submit" className="spk-cutting-btn spk-cutting-btn-primary">
                    <FiCheckCircle /> Simpan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail SPK Cutting */}
      {selectedDetailSpk && (
        <div className="spk-cutting-modal">
          <div className="spk-cutting-modal-content">
            <h2>Detail SPK Cutting</h2>
            <div className="spk-cutting-detail-grid">
              <div className="spk-cutting-detail-item">
                <strong>ID SPK</strong>
                <span>{selectedDetailSpk.id}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Nomor Seri</strong>
                <span>{selectedDetailSpk._suffixInfo ? `${selectedDetailSpk.id_spk_cutting}${selectedDetailSpk._suffixInfo.suffix}` : selectedDetailSpk.id_spk_cutting}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>PIC</strong>
                <span>{selectedDetailSpk.pic || "-"}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Tukang Cutting</strong>
                <span>{selectedDetailSpk.tukang_cutting?.nama_tukang_cutting || "-"}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Tukang Pola</strong>
                <span>{selectedDetailSpk.tukang_pola?.nama || "-"}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Product</strong>
                <span>{getSpkProductLabel(selectedDetailSpk)}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>SKU</strong>
                <span>{selectedDetailSpk._suffixInfo ? Array.from(new Set(selectedDetailSpk._suffixInfo.groupItems.flatMap(i => i.skus).map(s => s.sku_name || s.sku).filter(Boolean))).join(", ") || "-" : getSpkSkuLabel(selectedDetailSpk)}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Size</strong>
                <span>{selectedDetailSpk._suffixInfo ? selectedDetailSpk._suffixInfo.sizeKey : getSpkSizeLabel(selectedDetailSpk)}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Warna Bahan</strong>
                <span>{selectedDetailSpk._suffixInfo ? Array.from(new Set(selectedDetailSpk._suffixInfo.groupItems.map(i => i.warna))).join(", ") : getSpkWarnaBahan(selectedDetailSpk)}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Jumlah Rol</strong>
                <span>{selectedDetailSpk._suffixInfo ? (Number.isInteger(selectedDetailSpk._suffixInfo.groupTotalQty) ? selectedDetailSpk._suffixInfo.groupTotalQty : Number(selectedDetailSpk._suffixInfo.groupTotalQty).toFixed(2)) : calculateTotalRoll(selectedDetailSpk)}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Deadline</strong>
                <span>{selectedDetailSpk.tanggal_batas_kirim || "-"}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Sisa Hari</strong>
                <span>{selectedDetailSpk.sisa_hari !== null ? `${selectedDetailSpk.sisa_hari} hari` : "Belum ada deadline"}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Harga Jasa</strong>
                <span className="spk-cutting-price">
                  {formatRupiah(selectedDetailSpk.harga_jasa)} / {selectedDetailSpk.satuan_harga}
                </span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Harga Per Pcs</strong>
                <span className="spk-cutting-price">{formatRupiah(selectedDetailSpk.harga_per_pcs)}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Estimasi Cutting</strong>
                <span>{selectedDetailSpk._suffixInfo ? selectedDetailSpk._suffixInfo.groupTotalEstimasi.toLocaleString("id-ID") : (selectedDetailSpk.jumlah_asumsi_produk !== null && selectedDetailSpk.jumlah_asumsi_produk !== undefined ? selectedDetailSpk.jumlah_asumsi_produk.toLocaleString("id-ID") : "-")}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Total Estimasi Jasa</strong>
                <span className="spk-cutting-price">{selectedDetailSpk._suffixInfo ? formatRupiah(selectedDetailSpk._suffixInfo.groupTotalJasa) : formatRupiah(selectedDetailSpk.jumlah_asumsi_produk * selectedDetailSpk.harga_per_pcs)}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Jenis SPK</strong>
                <span>{selectedDetailSpk.jenis_spk || "-"}</span>
              </div>
              {((selectedDetailSpk.productListSkus || selectedDetailSpk.product_list_skus)?.length > 0 || selectedDetailSpk.skus?.length > 0) && (
                <div className="spk-cutting-detail-item spk-cutting-detail-item-full">
                  <strong>SKU Produk:</strong>
                  <div className="spk-cutting-sku-chip-list">
                    {((selectedDetailSpk.productListSkus || selectedDetailSpk.product_list_skus)?.length > 0 ? selectedDetailSpk.productListSkus || selectedDetailSpk.product_list_skus : selectedDetailSpk.skus).map((sku) => (
                      <span key={sku.id} className="spk-cutting-sku-chip">
                        {getSkuLabel(sku)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="spk-cutting-detail-item">
                <strong>Status</strong>
                <span>
                  <span className={`spk-cutting-badge ${selectedDetailSpk.status_cutting?.toLowerCase().replace(" ", "-") || "belum-diambil"}`}>{selectedDetailSpk.status_cutting || "Belum Diambil"}</span>
                </span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Tanggal Dibuat</strong>
                <span>{selectedDetailSpk.created_at ? new Date(selectedDetailSpk.created_at).toLocaleDateString("id-ID") : "-"}</span>
              </div>
              {selectedDetailSpk.keterangan && (
                <div className="spk-cutting-detail-item">
                  <strong>Keterangan</strong>
                  <span>{selectedDetailSpk.keterangan}</span>
                </div>
              )}
            </div>

            {/* Detail Bagian & Bahan */}
            <h3>Detail Bagian & Bahan</h3>
            {selectedDetailSpk.bagian?.length > 0 ? (
              <div className="spk-cutting-scrollable-table">
                <table className="spk-cutting-log-table">
                  <thead>
                    <tr>
                      {selectedDetailSpk.bagian.map((bagian, i) => (
                        <th key={i} colSpan="3" className="spk-cutting-log-th-center">
                          {bagian.nama_bagian?.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {selectedDetailSpk.bagian.map((_, i) => (
                        <React.Fragment key={`subheader-${i}`}>
                          <th>NAMA BAHAN</th>
                          <th>WARNA</th>
                          <th>QTY</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({
                      length: Math.max(...selectedDetailSpk.bagian.map((b) => (b.bahan || []).length)),
                    }).map((_, rowIndex) => (
                      <tr key={rowIndex}>
                        {selectedDetailSpk.bagian.map((bagian, bagianIndex) => {
                          const bahan = bagian.bahan[rowIndex];
                          const itemName = bahan?.sumber_komponen === "aksesoris" ? bahan?.aksesoris?.nama_aksesoris : bahan?.bahan?.nama_bahan;
                          return (
                            <React.Fragment key={`${bagianIndex}-${rowIndex}`}>
                              <td>{bahan ? itemName || "-" : ""}</td>
                              <td>{bahan ? bahan.sumber_komponen === "aksesoris" ? "Aksesoris" : bahan.warna || "-" : ""}</td>
                              <td>{bahan ? bahan.qty || "" : ""}</td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="spk-cutting-loading">Tidak ada bagian ditemukan.</p>
            )}

            <div className="spk-cutting-form-actions">
              <button className="spk-cutting-btn spk-cutting-btn-secondary" onClick={() => setSelectedDetailSpk(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit SPK Cutting */}
      {showEditForm && (
        <div className="spk-cutting-modal">
          <div className="spk-cutting-modal-content">
            <h2>Edit SPK Cutting</h2>
            <form onSubmit={handleFormUpdate} className="spk-cutting-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px', alignItems: 'stretch' }}>
                {/* Group 1: Tukang & Identitas SPK (Kiri / Left Column) */}
                <div className="spk-cutting-form-group-section" style={{ border: '1px solid #e2e8f0', borderRadius: '0px', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 className="spk-cutting-group-title" style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Tukang & Identitas SPK
                  </h4>
                  <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Tukang Cutting: <span className="spk-cutting-required">*</span></label>
                    <select name="tukang_cutting_id" value={editSpkCutting.tukang_cutting_id} onChange={handleEditInputChange} required style={{ flex: 1 }}>
                      <option value="">Pilih Tukang</option>
                      {tukangList.map((tukang) => (
                        <option key={tukang.id} value={tukang.id}>
                          {tukang.nama_tukang_cutting}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Tukang Pola:</label>
                    <select name="tukang_pola_id" value={editSpkCutting.tukang_pola_id} onChange={handleEditInputChange} style={{ flex: 1 }}>
                      <option value=""></option>
                      {tukangPolaList.map((tukangPola) => (
                        <option key={tukangPola.id} value={tukangPola.id}>
                          {tukangPola.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>PIC:</label>
                    <input type="text" name="pic" value={editSpkCutting.pic} onChange={handleEditInputChange} placeholder="Nama PIC" style={{ flex: 1 }} />
                  </div>

                  <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Nomor Seri SPK:</label>
                    <input type="text" name="id_spk_cutting" value={editSpkCutting.id_spk_cutting || ""} onChange={handleEditInputChange} placeholder="Input Nomor Seri" style={{ flex: 1 }} />
                  </div>
                </div>

                {/* Group 2: Spesifikasi Produk & SPK (Tengah / Middle Column) */}
                <div className="spk-cutting-form-group-section" style={{ border: '1px solid #e2e8f0', borderRadius: '0px', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 className="spk-cutting-group-title" style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Spesifikasi Produk & SPK
                  </h4>
                  <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Product Group: <span className="spk-cutting-required">*</span></label>
                    <div style={{ flex: 1 }}>
                      <Select
                        className="spk-cutting-bahan-select"
                        classNamePrefix="spk-cutting-react-select"
                        options={produkOptions}
                        value={getSelectedProdukOption(editSpkCutting.produk_id)}
                        onChange={(option) => handleEditInputChange(makeInputEvent("produk_id", option?.value))}
                        placeholder="Cari / pilih Product Group"
                        isClearable
                        isSearchable
                        noOptionsMessage={() => "Product Group tidak ditemukan"}
                        menuPortalTarget={bahanSelectPortalTarget}
                        styles={{
                          control: (base) => ({ ...base, minHeight: '40px', width: '100%', borderRadius: '0px' }),
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          menu: (base) => ({ ...base, borderRadius: '0px' }),
                        }}
                      />
                    </div>
                  </div>

                  <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Jenis SPK:</label>
                    <select name="jenis_spk" value={editSpkCutting.jenis_spk} onChange={handleEditInputChange} style={{ flex: 1 }}>
                      <option value="">Pilih Jenis SPK</option>
                      <option value="Terjual">Terjual</option>
                      <option value="Fittingan">Fittingan</option>
                      <option value="Habisin Bahan">Habisin Bahan</option>
                    </select>
                  </div>

                  <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Tanggal Buat: <span className="spk-cutting-required">*</span></label>
                    <input type="date" name="tanggal_buat" value={editSpkCutting.tanggal_buat} onChange={handleEditInputChange} required style={{ flex: 1 }} />
                  </div>

                  <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Batas Kirim: <span className="spk-cutting-required">*</span></label>
                    <input type="date" name="tanggal_batas_kirim" value={editSpkCutting.tanggal_batas_kirim} onChange={handleEditInputChange} required style={{ flex: 1 }} />
                  </div>
                </div>

                {/* Group 3: Estimasi Cutting & Biaya Jasa (Kanan / Right Column) */}
                <div className="spk-cutting-form-group-section" style={{ border: '1px solid #e2e8f0', borderRadius: '0px', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 className="spk-cutting-group-title" style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Estimasi Cutting & Biaya Jasa
                  </h4>
                  <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Estimasi Cutting:</label>
                    <input type="text" name="jumlah_asumsi_produk" value={editSpkCutting.jumlah_asumsi_produkDisplay} onChange={handleEditInputChange} placeholder="Otomatis" readOnly style={{ background: '#f1f5f9', flex: 1 }} />
                  </div>

                  <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Harga Jasa: <span className="spk-cutting-required">*</span></label>
                    <div className="spk-cutting-currency-input" style={{ flex: 1, display: 'flex' }}>
                      <span className="spk-cutting-currency-prefix">Rp</span>
                      <input
                        type="text"
                        name="harga_jasa"
                        className="spk-cutting-input-with-prefix"
                        value={editSpkCutting.harga_jasaDisplay}
                        onChange={handleEditInputChange}
                        placeholder="0"
                        readOnly
                        required
                        style={{ background: '#f1f5f9', flex: 1, width: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Satuan Harga: <span className="spk-cutting-required">*</span></label>
                    <select name="satuan_harga" value={editSpkCutting.satuan_harga} onChange={handleEditInputChange} required style={{ flex: 1 }}>
                      <option value="Pcs">Pcs</option>
                      <option value="Lusin">Lusin</option>
                    </select>
                  </div>

                  <div className="spk-cutting-form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <label style={{ width: '130px', flexShrink: 0, marginBottom: 0 }}>Total Biaya:</label>
                    <div className="spk-cutting-currency-input" style={{ flex: 1, display: 'flex' }}>
                      <span className="spk-cutting-currency-prefix">Rp</span>
                      <input
                        type="text"
                        className="spk-cutting-input-with-prefix"
                        value={formatRupiahInput(Math.round(calculateTotalBiayaJasa(editSpkCutting.harga_jasa, editSpkCutting.jumlah_asumsi_produk, editSpkCutting.satuan_harga)).toString())}
                        readOnly
                        disabled
                        style={{ background: '#f1f5f9', fontWeight: 'bold', color: '#1d4ed8', flex: 1, width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="spk-cutting-form-group spk-cutting-form-group-full" style={{ padding: '0', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px' }}>
                <label style={{ width: '130px', flexShrink: 0, marginTop: '8px', marginBottom: 0 }}>Keterangan:</label>
                <textarea name="keterangan" value={editSpkCutting.keterangan} onChange={handleEditInputChange} readOnly style={{ background: '#f1f5f9', flex: 1 }} />
              </div>

              {/* Bagian dan Bahan */}
              {editSpkCutting.bagian.map((bagian, bagianIndex) => (
                <div key={bagianIndex} className="spk-cutting-bagian-section">
                  <div className="spk-cutting-bagian-header">
                    <h4>Bagian {bagianIndex + 1}</h4>
                    {!bagian.is_auto_bagian && (
                      <button type="button" className="spk-cutting-btn-icon-circle remove" onClick={() => removeEditBagian(bagianIndex)} title="Hapus Bagian">
                        <FiMinus />
                      </button>
                    )}
                  </div>

                  {/* Table Header Row */}
                  <div className="spk-cutting-bagian-columns-header" style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid #e2e8f0', fontSize: '11px', fontWeight: '600', color: '#475569' }}>
                    <div style={{ flex: '1 1 160px', minWidth: '130px' }}>Nama Bagian</div>
                    <div style={{ flex: '1 1 220px', minWidth: '180px' }}>Nama Bahan</div>
                    <div style={{ flex: '1 1 140px', minWidth: '110px' }}>Warna Bahan</div>
                    <div style={{ flex: '0 0 auto', width: '200px' }}>Alokasi SKU</div>
                    <div style={{ flex: '0 0 80px' }}>Qty (Rol)</div>
                    <div style={{ flex: '0 0 36px', textAlign: 'center' }}></div>
                  </div>

                  <div className="spk-cutting-bagian-lines">
                    {bagian.bahan.map((bahan, bahanIndex) => (
                      <div key={bahanIndex} className="spk-cutting-bagian-line" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'flex-start', gap: '8px', width: '100%', marginBottom: '6px' }}>
                        
                        {/* 1. Nama Bagian */}
                        <div className="spk-cutting-form-group" style={{ flex: '1 1 160px', minWidth: '130px', marginBottom: 0 }}>
                          {bahanIndex === 0 ? (
                            bagian.is_auto_bagian ? (
                              <>
                                <input type="text" value={bagian.nama_bagian || ""} readOnly style={{ background: '#f1f5f9', width: '100%', height: '40px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '0px', boxSizing: 'border-box' }} />
                                {bagian.material_group && <small className="spk-cutting-form-hint" style={{ marginTop: '2px' }}>Group: {bagian.material_group}</small>}
                              </>
                            ) : (
                              <select value={bagian.nama_bagian || ""} onChange={(e) => handleEditBagianChange(bagianIndex, "nama_bagian", e.target.value)} required style={{ width: '100%', height: '40px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '0px', boxSizing: 'border-box' }}>
                                <option value="">Pilih Bagian</option>
                                {NAMA_BAGIAN_OPTIONS.map((nama) => (
                                  <option key={nama} value={nama}>{nama}</option>
                                ))}
                              </select>
                            )
                          ) : null}
                        </div>

                        {/* 2. Nama Bahan */}
                        <div className="spk-cutting-form-group" style={{ flex: '1 1 220px', minWidth: '180px', marginBottom: 0 }}>
                          {isAksesorisBagian(bagian.nama_bagian) ? (
                            renderAksesorisSelect({
                              value: bahan.aksesoris_id,
                              onChange: (value) => handleEditAksesorisChange(bagianIndex, bahanIndex, value),
                            })
                          ) : (
                            renderBahanSelect({
                              value: bahan.bahan_id,
                              materialGroup: bahan.material_group || bagian.material_group,
                              onChange: (value) => handleEditBahanChange(bagianIndex, bahanIndex, "bahan_id", value),
                            })
                          )}
                        </div>
                        
                        {/* 3. Warna Bahan */}
                        <div className="spk-cutting-form-group" style={{ flex: '1 1 140px', minWidth: '110px', marginBottom: 0 }}>
                          {isAksesorisBagian(bagian.nama_bagian) ? (
                            <input type="text" value="Aksesoris" readOnly style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '0px', width: '100%', height: '40px', boxSizing: 'border-box', background: '#f1f5f9' }} />
                          ) : (
                            <>
                              <select value={bahan.warna || ""} onChange={(e) => handleEditBahanChange(bagianIndex, bahanIndex, "warna", e.target.value)} disabled={!bahan.bahan_id} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '0px', width: '100%', height: '40px', boxSizing: 'border-box' }}>
                                <option value="">{bahan.bahan_id ? "Pilih Warna" : "Pilih Bahan"}</option>
                                {(bahan.warnaList || []).map((item, idx) => {
                                  const warna = typeof item === "string" ? item : item.warna;
                                  const stok = typeof item === "object" ? item.stok : 999;
                                  const isDisabled = stok === 0;
                                  return (
                                    <option key={idx} value={warna} disabled={isDisabled} style={isDisabled ? { color: "#999", opacity: 0.5 } : {}}>
                                      {warna} {stok !== 999 && `(Stok: ${stok})`}
                                    </option>
                                  );
                                })}
                              </select>
                            </>
                          )}
                        </div>
                        
                        {/* 4. Alokasi SKU */}
                        <div style={{ flex: '0 0 auto', width: '200px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0, height: '40px' }}>
                          <button type="button" className="spk-cutting-btn spk-cutting-btn-primary" onClick={() => openSkuModal('edit', bagianIndex, bahanIndex)} style={{ height: '40px', padding: '0 12px', margin: 0, flexShrink: 0 }}>
                            Pilih Alokasi SKU
                          </button>
                          {bahan.skus && bahan.skus.length > 0 ? (
                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a', whiteSpace: 'nowrap' }}>{bahan.skus.length} Size</span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap' }}>Belum alokasi *</span>
                          )}
                        </div>
                        
                        {/* 5. Qty */}
                        <div className="spk-cutting-form-group" style={{ flex: '0 0 80px', marginBottom: 0 }}>
                          <input type="number" placeholder={isAksesorisBagian(bagian.nama_bagian) ? "Qty" : "Rol"} value={bahan.qty || ""} onChange={(e) => handleEditBahanChange(bagianIndex, bahanIndex, "qty", e.target.value)} required style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '0px', width: '100%', boxSizing: 'border-box', height: '40px' }} />
                        </div>
                        
                        {/* 6. Aksi */}
                        <div style={{ flex: '0 0 36px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 0 }}>
                          {!bagian.is_auto_bagian && (
                            <button type="button" className="spk-cutting-btn-icon-circle remove" onClick={() => removeEditBahan(bagianIndex, bahanIndex)} title="Hapus Bahan" style={{ width: '32px', height: '32px' }}>
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!bagian.is_auto_bagian && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
                      <button type="button" className="spk-cutting-btn-icon-circle add" onClick={() => addEditBahan(bagianIndex)} title="Tambah Bahan" style={{ width: '28px', height: '28px' }}>
                        <FaPlus style={{ fontSize: '10px' }} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '8px' }}>
                <button type="button" className="spk-cutting-btn-icon-circle add" onClick={addEditBagian} title="Tambah Bagian">
                  <FaPlus />
                </button>
              </div>

              <div className="spk-cutting-form-actions">
                <button type="submit" className="spk-cutting-btn spk-cutting-btn-primary">
                  Perbarui
                </button>
                <button type="button" className="spk-cutting-btn spk-cutting-btn-secondary" onClick={() => setShowEditForm(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {skuModalConfig.isOpen && (
        <SkuSelectorModal 
          produkId={skuModalConfig.type === 'create' ? newSpkCutting.produk_id : editSpkCutting.produk_id}
          initialSelectedIds={skuModalConfig.selectedIds}
          onSave={handleSaveSkus}
          onClose={closeSkuModal}
        />
      )}

    </div>
  );
};

export default SpkCutting;

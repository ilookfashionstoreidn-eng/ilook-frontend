import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./SpkBahan.css";
import "../Produk/ProductList.css";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import API from "../../api";
import { FaCalendarAlt, FaFileAlt, FaIndustry, FaLayerGroup, FaPlus, FaPrint, FaSearch, FaTrash, FaTimes } from "react-icons/fa";
// ADDED: FaPrint dipakai untuk tombol Print PDF sesuai icon set existing.

const JENIS_PEMBAYARAN_OPTIONS = ["Cash", "Tempo"];
const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "proses", label: "Proses" },
  { value: "selesai", label: "Selesai" },
];
const TOAST_DURATION = 3200;
const SEARCH_DEBOUNCE_MS = 350;
const SWEETALERT_CDN = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
const PER_PAGE_OPTIONS = [25, 50];
const DEFAULT_WARNA_ROW = { warna: "", jumlah_rol: 1 };

const EMPTY_META = {
  current_page: 1,
  last_page: 1,
  per_page: 25,
  total: 0,
  from: 0,
  to: 0,
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

// ADDED: Gabungkan field penting SPK agar daftar print bisa dicari dari modal.
const buildPrintSpkSearchText = (row) => {
  const dateValue = row?.tanggal_pemesanan || row?.created_at || "";
  let formattedDate = "";

  if (dateValue) {
    const date = new Date(dateValue);
    formattedDate = Number.isNaN(date.getTime()) ? String(dateValue) : date.toLocaleDateString("id-ID");
  }

  const warnaSummary = Array.isArray(row?.warna)
    ? row.warna.map((warna) => `${warna?.warna || ""} ${warna?.jumlah_rol || ""}`).join(" ")
    : "";

  return normalizeText([
    row?.id ? `#${row.id}` : "",
    row?.id,
    dateValue,
    formattedDate,
    row?.bahan?.nama_bahan,
    row?.bahan?.group_bahan,
    row?.bahan?.pabrik_bahan,
    row?.pabrik?.nama_pabrik,
    row?.status,
    warnaSummary,
  ].filter(Boolean).join(" "));
};

const getSpkRowId = (row) => row?.spk_bahan_id || row?.id;

const getSpkWarnaRowId = (row) => row?.spk_bahan_warna_id || row?._warnaDetail?.id || row?.warna?.[0]?.id || null;

const getRowKey = (row) => {
  const spkId = getSpkRowId(row);
  const warnaId = getSpkWarnaRowId(row);
  return warnaId ? `${spkId}-warna-${warnaId}` : `${spkId}-warna-header`;
};

const expandSpkRowsByWarna = (rows = []) =>
  rows.flatMap((row) => {
    if (!Array.isArray(row?.warna) || row.warna.length === 0) {
      return [row];
    }

    return row.warna.map((warna) => ({
      ...row,
      id: row.id,
      spk_bahan_id: row.id,
      spk_bahan_warna_id: warna?.id || null,
      warna: [warna],
      jumlah: warna?.jumlah_rol ?? row.jumlah,
      stok_dipesan: warna?.stok_dipesan ?? warna?.jumlah_rol ?? 0,
      pesanan_dikirim: warna?.pesanan_dikirim ?? 0,
      sisa_dipesan: warna?.sisa_dipesan ?? warna?.jumlah_rol ?? 0,
      lebih_kirim: warna?.lebih_kirim ?? 0,
      estimasi_pengiriman: warna?.estimasi_pengiriman ?? null,
      lama_pemesanan: warna?.lama_pemesanan ?? row.lama_pemesanan,
      _warnaDetail: warna,
      _originalWarna: row.warna,
    }));
  });

const getPabrikName = (pabrik) => String(pabrik?.nama_pabrik || pabrik?.nama || "").trim();

const getPabrikOptionValue = (pabrik) => `${pabrik?.id || ""}::${getPabrikName(pabrik)}`;

const formatDateInput = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toDateInputValue = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "" : formatDateInput(date);
};

const addDaysFromDate = (dateValue, days) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Math.max(0, parseInt(days, 10) || 0));
  return formatDateInput(date);
};

const diffDaysFromDateToToday = (dateValue) => {
  if (!dateValue) return null;
  const startDate = new Date(dateValue);
  if (Number.isNaN(startDate.getTime())) return null;

  startDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / 86400000));
};

const diffDaysBetweenDates = (startValue, endValue) => {
  if (!startValue || !endValue) return null;
  const startDate = new Date(startValue);
  const endDate = new Date(endValue);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000));
};

const isDateBeforeDay = (dateValue, compareValue) => {
  if (!dateValue || !compareValue) return false;
  const date = new Date(dateValue);
  const compareDate = new Date(compareValue);
  if (Number.isNaN(date.getTime()) || Number.isNaN(compareDate.getTime())) return false;

  date.setHours(0, 0, 0, 0);
  compareDate.setHours(0, 0, 0, 0);

  return date.getTime() < compareDate.getTime();
};

const buildGroupOptionsFromBahan = (bahanRows = [], pabrikRows = []) => {
  const pabrikByName = new Map(
    pabrikRows
      .filter((pabrik) => pabrik?.id && (pabrik.nama_pabrik || pabrik.nama))
      .map((pabrik) => [normalizeText(pabrik.nama_pabrik || pabrik.nama), pabrik])
  );
  const groups = new Map();

  bahanRows.forEach((bahan) => {
    const groupName = String(bahan.group_bahan || "").trim();
    if (!groupName) return;

    if (!groups.has(groupName)) {
      groups.set(groupName, {
        group_bahan: groupName,
        label: groupName,
        pabrik: [],
        bahan: [],
        warna: [],
        _pabrikKeys: new Set(),
        _warnaKeys: new Set(),
      });
    }

    const group = groups.get(groupName);
    const pabrikName = String(bahan.pabrik_bahan || "").trim();
    const matchedPabrik = pabrikByName.get(normalizeText(pabrikName));
    const pabrikKey = matchedPabrik?.id ? `id:${matchedPabrik.id}` : pabrikName ? `name:${normalizeText(pabrikName)}` : "";

    if (pabrikKey && !group._pabrikKeys.has(pabrikKey)) {
      group._pabrikKeys.add(pabrikKey);
      group.pabrik.push({
        id: matchedPabrik?.id || null,
        nama_pabrik: matchedPabrik?.nama_pabrik || pabrikName,
      });
    }

    group.bahan.push({
      id: bahan.id,
      nama_bahan: bahan.nama_bahan || bahan.nama || `Bahan #${bahan.id}`,
      warna_bahan: bahan.warna_bahan || "",
      pabrik_bahan: pabrikName,
      pabrik_id: matchedPabrik?.id || null,
    });

    const warnaName = String(bahan.warna_bahan || "").trim();
    const warnaKey = normalizeText(warnaName);
    if (warnaName && !group._warnaKeys.has(warnaKey)) {
      group._warnaKeys.add(warnaKey);
      group.warna.push(warnaName);
    }
  });

  return Array.from(groups.values())
    .map(({ _pabrikKeys, _warnaKeys, ...group }) => ({
      ...group,
      pabrik: group.pabrik.sort((a, b) => String(a.nama_pabrik || "").localeCompare(String(b.nama_pabrik || ""))),
      bahan: group.bahan.sort((a, b) => String(a.nama_bahan || "").localeCompare(String(b.nama_bahan || ""))),
      warna: group.warna.sort((a, b) => String(a).localeCompare(String(b))),
    }))
    .sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
};

const normalizeMasterGroups = (payload, pabrikRows = []) => {
  const unwrappedPayload = payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data) ? payload.data : payload;
  const rawGroups = Array.isArray(unwrappedPayload?.groups)
    ? unwrappedPayload.groups
    : Array.isArray(unwrappedPayload)
      ? unwrappedPayload
      : [];
  if (rawGroups.length > 0) {
    return rawGroups
      .map((group) => ({
        group_bahan: String(group.group_bahan || group.label || "").trim(),
        label: String(group.label || group.group_bahan || "").trim(),
        pabrik: Array.isArray(group.pabrik) ? group.pabrik : [],
        bahan: Array.isArray(group.bahan) ? group.bahan : [],
        warna: Array.isArray(group.warna) ? group.warna : [],
      }))
      .filter((group) => group.group_bahan);
  }

  const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return buildGroupOptionsFromBahan(rows, pabrikRows);
};

const SpkBahan = () => {
  const [items, setItems] = useState([]);
  const [pabrikList, setPabrikList] = useState([]);
  const [bahanList, setBahanList] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [statusFilter, setStatusFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [estimateModal, setEstimateModal] = useState({
    open: false,
    row: null,
    date: "",
    submitting: false,
  });
  // ADDED: State modal print PDF SPK Bahan.
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedSpkIds, setSelectedSpkIds] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [printItems, setPrintItems] = useState([]);
  const [isPrintListLoading, setIsPrintListLoading] = useState(false);
  const [printSearchTerm, setPrintSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const groupFieldRef = useRef(null);

  const [meta, setMeta] = useState(EMPTY_META);
  const [kpi, setKpi] = useState({
    total_spk: 0,
    total_pabrik_aktif: 0,
    total_rol: 0,
    total_tempo: 0,
  });

  const [newItem, setNewItem] = useState({
    group_bahan: "",
    pabrik_id: "",
    pabrik_nama: "",
    bahan_id: "",
    jenis_pembayaran: "Cash",
    tanggal_pemesanan: "",
    tempo_hari: "",
    warna: [{ ...DEFAULT_WARNA_ROW }],
  });

  useEffect(() => {
    const debounce = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(debounce);
  }, [searchInput]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (groupFieldRef.current && !groupFieldRef.current.contains(event.target)) {
        setIsGroupDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

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

  const showSuccessAlert = async (message) => {
    try {
      const Swal = await ensureSweetAlert();
      if (!Swal) throw new Error("SweetAlert2 tidak tersedia");

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: message || "Data SPK Bahan berhasil ditambahkan.",
        confirmButtonText: "OK",
        confirmButtonColor: "#1d4ed8",
      });
    } catch {
      showToast(message || "Data SPK Bahan berhasil ditambahkan.", "success");
    }
  };

  const fetchMasterData = useCallback(async () => {
    const toArr = (raw) => (Array.isArray(raw?.data) ? raw.data : null) ?? (Array.isArray(raw) ? raw : []);

    const [resPabrik, resMaster] = await Promise.allSettled([API.get("/pabrik"), API.get("/spk-bahan/master-options")]);
    let pabrikRows = [];

    if (resPabrik.status === "fulfilled") {
      const data = resPabrik.value.data;
      pabrikRows = toArr(data) || toArr(data?.data);
      setPabrikList(pabrikRows);
    } else {
      setPabrikList([]);
    }

    if (resMaster.status === "fulfilled") {
      const data = resMaster.value.data || {};
      const groups = normalizeMasterGroups(data?.data ?? data, pabrikRows);
      setGroupOptions(groups);
      setBahanList(groups.flatMap((group) => group.bahan || []));
    } else {
      try {
        const resBahan = await API.get("/bahan", { params: { per_page: 100 } });
        const data = resBahan.data;
        const rows = toArr(data) || toArr(data?.data);
        setBahanList(rows);
        setGroupOptions(buildGroupOptionsFromBahan(rows, pabrikRows));
      } catch {
        setBahanList([]);
        setGroupOptions([]);
      }
    }
  }, []);

  const fetchSpkBahan = useCallback(
    async (targetPage = currentPage) => {
      setLoading(true);
      setError(null);

      try {
        const res = await API.get("/spk-bahan", {
          params: {
            page: targetPage,
            per_page: perPage,
            search: searchTerm || undefined,
            status: statusFilter || undefined,
            sort_by: "id",
            sort_dir: "desc",
          },
        });

        const payload = res.data || {};
        setItems(expandSpkRowsByWarna(Array.isArray(payload.data) ? payload.data : []));
        setMeta(payload.meta || EMPTY_META);
        setKpi(
          payload.kpi || {
            total_spk: 0,
            total_pabrik_aktif: 0,
            total_rol: 0,
            total_tempo: 0,
          }
        );
      } catch (e) {
        const msg = e?.response?.data?.message || "Gagal memuat data SPK Bahan.";
        setError(msg);
        setItems([]);
        setMeta(EMPTY_META);
      } finally {
        setLoading(false);
      }
    },
    [currentPage, perPage, searchTerm, statusFilter]
  );

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  useEffect(() => {
    fetchSpkBahan(currentPage);
  }, [fetchSpkBahan, currentPage]);

  const selectedGroup = useMemo(
    () => groupOptions.find((group) => group.group_bahan === newItem.group_bahan) || null,
    [groupOptions, newItem.group_bahan]
  );

  const selectedPabrik = useMemo(
    () => pabrikList.find((pabrik) => String(pabrik.id) === String(newItem.pabrik_id)) || null,
    [newItem.pabrik_id, pabrikList]
  );

  const selectedPabrikLabel = selectedPabrik?.nama_pabrik || selectedPabrik?.nama || newItem.pabrik_nama || "";

  const filteredGroupOptions = useMemo(() => {
    const query = normalizeText(groupSearchTerm);
    if (!query) return groupOptions;

    return groupOptions.filter((group) => {
      const label = normalizeText(group.label || group.group_bahan);
      const pabrikMatch = Array.isArray(group.pabrik)
        ? group.pabrik.some((pabrik) => normalizeText(pabrik.nama_pabrik || pabrik.nama).includes(query))
        : false;
      const bahanMatch = Array.isArray(group.bahan)
        ? group.bahan.some((bahan) => normalizeText(bahan.nama_bahan).includes(query) || normalizeText(bahan.warna_bahan).includes(query))
        : false;
      return label.includes(query) || pabrikMatch || bahanMatch;
    });
  }, [groupOptions, groupSearchTerm]);

  const pabrikOptionsForSelectedGroup = useMemo(() => {
    if (!selectedGroup) return [];

    const unique = new Map();
    const addPabrik = (pabrik) => {
      const nama = getPabrikName(pabrik);
      if (!nama) return;
      const key = pabrik?.id ? `id:${pabrik.id}` : `name:${normalizeText(nama)}`;
      if (!unique.has(key)) {
        unique.set(key, {
          id: pabrik?.id || null,
          nama_pabrik: nama,
        });
      }
    };

    if (Array.isArray(selectedGroup.pabrik)) {
      selectedGroup.pabrik.forEach(addPabrik);
    }

    if (Array.isArray(selectedGroup.bahan)) {
      selectedGroup.bahan.forEach((bahan) =>
        addPabrik({
          id: bahan.pabrik_id || null,
          nama_pabrik: bahan.pabrik_bahan || "",
        })
      );
    }

    return Array.from(unique.values()).sort((a, b) => getPabrikName(a).localeCompare(getPabrikName(b)));
  }, [selectedGroup]);

  const filteredBahanOptions = useMemo(() => {
    if (!newItem.group_bahan || !selectedPabrikLabel) return [];
    const source = selectedGroup ? (Array.isArray(selectedGroup.bahan) ? selectedGroup.bahan : []) : bahanList.filter((bahan) => bahan.group_bahan === newItem.group_bahan);
    const pabrikKey = normalizeText(selectedPabrikLabel);

    return source.filter((bahan) => {
      if (newItem.pabrik_id && bahan.pabrik_id) {
        return String(bahan.pabrik_id) === String(newItem.pabrik_id);
      }

      return normalizeText(bahan.pabrik_bahan) === pabrikKey;
    });
  }, [bahanList, newItem.group_bahan, newItem.pabrik_id, selectedGroup, selectedPabrikLabel]);

  const uniqueBahanOptions = useMemo(() => {
    const unique = new Map();

    filteredBahanOptions.forEach((bahan) => {
      const bahanName = String(bahan.nama_bahan || bahan.nama || `Bahan #${bahan.id}`).trim();
      const key = normalizeText(bahanName);
      if (key && !unique.has(key)) {
        unique.set(key, {
          ...bahan,
          nama_bahan: bahanName,
        });
      }
    });

    return Array.from(unique.values());
  }, [filteredBahanOptions]);

  const availableWarnaOptions = useMemo(() => {
    if (!newItem.group_bahan || !selectedPabrikLabel) return [];

    return Array.from(
      new Set(
        filteredBahanOptions
          .map((bahan) => String(bahan.warna_bahan || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [filteredBahanOptions, newItem.group_bahan, selectedPabrikLabel]);

  const isTempoPayment = normalizeText(newItem.jenis_pembayaran) === "tempo";
  const tempoDueDate = isTempoPayment && newItem.tanggal_pemesanan && newItem.tempo_hari ? addDaysFromDate(newItem.tanggal_pemesanan, newItem.tempo_hari) : "";

  const resetForm = () => {
    setGroupSearchTerm("");
    setIsGroupDropdownOpen(false);
    setNewItem({
      group_bahan: "",
      pabrik_id: "",
      pabrik_nama: "",
      bahan_id: "",
      jenis_pembayaran: "Cash",
      tanggal_pemesanan: "",
      tempo_hari: "",
      warna: [{ ...DEFAULT_WARNA_ROW }],
    });
    setShowForm(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "jenis_pembayaran") {
      setNewItem((prev) => ({
        ...prev,
        jenis_pembayaran: value,
        tempo_hari: normalizeText(value) === "tempo" ? prev.tempo_hari : "",
      }));
      return;
    }

    setNewItem((prev) => ({ ...prev, [name]: value }));
  };

  const clearGroupSelection = () => {
    setNewItem((prev) => ({
      ...prev,
      group_bahan: "",
      pabrik_id: "",
      pabrik_nama: "",
      bahan_id: "",
      warna: [{ ...DEFAULT_WARNA_ROW }],
    }));
  };

  const selectGroupOption = (group) => {
    const pabrikOptions = [];
    const seenPabrik = new Set();

    if (Array.isArray(group?.pabrik)) {
      group.pabrik.forEach((pabrik) => {
        const nama = getPabrikName(pabrik);
        const key = pabrik?.id ? `id:${pabrik.id}` : `name:${normalizeText(nama)}`;
        if (nama && !seenPabrik.has(key)) {
          seenPabrik.add(key);
          pabrikOptions.push(pabrik);
        }
      });
    }

    if (Array.isArray(group?.bahan)) {
      group.bahan.forEach((bahan) => {
        const nama = String(bahan.pabrik_bahan || "").trim();
        const key = bahan.pabrik_id ? `id:${bahan.pabrik_id}` : `name:${normalizeText(nama)}`;
        if (nama && !seenPabrik.has(key)) {
          seenPabrik.add(key);
          pabrikOptions.push({ id: bahan.pabrik_id || null, nama_pabrik: nama });
        }
      });
    }

    const onlyPabrik = pabrikOptions.length === 1 ? pabrikOptions[0] : null;

    setGroupSearchTerm(group?.label || group?.group_bahan || "");
    setIsGroupDropdownOpen(false);
    setNewItem((prev) => ({
      ...prev,
      group_bahan: group?.group_bahan || "",
      pabrik_id: onlyPabrik?.id ? String(onlyPabrik.id) : "",
      pabrik_nama: onlyPabrik ? getPabrikName(onlyPabrik) : "",
      bahan_id: "",
      warna: [{ ...DEFAULT_WARNA_ROW }],
    }));
  };

  const handleGroupSearchChange = (e) => {
    const value = e.target.value;
    setGroupSearchTerm(value);
    setIsGroupDropdownOpen(true);

    if (!value.trim()) {
      clearGroupSelection();
      return;
    }

    const exactMatch = groupOptions.find((group) => normalizeText(group.label || group.group_bahan) === normalizeText(value));
    if (exactMatch) {
      selectGroupOption(exactMatch);
      return;
    }

    if (newItem.group_bahan) {
      clearGroupSelection();
    }
  };

  const handlePabrikChange = (e) => {
    const selectedValue = e.target.value;
    const selectedOption = pabrikOptionsForSelectedGroup.find((pabrik) => getPabrikOptionValue(pabrik) === selectedValue) || null;

    setNewItem((prev) => ({
      ...prev,
      pabrik_id: selectedOption?.id ? String(selectedOption.id) : "",
      pabrik_nama: selectedOption ? getPabrikName(selectedOption) : "",
      bahan_id: "",
      warna: [{ ...DEFAULT_WARNA_ROW }],
    }));
  };

  const handleBahanChange = (e) => {
    const bahanId = e.target.value;

    setNewItem((prev) => ({
      ...prev,
      bahan_id: bahanId,
      warna: [{ ...DEFAULT_WARNA_ROW }],
    }));
  };

  const addWarnaRow = () => {
    if (availableWarnaOptions.length === 0) {
      showToast("Pilih grup bahan yang memiliki warna di master bahan.", "warning");
      return;
    }

    setNewItem((prev) => ({
      ...prev,
      warna: [...prev.warna, { ...DEFAULT_WARNA_ROW }],
    }));
  };

  const removeWarnaRow = (index) => {
    setNewItem((prev) => ({
      ...prev,
      warna: prev.warna.length > 1 ? prev.warna.filter((_, i) => i !== index) : prev.warna,
    }));
  };

  const handleWarnaChange = (index, field, value) => {
    setNewItem((prev) => {
      const arr = [...prev.warna];
      arr[index] = { ...arr[index], [field]: field === "jumlah_rol" ? Math.max(1, parseInt(value, 10) || 1) : value };
      return { ...prev, warna: arr };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newItem.group_bahan || !selectedPabrikLabel || !newItem.bahan_id) {
      showToast("Grup bahan, pabrik, dan bahan wajib diisi.", "warning");
      return;
    }

    if (isTempoPayment && (!newItem.tempo_hari || parseInt(newItem.tempo_hari, 10) < 1)) {
      showToast("Isi jumlah hari tempo pembayaran minimal 1 hari.", "warning");
      return;
    }

    if (!newItem.tanggal_pemesanan) {
      showToast("Tanggal pemesanan wajib diisi.", "warning");
      return;
    }

    const validWarna = newItem.warna
      .map((w) => ({ warna: (w.warna || "").trim(), jumlah_rol: Math.max(1, parseInt(w.jumlah_rol, 10) || 1) }))
      .filter((w) => w.warna !== "");

    if (validWarna.length === 0) {
      showToast("Minimal 1 detail warna dari grup bahan wajib diisi.", "warning");
      return;
    }

    const invalidWarna = validWarna.find((w) => !availableWarnaOptions.some((option) => normalizeText(option) === normalizeText(w.warna)));
    if (invalidWarna) {
      showToast(`Warna ${invalidWarna.warna} tidak ada di grup bahan yang dipilih.`, "warning");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        group_bahan: newItem.group_bahan,
        pabrik_id: newItem.pabrik_id ? parseInt(newItem.pabrik_id, 10) : undefined,
        pabrik_nama: selectedPabrikLabel,
        bahan_id: parseInt(newItem.bahan_id, 10),
        jenis_pembayaran: newItem.jenis_pembayaran || "Cash",
        tanggal_pemesanan: newItem.tanggal_pemesanan,
        tanggal_jatuh_tempo: isTempoPayment ? tempoDueDate : undefined,
        tanggal_pembayaran: isTempoPayment ? tempoDueDate : newItem.tanggal_pemesanan,
        tempo_hari: isTempoPayment ? parseInt(newItem.tempo_hari, 10) : undefined,
        warna: validWarna,
      };

      const res = await API.post("/spk-bahan", payload);

      resetForm();
      setCurrentPage(1);
      await fetchSpkBahan(1);
      await showSuccessAlert(res.data?.message || "Data SPK Bahan berhasil ditambahkan.");
    } catch (err) {
      const msg = err.response?.data?.message || (err.response?.data?.errors ? Object.values(err.response.data.errors || {}).flat().join(", ") : null) || "Gagal menyimpan SPK Bahan.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openEstimateModal = (row) => {
    setEstimateModal({
      open: true,
      row,
      date: row?.estimasi_pengiriman || "",
      submitting: false,
    });
  };

  const closeEstimateModal = () => {
    setEstimateModal({
      open: false,
      row: null,
      date: "",
      submitting: false,
    });
  };

  const saveEstimatePengiriman = async (e) => {
    e.preventDefault();

    if (!estimateModal.row?.id) return;

    const tanggalPemesanan = estimateModal.row.tanggal_pemesanan || estimateModal.row.created_at;
    if (estimateModal.date && tanggalPemesanan && diffDaysBetweenDates(tanggalPemesanan, estimateModal.date) === null) {
      showToast("Tanggal estimasi pengiriman tidak valid.", "warning");
      return;
    }

    if (estimateModal.date && tanggalPemesanan && isDateBeforeDay(estimateModal.date, tanggalPemesanan)) {
      showToast("Estimasi pengiriman tidak boleh lebih awal dari tanggal pemesanan.", "warning");
      return;
    }

    try {
      setEstimateModal((prev) => ({ ...prev, submitting: true }));
      const res = await API.patch(`/spk-bahan/${estimateModal.row.id}/estimasi-pengiriman`, {
        estimasi_pengiriman: estimateModal.date || null,
        spk_bahan_warna_id: getSpkWarnaRowId(estimateModal.row),
      });

      const updatedRow = res.data?.data;
      if (updatedRow) {
        const expandedRows = expandSpkRowsByWarna([updatedRow]);
        setItems((prev) =>
          prev.map((item) => {
            if (String(getSpkRowId(item)) !== String(updatedRow.id)) return item;
            return expandedRows.find((row) => getRowKey(row) === getRowKey(item)) || item;
          })
        );
      } else {
        await fetchSpkBahan(currentPage);
      }

      closeEstimateModal();
      showToast(res.data?.message || "Estimasi pengiriman berhasil disimpan.", "success");
    } catch (err) {
      const msg = err.response?.data?.message || (err.response?.data?.errors ? Object.values(err.response.data.errors || {}).flat().join(", ") : null) || "Gagal menyimpan estimasi pengiriman.";
      showToast(msg, "error");
      setEstimateModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const clearEstimatePengiriman = async () => {
    if (!estimateModal.row?.id) return;

    try {
      setEstimateModal((prev) => ({ ...prev, submitting: true, date: "" }));
      const res = await API.patch(`/spk-bahan/${estimateModal.row.id}/estimasi-pengiriman`, {
        estimasi_pengiriman: null,
        spk_bahan_warna_id: getSpkWarnaRowId(estimateModal.row),
      });

      const updatedRow = res.data?.data;
      if (updatedRow) {
        const expandedRows = expandSpkRowsByWarna([updatedRow]);
        setItems((prev) =>
          prev.map((item) => {
            if (String(getSpkRowId(item)) !== String(updatedRow.id)) return item;
            return expandedRows.find((row) => getRowKey(row) === getRowKey(item)) || item;
          })
        );
      } else {
        await fetchSpkBahan(currentPage);
      }

      closeEstimateModal();
      showToast(res.data?.message || "Estimasi pengiriman berhasil dihapus.", "success");
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menghapus estimasi pengiriman.";
      showToast(msg, "error");
      setEstimateModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // ADDED: Ambil semua SPK yang tersedia untuk ditampilkan di modal print.
  const fetchPrintSpkList = async () => {
    const normalizeRows = (payload) => (Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []);
    const normalizeMeta = (payload) => payload?.meta || payload || {};
    const perPageForPrint = 100;

    setIsPrintListLoading(true);

    try {
      const firstResponse = await API.get("/spk-bahan", {
        params: {
          page: 1,
          per_page: perPageForPrint,
          sort_by: "id",
          sort_dir: "desc",
        },
      });

      const firstPayload = firstResponse.data || {};
      const firstRows = normalizeRows(firstPayload);
      const firstMeta = normalizeMeta(firstPayload);
      const lastPage = Math.max(1, parseInt(firstMeta.last_page, 10) || 1);

      if (lastPage <= 1) {
        setPrintItems(firstRows);
        return;
      }

      const pageRequests = Array.from({ length: lastPage - 1 }, (_, index) =>
        API.get("/spk-bahan", {
          params: {
            page: index + 2,
            per_page: perPageForPrint,
            sort_by: "id",
            sort_dir: "desc",
          },
        })
      );

      const restResponses = await Promise.all(pageRequests);
      const restRows = restResponses.flatMap((response) => normalizeRows(response.data || {}));
      setPrintItems([...firstRows, ...restRows]);
    } catch (err) {
      setPrintItems(items);
      showToast("Gagal memuat daftar lengkap SPK. Menampilkan data pada halaman ini.", "warning");
    } finally {
      setIsPrintListLoading(false);
    }
  };

  // ADDED: Buka/tutup modal print PDF sekaligus reset pilihan.
  const openPrintModal = () => {
    setSelectedSpkIds([]);
    setPrintSearchTerm("");
    setIsPrintModalOpen(true);
    fetchPrintSpkList();
  };

  const closePrintModal = () => {
    if (isDownloading) return;
    setIsPrintModalOpen(false);
    setSelectedSpkIds([]);
    setPrintItems([]);
    setPrintSearchTerm("");
  };

  // ADDED: Toggle checkbox per SPK dan select all.
  const togglePrintSpkSelection = (spkId) => {
    const normalizedId = parseInt(spkId, 10);
    if (!normalizedId) return;

    setSelectedSpkIds((prev) =>
      prev.includes(normalizedId)
        ? prev.filter((selectedId) => selectedId !== normalizedId)
        : [...prev, normalizedId]
    );
  };

  const toggleAllPrintSelection = (checked) => {
    const visiblePrintIds = filteredPrintItems
      .map((row) => parseInt(row.id, 10))
      .filter(Boolean);

    if (!checked) {
      setSelectedSpkIds((prev) => prev.filter((selectedId) => !visiblePrintIds.includes(selectedId)));
      return;
    }

    setSelectedSpkIds((prev) => Array.from(new Set([...prev, ...visiblePrintIds])));
  };

  // ADDED: Download PDF sebagai blob dan tutup modal setelah browser men-trigger download.
  const handleDownloadPrintPdf = async () => {
    if (selectedSpkIds.length === 0) {
      showToast("Pilih minimal 1 SPK untuk di-print.", "warning");
      return;
    }

    try {
      setIsDownloading(true);

      const response = await API.post(
        "/spk-bahan/print-pdf",
        { spk_ids: selectedSpkIds },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `SPK-Bahan-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setIsPrintModalOpen(false);
      setSelectedSpkIds([]);
      setPrintItems([]);
      setPrintSearchTerm("");
      showToast("PDF SPK Bahan berhasil diunduh.", "success");
    } catch (err) {
      let msg = "Gagal mengunduh PDF SPK Bahan.";

      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          msg = json?.message || msg;
        } catch {
          // ADDED: Abaikan parsing blob error jika bukan JSON.
        }
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }

      showToast(msg, "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const formatWarnaSummary = (warnaArr) => {
    if (!warnaArr || !Array.isArray(warnaArr) || warnaArr.length === 0) return "-";
    return warnaArr.map((w) => `${w.warna || "-"} (${w.jumlah_rol || 0})`).join(", ");
  };

  const formatDate = (d) => {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("id-ID");
    } catch {
      return d;
    }
  };

  const getLamaPemesanan = (row) => {
    if (row?.estimasi_pengiriman) {
      return diffDaysBetweenDates(row?.tanggal_pemesanan || row?.created_at, row.estimasi_pengiriman);
    }

    if (row?.lama_pemesanan !== null && row?.lama_pemesanan !== undefined) {
      return row.lama_pemesanan;
    }

    return diffDaysFromDateToToday(row?.tanggal_pemesanan || row?.created_at);
  };

  // ADDED: Ambil sisa dipesan dari payload backend, dengan fallback aman ke total rol jika field belum tersedia.
  const getSisaDipesan = (row, rowRol) => {
    const candidates = [row?.sisa_dipesan, row?.pdf_sisa_dipesan, row?.pdf_subtotal?.sisa_dipesan];

    for (const value of candidates) {
      if (value === null || value === undefined || value === "") continue;
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }

    return rowRol;
  };

  const getDikirim = (row) => {
    const candidates = [row?.pesanan_dikirim, row?.pdf_pesanan_dikirim, row?.pdf_subtotal?.pesanan_dikirim];

    for (const value of candidates) {
      if (value === null || value === undefined || value === "") continue;
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }

    return 0;
  };

  const getLebihKirim = (row) => {
    const candidates = [row?.lebih_kirim, row?.pdf_lebih_kirim, row?.pdf_subtotal?.lebih_kirim];

    for (const value of candidates) {
      if (value === null || value === undefined || value === "") continue;
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }

    const dikirim = parseInt(row?.pesanan_dikirim ?? row?.pdf_pesanan_dikirim ?? 0, 10) || 0;
    const dipesan = parseInt(row?.stok_dipesan ?? row?.jumlah_rol ?? row?.jumlah ?? 0, 10) || 0;
    return Math.max(0, dikirim - dipesan);
  };

  const formatLamaPemesanan = (hari) => {
    if (hari === null || hari === undefined) return "-";
    return `${hari} hari`;
  };

  const getStatusClass = (status) => {
    const cleaned = (status || "").toLowerCase().trim();
    if (!cleaned) return "default";
    if (cleaned.includes("selesai")) return "selesai";
    if (cleaned.includes("proses")) return "proses";
    if (cleaned.includes("pending")) return "pending";
    if (cleaned.includes("batal")) return "dibatalkan";
    return cleaned.replace(/\s+/g, "-");
  };

  const getWarnaClass = (warnaName) => {
    const cleaned = (warnaName || "").toLowerCase().trim();
    if (!cleaned) return "default";
    if (cleaned.includes("putih")) return "putih";
    if (cleaned.includes("hitam")) return "hitam";
    if (cleaned.includes("merah") || cleaned.includes("maroon")) return "merah";
    if (cleaned.includes("biru") || cleaned.includes("navy")) return "biru";
    if (cleaned.includes("hijau")) return "hijau";
    if (cleaned.includes("kuning") || cleaned.includes("khaki")) return "kuning";
    if (cleaned.includes("abu")) return "abu";
    if (cleaned.includes("coklat") || cleaned.includes("beige")) return "coklat";
    if (cleaned.includes("pink")) return "pink";
    if (cleaned.includes("ungu")) return "ungu";
    if (cleaned.includes("orange")) return "orange";
    return "default";
  };

  const paginationNumbers = useMemo(() => {
    const totalPages = meta.last_page || 1;
    const page = meta.current_page || 1;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (page <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (page >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  }, [meta.current_page, meta.last_page]);

  // ADDED: State turunan untuk checkbox modal print.
  const filteredPrintItems = useMemo(() => {
    const keyword = normalizeText(printSearchTerm);
    if (!keyword) return printItems;

    return printItems.filter((row) => buildPrintSpkSearchText(row).includes(keyword));
  }, [printItems, printSearchTerm]);
  const selectedPrintIdSet = useMemo(() => new Set(selectedSpkIds.map((id) => String(id))), [selectedSpkIds]);
  const printItemIds = useMemo(() => filteredPrintItems.map((row) => parseInt(row.id, 10)).filter(Boolean), [filteredPrintItems]);
  const isAllPrintSelected = printItemIds.length > 0 && printItemIds.every((id) => selectedPrintIdSet.has(String(id)));

  return (
    <div className="ks-page pl-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Pemesanan Bahan</h1>
          <span className="ks-header-sub">
            Monitoring order pembelian bahan, warna, dan pembayaran per pabrik.
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
                placeholder="Cari pabrik, bahan, warna, atau status..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ paddingLeft: "30px", width: "100%" }}
              />
              {searchInput && (
                <button type="button" className="pl-search-clear" onClick={() => {
                  setSearchInput("");
                  setCurrentPage(1);
                }}>
                  <FaTimes />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", outline: "none" }}
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={perPage}
              onChange={(e) => {
                const nextPerPage = parseInt(e.target.value, 10);
                setPerPage(nextPerPage);
                setCurrentPage(1);
              }}
              style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", outline: "none" }}
            >
              {PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} baris
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            <button
              type="button"
              className="ks-btn is-secondary"
              onClick={openPrintModal}
            >
              <FaPrint /> Print PDF
            </button>
            <button
              type="button"
              className="ks-btn is-primary"
              onClick={() => setShowForm(true)}
            >
              <FaPlus /> Tambah SPK
            </button>
          </div>
        </div>

          {loading ? (
            <p className="spkb-state">Memuat data SPK Bahan...</p>
          ) : error ? (
            <p className="spkb-state spkb-state-error">{error}</p>
          ) : items.length === 0 ? (
            <p className="spkb-state">Belum ada data SPK Bahan yang sesuai pencarian.</p>
          ) : (
            <>
              <div className="ks-grid-scroll">
                <table className="ks-grid">
                  <thead>
                    <tr>
                      <th className="spkb-col-no" style={{ width: "4%" }}>No</th>
                      <th className="spkb-col-id" style={{ width: "8%" }}>ID SPK</th>
                      <th className="spkb-col-tanggal" style={{ width: "9%" }}>Tgl Pemesanan</th>
                      <th className="spkb-col-pabrik" style={{ width: "12%" }}>Pabrik</th>
                      <th className="spkb-col-bahan" style={{ width: "12%" }}>Bahan</th>
                      <th className="spkb-col-warna" style={{ width: "20%" }}>Detail Warna</th>
                      <th className="spkb-col-rol" style={{ width: "5%" }}>Total Rol</th>
                      <th className="spkb-col-dikirim" style={{ width: "5%" }}>Dikirim</th>
                      <th className="spkb-col-sisa" style={{ width: "5%" }}>Sisa</th>
                      <th className="spkb-col-lebih" style={{ width: "5%" }}>Lebih</th>
                      <th className="spkb-col-estimasi" style={{ width: "10%" }}>Estimasi</th>
                      <th className="spkb-col-lama" style={{ width: "5%" }}>Lama</th>
                      <th className="spkb-col-status" style={{ width: "5%" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, index) => {
                      const rowRol =
                        Array.isArray(row.warna) && row.warna.length > 0
                          ? row.warna.reduce((sum, w) => sum + (parseInt(w.jumlah_rol, 10) || 0), 0)
                          : parseInt(row.jumlah, 10) || 0;
                      const rowDikirim = getDikirim(row);
                      const rowSisaDipesan = getSisaDipesan(row, rowRol);
                      const rowLebihKirim = getLebihKirim(row);

                      const number = ((meta.current_page || 1) - 1) * (meta.per_page || perPage) + index + 1;

                      return (
                        <tr key={getRowKey(row)}>
                          <td className="spkb-col-no">{number}</td>
                          <td className="spkb-id spkb-col-id">#{getSpkRowId(row)}</td>
                          <td className="spkb-col-tanggal">{formatDate(row.tanggal_pemesanan || row.created_at)}</td>
                          <td className="spkb-cell-pabrik">
                            <span className="spkb-chip" title={row.pabrik?.nama_pabrik || "-"}>
                              <FaIndustry />
                              <span className="spkb-chip-label">{row.pabrik?.nama_pabrik || "-"}</span>
                            </span>
                          </td>
                          <td className="spkb-cell-bold spkb-col-bahan" title={row.bahan?.nama_bahan || "-"}>
                            {row.bahan?.nama_bahan || "-"}
                          </td>
                          <td className="spkb-cell-warna">
                            {Array.isArray(row.warna) && row.warna.length > 0 ? (
                              <div className="spkb-warna-list">
                                {row.warna.map((w, wi) => (
                                  <span key={`${row.id}-warna-${wi}`} className={`spkb-warna-chip spkb-warna-${getWarnaClass(w.warna)}`}>
                                    <span className="spkb-warna-dot" />
                                    {(w.warna || "-").trim() || "-"} ({w.jumlah_rol || 0})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              formatWarnaSummary(row.warna)
                          )}
                        </td>
                        <td className="spkb-cell-bold spkb-col-rol">{rowRol || "-"}</td>
                        <td className="spkb-cell-bold spkb-col-dikirim">{rowDikirim || rowDikirim === 0 ? rowDikirim : "-"}</td>
                        <td className="spkb-cell-bold spkb-col-sisa">{rowSisaDipesan || rowSisaDipesan === 0 ? rowSisaDipesan : "-"}</td>
                        <td className={`spkb-cell-bold spkb-col-lebih ${rowLebihKirim > 0 ? "spkb-cell-over" : ""}`}>
                          {rowLebihKirim || rowLebihKirim === 0 ? rowLebihKirim : "-"}
                        </td>
                        <td className="spkb-col-estimasi">
                          <button
                            type="button"
                            className={`spkb-estimate-btn ${row.estimasi_pengiriman ? "spkb-estimate-btn-filled" : "spkb-estimate-btn-empty"}`}
                            onClick={() => openEstimateModal(row)}
                          >
                            <FaCalendarAlt />
                            <span>{row.estimasi_pengiriman ? formatDate(row.estimasi_pengiriman) : "Input tanggal"}</span>
                          </button>
                        </td>
                        <td className="spkb-col-lama">{formatLamaPemesanan(getLamaPemesanan(row))}</td>
                          <td className="spkb-col-status">
                            <span className={`spkb-badge spkb-badge-${getStatusClass(row.status)}`}>
                              <span className="spkb-badge-dot" />
                              {row.status || "-"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="spkb-pagination-wrap">
                <div className="spkb-pagination-info">
                  Menampilkan {meta.from || 0} - {meta.to || 0} dari {meta.total || 0} data
                </div>

                <div className="spkb-pagination">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={(meta.current_page || 1) <= 1}
                  >
                    Sebelumnya
                  </button>

                  {paginationNumbers.map((page, idx) =>
                    page === "..." ? (
                      <span key={`dots-${idx}`} className="spkb-page-dots">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${page}`}
                        type="button"
                        className={(meta.current_page || 1) === page ? "active" : ""}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(meta.last_page || 1, prev + 1))}
                    disabled={(meta.current_page || 1) >= (meta.last_page || 1)}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </>
          )}
        </section>


      {/* // ADDED: Modal multi-select SPK untuk print PDF. */}
      {isPrintModalOpen && (
        <div className="spkb-modal" onClick={closePrintModal}>
          <div className="spkb-modal-content" style={{ width: "min(980px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="spkb-modal-head">
              <h3>Pilih SPK untuk di-Print</h3>
              <p>{selectedSpkIds.length} SPK dipilih</p>
            </div>

            <div className="spkb-form">
              {isPrintListLoading ? (
                <p className="spkb-state">Memuat daftar SPK pemesanan...</p>
              ) : printItems.length === 0 ? (
                <p className="spkb-state">Belum ada SPK pemesanan yang tersedia untuk di-print.</p>
              ) : (
                <>
                  {/* // ADDED: Search lokal untuk daftar SPK di modal print. */}
                  <label className="spkb-search-box" style={{ width: "100%" }}>
                    <FaSearch />
                    <input
                      type="text"
                      placeholder="Cari ID SPK, tanggal, nama bahan, pabrik, warna, atau status..."
                      value={printSearchTerm}
                      onChange={(e) => setPrintSearchTerm(e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <p style={{ margin: "-8px 0 0", color: "#64748b", fontSize: 12, fontWeight: 700 }}>
                    Menampilkan {filteredPrintItems.length} dari {printItems.length} SPK
                  </p>

                  {filteredPrintItems.length === 0 ? (
                    <p className="spkb-state">SPK tidak ditemukan. Coba kata kunci lain.</p>
                  ) : (
                    <div className="spkb-table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: 12 }}>
                      <table className="spkb-table">
                        <thead>
                          <tr>
                            <th style={{ width: 130 }}>
                              <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={isAllPrintSelected}
                                  onChange={(e) => toggleAllPrintSelection(e.target.checked)}
                                  disabled={isDownloading || filteredPrintItems.length === 0}
                                />
                                Select All
                              </label>
                            </th>
                            <th>ID SPK</th>
                            <th>Tanggal</th>
                            <th>Nama Bahan</th>
                            <th>Pabrik</th>
                            <th>Detail Warna</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPrintItems.map((row) => (
                            <tr key={`print-spk-${row.id}`}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedPrintIdSet.has(String(row.id))}
                                  onChange={() => togglePrintSpkSelection(row.id)}
                                  disabled={isDownloading}
                                />
                              </td>
                              <td className="spkb-id">#{row.id}</td>
                              <td>{formatDate(row.tanggal_pemesanan || row.created_at)}</td>
                              <td className="spkb-cell-bold" title={row.bahan?.nama_bahan || "-"}>
                                {row.bahan?.nama_bahan || "-"}
                              </td>
                              <td>{row.pabrik?.nama_pabrik || row.bahan?.pabrik_bahan || "-"}</td>
                              <td>{formatWarnaSummary(row.warna)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              <div className="spkb-form-actions" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                <span style={{ marginRight: "auto", alignSelf: "center", color: "#64748b", fontWeight: 700 }}>
                  {selectedSpkIds.length} SPK dipilih
                </span>
                <button type="button" className="ks-btn is-secondary" onClick={closePrintModal} disabled={isDownloading}>
                  Batal
                </button>
                <button
                  type="button"
                  className="ks-btn is-primary"
                  onClick={handleDownloadPrintPdf}
                  disabled={selectedSpkIds.length === 0 || isDownloading || isPrintListLoading}
                >
                  {isDownloading ? "Mengunduh..." : "Download PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="spkb-modal" onClick={resetForm}>
          <div className="spkb-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="spkb-modal-head">
              <h3>Tambah SPK Bahan</h3>
              <p>Lengkapi data order bahan per pabrik untuk kebutuhan produksi.</p>
            </div>

            <form onSubmit={handleSubmit} className="spkb-form">
              <div className="spkb-form-row">
                <div className="spkb-form-group">
                  <label>Grup Bahan *</label>
                  <div className="spkb-searchable-select" ref={groupFieldRef}>
                    <div className="spkb-searchable-select-input">
                      <FaSearch />
                      <input
                        type="text"
                        value={groupSearchTerm}
                        onChange={handleGroupSearchChange}
                        onFocus={() => setIsGroupDropdownOpen(true)}
                        placeholder="Cari dan pilih grup bahan..."
                        autoComplete="off"
                      />
                    </div>

                    {isGroupDropdownOpen && (
                      <div className="spkb-searchable-options">
                        {filteredGroupOptions.length > 0 ? (
                          filteredGroupOptions.slice(0, 12).map((group) => (
                            <button
                              key={group.group_bahan}
                              type="button"
                              className="spkb-searchable-option"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                selectGroupOption(group);
                              }}
                            >
                              <span>{group.label || group.group_bahan}</span>
                              <small>
                                {Array.isArray(group.bahan) ? group.bahan.length : 0} bahan
                              </small>
                            </button>
                          ))
                        ) : (
                          <div className="spkb-searchable-empty">Grup tidak ditemukan.</div>
                        )}
                      </div>
                    )}
                  </div>
                  <input type="hidden" name="group_bahan" value={newItem.group_bahan} required />
                </div>
                <div className="spkb-form-group">
                  <label>Pabrik *</label>
                  <select
                    name="pabrik_id"
                    value={selectedPabrikLabel ? `${newItem.pabrik_id || ""}::${selectedPabrikLabel}` : ""}
                    onChange={handlePabrikChange}
                    disabled={!newItem.group_bahan || pabrikOptionsForSelectedGroup.length === 0}
                    required
                  >
                    <option value="">
                      {!newItem.group_bahan
                        ? "Pilih grup dahulu"
                        : pabrikOptionsForSelectedGroup.length === 0
                          ? "Pabrik belum terhubung"
                          : "Pilih Pabrik"}
                    </option>
                    {pabrikOptionsForSelectedGroup.map((pabrik) => (
                      <option key={getPabrikOptionValue(pabrik)} value={getPabrikOptionValue(pabrik)}>
                        {getPabrikName(pabrik)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="spkb-form-row">
                <div className="spkb-form-group">
                  <label>Bahan *</label>
                  <select name="bahan_id" value={newItem.bahan_id} onChange={handleBahanChange} disabled={!newItem.group_bahan || !selectedPabrikLabel} required>
                    <option value="">
                      {!newItem.group_bahan ? "Pilih grup dahulu" : !selectedPabrikLabel ? "Pilih pabrik dahulu" : "Pilih Bahan"}
                    </option>
                    {uniqueBahanOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nama_bahan || b.nama || `Bahan #${b.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="spkb-form-group">
                  <label>Jenis Pembayaran *</label>
                  <select name="jenis_pembayaran" value={newItem.jenis_pembayaran} onChange={handleInputChange}>
                    {JENIS_PEMBAYARAN_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="spkb-form-row">
                <div className="spkb-form-group">
                  <label>Tanggal Pemesanan *</label>
                  <input type="date" name="tanggal_pemesanan" value={newItem.tanggal_pemesanan} onChange={handleInputChange} required />
                </div>
                <div className="spkb-form-group">
                  <label>{isTempoPayment ? "Tempo Pembayaran (hari) *" : "Tempo Pembayaran"}</label>
                  {isTempoPayment ? (
                    <input type="number" min={1} name="tempo_hari" value={newItem.tempo_hari} onChange={handleInputChange} placeholder="Contoh: 30" required />
                  ) : (
                    <input type="text" value="Tidak ada tempo" disabled />
                  )}
                </div>
              </div>

              <div className="spkb-color-box">
                <div className="spkb-color-box-head">
                  <div>
                    <h4>Detail Warna</h4>
                    <p>Warna mengikuti master bahan pada grup yang dipilih.</p>
                  </div>
                  <button type="button" className="spkb-btn-secondary" onClick={addWarnaRow} disabled={availableWarnaOptions.length === 0}>
                    <FaPlus /> Tambah Baris
                  </button>
                </div>

                {newItem.warna.map((w, wi) => (
                  <div key={wi} className="spkb-color-row">
                    <div className="spkb-form-group spkb-color-name">
                      <label>Warna</label>
                      <select
                        value={w.warna}
                        onChange={(e) => handleWarnaChange(wi, "warna", e.target.value)}
                        disabled={availableWarnaOptions.length === 0}
                      >
                        <option value="">{newItem.group_bahan && selectedPabrikLabel ? "Pilih Warna" : "Pilih grup dan pabrik dahulu"}</option>
                        {availableWarnaOptions.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="spkb-form-group spkb-color-total">
                      <label>Jumlah Rol</label>
                      <input type="number" min={1} value={w.jumlah_rol} onChange={(e) => handleWarnaChange(wi, "jumlah_rol", e.target.value)} />
                    </div>
                    <div className="spkb-color-action">
                      <button type="button" className="spkb-btn-icon-delete" onClick={() => removeWarnaRow(wi)} title="Hapus baris" disabled={newItem.warna.length <= 1}>
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="spkb-color-footer">
                  <FaLayerGroup />
                  Total rol:
                  <strong>{newItem.warna.reduce((s, w) => s + (parseInt(w.jumlah_rol, 10) || 0), 0)}</strong>
                </div>
              </div>

              <div className="spkb-form-actions" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                <button type="button" className="ks-btn is-secondary" onClick={resetForm}>
                  Batal
                </button>
                <button type="submit" className="ks-btn is-primary" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan SPK"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {estimateModal.open && (
        <div className="spkb-modal" onClick={estimateModal.submitting ? undefined : closeEstimateModal}>
          <div className="spkb-modal-content spkb-estimate-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="spkb-modal-head">
              <h3>Estimasi Pengiriman</h3>
              <p>Atur tanggal estimasi agar lama pesan dihitung sampai tanggal estimasi.</p>
            </div>

            <form className="spkb-form" onSubmit={saveEstimatePengiriman}>
              <div className="spkb-estimate-summary">
                <div>
                  <span>ID SPK</span>
                  <strong>#{getSpkRowId(estimateModal.row) || "-"}</strong>
                </div>
                <div>
                  <span>Warna</span>
                  <strong>{estimateModal.row?._warnaDetail?.warna || estimateModal.row?.warna?.[0]?.warna || "-"}</strong>
                </div>
                <div>
                  <span>Tgl Pemesanan</span>
                  <strong>{formatDate(estimateModal.row?.tanggal_pemesanan || estimateModal.row?.created_at)}</strong>
                </div>
              </div>

              <div className="spkb-form-group">
                <label>Tanggal Estimasi Pengiriman</label>
                <input
                  type="date"
                  value={estimateModal.date}
                  min={toDateInputValue(estimateModal.row?.tanggal_pemesanan || estimateModal.row?.created_at)}
                  onChange={(e) => setEstimateModal((prev) => ({ ...prev, date: e.target.value }))}
                  disabled={estimateModal.submitting}
                  required
                />
                {estimateModal.date && (
                  <small>
                    Lama pesan menjadi {formatLamaPemesanan(diffDaysBetweenDates(estimateModal.row?.tanggal_pemesanan || estimateModal.row?.created_at, estimateModal.date))}
                  </small>
                )}
              </div>

              <div className="spkb-form-actions" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                {estimateModal.row?.estimasi_pengiriman && (
                  <button type="button" className="ks-btn is-secondary" style={{ color: "#ef4444" }} onClick={clearEstimatePengiriman} disabled={estimateModal.submitting}>
                    Hapus Estimasi
                  </button>
                )}
                <button type="button" className="ks-btn is-secondary" onClick={closeEstimateModal} disabled={estimateModal.submitting}>
                  Batal
                </button>
                <button type="submit" className="ks-btn is-primary" disabled={estimateModal.submitting}>
                  {estimateModal.submitting ? "Menyimpan..." : "Simpan Estimasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`spkb-toast spkb-toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
};

export default SpkBahan;

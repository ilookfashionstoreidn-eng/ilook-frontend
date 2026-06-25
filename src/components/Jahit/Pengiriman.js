import React, { useEffect, useMemo, useState } from "react";
import "./KodeSeriBelumDikerjakanOptimized.css";
import "./Pengiriman.css";
import API from "../../api";
import Select from "react-select";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiFilter,
  FiPackage,
  FiPlus,
  FiSearch,
  FiShield,
  FiTruck,
  FiUser,
  FiX,
  FiRefreshCw,
  FiInbox,
  FiImage,
  FiTrash2,
} from "react-icons/fi";

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createInitialPengiriman = () => ({
  no_seri: "",
  tanggal_pengiriman: getTodayDate(),
  foto_nota: null,
});

const statusConfig = {
  valid: {
    label: "Valid",
    tone: "is-valid",
    icon: <FiCheckCircle />,
  },
  invalid: {
    label: "Invalid",
    tone: "is-invalid",
    icon: <FiAlertCircle />,
  },
  pending: {
    label: "Pending",
    tone: "is-pending",
    icon: <FiClock />,
  },
};

const STORAGE_URL = API.defaults.baseURL ? API.defaults.baseURL.replace(/\/api\/?$/, "") + "/storage" : "http://localhost:8000/storage";

const getStatusConfig = (status) => statusConfig[status] || statusConfig.pending;

const Pengiriman = () => {
  const [pengirimans, setPengirimans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPengiriman, setSelectedPengiriman] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedPenjahit, setSelectedPenjahit] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [penjahitList, setPenjahitList] = useState([]);
  const [selectedStatusVerifikasi, setSelectedStatusVerifikasi] = useState("");
  const [warnaData, setWarnaData] = useState([]);
  const [formItems, setFormItems] = useState([{ sku: "", qty: 0, harga: 0 }]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [skuSearch, setSkuSearch] = useState("");
  const [hoveredNota, setHoveredNota] = useState(null);
  const [showPetugasAtasPopup, setShowPetugasAtasPopup] = useState(false);
  const [spkCmtList, setSpkCmtList] = useState([]);
  const [selectedSpkDeadline, setSelectedSpkDeadline] = useState(null);
  const [deadlineError, setDeadlineError] = useState("");
  const [tanggalMasaLaluError, setTanggalMasaLaluError] = useState("");
  const [newPengiriman, setNewPengiriman] = useState({ ...createInitialPengiriman(), id_penjahit: "" });
  const [skuList, setSkuList] = useState([]);
  const userRole = localStorage.getItem("role");

  useEffect(() => {
    const fetchPengirimans = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await API.get("/pengiriman", {
          params: {
            page: currentPage,
            id_penjahit: selectedPenjahit,
            sortBy,
            sortOrder,
            status_verifikasi: selectedStatusVerifikasi,
          },
        });

        setPengirimans(response.data.data || []);
        setLastPage(response.data.last_page || 1);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchPengirimans();
  }, [currentPage, selectedPenjahit, sortBy, sortOrder, selectedStatusVerifikasi, refreshKey]);

  useEffect(() => {
    const fetchPenjahits = async () => {
      try {
        const response = await API.get("/penjahit");
        setPenjahitList(response.data || []);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || "Gagal mengambil data penjahit.");
      }
    };

    fetchPenjahits();
  }, []);

  useEffect(() => {
    const fetchSkus = async () => {
      try {
        const response = await API.get("/product-list/spk-options");
        const groups = response.data.data || [];
        const flatSkus = [];
        groups.forEach(group => {
          if (Array.isArray(group.skus)) {
            group.skus.forEach(sku => {
              if (sku.sku_name) {
                flatSkus.push({
                  sku: sku.sku_name,
                  label: sku.sku_name,
                  price: sku.price_cmt || 0
                });
              }
            });
          }
        });
        setSkuList(flatSkus);
      } catch (fetchError) {
        console.error("Gagal mengambil data SKU", fetchError);
      }
    };

    fetchSkus();
  }, []);

  useEffect(() => {
    const fetchSpkCmt = async () => {
      try {
        const response = await API.get("/spkcmt", {
          params: {
            status: "sudah_diambil",
            allData: "true",
          },
        });

        let data = [];

        if (response.data?.spk) {
          if (Array.isArray(response.data.spk)) {
            data = response.data.spk;
          } else if (Array.isArray(response.data.spk.data)) {
            data = response.data.spk.data;
          }
        }

        setSpkCmtList(data);
      } catch (fetchError) {
        setSpkCmtList([]);
      }
    };

    fetchSpkCmt();
  }, []);

  useEffect(() => {
    if (showPetugasAtasPopup && selectedPengiriman) {
      fetchWarnaBySpk(selectedPengiriman.id_spk);
    }
  }, [selectedPengiriman, showPetugasAtasPopup]);

  useEffect(() => {
    if (showForm) {
      setNewPengiriman((prev) => ({
        ...prev,
        tanggal_pengiriman: getTodayDate(),
        id_penjahit: "",
      }));
      setTanggalMasaLaluError("");
      setDeadlineError("");
    }
  }, [showForm]);

  const fetchWarnaBySpk = async (idSpk) => {
    try {
      const response = await API.get(`/spk-cmt/${idSpk}/warna`);

      if (!Array.isArray(response.data.warna)) {
        return;
      }

      // Pre-fill with existing saved warna values if selectedPengiriman has them
      const existingWarnaMap = {};
      if (selectedPengiriman && Array.isArray(selectedPengiriman.warna)) {
        selectedPengiriman.warna.forEach((w) => {
          existingWarnaMap[w.warna] = w.jumlah_dikirim;
        });
      }

      setWarnaData(
        response.data.warna.map((warna) => ({
          nama_warna: warna.nama_warna,
          qty_spk: warna.qty,
          jumlah_dikirim: existingWarnaMap[warna.nama_warna] !== undefined ? existingWarnaMap[warna.nama_warna] : 0,
        }))
      );
    } catch (fetchError) {
      setWarnaData([]);
    }
  };



  const fetchSpkDeadline = async (idSpk) => {
    try {
      const spkSelected = spkCmtList.find((spk) => spk.id_spk === idSpk);

      if (spkSelected?.deadline) {
        setSelectedSpkDeadline(spkSelected.deadline);
        return;
      }

      const response = await API.get(`/spkcmt/${idSpk}`);

      if (response.data?.deadline) {
        setSelectedSpkDeadline(response.data.deadline);
      } else {
        setSelectedSpkDeadline(null);
      }
    } catch (fetchError) {
      setSelectedSpkDeadline(null);
    }
  };

  const validateTanggalMasaLalu = (tanggalPengiriman) => {
    if (!tanggalPengiriman) {
      setTanggalMasaLaluError("");
      return { valid: true, error: "" };
    }

    const tanggal = new Date(tanggalPengiriman);
    tanggal.setHours(0, 0, 0, 0);

    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);

    if (tanggal < hariIni) {
      const tanggalFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(tanggal);

      const hariIniFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(hariIni);

      const message = `Tanggal pengiriman (${tanggalFormatted}) tidak boleh sebelum hari ini (${hariIniFormatted}).`;
      setTanggalMasaLaluError(message);
      return { valid: false, error: message };
    }

    setTanggalMasaLaluError("");
    return { valid: true, error: "" };
  };

  const validateDeadline = (tanggalPengiriman, returnError = false) => {
    if (!tanggalPengiriman || !selectedSpkDeadline) {
      setDeadlineError("");
      return returnError ? { valid: true, error: "" } : true;
    }

    const tanggal = new Date(tanggalPengiriman);
    tanggal.setHours(0, 0, 0, 0);

    const deadline = new Date(selectedSpkDeadline);
    deadline.setHours(0, 0, 0, 0);

    if (tanggal > deadline) {
      const deadlineFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(deadline);

      const tanggalFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(tanggal);

      const message = `Tanggal pengiriman (${tanggalFormatted}) tidak boleh melewati deadline SPK (${deadlineFormatted}).`;
      setDeadlineError(message);
      return returnError ? { valid: false, error: message } : false;
    }

    setDeadlineError("");
    return returnError ? { valid: true, error: "" } : true;
  };

  const getTotalTransfer = (pengiriman) => {
    const claimBelumDibayar =
      pengiriman.status_claim === "belum_dibayar" ? pengiriman.claim || 0 : 0;

    return (
      (Number(pengiriman.total_bayar) || 0) +
      (Number(pengiriman.refund_claim) || 0) -
      (Number(claimBelumDibayar) || 0)
    );
  };

  const filteredPengirimans = useMemo(() => {
    if (!Array.isArray(pengirimans)) {
      return [];
    }

    const keyword = searchTerm.trim().toLowerCase();

    return [...pengirimans]
      .filter((pengiriman) => {
        if (!keyword) {
          return true;
        }

        return [
          pengiriman.id_spk,
          pengiriman.id_pengiriman,
          pengiriman.nama_penjahit,
          pengiriman.nama_produk,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      })
      .sort((first, second) =>
        sortOrder === "asc"
          ? new Date(first.created_at) - new Date(second.created_at)
          : new Date(second.created_at) - new Date(first.created_at)
      );
  }, [pengirimans, searchTerm, sortOrder]);

  const statRail = useMemo(() => {
    const pendingCount = filteredPengirimans.filter(
      (item) => (item.status_verifikasi || "pending") === "pending"
    ).length;

    const totalBayar = filteredPengirimans.reduce((total, item) => {
      return total + (Number(item.total_bayar) || 0);
    }, 0);

    const totalSisaBarang = filteredPengirimans.reduce(
      (total, item) => total + (Number(item.sisa_barang) || 0),
      0
    );

    const invalidCount = filteredPengirimans.filter(
      (item) => item.status_verifikasi === "invalid"
    ).length;

    const validCount = filteredPengirimans.filter(
      (item) => item.status_verifikasi === "valid"
    ).length;

    const uniqueCmtCount = new Set(
      filteredPengirimans.map((item) => item.nama_penjahit).filter(Boolean)
    ).size;

    return [
      { label: "Total Pengiriman", value: filteredPengirimans.length },
      { label: "Total Valid", value: validCount, tone: "safe" },
      { label: "Total Pending", value: pendingCount, tone: "warning" },
      { label: "Total Invalid", value: invalidCount, tone: "overdue" },
      { label: "Total Bayar", value: formatRupiah(totalBayar) },
      { label: "Total Sisa", value: `${totalSisaBarang} pcs` },
      { label: "Total Partner CMT", value: `${uniqueCmtCount} aktif` },
    ];
  }, [filteredPengirimans]);

  const heroSnapshot = useMemo(() => {
    const validItems = filteredPengirimans.filter(
      (item) => item.status_verifikasi === "valid"
    );
    const pendingCount = filteredPengirimans.filter(
      (item) => (item.status_verifikasi || "pending") === "pending"
    ).length;
    const totalTransferValid = validItems.reduce(
      (total, item) => total + getTotalTransfer(item),
      0
    );
    const topTransferItem = [...validItems].sort(
      (first, second) => getTotalTransfer(second) - getTotalTransfer(first)
    )[0];

    return {
      pendingCount,
      validCount: validItems.length,
      totalTransferValid: formatRupiah(totalTransferValid),
      topTransferLabel: topTransferItem
        ? `${topTransferItem.nama_penjahit || "CMT"} • ${formatRupiah(
            getTotalTransfer(topTransferItem)
          )}`
        : "Belum ada transfer valid",
    };
  }, [filteredPengirimans]);

  const toolbarInsights = useMemo(() => {
    const uniqueCmtCount = new Set(
      filteredPengirimans.map((item) => item.nama_penjahit).filter(Boolean)
    ).size;

    const highestSisaItem = filteredPengirimans.reduce((highest, item) => {
      if (!highest) {
        return item;
      }

      return Number(item.sisa_barang || 0) > Number(highest.sisa_barang || 0)
        ? item
        : highest;
    }, null);

    const validCount = filteredPengirimans.filter(
      (item) => item.status_verifikasi === "valid"
    ).length;

    return [
      {
        key: "view",
        label: "View",
        value: searchTerm.trim() ? "Filtered" : "Overall",
      },
      {
        key: "partner",
        label: "Partner CMT",
        value: `${uniqueCmtCount} aktif`,
      },
      {
        key: "valid",
        label: "Terverifikasi",
        value: `${validCount} data`,
      },
      {
        key: "risk",
        label: "Sisa Tertinggi",
        value: highestSisaItem
          ? `${highestSisaItem.nama_penjahit || "CMT"} • ${
              highestSisaItem.sisa_barang || 0
            } pcs`
          : "-",
      },
    ];
  }, [filteredPengirimans, searchTerm]);

  const spkCmtOptions = useMemo(() => {
    if (!Array.isArray(spkCmtList) || spkCmtList.length === 0) {
      return [];
    }

    return spkCmtList
      .filter((spk) => spk.status === "sudah_diambil")
      .map((spk) => ({
        value: spk.id_spk,
        label: `${spk.nomor_seri || `SPK-${spk.id_spk}`} - ${
          spk.nama_produk || "Produk tidak diketahui"
        }`,
      }));
  }, [spkCmtList]);

  const cmtOptions = useMemo(() => {
    return penjahitList.map(p => ({ value: p.id_penjahit, label: p.nama_penjahit }));
  }, [penjahitList]);

  const skuOptionsList = useMemo(() => {
    if (!Array.isArray(skuList)) return [];
    return skuList.map(item => ({ value: item.sku, label: item.label || item.sku, price: item.price || 0 }));
  }, [skuList]);

  const filteredSkuOptions = useMemo(() => {
    if (!skuSearch || skuSearch.trim() === "") {
      return []; // Sembunyikan jika belum ada pencarian
    }
    const lowerSearch = skuSearch.toLowerCase();
    const filtered = skuOptionsList.filter(o => o.label.toLowerCase().includes(lowerSearch));
    return filtered.slice(0, 50);
  }, [skuOptionsList, skuSearch]);

  const formatTanggal = (tanggal) => {
    const date = new Date(tanggal);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  function formatRupiah(value) {
    if (!value && value !== 0) {
      return "Rp 0";
    }

    const numValue = typeof value === "string" ? parseFloat(value) : value;

    if (Number.isNaN(numValue)) {
      return "Rp 0";
    }

    return `Rp ${Math.floor(numValue).toLocaleString("id-ID")}`;
  }

  const resetFormState = () => {
    setNewPengiriman({ ...createInitialPengiriman(), id_penjahit: "" });
    setSelectedSpkDeadline(null);
    setDeadlineError("");
    setTanggalMasaLaluError("");
    setFormItems([{ sku: "", qty: 0, harga: 0 }]);
  };

  const closeFormModal = () => {
    setShowForm(false);
    resetFormState();
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedPengiriman(null);
  };

  const closePetugasAtasPopup = () => {
    setShowPetugasAtasPopup(false);
    setSelectedPengiriman(null);
    setWarnaData([]);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    if (!newPengiriman.no_seri.trim()) {
      alert("Silakan isi No Seri terlebih dahulu");
      return;
    }

    if (!newPengiriman.id_penjahit) {
      alert("Silakan pilih CMT terlebih dahulu");
      return;
    }

    if (!newPengiriman.foto_nota) {
      alert("Silakan upload foto nota terlebih dahulu");
      return;
    }

    // Filter out empty rows
    const validItems = formItems.filter((item) => item.sku.trim() && Number(item.qty) > 0);

    if (validItems.length === 0) {
      alert("Silakan isi minimal satu baris SKU dan Qty.");
      return;
    }

    const tanggalMasaLaluValidation = validateTanggalMasaLalu(
      newPengiriman.tanggal_pengiriman
    );

    if (!tanggalMasaLaluValidation.valid) {
      alert(tanggalMasaLaluValidation.error);
      return;
    }

    const formData = new FormData();
    formData.append("id_penjahit", newPengiriman.id_penjahit);
    if (newPengiriman.no_seri.trim()) {
      formData.append("no_seri", newPengiriman.no_seri.trim());
      formData.append("no_seri_pengiriman", `${newPengiriman.no_seri.trim()}.${newPengiriman.id_penjahit}`);
    }
    formData.append("tanggal_pengiriman", newPengiriman.tanggal_pengiriman);
    
    // Calculate total bayar
    const totalBayar = validItems.reduce((acc, curr) => acc + ((parseInt(curr.qty) || 0) * (parseFloat(curr.harga) || 0)), 0);
    formData.append("total_bayar", totalBayar);

    formData.append("foto_nota", newPengiriman.foto_nota);
    formData.append("items", JSON.stringify(validItems.map((item) => ({
      sku: item.sku,
      qty: item.qty,
      harga: parseFloat(item.harga) || 0
    }))));

    try {
      await API.post("/pengiriman/petugas-bawah", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setRefreshKey((prev) => prev + 1);
      closeFormModal();
    } catch (submitError) {
      alert(
        submitError.response?.data?.error ||
          "Terjadi kesalahan saat menambahkan pengiriman."
      );
    }
  };

  const handleQtyChange = (index, value) => {
    setWarnaData((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, jumlah_dikirim: value } : item
      )
    );
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setNewPengiriman((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "tanggal_pengiriman") {
      validateTanggalMasaLalu(value);
      validateDeadline(value);
    }
  };

  const handleDetailClick = (pengiriman) => {
    setSelectedPengiriman(pengiriman);
    setShowPopup(true);
    setShowPetugasAtasPopup(false);
  };

  const handleDeletePengiriman = async (pengiriman) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data pengiriman ini (No Seri: ${pengiriman.no_seri_pengiriman || "SPK-" + pengiriman.id_spk})?`)) {
      return;
    }
    try {
      await API.delete(`/pengiriman/${pengiriman.id_pengiriman}`);
      setPengirimans((prev) => prev.filter((p) => p.id_pengiriman !== pengiriman.id_pengiriman));
      setRefreshKey((prev) => prev + 1); // trigger fetch new aggregated data
    } catch (err) {
      console.error("Gagal menghapus pengiriman:", err);
      alert(err.response?.data?.message || "Gagal menghapus data pengiriman.");
    }
  };

  const handlePetugasAtas = (pengiriman) => {
    setSelectedPengiriman(pengiriman);
    setShowPetugasAtasPopup(true);
    setShowPopup(false);
  };

  const handlePetugasAtasSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await API.put(
        `/pengiriman/petugas-atas/${selectedPengiriman.id_pengiriman}`,
        {
          warna: warnaData.map((warna) => ({
            warna: warna.nama_warna,
            jumlah_dikirim: warna.jumlah_dikirim,
          })),
        }
      );

      alert("Data berhasil diperbarui!");

      setPengirimans((prev) =>
        prev.map((item) =>
          item.id_pengiriman === selectedPengiriman.id_pengiriman
            ? { ...item, ...response.data.data }
            : item
        )
      );

      closePetugasAtasPopup();
    } catch (submitError) {
      alert(
        submitError.response?.data?.error || "Gagal memperbarui data pengiriman."
      );
    }
  };  const selectedStatus = selectedPengiriman
    ? getStatusConfig(selectedPengiriman.status_verifikasi || "pending")
    : getStatusConfig("pending");

  const pageNumbers = [];
  const pageStart = Math.max(1, currentPage - 2);
  const pageEnd = Math.min(lastPage, currentPage + 2);
  for (let i = pageStart; i <= pageEnd; i++) pageNumbers.push(i);

  return (
    <div className="ks-page">
      {/* ── Header ── */}
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Manajemen Pengiriman CMT</h1>
          <span className="ks-header-sub">Pengiriman, verifikasi, dan sisa barang — semua dalam kendali penuh</span>
        </div>
      </header>

      {/* ── Stat rail ── */}
      <div className="ks-statrail">
        {statRail.map((s) => (
          <div className="ks-stat" key={s.label} style={{ flex: 1, minWidth: 0 }}>
            <span className="ks-stat-label" style={{ whiteSpace: "normal" }}>{s.label}</span>
            <span className={`ks-stat-value ${s.tone ? `tone-${s.tone}` : ""}`} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {s.tone && <span className={`ks-dot tone-${s.tone}`} />}
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Board ── */}
      <section className="ks-board">
        <div className="ks-toolbar">
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <label className="ks-select-label" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--ks-text-soft)", fontWeight: "500" }}>
              <span>CMT:</span>
              <select
                value={selectedPenjahit}
                onChange={(e) => setSelectedPenjahit(e.target.value)}
                style={{
                  height: "30px",
                  padding: "0 10px",
                  borderRadius: "7px",
                  border: "1px solid var(--ks-line-strong)",
                  fontSize: "12px",
                  background: "var(--ks-surface)",
                  color: "var(--ks-text)",
                  fontFamily: "inherit",
                  outline: "none",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                <option value="">Semua CMT</option>
                {penjahitList.map((p) => (
                  <option key={p.id_penjahit} value={p.id_penjahit}>
                    {p.nama_penjahit}
                  </option>
                ))}
              </select>
            </label>

            <label className="ks-select-label" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--ks-text-soft)", fontWeight: "500" }}>
              <span>Status:</span>
              <select
                value={selectedStatusVerifikasi}
                onChange={(e) => setSelectedStatusVerifikasi(e.target.value)}
                style={{
                  height: "30px",
                  padding: "0 10px",
                  borderRadius: "7px",
                  border: "1px solid var(--ks-line-strong)",
                  fontSize: "12px",
                  background: "var(--ks-surface)",
                  color: "var(--ks-text)",
                  fontFamily: "inherit",
                  outline: "none",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                <option value="">Semua status</option>
                <option value="pending">Pending</option>
                <option value="invalid">Invalid</option>
                <option value="valid">Valid</option>
              </select>
            </label>

            <label className="ks-select-label" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--ks-text-soft)", fontWeight: "500" }}>
              <span>Urutan:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{
                  height: "30px",
                  padding: "0 10px",
                  borderRadius: "7px",
                  border: "1px solid var(--ks-line-strong)",
                  fontSize: "12px",
                  background: "var(--ks-surface)",
                  color: "var(--ks-text)",
                  fontFamily: "inherit",
                  outline: "none",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                <option value="desc">Terbaru</option>
                <option value="asc">Terlama</option>
              </select>
            </label>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" }}>
            <label className="ks-search" style={{ marginLeft: 0 }}>
              <FiSearch className="ks-search-icon" size={14} />
              <input
                type="text"
                placeholder="Cari SPK, produk, atau CMT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="ks-btn is-primary"
              onClick={() => setShowForm(true)}
            >
              <FiPlus size={13} /> Tambah Pengiriman
            </button>
          </div>
        </div>

        {error && (
          <div className="ks-empty" style={{ padding: "20px" }}>
            <FiAlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="ks-empty">
            <FiRefreshCw className="is-spinning" size={20} />
            <p>Memuat data pengiriman...</p>
          </div>
        ) : filteredPengirimans.length === 0 ? (
          <div className="ks-empty">
            <FiInbox size={20} />
            <p>{searchTerm ? `Tidak ada hasil pencarian untuk "${searchTerm}".` : "Belum ada data pengiriman."}</p>
          </div>
        ) : (
          <>
            <div className="ks-grid-scroll">
              <table className="ks-grid">
                <thead>
                  <tr>
                    <th className="ks-col-dot" aria-label="Status" />
                    <th>Tanggal</th>
                    <th>CMT</th>
                    <th>Produk / SKU</th>
                    <th>No Seri</th>
                    <th>Warna</th>
                    <th className="align-right">Qty Kirim</th>
                    <th className="align-right">Harga</th>
                    <th className="align-right">Total Bayar</th>
                    <th>Status</th>
                    <th style={{ width: "80px", textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPengirimans.map((pengiriman) => {
                    const status = getStatusConfig(
                      pengiriman.status_verifikasi || "pending"
                    );
                    const totalTransfer = getTotalTransfer(pengiriman);
                    
                    // Map verification status to urgency tones: valid -> safe, pending -> warning, invalid -> overdue
                    let statusTone = "none";
                    if (pengiriman.status_verifikasi === "valid") statusTone = "safe";
                    else if (pengiriman.status_verifikasi === "pending") statusTone = "warning";
                    else if (pengiriman.status_verifikasi === "invalid") statusTone = "overdue";

                    return (
                      <tr key={pengiriman.id_pengiriman}>
                        <td className="ks-col-dot">
                          <span className={`ks-dot tone-${statusTone}`} title={status.label} />
                        </td>
                        <td className="ks-muted">{formatTanggal(pengiriman.tanggal_pengiriman)}</td>
                        <td className="ks-cell-product">{pengiriman.nama_penjahit || "-"}</td>
                        <td title={pengiriman.nama_produk} style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pengiriman.nama_produk || "-"}</td>
                        <td className="ks-cell-code">
                          <strong>{pengiriman.no_seri_pengiriman || `SPK-${pengiriman.id_spk}`}</strong>
                        </td>
                        <td style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={pengiriman.warna?.map(w => w.warna).join(', ') || "-"}>
                          {pengiriman.warna?.length > 0 ? pengiriman.warna.map(w => w.warna).join(', ') : "-"}
                        </td>
                        <td className="align-right ks-cell-num">{(pengiriman.total_barang_dikirim || 0).toLocaleString("id-ID")} pcs</td>
                        <td className="align-right ks-cell-num">
                          {formatRupiah((pengiriman.total_bayar || 0) / (pengiriman.total_barang_dikirim || 1))}
                        </td>
                        <td className="align-right ks-cell-num">
                          <strong>{formatRupiah(pengiriman.total_bayar || 0)}</strong>
                        </td>
                        <td>
                          <span className={`ks-tag ${pengiriman.status_verifikasi === "valid" ? "is-sudah" : "is-belum"}`}>
                            {status.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                            {pengiriman.foto_nota && (
                              <div 
                                className="nota-hover-container" 
                                style={{ position: "relative", display: "inline-flex" }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredNota({
                                    url: pengiriman.foto_nota,
                                    isPdf: pengiriman.foto_nota.endsWith(".pdf"),
                                    x: rect.left,
                                    y: rect.top
                                  });
                                }}
                                onMouseLeave={() => {
                                  setHoveredNota(null);
                                }}
                              >
                                <a
                                  href={`${STORAGE_URL}/${pengiriman.foto_nota}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ks-btn"
                                  style={{ padding: "4px 8px", minHeight: "26px", border: "1px solid var(--ks-line-strong)", color: "var(--ks-text)" }}
                                  title="Lihat Nota"
                                >
                                  <FiImage size={12} />
                                </a>
                              </div>
                            )}
                            <button
                              type="button"
                              className="ks-btn"
                              style={{ padding: "4px 8px", minHeight: "26px", border: "1px solid var(--ks-line-strong)" }}
                              onClick={() => handleDetailClick(pengiriman)}
                              title="Detail"
                            >
                              <FiFileText size={12} />
                            </button>
                            <button
                              type="button"
                              className="ks-btn"
                              style={{ padding: "4px 8px", minHeight: "26px", border: "1px solid var(--ks-line-strong)", color: "var(--ks-error, #d32f2f)" }}
                              onClick={() => handleDeletePengiriman(pengiriman)}
                              title="Hapus"
                            >
                              <FiTrash2 size={12} />
                            </button>
                            {userRole !== "staff_bawah" && (
                              <button
                                type="button"
                                className="ks-btn"
                                style={{
                                  padding: "4px 8px",
                                  minHeight: "26px",
                                  background: "var(--ks-accent-soft, #edf4ff)",
                                  color: "var(--ks-accent, #2458ce)",
                                  border: "1px solid rgba(36, 88, 206, 0.2)"
                                }}
                                onClick={() => handlePetugasAtas(pengiriman)}
                                title="Verifikasi"
                              >
                                <FiShield size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="ks-footer">
              <div className="ks-footer-info">
                <span>Hal. {currentPage}/{lastPage} · {filteredPengirimans.length} baris halaman ini</span>
              </div>
              <div className="ks-pager">
                <button
                  type="button"
                  className="ks-pg-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                >
                  First
                </button>
                <button
                  type="button"
                  className="ks-pg-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  Prev
                </button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`ks-pg-btn ${currentPage === n ? "is-active" : ""}`}
                    onClick={() => setCurrentPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className="ks-pg-btn"
                  onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                  disabled={currentPage >= lastPage}
                >
                  Next
                </button>
                <button
                  type="button"
                  className="ks-pg-btn"
                  onClick={() => setCurrentPage(lastPage)}
                  disabled={currentPage >= lastPage}
                >
                  Last
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {showPopup && selectedPengiriman && (
        <div className="pengiriman-modal-overlay" onClick={closePopup}>
          <div
            className="pengiriman-modal pengiriman-modal--detail"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pengiriman-modal-header">
              <div>
                <span className="pengiriman-section-label pengiriman-section-label--light">
                  <FiTruck />
                  Detail Pengiriman
                </span>
                <h2>SPK-{selectedPengiriman.id_spk}</h2>
                <p>Lihat rincian barang, claim, dan transfer untuk satu pengiriman.</p>
              </div>
              <button
                type="button"
                className="pengiriman-modal-close"
                onClick={closePopup}
              >
                <FiX />
              </button>
            </div>

            <div className="pengiriman-modal-body">
              <div className="pengiriman-detail-topline">
                <div className="pengiriman-detail-metric">
                  <span>Status verifikasi</span>
                  <strong className={`pengiriman-status ${selectedStatus.tone}`}>
                    {selectedStatus.icon}
                    {selectedStatus.label}
                  </strong>
                </div>
                <div className="pengiriman-detail-metric">
                  <span>Total transfer</span>
                  <strong>
                    {selectedPengiriman.status_verifikasi === "valid"
                      ? formatRupiah(getTotalTransfer(selectedPengiriman))
                      : "Belum diverifikasi"}
                  </strong>
                </div>
              </div>

              <div className="pengiriman-detail-grid">
                <div className="pengiriman-detail-item">
                  <span>ID Pengiriman</span>
                  <strong>#{selectedPengiriman.id_pengiriman}</strong>
                </div>
                <div className="pengiriman-detail-item">
                  <span>Tanggal Pengiriman</span>
                  <strong>{formatTanggal(selectedPengiriman.tanggal_pengiriman)}</strong>
                </div>
                <div className="pengiriman-detail-item">
                  <span>Total Barang</span>
                  <strong>{selectedPengiriman.total_barang_dikirim || 0} pcs</strong>
                </div>
                <div className="pengiriman-detail-item">
                  <span>Sisa Barang</span>
                  <strong>{selectedPengiriman.sisa_barang || 0} pcs</strong>
                </div>
                <div className="pengiriman-detail-item">
                  <span>Total Bayar</span>
                  <strong>
                    {selectedPengiriman.status_verifikasi === "valid"
                      ? formatRupiah(selectedPengiriman.total_bayar || 0)
                      : "Belum diverifikasi"}
                  </strong>
                </div>
                <div className="pengiriman-detail-item">
                  <span>Status Claim</span>
                  <strong
                    className={
                      selectedPengiriman.status_claim === "sudah_dibayar"
                        ? "pengiriman-text-success"
                        : "pengiriman-text-warning"
                    }
                  >
                    {selectedPengiriman.status_claim === "sudah_dibayar"
                      ? "Sudah Dibayar"
                      : "Belum Dibayar"}
                  </strong>
                </div>
              </div>

              <div className="pengiriman-finance-card">
                <div className="pengiriman-finance-row">
                  <span>Claim</span>
                  <strong>
                    {selectedPengiriman.status_verifikasi === "valid"
                      ? formatRupiah(selectedPengiriman.claim || 0)
                      : "Belum diverifikasi"}
                  </strong>
                </div>
                <div className="pengiriman-finance-row">
                  <span>Refund Claim</span>
                  <strong>
                    {selectedPengiriman.status_verifikasi === "valid"
                      ? formatRupiah(selectedPengiriman.refund_claim || 0)
                      : "Belum diverifikasi"}
                  </strong>
                </div>
              </div>

              {selectedPengiriman.warna?.length > 0 && (
                <div className="pengiriman-warna-section">
                  <div>
                    <h3>Distribusi Warna</h3>
                    <p>Ringkasan barang dikirim dan sisa per warna.</p>
                  </div>

                  <div className="pengiriman-warna-grid">
                    {selectedPengiriman.warna.map((warnaDetail) => (
                      <div
                        key={warnaDetail.id_pengiriman_warna}
                        className="pengiriman-warna-card"
                      >
                        <strong>{warnaDetail.warna}</strong>
                        <span>Dikirim: {warnaDetail.jumlah_dikirim} pcs</span>
                        <span>
                          Sisa: {warnaDetail.sisa_barang_per_warna || 0} pcs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="pengiriman-modal-overlay" onClick={closeFormModal}>
          <div
            className="pengiriman-modal"
            style={{ width: "900px", maxWidth: "95%" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pengiriman-modal-header">
              <div>
                <span className="pengiriman-section-label pengiriman-section-label--light">
                  <FiPlus />
                  Input Pengiriman
                </span>
                <h2>Tambah Data Pengiriman</h2>
                <p>Simpan data pengiriman baru beserta nota dan tanggal kirim.</p>
              </div>
              <button
                type="button"
                className="pengiriman-modal-close"
                onClick={closeFormModal}
              >
                <FiX />
              </button>
            </div>

            <div className="pengiriman-modal-body">
              <form onSubmit={handleFormSubmit} className="pengiriman-form">
                <div className="pengiriman-form-grid">
                  <div className="pengiriman-form-group">
                    <label className="pengiriman-form-label">CMT / Penjahit</label>
                    <Select
                      options={cmtOptions}
                      value={cmtOptions.find(o => o.value === newPengiriman.id_penjahit) || null}
                      onChange={(selected) => setNewPengiriman(prev => ({ ...prev, id_penjahit: selected ? selected.value : "" }))}
                      placeholder="Pilih CMT..."
                      isClearable
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 }),
                        control: (base) => ({
                          ...base,
                          borderColor: "var(--ks-line-strong)",
                          borderRadius: "8px",
                          minHeight: "36px"
                        })
                      }}
                    />
                  </div>

                  <div className="pengiriman-form-group">
                    <label className="pengiriman-form-label">No Seri</label>
                    <input
                      type="text"
                      className="pengiriman-form-input"
                      name="no_seri"
                      value={newPengiriman.no_seri}
                      onChange={handleInputChange}
                      placeholder="Masukkan no seri"
                      required={false}
                    />
                  </div>

                  <div className="pengiriman-form-group">
                    <label className="pengiriman-form-label">No Seri Pengiriman</label>
                    <input
                      type="text"
                      className="pengiriman-form-input"
                      value={newPengiriman.no_seri && newPengiriman.id_penjahit ? `${newPengiriman.no_seri}.${newPengiriman.id_penjahit}` : ""}
                      disabled
                      placeholder="Dibuat otomatis"
                      style={{ backgroundColor: "var(--ks-background-2)", cursor: "not-allowed" }}
                    />
                  </div>

                  <div className="pengiriman-form-group">
                    <label className="pengiriman-form-label">
                      Tanggal Kirim
                    </label>
                    <input
                      type="date"
                      name="tanggal_pengiriman"
                      className={`pengiriman-form-input ${
                        tanggalMasaLaluError ? "has-error" : ""
                      }`}
                      value={newPengiriman.tanggal_pengiriman}
                      onChange={handleInputChange}
                      min={getTodayDate()}
                      required
                    />
                    {tanggalMasaLaluError && (
                      <div className="pengiriman-form-error">
                        {tanggalMasaLaluError}
                      </div>
                    )}
                  </div>

                  <div className="pengiriman-form-group pengiriman-form-group--full">
                    <label className="pengiriman-form-label" style={{ marginBottom: "6px" }}>Detail SKU & Qty</label>
                    <div style={{
                      border: "1px solid var(--ks-line, #ececef)",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                        <thead>
                          <tr style={{ color: "var(--ks-text-light)", textTransform: "uppercase" }}>
                            <th style={{ textAlign: "left", padding: "12px", width: "40%" }}>SKU</th>
                            <th style={{ textAlign: "left", padding: "12px", width: "15%" }}>QTY</th>
                            <th style={{ textAlign: "left", padding: "12px", width: "20%" }}>Harga</th>
                            <th style={{ textAlign: "left", padding: "12px", width: "20%" }}>Total</th>
                            <th style={{ width: "5%" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formItems.map((item, index) => (
                            <tr key={index} style={{ borderTop: index > 0 ? "1px solid var(--ks-line, #ececef)" : "none" }}>
                              <td style={{ padding: "6px 12px" }}>
                                <Select
                                  options={filteredSkuOptions}
                                  value={skuOptionsList.find(o => o.value === item.sku) || null}
                                  onInputChange={(val, { action }) => {
                                    if (action === "input-change" || action === "set-value") {
                                      setSkuSearch(val);
                                    }
                                  }}
                                  onChange={(selected) => {
                                    const val = selected ? selected.value : "";
                                    const price = selected ? selected.price : 0;
                                    setFormItems((prev) =>
                                      prev.map((r, i) => (i === index ? { ...r, sku: val, harga: price } : r))
                                    );
                                  }}
                                  placeholder="Ketik untuk mencari SKU..."
                                  noOptionsMessage={({ inputValue }) => 
                                    !inputValue ? "Ketik nama SKU untuk mencari..." : "SKU tidak ditemukan"
                                  }
                                  isClearable
                                  menuPortalTarget={document.body}
                                  menuPosition="fixed"
                                  styles={{
                                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                                    control: (base) => ({
                                      ...base,
                                      borderColor: "var(--ks-line, #ececef)",
                                      minHeight: "32px",
                                      height: "32px"
                                    }),
                                    valueContainer: (base) => ({
                                      ...base,
                                      padding: "0 8px"
                                    }),
                                    input: (base) => ({
                                      ...base,
                                      margin: "0",
                                      padding: "0"
                                    })
                                  }}
                                />
                              </td>
                              <td style={{ padding: "6px 12px" }}>
                                <input
                                  type="number"
                                  className="pengiriman-form-input"
                                  value={item.qty}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormItems((prev) =>
                                      prev.map((r, i) => (i === index ? { ...r, qty: val } : r))
                                    );
                                  }}
                                  placeholder="0"
                                  min="0"
                                  style={{ height: "32px", padding: "6px 10px" }}
                                />
                              </td>
                              <td style={{ padding: "6px 12px" }}>
                                <input
                                  type="number"
                                  className="pengiriman-form-input"
                                  value={item.harga}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormItems((prev) =>
                                      prev.map((r, i) => (i === index ? { ...r, harga: val } : r))
                                    );
                                  }}
                                  min="0"
                                  placeholder="0"
                                  style={{ height: "32px", padding: "6px 10px" }}
                                />
                              </td>
                              <td style={{ padding: "6px 12px" }}>
                                <div style={{ height: "32px", padding: "6px 10px", backgroundColor: "var(--ks-background-2)", borderRadius: "6px", display: "flex", alignItems: "center", color: "var(--ks-text)", fontSize: "13px" }}>
                                  Rp {((parseInt(item.qty) || 0) * (parseFloat(item.harga) || 0)).toLocaleString("id-ID")}
                                </div>
                              </td>
                              <td style={{ padding: "6px 12px", textAlign: "right" }}>
                                {formItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormItems((prev) => prev.filter((_, i) => i !== index))
                                    }
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "var(--ks-overdue, #e5484d)",
                                      cursor: "pointer",
                                      padding: "4px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                    }}
                                    title="Hapus baris"
                                  >
                                    <FiX size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan="3" style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "var(--ks-text)", borderTop: "1px solid var(--ks-line, #ececef)" }}>
                              Grand Total:
                            </td>
                            <td colSpan="2" style={{ padding: "12px", fontWeight: "600", color: "var(--ks-primary)", borderTop: "1px solid var(--ks-line, #ececef)" }}>
                              Rp {formItems.reduce((acc, curr) => acc + ((parseInt(curr.qty) || 0) * (parseFloat(curr.harga) || 0)), 0).toLocaleString("id-ID")}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <div style={{ padding: "8px 12px", borderTop: "1px solid var(--ks-line, #ececef)" }}>
                        <button
                          type="button"
                          className="ks-btn"
                          onClick={() => setFormItems((prev) => [...prev, { sku: "", qty: 0, harga: 0 }])}
                          style={{ fontSize: "12px" }}
                        >
                          <FiPlus size={12} /> Tambah Baris
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pengiriman-form-group pengiriman-form-group--full">
                    <label className="pengiriman-form-label">
                      Upload Nota (JPG, PNG, PDF)
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      className="pengiriman-form-input pengiriman-form-input--file"
                      onChange={(event) =>
                        setNewPengiriman((prev) => ({
                          ...prev,
                          foto_nota: event.target.files?.[0] || null,
                        }))
                      }
                      required
                    />
                    <small className="pengiriman-form-help">
                      {newPengiriman.foto_nota
                        ? `File terpilih: ${newPengiriman.foto_nota.name}`
                        : "Lampirkan nota sebagai bukti pengiriman."}
                    </small>
                  </div>
                </div>

                <div className="pengiriman-form-actions">
                  <button
                    type="button"
                    className="pengiriman-secondary-btn"
                    onClick={closeFormModal}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="pengiriman-primary-btn"
                    disabled={Boolean(deadlineError || tanggalMasaLaluError)}
                  >
                    Simpan Pengiriman
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showPetugasAtasPopup && selectedPengiriman && (
        <div
          className="pengiriman-modal-overlay"
          onClick={closePetugasAtasPopup}
        >
          <div
            className="pengiriman-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pengiriman-modal-header">
              <div>
                <span className="pengiriman-section-label pengiriman-section-label--light">
                  <FiShield />
                  Verifikasi Pengiriman
                </span>
                <h2>ID Pengiriman #{selectedPengiriman.id_pengiriman}</h2>
                <p>Masukkan jumlah dikirim per warna untuk proses validasi.</p>
              </div>
              <button
                type="button"
                className="pengiriman-modal-close"
                onClick={closePetugasAtasPopup}
              >
                <FiX />
              </button>
            </div>

            <div className="pengiriman-modal-body">
              <div className="pengiriman-verification-banner">
                <div>
                  <span>SPK</span>
                  <strong>SPK-{selectedPengiriman.id_spk}</strong>
                </div>
                <div>
                  <span>Produk</span>
                  <strong>{selectedPengiriman.nama_produk || "-"}</strong>
                </div>
                <div>
                  <span>Total Kirim</span>
                  <strong>{selectedPengiriman.total_barang_dikirim || 0} pcs</strong>
                </div>
              </div>

              <form
                onSubmit={handlePetugasAtasSubmit}
                className="pengiriman-form"
              >
                {warnaData.length > 0 ? (
                  <div className="pengiriman-form-grid">
                    {warnaData.map((item, index) => (
                      <div className="pengiriman-form-group" key={item.nama_warna}>
                        <label className="pengiriman-form-label">
                          {item.nama_warna}
                        </label>
                        <small className="pengiriman-form-help">
                          Kuantitas SPK: {item.qty_spk} pcs
                        </small>
                        <input
                          type="number"
                          className="pengiriman-form-input"
                          value={item.jumlah_dikirim === 0 ? "" : item.jumlah_dikirim}
                          onChange={(event) =>
                            handleQtyChange(
                              index,
                              event.target.value === ""
                                ? ""
                                : Number(event.target.value)
                            )
                          }
                          min="0"
                          required
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pengiriman-empty-box">
                    Tidak ada data warna untuk SPK ini.
                  </div>
                )}

                <div className="pengiriman-form-actions">
                  <button
                    type="button"
                    className="pengiriman-secondary-btn"
                    onClick={closePetugasAtasPopup}
                  >
                    Batal
                  </button>
                  <button type="submit" className="pengiriman-primary-btn">
                    Simpan Verifikasi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Global Hover Popup for Nota */}
      {hoveredNota && (
        <div style={{
          position: "fixed",
          left: Math.max(10, hoveredNota.x - 260), // position to the left of cursor, with 10px padding from screen edge
          top: Math.max(10, hoveredNota.y - 150),  // position vertically relative to cursor
          backgroundColor: "#fff",
          border: "1px solid var(--ks-line)",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          borderRadius: "8px",
          padding: "8px",
          zIndex: 99999,
          width: "250px",
          pointerEvents: "none"
        }}>
          {hoveredNota.isPdf ? (
            <div style={{ textAlign: "center", padding: "16px", background: "#f8f9fa", borderRadius: "6px" }}>
              <FiFileText size={32} color="var(--ks-primary)" />
              <div style={{ fontSize: "12px", marginTop: "8px", fontWeight: "600" }}>Dokumen PDF</div>
              <div style={{ fontSize: "11px", color: "var(--ks-muted)", marginTop: "4px" }}>Klik icon untuk membuka</div>
            </div>
          ) : (
            <img 
              src={`${STORAGE_URL}/${hoveredNota.url}`} 
              alt="Nota Preview" 
              style={{ width: "100%", borderRadius: "4px", objectFit: "contain", maxHeight: "300px" }} 
            />
          )}
        </div>
      )}

    </div>
  );
};

export default Pengiriman;

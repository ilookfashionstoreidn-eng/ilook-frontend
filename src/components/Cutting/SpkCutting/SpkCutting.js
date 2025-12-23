import React, { useEffect, useState } from "react";

import "./SpkCutting.css";

import API from "../../../api";

import { FaPlus, FaInfoCircle, FaEdit, FaDownload, FaFileExcel, FaTimes } from "react-icons/fa";

const SpkCutting = () => {
  const [spkCutting, setSpkCutting] = useState([]);

  const [error, setError] = useState(null);

  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [showEditForm, setShowEditForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  // Filter periode untuk card In Progress (juga digunakan untuk filter tabel)
  const [weeklyStart, setWeeklyStart] = useState("");
  const [weeklyEnd, setWeeklyEnd] = useState("");
  const [dailyDate, setDailyDate] = useState("");

  const [summary, setSummary] = useState({
    all: 0,

    "In Progress": {
      count: 0,
      total_asumsi_produk: 0,
    },

    Completed: 0,
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

  const [selectedDetailSpk, setSelectedDetailSpk] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

  // List nama bagian untuk dropdown

  const namaBagianList = ["fullbody", "atasan", "bawahan", "combinasi"];

  // Fungsi untuk fetch nomor seri SPK dari backend berdasarkan tukang cutting

  const fetchSpkNumber = async (tukangCuttingId) => {
    if (!tukangCuttingId) {
      setNewSpkCutting((prev) => ({ ...prev, id_spk_cutting: "" }));

      return;
    }

    try {
      const response = await API.post("/spk_cutting/generate-number", {
        tukang_cutting_id: tukangCuttingId,
      });

      setNewSpkCutting((prev) => ({
        ...prev,

        id_spk_cutting: response.data.id_spk_cutting,
      }));
    } catch (error) {
      console.error("Error generating SPK number:", error);

      alert("Gagal generate nomor seri SPK. Silakan coba lagi.");
    }
  };

  const [newSpkCutting, setNewSpkCutting] = useState({
    id_spk_cutting: "",
    produk_id: "",
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
    produk_id: "",
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

  const fetchSpkCutting = async () => {
    try {
      setLoading(true);

      const params = {};

      if (statusFilter && statusFilter !== "all") {
        params.status = statusFilter;
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

      // Tambahkan parameter status filter untuk progress cards
      if (statusFilter && statusFilter !== "all") {
        params.progress_status = statusFilter;
      } else {
        params.progress_status = "In Progress"; // Default ke In Progress jika all
      }

      const response = await API.get("/spk_cutting", { params });

      // Urutkan data berdasarkan ID descending (terbaru di atas)

      const data = response.data.data || response.data;

      const sortedData = Array.isArray(data) ? data.sort((a, b) => b.id - a.id) : [];

      setSpkCutting(sortedData);

      // Set summary jika ada

      if (response.data.summary) {
        setSummary(response.data.summary);
      }
    } catch (error) {
      setError("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpkCutting();
  }, [statusFilter, weeklyStart, weeklyEnd, dailyDate]);

  useEffect(() => {
    const fetchProduk = async () => {
      try {
        setLoading(true);

        const response = await API.get("/produk");

        setProdukList(response.data.data);
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
        setError("Gagal mengambil data produk.");
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

        const response = await API.get("/bahan");

        setBahanList(response.data);
      } catch (error) {
        setError("Gagal mengambil data bahan.");
      } finally {
        setLoading(false);
      }
    };

    fetchBahan();
  }, []);

  // Fungsi untuk fetch warna berdasarkan bahan_id

  const fetchWarnaByBahan = async (bahanId) => {
    if (!bahanId) {
      return [];
    }

    try {
      const response = await API.get("/stok-bahan/warna-dengan-stok", {
        params: { bahan_id: bahanId },
      });

      const warnaData = response.data || [];

      // Pastikan "Lainnya" selalu ada di list dengan stok 999 (selalu bisa dipilih)

      const hasLainnya = warnaData.some((item) => {
        const warna = typeof item === "string" ? item : item.warna;

        return warna === "Lainnya";
      });

      if (!hasLainnya) {
        warnaData.push({ warna: "Lainnya", stok: 999 });
      }

      return warnaData;
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

        { warna: "Lainnya", stok: 999 }, // "Lainnya" selalu bisa dipilih
      ];
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, weeklyStart, weeklyEnd, dailyDate]);

  // === PAGINATION ===

  const filteredSpkCutting = spkCutting.filter(
    (item) =>
      item.id.toString().includes(searchTerm.toLowerCase()) ||
      (item.id_spk_cutting || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tukang_cutting?.nama_tukang_cutting || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.produk?.nama_produk || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;

  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const currentItems = filteredSpkCutting.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredSpkCutting.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
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
      alert("Anda hanya bisa memilih salah satu filter: Mingguan atau Harian. Silakan reset filter harian terlebih dahulu.");
      return;
    }
    setWeeklyStart(newValue);
  };

  const handleWeeklyEndChange = (e) => {
    const newValue = e.target.value;
    if (newValue && dailyDate) {
      alert("Anda hanya bisa memilih salah satu filter: Mingguan atau Harian. Silakan reset filter harian terlebih dahulu.");
      return;
    }
    setWeeklyEnd(newValue);
  };

  // Handler untuk perubahan filter tanggal harian
  const handleDailyDateChange = (e) => {
    const newValue = e.target.value;
    if (newValue && (weeklyStart || weeklyEnd)) {
      alert("Anda hanya bisa memilih salah satu filter: Mingguan atau Harian. Silakan reset filter mingguan terlebih dahulu.");
      return;
    }
    setDailyDate(newValue);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Validasi nomor seri SPK harus ada (akan di-generate otomatis oleh backend jika kosong)

    if (!newSpkCutting.tukang_cutting_id) {
      alert("Pilih tukang cutting terlebih dahulu!");

      return;
    }

    // Validasi frontend sebelum submit

    if (!newSpkCutting.bagian || newSpkCutting.bagian.length === 0) {
      alert("Minimal harus ada 1 bagian!");

      return;
    }

    // Validasi setiap bagian dan bahan

    for (let i = 0; i < newSpkCutting.bagian.length; i++) {
      const bagian = newSpkCutting.bagian[i];

      if (!bagian.nama_bagian || bagian.nama_bagian.trim() === "") {
        alert(`Bagian ${i + 1}: Nama bagian harus diisi!`);

        return;
      }

      if (!bagian.bahan || bagian.bahan.length === 0) {
        alert(`Bagian ${i + 1}: Minimal harus ada 1 bahan!`);

        return;
      }

      for (let j = 0; j < bagian.bahan.length; j++) {
        const bahan = bagian.bahan[j];

        if (!bahan.bahan_id || bahan.bahan_id === "") {
          alert(`Bagian ${i + 1}, Bahan ${j + 1}: Pilih bahan terlebih dahulu!`);

          return;
        }

        if (bahan.warna === "Lainnya" && (!bahan.warna_custom || bahan.warna_custom.trim() === "")) {
          alert(`Bagian ${i + 1}, Bahan ${j + 1}: Masukkan warna custom terlebih dahulu!`);

          return;
        }

        if (!bahan.qty || bahan.qty <= 0) {
          alert(`Bagian ${i + 1}, Bahan ${j + 1}: Qty harus lebih dari 0!`);

          return;
        }
      }
    }

    // Konversi bahan_id menjadi integer

    // Hapus id_spk_cutting karena akan di-generate otomatis oleh backend

    const { id_spk_cutting, ...dataWithoutSpkNumber } = newSpkCutting;

    const dataToSend = {
      ...dataWithoutSpkNumber,
      harga_jasa: newSpkCutting.harga_jasa ? parseFloat(newSpkCutting.harga_jasa) : null,
      jumlah_asumsi_produk: newSpkCutting.jumlah_asumsi_produk ? parseInt(newSpkCutting.jumlah_asumsi_produk, 10) : null,
      jenis_spk: newSpkCutting.jenis_spk || null,
      tukang_pola_id: newSpkCutting.tukang_pola_id ? parseInt(newSpkCutting.tukang_pola_id) : null,
      bagian: newSpkCutting.bagian.map((bagian) => ({
        ...bagian,

        bahan: bagian.bahan.map((bahan) => ({
          bahan_id: parseInt(bahan.bahan_id),

          // Jika warna adalah "Lainnya", gunakan warna_custom, jika tidak gunakan warna

          warna: bahan.warna === "Lainnya" ? bahan.warna_custom || null : bahan.warna || null,

          qty: parseFloat(bahan.qty),
        })),
      })),
    };

    console.log("Data SPK Cutting yang dikirim:", dataToSend);

    try {
      const response = await API.post("/spk_cutting", dataToSend);

      console.log("Response:", response.data);

      alert("SPK Cutting berhasil ditambahkan!");

      // Refresh data dan summary

      await fetchSpkCutting();

      // Reset form

      setNewSpkCutting({
        id_spk_cutting: "",
        produk_id: "",
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

        alert(`Validasi gagal:\n${errorMessages}`);
      } else {
        alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan SPK Cutting.");
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

    setNewSpkCutting((prev) => ({ ...prev, [name]: value }));

    // Jika tukang cutting berubah, generate nomor seri baru

    if (name === "tukang_cutting_id") {
      await fetchSpkNumber(value);
    }
  };

  const handleBagianChange = (index, key, value) => {
    const updated = [...newSpkCutting.bagian];

    updated[index][key] = value;

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const handleBahanChange = async (bagianIndex, bahanIndex, key, value) => {
    const updated = [...newSpkCutting.bagian];

    updated[bagianIndex].bahan[bahanIndex][key] = value;

    // Jika bahan_id berubah, fetch warna untuk bahan tersebut dan reset warna

    if (key === "bahan_id" && value) {
      const warnaData = await fetchWarnaByBahan(value);

      updated[bagianIndex].bahan[bahanIndex].warna = "";

      updated[bagianIndex].bahan[bahanIndex].warna_custom = "";

      // Simpan warna list untuk bahan ini

      updated[bagianIndex].bahan[bahanIndex].warnaList = warnaData;
    }

    // Jika warna diubah ke "Lainnya", reset warna_custom

    if (key === "warna" && value !== "Lainnya") {
      updated[bagianIndex].bahan[bahanIndex].warna_custom = "";
    }

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const handleWarnaCustomChange = (bagianIndex, bahanIndex, value) => {
    const updated = [...newSpkCutting.bagian];

    updated[bagianIndex].bahan[bahanIndex].warna_custom = value;

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const addBagian = () => {
    setNewSpkCutting((prev) => ({
      ...prev,

      bagian: [...prev.bagian, { nama_bagian: "", bahan: [] }],
    }));
  };

  const addBahan = (bagianIndex) => {
    const updated = [...newSpkCutting.bagian];

    updated[bagianIndex].bahan.push({ bahan_id: "", warna: "", warna_custom: "", qty: "" });

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const removeBahan = (bagianIndex, bahanIndex) => {
    const updated = [...newSpkCutting.bagian];

    updated[bagianIndex].bahan.splice(bahanIndex, 1);

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const handleDetailClick = (spk) => {
    setSelectedDetailSpk(spk); // Simpan data hutang yang dipilih
  };

  const handleDownloadQr = async (spkId) => {
    try {
      const response = await API.get(`/spk_cutting/${spkId}/download-qr`, {
        responseType: "blob", // Penting untuk download file
      });

      // Buat URL untuk blob

      const url = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement("a");

      link.href = url;

      link.setAttribute("download", `qr-code-spk-cutting-${spkId}.pdf`);

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading QR code:", error);

      alert(error.response?.data?.message || "Gagal mengunduh QR code.");
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
    } catch (error) {
      console.error("Error exporting to Excel:", error);

      alert(error.response?.data?.message || "Gagal export data ke Excel.");
    }
  };

  const handleEditClick = async (spk) => {
    try {
      const response = await API.get(`/spk_cutting/${spk.id}`);

      const data = response.data.data || response.data;

      // Transform data untuk form edit

      const bagianData = await Promise.all(
        (data.bagian || []).map(async (bagian) => {
          const bahanData = await Promise.all(
            (bagian.bahan || []).map(async (bahan) => {
              const bahanId = bahan.bahan_id?.toString() || "";

              // Fetch warna untuk bahan ini

              const warnaData = bahanId ? await fetchWarnaByBahan(bahanId) : [];

              return {
                bahan_id: bahanId,

                warna: bahan.warna || "",

                warna_custom: warnaData.some((item) => {
                  const warnaItem = typeof item === "string" ? item : item.warna;

                  return warnaItem === bahan.warna;
                })
                  ? ""
                  : bahan.warna || "",

                qty: bahan.qty?.toString() || "",

                warnaList: warnaData,
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

        produk_id: data.produk_id?.toString() || "",

        tanggal_batas_kirim: data.tanggal_batas_kirim || "",

        harga_jasa: data.harga_jasa?.toString() || "",
        harga_jasaDisplay: data.harga_jasa ? formatRupiahInput(data.harga_jasa.toString()) : "",

        satuan_harga: data.satuan_harga || "Pcs",

        jumlah_asumsi_produk: data.jumlah_asumsi_produk?.toString() || "",
        jumlah_asumsi_produkDisplay: data.jumlah_asumsi_produk ? formatRibuan(data.jumlah_asumsi_produk.toString()) : "",

        jenis_spk: data.jenis_spk || "",

        keterangan: data.keterangan || "",

        tukang_cutting_id: data.tukang_cutting_id?.toString() || "",

        bagian: bagianData.length > 0 ? bagianData : [{ nama_bagian: "", bahan: [] }],
      });

      setShowEditForm(true);
    } catch (error) {
      console.error("Error loading SPK for edit:", error);

      alert("Gagal memuat data untuk edit.");
    }
  };

  const handleEditInputChange = (e) => {
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

    setEditSpkCutting((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditBagianChange = (index, key, value) => {
    const updated = [...editSpkCutting.bagian];

    updated[index][key] = value;

    setEditSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const handleEditBahanChange = (bagianIndex, bahanIndex, key, value) => {
    const updated = [...editSpkCutting.bagian];

    updated[bagianIndex].bahan[bahanIndex][key] = value;

    setEditSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const handleEditWarnaCustomChange = (bagianIndex, bahanIndex, value) => {
    const updated = [...editSpkCutting.bagian];

    updated[bagianIndex].bahan[bahanIndex].warna_custom = value;

    setEditSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const addEditBagian = () => {
    setEditSpkCutting((prev) => ({
      ...prev,

      bagian: [...prev.bagian, { nama_bagian: "", bahan: [] }],
    }));
  };

  const addEditBahan = (bagianIndex) => {
    const updated = [...editSpkCutting.bagian];

    updated[bagianIndex].bahan.push({ bahan_id: "", warna: "", warna_custom: "", qty: "" });

    setEditSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const removeEditBahan = (bagianIndex, bahanIndex) => {
    const updated = [...editSpkCutting.bagian];

    updated[bagianIndex].bahan.splice(bahanIndex, 1);

    setEditSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();

    // Validasi

    if (editSpkCutting.bagian.length === 0) {
      alert("Minimal harus ada 1 bagian!");

      return;
    }

    for (let i = 0; i < editSpkCutting.bagian.length; i++) {
      const bagian = editSpkCutting.bagian[i];

      if (!bagian.nama_bagian || bagian.nama_bagian.trim() === "") {
        alert(`Bagian ${i + 1}: Nama bagian harus diisi!`);

        return;
      }

      if (bagian.bahan.length === 0) {
        alert(`Bagian ${i + 1}: Minimal harus ada 1 bahan!`);

        return;
      }

      for (let j = 0; j < bagian.bahan.length; j++) {
        const bahan = bagian.bahan[j];

        if (!bahan.bahan_id) {
          alert(`Bagian ${i + 1}, Bahan ${j + 1}: Bahan harus dipilih!`);

          return;
        }

        if (bahan.warna === "Lainnya" && (!bahan.warna_custom || bahan.warna_custom.trim() === "")) {
          alert(`Bagian ${i + 1}, Bahan ${j + 1}: Warna custom harus diisi jika memilih "Lainnya"!`);

          return;
        }

        if (!bahan.qty || bahan.qty <= 0) {
          alert(`Bagian ${i + 1}, Bahan ${j + 1}: Qty harus lebih dari 0!`);

          return;
        }
      }
    }

    // Konversi bahan_id menjadi integer

    const dataToSend = {
      produk_id: parseInt(editSpkCutting.produk_id),
      tanggal_batas_kirim: editSpkCutting.tanggal_batas_kirim,
      harga_jasa: parseFloat(editSpkCutting.harga_jasa),
      satuan_harga: editSpkCutting.satuan_harga,
      jumlah_asumsi_produk: editSpkCutting.jumlah_asumsi_produk ? parseInt(editSpkCutting.jumlah_asumsi_produk, 10) : null,
      jenis_spk: editSpkCutting.jenis_spk || null,
      keterangan: editSpkCutting.keterangan || "",
      tukang_cutting_id: parseInt(editSpkCutting.tukang_cutting_id),
      tukang_pola_id: editSpkCutting.tukang_pola_id ? parseInt(editSpkCutting.tukang_pola_id) : null,
      bagian: editSpkCutting.bagian.map((bagian) => ({
        nama_bagian: bagian.nama_bagian,

        bahan: bagian.bahan.map((bahan) => ({
          bahan_id: parseInt(bahan.bahan_id),

          // Jika warna adalah "Lainnya", gunakan warna_custom, jika tidak gunakan warna

          warna: bahan.warna === "Lainnya" ? bahan.warna_custom || null : bahan.warna || null,

          qty: parseFloat(bahan.qty),
        })),
      })),
    };

    console.log("Data SPK Cutting yang dikirim untuk update:", dataToSend);

    try {
      const response = await API.put(`/spk_cutting/${editSpkCutting.id}`, dataToSend);

      console.log("Response:", response.data);

      alert("SPK Cutting berhasil diperbarui!");

      // Refresh data dan summary

      await fetchSpkCutting();

      // Reset form

      setEditSpkCutting({
        id: null,
        id_spk_cutting: "",
        produk_id: "",
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

        alert(`Validasi gagal:\n${errorMessages}`);
      } else {
        alert(error.response?.data?.message || "Terjadi kesalahan saat memperbarui SPK Cutting.");
      }
    }
  };

  return (
    <div className="spk-cutting-page">
      <div className="spk-cutting-header">
        <div className="spk-cutting-header-icon">
          <FaInfoCircle />
        </div>

        <h1>Data SPK Cutting</h1>
      </div>

      {/* Summary Card - Dinamis berdasarkan filter */}
      <div className="spk-cutting-summary-cards">
        <div className="spk-cutting-summary-card active">
          <div className="spk-cutting-summary-card-icon">{statusFilter === "all" ? "📊" : statusFilter === "In Progress" ? "⚙️" : "✅"}</div>

          <div className="spk-cutting-summary-card-content">
            <div className="spk-cutting-summary-card-label">{statusFilter === "all" ? "Semua" : statusFilter === "In Progress" ? "In Progress" : "Completed"}</div>

            <div className="spk-cutting-summary-card-value">{statusFilter === "all" ? summary.all : statusFilter === "In Progress" ? summary["In Progress"]?.count || 0 : summary.Completed}</div>
          </div>
        </div>
      </div>

      {/* Card In Progress Mingguan & Harian */}
      <div className="spk-cutting-in-progress-cards">
        {/* Card In Progress Mingguan */}
        <div className="spk-cutting-in-progress-card weekly">
          <div className="spk-cutting-in-progress-card-icon">⚙️</div>
          <div className="spk-cutting-in-progress-card-content">
            <div className="spk-cutting-in-progress-card-label">{statusFilter === "Completed" ? "Completed Mingguan" : statusFilter === "In Progress" ? "In Progress Mingguan" : "In Progress Mingguan"}</div>
            {/* Filter periode mingguan */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px", marginTop: "4px", alignItems: "center" }}>
              <input type="date" value={weeklyStart} onChange={handleWeeklyStartChange} className="spk-cutting-form-input" style={{ maxWidth: "150px", padding: "6px 10px", fontSize: "12px" }} />
              <span style={{ fontSize: "12px", alignSelf: "center", color: "#667eea" }}>s/d</span>
              <input type="date" value={weeklyEnd} onChange={handleWeeklyEndChange} className="spk-cutting-form-input" style={{ maxWidth: "150px", padding: "6px 10px", fontSize: "12px" }} />
              {(weeklyStart || weeklyEnd) && (
                <button
                  onClick={handleResetWeekly}
                  style={{
                    background: "#f5576c",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e63946";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f5576c";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                  title="Reset tanggal"
                >
                  <FaTimes style={{ fontSize: "10px" }} /> Reset
                </button>
              )}
            </div>
            {statusFilter === "Completed" ? (
              <>
                <div className="spk-cutting-in-progress-card-value">
                  Total: <strong>{(summary.in_progress_weekly?.total_asumsi_produk || 0).toLocaleString("id-ID")} Pcs</strong>
                </div>
                <div className="spk-cutting-in-progress-card-info">
                  Periode ini: <strong>{summary.in_progress_weekly?.count || 0} SPK</strong>
                </div>
              </>
            ) : (
              <>
                <div className="spk-cutting-in-progress-card-value">Target: {Number(summary.in_progress_weekly?.target || 50000).toLocaleString("id-ID")} Pcs</div>
                <div className="spk-cutting-in-progress-card-info">
                  Produk: <strong>{summary.in_progress_weekly?.count || 0} SPK</strong>
                </div>
                <div className="spk-cutting-in-progress-card-info">
                  Periode ini: <strong>{parseInt(summary.in_progress_weekly?.total_asumsi_produk || 0, 10).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Pcs</strong>
                </div>
                <div className="spk-cutting-in-progress-card-status">
                  {summary.in_progress_weekly?.remaining > 0 ? (
                    <>
                      Kurang <strong>{Number(summary.in_progress_weekly?.remaining || 0).toLocaleString("id-ID")} Pcs</strong> untuk capai {Number(summary.in_progress_weekly?.target || 50000).toLocaleString("id-ID")}
                    </>
                  ) : (
                    <span style={{ fontWeight: "600", color: "#16a34a" }}>Target mingguan tercapai 🎉</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card In Progress Harian */}
        <div className="spk-cutting-in-progress-card daily">
          <div className="spk-cutting-in-progress-card-icon daily">📅</div>
          <div className="spk-cutting-in-progress-card-content">
            <div className="spk-cutting-in-progress-card-label daily">{statusFilter === "Completed" ? "Completed Harian" : statusFilter === "In Progress" ? "In Progress Harian" : "In Progress Harian"}</div>
            {/* Filter tanggal harian */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px", marginTop: "4px", alignItems: "center" }}>
              <input type="date" value={dailyDate} onChange={handleDailyDateChange} className="spk-cutting-form-input" style={{ maxWidth: "180px", padding: "6px 10px", fontSize: "12px" }} />
              {dailyDate && (
                <button
                  onClick={handleResetDaily}
                  style={{
                    background: "#f5576c",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e63946";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f5576c";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                  title="Reset tanggal"
                >
                  <FaTimes style={{ fontSize: "10px" }} /> Reset
                </button>
              )}
            </div>
            {statusFilter === "Completed" ? (
              <>
                <div className="spk-cutting-in-progress-card-value daily">
                  Total: <strong>{Number(summary.in_progress_daily?.total_asumsi_produk || 0).toLocaleString("id-ID")} Pcs</strong>
                </div>
                <div className="spk-cutting-in-progress-card-info daily">
                  Tanggal ini: <strong>{summary.in_progress_daily?.count || 0} SPK</strong>
                </div>
              </>
            ) : (
              <>
                <div className="spk-cutting-in-progress-card-value daily">Target: {(summary.in_progress_daily?.target || 7143).toLocaleString("id-ID")} Pcs</div>
                <div className="spk-cutting-in-progress-card-info daily">
                  Produk: <strong>{summary.in_progress_daily?.count || 0} SPK</strong>
                </div>
                <div className="spk-cutting-in-progress-card-info daily">
                  Tanggal ini: <strong>{parseInt(summary.in_progress_daily?.total_asumsi_produk || 0, 10).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Pcs</strong>
                </div>
                <div className="spk-cutting-in-progress-card-status daily">
                  {summary.in_progress_daily?.remaining > 0 ? (
                    <>
                      Kurang <strong>{Number(summary.in_progress_daily?.remaining || 0).toLocaleString("id-ID")} Pcs</strong> untuk capai {Number(summary.in_progress_daily?.target || 7143).toLocaleString("id-ID")}
                    </>
                  ) : (
                    <span style={{ fontWeight: "600", color: "#16a34a" }}>Target harian tercapai 💪</span>
                  )}
                </div>
              </>
            )}
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

                  produk_id: "",

                  tanggal_batas_kirim: "",

                  harga_jasa: "",
                  harga_jasaDisplay: "",

                  satuan_harga: "Pcs",

                  jumlah_asumsi_produk: "",
                  jumlah_asumsi_produkDisplay: "",

                  keterangan: "",

                  tukang_cutting_id: "",

                  bagian: [],
                });

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
            <select className="spk-cutting-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Semua Status</option>

              <option value="In Progress">In Progress</option>

              <option value="Completed">Completed</option>
            </select>

            <div className="spk-cutting-search-bar">
              <input type="text" placeholder="Cari ID, Nomor SPK, Tukang, atau Produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? (
          <p className="spk-cutting-loading">Memuat data...</p>
        ) : error ? (
          <p className="spk-cutting-error">{error}</p>
        ) : (
          <>
            <table className="spk-cutting-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>SPK Cutting ID</th>
                  <th>Tukang Cutting</th>
                  <th>Nama Produk</th>
                  <th>Deadline</th>
                  <th>Sisa Hari</th>
                  <th>Harga Jasa</th>
                  <th>Harga Per Pcs</th>
                  <th>Jumlah Asumsi Produk</th>
                  <th>Jenis SPK</th>
                  <th>Status</th>
                  <th>Tanggal Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {currentItems.map((spk, index) => (
                  <tr key={spk.id}>
                    <td>{indexOfFirstItem + index + 1}</td>
                    <td>{spk.id_spk_cutting}</td>
                    <td>{spk.tukang_cutting?.nama_tukang_cutting || "-"}</td>
                    <td>{spk.produk?.nama_produk || "-"}</td>
                    <td>{spk.tanggal_batas_kirim || "-"}</td>
                    <td>{spk.sisa_hari !== null ? spk.sisa_hari + " hari" : "Belum ada deadline"}</td>
                    <td className="spk-cutting-price">
                      {formatRupiah(spk.harga_jasa)} / {spk.satuan_harga}
                    </td>
                    <td className="spk-cutting-price">{formatRupiah(spk.harga_per_pcs)}</td>
                    <td>{spk.jumlah_asumsi_produk !== null && spk.jumlah_asumsi_produk !== undefined ? spk.jumlah_asumsi_produk.toLocaleString("id-ID") : "-"}</td>
                    <td>{spk.jenis_spk || "-"}</td>
                    <td>
                      <span className={`spk-cutting-badge ${spk.status_cutting?.toLowerCase().replace(" ", "-") || "in-progress"}`}>{spk.status_cutting || "In Progress"}</span>
                    </td>
                    <td>{new Date(spk.created_at).toLocaleDateString("id-ID")}</td>
                    <td>
                      <button className="spk-cutting-btn-icon view" onClick={() => handleDetailClick(spk)} title="Lihat Detail" style={{ marginRight: "8px" }}>
                        <FaInfoCircle />
                      </button>
                      <button className="spk-cutting-btn-icon edit" onClick={() => handleEditClick(spk)} title="Edit" style={{ marginRight: "8px" }}>
                        <FaEdit />
                      </button>
                      <button className="spk-cutting-btn-icon download" onClick={() => handleDownloadQr(spk.id)} title="Download QR Code" disabled={!spk.barcode}>
                        <FaDownload />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}

            {totalPages > 1 && (
              <div className="spk-cutting-pagination">
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;

                  return (
                    <button key={page} className={currentPage === page ? "active" : ""} onClick={() => goToPage(page)}>
                      {page}
                    </button>
                  );
                })}

                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Tambah SPK Cutting */}
      {showForm && (
        <div className="spk-cutting-modal">
          <div className="spk-cutting-modal-content">
            <h2>Tambah SPK Cutting</h2>
            <form onSubmit={handleFormSubmit} className="spk-cutting-form">
              <div className="spk-cutting-form-row">
                <div className="spk-cutting-form-group">
                  <label>Tukang Cutting:</label>
                  <select name="tukang_cutting_id" value={newSpkCutting.tukang_cutting_id} onChange={handleInputChange} required>
                    <option value="">Pilih Tukang</option>
                    {tukangList.map((tukang) => (
                      <option key={tukang.id} value={tukang.id}>
                        {tukang.nama_tukang_cutting}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="spk-cutting-form-group">
                  <label>Nomor Seri SPK:</label>
                  <input type="text" name="id_spk_cutting" value={newSpkCutting.id_spk_cutting || "Pilih tukang cutting terlebih dahulu"} readOnly disabled />
                  <small style={{ color: "#666", fontSize: "12px", marginTop: "4px", display: "block" }}>Nomor seri akan di-generate otomatis berdasarkan nama tukang cutting yang dipilih.</small>
                </div>
              </div>

              <div className="spk-cutting-form-row">
                <div className="spk-cutting-form-group">
                  <label>Tukang Pola:</label>
                  <select name="tukang_pola_id" value={newSpkCutting.tukang_pola_id} onChange={handleInputChange}>
                    <option value="">Pilih Tukang Pola (Opsional)</option>
                    {tukangPolaList.map((tukangPola) => (
                      <option key={tukangPola.id} value={tukangPola.id}>
                        {tukangPola.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="spk-cutting-form-row">
                <div className="spk-cutting-form-group">
                  <label>Produk:</label>
                  <select name="produk_id" value={newSpkCutting.produk_id} onChange={handleInputChange} required>
                    <option value="">Pilih Produk</option>
                    {produkList.map((produk) => (
                      <option key={produk.id} value={produk.id}>
                        {produk.nama_produk}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="spk-cutting-form-group">
                  <label>Tanggal Batas Kirim:</label>
                  <input type="date" name="tanggal_batas_kirim" value={newSpkCutting.tanggal_batas_kirim} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="spk-cutting-form-row">
                <div className="spk-cutting-form-group">
                  <label>Harga Jasa:</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#666", fontWeight: "500" }}>Rp</span>
                    <input type="text" name="harga_jasa" value={newSpkCutting.harga_jasaDisplay} onChange={handleInputChange} placeholder="0" style={{ paddingLeft: "40px" }} required />
                  </div>
                </div>

                <div className="spk-cutting-form-group">
                  <label>Satuan Harga:</label>
                  <select name="satuan_harga" value={newSpkCutting.satuan_harga} onChange={handleInputChange} required>
                    <option value="Pcs">Pcs</option>
                    <option value="Lusin">Lusin</option>
                  </select>
                </div>
              </div>

              <div className="spk-cutting-form-row">
                <div className="spk-cutting-form-group">
                  <label>Jumlah Asumsi Produk:</label>
                  <input type="text" name="jumlah_asumsi_produk" value={newSpkCutting.jumlah_asumsi_produkDisplay} onChange={handleInputChange} placeholder="Contoh: 1.000" />
                </div>

                <div className="spk-cutting-form-group">
                  <label>Jenis SPK:</label>
                  <select name="jenis_spk" value={newSpkCutting.jenis_spk} onChange={handleInputChange}>
                    <option value="">Pilih Jenis SPK</option>
                    <option value="Terjual">Terjual</option>
                    <option value="Fittingan">Fittingan</option>
                    <option value="Habisin Bahan">Habisin Bahan</option>
                  </select>
                </div>
              </div>

              <div className="spk-cutting-form-group">
                <label>Keterangan:</label>
                <textarea name="keterangan" value={newSpkCutting.keterangan} onChange={handleInputChange} />
              </div>

              {/* Bagian dan Bahan */}
              <h3>Bagian & Bahan</h3>
              {newSpkCutting.bagian.map((bagian, bagianIndex) => (
                <div key={bagianIndex} className="spk-cutting-bagian-section">
                  <h4>Bagian {bagianIndex + 1}</h4>
                  <div className="spk-cutting-form-group">
                    <label>Nama Bagian:</label>
                    <select value={bagian.nama_bagian || ""} onChange={(e) => handleBagianChange(bagianIndex, "nama_bagian", e.target.value)} required>
                      <option value="">Pilih Nama Bagian</option>
                      {namaBagianList.map((nama, idx) => (
                        <option key={idx} value={nama}>
                          {nama.charAt(0).toUpperCase() + nama.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {bagian.bahan.map((bahan, bahanIndex) => (
                    <div key={bahanIndex} className="spk-cutting-bahan-group">
                      <select value={bahan.bahan_id || ""} onChange={(e) => handleBahanChange(bagianIndex, bahanIndex, "bahan_id", e.target.value)} required>
                        <option value="">Pilih Bahan</option>
                        {bahanList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nama_bahan}
                          </option>
                        ))}
                      </select>
                      <select value={bahan.warna || ""} onChange={(e) => handleBahanChange(bagianIndex, bahanIndex, "warna", e.target.value)} disabled={!bahan.bahan_id}>
                        <option value="">{bahan.bahan_id ? "Pilih Warna" : "Pilih Bahan terlebih dahulu"}</option>
                        {(bahan.warnaList || []).map((item, idx) => {
                          const warna = typeof item === "string" ? item : item.warna;
                          const stok = typeof item === "object" ? item.stok : 999;
                          const isDisabled = stok === 0 && warna !== "Lainnya";
                          return (
                            <option key={idx} value={warna} disabled={isDisabled} style={isDisabled ? { color: "#999", opacity: 0.5 } : {}}>
                              {warna} {stok !== 999 && `(${stok} stok)`}
                            </option>
                          );
                        })}
                      </select>
                      {bahan.warna === "Lainnya" && <input type="text" placeholder="Masukkan warna custom..." value={bahan.warna_custom || ""} onChange={(e) => handleWarnaCustomChange(bagianIndex, bahanIndex, e.target.value)} required />}
                      <input type="number" placeholder="Qty (Jumlah Rol)" value={bahan.qty} onChange={(e) => handleBahanChange(bagianIndex, bahanIndex, "qty", e.target.value)} required />
                      <button type="button" onClick={() => removeBahan(bagianIndex, bahanIndex)}>
                        Hapus Bahan
                      </button>
                    </div>
                  ))}

                  <button type="button" className="spk-cutting-btn spk-cutting-btn-success" onClick={() => addBahan(bagianIndex)}>
                    <FaPlus /> Tambah Bahan
                  </button>
                </div>
              ))}

              <button type="button" className="spk-cutting-btn spk-cutting-btn-success" onClick={addBagian}>
                <FaPlus /> Tambah Bagian
              </button>

              <div className="spk-cutting-form-actions">
                <button type="submit" className="spk-cutting-btn spk-cutting-btn-primary">
                  Simpan
                </button>
                <button type="button" className="spk-cutting-btn spk-cutting-btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
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
                <span>{selectedDetailSpk.id_spk_cutting}</span>
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
                <strong>Produk</strong>
                <span>{selectedDetailSpk.produk?.nama_produk || "-"}</span>
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
                <strong>Jumlah Asumsi Produk</strong>
                <span>{selectedDetailSpk.jumlah_asumsi_produk !== null && selectedDetailSpk.jumlah_asumsi_produk !== undefined ? selectedDetailSpk.jumlah_asumsi_produk.toLocaleString("id-ID") : "-"}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Jenis SPK</strong>
                <span>{selectedDetailSpk.jenis_spk || "-"}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Status</strong>
                <span>
                  <span className={`spk-cutting-badge ${selectedDetailSpk.status_cutting?.toLowerCase().replace(" ", "-") || "in-progress"}`}>{selectedDetailSpk.status_cutting || "In Progress"}</span>
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
                        <th key={i} colSpan="3" style={{ textAlign: "center" }}>
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
                          return (
                            <React.Fragment key={`${bagianIndex}-${rowIndex}`}>
                              <td>{bahan ? bahan.bahan?.nama_bahan || "-" : ""}</td>
                              <td>{bahan ? bahan.warna || "-" : ""}</td>
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
            <form onSubmit={handleFormUpdate} className="spk-cutting-form">
              <div className="spk-cutting-form-row">
                <div className="spk-cutting-form-group">
                  <label>Tukang Cutting:</label>
                  <select name="tukang_cutting_id" value={editSpkCutting.tukang_cutting_id} onChange={handleEditInputChange} required>
                    <option value="">Pilih Tukang</option>
                    {tukangList.map((tukang) => (
                      <option key={tukang.id} value={tukang.id}>
                        {tukang.nama_tukang_cutting}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="spk-cutting-form-group">
                  <label>Tukang Pola:</label>
                  <select name="tukang_pola_id" value={editSpkCutting.tukang_pola_id} onChange={handleEditInputChange}>
                    <option value="">Pilih Tukang Pola (Opsional)</option>
                    {tukangPolaList.map((tukangPola) => (
                      <option key={tukangPola.id} value={tukangPola.id}>
                        {tukangPola.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="spk-cutting-form-group">
                  <label>Nomor Seri SPK:</label>
                  <input type="text" name="id_spk_cutting" value={editSpkCutting.id_spk_cutting || ""} readOnly disabled />
                  <small style={{ color: "#666", fontSize: "12px", marginTop: "4px", display: "block" }}>Nomor seri tidak dapat diubah.</small>
                </div>
              </div>

              <div className="spk-cutting-form-row">
                <div className="spk-cutting-form-group">
                  <label>Produk:</label>
                  <select name="produk_id" value={editSpkCutting.produk_id} onChange={handleEditInputChange} required>
                    <option value="">Pilih Produk</option>
                    {produkList.map((produk) => (
                      <option key={produk.id} value={produk.id}>
                        {produk.nama_produk}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="spk-cutting-form-group">
                  <label>Tanggal Batas Kirim:</label>
                  <input type="date" name="tanggal_batas_kirim" value={editSpkCutting.tanggal_batas_kirim} onChange={handleEditInputChange} required />
                </div>
              </div>

              <div className="spk-cutting-form-row">
                <div className="spk-cutting-form-group">
                  <label>Harga Jasa:</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#666", fontWeight: "500" }}>Rp</span>
                    <input type="text" name="harga_jasa" value={editSpkCutting.harga_jasaDisplay} onChange={handleEditInputChange} placeholder="0" style={{ paddingLeft: "40px" }} required />
                  </div>
                </div>

                <div className="spk-cutting-form-group">
                  <label>Satuan Harga:</label>
                  <select name="satuan_harga" value={editSpkCutting.satuan_harga} onChange={handleEditInputChange} required>
                    <option value="Pcs">Pcs</option>
                    <option value="Lusin">Lusin</option>
                  </select>
                </div>
              </div>

              <div className="spk-cutting-form-row">
                <div className="spk-cutting-form-group">
                  <label>Jumlah Asumsi Produk:</label>
                  <input type="text" name="jumlah_asumsi_produk" value={editSpkCutting.jumlah_asumsi_produkDisplay} onChange={handleEditInputChange} placeholder="Contoh: 1.000" />
                </div>

                <div className="spk-cutting-form-group">
                  <label>Jenis SPK:</label>
                  <select name="jenis_spk" value={editSpkCutting.jenis_spk} onChange={handleEditInputChange}>
                    <option value="">Pilih Jenis SPK</option>
                    <option value="Terjual">Terjual</option>
                    <option value="Fittingan">Fittingan</option>
                    <option value="Habisin Bahan">Habisin Bahan</option>
                  </select>
                </div>
              </div>

              <div className="spk-cutting-form-group">
                <label>Keterangan:</label>
                <textarea name="keterangan" value={editSpkCutting.keterangan} onChange={handleEditInputChange} />
              </div>

              {/* Bagian dan Bahan */}
              <h3>Bagian & Bahan</h3>
              {editSpkCutting.bagian.map((bagian, bagianIndex) => (
                <div key={bagianIndex} className="spk-cutting-bagian-section">
                  <h4>Bagian {bagianIndex + 1}</h4>
                  <div className="spk-cutting-form-group">
                    <label>Nama Bagian:</label>
                    <select value={bagian.nama_bagian || ""} onChange={(e) => handleEditBagianChange(bagianIndex, "nama_bagian", e.target.value)} required>
                      <option value="">Pilih Nama Bagian</option>
                      {namaBagianList.map((nama, idx) => (
                        <option key={idx} value={nama}>
                          {nama.charAt(0).toUpperCase() + nama.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {bagian.bahan.map((bahan, bahanIndex) => (
                    <div key={bahanIndex} className="spk-cutting-bahan-group">
                      <select value={bahan.bahan_id || ""} onChange={(e) => handleEditBahanChange(bagianIndex, bahanIndex, "bahan_id", e.target.value)} required>
                        <option value="">Pilih Bahan</option>
                        {bahanList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nama_bahan}
                          </option>
                        ))}
                      </select>
                      <select value={bahan.warna || ""} onChange={(e) => handleEditBahanChange(bagianIndex, bahanIndex, "warna", e.target.value)} disabled={!bahan.bahan_id}>
                        <option value="">{bahan.bahan_id ? "Pilih Warna" : "Pilih Bahan terlebih dahulu"}</option>
                        {(bahan.warnaList || []).map((item, idx) => {
                          const warna = typeof item === "string" ? item : item.warna;
                          const stok = typeof item === "object" ? item.stok : 999;
                          const isDisabled = stok === 0 && warna !== "Lainnya";
                          return (
                            <option key={idx} value={warna} disabled={isDisabled} style={isDisabled ? { color: "#999", opacity: 0.5 } : {}}>
                              {warna} {stok !== 999 && `(${stok} stok)`}
                            </option>
                          );
                        })}
                      </select>
                      {bahan.warna === "Lainnya" && (
                        <input type="text" placeholder="Masukkan warna custom..." value={bahan.warna_custom || ""} onChange={(e) => handleEditWarnaCustomChange(bagianIndex, bahanIndex, e.target.value)} required />
                      )}
                      <input type="number" placeholder="Qty (Jumlah Rol)" value={bahan.qty} onChange={(e) => handleEditBahanChange(bagianIndex, bahanIndex, "qty", e.target.value)} required />
                      <button type="button" onClick={() => removeEditBahan(bagianIndex, bahanIndex)}>
                        Hapus Bahan
                      </button>
                    </div>
                  ))}

                  <button type="button" className="spk-cutting-btn spk-cutting-btn-success" onClick={() => addEditBahan(bagianIndex)}>
                    <FaPlus /> Tambah Bahan
                  </button>
                </div>
              ))}

              <button type="button" className="spk-cutting-btn spk-cutting-btn-success" onClick={addEditBagian}>
                <FaPlus /> Tambah Bagian
              </button>

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
    </div>
  );
};

export default SpkCutting;

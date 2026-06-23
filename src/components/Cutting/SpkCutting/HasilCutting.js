import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import "./SpkCuting.css";
import "./HasilCutting.css";
import API from "../../../api";

const SWEETALERT_CDN = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js";

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

const HASIL_MODE_OPTIONS = [
  { key: "utama", label: "Hasil Bahan Utama", icon: "fas fa-layer-group" },
  { key: "kombinasi", label: "Hasil Kombinasi", icon: "fas fa-object-group" },
];

const getSkuOptionLabel = (sku) => {
  const skuName = String(sku?.sku_name || sku?.sku || "").trim();
  const warna = String(sku?.product_colour || sku?.warna || "").trim();
  const ukuran = String(sku?.product_size || sku?.ukuran || "").trim();
  const details = [warna, ukuran].filter(Boolean).join(" - ");
  return details ? `${skuName || "SKU"} (${details})` : skuName || `SKU #${sku?.id || "-"}`;
};

const getSpkProductName = (spk) => spk?.productList?.product_group || spk?.productList?.product || spk?.product_list?.product_group || spk?.product_list?.product || spk?.produk?.product_group || spk?.produk?.nama_produk || "N/A";
const getDistribusiSpk = (distribusi) => distribusi?.spkCutting || distribusi?.spk_cutting || {};
const getDistribusiProductName = (distribusi) => {
  const spk = getDistribusiSpk(distribusi);
  return spk?.productList?.product_group || spk?.productList?.product || spk?.product_list?.product_group || spk?.product_list?.product || spk?.produk?.product_group || spk?.produk?.nama_produk || "N/A";
};
const getDistribusiSku = (distribusi) => {
  const detail = Array.isArray(distribusi?.detail) ? distribusi.detail[0] : null;
  return detail?.productListSku || detail?.product_list_sku || detail?.produkSku || detail?.produk_sku || null;
};

const parseSafeFloat = (value) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

const HasilCutting = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [spkCuttingList, setSpkCuttingList] = useState([]);
  const [selectedSpkId, setSelectedSpkId] = useState("");
  const [selectedDistribusiId, setSelectedDistribusiId] = useState("");
  const [selectedDistribusi, setSelectedDistribusi] = useState(null);
  const [hasilMode, setHasilMode] = useState("utama");
  const [spkDetail, setSpkDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataHasilCutting, setDataHasilCutting] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [showForm, setShowForm] = useState(false); // Default false agar langsung tampil index
  const [editingId, setEditingId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [originalData, setOriginalData] = useState(null); // snapshot data lama saat edit
  const [tanggalPotong, setTanggalPotong] = useState(new Date().toISOString().split("T")[0]);
  // State untuk menyimpan jumlah lembar dan jumlah produk per item (per warna)
  const [inputData, setInputData] = useState({});
  // State untuk menyimpan data acuan
  const [dataAcuan, setDataAcuan] = useState([]);
  // Stat target mingguan & harian
  const [targetStats, setTargetStats] = useState({
    weekly_target: 50000,
    weekly_total: 0,
    weekly_remaining: 50000,
    daily_target: 7143,
    daily_total: 0,
    daily_remaining: 7143,
    week_start: "",
    week_end: "",
    today: "",
  });
  // Filter periode untuk card target (baca dari URL atau default kosong)
  const [weeklyStart, setWeeklyStart] = useState(searchParams.get("weekly_start") || "");
  const [weeklyEnd, setWeeklyEnd] = useState(searchParams.get("weekly_end") || "");
  const [dailyDate, setDailyDate] = useState(searchParams.get("daily_date") || "");
  // Filter tukang cutting (baca dari URL)
  const [tukangCuttingFilter, setTukangCuttingFilter] = useState(searchParams.get("tukang_cutting") || "");
  // Search data index hasil cutting
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchKeywordDebounced, setSearchKeywordDebounced] = useState("");
  // State untuk search SPK Cutting
  const [searchSpkQuery, setSearchSpkQuery] = useState("");
  const [showSpkDropdown, setShowSpkDropdown] = useState(false);
  // State untuk distribusi seri (dengan detail warna)
  const [distribusiSeri, setDistribusiSeri] = useState([{ jumlah_produk: "", detail: [] }]);

  // Fetch list distribusi SPK Cutting
  const fetchDistribusiCutting = async () => {
    try {
      const response = await API.get("/spk-cutting-distribusi");
      const data = response.data?.data || response.data || [];
      // Pastikan selalu array
      setSpkCuttingList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Gagal mengambil distribusi SPK Cutting:", error);
      setSpkCuttingList([]);
    }
  };

  useEffect(() => {
    fetchDistribusiCutting();
  }, []);

  // Track previous searchParams untuk detect perubahan filter
  const prevSearchParamsRef = useRef(searchParams.toString());
  
  // Log searchParams setiap kali berubah untuk debugging
  useEffect(() => {
    console.log('SearchParams changed:', searchParams.toString());
    console.log('Current URL:', window.location.href);
  }, [searchParams]);

  // Debounce input pencarian agar request API tidak terlalu sering
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchKeywordDebounced(searchKeyword.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Reset ke halaman pertama saat keyword search berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeywordDebounced]);
  
  // Handle Esc key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (detailData) {
          setDetailData(null);
        } else if (showForm) {
          handleBatal();
        }
      }
    };
    
    if (showForm || detailData) {
      window.addEventListener("keydown", handleKeyDown);
    }
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showForm, detailData]);
  
  // Fetch data hasil cutting - baca langsung dari URL untuk menghindari race condition
  useEffect(() => {
    const fetchDataHasilCutting = async () => {
      if (showForm) return; // Jangan fetch jika sedang di form

      setLoadingData(true);
      try {
        // Baca langsung dari URL (location.search) untuk menghindari race condition dengan searchParams
        const urlParams = new URLSearchParams(location.search);
        const weeklyStartFromUrl = urlParams.get("weekly_start") || searchParams.get("weekly_start");
        const weeklyEndFromUrl = urlParams.get("weekly_end") || searchParams.get("weekly_end");
        const dailyDateFromUrl = urlParams.get("daily_date") || searchParams.get("daily_date");
        const tukangCuttingFromUrl = urlParams.get("tukang_cutting") || searchParams.get("tukang_cutting");
        
        console.log('useEffect triggered - Reading from URL:', {
          weeklyStartFromUrl,
          weeklyEndFromUrl,
          dailyDateFromUrl,
          tukangCuttingFromUrl,
          locationSearch: location.search,
          searchParamsString: searchParams.toString(),
          windowLocation: window.location.href
        });
        
        // Cek apakah searchParams berubah (filter berubah)
        const searchParamsChanged = prevSearchParamsRef.current !== searchParams.toString();
        
        // Update state untuk sinkronisasi dengan URL
        if (weeklyStartFromUrl && weeklyEndFromUrl) {
          setWeeklyStart(weeklyStartFromUrl);
          setWeeklyEnd(weeklyEndFromUrl);
          setDailyDate("");
        } else if (dailyDateFromUrl) {
          setDailyDate(dailyDateFromUrl);
          setWeeklyStart("");
          setWeeklyEnd("");
        } else {
          setDailyDate("");
          setWeeklyStart("");
          setWeeklyEnd("");
        }
        
        if (tukangCuttingFromUrl) {
          setTukangCuttingFilter(tukangCuttingFromUrl);
        } else {
          setTukangCuttingFilter("");
        }
        
        // Reset currentPage ke 1 ketika filter berubah (searchParams berubah)
        if (searchParamsChanged) {
          setCurrentPage(1);
          prevSearchParamsRef.current = searchParams.toString();
        }
        
        const params = {
          page: searchParamsChanged ? 1 : currentPage, // Halaman 1 jika filter berubah, otherwise gunakan currentPage
          per_page: 50,
        };
        
        // Prioritas: jika weekly_start dan weekly_end ada, gunakan itu (jangan gunakan dailyDate)
        if (weeklyStartFromUrl && weeklyEndFromUrl) {
          params.weekly_start = weeklyStartFromUrl;
          params.weekly_end = weeklyEndFromUrl;
        } else if (dailyDateFromUrl) {
          params.daily_date = dailyDateFromUrl;
        }
        
        // Tambahkan filter tukang cutting jika ada
        if (tukangCuttingFromUrl) {
          params.tukang_cutting = tukangCuttingFromUrl;
        }

        // Tambahkan keyword search jika ada
        if (searchKeywordDebounced) {
          params.search = searchKeywordDebounced;
        }
        
        // Debug: log parameter yang dikirim
        console.log('Fetching hasil cutting with params:', params);
        console.log('URL params:', { weeklyStartFromUrl, weeklyEndFromUrl, dailyDateFromUrl, tukangCuttingFromUrl });
        console.log('SearchParams changed:', searchParamsChanged);
        
        const response = await API.get("/hasil_cutting", { params });
        if (response.data) {
          if (response.data.data) {
            console.log('Received data count:', response.data.data.length);
            setDataHasilCutting(response.data.data || []);
            setCurrentPage(response.data.current_page || 1);
            setLastPage(response.data.last_page || 1);
          }

          if (response.data.stats) {
            setTargetStats((prev) => ({
              ...prev,
              ...response.data.stats,
            }));
          }
        } else {
          setDataHasilCutting([]);
        }
      } catch (error) {
        console.error("Gagal mengambil data hasil cutting:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchDataHasilCutting();
  }, [location.search, searchParams, showForm, currentPage, searchKeywordDebounced]); // Gunakan location.search sebagai dependency utama

  // Fetch detail SPK Cutting dengan berat dari stok_bahan_keluar
  useEffect(() => {
    const fetchSpkDetail = async () => {
      if (!selectedSpkId) {
        setSpkDetail(null);
        setInputData({});
        return;
      }

      setLoading(true);
      try {
        const params = {
          spk_cutting_id: selectedSpkId,
          jenis_hasil: hasilMode,
        };
        if (selectedDistribusiId) {
          params.spk_cutting_distribusi_id = selectedDistribusiId;
        }

        const response = await API.get(`/hasil_cutting/detail-spk`, { params });
        console.log("Response dari API:", response.data);

        if (response.data && response.data.spk_cutting) {
          // Set spkDetail meskipun detail kosong, agar kita bisa menampilkan pesan yang lebih informatif
          setSpkDetail(response.data);
          // Reset input data saat SPK Cutting berubah
          // tetapi jangan hapus data ketika sedang edit (supaya nilai lama tetap terisi)
          if (!editingId) {
            setInputData({});
            setDataAcuan([]);
            setDistribusiSeri([{ jumlah_produk: "", detail: [] }]);
          }
          setShowSpkDropdown(false);
        } else {
          console.warn("Response data kosong atau tidak valid:", response.data);
          setSpkDetail(null);
        }
      } catch (error) {
        console.error("Gagal mengambil detail SPK Cutting:", error);
        console.error("Error details:", error.response?.data || error.message);
        console.error("Error status:", error.response?.status);
        console.error("Full error:", error);

        // Set spkDetail ke null untuk menampilkan pesan error
        setSpkDetail(null);

        // Tampilkan alert untuk memberikan feedback lebih jelas
        if (error.response?.status === 404) {
          await showStatusAlert("error", "SPK Tidak Ditemukan", "SPK Cutting yang dipilih belum terdaftar di sistem.");
        } else if (error.response?.status === 500) {
          await showStatusAlert("error", "Server Error", "Terjadi kesalahan di server. Silakan hubungi administrator.");
        } else if (error.response?.data?.message) {
          await showStatusAlert("error", "Gagal Memuat SPK", error.response.data.message);
        } else {
          await showStatusAlert("error", "Gagal Memuat SPK", "Pastikan koneksi internet Anda stabil lalu coba lagi.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSpkDetail();
  }, [selectedSpkId, selectedDistribusiId, hasilMode, editingId]);

  // Handler untuk update input data per item per distribusi
  const handleInputChange = (distribusiId, bahanId, field, value) => {
    setInputData((prev) => ({
      ...prev,
      [`${distribusiId}_${bahanId}`]: {
        ...prev[`${distribusiId}_${bahanId}`],
        [field]: value,
      },
    }));
  };

  // Fungsi untuk mendapatkan total produk per item per distribusi
  const getTotalProduk = (distribusiId, bahanId) => {
    const data = inputData[`${distribusiId}_${bahanId}`] || {};
    return parseSafeFloat(data.totalProduk);
  };

  // Fungsi untuk mendapatkan total keseluruhan untuk satu distribusi
  const getTotalKeseluruhanDistribusi = (distribusiId) => {
    if (!spkDetail?.detail) return 0;
    return spkDetail.detail.reduce((total, item) => {
      return total + getTotalProduk(distribusiId, item.spk_cutting_bahan_id);
    }, 0);
  };

  // Fungsi untuk mendapatkan total keseluruhan untuk semua distribusi
  const getTotalKeseluruhan = () => {
    if (!spkDetail?.detail || !spkDetail?.distribusi_list) return 0;
    let grandTotal = 0;
    spkDetail.distribusi_list.forEach(dist => {
      grandTotal += getTotalKeseluruhanDistribusi(dist.id);
    });
    return grandTotal;
  };

  // Fungsi untuk menghitung berat per produk
  const getBeratPerProduk = (beratScanned, totalProduk) => {
    const total = parseSafeFloat(totalProduk);
    const berat = parseSafeFloat(beratScanned);
    if (berat <= 0 || total <= 0) {
      return 0;
    }
    return berat / total;
  };

  // Fungsi untuk mendapatkan list warna dari detail SPK
  const getWarnaList = () => {
    if (!spkDetail?.detail) return [];
    const warnaSet = new Set();
    spkDetail.detail.forEach((item) => {
      if (item.warna) {
        warnaSet.add(item.warna);
      }
    });
    return Array.from(warnaSet).sort();
  };

  // Fungsi untuk menghitung berat acuan per produk
  const getBeratAcuanPerProduk = (beratAcuan, banyakProduk) => {
    const acuan = parseSafeFloat(beratAcuan);
    const banyak = parseSafeFloat(banyakProduk);
    if (acuan <= 0 || banyak <= 0) {
      return 0;
    }
    return acuan / banyak;
  };

  // Fungsi untuk mendapatkan berat acuan per produk berdasarkan warna
  // Jika warna tidak ditemukan, gunakan berat acuan dari warna pertama yang tersedia (fallback)
  const getBeratAcuanByWarna = (warna) => {
    if (!warna || !dataAcuan || dataAcuan.length === 0) return null;

    // Cari berat acuan untuk warna yang sama
    const acuanSesuaiWarna = dataAcuan.find((a) => a.warna === warna && a.berat_acuan && a.banyak_produk);
    if (acuanSesuaiWarna) {
      return getBeratAcuanPerProduk(parseSafeFloat(acuanSesuaiWarna.berat_acuan), parseSafeFloat(acuanSesuaiWarna.banyak_produk));
    }

    // Jika tidak ditemukan, gunakan berat acuan dari warna pertama yang tersedia (fallback)
    const acuanFallback = dataAcuan.find((a) => a.berat_acuan && a.banyak_produk);
    if (acuanFallback) {
      return getBeratAcuanPerProduk(parseSafeFloat(acuanFallback.berat_acuan), parseSafeFloat(acuanFallback.banyak_produk));
    }

    return null;
  };

  // Fungsi untuk mendapatkan status perbandingan dengan selisih
  const getStatusPerbandingan = (warna, beratPerProduk) => {
    if (!warna || !beratPerProduk || beratPerProduk <= 0) return null;

    const beratAcuanPerProduk = getBeratAcuanByWarna(warna);
    if (!beratAcuanPerProduk || beratAcuanPerProduk <= 0) return null;

    const selisih = Math.abs(beratPerProduk - beratAcuanPerProduk);
    const toleransi = 0.01; // Toleransi 0.01 kg untuk dianggap sama

    let status, selisihBerat;
    if (selisih <= toleransi) {
      status = "sama dengan acuan";
      selisihBerat = 0;
    } else if (beratPerProduk > beratAcuanPerProduk) {
      status = "lebih berat dari acuan";
      selisihBerat = selisih;
    } else {
      status = "lebih ringan dari acuan";
      selisihBerat = selisih;
    }

    return {
      status,
      selisih: selisihBerat,
      berat_per_produk: beratPerProduk,
      berat_acuan_per_produk: beratAcuanPerProduk,
    };
  };

  // Handler untuk menambah data acuan
  const handleTambahAcuan = () => {
    setDataAcuan([
      ...dataAcuan,
      {
        id: Date.now(),
        warna: "",
        berat_acuan: "",
        banyak_produk: "",
      },
    ]);
  };

  // Handler untuk menghapus data acuan
  const handleHapusAcuan = (id) => {
    setDataAcuan(dataAcuan.filter((item) => item.id !== id));
  };

  // Handler untuk mengubah data acuan
  const handleAcuanChange = (id, field, value) => {
    setDataAcuan(
      dataAcuan.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: value,
          };
        }
        return item;
      })
    );
  };

  // Handler untuk menyimpan data ke database
  const handleSimpan = async () => {
    if (!selectedSpkId || !spkDetail?.distribusi_list || !spkDetail?.detail) {
      await showStatusAlert("warning", "SPK Belum Dipilih", "Pilih SPK cutting terlebih dahulu.");
      return;
    }

    // Filter distribusi yang sudah diisi (yang akan disimpan)
    const distributionsToSave = spkDetail.distribusi_list.filter(dist => {
      // Cek apakah ada data input untuk distribusi ini
      return spkDetail.detail.some((item) => {
        const bahanId = item.spk_cutting_bahan_id;
        const data = inputData[`${dist.id}_${bahanId}`] || {};
        return data.jumlahLembar && data.totalProduk && parseSafeFloat(data.jumlahLembar) > 0 && parseSafeFloat(data.totalProduk) > 0;
      });
    });

    if (distributionsToSave.length === 0) {
      await showStatusAlert("warning", "Data Belum Diisi", "Isi minimal satu distribusi dengan lengkap (jumlah lembar & total produk).");
      return;
    }

    // Validasi untuk setiap distribusi yang akan disimpan
    let hasError = false;
    distributionsToSave.forEach(dist => {
      const isComplete = spkDetail.detail.every((item) => {
        const bahanId = item.spk_cutting_bahan_id;
        const data = inputData[`${dist.id}_${bahanId}`] || {};
        return data.jumlahLembar && data.totalProduk && parseSafeFloat(data.jumlahLembar) > 0 && parseSafeFloat(data.totalProduk) > 0;
      });
      if (!isComplete) {
        hasError = true;
      }
    });

    if (hasError) {
      await showStatusAlert("warning", "Data Belum Lengkap", "Pastikan semua baris bahan pada distribusi yang diisi telah terisi jumlah lembar dan total produk.");
      return;
    }

    setSaving(true);
    try {
      // Panggil API store satu per satu secara berurutan untuk menghindari deadlock di database
      for (const dist of distributionsToSave) {
        // Format data hasil untuk distribusi ini
        const statusPerbandinganArray = [];
        const dataHasil = spkDetail.detail.map((item) => {
          const bahanId = item.spk_cutting_bahan_id;
          const data = inputData[`${dist.id}_${bahanId}`] || {};
          const totalProduk = getTotalProduk(dist.id, bahanId);
          const beratPerProduk = getBeratPerProduk(item.berat_scanned, totalProduk);
          const statusPerbandingan = getStatusPerbandingan(item.warna, beratPerProduk);

          if (statusPerbandingan) {
            statusPerbandinganArray.push({
              warna: item.warna,
              status: statusPerbandingan.status || statusPerbandingan,
              selisih: statusPerbandingan.selisih || 0,
              berat_per_produk: beratPerProduk,
              berat_acuan_per_produk: getBeratAcuanByWarna(item.warna),
            });
          }

          return {
            spk_cutting_bahan_id: bahanId,
            spk_cutting_bagian_id: item.spk_cutting_bagian_id,
            nama_bagian: item.nama_bagian || null,
            nama_bahan: item.nama_bahan || null,
            warna: item.warna || null,
            qty: item.qty || null,
            jumlah_lembar: parseSafeFloat(data.jumlahLembar),
            jumlah_produk: parseSafeFloat(data.jumlahLembar) > 0 ? totalProduk / parseSafeFloat(data.jumlahLembar) : 0,
            total_produk: totalProduk,
            berat_total: parseSafeFloat(item.berat_scanned),
            berat_per_produk: beratPerProduk,
            status_perbandingan: statusPerbandingan?.status || statusPerbandingan,
            selisih_perbandingan: statusPerbandingan?.selisih || 0,
            produk_sku_id: dist?.sku?.product_list_id || dist?.sku?.id || null,
          };
        });

        // Format data acuan
        const formattedDataAcuan = dataAcuan
          .filter((acuan) => acuan.warna && acuan.berat_acuan && acuan.banyak_produk)
          .map((acuan) => ({
            warna: acuan.warna,
            berat_acuan: parseSafeFloat(acuan.berat_acuan),
            banyak_produk: parseSafeFloat(acuan.banyak_produk),
            berat_acuan_per_produk: getBeratAcuanPerProduk(parseSafeFloat(acuan.berat_acuan), parseSafeFloat(acuan.banyak_produk)),
          }));

        // Format status perbandingan agregat
        const statusPerbandinganAgregat = {};
        statusPerbandinganArray.forEach((item) => {
          if (!statusPerbandinganAgregat[item.warna]) {
            statusPerbandinganAgregat[item.warna] = {
              warna: item.warna,
              status: item.status,
              berat_per_produk: item.berat_per_produk,
              berat_acuan_per_produk: item.berat_acuan_per_produk,
            };
          }
        });
        const statusPerbandinganAgregatArray = Object.values(statusPerbandinganAgregat);

        const payload = {
          spk_cutting_id: selectedSpkId,
          spk_cutting_distribusi_id: dist.id,
          jenis_hasil: hasilMode,
          tanggal_potong: tanggalPotong,
          data_hasil: dataHasil,
          data_acuan: formattedDataAcuan,
          status_perbandingan_agregat: statusPerbandinganAgregatArray,
          distribusi_seri: null, // Kosongkan untuk implicit single series
        };

        if (editingId && distributionsToSave.length === 1) {
          await API.put(`/hasil_cutting/${editingId}`, payload);
        } else {
          await API.post("/hasil_cutting", payload);
        }
      }

      await showStatusAlert("success", "Berhasil", editingId ? "Data berhasil diupdate." : "Data berhasil disimpan.");

      // Reset form
      setSelectedSpkId("");
      setSelectedDistribusiId("");
      setSelectedDistribusi(null);
      setSpkDetail(null);
      setInputData({});
      setDataAcuan([]);
      setDistribusiSeri([{ jumlah_produk: "" }]);
      setTanggalPotong(new Date().toISOString().split("T")[0]);
      setShowForm(false);
      setEditingId(null);

      // Refresh data
      try {
        const refreshParams = { page: 1, per_page: 50 };
        if (searchKeywordDebounced) {
          refreshParams.search = searchKeywordDebounced;
        }

        const refreshResponse = await API.get("/hasil_cutting", {
          params: refreshParams,
        });
        if (refreshResponse.data.data) {
          setDataHasilCutting(refreshResponse.data.data || []);
          setCurrentPage(refreshResponse.data.current_page || 1);
          setLastPage(refreshResponse.data.last_page || 1);
        }

        // Refresh dropdown SPK list
        fetchDistribusiCutting();
      } catch (error) {
        console.error("Gagal refresh data:", error);
      }
    } catch (error) {
      console.error("Gagal menyimpan data:", error);
      
      let errorMessage = "Terjadi kesalahan saat menyimpan data";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorList = Object.entries(errors)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
          .join("\n");
        errorMessage = `Validasi gagal:\n${errorList}`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      await showStatusAlert("error", "Gagal Menyimpan Data", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handler untuk edit
  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const response = await API.get(`/hasil_cutting/${id}`);
      const data = response.data;

      setEditingId(id);
      setSelectedSpkId(data.spk_cutting_id);
      setSelectedDistribusiId(data.spk_cutting_distribusi_id || "");
      setTanggalPotong(data.tanggal_potong || new Date().toISOString().split("T")[0]);
      setHasilMode(data.jenis_hasil || "utama");
      setSelectedDistribusi(
        data.spk_cutting_distribusi_id
          ? {
              id: data.spk_cutting_distribusi_id,
              kode_seri: data.kode_distribusi,
              spk_cutting_id: data.spk_cutting_id,
            }
          : null
      );

      // Debug: Log data yang diterima dari backend
      console.log("Data untuk edit:", data);
      console.log("Data bahan:", data.bahan);
      console.log("Data acuan:", data.data_acuan);

      // Snapshot data lama untuk ditampilkan saat edit
      const totalProdukLama = (data.bahan || []).reduce((sum, bahan) => sum + parseSafeFloat(bahan.total_produk || bahan.hasil), 0);
      const totalBeratPerProdukLama = (data.bahan || []).reduce((sum, bahan) => sum + parseSafeFloat(bahan.berat_per_produk), 0);
      const totalBeratLama = (data.bahan || []).reduce((sum, bahan) => sum + parseSafeFloat(bahan.berat), 0);
      setOriginalData({
        spk_cutting_id: data.spk_cutting_id,
        catatan: data.catatan || "",
        totalProduk: totalProdukLama,
        totalBeratPerProduk: totalBeratPerProdukLama,
        totalBerat: totalBeratLama,
      });

      // Set input data dari bahan - pastikan semua data terisi
      const inputDataObj = {};
      if (data.bahan && Array.isArray(data.bahan)) {
        const distId = data.spk_cutting_distribusi_id || "";
        data.bahan.forEach((bahan) => {
          inputDataObj[`${distId}_${bahan.spk_cutting_bahan_id}`] = {
            jumlahLembar: bahan.jumlah_lembar !== null && bahan.jumlah_lembar !== undefined ? bahan.jumlah_lembar : "",
            totalProduk: bahan.hasil !== null && bahan.hasil !== undefined ? bahan.hasil : (bahan.total_produk !== null && bahan.total_produk !== undefined ? bahan.total_produk : ""),
            produkSkuId: bahan.produk_sku_id ? bahan.produk_sku_id.toString() : "",
          };
        });
      }
      setInputData(inputDataObj);

      // Set data acuan jika ada - pastikan semua data terisi
      if (data.data_acuan && Array.isArray(data.data_acuan) && data.data_acuan.length > 0) {
        setDataAcuan(
          data.data_acuan.map((acuan, idx) => ({
            id: Date.now() + idx,
            warna: acuan.warna !== null && acuan.warna !== undefined ? acuan.warna : "",
            berat_acuan: acuan.berat_acuan !== null && acuan.berat_acuan !== undefined ? acuan.berat_acuan : "",
            banyak_produk: acuan.banyak_produk !== null && acuan.banyak_produk !== undefined ? acuan.banyak_produk : "",
          }))
        );
      } else {
        setDataAcuan([]);
      }

      // Load distribusi seri yang sudah ada dari backend jika ada
      if (data.distribusi_seri && Array.isArray(data.distribusi_seri) && data.distribusi_seri.length > 0) {
        setDistribusiSeri(
          data.distribusi_seri.map((dist) => ({
            jumlah_produk: dist.jumlah_produk || "",
            detail: (dist.detail || []).map((d) => ({
              warna: d.warna || "",
              jumlah_produk: d.jumlah_produk || "",
              produk_sku_id: d.produk_sku_id ? d.produk_sku_id.toString() : "",
            })),
          }))
        );
      } else {
        setDistribusiSeri([{ jumlah_produk: "", detail: [] }]);
      }

      // Fetch detail SPK untuk form
      const spkResponse = await API.get(`/hasil_cutting/detail-spk`, {
        params: {
          spk_cutting_id: data.spk_cutting_id,
          spk_cutting_distribusi_id: data.spk_cutting_distribusi_id,
          jenis_hasil: data.jenis_hasil || "utama",
        },
      });
      setSpkDetail(spkResponse.data);
      setShowForm(true);
    } catch (error) {
      console.error("Gagal mengambil data untuk edit:", error);
      await showStatusAlert("error", "Gagal Memuat Data Edit", "Gagal mengambil data untuk edit.");
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk delete
  const handleDelete = async (id) => {
    const isConfirmed = await showConfirmAlert({
      title: "Hapus Data Hasil Cutting?",
      text: "Data yang dihapus tidak dapat dikembalikan.",
      confirmText: "Ya, Hapus",
      icon: "warning",
    });

    if (!isConfirmed) {
      return;
    }

    try {
      await API.delete(`/hasil_cutting/${id}`);
      await showStatusAlert("success", "Berhasil", "Data berhasil dihapus.");
      // Refresh data setelah hapus
      setCurrentPage(1);
      // Force refresh
      const refreshParams = { page: 1, per_page: 50 };
      if (searchKeywordDebounced) {
        refreshParams.search = searchKeywordDebounced;
      }

      const response = await API.get("/hasil_cutting", {
        params: refreshParams,
      });
      if (response.data.data) {
        setDataHasilCutting(response.data.data || []);
        setCurrentPage(response.data.current_page || 1);
        setLastPage(response.data.last_page || 1);
      }

      // Refresh dropdown SPK list
      fetchDistribusiCutting();
    } catch (error) {
      console.error("Gagal menghapus data:", error);
      await showStatusAlert("error", "Gagal Menghapus Data", error.response?.data?.message || "Gagal menghapus data.");
    }
  };

  // Handler untuk detail
  const handleDetail = async (id) => {
    try {
      setLoading(true);
      const response = await API.get(`/hasil_cutting/${id}`);
      setDetailData(response.data);
    } catch (error) {
      console.error("Gagal mengambil detail:", error);
      await showStatusAlert("error", "Gagal Memuat Detail", "Gagal mengambil detail data.");
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk tambah baru
  const handleTambahBaru = () => {
    setShowForm(true);
    setEditingId(null);
    setSelectedSpkId("");
    setSelectedDistribusiId("");
    setSelectedDistribusi(null);
    setHasilMode("utama");
    setSpkDetail(null);
    setInputData({});
    setDataAcuan([]);
    setDistribusiSeri([{ jumlah_produk: "" }]);
    setDetailData(null);
    setSearchSpkQuery("");
    setShowSpkDropdown(false);
    setOriginalData(null);
    setTanggalPotong(new Date().toISOString().split("T")[0]);
  };

  // Handler untuk batal
  const handleBatal = () => {
    setShowForm(false);
    setEditingId(null);
    setSelectedSpkId("");
    setSelectedDistribusiId("");
    setSelectedDistribusi(null);
    setSpkDetail(null);
    setInputData({});
    setDataAcuan([]);
    setDistribusiSeri([{ jumlah_produk: "" }]);
    setDetailData(null);
    setSearchSpkQuery("");
    setShowSpkDropdown(false);
    setOriginalData(null);
    setTanggalPotong(new Date().toISOString().split("T")[0]);
  };

  // Handler untuk tambah distribusi seri
  const handleTambahDistribusiSeri = () => {
    setDistribusiSeri([...distribusiSeri, { jumlah_produk: "", detail: [] }]);
  };

  // Handler untuk hapus distribusi seri
  const handleHapusDistribusiSeri = (index) => {
    if (distribusiSeri.length > 1) {
      const newDistribusi = distribusiSeri.filter((_, i) => i !== index);
      setDistribusiSeri(newDistribusi);
    }
  };

  // Handler untuk update distribusi seri
  const handleUpdateDistribusiSeri = (index, field, value) => {
    const newDistribusi = [...distribusiSeri];
    newDistribusi[index] = { ...newDistribusi[index], [field]: value };
    setDistribusiSeri(newDistribusi);
  };

  // Handler untuk tambah detail distribusi (warna)
  const handleTambahDetailDistribusi = (distribusiIndex) => {
    const newDistribusi = [...distribusiSeri];
    if (!newDistribusi[distribusiIndex].detail) {
      newDistribusi[distribusiIndex].detail = [];
    }
    newDistribusi[distribusiIndex].detail.push({ warna: "", jumlah_produk: "", produk_sku_id: "" });

    // Hitung ulang total detail setelah tambah (jika ada detail yang sudah diisi)
    const totalDetail = newDistribusi[distribusiIndex].detail.reduce((total, item) => {
      if (item.warna && item.jumlah_produk && parseInt(item.jumlah_produk) > 0) {
        return total + (parseInt(item.jumlah_produk) || 0);
      }
      return total;
    }, 0);

    // Update jumlah_produk distribusi secara otomatis jika ada total
    if (totalDetail > 0) {
      newDistribusi[distribusiIndex].jumlah_produk = totalDetail.toString();
    }

    setDistribusiSeri(newDistribusi);
  };

  // Handler untuk hapus detail distribusi
  const handleHapusDetailDistribusi = (distribusiIndex, detailIndex) => {
    const newDistribusi = [...distribusiSeri];
    newDistribusi[distribusiIndex].detail = newDistribusi[distribusiIndex].detail.filter((_, i) => i !== detailIndex);

    // Hitung ulang total detail setelah hapus
    const totalDetail = newDistribusi[distribusiIndex].detail.reduce((total, item) => {
      if (item.warna && item.jumlah_produk && parseInt(item.jumlah_produk) > 0) {
        return total + (parseInt(item.jumlah_produk) || 0);
      }
      return total;
    }, 0);

    // Update jumlah_produk distribusi secara otomatis
    newDistribusi[distribusiIndex].jumlah_produk = totalDetail > 0 ? totalDetail.toString() : "";

    setDistribusiSeri(newDistribusi);
  };

  // Handler untuk update detail distribusi
  const handleUpdateDetailDistribusi = (distribusiIndex, detailIndex, field, value) => {
    const newDistribusi = [...distribusiSeri];
    newDistribusi[distribusiIndex].detail[detailIndex] = {
      ...newDistribusi[distribusiIndex].detail[detailIndex],
      [field]: value,
    };

    // Jika field yang diubah adalah jumlah_produk atau warna, hitung ulang total detail
    // dan update jumlah_produk distribusi secara otomatis
    if (field === "jumlah_produk" || field === "warna") {
      const totalDetail = newDistribusi[distribusiIndex].detail.reduce((total, item) => {
        // Hanya hitung jika warna dan jumlah_produk sudah diisi
        if (item.warna && item.jumlah_produk && parseInt(item.jumlah_produk) > 0) {
          return total + (parseInt(item.jumlah_produk) || 0);
        }
        return total;
      }, 0);

      // Update jumlah_produk distribusi secara otomatis
      newDistribusi[distribusiIndex].jumlah_produk = totalDetail > 0 ? totalDetail.toString() : "";
    }

    setDistribusiSeri(newDistribusi);
  };

  // Hitung total detail distribusi untuk satu distribusi
  const getTotalDetailDistribusi = (distribusiIndex) => {
    const distribusi = distribusiSeri[distribusiIndex];
    if (!distribusi || !distribusi.detail || distribusi.detail.length === 0) {
      return 0;
    }
    return distribusi.detail.reduce((total, item) => {
      return total + (parseInt(item.jumlah_produk) || 0);
    }, 0);
  };

  // Hitung total distribusi seri
  const getTotalDistribusiSeri = () => {
    return distribusiSeri.reduce((total, item) => {
      return total + (parseInt(item.jumlah_produk) || 0);
    }, 0);
  };

  const selectedModeLabel = HASIL_MODE_OPTIONS.find((option) => option.key === hasilMode)?.label || "Hasil Bahan Utama";

  // Filter SPK Cutting berdasarkan search query (dikelompokkan per SPK, bukan distribusi)
  const getUniqueSpkList = () => {
    const spkMap = new Map();
    spkCuttingList.forEach((distribusi) => {
      // Jika distribusi sudah diinput untuk mode hasil saat ini, jangan tampilkan SPK-nya
      // (Kecuali jika SPK tersebut memiliki distribusi lain yang belum diinput)
      const terinput = distribusi.jenis_hasil_terinput || [];
      if (terinput.includes(hasilMode)) {
        return;
      }

      const searchLower = searchSpkQuery.toLowerCase();
      const spk = getDistribusiSpk(distribusi);
      const kodeDistribusi = (distribusi.kode_seri || "").toLowerCase();
      const idSpkCutting = (spk.id_spk_cutting || "").toLowerCase();
      const namaProduk = getDistribusiProductName(distribusi).toLowerCase();
      const skuLabel = getSkuOptionLabel(getDistribusiSku(distribusi)).toLowerCase();
      
      if (kodeDistribusi.includes(searchLower) || idSpkCutting.includes(searchLower) || namaProduk.includes(searchLower) || skuLabel.includes(searchLower)) {
        if (!spkMap.has(spk.id)) {
          spkMap.set(spk.id, {
            id: spk.id,
            id_spk_cutting: spk.id_spk_cutting,
            nama_produk: getDistribusiProductName(distribusi),
            sample_distribusi: distribusi
          });
        }
      }
    });
    return Array.from(spkMap.values());
  };

  const filteredSpkCutting = getUniqueSpkList();

  const handleModeChange = (mode) => {
    setHasilMode(mode);
    setInputData({});
    setDataAcuan([]);
    setSpkDetail(null);
  };

  // Handler untuk memilih SPK dari hasil search
  const handleSelectSpk = (spkGroup) => {
    setSelectedSpkId(spkGroup.id);
    setSelectedDistribusiId(""); // tidak perlu satu distribusi karena kita ambil semua
    setSelectedDistribusi(spkGroup.sample_distribusi);
    setSearchSpkQuery(`${spkGroup.id_spk_cutting} - ${spkGroup.nama_produk}`);
    setShowSpkDropdown(false);
  };

  return (
    <div className="hasil-cutting-container">
      <div className="hasil-cutting-header-card">
        <div className="hasil-cutting-title-group">
          <div className="hasil-cutting-brand-icon">
            <i className="fas fa-cut"></i>
          </div>
          <div className="hasil-cutting-title-wrap">
            <div className="hasil-cutting-module-pill">Modul Cutting</div>
            <h1 className="hasil-cutting-header-title">Data Hasil Cutting</h1>
            <p className="hasil-cutting-header-subtitle">Kelola hasil cutting dengan mudah dan efisien</p>
          </div>
        </div>
        <button onClick={handleTambahBaru} className="hasil-cutting-primary-button">
          <i className="fas fa-plus-circle hasil-cutting-primary-button-icon"></i>
          Tambah Hasil Cutting
        </button>
      </div>

      {/* Kartu Target Mingguan & Harian */}
      <div className="hasil-cutting-target-cards">
        {/* Target Mingguan */}
        <div className="hasil-cutting-target-card">
          <div className="hasil-cutting-target-card-icon"><i className="fas fa-bullseye"></i></div>
          <div className="hasil-cutting-target-card-content">
            <div className="hasil-cutting-target-card-label">Target Mingguan</div>
            {/* Filter periode mingguan (custom) */}
            <div className="hasil-cutting-target-filter-row">
              <input type="date" value={weeklyStart} onChange={(e) => setWeeklyStart(e.target.value)} className="hasil-cutting-target-filter-input" />
              <span className="hasil-cutting-target-filter-separator">s/d</span>
              <input type="date" value={weeklyEnd} onChange={(e) => setWeeklyEnd(e.target.value)} className="hasil-cutting-target-filter-input" />
            </div>
            <div className="hasil-cutting-target-card-value">{targetStats.weekly_target.toLocaleString("id-ID")} produk</div>
            <div className="hasil-cutting-target-card-info">
              Periode ini: <strong>{Number(targetStats.weekly_total || 0).toLocaleString("id-ID")} produk</strong>
            </div>
            <div className="hasil-cutting-target-card-status">
              {targetStats.weekly_remaining > 0 ? (
                <>
                  Kurang <strong>{Number(targetStats.weekly_remaining).toLocaleString("id-ID")} produk</strong> untuk capai 50.000
                </>
              ) : (
                <span className="hasil-cutting-target-card-status-achieved">Target mingguan tercapai</span>
              )}
            </div>
            {targetStats.week_start && targetStats.week_end && (
              <div className="hasil-cutting-target-card-period">
                Periode: {targetStats.week_start} s/d {targetStats.week_end}
              </div>
            )}
          </div>
        </div>

        {/* Target Harian */}
        <div className="hasil-cutting-target-card">
          <div className="hasil-cutting-target-card-icon daily"><i className="fas fa-chart-line"></i></div>
          <div className="hasil-cutting-target-card-content">
            <div className="hasil-cutting-target-card-label daily">Target Harian</div>
            {/* Filter tanggal harian (custom) */}
            <div className="hasil-cutting-target-filter-row single">
              <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} className="hasil-cutting-target-filter-input" />
            </div>
            <div className="hasil-cutting-target-card-value daily">{targetStats.daily_target.toLocaleString("id-ID")} produk</div>
            <div className="hasil-cutting-target-card-info daily">
              Tanggal ini: <strong>{Number(targetStats.daily_total || 0).toLocaleString("id-ID")} produk</strong>
            </div>
            <div className="hasil-cutting-target-card-status daily">
              {targetStats.daily_remaining > 0 ? (
                <>
                  Kurang <strong>{Number(targetStats.daily_remaining).toLocaleString("id-ID")} produk</strong> untuk capai 7.143
                </>
              ) : (
                <span className="hasil-cutting-target-card-status-achieved">Target harian tercapai</span>
              )}
            </div>
            {targetStats.today && <div className="hasil-cutting-target-card-period daily">Tanggal: {targetStats.today}</div>}
          </div>
        </div>
      </div>

      <div className="hasil-cutting-table-card">
        <div className="hasil-cutting-table-header">
          <div>
            <h3>Daftar Hasil Cutting</h3>
            <p>Ringkasan data hasil cutting produksi ({dataHasilCutting.length} data)</p>
          </div>
          <div className="hasil-cutting-table-tools">
            <div className="hasil-cutting-table-search">
              <i className="fas fa-search hasil-cutting-table-search-icon"></i>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Cari SPK / Produk / Tukang"
                className="hasil-cutting-table-search-input"
              />
              {searchKeyword && (
                <button
                  type="button"
                  className="hasil-cutting-table-search-clear"
                  onClick={() => setSearchKeyword("")}
                  title="Reset pencarian"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Tabel Index */}
        <div className="hasil-cutting-table-index-container">
          {loadingData ? (
            <div className="hasil-cutting-loading-container">
              <div className="hasil-cutting-loading-spinner"></div>
              <p className="hasil-cutting-loading-text">Memuat data...</p>
            </div>
          ) : dataHasilCutting.length > 0 ? (
            <>
              <div className="hasil-cutting-table-scroll">
                <table className="penjahit-table hasil-cutting-index-table">
                  <thead>
                    <tr>
                      <th>NO</th>
                      <th>DISTRIBUSI</th>
                      <th>JENIS</th>
                      <th>PRODUCT GROUP</th>
                      <th>SIZE</th>
                      <th>ESTIMASI</th>
                      <th>TOTAL PRODUK</th>
                      <th>TOTAL BAYAR</th>
                      <th>TGL. POTONG</th>
                      <th>AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataHasilCutting.map((item, index) => (
                      <tr key={item.id} className="hasil-cutting-table-row">
                        <td className="hasil-cutting-table-no">{(currentPage - 1) * 50 + index + 1}</td>
                        <td>
                          <span className="hasil-cutting-badge">{item.kode_distribusi || item.id_spk_cutting || "-"}</span>
                        </td>
                        <td>
                          <span className="hasil-cutting-badge hasil-cutting-badge-muted">{item.jenis_hasil === "kombinasi" ? "Kombinasi" : "Bahan Utama"}</span>
                        </td>
                        <td className="hasil-cutting-table-product">{item.nama_produk || "-"}</td>
                        <td>
                          <span className="hasil-cutting-badge hasil-cutting-badge-muted">{item.size || "-"}</span>
                        </td>
                        <td>
                          <span className="hasil-cutting-badge hasil-cutting-badge-muted">{item.estimasi?.toLocaleString("id-ID") || 0}</span>
                        </td>
                        <td>
                          <span className={`hasil-cutting-badge ${item.total_produk > 0 ? "hasil-cutting-badge-success" : "hasil-cutting-badge-muted"}`}>{item.total_produk?.toLocaleString("id-ID") || 0}</span>
                        </td>
                        <td>
                          <span className={`hasil-cutting-badge ${item.total_bayar > 0 ? "" : "hasil-cutting-badge-muted"}`}>
                            {item.total_bayar
                              ? `Rp ${Number(item.total_bayar).toLocaleString("id-ID", {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}`
                              : "Rp 0"}
                          </span>
                        </td>
                        <td className="hasil-cutting-table-date">
                          <i className="far fa-calendar-check hasil-cutting-table-date-icon"></i>
                          {item.tanggal_potong ? new Date(item.tanggal_potong).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }) : new Date(item.created_at).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </td>
                        <td>
                          <div className="hasil-cutting-action-buttons">
                            <button onClick={() => handleDetail(item.id)} className="hasil-cutting-action-button hasil-cutting-action-button-info" title="Detail">
                              <i className="fas fa-info-circle"></i>
                            </button>
                            <button onClick={() => handleEdit(item.id)} className="hasil-cutting-action-button hasil-cutting-action-button-edit" title="Edit">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="hasil-cutting-action-button hasil-cutting-action-button-delete" title="Hapus">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {lastPage > 1 && (
                <div className="hasil-cutting-pagination">
                  <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="hasil-cutting-pagination-button">
                    <i className="fas fa-chevron-left"></i>
                    Sebelumnya
                  </button>
                  <span className="hasil-cutting-pagination-info">
                    Halaman {currentPage} dari {lastPage}
                  </span>
                  <button onClick={() => setCurrentPage((prev) => Math.min(lastPage, prev + 1))} disabled={currentPage === lastPage} className="hasil-cutting-pagination-button">
                    Selanjutnya
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="hasil-cutting-empty-state">
              <div className="hasil-cutting-empty-state-icon"><i className="fas fa-clipboard-list"></i></div>
              <h3 className="hasil-cutting-empty-state-title">{searchKeywordDebounced ? "Data Tidak Ditemukan" : "Belum Ada Data"}</h3>
              <p className="hasil-cutting-empty-state-text">
                {searchKeywordDebounced
                  ? `Tidak ada data yang cocok dengan kata kunci "${searchKeywordDebounced}"`
                  : "Mulai dengan menambahkan hasil cutting pertama Anda"}
              </p>
            </div>
          )}
        </div>

        {/* Modal Form Inputan */}
        {showForm && (
          <div
            className="hasil-cutting-modal-overlay"
          >
            <div className="hasil-cutting-modal-content hasil-cutting-modal-content-form" onClick={(e) => e.stopPropagation()}>
              {/* Header Modal */}
              <div className="hasil-cutting-modal-header hasil-cutting-modal-header-detail">
                <h2 className="hasil-cutting-modal-title">{editingId ? "Edit Hasil Cutting" : "Tambah Hasil Cutting"}</h2>
                <button
                  onClick={handleBatal}
                  className="hasil-cutting-modal-close-button"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Content Modal */}
              <div className="hasil-cutting-modal-body hasil-cutting-modal-body-form">
                {/* Data sebelum diedit (hanya tampil saat mode edit) */}
                {editingId && originalData && (
                  <div className="hasil-cutting-original-reference">
                    <div className="hasil-cutting-original-reference-header">
                      <i className="fas fa-history hasil-cutting-original-reference-icon"></i>
                      <div>
                        <div className="hasil-cutting-original-reference-title">Data sebelum diedit</div>
                        <div className="hasil-cutting-original-reference-subtitle">Referensi nilai asli sebelum Anda melakukan perubahan</div>
                      </div>
                    </div>
                    <div className="hasil-cutting-original-reference-grid">
                      <div className="hasil-cutting-original-reference-item">
                        <div className="hasil-cutting-original-reference-label">SPK Cutting</div>
                        <div className="hasil-cutting-original-reference-value">{originalData.spk_cutting_id || "-"}</div>
                      </div>
                      <div className="hasil-cutting-original-reference-item">
                        <div className="hasil-cutting-original-reference-label">Total Produk</div>
                        <div className="hasil-cutting-original-reference-value">{originalData.totalProduk?.toLocaleString("id-ID") || "0"}</div>
                      </div>
                      <div className="hasil-cutting-original-reference-item">
                        <div className="hasil-cutting-original-reference-label">Total Berat</div>
                        <div className="hasil-cutting-original-reference-value">{originalData.totalBerat?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0,00"} kg</div>
                      </div>
                      <div className="hasil-cutting-original-reference-item">
                        <div className="hasil-cutting-original-reference-label">Total Berat per Produk</div>
                        <div className="hasil-cutting-original-reference-value">{originalData.totalBeratPerProduk?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0,00"} kg</div>
                      </div>
                      {originalData.catatan && (
                        <div className="hasil-cutting-original-reference-item hasil-cutting-original-reference-item-full">
                          <div className="hasil-cutting-original-reference-label">Catatan</div>
                          <div className="hasil-cutting-original-reference-value hasil-cutting-original-reference-note">{originalData.catatan}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="hasil-cutting-intake-simple" style={{ marginBottom: '24px' }}>
                  <div className="hasil-cutting-mode-toggle" role="group" aria-label="Jenis hasil cutting">
                    {HASIL_MODE_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={`hasil-cutting-mode-button${hasilMode === option.key ? " is-active" : ""}`}
                        onClick={() => handleModeChange(option.key)}
                      >
                        <i className={option.icon}></i>
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="hasil-cutting-intake-shell" style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
                    <div className="hasil-cutting-form-group hasil-cutting-form-spk-group" style={{ flex: 1 }}>
                      <label className="hasil-cutting-form-label">
                        Cari SPK Cutting:
                      </label>
                      <div className="hasil-cutting-form-input-wrapper">
                        <input
                          type="text"
                          value={searchSpkQuery}
                          onChange={(e) => {
                            setSearchSpkQuery(e.target.value);
                            setShowSpkDropdown(true);
                            if (!e.target.value) {
                              setSelectedSpkId("");
                              setSelectedDistribusiId("");
                              setSelectedDistribusi(null);
                              setSpkDetail(null);
                            }
                          }}
                          onFocus={() => {
                            if (filteredSpkCutting.length > 0 && searchSpkQuery) {
                              setShowSpkDropdown(true);
                            }
                          }}
                          onBlur={() => {
                            // Delay untuk memungkinkan klik pada dropdown
                            setTimeout(() => setShowSpkDropdown(false), 200);
                          }}
                          placeholder="Ketik kode SPK (contoh: 3408)"
                          className="modern-input hasil-cutting-form-input hasil-cutting-form-input-search"
                        />
                        <i className="fas fa-search hasil-cutting-form-search-icon"></i>

                        {/* Dropdown hasil pencarian */}
                        {showSpkDropdown && searchSpkQuery && filteredSpkCutting.length > 0 && (
                          <div className="hasil-cutting-form-dropdown">
                            {filteredSpkCutting.map((spkGroup) => (
                              <div
                                key={spkGroup.id}
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent blur event
                                  handleSelectSpk(spkGroup);
                                }}
                                className="hasil-cutting-form-dropdown-item"
                              >
                                <div className="hasil-cutting-form-dropdown-content">
                                  <i className="fas fa-layer-group hasil-cutting-form-dropdown-icon"></i>
                                  <div>
                                    <div className="hasil-cutting-form-dropdown-title">{spkGroup.id_spk_cutting}</div>
                                    <div className="hasil-cutting-form-dropdown-subtitle">
                                      {spkGroup.nama_produk}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Pesan jika tidak ada hasil */}
                        {showSpkDropdown && searchSpkQuery && filteredSpkCutting.length === 0 && (
                          <div className="hasil-cutting-form-dropdown-empty">
                            <i className="fas fa-search hasil-cutting-form-dropdown-empty-icon"></i>
                            <p className="hasil-cutting-form-dropdown-empty-text">Tidak ada SPK cutting yang ditemukan</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="hasil-cutting-form-group" style={{ flex: 1 }}>
                      <label className="hasil-cutting-form-label">
                        Tanggal Potong:
                      </label>
                      <div className="hasil-cutting-form-input-wrapper">
                        <input
                          type="date"
                          value={tanggalPotong}
                          onChange={(e) => setTanggalPotong(e.target.value)}
                          className="modern-input hasil-cutting-form-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>



                {/* Loading State */}
                {loading && (
                  <div className="hasil-cutting-loading-container">
                    <div className="hasil-cutting-loading-spinner"></div>
                    <p className="hasil-cutting-loading-text">Memuat data...</p>
                  </div>
                )}

                {/* Tabel Detail SPK Cutting - Bulk Input */}
                {spkDetail && spkDetail.distribusi_list && spkDetail.distribusi_list.length > 0 ? (
                  spkDetail.distribusi_list.map((dist, distIndex) => (
                    <div key={dist.id} className="hasil-cutting-form-section hasil-cutting-form-section-detail" style={{ marginBottom: '32px' }}>
                      <div className="hasil-cutting-section-bar hasil-cutting-section-bar-soft" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="hasil-cutting-section-title hasil-cutting-section-title-soft">
                          <i className="fas fa-tag"></i> {dist.kode_seri} - {getSkuOptionLabel(dist.sku)}
                        </h3>
                        {dist.status !== 'draft' && (
                          <span className="hasil-cutting-status-badge is-success">Sudah Disimpan</span>
                        )}
                      </div>
                      <div className="hasil-cutting-table-wrap">
                        <table className="penjahit-table hasil-cutting-entry-detail-table">
                        <thead>
                          <tr>
                            <th>Bagian</th>
                            <th>Nama Bahan</th>
                            <th>Warna</th>
                            <th>Berat (KG)</th>
                            <th>Qty (Rol)</th>
                            <th>Jumlah Lembar</th>
                            <th>Total Produk</th>
                            <th>Jumlah per Lembar</th>
                            <th>Berat per Produk (KG)</th>
                            <th>Status Perbandingan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {spkDetail.detail && spkDetail.detail.length > 0 ? (
                            spkDetail.detail.map((item, index) => {
                              const bahanId = item.spk_cutting_bahan_id;
                              const currentData = inputData[`${dist.id}_${bahanId}`] || {};
                              const totalProduk = getTotalProduk(dist.id, bahanId);
                              const beratPerProduk = getBeratPerProduk(item.berat_scanned, totalProduk);
                              const statusPerbandingan = getStatusPerbandingan(item.warna, beratPerProduk);
                              const status = statusPerbandingan && typeof statusPerbandingan === "object" ? statusPerbandingan.status : statusPerbandingan;
                              const selisih = statusPerbandingan && typeof statusPerbandingan === "object" ? statusPerbandingan.selisih : 0;
                              const statusText = status
                                ? status === "lebih berat dari acuan" || status === "lebih ringan dari acuan"
                                  ? `${status} ${selisih > 0 ? `${selisih.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : ""}`.trim()
                                  : status
                                : "";
                              const statusClass =
                                status === "lebih berat dari acuan"
                                  ? "hasil-cutting-status-badge-heavier"
                                  : status === "lebih ringan dari acuan"
                                  ? "hasil-cutting-status-badge-lighter"
                                  : "hasil-cutting-status-badge-same";

                              return (
                                <tr key={`${dist.id}-${bahanId}-${index}`}>
                                  <td>{item.nama_bagian}</td>
                                  <td>{item.nama_bahan || "-"}</td>
                                  <td>{item.warna || "-"}</td>
                                  <td>{item.berat_scanned > 0 ? `${item.berat_scanned.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : "0.00 kg"}</td>
                                  <td>{item.qty || "-"}</td>
                                  <td>
                                    <input
                                      type="number"
                                      min="0"
                                      value={currentData.jumlahLembar || ""}
                                      onChange={(e) => handleInputChange(dist.id, bahanId, "jumlahLembar", e.target.value)}
                                      placeholder="0"
                                      className="modern-input hasil-cutting-input-erp hasil-cutting-input-erp-sm hasil-cutting-input-number hasil-cutting-input-qty-erp"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      min="0"
                                      value={currentData.totalProduk || ""}
                                      onChange={(e) => handleInputChange(dist.id, bahanId, "totalProduk", e.target.value)}
                                      placeholder="0"
                                      className="modern-input hasil-cutting-input-erp hasil-cutting-input-erp-sm hasil-cutting-input-number hasil-cutting-input-qty-erp"
                                    />
                                  </td>
                                  <td>
                                    <div className="hasil-cutting-cell-metric is-neutral">
                                      {parseSafeFloat(currentData.jumlahLembar) > 0 && totalProduk > 0 ? (totalProduk / parseSafeFloat(currentData.jumlahLembar)).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "0"}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="hasil-cutting-cell-metric is-success">
                                      {beratPerProduk > 0 ? `${beratPerProduk.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : "-"}
                                    </div>
                                  </td>
                                  <td>
                                    {statusPerbandingan ? (
                                      <span className={`hasil-cutting-status-badge ${statusClass}`}>
                                        {statusText}
                                      </span>
                                    ) : (
                                      <span className="hasil-cutting-status-badge-empty">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                                <div>
                                  <div style={{ fontSize: "40px", marginBottom: "16px", color: "#475569" }}><i className="fas fa-clipboard-list"></i></div>
                                  <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#667eea" }}>Tidak ada data bahan</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {spkDetail.detail && spkDetail.detail.length > 0 && (
                          <tfoot>
                            <tr className="hasil-cutting-total-row">
                              <td colSpan="9" className="hasil-cutting-total-label">
                                Total {dist.kode_seri}:
                              </td>
                              <td className="hasil-cutting-total-value">
                                {getTotalKeseluruhanDistribusi(dist.id).toLocaleString("id-ID")}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                        </table>
                      </div>
                    </div>
                  ))
                ) : !loading && (
                  <div className="hasil-cutting-form-section hasil-cutting-form-section-detail">
                    <div className="hasil-cutting-table-wrap">
                      <table className="penjahit-table hasil-cutting-entry-detail-table">
                        <tbody>
                          <tr>
                            <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                              {!selectedSpkId ? (
                                <div>
                                  <div style={{ fontSize: "40px", marginBottom: "16px", color: "#475569" }}><i className="fas fa-search"></i></div>
                                  <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#667eea" }}>Pilih SPK cutting terlebih dahulu</p>
                                  <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#666" }}>Gunakan search di atas untuk mencari kode SPK cutting</p>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ fontSize: "40px", marginBottom: "16px", color: "#475569" }}><i className="fas fa-clipboard-list"></i></div>
                                  <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#667eea" }}>Tidak ada data distribusi</p>
                                </div>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Ringkasan distribusi otomatis (Global) */}
                {!loading && spkDetail && spkDetail.distribusi_list && spkDetail.distribusi_list.length > 0 && (
                  <div className="hasil-cutting-form-section hasil-cutting-form-section-distribusi hasil-cutting-distribusi-section">
                    <div className="hasil-cutting-section-bar">
                      <h3 className="hasil-cutting-section-title">
                        Ringkasan Penyimpanan
                      </h3>
                    </div>

                    <div className="hasil-cutting-distribusi-panel">
                      <div className="hasil-cutting-distribusi-summary primary">
                        <div className="hasil-cutting-distribusi-summary-label">Total hasil yang akan disimpan</div>
                        <div className="hasil-cutting-distribusi-summary-value is-match">
                          {getTotalKeseluruhan().toLocaleString("id-ID")} pcs
                        </div>
                      </div>
                      <div className="hasil-cutting-inline-alert info">
                        <i className="fas fa-info-circle"></i>
                        <span>Sistem akan menyimpan data hasil cutting untuk {spkDetail.distribusi_list.length} distribusi sekaligus. Pastikan mengisi baris yang ingin disimpan.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Messages */}
                {!loading && !spkDetail && selectedSpkId && (
                  <div className="hasil-cutting-message-box error">
                    <div style={{ fontSize: "40px", marginBottom: "16px", color: "#b91c1c" }}><i className="fas fa-exclamation-triangle"></i></div>
                    <p
                      style={{
                        margin: 0,
                        color: "#dc3545",
                        fontWeight: "600",
                        fontSize: "16px",
                        marginBottom: "8px",
                      }}
                    >
                      Data SPK Cutting tidak ditemukan
                    </p>
                    <p
                      style={{
                        margin: 0,
                        color: "#666",
                        fontSize: "14px",
                      }}
                    >
                      Pastikan SPK Cutting ini memiliki bagian dan bahan yang terdaftar, serta sudah ada data di stok_bahan_keluar.
                    </p>
                  </div>
                )}
                {!loading && spkDetail && spkDetail.spk_cutting && (!spkDetail.detail || spkDetail.detail.length === 0) && (
                  <div className="hasil-cutting-message-box warning">
                    <div style={{ fontSize: "40px", marginBottom: "16px", color: "#b45309" }}><i className="fas fa-info-circle"></i></div>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "600",
                        fontSize: "16px",
                        color: "#856404",
                        marginBottom: "8px",
                      }}
                    >
                      SPK Cutting "{spkDetail.spk_cutting.id_spk_cutting} - {spkDetail.spk_cutting.nama_produk}" ditemukan
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#856404",
                      }}
                    >
                      Namun tidak ada data bagian dan bahan. Pastikan SPK Cutting ini sudah memiliki bagian dan bahan yang terdaftar, serta sudah ada data di stok_bahan_keluar.
                    </p>
                  </div>
                )}

                {!loading && spkDetail && spkDetail.detail && spkDetail.detail.length > 0 && (
                  <div className="hasil-cutting-modal-footer">
                    <button
                      onClick={handleSimpan}
                      disabled={saving}
                      className={`hasil-cutting-primary-button hasil-cutting-save-button${saving ? " is-disabled" : ""}`}
                    >
                      {saving ? (
                        <>
                          <div className="hasil-cutting-save-spinner"></div>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save"></i>
                          Simpan Data
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Detail */}
        {detailData && (
          <div className="hasil-cutting-modal-overlay">
            <div className="hasil-cutting-modal-content detail hasil-cutting-modal-content-detail-erp" onClick={(e) => e.stopPropagation()}>
              <div className="hasil-cutting-modal-header hasil-cutting-modal-header-detail">
                <h2 className="hasil-cutting-modal-title">Detail Hasil Cutting</h2>
                <button
                  onClick={() => setDetailData(null)}
                  className="hasil-cutting-modal-close-button"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="hasil-cutting-detail-content">
                <div className="hasil-cutting-detail-overview">
                  <div className="hasil-cutting-detail-overview-grid">
                    <div className="hasil-cutting-detail-overview-card">
                      <div className="hasil-cutting-detail-overview-head">
                        <i className="fas fa-tag hasil-cutting-detail-overview-icon"></i>
                        <p className="hasil-cutting-detail-overview-label">SPK Cutting</p>
                      </div>
                      <p className="hasil-cutting-detail-overview-value">{detailData.id_spk_cutting}</p>
                    </div>
                    <div className="hasil-cutting-detail-overview-card">
                      <div className="hasil-cutting-detail-overview-head">
                        <i className="fas fa-box hasil-cutting-detail-overview-icon"></i>
                        <p className="hasil-cutting-detail-overview-label">Produk</p>
                      </div>
                      <p className="hasil-cutting-detail-overview-value">{detailData.nama_produk}</p>
                    </div>
                    <div className="hasil-cutting-detail-overview-card">
                      <div className="hasil-cutting-detail-overview-head">
                        <i className="far fa-calendar-alt hasil-cutting-detail-overview-icon"></i>
                        <p className="hasil-cutting-detail-overview-label">Tanggal</p>
                      </div>
                      <p className="hasil-cutting-detail-overview-value">
                        {new Date(detailData.created_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="hasil-cutting-detail-overview-card">
                      <div className="hasil-cutting-detail-overview-head">
                        <i className="far fa-calendar-check hasil-cutting-detail-overview-icon"></i>
                        <p className="hasil-cutting-detail-overview-label">Tanggal Potong</p>
                      </div>
                      <p className="hasil-cutting-detail-overview-value">
                        {detailData.tanggal_potong ? new Date(detailData.tanggal_potong).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        }) : "-"}
                      </p>
                    </div>
                    <div className="hasil-cutting-detail-overview-card hasil-cutting-detail-overview-card-highlight">
                      <div className="hasil-cutting-detail-overview-head">
                        <i className="fas fa-money-bill-wave hasil-cutting-detail-overview-icon"></i>
                        <p className="hasil-cutting-detail-overview-label">Total Bayar</p>
                      </div>
                      <p className="hasil-cutting-detail-overview-value hasil-cutting-detail-overview-value-highlight">
                        {detailData.total_bayar
                          ? `Rp ${Number(detailData.total_bayar).toLocaleString("id-ID", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}`
                          : "Rp 0"}
                      </p>
                    </div>
                  </div>
                </div>

                {Array.isArray(detailData.data_acuan) && detailData.data_acuan.length > 0 && (
                  <div className="hasil-cutting-detail-section">
                    <div className="hasil-cutting-section-bar hasil-cutting-section-bar-soft hasil-cutting-section-bar-inline">
                      <i className="fas fa-clipboard-list hasil-cutting-section-icon"></i>
                      <h3 className="hasil-cutting-section-title hasil-cutting-section-title-soft">Data Acuan</h3>
                    </div>
                    <div className="hasil-cutting-table-wrap">
                      <table className="penjahit-table hasil-cutting-detail-table">
                        <thead>
                          <tr>
                            <th>Warna</th>
                            <th>Berat Acuan (KG)</th>
                            <th>Banyak Produk</th>
                            <th>Berat Acuan per Produk (KG)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.data_acuan.map((acuan, idx) => (
                            <tr key={idx}>
                              <td>
                                <span className="hasil-cutting-chip hasil-cutting-chip-primary">
                                  {acuan.warna}
                                </span>
                              </td>
                              <td className="hasil-cutting-detail-cell-strong">{acuan.berat_acuan?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                              <td>
                                <span className="hasil-cutting-chip hasil-cutting-chip-success">
                                  {acuan.banyak_produk}
                                </span>
                              </td>
                              <td>
                                <span className="hasil-cutting-chip hasil-cutting-chip-soft-success">
                                  {acuan.berat_acuan_per_produk?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {detailData.distribusi_seri && Array.isArray(detailData.distribusi_seri) && detailData.distribusi_seri.length > 0 && (
                  <div className="hasil-cutting-detail-section">
                    <div className="hasil-cutting-section-bar hasil-cutting-section-bar-soft hasil-cutting-section-bar-inline">
                      <i className="fas fa-boxes hasil-cutting-section-icon"></i>
                      <h3 className="hasil-cutting-section-title hasil-cutting-section-title-soft">Distribusi Seri</h3>
                    </div>
                    <div className="hasil-cutting-table-wrap">
                      <table className="penjahit-table hasil-cutting-detail-table">
                        <thead>
                          <tr>
                            <th>NO</th>
                            <th>KODE SERI</th>
                            <th>JUMLAH PRODUK</th>
                            <th>DETAIL WARNA</th>
                            <th>STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.distribusi_seri.filter(Boolean).map((distribusi, idx) => {
                            const statusDistribusi = distribusi?.status || "draft";
                            return (
                            <tr key={distribusi?.id || idx}>
                              <td className="hasil-cutting-detail-row-no">{idx + 1}</td>
                              <td>
                                <span className="hasil-cutting-chip hasil-cutting-chip-primary">
                                  {distribusi?.kode_seri || "-"}
                                </span>
                              </td>
                              <td>
                                <span className="hasil-cutting-chip hasil-cutting-chip-success">
                                  {(parseInt(distribusi?.jumlah_produk, 10) || 0).toLocaleString("id-ID")}
                                </span>
                              </td>
                              <td>
                                {distribusi.detail && distribusi.detail.length > 0 ? (
                                  <div className="hasil-cutting-detail-warna-list">
                                    {distribusi.detail.filter(Boolean).map((detail, detailIdx) => (
                                      <div key={detailIdx} className="hasil-cutting-detail-warna-item">
                                        <span className="hasil-cutting-chip hasil-cutting-chip-primary-sm">
                                          {detail?.warna || "-"}
                                        </span>
                                        <span className="hasil-cutting-chip hasil-cutting-chip-info-sm">
                                          {(parseInt(detail?.jumlah_produk, 10) || 0).toLocaleString("id-ID")} pcs
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="hasil-cutting-chip hasil-cutting-chip-muted">
                                    Tidak ada detail warna
                                  </span>
                                )}
                              </td>
                              <td>
                                <span
                                  className={`hasil-cutting-chip hasil-cutting-chip-status ${statusDistribusi === "draft" ? "is-draft" : statusDistribusi === "completed" ? "is-completed" : "is-default"}`}
                                >
                                  {statusDistribusi}
                                </span>
                              </td>
                            </tr>
                          )})}
                        </tbody>
                        <tfoot>
                          <tr className="hasil-cutting-detail-total-row">
                            <td colSpan="3" className="hasil-cutting-detail-total-label">
                              Total Distribusi:
                            </td>
                            <td className="hasil-cutting-detail-total-value">
                              {detailData.distribusi_seri.reduce((sum, d) => sum + (parseInt(d?.jumlah_produk, 10) || 0), 0).toLocaleString("id-ID")}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                <div className="hasil-cutting-detail-section">
                  <div className="hasil-cutting-section-bar hasil-cutting-section-bar-soft hasil-cutting-section-bar-inline">
                    <i className="fas fa-list-alt hasil-cutting-section-icon"></i>
                    <h3 className="hasil-cutting-section-title hasil-cutting-section-title-soft">Data Hasil</h3>
                  </div>
                  <div className="hasil-cutting-table-wrap">
                    <table className="penjahit-table hasil-cutting-detail-table">
                      <thead>
                        <tr>
                          <th>Bagian</th>
                          <th>Nama Bahan</th>
                          <th>Warna</th>
                          <th>Berat (KG)</th>
                          <th>Qty</th>
                          <th>Jumlah Lembar</th>
                          <th>Jumlah per Lembar</th>
                          <th>Total Produk</th>
                          <th>Berat per Produk (KG)</th>
                          <th>Status Perbandingan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.bahan.map((bahan, idx) => {
                          // Cari status perbandingan dari status_perbandingan_agregat berdasarkan warna
                          const statusPerbandinganAgregat = detailData.status_perbandingan_agregat || [];
                          const statusPerbandingan = statusPerbandinganAgregat.find((s) => s && s.warna === bahan.warna)?.status || null;

                          return (
                            <tr key={idx}>
                              <td className="hasil-cutting-detail-cell-strong">{bahan.nama_bagian || "-"}</td>
                              <td className="hasil-cutting-detail-cell-medium">{bahan.nama_bahan || "-"}</td>
                              <td>
                                {bahan.warna ? (
                                  <span className="hasil-cutting-chip hasil-cutting-chip-primary">
                                    {bahan.warna}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="hasil-cutting-detail-cell-strong">{bahan.berat?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                              <td>
                                {bahan.qty ? (
                                  <span className="hasil-cutting-chip hasil-cutting-chip-info">
                                    {bahan.qty}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="hasil-cutting-detail-cell-medium">{bahan.jumlah_lembar || 0}</td>
                              <td className="hasil-cutting-detail-cell-medium">{parseSafeFloat(bahan.jumlah_produk).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                              <td>
                                <span className={`hasil-cutting-chip ${bahan.total_produk > 0 ? "hasil-cutting-chip-success" : "hasil-cutting-chip-muted"}`}>
                                  {bahan.total_produk?.toLocaleString("id-ID") || bahan.hasil?.toLocaleString("id-ID") || 0}
                                </span>
                              </td>
                              <td>
                                <span className="hasil-cutting-chip hasil-cutting-chip-soft-success">
                                  {bahan.berat_per_produk?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                                </span>
                              </td>
                              <td>
                                {statusPerbandingan ? (
                                  <span
                                    className={`hasil-cutting-status-badge ${
                                      statusPerbandingan === "lebih berat dari acuan"
                                        ? "hasil-cutting-status-badge-heavier"
                                        : statusPerbandingan === "lebih ringan dari acuan"
                                        ? "hasil-cutting-status-badge-lighter"
                                        : "hasil-cutting-status-badge-same"
                                    }`}
                                  >
                                    {(() => {
                                      const statusInfo = statusPerbandinganAgregat.find((s) => s && s.warna === bahan.warna);
                                      const status = statusInfo?.status || statusPerbandingan;
                                      const selisih = statusInfo?.selisih || 0;
 
                                      if (status === "lebih berat dari acuan") {
                                        return `${status} ${selisih > 0 ? selisih.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kg" : ""}`;
                                      } else if (status === "lebih ringan dari acuan") {
                                        return `${status} ${selisih > 0 ? selisih.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kg" : ""}`;
                                      } else {
                                        return status;
                                      }
                                    })()}
                                  </span>
                                ) : (
                                  <span className="hasil-cutting-status-badge-empty">
                                    -
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Baris Total */}
                      {detailData.bahan && detailData.bahan.length > 0 && (
                        <tfoot>
                          <tr className="hasil-cutting-detail-total-row">
                            <td colSpan="3" className="hasil-cutting-detail-total-label">
                              <strong>TOTAL:</strong>
                            </td>
                            <td colSpan="4" className="hasil-cutting-detail-total-spacer"></td>
                            <td className="hasil-cutting-detail-total-value">
                              <strong>{detailData.bahan.reduce((sum, bahan) => sum + parseSafeFloat(bahan.total_produk || bahan.hasil), 0).toLocaleString("id-ID")}</strong>
                            </td>
                            <td className="hasil-cutting-detail-total-value">
                              <strong>{detailData.bahan.reduce((sum, bahan) => sum + parseSafeFloat(bahan.berat_per_produk), 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</strong>
                            </td>
                            <td className="hasil-cutting-detail-total-spacer"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HasilCutting;

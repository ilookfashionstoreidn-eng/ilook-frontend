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

const HasilCutting = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [spkCuttingList, setSpkCuttingList] = useState([]);
  const [selectedSpkId, setSelectedSpkId] = useState("");
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

  // Fetch list SPK Cutting
  useEffect(() => {
    const fetchSpkCutting = async () => {
      try {
        const response = await API.get("/spk_cutting");
        const data = response.data?.data || response.data || [];
        // Pastikan selalu array
        setSpkCuttingList(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Gagal mengambil SPK Cutting:", error);
        setSpkCuttingList([]);
      }
    };
    fetchSpkCutting();
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
        const response = await API.get(`/hasil_cutting/detail-spk`, {
          params: { spk_cutting_id: selectedSpkId },
        });
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
  }, [selectedSpkId, editingId]);

  // Handler untuk update input data per item
  const handleInputChange = (bahanId, field, value) => {
    setInputData((prev) => ({
      ...prev,
      [bahanId]: {
        ...prev[bahanId],
        [field]: value,
      },
    }));
  };

  // Fungsi untuk mendapatkan total produk per item
  const getTotalProduk = (bahanId) => {
    const data = inputData[bahanId] || {};
    const lembar = parseFloat(data.jumlahLembar || 0);
    const produk = parseFloat(data.jumlahProduk || 0);
    return lembar * produk;
  };

  // Fungsi untuk mendapatkan total keseluruhan
  const getTotalKeseluruhan = () => {
    if (!spkDetail?.detail) return 0;
    return spkDetail.detail.reduce((total, item) => {
      return total + getTotalProduk(item.spk_cutting_bahan_id);
    }, 0);
  };

  // Fungsi untuk menghitung berat per produk
  const getBeratPerProduk = (beratScanned, totalProduk) => {
    if (!beratScanned || beratScanned <= 0 || !totalProduk || totalProduk <= 0) {
      return 0;
    }
    return beratScanned / totalProduk;
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
    if (!beratAcuan || beratAcuan <= 0 || !banyakProduk || banyakProduk <= 0) {
      return 0;
    }
    return beratAcuan / banyakProduk;
  };

  // Fungsi untuk mendapatkan berat acuan per produk berdasarkan warna
  // Jika warna tidak ditemukan, gunakan berat acuan dari warna pertama yang tersedia (fallback)
  const getBeratAcuanByWarna = (warna) => {
    if (!warna || !dataAcuan || dataAcuan.length === 0) return null;

    // Cari berat acuan untuk warna yang sama
    const acuanSesuaiWarna = dataAcuan.find((a) => a.warna === warna && a.berat_acuan && a.banyak_produk);
    if (acuanSesuaiWarna) {
      return getBeratAcuanPerProduk(parseFloat(acuanSesuaiWarna.berat_acuan || 0), parseFloat(acuanSesuaiWarna.banyak_produk || 0));
    }

    // Jika tidak ditemukan, gunakan berat acuan dari warna pertama yang tersedia (fallback)
    const acuanFallback = dataAcuan.find((a) => a.berat_acuan && a.banyak_produk);
    if (acuanFallback) {
      return getBeratAcuanPerProduk(parseFloat(acuanFallback.berat_acuan || 0), parseFloat(acuanFallback.banyak_produk || 0));
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
    if (!selectedSpkId || !spkDetail?.detail) {
      await showStatusAlert("warning", "SPK Belum Dipilih", "Pilih SPK Cutting terlebih dahulu.");
      return;
    }

    // Validasi: pastikan semua data hasil sudah diisi
    const hasEmptyData = spkDetail.detail.some((item) => {
      const bahanId = item.spk_cutting_bahan_id;
      const data = inputData[bahanId] || {};
      return !data.jumlahLembar || !data.jumlahProduk || parseFloat(data.jumlahLembar) <= 0 || parseFloat(data.jumlahProduk) <= 0;
    });

    if (hasEmptyData) {
      await showStatusAlert("warning", "Data Belum Lengkap", "Lengkapi semua data jumlah lembar dan jumlah produk.");
      return;
    }

    // Validasi distribusi seri (hanya jika user mengisi distribusi seri)
    const totalProduk = getTotalKeseluruhan();
    const totalDistribusi = getTotalDistribusiSeri();

    // Cek apakah user mengisi distribusi seri (ada yang diisi)
    const hasDistribusiData = distribusiSeri.some((item) => item.jumlah_produk && parseInt(item.jumlah_produk) > 0);

    if (hasDistribusiData) {
      // Jika user mengisi distribusi seri, validasi harus lengkap dan total harus sama
      const hasEmptyDistribusi = distribusiSeri.some((item) => !item.jumlah_produk || parseInt(item.jumlah_produk) <= 0);
      if (hasEmptyDistribusi) {
        await showStatusAlert("warning", "Distribusi Seri Belum Lengkap", "Lengkapi semua data distribusi seri yang sudah diisi.");
        return;
      }

      if (totalDistribusi !== totalProduk) {
        await showStatusAlert(
          "warning",
          "Total Distribusi Tidak Sama",
          `Total distribusi seri (${totalDistribusi.toLocaleString("id-ID")}) harus sama dengan total produk (${totalProduk.toLocaleString("id-ID")}).`
        );
        return;
      }

      // Validasi detail distribusi: total detail harus sama dengan jumlah_produk distribusi
      for (let i = 0; i < distribusiSeri.length; i++) {
        const distribusi = distribusiSeri[i];
        if (distribusi.jumlah_produk && parseInt(distribusi.jumlah_produk) > 0) {
          const totalDetail = getTotalDetailDistribusi(i);
          const jumlahProdukDistribusi = parseInt(distribusi.jumlah_produk);

          // Jika ada detail yang diisi, validasi total harus sama
          const hasDetailData = distribusi.detail && distribusi.detail.length > 0 && distribusi.detail.some((d) => d.warna && d.jumlah_produk && parseInt(d.jumlah_produk) > 0);

          if (hasDetailData) {
            // Validasi semua detail harus lengkap
            const hasEmptyDetail = distribusi.detail.some((d) => !d.warna || !d.jumlah_produk || parseInt(d.jumlah_produk) <= 0);
            if (hasEmptyDetail) {
              await showStatusAlert("warning", "Detail Distribusi Belum Lengkap", `Lengkapi semua data detail distribusi seri ke-${i + 1}.`);
              return;
            }

            if (totalDetail !== jumlahProdukDistribusi) {
              await showStatusAlert(
                "warning",
                "Total Detail Tidak Sama",
                `Total detail distribusi seri ke-${i + 1} (${totalDetail.toLocaleString("id-ID")}) harus sama dengan jumlah produk (${jumlahProdukDistribusi.toLocaleString("id-ID")}).`
              );
              return;
            }
          }
        }
      }
    }
    // Jika tidak ada distribusi seri yang diisi, skip validasi (opsional)

    setSaving(true);
    try {
      // Format data hasil dengan status perbandingan
      const statusPerbandinganArray = [];
      const dataHasil = spkDetail.detail.map((item) => {
        const bahanId = item.spk_cutting_bahan_id;
        const data = inputData[bahanId] || {};
        const totalProduk = getTotalProduk(bahanId);
        const beratPerProduk = getBeratPerProduk(item.berat_scanned, totalProduk);
        const statusPerbandingan = getStatusPerbandingan(item.warna, beratPerProduk);

        // Debug per item
        if (item.warna && dataAcuan && dataAcuan.length > 0) {
          console.log(`Item ${item.warna}:`, {
            beratPerProduk,
            beratAcuanPerProduk: getBeratAcuanByWarna(item.warna),
            statusPerbandingan,
            totalProduk,
            beratScanned: item.berat_scanned,
            dataAcuan: dataAcuan.filter((a) => a.warna === item.warna),
          });
        }

        // Kumpulkan status perbandingan untuk agregat
        if (statusPerbandingan && item.warna) {
          const beratAcuanPerProduk = getBeratAcuanByWarna(item.warna);

          // Cek apakah menggunakan fallback (warna tidak sama dengan warna di data acuan)
          const acuanSesuaiWarna = dataAcuan.find((a) => a.warna === item.warna && a.berat_acuan && a.banyak_produk);
          const menggunakanFallback = !acuanSesuaiWarna && dataAcuan.length > 0;

          statusPerbandinganArray.push({
            warna: item.warna,
            status: statusPerbandingan.status || statusPerbandingan,
            selisih: statusPerbandingan.selisih || 0,
            berat_per_produk: beratPerProduk,
            berat_acuan_per_produk: beratAcuanPerProduk,
            menggunakan_fallback: menggunakanFallback, // Flag untuk menandai apakah menggunakan fallback
          });
        }

        return {
          spk_cutting_bahan_id: bahanId,
          spk_cutting_bagian_id: item.spk_cutting_bagian_id,
          nama_bagian: item.nama_bagian || null,
          nama_bahan: item.nama_bahan || null,
          warna: item.warna || null,
          qty: item.qty || null,
          jumlah_lembar: parseFloat(data.jumlahLembar || 0),
          jumlah_produk: parseFloat(data.jumlahProduk || 0),
          total_produk: totalProduk,
          berat_total: parseFloat(item.berat_scanned || 0), // Berat total dari stok_bahan_keluar
          berat_per_produk: beratPerProduk,
          status_perbandingan: statusPerbandingan?.status || statusPerbandingan,
          selisih_perbandingan: statusPerbandingan?.selisih || 0,
          produk_sku_id: data.produkSkuId ? parseInt(data.produkSkuId) : null,
        };
      });

      // Format data acuan
      const formattedDataAcuan = dataAcuan
        .filter((acuan) => acuan.warna && acuan.berat_acuan && acuan.banyak_produk)
        .map((acuan) => ({
          warna: acuan.warna,
          berat_acuan: parseFloat(acuan.berat_acuan || 0),
          banyak_produk: parseFloat(acuan.banyak_produk || 0),
          berat_acuan_per_produk: getBeratAcuanPerProduk(parseFloat(acuan.berat_acuan || 0), parseFloat(acuan.banyak_produk || 0)),
        }));

      // Format status perbandingan agregat (ringkasan per warna)
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

      // Format distribusi seri sesuai dengan logika backend:
      // - Jika user mengisi distribusi seri, kirim array dengan data dan detail
      // - Jika tidak diisi, kirim null (backend akan membuat implicit single series)
      const hasDistribusiData = distribusiSeri.some((item) => item.jumlah_produk && parseInt(item.jumlah_produk) > 0);
      const formattedDistribusiSeri = hasDistribusiData
        ? distribusiSeri
            .filter((item) => item.jumlah_produk && parseInt(item.jumlah_produk) > 0)
            .map((item) => {
              const distribusiItem = {
                jumlah_produk: parseInt(item.jumlah_produk) || 0,
              };

              // Jika ada detail yang diisi, tambahkan ke distribusi
              if (item.detail && item.detail.length > 0) {
                const detailData = item.detail.filter((d) => d.warna && d.jumlah_produk && parseInt(d.jumlah_produk) > 0);
                if (detailData.length > 0) {
                  distribusiItem.detail = detailData.map((d) => ({
                    warna: d.warna,
                    jumlah_produk: parseInt(d.jumlah_produk) || 0,
                    produk_sku_id: d.produk_sku_id ? parseInt(d.produk_sku_id) : null,
                  }));
                }
              }

              return distribusiItem;
            })
        : null; // Kirim null jika tidak ada distribusi seri (backend akan membuat implicit single series)

      // Debug: Log data yang akan dikirim
      console.log("Status Perbandingan Agregat yang akan dikirim:", statusPerbandinganAgregatArray);
      console.log("Data Acuan yang akan dikirim:", formattedDataAcuan);
      console.log("Distribusi Seri yang akan dikirim:", formattedDistribusiSeri);

      // Kirim data ke backendd
      let response;
      const payload = {
        spk_cutting_id: selectedSpkId,
        data_hasil: dataHasil,
        data_acuan: formattedDataAcuan,
        status_perbandingan_agregat: statusPerbandinganAgregatArray,
        distribusi_seri: formattedDistribusiSeri,
      };

      console.log("Payload lengkap yang dikirim:", payload);

      if (editingId) {
        response = await API.put(`/hasil_cutting/${editingId}`, payload);
      } else {
        response = await API.post("/hasil_cutting", payload);
      }

      await showStatusAlert("success", "Berhasil", editingId ? "Data berhasil diupdate." : "Data berhasil disimpan.");
      console.log("Data tersimpan:", response.data);

      // Reset form setelah berhasil simpan
      setSelectedSpkId("");
      setSpkDetail(null);
      setInputData({});
      setDataAcuan([]);
      setDistribusiSeri([{ jumlah_produk: "" }]);
      setShowForm(false);
      setEditingId(null);

      // Refresh data setelah simpan
      try {
        const refreshParams = { page: 1, per_page: 7 };
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
      } catch (error) {
        console.error("Gagal refresh data:", error);
      }
    } catch (error) {
      console.error("Gagal menyimpan data:", error);
      console.error("Error response:", error.response);
      console.error("Error details:", error.response?.data);

      let errorMessage = "Terjadi kesalahan saat menyimpan data";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Jika ada validation errors
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

      // Debug: Log data yang diterima dari backend
      console.log("Data untuk edit:", data);
      console.log("Data bahan:", data.bahan);
      console.log("Data acuan:", data.data_acuan);

      // Snapshot data lama untuk ditampilkan saat edit
      const totalProdukLama = (data.bahan || []).reduce((sum, bahan) => sum + (parseFloat(bahan.total_produk || bahan.hasil) || 0), 0);
      const totalBeratPerProdukLama = (data.bahan || []).reduce((sum, bahan) => sum + (parseFloat(bahan.berat_per_produk) || 0), 0);
      const totalBeratLama = (data.bahan || []).reduce((sum, bahan) => sum + (parseFloat(bahan.berat) || 0), 0);
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
        data.bahan.forEach((bahan) => {
          inputDataObj[bahan.spk_cutting_bahan_id] = {
            jumlahLembar: bahan.jumlah_lembar !== null && bahan.jumlah_lembar !== undefined ? bahan.jumlah_lembar : "",
            jumlahProduk: bahan.jumlah_produk !== null && bahan.jumlah_produk !== undefined ? bahan.jumlah_produk : "",
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
        params: { spk_cutting_id: data.spk_cutting_id },
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
      const refreshParams = { page: 1, per_page: 7 };
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
    setSpkDetail(null);
    setInputData({});
    setDataAcuan([]);
    setDistribusiSeri([{ jumlah_produk: "" }]);
    setDetailData(null);
    setSearchSpkQuery("");
    setShowSpkDropdown(false);
    setOriginalData(null);
  };

  // Handler untuk batal
  const handleBatal = () => {
    setShowForm(false);
    setEditingId(null);
    setSelectedSpkId("");
    setSpkDetail(null);
    setInputData({});
    setDataAcuan([]);
    setDistribusiSeri([{ jumlah_produk: "" }]);
    setDetailData(null);
    setSearchSpkQuery("");
    setShowSpkDropdown(false);
    setOriginalData(null);
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

  // Filter SPK Cutting berdasarkan search query
  const filteredSpkCutting = spkCuttingList.filter((spk) => {
    const searchLower = searchSpkQuery.toLowerCase();
    const idSpkCutting = (spk.id_spk_cutting || "").toLowerCase();
    const namaProduk = (spk.produk?.nama_produk || "").toLowerCase();
    return idSpkCutting.includes(searchLower) || namaProduk.includes(searchLower);
  });

  // Handler untuk memilih SPK Cutting dari hasil search
  const handleSelectSpk = (spkId, idSpkCutting, namaProduk) => {
    setSelectedSpkId(spkId);
    setSearchSpkQuery(`${idSpkCutting} - ${namaProduk}`);
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
        <div>
          {loadingData ? (
            <div className="hasil-cutting-loading-container">
              <div className="hasil-cutting-loading-spinner"></div>
              <p className="hasil-cutting-loading-text">Memuat data...</p>
            </div>
          ) : dataHasilCutting.length > 0 ? (
            <>
              <table className="penjahit-table hasil-cutting-index-table">
                <thead>
                  <tr>
                    <th>NO</th>
                    <th>SPK CUTTING</th>
                    <th>PRODUK</th>
                    <th>TOTAL PRODUK</th>
                    <th>TOTAL BAYAR</th>
                    <th>TANGGAL</th>
                    <th>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {dataHasilCutting.map((item, index) => (
                    <tr key={item.id} className="hasil-cutting-table-row">
                      <td className="hasil-cutting-table-no">{(currentPage - 1) * 7 + index + 1}</td>
                      <td>
                        <span className="hasil-cutting-badge">{item.id_spk_cutting || "-"}</span>
                      </td>
                      <td className="hasil-cutting-table-product">{item.nama_produk || "-"}</td>
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
                        <i className="far fa-calendar hasil-cutting-table-date-icon"></i>
                        {new Date(item.created_at).toLocaleDateString("id-ID", {
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
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleBatal();
              }
            }}
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

                <div className="hasil-cutting-modal-top-grid">
                  <div className="hasil-cutting-modal-top-card">
                    <div className="hasil-cutting-modal-top-title">Alur Input</div>
                    <div className="hasil-cutting-modal-tabs">
                      <div className={`hasil-cutting-modal-tab ${selectedSpkId ? "is-done" : "is-active"}`}>
                        <span className="hasil-cutting-workflow-step-no">1</span>
                        Pilih SPK
                      </div>
                      <div className={`hasil-cutting-modal-tab ${dataAcuan.length > 0 ? "is-done" : ""}`}>
                        <span className="hasil-cutting-workflow-step-no">2</span>
                        Data Acuan
                      </div>
                      <div className={`hasil-cutting-modal-tab ${spkDetail?.detail?.length > 0 ? "is-done" : ""}`}>
                        <span className="hasil-cutting-workflow-step-no">3</span>
                        Input Detail
                      </div>
                      <div className={`hasil-cutting-modal-tab ${getTotalDistribusiSeri() > 0 ? "is-done" : ""}`}>
                        <span className="hasil-cutting-workflow-step-no">4</span>
                        Distribusi Seri
                      </div>
                    </div>

                    <div className="hasil-cutting-intake-shell">
                      <div className="hasil-cutting-form-group hasil-cutting-form-spk-group">
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
                            placeholder="Ketik untuk mencari SPK Cutting (contoh: SK24, Gamis Karinaa)"
                            className="modern-input hasil-cutting-form-input hasil-cutting-form-input-search"
                          />
                          <i className="fas fa-search hasil-cutting-form-search-icon"></i>

                          {/* Dropdown hasil pencarian */}
                          {showSpkDropdown && searchSpkQuery && filteredSpkCutting.length > 0 && (
                            <div className="hasil-cutting-form-dropdown">
                              {filteredSpkCutting.map((spk) => (
                                <div
                                  key={spk.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent blur event
                                    handleSelectSpk(spk.id, spk.id_spk_cutting, spk.produk?.nama_produk || "N/A");
                                  }}
                                  className="hasil-cutting-form-dropdown-item"
                                >
                                  <div className="hasil-cutting-form-dropdown-content">
                                    <i className="fas fa-tag hasil-cutting-form-dropdown-icon"></i>
                                    <div>
                                      <div className="hasil-cutting-form-dropdown-title">{spk.id_spk_cutting}</div>
                                      <div className="hasil-cutting-form-dropdown-subtitle">{spk.produk?.nama_produk || "N/A"}</div>
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
                              <p className="hasil-cutting-form-dropdown-empty-text">Tidak ada SPK Cutting yang ditemukan</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="hasil-cutting-modal-top-card">
                    <div className="hasil-cutting-modal-top-title">Ringkasan Operasional</div>
                    <div className="hasil-cutting-operational-grid">
                      <div className="hasil-cutting-operational-item">
                        <p className="hasil-cutting-operational-label">SPK Aktif</p>
                        <p className="hasil-cutting-operational-value">{spkDetail?.spk_cutting?.id_spk_cutting || "-"}</p>
                      </div>
                      <div className="hasil-cutting-operational-item">
                        <p className="hasil-cutting-operational-label">Produk</p>
                        <p className="hasil-cutting-operational-value">{spkDetail?.spk_cutting?.nama_produk || "-"}</p>
                      </div>
                      <div className="hasil-cutting-operational-item">
                        <p className="hasil-cutting-operational-label">Total Acuan</p>
                        <p className="hasil-cutting-operational-value">{dataAcuan.length.toLocaleString("id-ID")}</p>
                      </div>
                      <div className="hasil-cutting-operational-item">
                        <p className="hasil-cutting-operational-label">Total Produk</p>
                        <p className="hasil-cutting-operational-value">{getTotalKeseluruhan().toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabel Data Acuan - Selalu tampil */}
                <div className="hasil-cutting-form-section hasil-cutting-form-section-acuan">
                  <div className="hasil-cutting-section-bar">
                    <h3 className="hasil-cutting-section-title">Data Acuan</h3>
                    <button onClick={handleTambahAcuan} className="hasil-cutting-section-action">
                      <i className="fas fa-plus"></i>
                      Tambah Data Acuan
                    </button>
                  </div>

                  {dataAcuan.length > 0 ? (
                    <div className="hasil-cutting-table-wrap">
                      <table className="penjahit-table">
                        <thead>
                          <tr>
                            <th>Warna</th>
                            <th>Berat Acuan (KG)</th>
                            <th>Banyak Produk</th>
                            <th>Berat Acuan per Produk (KG)</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataAcuan.map((acuan) => {
                            const beratAcuanPerProduk = getBeratAcuanPerProduk(parseFloat(acuan.berat_acuan || 0), parseFloat(acuan.banyak_produk || 0));
                            return (
                              <tr key={acuan.id}>
                                <td>
                                  <div className="hasil-cutting-cell-input-shell">
                                    <select
                                      value={acuan.warna}
                                      onChange={(e) => handleAcuanChange(acuan.id, "warna", e.target.value)}
                                      className="modern-input hasil-cutting-input-erp hasil-cutting-input-erp-sm hasil-cutting-select-erp hasil-cutting-input-in-shell"
                                    >
                                      <option value="">-- Pilih Warna --</option>
                                      {getWarnaList().map((warna) => (
                                        <option key={warna} value={warna}>
                                          {warna}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                                <td>
                                  <div className="hasil-cutting-cell-input-shell has-addon-left">
                                    <span className="hasil-cutting-cell-input-addon">KG</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={acuan.berat_acuan || ""}
                                      onChange={(e) => handleAcuanChange(acuan.id, "berat_acuan", e.target.value)}
                                      placeholder="0.00"
                                      className="modern-input hasil-cutting-input-erp hasil-cutting-input-erp-sm hasil-cutting-input-number hasil-cutting-input-in-shell"
                                    />
                                  </div>
                                </td>
                                <td>
                                  <div className="hasil-cutting-cell-input-shell has-addon-right">
                                    <input
                                      type="number"
                                      min="0"
                                      value={acuan.banyak_produk || ""}
                                      onChange={(e) => handleAcuanChange(acuan.id, "banyak_produk", e.target.value)}
                                      placeholder="0"
                                      className="modern-input hasil-cutting-input-erp hasil-cutting-input-erp-sm hasil-cutting-input-number hasil-cutting-input-in-shell"
                                    />
                                    <span className="hasil-cutting-cell-input-addon right">PCS</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="hasil-cutting-cell-metric is-success">
                                    {beratAcuanPerProduk > 0 ? `${beratAcuanPerProduk.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : "-"}
                                  </div>
                                </td>
                                <td>
                                  <button
                                    onClick={() => handleHapusAcuan(acuan.id)}
                                    className="hasil-cutting-row-action-btn danger"
                                  >
                                    <i className="fas fa-trash"></i>
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="hasil-cutting-empty-state">
                      <div className="hasil-cutting-empty-state-icon"><i className="fas fa-clipboard-list"></i></div>
                      <p className="hasil-cutting-empty-state-title">Belum ada data acuan</p>
                      <p className="hasil-cutting-empty-state-text">Klik "Tambah Data Acuan" untuk menambahkan data acuan</p>
                    </div>
                  )}
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="hasil-cutting-loading-container">
                    <div className="hasil-cutting-loading-spinner"></div>
                    <p className="hasil-cutting-loading-text">Memuat data...</p>
                  </div>
                )}

                {/* Tabel Detail SPK Cutting - Selalu tampil */}
                <div className="hasil-cutting-form-section hasil-cutting-form-section-detail">
                  <div className="hasil-cutting-section-bar hasil-cutting-section-bar-soft">
                    <h3 className="hasil-cutting-section-title hasil-cutting-section-title-soft">
                      Detail SPK Cutting: {spkDetail?.spk_cutting?.id_spk_cutting ? `${spkDetail.spk_cutting.id_spk_cutting} - ${spkDetail.spk_cutting.nama_produk}` : "Belum dipilih"}
                    </h3>
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
                        <th>Jumlah Produk</th>
                        <th>Total Produk</th>
                        <th>Berat per Produk (KG)</th>
                        <th>Status Perbandingan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!loading && spkDetail && spkDetail.detail && spkDetail.detail.length > 0 ? (
                        spkDetail.detail.map((item, index) => {
                          const bahanId = item.spk_cutting_bahan_id;
                          const currentData = inputData[bahanId] || {};
                          const totalProduk = getTotalProduk(bahanId);
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
                            <tr key={`${bahanId}-${index}`}>
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
                                  onChange={(e) => handleInputChange(bahanId, "jumlahLembar", e.target.value)}
                                  placeholder="0"
                                  className="modern-input hasil-cutting-input-erp hasil-cutting-input-erp-sm hasil-cutting-input-number hasil-cutting-input-qty-erp"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  value={currentData.jumlahProduk || ""}
                                  onChange={(e) => handleInputChange(bahanId, "jumlahProduk", e.target.value)}
                                  placeholder="0"
                                  className="modern-input hasil-cutting-input-erp hasil-cutting-input-erp-sm hasil-cutting-input-number hasil-cutting-input-qty-erp"
                                />
                              </td>
                              <td>
                                <div className="hasil-cutting-cell-metric is-neutral">
                                  {totalProduk > 0 ? totalProduk.toLocaleString("id-ID") : "0"}
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
                            {!selectedSpkId ? (
                              <div>
                                <div style={{ fontSize: "40px", marginBottom: "16px", color: "#475569" }}><i className="fas fa-search"></i></div>
                                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#667eea" }}>Pilih SPK Cutting terlebih dahulu</p>
                                <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#666" }}>Gunakan search di atas untuk mencari dan memilih SPK Cutting</p>
                              </div>
                            ) : loading ? (
                              <div>
                                <div className="hasil-cutting-loading-spinner"></div>
                                <p style={{ marginTop: "16px", color: "#667eea", fontSize: "14px", fontWeight: "500" }}>Memuat data...</p>
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontSize: "40px", marginBottom: "16px", color: "#475569" }}><i className="fas fa-clipboard-list"></i></div>
                                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#667eea" }}>Tidak ada data detail</p>
                                <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#666" }}>SPK Cutting yang dipilih tidak memiliki data bagian dan bahan</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {!loading && spkDetail && spkDetail.detail && spkDetail.detail.length > 0 && (
                      <tfoot>
                        <tr className="hasil-cutting-total-row">
                          <td colSpan="9" className="hasil-cutting-total-label">
                            Total Keseluruhan:
                          </td>
                          <td className="hasil-cutting-total-value">
                            {getTotalKeseluruhan().toLocaleString("id-ID")}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                    </table>
                  </div>
                </div>

                {/* Section Distribusi Seri */}
                {!loading && spkDetail && spkDetail.detail && spkDetail.detail.length > 0 && (
                  <div className="hasil-cutting-form-section hasil-cutting-form-section-distribusi hasil-cutting-distribusi-section">
                    <div className="hasil-cutting-section-bar">
                      <h3 className="hasil-cutting-section-title">
                        Distribusi Seri
                      </h3>
                      <button onClick={handleTambahDistribusiSeri} className="hasil-cutting-section-action">
                        <i className="fas fa-plus"></i>
                        Tambah Seri
                      </button>
                    </div>

                    <div className="hasil-cutting-distribusi-panel">
                      {distribusiSeri.map((seri, index) => {
                        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                        const kodeSeri = spkDetail?.spk_cutting?.id_spk_cutting ? `${spkDetail.spk_cutting.id_spk_cutting}${alphabet[index]}` : `-${alphabet[index]}`;
                        const totalDetail = getTotalDetailDistribusi(index);
                        const jumlahProdukDistribusi = parseInt(seri.jumlah_produk) || 0;
                        const hasDetailData = seri.detail && seri.detail.length > 0 && seri.detail.some((d) => d.warna && d.jumlah_produk && parseInt(d.jumlah_produk) > 0);

                        return (
                          <div key={index} className="hasil-cutting-distribusi-card">
                            {/* Header Distribusi */}
                            <div className="hasil-cutting-distribusi-header">
                              <div className="hasil-cutting-distribusi-meta">
                                <span className="hasil-cutting-distribusi-index">#{index + 1}</span>
                                <span
                                  className="hasil-cutting-distribusi-code"
                                >
                                  {kodeSeri}
                                </span>
                                <div className="hasil-cutting-distribusi-jumlah-wrap">
                                  <div className={`hasil-cutting-cell-input-shell hasil-cutting-cell-input-shell-compact has-addon-right${hasDetailData ? " is-locked" : ""}`}>
                                    <input
                                      type="number"
                                      min="1"
                                      value={seri.jumlah_produk}
                                      onChange={(e) => handleUpdateDistribusiSeri(index, "jumlah_produk", e.target.value)}
                                      placeholder="Jumlah Produk"
                                      disabled={hasDetailData}
                                      className={`hasil-cutting-form-input hasil-cutting-input-erp hasil-cutting-input-erp-sm hasil-cutting-input-number hasil-cutting-input-jumlah-seri hasil-cutting-input-in-shell${hasDetailData ? " is-locked" : ""}`}
                                      title={hasDetailData ? "Jumlah produk otomatis terisi dari total detail warna" : ""}
                                    />
                                    <span className="hasil-cutting-cell-input-addon right">PCS</span>
                                  </div>
                                  {hasDetailData && (
                                    <i className="fas fa-info-circle hasil-cutting-distribusi-info-icon" title="Jumlah produk otomatis terisi dari total detail warna" />
                                  )}
                                </div>
                                {jumlahProdukDistribusi > 0 && (
                                  <span className={`hasil-cutting-distribusi-total ${totalDetail === jumlahProdukDistribusi ? "is-match" : "is-mismatch"}`}>
                                    {hasDetailData ? (
                                      <span>
                                        <i className="fas fa-sync-alt hasil-cutting-sync-icon"></i>
                                        Total Detail: {totalDetail.toLocaleString("id-ID")}
                                      </span>
                                    ) : (
                                      <span>
                                        Total Detail: {totalDetail.toLocaleString("id-ID")} / {jumlahProdukDistribusi.toLocaleString("id-ID")}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                              <div className="hasil-cutting-distribusi-actions">
                                <button
                                  onClick={() => handleTambahDetailDistribusi(index)}
                                  className="hasil-cutting-distribusi-btn hasil-cutting-distribusi-btn-add"
                                >
                                  <i className="fas fa-plus"></i>
                                  Tambah Warna
                                </button>
                                <button
                                  onClick={() => handleHapusDistribusiSeri(index)}
                                  disabled={distribusiSeri.length === 1}
                                  className={`hasil-cutting-distribusi-btn hasil-cutting-distribusi-btn-remove${distribusiSeri.length === 1 ? " is-disabled" : ""}`}
                                >
                                  <i className="fas fa-trash"></i>
                                  Hapus Seri
                                </button>
                              </div>
                            </div>

                            {/* Tabel Detail Warna */}
                            {seri.detail && seri.detail.length > 0 ? (
                              <div className="hasil-cutting-table-wrap">
                                <table className="penjahit-table hasil-cutting-distribusi-detail-table">
                                  <thead>
                                    <tr>
                                      <th>NO</th>
                                      <th>WARNA</th>
                                      <th>JUMLAH PRODUK</th>
                                      <th>AKSI</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {seri.detail.map((detail, detailIndex) => (
                                      <tr key={detailIndex}>
                                        <td className="hasil-cutting-distribusi-row-no">{detailIndex + 1}</td>
                                      <td>
                                        <div className="hasil-cutting-cell-input-shell">
                                          <select
                                            value={detail.warna || ""}
                                            onChange={(e) => handleUpdateDetailDistribusi(index, detailIndex, "warna", e.target.value)}
                                            className="modern-input hasil-cutting-input-erp hasil-cutting-input-erp-sm hasil-cutting-select-erp hasil-cutting-input-in-shell"
                                          >
                                            <option value="">-- Pilih Warna --</option>
                                            {getWarnaList().map((warna) => (
                                              <option key={warna} value={warna}>
                                                {warna}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </td>
                                      <td>
                                        <div className="hasil-cutting-cell-input-shell has-addon-right">
                                          <input
                                            type="number"
                                            min="1"
                                            value={detail.jumlah_produk || ""}
                                            onChange={(e) => handleUpdateDetailDistribusi(index, detailIndex, "jumlah_produk", e.target.value)}
                                            placeholder="0"
                                            className="hasil-cutting-form-input hasil-cutting-input-erp hasil-cutting-input-erp-sm hasil-cutting-input-number hasil-cutting-input-jumlah-seri hasil-cutting-input-in-shell"
                                          />
                                          <span className="hasil-cutting-cell-input-addon right">PCS</span>
                                        </div>
                                      </td>
                                      <td>
                                        <div className="hasil-cutting-distribusi-row-actions">
                                          <div className="hasil-cutting-cell-input-shell">
                                            <select
                                              value={detail.produk_sku_id || ""}
                                              onChange={(e) => handleUpdateDetailDistribusi(index, detailIndex, "produk_sku_id", e.target.value)}
                                              className="modern-input hasil-cutting-input-erp hasil-cutting-input-erp-sm hasil-cutting-select-erp hasil-cutting-input-sku hasil-cutting-input-in-shell"
                                            >
                                              <option value="">-- Pilih SKU --</option>
                                              {spkDetail?.skus && spkDetail.skus.length > 0 ? (
                                                spkDetail.skus.map((sku) => {
                                                  const namaProduk = (sku.nama_produk || "").toUpperCase();
                                                  const warna = (sku.warna || "").toUpperCase();
                                                  const ukuran = (sku.ukuran || "").toUpperCase();
                                                  const displayText = `${namaProduk} - ${warna} ${ukuran}`.trim();
                                                  return (
                                                    <option key={sku.id} value={sku.id}>
                                                      {displayText}
                                                    </option>
                                                  );
                                                })
                                              ) : (
                                                <option value="" disabled>Tidak ada SKU</option>
                                              )}
                                            </select>
                                          </div>
                                          <button
                                            onClick={() => handleHapusDetailDistribusi(index, detailIndex)}
                                            className="hasil-cutting-distribusi-btn hasil-cutting-distribusi-btn-remove"
                                          >
                                            <i className="fas fa-trash"></i>
                                            Hapus
                                          </button>
                                        </div>
                                      </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="hasil-cutting-distribusi-empty">
                                <p className="hasil-cutting-distribusi-empty-text">Belum ada detail warna. Klik "Tambah Warna" untuk menambahkan.</p>
                              </div>
                            )}

                            {/* Warning jika total detail tidak sama dengan jumlah produk */}
                            {hasDetailData && jumlahProdukDistribusi > 0 && totalDetail !== jumlahProdukDistribusi && (
                              <div className="hasil-cutting-inline-alert warning">
                                <i className="fas fa-exclamation-triangle"></i>
                                <span>
                                  Total detail ({totalDetail.toLocaleString("id-ID")}) harus sama dengan jumlah produk ({jumlahProdukDistribusi.toLocaleString("id-ID")})
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Summary Total */}
                      <div className="hasil-cutting-distribusi-summary">
                        <div className="hasil-cutting-distribusi-summary-label">Total Distribusi:</div>
                        <div className={`hasil-cutting-distribusi-summary-value ${getTotalDistribusiSeri() === getTotalKeseluruhan() ? "is-match" : "is-mismatch"}`}>
                          {getTotalDistribusiSeri().toLocaleString("id-ID")}
                        </div>
                      </div>
                      <div className="hasil-cutting-distribusi-summary primary">
                        <div className="hasil-cutting-distribusi-summary-label">Total Produk:</div>
                        <div className="hasil-cutting-distribusi-summary-value">
                          {getTotalKeseluruhan().toLocaleString("id-ID")}
                        </div>
                      </div>

                      {(() => {
                        const totalDistribusi = getTotalDistribusiSeri();
                        const totalProduk = getTotalKeseluruhan();
                        const hasDistribusiData = distribusiSeri.some((item) => item.jumlah_produk && parseInt(item.jumlah_produk) > 0);

                        // Hanya tampilkan warning jika user mengisi distribusi seri dan total tidak sama
                        if (hasDistribusiData && totalDistribusi !== totalProduk) {
                          return (
                            <div className="hasil-cutting-inline-alert warning">
                              <i className="fas fa-exclamation-triangle"></i>
                              <span>
                                Total distribusi ({totalDistribusi.toLocaleString("id-ID")}) harus sama dengan total produk ({totalProduk.toLocaleString("id-ID")})
                              </span>
                            </div>
                          );
                        }
                        // Jika tidak ada distribusi seri yang diisi, tampilkan info bahwa distribusi seri opsional
                        if (!hasDistribusiData) {
                          return (
                            <div className="hasil-cutting-inline-alert info">
                              <i className="fas fa-info-circle"></i>
                              <span>Distribusi seri bersifat opsional. Jika tidak diisi, sistem akan otomatis membuat 1 seri dengan total produk ({getTotalKeseluruhan().toLocaleString("id-ID")}).</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
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
          <div className="hasil-cutting-modal-overlay" onClick={() => setDetailData(null)}>
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
                          <th>Jumlah Produk</th>
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
                              <td className="hasil-cutting-detail-cell-medium">{bahan.jumlah_produk || 0}</td>
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
                              <strong>{detailData.bahan.reduce((sum, bahan) => sum + (parseFloat(bahan.total_produk || bahan.hasil) || 0), 0).toLocaleString("id-ID")}</strong>
                            </td>
                            <td className="hasil-cutting-detail-total-value">
                              <strong>{detailData.bahan.reduce((sum, bahan) => sum + (parseFloat(bahan.berat_per_produk) || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</strong>
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

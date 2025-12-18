import React, { useState, useEffect } from "react";
import "./SpkCuting.css";
import "./HasilCutting.css";
import API from "../../../api";

const HasilCutting = () => {
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
  // Filter periode untuk card target
  const [weeklyStart, setWeeklyStart] = useState("");
  const [weeklyEnd, setWeeklyEnd] = useState("");
  const [dailyDate, setDailyDate] = useState("");
  // State untuk search SPK Cutting
  const [searchSpkQuery, setSearchSpkQuery] = useState("");
  const [showSpkDropdown, setShowSpkDropdown] = useState(false);
  // State untuk distribusi seri
  const [distribusiSeri, setDistribusiSeri] = useState([{ jumlah_produk: "" }]);

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

  // Fetch data hasil cutting untuk index
  useEffect(() => {
    const fetchDataHasilCutting = async () => {
      if (showForm) return; // Jangan fetch jika sedang di form

      setLoadingData(true);
      try {
        const response = await API.get("/hasil_cutting", {
          params: {
            page: currentPage,
            weekly_start: weeklyStart || undefined,
            weekly_end: weeklyEnd || undefined,
            daily_date: dailyDate || undefined,
          },
        });
        if (response.data) {
          if (response.data.data) {
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
  }, [currentPage, showForm, weeklyStart, weeklyEnd, dailyDate]);

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
            setDistribusiSeri([{ jumlah_produk: "" }]);
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
          alert("SPK Cutting tidak ditemukan. Pastikan SPK Cutting yang dipilih sudah terdaftar di sistem.");
        } else if (error.response?.status === 500) {
          alert("Terjadi kesalahan di server. Silakan cek log atau hubungi administrator.");
        } else if (error.response?.data?.message) {
          alert(`Error: ${error.response.data.message}`);
        } else {
          alert("Gagal mengambil data SPK Cutting. Pastikan koneksi internet Anda stabil.");
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
      alert("Pilih SPK Cutting terlebih dahulu");
      return;
    }

    // Validasi: pastikan semua data hasil sudah diisi
    const hasEmptyData = spkDetail.detail.some((item) => {
      const bahanId = item.spk_cutting_bahan_id;
      const data = inputData[bahanId] || {};
      return !data.jumlahLembar || !data.jumlahProduk || parseFloat(data.jumlahLembar) <= 0 || parseFloat(data.jumlahProduk) <= 0;
    });

    if (hasEmptyData) {
      alert("Mohon lengkapi semua data jumlah lembar dan jumlah produk");
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
        alert("Mohon lengkapi semua data distribusi seri yang sudah diisi");
        return;
      }

      if (totalDistribusi !== totalProduk) {
        alert(`Total distribusi seri (${totalDistribusi.toLocaleString("id-ID")}) harus sama dengan total produk (${totalProduk.toLocaleString("id-ID")})`);
        return;
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
      // - Jika user mengisi distribusi seri, kirim array dengan data
      // - Jika tidak diisi, kirim null (backend akan membuat implicit single series)
      const hasDistribusiData = distribusiSeri.some((item) => item.jumlah_produk && parseInt(item.jumlah_produk) > 0);
      const formattedDistribusiSeri = hasDistribusiData
        ? distribusiSeri
            .filter((item) => item.jumlah_produk && parseInt(item.jumlah_produk) > 0)
            .map((item) => ({
              jumlah_produk: parseInt(item.jumlah_produk) || 0,
            }))
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

      alert(editingId ? "Data berhasil diupdate!" : "Data berhasil disimpan!");
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
        const refreshResponse = await API.get("/hasil_cutting", {
          params: { page: 1 },
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

      alert(errorMessage);
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

      // Reset distribusi seri saat edit (default 1 item kosong)
      // TODO: Load distribusi seri yang sudah ada dari backend jika diperlukan
      setDistribusiSeri([{ jumlah_produk: "" }]);

      // Fetch detail SPK untuk form
      const spkResponse = await API.get(`/hasil_cutting/detail-spk`, {
        params: { spk_cutting_id: data.spk_cutting_id },
      });
      setSpkDetail(spkResponse.data);
      setShowForm(true);
    } catch (error) {
      console.error("Gagal mengambil data untuk edit:", error);
      alert("Gagal mengambil data untuk edit");
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk delete
  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      return;
    }

    try {
      await API.delete(`/hasil_cutting/${id}`);
      alert("Data berhasil dihapus!");
      // Refresh data setelah hapus
      setCurrentPage(1);
      // Force refresh
      const response = await API.get("/hasil_cutting", {
        params: { page: 1, per_page: 7 },
      });
      if (response.data.data) {
        setDataHasilCutting(response.data.data || []);
        setCurrentPage(response.data.current_page || 1);
        setLastPage(response.data.last_page || 1);
      }
    } catch (error) {
      console.error("Gagal menghapus data:", error);
      alert(error.response?.data?.message || "Gagal menghapus data");
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
      alert("Gagal mengambil detail data");
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
    setDistribusiSeri([...distribusiSeri, { jumlah_produk: "" }]);
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
        <div>
          <h1 className="hasil-cutting-header-title">📊 Data Hasil Cutting</h1>
          <p className="hasil-cutting-header-subtitle">Kelola hasil cutting dengan mudah dan efisien</p>
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
          <div className="hasil-cutting-target-card-icon">🎯</div>
          <div className="hasil-cutting-target-card-content">
            <div className="hasil-cutting-target-card-label">Target Mingguan</div>
            {/* Filter periode mingguan (custom) */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px", marginTop: "4px" }}>
              <input type="date" value={weeklyStart} onChange={(e) => setWeeklyStart(e.target.value)} className="hasil-cutting-form-input" style={{ maxWidth: "150px", padding: "6px 10px", fontSize: "12px" }} />
              <span style={{ fontSize: "12px", alignSelf: "center", color: "#854d0e" }}>s/d</span>
              <input type="date" value={weeklyEnd} onChange={(e) => setWeeklyEnd(e.target.value)} className="hasil-cutting-form-input" style={{ maxWidth: "150px", padding: "6px 10px", fontSize: "12px" }} />
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
                <span className="hasil-cutting-target-card-status-achieved">Target mingguan tercapai 🎉</span>
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
          <div className="hasil-cutting-target-card-icon daily">📈</div>
          <div className="hasil-cutting-target-card-content">
            <div className="hasil-cutting-target-card-label daily">Target Harian</div>
            {/* Filter tanggal harian (custom) */}
            <div style={{ marginBottom: "8px", marginTop: "4px" }}>
              <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} className="hasil-cutting-form-input" style={{ maxWidth: "180px", padding: "6px 10px", fontSize: "12px" }} />
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
                <span className="hasil-cutting-target-card-status-achieved">Target harian tercapai 💪</span>
              )}
            </div>
            {targetStats.today && <div className="hasil-cutting-target-card-period daily">Tanggal: {targetStats.today}</div>}
          </div>
        </div>
      </div>

      <div className="hasil-cutting-table-card">
        {/* Tabel Index */}
        <div>
          {loadingData ? (
            <div className="hasil-cutting-loading-container">
              <div className="hasil-cutting-loading-spinner"></div>
              <p className="hasil-cutting-loading-text">Memuat data...</p>
            </div>
          ) : dataHasilCutting.length > 0 ? (
            <>
              <table className="penjahit-table">
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
              <div className="hasil-cutting-empty-state-icon">📋</div>
              <h3 className="hasil-cutting-empty-state-title">Belum Ada Data</h3>
              <p className="hasil-cutting-empty-state-text">Mulai dengan menambahkan hasil cutting pertama Anda</p>
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
            <div className="hasil-cutting-modal-content" onClick={(e) => e.stopPropagation()}>
              {/* Header Modal */}
              <div className="hasil-cutting-modal-header" style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <h2 className="hasil-cutting-modal-title">{editingId ? "✏️ Edit Hasil Cutting" : "➕ Tambah Hasil Cutting"}</h2>
                <button
                  onClick={handleBatal}
                  className="hasil-cutting-modal-close-button"
                  style={{ fontSize: "20px", fontWeight: "bold" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                    e.currentTarget.style.transform = "rotate(90deg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                    e.currentTarget.style.transform = "rotate(0deg)";
                  }}
                >
                  ×
                </button>
              </div>

              {/* Content Modal */}
              <div className="hasil-cutting-modal-body">
                {/* Data sebelum diedit (hanya tampil saat mode edit) */}
                {editingId && originalData && (
                  <div
                    style={{
                      marginBottom: "20px",
                      padding: "16px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #f5f7ff 0%, #eef2ff 100%)",
                      border: "1px solid #dce2ff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <span style={{ fontSize: "18px" }}>📋</span>
                      <div>
                        <div style={{ fontWeight: "700", color: "#3b4783" }}>Data sebelum diedit</div>
                        <div style={{ fontSize: "12px", color: "#6c7187" }}>Referensi nilai asli sebelum Anda melakukan perubahan</div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "12px",
                        marginTop: "8px",
                      }}
                    >
                      <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>SPK Cutting</div>
                        <div style={{ fontWeight: "700", color: "#111827" }}>{originalData.spk_cutting_id || "-"}</div>
                      </div>
                      <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Produk</div>
                        <div style={{ fontWeight: "700", color: "#111827" }}>{originalData.totalProduk?.toLocaleString("id-ID") || "0"}</div>
                      </div>
                      <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Berat</div>
                        <div style={{ fontWeight: "700", color: "#111827" }}>{originalData.totalBerat?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0,00"} kg</div>
                      </div>
                      <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Berat per Produk</div>
                        <div style={{ fontWeight: "700", color: "#111827" }}>{originalData.totalBeratPerProduk?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0,00"} kg</div>
                      </div>
                      {originalData.catatan && (
                        <div style={{ gridColumn: "1 / -1", background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>Catatan</div>
                          <div style={{ fontWeight: "600", color: "#374151" }}>{originalData.catatan}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="filter-header1">
                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "12px",
                        fontWeight: "600",
                        fontSize: "14px",
                        color: "#333",
                      }}
                    >
                      🔍 Cari SPK Cutting:
                    </label>
                    <div style={{ position: "relative" }}>
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
                      <i
                        className="fas fa-search"
                        style={{
                          position: "absolute",
                          right: "16px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#667eea",
                          fontSize: "16px",
                          pointerEvents: "none",
                        }}
                      ></i>

                      {/* Dropdown hasil pencarian */}
                      {showSpkDropdown && searchSpkQuery && filteredSpkCutting.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            marginTop: "4px",
                            background: "white",
                            borderRadius: "12px",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                            maxHeight: "300px",
                            overflowY: "auto",
                            zIndex: 1000,
                            border: "1px solid #e0e0e0",
                          }}
                        >
                          {filteredSpkCutting.map((spk) => (
                            <div
                              key={spk.id}
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur event
                                handleSelectSpk(spk.id, spk.id_spk_cutting, spk.produk?.nama_produk || "N/A");
                              }}
                              style={{
                                padding: "12px 16px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                borderBottom: "1px solid #f0f0f0",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "white";
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <i className="fas fa-tag" style={{ color: "#667eea", fontSize: "14px" }}></i>
                                <div>
                                  <div style={{ fontWeight: "600", color: "#333", fontSize: "14px" }}>{spk.id_spk_cutting}</div>
                                  <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>{spk.produk?.nama_produk || "N/A"}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Pesan jika tidak ada hasil */}
                      {showSpkDropdown && searchSpkQuery && filteredSpkCutting.length === 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            marginTop: "4px",
                            background: "white",
                            borderRadius: "12px",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                            padding: "20px",
                            textAlign: "center",
                            zIndex: 1000,
                            border: "1px solid #e0e0e0",
                          }}
                        >
                          <i className="fas fa-search" style={{ fontSize: "24px", color: "#999", marginBottom: "8px" }}></i>
                          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Tidak ada SPK Cutting yang ditemukan</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabel Data Acuan - Selalu tampil */}
                <div style={{ marginBottom: "32px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                      padding: "16px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      borderRadius: "12px",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "white",
                      }}
                    >
                      📊 Data Acuan
                    </h3>
                    <button
                      onClick={handleTambahAcuan}
                      style={{
                        padding: "10px 20px",
                        background: "rgba(255, 255, 255, 0.2)",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        transition: "all 0.3s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <i className="fas fa-plus"></i>
                      Tambah Data Acuan
                    </button>
                  </div>

                  {dataAcuan.length > 0 ? (
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
                                <select
                                  value={acuan.warna}
                                  onChange={(e) => handleAcuanChange(acuan.id, "warna", e.target.value)}
                                  className="modern-input"
                                  style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "14px",
                                    border: "2px solid #e0e0e0",
                                    borderRadius: "8px",
                                    transition: "all 0.3s ease",
                                  }}
                                >
                                  <option value="">-- Pilih Warna --</option>
                                  {getWarnaList().map((warna) => (
                                    <option key={warna} value={warna}>
                                      {warna}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={acuan.berat_acuan || ""}
                                  onChange={(e) => handleAcuanChange(acuan.id, "berat_acuan", e.target.value)}
                                  placeholder="0.00"
                                  className="modern-input"
                                  style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "14px",
                                    border: "2px solid #e0e0e0",
                                    borderRadius: "8px",
                                    textAlign: "center",
                                    transition: "all 0.3s ease",
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  value={acuan.banyak_produk || ""}
                                  onChange={(e) => handleAcuanChange(acuan.id, "banyak_produk", e.target.value)}
                                  placeholder="0"
                                  className="modern-input"
                                  style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "14px",
                                    border: "2px solid #e0e0e0",
                                    borderRadius: "8px",
                                    textAlign: "center",
                                    transition: "all 0.3s ease",
                                  }}
                                />
                              </td>
                              <td>
                                <div
                                  style={{
                                    padding: "10px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    textAlign: "center",
                                    background: "linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)",
                                    borderRadius: "8px",
                                    color: "#155724",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                  }}
                                >
                                  {beratAcuanPerProduk > 0 ? `${beratAcuanPerProduk.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : "-"}
                                </div>
                              </td>
                              <td>
                                <button
                                  onClick={() => handleHapusAcuan(acuan.id)}
                                  style={{
                                    padding: "8px 16px",
                                    background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    transition: "all 0.3s ease",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "scale(1.05)";
                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 53, 69, 0.4)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "scale(1)";
                                    e.currentTarget.style.boxShadow = "none";
                                  }}
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
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                        borderRadius: "12px",
                        border: "2px dashed #667eea",
                      }}
                    >
                      <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
                      <p style={{ margin: 0, color: "#667eea", fontSize: "16px", fontWeight: "600" }}>Belum ada data acuan</p>
                      <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: "14px" }}>Klik "Tambah Data Acuan" untuk menambahkan data acuan</p>
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
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "24px",
                      padding: "16px",
                      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                      borderRadius: "12px",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#333",
                      }}
                    >
                      📦 Detail SPK Cutting: {spkDetail?.spk_cutting?.id_spk_cutting ? `${spkDetail.spk_cutting.id_spk_cutting} - ${spkDetail.spk_cutting.nama_produk}` : "Belum dipilih"}
                    </h3>
                    {spkDetail && spkDetail.detail && spkDetail.detail.length > 0 && (
                      <button
                        onClick={handleSimpan}
                        disabled={saving}
                        style={{
                          padding: "12px 32px",
                          background: saving ? "linear-gradient(135deg, #6c757d 0%, #5a6268 100%)" : "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                          color: "white",
                          border: "none",
                          borderRadius: "10px",
                          cursor: saving ? "not-allowed" : "pointer",
                          fontSize: "14px",
                          fontWeight: "600",
                          transition: "all 0.3s ease",
                          boxShadow: saving ? "none" : "0 4px 15px rgba(40, 167, 69, 0.4)",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                        onMouseEnter={(e) => {
                          if (!saving) {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 6px 20px rgba(40, 167, 69, 0.5)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!saving) {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 4px 15px rgba(40, 167, 69, 0.4)";
                          }
                        }}
                      >
                        {saving ? (
                          <>
                            <div
                              style={{
                                width: "14px",
                                height: "14px",
                                border: "2px solid rgba(255,255,255,0.3)",
                                borderTop: "2px solid white",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                              }}
                            ></div>
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save"></i>
                            Simpan Data
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <table className="penjahit-table">
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
                                  className="modern-input"
                                  style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "14px",
                                    border: "2px solid #e0e0e0",
                                    borderRadius: "8px",
                                    textAlign: "center",
                                    transition: "all 0.3s ease",
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  value={currentData.jumlahProduk || ""}
                                  onChange={(e) => handleInputChange(bahanId, "jumlahProduk", e.target.value)}
                                  placeholder="0"
                                  className="modern-input"
                                  style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "14px",
                                    border: "2px solid #e0e0e0",
                                    borderRadius: "8px",
                                    textAlign: "center",
                                    transition: "all 0.3s ease",
                                  }}
                                />
                              </td>
                              <td>
                                <div
                                  style={{
                                    padding: "10px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    textAlign: "center",
                                    background: "linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)",
                                    borderRadius: "8px",
                                    color: "#495057",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                  }}
                                >
                                  {totalProduk > 0 ? totalProduk.toLocaleString("id-ID") : "0"}
                                </div>
                              </td>
                              <td>
                                <div
                                  style={{
                                    padding: "10px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    textAlign: "center",
                                    background: "linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)",
                                    borderRadius: "8px",
                                    color: "#155724",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                  }}
                                >
                                  {beratPerProduk > 0 ? `${beratPerProduk.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : "-"}
                                </div>
                              </td>
                              <td>
                                {statusPerbandingan ? (
                                  <span
                                    style={{
                                      padding: "8px 12px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      borderRadius: "8px",
                                      display: "inline-block",
                                      background:
                                        statusPerbandingan === "lebih berat dari acuan"
                                          ? "linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)"
                                          : statusPerbandingan === "lebih ringan dari acuan"
                                          ? "linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)"
                                          : "linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)",
                                      color: statusPerbandingan === "lebih berat dari acuan" ? "#721c24" : statusPerbandingan === "lebih ringan dari acuan" ? "#856404" : "#0c5460",
                                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                    }}
                                  >
                                    {(() => {
                                      const status = typeof statusPerbandingan === "object" ? statusPerbandingan.status : statusPerbandingan;
                                      const selisih = typeof statusPerbandingan === "object" ? statusPerbandingan.selisih : 0;

                                      if (status === "lebih berat dari acuan") {
                                        return `⚠️ ${status} ${selisih > 0 ? selisih.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kg" : ""}`;
                                      } else if (status === "lebih ringan dari acuan") {
                                        return `📉 ${status} ${selisih > 0 ? selisih.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kg" : ""}`;
                                      } else {
                                        return `✅ ${status}`;
                                      }
                                    })()}
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      padding: "8px 12px",
                                      fontSize: "12px",
                                      color: "#999",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    -
                                  </span>
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
                                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
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
                                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
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
                        <tr
                          style={{
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            fontWeight: "bold",
                            color: "white",
                          }}
                        >
                          <td colSpan="9" style={{ textAlign: "right", padding: "16px", fontSize: "16px" }}>
                            Total Keseluruhan:
                          </td>
                          <td
                            style={{
                              textAlign: "center",
                              padding: "16px",
                              fontSize: "18px",
                              fontWeight: "700",
                              color: "white",
                            }}
                          >
                            {getTotalKeseluruhan().toLocaleString("id-ID")}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Section Distribusi Seri */}
                {!loading && spkDetail && spkDetail.detail && spkDetail.detail.length > 0 && (
                  <div style={{ marginTop: "32px", marginBottom: "24px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "16px",
                        padding: "16px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        borderRadius: "12px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: "600",
                          color: "white",
                        }}
                      >
                        📦 Distribusi Seri
                      </h3>
                      <button
                        onClick={handleTambahDistribusiSeri}
                        style={{
                          padding: "8px 16px",
                          background: "rgba(255, 255, 255, 0.2)",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "600",
                          transition: "all 0.3s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <i className="fas fa-plus"></i>
                        Tambah Seri
                      </button>
                    </div>

                    <div style={{ background: "white", borderRadius: "12px", padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                      <table className="penjahit-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>NO</th>
                            <th>KODE SERI</th>
                            <th>JUMLAH PRODUK</th>
                            <th>AKSI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {distribusiSeri.map((seri, index) => {
                            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                            const kodeSeri = spkDetail?.spk_cutting?.id_spk_cutting ? `${spkDetail.spk_cutting.id_spk_cutting}${alphabet[index]}` : `-${alphabet[index]}`;

                            return (
                              <tr key={index}>
                                <td style={{ fontWeight: "600", color: "#667eea" }}>{index + 1}</td>
                                <td>
                                  <span
                                    style={{
                                      padding: "6px 12px",
                                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                      color: "white",
                                      borderRadius: "8px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      display: "inline-block",
                                    }}
                                  >
                                    {kodeSeri}
                                  </span>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="1"
                                    value={seri.jumlah_produk}
                                    onChange={(e) => handleUpdateDistribusiSeri(index, "jumlah_produk", e.target.value)}
                                    placeholder="0"
                                    className="hasil-cutting-form-input"
                                    style={{
                                      maxWidth: "150px",
                                      padding: "8px 12px",
                                      fontSize: "14px",
                                      textAlign: "center",
                                    }}
                                  />
                                </td>
                                <td>
                                  <button
                                    onClick={() => handleHapusDistribusiSeri(index)}
                                    disabled={distribusiSeri.length === 1}
                                    style={{
                                      padding: "6px 12px",
                                      background: distribusiSeri.length === 1 ? "linear-gradient(135deg, #6c757d 0%, #5a6268 100%)" : "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "8px",
                                      cursor: distribusiSeri.length === 1 ? "not-allowed" : "pointer",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      transition: "all 0.3s ease",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                    onMouseEnter={(e) => {
                                      if (distribusiSeri.length > 1) {
                                        e.currentTarget.style.transform = "scale(1.05)";
                                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 53, 69, 0.4)";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (distribusiSeri.length > 1) {
                                        e.currentTarget.style.transform = "scale(1)";
                                        e.currentTarget.style.boxShadow = "none";
                                      }
                                    }}
                                  >
                                    <i className="fas fa-trash"></i>
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr
                            style={{
                              background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                              fontWeight: "bold",
                            }}
                          >
                            <td colSpan="2" style={{ textAlign: "right", padding: "12px", fontSize: "14px" }}>
                              Total Distribusi:
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                padding: "12px",
                                fontSize: "16px",
                                fontWeight: "700",
                                color: getTotalDistribusiSeri() === getTotalKeseluruhan() ? "#28a745" : "#dc3545",
                              }}
                            >
                              {getTotalDistribusiSeri().toLocaleString("id-ID")}
                            </td>
                            <td></td>
                          </tr>
                          <tr
                            style={{
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              fontWeight: "bold",
                              color: "white",
                            }}
                          >
                            <td colSpan="2" style={{ textAlign: "right", padding: "12px", fontSize: "14px" }}>
                              Total Produk:
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                padding: "12px",
                                fontSize: "16px",
                                fontWeight: "700",
                                color: "white",
                              }}
                            >
                              {getTotalKeseluruhan().toLocaleString("id-ID")}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>

                      {(() => {
                        const totalDistribusi = getTotalDistribusiSeri();
                        const totalProduk = getTotalKeseluruhan();
                        const hasDistribusiData = distribusiSeri.some((item) => item.jumlah_produk && parseInt(item.jumlah_produk) > 0);

                        // Hanya tampilkan warning jika user mengisi distribusi seri dan total tidak sama
                        if (hasDistribusiData && totalDistribusi !== totalProduk) {
                          return (
                            <div
                              style={{
                                marginTop: "12px",
                                padding: "12px",
                                background: "linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)",
                                borderRadius: "8px",
                                border: "1px solid #ffc107",
                                fontSize: "13px",
                                color: "#856404",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
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
                            <div
                              style={{
                                marginTop: "12px",
                                padding: "12px",
                                background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                                borderRadius: "8px",
                                border: "1px solid #2196f3",
                                fontSize: "13px",
                                color: "#1565c0",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
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
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      background: "linear-gradient(135deg, #fee 0%, #fdd 100%)",
                      borderRadius: "12px",
                      border: "2px solid #fcc",
                      margin: "20px 0",
                    }}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
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
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      background: "linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)",
                      borderRadius: "12px",
                      border: "2px solid #ffc107",
                      margin: "20px 0",
                    }}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>ℹ️</div>
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
              </div>
            </div>
          </div>
        )}

        {/* Modal Detail */}
        {detailData && (
          <div className="hasil-cutting-modal-overlay" onClick={() => setDetailData(null)}>
            <div className="hasil-cutting-modal-content detail" onClick={(e) => e.stopPropagation()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                  padding: "24px 32px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  borderRadius: "20px 20px 0 0",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700" }}>📋 Detail Hasil Cutting</h2>
                <button
                  onClick={() => setDetailData(null)}
                  style={{
                    padding: "8px 14px",
                    background: "rgba(255, 255, 255, 0.2)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <i className="fas fa-times"></i>
                  Tutup
                </button>
              </div>

              <div style={{ padding: "32px" }}>
                <div
                  style={{
                    marginBottom: "32px",
                    padding: "24px",
                    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                    borderRadius: "16px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                      gap: "20px",
                    }}
                  >
                    <div
                      style={{
                        padding: "20px",
                        background: "white",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <i className="fas fa-tag" style={{ color: "#667eea", fontSize: "18px" }}></i>
                        <p style={{ margin: 0, fontSize: "12px", color: "#666", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>SPK Cutting</p>
                      </div>
                      <p style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#333" }}>{detailData.id_spk_cutting}</p>
                    </div>
                    <div
                      style={{
                        padding: "20px",
                        background: "white",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <i className="fas fa-box" style={{ color: "#667eea", fontSize: "18px" }}></i>
                        <p style={{ margin: 0, fontSize: "12px", color: "#666", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>Produk</p>
                      </div>
                      <p style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#333" }}>{detailData.nama_produk}</p>
                    </div>
                    <div
                      style={{
                        padding: "20px",
                        background: "white",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <i className="far fa-calendar-alt" style={{ color: "#667eea", fontSize: "18px" }}></i>
                        <p style={{ margin: 0, fontSize: "12px", color: "#666", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tanggal</p>
                      </div>
                      <p style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#333" }}>
                        {new Date(detailData.created_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div
                      style={{
                        padding: "20px",
                        background: "white",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <i className="fas fa-money-bill-wave" style={{ color: "#667eea", fontSize: "18px" }}></i>
                        <p style={{ margin: 0, fontSize: "12px", color: "#666", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Bayar</p>
                      </div>
                      <p style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#667eea" }}>
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
                  <div style={{ marginBottom: "32px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "20px",
                        padding: "16px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        borderRadius: "12px",
                      }}
                    >
                      <i className="fas fa-clipboard-list" style={{ color: "white", fontSize: "20px" }}></i>
                      <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "white" }}>📊 Data Acuan</h3>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table className="penjahit-table">
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
                                <span
                                  style={{
                                    padding: "6px 12px",
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "white",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    display: "inline-block",
                                  }}
                                >
                                  {acuan.warna}
                                </span>
                              </td>
                              <td style={{ fontWeight: "600", color: "#333" }}>{acuan.berat_acuan?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                              <td>
                                <span
                                  style={{
                                    padding: "6px 12px",
                                    background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                                    color: "white",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    display: "inline-block",
                                  }}
                                >
                                  {acuan.banyak_produk}
                                </span>
                              </td>
                              <td>
                                <span
                                  style={{
                                    padding: "6px 12px",
                                    background: "linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)",
                                    color: "#155724",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    display: "inline-block",
                                  }}
                                >
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
                  <div style={{ marginBottom: "32px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "20px",
                        padding: "16px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        borderRadius: "12px",
                      }}
                    >
                      <i className="fas fa-boxes" style={{ color: "white", fontSize: "20px" }}></i>
                      <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "white" }}>📦 Distribusi Seri</h3>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table className="penjahit-table">
                        <thead>
                          <tr>
                            <th>NO</th>
                            <th>KODE SERI</th>
                            <th>JUMLAH PRODUK</th>
                            <th>STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.distribusi_seri.map((distribusi, idx) => (
                            <tr key={distribusi.id || idx}>
                              <td style={{ fontWeight: "600", color: "#667eea" }}>{idx + 1}</td>
                              <td>
                                <span
                                  style={{
                                    padding: "6px 12px",
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "white",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    display: "inline-block",
                                  }}
                                >
                                  {distribusi.kode_seri}
                                </span>
                              </td>
                              <td>
                                <span
                                  style={{
                                    padding: "6px 12px",
                                    background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                                    color: "white",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    display: "inline-block",
                                  }}
                                >
                                  {distribusi.jumlah_produk?.toLocaleString("id-ID")}
                                </span>
                              </td>
                              <td>
                                <span
                                  style={{
                                    padding: "6px 12px",
                                    background:
                                      distribusi.status === "draft"
                                        ? "linear-gradient(135deg, #ffc107 0%, #ff9800 100%)"
                                        : distribusi.status === "completed"
                                        ? "linear-gradient(135deg, #28a745 0%, #20c997 100%)"
                                        : "linear-gradient(135deg, #6c757d 0%, #5a6268 100%)",
                                    color: "white",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    display: "inline-block",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {distribusi.status || "draft"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr
                            style={{
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              fontWeight: "bold",
                              color: "white",
                            }}
                          >
                            <td colSpan="2" style={{ textAlign: "right", padding: "12px", fontSize: "14px" }}>
                              Total Distribusi:
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                padding: "12px",
                                fontSize: "16px",
                                fontWeight: "700",
                                color: "white",
                              }}
                            >
                              {detailData.distribusi_seri.reduce((sum, d) => sum + (parseInt(d.jumlah_produk) || 0), 0).toLocaleString("id-ID")}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "20px",
                      padding: "16px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      borderRadius: "12px",
                    }}
                  >
                    <i className="fas fa-list-alt" style={{ color: "white", fontSize: "20px" }}></i>
                    <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "white" }}>📦 Data Hasil</h3>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="penjahit-table">
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
                          const statusPerbandingan = statusPerbandinganAgregat.find((s) => s.warna === bahan.warna)?.status || null;

                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: "600", color: "#333" }}>{bahan.nama_bagian || "-"}</td>
                              <td style={{ fontWeight: "500", color: "#555" }}>{bahan.nama_bahan || "-"}</td>
                              <td>
                                {bahan.warna ? (
                                  <span
                                    style={{
                                      padding: "6px 12px",
                                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                      color: "white",
                                      borderRadius: "8px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      display: "inline-block",
                                    }}
                                  >
                                    {bahan.warna}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td style={{ fontWeight: "600", color: "#333" }}>{bahan.berat?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                              <td>
                                {bahan.qty ? (
                                  <span
                                    style={{
                                      padding: "6px 12px",
                                      background: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)",
                                      color: "white",
                                      borderRadius: "8px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      display: "inline-block",
                                    }}
                                  >
                                    {bahan.qty}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td style={{ fontWeight: "500", color: "#666" }}>{bahan.jumlah_lembar || 0}</td>
                              <td style={{ fontWeight: "500", color: "#666" }}>{bahan.jumlah_produk || 0}</td>
                              <td>
                                <span
                                  style={{
                                    padding: "6px 12px",
                                    background: bahan.total_produk > 0 ? "linear-gradient(135deg, #28a745 0%, #20c997 100%)" : "linear-gradient(135deg, #6c757d 0%, #5a6268 100%)",
                                    color: "white",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    display: "inline-block",
                                    boxShadow: bahan.total_produk > 0 ? "0 2px 8px rgba(40, 167, 69, 0.3)" : "none",
                                  }}
                                >
                                  {bahan.total_produk?.toLocaleString("id-ID") || bahan.hasil?.toLocaleString("id-ID") || 0}
                                </span>
                              </td>
                              <td>
                                <span
                                  style={{
                                    padding: "6px 12px",
                                    background: "linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)",
                                    color: "#155724",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    display: "inline-block",
                                  }}
                                >
                                  {bahan.berat_per_produk?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                                </span>
                              </td>
                              <td>
                                {statusPerbandingan ? (
                                  <span
                                    style={{
                                      padding: "8px 12px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      borderRadius: "8px",
                                      display: "inline-block",
                                      background:
                                        statusPerbandingan === "lebih berat dari acuan"
                                          ? "linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)"
                                          : statusPerbandingan === "lebih ringan dari acuan"
                                          ? "linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)"
                                          : "linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)",
                                      color: statusPerbandingan === "lebih berat dari acuan" ? "#721c24" : statusPerbandingan === "lebih ringan dari acuan" ? "#856404" : "#0c5460",
                                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                    }}
                                  >
                                    {(() => {
                                      const statusInfo = statusPerbandinganAgregat.find((s) => s.warna === bahan.warna);
                                      const status = statusInfo?.status || statusPerbandingan;
                                      const selisih = statusInfo?.selisih || 0;

                                      if (status === "lebih berat dari acuan") {
                                        return `⚠️ ${status} ${selisih > 0 ? selisih.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kg" : ""}`;
                                      } else if (status === "lebih ringan dari acuan") {
                                        return `📉 ${status} ${selisih > 0 ? selisih.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kg" : ""}`;
                                      } else {
                                        return `✅ ${status}`;
                                      }
                                    })()}
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      padding: "8px 12px",
                                      fontSize: "12px",
                                      color: "#999",
                                      fontStyle: "italic",
                                    }}
                                  >
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
                          <tr
                            style={{
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              color: "white",
                              fontWeight: "700",
                            }}
                          >
                            <td colSpan="3" style={{ padding: "16px", textAlign: "right", fontSize: "14px" }}>
                              <strong>TOTAL:</strong>
                            </td>
                            <td colSpan="4" style={{ padding: "16px" }}></td>
                            <td style={{ padding: "16px", fontSize: "14px" }}>
                              <strong>{detailData.bahan.reduce((sum, bahan) => sum + (parseFloat(bahan.total_produk || bahan.hasil) || 0), 0).toLocaleString("id-ID")}</strong>
                            </td>
                            <td style={{ padding: "16px", fontSize: "14px" }}>
                              <strong>{detailData.bahan.reduce((sum, bahan) => sum + (parseFloat(bahan.berat_per_produk) || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</strong>
                            </td>
                            <td style={{ padding: "16px" }}></td>
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

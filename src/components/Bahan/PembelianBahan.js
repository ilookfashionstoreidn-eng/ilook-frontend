import React, { useEffect, useState, useRef } from "react";
import "./PembelianBahan.css";
import API from "../../api";
import { FaPlus, FaEdit, FaEye, FaDownload, FaShoppingCart, FaBarcode, FaTimes, FaUndo } from "react-icons/fa";

const PembelianBahan = () => {
  const [items, setItems] = useState([]);
  const [pabrikList, setPabrikList] = useState([]);
  const [gudangList, setGudangList] = useState([]);
  const [bahanList, setBahanList] = useState([]);
  const [spkBahanList, setSpkBahanList] = useState([]);
  const [selectedSpkBahan, setSelectedSpkBahan] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false); // 🔹 Tambahkan ini
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [noSuratJalanError, setNoSuratJalanError] = useState("");
  const [usePPN, setUsePPN] = useState(false);
  const [usePPNEdit, setUsePPNEdit] = useState(false);
  const [showScanBarcode, setShowScanBarcode] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [scannedRoll, setScannedRoll] = useState(null);
  const [beratInput, setBeratInput] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const beratInputRef = useRef(null);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnHistory, setReturnHistory] = useState([]);
  const [loadingReturn, setLoadingReturn] = useState(false);
  
  // Form Return
  const [returnForm, setReturnForm] = useState({
    pembelian_bahan_id: "",
    pembelian_bahan_rol_id: "",
    tipe_return: "refund",
    jumlah_rol: 1,
    total_refund: "",
    keterangan: "",
    tanggal_return: new Date().toISOString().split('T')[0],
    foto_bukti: null,
  });

  const WARNA_OPTIONS = ["Putih", "Hitam", "Merah", "Biru", "Hijau", "Kuning", "Abu-abu", "Coklat", "Pink", "Ungu", "Orange", "Navy", "Maroon", "Beige", "Khaki", "Lainnya"];

  // Form Tambah
  const [newItem, setNewItem] = useState({
    spk_bahan_id: "",
    pabrik_id: "",
    gudang_id: "",
    tanggal_kirim: "",
    no_surat_jalan: "",
    foto_surat_jalan: null,
    bahan_id: "",
    gramasi: "",
    lebar_kain: "",
    keterangan: "",
    harga: "",
    berat_rol: {}, // Format: { spk_bahan_warna_id: [berat1, berat2, ...] }
  });

  // Form Edit
  const [editItem, setEditItem] = useState({
    id: null,
    pabrik_id: "",
    gudang_id: "",
    tanggal_kirim: "",
    no_surat_jalan: "",
    foto_surat_jalan: null,
    bahan_id: "",
    gramasi: "",
    lebar_kain: "",
    keterangan: "",
    sku: "",
    harga: "",
    warna: [{ nama: "", jumlah_rol: 1, rol: [0], isCustom: false, customNama: "" }],
  });

  // === FETCH DATA ===
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [resData, resPabrik, resGudang, resBahan, resSpkBahan] = await Promise.all([
          API.get("/pembelian-bahan"),
          API.get("/pabrik"),
          API.get("/gudang"),
          API.get("/bahan"),
          API.get("/spk-bahan")
        ]);

        let dataBahan = Array.isArray(resData.data) ? resData.data : resData.data?.data || [];
        dataBahan = dataBahan.sort((a, b) => b.id - a.id);

        setItems(dataBahan);
        setPabrikList(resPabrik.data || []);
        setGudangList(resGudang.data || []);
        setBahanList(resBahan.data || []);
        
        // Filter SPK Bahan yang statusnya bukan 'selesai'
        const spkBahanData = Array.isArray(resSpkBahan.data) ? resSpkBahan.data : resSpkBahan.data?.data || [];
        setSpkBahanList(spkBahanData.filter(spk => spk.status !== 'selesai'));

        setIsReady(true); // 🔹 Pastikan semua data siap
      } catch (e) {
        setError("Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Auto-scan barcode ketika scannedBarcode berubah (dengan debounce)
  // Hanya scan sekali - jika sudah ada scannedRoll, tidak scan lagi
  useEffect(() => {
    if (!showScanBarcode) return; // Hanya aktif ketika modal terbuka

    // Reset jika barcode dikosongkan
    if (!scannedBarcode.trim()) {
      setScannedRoll(null);
      setScanError("");
      return;
    }

    // JIKA SUDAH ADA INFORMASI ROLL, JANGAN SCAN LAGI
    if (scannedRoll) {
      return;
    }

    // Debounce: tunggu 300ms setelah user berhenti mengetik/scan
    const timeoutId = setTimeout(() => {
      if (scannedBarcode.trim() && !scanLoading && !scannedRoll) {
        handleScanBarcode();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedBarcode, showScanBarcode, scanLoading]);

  // Auto-focus pada input berat setelah scan berhasil
  useEffect(() => {
    if (scannedRoll && beratInputRef.current) {
      // Delay sedikit untuk memastikan DOM sudah ter-render
      setTimeout(() => {
        beratInputRef.current?.focus();
      }, 100);
    }
  }, [scannedRoll]);

  // === PAGINATION ===
  const filtered = items.filter((b) => (b.keterangan || "").toLowerCase().includes(searchTerm.toLowerCase()) || (b.sku || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // === HELPER ===
  const getNamaById = (list, id, field = "nama_bahan") => {
    if (!list || list.length === 0) return "-"; // 🔹 Hindari error jika list kosong
    const found = list.find((x) => x.id === id);
    return found ? found[field] || "-" : "-";
  };

  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  // Fungsi untuk menghitung total jumlah roll dari semua warna
  const calculateTotalRoll = (warnaArray) => {
    if (!warnaArray || !Array.isArray(warnaArray)) return 0;
    return warnaArray.reduce((total, w) => {
      const jumlahRol = w.jumlah_rol || w.rol?.length || 0;
      return total + jumlahRol;
    }, 0);
  };

  // Fungsi untuk mendapatkan harga bahan dari bahanList berdasarkan bahan_id
  const getHargaBahan = (bahanId) => {
    if (!bahanId || !bahanList || bahanList.length === 0) return 0;
    const bahan = bahanList.find((b) => b.id === parseInt(bahanId));
    return bahan ? parseFloat(bahan.harga) || 0 : 0;
  };

  // Fungsi untuk mendapatkan satuan bahan dari bahanList berdasarkan bahan_id
  const getSatuanBahan = (bahanId) => {
    if (!bahanId || !bahanList || bahanList.length === 0) return "kg";
    const bahan = bahanList.find((b) => b.id === parseInt(bahanId));
    return bahan ? bahan.satuan || "kg" : "kg";
  };

  // Fungsi untuk menghitung total berat semua roll
  const calculateTotalBerat = (warnaArray) => {
    if (!warnaArray || !Array.isArray(warnaArray)) return 0;
    let totalBerat = 0;
    warnaArray.forEach((w) => {
      if (w.rol && Array.isArray(w.rol)) {
        w.rol.forEach((berat) => {
          const beratNum = parseFloat(berat) || 0;
          totalBerat += beratNum;
        });
      }
    });
    return totalBerat;
  };

  // Fungsi untuk menghitung total harga berdasarkan harga bahan, satuan, dan total berat roll
  const calculateTotalHarga = (bahanId, warnaArray) => {
    const hargaBahan = getHargaBahan(bahanId);
    const totalBerat = calculateTotalBerat(warnaArray);

    // Jika satuan adalah kg atau yard, kalikan harga dengan total berat
    // Harga bahan adalah harga per kg atau per yard
    return hargaBahan * totalBerat;
  };

  // Fungsi untuk menghitung harga setelah PPN (11%)
  const calculateHargaWithPPN = (harga) => {
    const hargaNum = parseFloat(harga) || 0;
    return hargaNum * 1.11; // Tambah 11%
  };

  // Fungsi untuk format angka ke rupiah (untuk display di input)
  const formatRupiahInput = (value) => {
    if (!value && value !== 0) return "";
    // Hapus semua karakter non-digit
    const number = value.toString().replace(/\D/g, "");
    if (!number) return "";
    // Format dengan pemisah ribuan
    return parseInt(number).toLocaleString("id-ID");
  };

  // Fungsi untuk unformat rupiah ke angka (untuk value)
  const unformatRupiah = (rupiahString) => {
    if (!rupiahString) return "";
    return rupiahString.toString().replace(/\D/g, "");
  };

  // === HANDLERS ===
  const checkNoSuratJalan = async (noSuratJalan, currentId = null) => {
    if (!noSuratJalan || noSuratJalan.trim() === "") {
      setNoSuratJalanError("");
      return true;
    }

    // Cek apakah nomor surat jalan sudah ada di data yang sudah di-fetch
    const existing = items.find((item) => item.no_surat_jalan && item.no_surat_jalan.toLowerCase().trim() === noSuratJalan.toLowerCase().trim() && item.id !== currentId);

    if (existing) {
      setNoSuratJalanError("Nomor surat jalan sudah digunakan. Silakan gunakan nomor lain.");
      return false;
    }

    setNoSuratJalanError("");
    return true;
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;

    // Validasi nomor surat jalan
    if (name === "no_surat_jalan") {
      if (showEditForm) {
        setEditItem((prev) => ({ ...prev, [name]: value }));
        await checkNoSuratJalan(value, editItem.id);
      } else {
        setNewItem((prev) => ({ ...prev, [name]: value }));
        await checkNoSuratJalan(value);
      }
      return;
    }

    if (name === "harga") {
      // Format rupiah saat input
      const unformatted = unformatRupiah(value);
      const formatted = formatRupiahInput(unformatted);
      if (showEditForm) {
        setEditItem((prev) => ({ ...prev, [name]: formatted }));
      } else {
        setNewItem((prev) => ({ ...prev, [name]: formatted }));
      }
    } else {
      if (showEditForm) {
        setEditItem((prev) => ({ ...prev, [name]: value }));
      } else {
        setNewItem((prev) => ({ ...prev, [name]: value }));
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (showEditForm) {
      setEditItem((prev) => ({ ...prev, foto_surat_jalan: file }));
    } else {
      setNewItem((prev) => ({ ...prev, foto_surat_jalan: file }));
    }
  };

  const resetForm = () => {
    setNewItem({
      spk_bahan_id: "",
      pabrik_id: "",
      gudang_id: "",
      tanggal_kirim: "",
      no_surat_jalan: "",
      foto_surat_jalan: null,
      bahan_id: "",
      gramasi: "",
      lebar_kain: "",
      keterangan: "",
      harga: "",
      berat_rol: {},
    });
    setSelectedSpkBahan(null);
    setEditItem({
      id: null,
      pabrik_id: "",
      gudang_id: "",
      tanggal_kirim: "",
      no_surat_jalan: "",
      foto_surat_jalan: null,
      bahan_id: "",
      gramasi: "",
      lebar_kain: "",
      keterangan: "",
      sku: "",
      harga: "",
      warna: [{ nama: "", jumlah_rol: 1, rol: [0], isCustom: false, customNama: "" }],
    });
    setNoSuratJalanError("");
    setUsePPN(false);
    setUsePPNEdit(false);
    setShowForm(false);
    setShowEditForm(false);
  };

  // Handler untuk memilih SPK Bahan
  const handleSpkBahanChange = async (spkBahanId) => {
    if (!spkBahanId) {
      setSelectedSpkBahan(null);
      setNewItem((prev) => ({
        ...prev,
        spk_bahan_id: "",
        bahan_id: "",
        berat_rol: {},
      }));
      return;
    }

    try {
      const spkBahan = spkBahanList.find(spk => spk.id === parseInt(spkBahanId));
      if (spkBahan) {
        setSelectedSpkBahan(spkBahan);
        setNewItem((prev) => ({
          ...prev,
          spk_bahan_id: spkBahanId,
          bahan_id: spkBahan.bahan_id || "",
          pabrik_id: spkBahan.pabrik_id || "",
          berat_rol: {},
        }));

        // Fetch data pembelian bahan yang sudah ada untuk menghitung sisa rol
        try {
          const resPembelian = await API.get("/pembelian-bahan");
          const pembelianData = Array.isArray(resPembelian.data.data) ? resPembelian.data.data : resPembelian.data.data?.data || [];
          
          // Hitung sisa rol per warna
          const sisaRol = {};
          if (spkBahan.warna && Array.isArray(spkBahan.warna)) {
            spkBahan.warna.forEach((warna) => {
              // Hitung total rol yang sudah dikirim untuk warna ini
              const totalTerkirim = pembelianData
                .filter(pb => pb.spk?.id === spkBahan.id)
                .flatMap(pb => pb.warna || [])
                .filter(w => w.spk_bahan_warna_id === warna.id)
                .reduce((sum, w) => sum + (w.rol?.length || 0), 0);
              
              sisaRol[warna.id] = Math.max(0, (warna.jumlah_rol || 0) - totalTerkirim);
            });
          }
          
          // Set sisa rol ke state untuk ditampilkan
          setSelectedSpkBahan((prev) => ({
            ...prev,
            sisaRol,
          }));
        } catch (err) {
          console.error("Error calculating sisa rol:", err);
          // Jika error, set sisa rol sama dengan jumlah rol SPK
          const sisaRol = {};
          if (spkBahan.warna && Array.isArray(spkBahan.warna)) {
            spkBahan.warna.forEach((warna) => {
              sisaRol[warna.id] = warna.jumlah_rol || 0;
            });
          }
          setSelectedSpkBahan((prev) => ({
            ...prev,
            sisaRol,
          }));
        }
      }
    } catch (error) {
      console.error("Error loading SPK Bahan:", error);
      alert("Gagal memuat data SPK Bahan");
    }
  };

  // Handler untuk menambah rol pada warna tertentu
  const addRolToWarna = (spkBahanWarnaId) => {
    setNewItem((prev) => {
      const beratRol = { ...prev.berat_rol };
      if (!beratRol[spkBahanWarnaId]) {
        beratRol[spkBahanWarnaId] = [];
      }
      beratRol[spkBahanWarnaId] = [...beratRol[spkBahanWarnaId], 0];
      return { ...prev, berat_rol: beratRol };
    });
  };

  // Handler untuk menghapus rol pada warna tertentu
  const removeRolFromWarna = (spkBahanWarnaId, rolIndex) => {
    setNewItem((prev) => {
      const beratRol = { ...prev.berat_rol };
      if (beratRol[spkBahanWarnaId]) {
        beratRol[spkBahanWarnaId] = beratRol[spkBahanWarnaId].filter((_, i) => i !== rolIndex);
      }
      return { ...prev, berat_rol: beratRol };
    });
  };

  // Handler untuk mengubah berat rol
  const handleBeratRolChange = (spkBahanWarnaId, rolIndex, value) => {
    setNewItem((prev) => {
      const beratRol = { ...prev.berat_rol };
      if (!beratRol[spkBahanWarnaId]) {
        beratRol[spkBahanWarnaId] = [];
      }
      const arr = [...beratRol[spkBahanWarnaId]];
      arr[rolIndex] = value;
      beratRol[spkBahanWarnaId] = arr;
      return { ...prev, berat_rol: beratRol };
    });
  };

  const addWarnaEdit = () => {
    setEditItem((prev) => ({
      ...prev,
      warna: [...prev.warna, { nama: "", jumlah_rol: 1, rol: [0], isCustom: false, customNama: "" }],
    }));
  };

  const removeWarnaEdit = (index) => {
    setEditItem((prev) => ({
      ...prev,
      warna: prev.warna.filter((_, i) => i !== index),
    }));
  };

  const handleWarnaFieldChangeEdit = (index, key, value) => {
    setEditItem((prev) => {
      const warna = [...prev.warna];
      warna[index] = { ...warna[index], [key]: value };
      return { ...prev, warna };
    });
  };

  const addRolEdit = (warnaIndex) => {
    setEditItem((prev) => {
      const warna = [...prev.warna];
      warna[warnaIndex].rol = [...warna[warnaIndex].rol, 0];
      warna[warnaIndex].jumlah_rol = warna[warnaIndex].rol.length;
      return { ...prev, warna };
    });
  };

  const removeRolEdit = (warnaIndex, rolIndex) => {
    setEditItem((prev) => {
      const warna = [...prev.warna];
      warna[warnaIndex].rol = warna[warnaIndex].rol.filter((_, i) => i !== rolIndex);
      warna[warnaIndex].jumlah_rol = warna[warnaIndex].rol.length;
      return { ...prev, warna };
    });
  };

  const handleRolChangeEdit = (warnaIndex, rolIndex, value) => {
    setEditItem((prev) => {
      const warna = [...prev.warna];
      const arr = [...warna[warnaIndex].rol];
      arr[rolIndex] = value;
      warna[warnaIndex].rol = arr;
      warna[warnaIndex].jumlah_rol = arr.length;
      return { ...prev, warna };
    });
  };

  // === SUBMIT ===
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Validasi SPK Bahan
    if (!newItem.spk_bahan_id) {
      alert("Silakan pilih SPK Bahan terlebih dahulu.");
      return;
    }

    // Validasi minimal ada 1 rol yang diisi
    const totalRol = Object.values(newItem.berat_rol || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    if (totalRol === 0) {
      alert("Minimal harus ada 1 rol yang diisi.");
      return;
    }

    // Validasi nomor surat jalan sebelum submit
    if (newItem.no_surat_jalan && newItem.no_surat_jalan.trim() !== "") {
      const isValid = await checkNoSuratJalan(newItem.no_surat_jalan);
      if (!isValid) {
        alert("Nomor surat jalan sudah digunakan. Silakan gunakan nomor lain.");
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append("spk_bahan_id", newItem.spk_bahan_id);
      formData.append("keterangan", newItem.keterangan || "");
      formData.append("gudang_id", newItem.gudang_id);
      formData.append("pabrik_id", newItem.pabrik_id);
      formData.append("tanggal_kirim", newItem.tanggal_kirim);
      if (newItem.no_surat_jalan) formData.append("no_surat_jalan", newItem.no_surat_jalan);
      if (newItem.foto_surat_jalan) formData.append("foto_surat_jalan", newItem.foto_surat_jalan);
      formData.append("gramasi", newItem.gramasi || "");
      formData.append("lebar_kain", newItem.lebar_kain || "");
      
      // Hitung harga yang akan dikirim ke DB
      const hargaInput = parseFloat(unformatRupiah(newItem.harga)) || 0;
      const hargaForDB = usePPN ? calculateHargaWithPPN(hargaInput) : hargaInput;
      formData.append("harga", hargaForDB.toString());

      // Format berat_rol sesuai dengan yang diharapkan backend
      // Format: berat_rol[spk_bahan_warna_id][] = berat1, berat_rol[spk_bahan_warna_id][] = berat2, ...
      Object.keys(newItem.berat_rol || {}).forEach((spkBahanWarnaId) => {
        const beratArray = newItem.berat_rol[spkBahanWarnaId] || [];
        beratArray.forEach((berat) => {
          // Gunakan format [] untuk array di Laravel
          formData.append(`berat_rol[${spkBahanWarnaId}][]`, berat);
        });
      });

      const response = await API.post("/pembelian-bahan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || response.data;
      
      // Refresh data
      const resData = await API.get("/pembelian-bahan");
      let dataBahan = Array.isArray(resData.data.data) ? resData.data.data : resData.data.data?.data || [];
      dataBahan = dataBahan.sort((a, b) => b.id - a.id);
      setItems(dataBahan);
      
      resetForm();
      setNoSuratJalanError("");
      alert("Pembelian bahan berhasil ditambahkan!");
    } catch (error) {
      if (error.response?.data?.errors?.no_surat_jalan) {
        setNoSuratJalanError(error.response.data.errors.no_surat_jalan[0] || "Nomor surat jalan sudah digunakan.");
        alert("Nomor surat jalan sudah digunakan. Silakan gunakan nomor lain.");
      } else {
        const errorMsg = error.response?.data?.message || error.response?.data?.error || "Gagal menambah pembelian bahan.";
        alert(errorMsg);
      }
    }
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();

    // Validasi nomor surat jalan sebelum submit
    if (editItem.no_surat_jalan && editItem.no_surat_jalan.trim() !== "") {
      const isValid = await checkNoSuratJalan(editItem.no_surat_jalan, editItem.id);
      if (!isValid) {
        alert("Nomor surat jalan sudah digunakan. Silakan gunakan nomor lain.");
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append("keterangan", editItem.keterangan || "");
      formData.append("gudang_id", String(editItem.gudang_id || ""));
      formData.append("pabrik_id", String(editItem.pabrik_id || ""));
      formData.append("tanggal_kirim", editItem.tanggal_kirim || "");
      formData.append("bahan_id", String(editItem.bahan_id || ""));
      formData.append("gramasi", editItem.gramasi !== null && editItem.gramasi !== undefined ? String(editItem.gramasi) : "");
      formData.append("lebar_kain", editItem.lebar_kain !== null && editItem.lebar_kain !== undefined ? String(editItem.lebar_kain) : "");
      formData.append("sku", editItem.sku || "");
      // Hitung harga yang akan dikirim ke DB
      // Unformat rupiah ke angka, lalu jika PPN dicentang tambahkan 11%
      const hargaInput = parseFloat(unformatRupiah(editItem.harga)) || 0;
      const hargaForDB = usePPNEdit ? calculateHargaWithPPN(hargaInput) : hargaInput;
      formData.append("harga", String(hargaForDB));
      if (editItem.no_surat_jalan) formData.append("no_surat_jalan", editItem.no_surat_jalan);
      if (editItem.foto_surat_jalan) {
        formData.append("foto_surat_jalan", editItem.foto_surat_jalan);
      }

      // Validasi warna sebelum submit
      for (let i = 0; i < editItem.warna.length; i++) {
        const w = editItem.warna[i];
        const namaWarna = w.isCustom ? (w.customNama || "").trim() : (w.nama || "").trim();
        if (!namaWarna) {
          alert(`Warna ${i + 1} harus diisi!`);
          return;
        }
        if (!w.rol || w.rol.length === 0) {
          alert(`Warna ${i + 1} harus memiliki minimal 1 rol!`);
          return;
        }
        // Validasi bahwa semua rol memiliki nilai yang valid
        for (let j = 0; j < w.rol.length; j++) {
          const berat = parseFloat(w.rol[j]);
          if (isNaN(berat) || berat < 0) {
            alert(`Warna ${i + 1}, Rol ${j + 1} harus memiliki berat yang valid!`);
            return;
          }
        }
      }

      editItem.warna.forEach((w, i) => {
        const namaWarna = w.isCustom ? (w.customNama || "").trim() : (w.nama || "").trim();
        formData.append(`warna[${i}][nama]`, namaWarna);
        const jumlahRol = w.jumlah_rol || (w.rol ? w.rol.length : 0);
        formData.append(`warna[${i}][jumlah_rol]`, String(jumlahRol));
        if (w.rol && Array.isArray(w.rol) && w.rol.length > 0) {
          w.rol.forEach((berat, j) => {
            const beratValue = parseFloat(berat) || 0;
            formData.append(`warna[${i}][rol][${j}]`, String(beratValue));
          });
        }
      });

      // Debug: log FormData contents
      console.log("FormData yang akan dikirim:");
      for (let pair of formData.entries()) {
        console.log(pair[0] + ": " + pair[1]);
      }

      // Gunakan POST dengan _method=PUT karena Laravel kadang bermasalah dengan FormData pada PUT
      formData.append("_method", "PUT");
      const response = await API.post(`/pembelian-bahan/${editItem.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedData = response.data.data || response.data;
      setItems((prev) => prev.map((b) => (b.id === editItem.id ? updatedData : b)));
      resetForm();
      setNoSuratJalanError("");
      alert("Pembelian bahan berhasil diperbarui!");
    } catch (error) {
      console.error("Update error:", error);
      console.error("Error response:", error.response?.data);
      if (error.response?.data?.errors?.no_surat_jalan) {
        setNoSuratJalanError(error.response.data.errors.no_surat_jalan[0] || "Nomor surat jalan sudah digunakan.");
        alert("Nomor surat jalan sudah digunakan. Silakan gunakan nomor lain.");
      } else {
        const errorMessages = error.response?.data?.errors 
          ? Object.entries(error.response.data.errors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
              .join("\n")
          : error.response?.data?.message || "Gagal memperbarui pembelian bahan.";
        alert(errorMessages);
      }
    }
  };

  // === LAINNYA ===
  const handleEditClick = async (item) => {
    try {
      const res = await API.get(`/pembelian-bahan/${item.id}`);
      const data = res.data;

      const warnaForForm = (data.warna || []).map((w) => {
        const rawNama = w.nama || w.warna;
        const rolValues = (w.rol || []).map((r) => r.berat ?? r);
        const isPreset = WARNA_OPTIONS.includes(rawNama);
        return {
          nama: isPreset ? rawNama : "",
          jumlah_rol: w.jumlah_rol,
          rol: rolValues.length > 0 ? rolValues : [0],
          isCustom: !isPreset,
          customNama: isPreset ? "" : rawNama,
        };
      });

      if (warnaForForm.length === 0) {
        warnaForForm.push({ nama: "", jumlah_rol: 1, rol: [0], isCustom: false, customNama: "" });
      }

      // Ambil harga dari master bahan (bahanList) berdasarkan bahan_id
      const hargaBahan = getHargaBahan(data.bahan_id);

      setEditItem({
        id: data.id,
        pabrik_id: data.pabrik_id || "",
        gudang_id: data.gudang_id || "",
        tanggal_kirim: data.tanggal_kirim || "",
        no_surat_jalan: data.no_surat_jalan || "",
        bahan_id: data.bahan_id || "",
        gramasi: data.gramasi || "",
        lebar_kain: data.lebar_kain || "",
        keterangan: data.keterangan || "",
        sku: data.sku || "",
        harga: formatRupiahInput(hargaBahan.toString()),
        foto_surat_jalan: null,
        warna: warnaForForm,
      });
      setShowEditForm(true);
    } catch (err) {
      alert("Gagal memuat data untuk edit.");
    }
  };

  const handleDetailClick = async (item) => {
    try {
      const res = await API.get(`/pembelian-bahan/${item.id}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data;
      setDetailItem(data);
      
      // Fetch return history
      try {
        const returnRes = await API.get(`/return-bahan?pembelian_bahan_id=${item.id}`);
        setReturnHistory(returnRes.data?.data || []);
      } catch (err) {
        console.error("Gagal memuat history return:", err);
        setReturnHistory([]);
      }
    } catch (e) {
      setDetailItem(item);
    } finally {
      setShowDetail(true);
    }
  };

  const handleOpenReturnForm = (item) => {
    setReturnForm({
      pembelian_bahan_id: item.id,
      pembelian_bahan_rol_id: "",
      tipe_return: "refund",
      jumlah_rol: 1,
      total_refund: "",
      keterangan: "",
      tanggal_return: new Date().toISOString().split('T')[0],
      foto_bukti: null,
    });
    setShowReturnForm(true);
  };

  const handleReturnFormChange = (e) => {
    const { name, value } = e.target;
    setReturnForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReturnFileChange = (e) => {
    setReturnForm((prev) => ({ ...prev, foto_bukti: e.target.files[0] }));
  };

  const handleUpdateReturnStatus = async (returnId, newStatus) => {
    if (!window.confirm(`Yakin ingin mengubah status menjadi "${newStatus.toUpperCase()}"?`)) {
      return;
    }

    try {
      const res = await API.put(`/pembelian-bahan/return/${returnId}/status`, {
        status: newStatus,
      });

      if (res.data?.success) {
        alert(res.data?.message || "Status berhasil diupdate");
        
        // Refresh return history
        if (detailItem) {
          const returnRes = await API.get(`/pembelian-bahan/${detailItem.id}/return`);
          setReturnHistory(returnRes.data?.data || []);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Gagal mengupdate status";
      alert(msg);
    }
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    
    if (!returnForm.pembelian_bahan_id) {
      alert("Pembelian Bahan ID tidak valid");
      return;
    }

    if (returnForm.tipe_return === "refund" && !returnForm.total_refund) {
      alert("Total refund wajib diisi untuk tipe refund");
      return;
    }

    try {
      setLoadingReturn(true);
      const formData = new FormData();
      formData.append("pembelian_bahan_id", returnForm.pembelian_bahan_id);
      if (returnForm.pembelian_bahan_rol_id) {
        formData.append("pembelian_bahan_rol_id", returnForm.pembelian_bahan_rol_id);
      }
      formData.append("tipe_return", returnForm.tipe_return);
      formData.append("jumlah_rol", returnForm.jumlah_rol);
      if (returnForm.total_refund) {
        formData.append("total_refund", returnForm.total_refund);
      }
      formData.append("keterangan", returnForm.keterangan || "");
      formData.append("tanggal_return", returnForm.tanggal_return);
      if (returnForm.foto_bukti) {
        formData.append("foto_bukti", returnForm.foto_bukti);
      }

      const res = await API.post("/pembelian-bahan/return", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.success) {
        alert(res.data?.message || "Return/Refund berhasil dicatat");
        setShowReturnForm(false);
        
        // Refresh return history
        if (detailItem) {
          const returnRes = await API.get(`/pembelian-bahan/${detailItem.id}/return`);
          setReturnHistory(returnRes.data?.data || []);
        }
        
        // Refresh data
        const fetchRes = await API.get("/pembelian-bahan");
        let dataBahan = Array.isArray(fetchRes.data.data) ? fetchRes.data.data : fetchRes.data.data?.data || [];
        dataBahan = dataBahan.sort((a, b) => b.id - a.id);
        setItems(dataBahan);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Gagal mencatat return/refund";
      alert(msg);
    } finally {
      setLoadingReturn(false);
    }
  };

  const handleDownloadBarcode = async (item) => {
    const endpoints = [`/pembelian-bahan/${item.id}/download-barcode`];
    const tried = [];
    for (const ep of endpoints) {
      try {
        const res = await API.get(ep, {
          responseType: "arraybuffer",
          headers: { Accept: "application/pdf" },
        });
        const ct = res.headers?.["content-type"] || res.headers?.["Content-Type"] || "";
        if (!ct.toLowerCase().includes("pdf")) throw new Error(`Unexpected content-type: ${ct}`);
        const disposition = res.headers?.["content-disposition"] || res.headers?.["Content-Disposition"];
        const match = disposition?.match(/filename="?([^";]+)"?/i);
        const filename = match ? match[1] : `barcode-bahan-${item.id}.pdf`;
        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return;
      } catch (err) {
        const status = err.response ? err.response.status : "ERR";
        tried.push(`${API.defaults?.baseURL || ""}${ep} [${status}]`);
      }
    }
    alert(`Gagal mendownload barcode PDF. URL dicoba: ${tried.join(" | ")}`);
  };

  // Handler untuk scan barcode
  const handleScanBarcode = async () => {
    if (!scannedBarcode.trim()) {
      setScanError("Silakan masukkan barcode");
      return;
    }

    try {
      setScanLoading(true);
      setScanError("");
      const response = await API.get(`/pembelian-bahan/scan-barcode/${scannedBarcode.trim()}`);

      if (response.data.data) {
        setScannedRoll(response.data.data);
        const beratValue = response.data.data.berat || "";
        setBeratInput(beratValue);
        // Auto-focus pada input berat setelah scan berhasil
        setTimeout(() => {
          beratInputRef.current?.focus();
          // Jika berat sudah ada, select semua teks agar mudah diganti
          if (beratInputRef.current && beratValue) {
            beratInputRef.current.select();
          }
        }, 100);
      } else {
        setScanError("Barcode tidak ditemukan");
        setScannedRoll(null);
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
      setScanError(error.response?.data?.message || "Barcode tidak ditemukan");
      setScannedRoll(null);
    } finally {
      setScanLoading(false);
    }
  };

  // Handler untuk update berat
  const handleUpdateBerat = async () => {
    if (!scannedRoll) {
      setScanError("Silakan scan barcode terlebih dahulu");
      return;
    }

    if (!beratInput || parseFloat(beratInput) <= 0) {
      setScanError("Berat harus lebih dari 0");
      return;
    }

    try {
      setScanLoading(true);
      setScanError("");
      await API.put(`/pembelian-bahan/scan-barcode/${scannedRoll.barcode}/update-berat`, {
        berat: parseFloat(beratInput),
      });

      alert("Berat roll berhasil diperbarui!");

      // Reset form
      setScannedBarcode("");
      setScannedRoll(null);
      setBeratInput("");

      // Refresh data
      const resData = await API.get("/pembelian-bahan");
      let dataBahan = Array.isArray(resData.data) ? resData.data : resData.data?.data || [];
      dataBahan = dataBahan.sort((a, b) => b.id - a.id);
      setItems(dataBahan);
    } catch (error) {
      console.error("Error updating berat:", error);
      setScanError(error.response?.data?.message || "Gagal memperbarui berat roll");
    } finally {
      setScanLoading(false);
    }
  };

  // Handler untuk close modal scan
  const handleCloseScanModal = () => {
    setShowScanBarcode(false);
    setScannedBarcode("");
    setScannedRoll(null);
    setBeratInput("");
    setScanError("");
  };

  return (
    <div className="pembelian-bahan-page">
      <div className="pembelian-bahan-header">
        <div className="pembelian-bahan-header-icon">
          <FaShoppingCart />
        </div>
        <h1>Pembelian Bahan</h1>
      </div>

      <div className="pembelian-bahan-table-container">
        <div className="pembelian-bahan-filter-header">
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="pembelian-bahan-btn-add" onClick={() => setShowForm(true)}>
              <FaPlus /> Tambah Pembelian
            </button>
            <button className="pembelian-bahan-btn-add" onClick={() => setShowScanBarcode(true)} style={{ background: "#10b981" }}>
              <FaBarcode /> Update Berat Roll
            </button>
          </div>
          <div className="pembelian-bahan-search-bar">
            <input type="text" placeholder="Cari keterangan atau SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <p className="pembelian-bahan-loading">Memuat data...</p>
        ) : error ? (
          <p className="pembelian-bahan-error">{error}</p>
        ) : !isReady ? (
          <p className="pembelian-bahan-loading">Menyiapkan data master...</p>
        ) : (
          <>
            <table className="pembelian-bahan-table">
              <thead>
                <tr>
                  <th>No</th>
                 
                  <th>SPK Bahan</th>
                  <th>Nama Bahan</th>
                  <th>Harga</th>
                  <th>Gudang</th>
                  <th>Pabrik</th>
                  <th>Tgl Diterima</th>
                  <th>Progress</th>
                  <th>Barcode</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((b, index) => (
                  <tr key={b.id}>
                    <td>{indexOfFirstItem + index + 1}</td>
                   
                    <td>
                      {b.spk ? (
                        <div>
                          <div>{b.spk.id}</div>
                       
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{getNamaById(bahanList, b.bahan_id, "nama_bahan")}</td>
                   
                    <td className="pembelian-bahan-price">{formatRupiah(b.harga)}</td>
                    <td>{getNamaById(gudangList, b.gudang_id, "nama_gudang")}</td>
                    <td>{getNamaById(pabrikList, b.pabrik_id, "nama_pabrik")}</td>
                    <td>{b.tanggal_kirim}</td>
                    <td>
                      {b.progress !== undefined ? (
                        <div>
                          <div style={{ fontSize: "12px", marginBottom: "4px" }}>
                            {b.total_rol_dikirim || 0} / {b.total_rol_spk || 0} rol
                          </div>
                          <div style={{ width: "100px", height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${Math.min(b.progress || 0, 100)}%`,
                                height: "100%",
                                backgroundColor: b.progress >= 100 ? "#10b981" : b.progress >= 50 ? "#3b82f6" : "#f59e0b",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>{b.progress?.toFixed(1) || 0}%</div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <button className="pembelian-bahan-btn-icon download" onClick={() => handleDownloadBarcode(b)} title="Download Barcode">
                        <FaDownload />
                      </button>
                    </td>
                    <td>
                      <button className="pembelian-bahan-btn-icon view" title="Lihat Detail" onClick={() => handleDetailClick(b)} style={{ marginRight: "8px" }}>
                        <FaEye />
                      </button>
                      <button className="pembelian-bahan-btn-icon edit" title="Edit" onClick={() => handleEditClick(b)}>
                        <FaEdit />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pembelian-bahan-pagination">
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

      {/* Modal Tambah */}
      {showForm && (
        <div className="pembelian-bahan-modal">
          <div className="pembelian-bahan-modal-content">
            <h2>Tambah Pembelian Bahan</h2>
            <form onSubmit={handleFormSubmit} className="pembelian-bahan-form">
              <div className="pembelian-bahan-form-row">
                <div className="pembelian-bahan-form-group">
                  <label>SPK Bahan *</label>
                  <select
                    name="spk_bahan_id"
                    value={newItem.spk_bahan_id}
                    onChange={(e) => handleSpkBahanChange(e.target.value)}
                    required
                  >
                    <option value="">Pilih SPK Bahan</option>
                    {spkBahanList.map((spk) => (
                      <option key={spk.id} value={spk.id}>
                        SPK #{spk.id} - {spk.bahan?.nama_bahan || "-"} ({spk.pabrik?.nama_pabrik || "-"}) - Status: {spk.status || "-"}
                      </option>
                    ))}
                  </select>
                  {selectedSpkBahan && (
                    <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#f0f9ff", borderRadius: "6px", fontSize: "13px" }}>
                      <div><strong>Bahan:</strong> {selectedSpkBahan.bahan?.nama_bahan || "-"}</div>
                      <div><strong>Pabrik:</strong> {selectedSpkBahan.pabrik?.nama_pabrik || "-"}</div>
                      <div><strong>Total Rol SPK:</strong> {selectedSpkBahan.jumlah || 0}</div>
                      {selectedSpkBahan.lama_pemesanan !== null && selectedSpkBahan.lama_pemesanan !== undefined && (
                        <div><strong>Lama Pemesanan:</strong> {selectedSpkBahan.lama_pemesanan} hari</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="pembelian-bahan-form-group">
                  <label>Keterangan</label>
                  <select name="keterangan" value={newItem.keterangan} onChange={handleInputChange} required>
                    <option value="">Pilih Keterangan</option>
                    <option value="Utuh">Utuh</option>
                    <option value="Sisa">Sisa</option>
                  </select>
                </div>
              </div>

              <div className="pembelian-bahan-form-row">
                <div className="pembelian-bahan-form-group">
                  <label>Harga (Rp)</label>
                  <input type="text" name="harga" value={newItem.harga} onChange={handleInputChange} required placeholder="Contoh: 50000" />
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="checkbox" id="ppn-checkbox" checked={usePPN} onChange={(e) => setUsePPN(e.target.checked)} style={{ width: "18px", height: "18px", cursor: "pointer" }} />
                    <label htmlFor="ppn-checkbox" style={{ cursor: "pointer", fontSize: "14px", color: "#555", fontWeight: "normal" }}>
                      Gunakan PPN (11%)
                    </label>
                  </div>
                  {usePPN && newItem.harga && (
                    <div style={{ marginTop: "8px", padding: "8px 12px", backgroundColor: "#e3f2fd", borderRadius: "6px", fontSize: "13px", color: "#17457c" }}>
                      <strong>Harga Setelah PPN:</strong> {formatRupiah(calculateHargaWithPPN(parseFloat(unformatRupiah(newItem.harga)) || 0))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pembelian-bahan-form-row">
                <div className="pembelian-bahan-form-group">
                  <label>Pabrik</label>
                  <select name="pabrik_id" value={newItem.pabrik_id} onChange={handleInputChange} required>
                    <option value="">Pilih Pabrik</option>
                    {pabrikList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama_pabrik || p.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pembelian-bahan-form-group">
                  <label>Gudang</label>
                  <select name="gudang_id" value={newItem.gudang_id} onChange={handleInputChange} required>
                    <option value="">Pilih Gudang</option>
                    {gudangList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama_gudang || g.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pembelian-bahan-form-row">
                <div className="pembelian-bahan-form-group">
                  <label>Tanggal Diterima</label>
                  <input type="date" name="tanggal_kirim" value={newItem.tanggal_kirim} onChange={handleInputChange} required />
                </div>
                <div className="pembelian-bahan-form-group">
                  <label>No. Surat Jalan</label>
                  <input type="text" name="no_surat_jalan" value={newItem.no_surat_jalan} onChange={handleInputChange} className={noSuratJalanError ? "error" : ""} />
                  {noSuratJalanError && <span style={{ color: "#dc3545", fontSize: "12px", display: "block", marginTop: "4px" }}>{noSuratJalanError}</span>}
                </div>
              </div>

              <div className="pembelian-bahan-form-group">
                <label>Foto Surat Jalan (jpg/png/pdf)</label>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
              </div>
                    
              <div className="pembelian-bahan-form-row">  
                <div className="pembelian-bahan-form-group">
                  <label>Gramasi</label>
                  <input type="number" name="gramasi" value={newItem.gramasi} onChange={handleInputChange} required />
                </div>
                <div className="pembelian-bahan-form-group">
                  <label>Lebar Kain</label>
                  <input type="number" name="lebar_kain" value={newItem.lebar_kain} onChange={handleInputChange} required />
                </div>
              </div>

              <h3>Warna & Rol dari SPK</h3>
              {selectedSpkBahan && selectedSpkBahan.warna && selectedSpkBahan.warna.length > 0 ? (
                selectedSpkBahan.warna.map((warna) => {
                  const sisaRol = selectedSpkBahan.sisaRol?.[warna.id] || warna.jumlah_rol || 0;
                  const beratRolArray = newItem.berat_rol[warna.id] || [];
                  const totalBerat = beratRolArray.reduce((sum, berat) => sum + (parseFloat(berat) || 0), 0);

                  return (
                    <div key={warna.id} className="pembelian-bahan-warna-section" style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px" }}>
                      <div className="pembelian-bahan-warna-header">
                        <h4>Warna: {warna.warna}</h4>
                        <div style={{ fontSize: "13px", color: "#666" }}>
                          Jumlah Rol SPK: <strong>{warna.jumlah_rol || 0}</strong> | 
                          Sisa Rol: <strong style={{ color: sisaRol > 0 ? "#059669" : "#dc2626" }}>{sisaRol}</strong>
                        </div>
                      </div>
                      <div style={{ marginTop: "12px" }}>
                        {beratRolArray.map((berat, ri) => (
                          <div key={ri} className="pembelian-bahan-rol-item" style={{ marginBottom: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
                            <label style={{ minWidth: "150px" }}>Berat Rol {ri + 1} (kg):</label>
                            <input
                              type="number"
                              placeholder="Masukkan berat"
                              value={berat}
                              onChange={(e) => handleBeratRolChange(warna.id, ri, e.target.value)}
                              step="0.01"
                              min="0"
                              style={{ flex: 1 }}
                            />
                            <button
                              type="button"
                              className="pembelian-bahan-btn pembelian-bahan-btn-danger"
                              onClick={() => removeRolFromWarna(warna.id, ri)}
                            >
                              Hapus
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="pembelian-bahan-btn pembelian-bahan-btn-primary"
                          onClick={() => addRolToWarna(warna.id)}
                          disabled={beratRolArray.length >= sisaRol}
                          style={{ marginTop: "8px" }}
                        >
                          <FaPlus /> Tambah Rol
                        </button>
                        {beratRolArray.length >= sisaRol && sisaRol > 0 && (
                          <div style={{ marginTop: "8px", fontSize: "12px", color: "#dc2626" }}>
                            Maksimal {sisaRol} rol untuk warna ini
                          </div>
                        )}
                        {totalBerat > 0 && (
                          <div style={{ marginTop: "8px", fontSize: "13px", color: "#059669" }}>
                            Total Berat: <strong>{totalBerat.toFixed(2)} kg</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "#666", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                  {selectedSpkBahan ? "Tidak ada warna pada SPK ini" : "Pilih SPK Bahan terlebih dahulu"}
                </div>
              )}

              {/* Total Jumlah Rol dan Total Harga */}
              {selectedSpkBahan && (
                <div className="pembelian-bahan-total-section" style={{ marginTop: "30px", marginBottom: "20px", padding: "20px", backgroundColor: "#f8f9fa", borderRadius: "10px", border: "2px solid #b3d9f2" }}>
                  <div className="pembelian-bahan-form-row">
                    <div className="pembelian-bahan-form-group">
                      <label style={{ fontWeight: "bold", fontSize: "16px", color: "#17457c" }}>Total Jumlah Roll yang Dikirim</label>
                      <div style={{ fontSize: "20px", fontWeight: "bold", color: "#17457c", padding: "10px", backgroundColor: "white", borderRadius: "8px", textAlign: "center" }}>
                        {Object.values(newItem.berat_rol || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0)}
                      </div>
                    </div>
                    <div className="pembelian-bahan-form-group">
                      <label style={{ fontWeight: "bold", fontSize: "16px", color: "#17457c" }}>Total Berat (kg)</label>
                      <div style={{ fontSize: "20px", fontWeight: "bold", color: "#17457c", padding: "10px", backgroundColor: "white", borderRadius: "8px", textAlign: "center" }}>
                        {Object.values(newItem.berat_rol || {})
                          .flat()
                          .reduce((sum, berat) => sum + (parseFloat(berat) || 0), 0)
                          .toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pembelian-bahan-form-actions">
                <button type="submit" className="pembelian-bahan-btn pembelian-bahan-btn-primary">
                  Simpan
                </button>
                <button type="button" className="pembelian-bahan-btn pembelian-bahan-btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {showDetail && (
        <div className="pembelian-bahan-modal">
          <div className="pembelian-bahan-modal-content">
            <h2>Detail Pembelian Bahan</h2>
            {detailItem ? (
              <>
                <div className="pembelian-bahan-detail-grid">
                  <div className="pembelian-bahan-detail-item">
                    <strong>No</strong>
                    <span>{items.findIndex((i) => i.id === detailItem.id) + 1}</span>
                  </div>
                  <div className="pembelian-bahan-detail-item">
                    <strong>Keterangan</strong>
                    <span>{detailItem.keterangan}</span>
                  </div>
                  <div className="pembelian-bahan-detail-item">
                    <strong>Nama Bahan</strong>
                    <span>{getNamaById(bahanList, detailItem.bahan_id, "nama_bahan")}</span>
                  </div>
                  <div className="pembelian-bahan-detail-item">
                    <strong>Satuan</strong>
                    <span>{getNamaById(bahanList, detailItem.bahan_id, "satuan")}</span>
                  </div>
                  <div className="pembelian-bahan-detail-item">
                    <strong>Harga</strong>
                    <span className="pembelian-bahan-price">{formatRupiah(detailItem.harga)}</span>
                  </div>
                  {detailItem.spk && (
                    <div className="pembelian-bahan-detail-item">
                      <strong>SPK Bahan</strong>
                      <span>
                        <div>ID: {detailItem.spk.id} | Status: <span className={`pembelian-bahan-badge ${detailItem.spk.status?.toLowerCase()}`}>{detailItem.spk.status || "-"}</span></div>
                        {detailItem.spk.lama_pemesanan !== null && detailItem.spk.lama_pemesanan !== undefined && (
                          <div style={{ marginTop: "4px", color: "#059669", fontWeight: "500" }}>
                            Lama Pemesanan: {detailItem.spk.lama_pemesanan} hari
                          </div>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="pembelian-bahan-detail-item">
                    <strong>Pabrik</strong>
                    <span>{getNamaById(pabrikList, detailItem.pabrik_id, "nama_pabrik")}</span>
                  </div>
                  {detailItem.progress !== undefined && (
                    <div className="pembelian-bahan-detail-item">
                      <strong>Progress</strong>
                      <span>
                        <div style={{ marginTop: "8px" }}>
                          <div style={{ fontSize: "14px", marginBottom: "4px" }}>
                            {detailItem.total_rol_dikirim || 0} / {detailItem.total_rol_spk || 0} rol ({detailItem.progress?.toFixed(1) || 0}%)
                          </div>
                          <div style={{ width: "200px", height: "10px", backgroundColor: "#e5e7eb", borderRadius: "5px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${Math.min(detailItem.progress || 0, 100)}%`,
                                height: "100%",
                                backgroundColor: detailItem.progress >= 100 ? "#10b981" : detailItem.progress >= 50 ? "#3b82f6" : "#f59e0b",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                        </div>
                      </span>
                    </div>
                  )}
                  <div className="pembelian-bahan-detail-item">
                    <strong>Gudang</strong>
                    <span>{getNamaById(gudangList, detailItem.gudang_id, "nama_gudang")}</span>
                  </div>
                  <div className="pembelian-bahan-detail-item">
                    <strong>Tanggal Diterima</strong>
                    <span>{detailItem.tanggal_kirim}</span>
                  </div>
                  <div className="pembelian-bahan-detail-item">
                    <strong>No. Surat Jalan</strong>
                    <span>{detailItem.no_surat_jalan || "-"}</span>
                  </div>
                  <div className="pembelian-bahan-detail-item">
                    <strong>Gramasi</strong>
                    <span>{detailItem.gramasi}</span>
                  </div>
                  <div className="pembelian-bahan-detail-item">
                    <strong>Lebar Kain</strong>
                    <span>{detailItem.lebar_kain || "-"}</span>
                  </div>
                </div>
                {detailItem.foto_surat_jalan && (
                  <div className="pembelian-bahan-detail-item">
                    <strong>Surat Jalan</strong>
                    <span>
                      <a href={detailItem.foto_surat_jalan.startsWith("http") ? detailItem.foto_surat_jalan : `http://localhost:8000/storage/${detailItem.foto_surat_jalan}`} target="_blank" rel="noreferrer" style={{ color: "#17457c" }}>
                        {detailItem.no_surat_jalan || "Lihat Surat Jalan"}
                      </a>
                    </span>
                  </div>
                )}

                <h3>Warna & Rol</h3>
                {detailItem.warna && detailItem.warna.length > 0 ? (
                  detailItem.warna.map((w, wi) => (
                    <div key={wi} className="pembelian-bahan-warna-card">
                      <div style={{ marginBottom: "12px" }}>
                        <strong style={{ color: "#17457c" }}>Warna:</strong> {w.warna || w.nama || "-"}
                      </div>
                      <div style={{ marginBottom: "12px" }}>
                        <strong style={{ color: "#17457c" }}>Jumlah Rol:</strong> {w.jumlah_rol || (w.rol ? w.rol.length : 0)}
                      </div>
                      <div>
                        <strong style={{ color: "#17457c" }}>Berat Rol:</strong>
                        {w.rol && w.rol.length > 0 ? (
                          <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                            {w.rol.map((r, ri) => (
                              <li key={ri} style={{ marginBottom: "4px" }}>
                                Rol {ri + 1}: {r.berat !== null && r.berat !== undefined ? `${r.berat} kg` : typeof r === "number" ? `${r} kg` : "-"}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div style={{ marginTop: "8px", color: "#666" }}>Tidak ada data rol</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "#666", textAlign: "center", padding: "20px" }}>Tidak ada data warna</div>
                )}

                {/* Return/Refund History */}
                <h3 style={{ marginTop: "24px", marginBottom: "12px" }}>History Return/Refund</h3>
                {detailItem.returns && (
                  <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#f0f9ff", borderRadius: "8px" }}>
                    <div style={{ fontSize: "14px", marginBottom: "4px" }}>
                      <strong>Total Return:</strong> {detailItem.returns.total_return || 0} kali
                    </div>
                    <div style={{ fontSize: "14px", marginBottom: "4px" }}>
                      <strong>Total Refund:</strong> {formatRupiah(detailItem.returns.total_refund || 0)}
                    </div>
                    <div style={{ fontSize: "14px" }}>
                      <strong>Return Barang:</strong> {detailItem.returns.total_return_barang || 0} kali
                    </div>
                  </div>
                )}
                {returnHistory && returnHistory.length > 0 ? (
                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {returnHistory.map((ret, idx) => (
                      <div key={idx} style={{ marginBottom: "12px", padding: "12px", border: "1px solid #e5e7eb", borderRadius: "8px", backgroundColor: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
                          <div>
                            <strong style={{ color: "#17457c" }}>
                              {ret.tipe_return === "refund" ? "Refund" : "Return Barang"}
                            </strong>
                            <span style={{ marginLeft: "8px", fontSize: "12px", color: "#666" }}>
                              {new Date(ret.tanggal_return).toLocaleDateString("id-ID")}
                            </span>
                          </div>
                          <span className={`pembelian-bahan-badge ${ret.status?.toLowerCase()}`}>
                            {ret.status || "pending"}
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", marginBottom: "4px" }}>
                          <strong>Jumlah Rol:</strong> {ret.jumlah_rol}
                        </div>
                        {ret.total_refund && (
                          <div style={{ fontSize: "13px", marginBottom: "4px" }}>
                            <strong>Total Refund:</strong> {formatRupiah(ret.total_refund)}
                          </div>
                        )}
                        {ret.keterangan && (
                          <div style={{ fontSize: "13px", marginBottom: "4px", color: "#666" }}>
                            <strong>Keterangan:</strong> {ret.keterangan}
                          </div>
                        )}
                        {ret.foto_bukti && (
                          <div style={{ marginTop: "8px", marginBottom: "8px" }}>
                            <a
                              href={ret.foto_bukti.startsWith("http") ? ret.foto_bukti : `http://localhost:8000/storage/${ret.foto_bukti}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#17457c", fontSize: "12px" }}
                            >
                              Lihat Foto Bukti
                            </a>
                          </div>
                        )}
                        {/* Update Status - hanya tampilkan jika status masih pending */}
                        {ret.status === "pending" && (
                          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                            <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                              <strong>Update Status:</strong>
                            </div>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button
                                onClick={() => handleUpdateReturnStatus(ret.id, "approved")}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "12px",
                                  backgroundColor: "#10b981",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer"
                                }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateReturnStatus(ret.id, "rejected")}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "12px",
                                  backgroundColor: "#ef4444",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer"
                                }}
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleUpdateReturnStatus(ret.id, "completed")}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "12px",
                                  backgroundColor: "#3b82f6",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer"
                                }}
                              >
                                Complete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#666", textAlign: "center", padding: "20px" }}>Belum ada history return/refund</div>
                )}
              </>
            ) : (
              <p className="pembelian-bahan-loading">Memuat detail...</p>
            )}
            <div className="pembelian-bahan-form-actions">
              {detailItem && (
                <button
                  type="button"
                  className="pembelian-bahan-btn"
                  style={{ backgroundColor: "#f59e0b", color: "white", marginRight: "8px" }}
                  onClick={() => handleOpenReturnForm(detailItem)}
                >
                  <FaUndo style={{ marginRight: "4px" }} />
                  Return/Refund
                </button>
              )}
              <button
                type="button"
                className="pembelian-bahan-btn pembelian-bahan-btn-secondary"
                onClick={() => {
                  setShowDetail(false);
                  setDetailItem(null);
                  setReturnHistory([]);
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {showEditForm && (
        <div className="pembelian-bahan-modal">
          <div className="pembelian-bahan-modal-content">
            <h2>Edit Pembelian Bahan</h2>
            <form onSubmit={handleFormUpdate} className="pembelian-bahan-form">
              <div className="pembelian-bahan-form-row">
                <div className="pembelian-bahan-form-group">
                  <label>Keterangan</label>
                  <select name="keterangan" value={editItem.keterangan} onChange={handleInputChange} required>
                    <option value="">Pilih Keterangan</option>
                    <option value="Utuh">Utuh</option>
                    <option value="Sisa">Sisa</option>
                  </select>
                </div>
                <div className="pembelian-bahan-form-group">
                  <label>Bahan</label>
                  <select name="bahan_id" value={editItem.bahan_id} onChange={handleInputChange} required>
                    <option value="">Pilih Bahan</option>
                    {bahanList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nama_bahan} ({b.satuan})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pembelian-bahan-form-row">
                <div className="pembelian-bahan-form-group">
                  <label>Harga (Rp)</label>
                  <input type="text" name="harga" value={editItem.harga} onChange={handleInputChange} required placeholder="Contoh: 50.000" />
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="checkbox" id="ppn-checkbox-edit" checked={usePPNEdit} onChange={(e) => setUsePPNEdit(e.target.checked)} style={{ width: "18px", height: "18px", cursor: "pointer" }} />
                    <label htmlFor="ppn-checkbox-edit" style={{ cursor: "pointer", fontSize: "14px", color: "#555", fontWeight: "normal" }}>
                      Gunakan PPN (11%)
                    </label>
                  </div>
                  {usePPNEdit && editItem.harga && (
                    <div style={{ marginTop: "8px", padding: "8px 12px", backgroundColor: "#e3f2fd", borderRadius: "6px", fontSize: "13px", color: "#17457c" }}>
                      <strong>Harga Setelah PPN:</strong> {formatRupiah(calculateHargaWithPPN(parseFloat(unformatRupiah(editItem.harga)) || 0))}
                    </div>
                  )}
                </div>
                <div className="pembelian-bahan-form-group">
                  <label>SKU</label>
                  <input type="text" name="sku" value={editItem.sku} onChange={handleInputChange} placeholder="Masukkan SKU (opsional)" />
                </div>
              </div>

              <div className="pembelian-bahan-form-row">
                <div className="pembelian-bahan-form-group">
                  <label>Pabrik</label>
                  <select name="pabrik_id" value={editItem.pabrik_id} onChange={handleInputChange} required>
                    <option value="">Pilih Pabrik</option>
                    {pabrikList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama_pabrik || p.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pembelian-bahan-form-group">
                  <label>Gudang</label>
                  <select name="gudang_id" value={editItem.gudang_id} onChange={handleInputChange} required>
                    <option value="">Pilih Gudang</option>
                    {gudangList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama_gudang || g.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pembelian-bahan-form-row">
                <div className="pembelian-bahan-form-group">
                  <label>Tanggal Diterima</label>
                  <input type="date" name="tanggal_kirim" value={editItem.tanggal_kirim} onChange={handleInputChange} required />
                </div>
                <div className="pembelian-bahan-form-group">
                  <label>No. Surat Jalan</label>
                  <input type="text" name="no_surat_jalan" value={editItem.no_surat_jalan} onChange={handleInputChange} className={noSuratJalanError ? "error" : ""} />
                  {noSuratJalanError && <span style={{ color: "#dc3545", fontSize: "12px", display: "block", marginTop: "4px" }}>{noSuratJalanError}</span>}
                </div>
              </div>

              <div className="pembelian-bahan-form-group">
                <label>Foto Surat Jalan (jpg/png/pdf)</label>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
                {editItem.id && !editItem.foto_surat_jalan && <p style={{ fontSize: "12px", color: "#666" }}>Pilih file baru untuk mengganti</p>}
              </div>

              <div className="pembelian-bahan-form-row">
                <div className="pembelian-bahan-form-group">
                  <label>Gramasi</label>
                  <input type="number" name="gramasi" value={editItem.gramasi} onChange={handleInputChange} required />
                </div>
                <div className="pembelian-bahan-form-group">
                  <label>Lebar Kain</label>
                  <input type="number" name="lebar_kain" value={editItem.lebar_kain} onChange={handleInputChange} required />
                </div>
              </div>

              <h3>Warna & Rol</h3>
              {editItem.warna.map((w, wi) => (
                <div key={wi} className="pembelian-bahan-warna-section">
                  <div className="pembelian-bahan-warna-header">
                    <h4>Warna {wi + 1}</h4>
                    <button type="button" className="pembelian-bahan-btn pembelian-bahan-btn-danger" onClick={() => removeWarnaEdit(wi)}>
                      Hapus Warna
                    </button>
                  </div>
                  <div className="pembelian-bahan-form-group">
                    <label>Pilih Warna</label>
                    <select
                      value={w.isCustom ? "Lainnya" : w.nama}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "Lainnya") {
                          handleWarnaFieldChangeEdit(wi, "isCustom", true);
                          handleWarnaFieldChangeEdit(wi, "nama", "");
                        } else {
                          handleWarnaFieldChangeEdit(wi, "isCustom", false);
                          handleWarnaFieldChangeEdit(wi, "nama", value);
                          handleWarnaFieldChangeEdit(wi, "customNama", "");
                        }
                      }}
                      required
                    >
                      <option value="">Pilih Warna</option>
                      {WARNA_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {w.isCustom && <input type="text" placeholder="Masukkan warna lain..." value={w.customNama || ""} onChange={(e) => handleWarnaFieldChangeEdit(wi, "customNama", e.target.value)} style={{ marginTop: 8 }} required />}
                  </div>
                  <div className="pembelian-bahan-form-group">
                    <label>Jumlah Rol: {w.rol.length}</label>
                  </div>
                  <div>
                    {w.rol.map((berat, ri) => (
                      <div key={ri} className="pembelian-bahan-rol-item">
                        <label>Berat {ri + 1} (kg)</label>
                        <input type="number" placeholder={`Berat ${ri + 1} (kg)`} value={berat} onChange={(e) => handleRolChangeEdit(wi, ri, e.target.value)} />
                        <button type="button" className="pembelian-bahan-btn pembelian-bahan-btn-danger" onClick={() => removeRolEdit(wi, ri)}>
                          Hapus
                        </button>
                      </div>
                    ))}
                    <button type="button" className="pembelian-bahan-btn pembelian-bahan-btn-primary" onClick={() => addRolEdit(wi)}>
                      <FaPlus /> Tambah Rol
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <button type="button" className="pembelian-bahan-btn pembelian-bahan-btn-success" onClick={addWarnaEdit}>
                  <FaPlus /> Tambah Warna
                </button>
              </div>

              {/* Total Jumlah Rol dan Total Harga */}
              <div className="pembelian-bahan-total-section" style={{ marginTop: "30px", marginBottom: "20px", padding: "20px", backgroundColor: "#f8f9fa", borderRadius: "10px", border: "2px solid #b3d9f2" }}>
                <div className="pembelian-bahan-form-row">
                  <div className="pembelian-bahan-form-group">
                    <label style={{ fontWeight: "bold", fontSize: "16px", color: "#17457c" }}>Total Jumlah Roll</label>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "#17457c", padding: "10px", backgroundColor: "white", borderRadius: "8px", textAlign: "center" }}>{calculateTotalRoll(editItem.warna)}</div>
                  </div>
                  <div className="pembelian-bahan-form-group">
                    <label style={{ fontWeight: "bold", fontSize: "16px", color: "#17457c" }}>Total Berat</label>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#17457c", padding: "10px", backgroundColor: "white", borderRadius: "8px", textAlign: "center" }}>
                      {calculateTotalBerat(editItem.warna).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {getSatuanBahan(editItem.bahan_id) === "kg" ? "kg" : "yard"}
                    </div>
                  </div>
                  <div className="pembelian-bahan-form-group" style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontWeight: "bold", fontSize: "16px", color: "#17457c" }}>Total Harga (Rp)</label>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "#17457c", padding: "10px", backgroundColor: "white", borderRadius: "8px", textAlign: "center" }}>
                      {formatRupiah(calculateTotalHarga(editItem.bahan_id, editItem.warna))}
                    </div>
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#666", textAlign: "center" }}>
                      (Harga = {formatRupiah(getHargaBahan(editItem.bahan_id))} × {calculateTotalBerat(editItem.warna).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                      {getSatuanBahan(editItem.bahan_id) === "kg" ? "kg" : "yard"})
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "12px", color: "#666", textAlign: "center" }}>(Harga roll tidak termasuk PPN)</div>
                  </div>
                </div>
              </div>

              <div className="pembelian-bahan-form-actions">
                <button type="submit" className="pembelian-bahan-btn pembelian-bahan-btn-primary">
                  Perbarui
                </button>
                <button type="button" className="pembelian-bahan-btn pembelian-bahan-btn-secondary" onClick={() => setShowEditForm(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Scan Barcode */}
      {showScanBarcode && (
        <div className="pembelian-bahan-modal" onClick={handleCloseScanModal}>
          <div className="pembelian-bahan-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="pembelian-bahan-modal-header">
              <h2>Scan Barcode - Update Berat Roll</h2>
              <button className="pembelian-bahan-modal-close" onClick={handleCloseScanModal}>
                <FaTimes />
              </button>
            </div>
            <div className="pembelian-bahan-modal-body">
              <div className="pembelian-bahan-form-group">
                <label>Scan atau Masukkan Barcode:</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={scannedBarcode}
                    onChange={(e) => {
                      setScannedBarcode(e.target.value);
                      setScanError("");
                    }}
                    placeholder="Masukkan barcode atau scan (otomatis mencari)..."
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <button type="button" className="pembelian-bahan-btn pembelian-bahan-btn-primary" onClick={handleScanBarcode} disabled={scanLoading || !scannedBarcode.trim()}>
                    {scanLoading ? "Memproses..." : "Scan"}
                  </button>
                </div>
              </div>

              {scanError && <div style={{ padding: "12px", background: "#fee2e2", color: "#dc2626", borderRadius: "8px", marginBottom: "16px" }}>{scanError}</div>}

              {scannedRoll && (
                <div style={{ marginTop: "24px", padding: "20px", background: "#f0f9ff", borderRadius: "12px", border: "2px solid #0ea5e9" }}>
                  <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#0369a1" }}>Informasi Roll</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                    <div>
                      <strong>Barcode:</strong>
                      <div style={{ fontSize: "18px", fontWeight: "600", color: "#17457c" }}>{scannedRoll.barcode}</div>
                    </div>
                    <div>
                      <strong>Warna:</strong>
                      <div>{scannedRoll.warna || "-"}</div>
                    </div>
                    <div>
                      <strong>Bahan:</strong>
                      <div>{scannedRoll.bahan || "-"}</div>
                    </div>
                    <div>
                      <strong>Pabrik:</strong>
                      <div>{scannedRoll.pabrik || "-"}</div>
                    </div>
                    <div>
                      <strong>Gudang:</strong>
                      <div>{scannedRoll.gudang || "-"}</div>
                    </div>
                    <div>
                      <strong>Berat Saat Ini:</strong>
                      <div style={{ fontSize: "16px", fontWeight: "600", color: scannedRoll.berat === 0 || !scannedRoll.berat ? "#dc2626" : "#059669" }}>
                        {scannedRoll.berat === 0 || !scannedRoll.berat ? "0 (Belum diisi)" : `${scannedRoll.berat} kg`}
                      </div>
                    </div>
                  </div>

                  <div className="pembelian-bahan-form-group" style={{ marginTop: "20px" }}>
                    <label>Masukkan Berat Baru (kg):</label>
                    <input
                      ref={beratInputRef}
                      type="number"
                      value={beratInput}
                      onChange={(e) => {
                        setBeratInput(e.target.value);
                        setScanError("");
                      }}
                      onKeyPress={(e) => {
                        // Auto-submit ketika Enter ditekan di input berat
                        if (e.key === "Enter" && beratInput && parseFloat(beratInput) > 0 && !scanLoading) {
                          handleUpdateBerat();
                        }
                      }}
                      placeholder="Contoh: 25.5"
                      min="0"
                      step="0.01"
                      style={{ fontSize: "16px", padding: "12px" }}
                    />
                  </div>

                  <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
                    <button type="button" className="pembelian-bahan-btn pembelian-bahan-btn-primary" onClick={handleUpdateBerat} disabled={scanLoading || !beratInput || parseFloat(beratInput) <= 0} style={{ flex: 1 }}>
                      {scanLoading ? "Menyimpan..." : "Simpan Berat"}
                    </button>
                    <button
                      type="button"
                      className="pembelian-bahan-btn pembelian-bahan-btn-secondary"
                      onClick={() => {
                        setScannedBarcode("");
                        setScannedRoll(null);
                        setBeratInput("");
                        setScanError("");
                        // Fokus kembali ke input barcode setelah reset
                        setTimeout(() => {
                          const barcodeInput = document.querySelector('input[placeholder*="barcode"]');
                          if (barcodeInput) {
                            barcodeInput.focus();
                          }
                        }, 100);
                      }}
                    >
                      Scan Lagi
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Return/Refund */}
      {showReturnForm && (
        <div className="pembelian-bahan-modal" onClick={() => setShowReturnForm(false)}>
          <div className="pembelian-bahan-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Return/Refund Barang Rusak</h2>
            <form onSubmit={handleSubmitReturn} className="pembelian-bahan-form">
              <div className="pembelian-bahan-form-group">
                <label>Tipe Return *</label>
                <select
                  name="tipe_return"
                  value={returnForm.tipe_return}
                  onChange={handleReturnFormChange}
                  required
                >
                  <option value="refund">Refund (Pengembalian Uang)</option>
                  <option value="return_barang">Return Barang (Pengembalian Barang)</option>
                </select>
              </div>

              <div className="pembelian-bahan-form-group">
                <label>Jumlah Rol *</label>
                <input
                  type="number"
                  name="jumlah_rol"
                  value={returnForm.jumlah_rol}
                  onChange={handleReturnFormChange}
                  min="1"
                  required
                />
              </div>

              {returnForm.tipe_return === "refund" && (
                <div className="pembelian-bahan-form-group">
                  <label>Total Refund (Rp) *</label>
                  <input
                    type="number"
                    name="total_refund"
                    value={returnForm.total_refund}
                    onChange={handleReturnFormChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              )}

              <div className="pembelian-bahan-form-group">
                <label>Tanggal Return *</label>
                <input
                  type="date"
                  name="tanggal_return"
                  value={returnForm.tanggal_return}
                  onChange={handleReturnFormChange}
                  required
                />
              </div>

              <div className="pembelian-bahan-form-group">
                <label>Keterangan</label>
                <textarea
                  name="keterangan"
                  value={returnForm.keterangan}
                  onChange={handleReturnFormChange}
                  rows="3"
                  placeholder="Alasan return/refund..."
                />
              </div>

              <div className="pembelian-bahan-form-group">
                <label>Foto Bukti (Opsional)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReturnFileChange}
                />
                <small style={{ color: "#666", fontSize: "12px" }}>
                  Format: JPG, PNG, atau PDF (Max 5MB)
                </small>
              </div>

              <div className="pembelian-bahan-form-actions">
                <button
                  type="submit"
                  className="pembelian-bahan-btn pembelian-bahan-btn-primary"
                  disabled={loadingReturn}
                >
                  {loadingReturn ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  type="button"
                  className="pembelian-bahan-btn pembelian-bahan-btn-secondary"
                  onClick={() => setShowReturnForm(false)}
                >
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

export default PembelianBahan;

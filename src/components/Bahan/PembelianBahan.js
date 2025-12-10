import React, { useEffect, useState } from "react";
import "./PembelianBahan.css";
import API from "../../api";
import { FaPlus, FaEdit, FaEye, FaDownload, FaShoppingCart } from "react-icons/fa";

const PembelianBahan = () => {
  const [items, setItems] = useState([]);
  const [pabrikList, setPabrikList] = useState([]);
  const [gudangList, setGudangList] = useState([]);
  const [bahanList, setBahanList] = useState([]);
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

  const WARNA_OPTIONS = ["Putih", "Hitam", "Merah", "Biru", "Hijau", "Kuning", "Abu-abu", "Coklat", "Pink", "Ungu", "Orange", "Navy", "Maroon", "Beige", "Khaki", "Lainnya"];

  // Form Tambah
  const [newItem, setNewItem] = useState({
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
        const [resData, resPabrik, resGudang, resBahan] = await Promise.all([API.get("/pembelian-bahan"), API.get("/pabrik"), API.get("/gudang"), API.get("/bahan")]);

        let dataBahan = Array.isArray(resData.data) ? resData.data : resData.data?.data || [];
        dataBahan = dataBahan.sort((a, b) => b.id - a.id);

        setItems(dataBahan);
        setPabrikList(resPabrik.data || []);
        setGudangList(resGudang.data || []);
        setBahanList(resBahan.data || []);

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
    const satuanBahan = getSatuanBahan(bahanId);
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

  const addWarna = () => {
    setNewItem((prev) => ({
      ...prev,
      warna: [...prev.warna, { nama: "", jumlah_rol: 1, rol: [0], isCustom: false, customNama: "" }],
    }));
  };

  const removeWarna = (index) => {
    setNewItem((prev) => ({
      ...prev,
      warna: prev.warna.filter((_, i) => i !== index),
    }));
  };

  const handleWarnaFieldChange = (index, key, value) => {
    setNewItem((prev) => {
      const warna = [...prev.warna];
      warna[index] = { ...warna[index], [key]: value };
      return { ...prev, warna };
    });
  };

  const addRol = (warnaIndex) => {
    setNewItem((prev) => {
      const warna = [...prev.warna];
      warna[warnaIndex].rol = [...warna[warnaIndex].rol, 0];
      warna[warnaIndex].jumlah_rol = warna[warnaIndex].rol.length;
      return { ...prev, warna };
    });
  };

  const removeRol = (warnaIndex, rolIndex) => {
    setNewItem((prev) => {
      const warna = [...prev.warna];
      warna[warnaIndex].rol = warna[warnaIndex].rol.filter((_, i) => i !== rolIndex);
      warna[warnaIndex].jumlah_rol = warna[warnaIndex].rol.length;
      return { ...prev, warna };
    });
  };

  const handleRolChange = (warnaIndex, rolIndex, value) => {
    setNewItem((prev) => {
      const warna = [...prev.warna];
      const arr = [...warna[warnaIndex].rol];
      arr[rolIndex] = value;
      warna[warnaIndex].rol = arr;
      warna[warnaIndex].jumlah_rol = arr.length;
      return { ...prev, warna };
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
      formData.append("keterangan", newItem.keterangan || "");
      formData.append("gudang_id", newItem.gudang_id);
      formData.append("pabrik_id", newItem.pabrik_id);
      formData.append("tanggal_kirim", newItem.tanggal_kirim);
      if (newItem.no_surat_jalan) formData.append("no_surat_jalan", newItem.no_surat_jalan);
      if (newItem.foto_surat_jalan) formData.append("foto_surat_jalan", newItem.foto_surat_jalan);
      formData.append("bahan_id", newItem.bahan_id);
      formData.append("gramasi", newItem.gramasi || "");
      formData.append("lebar_kain", newItem.lebar_kain || "");
      formData.append("sku", newItem.sku || "");
      // Hitung harga yang akan dikirim ke DB
      // Unformat rupiah ke angka, lalu jika PPN dicentang tambahkan 11%
      const hargaInput = parseFloat(unformatRupiah(newItem.harga)) || 0;
      const hargaForDB = usePPN ? calculateHargaWithPPN(hargaInput) : hargaInput;
      formData.append("harga", hargaForDB.toString());
      newItem.warna.forEach((w, i) => {
        const namaWarna = w.isCustom ? w.customNama || "" : w.nama || "";
        formData.append(`warna[${i}][nama]`, namaWarna);
        formData.append(`warna[${i}][jumlah_rol]`, w.jumlah_rol || w.rol.length);
        w.rol.forEach((berat, j) => {
          formData.append(`warna[${i}][rol][${j}]`, berat);
        });
      });

      const response = await API.post("/pembelian-bahan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || response.data;
      setItems((prev) => [data, ...prev]);
      resetForm();
      setNoSuratJalanError("");
      alert("Pembelian bahan berhasil ditambahkan!");
    } catch (error) {
      if (error.response?.data?.errors?.no_surat_jalan) {
        setNoSuratJalanError(error.response.data.errors.no_surat_jalan[0] || "Nomor surat jalan sudah digunakan.");
        alert("Nomor surat jalan sudah digunakan. Silakan gunakan nomor lain.");
      } else {
        alert(error.response?.data?.message || "Gagal menambah pembelian bahan.");
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
      formData.append("gudang_id", editItem.gudang_id);
      formData.append("pabrik_id", editItem.pabrik_id);
      formData.append("tanggal_kirim", editItem.tanggal_kirim);
      formData.append("bahan_id", editItem.bahan_id);
      formData.append("gramasi", editItem.gramasi || "");
      formData.append("lebar_kain", editItem.lebar_kain || "");
      formData.append("sku", editItem.sku || "");
      // Hitung harga yang akan dikirim ke DB
      // Unformat rupiah ke angka, lalu jika PPN dicentang tambahkan 11%
      const hargaInput = parseFloat(unformatRupiah(editItem.harga)) || 0;
      const hargaForDB = usePPNEdit ? calculateHargaWithPPN(hargaInput) : hargaInput;
      formData.append("harga", hargaForDB.toString());
      if (editItem.no_surat_jalan) formData.append("no_surat_jalan", editItem.no_surat_jalan);
      if (editItem.foto_surat_jalan) {
        formData.append("foto_surat_jalan", editItem.foto_surat_jalan);
      }

      editItem.warna.forEach((w, i) => {
        const namaWarna = w.isCustom ? w.customNama || "" : w.nama || "";
        formData.append(`warna[${i}][nama]`, namaWarna);
        formData.append(`warna[${i}][jumlah_rol]`, w.jumlah_rol || w.rol.length);
        w.rol.forEach((berat, j) => {
          formData.append(`warna[${i}][rol][${j}]`, berat);
        });
      });

      const response = await API.post(`/pembelian-bahan/${editItem.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        params: { _method: "PUT" },
      });

      const updatedData = response.data.data || response.data;
      setItems((prev) => prev.map((b) => (b.id === editItem.id ? updatedData : b)));
      resetForm();
      setNoSuratJalanError("");
      alert("Pembelian bahan berhasil diperbarui!");
    } catch (error) {
      console.error("Update error:", error);
      if (error.response?.data?.errors?.no_surat_jalan) {
        setNoSuratJalanError(error.response.data.errors.no_surat_jalan[0] || "Nomor surat jalan sudah digunakan.");
        alert("Nomor surat jalan sudah digunakan. Silakan gunakan nomor lain.");
      } else {
        alert(error.response?.data?.message || (error.response?.data?.errors && Object.values(error.response.data.errors).flat().join(", ")) || "Gagal memperbarui pembelian bahan.");
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
    } catch (e) {
      setDetailItem(item);
    } finally {
      setShowDetail(true);
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
          <button className="pembelian-bahan-btn-add" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah Pembelian
          </button>
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
                  <th>Keterangan</th>
                  <th>Nama Bahan</th>
                  <th>Satuan</th>
                  <th>Harga</th>
                  <th>SKU</th>
                  <th>Gudang</th>
                  <th>Pabrik</th>
                  <th>Tanggal Diterima</th>
                  <th>Gramasi</th>
                  <th>Barcode</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((b, index) => (
                  <tr key={b.id}>
                    <td>{indexOfFirstItem + index + 1}</td>
                    <td>
                      <span className={`pembelian-bahan-badge ${b.keterangan?.toLowerCase()}`}>{b.keterangan}</span>
                    </td>
                    <td>{getNamaById(bahanList, b.bahan_id, "nama_bahan")}</td>
                    <td>{getNamaById(bahanList, b.bahan_id, "satuan")}</td>
                    <td className="pembelian-bahan-price">{formatRupiah(b.harga)}</td>
                    <td>{b.sku || "-"}</td>
                    <td>{getNamaById(gudangList, b.gudang_id, "nama_gudang")}</td>
                    <td>{getNamaById(pabrikList, b.pabrik_id, "nama_pabrik")}</td>
                    <td>{b.tanggal_kirim}</td>
                    <td>{b.gramasi}</td>
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
                  <label>Keterangan</label>
                  <select name="keterangan" value={newItem.keterangan} onChange={handleInputChange} required>
                    <option value="">Pilih Keterangan</option>
                    <option value="Utuh">Utuh</option>
                    <option value="Sisa">Sisa</option>
                  </select>
                </div>
                <div className="pembelian-bahan-form-group">
                  <label>Bahan</label>
                  <select name="bahan_id" value={newItem.bahan_id} onChange={handleInputChange} required>
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
                <div className="pembelian-bahan-form-group">
                  <label>SKU</label>
                  <input type="text" name="sku" value={newItem.sku} onChange={handleInputChange} placeholder="Masukkan SKU (opsional)" />
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

              <h3>Warna & Rol</h3>
              {newItem.warna.map((w, wi) => (
                <div key={wi} className="pembelian-bahan-warna-section">
                  <div className="pembelian-bahan-warna-header">
                    <h4>Warna {wi + 1}</h4>
                    <button type="button" className="pembelian-bahan-btn pembelian-bahan-btn-danger" onClick={() => removeWarna(wi)}>
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
                          handleWarnaFieldChange(wi, "isCustom", true);
                          handleWarnaFieldChange(wi, "nama", "");
                        } else {
                          handleWarnaFieldChange(wi, "isCustom", false);
                          handleWarnaFieldChange(wi, "nama", value);
                          handleWarnaFieldChange(wi, "customNama", "");
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
                    {w.isCustom && <input type="text" placeholder="Masukkan warna lain..." value={w.customNama || ""} onChange={(e) => handleWarnaFieldChange(wi, "customNama", e.target.value)} style={{ marginTop: 8 }} required />}
                  </div>
                  <div className="pembelian-bahan-form-group">
                    <label>Jumlah Rol: {w.rol.length}</label>
                  </div>
                  <div>
                    {w.rol.map((berat, ri) => (
                      <div key={ri} className="pembelian-bahan-rol-item">
                        <label>Berat / Panjang {ri + 1} (kg / yard)</label>
                        <input type="number" placeholder={`Berat ${ri + 1} (kg)`} value={berat} onChange={(e) => handleRolChange(wi, ri, e.target.value)} />
                        <button type="button" className="pembelian-bahan-btn pembelian-bahan-btn-danger" onClick={() => removeRol(wi, ri)}>
                          Hapus
                        </button>
                      </div>
                    ))}
                    <button type="button" className="pembelian-bahan-btn pembelian-bahan-btn-primary" onClick={() => addRol(wi)}>
                      <FaPlus /> Tambah Rol
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <button type="button" className="pembelian-bahan-btn pembelian-bahan-btn-success" onClick={addWarna}>
                  <FaPlus /> Tambah Warna
                </button>
              </div>

              {/* Total Jumlah Rol dan Total Harga */}
              <div className="pembelian-bahan-total-section" style={{ marginTop: "30px", marginBottom: "20px", padding: "20px", backgroundColor: "#f8f9fa", borderRadius: "10px", border: "2px solid #b3d9f2" }}>
                <div className="pembelian-bahan-form-row">
                  <div className="pembelian-bahan-form-group">
                    <label style={{ fontWeight: "bold", fontSize: "16px", color: "#17457c" }}>Total Jumlah Roll</label>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "#17457c", padding: "10px", backgroundColor: "white", borderRadius: "8px", textAlign: "center" }}>{calculateTotalRoll(newItem.warna)}</div>
                  </div>
                  <div className="pembelian-bahan-form-group">
                    <label style={{ fontWeight: "bold", fontSize: "16px", color: "#17457c" }}>Total Harga (Rp)</label>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "#17457c", padding: "10px", backgroundColor: "white", borderRadius: "8px", textAlign: "center" }}>
                      {formatRupiah(calculateTotalHarga(newItem.bahan_id, newItem.warna))}
                    </div>
                  </div>
                </div>
              </div>

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
                  <div className="pembelian-bahan-detail-item">
                    <strong>SKU</strong>
                    <span>{detailItem.sku || "-"}</span>
                  </div>
                  <div className="pembelian-bahan-detail-item">
                    <strong>Pabrik</strong>
                    <span>{getNamaById(pabrikList, detailItem.pabrik_id, "nama_pabrik")}</span>
                  </div>
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
              </>
            ) : (
              <p className="pembelian-bahan-loading">Memuat detail...</p>
            )}
            <div className="pembelian-bahan-form-actions">
              <button
                type="button"
                className="pembelian-bahan-btn pembelian-bahan-btn-secondary"
                onClick={() => {
                  setShowDetail(false);
                  setDetailItem(null);
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
    </div>
  );
};

export default PembelianBahan;

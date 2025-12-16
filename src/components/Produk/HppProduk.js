import React, { useEffect, useState } from "react";
import "./HppProduk.css";
import API from "../../api";
import { FaInfoCircle, FaPlus, FaEdit, FaTimes, FaFilePdf } from "react-icons/fa";

const HppProduk = () => {
  const [produks, setProduks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCustomJenis, setShowCustomJenis] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedProduk, setSelectedProduk] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editKomponenList, setEditKomponenList] = useState([]);
  const [bahanList, setBahanList] = useState([]);
  const [aksesorisList, setAksesorisList] = useState([]);
  const [newProduk, setNewProduk] = useState({
    nama_produk: "",
    kategori_produk: "",
    jenis_produk: "",
    gambar_produk: null,
    status_produk: "sementara",
    harga_jasa_cutting: "",
    harga_jasa_cmt: "",
    harga_jasa_aksesoris: "",
    harga_overhead: "",
  });
  const [editProduk, setEditProduk] = useState({
    id: "",
    nama_produk: "",
    kategori_produk: "",
    jenis_produk: "",
    gambar_produk: null,
    status_produk: "",
    harga_jasa_cutting: "",
    harga_jasa_cmt: "",
    harga_jasa_aksesoris: "",
    harga_overhead: "",
  });
  const [komponenList, setKomponenList] = useState([
    {
      jenis_komponen: "",
      sumber_komponen: "bahan", // akan otomatis jadi "aksesoris" jika jenis_komponen = aksesoris
      bahan_id: "",
      aksesoris_id: "",
      harga_bahan: "",
      jumlah_bahan: "",
    },
  ]);
  const addKomponen = () => {
    setKomponenList([
      ...komponenList,
      {
        jenis_komponen: "",
        sumber_komponen: "bahan", // diset otomatis sesuai jenis_komponen
        bahan_id: "",
        aksesoris_id: "",
        harga_bahan: "",
        jumlah_bahan: "",
        satuan_bahan: "",
      },
    ]);
  };

  const fetchAksesoris = async () => {
    try {
      const res = await API.get("/aksesoris");
      setAksesorisList(res.data.data || res.data);
    } catch (err) {
      console.error("Gagal fetch aksesoris", err);
    }
  };

  useEffect(() => {
    fetchAksesoris();
  }, []);

  useEffect(() => {
    const fetchProduks = async () => {
      try {
        setLoading(true);
        const response = await API.get(`/produk`, {
          params: {
            kategori_produk: selectedKategori || "",
            status_produk: selectedStatus || "",
            search: searchTerm || "",
            page: currentPage,
            per_page: 7,
          },
        });
        setProduks(response.data.data || []);
        setCurrentPage(response.data.current_page || 1);
        setLastPage(response.data.last_page || 1);
        setTotal(response.data.total || 0);
      } catch (error) {
        setError("Gagal mengambil data produk.");
      } finally {
        setLoading(false);
      }
    };

    const fetchBahans = async () => {
      try {
        const res = await API.get("/bahan");
        setBahanList(res.data.data || res.data);
      } catch (err) {
        console.error("Gagal fetch bahan:", err);
      }
    };

    fetchBahans();
    fetchProduks();
  }, [selectedKategori, selectedStatus, searchTerm, currentPage]);

  // Reset ke page 1 ketika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKategori, selectedStatus, searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();

    // ===== DATA PRODUK =====
    formData.append("nama_produk", newProduk.nama_produk);
    formData.append("kategori_produk", newProduk.kategori_produk);
    formData.append("jenis_produk", newProduk.jenis_produk);
    formData.append("harga_jasa_cutting", newProduk.harga_jasa_cutting || 0);
    formData.append("harga_jasa_cmt", newProduk.harga_jasa_cmt || 0);
    formData.append("harga_jasa_aksesoris", newProduk.harga_jasa_aksesoris || 0);
    formData.append("harga_overhead", newProduk.harga_overhead || 0);

    if (newProduk.gambar_produk) {
      formData.append("gambar_produk", newProduk.gambar_produk);
    }

    // ===== KOMponen =====
    komponenList.forEach((komp, index) => {
      formData.append(`komponen[${index}][jenis_komponen]`, komp.jenis_komponen);

      formData.append(`komponen[${index}][sumber_komponen]`, komp.sumber_komponen);

      formData.append(`komponen[${index}][jumlah_bahan]`, komp.jumlah_bahan);

      if (komp.sumber_komponen === "bahan") {
        formData.append(`komponen[${index}][bahan_id]`, komp.bahan_id);
      }

      if (komp.sumber_komponen === "aksesoris") {
        formData.append(`komponen[${index}][aksesoris_id]`, komp.aksesoris_id);
      }
    });

    try {
      await API.post("/produk", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Produk berhasil ditambahkan!");

      // Refresh data dengan pagination
      const refreshResponse = await API.get(`/produk`, {
        params: {
          kategori_produk: selectedKategori || "",
          status_produk: selectedStatus || "",
          search: searchTerm || "",
          page: currentPage,
          per_page: 7,
        },
      });
      setProduks(refreshResponse.data.data || []);
      setCurrentPage(refreshResponse.data.current_page || 1);
      setLastPage(refreshResponse.data.last_page || 1);
      setTotal(refreshResponse.data.total || 0);

      // ===== RESET FORM =====
      setNewProduk({
        nama_produk: "",
        kategori_produk: "",
        jenis_produk: "",
        gambar_produk: null,
        harga_jasa_cutting: "",
        harga_jasa_cmt: "",
        harga_jasa_aksesoris: "",
        harga_overhead: "",
      });

      setKomponenList([
        {
          jenis_komponen: "",
          sumber_komponen: "bahan",
          bahan_id: "",
          aksesoris_id: "",
          harga_bahan: "",
          jumlah_bahan: "",
          satuan_bahan: "",
        },
      ]);

      setShowForm(false);
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan produk.");
    }
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("nama_produk", editProduk.nama_produk);
    formData.append("kategori_produk", editProduk.kategori_produk);
    formData.append("jenis_produk", editProduk.jenis_produk);

    formData.append("harga_jasa_cutting", editProduk.harga_jasa_cutting || 0);
    formData.append("harga_jasa_cmt", editProduk.harga_jasa_cmt || 0);
    formData.append("harga_jasa_aksesoris", editProduk.harga_jasa_aksesoris || 0);
    formData.append("harga_overhead", editProduk.harga_overhead || 0);

    formData.append("status_produk", editProduk.status_produk || "Sementara");

    // gambar (jika diganti)
    if (editProduk.gambar_produk instanceof File) {
      formData.append("gambar_produk", editProduk.gambar_produk);
    }

    // komponen
    editKomponenList.forEach((komp, index) => {
      formData.append(`komponen[${index}][jenis_komponen]`, komp.jenis_komponen);

      formData.append(`komponen[${index}][sumber_komponen]`, komp.sumber_komponen);

      if (komp.sumber_komponen === "bahan") {
        formData.append(`komponen[${index}][bahan_id]`, komp.bahan_id);
      }

      if (komp.sumber_komponen === "aksesoris") {
        formData.append(`komponen[${index}][aksesoris_id]`, komp.aksesoris_id);
      }

      formData.append(`komponen[${index}][jumlah_bahan]`, komp.jumlah_bahan);
    });

    // method spoofing Laravel
    formData.append("_method", "PUT");

    try {
      await API.post(`/produk/${editProduk.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Produk berhasil diperbarui!");

      // Refresh data dengan pagination
      const refreshResponse = await API.get(`/produk`, {
        params: {
          kategori_produk: selectedKategori || "",
          status_produk: selectedStatus || "",
          search: searchTerm || "",
          page: currentPage,
          per_page: 7,
        },
      });
      setProduks(refreshResponse.data.data || []);
      setCurrentPage(refreshResponse.data.current_page || 1);
      setLastPage(refreshResponse.data.last_page || 1);
      setTotal(refreshResponse.data.total || 0);

      setShowEditForm(false);
    } catch (error) {
      console.error("Update error:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Terjadi kesalahan saat update produk.");
    }
  };

  const handleKomponenChange = (index, field, value) => {
    const updatedKomponen = [...komponenList];

    if (field === "jenis_komponen") {
      const isAks = value === "aksesoris";
      updatedKomponen[index] = {
        ...updatedKomponen[index],
        jenis_komponen: value,
        sumber_komponen: isAks ? "aksesoris" : "bahan",
        bahan_id: isAks ? "" : updatedKomponen[index].bahan_id,
        aksesoris_id: isAks ? updatedKomponen[index].aksesoris_id : "",
        harga_bahan: "",
        jumlah_bahan: "",
        satuan_bahan: isAks ? "pcs" : "",
      };
    } else {
      updatedKomponen[index][field] = value;
    }

    setKomponenList(updatedKomponen);
  };

  const removeKomponen = (index) => {
    const updatedKomponen = [...komponenList];
    updatedKomponen.splice(index, 1);
    setKomponenList(updatedKomponen);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (showEditForm) {
      setEditProduk((prev) => ({
        ...prev,
        gambar_produk: file,
      }));
    } else {
      setNewProduk((prev) => ({
        ...prev,
        gambar_produk: file,
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Jika untuk newProduk
    setNewProduk((prev) => ({
      ...prev,
      [name]: value, // Menggunakan name dari input untuk mengubah state
    }));

    // Jika untuk editProduk
    setEditProduk((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditClick = (produk) => {
    console.log("Produk yang dipilih untuk diedit:", produk); // Tambahkan log untuk memastikan data yang dikirim

    setEditProduk({
      id: produk.id,
      nama_produk: produk.nama_produk,
      kategori_produk: produk.kategori_produk,
      jenis_produk: produk.jenis_produk,
      status_produk: produk.status_produk ?? "",
      gambar_produk: produk.gambar_produk,
      harga_jasa_cutting: produk.harga_jasa_cutting || "",
      harga_jasa_cmt: produk.harga_jasa_cmt || "",
      harga_jasa_aksesoris: produk.harga_jasa_aksesoris || "",
      harga_overhead: produk.harga_overhead || "",
    });
    setEditKomponenList(
      (produk.komponen || []).map((k) => ({
        jenis_komponen: k.jenis_komponen,
        sumber_komponen: k.sumber_komponen,
        bahan_id: k.bahan_id || "",
        aksesoris_id: k.aksesoris_id || "",
        harga_bahan: k.harga_bahan,
        jumlah_bahan: k.jumlah_bahan,
        satuan_bahan: k.satuan_bahan,
      }))
    );

    setShowEditForm(true);
  };

  const handleCancelEdit = () => {
    setShowEditForm(false);
  };
  const handleJenisChange = (e) => {
    const value = e.target.value;
    if (value === "custom") {
      setShowCustomJenis(true);
      // kosongkan dulu biar input manual ambil alih
      setNewProduk((prev) => ({ ...prev, jenis_produk: "" }));
    } else {
      setShowCustomJenis(false);
      setNewProduk((prev) => ({
        ...prev,
        jenis_produk: value,
        nama_produk: prev.nama_produk?.startsWith(prev.jenis_produk) ? value + " " : value + "",
      }));
    }
  };
  const handleEditKomponenChange = (index, field, value) => {
    setEditKomponenList((prev) => {
      const updated = [...prev];

      if (field === "jenis_komponen") {
        const isAks = value === "aksesoris";
        updated[index] = {
          ...updated[index],
          jenis_komponen: value,
          sumber_komponen: isAks ? "aksesoris" : "bahan",
          bahan_id: isAks ? "" : updated[index].bahan_id,
          aksesoris_id: isAks ? updated[index].aksesoris_id : "",
          harga_bahan: "",
          jumlah_bahan: "",
          satuan_bahan: isAks ? "pcs" : "",
        };
      } else {
        updated[index][field] = value;
      }

      return updated;
    });
  };

  const addEditKomponen = () => {
    setEditKomponenList((prev) => [
      ...prev,
      {
        jenis_komponen: "",
        sumber_komponen: "bahan",
        bahan_id: "",
        aksesoris_id: "",
        jumlah_bahan: "",
      },
    ]);
  };

  const removeEditKomponen = (index) => {
    setEditKomponenList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDetailClick = (produk) => {
    setSelectedProduk(produk);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduk(null);
  };

  const handleDownloadPdf = async (produkId) => {
    try {
      const response = await API.get(`/produk/${produkId}/download-pdf`, {
        responseType: "blob", // Penting untuk download file
      });

      // Buat URL dari blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Ambil nama file dari header atau buat default
      const contentDisposition = response.headers["content-disposition"];
      let fileName = `Produk_${produkId}_${new Date().toISOString().split("T")[0]}.pdf`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Gagal mengunduh PDF. Silakan coba lagi.");
    }
  };

  // Hitung statistik
  const totalUrgent = produks.filter((p) => p.kategori_produk === "Urgent").length;
  const totalFix = produks.filter((p) => p.status_produk === "Fix").length;
  const avgHpp = produks.length > 0 ? produks.reduce((sum, p) => sum + (parseFloat(p.hpp) || 0), 0) / produks.length : 0;

  return (
    <div className="hpp-container">
      <div className="hpp-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <h1>📦 Data Produk</h1>
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: "14px" }}>Kelola data produk dan HPP dengan mudah</p>
          </div>
          {!loading && produks.length > 0 && (
            <div className="hpp-stats">
              <div className="hpp-stat-item">
                <div className="hpp-stat-value">{total}</div>
                <div className="hpp-stat-label">Total Produk</div>
              </div>
              <div className="hpp-stat-item">
                <div className="hpp-stat-value" style={{ color: "#f5576c" }}>
                  {totalUrgent}
                </div>
                <div className="hpp-stat-label">Urgent</div>
              </div>
              <div className="hpp-stat-item">
                <div className="hpp-stat-value" style={{ color: "#28a745" }}>
                  {totalFix}
                </div>
                <div className="hpp-stat-label">Fix</div>
              </div>
              <div className="hpp-stat-item">
                <div className="hpp-stat-value" style={{ color: "#6685eaff" }}>
                  Rp. {avgHpp.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                </div>
                <div className="hpp-stat-label">Rata-rata HPP</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hpp-filter-section">
        <button className="hpp-btn-primary" onClick={() => setShowForm(true)}>
          <FaPlus /> Tambah Produk
        </button>
        <div style={{ flex: 1, minWidth: "250px", position: "relative" }}>
          <input type="text" className="hpp-search-input" placeholder="🔍 Cari nama produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#999",
                fontSize: "18px",
                padding: "4px",
              }}
              title="Hapus pencarian"
            >
              ×
            </button>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <select value={selectedKategori} onChange={(e) => setSelectedKategori(e.target.value)} className="hpp-filter-select">
            <option value="">📊 Semua Status Produk</option>
            <option value="Urgent">🔴 Urgent</option>
            <option value="Normal">🔵 Normal</option>
          </select>
          {selectedKategori && (
            <span className="hpp-filter-badge" onClick={() => setSelectedKategori("")} title="Hapus filter">
              {selectedKategori} ×
            </span>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="hpp-filter-select">
            <option value="">📋 Semua Status HPP</option>
            <option value="sementara">⏳ Sementara</option>
            <option value="fix">✅ Fix</option>
            <option value="bermasalah">⚠️ Bermasalah</option>
          </select>
          {selectedStatus && (
            <span className="hpp-filter-badge" onClick={() => setSelectedStatus("")} title="Hapus filter">
              {selectedStatus === "sementara" ? "Sementara" : selectedStatus === "fix" ? "Fix" : "Bermasalah"} ×
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="hpp-loading">
          <div className="hpp-spinner"></div>
          <div style={{ marginTop: "16px", fontSize: "16px", color: "#667eea", fontWeight: "600" }}>Memuat data produk...</div>
          <div style={{ marginTop: "8px", fontSize: "14px", color: "#999" }}>Mohon tunggu sebentar</div>
        </div>
      ) : error ? (
        <div className="hpp-empty-state">
          <div className="hpp-empty-icon" style={{ fontSize: "64px", marginBottom: "16px" }}>
            ⚠️
          </div>
          <h3 style={{ margin: "0 0 8px 0", color: "#dc3545", fontSize: "20px" }}>Terjadi Kesalahan</h3>
          <p style={{ margin: "0 0 20px 0", color: "#666" }}>{error}</p>
          <button className="hpp-btn-primary" onClick={() => window.location.reload()}>
            Muat Ulang Halaman
          </button>
        </div>
      ) : produks.length === 0 ? (
        <div className="hpp-empty-state">
          <div className="hpp-empty-icon" style={{ fontSize: "64px", marginBottom: "16px" }}>
            📭
          </div>
          <h3 style={{ margin: "0 0 8px 0", color: "#667eea", fontSize: "20px" }}>Belum Ada Data Produk</h3>
          <p style={{ margin: "0 0 8px 0", color: "#666" }}>{searchTerm || selectedKategori || selectedStatus ? "Tidak ada produk yang sesuai dengan filter yang Anda pilih" : "Mulai dengan menambahkan produk pertama Anda"}</p>
          {(searchTerm || selectedKategori || selectedStatus) && (
            <button
              className="hpp-btn-secondary"
              onClick={() => {
                setSearchTerm("");
                setSelectedKategori("");
                setSelectedStatus("");
              }}
              style={{ marginTop: "16px" }}
            >
              Hapus Filter
            </button>
          )}
          {!searchTerm && !selectedKategori && !selectedStatus && (
            <button className="hpp-btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: "16px" }}>
              <FaPlus /> Tambah Produk Pertama
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="hpp-table-wrapper">
            <table className="hpp-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Gambar</th>
                  <th>Nama Produk</th>
                  <th>Jenis Produk</th>
                  <th>Status Produk</th>
                  <th>Status HPP</th>
                  <th>HPP</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {produks.map((produk, index) => {
                  // Hitung nomor berdasarkan pagination
                  const nomor = (currentPage - 1) * 7 + index + 1;
                  return (
                    <tr key={produk.id_produk || produk.id}>
                      <td>
                        <strong>{nomor}</strong>
                      </td>
                      <td>
                        <img
                          src={produk.gambar_produk}
                          alt={produk.nama_produk}
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/60?text=No+Image";
                          }}
                        />
                      </td>
                      <td>
                        <strong>{produk.nama_produk}</strong>
                      </td>
                      <td>{produk.jenis_produk || "-"}</td>
                      <td>{produk.kategori_produk === "Urgent" ? <span className="hpp-status-badge hpp-status-urgent">Urgent</span> : <span className="hpp-status-badge hpp-status-normal">Normal</span>}</td>
                      <td>
                        {produk.status_produk === "Sementara" ? (
                          <span className="hpp-status-badge hpp-status-sementara">Sementara</span>
                        ) : produk.status_produk === "Fix" ? (
                          <span className="hpp-status-badge hpp-status-fix">Fix</span>
                        ) : produk.status_produk === "Bermasalah" ? (
                          <span className="hpp-status-badge hpp-status-bermasalah">Bermasalah</span>
                        ) : (
                          <span className="hpp-status-badge">-</span>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: "#667eea" }}>Rp. {produk.hpp?.toLocaleString("id-ID") || "0"}</strong>
                      </td>
                      <td>
                        <div className="hpp-action-buttons">
                          <button className="hpp-btn-icon" onClick={() => handleEditClick(produk)} title="Edit Produk">
                            <FaEdit />
                          </button>
                          <button className="hpp-btn-icon info" onClick={() => handleDetailClick(produk)} title="Detail Produk">
                            <FaInfoCircle />
                          </button>
                          <button className="hpp-btn-icon" style={{ background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)" }} onClick={() => handleDownloadPdf(produk.id)} title="Download PDF">
                            <FaFilePdf />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="hpp-pagination">
              <button className="hpp-pagination-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} title="Halaman Sebelumnya">
                ← Sebelumnya
              </button>

              <div className="hpp-pagination-info">
                <span>
                  Halaman {currentPage} dari {lastPage}
                </span>
                <span style={{ marginLeft: "12px", color: "#666" }}>(Total: {total} data)</span>
              </div>

              <button className="hpp-pagination-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === lastPage} title="Halaman Selanjutnya">
                Selanjutnya →
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Form Tambah */}
      {showForm && (
        <div className="hpp-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="hpp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="hpp-modal-header">
              <h2>➕ Tambah Produk</h2>
              <button className="hpp-modal-close" onClick={() => setShowForm(false)} type="button">
                <FaTimes />
              </button>
            </div>
            <div className="hpp-modal-body">
              <form onSubmit={handleFormSubmit}>
                {/* Jenis Produk */}
                <div className="hpp-form-group">
                  <label>Jenis Produk</label>
                  <select name="jenis_produk" className="hpp-form-select" value={showCustomJenis ? "custom" : newProduk.jenis_produk} onChange={handleJenisChange}>
                    <option value="">Pilih Jenis Produk</option>
                    <option value="Gamis">Gamis</option>
                    <option value="Kaos">Kaos</option>
                    <option value="Celana">Celana</option>
                    <option value="custom">Lainnya...</option>
                  </select>
                  {showCustomJenis && <input type="text" name="jenis_produk" className="hpp-form-input" style={{ marginTop: "12px" }} placeholder="Masukkan jenis produk baru" value={newProduk.jenis_produk} onChange={handleInputChange} />}
                </div>

                {/* Nama Produk */}
                <div className="hpp-form-group">
                  <label>Nama Produk</label>
                  <input type="text" name="nama_produk" className="hpp-form-input" value={newProduk.nama_produk} onChange={handleInputChange} placeholder="Masukkan nama produk" required />
                </div>

                {/* Gambar Produk */}
                <div className="hpp-form-group">
                  <label>Gambar Produk</label>
                  <input type="file" name="gambar_produk" className="hpp-form-input" onChange={handleFileChange} accept="image/*" />
                  {newProduk.gambar_produk && !(newProduk.gambar_produk instanceof File) && (
                    <div>
                      <p>Gambar Saat Ini:</p>
                      <img src={`${process.env.REACT_APP_API_URL}/storage/${newProduk.gambar_produk}`} alt="Gambar Produk" width="100" />
                    </div>
                  )}
                </div>

                {/* Harga Jasa & Overhead */}
                <div className="hpp-form-group">
                  <label>Harga Jasa Cutting</label>
                  <input type="number" name="harga_jasa_cutting" className="hpp-form-input" value={newProduk.harga_jasa_cutting} onChange={handleInputChange} placeholder="Masukkan harga jasa cutting" />
                </div>

                <div className="hpp-form-group">
                  <label>Harga Jasa CMT</label>
                  <input type="number" name="harga_jasa_cmt" className="hpp-form-input" value={newProduk.harga_jasa_cmt} onChange={handleInputChange} placeholder="Masukkan harga jasa CMT" />
                </div>

                <div className="hpp-form-group">
                  <label>Harga Jasa Aksesoris</label>
                  <input type="number" name="harga_jasa_aksesoris" className="hpp-form-input" value={newProduk.harga_jasa_aksesoris} onChange={handleInputChange} placeholder="Masukkan harga jasa aksesoris" />
                </div>

                <div className="hpp-form-group">
                  <label>Harga Overhead</label>
                  <input type="number" name="harga_overhead" className="hpp-form-input" value={newProduk.harga_overhead} onChange={handleInputChange} placeholder="Masukkan harga overhead" />
                </div>

                <div className="hpp-form-group">
                  <label>Status Produk</label>
                  <select name="kategori_produk" className="hpp-form-select" value={newProduk.kategori_produk} onChange={handleInputChange} required>
                    <option value="">Pilih Status</option>
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                {/* Komponen Produk */}
                <div className="hpp-komponen-section">
                  <h3>🔧 Komponen Produk</h3>

                  {komponenList.map((komp, index) => (
                    <div key={index} className="hpp-komponen-row">
                      {/* Jenis Komponen */}
                      <select value={komp.jenis_komponen} onChange={(e) => handleKomponenChange(index, "jenis_komponen", e.target.value)} required>
                        <option value="">Pilih Jenis Komponen</option>
                        <option value="atasan">Atasan</option>
                        <option value="bawahan">Bawahan</option>
                        <option value="fullbody">Fullbody</option>
                        <option value="aksesoris">Aksesoris</option>
                      </select>

                      {/* PILIH BAHAN */}
                      {komp.sumber_komponen !== "aksesoris" && (
                        <select
                          value={komp.bahan_id}
                          onChange={(e) => {
                            const bahanId = e.target.value;
                            const bahan = bahanList.find((b) => String(b.id) === String(bahanId));
                            handleKomponenChange(index, "bahan_id", bahanId);
                            handleKomponenChange(index, "harga_bahan", bahan?.harga || "");
                            handleKomponenChange(index, "satuan_bahan", bahan?.satuan || "");
                          }}
                          required
                        >
                          <option value="">Pilih Bahan</option>
                          {bahanList.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nama_bahan} — Rp {b.harga} ({b.satuan})
                            </option>
                          ))}
                        </select>
                      )}

                      {/* PILIH AKSESORIS */}
                      {komp.sumber_komponen === "aksesoris" && (
                        <select
                          value={komp.aksesoris_id}
                          onChange={(e) => {
                            const aksId = e.target.value;
                            const aks = aksesorisList.find((a) => String(a.id) === String(aksId));
                            handleKomponenChange(index, "aksesoris_id", aksId);
                            handleKomponenChange(index, "harga_bahan", aks?.harga_per_biji || "");
                            handleKomponenChange(index, "satuan_bahan", "pcs");
                          }}
                          required
                        >
                          <option value="">Pilih Aksesoris</option>
                          {aksesorisList.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nama_aksesoris} — Rp {a.harga_per_biji}/pcs
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Harga (Auto) */}
                      <input type="number" placeholder="Harga" value={komp.harga_bahan} readOnly />

                      {/* Jumlah */}
                      <input type="number" min="0.0001" step="0.0001" placeholder="Jumlah" value={komp.jumlah_bahan} onChange={(e) => handleKomponenChange(index, "jumlah_bahan", e.target.value)} required />

                      {/* Satuan */}
                      <select value={komp.satuan_bahan} disabled={komp.sumber_komponen === "aksesoris"} onChange={(e) => handleKomponenChange(index, "satuan_bahan", e.target.value)}>
                        <option value="">Pilih Satuan</option>
                        <option value="kg">Kg</option>
                        <option value="yard">Yard</option>
                        <option value="gross">Gross</option>
                        <option value="pcs">Pcs</option>
                      </select>

                      {/* Hapus */}
                      <button type="button" className="hpp-komponen-remove-btn" onClick={() => removeKomponen(index)}>
                        🗑️ Hapus
                      </button>
                    </div>
                  ))}

                  <button type="button" className="hpp-komponen-add-btn" onClick={addKomponen}>
                    <FaPlus /> Tambah Komponen
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="hpp-form-actions">
                  <button type="submit" className="hpp-btn-submit">
                    💾 Simpan
                  </button>
                  <button type="button" className="hpp-btn-cancel" onClick={() => setShowForm(false)}>
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Edit */}
      {showEditForm && (
        <div className="hpp-modal-overlay" onClick={handleCancelEdit}>
          <div className="hpp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="hpp-modal-header">
              <h2>✏️ Edit Produk</h2>
              <button className="hpp-modal-close" onClick={handleCancelEdit} type="button">
                <FaTimes />
              </button>
            </div>
            <div className="hpp-modal-body">
              <form onSubmit={handleFormUpdate}>
                <div className="hpp-form-group">
                  <label>Nama Produk</label>
                  <input type="text" name="nama_produk" className="hpp-form-input" value={editProduk.nama_produk} onChange={handleInputChange} placeholder="Nama Produk" />
                </div>

                <div className="hpp-form-group">
                  <label>Kategori Produk</label>
                  <select name="kategori_produk" className="hpp-form-select" value={editProduk.kategori_produk} onChange={handleInputChange}>
                    <option value="">Pilih Status</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>

                <div className="hpp-form-group">
                  <label>Jenis Produk</label>
                  <select name="jenis_produk" className="hpp-form-select" value={editProduk.jenis_produk} onChange={handleInputChange}>
                    <option value="">Pilih Jenis</option>
                    <option value="Gamis">Gamis</option>
                    <option value="Kaos">Kaos</option>
                    <option value="Celana">Celana</option>
                  </select>
                </div>

                <div className="hpp-form-group">
                  <label>Gambar Produk</label>
                  <input type="file" className="hpp-form-input" accept="image/*" onChange={handleFileChange} />
                  {editProduk.gambar_produk && !(editProduk.gambar_produk instanceof File) && (
                    <div className="hpp-form-image-preview">
                      <p style={{ marginBottom: "8px", fontSize: "13px", color: "#666" }}>Gambar Saat Ini:</p>
                      <img src={`${process.env.REACT_APP_API_URL}/storage/${editProduk.gambar_produk}`} alt="Gambar Produk" />
                    </div>
                  )}
                </div>

                {/* Harga Jasa */}
                <div className="hpp-form-group">
                  <label>Harga Jasa Cutting</label>
                  <input type="number" name="harga_jasa_cutting" className="hpp-form-input" value={editProduk.harga_jasa_cutting} onChange={handleInputChange} />
                </div>
                <div className="hpp-form-group">
                  <label>Harga Jasa CMT</label>
                  <input type="number" name="harga_jasa_cmt" className="hpp-form-input" value={editProduk.harga_jasa_cmt} onChange={handleInputChange} />
                </div>
                <div className="hpp-form-group">
                  <label>Harga Jasa Aksesoris</label>
                  <input type="number" name="harga_jasa_aksesoris" className="hpp-form-input" value={editProduk.harga_jasa_aksesoris} onChange={handleInputChange} />
                </div>
                <div className="hpp-form-group">
                  <label>Harga Overhead</label>
                  <input type="number" name="harga_overhead" className="hpp-form-input" value={editProduk.harga_overhead} onChange={handleInputChange} />
                </div>

                {/* Komponen */}
                <div className="hpp-komponen-section">
                  <h3>🔧 Edit Komponen Produk</h3>

                  {editKomponenList.map((komp, index) => (
                    <div key={index} className="hpp-komponen-row">
                      {/* Jenis Komponen */}
                      <select value={komp.jenis_komponen} onChange={(e) => handleEditKomponenChange(index, "jenis_komponen", e.target.value)}>
                        <option value="">Pilih Jenis Komponen</option>
                        <option value="atasan">Atasan</option>
                        <option value="bawahan">Bawahan</option>
                        <option value="fullbody">Fullbody</option>
                        <option value="aksesoris">Aksesoris</option>
                      </select>

                      {/* PILIH BAHAN */}
                      {komp.sumber_komponen !== "aksesoris" && (
                        <select
                          value={komp.bahan_id}
                          onChange={(e) => {
                            const bahan = bahanList.find((b) => String(b.id) === String(e.target.value));
                            handleEditKomponenChange(index, "bahan_id", e.target.value);
                            handleEditKomponenChange(index, "harga_bahan", bahan?.harga || "");
                            handleEditKomponenChange(index, "satuan_bahan", bahan?.satuan || "");
                          }}
                        >
                          <option value="">Pilih Bahan</option>
                          {bahanList.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nama_bahan}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* PILIH AKSESORIS */}
                      {komp.sumber_komponen === "aksesoris" && (
                        <select
                          value={komp.aksesoris_id}
                          onChange={(e) => {
                            const aks = aksesorisList.find((a) => String(a.id) === String(e.target.value));
                            handleEditKomponenChange(index, "aksesoris_id", e.target.value);
                            handleEditKomponenChange(index, "harga_bahan", aks?.harga_per_biji || "");
                            handleEditKomponenChange(index, "satuan_bahan", "pcs");
                          }}
                        >
                          <option value="">Pilih Aksesoris</option>
                          {aksesorisList.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nama_aksesoris}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Harga */}
                      <input type="number" value={komp.harga_bahan} readOnly />

                      {/* Jumlah */}
                      <input type="number" value={komp.jumlah_bahan} onChange={(e) => handleEditKomponenChange(index, "jumlah_bahan", e.target.value)} />

                      {/* Satuan */}
                      <input type="text" value={komp.satuan_bahan} readOnly />

                      <button type="button" className="hpp-komponen-remove-btn" onClick={() => removeEditKomponen(index)}>
                        🗑️ Hapus
                      </button>
                    </div>
                  ))}

                  <button type="button" className="hpp-komponen-add-btn" onClick={addEditKomponen}>
                    <FaPlus /> Tambah Komponen
                  </button>
                </div>

                {/* Status HPP */}
                <div className="hpp-form-group">
                  <label>Status HPP</label>
                  <select name="status_produk" className="hpp-form-select" value={editProduk.status_produk} onChange={handleInputChange}>
                    <option value="">Pilih Status</option>
                    <option value="Sementara">Sementara</option>
                    <option value="Fix">Fix</option>
                    <option value="Bermasalah">Bermasalah</option>
                  </select>
                </div>

                <div className="hpp-form-actions">
                  <button type="submit" className="hpp-btn-submit">
                    💾 Simpan Edit
                  </button>
                  <button type="button" className="hpp-btn-cancel" onClick={handleCancelEdit}>
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {isModalOpen && selectedProduk && (
        <div className="hpp-modal-overlay" onClick={handleCloseModal}>
          <div className="hpp-modal-content hpp-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hpp-modal-header">
              <h3>📋 Detail Produk</h3>
              <button className="hpp-modal-close" onClick={handleCloseModal} type="button">
                <FaTimes />
              </button>
            </div>
            <div className="hpp-detail-body">
              {/* Header info ringkas */}
              <div className="hpp-detail-top">
                <div className="hpp-detail-hero">
                  {selectedProduk.gambar_produk && (
                    <div style={{ marginBottom: "20px", textAlign: "center" }}>
                      <img
                        src={selectedProduk.gambar_produk}
                        alt={selectedProduk.nama_produk}
                        style={{
                          maxWidth: "300px",
                          maxHeight: "300px",
                          width: "auto",
                          height: "auto",
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  )}
                  <div className="hpp-detail-name">{selectedProduk.nama_produk}</div>
                  <div className="hpp-detail-badges">
                    <span className="hpp-badge hpp-badge-primary">{selectedProduk.kategori_produk || "Normal"}</span>
                    <span
                      className={`hpp-badge ${
                        selectedProduk.status_produk === "fix"
                          ? "hpp-badge-success"
                          : selectedProduk.status_produk === "sementara"
                          ? "hpp-badge-warning"
                          : selectedProduk.status_produk === "bermasalah"
                          ? "hpp-badge-danger"
                          : "hpp-badge-muted"
                      }`}
                    >
                      {selectedProduk.status_produk || "Status HPP?"}
                    </span>
                  </div>
                </div>
                <div className="hpp-detail-summary">
                  <div className="hpp-detail-summary-item">
                    <div className="label">ID Produk</div>
                    <div className="value">#{selectedProduk.id}</div>
                  </div>
                  <div className="hpp-detail-summary-item">
                    <div className="label">Jenis Produk</div>
                    <div className="value">{selectedProduk.jenis_produk || "-"}</div>
                  </div>
                  <div className="hpp-detail-summary-item highlight">
                    <div className="label">HPP</div>
                    <div className="value big">Rp. {selectedProduk.hpp?.toLocaleString("id-ID") || "0"}</div>
                  </div>
                </div>
              </div>

              {/* Ringkasan biaya */}
              <div className="hpp-detail-grid">
                <div className="hpp-detail-card">
                  <div className="label">Harga Jasa CMT</div>
                  <div className="value">Rp. {selectedProduk.harga_jasa_cmt?.toLocaleString("id-ID") || "0"}</div>
                </div>
                <div className="hpp-detail-card">
                  <div className="label">Harga Jasa Cutting</div>
                  <div className="value">Rp. {selectedProduk.harga_jasa_cutting?.toLocaleString("id-ID") || "0"}</div>
                </div>
                <div className="hpp-detail-card">
                  <div className="label">Harga Jasa Aksesoris</div>
                  <div className="value">Rp. {selectedProduk.harga_jasa_aksesoris?.toLocaleString("id-ID") || "0"}</div>
                </div>
                <div className="hpp-detail-card">
                  <div className="label">Harga Overhead</div>
                  <div className="value">Rp. {selectedProduk.harga_overhead?.toLocaleString("id-ID") || "0"}</div>
                </div>
                <div className="hpp-detail-card full highlight">
                  <div className="label">Total Harga Komponen</div>
                  <div className="value big">Rp. {selectedProduk.total_komponen?.toLocaleString("id-ID") || "0"}</div>
                </div>
              </div>

              <div className="hpp-detail-section">
                <h4>🔧 Detail Komponen</h4>
                {selectedProduk.komponen && selectedProduk.komponen.length > 0 ? (
                  <table className="hpp-komponen-table">
                    <thead>
                      <tr>
                        <th>Jenis Komponen</th>
                        <th>Nama Bahan/Aksesoris</th>
                        <th>Harga Bahan</th>
                        <th>Jumlah</th>
                        <th>Satuan</th>
                        <th>Total Harga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduk.komponen.map((k, idx) => {
                        const nama = k.nama_bahan || k.nama_aksesoris || k.bahan?.nama_bahan || k.aksesoris?.nama_aksesoris || "-";
                        const satuan = k.satuan_bahan || (k.sumber_komponen === "aksesoris" ? "pcs" : k.bahan?.satuan) || "-";
                        const jumlahFormatted = k.jumlah_bahan !== undefined && k.jumlah_bahan !== null ? Number(k.jumlah_bahan).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : "0";
                        return (
                          <tr key={idx}>
                            <td>
                              <strong>{k.jenis_komponen}</strong>
                            </td>
                            <td>{nama}</td>
                            <td>Rp. {k.harga_bahan?.toLocaleString("id-ID") || "0"}</td>
                            <td>{jumlahFormatted}</td>
                            <td>{satuan}</td>
                            <td>
                              <strong>Rp. {k.total_harga_bahan?.toLocaleString("id-ID") || "0"}</strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="hpp-empty-state">
                    <p>📭 Tidak ada data komponen untuk produk ini.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="hpp-detail-footer">
              <button className="hpp-btn-close" onClick={handleCloseModal}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HppProduk;

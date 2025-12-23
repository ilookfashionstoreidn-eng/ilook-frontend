import React, { useEffect, useState } from "react";
import "./SpkJasa.css";
import API from "../../api";
import { FaTimes, FaPlus } from "react-icons/fa";

const SpkJasa = () => {
  const [spkJasa, setSpkJasa] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tukangList, setTukangList] = useState([]);
  const [distribusiList, setDistribusiList] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [selectedDistribusiId, setSelectedDistribusiId] = useState("");
  const [searchDistribusi, setSearchDistribusi] = useState("");
  const [showDistribusiDropdown, setShowDistribusiDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // all, belum_diambil, sudah_diambil
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 8,
    total: 0,
  });
  const [newSpkJasa, setNewSpkJasa] = useState({
    tukang_jasa_id: "",
    spk_cutting_distribusi_id: "",
    deadline: "",
    harga: "",
    hargaDisplay: "", // Untuk format rupiah di input
    opsi_harga: "pcs",
    tanggal_ambil: "",
    foto: null,
  });

  // Helper function untuk format rupiah
  const formatRupiah = (value) => {
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

  useEffect(() => {
    const fetchSpkJasa = async () => {
      try {
        setLoading(true);
        const response = await API.get(`/SpkJasa?per_page=8&page=${currentPage}`);
        // Handle paginated response
        if (response.data.data) {
          // Paginated response
          setSpkJasa(response.data.data);
          setPagination({
            current_page: response.data.current_page || 1,
            last_page: response.data.last_page || 1,
            per_page: response.data.per_page || 8,
            total: response.data.total || 0,
          });
        } else if (Array.isArray(response.data)) {
          // Non-paginated response (fallback)
          setSpkJasa(response.data);
          setPagination({
            current_page: 1,
            last_page: 1,
            per_page: 8,
            total: response.data.length,
          });
        } else {
          setSpkJasa([]);
        }
      } catch (error) {
        console.error("Error fetching SPK Jasa:", error);
        setError("Gagal mengambil data");
        setSpkJasa([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSpkJasa();
  }, [currentPage]);

  useEffect(() => {
    const fetchTukang = async () => {
      try {
        const response = await API.get("/tukang-jasa");
        const data = Array.isArray(response.data) ? response.data : [];
        setTukangList(data);
      } catch (error) {
        console.error("Gagal mengambil data tukang jasa:", error);
        setTukangList([]);
      }
    };
    fetchTukang();
  }, []);

  useEffect(() => {
    const fetchDistribusi = async () => {
      try {
        const distribusiArray = [];
        let currentPage = 1;
        let hasMorePages = true;
        const hasilCuttingIds = [];

        while (hasMorePages) {
          const response = await API.get(`/hasil_cutting?per_page=100&page=${currentPage}`);

          let hasilCuttingData = [];
          let pagination = null;

          if (response.data && response.data.data) {
            hasilCuttingData = response.data.data;
            pagination = response.data;
          } else if (Array.isArray(response.data)) {
            hasilCuttingData = response.data;
            hasMorePages = false;
          } else {
            hasilCuttingData = [];
            hasMorePages = false;
          }

          if (Array.isArray(hasilCuttingData)) {
            hasilCuttingData.forEach((hasil) => {
              if (hasil.id) {
                hasilCuttingIds.push(hasil.id);
              }
            });
          }

          if (pagination && pagination.current_page && pagination.last_page) {
            hasMorePages = currentPage < pagination.last_page;
            currentPage++;
          } else {
            hasMorePages = false;
          }
        }

        console.log("Total hasil cutting ditemukan:", hasilCuttingIds.length);

        const batchSize = 10;
        for (let i = 0; i < hasilCuttingIds.length; i += batchSize) {
          const batch = hasilCuttingIds.slice(i, i + batchSize);

          const detailPromises = batch.map(async (id) => {
            try {
              const detailResponse = await API.get(`/hasil_cutting/${id}`);
              return detailResponse.data;
            } catch (error) {
              console.error(`Gagal mengambil detail hasil cutting ${id}:`, error);
              return null;
            }
          });

          const detailResults = await Promise.all(detailPromises);

          detailResults.forEach((hasil) => {
            if (hasil && hasil.distribusi_seri && Array.isArray(hasil.distribusi_seri)) {
              hasil.distribusi_seri.forEach((dist) => {
                if (dist.id) {
                  distribusiArray.push({
                    id: dist.id,
                    kode_seri: dist.kode_seri || `Seri ${dist.id}`,
                    jumlah_produk: dist.jumlah_produk || 0,
                    hasil_cutting_id: hasil.id,
                    produk: hasil.spk_cutting?.produk?.nama_produk || hasil.nama_produk || "-",
                  });
                }
              });
            }
          });
        }

        console.log("Total distribusi ditemukan:", distribusiArray.length, distribusiArray);
        setDistribusiList(distribusiArray);
      } catch (error) {
        console.error("Gagal mengambil data distribusi:", error);
        setDistribusiList([]);
      }
    };
    fetchDistribusi();
  }, []);

  useEffect(() => {
    const fetchPreview = async () => {
      if (selectedDistribusiId) {
        try {
          const response = await API.get(`/preview/${selectedDistribusiId}`);
          console.log("Preview data received:", response.data);
          console.log("Jumlah per warna:", response.data.jumlah_per_warna);
          setPreviewData(response.data);
        } catch (error) {
          console.error("Gagal mengambil preview:", error);
          setPreviewData(null);
        }
      } else {
        setPreviewData(null);
      }
    };
    fetchPreview();
  }, [selectedDistribusiId]);

  // Hitung statistik status (dari semua data, perlu fetch semua untuk statistik)
  const [allSpkJasa, setAllSpkJasa] = useState([]);

  useEffect(() => {
    const fetchAllForStats = async () => {
      try {
        const response = await API.get("/SpkJasa?per_page=1000");
        if (response.data.data) {
          setAllSpkJasa(response.data.data);
        } else if (Array.isArray(response.data)) {
          setAllSpkJasa(response.data);
        }
      } catch (error) {
        console.error("Error fetching all data for stats:", error);
      }
    };
    fetchAllForStats();
  }, []);

  const statusStats = {
    belum_diambil: allSpkJasa.filter((item) => item.status_pengambilan === "belum_diambil").length,
    sudah_diambil: allSpkJasa.filter((item) => item.status_pengambilan === "sudah_diambil").length,
    total: allSpkJasa.length,
  };

  // Filter data yang sudah di-paginate berdasarkan search dan status
  const filteredSpkJasa = spkJasa.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      item.id.toString().includes(searchLower) ||
      item.tukangJasa?.nama?.toLowerCase().includes(searchLower) ||
      item.spkCuttingDistribusi?.spkCutting?.produk?.nama_produk?.toLowerCase().includes(searchLower) ||
      item.spkCuttingDistribusi?.kode_seri?.toLowerCase().includes(searchLower);

    // Filter berdasarkan status
    const matchesStatus = statusFilter === "all" || item.status_pengambilan === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Reset ke halaman 1 saat search atau filter berubah
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!newSpkJasa.spk_cutting_distribusi_id) {
      alert("Silakan pilih Distribusi Seri terlebih dahulu");
      return;
    }

    try {
      // Buat FormData untuk handle file upload
      const formData = new FormData();
      formData.append("tukang_jasa_id", newSpkJasa.tukang_jasa_id);
      formData.append("spk_cutting_distribusi_id", newSpkJasa.spk_cutting_distribusi_id);
      formData.append("deadline", newSpkJasa.deadline);
      if (newSpkJasa.harga) formData.append("harga", newSpkJasa.harga);
      if (newSpkJasa.opsi_harga) formData.append("opsi_harga", newSpkJasa.opsi_harga);
      if (newSpkJasa.tanggal_ambil) formData.append("tanggal_ambil", newSpkJasa.tanggal_ambil);
      if (newSpkJasa.foto) formData.append("foto", newSpkJasa.foto);

      if (editingId) {
        // Update mode - Gunakan PUT dengan FormData
        await API.put(`/SpkJasa/${editingId}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        alert("SPK Jasa berhasil diperbarui!");
      } else {
        // Create mode
        await API.post("/SpkJasa", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        alert("SPK Jasa berhasil ditambahkan!");
      }

      const refreshResponse = await API.get(`/SpkJasa?per_page=8&page=${currentPage}`);
      if (refreshResponse.data.data) {
        setSpkJasa(refreshResponse.data.data);
        setPagination({
          current_page: refreshResponse.data.current_page || 1,
          last_page: refreshResponse.data.last_page || 1,
          per_page: refreshResponse.data.per_page || 8,
          total: refreshResponse.data.total || 0,
        });
      } else if (Array.isArray(refreshResponse.data)) {
        setSpkJasa(refreshResponse.data);
      }

      setNewSpkJasa({
        tukang_jasa_id: "",
        spk_cutting_distribusi_id: "",
        deadline: "",
        harga: "",
        hargaDisplay: "",
        opsi_harga: "pcs",
        tanggal_ambil: "",
        foto: null,
      });
      setSelectedDistribusiId("");
      setPreviewData(null);
      setSearchDistribusi("");
      setShowDistribusiDropdown(false);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error("Error:", error);
      // Tampilkan pesan error yang lebih user-friendly
      const errorMessage = error.response?.data?.message || "Terjadi kesalahan saat menyimpan SPK Jasa.";
      alert(errorMessage);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "foto" && files && files[0]) {
      setNewSpkJasa((prev) => ({ ...prev, [name]: files[0] }));
    } else if (name === "harga") {
      // Format rupiah untuk input harga
      const formattedValue = formatRupiah(value);
      const numericValue = parseRupiah(value);
      setNewSpkJasa((prev) => ({
        ...prev,
        harga: numericValue, // Simpan nilai numerik untuk dikirim ke backend
        hargaDisplay: formattedValue, // Simpan format untuk ditampilkan
      }));
    } else {
      setNewSpkJasa((prev) => ({ ...prev, [name]: value }));
    }

    if (name === "spk_cutting_distribusi_id") {
      setSelectedDistribusiId(value);
    }
  };

  const filteredDistribusiList = Array.isArray(distribusiList)
    ? distribusiList.filter((dist) => {
        const searchLower = searchDistribusi.toLowerCase();
        return dist.kode_seri?.toLowerCase().includes(searchLower) || dist.produk?.toLowerCase().includes(searchLower) || dist.id?.toString().includes(searchLower);
      })
    : [];

  const handleDistribusiSelect = (distId) => {
    setNewSpkJasa((prev) => ({ ...prev, spk_cutting_distribusi_id: distId }));
    setSelectedDistribusiId(distId);
    setShowDistribusiDropdown(false);
    setSearchDistribusi("");
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await API.patch(`/spk-jasa/${id}/status-pengambilan`, {
        status: newStatus,
      });
      alert("Status berhasil diperbarui");

      const refreshResponse = await API.get(`/SpkJasa?per_page=8&page=${currentPage}`);
      if (refreshResponse.data.data) {
        setSpkJasa(refreshResponse.data.data);
        setPagination({
          current_page: refreshResponse.data.current_page || 1,
          last_page: refreshResponse.data.last_page || 1,
          per_page: refreshResponse.data.per_page || 8,
          total: refreshResponse.data.total || 0,
        });
      } else if (Array.isArray(refreshResponse.data)) {
        setSpkJasa(refreshResponse.data);
      }
    } catch (error) {
      console.error("Error:", error);
      alert(error.response?.data?.message || "Terjadi kesalahan saat memperbarui status.");
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      belum_diambil: "belum-diambil",
      sudah_diambil: "sudah-diambil",
      batal_diambil: "batal-diambil",
      selesai: "selesai",
    };
    const statusLabels = {
      belum_diambil: "Belum Diambil",
      sudah_diambil: "Sudah Diambil",
      batal_diambil: "Batal Diambil",
      selesai: "Selesai",
    };
    const className = statusMap[status] || "";
    const label = statusLabels[status] || status;

    return <span className={`status-badge ${className}`}>{label}</span>;
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingId(null);
    setNewSpkJasa({
      tukang_jasa_id: "",
      spk_cutting_distribusi_id: "",
      deadline: "",
      harga: "",
      hargaDisplay: "",
      opsi_harga: "pcs",
      tanggal_ambil: "",
      foto: null,
    });
    setSelectedDistribusiId("");
    setPreviewData(null);
    setSearchDistribusi("");
    setShowDistribusiDropdown(false);
  };

  const handleEditClick = async (id) => {
    try {
      const response = await API.get(`/SpkJasa/${id}`);
      const data = response.data;

      const distribusiId = data.spk_cutting_distribusi_id || "";

      setNewSpkJasa({
        tukang_jasa_id: data.tukang_jasa_id || "",
        spk_cutting_distribusi_id: distribusiId,
        deadline: data.deadline ? data.deadline.split("T")[0] : "",
        harga: data.harga || "",
        hargaDisplay: data.harga ? formatRupiah(data.harga.toString()) : "",
        opsi_harga: data.opsi_harga || "pcs",
        tanggal_ambil: data.tanggal_ambil ? data.tanggal_ambil.split("T")[0] : "",
        foto: null, // Reset foto, user bisa upload foto baru
      });

      setSelectedDistribusiId(distribusiId);
      setEditingId(id);
      setShowForm(true);

      // Load preview jika distribusi ada
      if (distribusiId) {
        try {
          const previewResponse = await API.get(`/preview/${distribusiId}`);
          console.log("Preview data received (edit mode):", previewResponse.data);
          console.log("Jumlah per warna (edit):", previewResponse.data.jumlah_per_warna);
          setPreviewData(previewResponse.data);
        } catch (previewError) {
          console.error("Error fetching preview:", previewError);
          setPreviewData(null);
        }
      }
    } catch (error) {
      console.error("Error fetching SPK Jasa:", error);
      alert("Gagal mengambil data untuk diedit");
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDistribusiDropdown) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest(".searchable-select-wrapper")) {
        setShowDistribusiDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDistribusiDropdown]);

  return (
    <div className="spk-jasa-container">
      <div className="spk-jasa-header">
        <h1>Data SPK Jasa</h1>
      </div>

      <div className="spk-jasa-actions">
        <button className="btn-tambah" onClick={() => setShowForm(true)}>
          <FaPlus style={{ marginRight: "8px" }} />
          Tambah SPK Jasa
        </button>
        <div className="search-wrapper">
          <input type="text" placeholder="Cari ID, Tukang Jasa, Produk, atau Kode Seri..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Status Cards */}
      <div className="status-cards-container">
        <div className={`status-card ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>
          <div className="status-card-icon">📊</div>
          <div className="status-card-content">
            <div className="status-card-label">Total SPK Jasa</div>
            <div className="status-card-value">{statusStats.total}</div>
          </div>
        </div>
        <div className={`status-card ${statusFilter === "belum_diambil" ? "active" : ""}`} onClick={() => setStatusFilter("belum_diambil")}>
          <div className="status-card-icon">⏳</div>
          <div className="status-card-content">
            <div className="status-card-label">Belum Diambil</div>
            <div className="status-card-value">{statusStats.belum_diambil}</div>
          </div>
        </div>
        <div className={`status-card ${statusFilter === "sudah_diambil" ? "active" : ""}`} onClick={() => setStatusFilter("sudah_diambil")}>
          <div className="status-card-icon">✅</div>
          <div className="status-card-content">
            <div className="status-card-label">Sudah Diambil</div>
            <div className="status-card-value">{statusStats.sudah_diambil}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Memuat data...</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : (
        <div className="table-wrapper">
          <table className="spk-jasa-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tukang Jasa</th>
                <th>Seri</th>
                <th>Produk</th>
                <th>Jumlah</th>
                <th>Harga/Pcs</th>
                <th>Deadline</th>
                <th>Sisa Hari</th>
                <th>Status</th>
                <th>Tanggal Ambil</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpkJasa.length === 0 ? (
                <tr>
                  <td colSpan="12" className="empty-state">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                Array.isArray(filteredSpkJasa) &&
                filteredSpkJasa.map((spk, index) => {
                  const distribusi = spk.spkCuttingDistribusi || spk.spk_cutting_distribusi;
                  // Hitung nomor berdasarkan pagination
                  const nomor = (currentPage - 1) * pagination.per_page + index + 1;
                  const kodeSeri = distribusi?.kode_seri || distribusi?.kodeSeri || "-";

                  let namaProduk = "-";
                  if (distribusi?.spkCutting?.produk?.nama_produk) {
                    namaProduk = distribusi.spkCutting.produk.nama_produk;
                  } else if (distribusi?.spk_cutting?.produk?.nama_produk) {
                    namaProduk = distribusi.spk_cutting.produk.nama_produk;
                  } else if (distribusi?.spkCutting?.produk?.namaProduk) {
                    namaProduk = distribusi.spkCutting.produk.namaProduk;
                  } else if (spk.produk?.nama_produk) {
                    namaProduk = spk.produk.nama_produk;
                  } else if (spk.nama_produk) {
                    namaProduk = spk.nama_produk;
                  }

                  return (
                    <tr key={spk.id}>
                      <td>{nomor}</td>
                      <td>{spk.tukangJasa?.nama || spk.tukang_jasa?.nama || "-"}</td>
                      <td>{kodeSeri}</td>
                      <td>{namaProduk}</td>
                      <td>{spk.jumlah || "-"}</td>
                      <td>{spk.harga_per_pcs ? <span style={{ whiteSpace: "nowrap" }}>Rp {Number(spk.harga_per_pcs).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> : "-"}</td>
                      <td>{spk.deadline ? new Date(spk.deadline).toLocaleDateString("id-ID") : "-"}</td>
                      <td>{spk.sisa_hari !== null && spk.sisa_hari !== undefined ? `${spk.sisa_hari} hari` : "-"}</td>
                      <td>{getStatusBadge(spk.status_pengambilan)}</td>
                      <td>{spk.tanggal_ambil ? new Date(spk.tanggal_ambil).toLocaleDateString("id-ID") : "-"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
                          <button
                            className="btn-edit"
                            onClick={() => handleEditClick(spk.id)}
                            style={{
                              padding: "6px 12px",
                              background: "#10b981",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = "#059669";
                              e.target.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = "#10b981";
                              e.target.style.transform = "translateY(0)";
                            }}
                          >
                            Edit
                          </button>
                          <select className="status-select" value={spk.status_pengambilan} onChange={(e) => handleStatusUpdate(spk.id, e.target.value)}>
                            <option value="belum_diambil">Belum Diambil</option>
                            <option value="sudah_diambil">Sudah Diambil</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && pagination.total > 0 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Menampilkan {(pagination.current_page - 1) * pagination.per_page + 1} - {Math.min(pagination.current_page * pagination.per_page, pagination.total)} dari {pagination.total} data
          </div>
          <div className="pagination-controls">
            <button className="pagination-btn" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={pagination.current_page === 1}>
              ← Sebelumnya
            </button>
            <div className="pagination-pages">
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                let pageNum;
                if (pagination.last_page <= 5) {
                  pageNum = i + 1;
                } else if (pagination.current_page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.current_page >= pagination.last_page - 2) {
                  pageNum = pagination.last_page - 4 + i;
                } else {
                  pageNum = pagination.current_page - 2 + i;
                }
                return (
                  <button key={pageNum} className={`pagination-page-btn ${pagination.current_page === pageNum ? "active" : ""}`} onClick={() => setCurrentPage(pageNum)}>
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button className="pagination-btn" onClick={() => setCurrentPage((prev) => Math.min(pagination.last_page, prev + 1))} disabled={pagination.current_page === pagination.last_page}>
              Selanjutnya →
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? "Edit SPK Jasa" : "Tambah SPK Jasa"}</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label>Distribusi Seri:</label>
                  <div className={`searchable-select-wrapper ${showDistribusiDropdown ? "active" : ""}`}>
                    <div className="searchable-select-input" onClick={() => setShowDistribusiDropdown(!showDistribusiDropdown)}>
                      {newSpkJasa.spk_cutting_distribusi_id ? (
                        <span>
                          {distribusiList.find((d) => d.id.toString() === newSpkJasa.spk_cutting_distribusi_id.toString())?.kode_seri} -{" "}
                          {distribusiList.find((d) => d.id.toString() === newSpkJasa.spk_cutting_distribusi_id.toString())?.produk} (
                          {distribusiList.find((d) => d.id.toString() === newSpkJasa.spk_cutting_distribusi_id.toString())?.jumlah_produk} pcs)
                        </span>
                      ) : (
                        <span className="placeholder-text">-- Pilih Distribusi Seri --</span>
                      )}
                      <span className="dropdown-arrow">▼</span>
                    </div>
                    {showDistribusiDropdown && (
                      <div className="searchable-select-dropdown">
                        <div className="searchable-select-search">
                          <input
                            type="text"
                            placeholder="Cari kode seri, produk..."
                            value={searchDistribusi}
                            onChange={(e) => {
                              setSearchDistribusi(e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        <div className="searchable-select-options">
                          {filteredDistribusiList.length === 0 ? (
                            <div className="no-options">Tidak ada data ditemukan</div>
                          ) : (
                            filteredDistribusiList.map((dist) => (
                              <div key={dist.id} className={`searchable-select-option ${newSpkJasa.spk_cutting_distribusi_id === dist.id.toString() ? "selected" : ""}`} onClick={() => handleDistribusiSelect(dist.id.toString())}>
                                <div className="option-main">
                                  <strong>{dist.kode_seri}</strong> - {dist.produk}
                                </div>
                                <div className="option-sub">({dist.jumlah_produk} pcs)</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {previewData && (
                    <div className="preview-box">
                      <strong>Preview:</strong>
                      {previewData.gambar_produk && (
                        <div className="preview-image-container">
                          <img
                            src={`${process.env.REACT_APP_API_URL?.replace("/api", "") || ""}/storage/${previewData.gambar_produk}`}
                            alt={previewData.produk || "Produk"}
                            className="preview-product-image"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <div>Kode Seri: {previewData.kode_seri}</div>
                      <div>Jumlah: {previewData.jumlah} pcs</div>
                      <div>Produk: {previewData.produk}</div>
                      <div>Tukang Cutting: {previewData.tukang_cutting}</div>
                      {previewData.jumlah_per_warna && Array.isArray(previewData.jumlah_per_warna) && previewData.jumlah_per_warna.length > 0 ? (
                        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(3, 105, 161, 0.2)" }}>
                          <strong style={{ display: "block", marginBottom: "8px" }}>Jumlah per Warna:</strong>
                          {previewData.jumlah_per_warna.map((item, index) => (
                            <div key={index} style={{ margin: "4px 0", padding: "4px 0" }}>
                              <span style={{ fontWeight: "600" }}>{item.warna}:</span> {item.jumlah} pcs
                            </div>
                          ))}
                        </div>
                      ) : (
                        previewData.debug && (
                          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(3, 105, 161, 0.2)", fontSize: "12px", color: "#666" }}>
                            <div>Debug: Has HasilCutting: {previewData.debug.has_hasil_cutting ? "Yes" : "No"}</div>
                            <div>Debug: Bahan Count: {previewData.debug.bahan_count}</div>
                            <div style={{ marginTop: "4px", color: "#999" }}>Data warna tidak tersedia</div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Tukang Jasa:</label>
                  <select name="tukang_jasa_id" value={newSpkJasa.tukang_jasa_id} onChange={handleInputChange} required>
                    <option value="">Pilih Tukang Jasa</option>
                    {Array.isArray(tukangList) &&
                      tukangList.map((tukang) => (
                        <option key={tukang.id} value={tukang.id}>
                          {tukang.nama}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Deadline:</label>
                  <input type="date" name="deadline" value={newSpkJasa.deadline} onChange={handleInputChange} required min={editingId ? undefined : new Date().toISOString().split("T")[0]} />
                </div>

                <div className="form-group">
                  <label>Harga (Opsional):</label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#667eea",
                        fontWeight: "600",
                        fontSize: "14px",
                        zIndex: 1,
                      }}
                    >
                      Rp
                    </span>
                    <input type="text" name="harga" value={newSpkJasa.hargaDisplay} onChange={handleInputChange} placeholder="0" style={{ paddingLeft: "40px" }} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Satuan Harga (Opsional):</label>
                  <select name="opsi_harga" value={newSpkJasa.opsi_harga} onChange={handleInputChange}>
                    <option value="pcs">Pcs</option>
                    <option value="lusin">Lusin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tanggal Ambil (Opsional):</label>
                  <input type="date" name="tanggal_ambil" value={newSpkJasa.tanggal_ambil} onChange={handleInputChange} />
                </div>

                <div className="form-group">
                  <label>Foto (Opsional):</label>
                  <input type="file" name="foto" accept="image/*" onChange={handleInputChange} />
                  {newSpkJasa.foto && (
                    <div style={{ marginTop: "8px" }}>
                      {newSpkJasa.foto instanceof File ? (
                        <img src={URL.createObjectURL(newSpkJasa.foto)} alt="Preview" style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "8px", border: "1px solid #e0e0e0" }} />
                      ) : (
                        <img
                          src={`${process.env.REACT_APP_API_URL?.replace("/api", "") || ""}/storage/${newSpkJasa.foto}`}
                          alt="Foto"
                          style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "8px", border: "1px solid #e0e0e0" }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-submit">
                    {editingId ? "Update" : "Simpan"}
                  </button>
                  <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpkJasa;

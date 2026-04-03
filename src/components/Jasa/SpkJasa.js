import React, { useEffect, useState, useCallback } from "react";
import "./SpkJasa.css";
import API from "../../api";
import { FaTimes, FaPlus, FaEdit, FaCheck, FaBoxOpen } from "react-icons/fa";
import { FiBox, FiSearch, FiX } from "react-icons/fi";

const SWEETALERT_CDN = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js";

// Helper hook untuk debounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const SpkJasa = () => {
  const ensureSweetAlert = useCallback(
    () =>
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
      }),
    []
  );

  const showStatusAlert = useCallback(
    async (icon, title, text) => {
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
            popup: "spkj-swal-popup",
            confirmButton: "spkj-swal-btn spkj-swal-btn-primary",
          },
        });

        return true;
      } catch (alertError) {
        console.error("Gagal menampilkan SweetAlert:", alertError);
        window.alert(text || title || "Terjadi kesalahan");
        return false;
      }
    },
    [ensureSweetAlert]
  );

  const showConfirmAlert = useCallback(
    async ({ title, text, confirmText, icon = "question" }) => {
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
            popup: "spkj-swal-popup",
            confirmButton: "spkj-swal-btn spkj-swal-btn-danger",
            cancelButton: "spkj-swal-btn spkj-swal-btn-cancel",
          },
        });

        return !!result.isConfirmed;
      } catch (alertError) {
        console.error("Gagal menampilkan konfirmasi SweetAlert:", alertError);
        return window.confirm(text || title || "Lanjutkan aksi ini?");
      }
    },
    [ensureSweetAlert]
  );

  // State Utama
  const [spkJasa, setSpkJasa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State Filter & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 8,
    total: 0,
  });

  // State Statistik
  const [stats, setStats] = useState({
    total: 0,
    belum_diambil: 0,
    sudah_diambil: 0,
    batal_diambil: 0,
    selesai: 0,
  });

  // State Form & Dropdown
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tukangList, setTukangList] = useState([]);

  // State Dropdown Distribusi (Async Search)
  const [distribusiOptions, setDistribusiOptions] = useState([]);
  const [searchDistribusi, setSearchDistribusi] = useState("");
  const debouncedSearchDistribusi = useDebounce(searchDistribusi, 300);
  const [showDistribusiDropdown, setShowDistribusiDropdown] = useState(false);
  const [selectedDistribusiId, setSelectedDistribusiId] = useState("");
  const [previewData, setPreviewData] = useState(null);

  const [newSpkJasa, setNewSpkJasa] = useState({
    tukang_jasa_id: "",
    spk_cutting_distribusi_id: "",
    deadline: "",
    harga: "",
    hargaDisplay: "",
    opsi_harga: "pcs",
    tanggal_ambil: "",
    foto: null,
  });

  const formatRupiah = (value) => {
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseRupiah = (value) => value.replace(/\D/g, "");

  const fetchSpkJasa = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        per_page: 8,
        search: debouncedSearch,
        status: statusFilter,
      };

      const response = await API.get("/SpkJasa", { params });

      if (response.data.data) {
        setSpkJasa(response.data.data);
        setPagination({
          current_page: response.data.current_page,
          last_page: response.data.last_page,
          per_page: response.data.per_page,
          total: response.data.total,
        });
      } else {
        setSpkJasa([]);
      }
    } catch (fetchError) {
      console.error("Error fetching SPK Jasa:", fetchError);
      setError("Gagal mengambil data");
      await showStatusAlert("error", "Gagal Memuat Data", "Data SPK Jasa tidak berhasil diambil.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter, showStatusAlert]);

  useEffect(() => {
    fetchSpkJasa();
  }, [fetchSpkJasa]);

  const fetchStatistics = async () => {
    try {
      const response = await API.get("/SpkJasa/statistics");
      setStats(response.data);
    } catch (statsError) {
      console.error("Error fetching stats:", statsError);
    }
  };

  useEffect(() => {
    fetchStatistics();

    const fetchTukang = async () => {
      try {
        const response = await API.get("/tukang-jasa");
        setTukangList(Array.isArray(response.data) ? response.data : []);
      } catch (tukangError) {
        console.error("Gagal mengambil tukang jasa:", tukangError);
      }
    };

    fetchTukang();
  }, []);

  useEffect(() => {
    const fetchDistribusiOptions = async () => {
      if (!debouncedSearchDistribusi && !showDistribusiDropdown) return;

      try {
        const response = await API.get("/SpkJasa/available-distributions", {
          params: { search: debouncedSearchDistribusi },
        });
        setDistribusiOptions(response.data);
      } catch (distribusiError) {
        console.error("Gagal cari distribusi:", distribusiError);
      }
    };

    if (showDistribusiDropdown) {
      fetchDistribusiOptions();
    }
  }, [debouncedSearchDistribusi, showDistribusiDropdown]);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!selectedDistribusiId) {
        setPreviewData(null);
        return;
      }

      try {
        const response = await API.get(`/preview/${selectedDistribusiId}`);
        setPreviewData(response.data);
      } catch (previewError) {
        console.error("Gagal preview:", previewError);
        setPreviewData(null);
      }
    };

    fetchPreview();
  }, [selectedDistribusiId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    if (!newSpkJasa.spk_cutting_distribusi_id) {
      await showStatusAlert("warning", "Distribusi Belum Dipilih", "Silakan pilih Distribusi Seri terlebih dahulu.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("tukang_jasa_id", newSpkJasa.tukang_jasa_id);
      formData.append("spk_cutting_distribusi_id", newSpkJasa.spk_cutting_distribusi_id);
      formData.append("deadline", newSpkJasa.deadline);
      if (newSpkJasa.harga) formData.append("harga", newSpkJasa.harga);
      if (newSpkJasa.opsi_harga) formData.append("opsi_harga", newSpkJasa.opsi_harga);
      if (newSpkJasa.tanggal_ambil) formData.append("tanggal_ambil", newSpkJasa.tanggal_ambil);
      if (newSpkJasa.foto) formData.append("foto", newSpkJasa.foto);

      if (editingId) {
        formData.append("_method", "PUT");
        await API.post(`/SpkJasa/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        await showStatusAlert("success", "Perubahan Tersimpan", "SPK Jasa berhasil diperbarui.");
      } else {
        await API.post("/SpkJasa", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        await showStatusAlert("success", "SPK Jasa Ditambahkan", "SPK Jasa baru berhasil dibuat.");
      }

      fetchSpkJasa();
      fetchStatistics();
      handleCloseModal();
    } catch (submitError) {
      console.error("Error:", submitError);
      await showStatusAlert("error", "Gagal Menyimpan SPK Jasa", submitError.response?.data?.message || "Terjadi kesalahan.");
    }
  };

  const handleInputChange = (event) => {
    const { name, value, files } = event.target;

    if (name === "foto" && files && files[0]) {
      setNewSpkJasa((prev) => ({ ...prev, [name]: files[0] }));
    } else if (name === "harga") {
      const formattedValue = formatRupiah(value);
      const numericValue = parseRupiah(value);
      setNewSpkJasa((prev) => ({
        ...prev,
        harga: numericValue,
        hargaDisplay: formattedValue,
      }));
    } else {
      setNewSpkJasa((prev) => ({ ...prev, [name]: value }));
    }

    if (name === "spk_cutting_distribusi_id") {
      setSelectedDistribusiId(value);
    }
  };

  const handleDistribusiSelect = (dist) => {
    setNewSpkJasa((prev) => ({ ...prev, spk_cutting_distribusi_id: dist.id }));
    setSelectedDistribusiId(dist.id);
    setSearchDistribusi(dist.display || dist.kode_seri || "");
    setShowDistribusiDropdown(false);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const statusTextMap = {
      sudah_diambil: "Sudah Diambil",
      selesai: "Selesai",
      batal_diambil: "Batal Diambil",
    };
    const statusLabel = statusTextMap[newStatus] || "Status Baru";
    const isConfirmed = await showConfirmAlert({
      title: "Konfirmasi Perubahan Status",
      text: `Status SPK Jasa akan diubah menjadi "${statusLabel}".`,
      confirmText: "Ya, Ubah Status",
      icon: "warning",
    });

    if (!isConfirmed) return;

    try {
      await API.patch(`/spk-jasa/${id}/status-pengambilan`, { status: newStatus });
      await showStatusAlert("success", "Status Diperbarui", `Status SPK Jasa berhasil diubah ke "${statusLabel}".`);
      fetchSpkJasa();
      fetchStatistics();
    } catch (statusError) {
      console.error("Error:", statusError);
      await showStatusAlert("error", "Gagal Mengubah Status", statusError.response?.data?.message || "Gagal update status.");
    }
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
        foto: null,
      });

      setSelectedDistribusiId(distribusiId);
      setEditingId(id);

      if (data.kode_seri) {
        setSearchDistribusi(data.kode_seri);
      }

      setShowForm(true);
    } catch (detailError) {
      console.error("Error fetching detail:", detailError);
      await showStatusAlert("error", "Gagal Mengambil Data", "Data edit SPK Jasa tidak berhasil dimuat.");
    }
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

  useEffect(() => {
    if (!showDistribusiDropdown) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest(".searchable-select-wrapper")) {
        setShowDistribusiDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDistribusiDropdown]);

  const getStatusBadge = (status) => {
    const statusMap = {
      belum_diambil: "spkj-status-belum-diambil",
      sudah_diambil: "spkj-status-sudah-diambil",
      batal_diambil: "spkj-status-batal-diambil",
      selesai: "spkj-status-selesai",
    };

    const label = String(status || "-")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

    return <span className={`spkj-status-badge ${statusMap[status] || ""}`}>{label}</span>;
  };

  const formatDisplayDate = (dateValue) => {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleDateString("id-ID");
  };

  const statCards = [
    { key: "all", label: "Total SPK Jasa", value: stats.total, valueClass: "spkj-stat-value-info" },
    { key: "belum_diambil", label: "Belum Diambil", value: stats.belum_diambil, valueClass: "spkj-stat-value-warning" },
    { key: "sudah_diambil", label: "Sudah Diambil", value: stats.sudah_diambil, valueClass: "spkj-stat-value-primary" },
    { key: "selesai", label: "Selesai", value: stats.selesai, valueClass: "spkj-stat-value-success" },
  ];

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.last_page) {
      setCurrentPage(page);
    }
  };

  const paginationFrom = pagination.total > 0 ? (pagination.current_page - 1) * pagination.per_page + 1 : 0;
  const paginationTo = pagination.total > 0 ? Math.min(pagination.current_page * pagination.per_page, pagination.total) : 0;

  return (
    <div className="spkj-container">
      <header className="spkj-header">
        <div className="spkj-header-top">
          <div className="spkj-title-group">
            <div className="spkj-brand-icon">
              <FiBox />
            </div>
            <div className="spkj-title-wrap">
              <div className="spkj-module-pill">Service Module</div>
              <h1>Data SPK Jasa</h1>
              <p className="spkj-header-subtitle">Manajemen SPK jasa, distribusi seri, dan proses pengambilan barang</p>
            </div>
          </div>
        </div>
      </header>

      <main className="spkj-main">
        <section className="spkj-stats">
          {statCards.map((card) => (
            <article
              key={card.key}
              className={`spkj-stat-item ${statusFilter === card.key ? "active" : ""}`}
              onClick={() => setStatusFilter(card.key)}
            >
              <div className="spkj-stat-label">{card.label}</div>
              <div className={`spkj-stat-value ${card.valueClass}`}>{card.value || 0}</div>
            </article>
          ))}
        </section>

        <section className="spkj-table-wrapper">
          <div className="spkj-filter-header">
            <div className="spkj-action-buttons">
              <button className="spkj-btn-add" onClick={() => setShowForm(true)} type="button">
                <FaPlus /> Tambah SPK Jasa
              </button>
            </div>

            <div className="spkj-filter-group">
              <select className="spkj-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Semua Status</option>
                <option value="belum_diambil">Belum Diambil</option>
                <option value="sudah_diambil">Sudah Diambil</option>
                <option value="batal_diambil">Batal Diambil</option>
                <option value="selesai">Selesai</option>
              </select>

              <div className="spkj-search-bar">
                <input
                  type="text"
                  placeholder="Cari ID, Tukang, Seri, atau Produk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm ? (
                  <button type="button" className="spkj-search-clear" onClick={() => setSearchTerm("")} title="Hapus pencarian">
                    <FiX />
                  </button>
                ) : (
                  <span className="spkj-search-icon">
                    <FiSearch />
                  </span>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <p className="spkj-loading">Memuat data...</p>
          ) : error ? (
            <p className="spkj-error">{error}</p>
          ) : (
            <>
              <div className="spkj-table-scroll">
                <table className="spkj-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Tukang Jasa</th>
                      <th>Kode Seri</th>
                      <th>Produk</th>
                      <th>Jumlah</th>
                      <th>Harga/Pcs</th>
                      <th>Deadline</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spkJasa.length > 0 ? (
                      spkJasa.map((spk, index) => {
                        const distribusi = spk.spk_cutting_distribusi || {};
                        const produk = distribusi.spk_cutting?.produk || {};
                        const nomor = (pagination.current_page - 1) * pagination.per_page + index + 1;

                        return (
                          <tr key={spk.id}>
                            <td>{nomor}</td>
                            <td>{spk.tukang_jasa?.nama || "-"}</td>
                            <td>{distribusi.kode_seri || "-"}</td>
                            <td>{produk.nama_produk || "-"}</td>
                            <td>{spk.jumlah || distribusi.jumlah_produk || 0}</td>
                            <td className="spkj-price">
                              {spk.harga_per_pcs ? `Rp ${parseInt(spk.harga_per_pcs, 10).toLocaleString("id-ID")}` : "-"}
                            </td>
                            <td>{formatDisplayDate(spk.deadline)}</td>
                            <td>{getStatusBadge(spk.status_pengambilan)}</td>
                            <td>
                              <div className="spkj-row-actions">
                                <button
                                  className="spkj-btn-icon edit"
                                  onClick={() => handleEditClick(spk.id)}
                                  title="Edit SPK Jasa"
                                  type="button"
                                >
                                  <FaEdit />
                                </button>
                                {spk.status_pengambilan === "belum_diambil" && (
                                  <button
                                    className="spkj-btn-icon take"
                                    onClick={() => handleStatusUpdate(spk.id, "sudah_diambil")}
                                    title="Tandai Sudah Diambil"
                                    type="button"
                                  >
                                    <FaBoxOpen />
                                  </button>
                                )}
                                {spk.status_pengambilan === "sudah_diambil" && (
                                  <button
                                    className="spkj-btn-icon done"
                                    onClick={() => handleStatusUpdate(spk.id, "selesai")}
                                    title="Tandai Selesai"
                                    type="button"
                                  >
                                    <FaCheck />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="9" className="spkj-empty-row">
                          Tidak ada data SPK Jasa.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {pagination.total > 0 && (
                <div className="spkj-pagination">
                  <div className="spkj-pagination-summary">
                    Menampilkan {paginationFrom} - {paginationTo} dari {pagination.total.toLocaleString("id-ID")} data
                  </div>

                  {pagination.last_page > 1 && (
                    <div className="spkj-pagination-controls">
                      <button className="spkj-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} type="button">
                        Sebelumnya
                      </button>
                      <span className="spkj-page-indicator">
                        Halaman {pagination.current_page} dari {pagination.last_page}
                      </span>
                      <button
                        className="spkj-page-btn"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === pagination.last_page}
                        type="button"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {showForm && (
        <div className="spkj-modal-overlay" onClick={handleCloseModal}>
          <div className="spkj-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="spkj-modal-header">
              <div className="spkj-modal-title-group">
                <h3>{editingId ? "Edit SPK Jasa" : "Tambah SPK Jasa"}</h3>
                <p className="spkj-modal-subtitle">Lengkapi data penugasan jasa secara ringkas dan akurat.</p>
              </div>
              <button className="spkj-modal-close" onClick={handleCloseModal} type="button">
                <FaTimes />
              </button>
            </div>
            <div className="spkj-modal-body">
              <form className="spkj-modal-form" onSubmit={handleFormSubmit}>
                <div className="spkj-form-section-label spkj-full">Informasi Penugasan</div>
                <div className="spkj-form-group">
                  <label>
                    Tukang Jasa <span className="spkj-required">*</span>
                  </label>
                  <select
                    name="tukang_jasa_id"
                    value={newSpkJasa.tukang_jasa_id}
                    onChange={handleInputChange}
                    className="spkj-form-select"
                    required
                  >
                    <option value="">Pilih Tukang Jasa</option>
                    {tukangList.map((tukang) => (
                      <option key={tukang.id} value={tukang.id}>
                        {tukang.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="spkj-form-group searchable-select-wrapper">
                  <label>
                    Distribusi Seri (Kode/Produk) <span className="spkj-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="spkj-form-input"
                    placeholder="Ketik untuk mencari..."
                    value={searchDistribusi}
                    onChange={(e) => {
                      setSearchDistribusi(e.target.value);
                      setShowDistribusiDropdown(true);
                    }}
                    onFocus={() => setShowDistribusiDropdown(true)}
                  />
                  {showDistribusiDropdown && (
                    <ul className="spkj-dropdown-list">
                      {distribusiOptions.length > 0 ? (
                        distribusiOptions.map((option) => (
                          <li key={option.id} onClick={() => handleDistribusiSelect(option)}>
                            <strong>{option.kode_seri}</strong> - {option.produk} (Jml: {option.jumlah_produk})
                          </li>
                        ))
                      ) : (
                        <li className="empty">Data distribusi tidak ditemukan.</li>
                      )}
                    </ul>
                  )}
                </div>

                {previewData && (
                  <div className="spkj-preview-section spkj-full">
                    <div className="spkj-preview-item">
                      <span className="label">Produk</span>
                      <span className="value">{previewData.produk}</span>
                    </div>
                    <div className="spkj-preview-item">
                      <span className="label">Jumlah Total</span>
                      <span className="value">{previewData.jumlah}</span>
                    </div>
                    {previewData.jumlah_per_warna && previewData.jumlah_per_warna.length > 0 && (
                      <div className="spkj-preview-colors">
                        {previewData.jumlah_per_warna.map((warnaItem, index) => (
                          <span key={index} className="spkj-color-tag">
                            {warnaItem.warna}: {warnaItem.jumlah}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="spkj-form-section-label spkj-full">Jadwal Dan Biaya</div>
                <div className="spkj-form-group">
                  <label>
                    Deadline <span className="spkj-required">*</span>
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    value={newSpkJasa.deadline}
                    onChange={handleInputChange}
                    className="spkj-form-input"
                    required
                  />
                </div>

                <div className="spkj-form-group">
                  <label>Tanggal Ambil (Opsional)</label>
                  <input
                    type="date"
                    name="tanggal_ambil"
                    value={newSpkJasa.tanggal_ambil}
                    onChange={handleInputChange}
                    className="spkj-form-input"
                  />
                </div>

                <div className="spkj-form-group">
                  <label>Harga</label>
                  <div className="spkj-price-input-wrap">
                    <span className="spkj-price-prefix">Rp.</span>
                    <input
                      type="text"
                      name="harga"
                      value={newSpkJasa.hargaDisplay}
                      onChange={handleInputChange}
                      className="spkj-form-input spkj-input-with-prefix"
                      placeholder="Contoh: 15.000"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="spkj-form-group">
                  <label>Satuan Harga</label>
                  <select
                    name="opsi_harga"
                    value={newSpkJasa.opsi_harga}
                    onChange={handleInputChange}
                    className="spkj-form-select"
                  >
                    <option value="pcs">Per Pcs</option>
                    <option value="lusin">Per Lusin</option>
                  </select>
                </div>

                <div className="spkj-form-section-label spkj-full">Lampiran</div>
                <div className="spkj-form-group spkj-full">
                  <label>Foto Referensi (Opsional)</label>
                  <input
                    type="file"
                    name="foto"
                    onChange={handleInputChange}
                    className="spkj-form-input"
                    accept="image/*"
                  />
                </div>

                <div className="spkj-form-actions spkj-full">
                  <button type="button" className="spkj-btn-secondary" onClick={handleCloseModal}>
                    Batal
                  </button>
                  <button type="submit" className="spkj-btn-primary">
                    {editingId ? "Simpan Perubahan" : "Buat SPK Jasa"}
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

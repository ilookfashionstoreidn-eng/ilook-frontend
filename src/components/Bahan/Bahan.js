import React, { useEffect, useMemo, useState } from "react";
import "./Bahan.css";
import API from "../../api";
import { FaBoxOpen, FaEdit, FaEye, FaPlus, FaSearch, FaTag, FaTrash } from "react-icons/fa";

const SATUAN_OPTIONS = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "yard", label: "Yard" },
];

const TOAST_DURATION = 3200;
const formatHargaInput = (value) => {
  const digitsOnly = String(value || "").replace(/\D/g, "");
  if (!digitsOnly) return "";
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const formatHargaFromData = (value) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "";
  return formatHargaInput(Math.trunc(numericValue));
};

const parseHargaInput = (value) => {
  const normalized = String(value || "").replace(/\./g, "");
  return normalized ? Number(normalized) : NaN;
};

const Bahan = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [newItem, setNewItem] = useState({
    nama_bahan: "",
    deskripsi: "",
    harga: "",
    satuan: "kg",
  });
  const [editItem, setEditItem] = useState({
    id: null,
    nama_bahan: "",
    deskripsi: "",
    harga: "",
    satuan: "kg",
  });
  const [detailItem, setDetailItem] = useState(null);

  const itemsPerPage = 6;

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await API.get("/bahan");
        setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } catch (fetchError) {
        setError("Gagal memuat data bahan.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();
    if (!keyword) return items;

    return items.filter(
      (item) =>
        (item.nama_bahan || "").toLowerCase().includes(keyword) ||
        (item.deskripsi || "").toLowerCase().includes(keyword) ||
        (item.satuan || "").toLowerCase().includes(keyword)
    );
  }, [items, searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const totalBahan = items.length;
  const totalKilogram = items.filter((item) => item.satuan === "kg").length;
  const totalYard = items.filter((item) => item.satuan === "yard").length;

  const avgPrice =
    items.length > 0
      ? items.reduce((acc, item) => acc + (Number(item.harga) || 0), 0) / items.length
      : 0;

  const lastSyncLabel = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const resetForm = () => {
    setNewItem({ nama_bahan: "", deskripsi: "", harga: "", satuan: "kg" });
    setEditItem({ id: null, nama_bahan: "", deskripsi: "", harga: "", satuan: "kg" });
    setShowForm(false);
    setShowEditForm(false);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setDetailItem(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "harga") {
      const formattedValue = formatHargaInput(value);
      if (showEditForm) {
        setEditItem((prev) => ({ ...prev, [name]: formattedValue }));
      } else {
        setNewItem((prev) => ({ ...prev, [name]: formattedValue }));
      }
      return;
    }

    if (showEditForm) {
      setEditItem((prev) => ({ ...prev, [name]: value }));
    } else {
      setNewItem((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const hargaNumeric = parseHargaInput(newItem.harga);

    if (!newItem.harga || Number.isNaN(hargaNumeric) || hargaNumeric < 0) {
      showToast("Harga harus diisi dan tidak boleh negatif.", "warning");
      return;
    }

    try {
      const payload = {
        nama_bahan: newItem.nama_bahan,
        deskripsi: newItem.deskripsi || undefined,
        harga: hargaNumeric,
        satuan: newItem.satuan,
      };

      const response = await API.post("/bahan", payload);
      setItems((prev) => [...prev, response.data]);
      resetForm();
      showToast("Bahan berhasil ditambahkan.", "success");
    } catch (submitError) {
      const errMsg = submitError.response?.data?.message || "Gagal menambah bahan.";
      showToast(errMsg, "error");
    }
  };

  const handleEditClick = (item) => {
    setEditItem({
      id: item.id,
      nama_bahan: item.nama_bahan || "",
      deskripsi: item.deskripsi || "",
      harga: formatHargaFromData(item.harga),
      satuan: item.satuan || "kg",
    });
    setShowForm(false);
    setShowEditForm(true);
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();
    const hargaNumeric = parseHargaInput(editItem.harga);

    if (!editItem.harga || Number.isNaN(hargaNumeric) || hargaNumeric < 0) {
      showToast("Harga harus diisi dan tidak boleh negatif.", "warning");
      return;
    }

    try {
      const payload = {
        nama_bahan: editItem.nama_bahan,
        deskripsi: editItem.deskripsi || undefined,
        harga: hargaNumeric,
        satuan: editItem.satuan,
      };

      const response = await API.put(`/bahan/${editItem.id}`, payload);
      const updatedData = response.data;

      setItems((prev) => prev.map((item) => (item.id === editItem.id ? updatedData : item)));
      resetForm();
      showToast("Data bahan berhasil diperbarui.", "success");
    } catch (updateError) {
      const errMsg = updateError.response?.data?.message || "Gagal memperbarui bahan.";
      showToast(errMsg, "error");
    }
  };

  const handleDelete = async (id, nama) => {
    if (!window.confirm(`Yakin ingin menghapus bahan "${nama}"?`)) return;

    try {
      await API.delete(`/bahan/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      showToast("Bahan berhasil dihapus.", "success");
    } catch (deleteError) {
      const errMsg = deleteError.response?.data?.message || "Gagal menghapus bahan.";
      showToast(errMsg, "error");
    }
  };

  const handleDetailClick = (item) => {
    setDetailItem(item);
    setShowDetailModal(true);
  };

  const formatRupiah = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getSatuanLabel = (value) => {
    const option = SATUAN_OPTIONS.find((item) => item.value === value);
    return option ? option.label : value;
  };

  return (
    <div className="bahan-page">
      <section className="bahan-shell">
        <header className="bahan-topbar">
          <div className="bahan-title-wrap">
            <div className="bahan-title-icon">
              <FaBoxOpen />
            </div>
            <div>
              <h1>Master Bahan</h1>
              <p>Pengelolaan data material untuk kebutuhan produksi dan costing.</p>
            </div>
          </div>
          <div className="bahan-topbar-right">
            <small>Terakhir sinkron: {lastSyncLabel}</small>
            <button
              className="bahan-btn-primary"
              onClick={() => {
                setShowEditForm(false);
                setShowForm(true);
              }}
            >
              <FaPlus /> Tambah Data
            </button>
          </div>
        </header>

        <section className="bahan-kpi-grid">
          <article className="bahan-kpi-card">
            <span>Total Bahan</span>
            <strong>{totalBahan}</strong>
          </article>
          <article className="bahan-kpi-card">
            <span>Satuan Kilogram</span>
            <strong>{totalKilogram}</strong>
          </article>
          <article className="bahan-kpi-card">
            <span>Satuan Yard</span>
            <strong>{totalYard}</strong>
          </article>
          <article className="bahan-kpi-card bahan-kpi-price">
            <span>Rata-rata Harga</span>
            <strong>{formatRupiah(avgPrice)}</strong>
          </article>
        </section>

        <section className="bahan-table-card">
          <div className="bahan-table-header">
            <div>
              <h2>Daftar Bahan</h2>
              <p>{filteredItems.length} data aktif</p>
            </div>
            <label className="bahan-search-box">
              <FaSearch />
              <input
                type="text"
                placeholder="Cari nama bahan, deskripsi, atau satuan"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
          </div>

          {loading ? (
            <p className="bahan-state">Memuat data bahan...</p>
          ) : error ? (
            <p className="bahan-state bahan-state-error">{error}</p>
          ) : currentItems.length === 0 ? (
            <p className="bahan-state">Data tidak ditemukan untuk kata kunci tersebut.</p>
          ) : (
            <>
              <div className="bahan-table-wrap">
                <table className="bahan-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Bahan</th>
                      <th>Deskripsi</th>
                      <th>Harga</th>
                      <th>Satuan</th>
                      <th className="align-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item, index) => (
                      <tr key={item.id}>
                        <td>{indexOfFirstItem + index + 1}</td>
                        <td className="bahan-name">{item.nama_bahan}</td>
                        <td>{item.deskripsi || "-"}</td>
                        <td className="bahan-price">{formatRupiah(item.harga)}</td>
                        <td>
                          <span className="bahan-chip">
                            <FaTag /> {getSatuanLabel(item.satuan)}
                          </span>
                        </td>
                        <td>
                          <div className="bahan-actions">
                            <button className="bahan-icon-btn detail" onClick={() => handleDetailClick(item)} title="Detail">
                              <FaEye />
                            </button>
                            <button className="bahan-icon-btn edit" onClick={() => handleEditClick(item)} title="Edit">
                              <FaEdit />
                            </button>
                            <button className="bahan-icon-btn delete" onClick={() => handleDelete(item.id, item.nama_bahan)} title="Hapus">
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="bahan-pagination">
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
        </section>
      </section>

      {(showForm || showEditForm) && (
        <div className="bahan-modal" onClick={resetForm}>
          <div className="bahan-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="bahan-modal-head">
              <h3>{showEditForm ? "Edit Data Bahan" : "Tambah Bahan Baru"}</h3>
              <p>{showEditForm ? "Perbarui informasi material sesuai referensi terbaru." : "Lengkapi form untuk menambahkan data material baru."}</p>
            </div>

            <form onSubmit={showEditForm ? handleFormUpdate : handleFormSubmit} className="bahan-form">
              <div className="bahan-form-group">
                <label>Nama Bahan</label>
                <input
                  type="text"
                  name="nama_bahan"
                  value={showEditForm ? editItem.nama_bahan : newItem.nama_bahan}
                  onChange={handleInputChange}
                  required
                  placeholder="Contoh: Katun Combed"
                />
              </div>

              <div className="bahan-form-group">
                <label>Deskripsi</label>
                <textarea
                  name="deskripsi"
                  value={showEditForm ? editItem.deskripsi : newItem.deskripsi}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Tuliskan detail penggunaan atau karakter bahan"
                />
              </div>

              <div className="bahan-form-row">
                <div className="bahan-form-group">
                  <label>Harga (Rp)</label>
                  <div className="bahan-input-prefix">
                    <span>Rp</span>
                    <input
                      type="text"
                      name="harga"
                      value={showEditForm ? editItem.harga : newItem.harga}
                      onChange={handleInputChange}
                      required
                      placeholder="Contoh: 50.000"
                    />
                  </div>
                </div>

                <div className="bahan-form-group">
                  <label>Satuan</label>
                  <select
                    name="satuan"
                    value={showEditForm ? editItem.satuan : newItem.satuan}
                    onChange={handleInputChange}
                    required
                  >
                    {SATUAN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bahan-form-actions">
                <button type="button" className="bahan-btn-secondary" onClick={resetForm}>
                  Batal
                </button>
                <button type="submit" className="bahan-btn-primary">
                  {showEditForm ? "Perbarui Data" : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && detailItem && (
        <div className="bahan-modal" onClick={closeDetailModal}>
          <div className="bahan-modal-content bahan-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bahan-modal-head">
              <h3>Detail Data Bahan</h3>
              <p>Informasi lengkap material yang tersimpan dalam sistem.</p>
            </div>
            <div className="bahan-detail-grid">
              <div className="bahan-detail-item">
                <span>ID</span>
                <strong>{detailItem.id}</strong>
              </div>
              <div className="bahan-detail-item">
                <span>Nama Bahan</span>
                <strong>{detailItem.nama_bahan || "-"}</strong>
              </div>
              <div className="bahan-detail-item">
                <span>Deskripsi</span>
                <strong>{detailItem.deskripsi || "-"}</strong>
              </div>
              <div className="bahan-detail-item">
                <span>Harga</span>
                <strong>{formatRupiah(detailItem.harga)}</strong>
              </div>
              <div className="bahan-detail-item">
                <span>Satuan</span>
                <strong>{getSatuanLabel(detailItem.satuan)}</strong>
              </div>
            </div>
            <div className="bahan-form-actions">
              {/* Tombol Tutup: secondary (abu-abu) sesuai desain Gudang */}
              <button type="button" className="bahan-btn-secondary bahan-btn-tutup" onClick={closeDetailModal}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`bahan-toast bahan-toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Bahan;

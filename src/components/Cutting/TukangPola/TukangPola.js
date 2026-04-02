import React, { useEffect, useMemo, useState } from "react";
import API from "../../../api";
import "./TukangPola.css";
import { FaEdit, FaPlus, FaSearch, FaTrash } from "react-icons/fa";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiRefreshCw,
  FiScissors,
  FiUsers,
  FiX,
} from "react-icons/fi";

const INITIAL_FORM = {
  nama: "",
};
const SWEETALERT_CDN = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js";

const formatDateTime = (isoValue) => {
  if (!isoValue) {
    return "-";
  }

  return new Date(isoValue).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const TukangPola = () => {
  const [tukangPola, setTukangPola] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState("");
  const [formData, setFormData] = useState(INITIAL_FORM);

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

  const showStatusAlert = async (type, title, text) => {
    try {
      const Swal = await ensureSweetAlert();
      if (!Swal) throw new Error("SweetAlert2 tidak tersedia");

      await Swal.fire({
        icon: type,
        title,
        text,
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          popup: "tp-swal-popup",
          confirmButton: "tp-swal-btn tp-swal-btn-primary",
        },
      });
      return true;
    } catch (alertError) {
      console.error("Gagal menampilkan SweetAlert:", alertError);
      return false;
    }
  };

  const showConfirmAlert = async ({ title, text, confirmText }) => {
    try {
      const Swal = await ensureSweetAlert();
      if (!Swal) throw new Error("SweetAlert2 tidak tersedia");

      const result = await Swal.fire({
        icon: "question",
        title,
        text,
        showCancelButton: true,
        confirmButtonText: confirmText || "Ya, Lanjutkan",
        cancelButtonText: "Batal",
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
          popup: "tp-swal-popup",
          confirmButton: "tp-swal-btn tp-swal-btn-danger",
          cancelButton: "tp-swal-btn tp-swal-btn-cancel",
        },
      });

      return !!result.isConfirmed;
    } catch (alertError) {
      console.error("Gagal menampilkan konfirmasi SweetAlert:", alertError);
      return window.confirm(text || title || "Lanjutkan aksi ini?");
    }
  };

  const fetchTukangPola = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/tukang_pola");
      const payload = Array.isArray(response.data) ? response.data : [];

      setTukangPola(payload);
      setLastSyncAt(new Date().toISOString());
    } catch {
      setError("Data tukang pola tidak dapat dimuat. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTukangPola();
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredTukangPola = useMemo(
    () =>
      tukangPola.filter((item) =>
        (item.nama || "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [searchTerm, tukangPola]
  );

  const summary = useMemo(
    () => ({
      total: tukangPola.length,
      tampil: filteredTukangPola.length,
    }),
    [filteredTukangPola.length, tukangPola.length]
  );

  const feedbackIcon = useMemo(() => {
    if (!toast) {
      return null;
    }

    if (toast.type === "success") {
      return <FiCheckCircle />;
    }

    if (toast.type === "warning") {
      return <FiAlertTriangle />;
    }

    return <FiInfo />;
  }, [toast]);

  const showToast = (message, type = "info") => {
    setToast({ id: Date.now(), message, type });
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
  };

  const openAddForm = () => {
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ nama: item.nama || "" });
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      if (editingId) {
        const response = await API.put(`/tukang_pola/${editingId}`, formData);
        const updated = response.data?.data || response.data;

        if (updated && typeof updated === "object") {
          setTukangPola((prev) =>
            prev.map((item) => (item.id === editingId ? updated : item))
          );
        } else {
          await fetchTukangPola();
        }

        showToast("Data tukang pola berhasil diperbarui.", "success");
      } else {
        const response = await API.post("/tukang_pola", formData);
        const created = response.data?.data || response.data;

        if (created && typeof created === "object") {
          setTukangPola((prev) => [created, ...prev]);
        } else {
          await fetchTukangPola();
        }
      }

      setLastSyncAt(new Date().toISOString());
      closeForm();

      if (!editingId) {
        const shown = await showStatusAlert(
          "success",
          "Berhasil",
          "Data tukang pola berhasil ditambahkan."
        );
        if (!shown) {
          showToast("Data tukang pola berhasil ditambahkan.", "success");
        }
      }
    } catch (submitError) {
      showToast(
        submitError.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan data.",
        "warning"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirmAlert({
      title: "Hapus Data?",
      text: `Yakin ingin menghapus tukang pola ${item.nama || "ini"}?`,
      confirmText: "Ya, Hapus",
    });

    if (!confirmed) {
      return;
    }

    try {
      await API.delete(`/tukang_pola/${item.id}`);
      setTukangPola((prev) => prev.filter((row) => row.id !== item.id));
      setLastSyncAt(new Date().toISOString());
      const shown = await showStatusAlert(
        "success",
        "Berhasil",
        "Data tukang pola berhasil dihapus."
      );
      if (!shown) {
        showToast("Data tukang pola berhasil dihapus.", "success");
      }
    } catch (deleteError) {
      showToast(
        deleteError.response?.data?.message ||
          "Terjadi kesalahan saat menghapus data.",
        "warning"
      );
    }
  };

  return (
    <div className="tp-container">
      <header className="tp-header">
        <div className="tp-header-top">
          <div className="tp-title-group">
            <div className="tp-brand-icon">
              <FiScissors />
            </div>
            <div className="tp-title-wrap">
              <div className="tp-module-pill">Pattern Management</div>
              <h1>Master Tukang Pola</h1>
              <p className="tp-header-subtitle">
                Manajemen data tukang pola untuk proses produksi cutting.
              </p>
            </div>
          </div>

          <div className="tp-search-wrap">
            <input
              className="tp-search-input"
              type="text"
              placeholder="Cari nama tukang pola"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm ? (
              <button
                type="button"
                className="tp-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Hapus pencarian"
              >
                <FiX />
              </button>
            ) : (
              <span className="tp-search-icon" aria-hidden="true">
                <FaSearch />
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="tp-main">
        <section className="tp-stats">
          <div className="tp-stat-item">
            <p className="tp-stat-label">Total Tukang Pola</p>
            <p className="tp-stat-value">{summary.total}</p>
          </div>
          <div className="tp-stat-item">
            <p className="tp-stat-label">Data Ditampilkan</p>
            <p className="tp-stat-value tp-stat-value-success">{summary.tampil}</p>
          </div>
          <div className="tp-stat-item">
            <p className="tp-stat-label">Status Data</p>
            <p className="tp-stat-value tp-stat-value-info">Aktif</p>
          </div>
          <div className="tp-stat-item">
            <p className="tp-stat-label">Sinkron Terakhir</p>
            <p className="tp-stat-value tp-stat-value-small">{formatDateTime(lastSyncAt)}</p>
          </div>
        </section>

        <section className="tp-table-wrapper">
          <div className="tp-table-header">
            <div>
              <h3>Daftar Tukang Pola</h3>
              <p>
                Menampilkan {summary.tampil} dari {summary.total} data
              </p>
            </div>
            <div className="tp-table-actions">
              <button
                type="button"
                className="tp-btn-secondary"
                onClick={fetchTukangPola}
                disabled={loading}
              >
                <FiRefreshCw /> Refresh
              </button>
              <button type="button" className="tp-btn-primary" onClick={openAddForm}>
                <FaPlus /> Tambah Tukang Pola
              </button>
            </div>
          </div>

          <div className="tp-filter-section">
            <div className="tp-filter-wrap">
              <span className="tp-filter-label">Status Data</span>
              <span className="tp-filter-value">Aktif</span>
            </div>
          </div>

          {error ? (
            <div className="tp-alert">
              <FiAlertTriangle />
              <p>{error}</p>
              <button className="tp-btn-secondary" onClick={fetchTukangPola}>
                Muat Ulang
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="tp-loading">
              <div className="tp-spinner" />
              <p className="tp-loading-title">Memuat Data</p>
              <p className="tp-loading-subtitle">Mohon tunggu beberapa saat...</p>
            </div>
          ) : filteredTukangPola.length === 0 ? (
            <div className="tp-empty-state">
              <div className="tp-empty-icon">
                <FiUsers />
              </div>
              <p className="tp-empty-title">Data Tidak Ditemukan</p>
              <p className="tp-empty-text">Coba ubah kata kunci pencarian yang digunakan.</p>
            </div>
          ) : (
            <div className="tp-table-scroll">
              <table className="tp-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Tukang Pola</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTukangPola.map((item, index) => (
                    <tr key={item.id}>
                      <td className="tp-id-value">{index + 1}</td>
                      <td>{item.nama || "-"}</td>
                      <td>
                        <div className="tp-action-buttons">
                          <button
                            type="button"
                            className="tp-btn-icon info"
                            onClick={() => handleEdit(item)}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            className="tp-btn-icon danger"
                            onClick={() => handleDelete(item)}
                            title="Hapus"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {showForm ? (
        <div className="tp-modal-overlay" onClick={closeForm}>
          <div className="tp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="tp-modal-header">
              <h3>{editingId ? "Edit Tukang Pola" : "Tambah Tukang Pola"}</h3>
              <button className="tp-modal-close" onClick={closeForm} type="button">
                <FiX />
              </button>
            </div>

            <div className="tp-modal-body">
              <form onSubmit={handleFormSubmit} className="tp-modal-form">
                <div className="tp-form-group tp-form-full">
                  <label htmlFor="nama">
                    Nama Tukang Pola <span className="tp-required">*</span>
                  </label>
                  <input
                    id="nama"
                    type="text"
                    name="nama"
                    className="tp-form-input"
                    value={formData.nama}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama tukang pola"
                    required
                    autoFocus
                  />
                </div>

                <div className="tp-form-actions">
                  <button type="submit" className="tp-btn-submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? "Menyimpan..."
                      : editingId
                      ? "Perbarui Data"
                      : "Simpan Data"}
                  </button>
                  <button
                    type="button"
                    className="tp-btn-cancel"
                    onClick={closeForm}
                    disabled={isSubmitting}
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`tp-feedback-toast ${toast.type}`}>
          <span className="tp-feedback-icon">{feedbackIcon}</span>
          <p>{toast.message}</p>
        </div>
      ) : null}
    </div>
  );
};

export default TukangPola;

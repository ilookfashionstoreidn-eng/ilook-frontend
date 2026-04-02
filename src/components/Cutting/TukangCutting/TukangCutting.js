import React, { useEffect, useMemo, useState } from "react";
import API from "../../../api";
import "./TukangCutting.css";
import { FaPlus, FaSearch } from "react-icons/fa";
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
  nama_tukang_cutting: "",
  kontak: "",
  bank: "",
  no_rekening: "",
  alamat: "",
};

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

const TukangCutting = () => {
  const [tukangCutting, setTukangCutting] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState("");
  const [newTukangCutting, setNewTukangCutting] = useState(INITIAL_FORM);

  const fetchTukangCutting = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/tukang_cutting");
      const payload = Array.isArray(response.data) ? response.data : [];

      setTukangCutting(payload);
      setLastSyncAt(new Date().toISOString());
    } catch {
      setError("Data tukang cutting tidak dapat dimuat. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTukangCutting();
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredTukangCutting = useMemo(
    () =>
      tukangCutting.filter((item) =>
        (item.nama_tukang_cutting || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ),
    [searchTerm, tukangCutting]
  );

  const summary = useMemo(() => {
    const totalMitra = tukangCutting.length;
    const bankTerdaftar = new Set(
      tukangCutting
        .map((item) => (item.bank || "").trim().toUpperCase())
        .filter(Boolean)
    ).size;
    const kontakAktif = tukangCutting.filter((item) => item.kontak).length;

    return { totalMitra, bankTerdaftar, kontakAktif };
  }, [tukangCutting]);

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
    setNewTukangCutting(INITIAL_FORM);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTukangCutting((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append(
      "nama_tukang_cutting",
      newTukangCutting.nama_tukang_cutting.trim()
    );
    formData.append("kontak", newTukangCutting.kontak.trim());
    formData.append("bank", newTukangCutting.bank.trim());
    formData.append("no_rekening", newTukangCutting.no_rekening.trim());
    formData.append("alamat", newTukangCutting.alamat.trim());

    try {
      setIsSubmitting(true);

      const response = await API.post("/tukang_cutting", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const created = response.data?.data || response.data;
      if (created && typeof created === "object") {
        setTukangCutting((prev) => [created, ...prev]);
      } else {
        await fetchTukangCutting();
      }

      setLastSyncAt(new Date().toISOString());
      closeForm();
      showToast("Data mitra berhasil disimpan.", "success");
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

  return (
    <div className="tc-container">
      <header className="tc-header">
        <div className="tc-header-top">
          <div className="tc-title-group">
            <div className="tc-brand-icon">
              <FiScissors />
            </div>
            <div className="tc-title-wrap">
              <div className="tc-module-pill">Cutting Management</div>
              <h1>Master Tukang Cutting</h1>
              <p className="tc-header-subtitle">
                Manajemen data mitra cutting untuk operasional produksi.
              </p>
            </div>
          </div>

          <div className="tc-search-wrap">
            <input
              className="tc-search-input"
              type="text"
              placeholder="Cari nama tukang cutting"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm ? (
              <button
                type="button"
                className="tc-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Hapus pencarian"
              >
                <FiX />
              </button>
            ) : (
              <span className="tc-search-icon" aria-hidden="true">
                <FaSearch />
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="tc-main">
        <section className="tc-stats">
          <div className="tc-stat-item">
            <p className="tc-stat-label">Total Mitra</p>
            <p className="tc-stat-value">{summary.totalMitra}</p>
          </div>
          <div className="tc-stat-item">
            <p className="tc-stat-label">Kontak Aktif</p>
            <p className="tc-stat-value tc-stat-value-success">{summary.kontakAktif}</p>
          </div>
          <div className="tc-stat-item">
            <p className="tc-stat-label">Bank Terdaftar</p>
            <p className="tc-stat-value tc-stat-value-info">{summary.bankTerdaftar}</p>
          </div>
          <div className="tc-stat-item">
            <p className="tc-stat-label">Sinkron Terakhir</p>
            <p className="tc-stat-value tc-stat-value-small">{formatDateTime(lastSyncAt)}</p>
          </div>
        </section>

        <section className="tc-table-wrapper">
          <div className="tc-table-header">
            <div>
              <h3>Daftar Mitra Cutting</h3>
              <p>
                Menampilkan {filteredTukangCutting.length} dari {summary.totalMitra} data
              </p>
            </div>
            <div className="tc-table-actions">
              <button
                type="button"
                className="tc-btn-secondary"
                onClick={fetchTukangCutting}
                disabled={loading}
              >
                <FiRefreshCw /> Refresh
              </button>
              <button type="button" className="tc-btn-primary" onClick={() => setShowForm(true)}>
                <FaPlus /> Tambah Mitra
              </button>
            </div>
          </div>

          <div className="tc-filter-section">
            <div className="tc-filter-wrap">
              <span className="tc-filter-label">Status Data</span>
              <span className="tc-filter-value">Aktif</span>
            </div>
          </div>

          {error ? (
            <div className="tc-alert">
              <FiAlertTriangle />
              <p>{error}</p>
              <button className="tc-btn-secondary" onClick={fetchTukangCutting}>
                Muat Ulang
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="tc-loading">
              <div className="tc-spinner" />
              <p className="tc-loading-title">Memuat Data</p>
              <p className="tc-loading-subtitle">Mohon tunggu beberapa saat...</p>
            </div>
          ) : filteredTukangCutting.length === 0 ? (
            <div className="tc-empty-state">
              <div className="tc-empty-icon">
                <FiUsers />
              </div>
              <p className="tc-empty-title">Data Tidak Ditemukan</p>
              <p className="tc-empty-text">Coba ubah kata kunci pencarian yang digunakan.</p>
            </div>
          ) : (
            <div className="tc-table-scroll">
              <table className="tc-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama Tukang Cutting</th>
                    <th>Kontak</th>
                    <th>Bank</th>
                    <th>No Rekening</th>
                    <th>Alamat</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTukangCutting.map((tc) => (
                    <tr key={tc.id}>
                      <td className="tc-id-value">#{tc.id}</td>
                      <td>{tc.nama_tukang_cutting || "-"}</td>
                      <td>{tc.kontak || "-"}</td>
                      <td>
                        <span className="tc-bank-chip">{tc.bank || "-"}</span>
                      </td>
                      <td>{tc.no_rekening || "-"}</td>
                      <td>{tc.alamat || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {showForm ? (
        <div className="tc-modal-overlay" onClick={closeForm}>
          <div className="tc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="tc-modal-header">
              <h3>Tambah Mitra Cutting</h3>
              <button className="tc-modal-close" onClick={closeForm} type="button">
                <FiX />
              </button>
            </div>

            <div className="tc-modal-body">
              <form onSubmit={handleFormSubmit} className="tc-modal-form">
                <div className="tc-form-group tc-form-full">
                  <label htmlFor="nama_tukang_cutting">
                    Nama Tukang <span className="tc-required">*</span>
                  </label>
                  <input
                    id="nama_tukang_cutting"
                    type="text"
                    name="nama_tukang_cutting"
                    className="tc-form-input"
                    value={newTukangCutting.nama_tukang_cutting}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama lengkap"
                    required
                  />
                </div>

                <div className="tc-form-group">
                  <label htmlFor="kontak">
                    Kontak <span className="tc-required">*</span>
                  </label>
                  <input
                    id="kontak"
                    type="text"
                    name="kontak"
                    className="tc-form-input"
                    value={newTukangCutting.kontak}
                    onChange={handleInputChange}
                    placeholder="Contoh: 0812xxxxxxx"
                    required
                  />
                </div>

                <div className="tc-form-group">
                  <label htmlFor="bank">
                    Bank <span className="tc-required">*</span>
                  </label>
                  <input
                    id="bank"
                    type="text"
                    name="bank"
                    className="tc-form-input"
                    value={newTukangCutting.bank}
                    onChange={handleInputChange}
                    placeholder="Contoh: BCA"
                    required
                  />
                </div>

                <div className="tc-form-group">
                  <label htmlFor="no_rekening">
                    Nomor Rekening <span className="tc-required">*</span>
                  </label>
                  <input
                    id="no_rekening"
                    type="text"
                    name="no_rekening"
                    className="tc-form-input"
                    value={newTukangCutting.no_rekening}
                    onChange={handleInputChange}
                    placeholder="Masukkan nomor rekening"
                    required
                  />
                </div>

                <div className="tc-form-group tc-form-full">
                  <label htmlFor="alamat">
                    Alamat <span className="tc-required">*</span>
                  </label>
                  <textarea
                    id="alamat"
                    name="alamat"
                    className="tc-form-input"
                    value={newTukangCutting.alamat}
                    onChange={handleInputChange}
                    placeholder="Masukkan alamat lengkap"
                    rows="3"
                    required
                  />
                </div>

                <div className="tc-form-actions">
                  <button type="submit" className="tc-btn-submit" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan Data"}
                  </button>
                  <button
                    type="button"
                    className="tc-btn-cancel"
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
        <div className={`tc-feedback-toast ${toast.type}`}>
          <span className="tc-feedback-icon">{feedbackIcon}</span>
          <p>{toast.message}</p>
        </div>
      ) : null}
    </div>
  );
};

export default TukangCutting;


import React, { useEffect, useMemo, useState } from "react";
import "./MarkeranProduk.css";
import API from "../../../api";
import { FaPlus, FaSearch, FaTrash } from "react-icons/fa";
import {
  FiAlertTriangle,
  FiBox,
  FiCheckCircle,
  FiInfo,
  FiRefreshCw,
  FiScissors,
  FiX,
} from "react-icons/fi";

const INITIAL_KOMPONEN = () => ({
  nama_komponen: "",
  total_panjang: "",
  jumlah_hasil: "",
});

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

const normalizeMarkeranResponse = (payload) => {
  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : [];

  return rawList.map((row) => ({
    ...row,
    komponen: Array.isArray(row.komponen) ? row.komponen : [],
  }));
};

const MarkeranProduk = () => {
  const [markeran, setMarkeran] = useState([]);
  const [produkList, setProdukList] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState("");
  const [toast, setToast] = useState(null);

  const [selectedProdukId, setSelectedProdukId] = useState("");
  const [markeranProdukList, setMarkeranProdukList] = useState([INITIAL_KOMPONEN()]);

  const showToast = (message, type = "info") => {
    setToast({ id: Date.now(), message, type });
  };

  const fetchMarkeran = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await API.get("/markeran_produk");
      setMarkeran(normalizeMarkeranResponse(response.data));
      setLastSyncAt(new Date().toISOString());
    } catch {
      setError("Gagal mengambil data markeran produk.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProduk = async () => {
    try {
      const response = await API.get("/produk");
      const payload = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];
      setProdukList(payload);
    } catch (fetchError) {
      console.error("Gagal mengambil data produk:", fetchError);
    }
  };

  useEffect(() => {
    fetchMarkeran();
    fetchProduk();
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredMarkeran = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return markeran;
    }

    return markeran
      .map((produk) => {
        const productText = `${produk.produk_id || ""} ${produk.nama_produk || ""}`.toLowerCase();
        const productMatch = productText.includes(term);

        const komponenList = Array.isArray(produk.komponen) ? produk.komponen : [];
        const filteredKomponen = productMatch
          ? komponenList
          : komponenList.filter((komponen) => {
              const komponenText = `${komponen.nama_komponen || ""} ${komponen.total_panjang || ""} ${komponen.jumlah_hasil || ""} ${komponen.berat_per_pcs || ""}`.toLowerCase();
              return komponenText.includes(term);
            });

        return {
          ...produk,
          komponen: filteredKomponen,
        };
      })
      .filter((produk) => produk.komponen.length > 0);
  }, [markeran, searchTerm]);

  const summary = useMemo(() => {
    const totalProduk = markeran.length;
    const totalKomponen = markeran.reduce(
      (acc, item) => acc + (Array.isArray(item.komponen) ? item.komponen.length : 0),
      0
    );

    const tampilProduk = filteredMarkeran.length;

    return {
      totalProduk,
      totalKomponen,
      tampilProduk,
    };
  }, [filteredMarkeran, markeran]);

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

  const resetForm = () => {
    setSelectedProdukId("");
    setMarkeranProdukList([INITIAL_KOMPONEN()]);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const payload = {
        produk_id: selectedProdukId,
        komponen: markeranProdukList,
      };

      await API.post("/markeran_produk", payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      closeForm();
      await fetchMarkeran();
      showToast("Data markeran berhasil disimpan.", "success");
    } catch (submitError) {
      showToast(
        submitError.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan markeran.",
        "warning"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRow = () => {
    setMarkeranProdukList((prev) => [...prev, INITIAL_KOMPONEN()]);
  };

  const handleRemoveRow = (index) => {
    setMarkeranProdukList((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const handleInputChange = (index, field, value) => {
    setMarkeranProdukList((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  return (
    <div className="mp-container">
      <header className="mp-header">
        <div className="mp-header-top">
          <div className="mp-title-group">
            <div className="mp-brand-icon">
              <FiScissors />
            </div>
            <div className="mp-title-wrap">
              <div className="mp-module-pill">Marker Planner</div>
              <h1>Data Markeran Produk</h1>
              <p className="mp-header-subtitle">
                Manajemen markeran produk untuk perencanaan cutting.
              </p>
            </div>
          </div>

          <div className="mp-search-wrap">
            <input
              className="mp-search-input"
              type="text"
              placeholder="Cari produk / komponen"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm ? (
              <button
                type="button"
                className="mp-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Hapus pencarian"
              >
                <FiX />
              </button>
            ) : (
              <span className="mp-search-icon" aria-hidden="true">
                <FaSearch />
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mp-main">
        <section className="mp-stats">
          <div className="mp-stat-item">
            <p className="mp-stat-label">Total Produk Markeran</p>
            <p className="mp-stat-value">{summary.totalProduk}</p>
          </div>
          <div className="mp-stat-item">
            <p className="mp-stat-label">Total Komponen</p>
            <p className="mp-stat-value mp-stat-value-success">{summary.totalKomponen}</p>
          </div>
          <div className="mp-stat-item">
            <p className="mp-stat-label">Data Ditampilkan</p>
            <p className="mp-stat-value mp-stat-value-info">{summary.tampilProduk}</p>
          </div>
          <div className="mp-stat-item">
            <p className="mp-stat-label">Sinkron Terakhir</p>
            <p className="mp-stat-value mp-stat-value-small">{formatDateTime(lastSyncAt)}</p>
          </div>
        </section>

        <section className="mp-table-wrapper">
          <div className="mp-table-header">
            <div>
              <h3>Daftar Markeran Produk</h3>
              <p>
                Menampilkan {summary.tampilProduk} dari {summary.totalProduk} produk markeran
              </p>
            </div>
            <div className="mp-table-actions">
              <button
                type="button"
                className="mp-btn-secondary"
                onClick={fetchMarkeran}
                disabled={loading}
              >
                <FiRefreshCw /> Refresh
              </button>
              <button type="button" className="mp-btn-primary" onClick={() => setShowForm(true)}>
                <FaPlus /> Tambah Markeran
              </button>
            </div>
          </div>

          <div className="mp-filter-section">
            <div className="mp-filter-wrap">
              <span className="mp-filter-label">Status Data</span>
              <span className="mp-filter-value">Aktif</span>
            </div>
          </div>

          {error ? (
            <div className="mp-alert">
              <FiAlertTriangle />
              <p>{error}</p>
              <button className="mp-btn-secondary" onClick={fetchMarkeran}>
                Muat Ulang
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="mp-loading">
              <div className="mp-spinner" />
              <p className="mp-loading-title">Memuat Data</p>
              <p className="mp-loading-subtitle">Mohon tunggu beberapa saat...</p>
            </div>
          ) : filteredMarkeran.length === 0 ? (
            <div className="mp-empty-state">
              <div className="mp-empty-icon">
                <FiBox />
              </div>
              <p className="mp-empty-title">Data Tidak Ditemukan</p>
              <p className="mp-empty-text">Coba ubah kata kunci pencarian yang digunakan.</p>
            </div>
          ) : (
            <div className="mp-table-scroll">
              <table className="mp-table">
                <thead>
                  <tr>
                    <th>ID Produk</th>
                    <th>Nama Produk</th>
                    <th>Nama Komponen</th>
                    <th>Berat/Panjang</th>
                    <th>Hasil Jadi</th>
                    <th>Hasil Jadi/Pcs</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarkeran.map((produk) =>
                    produk.komponen.map((komponen, index) => (
                      <tr
                        key={`${produk.produk_id}-${komponen.id || index}`}
                        className={`mp-produk-${produk.produk_id}`}
                      >
                        {index === 0 ? (
                          <>
                            <td rowSpan={produk.komponen.length} className="mp-id-value">
                              {produk.produk_id}
                            </td>
                            <td rowSpan={produk.komponen.length}>{produk.nama_produk}</td>
                          </>
                        ) : null}
                        <td>{komponen.nama_komponen || "-"}</td>
                        <td>{komponen.total_panjang || "-"}</td>
                        <td>{komponen.jumlah_hasil || "-"}</td>
                        <td>{komponen.berat_per_pcs || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {showForm ? (
        <div className="mp-modal-overlay" onClick={closeForm}>
          <div className="mp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h3>Tambah Markeran Produk</h3>
              <button className="mp-modal-close" onClick={closeForm} type="button">
                <FiX />
              </button>
            </div>

            <div className="mp-modal-body">
              <form onSubmit={handleFormSubmit} className="mp-modal-form">
                <div className="mp-form-group mp-form-full">
                  <label htmlFor="produk_id">
                    Produk <span className="mp-required">*</span>
                  </label>
                  <select
                    id="produk_id"
                    className="mp-form-input"
                    value={selectedProdukId}
                    onChange={(e) => setSelectedProdukId(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih Produk --</option>
                    {produkList.map((produk) => (
                      <option key={produk.id} value={produk.id}>
                        {produk.id} - {produk.nama_produk}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mp-komponen-section mp-form-full">
                  {markeranProdukList.map((item, index) => (
                    <div className="mp-komponen-row" key={`komponen-${index}`}>
                      <div className="mp-komponen-head">
                        <h4>Komponen #{index + 1}</h4>
                        <button
                          type="button"
                          className="mp-btn-icon danger"
                          onClick={() => handleRemoveRow(index)}
                          title="Hapus komponen"
                          disabled={markeranProdukList.length === 1}
                        >
                          <FaTrash />
                        </button>
                      </div>

                      <div className="mp-komponen-grid">
                        <div className="mp-form-group">
                          <label>
                            Nama Komponen <span className="mp-required">*</span>
                          </label>
                          <input
                            type="text"
                            className="mp-form-input"
                            value={item.nama_komponen}
                            onChange={(e) =>
                              handleInputChange(index, "nama_komponen", e.target.value)
                            }
                            placeholder="Misal: Lengan, Badan"
                            required
                          />
                        </div>

                        <div className="mp-form-group">
                          <label>
                            Berat/Panjang <span className="mp-required">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            className="mp-form-input"
                            value={item.total_panjang}
                            onChange={(e) =>
                              handleInputChange(index, "total_panjang", e.target.value)
                            }
                            placeholder="Contoh: 2.5"
                            required
                          />
                        </div>

                        <div className="mp-form-group">
                          <label>
                            Hasil Jadi <span className="mp-required">*</span>
                          </label>
                          <input
                            type="number"
                            className="mp-form-input"
                            value={item.jumlah_hasil}
                            onChange={(e) =>
                              handleInputChange(index, "jumlah_hasil", e.target.value)
                            }
                            placeholder="Contoh: 10"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button type="button" className="mp-btn-secondary" onClick={handleAddRow}>
                    <FaPlus /> Tambah Komponen
                  </button>
                </div>

                <div className="mp-form-actions">
                  <button type="submit" className="mp-btn-submit" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan Markeran"}
                  </button>
                  <button
                    type="button"
                    className="mp-btn-cancel"
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
        <div className={`mp-feedback-toast ${toast.type}`}>
          <span className="mp-feedback-icon">{feedbackIcon}</span>
          <p>{toast.message}</p>
        </div>
      ) : null}
    </div>
  );
};

export default MarkeranProduk;

import React, { useEffect, useMemo, useState } from "react";
import API from "../../../api";
import "./TukangCutting.css";
import "../SpkCutting/DashboardCutting.css";
import { FaPlus, FaSearch } from "react-icons/fa";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiEdit2,
  FiInfo,
  FiRefreshCw,
  FiScissors,
  FiTrash2,
  FiUsers,
  FiX,
  FiCreditCard,
  FiPhoneCall,
  FiClock,
} from "react-icons/fi";

const INITIAL_FORM = {
  nama_tukang_cutting: "",
  kontak: "",
  bank: "",
  no_rekening: "",
  alamat: "",
};

const formatDateTime = (isoValue) => {
  if (!isoValue) return "-";
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
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState("");
  const [newTukangCutting, setNewTukangCutting] = useState(INITIAL_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredTukangCutting = useMemo(
    () =>
      tukangCutting.filter((item) =>
        (item.nama_tukang_cutting || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (item.kontak || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.bank || "").toLowerCase().includes(searchTerm.toLowerCase())
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
    if (!toast) return null;
    if (toast.type === "success") return <FiCheckCircle />;
    if (toast.type === "warning") return <FiAlertTriangle />;
    return <FiInfo />;
  }, [toast]);

  const showToast = (message, type = "info") => {
    setToast({ id: Date.now(), message, type });
  };

  const resetForm = () => {
    setNewTukangCutting(INITIAL_FORM);
    setEditingItem(null);
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

  const openEditModal = (item) => {
    setEditingItem(item);
    setNewTukangCutting({
      nama_tukang_cutting: item.nama_tukang_cutting || "",
      kontak: item.kontak || "",
      bank: item.bank || "",
      no_rekening: item.no_rekening || "",
      alamat: item.alamat || "",
    });
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      nama_tukang_cutting: newTukangCutting.nama_tukang_cutting.trim(),
      kontak: newTukangCutting.kontak.trim(),
      bank: newTukangCutting.bank.trim(),
      no_rekening: newTukangCutting.no_rekening.trim(),
      alamat: newTukangCutting.alamat.trim(),
    };

    try {
      setIsSubmitting(true);

      if (editingItem) {
        const response = await API.put(`/tukang_cutting/${editingItem.id}`, payload);
        const updated = response.data?.data || response.data;

        setTukangCutting((prev) =>
          prev.map((item) => (item.id === editingItem.id ? { ...item, ...updated } : item))
        );
        showToast("Data mitra berhasil diperbarui.", "success");
      } else {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          formData.append(key, value);
        });

        const response = await API.post("/tukang_cutting", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const created = response.data?.data || response.data;
        if (created && typeof created === "object") {
          setTukangCutting((prev) => [created, ...prev]);
        } else {
          await fetchTukangCutting();
        }
        showToast("Data mitra berhasil disimpan.", "success");
      }

      setLastSyncAt(new Date().toISOString());
      closeForm();
    } catch (submitError) {
      showToast(
        submitError.response?.data?.message || "Terjadi kesalahan saat menyimpan data.",
        "warning"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    try {
      setIsSubmitting(true);
      await API.delete(`/tukang_cutting/${item.id}`);
      setTukangCutting((prev) => prev.filter((tc) => tc.id !== item.id));
      setLastSyncAt(new Date().toISOString());
      setDeleteConfirm(null);
      showToast(`Mitra "${item.nama_tukang_cutting}" berhasil dihapus.`, "success");
    } catch (deleteError) {
      showToast(
        deleteError.response?.data?.message || "Gagal menghapus data mitra. Silakan coba lagi.",
        "warning"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ks-page dc-page">
      {/* Header matching DashboardCutting */}
      <header className="ks-header">
        <div className="ks-header-id">
          <div className="dc-title">
            <FiScissors style={{ color: "var(--dc-blue)" }} />
            <h1>Master Tukang Cutting</h1>
          </div>
          <span className="ks-header-sub">Manajemen data mitra tukang cutting & akun pembayaran operasional produksi.</span>
        </div>
      </header>

      <main className="dc-main">
        {/* KPI Row (4 Cards like DashboardCutting) */}
        <section className="dc-kpi-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-blue"><FiUsers /></span>
              <span className="dc-kpi-label">Total Mitra</span>
            </div>
            <div className="dc-kpi-value">{summary.totalMitra} <span className="dc-unit">orang</span></div>
            <div className="dc-kpi-foot" style={{ marginTop: "4px" }}>
              <span>Tukang cutting terdaftar</span>
            </div>
          </div>

          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-green"><FiPhoneCall /></span>
              <span className="dc-kpi-label">Kontak Aktif</span>
            </div>
            <div className="dc-kpi-value" style={{ color: "var(--dc-green)" }}>{summary.kontakAktif}</div>
            <div className="dc-kpi-foot" style={{ marginTop: "4px" }}>
              <span className="dc-ok">Terverifikasi ada nomor</span>
            </div>
          </div>

          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-purple"><FiCreditCard /></span>
              <span className="dc-kpi-label">Bank Terdaftar</span>
            </div>
            <div className="dc-kpi-value" style={{ color: "var(--dc-purple)" }}>{summary.bankTerdaftar} <span className="dc-unit">bank</span></div>
            <div className="dc-kpi-foot" style={{ marginTop: "4px" }}>
              <span>Rekening penggajian</span>
            </div>
          </div>

          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-orange"><FiClock /></span>
              <span className="dc-kpi-label">Terakhir Sinkron</span>
            </div>
            <div className="dc-kpi-value" style={{ fontSize: "15px", whiteSpace: "nowrap", marginTop: "6px" }}>
              {formatDateTime(lastSyncAt)}
            </div>
            <div className="dc-kpi-foot" style={{ marginTop: "4px" }}>
              <span>Status data aktif</span>
            </div>
          </div>
        </section>

        {/* Data Table Section */}
        <section className="dc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="dc-card-head" style={{ padding: "16px 18px", margin: 0, borderBottom: "1px solid var(--ks-line)", backgroundColor: "#fbfbfc", flexWrap: "wrap", gap: "12px", justifyContent: "space-between" }}>
            <div>
              <span className="dc-card-title" style={{ fontSize: "15px", fontWeight: "700" }}>Daftar Mitra Cutting</span>
              <div style={{ fontSize: "11px", color: "var(--ks-text-soft)", marginTop: "4px" }}>
                Menampilkan <strong>{filteredTukangCutting.length}</strong> dari <strong>{summary.totalMitra}</strong> mitra
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", minWidth: "220px" }}>
                <FaSearch style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--ks-muted)", fontSize: "12px" }} />
                <input
                  type="text"
                  placeholder="Cari nama, kontak, atau bank..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%", height: "34px", paddingLeft: "30px", paddingRight: searchTerm ? "30px" : "12px",
                    borderRadius: "6px", border: "1px solid var(--ks-line)", fontSize: "12.5px", outline: "none", boxSizing: "border-box"
                  }}
                />
                {searchTerm && (
                  <button type="button" onClick={() => setSearchTerm("")} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ks-muted)" }}>
                    <FiX />
                  </button>
                )}
              </div>

              <button className="ks-btn ks-btn-outline" onClick={fetchTukangCutting} disabled={loading} style={{ height: "34px", padding: "0 12px", fontSize: "12px" }}>
                <FiRefreshCw className={loading ? "spinning" : ""} /> <span>Segarkan</span>
              </button>

              <button className="ks-btn is-primary" onClick={() => { resetForm(); setShowForm(true); }} style={{ height: "34px", padding: "0 14px", fontSize: "12px" }}>
                <FaPlus /> <span>Tambah Mitra</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="dc-error" style={{ margin: "16px" }}>
              <FiAlertTriangle />
              <span>{error}</span>
              <button className="ks-btn" onClick={fetchTukangCutting} style={{ marginLeft: "auto", height: "28px", padding: "0 10px", fontSize: "11px" }}>
                Muat Ulang
              </button>
            </div>
          )}

          <div style={{ overflowX: "auto" }} className="om-table-container">
            <table className="om-table">
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>ID</th>
                  <th>Nama Tukang Cutting</th>
                  <th>Kontak HP</th>
                  <th>Bank</th>
                  <th>No Rekening</th>
                  <th>Alamat</th>
                  <th style={{ textAlign: "center", width: "110px" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--ks-muted)" }}>Memuat data tukang cutting...</td></tr>
                ) : filteredTukangCutting.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--ks-muted)" }}>Data tidak ditemukan. Coba ubah kata kunci pencarian.</td></tr>
                ) : (
                  filteredTukangCutting.map((tc) => (
                    <tr key={tc.id}>
                      <td>
                        <span className="om-code-badge">#{tc.id}</span>
                      </td>
                      <td style={{ fontWeight: "700", color: "#0f172a" }}>
                        {tc.nama_tukang_cutting || "-"}
                      </td>
                      <td>
                        <span className="om-code-badge" style={{ backgroundColor: "#f8fafc" }}>{tc.kontak || "-"}</span>
                      </td>
                      <td>
                        <span className="om-status-badge status-ready">
                          {tc.bank || "-"}
                        </span>
                      </td>
                      <td>
                        <span className="om-code-badge" style={{ backgroundColor: "#f8fafc" }}>{tc.no_rekening || "-"}</span>
                      </td>
                      <td style={{ color: "#475569" }}>
                        {tc.alamat || "-"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button
                            type="button"
                            className="ks-btn"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => openEditModal(tc)}
                            title="Edit Data"
                          >
                            <FiEdit2 /> Edit
                          </button>
                          <button
                            type="button"
                            className="ks-btn"
                            style={{ padding: "4px 8px", fontSize: "11px", color: "#b91c1c", borderColor: "#fecaca" }}
                            onClick={() => setDeleteConfirm(tc)}
                            title="Hapus Data"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modal Form Add/Edit */}
      {showForm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeForm}>
          <div className="dc-card" style={{ width: "100%", maxWidth: "520px", margin: "20px", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="dc-card-head" style={{ padding: "16px 20px", margin: 0, borderBottom: "1px solid var(--ks-line)", backgroundColor: "#fbfbfc", borderRadius: "11px 11px 0 0" }}>
              <span className="dc-card-title" style={{ fontSize: "15px", fontWeight: "700" }}>{editingItem ? "Edit Mitra Cutting" : "Tambah Mitra Cutting"}</span>
              <button type="button" onClick={closeForm} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ks-muted)", fontSize: "18px" }}><FiX /></button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--ks-text)", marginBottom: "4px" }}>
                  Nama Tukang Cutting <span style={{ color: "#b91c1c" }}>*</span>
                </label>
                <input
                  type="text"
                  name="nama_tukang_cutting"
                  value={newTukangCutting.nama_tukang_cutting}
                  onChange={handleInputChange}
                  placeholder="Masukkan nama lengkap..."
                  required
                  style={{ width: "100%", height: "36px", padding: "0 12px", borderRadius: "6px", border: "1px solid var(--ks-line)", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--ks-text)", marginBottom: "4px" }}>
                    Kontak HP <span style={{ color: "#b91c1c" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="kontak"
                    value={newTukangCutting.kontak}
                    onChange={handleInputChange}
                    placeholder="Contoh: 0812xxxxxxx"
                    required
                    style={{ width: "100%", height: "36px", padding: "0 12px", borderRadius: "6px", border: "1px solid var(--ks-line)", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--ks-text)", marginBottom: "4px" }}>
                    Bank <span style={{ color: "#b91c1c" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="bank"
                    value={newTukangCutting.bank}
                    onChange={handleInputChange}
                    placeholder="Contoh: BCA"
                    required
                    style={{ width: "100%", height: "36px", padding: "0 12px", borderRadius: "6px", border: "1px solid var(--ks-line)", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--ks-text)", marginBottom: "4px" }}>
                  Nomor Rekening <span style={{ color: "#b91c1c" }}>*</span>
                </label>
                <input
                  type="text"
                  name="no_rekening"
                  value={newTukangCutting.no_rekening}
                  onChange={handleInputChange}
                  placeholder="Masukkan nomor rekening..."
                  required
                  style={{ width: "100%", height: "36px", padding: "0 12px", borderRadius: "6px", border: "1px solid var(--ks-line)", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--ks-text)", marginBottom: "4px" }}>
                  Alamat <span style={{ color: "#b91c1c" }}>*</span>
                </label>
                <textarea
                  name="alamat"
                  value={newTukangCutting.alamat}
                  onChange={handleInputChange}
                  placeholder="Masukkan alamat lengkap..."
                  rows="3"
                  required
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--ks-line)", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="ks-btn" onClick={closeForm} disabled={isSubmitting} style={{ height: "36px", padding: "0 16px" }}>
                  Batal
                </button>
                <button type="submit" className="ks-btn is-primary" disabled={isSubmitting} style={{ height: "36px", padding: "0 18px", fontWeight: "700" }}>
                  {isSubmitting ? "Menyimpan..." : editingItem ? "Perbarui Data" : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {deleteConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setDeleteConfirm(null)}>
          <div className="dc-card" style={{ width: "100%", maxWidth: "420px", margin: "20px", padding: "20px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#fef2f2", color: "#b91c1c", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "12px" }}>
              <FiTrash2 />
            </div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "var(--ks-text)" }}>Hapus Mitra Cutting?</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "var(--ks-text-soft)", lineHeight: "1.5" }}>
              Data mitra <strong>"{deleteConfirm.nama_tukang_cutting}"</strong> akan dihapus secara permanen dari sistem.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button type="button" className="ks-btn" onClick={() => setDeleteConfirm(null)} disabled={isSubmitting} style={{ height: "36px", padding: "0 16px" }}>
                Batal
              </button>
              <button type="button" className="ks-btn" onClick={() => handleDelete(deleteConfirm)} disabled={isSubmitting} style={{ height: "36px", padding: "0 18px", backgroundColor: "#b91c1c", color: "#fff", borderColor: "#b91c1c", fontWeight: "700" }}>
                {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className={`tc-feedback-toast ${toast.type}`} style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 10000, display: "flex", alignItems: "center", gap: "10px", padding: "12px 18px", borderRadius: "8px", backgroundColor: toast.type === "success" ? "#047857" : "#b91c1c", color: "#fff", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", fontSize: "13px" }}>
          <span>{feedbackIcon}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default TukangCutting;

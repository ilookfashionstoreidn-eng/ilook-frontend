import React, { useEffect, useState } from "react";
import API from "../../api";
import { FaPlus, FaEdit, FaEye, FaSearch, FaTimes, FaSave, FaUpload, FaTrash } from "react-icons/fa";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import "../Produk/ProductList.css";

const Pabrik = () => {
  const [pabriks, setPabriks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [modalMode, setModalMode] = useState(null); // 'add' or 'edit'
  const [form, setForm] = useState({
    id: null,
    nama_pabrik: "",
    lokasi: "",
    kontak: "",
    ktp: null,
    ktp_path: "",
  });

  const fetchPabriks = async () => {
    try {
      setLoading(true);
      const response = await API.get("/pabrik");
      setPabriks(response.data);
    } catch (err) {
      setError("Gagal memuat data pabrik.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPabriks();
  }, []);

  const filteredPabriks = pabriks.filter((p) =>
    p.nama_pabrik.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setForm((prev) => ({ ...prev, ktp: file }));
  };

  const openAddModal = () => {
    setForm({
      id: null,
      nama_pabrik: "",
      lokasi: "",
      kontak: "",
      ktp: null,
      ktp_path: "",
    });
    setModalMode("add");
  };

  const openEditModal = (pabrik) => {
    setForm({
      id: pabrik.id,
      nama_pabrik: pabrik.nama_pabrik,
      lokasi: pabrik.lokasi || "",
      kontak: pabrik.kontak || "",
      ktp: null,
      ktp_path: pabrik.ktp || "",
    });
    setModalMode("edit");
  };

  const closeModal = (force = false) => {
    if (saving && !force) return;
    setModalMode(null);
  };

  const getApiErrorMessage = (err, defaultMsg) => {
    return err.response?.data?.message || defaultMsg;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("nama_pabrik", form.nama_pabrik);
    if (form.lokasi) formData.append("lokasi", form.lokasi);
    if (form.kontak) formData.append("kontak", form.kontak);
    if (form.ktp) formData.append("ktp", form.ktp);

    if (modalMode === "edit") {
      formData.append("_method", "PUT");
    }

    try {
      setSaving(true);
      if (modalMode === "add") {
        await API.post("/pabrik", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        await Swal.fire({ icon: "success", title: "Berhasil", text: "Pabrik berhasil ditambahkan." });
      } else if (modalMode === "edit") {
        await API.post(`/pabrik/${form.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        await Swal.fire({ icon: "success", title: "Berhasil", text: "Pabrik berhasil diperbarui." });
      }
      closeModal(true);
      fetchPabriks();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal Menyimpan", text: getApiErrorMessage(err, "Data gagal disimpan.") });
    } finally {
      setSaving(false);
    }
  };

  const handleDetailClick = (pabrik) => {
    const ktpUrl = getKtpUrl(pabrik.ktp);
    let htmlContent = `
      <div style="text-align: left; font-size: 14px; line-height: 1.6;">
        <p><strong>ID:</strong> ${pabrik.id}</p>
        <p><strong>Nama Pabrik:</strong> ${pabrik.nama_pabrik}</p>
        <p><strong>Lokasi:</strong> ${pabrik.lokasi || "-"}</p>
        <p><strong>Kontak:</strong> ${pabrik.kontak || "-"}</p>
      </div>
    `;

    if (ktpUrl) {
      htmlContent += `
        <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          <p style="margin-bottom: 8px;"><strong>KTP:</strong></p>
          <a href="${ktpUrl}" target="_blank" style="display: block;">
            <img src="${ktpUrl}" alt="KTP Pabrik" style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 1px solid #cbd5e1; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"/>
            <span style="display: none; color: #2563eb; text-decoration: underline;">Lihat KTP Document</span>
          </a>
        </div>
      `;
    }

    Swal.fire({
      title: "Detail Pabrik",
      html: htmlContent,
      confirmButtonText: "Tutup",
      confirmButtonColor: "#3b82f6",
      width: 500
    });
  };

  const handleDelete = async (pabrik) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus Pabrik?",
      text: `Data "${pabrik.nama_pabrik}" akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#be123c",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await API.delete(`/pabrik/${pabrik.id}`);
      await fetchPabriks();
      Swal.fire({ icon: "success", title: "Terhapus", text: "Pabrik berhasil dihapus." });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal Menghapus", text: getApiErrorMessage(err, "Pabrik gagal dihapus.") });
    }
  };

  const getKtpUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${process.env.REACT_APP_FILE_URL || ""}/storage/${path}`;
  };

  const renderModal = () => {
    if (!modalMode) return null;
    return (
      <div className="product-list-modal-backdrop" onClick={() => closeModal()}>
        <form className="product-list-modal" onSubmit={handleFormSubmit} onClick={(e) => e.stopPropagation()}>
          <div className="product-list-modal-header">
            <div>
              <p className="product-list-modal-kicker">Data Pabrik</p>
              <h2>{modalMode === "add" ? "Tambah Pabrik Baru" : "Edit Pabrik"}</h2>
            </div>
            <button className="product-list-icon-button" type="button" onClick={() => closeModal()} disabled={saving}>
              <FaTimes />
            </button>
          </div>

          <div className="product-list-form-section">
            <div className="product-list-form-grid">
              <label className="product-list-field" style={{ gridColumn: "1 / -1" }}>
                <span>Nama Pabrik *</span>
                <input
                  type="text"
                  name="nama_pabrik"
                  value={form.nama_pabrik}
                  onChange={handleInputChange}
                  placeholder="Masukkan nama pabrik"
                  required
                  disabled={saving}
                />
              </label>

              <label className="product-list-field">
                <span>Lokasi</span>
                <input
                  type="text"
                  name="lokasi"
                  value={form.lokasi}
                  onChange={handleInputChange}
                  placeholder="Lokasi pabrik"
                  disabled={saving}
                />
              </label>

              <label className="product-list-field">
                <span>Kontak</span>
                <input
                  type="text"
                  name="kontak"
                  value={form.kontak}
                  onChange={handleInputChange}
                  placeholder="No. HP / Telepon"
                  disabled={saving}
                />
              </label>

              <label className="product-list-field" style={{ gridColumn: "1 / -1" }}>
                <span>Upload KTP (Opsional)</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    disabled={saving}
                    style={{ padding: "8px", border: "1px dashed #cbd5e1", borderRadius: "6px", cursor: "pointer" }}
                  />
                  {form.ktp_path && (
                    <div style={{ fontSize: "12px", color: "#64748b", display: "flex", gap: "8px", alignItems: "center" }}>
                      <span>KTP saat ini:</span>
                      <a href={getKtpUrl(form.ktp_path)} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "underline" }}>
                        Lihat File
                      </a>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="product-list-modal-actions">
            <button className="product-list-ghost-button" type="button" onClick={() => closeModal()} disabled={saving}>
              Batal
            </button>
            <button className="product-list-primary-button" type="submit" disabled={saving}>
              <FaSave /> {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="ks-page pl-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Pabrik</h1>
          <span className="ks-header-sub">{pabriks.length} pabrik terdaftar — Kelola data identitas dan kontak pabrik/vendor CMT</span>
        </div>
      </header>

      <section className="ks-board">
        <div className="ks-toolbar">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1, flexWrap: "wrap" }}>
            <div className="ks-search">
              <FaSearch style={{ position: "absolute", left: "10px", color: "var(--ks-muted, #9a9aa3)", pointerEvents: "none", fontSize: "12px" }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama pabrik..."
                style={{ paddingLeft: "30px" }}
              />
              {searchTerm && (
                <button type="button" className="pl-search-clear" onClick={() => setSearchTerm("")}>
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
          <div className="ks-toolbar-actions">
            <button className="ks-action-btn primary" onClick={openAddModal}>
              <FaPlus /> Tambah Pabrik
            </button>
          </div>
        </div>

        <div className="pl-table-wrapper">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Memuat data...</div>
          ) : error ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#ef4444" }}>{error}</div>
          ) : filteredPabriks.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Belum ada data pabrik.</div>
          ) : (
            <table className="pl-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Pabrik</th>
                  <th>Lokasi</th>
                  <th>Kontak</th>
                  <th>KTP</th>
                  <th style={{ width: "120px", textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredPabriks.map((pabrik) => (
                  <tr key={pabrik.id}>
                    <td>{pabrik.id}</td>
                    <td><strong>{pabrik.nama_pabrik}</strong></td>
                    <td>{pabrik.lokasi || "-"}</td>
                    <td>{pabrik.kontak || "-"}</td>
                    <td>
                      {pabrik.ktp ? (
                        <a href={getKtpUrl(pabrik.ktp)} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "underline", fontSize: "13px" }}>
                          Lihat KTP
                        </a>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>-</span>
                      )}
                    </td>
                    <td>
                      <div className="pl-table-actions" style={{ justifyContent: "center" }}>
                        <button className="product-list-icon-button" onClick={() => handleDetailClick(pabrik)} title="Lihat Detail">
                          <FaEye />
                        </button>
                        <button className="product-list-icon-button" onClick={() => openEditModal(pabrik)} title="Edit Pabrik">
                          <FaEdit />
                        </button>
                        <button className="product-list-icon-button" onClick={() => handleDelete(pabrik)} title="Hapus Pabrik" style={{ color: "#ef4444" }}>
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {renderModal()}
    </div>
  );
};

export default Pabrik;

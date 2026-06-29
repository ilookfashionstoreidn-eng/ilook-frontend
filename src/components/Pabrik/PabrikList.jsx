import React, { useEffect, useState } from "react";
import API from "../../api";
import { FaPlus, FaEdit, FaEye, FaSearch, FaTimes, FaSave } from "react-icons/fa";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import "../Produk/ProductList.css";

const PabrikList = () => {
  const [pabriks, setPabriks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedPabrik, setSelectedPabrik] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [newPabrik, setNewPabrik] = useState({
    nama_pabrik: "",
    lokasi: "",
    kontak: "",
    ktp: null,
  });

  const [editPabrik, setEditPabrik] = useState({
    id: null,
    nama_pabrik: "",
    lokasi: "",
    kontak: "",
    ktp: null,
    ktp_path: "", // untuk menampilkan preview lama
  });

  // Fetch pabrik
  useEffect(() => {
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

    fetchPabriks();
  }, []);

  const filteredPabriks = pabriks.filter((p) =>
    p.nama_pabrik.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (showEditForm) {
      setEditPabrik((prev) => ({ ...prev, [name]: value }));
    } else {
      setNewPabrik((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (showEditForm) {
      setEditPabrik((prev) => ({ ...prev, ktp: file }));
    } else {
      setNewPabrik((prev) => ({ ...prev, ktp: file }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("nama_pabrik", newPabrik.nama_pabrik);
    if (newPabrik.lokasi) formData.append("lokasi", newPabrik.lokasi);
    if (newPabrik.kontak) formData.append("kontak", newPabrik.kontak);
    if (newPabrik.ktp) formData.append("ktp", newPabrik.ktp);

    try {
      const response = await API.post("/pabrik", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPabriks((prev) => [...prev, response.data]);
      resetAndCloseForm();
      alert("Pabrik berhasil ditambahkan!");
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menambah pabrik.");
      console.error(err);
    }
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("nama_pabrik", editPabrik.nama_pabrik);
    if (editPabrik.lokasi) formData.append("lokasi", editPabrik.lokasi);
    if (editPabrik.kontak) formData.append("kontak", editPabrik.kontak);
    if (editPabrik.ktp) formData.append("ktp", editPabrik.ktp);
    formData.append("_method", "PUT");

    try {
      const response = await API.post(`/pabrik/${editPabrik.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPabriks((prev) =>
        prev.map((p) => (p.id === editPabrik.id ? response.data : p))
      );
      resetAndCloseForm();
      alert("Pabrik berhasil diperbarui!");
    } catch (err) {
      alert(err.response?.data?.message || "Gagal memperbarui pabrik.");
      console.error(err);
    }
  };

  const resetAndCloseForm = () => {
    setNewPabrik({ nama_pabrik: "", lokasi: "", kontak: "", ktp: null });
    setEditPabrik({
      id: null,
      nama_pabrik: "",
      lokasi: "",
      kontak: "",
      ktp: null,
      ktp_path: "",
    });
    setShowForm(false);
    setShowEditForm(false);
  };

  const handleEditClick = (pabrik) => {
    setEditPabrik({
      id: pabrik.id,
      nama_pabrik: pabrik.nama_pabrik,
      lokasi: pabrik.lokasi || "",
      kontak: pabrik.kontak || "",
      ktp: null,
      ktp_path: pabrik.ktp || "",
    });
    setShowEditForm(true);
  };

  const handleDetailClick = (pabrik) => {
    setSelectedPabrik(pabrik);
    setIsDetailOpen(true);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedPabrik(null);
  };

  // Helper untuk menampilkan preview KTP
  const getKtpUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${process.env.REACT_APP_FILE_URL || ""}/storage/${path}`;
  };

  return (
    <div className="ks-page pl-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Pabrik List</h1>
          <span className="ks-header-sub">{pabriks.length} data ditemukan — Database vendor/pabrik</span>
        </div>
      </header>

      <section className="ks-board">
        <div className="ks-toolbar">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1, flexWrap: "wrap" }}>
            <div className="ks-search">
              <FaSearch style={{ position: "absolute", left: "10px", color: "var(--ks-muted, #9a9aa3)", pointerEvents: "none", fontSize: "12px" }} />
              <input
                type="text"
                placeholder="Cari nama pabrik..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "30px" }}
              />
              {searchTerm && (
                <button type="button" className="pl-search-clear" onClick={() => setSearchTerm("")}>
                  <FaTimes />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            <button className="ks-btn is-primary" type="button" onClick={() => setShowForm(true)} title="Tambah Pabrik">
              <FaPlus /> Tambah
            </button>
          </div>
        </div>

        {error && <div className="pl-error-bar">{error}</div>}

        <div className="ks-grid-scroll">
          <table className="ks-grid">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Pabrik</th>
                <th>Lokasi</th>
                <th>Kontak</th>
                <th>KTP</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ height: "132px", textAlign: "center", color: "var(--ks-muted, #9a9aa3)", fontWeight: 600 }}>
                    Memuat data pabrik...
                  </td>
                </tr>
              ) : filteredPabriks.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ height: "132px", textAlign: "center", color: "var(--ks-muted, #9a9aa3)", fontWeight: 600 }}>
                    Belum ada data pabrik.
                  </td>
                </tr>
              ) : (
                filteredPabriks.map((pabrik) => (
                  <tr key={pabrik.id}>
                    <td className="ks-cell-code">
                      <strong>{pabrik.id}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.9em", fontWeight: 600 }}>{pabrik.nama_pabrik}</span>
                    </td>
                    <td>{pabrik.lokasi || "-"}</td>
                    <td>{pabrik.kontak || "-"}</td>
                    <td>
                      {pabrik.ktp ? (
                        <a
                          href={getKtpUrl(pabrik.ktp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link"
                          style={{ color: "#3b82f6", fontWeight: 500, textDecoration: "none" }}
                        >
                          Lihat KTP
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDetailClick(pabrik)}
                        className="ks-icon-btn"
                        title="Detail"
                        style={{ border: "none", background: "none", color: "#64748b", cursor: "pointer", padding: "4px 8px" }}
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleEditClick(pabrik)}
                        className="ks-icon-btn"
                        title="Edit"
                        style={{ border: "none", background: "none", color: "#3b82f6", cursor: "pointer", padding: "4px 8px" }}
                      >
                        <FaEdit />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Tambah */}
      {showForm && (
        <div className="product-list-modal-backdrop" onClick={resetAndCloseForm}>
          <div className="product-list-modal" onClick={(event) => event.stopPropagation()}>
            <div className="product-list-modal-header">
              <div>
                <p className="product-list-modal-kicker">Data Pabrik</p>
                <h2>Tambah Pabrik Baru</h2>
              </div>
              <button className="product-list-icon-button" onClick={resetAndCloseForm} type="button">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="product-list-form-section">
                <div className="product-list-form-grid">
                  <label className="product-list-input-group" style={{ gridColumn: "1 / -1" }}>
                    <span>Nama Pabrik *</span>
                    <input
                      type="text"
                      name="nama_pabrik"
                      value={newPabrik.nama_pabrik}
                      onChange={handleInputChange}
                      required
                    />
                  </label>
                  <label className="product-list-input-group" style={{ gridColumn: "1 / -1" }}>
                    <span>Lokasi</span>
                    <input
                      type="text"
                      name="lokasi"
                      value={newPabrik.lokasi}
                      onChange={handleInputChange}
                    />
                  </label>
                  <label className="product-list-input-group" style={{ gridColumn: "1 / -1" }}>
                    <span>Kontak</span>
                    <input
                      type="text"
                      name="kontak"
                      value={newPabrik.kontak}
                      onChange={handleInputChange}
                    />
                  </label>
                  <label className="product-list-input-group" style={{ gridColumn: "1 / -1" }}>
                    <span>Upload KTP (opsional)</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              <div className="product-list-modal-actions">
                <button className="product-list-ghost-button" type="button" onClick={resetAndCloseForm}>
                  Batal
                </button>
                <button className="product-list-primary-button" type="submit">
                  <FaSave /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {showEditForm && (
        <div className="product-list-modal-backdrop" onClick={resetAndCloseForm}>
          <div className="product-list-modal" onClick={(event) => event.stopPropagation()}>
            <div className="product-list-modal-header">
              <div>
                <p className="product-list-modal-kicker">Data Pabrik</p>
                <h2>Edit Pabrik</h2>
              </div>
              <button className="product-list-icon-button" onClick={resetAndCloseForm} type="button">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleFormUpdate}>
              <div className="product-list-form-section">
                <div className="product-list-form-grid">
                  <label className="product-list-input-group" style={{ gridColumn: "1 / -1" }}>
                    <span>Nama Pabrik *</span>
                    <input
                      type="text"
                      name="nama_pabrik"
                      value={editPabrik.nama_pabrik}
                      onChange={handleInputChange}
                      required
                    />
                  </label>
                  <label className="product-list-input-group" style={{ gridColumn: "1 / -1" }}>
                    <span>Lokasi</span>
                    <input
                      type="text"
                      name="lokasi"
                      value={editPabrik.lokasi}
                      onChange={handleInputChange}
                    />
                  </label>
                  <label className="product-list-input-group" style={{ gridColumn: "1 / -1" }}>
                    <span>Kontak</span>
                    <input
                      type="text"
                      name="kontak"
                      value={editPabrik.kontak}
                      onChange={handleInputChange}
                    />
                  </label>
                  <label className="product-list-input-group" style={{ gridColumn: "1 / -1" }}>
                    <span>Upload KTP Baru (opsional)</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} style={{ border: "1px solid #cbd5e1", padding: "8px", borderRadius: "4px" }} />
                    {editPabrik.ktp_path && (
                      <div style={{ marginTop: "8px", fontSize: "13px" }}>
                        KTP saat ini:{" "}
                        <a
                          href={getKtpUrl(editPabrik.ktp_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#3b82f6", fontWeight: 500, textDecoration: "none" }}
                        >
                          Lihat File
                        </a>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="product-list-modal-actions">
                <button className="product-list-ghost-button" type="button" onClick={resetAndCloseForm}>
                  Batal
                </button>
                <button className="product-list-primary-button" type="submit">
                  <FaSave /> Perbarui
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {isDetailOpen && selectedPabrik && (
        <div className="product-list-modal-backdrop" onClick={closeDetail}>
          <div className="product-list-modal" style={{ maxWidth: "500px" }} onClick={(event) => event.stopPropagation()}>
            <div className="product-list-modal-header">
              <div>
                <p className="product-list-modal-kicker">Data Pabrik</p>
                <h2>Detail Pabrik</h2>
              </div>
              <button className="product-list-icon-button" onClick={closeDetail} type="button">
                <FaTimes />
              </button>
            </div>

            <div className="product-list-form-section">
              <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>ID</td>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>{selectedPabrik.id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Nama Pabrik</td>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>{selectedPabrik.nama_pabrik}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Lokasi</td>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>{selectedPabrik.lokasi || "-"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Kontak</td>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>{selectedPabrik.kontak || "-"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "#64748b" }}>KTP</td>
                    <td style={{ padding: "8px 0" }}>
                      {selectedPabrik.ktp ? (
                        <a
                          href={getKtpUrl(selectedPabrik.ktp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#3b82f6", fontWeight: 500, textDecoration: "none" }}
                        >
                          Lihat Dokumen
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="product-list-modal-actions">
              <button className="product-list-primary-button" style={{ width: "100%", justifyContent: "center" }} onClick={closeDetail}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PabrikList;

import React, { useEffect, useMemo, useRef, useState } from "react";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import "../Produk/ProductList.css";
import API from "../../api";
import { FaPlus, FaEdit, FaEye, FaTrash, FaSearch, FaUserTie, FaMapMarkerAlt, FaTimes, FaSave } from "react-icons/fa";

const INITIAL_FORM = { nama_gudang: "", alamat: "", pic: "" };

const Gudang = () => {
  const [gudangs, setGudangs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedGudang, setSelectedGudang] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [newGudang, setNewGudang] = useState(INITIAL_FORM);
  const [editGudang, setEditGudang] = useState({ id: null, ...INITIAL_FORM });

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchGudangs = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await API.get("/gudang");
        setGudangs(res.data || []);
      } catch (e) {
        setError("Gagal memuat data gudang.");
      } finally {
        setLoading(false);
      }
    };

    fetchGudangs();
  }, []);

  const filteredGudangs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return gudangs;

    return gudangs.filter((g) => {
      const nama = (g.nama_gudang || "").toLowerCase();
      const alamat = (g.alamat || "").toLowerCase();
      const pic = (g.pic || "").toLowerCase();
      return nama.includes(keyword) || alamat.includes(keyword) || pic.includes(keyword) || String(g.id || "").includes(keyword);
    });
  }, [gudangs, searchTerm]);

  const withPic = useMemo(() => gudangs.filter((g) => Boolean(g.pic && g.pic.trim())).length, [gudangs]);
  const withAlamat = useMemo(() => gudangs.filter((g) => Boolean(g.alamat && g.alamat.trim())).length, [gudangs]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (showEditForm) {
      setEditGudang((prev) => ({ ...prev, [name]: value }));
      return;
    }
    setNewGudang((prev) => ({ ...prev, [name]: value }));
  };

  const resetAndCloseForm = () => {
    setNewGudang(INITIAL_FORM);
    setEditGudang({ id: null, ...INITIAL_FORM });
    setShowForm(false);
    setShowEditForm(false);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/gudang", newGudang);
      setGudangs((prev) => [...prev, res.data]);
      resetAndCloseForm();
      alert("Gudang berhasil ditambahkan.");
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menambah gudang.");
    }
  };

  const handleEditClick = (gudang) => {
    setEditGudang({
      id: gudang.id,
      nama_gudang: gudang.nama_gudang || "",
      alamat: gudang.alamat || "",
      pic: gudang.pic || "",
    });
    setShowEditForm(true);
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post(`/gudang/${editGudang.id}`, { ...editGudang, _method: "PUT" });
      setGudangs((prev) => prev.map((item) => (item.id === editGudang.id ? res.data : item)));
      resetAndCloseForm();
      alert("Gudang berhasil diperbarui.");
    } catch (err) {
      alert(err.response?.data?.message || "Gagal memperbarui gudang.");
    }
  };

  const handleDelete = async (gudang) => {
    if (!window.confirm(`Hapus gudang "${gudang.nama_gudang}"?`)) return;

    try {
      await API.delete(`/gudang/${gudang.id}`);
      setGudangs((prev) => prev.filter((item) => item.id !== gudang.id));
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menghapus gudang.");
    }
  };

  const handleDetailClick = async (gudang) => {
    setSelectedGudang(gudang);
    setIsDetailOpen(true);
    setDetailLoading(true);

    try {
      const res = await API.get(`/gudang/${gudang.id}`);
      setSelectedGudang(res.data || gudang);
    } catch (_) {
      setSelectedGudang(gudang);
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedGudang(null);
    setDetailLoading(false);
  };

  return (
    <div className="ks-page pl-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Master Gudang</h1>
          <span className="ks-header-sub">
            {gudangs.length} gudang terdaftar, {withPic} dengan PIC, {withAlamat} dengan alamat — Kelola data gudang, alamat operasional, dan penanggung jawab lokasi
          </span>
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
                placeholder="Cari nama gudang, alamat, PIC, atau ID..."
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
            <button className="ks-btn is-primary" onClick={() => setShowForm(true)}>
              <FaPlus /> Tambah Gudang
            </button>
          </div>
        </div>

        <div className="ks-grid-scroll">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Memuat data gudang...</div>
          ) : error ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#ef4444", fontWeight: 600 }}>{error}</div>
          ) : filteredGudangs.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Belum ada data gudang yang sesuai pencarian.</div>
          ) : (
            <table className="ks-grid">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Nama Gudang</th>
                  <th>Alamat</th>
                  <th>PIC</th>
                  <th style={{ width: "120px", textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredGudangs.map((gudang, index) => (
                  <tr key={gudang.id}>
                    <td className="ks-cell-code">
                      <strong>{index + 1}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.9em", fontWeight: 600 }}>{gudang.nama_gudang}</span>
                    </td>
                    <td>{gudang.alamat || <span style={{ color: "#94a3b8" }}>Tidak ada</span>}</td>
                    <td>
                      {gudang.pic ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <FaUserTie style={{ color: "#64748b" }} /> <span>{gudang.pic}</span>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>Belum diisi</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button className="ks-icon-btn" onClick={() => handleDetailClick(gudang)} title="Lihat Detail" style={{ border: "none", background: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}>
                          <FaEye />
                        </button>
                        <button className="ks-icon-btn" onClick={() => handleEditClick(gudang)} title="Edit Gudang" style={{ border: "none", background: "none", color: "#3b82f6", cursor: "pointer", padding: "4px" }}>
                          <FaEdit />
                        </button>
                        <button className="ks-icon-btn" onClick={() => handleDelete(gudang)} title="Hapus Gudang" style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}>
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

      {/* MODAL TAMBAH */}
      {showForm && (
        <div className="product-list-modal-backdrop" onClick={resetAndCloseForm}>
          <form className="product-list-modal" onSubmit={handleFormSubmit} onClick={(e) => e.stopPropagation()}>
            <div className="product-list-modal-header">
              <div>
                <p className="product-list-modal-kicker">Data Gudang</p>
                <h2>Tambah Gudang Baru</h2>
              </div>
              <button className="product-list-icon-button" type="button" onClick={resetAndCloseForm}>
                <FaTimes />
              </button>
            </div>

            <div className="product-list-form-section">
              <div className="product-list-form-grid">
                <label className="product-list-field" style={{ gridColumn: "1 / -1" }}>
                  <span>Nama Gudang *</span>
                  <input
                    type="text"
                    name="nama_gudang"
                    value={newGudang.nama_gudang}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama gudang"
                    required
                  />
                </label>

                <label className="product-list-field" style={{ gridColumn: "1 / -1" }}>
                  <span>Alamat</span>
                  <textarea
                    name="alamat"
                    value={newGudang.alamat}
                    onChange={handleInputChange}
                    placeholder="Alamat lengkap gudang"
                    rows="3"
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid var(--ks-border, #e2e8f0)",
                      borderRadius: "6px",
                      outline: "none",
                      fontSize: "14px",
                      resize: "vertical"
                    }}
                  />
                </label>

                <label className="product-list-field" style={{ gridColumn: "1 / -1" }}>
                  <span>PIC</span>
                  <input
                    type="text"
                    name="pic"
                    value={newGudang.pic}
                    onChange={handleInputChange}
                    placeholder="Nama penanggung jawab"
                  />
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
      )}

      {/* MODAL EDIT */}
      {showEditForm && (
        <div className="product-list-modal-backdrop" onClick={resetAndCloseForm}>
          <form className="product-list-modal" onSubmit={handleFormUpdate} onClick={(e) => e.stopPropagation()}>
            <div className="product-list-modal-header">
              <div>
                <p className="product-list-modal-kicker">Data Gudang</p>
                <h2>Edit Gudang</h2>
              </div>
              <button className="product-list-icon-button" type="button" onClick={resetAndCloseForm}>
                <FaTimes />
              </button>
            </div>

            <div className="product-list-form-section">
              <div className="product-list-form-grid">
                <label className="product-list-field" style={{ gridColumn: "1 / -1" }}>
                  <span>Nama Gudang *</span>
                  <input
                    type="text"
                    name="nama_gudang"
                    value={editGudang.nama_gudang}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama gudang"
                    required
                  />
                </label>

                <label className="product-list-field" style={{ gridColumn: "1 / -1" }}>
                  <span>Alamat</span>
                  <textarea
                    name="alamat"
                    value={editGudang.alamat}
                    onChange={handleInputChange}
                    placeholder="Alamat lengkap gudang"
                    rows="3"
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid var(--ks-border, #e2e8f0)",
                      borderRadius: "6px",
                      outline: "none",
                      fontSize: "14px",
                      resize: "vertical"
                    }}
                  />
                </label>

                <label className="product-list-field" style={{ gridColumn: "1 / -1" }}>
                  <span>PIC</span>
                  <input
                    type="text"
                    name="pic"
                    value={editGudang.pic}
                    onChange={handleInputChange}
                    placeholder="Nama penanggung jawab"
                  />
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
      )}

      {/* MODAL DETAIL */}
      {isDetailOpen && selectedGudang && (
        <div className="product-list-modal-backdrop" onClick={closeDetail}>
          <div className="product-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="product-list-modal-header">
              <div>
                <p className="product-list-modal-kicker">Data Gudang</p>
                <h2>Detail Gudang</h2>
              </div>
              <button className="product-list-icon-button" type="button" onClick={closeDetail}>
                <FaTimes />
              </button>
            </div>

            <div className="product-list-form-section">
              {detailLoading ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Memuat detail terbaru...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px", color: "#334155" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                    <span style={{ fontWeight: 600, color: "#64748b" }}>Nomor</span>
                    <span>{selectedGudang.id}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                    <span style={{ fontWeight: 600, color: "#64748b" }}>Nama</span>
                    <span style={{ fontWeight: 500 }}>{selectedGudang.nama_gudang}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                    <span style={{ fontWeight: 600, color: "#64748b" }}>Alamat</span>
                    <span>
                      {selectedGudang.alamat ? (
                        <>
                          <FaMapMarkerAlt style={{ marginRight: "6px", color: "#94a3b8" }} />
                          {selectedGudang.alamat}
                        </>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>Tidak ada</span>
                      )}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                    <span style={{ fontWeight: 600, color: "#64748b" }}>PIC</span>
                    <span>
                      {selectedGudang.pic ? (
                        <>
                          <FaUserTie style={{ marginRight: "6px", color: "#94a3b8" }} />
                          {selectedGudang.pic}
                        </>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>Belum diisi</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="product-list-modal-actions">
              <button className="product-list-ghost-button" type="button" onClick={closeDetail}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gudang;

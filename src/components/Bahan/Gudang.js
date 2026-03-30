import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Gudang.css";
import API from "../../api";
import { FaPlus, FaEdit, FaEye, FaTrash, FaWarehouse, FaSearch, FaUserTie, FaMapMarkerAlt, FaTimes } from "react-icons/fa";

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
  const totalGudang = gudangs.length;

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
    <div className="gudang-page">
      <header className="gudang-header">
        <div className="gudang-title-group">
          <div className="gudang-header-icon">
            <FaWarehouse />
          </div>
          <div>
            <h1>Master Data Gudang</h1>
            <p>Kelola data gudang, alamat operasional, dan penanggung jawab lokasi.</p>
          </div>
        </div>
        <button className="gudang-btn-add" onClick={() => setShowForm(true)}>
          <FaPlus /> Tambah Gudang
        </button>
      </header>

      <section className="gudang-kpi-grid">
        <article className="gudang-kpi-card">
          <span>Total Gudang</span>
          <strong>{totalGudang}</strong>
          <p>Data aktif pada sistem</p>
        </article>
        <article className="gudang-kpi-card">
          <span>PIC Tersedia</span>
          <strong>{withPic}</strong>
          <p>Sudah ada penanggung jawab</p>
        </article>
        <article className="gudang-kpi-card">
          <span>Alamat Terisi</span>
          <strong>{withAlamat}</strong>
          <p>Siap dipakai untuk distribusi</p>
        </article>
      </section>

      <section className="gudang-table-container">
        <div className="gudang-filter-header">
          <div className="gudang-table-title">
            <h2>Daftar Gudang</h2>
            <p>{filteredGudangs.length} data ditampilkan</p>
          </div>
          <div className="gudang-search-bar">
            <FaSearch className="gudang-search-icon" />
            <input
              type="text"
              placeholder="Cari nama gudang, alamat, PIC, atau ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="gudang-state">
            <p className="gudang-loading">Memuat data gudang...</p>
          </div>
        ) : error ? (
          <div className="gudang-state">
            <p className="gudang-error">{error}</p>
          </div>
        ) : filteredGudangs.length === 0 ? (
          <div className="gudang-state">
            <p className="gudang-loading">Belum ada data gudang yang sesuai pencarian.</p>
          </div>
        ) : (
          <table className="gudang-table">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Nama Gudang</th>
                <th>Alamat</th>
                <th>PIC</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredGudangs.map((gudang, index) => (
                <tr key={gudang.id}>
                  <td className="gudang-id-cell">{index + 1}</td>
                  <td>
                    <div className="gudang-name-cell">
                      <span>{gudang.nama_gudang}</span>
                    </div>
                  </td>
                  <td>{gudang.alamat || <span className="gudang-empty-mark">Tidak ada</span>}</td>
                  <td>
                    {gudang.pic ? (
                      <span className="gudang-pic-chip">
                        <FaUserTie /> {gudang.pic}
                      </span>
                    ) : (
                      <span className="gudang-empty-mark">Belum diisi</span>
                    )}
                  </td>
                  <td>
                    <div className="gudang-actions">
                      <button className="gudang-btn-icon view" onClick={() => handleDetailClick(gudang)} title="Detail">
                        <FaEye />
                      </button>
                      <button className="gudang-btn-icon edit" onClick={() => handleEditClick(gudang)} title="Edit">
                        <FaEdit />
                      </button>
                      <button className="gudang-btn-icon delete" onClick={() => handleDelete(gudang)} title="Hapus">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showForm && (
        <div className="gudang-modal" onClick={resetAndCloseForm}>
          <div className="gudang-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gudang-modal-header">
              <div>
                <h2>Tambah Gudang Baru</h2>
                <p>Isi data gudang untuk menambah master data lokasi penyimpanan.</p>
              </div>
              <button type="button" className="gudang-close-btn" onClick={resetAndCloseForm} title="Tutup">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="gudang-form">
              <div className="gudang-form-group">
                <label>Nama Gudang *</label>
                <input type="text" name="nama_gudang" value={newGudang.nama_gudang} onChange={handleInputChange} placeholder="Masukkan nama gudang" required />
              </div>

              <div className="gudang-form-group">
                <label>Alamat</label>
                <textarea name="alamat" value={newGudang.alamat} onChange={handleInputChange} placeholder="Alamat lengkap gudang" rows="3" />
              </div>

              <div className="gudang-form-group">
                <label>PIC</label>
                <input type="text" name="pic" value={newGudang.pic} onChange={handleInputChange} placeholder="Nama penanggung jawab" />
              </div>

              <div className="gudang-form-actions">
                <button type="submit" className="gudang-btn gudang-btn-primary">
                  Simpan
                </button>
                <button type="button" onClick={resetAndCloseForm} className="gudang-btn gudang-btn-secondary">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="gudang-modal" onClick={resetAndCloseForm}>
          <div className="gudang-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gudang-modal-header">
              <div>
                <h2>Edit Gudang</h2>
                <p>Perbarui informasi gudang tanpa mengubah histori transaksi.</p>
              </div>
              <button type="button" className="gudang-close-btn" onClick={resetAndCloseForm} title="Tutup">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleFormUpdate} className="gudang-form">
              <div className="gudang-form-group">
                <label>Nama Gudang *</label>
                <input type="text" name="nama_gudang" value={editGudang.nama_gudang} onChange={handleInputChange} placeholder="Masukkan nama gudang" required />
              </div>

              <div className="gudang-form-group">
                <label>Alamat</label>
                <textarea name="alamat" value={editGudang.alamat} onChange={handleInputChange} placeholder="Alamat lengkap gudang" rows="3" />
              </div>

              <div className="gudang-form-group">
                <label>PIC</label>
                <input type="text" name="pic" value={editGudang.pic} onChange={handleInputChange} placeholder="Nama penanggung jawab" />
              </div>

              <div className="gudang-form-actions">
                <button type="submit" className="gudang-btn gudang-btn-primary">
                  Perbarui
                </button>
                <button type="button" onClick={resetAndCloseForm} className="gudang-btn gudang-btn-secondary">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailOpen && selectedGudang && (
        <div className="gudang-modal" onClick={closeDetail}>
          <div className="gudang-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gudang-modal-header">
              <div>
                <h2>Detail Gudang</h2>
                <p>{detailLoading ? "Memuat detail terbaru..." : "Ringkasan informasi legal dan operasional gudang."}</p>
              </div>
              <button type="button" className="gudang-close-btn" onClick={closeDetail} title="Tutup">
                <FaTimes />
              </button>
            </div>

            <div className="gudang-detail-grid">
              <div className="gudang-detail-item">
                <strong>Nomor</strong>
                <span>{selectedGudang.id}</span>
              </div>
              <div className="gudang-detail-item">
                <strong>Nama Gudang</strong>
                <span>{selectedGudang.nama_gudang}</span>
              </div>
              <div className="gudang-detail-item">
                <strong>Alamat</strong>
                <span>{selectedGudang.alamat || <span className="gudang-empty-mark">Tidak ada</span>}</span>
              </div>
              <div className="gudang-detail-item">
                <strong>PIC</strong>
                <span>{selectedGudang.pic || <span className="gudang-empty-mark">Belum diisi</span>}</span>
              </div>
            </div>

            <div className="gudang-detail-metadata">
              <div>
                <FaMapMarkerAlt />
                <span>Alamat gudang digunakan sebagai acuan pergerakan stok dan distribusi.</span>
              </div>
              <div>
                <FaUserTie />
                <span>PIC membantu koordinasi penerimaan, penyimpanan, dan pengeluaran barang.</span>
              </div>
            </div>

            <div className="gudang-form-actions gudang-detail-actions">
              <button onClick={closeDetail} className="gudang-btn gudang-btn-secondary">
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

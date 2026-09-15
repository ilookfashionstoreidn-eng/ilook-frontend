import React, { useEffect, useState } from "react";
import "./KodeSeriBelumDikerjakanOptimized.css";
import "./Aksesoris.css";
import API from "../../api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { FaPlus, FaEdit, FaTrash, FaUndo, FaBox, FaSearch, FaTimes } from "react-icons/fa";

const initialAksesorisForm = {
  nama_aksesoris: "",
  jenis_aksesoris: "",
  satuan: "",
  harga_jual: "",
  foto_aksesoris: null,
  jumlah_per_satuan: "",
};

const SATUAN_AKSESORIS = {
  pcs: "Pcs",
  pack: "Pack",
  lusin: "Lusin",
  kodi: "Kodi",
  roll: "Roll",
  gross: "Gross",
};

const JENIS_AKSESORIS = {
  handtag: "Handtag",
  renda: "Renda",
  kancing: "Kancing",
  resleting: "Resetling",
};

const Aksesoris = () => {
  const [aksesoris, setAksesoris] = useState({ data: [] });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomJenisAksesoris, setShowCustomJenisAksesoris] = useState(false);
  const [editAksesoris, setEditAksesoris] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);

  const [newAksesoris, setNewAksesoris] = useState(initialAksesorisForm);

  const showSuccessAlert = (title, text) =>
    Swal.fire({
      icon: "success",
      title,
      text,
      timer: 1800,
      showConfirmButton: false,
      timerProgressBar: true,
    });

  const showErrorAlert = (title, text) =>
    Swal.fire({
      icon: "error",
      title,
      text,
      confirmButtonText: "Mengerti",
      confirmButtonColor: "#2563eb",
    });

  const handleJenisAksesorisChange = (e) => {
    const value = e.target.value;

    if (value === "custom") {
      setShowCustomJenisAksesoris(true);
      setNewAksesoris((prev) => ({ ...prev, jenis_aksesoris: "" }));
    } else {
      setShowCustomJenisAksesoris(false);
      setNewAksesoris((prev) => ({ ...prev, jenis_aksesoris: value }));
    }
  };

  const fetchAksesoris = async (page = 1) => {
    try {
      setLoading(true);
      const response = await API.get("/aksesoris?page=" + page + "&per_page=50");
      setAksesoris(response.data);
    } catch (error) {
      setError("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAksesoris(page);
  }, [page]);

  const fetchPage = (newPage) => {
    if (newPage >= 1 && newPage <= aksesoris.last_page) {
      setPage(newPage);
    }
  };

  const sortedAksesoris = [...(aksesoris.data || [])].sort((a, b) => b.id - a.id);

  const filteredAksesoris = sortedAksesoris.filter((item) =>
    item.nama_aksesoris.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFormSubmit = async (e) => {
    e.preventDefault(); // Mencegah refresh halaman

    const formData = new FormData();
    formData.append("nama_aksesoris", newAksesoris.nama_aksesoris);
    formData.append("jenis_aksesoris", newAksesoris.jenis_aksesoris);
    formData.append("satuan", newAksesoris.satuan);
    formData.append("harga_jual", newAksesoris.harga_jual);
    formData.append("jumlah_per_satuan", newAksesoris.jumlah_per_satuan);

    if (newAksesoris.foto_aksesoris) {
      formData.append("foto_aksesoris", newAksesoris.foto_aksesoris);
    }

    try {
      const response = await API.post("/aksesoris", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setAksesoris((prev) => ({
        ...prev,
        data: [...prev.data, response.data], // ← untuk create, bukan map()
      }));

      await fetchAksesoris();
      setShowForm(false); // Tutup modal
      setShowCustomJenisAksesoris(false);
      setNewAksesoris(initialAksesorisForm);
      await showSuccessAlert("Berhasil", "Aksesoris berhasil ditambahkan.");
    } catch (error) {
      await showErrorAlert("Gagal Menyimpan", error.response?.data?.message || "Terjadi kesalahan saat menyimpan aksesoris.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setNewAksesoris((prev) => ({
      ...prev,
      [name]: name === "nama_aksesoris" || name === "jenis_aksesoris" ? value.toUpperCase() : value,
    }));
  };

  const handleFileChange = (e) => {
    setNewAksesoris((prev) => ({
      ...prev,
      foto_aksesoris: e.target.files[0] || null,
    }));
  };

  const handleEdit = (item) => {
    setEditAksesoris({
      id: item.id,
      nama_aksesoris: item.nama_aksesoris,
      jenis_aksesoris: item.jenis_aksesoris,
      satuan: item.satuan,
      harga_jual: item.harga_jual,
      jumlah_per_satuan: item.jumlah_per_satuan,
      foto: item.foto,
    });

    setShowEditForm(true);
  };

  const handleUpdateAksesoris = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("nama_aksesoris", editAksesoris.nama_aksesoris);
    formData.append("jenis_aksesoris", editAksesoris.jenis_aksesoris);
    formData.append("satuan", editAksesoris.satuan);
    formData.append("harga_jual", editAksesoris.harga_jual);
    formData.append("jumlah_per_satuan", editAksesoris.jumlah_per_satuan);

    // Hanya jika ada gambar baru
    if (editAksesoris.foto_aksesoris instanceof File) {
      formData.append("foto_aksesoris", editAksesoris.foto_aksesoris);
    }

    try {
      const response = await API.post(`/aksesoris/${editAksesoris.id}?_method=PUT`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setAksesoris((prev) => ({
        ...prev,
        data: prev.data.map((a) =>
          a.id === editAksesoris.id ? response.data : a
        ),
      }));
      setShowEditForm(false);
      await showSuccessAlert("Berhasil", "Aksesoris berhasil diperbarui.");
    } catch (error) {
      await showErrorAlert("Gagal Memperbarui", error.response?.data?.message || "Aksesoris gagal diperbarui.");
    }
  };

  const handleChangeEdit = (e) => {
    const { name, value } = e.target;

    setEditAksesoris((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditFileChange = (e) => {
    setEditAksesoris((prev) => ({
      ...prev,
      foto_aksesoris: e.target.files[0] || null,
    }));
  };

  const handleDelete = async (item) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus Aksesoris?",
      text: `Data "${item.nama_aksesoris}" akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#be123c",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setDeletingId(item.id);
      await API.delete(`/aksesoris/${item.id}`);
      await fetchAksesoris(page);
      await showSuccessAlert("Terhapus", "Aksesoris berhasil dihapus.");
    } catch (error) {
      await showErrorAlert(
        "Gagal Menghapus",
        error.response?.data?.error || "Aksesoris gagal dihapus."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetStok = async (item) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Reset Stok?",
      text: `Semua stok tersedia untuk "${item.nama_aksesoris}" akan dijadikan terpakai (stok jadi 0).`,
      showCancelButton: true,
      confirmButtonText: "Ya, reset",
      cancelButtonText: "Batal",
      confirmButtonColor: "#b45309",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setResettingId(item.id);
      await API.post(`/aksesoris/${item.id}/reset-stok`);
      await fetchAksesoris(page);
      await showSuccessAlert("Berhasil", `Stok "${item.nama_aksesoris}" berhasil direset.`);
    } catch (error) {
      await showErrorAlert(
        "Gagal Reset Stok",
        error.response?.data?.error || "Stok gagal direset."
      );
    } finally {
      setResettingId(null);
    }
  };

  const closeAddModal = () => {
    setShowForm(false);
    setShowCustomJenisAksesoris(false);
    setNewAksesoris(initialAksesorisForm);
  };

  const closeEditModal = () => {
    setShowEditForm(false);
    setEditAksesoris(null);
  };

  return (
    <div className="ks-page ak-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Data Aksesoris</h1>
          <span className="ks-header-sub">
            {aksesoris.total ?? filteredAksesoris.length} data ditemukan — Master data aksesoris, satuan, harga, dan stok
          </span>
        </div>
      </header>

      <section className="ks-board">
        <div className="ks-toolbar">
          <div className="ks-search">
            <FaSearch className="ks-search-icon" style={{ fontSize: "12px" }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari aksesoris..."
            />
            {searchTerm && (
              <button type="button" className="ak-search-clear" onClick={() => setSearchTerm("")}>
                <FaTimes />
              </button>
            )}
          </div>

          <button className="ks-btn is-primary" type="button" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah
          </button>
        </div>

        <div className="ks-grid-scroll">
          <table className="ks-grid">
            <thead>
              <tr>
                <th>No.</th>
                <th>Nama Aksesoris</th>
                <th>Jenis</th>
                <th>Isi / Satuan</th>
                <th>Harga (Pack)</th>
                <th>Harga / Pcs</th>
                <th>Stok</th>
                <th>Foto</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="ak-state-cell">Memuat data aksesoris...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="9" className="ak-state-cell ak-state-error">{error}</td>
                </tr>
              ) : filteredAksesoris.length === 0 ? (
                <tr>
                  <td colSpan="9" className="ak-state-cell">Tidak ada data aksesoris ditemukan.</td>
                </tr>
              ) : (
                filteredAksesoris.map((item, index) => (
                  <tr key={item.id}>
                    <td className="ks-cell-num">{index + 1}</td>
                    <td className="ks-cell-code">
                      <strong>{item.nama_aksesoris}</strong>
                    </td>
                    <td>{item.jenis_aksesoris}</td>
                    <td>{item.jumlah_per_satuan}</td>
                    <td>Rp {Number(item.harga_jual).toLocaleString("id-ID")}</td>
                    <td className="ks-muted">
                      Rp {Number(item.harga_per_biji).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td>
                      <span className={`ak-stock-badge${item.jumlah_stok === 0 ? " out" : item.jumlah_stok < 10 ? " low" : ""}`}>
                        {item.jumlah_stok} {item.satuan}
                      </span>
                    </td>
                    <td>
                      {item.foto_aksesoris ? (
                        <img
                          src={`${process.env.REACT_APP_FILE_URL || ""}/storage/${item.foto_aksesoris}`}
                          alt={item.nama_aksesoris}
                          className="ak-thumb"
                        />
                      ) : (
                        <div className="ak-thumb ak-thumb-empty">
                          <FaBox />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button className="ks-btn pl-act-btn" type="button" onClick={() => handleEdit(item)} title="Edit">
                          <FaEdit />
                        </button>
                        <button
                          className="ks-btn pl-act-btn warning"
                          type="button"
                          onClick={() => handleResetStok(item)}
                          disabled={resettingId === item.id || item.jumlah_stok === 0}
                          title="Reset Stok"
                        >
                          <FaUndo />
                        </button>
                        <button
                          className="ks-btn pl-act-btn danger"
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          title="Hapus"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {aksesoris.data?.length > 0 && aksesoris.last_page > 1 && (
          <div className="ks-footer">
            <span className="ak-footer-info">
              Halaman {aksesoris.current_page} dari {aksesoris.last_page}
            </span>
            <div className="ks-pager">
              <button className="ks-pg-btn" type="button" onClick={() => fetchPage(page - 1)} disabled={page === 1}>
                Prev
              </button>
              <button className="ks-pg-btn" type="button" onClick={() => fetchPage(page + 1)} disabled={page === aksesoris.last_page}>
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modal Tambah */}
      {showForm && (
        <div className="ak-modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeAddModal()}>
          <div className="ak-modal">
            <div className="ak-modal-header">
              <div>
                <p className="ak-modal-kicker">Aksesoris</p>
                <h2>Tambah Aksesoris</h2>
              </div>
              <button className="ak-modal-close" type="button" onClick={closeAddModal}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="ak-modal-body">
                <div className="ak-form-grid">
                  <label className="ak-field full">
                    <span>Nama Aksesoris</span>
                    <input type="text" name="nama_aksesoris" value={newAksesoris.nama_aksesoris} onChange={handleInputChange} placeholder="Masukkan nama aksesoris" required />
                  </label>

                  <label className="ak-field">
                    <span>Jenis Aksesoris</span>
                    <select name="jenis_aksesoris" value={showCustomJenisAksesoris ? "custom" : newAksesoris.jenis_aksesoris} onChange={handleJenisAksesorisChange}>
                      <option value="">Pilih Jenis</option>
                      {Object.keys(JENIS_AKSESORIS).map((key) => (
                        <option key={key} value={key}>
                          {JENIS_AKSESORIS[key]}
                        </option>
                      ))}
                      <option value="custom">Lainnya...</option>
                    </select>
                  </label>

                  {showCustomJenisAksesoris && (
                    <label className="ak-field">
                      <span>Jenis Aksesoris (Baru)</span>
                      <input type="text" name="jenis_aksesoris" placeholder="Masukkan jenis aksesoris baru" value={newAksesoris.jenis_aksesoris} onChange={handleInputChange} />
                    </label>
                  )}

                  <label className="ak-field">
                    <span>Satuan Aksesoris</span>
                    <select name="satuan" value={newAksesoris.satuan} onChange={handleInputChange}>
                      <option value="">Pilih Satuan</option>
                      {Object.keys(SATUAN_AKSESORIS).map((key) => (
                        <option key={key} value={key}>
                          {SATUAN_AKSESORIS[key]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="ak-field">
                    <span>Jumlah per Satuan (biji per {newAksesoris.satuan || "satuan"})</span>
                    <input
                      type="number"
                      name="jumlah_per_satuan"
                      value={newAksesoris.jumlah_per_satuan}
                      onChange={handleInputChange}
                      placeholder="Contoh: 12"
                      min="1"
                      required
                    />
                  </label>

                  <label className="ak-field">
                    <span>Harga Jual</span>
                    <input type="number" name="harga_jual" value={newAksesoris.harga_jual} onChange={handleInputChange} placeholder="Masukkan harga jual" min="0" />
                  </label>

                  <label className="ak-field full">
                    <span>Gambar Produk</span>
                    <input type="file" name="foto_aksesoris" accept="image/*" onChange={handleFileChange} />
                    {newAksesoris.foto_aksesoris && !(newAksesoris.foto_aksesoris instanceof File) && (
                      <div className="ak-preview-image">
                        <p>Gambar Saat Ini:</p>
                        <img src={`${process.env.REACT_APP_FILE_URL || ""}/storage/${newAksesoris.foto_aksesoris}`} alt="Foto Aksesoris" />
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="ak-modal-actions">
                <button type="button" className="ak-ghost-button" onClick={closeAddModal}>
                  Batal
                </button>
                <button type="submit" className="ak-primary-button">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {showEditForm && editAksesoris && (
        <div className="ak-modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeEditModal()}>
          <div className="ak-modal">
            <div className="ak-modal-header">
              <div>
                <p className="ak-modal-kicker">Aksesoris</p>
                <h2>Edit Aksesoris</h2>
              </div>
              <button className="ak-modal-close" type="button" onClick={closeEditModal}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleUpdateAksesoris}>
              <div className="ak-modal-body">
                <div className="ak-form-grid">
                  <label className="ak-field full">
                    <span>Nama Aksesoris</span>
                    <input type="text" name="nama_aksesoris" value={editAksesoris.nama_aksesoris} onChange={handleChangeEdit} required />
                  </label>

                  <label className="ak-field">
                    <span>Jenis Aksesoris</span>
                    <select name="jenis_aksesoris" value={editAksesoris.jenis_aksesoris} onChange={handleChangeEdit}>
                      <option value="">Pilih Jenis</option>
                      {Object.keys(JENIS_AKSESORIS).map((key) => (
                        <option key={key} value={key}>
                          {JENIS_AKSESORIS[key]}
                        </option>
                      ))}
                      <option value="custom">Lainnya...</option>
                    </select>
                    {editAksesoris.jenis_aksesoris === "custom" && (
                      <input type="text" name="jenis_aksesoris" placeholder="Masukkan jenis aksesoris baru" onChange={(e) => setEditAksesoris((prev) => ({ ...prev, jenis_aksesoris: e.target.value }))} style={{ marginTop: "6px" }} />
                    )}
                  </label>

                  <label className="ak-field">
                    <span>Satuan Aksesoris</span>
                    <select name="satuan" value={editAksesoris.satuan} onChange={handleChangeEdit}>
                      <option value="">Pilih Satuan</option>
                      {Object.keys(SATUAN_AKSESORIS).map((key) => (
                        <option key={key} value={key}>
                          {SATUAN_AKSESORIS[key]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="ak-field">
                    <span>Jumlah per Satuan</span>
                    <input type="number" name="jumlah_per_satuan" value={editAksesoris.jumlah_per_satuan} onChange={handleChangeEdit} min="1" />
                  </label>

                  <label className="ak-field">
                    <span>Harga Satuan</span>
                    <input type="number" name="harga_jual" value={editAksesoris.harga_jual} onChange={handleChangeEdit} placeholder="Masukkan harga satuan" />
                  </label>

                  <label className="ak-field full">
                    <span>Gambar Produk</span>
                    <input type="file" accept="image/*" onChange={handleEditFileChange} />
                    {editAksesoris.foto && !(editAksesoris.foto_aksesoris instanceof File) && (
                      <div className="ak-preview-image">
                        <p>Gambar Saat Ini:</p>
                        <img src={`${process.env.REACT_APP_FILE_URL || ""}/storage/${editAksesoris.foto}`} alt="Foto Aksesoris" />
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="ak-modal-actions">
                <button type="button" className="ak-ghost-button" onClick={closeEditModal}>
                  Batal
                </button>
                <button type="submit" className="ak-primary-button">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Aksesoris;

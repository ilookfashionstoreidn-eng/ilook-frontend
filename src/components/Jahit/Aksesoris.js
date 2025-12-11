import React, { useEffect, useState } from "react";
import "./Aksesoris.css";
import API from "../../api";
import { FaPlus, FaEdit, FaBox } from "react-icons/fa";

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

  const [newAksesoris, setNewAksesoris] = useState({
    nama_aksesoris: "",
    jenis_aksesoris: "",
    satuan: "",
    harga_jual: "",
    foto_aksesoris: null,
    jumlah_per_satuan: "",

  });

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
    const response = await API.get("/aksesoris?page=" + page);
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

    console.log("Form data yang dikirim:");
    console.log({
      nama_aksesoris: newAksesoris.nama_aksesoris,
      jenis_aksesoris: newAksesoris.jenis_aksesoris,
      satuan: newAksesoris.satuan,
      harga_jual: newAksesoris.harga_jual,
      foto_aksesoris: newAksesoris.foto_aksesoris,
    });
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

      console.log("Response API:", response);
      console.log("Response Data:", response.data); // Debugging

      alert("Produk berhasil ditambahkan!");

      setAksesoris((prev) => ({
      ...prev,
          data: [...prev.data, response.data], // ← untuk create, bukan map()
        }));



      await fetchAksesoris();
      setShowForm(false); // Tutup modal

      // Reset form input
      setNewAksesoris({ nama_aksesoris: "", jenis_aksesoris: "", satuan: "" });
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);

      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan produk.");
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


      alert("Aksesoris diperbarui!");
      setShowEditForm(false);
    } catch (error) {
      console.error(error.response?.data);
      alert("Gagal update!");
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

  return (
    <div className="aksesoris-page">
      <div className="aksesoris-header">
        <div className="aksesoris-header-icon">
          <FaBox />
        </div>
        <h1>Data Aksesoris</h1>
      </div>

      <div className="aksesoris-table-container">
        <div className="aksesoris-filter-header">
          <button className="aksesoris-btn-add" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah
          </button>

          <div className="aksesoris-search-bar">
            <input type="text" placeholder="Cari nama aksesoris..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="aksesoris-loading">Memuat data...</div>
        ) : error ? (
          <div className="aksesoris-error">{error}</div>
        ) : filteredAksesoris.length === 0 ? (
          <div className="aksesoris-empty-state">
            <div className="aksesoris-empty-state-icon">📦</div>
            <p>Tidak ada data aksesoris</p>
          </div>
        ) : (
          <div className="aksesoris-table-wrapper">
            <table className="aksesoris-table">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Nama Aksesoris</th>
                  <th>Jenis Aksesoris</th>
                  <th>Satuan</th>
                  <th>Jumlah / Satuan</th>
                  <th>Harga Jual</th>
                  <th>Harga per Biji</th>
                  <th>Jumlah Stok</th>
                  <th>Foto Aksesoris</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {aksesoris.data && aksesoris.data.map((aksesoris, index) => (
                  <tr key={aksesoris.id}>
                    <td>{index + 1}</td>
                    <td>{aksesoris.nama_aksesoris}</td>
                    <td>{aksesoris.jenis_aksesoris}</td>
                    <td>{aksesoris.satuan}</td>
                    <td>{aksesoris.jumlah_per_satuan}</td>
                    <td>
                      <span className="aksesoris-price">
                        Rp{" "}
                        {Number(aksesoris.harga_jual).toLocaleString("id-ID", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td>
                      Rp {Number(aksesoris.harga_per_biji).toLocaleString("id-ID", {
                        minimumFractionDigits: 2
                      })}
                    </td>
                    <td>
                      <span className={`aksesoris-stok-badge ${aksesoris.jumlah_stok === 0 ? "out" : aksesoris.jumlah_stok < 10 ? "low" : ""}`}>{aksesoris.jumlah_stok}</span>
                    </td>
                    <td>{aksesoris.foto_aksesoris ? <img src={`${process.env.REACT_APP_API_URL}/storage/${aksesoris.foto_aksesoris}`} alt="Foto Aksesoris" className="aksesoris-image" /> : "-"}</td>
                    <td>
                      <div className="aksesoris-action-card">
                        <button className="aksesoris-btn-icon" onClick={() => handleEdit(aksesoris)} title="Edit">
                          <FaEdit className="icon" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          {aksesoris.data?.length > 0 && (
  <div className="pembelian-aksesoris-pagination">
    <button
      disabled={page === 1}
      onClick={() => fetchPage(page - 1)}
    >
      ← Prev
    </button>

    <span>
      Halaman {aksesoris.current_page} / {aksesoris.last_page}
    </span>

    <button
      disabled={page === aksesoris.last_page}
      onClick={() => fetchPage(page + 1)}
    >
      Next →
    </button>
  </div>
)}

      </div>
        )}
      </div>
      {/* Modal Form */}
      {showForm && (
        <div className="aksesoris-modal" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="aksesoris-modal-content">
            <h2>Tambah Aksesoris</h2>
            <form onSubmit={handleFormSubmit} className="aksesoris-form">
              <div className="aksesoris-form-group">
                <label>Nama Aksesoris:</label>
                <input type="text" name="nama_aksesoris" value={newAksesoris.nama_aksesoris} onChange={handleInputChange} placeholder="Masukkan nama aksesoris" required />
              </div>
              <div className="aksesoris-form-group">
                <label>Jenis Aksesoris</label>
                <select name="jenis_aksesoris" value={showCustomJenisAksesoris ? "custom" : newAksesoris.jenis_aksesoris} onChange={handleJenisAksesorisChange}>
                  <option value="">Pilih Jenis</option>
                  {Object.keys(JENIS_AKSESORIS).map((key) => (
                    <option key={key} value={key}>
                      {JENIS_AKSESORIS[key]}
                    </option>
                  ))}
                  <option value="custom">Lainnya...</option>
                </select>

                {/* Muncul kalau user pilih "custom" */}
                {showCustomJenisAksesoris && <input type="text" name="jenis_aksesoris" placeholder="Masukkan jenis aksesoris baru" value={newAksesoris.jenis_aksesoris} onChange={handleInputChange} className="form-control" />}
              </div>

              <div className="aksesoris-form-group">
                <label>Satuan Aksesoris</label>
                <select name="satuan" value={newAksesoris.satuan} onChange={handleInputChange}>
                  <option value="">Pilih Satuan</option>
                  {Object.keys(SATUAN_AKSESORIS).map((key) => (
                    <option key={key} value={key}>
                      {SATUAN_AKSESORIS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="aksesoris-form-group">
                <label>Jumlah per Satuan (biji per {newAksesoris.satuan || 'satuan'})</label>
                <input
                  type="number"
                  name="jumlah_per_satuan"
                  value={newAksesoris.jumlah_per_satuan}
                  onChange={handleInputChange}
                  placeholder="Contoh: 12"
                  min="1"
                  required
                />
              </div>


              <div className="aksesoris-form-group">
                <label>Harga Jual:</label>
                <input type="number" name="harga_jual" value={newAksesoris.harga_jual} onChange={handleInputChange} placeholder="Masukkan harga jual" min="0" />
              </div>

              <div className="aksesoris-form-group">
                <label>Gambar Produk</label>
                <input type="file" name="foto_aksesoris" accept="image/*" onChange={handleFileChange} />
                {newAksesoris.foto_aksesoris && !(newAksesoris.foto_aksesoris instanceof File) && (
                  <div className="aksesoris-preview-image">
                    <p>Gambar Saat Ini:</p>
                    <img src={`${process.env.REACT_APP_API_URL}/storage/${newAksesoris.foto_aksesoris}`} alt="Foto Aksesoris" />
                  </div>
                )}
              </div>

              <div className="aksesoris-form-actions">
                <button type="submit" className="aksesoris-btn-submit">
                  Simpan
                </button>
                <button type="button" className="aksesoris-btn-cancel" onClick={() => setShowForm(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="aksesoris-modal" onClick={(e) => e.target === e.currentTarget && setShowEditForm(false)}>
          <div className="aksesoris-modal-content">
            <h2>Edit Aksesoris</h2>

            <form onSubmit={handleUpdateAksesoris} className="aksesoris-form">
              <div className="aksesoris-form-group">
                <label>Nama Aksesoris</label>
                <input type="text" name="nama_aksesoris" value={editAksesoris.nama_aksesoris} onChange={handleChangeEdit} required />
              </div>

              <div className="aksesoris-form-group">
                <label>Jenis Aksesoris</label>
                <select name="jenis_aksesoris" value={editAksesoris.jenis_aksesoris} onChange={handleChangeEdit}>
                  <option value="">Pilih Jenis</option>

                  {Object.keys(JENIS_AKSESORIS).map((key) => (
                    <option key={key} value={key}>
                      {JENIS_AKSESORIS[key]}
                    </option>
                  ))}

                  <option value="custom">Lainnya...</option>
                </select>

                {/* Jika pilih custom → muncul input manual */}
                {editAksesoris.jenis_aksesoris === "custom" && (
                  <input type="text" name="jenis_aksesoris" placeholder="Masukkan jenis aksesoris baru" onChange={(e) => setEditAksesoris((prev) => ({ ...prev, jenis_aksesoris: e.target.value }))} className="form-control" />
                )}
              </div>

              <div className="aksesoris-form-group">
                <label>Satuan Aksesoris</label>
                <select name="satuan" value={editAksesoris.satuan} onChange={handleChangeEdit}>
                  <option value="">Pilih Satuan</option>

                  {Object.keys(SATUAN_AKSESORIS).map((key) => (
                    <option key={key} value={key}>
                      {SATUAN_AKSESORIS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="aksesoris-form-group">
                <label>Jumlah per Satuan</label>
                <input
                  type="number"
                  name="jumlah_per_satuan"
                  value={editAksesoris.jumlah_per_satuan}
                  onChange={handleChangeEdit}
                  min="1"
                />
              </div>


              <div className="aksesoris-form-group">
                <label>Harga Satuan</label>
                <input type="number" name="harga_jual" value={editAksesoris.harga_jual} onChange={handleChangeEdit} placeholder="Masukkan harga satuan" />
              </div>

              <div className="aksesoris-form-group">
                <label>Gambar Produk:</label>
                <input type="file" accept="image/*" onChange={handleEditFileChange} />
                {editAksesoris.foto && !(editAksesoris.foto_aksesoris instanceof File) && (
                  <div className="aksesoris-preview-image">
                    <p>Gambar Saat Ini:</p>
                    <img src={`${process.env.REACT_APP_API_URL}/storage/${editAksesoris.foto}`} alt="Foto Aksesoris" />
                  </div>
                )}
              </div>

              <div className="aksesoris-form-actions">
                <button type="submit" className="aksesoris-btn-submit">
                  Simpan
                </button>
                <button type="button" className="aksesoris-btn-cancel" onClick={() => setShowEditForm(false)}>
                  Batal
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

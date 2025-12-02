import React, { useEffect, useState } from "react";
import "../Jahit/Penjahit.css";
import "../Cutting/SpkCutting/SpkCuting.css";
import API from "../../api";
import { FaPlus, FaEdit } from "react-icons/fa";

const PembelianBahan = () => {
  const [items, setItems] = useState([]);
  const [pabrikList, setPabrikList] = useState([]);
  const [gudangList, setGudangList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const [newItem, setNewItem] = useState({
    pabrik_id: "",
    gudang_id: "",
    tanggal_kirim: "",
    no_surat_jalan: "",
    foto_surat_jalan: null,
    nama_bahan: "",
    gramasi: "",
    satuan: "",
    lebar_kain: "",
    keterangan: "",
    warna: [{ nama: "", jumlah_rol: 1, rol: [0] }],
  });

  const [editItem, setEditItem] = useState({
    id: null,
    pabrik_id: "",
    gudang_id: "",
    tanggal_kirim: "",
    no_surat_jalan: "",
    nama_bahan: "",
    gramasi: "",
    satuan: "",
    lebar_kain: "",
    keterangan: "",
    warna: [],
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [resData, resPabrik, resGudang] = await Promise.all([API.get("/pembelian-bahan"), API.get("/pabrik"), API.get("/gudang")]);
        setItems(Array.isArray(resData.data) ? resData.data : resData.data?.data || []);
        setPabrikList(resPabrik.data || []);
        setGudangList(resGudang.data || []);
      } catch (e) {
        setError("Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filteredItems = items.filter((b) => (b.keterangan || "").toLowerCase().includes(searchTerm.toLowerCase()));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (showEditForm) {
      setEditItem((prev) => ({ ...prev, [name]: value }));
    } else {
      setNewItem((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (showEditForm) {
      setEditItem((prev) => ({ ...prev, foto_surat_jalan: file }));
    } else {
      setNewItem((prev) => ({ ...prev, foto_surat_jalan: file }));
    }
  };

  const addWarna = () => {
    setNewItem((prev) => ({ ...prev, warna: [...prev.warna, { nama: "", jumlah_rol: 1, rol: [0] }] }));
  };

  const removeWarna = (index) => {
    setNewItem((prev) => ({ ...prev, warna: prev.warna.filter((_, i) => i !== index) }));
  };

  const handleWarnaFieldChange = (index, key, value) => {
    setNewItem((prev) => {
      const warna = [...prev.warna];
      warna[index] = { ...warna[index], [key]: value };
      return { ...prev, warna };
    });
  };

  const addRol = (warnaIndex) => {
    setNewItem((prev) => {
      const warna = [...prev.warna];
      warna[warnaIndex].rol = [...warna[warnaIndex].rol, 0];
      warna[warnaIndex].jumlah_rol = warna[warnaIndex].rol.length;
      return { ...prev, warna };
    });
  };

  const removeRol = (warnaIndex, rolIndex) => {
    setNewItem((prev) => {
      const warna = [...prev.warna];
      warna[warnaIndex].rol = warna[warnaIndex].rol.filter((_, i) => i !== rolIndex);
      warna[warnaIndex].jumlah_rol = warna[warnaIndex].rol.length;
      return { ...prev, warna };
    });
  };

  const handleRolChange = (warnaIndex, rolIndex, value) => {
    setNewItem((prev) => {
      const warna = [...prev.warna];
      const arr = [...warna[warnaIndex].rol];
      arr[rolIndex] = value;
      warna[warnaIndex].rol = arr;
      warna[warnaIndex].jumlah_rol = arr.length;
      return { ...prev, warna };
    });
  };

  const resetForm = () => {
    setNewItem({
      pabrik_id: "",
      gudang_id: "",
      tanggal_kirim: "",
      no_surat_jalan: "",
      foto_surat_jalan: null,
      nama_bahan: "",
      gramasi: "",
      satuan: "",
      lebar_kain: "",
      keterangan: "",
      warna: [{ nama: "", jumlah_rol: 1, rol: [0] }],
    });
    setEditItem({ id: null, pabrik_id: "", gudang_id: "", tanggal_kirim: "", no_surat_jalan: "", nama_bahan: "", gramasi: "", satuan: "", lebar_kain: "", keterangan: "", warna: [] });
    setShowForm(false);
    setShowEditForm(false);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("keterangan", newItem.keterangan || "");
      formData.append("gudang_id", newItem.gudang_id);
      formData.append("pabrik_id", newItem.pabrik_id);
      formData.append("tanggal_kirim", newItem.tanggal_kirim);
      if (newItem.no_surat_jalan) formData.append("no_surat_jalan", newItem.no_surat_jalan);
      if (newItem.foto_surat_jalan) formData.append("foto_surat_jalan", newItem.foto_surat_jalan);
      formData.append("nama_bahan", newItem.nama_bahan || "");
      formData.append("gramasi", newItem.gramasi || "");
      formData.append("satuan", newItem.satuan || "");
      formData.append("lebar_kain", newItem.lebar_kain || "");
      newItem.warna.forEach((w, i) => {
        formData.append(`warna[${i}][nama]`, w.nama || "");
        formData.append(`warna[${i}][jumlah_rol]`, w.jumlah_rol || w.rol.length);
        w.rol.forEach((berat, j) => {
          formData.append(`warna[${i}][rol][${j}]`, berat);
        });
      });

      const response = await API.post("/pembelian-bahan", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || response.data;
      setItems((prev) => [...prev, data]);
      resetForm();
      alert("Pembelian bahan berhasil ditambahkan!");
    } catch (error) {
      alert(error.response?.data?.message || "Gagal menambah pembelian bahan.");
    }
  };

  const handleEditClick = (item) => {
    setEditItem({
      id: item.id,
      pabrik_id: item.pabrik_id || "",
      gudang_id: item.gudang_id || "",
      tanggal_kirim: item.tanggal_kirim || "",
      gramasi: item.gramasi || "",
      keterangan: item.keterangan || "",
    });
    setShowEditForm(true);
  };

  const handleDetailClick = async (item) => {
    try {
      const res = await API.get(`/pembelian-bahan/${item.id}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data;
      setDetailItem(data);
    } catch (e) {
      setDetailItem(item);
    } finally {
      setShowDetail(true);
    }
  };

  const handleDownloadBarcode = async (item) => {
    const endpoints = [`/pembelian-bahan/${item.id}/download-barcode`, `/pembelian-bahan/${item.id}/download-barcodes`, `/pembelian-bahan/${item.id}/downloadBarcode`, `/pembelian-bahan/${item.id}/downloadBarcodes`];
    const tried = [];
    for (const ep of endpoints) {
      try {
        const res = await API.get(ep, {
          responseType: "arraybuffer",
          headers: { Accept: "application/pdf" },
        });
        const ct = (res.headers && (res.headers["content-type"] || res.headers["Content-Type"])) || "";
        if (!ct.toLowerCase().includes("pdf")) throw new Error(`Unexpected content-type: ${ct}`);
        const disposition = res.headers && (res.headers["content-disposition"] || res.headers["Content-Disposition"]);
        const match = disposition && disposition.match(/filename="?([^";]+)"?/i);
        const filename = match ? match[1] : `barcode-bahan-${item.id}.pdf`;
        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return;
      } catch (err) {
        const status = err.response ? err.response.status : "ERR";
        tried.push(`${(API.defaults && API.defaults.baseURL) || ""}${ep} [${status}]`);
      }
    }
    alert(`Gagal mendownload barcode PDF. URL dicoba: ${tried.join(" | ")}`);
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await API.post(`/pembelian-bahan/${editItem.id}`, { ...editItem, _method: "PUT" });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || response.data;
      setItems((prev) => prev.map((b) => (b.id === editItem.id ? data : b)));
      resetForm();
      alert("Pembelian bahan berhasil diperbarui!");
    } catch (error) {
      alert(error.response?.data?.message || "Gagal memperbarui pembelian bahan.");
    }
  };

  const getNamaById = (list, id, field = "nama") => {
    const found = list.find((x) => x.id === id);
    return found ? found[field] || found.nama_gudang || found.nama_pabrik || found.nama : id;
  };

  return (
    <div>
      <div className="penjahit-container">
        <h1>Pembelian Bahan</h1>
      </div>

      <div className="table-container">
        <div className="filter-header1">
          <button onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah
          </button>
          <div className="search-bar1">
            <input type="text" placeholder="Cari keterangan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <p>Memuat data...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <table className="penjahit-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Keterangan</th>
                <th>Gudang</th>
                <th>Pabrik</th>
                <th>Tanggal Kirim</th>
                <th>Gramasi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.keterangan}</td>
                  <td>{getNamaById(gudangList, b.gudang_id, "nama_gudang")}</td>
                  <td>{getNamaById(pabrikList, b.pabrik_id, "nama_pabrik")}</td>
                  <td>{b.tanggal_kirim}</td>
                  <td>{b.gramasi}</td>
                  <td>
                    <button className="btn" onClick={() => handleDetailClick(b)}>
                      Detail
                    </button>
                    <button className="btn" onClick={() => handleDownloadBarcode(b)}>
                      Download Barcode
                    </button>
                    <button className="btn-icon" onClick={() => handleEditClick(b)}>
                      <FaEdit />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Tambah Pembelian Bahan</h2>
            <form onSubmit={handleFormSubmit} className="modern-form">
              <div className="form-group">
                <label>Keterangan</label>
                <select name="keterangan" value={newItem.keterangan} onChange={handleInputChange} required>
                  <option value="">Pilih Keterangan</option>
                  <option value="Utuh">Utuh</option>
                  <option value="Sisa">Sisa</option>
                </select>
              </div>
              <div className="form-group">
                <label>Pabrik</label>
                <select name="pabrik_id" value={newItem.pabrik_id} onChange={handleInputChange} required>
                  <option value="">Pilih Pabrik</option>
                  {pabrikList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_pabrik || p.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Gudang</label>
                <select name="gudang_id" value={newItem.gudang_id} onChange={handleInputChange} required>
                  <option value="">Pilih Gudang</option>
                  {gudangList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama_gudang || g.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tanggal Kirim</label>
                <input type="date" name="tanggal_kirim" value={newItem.tanggal_kirim} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>No. Surat Jalan</label>
                <input type="text" name="no_surat_jalan" value={newItem.no_surat_jalan} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Foto Surat Jalan (jpg/png/pdf)</label>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
              </div>
              <div className="form-group">
                <label>Nama Bahan</label>
                <input type="text" name="nama_bahan" value={newItem.nama_bahan} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Gramasi</label>
                <input type="number" name="gramasi" value={newItem.gramasi} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Satuan</label>
                <input type="text" name="satuan" value={newItem.satuan} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Lebar Kain</label>
                <input type="number" name="lebar_kain" value={newItem.lebar_kain} onChange={handleInputChange} required />
              </div>

              <h3>Warna & Rol</h3>
              {newItem.warna.map((w, wi) => (
                <div key={wi} className="form-group">
                  <label>{`Warna ${wi + 1}`}</label>
                  <input type="text" value={w.nama} onChange={(e) => handleWarnaFieldChange(wi, "nama", e.target.value)} required />
                  <label style={{ marginTop: 8 }}>Jumlah Rol: {w.rol.length}</label>
                  <div style={{ marginTop: 8 }}>
                    {w.rol.map((berat, ri) => (
                      <div key={ri} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <label style={{ minWidth: 120 }}>{`Berat ${ri + 1} (kg)`}</label>
                        <input type="number" placeholder={`Berat ${ri + 1} (kg)`} value={berat} onChange={(e) => handleRolChange(wi, ri, e.target.value)} />
                        <button type="button" className="btn btn-cancel" onClick={() => removeRol(wi, ri)}>
                          Hapus Rol
                        </button>
                      </div>
                    ))}
                    <button type="button" className="btn" onClick={() => addRol(wi)}>
                      Tambah Rol
                    </button>
                    <button type="button" className="btn btn-cancel" onClick={() => removeWarna(wi)} style={{ marginLeft: 8 }}>
                      Hapus Warna
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <button type="button" className="btn" onClick={addWarna}>
                  <FaPlus /> Tambah Warna
                </button>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-submit">
                  Simpan
                </button>
                <button type="button" className="btn btn-cancel" onClick={() => setShowForm(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="modal">
          <div className="modal-content">
            <h2>Detail Pembelian Bahan</h2>
            {detailItem ? (
              <div className="modern-form">
                <div className="form-group">
                  <strong>ID:</strong> {detailItem.id}
                </div>
                <div className="form-group">
                  <strong>Keterangan:</strong> {detailItem.keterangan}
                </div>
                <div className="form-group">
                  <strong>Pabrik:</strong> {getNamaById(pabrikList, detailItem.pabrik_id, "nama_pabrik")}
                </div>
                <div className="form-group">
                  <strong>Gudang:</strong> {getNamaById(gudangList, detailItem.gudang_id, "nama_gudang")}
                </div>
                <div className="form-group">
                  <strong>Tanggal Kirim:</strong> {detailItem.tanggal_kirim}
                </div>
                <div className="form-group">
                  <strong>No. Surat Jalan:</strong> {detailItem.no_surat_jalan || "-"}
                </div>
                <div className="form-group">
                  <strong>Nama Bahan:</strong> {detailItem.nama_bahan || "-"}
                </div>
                <div className="form-group">
                  <strong>Gramasi:</strong> {detailItem.gramasi}
                </div>
                <div className="form-group">
                  <strong>Satuan:</strong> {detailItem.satuan || "-"}
                </div>
                <div className="form-group">
                  <strong>Lebar Kain:</strong> {detailItem.lebar_kain || "-"}
                </div>
                {detailItem.foto_surat_jalan && (
                  <div className="form-group">
                    <a href={detailItem.foto_surat_jalan} target="_blank" rel="noreferrer">
                      Lihat Surat Jalan
                    </a>
                  </div>
                )}
                <h3>Warna</h3>
                {(detailItem.warna || []).map((w, wi) => (
                  <div key={wi} className="form-group">
                    <div>
                      <strong>Nama:</strong> {w.nama || w.warna}
                    </div>
                    <div>
                      <strong>Jumlah Rol:</strong> {w.jumlah_rol}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      {(w.rol || []).map((r, ri) => (
                        <div key={ri}>Berat: {r.berat ?? r} kg</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Memuat detail...</p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={() => {
                  setShowDetail(false);
                  setDetailItem(null);
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edit Pembelian Bahan</h2>
            <form onSubmit={handleFormUpdate} className="modern-form">
              <div className="form-group">
                <label>Pabrik</label>
                <select name="pabrik_id" value={editItem.pabrik_id} onChange={handleInputChange} required>
                  <option value="">Pilih Pabrik</option>
                  {pabrikList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_pabrik || p.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Gudang</label>
                <select name="gudang_id" value={editItem.gudang_id} onChange={handleInputChange} required>
                  <option value="">Pilih Gudang</option>
                  {gudangList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama_gudang || g.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tanggal Kirim</label>
                <input type="date" name="tanggal_kirim" value={editItem.tanggal_kirim} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Gramasi</label>
                <input type="text" name="gramasi" value={editItem.gramasi} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Keterangan</label>
                <input type="text" name="keterangan" value={editItem.keterangan} onChange={handleInputChange} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-submit">
                  Perbarui
                </button>
                <button type="button" className="btn btn-cancel" onClick={() => setShowEditForm(false)}>
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

export default PembelianBahan;

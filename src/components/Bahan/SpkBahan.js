import React, { useEffect, useState } from "react";
import "./SpkBahan.css";
import API from "../../api";
import { FaPlus, FaFileAlt, FaTrash } from "react-icons/fa";

const JENIS_PEMBAYARAN_OPTIONS = ["Cash", "Tempo"];
const WARNA_OPTIONS = ["Putih", "Hitam", "Merah", "Biru", "Hijau", "Kuning", "Abu-abu", "Coklat", "Pink", "Ungu", "Orange", "Navy", "Maroon", "Beige", "Khaki", "Lainnya"];

const SpkBahan = () => {
  const [items, setItems] = useState([]);
  const [pabrikList, setPabrikList] = useState([]);
  const [bahanList, setBahanList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [newItem, setNewItem] = useState({
    pabrik_id: "",
    bahan_id: "",
    jenis_pembayaran: "Cash",
    tanggal_pembayaran: "",
    warna: [{ warna: "", jumlah_rol: 1 }],
  });

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      const toArr = (raw) =>
        (Array.isArray(raw?.data) ? raw.data : null) ?? (Array.isArray(raw) ? raw : []);

      try {
        const [resSpk, resPabrik, resBahan] = await Promise.allSettled([
          API.get("/spk-bahan"),
          API.get("/pabrik"),
          API.get("/bahan"),
        ]);

        if (resSpk.status === "fulfilled") {
          const dataSpk = toArr(resSpk.value.data);
          setItems([...dataSpk].sort((a, b) => (b.id || 0) - (a.id || 0)));
        } else {
          const err = resSpk.reason;
          const msg =
            err?.response?.data?.message ||
            (err?.response?.status === 500 ? "Error server. Pastikan migrasi spk_bahan sudah dijalankan (php artisan migrate)." : null) ||
            err?.message ||
            "Gagal memuat data SPK Bahan.";
          setError(msg);
          setItems([]);
        }

        if (resPabrik.status === "fulfilled") {
          const data = resPabrik.value.data;
          setPabrikList(toArr(data) || toArr(data?.data));
        } else {
          setPabrikList([]);
        }

        if (resBahan.status === "fulfilled") {
          const data = resBahan.value.data;
          setBahanList(toArr(data) || toArr(data?.data));
        } else {
          setBahanList([]);
        }
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          (e?.response?.status === 500 ? "Error server. Pastikan migrasi spk_bahan sudah dijalankan (php artisan migrate)." : null) ||
          e?.message ||
          "Gagal memuat data.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filtered = items.filter((row) => {
    const p = (row.pabrik && row.pabrik.nama_pabrik) || "";
    const b = (row.bahan && row.bahan.nama_bahan) || "";
    const term = (searchTerm || "").toLowerCase();
    return p.toLowerCase().includes(term) || b.toLowerCase().includes(term) || (row.status || "").toLowerCase().includes(term);
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setNewItem({
      pabrik_id: "",
      bahan_id: "",
      jenis_pembayaran: "Cash",
      tanggal_pembayaran: "",
      warna: [{ warna: "", jumlah_rol: 1 }],
    });
    setShowForm(false);
  };

  const addWarnaRow = () => {
    setNewItem((prev) => ({
      ...prev,
      warna: [...prev.warna, { warna: "", jumlah_rol: 1 }],
    }));
  };

  const removeWarnaRow = (index) => {
    setNewItem((prev) => ({
      ...prev,
      warna: prev.warna.length > 1 ? prev.warna.filter((_, i) => i !== index) : prev.warna,
    }));
  };

  const handleWarnaChange = (index, field, value) => {
    setNewItem((prev) => {
      const arr = [...prev.warna];
      arr[index] = { ...arr[index], [field]: field === "jumlah_rol" ? (parseInt(value, 10) || 1) : value };
      return { ...prev, warna: arr };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.pabrik_id || !newItem.bahan_id || !newItem.tanggal_pembayaran) {
      alert("Pabrik, Bahan, dan Tanggal Pembayaran wajib diisi.");
      return;
    }
    const validWarna = newItem.warna
      .map((w) => ({ warna: (w.warna || "").trim(), jumlah_rol: Math.max(1, parseInt(w.jumlah_rol, 10) || 1) }))
      .filter((w) => w.warna !== "");
    if (validWarna.length === 0) {
      alert("Minimal 1 detail warna (nama warna dan jumlah rol) wajib diisi.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        pabrik_id: parseInt(newItem.pabrik_id, 10),
        bahan_id: parseInt(newItem.bahan_id, 10),
        jenis_pembayaran: newItem.jenis_pembayaran || "Cash",
        tanggal_pembayaran: newItem.tanggal_pembayaran,
        warna: validWarna,
      };
      const res = await API.post("/spk-bahan", payload);
      const created = res.data?.data || res.data;
      const enriched = {
        ...created,
        pabrik: pabrikList.find((p) => p.id === parseInt(created.pabrik_id, 10)) || { nama_pabrik: "-" },
        bahan: bahanList.find((b) => b.id === parseInt(created.bahan_id, 10)) || { nama_bahan: "-" },
        warna: created.warna || [],
      };
      setItems((prev) => [enriched, ...prev]);
      resetForm();
      alert(res.data?.message || "SPK Bahan berhasil disimpan.");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? Object.values(err.response.data.errors || {}).flat().join(", ") : null) ||
        "Gagal menyimpan SPK Bahan.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatWarnaSummary = (warnaArr) => {
    if (!warnaArr || !Array.isArray(warnaArr) || warnaArr.length === 0) return "-";
    return warnaArr.map((w) => `${w.warna || "-"} (${w.jumlah_rol || 0})`).join(", ");
  };

  const formatDate = (d) => {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("id-ID");
    } catch {
      return d;
    }
  };

  const formatLamaPemesanan = (hari) => {
    if (hari === null || hari === undefined) return "-";
    return `${hari} hari`;
  };

  return (
    <div className="spk-bahan-page">
      <div className="spk-bahan-header">
        <div className="spk-bahan-header-icon">
          <FaFileAlt />
        </div>
        <h1>SPK Bahan</h1>
      </div>

      <div className="spk-bahan-table-container">
        <div className="spk-bahan-filter-header">
          <button className="spk-bahan-btn-add" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah SPK Bahan
          </button>
          <div className="spk-bahan-search-bar">
            <input
              type="text"
              placeholder="Cari pabrik, bahan, atau status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="spk-bahan-loading">Memuat data...</p>
        ) : error ? (
          <p className="spk-bahan-error">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="spk-bahan-loading">Belum ada data SPK Bahan</p>
        ) : (
          <div className="spk-bahan-table-wrapper">
            <table className="spk-bahan-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Pabrik</th>
                  <th>Bahan</th>
                  <th>Warna</th>
                  <th>Jumlah Rol</th>
                  <th>Jenis Pembayaran</th>
                  <th>Tanggal Pembayaran</th>
                  <th>Lama Pemesanan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.pabrik?.nama_pabrik || "-"}</td>
                    <td>{row.bahan?.nama_bahan || "-"}</td>
                    <td className="spk-bahan-cell-warna">{formatWarnaSummary(row.warna)}</td>
                    <td>{row.jumlah ?? "-"}</td>
                    <td>{row.jenis_pembayaran || "-"}</td>
                    <td>{formatDate(row.tanggal_pembayaran)}</td>
                    <td>{formatLamaPemesanan(row.lama_pemesanan)}</td>
                    <td>
                      <span className={`spk-bahan-badge spk-bahan-badge-${(row.status || "").trim() ? (row.status || "").toLowerCase().replace(/\s/g, "-") : "default"}`}>
                        {row.status || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="spk-bahan-modal" onClick={resetForm}>
          <div className="spk-bahan-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Tambah SPK Bahan</h2>
            <form onSubmit={handleSubmit} className="spk-bahan-form">
              <div className="spk-bahan-form-row">
                <div className="spk-bahan-form-group">
                  <label>Pabrik *</label>
                  <select
                    name="pabrik_id"
                    value={newItem.pabrik_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Pilih Pabrik</option>
                    {pabrikList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama_pabrik || p.nama || `Pabrik #${p.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="spk-bahan-form-group">
                  <label>Bahan *</label>
                  <select
                    name="bahan_id"
                    value={newItem.bahan_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Pilih Bahan</option>
                    {bahanList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nama_bahan || b.nama || `Bahan #${b.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="spk-bahan-form-row">
                <div className="spk-bahan-form-group">
                  <label>Jenis Pembayaran *</label>
                  <select
                    name="jenis_pembayaran"
                    value={newItem.jenis_pembayaran}
                    onChange={handleInputChange}
                  >
                    {JENIS_PEMBAYARAN_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="spk-bahan-form-group">
                  <label>Tanggal Pembayaran *</label>
                  <input
                    type="date"
                    name="tanggal_pembayaran"
                    value={newItem.tanggal_pembayaran}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="spk-bahan-warna-section">
                <div className="spk-bahan-warna-section-header">
                  <label>Detail Warna *</label>
                  <button type="button" className="spk-bahan-btn-add-row" onClick={addWarnaRow}>
                    <FaPlus /> Tambah Baris
                  </button>
                </div>
                {newItem.warna.map((w, wi) => (
                  <div key={wi} className="spk-bahan-warna-row">
                    <div className="spk-bahan-form-group spk-bahan-warna-name">
                      <label>Warna</label>
                      <select
                        value={WARNA_OPTIONS.includes(w.warna) ? w.warna : "Lainnya"}
                        onChange={(e) => handleWarnaChange(wi, "warna", e.target.value === "Lainnya" ? "" : e.target.value)}
                      >
                        <option value="">-- Pilih / Ketik --</option>
                        {WARNA_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                        <option value="Lainnya">Lainnya</option>
                      </select>
                      {(!w.warna || w.warna === "Lainnya" || !WARNA_OPTIONS.includes(w.warna)) && (
                        <input
                          type="text"
                          placeholder="Nama warna"
                          value={WARNA_OPTIONS.includes(w.warna) ? "" : (w.warna || "")}
                          onChange={(e) => handleWarnaChange(wi, "warna", e.target.value)}
                          style={{ marginTop: 6 }}
                        />
                      )}
                    </div>
                    <div className="spk-bahan-form-group spk-bahan-warna-jumlah">
                      <label>Jumlah Rol</label>
                      <input
                        type="number"
                        min={1}
                        value={w.jumlah_rol}
                        onChange={(e) => handleWarnaChange(wi, "jumlah_rol", e.target.value)}
                      />
                    </div>
                    <div className="spk-bahan-warna-actions">
                      <button
                        type="button"
                        className="spk-bahan-btn-icon-remove"
                        onClick={() => removeWarnaRow(wi)}
                        title="Hapus baris"
                        disabled={newItem.warna.length <= 1}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="spk-bahan-warna-total">
                  Total rol: <strong>{newItem.warna.reduce((s, w) => s + (parseInt(w.jumlah_rol, 10) || 0), 0)}</strong>
                </div>
              </div>

              <div className="spk-bahan-form-actions">
                <button type="submit" className="spk-bahan-btn spk-bahan-btn-primary" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
                <button type="button" className="spk-bahan-btn spk-bahan-btn-secondary" onClick={resetForm}>
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

export default SpkBahan;

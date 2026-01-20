import React, { useEffect, useState } from "react";
import "./SpkBahan.css";
import API from "../../api";
import { FaPlus, FaFileAlt } from "react-icons/fa";

const JENIS_PEMBAYARAN_OPTIONS = ["Tunai", "Transfer", "Kredit", "Lainnya"];
const STATUS_OPTIONS = ["Pending", "Diproses", "Selesai", "Dibatalkan"];

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
    jumlah: "",
    jenis_pembayaran: "Tunai",
    tanggal_pembayaran: "",
    status: "Pending",
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
          setPabrikList(toArr(resPabrik.value.data));
        } else {
          setPabrikList([]);
        }

        if (resBahan.status === "fulfilled") {
          setBahanList(toArr(resBahan.value.data));
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
      jumlah: "",
      jenis_pembayaran: "Tunai",
      tanggal_pembayaran: "",
      status: "Pending",
    });
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.pabrik_id || !newItem.bahan_id || !newItem.jumlah || !newItem.tanggal_pembayaran) {
      alert("Pabrik, Bahan, Jumlah, dan Tanggal Pembayaran wajib diisi.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        pabrik_id: parseInt(newItem.pabrik_id, 10),
        bahan_id: parseInt(newItem.bahan_id, 10),
        jumlah: parseInt(newItem.jumlah, 10) || 1,
        jenis_pembayaran: newItem.jenis_pembayaran || "Tunai",
        tanggal_pembayaran: newItem.tanggal_pembayaran,
        status: newItem.status || "Pending",
      };
      const res = await API.post("/spk-bahan", payload);
      const created = res.data?.data || res.data;
      const enriched = {
        ...created,
        pabrik: pabrikList.find((p) => p.id === parseInt(created.pabrik_id, 10)) || { nama_pabrik: "-" },
        bahan: bahanList.find((b) => b.id === parseInt(created.bahan_id, 10)) || { nama_bahan: "-" },
      };
      setItems((prev) => [enriched, ...prev]);
      resetForm();
      alert(res.data?.message || "SPK Bahan berhasil disimpan.");
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors
        ? Object.values(err.response.data.errors || {}).flat().join(", ")
        : "Gagal menyimpan SPK Bahan.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
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
                  <th>Jumlah</th>
                  <th>Jenis Pembayaran</th>
                  <th>Tanggal Pembayaran</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.pabrik?.nama_pabrik || "-"}</td>
                    <td>{row.bahan?.nama_bahan || "-"}</td>
                    <td>{row.jumlah ?? "-"}</td>
                    <td>{row.jenis_pembayaran || "-"}</td>
                    <td>{formatDate(row.tanggal_pembayaran)}</td>
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
                  <label>Jumlah *</label>
                  <input
                    type="number"
                    name="jumlah"
                    value={newItem.jumlah}
                    onChange={handleInputChange}
                    min={1}
                    placeholder="Jumlah"
                    required
                  />
                </div>
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
              </div>

              <div className="spk-bahan-form-row">
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
                <div className="spk-bahan-form-group">
                  <label>Status *</label>
                  <select
                    name="status"
                    value={newItem.status}
                    onChange={handleInputChange}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
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

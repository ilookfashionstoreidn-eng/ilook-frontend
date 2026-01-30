import React, { useEffect, useState } from "react";
import "./GudangProduk.css";
import API from "../../api";
import { FaPlus, FaCheck, FaWarehouse, FaTrash } from "react-icons/fa";

const GudangProduk = () => {
  const [items, setItems] = useState([]);
  const [produkList, setProdukList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [newItem, setNewItem] = useState({
    items: [{ produk_id: "", sku_id: "", qty: 1, skuList: [] }],
  });

  const [verifyItems, setVerifyItems] = useState([]);

  useEffect(() => {
    fetchData();
    fetchProdukList();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/gudang-produk");
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setItems(data);
    } catch (e) {
      setError("Gagal memuat data gudang produk.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProdukList = async () => {
    try {
      const res = await API.get("/produk", { params: { per_page: 1000 } });
      const data = Array.isArray(res.data?.data) ? res.data.data : res.data?.data?.data || [];
      setProdukList(data.filter((produk) => produk.status_produk !== 'nonaktif'));
    } catch (e) {
      console.error("Gagal memuat data produk:", e);
    }
  };


  const filtered = items.filter((row) => {
    const term = (searchTerm || "").toLowerCase();
    const id = (row.id || "").toString();
    const status = (row.status || "").toLowerCase();
    const skuNames = (row.details || [])
      .map((d) => d.sku?.sku || "")
      .join(" ")
      .toLowerCase();
    return id.includes(term) || status.includes(term) || skuNames.includes(term);
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = async (index, field, value) => {
    setNewItem((prev) => {
      const arr = [...prev.items];
      arr[index] = {
        ...arr[index],
        [field]: field === "qty" ? (parseInt(value, 10) || 1) : value,
      };
      
      // Jika produk berubah, reset SKU dan fetch SKU baru untuk baris ini
      if (field === "produk_id") {
        arr[index].sku_id = "";
        arr[index].skuList = [];
        
        // Fetch SKU untuk produk yang dipilih
        if (value) {
          fetchSkuByProdukForItem(value, index);
        }
      }
      
      return { ...prev, items: arr };
    });
  };

  const fetchSkuByProdukForItem = async (produkId, index) => {
    if (!produkId) {
      setNewItem((prev) => {
        const arr = [...prev.items];
        arr[index].skuList = [];
        return { ...prev, items: arr };
      });
      return;
    }
    try {
      const res = await API.get("/skus", { params: { produk_id: produkId } });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setNewItem((prev) => {
        const arr = [...prev.items];
        arr[index].skuList = data;
        return { ...prev, items: arr };
      });
    } catch (e) {
      console.error("Gagal memuat data SKU:", e);
      setNewItem((prev) => {
        const arr = [...prev.items];
        arr[index].skuList = [];
        return { ...prev, items: arr };
      });
    }
  };

  const addItemRow = () => {
    setNewItem((prev) => ({
      ...prev,
      items: [...prev.items, { produk_id: "", sku_id: "", qty: 1, skuList: [] }],
    }));
  };

  const removeItemRow = (index) => {
    setNewItem((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items,
    }));
  };

  const resetForm = () => {
    setNewItem({ items: [{ produk_id: "", sku_id: "", qty: 1, skuList: [] }] });
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = newItem.items
      .map((item) => ({
        sku_id: parseInt(item.sku_id, 10),
        qty: Math.max(1, parseInt(item.qty, 10) || 1),
      }))
      .filter((item) => item.sku_id > 0);

    if (validItems.length === 0) {
      alert("Minimal 1 item SKU wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = { items: validItems };
      const res = await API.post("/gudang-produk", payload);
      alert(res.data?.message || "Data gudang produk berhasil disimpan (draft)");
      resetForm();
      fetchData();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? Object.values(err.response.data.errors || {}).flat().join(", ") : null) ||
        "Gagal menyimpan data gudang produk.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openVerifyForm = (item) => {
    setSelectedItem(item);
    const verifyData = (item.details || []).map((detail) => ({
      detail_id: detail.id,
      qty: detail.verifikasi?.qty_verifikasi || detail.qty_acuan || 0,
      qty_acuan: detail.qty_acuan || 0,
    }));
    setVerifyItems(verifyData);
    setShowVerifyForm(true);
  };

  const handleVerifyItemChange = (index, value) => {
    setVerifyItems((prev) => {
      const arr = [...prev];
      arr[index] = {
        ...arr[index],
        qty: Math.max(0, parseInt(value, 10) || 0),
      };
      return arr;
    });
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      setSubmitting(true);
      const payload = {
        items: verifyItems.map((item) => ({
          detail_id: item.detail_id,
          qty: item.qty,
        })),
      };
      const res = await API.post(`/gudang-produk/${selectedItem.id}/verify`, payload);
      alert(res.data?.message || "Proses verifikasi selesai");
      setShowVerifyForm(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? Object.values(err.response.data.errors || {}).flat().join(", ") : null) ||
        "Gagal melakukan verifikasi.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return d;
    }
  };

  return (
    <div className="gudang-produk-page">
      <div className="gudang-produk-header">
        <div className="gudang-produk-header-icon">
          <FaWarehouse />
        </div>
        <h1>Gudang Produk</h1>
      </div>

      <div className="gudang-produk-table-container">
        <div className="gudang-produk-filter-header">
          <button className="gudang-produk-btn-add" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah Data
          </button>
          <div className="gudang-produk-search-bar">
            <input
              type="text"
              placeholder="Cari ID, status, atau SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="gudang-produk-loading">Memuat data...</p>
        ) : error ? (
          <p className="gudang-produk-error">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="gudang-produk-loading">Belum ada data gudang produk</p>
        ) : (
          <div className="gudang-produk-table-wrapper">
            <table className="gudang-produk-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Detail SKU</th>
                  <th>Dibuat Oleh</th>
                  <th>Dibuat Pada</th>
                  <th>Diverifikasi Oleh</th>
                  <th>Diverifikasi Pada</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>
                      <span className={`gudang-produk-badge gudang-produk-badge-${(row.status || "").toLowerCase()}`}>
                        {row.status || "-"}
                      </span>
                    </td>
                    <td>
                      <div className="gudang-produk-detail-list">
                        {(row.details || []).map((detail, idx) => (
                          <div key={idx} className="gudang-produk-detail-item">
                            <strong>{detail.sku?.sku || "-"}</strong>: {detail.qty_acuan || 0} pcs
                            {detail.verifikasi && (
                              <span className="gudang-produk-verifikasi-info">
                                {" "}
                                (Verifikasi: {detail.verifikasi.qty_verifikasi || 0})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>{row.creator?.name || "-"}</td>
                    <td>{formatDate(row.created_at)}</td>
                    <td>{row.verifier?.name || "-"}</td>
                    <td>{formatDate(row.verified_at)}</td>
                    <td>
                      {row.status !== "terverifikasi" && (
                        <button
                          className="gudang-produk-btn-verify"
                          onClick={() => openVerifyForm(row)}
                          title="Verifikasi"
                        >
                          <FaCheck /> Verifikasi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="gudang-produk-modal" onClick={resetForm}>
          <div className="gudang-produk-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Tambah Data Gudang Produk</h2>
            <form onSubmit={handleSubmit} className="gudang-produk-form">
              <div className="gudang-produk-items-section">
                <div className="gudang-produk-items-section-header">
                  <label>Detail SKU *</label>
                  <button type="button" className="gudang-produk-btn-add-row" onClick={addItemRow}>
                    <FaPlus /> Tambah Baris
                  </button>
                </div>
                {newItem.items.map((item, idx) => (
                  <div key={idx} className="gudang-produk-item-row">
                    <div className="gudang-produk-form-group gudang-produk-item-produk">
                      <label>Produk</label>
                      <select
                        value={item.produk_id}
                        onChange={(e) => handleItemChange(idx, "produk_id", e.target.value)}
                        required
                      >
                        <option value="">Pilih Produk</option>
                        {produkList.map((produk) => (
                          <option key={produk.id} value={produk.id}>
                            {produk.nama_produk}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="gudang-produk-form-group gudang-produk-item-sku">
                      <label>SKU</label>
                      <select
                        value={item.sku_id}
                        onChange={(e) => handleItemChange(idx, "sku_id", e.target.value)}
                        required
                        disabled={!item.produk_id}
                      >
                        <option value="">{item.produk_id ? "Pilih SKU" : "Pilih Produk terlebih dahulu"}</option>
                        {(item.skuList || []).map((sku) => (
                          <option key={sku.id} value={sku.id}>
                            {sku.display_text || sku.sku}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="gudang-produk-form-group gudang-produk-item-qty">
                      <label>Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                        required
                      />
                    </div>
                    <div className="gudang-produk-item-actions">
                      <button
                        type="button"
                        className="gudang-produk-btn-icon-remove"
                        onClick={() => removeItemRow(idx)}
                        title="Hapus baris"
                        disabled={newItem.items.length <= 1}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="gudang-produk-form-actions">
                <button type="submit" className="gudang-produk-btn gudang-produk-btn-primary" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
                <button type="button" className="gudang-produk-btn gudang-produk-btn-secondary" onClick={resetForm}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVerifyForm && selectedItem && (
        <div className="gudang-produk-modal" onClick={() => setShowVerifyForm(false)}>
          <div className="gudang-produk-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Verifikasi Data Gudang Produk #{selectedItem.id}</h2>
            <form onSubmit={handleVerifySubmit} className="gudang-produk-form">
              <div className="gudang-produk-verify-section">
                <p className="gudang-produk-verify-info">
                  Masukkan jumlah yang terverifikasi untuk setiap SKU. Jika semua jumlah sesuai dengan acuan, status akan
                  otomatis menjadi "terverifikasi".
                </p>
                {verifyItems.map((item, idx) => {
                  const detail = selectedItem.details?.find((d) => d.id === item.detail_id);
                  const isMatch = item.qty === item.qty_acuan;
                  return (
                    <div key={idx} className={`gudang-produk-verify-row ${isMatch ? "match" : "mismatch"}`}>
                      <div className="gudang-produk-verify-sku">
                        <strong>{detail?.sku?.sku || "-"}</strong>
                        <span className="gudang-produk-verify-acuan">Acuan: {item.qty_acuan} pcs</span>
                      </div>
                      <div className="gudang-produk-form-group gudang-produk-verify-qty">
                        <label>Qty Verifikasi</label>
                        <input
                          type="number"
                          min={0}
                          value={item.qty}
                          onChange={(e) => handleVerifyItemChange(idx, e.target.value)}
                          required
                        />
                      </div>
                      {isMatch && <span className="gudang-produk-match-indicator">✓ Sesuai</span>}
                    </div>
                  );
                })}
              </div>

              <div className="gudang-produk-form-actions">
                <button type="submit" className="gudang-produk-btn gudang-produk-btn-primary" disabled={submitting}>
                  {submitting ? "Memverifikasi..." : "Verifikasi"}
                </button>
                <button
                  type="button"
                  className="gudang-produk-btn gudang-produk-btn-secondary"
                  onClick={() => setShowVerifyForm(false)}
                >
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

export default GudangProduk;

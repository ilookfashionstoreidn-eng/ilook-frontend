import React, { useState, useEffect, useCallback, useRef } from "react";
import API from "../../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./QualityControl.css";

/* ─── Searchable Dropdown ───────────────────────────────────── */
const SeriDropdown = ({ value, onChange, seriList }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Label seri yang terpilih
  const selected = seriList.find((s) => s.nomor_seri === value);

  useEffect(() => {
    if (selected) setQuery(selected.nomor_seri);
    else setQuery("");
  }, [value, selected]);

  // Close saat klik luar
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = seriList.filter((s) =>
    s.nomor_seri.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (s) => {
    onChange(s); // kembalikan objek lengkap
    setQuery(s.nomor_seri);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    if (!e.target.value) onChange(null);
  };

  return (
    <div className="qc-dropdown-wrap" ref={ref}>
      <div className="qc-dropdown-input-wrap" onClick={() => setOpen(true)}>
        <input
          type="text"
          className="qc-input qc-dropdown-input"
          placeholder="Cari nomor seri..."
          value={query}
          onChange={handleInputChange}
          autoComplete="off"
        />
        <span className="qc-dropdown-arrow">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="qc-dropdown-list">
          {filtered.length === 0 ? (
            <div className="qc-dropdown-empty">Tidak ditemukan</div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.id}
                className={`qc-dropdown-item ${value === s.nomor_seri ? "qc-dropdown-item-active" : ""}`}
                onMouseDown={() => handleSelect(s)}
              >
                <span className="qc-dd-seri">{s.nomor_seri}</span>
                <span className="qc-dd-sku">{s.sku}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/* ─── SKU Dropdown (dari seri yang sama nomor_seri) ─────────── */
const SkuDropdown = ({ value, skuList, onChange }) => {
  return (
    <select
      className="qc-input qc-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">-- Pilih SKU --</option>
      {skuList.map((sku, i) => (
        <option key={i} value={sku}>
          {sku}
        </option>
      ))}
    </select>
  );
};

/* ─── Main Component ────────────────────────────────────────── */
const QualityControl = () => {
  const [qcList, setQcList] = useState([]);
  const [seriList, setSeriList] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQc, setSelectedQc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedSeri, setSelectedSeri] = useState(null); // objek { id, nomor_seri, sku }
  const [formData, setFormData] = useState({
    jumlah_barang_nota: "",
    jumlah_diterima: "",
  });
  const [lolosItems, setLolosItems] = useState([]);
  const [rejectItems, setRejectItems] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ── SKU list dari seri yang dipilih (bisa 1 atau lebih SKU per nomor seri) */
  // Di sini kita ambil semua seri dengan nomor_seri yang sama lalu collect unique SKU
  const skuOptions = selectedSeri
    ? [...new Set(
      seriList
        .filter((s) => s.nomor_seri === selectedSeri.nomor_seri)
        .map((s) => s.sku)
    )]
    : [];

  const fetchQcList = useCallback(async () => {
    setLoadingTable(true);
    try {
      const res = await API.get("/quality-control");
      setQcList(res.data.data || []);
    } catch {
      toast.error("Gagal memuat data QC.");
    } finally {
      setLoadingTable(false);
    }
  }, []);

  const fetchSeriList = useCallback(async () => {
    try {
      const res = await API.get("/seri-list");
      setSeriList(res.data.data || []);
    } catch {
      toast.error("Gagal memuat data nomor seri.");
    }
  }, []);

  useEffect(() => {
    fetchQcList();
    fetchSeriList();
  }, [fetchQcList, fetchSeriList]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSeriChange = (seri) => {
    setSelectedSeri(seri);
    // Reset items saat seri berubah
    setLolosItems([]);
    setRejectItems([]);
  };

  const handleItemChange = (type, index, field, value) => {
    const setter = type === "lolos" ? setLolosItems : setRejectItems;
    setter((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItem = (type) => {
    const item = { sku: skuOptions.length === 1 ? skuOptions[0] : "", jumlah: "" };
    if (type === "lolos") setLolosItems((p) => [...p, item]);
    else setRejectItems((p) => [...p, item]);
  };

  const removeItem = (type, index) => {
    if (type === "lolos") setLolosItems((p) => p.filter((_, i) => i !== index));
    else setRejectItems((p) => p.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({ jumlah_barang_nota: "", jumlah_diterima: "" });
    setSelectedSeri(null);
    setLolosItems([]);
    setRejectItems([]);
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const openDetail = (qc) => {
    setSelectedQc(qc);
    setShowDetailModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSeri) {
      toast.error("Pilih Nomor Seri terlebih dahulu.");
      return;
    }
    if (!formData.jumlah_barang_nota || !formData.jumlah_diterima) {
      toast.error("Mohon lengkapi semua field utama.");
      return;
    }
    if (lolosItems.length === 0 && rejectItems.length === 0) {
      toast.error("Tambahkan minimal satu item Lolos atau Reject.");
      return;
    }
    for (const item of [...lolosItems, ...rejectItems]) {
      if (!item.sku || !item.jumlah) {
        toast.error("Lengkapi SKU dan Jumlah setiap item.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        kode_seri: selectedSeri.nomor_seri,
        jumlah_barang_nota: parseInt(formData.jumlah_barang_nota),
        jumlah_diterima: parseInt(formData.jumlah_diterima),
        items: [
          ...lolosItems.map((i) => ({ status: "lolos", sku: i.sku, jumlah: parseInt(i.jumlah) })),
          ...rejectItems.map((i) => ({ status: "reject", sku: i.sku, jumlah: parseInt(i.jumlah) })),
        ],
      };
      await API.post("/quality-control", payload);
      toast.success("Data QC berhasil disimpan!");
      closeModal();
      fetchQcList();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan data QC.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = qcList.filter((q) =>
    q.kode_seri?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLolos = (items) =>
    items?.filter((i) => i.status === "lolos").reduce((s, i) => s + i.jumlah, 0) || 0;
  const totalReject = (items) =>
    items?.filter((i) => i.status === "reject").reduce((s, i) => s + i.jumlah, 0) || 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="qc-page">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="qc-header">
        <div className="qc-header-left">
          <h2 className="qc-title">Quality Control</h2>
          <p className="qc-subtitle">Manajemen proses inspeksi dan quality control barang</p>
        </div>
        <button className="qc-btn-add" onClick={openModal}>
          <span className="qc-btn-icon">+</span> Tambah Data QC
        </button>
      </div>

      {/* Stats Cards */}
      <div className="qc-stats">
        <div className="qc-stat-card qc-stat-total">
          <div className="qc-stat-icon">📋</div>
          <div>
            <div className="qc-stat-value">{qcList.length}</div>
            <div className="qc-stat-label">Total QC</div>
          </div>
        </div>
        <div className="qc-stat-card qc-stat-lolos">
          <div className="qc-stat-icon">✅</div>
          <div>
            <div className="qc-stat-value">
              {qcList.reduce((s, q) => s + totalLolos(q.items), 0).toLocaleString()}
            </div>
            <div className="qc-stat-label">Total Lolos QC</div>
          </div>
        </div>
        <div className="qc-stat-card qc-stat-reject">
          <div className="qc-stat-icon">❌</div>
          <div>
            <div className="qc-stat-value">
              {qcList.reduce((s, q) => s + totalReject(q.items), 0).toLocaleString()}
            </div>
            <div className="qc-stat-label">Total Reject</div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="qc-card">
        <div className="qc-card-header">
          <span className="qc-card-title">Data Quality Control</span>
          <input
            type="text"
            className="qc-search"
            placeholder="🔍  Cari kode seri..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="qc-table-wrapper">
          {loadingTable ? (
            <div className="qc-loading">
              <div className="qc-spinner" />
              <span>Memuat data...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="qc-empty">
              <div className="qc-empty-icon">📦</div>
              <div className="qc-empty-text">Belum ada data QC</div>
              <div className="qc-empty-sub">Klik "Tambah Data QC" untuk mulai</div>
            </div>
          ) : (
            <table className="qc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Kode Seri</th>
                  <th>Jml Nota</th>
                  <th>Jml Diterima</th>
                  <th>Lolos QC</th>
                  <th>Reject</th>
                  <th>Selisih</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((qc, idx) => {
                  const lolos = totalLolos(qc.items);
                  const reject = totalReject(qc.items);
                  const selisih = qc.jumlah_barang_nota - qc.jumlah_diterima;
                  return (
                    <tr key={qc.id}>
                      <td className="qc-td-num">{idx + 1}</td>
                      <td className="qc-td-seri">
                        <span className="qc-badge-seri">{qc.kode_seri}</span>
                      </td>
                      <td className="qc-td-center">{qc.jumlah_barang_nota?.toLocaleString()}</td>
                      <td className="qc-td-center">{qc.jumlah_diterima?.toLocaleString()}</td>
                      <td className="qc-td-center">
                        <span className="qc-badge-lolos">{lolos.toLocaleString()}</span>
                      </td>
                      <td className="qc-td-center">
                        {reject > 0 ? (
                          <span className="qc-badge-reject">{reject.toLocaleString()}</span>
                        ) : (
                          <span className="qc-badge-zero">0</span>
                        )}
                      </td>
                      <td className="qc-td-center">
                        {selisih !== 0 ? (
                          <span className="qc-badge-selisih">
                            {selisih > 0 ? `+${selisih}` : selisih}
                          </span>
                        ) : (
                          <span className="qc-badge-zero">0</span>
                        )}
                      </td>
                      <td className="qc-td-date">{formatDate(qc.created_at)}</td>
                      <td>
                        <button className="qc-btn-detail" onClick={() => openDetail(qc)}>
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ======== MODAL FORM ======== */}
      {showModal && (
        <div className="qc-overlay" onClick={closeModal}>
          <div className="qc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qc-modal-header">
              <h3 className="qc-modal-title">Tambah Data Quality Control</h3>
              <button className="qc-modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="qc-modal-body">
              {/* Main fields */}
              <div className="qc-form-row">
                <div className="qc-form-group qc-form-group-full">
                  <label className="qc-label">
                    Nomor Seri <span className="qc-req">*</span>
                  </label>
                  <SeriDropdown
                    value={selectedSeri?.nomor_seri || ""}
                    onChange={handleSeriChange}
                    seriList={seriList}
                  />
                  {selectedSeri && (
                    <div className="qc-seri-info">
                      <span className="qc-seri-info-label">SKU Terkait:</span>
                      <span className="qc-seri-info-sku">{selectedSeri.sku}</span>
                    </div>
                  )}
                </div>
                <div className="qc-form-group">
                  <label className="qc-label">
                    Jumlah Barang Nota <span className="qc-req">*</span>
                  </label>
                  <input
                    type="number"
                    className="qc-input"
                    name="jumlah_barang_nota"
                    value={formData.jumlah_barang_nota}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="qc-form-group">
                  <label className="qc-label">
                    Jumlah Diterima <span className="qc-req">*</span>
                  </label>
                  <input
                    type="number"
                    className="qc-input"
                    name="jumlah_diterima"
                    value={formData.jumlah_diterima}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div className="qc-divider" />

              {/* Two-column items */}
              <div className="qc-items-grid">
                {/* Lolos */}
                <div className="qc-items-col">
                  <div className="qc-items-header qc-items-header-lolos">
                    <span>✅ Barang Lolos QC</span>
                    <button
                      type="button"
                      className="qc-btn-add-item qc-btn-add-lolos"
                      onClick={() => addItem("lolos")}
                      disabled={!selectedSeri}
                    >
                      + Tambah
                    </button>
                  </div>
                  {!selectedSeri ? (
                    <div className="qc-items-empty">Pilih nomor seri dahulu</div>
                  ) : lolosItems.length === 0 ? (
                    <div className="qc-items-empty">Belum ada item lolos</div>
                  ) : (
                    lolosItems.map((item, i) => (
                      <div key={i} className="qc-item-row">
                        <SkuDropdown
                          value={item.sku}
                          skuList={skuOptions}
                          onChange={(val) => handleItemChange("lolos", i, "sku", val)}
                        />
                        <input
                          type="number"
                          className="qc-input qc-input-qty"
                          placeholder="Qty"
                          value={item.jumlah}
                          min="1"
                          onChange={(e) =>
                            handleItemChange("lolos", i, "jumlah", e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="qc-btn-remove"
                          onClick={() => removeItem("lolos", i)}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Reject */}
                <div className="qc-items-col">
                  <div className="qc-items-header qc-items-header-reject">
                    <span>❌ Barang Reject</span>
                    <button
                      type="button"
                      className="qc-btn-add-item qc-btn-add-reject"
                      onClick={() => addItem("reject")}
                      disabled={!selectedSeri}
                    >
                      + Tambah
                    </button>
                  </div>
                  {!selectedSeri ? (
                    <div className="qc-items-empty">Pilih nomor seri dahulu</div>
                  ) : rejectItems.length === 0 ? (
                    <div className="qc-items-empty">Belum ada item reject</div>
                  ) : (
                    rejectItems.map((item, i) => (
                      <div key={i} className="qc-item-row">
                        <SkuDropdown
                          value={item.sku}
                          skuList={skuOptions}
                          onChange={(val) => handleItemChange("reject", i, "sku", val)}
                        />
                        <input
                          type="number"
                          className="qc-input qc-input-qty"
                          placeholder="Qty"
                          value={item.jumlah}
                          min="1"
                          onChange={(e) =>
                            handleItemChange("reject", i, "jumlah", e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="qc-btn-remove"
                          onClick={() => removeItem("reject", i)}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="qc-modal-footer">
                <button type="button" className="qc-btn-cancel" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className="qc-btn-save" disabled={loading}>
                  {loading ? <span className="qc-spinner-sm" /> : null}
                  {loading ? "Menyimpan..." : "Simpan Data QC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======== MODAL DETAIL ======== */}
      {showDetailModal && selectedQc && (
        <div className="qc-overlay" onClick={() => setShowDetailModal(false)}>
          <div
            className="qc-modal qc-modal-detail"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qc-modal-header">
              <h3 className="qc-modal-title">
                Detail QC —{" "}
                <span className="qc-detail-seri">{selectedQc.kode_seri}</span>
              </h3>
              <button
                className="qc-modal-close"
                onClick={() => setShowDetailModal(false)}
              >
                ×
              </button>
            </div>
            <div className="qc-modal-body">
              <div className="qc-detail-stats">
                <div className="qc-ds-item">
                  <div className="qc-ds-label">Jumlah Nota</div>
                  <div className="qc-ds-value">
                    {selectedQc.jumlah_barang_nota?.toLocaleString()}
                  </div>
                </div>
                <div className="qc-ds-item">
                  <div className="qc-ds-label">Jml Diterima</div>
                  <div className="qc-ds-value">
                    {selectedQc.jumlah_diterima?.toLocaleString()}
                  </div>
                </div>
                <div className="qc-ds-item qc-ds-lolos">
                  <div className="qc-ds-label">Lolos QC</div>
                  <div className="qc-ds-value">
                    {totalLolos(selectedQc.items).toLocaleString()}
                  </div>
                </div>
                <div className="qc-ds-item qc-ds-reject">
                  <div className="qc-ds-label">Reject</div>
                  <div className="qc-ds-value">
                    {totalReject(selectedQc.items).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="qc-detail-items">
                <table className="qc-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>SKU</th>
                      <th>Jumlah</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQc.items?.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="qc-td-center">
                          Tidak ada item
                        </td>
                      </tr>
                    ) : (
                      selectedQc.items?.map((item, i) => (
                        <tr key={i}>
                          <td className="qc-td-num">{i + 1}</td>
                          <td>
                            <strong>{item.sku}</strong>
                          </td>
                          <td className="qc-td-center">
                            {item.jumlah?.toLocaleString()}
                          </td>
                          <td className="qc-td-center">
                            {item.status === "lolos" ? (
                              <span className="qc-badge-lolos">Lolos</span>
                            ) : (
                              <span className="qc-badge-reject">Reject</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="qc-modal-footer">
                <button
                  className="qc-btn-cancel"
                  onClick={() => setShowDetailModal(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityControl;

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API from "../../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiAlertTriangle,
  FiFileText,
  FiLayers,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";
import "./QCReject.css";

const INITIAL_FORM = {
  nomor_seri: "",
  sku: "",
  jumlah: "",
};

const SeriDropdown = ({ value, onChange, seriList, disabled, loading }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selected = seriList.find((item) => item.nomor_seri === value);

  useEffect(() => {
    setQuery(selected ? selected.nomor_seri : "");
  }, [selected]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return seriList;

    return seriList.filter(
      (item) =>
        item.nomor_seri?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q)
    );
  }, [seriList, query]);

  const handleSelect = (item) => {
    onChange(item);
    setQuery(item.nomor_seri);
    setOpen(false);
  };

  return (
    <div className="qcr-dropdown-wrap" ref={wrapRef}>
      <div className="qcr-dropdown-input-wrap" onClick={() => !disabled && setOpen(true)}>
        <input
          type="text"
          className="qcr-dropdown-input"
          placeholder="Cari nomor seri..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) onChange(null);
          }}
          disabled={disabled}
          autoComplete="off"
        />
        <span className="qcr-dropdown-arrow">{open ? "^" : "v"}</span>
      </div>

      {open && !disabled && (
        <div className="qcr-dropdown-list">
          {loading ? (
            <div className="qcr-dropdown-empty">Memuat nomor seri...</div>
          ) : filtered.length === 0 ? (
            <div className="qcr-dropdown-empty">Nomor seri tidak ditemukan</div>
          ) : (
            filtered.map((item) => (
              <div
                key={`${item.id}-${item.sku}`}
                className={`qcr-dropdown-item ${value === item.nomor_seri ? "active" : ""}`}
                onMouseDown={() => handleSelect(item)}
              >
                <span className="qcr-dd-seri">{item.nomor_seri}</span>
                <span className="qcr-dd-sku">{item.sku}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const QCReject = () => {
  const [rows, setRows] = useState([]);
  const [seriList, setSeriList] = useState([]);
  const [totalItem, setTotalItem] = useState(0);
  const [totalInput, setTotalInput] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingSeri, setLoadingSeri] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

  const fetchRejectData = useCallback(async () => {
    try {
      const rejectRes = await API.get("/qc-reject");
      setRows(rejectRes.data.data || []);
      setTotalItem(rejectRes.data.total_item || 0);
      setTotalInput(rejectRes.data.total_input || 0);
      return true;
    } catch {
      toast.error("Gagal memuat data reject.", { toastId: "qcr-load-reject" });
      return false;
    }
  }, []);

  const fetchSeriData = useCallback(async () => {
    setLoadingSeri(true);
    try {
      const seriRes = await API.get("/seri-list", { params: { all: 1 } });
      setSeriList(seriRes.data.data || []);
      return true;
    } catch {
      toast.error("Gagal memuat data nomor seri.", { toastId: "qcr-load-seri" });
      return false;
    } finally {
      setLoadingSeri(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.allSettled([fetchRejectData(), fetchSeriData()]);
    } finally {
      setLoading(false);
    }
  }, [fetchRejectData, fetchSeriData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const skuOptions = useMemo(() => {
    if (!form.nomor_seri) return [];

    return [
      ...new Set(
        seriList
          .filter((item) => item.nomor_seri === form.nomor_seri)
          .map((item) => item.sku)
          .filter(Boolean)
      ),
    ];
  }, [seriList, form.nomor_seri]);

  useEffect(() => {
    if (!form.nomor_seri) {
      setForm((prev) => ({ ...prev, sku: "" }));
      return;
    }

    if (skuOptions.length === 1) {
      setForm((prev) => ({ ...prev, sku: skuOptions[0] }));
      return;
    }

    setForm((prev) => (skuOptions.includes(prev.sku) ? prev : { ...prev, sku: "" }));
  }, [form.nomor_seri, skuOptions]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      nomor_seri: form.nomor_seri.trim(),
      sku: form.sku.trim().toUpperCase(),
      jumlah: Number(form.jumlah),
    };

    if (!payload.nomor_seri || !payload.sku || !payload.jumlah || payload.jumlah < 1) {
      toast.error("Lengkapi nomor seri, SKU, dan jumlah reject minimal 1.");
      return;
    }

    setSubmitting(true);
    try {
      await API.post("/qc-reject", payload);
      toast.success("Data reject berhasil ditambahkan.");
      resetForm();
      setShowForm(false);
      fetchRejectData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menambahkan data reject.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredRows = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return rows;

    return rows.filter(
      (row) =>
        row.nomor_seri?.toLowerCase().includes(query) ||
        row.sku?.toLowerCase().includes(query)
    );
  }, [rows, searchTerm]);

  return (
    <div className="qcr-container">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar theme="light" />

      <header className="qcr-header">
        <div className="qcr-header-copy">
          <div className="qcr-module-pill">Module - Quality Control</div>
          <div className="qcr-title-wrapper">
            <div className="qcr-brand-icon">
              <FiAlertTriangle />
            </div>
            <div className="qcr-title-block">
              <h1 className="qcr-title">QC Reject</h1>
              <p className="qcr-subtitle">
                Tambahkan data reject per nomor seri dan SKU, lalu pantau rekapnya dalam tabel grouped.
              </p>
            </div>
          </div>
        </div>

        <div className="qcr-header-actions">
          <button
            type="button"
            className="qcr-btn qcr-btn-ghost"
            onClick={fetchData}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? "spin" : ""} />
            {loading ? "Memuat..." : "Refresh"}
          </button>

          <button
            type="button"
            className="qcr-btn qcr-btn-primary"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? <FiX /> : <FiPlus />}
            {showForm ? "Tutup Form" : "Tambah Data Reject"}
          </button>
        </div>
      </header>

      <section className="qcr-stats-grid">
        <div className="qcr-stat-card">
          <div className="qcr-stat-icon"><FiAlertTriangle /></div>
          <div>
            <div className="qcr-stat-label">Total Item Reject</div>
            <div className="qcr-stat-value">{Number(totalItem).toLocaleString()}</div>
          </div>
        </div>

        <div className="qcr-stat-card">
          <div className="qcr-stat-icon"><FiFileText /></div>
          <div>
            <div className="qcr-stat-label">Total Input</div>
            <div className="qcr-stat-value">{Number(totalInput).toLocaleString()}</div>
          </div>
        </div>

        <div className="qcr-stat-card">
          <div className="qcr-stat-icon"><FiLayers /></div>
          <div>
            <div className="qcr-stat-label">Total Grup</div>
            <div className="qcr-stat-value">{rows.length.toLocaleString()}</div>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="qcr-form-panel">
          <div className="qcr-form-header">Tambah Data Reject</div>
          <form className="qcr-form-grid" onSubmit={handleSubmit}>
            <div className="qcr-form-field">
              <label htmlFor="nomor_seri">Nomor Seri</label>
              <SeriDropdown
                value={form.nomor_seri}
                onChange={(selected) => {
                  const nomorSeri = selected?.nomor_seri || "";
                  handleFormChange("nomor_seri", nomorSeri);
                }}
                seriList={seriList}
                disabled={submitting}
                loading={loadingSeri}
              />
            </div>

            <div className="qcr-form-field">
              <label htmlFor="sku">SKU</label>
              <select
                id="sku"
                className="qcr-select"
                value={form.sku}
                onChange={(e) => handleFormChange("sku", e.target.value)}
                disabled={!form.nomor_seri || submitting}
              >
                <option value="">-- Pilih SKU --</option>
                {skuOptions.map((sku) => (
                  <option key={sku} value={sku}>
                    {sku}
                  </option>
                ))}
              </select>
            </div>

            <div className="qcr-form-field">
              <label htmlFor="jumlah">Jumlah Reject</label>
              <input
                id="jumlah"
                type="number"
                min="1"
                value={form.jumlah}
                onChange={(e) => handleFormChange("jumlah", e.target.value)}
                placeholder="Contoh: 3"
              />
            </div>

            <div className="qcr-form-actions">
              <button
                type="button"
                className="qcr-btn qcr-btn-ghost"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                disabled={submitting}
              >
                Batal
              </button>

              <button type="submit" className="qcr-btn qcr-btn-primary" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan Reject"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="qcr-table-section">
        <div className="qcr-table-header">
          <div className="qcr-table-title-wrap">
            <h2>Data Reject (Grouped Nomor Seri + SKU)</h2>
            <span className="qcr-table-meta">{filteredRows.length.toLocaleString()} baris</span>
          </div>
          <div className="qcr-search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Cari nomor seri atau SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="qcr-table-wrap">
          {loading ? (
            <div className="qcr-empty">Memuat data reject...</div>
          ) : filteredRows.length === 0 ? (
            <div className="qcr-empty">
              {searchTerm ? "Data tidak ditemukan." : "Belum ada data reject."}
            </div>
          ) : (
            <table className="qcr-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nomor Seri</th>
                  <th>Informasi SKU</th>
                  <th>Total Reject</th>
                  <th>Total Input</th>
                  <th>Terakhir Input</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={`${row.nomor_seri}-${row.sku}`}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="qcr-seri-cell">
                        <span className="qcr-seri-dot" />
                        <span className="qcr-seri-text">{row.nomor_seri}</span>
                      </div>
                    </td>
                    <td>
                      <div className="qcr-sku-cell">
                        <FiLayers className="qcr-sku-icon" />
                        <span className="qcr-sku-pill">{row.sku}</span>
                      </div>
                    </td>
                    <td>{Number(row.total_jumlah).toLocaleString()}</td>
                    <td>{Number(row.total_input).toLocaleString()}</td>
                    <td>{formatDate(row.last_input)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};

export default QCReject;

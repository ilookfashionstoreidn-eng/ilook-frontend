import React, { useState, useEffect } from "react";
import API from "../../api";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import { FaHistory } from "react-icons/fa";
import { FiRefreshCw, FiSearch } from "react-icons/fi";

const RiwayatSampleGudang = () => {
  const [samples, setSamples] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");

  const fetchSamples = async () => {
    setIsLoading(true);
    try {
      const response = await API.get(`/gudang-produk-samples?status=${filterStatus}`);
      setSamples(response.data.data || []);
    } catch (error) {
      console.error("Error fetching samples:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [filterStatus]);

  const filteredSamples = samples.filter((item) => {
    if (!searchInput) return true;
    const searchLower = searchInput.toLowerCase();
    const skuName = item.sku ? item.sku.sku_name.toLowerCase() : "";
    const peminjam = item.peminjam ? item.peminjam.toLowerCase() : "";
    return skuName.includes(searchLower) || peminjam.includes(searchLower);
  });

  const totalData = filteredSamples.length;
  const dipinjamCount = filteredSamples.filter((s) => s.status === 'dipinjam').length;
  const dikembalikanCount = filteredSamples.filter((s) => s.status === 'dikembalikan').length;

  return (
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Riwayat Peminjaman Sample</h1>
          <span className="ks-header-sub">Audit trail peminjaman dan pengembalian sample gudang produk.</span>
        </div>
        <div className="ks-header-actions">
          <button type="button" className="ks-btn is-primary" onClick={fetchSamples} disabled={isLoading}>
            <FiRefreshCw size={13} className={isLoading ? "is-spinning" : ""} />
            {isLoading ? "Memuat..." : "Muat Ulang"}
          </button>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Total Riwayat</span>
          <span className="ks-stat-value tone-neutral">{totalData}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Sedang Dipinjam</span>
          <span className="ks-stat-value tone-warning">{dipinjamCount}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Dikembalikan</span>
          <span className="ks-stat-value tone-safe">{dikembalikanCount}</span>
        </div>
      </div>

      <section className="ks-board">
        <div className="ks-toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="ks-search" style={{ flex: '1 1 300px' }}>
            <FiSearch className="ks-search-icon" size={14} />
            <input
              type="text"
              placeholder="Cari SKU atau Peminjam..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Filter Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
            >
              <option value="all">Semua Status</option>
              <option value="dipinjam">Sedang Dipinjam</option>
              <option value="dikembalikan">Sudah Dikembalikan</option>
            </select>
          </div>
        </div>

        <div className="ks-grid-scroll">
          {isLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Memuat data...</div>
          ) : filteredSamples.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#64748b' }}>
              Tidak ada data riwayat peminjaman sample.
            </div>
          ) : (
            <table className="ks-grid">
              <thead>
                <tr>
                  <th style={{ minWidth: '130px' }}>TANGGAL PINJAM</th>
                  <th>SKU</th>
                  <th>PEMINJAM</th>
                  <th>TUJUAN</th>
                  <th className="align-right">QTY</th>
                  <th className="align-center">STATUS</th>
                  <th style={{ minWidth: '130px' }}>TANGGAL KEMBALI</th>
                </tr>
              </thead>
              <tbody>
                {filteredSamples.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.tanggal_pinjam ? new Date(item.tanggal_pinjam).toLocaleString('id-ID') : '-'}
                    </td>
                    <td>
                      <strong>{item.sku ? item.sku.sku : `SKU ID: ${item.sku_id}`}</strong>
                    </td>
                    <td>{item.peminjam}</td>
                    <td>{item.tujuan || '-'}</td>
                    <td className="align-right">
                      <strong>{item.qty}</strong>
                    </td>
                    <td className="align-center">
                      <span className={`ks-badge ${item.status === 'dikembalikan' ? 'tone-safe' : 'tone-warning'}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {item.tanggal_kembali ? new Date(item.tanggal_kembali).toLocaleString('id-ID') : '-'}
                    </td>
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

export default RiwayatSampleGudang;

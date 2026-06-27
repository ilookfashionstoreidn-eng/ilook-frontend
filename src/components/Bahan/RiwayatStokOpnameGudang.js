import React, { useState, useMemo } from "react";
import {
  FiHistory,
  FiSearch,
  FiCheckCircle,
  FiInfo,
  FiPrinter
} from "react-icons/fi";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";

// Dummy data for initial local development
const DUMMY_DATA = [
  {
    id: 1,
    opname_number: "OPN-20260627-001",
    tanggal: "2026-06-27T08:30:00Z",
    pic: "Budi Santoso",
    lokasi: "Gudang 1 - Rak A",
    total_sku: 15,
    total_qty_sistem: 150,
    total_qty_fisik: 148,
    selisih: -2,
    status: "Selesai",
    notes: "Ada selisih di Daster Pink karena barang reject."
  },
  {
    id: 2,
    opname_number: "OPN-20260625-002",
    tanggal: "2026-06-25T14:15:00Z",
    pic: "Andi Saputra",
    lokasi: "Gudang Utama",
    total_sku: 45,
    total_qty_sistem: 520,
    total_qty_fisik: 520,
    selisih: 0,
    status: "Selesai",
    notes: "Stok balance."
  },
  {
    id: 3,
    opname_number: "OPN-20260620-001",
    tanggal: "2026-06-20T09:00:00Z",
    pic: "Citra Kirana",
    lokasi: "Gudang 2 - Transit",
    total_sku: 5,
    total_qty_sistem: 50,
    total_qty_fisik: 55,
    selisih: 5,
    status: "Draft",
    notes: "Barang retur masuk belum tercatat."
  }
];

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumber = (value) => {
  return Number(value).toLocaleString("id-ID");
};

const getUniqueLocations = () => {
  const locations = DUMMY_DATA.map(d => d.lokasi);
  return ["Semua Lokasi", ...new Set(locations)];
};

const RiwayatStokOpnameGudang = () => {
  const [searchInput, setSearchInput] = useState("");
  const [filterTanggal, setFilterTanggal] = useState("");
  const [filterLokasi, setFilterLokasi] = useState("Semua Lokasi");
  
  const locations = useMemo(() => getUniqueLocations(), []);

  const filteredData = useMemo(() => {
    return DUMMY_DATA.filter((item) => {
      // Search filter
      const search = searchInput.toLowerCase();
      const matchSearch = 
        item.opname_number.toLowerCase().includes(search) ||
        item.pic.toLowerCase().includes(search) ||
        item.lokasi.toLowerCase().includes(search);
        
      // Date filter
      const itemDate = new Date(item.tanggal).toISOString().split('T')[0];
      const matchDate = filterTanggal ? itemDate === filterTanggal : true;
      
      // Location filter
      const matchLokasi = filterLokasi === "Semua Lokasi" ? true : item.lokasi === filterLokasi;

      return matchSearch && matchDate && matchLokasi;
    });
  }, [searchInput, filterTanggal, filterLokasi]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="ks-page" id="print-area">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
            .ks-toolbar, .ks-header-actions, .ks-statrail { display: none !important; }
            .ks-grid-scroll { overflow: visible !important; max-height: none !important; }
            .ks-header-sub { color: #000; }
          }
        `}
      </style>
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Riwayat Stok Opname</h1>
          <span className="ks-header-sub">Melihat histori perhitungan fisik stok gudang (Dummy Data).</span>
        </div>
        <div className="ks-header-actions">
          <button type="button" className="ks-btn" onClick={handlePrint}>
            <FiPrinter size={13} /> Cetak (Print)
          </button>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Total Opname</span>
          <span className="ks-stat-value">{filteredData.length}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Opname Selesai</span>
          <span className="ks-stat-value tone-safe">
            <span className="ks-dot tone-safe" />
            {filteredData.filter(d => d.status === "Selesai").length}
          </span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Opname Draft</span>
          <span className="ks-stat-value tone-warning">
            <span className="ks-dot tone-warning" />
            {filteredData.filter(d => d.status === "Draft").length}
          </span>
        </div>
      </div>

      <section className="ks-board">
        <div className="ks-toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="ks-search" style={{ flex: '1 1 300px' }}>
            <FiSearch className="ks-search-icon" size={14} />
            <input
              type="text"
              placeholder="Cari No. Opname, PIC, Lokasi..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Tanggal:</span>
            <input 
              type="date" 
              value={filterTanggal} 
              onChange={(e) => setFilterTanggal(e.target.value)}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Lokasi:</span>
            <select 
              value={filterLokasi} 
              onChange={(e) => setFilterLokasi(e.target.value)}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                outline: 'none',
                minWidth: '150px'
              }}
            >
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ks-grid-scroll">
          <table className="ks-grid">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>No. Opname</th>
                <th>Tanggal</th>
                <th>PIC</th>
                <th>Lokasi</th>
                <th className="align-right">Total SKU</th>
                <th className="align-right">Qty Sistem</th>
                <th className="align-right">Qty Fisik</th>
                <th className="align-right">Selisih</th>
                <th>Status</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className={`ks-urgency-dot tone-${row.status === 'Selesai' ? 'safe' : 'warning'}`} />
                    </td>
                    <td><strong>{row.opname_number}</strong></td>
                    <td>{formatDateTime(row.tanggal)}</td>
                    <td>{row.pic}</td>
                    <td>{row.lokasi}</td>
                    <td className="align-right">{formatNumber(row.total_sku)}</td>
                    <td className="align-right">{formatNumber(row.total_qty_sistem)}</td>
                    <td className="align-right">
                      <strong>{formatNumber(row.total_qty_fisik)}</strong>
                    </td>
                    <td className="align-right">
                      <span
                        style={{
                          color: row.selisih > 0 ? '#10b981' : row.selisih < 0 ? '#ef4444' : '#6b7280',
                          fontWeight: row.selisih !== 0 ? 'bold' : 'normal'
                        }}
                      >
                        {row.selisih > 0 ? '+' : ''}{row.selisih}
                      </span>
                    </td>
                    <td>
                      <span className={`ks-badge tone-${row.status === 'Selesai' ? 'safe' : 'warning'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.notes}>
                        {row.notes || '-'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="ks-empty" style={{ padding: '40px' }}>
                    <FiSearch size={20} style={{ marginBottom: '10px', color: '#94a3b8' }} />
                    <p>Tidak ada hasil untuk filter pencarian Anda.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default RiwayatStokOpnameGudang;

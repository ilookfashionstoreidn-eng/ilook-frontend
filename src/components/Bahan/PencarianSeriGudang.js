import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FiSearch, FiRefreshCw } from "react-icons/fi";
import { toast } from "react-toastify";
import { fetchPencarianSeriGudang } from "./GudangProdukWorkspaceApi";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";

const formatNumber = (num) => {
  if (num == null) return "-";
  return new Intl.NumberFormat("id-ID").format(num);
};

const highlightText = (text, query) => {
  if (!query) return text;
  const str = String(text || "");
  const lowerText = str.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return str;
  return (
    <>
      {str.substring(0, idx)}
      <span style={{ backgroundColor: "#fef08a", fontWeight: "bold" }}>
        {str.substring(idx, idx + query.length)}
      </span>
      {str.substring(idx + query.length)}
    </>
  );
};

const SerialPills = ({ prefix, serials, query }) => {
  const [expanded, setExpanded] = useState(false);
  const MAX_VISIBLE = 5; // Ringkas: tampilkan 5 saja di awal
  
  const visibleSerials = expanded ? serials : serials.slice(0, MAX_VISIBLE);
  const hiddenCount = serials.length - MAX_VISIBLE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {prefix && <span style={{ fontWeight: '600', color: '#334155' }}>{prefix.trim()}</span>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
        {visibleSerials.map((s, idx) => {
          const isMatch = query && s.toLowerCase().includes(query.toLowerCase());
          return (
            <span 
              key={idx} 
              style={{ 
                background: isMatch ? "#fef08a" : "#f1f5f9", 
                color: isMatch ? "#854d0e" : "#475569",
                padding: "2px 6px", 
                borderRadius: "4px",
                border: "1px solid",
                borderColor: isMatch ? "#fde047" : "#e2e8f0",
                fontSize: "0.95em",
                whiteSpace: "nowrap"
              }}
            >
              {highlightText(s, query)}
            </span>
          );
        })}
        {!expanded && hiddenCount > 0 && (
          <button 
            type="button"
            onClick={() => setExpanded(true)}
            style={{
              background: "#e2e8f0",
              color: "#334155",
              border: "1px solid #cbd5e1",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "0.85em",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "0.2s"
            }}
          >
            +{hiddenCount} lainnya...
          </button>
        )}
        {expanded && hiddenCount > 0 && (
          <button 
            type="button"
            onClick={() => setExpanded(false)}
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fca5a5",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "0.85em",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "0.2s"
            }}
          >
            Sembunyikan
          </button>
        )}
      </div>
    </div>
  );
};

const renderNotes = (notes, query) => {
  if (!notes) return "-";
  
  const notesStr = String(notes);
  
  let prefix = "";
  let serialsStr = notesStr;
  
  if (notesStr.startsWith("Barcode: ")) {
    prefix = "Barcode: ";
    serialsStr = notesStr.substring("Barcode: ".length);
  } else if (notesStr.startsWith("Kode seri: ")) {
    prefix = "Kode seri: ";
    serialsStr = notesStr.substring("Kode seri: ".length);
  }

  if (serialsStr.includes(",")) {
    const serials = serialsStr.split(",").map(s => s.trim()).filter(Boolean);
    if (serials.length > 1) {
      return <SerialPills prefix={prefix} serials={serials} query={query} />;
    }
  }

  return highlightText(notes, query);
};

const formatDateTime = (isoString) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(date).replace("pukul", ",");
};

const formatTransType = (type) => {
  const map = {
    placement: "Stok Awal",
    scan_in: "Scan Masuk",
    mutation: "Mutasi",
    opname: "Stok Opname",
  };
  return map[type] || type;
};

const PencarianSeriGudang = () => {
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchActivities = useCallback(async (query) => {
    if (!query) {
      setActivities([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchPencarianSeriGudang({ seri: query, per_page: 200 });
      if (response && response.data) {
        setActivities(response.data);
      } else {
        setActivities([]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal memuat history pencarian seri.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchInput.trim();
    setActiveSearch(q);
    fetchActivities(q);
  };

  return (
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Pencarian Seri</h1>
          <span className="ks-header-sub">Cari riwayat pergerakan (log) untuk sebuah nomor seri tertentu.</span>
        </div>
      </header>

      <section className="ks-board">
        <form onSubmit={handleSearchSubmit} className="ks-toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="ks-search" style={{ flex: '1 1 500px' }}>
            <FiSearch className="ks-search-icon" size={14} />
            <input
              type="text"
              placeholder="Masukkan kode seri (mis. SET-MIKASA-COKLAT.1)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoFocus
            />
          </label>
          <button
            type="submit"
            className="ks-btn is-primary"
            disabled={isLoading || !searchInput.trim()}
          >
            {isLoading ? <FiRefreshCw className="is-spinning" size={13}/> : <FiSearch size={13} />} Cari
          </button>
        </form>

        {error ? (
          <div className="ks-empty" style={{ color: '#ef4444' }}>
             {error}
          </div>
        ) : null}

        <div className="ks-grid-scroll">


        {isLoading ? (
          <div className="ks-empty">
            <FiRefreshCw className="is-spinning" size={20} />
            <p>Sedang mencari data...</p>
          </div>
        ) : !activeSearch ? (
          <div className="ks-empty">Silakan masukkan kode seri dan tekan Cari.</div>
        ) : activities.length === 0 ? (
          <div className="ks-empty">Tidak ada riwayat ditemukan untuk seri ini.</div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="ks-grid">
                <thead>
                  <tr>
                    <th style={{ width: "160px" }}>TGL</th>
                    <th style={{ width: "120px" }}>JENIS</th>
                    <th style={{ width: "180px" }}>SKU</th>
                    <th style={{ width: "80px" }}>QTY</th>
                    <th style={{ width: "160px" }}>DARI LOKASI</th>
                    <th style={{ width: "160px" }}>KE LOKASI</th>
                    <th>CATATAN</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDateTime(row.tgl)}</td>
                      <td>
                        <span className="gudang-ui-pill">{formatTransType(row.type)}</span>
                      </td>
                      <td>
                        <strong>{row.sku || "-"}</strong>
                      </td>
                      <td className="gudang-liststok-qty-cell">
                        <span className="gudang-liststok-qty sisa">
                          {formatNumber(row.qty)}
                        </span>
                      </td>
                      <td>
                        {row.from_lokasi ? (
                          <span className="gudang-ui-pill" style={{ background: "#fef3c7", color: "#b45309" }}>
                            {row.from_lokasi}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {row.to_lokasi ? (
                          <span className="gudang-ui-pill" style={{ background: "#dcfce7", color: "#166534" }}>
                            {row.to_lokasi}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: "0.85em", color: "#475569" }}>
                          {renderNotes(row.notes, activeSearch)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  </tbody>
              </table>
            </div>
          </>
        )}
        </div>
      </section>
    </div>
  );
};

export default PencarianSeriGudang;

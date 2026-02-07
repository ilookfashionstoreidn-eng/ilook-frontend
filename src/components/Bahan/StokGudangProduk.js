import React, { useEffect, useState, useMemo, useCallback } from "react";
import "./StokGudangProduk.css";
import API from "../../api";
import { 
  FaWarehouse, FaSync, FaChevronDown, FaChevronRight, FaChevronLeft,
  FaTh, FaList, FaSort, FaSortUp, FaSortDown, FaFilter, FaTimes,
  FaBox, FaLayerGroup, FaBoxes, FaInfoCircle
} from "react-icons/fa";

const StokGudangProduk = () => {
  const [stok, setStok] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProduk, setExpandedProduk] = useState({});
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  
  // Advanced State
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 50,
    total: 0,
    last_page: 1,
  });
  
  const [filters, setFilters] = useState({
    rak: "",
    min_qty: "",
    max_qty: ""
  });
  
  const [sortConfig, setSortConfig] = useState({
    key: "produk_nama",
    direction: "asc"
  });

  const [summary, setSummary] = useState({
    total_products: 0,
    total_qty: 0,
    total_raks_terisi: 0,
    all_raks_list: []
  });

  const [modal, setModal] = useState({
    show: false,
    selectedItem: null
  });

  useEffect(() => {
    fetchData(1, pagination.per_page);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Refetch when search, sort, or view filters change
  useEffect(() => {
    fetchData(1, pagination.per_page);
  }, [debouncedSearchTerm, sortConfig]); // Filters applied manually via button

  const fetchData = async (page = 1, perPage = 50) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page, 
        per_page: perPage,
        sort_by: sortConfig.key,
        sort_dir: sortConfig.direction,
        ...filters
      };
      
      // Add search if exists
      // Note: Backend might need update to handle 'search' param globally if not client-side filtered
      // For now we assume client-side filtering or that backend handles 'search' if added.
      // Since original code did client-side filtering, we might need to rely on that or send it.
      // Based on original code, filtering was done on client side `filtered` variable.
      // To support pagination + search properly, backend search is best.
      // But let's keep client side search logic for now if backend doesn't support 'q'.
      
      const res = await API.get("/stok-gudang-produk", { params });
      
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setStok(data);
      
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }

      if (res.data?.summary) {
        setSummary(res.data.summary);
      }
    } catch (e) {
      setError("Gagal memuat data stok gudang produk.");
      setStok([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchData(1, pagination.per_page);
  };

  const toggleProduk = useCallback((produkId) => {
    setExpandedProduk((prev) => ({
      ...prev,
      [produkId]: !prev[produkId],
    }));
  }, []);

  const openModal = (item) => {
    setModal({ show: true, selectedItem: item });
  };

  const closeModal = () => {
    setModal({ show: false, selectedItem: null });
  };

  // Helper to get image URL
  const getImageUrl = (url) => {
    if (!url) return "https://via.placeholder.com/60?text=No+Img";
    return url.startsWith('http') ? url : `http://localhost:8000/storage/${url}`;
  };

  // Client-side search filtering (if needed on top of server data)
  // Since we fetch paginated data, client-side search only searches current page.
  // Ideally search should be server-side. For now, we apply it to current page data.
  const filteredStok = useMemo(() => {
    if (!debouncedSearchTerm) return stok;
    
    const term = debouncedSearchTerm.toLowerCase();
    return stok.filter((produk) => {
      const produkNama = (produk.produk_nama || "").toLowerCase();
      if (produkNama.includes(term)) return true;
      return produk.skus?.some((sku) => {
        const skuId = (sku.sku_id || "").toString();
        const skuText = (sku.sku || "").toLowerCase();
        const skuDisplay = (sku.sku_display || "").toLowerCase();
        return skuId.includes(term) || skuText.includes(term) || skuDisplay.includes(term);
      });
    });
  }, [stok, debouncedSearchTerm]);

  return (
    <div className="stok-gudang-produk-page">
      <div className="stok-gudang-produk-header">
        <div className="stok-gudang-produk-header-icon">
          <FaWarehouse />
        </div>
        <h1>Stok Gudang Produk</h1>
      </div>

      {/* DASHBOARD RINGKASAN */}
      <div className="sgp-summary-cards">
        <div className="sgp-summary-card">
          <div className="sgp-card-icon blue"><FaBox /></div>
          <div className="sgp-card-info">
            <span className="sgp-card-value">{summary.total_products}</span>
            <span className="sgp-card-label">Total Produk</span>
          </div>
        </div>
        <div className="sgp-summary-card">
          <div className="sgp-card-icon green"><FaBoxes /></div>
          <div className="sgp-card-info">
            <span className="sgp-card-value">{summary.total_qty}</span>
            <span className="sgp-card-label">Total Stok Fisik</span>
          </div>
        </div>
        <div className="sgp-summary-card">
          <div className="sgp-card-icon purple"><FaLayerGroup /></div>
          <div className="sgp-card-info">
            <span className="sgp-card-value">{summary.total_raks_terisi}</span>
            <span className="sgp-card-label">Rak Terisi</span>
          </div>
        </div>
      </div>

      <div className="sgp-controls-container">
        {/* FILTER BAR */}
        <div className="sgp-filter-bar">
          <div className="sgp-filter-group">
            <FaFilter style={{ color: '#64748b' }} />
            <span style={{ fontWeight: 600, color: '#475569' }}>Filter:</span>
          </div>
          
          <select 
            name="rak" 
            className="sgp-select" 
            value={filters.rak} 
            onChange={handleFilterChange}
          >
            <option value="">Semua Rak</option>
            {summary.all_raks_list && summary.all_raks_list.map((rak, idx) => (
              <option key={idx} value={rak}>{rak}</option>
            ))}
          </select>

          <div className="sgp-filter-group">
            <input 
              type="number" 
              name="min_qty" 
              placeholder="Min Qty" 
              className="sgp-input small"
              value={filters.min_qty}
              onChange={handleFilterChange}
            />
            <span style={{ color: '#94a3b8' }}>-</span>
            <input 
              type="number" 
              name="max_qty" 
              placeholder="Max Qty" 
              className="sgp-input small"
              value={filters.max_qty}
              onChange={handleFilterChange}
            />
          </div>

          <button className="sgp-btn-apply" onClick={applyFilters}>
            Terapkan
          </button>
          
          {(filters.rak || filters.min_qty || filters.max_qty) && (
            <button 
              className="sgp-view-btn" 
              style={{ color: '#ef4444' }}
              onClick={() => {
                setFilters({ rak: "", min_qty: "", max_qty: "" });
                setTimeout(() => fetchData(1, pagination.per_page), 0);
              }}
            >
              <FaTimes /> Reset
            </button>
          )}
        </div>

        {/* ACTION BAR (Search & Toggle) */}
        <div className="sgp-action-bar">
          <div className="stok-gudang-produk-search-bar">
            <input
              type="text"
              placeholder="Cari Produk atau SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="stok-gudang-produk-btn-refresh" onClick={() => fetchData(pagination.current_page, pagination.per_page)} title="Refresh">
              <FaSync />
            </button>
            
            <div className="sgp-view-toggle">
              <button 
                className={`sgp-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <FaList /> Tabel
              </button>
              <button 
                className={`sgp-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <FaTh /> Kartu
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="stok-gudang-produk-loading">Memuat data...</p>
      ) : error ? (
        <p className="stok-gudang-produk-error">{error}</p>
      ) : filteredStok.length === 0 ? (
        <p className="stok-gudang-produk-loading">Tidak ada data yang cocok.</p>
      ) : (
        <div className="stok-gudang-produk-table-container">
          
          {/* VIEW MODE: TABLE */}
          {viewMode === 'table' && (
            <div className="stok-gudang-produk-table-wrapper">
              <table className="stok-gudang-produk-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}></th>
                    <th style={{ width: "80px" }}>Foto</th>
                    <th onClick={() => handleSort('produk_nama')}>
                      Produk 
                      <span className={`sort-icon ${sortConfig.key === 'produk_nama' ? 'active' : ''}`}>
                        {sortConfig.key === 'produk_nama' && sortConfig.direction === 'desc' ? <FaSortDown /> : <FaSortUp />}
                      </span>
                    </th>
                    <th>Rak</th>
                    <th onClick={() => handleSort('total_qty')}>
                      Total Qty
                      <span className={`sort-icon ${sortConfig.key === 'total_qty' ? 'active' : ''}`}>
                        {sortConfig.key === 'total_qty' && sortConfig.direction === 'desc' ? <FaSortDown /> : <FaSortUp />}
                      </span>
                    </th>
                    <th style={{ width: "60px" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStok.map((produk, index) => {
                    const isExpanded = expandedProduk[produk.produk_id] || false;
                    
                    // Representative logic
                    const representativeSku = produk.skus?.[0];
                    const productPhoto = representativeSku?.gambar_produk 
                        ? getImageUrl(representativeSku.gambar_produk) 
                        : "https://via.placeholder.com/60?text=No+Img";

                    return (
                      <React.Fragment key={produk.produk_id || index}>
                        <tr 
                          className="stok-gudang-produk-produk-header"
                          onClick={() => toggleProduk(produk.produk_id)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            {isExpanded ? <FaChevronDown style={{ fontSize: "12px", color: "#0487d8" }} /> : <FaChevronRight style={{ fontSize: "12px", color: "#0487d8" }} />}
                          </td>
                          <td>
                               <img 
                                  src={productPhoto} 
                                  alt="Produk" 
                                  style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "6px", border: "1px solid #eee" }}
                                  onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/60?text=No+Img"; }}
                               />
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <strong style={{ fontSize: "15px", color: "#17457c" }}>{produk.produk_nama}</strong>
                                <span style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{produk.skus?.length || 0} Varian SKU</span>
                            </div>
                          </td>
                          <td>
                              {produk.all_raks && produk.all_raks.length > 0 ? (
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                      {produk.all_raks.map((rak, rIdx) => (
                                          <span key={rIdx} className="stok-gudang-produk-rak-badge">
                                            {rak.rak} <span style={{ opacity: 0.8, fontSize: '0.9em' }}>({rak.qty})</span>
                                          </span>
                                      ))}
                                  </div>
                              ) : <span style={{ color: "#aaa", fontSize: "12px" }}>-</span>}
                          </td>
                          <td>
                            <span className="stok-gudang-produk-total-qty">{produk.total_qty || 0} pcs</span>
                          </td>
                          <td>
                            <button 
                              className="sgp-btn-detail"
                              onClick={(e) => { e.stopPropagation(); openModal(produk); }}
                              title="Lihat Detail"
                            >
                              <FaInfoCircle />
                            </button>
                          </td>
                        </tr>
                        
                        {isExpanded && produk.skus && produk.skus.map((sku) => (
                          <tr key={`${produk.produk_id}-${sku.sku_id}`} className="stok-gudang-produk-sku-row">
                            <td></td>
                            <td>
                                 {(() => {
                                     const photoSource = sku.foto || sku.gambar_produk;
                                     const photoUrl = getImageUrl(photoSource);
                                     return (
                                         <img 
                                            src={photoUrl} 
                                            alt="SKU" 
                                            style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }}
                                            onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/40?text=No+Img"; }}
                                         />
                                     );
                                 })()}
                            </td>
                            <td style={{ paddingLeft: "10px" }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: "13px", color: "#666", fontWeight: "600" }}>{sku.sku_display || sku.sku || "-"}</span>
                                  <span style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>SKU ID: {sku.sku_id}</span>
                              </div>
                            </td>
                            <td>
                                  {sku.raks && sku.raks.length > 0 ? (
                                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                          {sku.raks.map((rak, rIdx) => (
                                              <span key={rIdx} className="stok-gudang-produk-rak-badge sku-level">
                                                {rak.rak} <span style={{ opacity: 0.8 }}>({rak.qty})</span>
                                              </span>
                                          ))}
                                      </div>
                                  ) : <span style={{ color: "#ccc", fontSize: "11px" }}>-</span>}
                            </td>
                            <td>
                              <span className="stok-gudang-produk-qty">{sku.qty || 0} pcs</span>
                            </td>
                            <td></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW MODE: GRID (CARDS) */}
          {viewMode === 'grid' && (
            <div className="sgp-grid-container">
              {filteredStok.map((produk, index) => {
                const representativeSku = produk.skus?.[0];
                const productPhoto = representativeSku?.gambar_produk 
                    ? getImageUrl(representativeSku.gambar_produk) 
                    : "https://via.placeholder.com/60?text=No+Img";

                return (
                  <div key={produk.produk_id || index} className="sgp-grid-card">
                    <div className="sgp-grid-header">
                      <img 
                        src={productPhoto} 
                        alt={produk.produk_nama} 
                        className="sgp-grid-img"
                        onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/60?text=No+Img"; }}
                      />
                      <div className="sgp-grid-title">
                        <h3>{produk.produk_nama}</h3>
                        <span className="sgp-grid-subtitle">{produk.skus?.length || 0} Varian</span>
                      </div>
                    </div>
                    <div className="sgp-grid-body">
                      <div className="sgp-grid-stats">
                        <div className="sgp-stat-item">
                          <span className="sgp-stat-label">Total Qty</span>
                          <span className="sgp-stat-val" style={{ color: '#0ea5e9' }}>{produk.total_qty}</span>
                        </div>
                        <div className="sgp-stat-item">
                          <span className="sgp-stat-label">Status</span>
                          <span 
                            className="sgp-stat-val" 
                            style={{ color: produk.total_qty > 0 ? '#16a34a' : '#ef4444' }}
                          >
                            {produk.total_qty > 0 ? 'Tersedia' : 'Habis'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="sgp-grid-raks">
                        {produk.all_raks && produk.all_raks.length > 0 ? (
                          produk.all_raks.slice(0, 3).map((rak, idx) => (
                            <span key={idx} className="stok-gudang-produk-rak-badge">
                              {rak.rak} ({rak.qty})
                            </span>
                          ))
                        ) : <span style={{ color: "#aaa", fontSize: "12px" }}>Belum ada rak</span>}
                        {produk.all_raks && produk.all_raks.length > 3 && (
                          <span className="stok-gudang-produk-rak-badge">+{produk.all_raks.length - 3}</span>
                        )}
                      </div>
                    </div>
                    <div className="sgp-grid-footer">
                      <button className="sgp-btn-detail" onClick={() => openModal(produk)}>
                        Lihat Detail
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGINATION */}
          {pagination.last_page > 1 && (
            <div className="stok-gudang-produk-pagination">
              <div className="stok-gudang-produk-pagination-info">
                Menampilkan <span className="highlight">{((pagination.current_page - 1) * pagination.per_page) + 1}</span> sampai <span className="highlight">{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</span> dari <span className="highlight">{pagination.total}</span> data
              </div>
              
              <div className="stok-gudang-produk-pagination-actions">
                <button
                  className="stok-gudang-produk-pagination-btn prev"
                  onClick={() => fetchData(pagination.current_page - 1, pagination.per_page)}
                  disabled={pagination.current_page === 1}
                  title="Halaman Sebelumnya"
                >
                  <FaChevronLeft />
                </button>
                
                <div className="stok-gudang-produk-pagination-pages">
                  <span className="page-number active">
                    {pagination.current_page}
                  </span>
                  <span className="page-separator">/</span>
                  <span className="page-total">
                    {pagination.last_page}
                  </span>
                </div>

                <button
                  className="stok-gudang-produk-pagination-btn next"
                  onClick={() => fetchData(pagination.current_page + 1, pagination.per_page)}
                  disabled={pagination.current_page === pagination.last_page}
                  title="Halaman Selanjutnya"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL */}
      {modal.show && modal.selectedItem && (
        <div className="sgp-modal-overlay" onClick={closeModal}>
          <div className="sgp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sgp-modal-header">
              <h2>{modal.selectedItem.produk_nama}</h2>
              <button className="sgp-modal-close" onClick={closeModal}><FaTimes /></button>
            </div>
            <div className="sgp-modal-body">
              <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
                 <div className="sgp-stat-item" style={{ textAlign: 'left' }}>
                    <span className="sgp-stat-label">Total Stok</span>
                    <span className="sgp-stat-val" style={{ fontSize: '20px' }}>{modal.selectedItem.total_qty} pcs</span>
                 </div>
                 <div className="sgp-stat-item" style={{ textAlign: 'left' }}>
                    <span className="sgp-stat-label">Lokasi Rak</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {modal.selectedItem.all_raks?.map((r, i) => (
                        <span key={i} className="stok-gudang-produk-rak-badge">{r.rak} ({r.qty})</span>
                      ))}
                    </div>
                 </div>
              </div>

              <h3>Daftar Varian SKU</h3>
              <div className="sgp-modal-sku-list">
                {modal.selectedItem.skus?.map((sku) => {
                   const photoSource = sku.foto || sku.gambar_produk;
                   const photoUrl = getImageUrl(photoSource);
                   return (
                    <div key={sku.sku_id} className="sgp-sku-item">
                      <img 
                        src={photoUrl} 
                        alt="SKU" 
                        className="sgp-sku-img"
                        onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/60?text=No+Img"; }}
                      />
                      <div className="sgp-sku-info">
                        <span className="sgp-sku-title">{sku.sku_display || sku.sku}</span>
                        <span className="sgp-sku-code">{sku.sku}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="stok-gudang-produk-qty">{sku.qty} pcs</span>
                        <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                           {sku.raks?.map((r, i) => (
                             <span key={i} className="stok-gudang-produk-rak-badge sku-level" style={{ fontSize: '10px' }}>{r.rak} ({r.qty})</span>
                           ))}
                        </div>
                      </div>
                    </div>
                   );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StokGudangProduk;

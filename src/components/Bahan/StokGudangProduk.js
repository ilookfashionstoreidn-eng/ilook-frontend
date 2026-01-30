import React, { useEffect, useState, useMemo, useCallback } from "react";
import "./StokGudangProduk.css";
import API from "../../api";
import { FaWarehouse, FaSync, FaChevronDown, FaChevronRight } from "react-icons/fa";

const StokGudangProduk = () => {
  const [stok, setStok] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProduk, setExpandedProduk] = useState({});
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 100,
    total: 0,
    last_page: 1,
  });

  useEffect(() => {
    fetchData(1, 100);
  }, []);

  // ✅ OPTIMASI: Debounce search term untuk mengurangi re-render
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchData = async (page = 1, perPage = 100) => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/stok-gudang-produk", {
        params: { page, per_page: perPage },
      });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setStok(data);
      
      // Set pagination info
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (e) {
      setError("Gagal memuat data stok gudang produk.");
      setStok([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ OPTIMASI: useCallback untuk toggle function (mencegah re-render)
  const toggleProduk = useCallback((produkId) => {
    setExpandedProduk((prev) => ({
      ...prev,
      [produkId]: !prev[produkId],
    }));
  }, []);

  // ✅ OPTIMASI: useMemo untuk filter (hanya re-compute saat stok atau debouncedSearchTerm berubah)
  const filtered = useMemo(() => {
    if (!debouncedSearchTerm) return stok; // Jika tidak ada search, return semua
    
    const term = debouncedSearchTerm.toLowerCase();
    return stok.filter((produk) => {
      const produkNama = (produk.produk_nama || "").toLowerCase();
      
      // Cek apakah produk nama cocok
      if (produkNama.includes(term)) return true;
      
      // Cek apakah ada SKU yang cocok
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

      <div className="stok-gudang-produk-table-container">
        <div className="stok-gudang-produk-filter-header">
          <button className="stok-gudang-produk-btn-refresh" onClick={() => fetchData(pagination.current_page, pagination.per_page)} title="Refresh">
            <FaSync /> Refresh
          </button>
          <div className="stok-gudang-produk-search-bar">
            <input
              type="text"
              placeholder="Cari Produk atau SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="stok-gudang-produk-loading">Memuat data...</p>
        ) : error ? (
          <p className="stok-gudang-produk-error">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="stok-gudang-produk-loading">Belum ada data stok gudang produk</p>
        ) : (
          <div className="stok-gudang-produk-table-wrapper">
            <table className="stok-gudang-produk-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}></th>
                  <th>Produk</th>
                  <th>Total Qty</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((produk, index) => {
                  // ✅ OPTIMASI: Default collapsed untuk mengurangi initial render
                  const isExpanded = expandedProduk[produk.produk_id] !== undefined 
                    ? expandedProduk[produk.produk_id] 
                    : false; // Default collapsed
                  
                  return (
                    <React.Fragment key={produk.produk_id || index}>
                      {/* Header Produk */}
                      <tr 
                        className="stok-gudang-produk-produk-header"
                        onClick={() => toggleProduk(produk.produk_id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          {isExpanded ? (
                            <FaChevronDown style={{ fontSize: "12px", color: "#0487d8" }} />
                          ) : (
                            <FaChevronRight style={{ fontSize: "12px", color: "#0487d8" }} />
                          )}
                        </td>
                        <td>
                          <strong style={{ fontSize: "15px", color: "#17457c" }}>
                            {produk.produk_nama || "Produk Lainnya"}
                          </strong>
                        </td>
                        <td>
                          <span className="stok-gudang-produk-total-qty">
                            {produk.total_qty || 0} pcs
                          </span>
                        </td>
                      </tr>
                      
                      {/* Detail SKU */}
                      {isExpanded && produk.skus && produk.skus.map((sku, skuIndex) => (
                        <tr key={`${produk.produk_id}-${sku.sku_id}`} className="stok-gudang-produk-sku-row">
                          <td></td>
                          <td style={{ paddingLeft: "40px" }}>
                            <span style={{ fontSize: "13px", color: "#666" }}>
                              {sku.sku_display || sku.sku || "-"}
                            </span>
                            <span style={{ fontSize: "11px", color: "#999", marginLeft: "8px" }}>
                              (SKU ID: {sku.sku_id})
                            </span>
                          </td>
                          <td>
                            <span className="stok-gudang-produk-qty">{sku.qty || 0} pcs</span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            
            {/* ✅ OPTIMASI: Pagination Controls */}
            {pagination.last_page > 1 && (
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                marginTop: "20px",
                padding: "16px",
                background: "#f5f5f5",
                borderRadius: "8px"
              }}>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  Menampilkan {((pagination.current_page - 1) * pagination.per_page) + 1} - {Math.min(pagination.current_page * pagination.per_page, pagination.total)} dari {pagination.total} produk
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => fetchData(pagination.current_page - 1, pagination.per_page)}
                    disabled={pagination.current_page === 1}
                    style={{
                      padding: "8px 16px",
                      background: pagination.current_page === 1 ? "#ccc" : "#0487d8",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: pagination.current_page === 1 ? "not-allowed" : "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Sebelumnya
                  </button>
                  <span style={{ 
                    padding: "8px 16px", 
                    background: "white", 
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}>
                    Halaman {pagination.current_page} dari {pagination.last_page}
                  </span>
                  <button
                    onClick={() => fetchData(pagination.current_page + 1, pagination.per_page)}
                    disabled={pagination.current_page === pagination.last_page}
                    style={{
                      padding: "8px 16px",
                      background: pagination.current_page === pagination.last_page ? "#ccc" : "#0487d8",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: pagination.current_page === pagination.last_page ? "not-allowed" : "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StokGudangProduk;

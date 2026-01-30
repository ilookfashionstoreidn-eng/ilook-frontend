import React, { useEffect, useState } from "react";
import "./StokGudangProduk.css";
import API from "../../api";
import { FaWarehouse, FaSync, FaChevronDown, FaChevronRight } from "react-icons/fa";

const StokGudangProduk = () => {
  const [stok, setStok] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProduk, setExpandedProduk] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/stok-gudang-produk");
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setStok(data);
    } catch (e) {
      setError("Gagal memuat data stok gudang produk.");
      setStok([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduk = (produkId) => {
    setExpandedProduk((prev) => ({
      ...prev,
      [produkId]: !prev[produkId],
    }));
  };

  const filtered = stok.filter((produk) => {
    const term = (searchTerm || "").toLowerCase();
    const produkNama = (produk.produk_nama || "").toLowerCase();
    
    // Cek apakah produk nama cocok
    if (produkNama.includes(term)) return true;
    
    // Cek apakah ada SKU yang cocok
    const hasMatchingSku = produk.skus?.some((sku) => {
      const skuId = (sku.sku_id || "").toString();
      const skuText = (sku.sku || "").toLowerCase();
      const skuDisplay = (sku.sku_display || "").toLowerCase();
      return skuId.includes(term) || skuText.includes(term) || skuDisplay.includes(term);
    });
    
    return hasMatchingSku;
  });

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
          <button className="stok-gudang-produk-btn-refresh" onClick={fetchData} title="Refresh">
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
                  const isExpanded = expandedProduk[produk.produk_id] !== undefined 
                    ? expandedProduk[produk.produk_id] 
                    : true; // Default expanded
                  
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
          </div>
        )}
      </div>
    </div>
  );
};

export default StokGudangProduk;

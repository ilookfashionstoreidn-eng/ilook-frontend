import React, { useEffect, useState } from "react";
import "./StokGudangProduk.css";
import API from "../../api";
import { FaWarehouse, FaSync } from "react-icons/fa";

const StokGudangProduk = () => {
  const [stok, setStok] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const filtered = stok.filter((row) => {
    const term = (searchTerm || "").toLowerCase();
    const skuId = (row.sku_id || "").toString();
    const sku = (row.sku || "").toLowerCase();
    return skuId.includes(term) || sku.includes(term);
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
              placeholder="Cari SKU ID atau SKU..."
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
                  <th>SKU ID</th>
                  <th>SKU</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => (
                  <tr key={row.sku_id || index}>
                    <td>{row.sku_id || "-"}</td>
                    <td>
                      <strong>{row.sku || "-"}</strong>
                    </td>
                    <td>
                      <span className="stok-gudang-produk-qty">{row.qty || 0} pcs</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StokGudangProduk;

import React, { useState, useEffect, useDeferredValue, startTransition } from "react";
import API from "../../api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { FaSyncAlt, FaLayerGroup, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import SkuHover from "../SkuHover";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import "./ProductList.css";

const GineeSkuList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  
  const deferredSearchInput = useDeferredValue(searchInput);
  
  const [query, setQuery] = useState({
    page: 1,
    perPage: 50,
    search: "",
  });

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: 0,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = deferredSearchInput.trim();
      startTransition(() => {
        setQuery((current) => {
          if (current.search === nextSearch && current.page === 1) return current;
          return { ...current, search: nextSearch, page: 1 };
        });
      });
    }, 400); // 400ms debounce
    return () => window.clearTimeout(timer);
  }, [deferredSearchInput]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const keyword = query.search ? `&q=${encodeURIComponent(query.search)}` : "";
      const res = await API.get(`/ginee/products/search?page=${query.page}&per_page=${query.perPage}${keyword}`);
      
      setData(res.data.data || []);
      setPagination({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        per_page: res.data.per_page,
        total: res.data.total,
      });
    } catch (error) {
      console.error("Gagal mengambil data SKU:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.perPage, query.search]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    
    let totalSynced = 0;

    Swal.fire({
      title: "Sinkronisasi SKU Ginee",
      html: `Mempersiapkan penarikan data...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      // Fetch First Page to get total pages
      let res = await API.post("/ginee/products/sync", { page: 0 });
      let totalPages = res.data.total_pages;
      let currentPage = res.data.current_page;
      totalSynced += res.data.synced_count || 0;
      
      while (currentPage < totalPages - 1) {
        currentPage++;
        Swal.update({
          html: `Menarik halaman <b>${currentPage + 1}</b> dari <b>${totalPages}</b>...<br/><small style="color:#666">Telah memproses ${totalSynced} produk</small>`
        });
        
        res = await API.post("/ginee/products/sync", { page: currentPage });
        totalSynced += res.data.synced_count || 0;
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: `Sinkronisasi selesai! Berhasil memproses ${totalSynced} produk.`,
      });
      
      // Reset back to page 1 to see the new data
      setQuery(curr => ({ ...curr, page: 1 }));
      fetchData();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Terjadi kesalahan saat sinkronisasi API.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.last_page) return;
    startTransition(() => {
      setQuery((current) => ({ ...current, page }));
    });
  };

  const handlePerPageChange = (e) => {
    const nextPerPage = Number(e.target.value) || 50;
    startTransition(() => {
      setQuery((current) => ({ ...current, perPage: nextPerPage, page: 1 }));
    });
  };

  const formatNumber = (num) => (num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "0");

  const resultFrom = data.length > 0 ? (pagination.current_page - 1) * pagination.per_page + 1 : 0;
  const resultTo = data.length > 0 ? Math.min(pagination.current_page * pagination.per_page, pagination.total) : 0;

  return (
    <div className="ks-page pl-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaLayerGroup style={{ color: "var(--ks-muted)" }} /> Daftar SKU Ginee
          </h1>
          <span className="ks-header-sub">
            Total {formatNumber(pagination.total)} data — Tarik Master Data SKU dari Ginee API untuk sinkronisasi lokal.
          </span>
        </div>
      </header>

      <section className="ks-board">
        <div className="ks-toolbar">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1, flexWrap: "wrap" }}>
            <div className="ks-search">
              <FaSearch style={{ position: "absolute", left: "10px", color: "var(--ks-muted, #9a9aa3)", pointerEvents: "none", fontSize: "12px" }} />
              <input
                type="text"
                placeholder="Cari SKU atau Nama Produk..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 }}>
             <select 
               className="ks-btn" 
               style={{ backgroundColor: "#fff", padding: "8px 12px", border: "1px solid #e0e0e4" }}
               value={query.perPage} 
               onChange={handlePerPageChange}
             >
               <option value="50">50 baris</option>
               <option value="100">100 baris</option>
               <option value="250">250 baris</option>
             </select>

             <button className="ks-btn is-primary" onClick={handleSync} disabled={syncing}>
               <FaSyncAlt className={syncing ? "fa-spin" : ""} /> {syncing ? "Menarik Data..." : "Tarik Data Ginee"}
             </button>
          </div>
        </div>

        <div className="ks-grid-scroll">
          <table className="ks-grid">
            <thead>
              <tr>
                <th style={{ width: "50px", textAlign: "center" }}>No</th>
                <th style={{ width: "60px", textAlign: "center" }}>Image</th>
                <th>SKU</th>
                <th>Kategori</th>
                <th>Variasi</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th>Keterangan</th>
                <th>Tgl Buat (Ginee)</th>
                <th>Terakhir Sync</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", height: "132px", color: "var(--ks-muted)", fontWeight: 600 }}>Loading...</td>
                </tr>
              ) : data.length > 0 ? (
                data.map((item, index) => (
                  <tr key={item.id}>
                    <td className="ks-cell-muted" style={{ textAlign: "center" }}>
                      {resultFrom + index}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <SkuHover img={item.image_url} name={item.product_name || item.sku} label="" />
                    </td>
                    <td className="ks-cell-code">{item.sku}</td>
                    <td>{item.category || "-"}</td>
                    <td>
                      {item.color || item.size ? (
                        <div style={{ display: "flex", gap: "4px" }}>
                          {item.color && <span className="ks-tag">{item.color}</span>}
                          {item.size && <span className="ks-tag">{item.size}</span>}
                        </div>
                      ) : "-"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.status ? (
                        <span className={`ks-tag ${item.status === "NORMAL" ? "is-sudah" : "is-belum"}`}>
                          {item.status}
                        </span>
                      ) : "-"}
                    </td>
                    <td style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={item.description}>
                      {item.description || "-"}
                    </td>
                    <td>{item.created_at_ginee ? new Date(item.created_at_ginee).toLocaleDateString('id-ID') : "-"}</td>
                    <td>{new Date(item.last_synced_at).toLocaleString('id-ID')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", height: "132px", color: "var(--ks-muted)", fontWeight: 600 }}>
                    Tidak ada data SKU Ginee yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data.length > 0 && pagination.last_page > 1 ? (
          <div className="ks-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
            <div className="ks-footer-info" style={{ color: "var(--ks-muted)", fontSize: "13px" }}>
              Menampilkan <strong>{formatNumber(resultFrom)}</strong> - <strong>{formatNumber(resultTo)}</strong> dari <strong>{formatNumber(pagination.total)}</strong> baris
            </div>
            <div className="ks-pagination" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                className="ks-page-btn"
                style={{ padding: "6px", background: "transparent", border: "1px solid #e0e0e4", borderRadius: "6px", cursor: pagination.current_page <= 1 ? "not-allowed" : "pointer", opacity: pagination.current_page <= 1 ? 0.5 : 1 }}
                onClick={() => goToPage(pagination.current_page - 1)}
                disabled={pagination.current_page <= 1}
              >
                <FaChevronLeft size={12} color="#16324f" />
              </button>
              <span className="ks-page-info" style={{ fontSize: "13px", color: "#16324f" }}>
                Halaman <strong>{formatNumber(pagination.current_page)}</strong> dari {formatNumber(pagination.last_page)}
              </span>
              <button
                className="ks-page-btn"
                style={{ padding: "6px", background: "transparent", border: "1px solid #e0e0e4", borderRadius: "6px", cursor: pagination.current_page >= pagination.last_page ? "not-allowed" : "pointer", opacity: pagination.current_page >= pagination.last_page ? 0.5 : 1 }}
                onClick={() => goToPage(pagination.current_page + 1)}
                disabled={pagination.current_page >= pagination.last_page}
              >
                <FaChevronRight size={12} color="#16324f" />
              </button>
            </div>
          </div>
        ) : null}

      </section>
    </div>
  );
};

export default GineeSkuList;

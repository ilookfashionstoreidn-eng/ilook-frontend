import React, { useState, useEffect } from "react";
import API from "../../api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { FaSyncAlt, FaLayerGroup, FaSearch } from "react-icons/fa";
import SkuHover from "../SkuHover";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import "./ProductList.css";

const GineeSkuList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const keyword = search ? `?q=${search}` : "";
      const res = await API.get(`/ginee/products/search${keyword}`);
      setData(res.data);
    } catch (error) {
      console.error("Gagal mengambil data SKU:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleSync = async () => {
    setSyncing(true);
    Swal.fire({
      title: "Sinkronisasi SKU Ginee",
      text: "Sedang menarik data dari Ginee API, mohon tunggu...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const res = await API.post("/ginee/products/sync");
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: res.data.message || "Sinkronisasi selesai.",
      });
      fetchData();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Terjadi kesalahan saat sinkronisasi.",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="ks-page pl-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaLayerGroup style={{ color: "var(--ks-muted)" }} /> Daftar SKU Ginee
          </h1>
          <span className="ks-header-sub">{data.length} data — Tarik Master Data SKU dari Ginee API untuk sinkronisasi lokal.</span>
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
             <button className="ks-btn is-primary" onClick={handleSync} disabled={syncing}>
               <FaSyncAlt className={syncing ? "fa-spin" : ""} /> {syncing ? "Menarik Data..." : "Tarik Data Ginee"}
             </button>
          </div>
        </div>

        <div className="ks-grid-scroll">
          <table className="ks-grid">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>No</th>
                <th style={{ width: "60px" }}>Image</th>
                <th>SKU</th>
                <th>Kategori</th>
                <th>Variasi</th>
                <th>Status</th>
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
                    <td className="ks-cell-muted" style={{ textAlign: "center" }}>{index + 1}</td>
                    <td>
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
                    <td>
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
                    Tidak ada data SKU Ginee. Silakan klik "Tarik Data Ginee".
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

export default GineeSkuList;

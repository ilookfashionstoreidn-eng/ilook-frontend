import React, { useState, useEffect } from "react";
import API from "../../api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { FaSyncAlt, FaLayerGroup } from "react-icons/fa";

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
    <div style={{ padding: "24px" }}>
      <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px", color: "#1e293b" }}>
            <FaLayerGroup /> Daftar SKU Ginee
          </h2>
          <p style={{ margin: 0, marginTop: "8px", color: "#64748b" }}>
            Tarik Master Data SKU dari Ginee API untuk sinkronisasi lokal.
          </p>
        </div>
        <div>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: "10px 20px",
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: syncing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: "600"
            }}
          >
            <FaSyncAlt className={syncing ? "fa-spin" : ""} />
            {syncing ? "Menarik Data..." : "Tarik Data Ginee"}
          </button>
        </div>
      </header>

      <main style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="Cari SKU atau Nama Produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "10px 16px",
              width: "100%",
              maxWidth: "400px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1"
            }}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", color: "#475569" }}>No</th>
                <th style={{ padding: "12px 16px", color: "#475569" }}>Image</th>
                <th style={{ padding: "12px 16px", color: "#475569" }}>SKU</th>
                <th style={{ padding: "12px 16px", color: "#475569" }}>Kategori</th>
                <th style={{ padding: "12px 16px", color: "#475569" }}>Variasi</th>
                <th style={{ padding: "12px 16px", color: "#475569" }}>Status</th>
                <th style={{ padding: "12px 16px", color: "#475569" }}>Keterangan</th>
                <th style={{ padding: "12px 16px", color: "#475569" }}>Tgl Buat (Ginee)</th>
                <th style={{ padding: "12px 16px", color: "#475569" }}>Terakhir Sync</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>Loading...</td>
                </tr>
              ) : data.length > 0 ? (
                data.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>{index + 1}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt="product" style={{ width: "40px", height: "40px", borderRadius: "4px", objectFit: "cover" }} />
                      ) : (
                        <span style={{ color: "#cbd5e1" }}>No Image</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: "600", color: "#334155" }}>{item.sku}</td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>{item.category || "-"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {item.color || item.size ? (
                        <div style={{ display: "flex", gap: "4px" }}>
                          {item.color && <span style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>{item.color}</span>}
                          {item.size && <span style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>{item.size}</span>}
                        </div>
                      ) : "-"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {item.status ? (
                        <span style={{ 
                          background: item.status === "NORMAL" ? "#dcfce7" : "#fee2e2", 
                          color: item.status === "NORMAL" ? "#166534" : "#991b1b",
                          padding: "2px 8px", 
                          borderRadius: "12px", 
                          fontSize: "12px",
                          fontWeight: "500"
                        }}>
                          {item.status}
                        </span>
                      ) : "-"}
                    </td>
                    <td style={{ padding: "12px 16px", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#64748b" }} title={item.description}>
                      {item.description || "-"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>{item.created_at_ginee ? new Date(item.created_at_ginee).toLocaleDateString('id-ID') : "-"}</td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>{new Date(item.last_synced_at).toLocaleString('id-ID')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                    Tidak ada data SKU Ginee. Silakan klik "Tarik Data Ginee".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default GineeSkuList;

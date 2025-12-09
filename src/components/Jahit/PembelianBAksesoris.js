import React, { useEffect, useState } from "react";
import "./PembelianBAksesoris.css";
import API from "../../api";
import { FaShoppingCart, FaDownload, FaCheckCircle, FaTimesCircle, FaUser, FaBox } from "react-icons/fa";

const PembelianBAksesoris = () => {
  const [pembelianB, setPembelianB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPembelianB = async () => {
      try {
        setLoading(true);
        const response = await API.get("pembelian-aksesoris-b");
        setPembelianB(response.data);
        setError(null);
      } catch (error) {
        setError("Gagal mengambil data");
      } finally {
        setLoading(false);
      }
    };
    fetchPembelianB();
  }, []);

  const handleDownloadBarcode = async (id) => {
    try {
      const response = await API.get(`/barcode-download/${id}`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `barcode_aksesoris_${id}.pdf`;
      link.click();
    } catch (error) {
      console.error("Terjadi kesalahan saat mengunduh barcode:", error);
      alert("Gagal mengunduh barcode. Silakan coba lagi.");
    }
  };

  // Filter data berdasarkan search term
  const filteredData = pembelianB.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.pembelian_a?.aksesoris?.nama_aksesoris?.toLowerCase().includes(searchLower) ||
      item.user?.name?.toLowerCase().includes(searchLower) ||
      item.pembelian_a_id?.toString().includes(searchLower) ||
      item.id?.toString().includes(searchLower)
    );
  });

  // Sort data berdasarkan ID descending (yang baru di atas)
  const sortedData = [...filteredData].sort((a, b) => b.id - a.id);

  return (
    <div className="pembelian-b-aksesoris-page">
      <div className="pembelian-b-aksesoris-header">
        <div className="pembelian-b-aksesoris-header-icon">
          <FaShoppingCart />
        </div>
        <h1>Pembelian Aksesoris CMT (Petugas B)</h1>
      </div>

      <div className="pembelian-b-aksesoris-table-container">
        <div className="pembelian-b-aksesoris-filter-header">
          <div className="pembelian-b-aksesoris-search-bar">
            <input type="text" placeholder="Cari nama aksesoris, user, atau ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="pembelian-b-aksesoris-loading">Memuat data...</div>
        ) : error ? (
          <div className="pembelian-b-aksesoris-error">{error}</div>
        ) : sortedData.length === 0 ? (
          <div className="pembelian-b-aksesoris-empty-state">
            <div className="pembelian-b-aksesoris-empty-state-icon">📦</div>
            <p>Tidak ada data pembelian aksesoris</p>
          </div>
        ) : (
          <div className="pembelian-b-aksesoris-table-wrapper">
            <table className="pembelian-b-aksesoris-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>ID Pembelian A</th>
                  <th>User</th>
                  <th>Nama Aksesoris</th>
                  <th>Jumlah Verifikasi</th>
                  <th>Status Verifikasi</th>
                  <th>Waktu Verifikasi</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((pembelianB, index) => (
                  <tr key={pembelianB.id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>#{pembelianB.pembelian_a_id}</strong>
                    </td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaUser style={{ color: "#0487d8" }} />
                        {pembelianB.user?.name || "Tidak Diketahui"}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaBox style={{ color: "#0487d8" }} />
                        <strong>{pembelianB.pembelian_a?.aksesoris?.nama_aksesoris || "-"}</strong>
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "#0487d8" }}>{pembelianB.jumlah_terverifikasi}</span>
                    </td>
                    <td>
                      <span className={`pembelian-b-aksesoris-status-badge ${pembelianB.status_verifikasi === "valid" ? "valid" : "invalid"}`}>
                        {pembelianB.status_verifikasi === "valid" ? (
                          <>
                            <FaCheckCircle /> Valid
                          </>
                        ) : (
                          <>
                            <FaTimesCircle /> Invalid
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      {new Date(pembelianB.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      {new Date(pembelianB.created_at).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      {!pembelianB.barcode_downloaded ? (
                        <button onClick={() => handleDownloadBarcode(pembelianB.id)} className="pembelian-b-aksesoris-btn-download">
                          <FaDownload /> Download Barcode
                        </button>
                      ) : (
                        <span className="pembelian-b-aksesoris-status-badge disabled">Barcode Sudah Didownload</span>
                      )}
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
export default PembelianBAksesoris;

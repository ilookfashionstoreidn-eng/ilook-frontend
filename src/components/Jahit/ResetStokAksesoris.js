import React, { useEffect, useState } from "react";
import API from "../../api";
import { FaBox, FaUndo } from "react-icons/fa";
import "./Aksesoris.css";

const ResetStokAksesoris = () => {
  const [aksesoris, setAksesoris] = useState({ data: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [resettingId, setResettingId] = useState(null);

  const fetchAksesoris = async (currentPage = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await API.get(`/aksesoris?page=${currentPage}`);
      setAksesoris(response.data);
    } catch (err) {
      setError("Gagal mengambil data aksesoris");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAksesoris(page);
  }, [page]);

  const handleResetStok = async (item) => {
    const confirmed = window.confirm(
      `Reset stok untuk ${item.nama_aksesoris}? Semua stok tersedia akan dijadikan terpakai.`
    );

    if (!confirmed) return;

    try {
      setResettingId(item.id);
      const response = await API.post(`/aksesoris/${item.id}/reset-stok`);
      alert(response.data?.message || "Stok berhasil dikosongkan");
      await fetchAksesoris(page);
    } catch (err) {
      alert(err.response?.data?.error || "Gagal reset stok");
    } finally {
      setResettingId(null);
    }
  };

  const fetchPage = (newPage) => {
    if (newPage >= 1 && newPage <= (aksesoris.last_page || 1)) {
      setPage(newPage);
    }
  };

  const filteredAksesoris = [...(aksesoris.data || [])]
    .sort((a, b) => b.id - a.id)
    .filter((item) =>
      item.nama_aksesoris.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="aksesoris-page">
      <div className="aksesoris-header">
        <div className="aksesoris-header-icon">
          <FaUndo />
        </div>
        <h1>Reset Stok Aksesoris</h1>
      </div>

      <div className="aksesoris-table-container">
        <div className="aksesoris-filter-header">
          <div className="aksesoris-search-bar">
            <input
              type="text"
              placeholder="Cari aksesoris..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="aksesoris-loading">Memuat data aksesoris...</div>
        ) : error ? (
          <div className="aksesoris-error">{error}</div>
        ) : filteredAksesoris.length === 0 ? (
          <div className="aksesoris-empty-state">
            <div className="aksesoris-empty-state-icon">
              <FaBox />
            </div>
            <p>Tidak ada data aksesoris ditemukan</p>
          </div>
        ) : (
          <div className="aksesoris-table-wrapper">
            <table className="aksesoris-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Nama Aksesoris</th>
                  <th>Jenis</th>
                  <th>Stok</th>
                  <th style={{ textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredAksesoris.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: 500 }}>{item.nama_aksesoris}</td>
                    <td>{item.jenis_aksesoris}</td>
                    <td>
                      <span
                        className={`aksesoris-stok-badge ${
                          item.jumlah_stok === 0
                            ? "out"
                            : item.jumlah_stok < 10
                            ? "low"
                            : ""
                        }`}
                      >
                        {item.jumlah_stok} {item.satuan}
                      </span>
                    </td>
                    <td>
                      <div className="aksesoris-action-card" style={{ justifyContent: "center" }}>
                        <button
                          className="aksesoris-btn-icon"
                          onClick={() => handleResetStok(item)}
                          title="Reset Stok"
                          disabled={resettingId === item.id}
                        >
                          <FaUndo className="icon" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {aksesoris.data?.length > 0 && (
              <div className="pembelian-aksesoris-pagination">
                <button disabled={page === 1} onClick={() => fetchPage(page - 1)}>
                  ← Prev
                </button>
                <span>
                  Halaman {aksesoris.current_page} / {aksesoris.last_page}
                </span>
                <button
                  disabled={page === aksesoris.last_page}
                  onClick={() => fetchPage(page + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetStokAksesoris;

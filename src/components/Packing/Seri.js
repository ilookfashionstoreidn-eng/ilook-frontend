import React, { useEffect, useState } from "react";
import "./Seri.css";
import API from "../../api";
import { FaPlus, FaQrcode, FaBarcode, FaDownload, FaHashtag, FaCheckCircle } from "react-icons/fa";

const Seri = () => {
  const [seri, setSeri] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [newSeri, setNewSeri] = useState({
    nomor_seri: "",
    sku: "",
  });

  const fetchSeri = async (page = 1) => {
    try {
      setLoading(true);
      const response = await API.get(`/seri?page=${page}`);
      setSeri(response.data.data);
      setCurrentPage(response.data.current_page);
      setLastPage(response.data.last_page);
      setError(null);
    } catch (error) {
      setError("Gagal mengambil data seri");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeri(1);
  }, []);

  const downloadQR = async (id, nomorSeri) => {
    try {
      const response = await API.get(`/seri/${id}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `qr-seri-${nomorSeri}.pdf`);
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Gagal mengunduh file.");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    console.log("Data yang dikirim:", newSeri.nomor_seri);

    const formData = new FormData();
    formData.append("nomor_seri", newSeri.nomor_seri);
    formData.append("sku", newSeri.sku);

    try {
      const response = await API.post("/seri", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Seri berhasil ditambahkan!");
      await fetchSeri(currentPage); // Refresh data
      setShowForm(false);
      setNewSeri({
        nomor_seri: "",
        sku: "",
      });
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menambahkan seri.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSeri((prev) => ({
      ...prev,
      [name]: value.toUpperCase(),
    }));
  };

  // Filter dan sort data
  const filteredData = seri.filter((item) => (item.nomor_seri ?? "").toLowerCase().includes(searchTerm.toLowerCase()) || (item.sku ?? "").toLowerCase().includes(searchTerm.toLowerCase()) || item.id?.toString().includes(searchTerm));

  // Sort data berdasarkan ID descending (yang baru di atas)
  const sortedData = [...filteredData].sort((a, b) => b.id - a.id);

  return (
    <div className="seri-page">
      <div className="seri-header">
        <div className="seri-header-icon">
          <FaQrcode />
        </div>
        <h1>Data Seri</h1>
      </div>

      <div className="seri-table-container">
        <div className="seri-filter-header">
          <button className="seri-btn-add" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah Seri
          </button>
          <div className="seri-search-bar">
            <input type="text" placeholder="Cari nomor seri, SKU, atau ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="seri-loading">Memuat data...</div>
        ) : error ? (
          <div className="seri-error">{error}</div>
        ) : sortedData.length === 0 ? (
          <div className="seri-empty-state">
            <div className="seri-empty-state-icon">📦</div>
            <p>Tidak ada data seri</p>
          </div>
        ) : (
          <div className="seri-table-wrapper">
            <table className="seri-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nomor Seri</th>
                  <th>SKU</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong style={{ color: "#0487d8" }}>{item.nomor_seri}</strong>
                    </td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaBarcode style={{ color: "#0487d8" }} />
                        {item.sku}
                      </span>
                    </td>
                    <td>
                      <button className="seri-btn-download" onClick={() => downloadQR(item.id, item.nomor_seri)}>
                        <FaDownload /> Download QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sortedData.length > 0 && (
          <div className="seri-pagination">
            <button disabled={currentPage === 1} onClick={() => fetchSeri(currentPage - 1)}>
              ← Prev
            </button>
            <span>
              Halaman {currentPage} / {lastPage}
            </span>
            <button disabled={currentPage === lastPage} onClick={() => fetchSeri(currentPage + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="seri-modal" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="seri-modal-content">
            <h2>
              <FaPlus /> Tambah Seri dan SKU
            </h2>
            <form onSubmit={handleFormSubmit} className="seri-form">
              <div className="seri-form-group">
                <label>
                  <FaHashtag /> Nomor Seri:
                </label>
                <input type="text" name="nomor_seri" value={newSeri.nomor_seri} onChange={handleInputChange} placeholder="Masukkan nomor seri" required />
              </div>

              <div className="seri-form-group">
                <label>
                  <FaBarcode /> SKU:
                </label>
                <input type="text" name="sku" value={newSeri.sku} onChange={handleInputChange} placeholder="Masukkan SKU" required />
              </div>

              <div className="seri-form-actions">
                <button type="submit" className="seri-btn-submit">
                  <FaCheckCircle /> Simpan
                </button>
                <button type="button" className="seri-btn-cancel" onClick={() => setShowForm(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Seri;

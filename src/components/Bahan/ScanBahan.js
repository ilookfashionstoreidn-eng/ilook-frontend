import React, { useEffect, useRef, useState } from "react";
import "../Jahit/Penjahit.css";
import "../Cutting/SpkCutting/SpkCuting.css";
import API from "../../api";
import { FaQrcode, FaChevronDown, FaChevronUp } from "react-icons/fa";

const ScanBahan = () => {
  const inputRef = useRef(null);
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanStatus, setScanStatus] = useState("");

  // State untuk tabel stok
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stokLoading, setStokLoading] = useState(false);
  const [stokError, setStokError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    inputRef.current?.focus();
    fetchStok();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // === FETCH STOK DATA ===
  const fetchStok = async () => {
    try {
      setStokLoading(true);
      const res = await API.get("/stok-bahan");
      setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (e) {
      setStokError("Gagal memuat data stok.");
    } finally {
      setStokLoading(false);
    }
  };

  // === PAGINATION ===
  const filtered = items.filter(
    (item) => (item.barcode || "").toLowerCase().includes(searchTerm.toLowerCase()) || (item.nama_bahan || "").toLowerCase().includes(searchTerm.toLowerCase()) || (item.warna || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // === TOGGLE EXPAND DETAIL ===
  const toggleExpand = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await API.get(`/stok-bahan/barcode/${encodeURIComponent(code)}`);
      const data = res.data;
      setResult(data);
      setHistory((prev) => [{ code, time: new Date().toLocaleString() }, ...prev].slice(0, 10));
      setBarcode("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Error searching barcode:", err);
      const errorMessage = err.response?.data?.message || err.message || "Gagal mencari barcode.";
      setError(errorMessage);
      // Jika barcode tidak ditemukan, tetap reset input
      if (err.response?.status === 404) {
        setBarcode("");
        inputRef.current?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) {
      setScanMessage("Barcode tidak boleh kosong.");
      setScanStatus("error");
      return;
    }
    try {
      setScanStatus("loading");
      const response = await API.post("/stok-bahan/scan", { barcode: scanInput.trim() });
      setScanMessage(response.data.message);
      setScanStatus("success");
      setScanInput("");
      // Refresh tabel stok setelah scan berhasil
      fetchStok();
      inputRef.current?.focus();
    } catch (error) {
      const msg = error.response?.data?.message || "Gagal memindai barcode.";
      setScanMessage(msg);
      setScanStatus("error");
    } finally {
      setTimeout(() => setScanStatus(""), 3000);
    }
  };

  return (
    <div>
      <div className="penjahit-container">
        <h1>Scan Bahan</h1>
      </div>

      <div className="table-container">
        <h3 style={{ marginBottom: "12px" }}>
          <FaQrcode style={{ marginRight: "8px" }} /> Scan Barcode Rol
        </h3>
        <form onSubmit={handleScan} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
          <input type="text" value={scanInput} onChange={(e) => setScanInput(e.target.value)} placeholder="Masukkan barcode rol..." style={{ padding: "8px 12px", flex: 1, borderRadius: "4px", border: "1px solid #ccc" }} />
          <button type="submit" className="btn" style={{ padding: "8px 16px" }} disabled={scanStatus === "loading"}>
            {scanStatus === "loading" ? "Memindai..." : "Scan"}
          </button>
        </form>
        {scanMessage && (
          <div
            style={{
              marginTop: "8px",
              padding: "8px 12px",
              borderRadius: "4px",
              backgroundColor: scanStatus === "success" ? "#d4edda" : "#f8d7da",
              color: scanStatus === "success" ? "#155724" : "#721c24",
              border: scanStatus === "success" ? "1px solid #c3e6cb" : "1px solid #f5c6cb",
              marginBottom: "16px",
            }}
          >
            {scanMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modern-form" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label>Scan / Input Barcode</label>
            <input ref={inputRef} type="text" value={barcode} placeholder="Arahkan scanner dan tekan Enter, atau ketik manual" onChange={(e) => setBarcode(e.target.value)} autoCorrect="off" autoCapitalize="none" />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-submit" disabled={loading}>
              {loading ? "Memproses..." : "Cari"}
            </button>
            <button type="button" className="btn btn-cancel" onClick={() => setBarcode("")}>
              Reset
            </button>
          </div>
        </form>

        {error && <p className="error">{error}</p>}

        {result && (
          <div className="modern-form" style={{ marginBottom: 16 }}>
            <h3>Hasil</h3>
            <div className="form-group">
              <strong>Barcode/ID:</strong> {result.barcode || result.id}
            </div>
            <div className="form-group">
              <strong>Nama Bahan:</strong> {result.nama_bahan || "-"}
            </div>
            <div className="form-group">
              <strong>Warna:</strong> {result.warna || "-"}
            </div>
            <div className="form-group">
              <strong>Berat (kg):</strong> {result.berat ?? "-"}
            </div>
            <div className="form-group">
              <strong>Status:</strong> {result.status || "-"}
            </div>
            <div className="form-group">
              <strong>Gudang:</strong> {result.gudang?.nama_gudang || result.gudang_id || "-"}
            </div>
          </div>
        )}

        <div className="modern-form">
          <h3>Riwayat Scan Terakhir</h3>
          {history.length === 0 ? (
            <p>Belum ada riwayat.</p>
          ) : (
            <table className="penjahit-table">
              <thead>
                <tr>
                  <th>Barcode</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => (
                  <tr key={idx}>
                    <td>{h.code}</td>
                    <td>{h.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Tabel Stok Bahan */}
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ marginBottom: "15px" }}>Daftar Stok Bahan</h3>
          <div className="filter-header1">
            <div className="search-bar1">
              <input type="text" placeholder="Cari barcode, nama bahan, atau warna..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          {stokLoading ? (
            <p>Memuat data stok...</p>
          ) : stokError ? (
            <p className="error">{stokError}</p>
          ) : (
            <>
              <table className="penjahit-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>No</th>
                    <th>Nama Bahan</th>
                    <th>Warna</th>
                    <th>Barcode</th>
                    <th>Berat (kg)</th>
                    <th>Hari di Gudang</th>
                    <th>Tanggal Scan</th>
                    <th style={{ width: "120px" }}>Status</th>
                    <th style={{ width: "80px", textAlign: "center" }}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
                        Tidak ada data stok
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, index) => {
                      const isExpanded = expandedItems[item.id];
                      return (
                        <React.Fragment key={item.id}>
                          <tr>
                            <td>{indexOfFirstItem + index + 1}</td>
                            <td>{item.nama_bahan || "-"}</td>
                            <td>{item.warna || "-"}</td>
                            <td>{item.barcode}</td>
                            <td>{item.berat || "-"}</td>
                            <td>
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "12px",
                                  backgroundColor: item.hari_di_gudang > 30 ? "#dc3545" : item.hari_di_gudang > 15 ? "#ffc107" : "#28a745",
                                  color: "white",
                                  fontWeight: "bold",
                                }}
                              >
                                {item.hari_di_gudang} hari
                              </span>
                            </td>
                            <td>{item.scanned_at ? new Date(item.scanned_at).toLocaleDateString("id-ID") : "-"}</td>
                            <td>
                              <span
                                style={{
                                  padding: "4px 12px",
                                  borderRadius: "12px",
                                  backgroundColor: (item.status || "tersedia") === "tersedia" ? "#28a745" : "#dc3545",
                                  color: "white",
                                  fontWeight: "bold",
                                  fontSize: "12px",
                                  textTransform: "capitalize",
                                }}
                              >
                                {item.status || "tersedia"}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                onClick={() => toggleExpand(item.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "16px",
                                  color: "#007bff",
                                  padding: "4px 8px",
                                }}
                                title="Lihat detail"
                              >
                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan="9" style={{ padding: "0", backgroundColor: "#f8f9fa" }}>
                                <div style={{ padding: "15px" }}>
                                  <h4 style={{ marginBottom: "15px", color: "#495057" }}>Detail Stok - {item.nama_bahan || item.barcode}</h4>
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                                      gap: "15px",
                                    }}
                                  >
                                    <div style={{ padding: "10px", backgroundColor: "white", borderRadius: "8px" }}>
                                      <strong style={{ color: "#6c757d", fontSize: "12px" }}>Barcode</strong>
                                      <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>{item.barcode || "-"}</p>
                                    </div>
                                    <div style={{ padding: "10px", backgroundColor: "white", borderRadius: "8px" }}>
                                      <strong style={{ color: "#6c757d", fontSize: "12px" }}>Nama Bahan</strong>
                                      <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>{item.nama_bahan || "-"}</p>
                                    </div>
                                    <div style={{ padding: "10px", backgroundColor: "white", borderRadius: "8px" }}>
                                      <strong style={{ color: "#6c757d", fontSize: "12px" }}>Warna</strong>
                                      <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>{item.warna || "-"}</p>
                                    </div>
                                    <div style={{ padding: "10px", backgroundColor: "white", borderRadius: "8px" }}>
                                      <strong style={{ color: "#6c757d", fontSize: "12px" }}>Berat</strong>
                                      <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>{item.berat ? `${item.berat} kg` : "-"}</p>
                                    </div>
                                    <div style={{ padding: "10px", backgroundColor: "white", borderRadius: "8px" }}>
                                      <strong style={{ color: "#6c757d", fontSize: "12px" }}>Nama Pabrik</strong>
                                      <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>{item.nama_pabrik || "-"}</p>
                                    </div>
                                    <div style={{ padding: "10px", backgroundColor: "white", borderRadius: "8px" }}>
                                      <strong style={{ color: "#6c757d", fontSize: "12px" }}>Nama Gudang</strong>
                                      <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>{item.nama_gudang || "-"}</p>
                                    </div>
                                    <div style={{ padding: "10px", backgroundColor: "white", borderRadius: "8px" }}>
                                      <strong style={{ color: "#6c757d", fontSize: "12px" }}>Hari di Gudang</strong>
                                      <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>{item.hari_di_gudang !== undefined ? `${item.hari_di_gudang} hari` : "-"}</p>
                                    </div>
                                    <div style={{ padding: "10px", backgroundColor: "white", borderRadius: "8px" }}>
                                      <strong style={{ color: "#6c757d", fontSize: "12px" }}>Tanggal Scan</strong>
                                      <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>
                                        {item.scanned_at
                                          ? new Date(item.scanned_at).toLocaleString("id-ID", {
                                              year: "numeric",
                                              month: "long",
                                              day: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })
                                          : "-"}
                                      </p>
                                    </div>
                                    <div style={{ padding: "10px", backgroundColor: "white", borderRadius: "8px" }}>
                                      <strong style={{ color: "#6c757d", fontSize: "12px" }}>Status</strong>
                                      <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>
                                        <span
                                          style={{
                                            padding: "2px 8px",
                                            borderRadius: "12px",
                                            backgroundColor: (item.status || "tersedia") === "tersedia" ? "#28a745" : "#dc3545",
                                            color: "white",
                                            fontWeight: "bold",
                                            fontSize: "12px",
                                            textTransform: "capitalize",
                                          }}
                                        >
                                          {item.status || "tersedia"}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination" style={{ marginTop: "20px", textAlign: "center" }}>
                  <button className="btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                    Previous
                  </button>

                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    return (
                      <button key={page} className={`btn ${currentPage === page ? "btn-primary" : ""}`} onClick={() => goToPage(page)} style={{ margin: "0 4px" }}>
                        {page}
                      </button>
                    );
                  })}

                  <button className="btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanBahan;

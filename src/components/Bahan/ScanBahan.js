import React, { useEffect, useRef, useState } from "react";
import "../Jahit/Penjahit.css";
import "../Cutting/SpkCutting/SpkCuting.css";
import API from "../../api";
import { FaQrcode } from "react-icons/fa";

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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await API.get(`/stok-bahan/barcode/${encodeURIComponent(code)}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data;
      setResult(data);
      setHistory((prev) => [{ code, time: new Date().toLocaleString() }, ...prev].slice(0, 10));
      setBarcode("");
      inputRef.current?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mencari barcode.");
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
          <input
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="Masukkan barcode rol..."
            style={{ padding: "8px 12px", flex: 1, borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <button
            type="submit"
            className="btn"
            style={{ padding: "8px 16px" }}
            disabled={scanStatus === "loading"}
          >
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
              marginBottom: "16px"
            }}
          >
            {scanMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modern-form" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label>Scan / Input Barcode</label>
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              placeholder="Arahkan scanner dan tekan Enter, atau ketik manual"
              onChange={(e) => setBarcode(e.target.value)}
              autoCorrect="off"
              autoCapitalize="none"
            />
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
            <div className="form-group"><strong>Barcode/ID:</strong> {result.barcode || result.id}</div>
            <div className="form-group"><strong>Nama Bahan:</strong> {result.nama_bahan || "-"}</div>
            <div className="form-group"><strong>Warna:</strong> {result.warna || "-"}</div>
            <div className="form-group"><strong>Berat (kg):</strong> {result.berat ?? "-"}</div>
            <div className="form-group"><strong>Status:</strong> {result.status || "-"}</div>
            <div className="form-group"><strong>Gudang:</strong> {result.gudang?.nama_gudang || result.gudang_id || "-"}</div>
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
      </div>
    </div>
  );
};

export default ScanBahan;
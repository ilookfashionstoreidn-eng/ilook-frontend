import React, { useState } from "react";
import "./ScanStokBahanKeluar.css";
import API from "../../api";
import { toast } from "react-toastify";
import { FaBarcode } from "react-icons/fa";

const ScanStokBahanKeluar = () => {
  const [spkCuttingId, setSpkCuttingId] = useState("");
  const [spkCuttingDetail, setSpkCuttingDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [barcode, setBarcode] = useState("");
  const [selectedBahan, setSelectedBahan] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);

  // Fetch detail SPK Cutting
  const fetchSpkCuttingDetail = async () => {
    if (!spkCuttingId || spkCuttingId.trim() === "") {
      setError("Masukkan SPK Cutting ID terlebih dahulu");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSpkCuttingDetail(null);
      setSelectedBahan(null);
      setScanResult(null);
      setScannedItems([]);

      const response = await API.get(`/stok-bahan-keluar/spk-cutting/${spkCuttingId}`);
      setSpkCuttingDetail(response.data);

      if (response.data.bahan_detail && response.data.bahan_detail.length > 0) {
        // Auto select bahan pertama jika hanya ada 1
        if (response.data.bahan_detail.length === 1) {
          setSelectedBahan(response.data.bahan_detail[0]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengambil detail SPK Cutting");
      setSpkCuttingDetail(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle scan barcode
  const handleScanBarcode = async (e) => {
    if (e.key === "Enter" && barcode.trim() !== "") {
      await scanBarcode();
    }
  };

  const scanBarcode = async () => {
    if (!selectedBahan) {
      toast.error("Pilih bahan terlebih dahulu");
      return;
    }

    if (!barcode || barcode.trim() === "") {
      toast.error("Masukkan barcode terlebih dahulu");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!spkCuttingDetail?.spk_cutting?.id) {
        toast.error("Data SPK Cutting tidak valid");
        return;
      }

      const response = await API.post("/stok-bahan-keluar/scan", {
        spk_cutting_id: spkCuttingDetail.spk_cutting.id,
        spk_cutting_bahan_id: selectedBahan.spk_cutting_bahan_id,
        barcode: barcode.trim(),
      });

      if (response.data.valid) {
        toast.success(response.data.message || "Barcode berhasil divalidasi");
        setScanResult({
          success: true,
          message: response.data.message,
          data: response.data.data,
        });

        // Tambahkan ke list scanned items
        setScannedItems((prev) => [...prev, response.data.data]);

        // Reset barcode untuk scan berikutnya
        setBarcode("");

        // Auto focus ke input barcode
        document.getElementById("barcode-input")?.focus();
      } else {
        toast.error(response.data.message || "Validasi gagal");
        setScanResult({
          success: false,
          message: response.data.message,
        });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Gagal memvalidasi barcode";
      toast.error(errorMessage);
      setError(errorMessage);
      setScanResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scan-stok-page">
      <div className="scan-stok-header">
        <div className="scan-stok-header-icon">
          <FaBarcode />
        </div>
        <h1>Scan Stok Bahan Keluar</h1>
      </div>

      <div className="scan-stok-table-container">
        <div className="scan-stok-filter-header">
          <div className="scan-stok-search-bar">
            <input
              type="text"
              placeholder="Masukkan nomor seri..."
              value={spkCuttingId}
              onChange={(e) => setSpkCuttingId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchSpkCuttingDetail()}
              autoFocus
            />
            <button className="scan-stok-btn-primary" onClick={fetchSpkCuttingDetail} disabled={loading}>
              {loading ? "Loading..." : "Cari SPK Cutting"}
            </button>
          </div>
        </div>

        {error && (
          <p className="scan-stok-error">{error}</p>
        )}

        {/* Detail SPK Cutting */}
        {spkCuttingDetail && (
          <div className="scan-stok-detail-section">
            <h3>SPK Cutting #{spkCuttingDetail.spk_cutting?.id_spk_cutting}</h3>
            <div className="scan-stok-detail-grid">
              <div className="scan-stok-detail-item">
                <strong>Nama Produk</strong>
                <span>{spkCuttingDetail.spk_cutting?.nama_produk || "-"}</span>
              </div>
            </div>

            {/* List Bahan */}
            <h4 style={{ marginBottom: "15px", marginTop: "20px", color: "#17457c" }}>Daftar Bahan:</h4>
            <table className="scan-stok-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Bagian</th>
                  <th>Nama Bahan</th>
                  <th>Warna</th>
                  <th>Qty (Rol)</th>
                  <th>Berat</th>
                  <th>Pilih</th>
                </tr>
              </thead>
              <tbody>
                {spkCuttingDetail.bahan_detail?.map((bahan, index) => (
                  <tr
                    key={bahan.spk_cutting_bahan_id}
                    style={{
                      backgroundColor: selectedBahan?.spk_cutting_bahan_id === bahan.spk_cutting_bahan_id ? "#e3f2fd" : "",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedBahan(bahan)}
                  >
                    <td>{index + 1}</td>
                    <td>{bahan.nama_bagian}</td>
                    <td>{bahan.nama_bahan || "-"}</td>
                    <td>{bahan.warna || "-"}</td>
                    <td>{bahan.qty}</td>
                    <td>{bahan.berat ? `${bahan.berat} kg` : "-"}</td>
                    <td>
                      {selectedBahan?.spk_cutting_bahan_id === bahan.spk_cutting_bahan_id ? (
                        <span style={{ color: "#28a745", fontWeight: "bold" }}>✓ Dipilih</span>
                      ) : (
                        <button
                          className="btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBahan(bahan);
                          }}
                        >
                          Pilih
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Scan Barcode Section */}
            {selectedBahan && (
              <div className="scan-stok-scan-section">
                <div className="scan-stok-detail-grid" style={{ marginBottom: "15px" }}>
                  <div className="scan-stok-detail-item">
                    <strong>Bahan yang dipilih</strong>
                    <span>{selectedBahan.nama_bahan}</span>
                  </div>
                  <div className="scan-stok-detail-item">
                    <strong>Warna</strong>
                    <span>{selectedBahan.warna || "-"}</span>
                  </div>
                </div>
                <div className="scan-stok-form-group">
                  <label>Scan Barcode Bahan</label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      scanBarcode();
                    }}
                    style={{ display: "flex", gap: "10px" }}
                  >
                    <input id="barcode-input" type="text" placeholder="Scan atau ketik barcode dan tekan Enter" value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyPress={handleScanBarcode} autoFocus style={{ flex: 1, padding: "12px 14px", border: "2px solid #b3d9f2", borderRadius: "10px" }} />
                    <button type="submit" className="scan-stok-btn-primary" disabled={loading || !barcode.trim()}>
                      {loading ? "Memvalidasi..." : "Scan"}
                    </button>
                  </form>
                </div>

                {/* Scan Result */}
                {scanResult && (
                  <p className={scanResult.success ? "scan-stok-loading" : "scan-stok-error"} style={{ padding: "15px", marginTop: "15px", borderRadius: "8px", background: scanResult.success ? "#e3f2fd" : "#ffebee", color: scanResult.success ? "#17457c" : "#f44336" }}>
                    <strong>{scanResult.success ? "✓ Berhasil" : "✗ Gagal"}</strong> - {scanResult.message}
                  </p>
                )}
              </div>
            )}

            {/* List Scanned Items */}
            {scannedItems.length > 0 && (
              <div style={{ marginTop: "30px" }}>
                <h4 style={{ marginBottom: "15px", color: "#17457c" }}>Barcode yang Berhasil Di-scan:</h4>
                <table className="scan-stok-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Barcode</th>
                      <th>Bahan</th>
                      <th>Warna</th>
                      <th>Berat</th>
                      <th>Waktu Scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedItems.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>{item.barcode}</td>
                        <td>{item.stok_bahan?.pembelian_bahan?.bahan?.nama_bahan || "-"}</td>
                        <td>{item.stok_bahan?.warna?.warna || "-"}</td>
                        <td>{item.berat ? `${item.berat} kg` : "-"}</td>
                        <td>{item.scanned_at ? new Date(item.scanned_at).toLocaleString("id-ID") : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanStokBahanKeluar;

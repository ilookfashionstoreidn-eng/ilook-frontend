import React, { useState } from "react";
import "../Jahit/Penjahit.css";
import "../Cutting/SpkCutting/SpkCuting.css";
import "../Packing/Packing.css";
import API from "../../api";
import { toast } from "react-toastify";

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
    <div>
      <div className="penjahit-container">
        <h1>Scan Stok Bahan Keluar</h1>
      </div>

      <div className="tracking-card">
        {/* Input SPK Cutting ID */}
        <div className="tracking-input-wrapper">
          <input
            type="text"
            placeholder="masukkan nomor seri..."
            value={spkCuttingId}
            onChange={(e) => setSpkCuttingId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchSpkCuttingDetail()}
            className="tracking-input-modern"
            autoFocus
          />
          <button onClick={fetchSpkCuttingDetail} className="btn-search-modern" disabled={loading}>
            {loading ? "Loading..." : "Cari SPK Cutting"}
          </button>
        </div>

        {error && (
          <div className="packing-message" style={{ backgroundColor: "#f8d7da", color: "#721c24", borderLeftColor: "#dc3545" }}>
            {error}
          </div>
        )}

        {/* Detail SPK Cutting */}
        {spkCuttingDetail && (
          <div className="order-section">
            <h2>SPK Cutting #{spkCuttingDetail.spk_cutting?.id_spk_cutting}</h2>
            <p>
              <strong>Nama Produk:</strong> {spkCuttingDetail.spk_cutting?.nama_produk || "-"}
            </p>

            {/* List Bahan */}
            <h4 style={{ marginBottom: "15px", marginTop: "20px" }}>Daftar Bahan:</h4>
            <table className="packing-table">
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
              <div className="sku-input-wrapper" style={{ marginTop: "20px" }}>
                <div style={{ marginBottom: "15px" }}>
                  <p>
                    <strong>Bahan yang dipilih:</strong> {selectedBahan.nama_bahan}
                  </p>
                  <p>
                    <strong>Warna:</strong> {selectedBahan.warna || "-"}
                  </p>
                </div>
                <label className="sku-label">Scan Barcode Bahan</label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    scanBarcode();
                  }}
                  className="sku-input"
                >
                  <input id="barcode-input" type="text" placeholder="Scan atau ketik barcode dan tekan Enter" value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyPress={handleScanBarcode} autoFocus />
                  <button type="submit" disabled={loading || !barcode.trim()}>
                    {loading ? "Memvalidasi..." : "Scan"}
                  </button>
                </form>

                {/* Scan Result */}
                {scanResult && (
                  <div
                    className="packing-message"
                    style={{
                      backgroundColor: scanResult.success ? "#d4edda" : "#f8d7da",
                      color: scanResult.success ? "#155724" : "#721c24",
                      borderLeftColor: scanResult.success ? "#28a745" : "#dc3545",
                    }}
                  >
                    <strong>{scanResult.success ? "✓ Berhasil" : "✗ Gagal"}</strong> - {scanResult.message}
                  </div>
                )}
              </div>
            )}

            {/* List Scanned Items */}
            {scannedItems.length > 0 && (
              <div style={{ marginTop: "30px" }}>
                <h4 style={{ marginBottom: "15px" }}>Barcode yang Berhasil Di-scan:</h4>
                <table className="packing-table">
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

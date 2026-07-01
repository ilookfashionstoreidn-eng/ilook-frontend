import React, { useState, useRef, useEffect } from "react";
import API from "../../api";
import Swal from "sweetalert2";
import { FaTrash, FaPlus } from "react-icons/fa";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css"; 

const ScanSampleGudang = () => {
  const [mode, setMode] = useState("keluar"); 

  // State Peminjaman (Umum)
  const [peminjam, setPeminjam] = useState("");
  const [tujuan, setTujuan] = useState("");
  
  // State Cart (Multi-Scan)
  const [cart, setCart] = useState([]);
  const cartRef = useRef([]); // Untuk tracking sinkron (mencegah stale state saat scan super cepat)
  const [barcode, setBarcode] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  
  const scanInputRef = useRef(null);

  useEffect(() => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [mode, cart]);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    const scannedBarcode = barcode.trim();
    setBarcode(""); // Kosongkan input agar bisa lanjut scan dengan cepat

    try {
      // Validasi ke backend
      const res = await API.get(`/gudang-produk-samples/check-barcode?barcode=${scannedBarcode}&mode=${mode}`);
      const skuData = res.data.data;

      // Cek limit stok secara sinkron menggunakan ref
      const existingItem = cartRef.current.find(item => item.barcode === scannedBarcode);
      const currentQty = existingItem ? existingItem.qty : 0;
      
      // Hitung total quantity untuk SKU yang sama di dalam keranjang
      const totalSkuQtyInCart = cartRef.current
        .filter(item => item.sku_id === skuData.sku_id)
        .reduce((sum, item) => sum + item.qty, 0);

      // 1. Cek apakah ini barcode unik (serial) yang sudah pernah di-scan
      if (skuData.is_unique && currentQty >= 1) {
        Swal.fire({
          icon: 'error',
          title: 'Sudah Di-scan!',
          text: `Barcode unik (${scannedBarcode}) ini sudah ada di antrean.`
        });
        if (scanInputRef.current) scanInputRef.current.focus();
        return;
      }

      // 2. Cek limit total stok di gudang untuk SKU ini
      if (mode === 'keluar' && skuData.total_stock !== undefined && totalSkuQtyInCart + 1 > skuData.total_stock) {
        Swal.fire({
          icon: 'error',
          title: 'Stok Tidak Mencukupi!',
          text: `Anda tidak bisa scan lebih dari ${skuData.total_stock} pcs untuk SKU ini (Sisa stok di gudang).`
        });
        if (scanInputRef.current) scanInputRef.current.focus();
        return;
      }

      setCart(prevCart => {
        const existingIndex = prevCart.findIndex(item => item.barcode === scannedBarcode);
        let newCart;
        if (existingIndex >= 0) {
          newCart = [...prevCart];
          newCart[existingIndex] = {
            ...newCart[existingIndex],
            qty: newCart[existingIndex].qty + 1
          };
        } else {
          newCart = [...prevCart, { 
            barcode: scannedBarcode, 
            qty: 1, 
            sku_id: skuData.sku_id,
            sku_name: skuData.sku_name, 
            lokasi_rak: skuData.lokasi_rak || '-',
            total_stock: skuData.total_stock,
            is_unique: skuData.is_unique
          }];
        }
        cartRef.current = newCart; // Sinkronisasikan ref
        return newCart;
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Barcode Tidak Valid',
        text: error.response?.data?.message || 'Gagal memverifikasi barcode.'
      });
    }
    
    if (scanInputRef.current) scanInputRef.current.focus();
  };

  const handleRemoveFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
    cartRef.current = newCart;
  };

  const handleUpdateQty = (index, newQty) => {
    if (newQty < 1) return;
    const newCart = [...cart];
    newCart[index].qty = parseInt(newQty);
    setCart(newCart);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      Swal.fire("Peringatan", "Daftar pindai (scan) masih kosong.", "warning");
      return;
    }

    if (mode === "keluar") {
      if (!peminjam.trim()) {
        Swal.fire("Peringatan", "Nama peminjam wajib diisi.", "warning");
        return;
      }
    }

    setIsLoading(true);
    setScanResult(null);

    const endpoint = mode === "keluar" 
      ? "/gudang-produk-samples/scan-keluar" 
      : "/gudang-produk-samples/scan-masuk";

    const payload = mode === "keluar" 
      ? { items: cart, peminjam, tujuan }
      : { items: cart };

    try {
      const response = await API.post(endpoint, payload);

      setScanResult({
        type: 'success',
        message: response.data.message,
        data: response.data.data
      });
      
      handleReset(false); // Reset cart tapi tidak mode
      
    } catch (error) {
      setScanResult({
        type: 'error',
        message: error.response?.data?.message || "Terjadi kesalahan saat memproses transaksi."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = (full = true) => {
    setCart([]);
    cartRef.current = [];
    setBarcode("");
    if (full) {
      setScanResult(null);
      setPeminjam("");
      setTujuan("");
    }
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  };

  return (
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Manajemen Sampel</h1>
          <span className="ks-header-sub">
            Peminjaman (Scan Keluar) dan Pengembalian (Scan Masuk) Multi-SKU Sampel Produk.
          </span>
        </div>
        <div className="ks-header-actions">
          <div className="ks-segment">
            <button
              className={`ks-seg-btn ${mode === "keluar" ? "is-active" : ""}`}
              onClick={() => { setMode("keluar"); handleReset(); }}
            >
              Scan Peminjaman
            </button>
            <button
              className={`ks-seg-btn ${mode === "masuk" ? "is-active" : ""}`}
              onClick={() => { setMode("masuk"); handleReset(); }}
            >
              Scan Pengembalian
            </button>
          </div>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Mode Operasi</span>
          <span className="ks-stat-value tone-safe" style={{ fontWeight: 600 }}>
            {mode === "keluar" ? "Peminjaman Barang" : "Pengembalian Barang"}
          </span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Total Antrean</span>
          <span className="ks-stat-value tone-warning">
            {cart.reduce((sum, item) => sum + item.qty, 0)} Pcs ({cart.length} SKU)
          </span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Status Transaksi</span>
          <span className={`ks-stat-value ${scanResult?.type === "success" ? "tone-safe" : scanResult?.type === "error" ? "tone-overdue" : ""}`}>
            {scanResult ? (scanResult.type === "success" ? "Berhasil Disimpan" : "Terjadi Kesalahan") : "Menunggu Data"}
          </span>
        </div>
      </div>

      <section className="ks-board" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", background: "var(--ks-bg)" }}>
        
        <div style={{ width: "100%", background: "var(--ks-surface)", borderRadius: "10px", border: "1px solid var(--ks-line)", overflow: "hidden" }}>
          
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--ks-line)", background: "var(--ks-hover)" }}>
            <h2 style={{ margin: 0, fontSize: "16px", color: "var(--ks-text)", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
              {mode === "keluar" ? "Formulir Peminjaman Sampel" : "Formulir Pengembalian Sampel"}
            </h2>
          </div>

          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Bagian Informasi Umum */}
            {mode === "keluar" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", paddingBottom: "20px", borderBottom: "1px dashed var(--ks-line-strong)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontWeight: 600, fontSize: "13px", color: "var(--ks-text)" }}>Nama Peminjam <span style={{ color: "var(--ks-overdue)" }}>*</span></label>
                  <input 
                    type="text" 
                    value={peminjam}
                    onChange={(e) => setPeminjam(e.target.value)}
                    placeholder="Masukkan nama lengkap & departemen"
                    className="ks-input-general"
                    style={{ padding: "10px", border: "1px solid var(--ks-line-strong)", borderRadius: "6px", fontSize: "13px", outline: "none", color: "var(--ks-text)", background: "var(--ks-surface)" }}
                    onFocus={(e) => e.target.style.borderColor = "var(--ks-accent)"}
                    onBlur={(e) => e.target.style.borderColor = "var(--ks-line-strong)"}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", gridColumn: "1 / -1" }}>
                  <label style={{ fontWeight: 600, fontSize: "13px", color: "var(--ks-text)" }}>Tujuan Peminjaman</label>
                  <input 
                    type="text" 
                    value={tujuan}
                    onChange={(e) => setTujuan(e.target.value)}
                    placeholder="Deskripsikan tujuan peminjaman secara singkat"
                    style={{ padding: "10px", border: "1px solid var(--ks-line-strong)", borderRadius: "6px", fontSize: "13px", outline: "none", color: "var(--ks-text)", background: "var(--ks-surface)" }}
                    onFocus={(e) => e.target.style.borderColor = "var(--ks-accent)"}
                    onBlur={(e) => e.target.style.borderColor = "var(--ks-line-strong)"}
                  />
                </div>
              </div>
            )}

            {/* Bagian Input Scan */}
            <form onSubmit={handleAddToCart} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                <label style={{ fontWeight: 600, fontSize: "13px", color: "var(--ks-text)" }}>Pindai (Scan) Barcode Produk</label>
                <input 
                  type="text" 
                  ref={scanInputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Arahkan kursor ke sini dan tembakkan scanner..."
                  style={{ 
                    padding: "12px", 
                    border: "1px solid var(--ks-line-strong)", 
                    borderRadius: "6px", 
                    fontSize: "14px", 
                    outline: "none",
                    background: "var(--ks-hover)"
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--ks-accent)"; e.target.style.background = "var(--ks-surface)"; e.target.style.boxShadow = "0 0 0 3px rgba(36, 88, 206, 0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--ks-line-strong)"; e.target.style.background = "var(--ks-hover)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <button 
                type="submit" 
                className="ks-btn"
                style={{ padding: "12px 16px", height: "auto" }}
              >
                <FaPlus /> Pindai (Enter)
              </button>
            </form>

            {/* Tabel Cart */}
            <div style={{ border: "1px solid var(--ks-line)", borderRadius: "7px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead style={{ background: "var(--ks-hover)", borderBottom: "1px solid var(--ks-line-strong)" }}>
                  <tr>
                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "var(--ks-text-soft)" }}>No.</th>
                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "var(--ks-text-soft)" }}>Barcode (SKU)</th>
                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "var(--ks-text-soft)" }}>Nama SKU</th>
                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "var(--ks-text-soft)" }}>Lokasi Rak</th>
                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "var(--ks-text-soft)", textAlign: "center" }}>Kuantitas</th>
                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "var(--ks-text-soft)", textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "var(--ks-muted)" }}>
                        Daftar antrean kosong. Silakan pindai produk terlebih dahulu.
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid var(--ks-line)" }}>
                        <td style={{ padding: "10px 16px", color: "var(--ks-text-soft)" }}>{index + 1}</td>
                        <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--ks-text)" }}>{item.barcode}</td>
                        <td style={{ padding: "10px 16px", color: "var(--ks-text-soft)" }}>{item.sku_name || "-"}</td>
                        <td style={{ padding: "10px 16px", color: "var(--ks-text-soft)" }}>
                          {item.lokasi_rak && item.lokasi_rak !== '-' ? (
                            <span style={{ background: "var(--ks-hover)", padding: "4px 8px", borderRadius: "4px", fontSize: "13px", fontWeight: 500 }}>
                              {item.lokasi_rak}
                            </span>
                          ) : "-"}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "center" }}>
                          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--ks-text)", background: "var(--ks-surface)", border: "1px solid var(--ks-line)", padding: "6px 16px", borderRadius: "6px", display: "inline-block" }}>
                            {item.qty}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "center" }}>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveFromCart(index)}
                            style={{ background: "none", border: "none", color: "var(--ks-overdue)", cursor: "pointer", padding: "6px" }}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button 
              type="button" 
              onClick={handleSubmit}
              disabled={isLoading || cart.length === 0}
              className={`ks-btn ${!isLoading && cart.length > 0 ? "is-primary" : ""}`}
              style={{ 
                padding: "12px", 
                justifyContent: "center",
                fontWeight: 600, 
                fontSize: "14px", 
              }}
            >
              {isLoading ? "Menyimpan Transaksi..." : (mode === "keluar" ? "Konfirmasi Peminjaman Sampel" : "Konfirmasi Pengembalian Sampel")}
            </button>
          </div>

          {/* Notifikasi Hasil Transaksi */}
          {scanResult && (
            <div style={{ 
              margin: "0 24px 24px 24px",
              background: scanResult.type === "success" ? "#f0fdf4" : "#fef2f2", 
              border: `1px solid ${scanResult.type === "success" ? "#bbf7d0" : "#fecaca"}`,
              padding: "16px", 
              borderRadius: "8px" 
            }}>
              <h4 style={{ margin: "0 0 8px 0", color: scanResult.type === "success" ? "var(--ks-safe)" : "var(--ks-overdue)", fontSize: "14px", fontWeight: 600 }}>
                {scanResult.type === "success" ? 'Transaksi Berhasil Disimpan' : 'Peringatan Transaksi'}
              </h4>
              <p style={{ margin: 0, color: scanResult.type === "success" ? "var(--ks-safe)" : "var(--ks-overdue)", fontSize: "13px" }}>
                {scanResult.message}
              </p>
              {scanResult.data && (
                <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--ks-safe)" }}>
                  Telah diproses sebanyak <strong>{scanResult.data.length}</strong> entri SKU.
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ScanSampleGudang;

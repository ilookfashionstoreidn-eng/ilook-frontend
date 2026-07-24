import React, { useState, useEffect } from "react";
import "./Packing.css";
import "../Cutting/SpkCutting/DashboardCutting.css";
import API from "../../api";
import { FaBarcode, FaCheck, FaQrcode } from "react-icons/fa";
import { useRef } from "react";
import { useLocation } from "react-router-dom";
import { FiCheckCircle, FiPackage, FiSearch } from "react-icons/fi";

const isOrderReadyForValidation = (items) =>
  items.length > 0 &&
  items.every(
    (item) =>
      item.scanned_qty === item.ordered_qty &&
      item.serials.length === item.ordered_qty &&
      item.serials.every((serial) => serial && serial.trim() !== "")
  );

const normalizeSerial = (serial) => (serial || "").trim().toUpperCase();
const normalizeSkuForComparison = (sku) => {
  if (!sku) return "";
  let s = sku.trim().toUpperCase();
  if (s.startsWith("SET ") || s.startsWith("SET-")) {
    s = s.substring(4);
  }
  return s.replace(/[^A-Z0-9]/g, "");
};
const normalizeSku = (sku) => normalizeSkuForComparison(sku);
const buildSerialKey = (sku, serial) =>
  `${normalizeSku(sku)}::${normalizeSerial(serial)}`;

const checkSpecialBypass = (sku, serial) => {
  return true;
};

const buildScannedSerialMap = (items) => {
  const serialMap = new Map();

  items.forEach((item) => {
    item.serials.forEach((serial) => {
      const serialKey = buildSerialKey(item.sku, serial);
      if (normalizeSerial(serial)) {
        serialMap.set(serialKey, item.sku);
      }
    });
  });

  return serialMap;
};

const validationSoundByTrackingPrefix = [
  { prefix: "JT", sound: "validasiJNE" },
  { prefix: "SP", sound: "validasiShopee" },
  { prefix: "JX", sound: "validasiJNT" },
  { prefix: "GT", sound: "validasiGTL" },
  { prefix: "NJ", sound: "validasiNinja" },
  { prefix: "TK", sound: "validasiIDExpress" },
  { prefix: "TG", sound: "validasiJNECargo" },
  { prefix: "57", sound: "validasiJNTCargo" },
];

const getValidationSoundType = (trackingNumber) => {
  const normalizedTracking = trackingNumber.trim().toUpperCase();
  const matchedSound = validationSoundByTrackingPrefix.find(({ prefix }) =>
    normalizedTracking.startsWith(prefix)
  );

  return matchedSound?.sound || "validasiok";
};

const Packing = () => {
 const [trackingNumber, setTrackingNumber] = useState("");
  const [order, setOrder] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [scannedItems, setScannedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [nomorSeri, setNomorSeri] = useState("");
  const trackingInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const serialInputRefs = useRef({});
  const submitButtonRef = useRef(null);
  const scannedSerialsRef = useRef(new Map());
  const pendingSerialsRef = useRef(new Map());
  const [canSubmitByEnter, setCanSubmitByEnter] = useState(false);
  const [isSubmittingValidation, setIsSubmittingValidation] = useState(false);
  const [checkingSerial, setCheckingSerial] = useState(false);
const [prevSerials, setPrevSerials] = useState({});
  const location = useLocation();

  // Auto-fill tracking number dari URL query param ?tracking=XXX
  // (dikirim dari halaman /orderPacking saat klik tombol Scan)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const autoTracking = params.get("tracking");
    if (autoTracking) {
      setTrackingNumber(autoTracking);
      // Auto-search setelah state ter-set
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} };
        handleSearchOrderWithTracking(autoTracking);
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const focusTrackingInput = () => {
    setTimeout(() => {
      trackingInputRef.current?.focus();
      trackingInputRef.current?.select();
    }, 50);
  };



  const playSound = (type) => {
    const soundMap = {
      success: "/sounds/success.mp3",
      error: "/sounds/failed.mp3",
      scanproduk: "/sounds/scanprodukberhasil.mp3",
      noproduk: "/sounds/produktidaksesuai.mp3",
      sudahpacking: "/sounds/orderansudahpacking.mp3",
      validasiok: "/sounds/validasiberhasil.mp3",
      validasiJNE: "/sounds/ValidasiJNE.mp3",
      validasiShopee: "/sounds/ValidasiShopee.mp3",
      validasiJNT: "/sounds/ValidasiJNT.mp3",
      validasiGTL: "/sounds/ValiadsiGTL.mp3",
      validasiNinja: "/sounds/ValidasiNinja.mp3",
      validasiIDExpress: "/sounds/IDExpressValidasi.mp3",
      validasiJNECargo: "/sounds/JNECargoValidasi.mp3",
      validasiJNTCargo: "/sounds/JNTCargoValidasi.mp3",
      noseri: "/sounds/noseri.mp3",
      isinoseri: "/sounds/isinoseri.mp3",
      
    };
    const audio = new Audio(soundMap[type]);
    audio.play();
};


  
const handleSearchOrderWithTracking = async (tracking) => {
  if (!tracking) return;
  setLoading(true);
  setMessage("");
  setCanSubmitByEnter(false);
  try {
    const response = await API.get(`/orders/tracking/${encodeURIComponent(tracking)}`);
    const orderData = response.data;
    if (orderData.status === "packed") {
      setMessage("⚠️ Order ini sudah berstatus packed dan tidak bisa discan ulang.");
      playSound("sudahpacking");
      setOrder(null);
      scannedSerialsRef.current = new Map();
      pendingSerialsRef.current = new Map();
      setScannedItems([]);
      setLoading(false);
      return;
    }
    const initialScan = orderData.items.map((item) => ({
      sku: item.sku,
      product_name: item.product_name,
      ordered_qty: item.quantity,
      scanned_qty: 0,
      image: item.image,
      serials: [],
    }));
    setTrackingNumber(tracking);
    setOrder(orderData);
    scannedSerialsRef.current = new Map();
    pendingSerialsRef.current = new Map();
    setScannedItems(initialScan);
  } catch (error) {
    setOrder(null);
    scannedSerialsRef.current = new Map();
    pendingSerialsRef.current = new Map();
    setScannedItems([]);
    const msg = error.response?.data?.message || "Order tidak ditemukan";
    setMessage(msg);
    if (msg.includes("sudah di packing")) {
      playSound("sudahpacking");
    } else {
      playSound("error");
    }
  } finally {
    setLoading(false);
  }
};

const handleSearchOrder = async () => {

  const tracking = trackingNumber.trim();
  if (!tracking) return;
  setLoading(true);
  setMessage("");
  setCanSubmitByEnter(false);

  try {
    const response = await API.get(`/orders/tracking/${encodeURIComponent(tracking)}`);
    const orderData = response.data;

    if (orderData.status === "packed") {
      setMessage("⚠️ Order ini sudah berstatus packed dan tidak bisa discan ulang.");
      playSound("sudahpacking");
      setOrder(null);
      scannedSerialsRef.current = new Map();
      pendingSerialsRef.current = new Map();
      setScannedItems([]);
      setLoading(false);
      return;
    }

    const initialScan = orderData.items.map((item) => ({
      sku: item.sku,
      product_name: item.product_name,
      ordered_qty: item.quantity,
      scanned_qty: 0,
      image: item.image,
       serials: []
    }));

    setTrackingNumber(tracking);
    setOrder(orderData);
    scannedSerialsRef.current = new Map();
    pendingSerialsRef.current = new Map();
    setScannedItems(initialScan);
  } catch (error) {
    setOrder(null);
    scannedSerialsRef.current = new Map();
    pendingSerialsRef.current = new Map();
    setScannedItems([]);

    const msg = error.response?.data?.message || "Order tidak ditemukan";
    setMessage(msg);

    // 🔊 Tambahan: mainkan sound berdasarkan pesan
    if (msg.includes("sudah di packing")) {
      playSound("sudahpacking");
    } else {
      playSound("error");
    }
  } finally {
    setLoading(false);
  }
};


const handleScanBarcode = async (barcodeValue = null) => {
  if (barcodeValue && typeof barcodeValue === "object" && typeof barcodeValue.preventDefault === "function") {
    barcodeValue.preventDefault();
  }
  const rawBarcode = typeof barcodeValue === "string" ? barcodeValue : scannedBarcode;
  const barcode = (rawBarcode || "").trim();
  if (!barcode) return;

  if (isOrderReadyForValidation(scannedItems)) {
    setMessage("Semua produk sudah discan. Silakan submit validasi.");
    setScannedBarcode("");
    setCanSubmitByEnter(true);
    setTimeout(() => {
      submitButtonRef.current?.focus();
    }, 50);
    return;
  }

  // Parse barcode format "SKU | KODE_SERI"
  if (!barcode.includes("|")) {
    setMessage("❌ Format barcode tidak valid. Format harus: SKU | KODE_SERI");
    playSound("error");
    setScannedBarcode("");
    return;
  }

  const parts = barcode.split(/\s*\|\s*/);
  if (parts.length !== 2) {
    setMessage("❌ Format barcode tidak valid. Format harus: SKU | KODE_SERI");
    playSound("error");
    setScannedBarcode("");
    return;
  }

  const sku = parts[0].trim();
  const nomorSeri = parts[1].trim();
  const normalizedNomorSeri = normalizeSerial(nomorSeri);
  const serialKey = buildSerialKey(sku, nomorSeri);

  if (!sku || !nomorSeri) {
    setMessage("❌ SKU atau nomor seri tidak boleh kosong");
    playSound("error");
    setScannedBarcode("");
    return;
  }

  const duplicateSku = scannedSerialsRef.current.get(serialKey);
  const pendingSku = pendingSerialsRef.current.get(serialKey);
  const duplicateItem = scannedItems.find((item) =>
    normalizeSku(item.sku) === normalizeSku(sku) &&
    item.serials.some((serial) => normalizeSerial(serial) === normalizedNomorSeri)
  );

  const isSpecialBypass = checkSpecialBypass(sku, normalizedNomorSeri);

  if ((duplicateSku || pendingSku || duplicateItem) && !isSpecialBypass) {
    setMessage(
      `Nomor seri ${nomorSeri} sudah pernah di-scan untuk SKU ${duplicateSku || pendingSku || duplicateItem.sku}`
    );
    playSound("error");
    setScannedBarcode("");
    return;
  }

  const skuBelumLengkap = scannedItems.find(item =>
    item.serials.some(s => !s || s.trim() === "")
  );

  if (skuBelumLengkap) {
    setMessage(
      `⚠️ Harap isi semua nomor seri untuk SKU ${skuBelumLengkap.sku} sebelum scan barcode lain.`
    );
    playSound("isinoseri");
    setScannedBarcode("");  
    return;
  }

  const itemIndex = scannedItems.findIndex((item) => normalizeSku(item.sku) === normalizeSku(sku));

  if (itemIndex === -1) {
    setMessage(`❌ SKU ${sku} tidak ditemukan dalam order`);
    playSound("noproduk");
    setScannedBarcode(""); 
    return;
  }

  const updatedItems = [...scannedItems];
  const target = updatedItems[itemIndex];

  if (target.scanned_qty >= target.ordered_qty) {
    setMessage(`⚠️ SKU ${sku} discan melebihi jumlah pesanan`);
    playSound("error");
    setScannedBarcode("");
    return;
  }

  pendingSerialsRef.current.set(serialKey, sku);
  setCheckingSerial(true);

  try {
    await API.post("/orders/serial/check", {
      sku,
      serial_number: nomorSeri,
    });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message ||
      "Nomor seri tidak bisa dicek. Scan dibatalkan.";

    pendingSerialsRef.current.delete(serialKey);
    setCheckingSerial(false);
    setMessage(errorMessage);
    playSound("error");
    setScannedBarcode("");
    return;
  }

  pendingSerialsRef.current.delete(serialKey);
  setCheckingSerial(false);

  // Validasi nomor seri tidak boleh duplikat dalam item yang sama
  if (
    target.serials.some((serial) => normalizeSerial(serial) === normalizedNomorSeri) &&
    !isSpecialBypass
  ) {
    setMessage(`⚠️ Nomor seri ${nomorSeri} sudah pernah di-scan untuk SKU ${sku}`);
    playSound("error");
    setScannedBarcode("");
    return;
  }

  // Tambahkan scanned_qty dan isi nomor seri otomatis
  target.scanned_qty += 1;
  target.serials.push(nomorSeri);
  scannedSerialsRef.current.set(serialKey, sku);
  setMessage(`✅ SKU ${sku} dengan nomor seri ${nomorSeri} berhasil discan`);
  playSound("scanproduk");
  
  setScannedItems(updatedItems);
  setScannedBarcode("");
  const readyToSubmit = isOrderReadyForValidation(updatedItems);
  setCanSubmitByEnter(readyToSubmit);

  // Focus ke input barcode berikutnya setelah scan berhasil
  setTimeout(() => {
    if (readyToSubmit) {
      submitButtonRef.current?.focus();
      return;
    }

    barcodeInputRef.current?.focus();
  }, 50);
};

  const handleBarcodeInputKeyDown = (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const value = e.currentTarget.value.trim();

    if (canSubmitByEnter && !value) {
      handleSubmitValidation();
      return;
    }

    handleScanBarcode(value);
  };

  const handleSubmitValidation = async () => {
  if (!order || isSubmittingValidation) return;

  // Validasi semua item sudah lengkap
  for (let item of scannedItems) {
    // Pastikan semua item sudah di-scan sesuai pesanan
    if (item.scanned_qty < item.ordered_qty) {
      setMessage(`⚠️ SKU ${item.sku} belum lengkap. Dipesan: ${item.ordered_qty}, discan: ${item.scanned_qty}`);
      playSound("error");
      return;
    }

    // Pastikan tidak ada nomor seri kosong
    const emptySerial = item.serials.some(s => !s || s.trim() === "");
    if (emptySerial) {
      setMessage(`⚠️ Ada nomor seri SKU ${item.sku} yang masih kosong.`);
      playSound("error");
      return;
    }

    // Pastikan jumlah nomor seri sesuai dengan qty scan
    if (item.serials.length !== item.scanned_qty) {
      setMessage(`⚠️ Jumlah nomor seri SKU ${item.sku} tidak sesuai qty scan`);
      playSound("error");
      setCanSubmitByEnter(false);
      return;
    }
  }

  const serialBySku = new Map();
  for (let item of scannedItems) {
    for (let serial of item.serials) {
      const serialKey = buildSerialKey(item.sku, serial);
      if (!normalizeSerial(serial)) continue;

      const isSpecialBypass = checkSpecialBypass(item.sku, serial);

      const duplicateSku = serialBySku.get(serialKey);
      if (duplicateSku && !isSpecialBypass) {
        setMessage(
          `Nomor seri ${serial} sudah pernah di-scan untuk SKU ${duplicateSku}`
        );
        playSound("error");
        return;
      }

      serialBySku.set(serialKey, item.sku);
    }
  }

  setIsSubmittingValidation(true);

  try {
    const tracking = trackingNumber.trim();

    // Kirim semua item yang sudah lengkap (harus semua item dari order)
    // Pastikan hanya item dengan scanned_qty > 0 dan serials tidak kosong
    const filteredItems = scannedItems.filter((item) => item.scanned_qty > 0 && item.serials.length > 0);
    
    // Validasi limit jumlah item (untuk performa)
    const MAX_ITEMS_PER_REQUEST = 1000;
    if (filteredItems.length > MAX_ITEMS_PER_REQUEST) {
      setMessage(`⚠️ Maksimal ${MAX_ITEMS_PER_REQUEST} item per request. Silakan bagi menjadi beberapa request.`);
      playSound("error");
      return;
    }
    
    const payload = {
      items: filteredItems.map((item) => ({
        sku: item.sku,
        quantity: item.scanned_qty,
        serials: item.serials.filter(s => s && s.trim() !== ""), // Filter serial kosong
      })),
    };

    // Pastikan ada item yang dikirim
    if (payload.items.length === 0) {
      setMessage("⚠️ Tidak ada item yang bisa divalidasi. Pastikan semua item sudah di-scan.");
      playSound("error");
      return;
    }

    const response = await API.post(
      `/orders/scan/${encodeURIComponent(tracking)}`,
      payload
    );

    setMessage(response.data.message || "✅ Order berhasil divalidasi");
    playSound(getValidationSoundType(tracking));

  
    setOrder(null);
    scannedSerialsRef.current = new Map();
    pendingSerialsRef.current = new Map();
    setScannedItems([]);
    setTrackingNumber("");
    setScannedBarcode("");
    setCanSubmitByEnter(false);
    focusTrackingInput();

  } catch (error) {
    // Tampilkan error message yang lebih detail
    let errorMessage = "❌ Validasi gagal";
    
    if (error.response?.data) {
      const data = error.response.data;
      
      // Jika ada errors dari Laravel validation
      if (data.errors) {
        const errorList = Object.values(data.errors).flat();
        errorMessage = `❌ ${data.message || 'Data tidak valid'}\n${errorList.join('\n')}`;
      } else if (data.message) {
        errorMessage = `❌ ${data.message}`;
      }
    }
    
    setMessage(errorMessage);
    playSound("error");
  } finally {
    setIsSubmittingValidation(false);
  }
};

  
  const isScanComplete = isOrderReadyForValidation(scannedItems);


  return (
    <div className="ks-page dc-page">
      {/* Header matching DashboardCutting */}
      <header className="ks-header">
        <div className="ks-header-id">
          <div className="dc-title">
            <FaQrcode style={{ color: "var(--dc-blue)" }} />
            <h1>Packing Validation</h1>
            <span className="dc-track-badge is-ontrack" style={{ padding: "4px 10px", fontSize: "11px" }}>Standard Mode</span>
          </div>
          <span className="ks-header-sub">Scan tracking number, verifikasi barcode SKU/SPK CMT, dan finalisasi validasi packing order.</span>
        </div>
        <div className="ks-header-actions">
          <button className="ks-btn" onClick={focusTrackingInput}>
            <FiSearch /> <span>Input Tracking</span>
          </button>
        </div>
      </header>

      <main className="dc-main">
        {/* Search & Scan Section */}
        <section className="dc-card">
          <div className="dc-card-head" style={{ marginBottom: "8px" }}>
            <span className="dc-card-title"><FiSearch style={{ marginRight: 6, color: "var(--dc-blue)" }} /> Cari & Scan Tracking Number</span>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "280px" }}>
              <FiSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ks-muted, #94a3b8)", fontSize: "14px" }} />
              <input
                ref={trackingInputRef}
                type="text"
                placeholder="Scan / masukkan Tracking Number resi..."
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchOrder()}
                autoFocus
                style={{
                  width: "100%", height: "40px", paddingLeft: "36px", paddingRight: "12px",
                  borderRadius: "8px", border: "1px solid var(--ks-line)", fontSize: "13px",
                  outline: "none", boxSizing: "border-box", backgroundColor: "#fff"
                }}
              />
            </div>
            <button
              onClick={handleSearchOrder}
              disabled={loading}
              className="ks-btn is-primary"
              style={{ height: "40px", padding: "0 18px" }}
            >
              {loading ? "Memuat..." : "Cari Order"}
            </button>
          </div>

          {message && (
            <div className="dc-error" style={{ marginTop: "12px", backgroundColor: message.includes("⚠️") || message.includes("❌") ? "rgba(229, 72, 77, 0.08)" : "rgba(22, 163, 74, 0.08)", borderColor: message.includes("⚠️") || message.includes("❌") ? "rgba(229, 72, 77, 0.4)" : "rgba(22, 163, 74, 0.4)", color: message.includes("⚠️") || message.includes("❌") ? "#b91c1c" : "#15803d" }}>
              <span>{message}</span>
            </div>
          )}
        </section>

        {order && (
          <>
            {/* KPI Row (3 Cards like DashboardCutting) */}
            <section className="dc-kpi-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div className="dc-card dc-kpi">
                <div className="dc-kpi-head">
                  <span className="dc-kpi-icon dc-i-blue"><FiPackage /></span>
                  <span className="dc-kpi-label">Total Produk</span>
                </div>
                <div className="dc-kpi-value">{order.total_qty} <span className="dc-unit">pcs</span></div>
                <div className="dc-kpi-foot" style={{ marginTop: "4px" }}>
                  <span>Jumlah item pesanan</span>
                </div>
              </div>

              <div className="dc-card dc-kpi">
                <div className="dc-kpi-head">
                  <span className="dc-kpi-icon dc-i-green"><FiCheckCircle /></span>
                  <span className="dc-kpi-label">Progress Scan</span>
                </div>
                <div className="dc-kpi-value">
                  {scannedItems.reduce((sum, i) => sum + i.scanned_qty, 0)} / {scannedItems.reduce((sum, i) => sum + i.ordered_qty, 0)}
                </div>
                <div className="dc-progress-wrap" style={{ marginTop: "6px" }}>
                  <div className="dc-progress-track">
                    <div
                      className="dc-progress-fill dc-fill-green"
                      style={{
                        width: `${Math.min(100, (scannedItems.reduce((sum, i) => sum + i.scanned_qty, 0) / Math.max(1, scannedItems.reduce((sum, i) => sum + i.ordered_qty, 0))) * 100)}%`
                      }}
                    />
                  </div>
                  <span className="dc-progress-pct">
                    {Math.round((scannedItems.reduce((sum, i) => sum + i.scanned_qty, 0) / Math.max(1, scannedItems.reduce((sum, i) => sum + i.ordered_qty, 0))) * 100)}%
                  </span>
                </div>
              </div>

              <div className="dc-card dc-kpi">
                <div className="dc-kpi-head">
                  <span className="dc-kpi-icon dc-i-purple"><FiSearch /></span>
                  <span className="dc-kpi-label">Info Pelanggan</span>
                </div>
                <div className="dc-kpi-value" style={{ fontSize: "18px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {order.customer_name || "-"}
                </div>
                <div className="dc-kpi-foot" style={{ marginTop: "4px" }}>
                  <strong>{order.customer_phone || "-"}</strong> • {order.platform || "Marketplace"}
                </div>
              </div>
            </section>

            {/* Order Details & Validation Table */}
            <section className="dc-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="dc-card-head" style={{ padding: "16px 18px", margin: 0, borderBottom: "1px solid var(--ks-line)", backgroundColor: "#fbfbfc", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span className="dc-card-title" style={{ fontSize: "15px", fontWeight: "700" }}>Order #{order.order_number || order.tracking_number}</span>
                  <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "var(--ks-text-soft)", marginTop: "4px" }}>
                    <span><strong>Customer:</strong> {order.customer_name || "-"}</span>
                    <span>•</span>
                    <span><strong>No HP:</strong> {order.customer_phone || "-"}</span>
                    <span>•</span>
                    <span><strong>Tracking:</strong> {order.tracking_number || "-"}</span>
                  </div>
                </div>
                <span className={`dc-track-badge ${order.status === "packed" ? "is-ontrack" : "is-behind"}`} style={{ padding: "4px 10px", fontSize: "11px" }}>
                  {order.status || "READY_TO_SHIP"}
                </span>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--ks-surface)", borderBottom: "1px solid var(--ks-line)", color: "var(--ks-text-soft)" }}>
                      <th style={{ padding: "12px 18px", textAlign: "left", fontWeight: "600" }}>SKU Barcode</th>
                      <th style={{ padding: "12px 18px", textAlign: "left", fontWeight: "600" }}>Nama Produk</th>
                      <th style={{ padding: "12px 18px", textAlign: "center", fontWeight: "600" }}>Qty Pesanan</th>
                      <th style={{ padding: "12px 18px", textAlign: "center", fontWeight: "600" }}>Qty Scan</th>
                      <th style={{ padding: "12px 18px", textAlign: "center", fontWeight: "600" }}>Gambar</th>
                      <th style={{ padding: "12px 18px", textAlign: "left", fontWeight: "600" }}>Nomor Seri</th>
                      <th style={{ padding: "12px 18px", textAlign: "center", fontWeight: "600" }}>Status Item</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--ks-line)", backgroundColor: item.scanned_qty === item.ordered_qty ? "rgba(22, 163, 74, 0.03)" : "transparent" }}>
                        <td style={{ padding: "12px 18px" }}>
                          <strong style={{ fontFamily: "monospace", fontSize: "12.5px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>{item.sku}</strong>
                        </td>
                        <td style={{ padding: "12px 18px", fontWeight: "600", color: "var(--ks-text)" }}>{item.product_name}</td>
                        <td style={{ padding: "12px 18px", textAlign: "center", fontWeight: "700", color: "var(--dc-blue)" }}>{item.ordered_qty}</td>
                        <td style={{ padding: "12px 18px", textAlign: "center" }}>
                          <span className={`dc-track-badge ${item.scanned_qty === item.ordered_qty ? "is-ontrack" : "is-behind"}`} style={{ padding: "3px 8px", fontSize: "11px" }}>
                            {item.scanned_qty}
                          </span>
                        </td>

                        <td style={{ padding: "12px 18px", textAlign: "center" }}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.product_name}
                              style={{ width: "80px", height: "50px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--ks-line)" }}
                            />
                          ) : (
                            <span style={{ color: "var(--ks-muted)", fontSize: "11px" }}>No Image</span>
                          )}
                        </td>

                        <td style={{ padding: "12px 18px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {item.serials.map((serial, sIdx) => (
                              <div key={sIdx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--ks-text-soft)", minWidth: "45px" }}>Seri #{sIdx + 1}</span>
                                <input
                                  type="text"
                                  value={serial}
                                  placeholder="Auto / Scan..."
                                  style={{ width: "130px", height: "30px", padding: "0 8px", borderRadius: "6px", border: "1px solid var(--ks-line)", fontSize: "12px", fontFamily: "monospace", outline: "none" }}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const key = `${idx}-${sIdx}`;

                                    if (val.length > 9) {
                                      setMessage("❌ Nomor seri maksimal 9 karakter!");
                                      playSound("noseri");
                                      e.target.value = prevSerials[key] || "";
                                      return;
                                    }
                                    setPrevSerials((prev) => ({ ...prev, [key]: val }));

                                    const updated = [...scannedItems];
                                    updated[idx].serials[sIdx] = val;
                                    scannedSerialsRef.current = buildScannedSerialMap(updated);
                                    setScannedItems(updated);

                                    const isCurrentItemComplete =
                                      updated[idx].serials.length === updated[idx].ordered_qty &&
                                      updated[idx].serials.every((s) => s.trim() !== "");

                                    if (!isCurrentItemComplete) {
                                      setCanSubmitByEnter(false);
                                      setTimeout(() => {
                                        barcodeInputRef.current?.focus();
                                      }, 50);
                                      return;
                                    }

                                    const allSkuComplete = isOrderReadyForValidation(updated);

                                    if (allSkuComplete) {
                                      setTimeout(() => {
                                        setCanSubmitByEnter(true);
                                        submitButtonRef.current?.focus();
                                      }, 50);
                                    } else {
                                      setCanSubmitByEnter(false);
                                      setTimeout(() => {
                                        barcodeInputRef.current?.focus();
                                      }, 50);
                                    }
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </td>

                        <td style={{ padding: "12px 18px", textAlign: "center" }}>
                          {item.scanned_qty === item.ordered_qty ? (
                            <span style={{ color: "var(--dc-green)", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <FaCheck /> Lengkap
                            </span>
                          ) : (
                            <span style={{ color: "var(--ks-text-soft)", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <FaBarcode /> Scan...
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SPK CMT Scan Form */}
              <div style={{ padding: "16px 18px", borderTop: "1px solid var(--ks-line)", backgroundColor: "#fbfbfc" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--ks-text)", marginBottom: "8px" }}>
                  <FaBarcode style={{ color: "var(--dc-blue)", marginRight: 6 }} /> Scan Barcode SPK CMT / Barcode SKU Produk
                </label>

                <form onSubmit={handleScanBarcode} style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Arahkan barcode scanner ke produk / SPK CMT..."
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                    onKeyDown={handleBarcodeInputKeyDown}
                    ref={barcodeInputRef}
                    disabled={isScanComplete || checkingSerial}
                    autoFocus
                    style={{ flex: 1, height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid var(--ks-line)", fontSize: "13px", outline: "none" }}
                  />
                  <button type="submit" disabled={isScanComplete || checkingSerial} className="ks-btn is-primary" style={{ height: "38px", padding: "0 16px" }}>
                    {checkingSerial ? "Mengecek..." : "Scan Product"}
                  </button>
                </form>
              </div>

              {/* Action Buttons */}
              <div style={{ padding: "16px 18px", borderTop: "1px solid var(--ks-line)", display: "flex", gap: "10px", alignItems: "center", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  ref={submitButtonRef}
                  className={`ks-btn is-primary ${canSubmitByEnter ? "is-ready-submit" : ""}`}
                  disabled={isSubmittingValidation}
                  onClick={handleSubmitValidation}
                  style={{ height: "38px", padding: "0 20px", fontSize: "13px", fontWeight: "700" }}
                >
                  {isSubmittingValidation ? "Memvalidasi..." : "✓ Submit Validasi Packing"}
                </button>

                <button
                  type="button"
                  className="ks-btn"
                  onClick={() => {
                    setOrder(null);
                    scannedSerialsRef.current = new Map();
                    pendingSerialsRef.current = new Map();
                    setScannedItems([]);
                    setTrackingNumber("");
                    setScannedBarcode("");
                    setCanSubmitByEnter(false);
                    focusTrackingInput();
                  }}
                  style={{ height: "38px", padding: "0 16px" }}
                >
                  Batal
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};
export default Packing;

import React, { useState, useEffect } from "react";
import "./Packing.css";
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
    <div className="pk-page">
      <div className="pk-shell">
        <section className="pk-content">
          <header className="pk-topbar">
            <div className="pk-title-group">
              <div className="pk-brand-icon">
          <header className="pk-topbar">
            <div className="pk-title-group">
              <div className="pk-brand-icon">
                <FaQrcode />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h1>Packing Validation</h1>
                  <span className="pk-badge-tag">Standard Mode</span>
                </div>
                <p>Scan tracking number, verifikasi barcode SKU/SPK CMT, dan finalisasi validasi packing order.</p>
              </div>
            </div>
          </header>

          <main className="pk-main">
            <section className="pk-card pk-search-card">
              <div className="pk-search-head">
                <div>
                  <h2>Cari & Scan Tracking Number</h2>
                  <span>Scan resi paket atau ketik nomor tracking untuk mulai proses validasi</span>
                </div>
              </div>

              <div className="tracking-input-wrapper">
                <div className="pk-input-icon-wrap">
                  <FiSearch className="pk-input-icon" />
                  <input
                    ref={trackingInputRef}
                    type="text"
                    placeholder="Scan / masukkan Tracking Number resi..."
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchOrder()}
                    autoFocus
                    className="tracking-input-modern"
                  />
                </div>
                <button 
                  onClick={handleSearchOrder} 
                  disabled={loading}
                  className="btn-search-modern"
                >
                  {loading ? "Memuat..." : "Cari Order"}
                </button>
              </div>

              {message && (
                <div className={`packing-message ${message.includes("⚠️") || message.includes("❌") ? "packing-message-danger" : message.includes("✅") ? "packing-message-success" : "packing-message-info"}`}>
                  {message}
                </div>
              )}
            </section>

      {order && (
        <>
          <section className="pk-kpi-grid">
            <article className="pk-kpi-card">
              <div className="pk-kpi-head"><FiPackage /> Total Produk</div>
              <strong>{order.total_qty} <span style={{ fontSize: "14px", fontWeight: "600" }}>pcs</span></strong>
              <small>Jumlah item pesanan</small>
            </article>

            <article className="pk-kpi-card">
              <div className="pk-kpi-head"><FiCheckCircle /> Progress Scan</div>
              <strong>
                {scannedItems.reduce((sum, i) => sum + i.scanned_qty, 0)} / {scannedItems.reduce((sum, i) => sum + i.ordered_qty, 0)}
              </strong>
              {/* Progress bar */}
              <div className="pk-progress-bar-wrap">
                <div 
                  className="pk-progress-bar-fill" 
                  style={{ 
                    width: `${Math.min(100, (scannedItems.reduce((sum, i) => sum + i.scanned_qty, 0) / Math.max(1, scannedItems.reduce((sum, i) => sum + i.ordered_qty, 0))) * 100)}%` 
                  }} 
                />
              </div>
            </article>

            <article className="pk-kpi-card">
              <div className="pk-kpi-head"><FiSearch /> Info Pelanggan</div>
              <strong style={{ fontSize: "16px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.customer_name || "-"}</strong>
              <small>{order.customer_phone || "-"} • {order.platform || "Marketplace"}</small>
            </article>
          </section>

          <section className="pk-card order-section">
            <div className="pk-order-header-banner">
              <div>
                <h2>Order #{order.order_number || order.tracking_number}</h2>
                <div className="pk-order-meta-tags">
                  <span className="pk-meta-tag"><strong>Customer:</strong> {order.customer_name || "-"}</span>
                  <span className="pk-meta-tag"><strong>No. HP:</strong> {order.customer_phone || "-"}</span>
                  <span className="pk-meta-tag"><strong>Tracking:</strong> {order.tracking_number || "-"}</span>
                </div>
              </div>
              <span className={`pk-order-status-badge ${order.status === "packed" ? "is-packed" : "is-ready"}`}>
                {order.status || "READY_TO_SHIP"}
              </span>
            </div>

            <div className="pk-table-wrap">
              <table className="packing-table">
                <thead>
                  <tr>
                    <th>SKU Barcode</th>
                    <th>Nama Produk</th>
                    <th style={{ textAlign: "center" }}>Qty Pesanan</th>
                    <th style={{ textAlign: "center" }}>Qty Scan</th>
                    <th style={{ textAlign: "center" }}>Gambar</th>
                    <th>Nomor Seri</th>
                    <th style={{ textAlign: "center" }}>Status Item</th>
                  </tr>
                </thead>
                <tbody>
                  {scannedItems.map((item, idx) => (
                    <tr key={idx} className={item.scanned_qty === item.ordered_qty ? "row-complete" : ""}>
                      <td>
                        <strong className="pk-sku-text">{item.sku}</strong>
                      </td>
                      <td>
                        <span className="pk-product-title">{item.product_name}</span>
                      </td>
                      <td className="qty-cell ordered">{item.ordered_qty}</td>
                      <td className="qty-cell scanned">
                        <span className={`qty-badge ${item.scanned_qty === item.ordered_qty ? "is-done" : "is-pending"}`}>
                          {item.scanned_qty}
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.product_name}
                            className="product-image"
                          />
                        ) : (
                          <span style={{ color: "#aaa", fontSize: "11px" }}>No Image</span>
                        )}
                      </td>

                      <td>
                        <div className="pk-serial-inputs-grid">
                          {item.serials.map((serial, sIdx) => (
                            <div key={sIdx} className="pk-serial-input-item">
                              <span className="pk-serial-label">Seri #{sIdx + 1}</span>
                              <input
                                type="text"
                                value={serial}
                                placeholder="Auto / Scan..."
                                onKeyDown={(e) => {}}
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

                      <td style={{ textAlign: "center" }}>
                        {item.scanned_qty === item.ordered_qty ? (
                          <span className="status-ok">
                            <FaCheck /> Lengkap
                          </span>
                        ) : (
                          <span className="status-wait">
                            <FaBarcode /> Scan...
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sku-input-wrapper">
              <label className="sku-label">
                <FaBarcode style={{ color: "var(--dc-blue, #4f46e5)" }} /> Scan Barcode SPK CMT / Barcode SKU Produk
              </label>

              <form onSubmit={handleScanBarcode} className="sku-input">
                <input
                  type="text"
                  placeholder="Arahkan barcode scanner ke produk / SPK CMT..."
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  onKeyDown={handleBarcodeInputKeyDown}
                  ref={barcodeInputRef}
                  disabled={isScanComplete || checkingSerial}
                  autoFocus
                />
                <button type="submit" disabled={isScanComplete || checkingSerial}>
                  {checkingSerial ? "Mengecek..." : "Scan Product"}
                </button>
              </form>
            </div>

            <div className="packing-actions">
              <button
                type="button"
                ref={submitButtonRef}
                className={`btn-validate ${canSubmitByEnter ? "is-ready-submit" : ""}`}
                disabled={isSubmittingValidation}
                onClick={handleSubmitValidation}
              >
                {isSubmittingValidation ? "Memvalidasi..." : "✓ Submit Validasi Packing"}
              </button>

              <button
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
                className="btn-cancel"
              >
                Batal
              </button>
            </div>
          </section>
        </>
      )}
          </main>
        </section>
      </div>
    </div>


  );
};

export default Packing;

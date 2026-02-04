import React, { useState } from "react";
import "./Packing.css";
import "../Jahit/Penjahit.css";
import API from "../../api";
import { FaBarcode, FaCheck,FaQrcode, FaTimes } from "react-icons/fa";
import { useRef } from "react";

const Packing = () => {
 const [trackingNumber, setTrackingNumber] = useState("");
  const [order, setOrder] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [scannedItems, setScannedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [nomorSeri, setNomorSeri] = useState("");
  const barcodeInputRef = useRef(null);
  const serialInputRefs = useRef({});
  const submitButtonRef = useRef(null);
  const [canSubmitByEnter, setCanSubmitByEnter] = useState(false);
const [prevSerials, setPrevSerials] = useState({});



  const playSound = (type) => {
    const soundMap = {
      success: "/sounds/success.mp3",
      error: "/sounds/failed.mp3",
      scanproduk: "/sounds/scanprodukberhasil.mp3",
      noproduk: "/sounds/produktidaksesuai.mp3",
      sudahpacking: "/sounds/orderansudahpacking.mp3",
      validasiok: "/sounds/validasiberhasil.mp3",
      noseri: "/sounds/noseri.mp3",
      isinoseri: "/sounds/isinoseri.mp3",
      
    };
    const audio = new Audio(soundMap[type]);
    audio.play();
};


  
const handleSearchOrder = async () => {
  if (!trackingNumber) return;
  setLoading(true);
  setMessage("");

  try {
    const response = await API.get(`/orders/tracking/${trackingNumber}`);
    const orderData = response.data;

    if (orderData.status === "packed") {
      setMessage("⚠️ Order ini sudah berstatus packed dan tidak bisa discan ulang.");
      playSound("sudahpacking");
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

    setOrder(orderData);
    setScannedItems(initialScan);
  } catch (error) {
    setOrder(null);
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


 const handleScanBarcode = (e) => {
  e.preventDefault();
  const barcode = scannedBarcode.trim();
  if (!barcode) return;

  // Parse barcode format "SKU | KODE_SERI"
  if (!barcode.includes(" | ")) {
    setMessage("❌ Format barcode tidak valid. Format harus: SKU | KODE_SERI");
    playSound("error");
    setScannedBarcode("");
    return;
  }

  const parts = barcode.split(" | ");
  if (parts.length !== 2) {
    setMessage("❌ Format barcode tidak valid. Format harus: SKU | KODE_SERI");
    playSound("error");
    setScannedBarcode("");
    return;
  }

  const sku = parts[0].trim();
  const nomorSeri = parts[1].trim();

  if (!sku || !nomorSeri) {
    setMessage("❌ SKU atau nomor seri tidak boleh kosong");
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

  const itemIndex = scannedItems.findIndex((item) => item.sku == sku);

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

  // Validasi nomor seri tidak boleh duplikat dalam item yang sama
  if (target.serials.includes(nomorSeri)) {
    setMessage(`⚠️ Nomor seri ${nomorSeri} sudah pernah di-scan untuk SKU ${sku}`);
    playSound("error");
    setScannedBarcode("");
    return;
  }

  // Tambahkan scanned_qty dan isi nomor seri otomatis
  target.scanned_qty += 1;
  target.serials.push(nomorSeri);
  setMessage(`✅ SKU ${sku} dengan nomor seri ${nomorSeri} berhasil discan`);
  playSound("scanproduk");
  
  setScannedItems(updatedItems);
  setScannedBarcode("");

  // Focus ke input barcode berikutnya setelah scan berhasil
  setTimeout(() => {
    barcodeInputRef.current?.focus();
  }, 50);
};

  const handleSubmitValidation = async () => {
  if (!order) return;

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

  try {
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
      `/orders/scan/${trackingNumber}`,
      payload
    );

    setMessage(response.data.message || "✅ Order berhasil divalidasi");
    playSound("validasiok");

  
    setOrder(null);
    setScannedItems([]);
    setTrackingNumber("");

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
  }
};

  

  return (
    <div>
   <div className="seri-page">
         <div className="seri-header">
           <div className="seri-header-icon">
             <FaQrcode />
           </div>
           <h1>Scan Packing</h1>
    </div>

    <div className="tracking-card">
   
      <div className="tracking-input-wrapper">
        <input
          type="text"
          placeholder="Scan / masukkan Tracking Number..."
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearchOrder()}
          autoFocus
          className="tracking-input-modern"
        />
        <button 
          onClick={handleSearchOrder} 
          disabled={loading}
          className="btn-search-modern"
          >
          {loading ? "Loading..." : "Cari Order"}
        </button>
     
      {message && <div className="packing-message">{message}</div>}
  </div>
     
      {order && (
        <div className="order-section">
          <h2>Order #{order.order_number}</h2>
          <p>
            <strong>Nama Customer:</strong> {order.customer_name} <br />
            <strong>No. HP:</strong> {order.customer_phone}  <br />
             <strong>Total Produk:</strong> {order.total_qty}

          </p>

          <table className="packing-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nama Produk</th>
                <th>Qty Pesanan</th>
                <th>Qty Scan</th>
                <th>Gambar</th>
                <th>Nomor Seri</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scannedItems.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.sku}</td>
                  <td>{item.product_name}</td>
                  <td className="qty-cell ordered">{item.ordered_qty}</td>
                  <td className="qty-cell scanned">{item.scanned_qty}</td>

                   <td>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.product_name}
                        className="product-image"
                      />
                    ) : (
                      <span style={{ color: "#aaa", fontSize: "13px" }}>No Image</span>
                    )}
                  </td>

               <td>
               {item.serials.map((serial, sIdx) => (
              <input
                type="text"
                value={serial}
                autoFocus
                onKeyDown={(e) => {
                  
                }}
                onChange={(e) => {
                  const val = e.target.value;
                    const key = `${idx}-${sIdx}`;

                if (val.length > 9) {
                  setMessage("❌ Nomor seri lebih dari 9 karakter!");
                  playSound("noseri");

                  const key = `${idx}-${sIdx}`;
                  e.target.value = prevSerials[key] || "";
                  return;
                }
                  setPrevSerials(prev => ({ ...prev, [key]: val }));

                  const updated = [...scannedItems];
                  updated[idx].serials[sIdx] = val;
                  setScannedItems(updated);

                  const isCurrentItemComplete =
                    updated[idx].serials.length === updated[idx].ordered_qty &&
                    updated[idx].serials.every(s => s.trim() !== "");

                  if (!isCurrentItemComplete) {
                    setTimeout(() => {
                      barcodeInputRef.current?.focus();
                    }, 50);
                    return;
                  }

                  const allSkuComplete = updated.every(item =>
                    item.serials.length === item.ordered_qty &&
                    item.serials.every(s => s.trim() !== "")
                  );

                 if (allSkuComplete) {
                  setTimeout(() => {
                    setCanSubmitByEnter(true);  
                    submitButtonRef.current?.focus();
                  }, 50);
                  }
                  else {
                    setTimeout(() => {
                    barcodeInputRef.current?.focus();
                    }, 50);
                  }
                }}
              />


            ))}

              </td>

                  <td>
                    {item.scanned_qty === item.ordered_qty ? (
                      <span className="status-ok">
                        <FaCheck /> OK
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



      <div className="sku-input-wrapper">
        <label className="sku-label">Scan SPK CMT Barcode</label>

        <form onSubmit={handleScanBarcode} className="sku-input">
          <input
            type="text"
            placeholder="Scan SPK CMT Barcode..."
            value={scannedBarcode}
            onChange={(e) => setScannedBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleScanBarcode(e);
              }
            }}
            ref={barcodeInputRef}
            autoFocus
          />
          <button type="submit">Scan</button>
        </form>
      </div>

          <div className="packing-actions">
           <button
            ref={submitButtonRef}
            className="btn-validate"
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmitByEnter) {
                handleSubmitValidation();
              }
            }}
            onClick={handleSubmitValidation}
          >
            Submit Validasi
          </button>


            <button
              onClick={() => {
                setOrder(null);
                setScannedItems([]);
              }}
              className="btn-cancel"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
     </div>
     </div>


  );
};

export default Packing;
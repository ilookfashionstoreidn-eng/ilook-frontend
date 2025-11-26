import React, { useState } from "react";
import "./Packing.css";
import "../Jahit/Penjahit.css";
import API from "../../api";
import { FaBarcode, FaCheck, FaTimes } from "react-icons/fa";
import { useRef } from "react";

const Packing = () => {
 const [trackingNumber, setTrackingNumber] = useState("");
  const [order, setOrder] = useState(null);
  const [scannedSku, setScannedSku] = useState("");
  const [scannedItems, setScannedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [nomorSeri, setNomorSeri] = useState("");
  const skuInputRef = useRef(null);
  const serialInputRefs = useRef({});
  const submitButtonRef = useRef(null);


  const playSound = (type) => {
    const soundMap = {
      success: "/sounds/success.mp3",
      error: "/sounds/failed.mp3",
      scanproduk: "/sounds/scanprodukberhasil.mp3",
      noproduk: "/sounds/produktidaksesuai.mp3",
      sudahpacking: "/sounds/orderansudahpacking.mp3",
      validasiok: "/sounds/validasiberhasil.mp3",
      
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


 const handleScanSku = (e) => {
  e.preventDefault();
  const sku = scannedSku.trim();
  if (!sku) return;

  // ⛔ CEK: Apakah ada nomor seri yang belum diisi?
  const skuBelumLengkap = scannedItems.find(item =>
    item.serials.some(s => !s || s.trim() === "")
  );

  if (skuBelumLengkap) {
    setMessage(
      `⚠️ Harap isi semua nomor seri untuk SKU ${skuBelumLengkap.sku} sebelum scan SKU lain.`
    );
    playSound("error");
    setScannedSku("");  // ⬅️ Kosongkan input SKU
    return;
  }

  // 🔍 Lanjut proses scan SKU normal
  const itemIndex = scannedItems.findIndex((item) => item.sku == sku);

  if (itemIndex === -1) {
    setMessage(`❌ SKU ${sku} tidak ditemukan dalam order`);
    playSound("noproduk");
    setScannedSku(""); // ⬅️ Kosongkan input SKU
    return;
  }

  const updatedItems = [...scannedItems];
  const target = updatedItems[itemIndex];

  if (target.scanned_qty >= target.ordered_qty) {
    setMessage(`⚠️ SKU ${sku} discan melebihi jumlah pesanan`);
    playSound("error");

    } else {
      target.scanned_qty += 1;
      target.serials.push(""); 
      setMessage(`✅ SKU ${sku} berhasil discan`);
      playSound("scanproduk");
    }
      setScannedItems(updatedItems);
      setScannedSku("");

      
      setTimeout(() => {
        const serialIndex = target.serials.length - 1;
        const key = `${target.sku}-${serialIndex}`;

        if (serialInputRefs.current[key]) {
          serialInputRefs.current[key].focus();
        }
      }, 50);

  };

  const handleSubmitValidation = async () => {
  if (!order) return;


  for (let item of scannedItems) {
    const emptySerial = item.serials.some(s => !s || s.trim() === "");
    if (emptySerial) {
      setMessage(`⚠️ Ada nomor seri SKU ${item.sku} yang masih kosong.`);
      playSound("error");
      return;
    }

    if (item.serials.length !== item.scanned_qty) {
      setMessage(`⚠️ Jumlah nomor seri SKU ${item.sku} tidak sesuai qty scan`);
      playSound("error");
      return;
    }
  }

  try {
    const payload = {
      items: scannedItems.map((item) => ({
        sku: item.sku,
        quantity: item.scanned_qty,
       serials: item.serials,
      })),
    };

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
    setMessage(error.response?.data?.message || "❌ Validasi gagal");
    playSound("error");
  }
};

  

  return (
    <div>
    <div className="penjahit-container">
      <h1>Packingan Scan</h1>
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
                onChange={(e) => {
                  const updated = [...scannedItems];
                  updated[idx].serials[sIdx] = e.target.value;
                  setScannedItems(updated);
                  
              // 1. Cek apakah SKU ini sudah lengkap semua nomor serinya
              const isCurrentItemComplete =
                updated[idx].serials.length === updated[idx].ordered_qty &&
                updated[idx].serials.every(s => s.trim() !== "");

              // 2. Kalau SKU ini belum lengkap → balikkan fokus ke scan SKU
              if (!isCurrentItemComplete) {
                setTimeout(() => {
                  skuInputRef.current?.focus();
                }, 50);
                return;
                }

                // 3. SKU ini sudah lengkap → cek apakah semua SKU juga lengkap
                const allSkuComplete = updated.every(item =>
                  item.serials.length === item.ordered_qty &&
                  item.serials.every(s => s.trim() !== "")
                );

                // 4. Kalau semua SKU sudah lengkap → fokus ke submit
                if (allSkuComplete) {
                  setTimeout(() => {
                    submitButtonRef.current?.focus();
                  }, 50);
                } else {
                  // 5. Kalau belum → kembali ke scan SKU (untuk scan produk berikutnya)
                  setTimeout(() => {
                    skuInputRef.current?.focus();
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
        <label className="sku-label">Scan SKU Produk</label>

        <form onSubmit={handleScanSku} className="sku-input">
          <input
            type="text"
            placeholder="Scan SKU Produk..."
            value={scannedSku}
            onChange={(e) => setScannedSku(e.target.value)}
            ref={skuInputRef}
            
            autoFocus
          />
          <button type="submit">Scan</button>
        </form>
      </div>

        
          <div className="packing-actions">
           <button
              ref={submitButtonRef}
              onClick={handleSubmitValidation}
              className="btn-validate"
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

  );
};

export default Packing;
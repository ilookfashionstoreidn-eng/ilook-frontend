import React, { useState } from "react";
import "./Packing.css";
import API from "../../api";
import { FaBarcode, FaCheck, FaTimes } from "react-icons/fa";

const Packing = () => {
 const [trackingNumber, setTrackingNumber] = useState("");
  const [order, setOrder] = useState(null);
  const [scannedSku, setScannedSku] = useState("");
  const [scannedItems, setScannedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSearchOrder = async () => {
    if (!trackingNumber) return;
    setLoading(true);
    setMessage("");

    try {
      const response = await API.get(`/orders/tracking/${trackingNumber}`);
      const orderData = response.data;
      const initialScan = orderData.items.map((item) => ({
        sku: item.sku,
        product_name: item.product_name,
        ordered_qty: item.quantity,
        scanned_qty: 0,
      }));

      setOrder(orderData);
      setScannedItems(initialScan);
    } catch (error) {
      setOrder(null);
      setScannedItems([]);
      setMessage(error.response?.data?.message || "Order tidak ditemukan");
    } finally {
      setLoading(false);
    }
  };

  
  const handleScanSku = (e) => {
    e.preventDefault();
    const sku = scannedSku.trim();
    if (!sku) return;

    const updated = scannedItems.map((item) => {
      if (item.sku === sku) {
        const newQty = item.scanned_qty + 1;
        if (newQty > item.ordered_qty) {
          setMessage(`⚠️ SKU ${sku} discan melebihi jumlah pesanan`);
        }
        return { ...item, scanned_qty: newQty };
      }
      return item;
    });

    const found = scannedItems.some((item) => item.sku === sku);
    if (!found) {
      setMessage(`❌ SKU ${sku} tidak ditemukan dalam order`);
    } else {
      setMessage(`✅ SKU ${sku} berhasil discan`);
    }

    setScannedItems(updated);
    setScannedSku("");
  };

  
  const handleSubmitValidation = async () => {
    if (!order) return;

    try {
      const payload = {
        items: scannedItems.map((item) => ({
          sku: item.sku,
          quantity: item.scanned_qty,
        })),
      };

      const response = await API.post(
        `/orders/scan/${trackingNumber}`,
        payload
      );
      setMessage(response.data.message || "✅ Order berhasil divalidasi");
      setOrder(null);
      setScannedItems([]);
      setTrackingNumber("");
    } catch (error) {
      setMessage(error.response?.data?.message || "❌ Validasi gagal");
    }
  };

  return (
    <div className="packing-container">
      <h1>Packing Order</h1>

      {/* Input Tracking Number */}
      <div className="tracking-input">
        <input
          type="text"
          placeholder="Scan / masukkan Tracking Number..."
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearchOrder()}
          autoFocus
        />
        <button onClick={handleSearchOrder} disabled={loading}>
          {loading ? "Loading..." : "Cari Order"}
        </button>
      </div>

      {message && <div className="packing-message">{message}</div>}

      {/* Tabel Item Order */}
      {order && (
        <div className="order-section">
          <h2>Order #{order.order_number}</h2>
          <p>
            <strong>Nama Customer:</strong> {order.customer_name} <br />
            <strong>No. HP:</strong> {order.customer_phone}
          </p>

          <table className="packing-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nama Produk</th>
                <th>Qty Pesanan</th>
                <th>Qty Scan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scannedItems.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.sku}</td>
                  <td>{item.product_name}</td>
                  <td>{item.ordered_qty}</td>
                  <td>{item.scanned_qty}</td>
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

          {/* Input Scan SKU */}
          <form onSubmit={handleScanSku} className="sku-input">
            <input
              type="text"
              placeholder="Scan SKU Produk..."
              value={scannedSku}
              onChange={(e) => setScannedSku(e.target.value)}
              autoFocus
            />
            <button type="submit">Scan</button>
          </form>

          {/* Submit Validasi */}
          <div className="packing-actions">
            <button onClick={handleSubmitValidation} className="btn-validate">
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
  );
};

export default Packing;
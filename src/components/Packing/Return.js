import React, { useEffect, useRef, useState } from "react";
import "./Packing.css";
import "./Return.css";
import API from "../../api";
import { FaBarcode, FaCheck, FaUndo } from "react-icons/fa";
import { FiPackage, FiSearch, FiUser } from "react-icons/fi";

const getErrorMessage = (error, fallback) => {
  if (error.response?.data?.errors) {
    return Object.values(error.response.data.errors).flat().join("\n");
  }

  return error.response?.data?.message || fallback;
};

const ReturnPage = () => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [lastScan, setLastScan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const trackingInputRef = useRef(null);

  const focusTrackingInput = () => {
    setTimeout(() => {
      trackingInputRef.current?.focus();
      trackingInputRef.current?.select();
    }, 50);
  };

  useEffect(() => {
    focusTrackingInput();
  }, []);

  const handleScanReturn = async (event) => {
    event?.preventDefault();

    const tracking = trackingNumber.trim();
    if (!tracking || loading) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await API.post("/returns/scan", {
        tracking_number: tracking,
      });
      const payload = response.data?.data || {};

      setLastScan({
        order: payload.order,
        log: payload.log,
      });
      setTrackingNumber("");
      setMessage({
        type: "success",
        text: response.data?.message || "Return berhasil dicatat",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Return gagal dicatat"),
      });
    } finally {
      setLoading(false);
      focusTrackingInput();
    }
  };

  const order = lastScan?.order;
  const totalItems = order?.items?.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  ) || 0;

  return (
    <div className="pk-page">
      <div className="pk-shell">
        <section className="pk-content">
          <header className="pk-topbar">
            <div className="pk-title-group">
              <div className="pk-brand-icon return-brand-icon">
                <FaUndo />
              </div>
              <div>
                <h1>Return</h1>
                <p>Scan tracking number untuk mencatat return dan menampilkan detail order.</p>
              </div>
            </div>
          </header>

          <main className="pk-main">
            <section className="pk-card pk-search-card">
              <div className="pk-search-head">
                <h2>Scan Return</h2>
                <span>Input akan reset otomatis setelah tracking berhasil dicatat</span>
              </div>

              <form onSubmit={handleScanReturn} className="tracking-input-wrapper">
                <input
                  ref={trackingInputRef}
                  type="text"
                  placeholder="Scan / masukkan Tracking Number..."
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  autoFocus
                  className="tracking-input-modern"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-search-modern"
                >
                  {loading ? "Mencatat..." : "Scan Return"}
                </button>
              </form>

              {message && (
                <div className={`return-message is-${message.type}`}>
                  {message.text}
                </div>
              )}
            </section>

            {order && (
              <>
                <section className="pk-kpi-grid">
                  <article className="pk-kpi-card">
                    <div className="pk-kpi-head">
                      <FiPackage /> Total Produk
                    </div>
                    <strong>{totalItems}</strong>
                    <small>item pada order return</small>
                  </article>
                  <article className="pk-kpi-card">
                    <div className="pk-kpi-head">
                      <FiSearch /> Tracking
                    </div>
                    <strong>{order.tracking_number || lastScan.log?.tracking_number || "-"}</strong>
                    <small>terakhir discan</small>
                  </article>
                  <article className="pk-kpi-card">
                    <div className="pk-kpi-head">
                      <FiUser /> Customer
                    </div>
                    <strong>{order.customer_name || "-"}</strong>
                    <small>{order.customer_phone || "-"}</small>
                  </article>
                </section>

                <section className="pk-card order-section return-order-section">
                  <div className="return-order-head">
                    <div>
                      <h2>Order #{order.order_number || "-"}</h2>
                      <p>
                        <strong>Status:</strong> {order.status || "-"} <br />
                        <strong>Petugas:</strong> {lastScan.log?.performed_by || "-"}
                      </p>
                    </div>
                    <span className="return-badge">
                      <FaCheck /> Logged
                    </span>
                  </div>

                  <div className="pk-table-wrap">
                    <table className="packing-table return-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Nama Produk</th>
                          <th>Qty Pesanan</th>
                          <th>Gambar</th>
                          <th>Status Return</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(order.items || []).map((item) => (
                          <tr key={item.id || item.sku}>
                            <td>{item.sku}</td>
                            <td>{item.product_name}</td>
                            <td className="qty-cell ordered">{item.quantity}</td>
                            <td>
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.product_name}
                                  className="return-product-image"
                                />
                              ) : (
                                <span className="return-no-image">No Image</span>
                              )}
                            </td>
                            <td>
                              <span className="status-ok">
                                <FaBarcode /> Return
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default ReturnPage;

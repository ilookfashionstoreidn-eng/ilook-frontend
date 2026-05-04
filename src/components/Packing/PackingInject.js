import React, { useRef, useState } from "react";
import "./Packing.css";
import API from "../../api";
import { FaQrcode, FaTrash } from "react-icons/fa";
import { FiCheckCircle, FiPackage, FiSearch } from "react-icons/fi";

const normalizeTrackingNumber = (value = "") => value.trim();

const getMessageTone = (value = "") => {
  const normalizedValue = String(value || "").trim().toUpperCase();

  if (normalizedValue.startsWith("WARNING:") || normalizedValue.startsWith("ERROR:")) {
    return "danger";
  }

  if (normalizedValue.startsWith("OK:")) {
    return "success";
  }

  return "info";
};

const formatErrorMessage = (error, fallbackMessage) => {
  const data = error?.response?.data;

  if (data?.errors) {
    const errorList = Object.values(data.errors).flat();
    return `ERROR: ${data.message || fallbackMessage}\n${errorList.join("\n")}`;
  }

  return `ERROR: ${data?.message || fallbackMessage}`;
};

const formatNumber = (value) => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "0";
  }

  return amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const sumOrderItems = (orders, mapper) =>
  orders.reduce(
    (orderSum, order) =>
      orderSum +
      (Array.isArray(order.items) ? order.items : []).reduce(
        (itemSum, item) => itemSum + Number(mapper(item) || 0),
        0
      ),
    0
  );

const PackingInject = () => {
  const trackingInputRef = useRef(null);

  const [trackingNumber, setTrackingNumber] = useState("");
  const [scannedOrders, setScannedOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const messageTone = getMessageTone(message);
  const totalTrackedOrders = scannedOrders.length;
  const totalTrackedItems = scannedOrders.reduce(
    (sum, order) => sum + Number(order.total_qty || 0),
    0
  );
  const totalEstimatedDeduct = sumOrderItems(
    scannedOrders,
    (item) => item.estimated_deduct_qty ?? item.quantity
  );

  const focusTrackingInput = () => {
    setTimeout(() => {
      trackingInputRef.current?.focus();
      trackingInputRef.current?.select();
    }, 50);
  };

  const handleScanTracking = async () => {
    const normalizedTracking = normalizeTrackingNumber(trackingNumber);

    if (!normalizedTracking) {
      focusTrackingInput();
      return;
    }

    if (
      scannedOrders.some(
        (order) => normalizeTrackingNumber(order.tracking_number) === normalizedTracking
      )
    ) {
      setTrackingNumber("");
      setMessage(`WARNING: Tracking number ${normalizedTracking} sudah ada di daftar inject.`);
      focusTrackingInput();
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await API.get(
        `/packing-inject/orders/tracking/${encodeURIComponent(normalizedTracking)}`
      );

      setScannedOrders((prevOrders) => [response.data, ...prevOrders]);
      setMessage(`OK: Tracking number ${normalizedTracking} berhasil dibaca dan siap diinject.`);
    } catch (error) {
      setMessage(formatErrorMessage(error, "Gagal membaca data order untuk inject"));
    } finally {
      setLoading(false);
      setTrackingNumber("");
      focusTrackingInput();
    }
  };

  const handleRemoveTracking = (trackingToRemove) => {
    setScannedOrders((prevOrders) =>
      prevOrders.filter((order) => order.tracking_number !== trackingToRemove)
    );
    setMessage(`INFO: Tracking number ${trackingToRemove} dihapus dari daftar inject.`);
    focusTrackingInput();
  };

  const handleSubmit = async () => {
    if (scannedOrders.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await API.post("/packing-inject/orders/submit", {
        tracking_numbers: scannedOrders.map((order) => order.tracking_number),
      });

      const processedCount = response.data?.processed_count ?? scannedOrders.length;
      const deductedQty = response.data?.summary?.deducted_qty;
      const shortageQty = response.data?.summary?.shortage_qty;
      const stockInfo = [
        deductedQty !== undefined ? `stok terpotong ${formatNumber(deductedQty)} pcs` : null,
        shortageQty > 0 ? `stok tidak tersedia ${formatNumber(shortageQty)} pcs` : null,
      ]
        .filter(Boolean)
        .join(", ");

      setScannedOrders([]);
      setMessage(
        `OK: ${processedCount} tracking berhasil diinject${stockInfo ? ` (${stockInfo})` : ""}.`
      );
      focusTrackingInput();
    } catch (error) {
      setMessage(formatErrorMessage(error, "Submit inject data gagal"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pk-page pk-page-inject">
      <div className="pk-shell">
        <section className="pk-content">
          <header className="pk-topbar">
            <div className="pk-title-group">
              <div className="pk-brand-icon">
                <FaQrcode />
              </div>
              <div>
                <h1>Inject Data</h1>
                <p>Input resi yang sudah dikonfirmasi ekspedisi sebagai pengiriman valid.</p>
              </div>
            </div>
          </header>

          <main className="pk-main">
            <section className="pk-kpi-grid">
              <article className="pk-kpi-card">
                <div className="pk-kpi-head">
                  <FiCheckCircle /> Tracking Siap Inject
                </div>
                <strong>{formatNumber(totalTrackedOrders)}</strong>
                <small>jumlah resi dalam daftar</small>
              </article>
              <article className="pk-kpi-card">
                <div className="pk-kpi-head">
                  <FiPackage /> Total Produk
                </div>
                <strong>{formatNumber(totalTrackedItems)}</strong>
                <small>akumulasi qty order</small>
              </article>
              <article className="pk-kpi-card">
                <div className="pk-kpi-head">
                  <FiSearch /> Estimasi Potong Stok
                </div>
                <strong>{formatNumber(totalEstimatedDeduct)}</strong>
                <small>qty yang akan dipotong jika stok tersedia</small>
              </article>
            </section>

            <section className="pk-card pk-search-card">
              <div className="pk-search-head">
                <h2>Scan Tracking Number</h2>
                <span>Order akan dibaca dulu, lalu diproses saat daftar inject disubmit.</span>
              </div>

              <div className="tracking-input-wrapper">
                <input
                  ref={trackingInputRef}
                  type="text"
                  placeholder="Scan / masukkan Tracking Number..."
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleScanTracking();
                    }
                  }}
                  autoFocus
                  className="tracking-input-modern"
                  disabled={loading || isSubmitting}
                />

                <button
                  type="button"
                  onClick={handleScanTracking}
                  disabled={loading || isSubmitting}
                  className="btn-search-modern"
                >
                  {loading ? "Membaca..." : "Tambah Tracking"}
                </button>
              </div>

              <div className="packing-actions pk-bb-scan-actions">
                <button
                  type="button"
                  className="btn-validate"
                  disabled={isSubmitting || scannedOrders.length === 0}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? "Menginject..." : "Submit Inject Data"}
                </button>

                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setScannedOrders([]);
                    setTrackingNumber("");
                    setMessage("INFO: Daftar inject dikosongkan.");
                    focusTrackingInput();
                  }}
                  disabled={loading || isSubmitting || scannedOrders.length === 0}
                >
                  Kosongkan Daftar
                </button>
              </div>

              {message && (
                <div className={`packing-message packing-message-${messageTone}`}>
                  {message}
                </div>
              )}
            </section>

            <section className="pk-card order-section">
              <h2>Daftar Inject</h2>
              <p className="pk-order-meta">
                <strong>Total Tracking:</strong> {formatNumber(totalTrackedOrders)} <br />
                <strong>Total Produk:</strong> {formatNumber(totalTrackedItems)} <br />
                <strong>Estimasi Stok Dipotong:</strong> {formatNumber(totalEstimatedDeduct)}
              </p>

              {scannedOrders.length === 0 ? (
                <div className="pk-empty-session">
                  Belum ada tracking number yang masuk daftar inject.
                </div>
              ) : (
                <div className="pk-bb-order-list">
                  {scannedOrders.map((order) => {
                    const orderItems = Array.isArray(order.items) ? order.items : [];

                    return (
                      <div key={order.tracking_number} className="pk-bb-order-card">
                        <h3>Order #{order.order_number}</h3>

                        <div className="pk-table-wrap">
                          <table className="packing-table pk-inject-detail-table">
                            <thead>
                              <tr>
                                <th>Tracking Number</th>
                                <th>SKU</th>
                                <th>Nama Produk</th>
                                <th>Qty Order</th>
                                <th>Stok Tersedia</th>
                                <th>Estimasi Potong</th>
                                <th>Gambar</th>
                                <th>Status</th>
                                <th>Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderItems.length === 0 ? (
                                <tr>
                                  <td>
                                    <span className="pk-cell-primary">
                                      {order.tracking_number || "-"}
                                    </span>
                                  </td>
                                  <td colSpan={7} className="pk-empty-table">
                                    Order ini belum memiliki detail item.
                                  </td>
                                  <td className="pk-action-cell pk-action-cell-stacked">
                                    <button
                                      type="button"
                                      className="pk-delete-btn"
                                      onClick={() => handleRemoveTracking(order.tracking_number)}
                                      disabled={isSubmitting}
                                    >
                                      <FaTrash /> Hapus
                                    </button>
                                  </td>
                                </tr>
                              ) : (
                                orderItems.map((item, itemIndex) => (
                                  <tr
                                    key={`${order.tracking_number}-${item.id || item.sku || itemIndex}`}
                                  >
                                    {itemIndex === 0 && (
                                      <td
                                        className="pk-bb-tracking-cell"
                                        rowSpan={orderItems.length}
                                      >
                                        <span className="pk-cell-primary">
                                          {order.tracking_number || "-"}
                                        </span>
                                        <span className="pk-cell-note">
                                          {order.customer_name || "-"}
                                        </span>
                                      </td>
                                    )}
                                    <td>
                                      <span className="pk-cell-primary">{item.sku || "-"}</span>
                                    </td>
                                    <td>
                                      <span className="pk-cell-primary">
                                        {item.product_name || "-"}
                                      </span>
                                    </td>
                                    <td className="qty-cell ordered">
                                      {formatNumber(item.quantity)}
                                    </td>
                                    <td className="qty-cell">
                                      {item.stock_available_qty === null ||
                                      item.stock_available_qty === undefined
                                        ? "-"
                                        : formatNumber(item.stock_available_qty)}
                                    </td>
                                    <td className="qty-cell scanned">
                                      {formatNumber(item.estimated_deduct_qty ?? item.quantity)}
                                    </td>
                                    <td>
                                      {item.image ? (
                                        <img
                                          src={item.image}
                                          alt={item.product_name || item.sku || "Produk"}
                                          className="product-image"
                                        />
                                      ) : (
                                        <span className="pk-cell-muted">No Image</span>
                                      )}
                                    </td>
                                    <td>
                                      <span className="pk-status-pill pk-status-inject">
                                        <FiCheckCircle /> Siap Inject
                                      </span>
                                      {item.stock_note && (
                                        <span className="pk-cell-note">{item.stock_note}</span>
                                      )}
                                    </td>
                                    {itemIndex === 0 && (
                                      <td
                                        className="pk-action-cell pk-action-cell-stacked"
                                        rowSpan={orderItems.length}
                                      >
                                        <button
                                          type="button"
                                          className="pk-delete-btn"
                                          onClick={() => handleRemoveTracking(order.tracking_number)}
                                          disabled={isSubmitting}
                                        >
                                          <FaTrash /> Hapus
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </main>
        </section>
      </div>
    </div>
  );
};

export default PackingInject;

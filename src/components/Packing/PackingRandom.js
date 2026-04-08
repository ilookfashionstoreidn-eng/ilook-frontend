import React, { useRef, useState } from "react";
import "./Packing.css";
import API from "../../api";
import { FaBarcode, FaCheck, FaGift, FaQrcode } from "react-icons/fa";
import { FiCheckCircle, FiPackage, FiSearch } from "react-icons/fi";

const createSegmentId = (prefix = "segment") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeSku = (sku = "") => sku.trim().replace(/\s+/g, " ").toUpperCase();

const isSameSku = (left, right) => normalizeSku(left) !== "" && normalizeSku(left) === normalizeSku(right);

const buildInitialRows = (items = []) =>
  items.map((item) => ({
    segment_id: createSegmentId(`order-${item.id}`),
    row_type: "order_item",
    order_item_id: item.id,
    original_sku: item.sku,
    original_product_name: item.product_name,
    original_image: item.image,
    actual_sku: item.sku,
    actual_product_name: item.product_name,
    actual_image: item.image,
    ordered_qty: Number(item.quantity || 0),
    scanned_qty: 0,
    status: "scan",
    serials: [],
  }));

const areOriginalRowsReady = (rows) =>
  rows
    .filter((row) => row.row_type === "order_item")
    .every(
      (row) =>
        row.scanned_qty === row.ordered_qty &&
        row.serials.length === row.scanned_qty &&
        row.serials.every((serial) => serial && serial.trim() !== "")
    );

const getDuplicateSerial = (rows) => {
  const registry = new Set();

  for (const row of rows) {
    for (const serial of row.serials || []) {
      const normalized = (serial || "").trim();
      if (!normalized) {
        continue;
      }

      if (registry.has(normalized)) {
        return normalized;
      }

      registry.add(normalized);
    }
  }

  return null;
};

const getStatusMeta = (row) => {
  if (row.row_type === "bonus") {
    return {
      className: "pk-status-pill pk-status-bonus",
      label: "Bonus",
      icon: <FaGift />,
    };
  }

  if (row.scanned_qty === 0) {
    return {
      className: "pk-status-pill pk-status-scan",
      label: "Scan...",
      icon: <FaBarcode />,
    };
  }

  if (row.status === "random") {
    return {
      className: "pk-status-pill pk-status-random",
      label: "Random",
      icon: <FaBarcode />,
    };
  }

  return {
    className: "pk-status-pill pk-status-sesuai",
    label: "Sesuai",
    icon: <FaCheck />,
  };
};

const PackingRandom = () => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [order, setOrder] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [scannedItems, setScannedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [canSubmitByEnter, setCanSubmitByEnter] = useState(false);
  const [isSubmittingValidation, setIsSubmittingValidation] = useState(false);

  const trackingInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const submitButtonRef = useRef(null);
  const skuMetaCacheRef = useRef({});

  const focusTrackingInput = () => {
    setTimeout(() => {
      trackingInputRef.current?.focus();
      trackingInputRef.current?.select();
    }, 50);
  };

  const syncRowsState = (rows, focusTarget = "barcode") => {
    const ready = areOriginalRowsReady(rows);
    setScannedItems(rows);
    setCanSubmitByEnter(ready);

    setTimeout(() => {
      if (ready && focusTarget !== "tracking") {
        submitButtonRef.current?.focus();
        return;
      }

      if (focusTarget === "tracking") {
        trackingInputRef.current?.focus();
        trackingInputRef.current?.select();
        return;
      }

      barcodeInputRef.current?.focus();
    }, 50);
  };

  const resetForm = ({ preserveMessage = false } = {}) => {
    if (!preserveMessage) {
      setMessage("");
    }

    setOrder(null);
    setScannedItems([]);
    setTrackingNumber("");
    setScannedBarcode("");
    setCanSubmitByEnter(false);
    skuMetaCacheRef.current = {};
    focusTrackingInput();
  };

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

    const targetSound = soundMap[type];
    if (!targetSound) {
      return;
    }

    const audio = new Audio(targetSound);
    audio.play();
  };

  const getSkuMetadata = async (sku, fallbackRow = null) => {
    if (skuMetaCacheRef.current[sku]) {
      return skuMetaCacheRef.current[sku];
    }

    try {
      const response = await API.get(`/packing-random/sku/${encodeURIComponent(sku)}`);
      skuMetaCacheRef.current[sku] = response.data;
      return response.data;
    } catch (error) {
      const fallbackMetadata = {
        sku,
        sku_id: null,
        resolved_sku: null,
        product_name:
          fallbackRow?.product_name ||
          fallbackRow?.actual_product_name ||
          fallbackRow?.original_product_name ||
          sku,
        image:
          fallbackRow?.image ||
          fallbackRow?.actual_image ||
          fallbackRow?.original_image ||
          null,
        stock_managed: false,
      };

      skuMetaCacheRef.current[sku] = fallbackMetadata;
      return fallbackMetadata;
    }
  };

  const handleSearchOrder = async () => {
    const tracking = trackingNumber.trim();
    if (!tracking) {
      return;
    }

    setLoading(true);
    setMessage("");
    setCanSubmitByEnter(false);

    try {
      const response = await API.get(
        `/packing-random/orders/tracking/${encodeURIComponent(tracking)}`
      );
      const orderData = response.data;

      setOrder(orderData);
      setScannedBarcode("");
      syncRowsState(buildInitialRows(orderData.items));
    } catch (error) {
      setOrder(null);
      setScannedItems([]);

      const msg = error.response?.data?.message || "Order tidak ditemukan";
      setMessage(msg);

      if (msg.toLowerCase().includes("packed")) {
        playSound("sudahpacking");
      } else {
        playSound("error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSerialChange = (segmentId, serialIndex, value) => {
    if (value.length > 9) {
      setMessage("❌ Nomor seri lebih dari 9 karakter!");
      playSound("noseri");
      return;
    }

    const updatedRows = scannedItems.map((row) => {
      if (row.segment_id !== segmentId) {
        return row;
      }

      const serials = [...row.serials];
      serials[serialIndex] = value;

      return {
        ...row,
        serials,
      };
    });

    syncRowsState(updatedRows);
  };

  const handleScanBarcode = async (e) => {
    e?.preventDefault();

    const barcode = scannedBarcode.trim();
    if (!barcode) {
      return;
    }

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

    const emptySerialRow = scannedItems.find((row) =>
      row.serials.some((serial) => !serial || serial.trim() === "")
    );

    if (emptySerialRow) {
      setMessage(
        `⚠️ Harap isi semua nomor seri pada baris ${emptySerialRow.actual_sku} sebelum scan barcode lain.`
      );
      playSound("isinoseri");
      setScannedBarcode("");
      return;
    }

    if (getDuplicateSerial(scannedItems)) {
      setMessage("⚠️ Ada nomor seri duplikat di layout. Rapikan dulu sebelum scan berikutnya.");
      playSound("error");
      return;
    }

    if (scannedItems.some((row) => row.serials.includes(nomorSeri))) {
      setMessage(`⚠️ Nomor seri ${nomorSeri} sudah pernah di-scan di order ini`);
      playSound("error");
      setScannedBarcode("");
      return;
    }

    let updatedRows = [...scannedItems];

    try {
      const matchingIndex = updatedRows.findIndex(
        (row) =>
          row.row_type === "order_item" &&
          row.scanned_qty < row.ordered_qty &&
          isSameSku(row.actual_sku, sku)
      );

      if (matchingIndex !== -1) {
        const targetRow = updatedRows[matchingIndex];
        const serials = [...targetRow.serials, nomorSeri];

        updatedRows[matchingIndex] = {
          ...targetRow,
          scanned_qty: targetRow.scanned_qty + 1,
          serials,
          status: targetRow.row_type === "bonus"
            ? "bonus"
            : isSameSku(targetRow.actual_sku, targetRow.original_sku)
              ? "sesuai"
              : "random",
        };

        setMessage(
          `✅ SKU ${sku} dengan nomor seri ${nomorSeri} berhasil discan (${updatedRows[matchingIndex].status})`
        );
        playSound("scanproduk");
      } else {
        const pendingIndex = updatedRows.findIndex(
          (row) => row.row_type === "order_item" && row.scanned_qty < row.ordered_qty
        );

        if (pendingIndex === -1) {
          const existingBonusIndex = updatedRows.findIndex(
            (row) => row.row_type === "bonus" && isSameSku(row.actual_sku, sku)
          );

          if (existingBonusIndex !== -1) {
            const bonusRow = updatedRows[existingBonusIndex];
            updatedRows[existingBonusIndex] = {
              ...bonusRow,
              scanned_qty: bonusRow.scanned_qty + 1,
              serials: [...bonusRow.serials, nomorSeri],
            };
          } else {
            const metadata = await getSkuMetadata(sku);
            updatedRows.push({
              segment_id: createSegmentId("bonus"),
              row_type: "bonus",
              order_item_id: null,
              original_sku: null,
              original_product_name: null,
              original_image: null,
              actual_sku: metadata.sku,
              actual_product_name: metadata.product_name || metadata.sku,
              actual_image: metadata.image || null,
              ordered_qty: 0,
              scanned_qty: 1,
              status: "bonus",
              serials: [nomorSeri],
            });
          }

          setMessage(`🎁 Bonus SKU ${sku} dengan nomor seri ${nomorSeri} berhasil ditambahkan`);
          playSound("success");
        } else {
          const targetRow = updatedRows[pendingIndex];
          const targetStatus = isSameSku(sku, targetRow.original_sku) ? "sesuai" : "random";
          const metadata =
            targetStatus === "sesuai"
              ? {
                  sku,
                  product_name: targetRow.original_product_name,
                  image: targetRow.original_image,
                }
              : await getSkuMetadata(sku, {
                  product_name: sku,
                  image: null,
                });

          if (targetRow.scanned_qty > 0) {
            const remainingQty = targetRow.ordered_qty - targetRow.scanned_qty;

            updatedRows[pendingIndex] = {
              ...targetRow,
              ordered_qty: targetRow.scanned_qty,
              status:
                isSameSku(targetRow.actual_sku, targetRow.original_sku) ? "sesuai" : "random",
            };

            updatedRows.splice(pendingIndex + 1, 0, {
              segment_id: createSegmentId(`split-${targetRow.order_item_id}`),
              row_type: "order_item",
              order_item_id: targetRow.order_item_id,
              original_sku: targetRow.original_sku,
              original_product_name: targetRow.original_product_name,
              original_image: targetRow.original_image,
              actual_sku: metadata.sku,
              actual_product_name: metadata.product_name || metadata.sku,
              actual_image: metadata.image || targetRow.original_image,
              ordered_qty: remainingQty,
              scanned_qty: 1,
              status: targetStatus,
              serials: [nomorSeri],
            });
          } else {
            updatedRows[pendingIndex] = {
              ...targetRow,
              actual_sku: metadata.sku,
              actual_product_name: metadata.product_name || metadata.sku,
              actual_image: metadata.image || targetRow.original_image,
              scanned_qty: 1,
              status: targetStatus,
              serials: [nomorSeri],
            };
          }

          if (targetStatus === "random") {
            setMessage(
              `⚠️ SKU order ${targetRow.original_sku} diganti menjadi ${sku}. Status baris menjadi random.`
            );
          } else {
            setMessage(`✅ SKU ${sku} dengan nomor seri ${nomorSeri} berhasil discan`);
          }
          playSound("scanproduk");
        }
      }

      setScannedBarcode("");
      syncRowsState(updatedRows);
    } catch (error) {
      const msg = error.response?.data?.message || "❌ SKU tidak ditemukan atau gagal diproses";
      setMessage(msg);
      playSound("error");
      setScannedBarcode("");
    }
  };

  const handleBarcodeInputKeyDown = (e) => {
    if (e.key !== "Enter") {
      return;
    }

    e.preventDefault();

    if (canSubmitByEnter && !scannedBarcode.trim()) {
      handleSubmitValidation();
      return;
    }

    handleScanBarcode();
  };

  const handleSubmitValidation = async () => {
    if (!order || isSubmittingValidation) {
      return;
    }

    const duplicateSerial = getDuplicateSerial(scannedItems);
    if (duplicateSerial) {
      setMessage(`⚠️ Nomor seri ${duplicateSerial} terdeteksi duplikat. Rapikan data dulu.`);
      playSound("error");
      return;
    }

    for (const row of scannedItems) {
      if (row.row_type === "order_item" && row.scanned_qty < row.ordered_qty) {
        setMessage(
          `⚠️ Baris SKU ${row.actual_sku} belum lengkap. Target ${row.ordered_qty}, scan ${row.scanned_qty}`
        );
        playSound("error");
        return;
      }

      if (row.serials.some((serial) => !serial || serial.trim() === "")) {
        setMessage(`⚠️ Ada nomor seri pada SKU ${row.actual_sku} yang masih kosong.`);
        playSound("error");
        return;
      }

      if (row.serials.length !== row.scanned_qty) {
        setMessage(`⚠️ Jumlah nomor seri SKU ${row.actual_sku} tidak sesuai qty scan.`);
        playSound("error");
        return;
      }
    }

    setIsSubmittingValidation(true);

    try {
      const payload = {
        items: scannedItems
          .filter((row) => row.scanned_qty > 0)
          .map((row) => ({
            order_item_id: row.row_type === "bonus" ? null : row.order_item_id,
            actual_sku: row.actual_sku,
            quantity: row.scanned_qty,
            status: row.row_type === "bonus" ? "bonus" : row.status === "random" ? "random" : "sesuai",
            serials: row.serials.filter((serial) => serial && serial.trim() !== ""),
          })),
      };

      const response = await API.post(
        `/packing-random/orders/scan/${encodeURIComponent(trackingNumber.trim())}`,
        payload
      );

      setMessage(response.data.message || "✅ Order berhasil divalidasi melalui packing random");
      playSound("validasiok");
      resetForm({ preserveMessage: true });
    } catch (error) {
      let errorMessage = "❌ Validasi packing random gagal";

      if (error.response?.data?.errors) {
        const errorList = Object.values(error.response.data.errors).flat();
        errorMessage = `❌ ${error.response.data.message || "Data tidak valid"}\n${errorList.join("\n")}`;
      } else if (error.response?.data?.message) {
        errorMessage = `❌ ${error.response.data.message}`;
      }

      setMessage(errorMessage);
      playSound("error");
    } finally {
      setIsSubmittingValidation(false);
    }
  };

  const totalOrderedQty = scannedItems
    .filter((row) => row.row_type === "order_item")
    .reduce((sum, row) => sum + Number(row.ordered_qty || 0), 0);

  const totalScannedQty = scannedItems
    .filter((row) => row.row_type === "order_item")
    .reduce((sum, row) => sum + Number(row.scanned_qty || 0), 0);

  const totalBonusQty = scannedItems
    .filter((row) => row.row_type === "bonus")
    .reduce((sum, row) => sum + Number(row.scanned_qty || 0), 0);

  return (
    <div className="pk-page pk-page-random">
      <div className="pk-shell">
        <section className="pk-content">
          <header className="pk-topbar">
            <div className="pk-title-group">
              <div className="pk-brand-icon">
                <FaQrcode />
              </div>
              <div>
                <h1>Packing Random</h1>
                <p>
                  Scan resi, ganti SKU yang habis dengan SKU random, lalu tambahkan bonus jika
                  diperlukan.
                </p>
              </div>
            </div>
          </header>

          <main className="pk-main">
            <section className="pk-card pk-search-card">
              <div className="pk-search-head">
                <h2>Cari Order</h2>
                <span>Masukkan tracking number untuk memulai proses packing random</span>
              </div>

              <div className="tracking-input-wrapper">
                <input
                  ref={trackingInputRef}
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
              </div>

              {message && <div className="packing-message">{message}</div>}
            </section>

            {order && (
              <>
                <section className="pk-kpi-grid">
                  <article className="pk-kpi-card">
                    <div className="pk-kpi-head">
                      <FiPackage /> Total Produk
                    </div>
                    <strong>{order.total_qty}</strong>
                    <small>item dalam order</small>
                  </article>
                  <article className="pk-kpi-card">
                    <div className="pk-kpi-head">
                      <FiCheckCircle /> Progress Scan
                    </div>
                    <strong>
                      {totalScannedQty} / {totalOrderedQty}
                    </strong>
                    <small>
                      {totalBonusQty > 0
                        ? `${totalBonusQty} item bonus sudah ditambahkan`
                        : "total scanned / ordered"}
                    </small>
                  </article>
                  <article className="pk-kpi-card">
                    <div className="pk-kpi-head">
                      <FiSearch /> Customer
                    </div>
                    <strong>{order.customer_name}</strong>
                    <small>{order.customer_phone}</small>
                  </article>
                </section>

                <section className="pk-card order-section">
                  <h2>Order #{order.order_number}</h2>
                  <p className="pk-order-meta">
                    <strong>Nama Customer:</strong> {order.customer_name} <br />
                    <strong>No. HP:</strong> {order.customer_phone} <br />
                    <strong>Total Produk:</strong> {order.total_qty}
                  </p>

                  <div className="pk-table-wrap">
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
                        {scannedItems.map((row) => {
                          const statusMeta = getStatusMeta(row);

                          return (
                            <tr key={row.segment_id}>
                              <td>
                                <span className="pk-cell-primary">{row.actual_sku}</span>
                                {row.status === "random" && row.original_sku && (
                                  <span className="pk-cell-note">
                                    Order asli: {row.original_sku}
                                  </span>
                                )}
                                {row.row_type === "bonus" && (
                                  <span className="pk-cell-note">Item bonus tambahan</span>
                                )}
                              </td>
                              <td>
                                <span className="pk-cell-primary">{row.actual_product_name}</span>
                                {row.status === "random" && row.original_product_name && (
                                  <span className="pk-cell-note">
                                    Produk order: {row.original_product_name}
                                  </span>
                                )}
                              </td>
                              <td className="qty-cell ordered">{row.ordered_qty}</td>
                              <td className="qty-cell scanned">{row.scanned_qty}</td>
                              <td>
                                {row.actual_image ? (
                                  <img
                                    src={row.actual_image}
                                    alt={row.actual_product_name}
                                    className="product-image"
                                  />
                                ) : (
                                  <span className="pk-cell-muted">No Image</span>
                                )}
                              </td>
                              <td>
                                {row.serials.length > 0 ? (
                                  <div className="pk-serial-list">
                                    {row.serials.map((serial, serialIndex) => (
                                      <input
                                        key={`${row.segment_id}-${serialIndex}`}
                                        type="text"
                                        value={serial}
                                        onChange={(e) =>
                                          handleSerialChange(
                                            row.segment_id,
                                            serialIndex,
                                            e.target.value
                                          )
                                        }
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="pk-cell-muted">Belum ada serial</span>
                                )}
                              </td>
                              <td>
                                <span className={statusMeta.className}>
                                  {statusMeta.icon}
                                  {statusMeta.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="sku-input-wrapper">
                    <label className="sku-label">Scan SPK CMT Barcode</label>

                    <form onSubmit={handleScanBarcode} className="sku-input">
                      <input
                        type="text"
                        placeholder="Scan SPK CMT Barcode..."
                        value={scannedBarcode}
                        onChange={(e) => setScannedBarcode(e.target.value)}
                        onKeyDown={handleBarcodeInputKeyDown}
                        ref={barcodeInputRef}
                        autoFocus
                      />
                      <button type="submit">Scan</button>
                    </form>
                  </div>

                  <div className="packing-actions">
                    <button
                      type="button"
                      ref={submitButtonRef}
                      className="btn-validate"
                      disabled={isSubmittingValidation}
                      onClick={handleSubmitValidation}
                    >
                      {isSubmittingValidation ? "Memvalidasi..." : "Submit Validasi Random"}
                    </button>

                    <button onClick={() => resetForm()} className="btn-cancel">
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

export default PackingRandom;

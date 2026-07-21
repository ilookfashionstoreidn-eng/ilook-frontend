import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Packing.css";
import "./Return.css";
import API from "../../api";
import { FaBarcode, FaCheck, FaUndo, FaWarehouse, FaBoxOpen } from "react-icons/fa";
import { FiPackage, FiSearch, FiUser, FiMapMarker } from "react-icons/fi";
import SkuHover from "../SkuHover";
import useGudangProdukWorkspace from "../Bahan/useGudangProdukWorkspace";
import { getAllSlots } from "../Bahan/GudangProdukMockStore";

const getErrorMessage = (error, fallback) => {
  if (error.response?.data?.errors) {
    return Object.values(error.response.data.errors).flat().join("\n");
  }

  return error.response?.data?.message || fallback;
};

const ReturnPage = () => {
  const [activeTab, setActiveTab] = useState("tracking"); // "tracking" | "product"

  // Tab 1: Tracking Number Scan State
  const [trackingNumber, setTrackingNumber] = useState("");
  const [lastScan, setLastScan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const trackingInputRef = useRef(null);

  // Tab 2: Product Return to Warehouse Scan State
  const { state, isLoading: workspaceLoading } = useGudangProdukWorkspace();
  const [layoutId, setLayoutId] = useState("");
  const [filterFloor, setFilterFloor] = useState("");
  const [filterBlock, setFilterBlock] = useState("");
  const [slotId, setSlotId] = useState("");
  const [productBarcode, setProductBarcode] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  const [productMessage, setProductMessage] = useState(null);
  const [scannedReturnProducts, setScannedReturnProducts] = useState([]);
  const productInputRef = useRef(null);

  const focusTrackingInput = () => {
    setTimeout(() => {
      trackingInputRef.current?.focus();
      trackingInputRef.current?.select();
    }, 50);
  };

  useEffect(() => {
    if (activeTab === "tracking") {
      focusTrackingInput();
    } else if (activeTab === "product") {
      setTimeout(() => productInputRef.current?.focus(), 50);
    }
  }, [activeTab]);

  useEffect(() => {
    if (state?.layouts?.length > 0 && !layoutId) {
      setLayoutId(String(state.layouts[0].id));
    }
  }, [state?.layouts, layoutId]);

  const allSlots = useMemo(() => getAllSlots(state), [state]);

  const selectedLayout = useMemo(
    () => state.layouts.find((l) => String(l.id) === String(layoutId)) || null,
    [layoutId, state.layouts]
  );

  const layoutSlots = useMemo(
    () =>
      selectedLayout
        ? allSlots.filter((slot) => String(slot.layoutId) === String(selectedLayout.id))
        : [],
    [allSlots, selectedLayout]
  );

  const layoutFloors = useMemo(() => {
    const map = new Map();
    layoutSlots.forEach((s) => map.set(String(s.floorId), s.floorLabel ? `Lantai ${s.floorNumber} (${s.floorLabel})` : `Lantai ${s.floorNumber}`));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [layoutSlots]);

  const layoutBlocks = useMemo(() => {
    const map = new Map();
    layoutSlots
      .filter((s) => !filterFloor || String(s.floorId) === String(filterFloor))
      .forEach((s) => map.set(String(s.blockId), s.blockLabel ? `Blok ${s.blockCode} (${s.blockLabel})` : `Blok ${s.blockCode}`));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [layoutSlots, filterFloor]);

  const filteredSlots = useMemo(() => {
    return layoutSlots.filter((s) => {
      if (filterFloor && String(s.floorId) !== String(filterFloor)) return false;
      if (filterBlock && String(s.blockId) !== String(filterBlock)) return false;
      return true;
    });
  }, [layoutSlots, filterFloor, filterBlock]);

  const handleScanReturn = async (event) => {
    event?.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage(null);

    try {
      let finalTrackingNumber = trackingNumber.trim();
      if (finalTrackingNumber.toUpperCase().endsWith("-RET")) {
        finalTrackingNumber = finalTrackingNumber.substring(0, finalTrackingNumber.length - 4);
      }

      const response = await API.post("/returns/scan", {
        tracking_number: finalTrackingNumber || null,
      });
      const payload = response.data?.data || {};

      setLastScan({
        order: payload.order ?? null,
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

  const handleScanReturnProduct = async (event) => {
    event?.preventDefault();
    if (productLoading || !slotId) return;

    const finalBarcode = productBarcode.trim();
    if (!finalBarcode) return;

    setProductLoading(true);
    setProductMessage(null);

    try {
      const response = await API.post("/returns/scan-product", {
        barcode: finalBarcode,
        layout_id: layoutId,
        slot_id: slotId,
      });

      const payload = response.data?.data || {};
      setProductBarcode("");
      setProductMessage({
        type: "success",
        text: response.data?.message || "Produk return berhasil dikembalikan ke gudang.",
      });

      setScannedReturnProducts((prev) => [
        {
          id: Date.now() + Math.random(),
          time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          barcode: payload.barcode || finalBarcode,
          kodeSeri: payload.kode_seri && payload.nomor_seri && payload.nomor_seri !== "-" ? `${payload.kode_seri}.${payload.nomor_seri}` : payload.kode_seri || finalBarcode,
          sku: payload.sku || "-",
          produk: payload.produk || "-",
          slot: payload.slot || slotId,
          qty: payload.qty || 1,
        },
        ...prev,
      ]);
    } catch (error) {
      setProductMessage({
        type: "error",
        text: getErrorMessage(error, "Gagal mengembalikan produk ke gudang."),
      });
    } finally {
      setProductLoading(false);
      setTimeout(() => {
        productInputRef.current?.focus();
        productInputRef.current?.select();
      }, 50);
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
                <h1>Return & Masuk Gudang</h1>
                <p>Scan tracking number untuk mencatat return atau scan barcode produk untuk dikembalikan ke rak gudang.</p>
              </div>
            </div>
          </header>

          <main className="pk-main">
            <div className="return-tabs">
              <button
                type="button"
                className={`return-tab-btn ${activeTab === "tracking" ? "active" : ""}`}
                onClick={() => setActiveTab("tracking")}
              >
                <FiSearch className="tab-icon" /> Scan Resi / Order Return
              </button>
              <button
                type="button"
                className={`return-tab-btn ${activeTab === "product" ? "active" : ""}`}
                onClick={() => setActiveTab("product")}
              >
                <FaWarehouse className="tab-icon" /> Scan Produk Return ke Gudang
              </button>
            </div>

            {activeTab === "tracking" && (
              <>
                <section className="pk-card pk-search-card">
                  <div className="pk-search-head">
                    <h2>Scan Return (Tracking Number)</h2>
                    <span>Input akan reset otomatis setelah tracking berhasil dicatat</span>
                  </div>

                  <form onSubmit={handleScanReturn} className="tracking-input-wrapper">
                    <input
                      ref={trackingInputRef}
                      type="text"
                      placeholder="Scan / masukkan Tracking Number (opsional)..."
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
                                  <SkuHover img={item.image} name={item.product_name || item.sku} label="" />
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
              </>
            )}

            {activeTab === "product" && (
              <>
                <section className="pk-card pk-search-card" style={{ marginBottom: 20 }}>
                  <div className="pk-search-head">
                    <h2>1. Pilih Rak / Slot Tujuan Gudang</h2>
                    <span>Tentukan lokasi rak gudang tempat produk return akan disimpan</span>
                  </div>

                  {workspaceLoading ? (
                    <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Memuat data gudang...</div>
                  ) : (
                    <>
                      <div className="return-location-grid">
                        <div className="gudang-ui-field" style={{ margin: 0 }}>
                          <label>Gudang / Layout</label>
                          <select
                            className="return-select-modern"
                            value={layoutId}
                            onChange={(e) => {
                              setLayoutId(e.target.value);
                              setFilterFloor("");
                              setFilterBlock("");
                              setSlotId("");
                            }}
                          >
                            <option value="">-- Pilih Gudang --</option>
                            {state.layouts.map((l) => (
                              <option key={l.id} value={l.id}>{l.name || l.uid || `Gudang #${l.id}`}</option>
                            ))}
                          </select>
                        </div>

                        <div className="gudang-ui-field" style={{ margin: 0 }}>
                          <label>Lantai</label>
                          <select
                            className="return-select-modern"
                            value={filterFloor}
                            onChange={(e) => {
                              setFilterFloor(e.target.value);
                              setFilterBlock("");
                              setSlotId("");
                            }}
                            disabled={!layoutId}
                          >
                            <option value="">Semua Lantai</option>
                            {layoutFloors.map((f) => (
                              <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="gudang-ui-field" style={{ margin: 0 }}>
                          <label>Blok</label>
                          <select
                            className="return-select-modern"
                            value={filterBlock}
                            onChange={(e) => {
                              setFilterBlock(e.target.value);
                              setSlotId("");
                            }}
                            disabled={!layoutId}
                          >
                            <option value="">Semua Blok</option>
                            {layoutBlocks.map((b) => (
                              <option key={b.id} value={b.id}>{b.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="gudang-ui-field" style={{ marginTop: 14, marginBottom: 0 }}>
                        <label>Slot / Rak Tujuan</label>
                        <select
                          className="return-select-modern"
                          style={{ borderColor: slotId ? "#0f766e" : "#cbd5e1", fontWeight: slotId ? 700 : 400 }}
                          value={slotId}
                          onChange={(e) => setSlotId(e.target.value)}
                          disabled={!layoutId}
                        >
                          <option value="">{layoutId ? "-- Pilih Rak / Slot Tujuan --" : "Pilih gudang terlebih dahulu"}</option>
                          {filteredSlots.map((s) => (
                            <option key={s.id} value={s.id}>{s.slotCode}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </section>

                <section className="pk-card pk-search-card">
                  <div className="pk-search-head">
                    <h2>2. Scan Barcode Produk Return ke Gudang</h2>
                    <span>Produk yang sudah discan masuk dan pernah dipacking kini dapat discan kembali ke gudang</span>
                  </div>

                  <form onSubmit={handleScanReturnProduct} className="tracking-input-wrapper">
                    <input
                      ref={productInputRef}
                      type="text"
                      placeholder={slotId ? "Scan / masukkan Barcode atau Kode Seri Produk..." : "Pilih Slot/Rak tujuan terlebih dahulu..."}
                      value={productBarcode}
                      onChange={(event) => setProductBarcode(event.target.value)}
                      disabled={!slotId || productLoading}
                      autoFocus
                      className="tracking-input-modern"
                    />
                    <button
                      type="submit"
                      disabled={!slotId || productLoading}
                      className="btn-search-modern"
                      style={{ background: !slotId ? "#94a3b8" : "" }}
                    >
                      {productLoading ? "Menyimpan..." : "Masuk Gudang"}
                    </button>
                  </form>

                  {productMessage && (
                    <div className={`return-message is-${productMessage.type}`}>
                      {productMessage.text}
                    </div>
                  )}
                </section>

                {scannedReturnProducts.length > 0 && (
                  <section className="pk-card order-section return-order-section" style={{ marginTop: 20 }}>
                    <div className="return-order-head">
                      <div>
                        <h2>Riwayat Scan Produk Return (Sesi Ini)</h2>
                        <p>Daftar produk return yang telah berhasil discan dan ditambahkan ke stok rak gudang</p>
                      </div>
                      <span className="return-badge">
                        <FaBoxOpen /> {scannedReturnProducts.length} Produk
                      </span>
                    </div>

                    <div className="pk-table-wrap">
                      <table className="packing-table return-table">
                        <thead>
                          <tr>
                            <th>Waktu</th>
                            <th>Kode Seri / Barcode</th>
                            <th>SKU</th>
                            <th>Nama Produk</th>
                            <th>Slot Tujuan</th>
                            <th>QTY</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scannedReturnProducts.map((item) => (
                            <tr key={item.id}>
                              <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>{item.time}</td>
                              <td><strong style={{ color: "#0f766e" }}>{item.kodeSeri}</strong></td>
                              <td>{item.sku}</td>
                              <td>{item.produk}</td>
                              <td><span className="return-badge" style={{ padding: "4px 10px", fontSize: 12 }}>{item.slot}</span></td>
                              <td className="qty-cell ordered">+{item.qty}</td>
                              <td>
                                <span className="status-ok">
                                  <FaCheck /> Masuk Gudang
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </>
            )}
          </main>
        </section>
      </div>
    </div>
  );
};

export default ReturnPage;

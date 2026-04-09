import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { FaQrcode, FaTrash } from "react-icons/fa";
import { FiCheckCircle, FiPackage, FiUser } from "react-icons/fi";
import API from "../../api";
import "./Packing.css";

const normalizeTrackingNumber = (value = "") => value.trim();
const SCANNER_HISTORY_STORAGE_KEY = "packing-belum-barcode:scanner-history";
const MAX_SCANNER_HISTORY = 10;

const getSavedScannerNames = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(SCANNER_HISTORY_STORAGE_KEY);
    const parsedValue = JSON.parse(rawValue || "[]");

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    const seenNames = new Set();

    return parsedValue
      .map((name) => String(name || "").trim())
      .filter((name) => {
        const normalizedName = name.toLowerCase();

        if (!name || seenNames.has(normalizedName)) {
          return false;
        }

        seenNames.add(normalizedName);
        return true;
      })
      .slice(0, MAX_SCANNER_HISTORY);
  } catch (error) {
    return [];
  }
};

const storeSavedScannerNames = (scannerNames) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      SCANNER_HISTORY_STORAGE_KEY,
      JSON.stringify(scannerNames)
    );
  } catch (error) {
    // Ignore localStorage write failures and keep the flow running.
  }
};

const addScannerNameToHistory = (scannerNames, nextScannerName) => {
  const normalizedName = String(nextScannerName || "").trim();

  if (!normalizedName) {
    return scannerNames;
  }

  return [
    normalizedName,
    ...scannerNames.filter(
      (scannerName) => scannerName.trim().toLowerCase() !== normalizedName.toLowerCase()
    ),
  ].slice(0, MAX_SCANNER_HISTORY);
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

const scannerPromptSwalClass = {
  popup: "pk-bb-swal-popup",
  htmlContainer: "pk-bb-swal-html",
  confirmButton: "pk-bb-swal-confirm",
  cancelButton: "pk-bb-swal-cancel",
};

const PackingBelumBarcode = () => {
  const navigate = useNavigate();
  const trackingInputRef = useRef(null);
  const hasRequestedInitialScannerRef = useRef(false);

  const [savedScannerNames, setSavedScannerNames] = useState(getSavedScannerNames);
  const [scannerName, setScannerName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [scannedOrders, setScannedOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isPromptingScanner, setIsPromptingScanner] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(true);

  const totalTrackedOrders = scannedOrders.length;
  const totalTrackedItems = scannedOrders.reduce(
    (sum, order) => sum + Number(order.total_qty || 0),
    0
  );
  const messageTone = getMessageTone(message);

  const playSound = (type) => {
    const soundMap = {
      success: "/sounds/success.mp3",
      error: "/sounds/failed.mp3",
      scanproduk: "/sounds/scanprodukberhasil.mp3",
      validasiok: "/sounds/validasiberhasil.mp3",
    };

    const targetSound = soundMap[type];

    if (!targetSound) {
      return;
    }

    const audio = new Audio(targetSound);
    audio.play().catch(() => {
      // Ignore autoplay failures so scan flow stays responsive.
    });
  };

  const focusTrackingInput = () => {
    setTimeout(() => {
      trackingInputRef.current?.focus();
      trackingInputRef.current?.select();
    }, 50);
  };

  useEffect(() => {
    storeSavedScannerNames(savedScannerNames);
  }, [savedScannerNames]);

  const requestScannerName = async () => {
    if (isPromptingScanner) {
      return null;
    }

    setIsPromptingScanner(true);

    try {
      const selectId = "pk-bb-scanner-select";
      const inputId = "pk-bb-scanner-input";
      const defaultSelectedName =
        savedScannerNames.find(
          (savedName) => savedName.toLowerCase() === String(scannerName || "").trim().toLowerCase()
        ) || savedScannerNames[0] || "";

      const result = await Swal.fire({
        title: "Nama Scanner",
        text: "Isi nama scanner terlebih dahulu sebelum mulai scan tracking number.",
        html: `
          <div class="pk-bb-swal-body">
            ${
              savedScannerNames.length > 0
                ? `
                  <div class="pk-bb-swal-field">
                    <label class="pk-bb-swal-label" for="${selectId}">Pilih nama yang sudah pernah dipakai</label>
                    <select id="${selectId}" class="pk-bb-swal-select">
                      <option value="">Pilih scanner...</option>
                      ${savedScannerNames
                        .map(
                          (savedName) => `
                            <option value="${escapeHtml(savedName)}"${
                              savedName === defaultSelectedName ? " selected" : ""
                            }>${escapeHtml(savedName)}</option>
                          `
                        )
                        .join("")}
                    </select>
                  </div>
                `
                : ""
            }
            <div class="pk-bb-swal-field">
              <label class="pk-bb-swal-label" for="${inputId}">Atau isi nama scanner baru</label>
              <input
                id="${inputId}"
                class="pk-bb-swal-input"
                placeholder="Contoh: Budi"
                value="${escapeHtml(scannerName)}"
              />
            </div>
          </div>
        `,
        showCancelButton: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: "Mulai Scan",
        cancelButtonText: "Batal",
        buttonsStyling: false,
        customClass: scannerPromptSwalClass,
        didOpen: () => {
          const popup = Swal.getPopup();
          const selectElement = popup?.querySelector(`#${selectId}`);
          const inputElement = popup?.querySelector(`#${inputId}`);

          if (selectElement && inputElement) {
            selectElement.addEventListener("change", () => {
              if (!String(inputElement.value || "").trim()) {
                inputElement.value = String(selectElement.value || "").trim();
              }
            });
          }

          if (inputElement) {
            inputElement.focus();
            inputElement.select();
          }
        },
        preConfirm: () => {
          const popup = Swal.getPopup();
          const selectElement = popup?.querySelector(`#${selectId}`);
          const inputElement = popup?.querySelector(`#${inputId}`);
          const typedName = String(inputElement?.value || "").trim();
          const selectedName = String(selectElement?.value || "").trim();
          const resolvedName = typedName || selectedName;

          if (!resolvedName) {
            Swal.showValidationMessage("Nama scanner wajib diisi");
            return false;
          }

          return resolvedName;
        },
      });

      if (!result.isConfirmed) {
        navigate("/packing");
        return null;
      }

      const confirmedScannerName = String(result.value || "").trim();
      setSavedScannerNames((prevNames) =>
        addScannerNameToHistory(prevNames, confirmedScannerName)
      );
      setScannerName(confirmedScannerName);
      setIsSessionLocked(false);
      focusTrackingInput();
      return confirmedScannerName;
    } finally {
      setIsPromptingScanner(false);
    }
  };

  useEffect(() => {
    if (hasRequestedInitialScannerRef.current) {
      return;
    }

    hasRequestedInitialScannerRef.current = true;

    if (!scannerName) {
      requestScannerName();
      return;
    }

    setIsSessionLocked(false);
    focusTrackingInput();
  }, [scannerName]);

  useEffect(() => {
    if (scannerName && !isSessionLocked) {
      focusTrackingInput();
    }
  }, [scannerName, isSessionLocked]);

  const lockSession = ({ nextMessage = "" } = {}) => {
    setScannerName("");
    setTrackingNumber("");
    setScannedOrders([]);
    setMessage(nextMessage);
    setIsSessionLocked(true);
  };

  const handleUnlockSession = async () => {
    await requestScannerName();
  };

  const handleChangeScanner = async () => {
    lockSession();
    await requestScannerName();
  };

  const handleScanTracking = async () => {
    const normalizedTracking = normalizeTrackingNumber(trackingNumber);

    if (!normalizedTracking) {
      focusTrackingInput();
      return;
    }

    let activeScannerName = scannerName;

    if (isSessionLocked || !activeScannerName) {
      activeScannerName = await requestScannerName();
    }

    if (!activeScannerName) {
      return;
    }

    if (
      scannedOrders.some(
        (order) => normalizeTrackingNumber(order.tracking_number) === normalizedTracking
      )
    ) {
      playSound("error");
      setTrackingNumber("");
      setMessage(`WARNING: Tracking number ${normalizedTracking} sudah ada di daftar sesi ini.`);
      focusTrackingInput();
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await API.get(
        `/packing-belum-barcode/orders/tracking/${encodeURIComponent(normalizedTracking)}`
      );

      setScannedOrders((prevOrders) => [response.data, ...prevOrders]);
      playSound("scanproduk");
      setMessage(`OK: Tracking number ${normalizedTracking} berhasil ditambahkan ke sesi scan.`);
    } catch (error) {
      playSound("error");
      setMessage(formatErrorMessage(error, "Gagal mengambil data order"));
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
    setMessage(`INFO: Tracking number ${trackingToRemove} dihapus dari sesi scan.`);
    focusTrackingInput();
  };

  const handleSubmit = async () => {
    if (!scannerName || scannedOrders.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await API.post("/packing-belum-barcode/orders/submit", {
        scanner_name: scannerName,
        tracking_numbers: scannedOrders.map((order) => order.tracking_number),
      });

      const successMessage =
        response.data.message ||
        "Semua tracking number berhasil dicatat melalui packing belum barcode";

      lockSession({
        nextMessage: `OK: ${successMessage}\nMasukkan nama scanner lagi untuk memulai sesi scan berikutnya.`,
      });
      playSound("validasiok");

      await Swal.fire({
        icon: "success",
        title: "Submit Berhasil",
        text: successMessage,
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          popup: "pk-bb-swal-popup",
          confirmButton: "pk-bb-swal-confirm",
        },
      });
    } catch (error) {
      playSound("error");
      setMessage(
        formatErrorMessage(error, "Submit scan produk belum barcode gagal")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pk-page pk-page-belum-barcode">
      <div className="pk-shell">
        <section className="pk-content">
          <header className="pk-topbar">
            <div className="pk-title-group">
              <div className="pk-brand-icon">
                <FaQrcode />
              </div>
              <div>
                <h1>Produk Belum Barcode</h1>
                <p>
                  Scan tracking number satu per satu tanpa barcode seri, kumpulkan
                  dalam satu sesi, lalu submit sekaligus.
                </p>
              </div>
            </div>
          </header>

          <main className="pk-main">
            <section className="pk-card pk-session-banner">
              <div className="pk-session-meta">
                <span className="pk-session-label">Scanner Aktif</span>
                <strong className="pk-session-value">
                  {scannerName || "Menunggu nama scanner"}
                </strong>
                
              </div>

              <button
                type="button"
                className="btn-cancel"
                onClick={scannerName ? handleChangeScanner : handleUnlockSession}
                disabled={loading || isSubmitting}
              >
                {scannerName ? "Ganti Scanner" : "Masukkan Nama Scanner"}
              </button>
            </section>

            <section className="pk-kpi-grid">
              <article className="pk-kpi-card">
                <div className="pk-kpi-head">
                  <FiUser /> Scanner
                </div>
                <strong>{scannerName || "-"}</strong>
                <small>nama yang sedang digunakan pada sesi ini</small>
              </article>
              <article className="pk-kpi-card">
                <div className="pk-kpi-head">
                  <FiCheckCircle /> Tracking Terscan
                </div>
                <strong>{totalTrackedOrders}</strong>
                <small>jumlah tracking number di sesi berjalan</small>
              </article>
              <article className="pk-kpi-card">
                <div className="pk-kpi-head">
                  <FiPackage /> Total Produk
                </div>
                <strong>{totalTrackedItems}</strong>
                <small>akumulasi qty order yang siap disubmit</small>
              </article>
            </section>

            <section className="pk-card pk-search-card">
              <div className="pk-search-head">
                <h2>Scan Tracking Number</h2>
                <span>
                  Setelah satu tracking sukses discan, input akan otomatis kosong dan
                  siap dipakai lagi untuk scan berikutnya.
                </span>
              </div>

              {isSessionLocked && (
                <div className="pk-session-lock">
                  <div className="pk-session-lock-copy">
                    <strong>Sesi scan belum aktif</strong>
                    <span>
                      Masukkan nama scanner terlebih dahulu, lalu lanjut scan
                      tracking number satu per satu tanpa barcode seri atau SPK
                      CMT.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-search-modern"
                    onClick={handleUnlockSession}
                    disabled={loading || isSubmitting || isPromptingScanner}
                  >
                    Masukkan Nama Scanner
                  </button>
                </div>
              )}

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
                  disabled={loading || isSubmitting || !scannerName || isSessionLocked}
                />

                <button
                  type="button"
                  onClick={handleScanTracking}
                  disabled={loading || isSubmitting || !scannerName || isSessionLocked}
                  className="btn-search-modern"
                >
                  {loading ? "Memproses..." : "Tambah Tracking"}
                </button>
              </div>

              <div className="packing-actions pk-bb-scan-actions">
                <button
                  type="button"
                  className="btn-validate"
                  disabled={isSubmitting || scannedOrders.length === 0}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? "Mengirim..." : "Submit Sesi Scan"}
                </button>

                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => lockSession()}
                  disabled={loading || isSubmitting}
                >
                  Batal Sesi
                </button>
              </div>

              {message && (
                <div className={`packing-message packing-message-${messageTone}`}>
                  {message}
                </div>
              )}
            </section>

            <section className="pk-card order-section">
              <h2>Rekap Sesi Scan</h2>
              <p className="pk-order-meta">
                <strong>Scanner:</strong> {scannerName || "-"} <br />
                <strong>Total Tracking:</strong> {totalTrackedOrders} <br />
                <strong>Total Produk:</strong> {totalTrackedItems}
              </p>

              {scannedOrders.length === 0 ? (
                <div className="pk-empty-session">
                  Belum ada tracking number yang discan pada sesi ini.
                </div>
              ) : (
                <div className="pk-bb-order-list">
                  {scannedOrders.map((order) => {
                    const orderItems = Array.isArray(order.items) ? order.items : [];

                    return (
                      <div key={order.tracking_number} className="pk-bb-order-card">
                        <h3>Order #{order.order_number}</h3>

                        <div className="pk-table-wrap">
                          <table className="packing-table pk-bb-detail-table">
                            <thead>
                              <tr>
                                <th>SKU</th>
                                <th>Nama Produk</th>
                                <th>Qty Pesanan</th>
                                <th>Tracking Number</th>
                                <th>Gambar</th>
                                <th>Status</th>
                                <th>Aksi Hapus</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderItems.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="pk-empty-table">
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
                                    <td>
                                      <span className="pk-cell-primary">{item.sku || "-"}</span>
                                    </td>
                                    <td>
                                      <span className="pk-cell-primary">
                                        {item.product_name || "-"}
                                      </span>
                                    </td>
                                    <td className="qty-cell ordered">{item.quantity || 0}</td>
                                    {itemIndex === 0 && (
                                      <td
                                        className="pk-bb-tracking-cell"
                                        rowSpan={orderItems.length}
                                      >
                                        <span className="pk-cell-primary">
                                          {order.tracking_number || "-"}
                                        </span>
                                      </td>
                                    )}
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
                                      <span className="pk-status-pill pk-status-sesuai">
                                        <FiCheckCircle /> Siap Submit
                                      </span>
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

export default PackingBelumBarcode;

import React, { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { FaTrash } from "react-icons/fa";
import { FiAlertTriangle, FiCheckCircle, FiPackage, FiSearch, FiUser } from "react-icons/fi";
import API from "../../api";

const normalizeTrackingNumber = (value = "") => value.trim();
const normalizeSku = (value = "") => value.trim().replace(/\s+/g, " ").toUpperCase();
const normalizeSerialNumber = (value = "") => value.trim();
const hasSerialBarcodeSeparator = (value = "") => String(value || "").includes("|");

const getMessageTone = (value = "") => {
  const normalizedValue = String(value || "").trim().toUpperCase();

  if (
    normalizedValue.startsWith("WARNING:") ||
    normalizedValue.startsWith("ERROR:")
  ) {
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

const parseSerialBarcodeValue = (value = "") => {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return { error: "Format barcode tidak valid. Format harus: SKU | NOMOR_SERI" };
  }

  const parts = rawValue.split("|").map((part) => part.trim());

  if (parts.length !== 2) {
    return { error: "Format barcode tidak valid. Format harus: SKU | NOMOR_SERI" };
  }

  const actualSku = normalizeSku(parts[0]);
  const serialNumber = normalizeSerialNumber(parts[1]);

  if (!actualSku || !serialNumber) {
    return { error: "SKU atau nomor seri tidak boleh kosong" };
  }

  return { actualSku, serialNumber };
};

const formatReconciliationStatus = (status = "") => {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (normalizedStatus === "reconciled") {
    return "sudah direkonsiliasi";
  }

  if (normalizedStatus === "needs_review") {
    return "perlu review";
  }

  if (normalizedStatus === "pending_order") {
    return "menunggu order";
  }

  if (normalizedStatus === "pending_reconciliation") {
    return "menunggu rekonsiliasi";
  }

  if (normalizedStatus === "skipped_already_packed") {
    return "order sudah packed";
  }

  if (normalizedStatus === "failed") {
    return "rekonsiliasi gagal";
  }

  return normalizedStatus || "-";
};

const buildSerialSubmitMessage = (data = {}) => {
  const parts = [];

  if (data.message) {
    parts.push(`OK: ${data.message}`);
  }

  if (data.notes) {
    parts.push(data.notes);
  }

  if (data.summary) {
    const {
      sesuai = 0,
      random = 0,
      bonus = 0,
      total_order_qty = 0,
      captured_order_qty = 0,
    } = data.summary;

    parts.push(
      `Ringkasan: ${sesuai} sesuai, ${random} random, ${bonus} bonus, ${captured_order_qty}/${total_order_qty} item order tercocokkan.`
    );
  }

  return parts.filter(Boolean).join("\n");
};

const PackingNoDataGineeSerialMode = ({
  scannerName,
  isSessionLocked,
  isPromptingScanner,
  onUnlockSession,
}) => {
  const trackingInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const barcodeAutoScanTimeoutRef = useRef(null);
  const barcodeInputStartedAtRef = useRef(0);
  const barcodeLastInputAtRef = useRef(0);
  const barcodeChangeCountRef = useRef(0);
  const isAutoProcessingBarcodeRef = useRef(false);

  const [trackingNumber, setTrackingNumber] = useState("");
  const [activeTrackingNumber, setActiveTrackingNumber] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [scannedItems, setScannedItems] = useState([]);
  const [orderPreview, setOrderPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const messageTone = getMessageTone(message);

  const playSound = (type) => {
    const soundMap = {
      success: "/sounds/success.mp3",
      error: "/sounds/failed.mp3",
      scanproduk: "/sounds/scanprodukberhasil.mp3",
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

  const focusBarcodeInput = () => {
    setTimeout(() => {
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    }, 50);
  };

  const clearBarcodeAutoScanTimeout = () => {
    if (barcodeAutoScanTimeoutRef.current) {
      clearTimeout(barcodeAutoScanTimeoutRef.current);
      barcodeAutoScanTimeoutRef.current = null;
    }
  };

  const resetBarcodeTypingMeta = ({ keepProcessingLock = false } = {}) => {
    clearBarcodeAutoScanTimeout();
    barcodeInputStartedAtRef.current = 0;
    barcodeLastInputAtRef.current = 0;
    barcodeChangeCountRef.current = 0;

    if (!keepProcessingLock) {
      isAutoProcessingBarcodeRef.current = false;
    }
  };

  const handleBarcodeChange = (nextValue) => {
    const nextRawValue = String(nextValue || "");
    const now = Date.now();

    if (!nextRawValue.trim()) {
      resetBarcodeTypingMeta();
      setBarcodeValue(nextRawValue);
      return;
    }

    if (!barcodeInputStartedAtRef.current) {
      barcodeInputStartedAtRef.current = now;
      barcodeChangeCountRef.current = 0;
    }

    barcodeChangeCountRef.current += 1;
    barcodeLastInputAtRef.current = now;
    setBarcodeValue(nextRawValue);
  };

  const shouldAutoProcessBarcode = (rawValue) => {
    const normalizedValue = String(rawValue || "").trim();

    if (
      !normalizedValue ||
      !activeTrackingNumber ||
      loading ||
      isSubmitting ||
      isSessionLocked ||
      isAutoProcessingBarcodeRef.current
    ) {
      return false;
    }

    const parsedBarcode = parseSerialBarcodeValue(normalizedValue);
    const isSerialBarcode = !parsedBarcode.error;
    const isNonSerialSubmitTrigger =
      scannedItems.length > 0 && !hasSerialBarcodeSeparator(normalizedValue);

    if (!isSerialBarcode && !isNonSerialSubmitTrigger) {
      return false;
    }

    const inputStartedAt = barcodeInputStartedAtRef.current;
    const lastInputAt = barcodeLastInputAtRef.current || Date.now();
    const changeCount = barcodeChangeCountRef.current;
    const duration = inputStartedAt ? Math.max(lastInputAt - inputStartedAt, 0) : 0;
    const averageInterval =
      changeCount > 1 ? duration / Math.max(changeCount - 1, 1) : duration;

    if (changeCount <= 1) {
      return duration <= 50;
    }

    return averageInterval <= 35;
  };

  useEffect(() => {
    if (scannerName && !isSessionLocked) {
      if (activeTrackingNumber) {
        focusBarcodeInput();
        return;
      }

      focusTrackingInput();
    }
  }, [scannerName, isSessionLocked, activeTrackingNumber]);

  useEffect(() => () => {
    clearBarcodeAutoScanTimeout();
  }, []);

  const resetSession = ({ preserveMessage = false } = {}) => {
    if (!preserveMessage) {
      setMessage("");
    }

    resetBarcodeTypingMeta();
    setTrackingNumber("");
    setActiveTrackingNumber("");
    setBarcodeValue("");
    setScannedItems([]);
    setOrderPreview(null);
  };

  const handleStartSession = async (
    incomingTrackingNumber = trackingNumber,
    { clearMessage = true } = {}
  ) => {
    const normalizedTracking = normalizeTrackingNumber(incomingTrackingNumber);

    if (!normalizedTracking) {
      focusTrackingInput();
      return { success: false, message: "" };
    }

    setLoading(true);

    if (clearMessage) {
      setMessage("");
    }

    try {
      const response = await API.get(
        `/packing-no-data-ginee/check/${encodeURIComponent(normalizedTracking)}`
      );
      const nextOrderPreview = response.data?.order || null;

      if (nextOrderPreview?.is_packed) {
        const nextMessage = `WARNING: Order #${nextOrderPreview.order_number} sudah packed dan tidak bisa diproses lewat mode serial No Data Ginee.`;
        playSound("error");
        setTrackingNumber(normalizedTracking);
        setMessage(nextMessage);
        focusTrackingInput();
        return { success: false, message: nextMessage };
      }

      const nextMessage = nextOrderPreview
        ? `INFO: Order #${nextOrderPreview.order_number} sudah ditemukan. Lanjut scan SKU | nomor seri, lalu submit untuk rekonsiliasi otomatis.`
        : "INFO: Data order belum ada di Ginee. Scan SKU | nomor seri tetap bisa dilakukan, lalu status akan menyesuaikan saat order masuk.";

      setTrackingNumber(normalizedTracking);
      setActiveTrackingNumber(normalizedTracking);
      setBarcodeValue("");
      setScannedItems([]);
      setOrderPreview(nextOrderPreview);
      setMessage(nextMessage);
      focusBarcodeInput();
      return { success: true, message: nextMessage };
    } catch (error) {
      playSound("error");
      const data = error?.response?.data;
      let nextMessage = "";

      if (error?.response?.status === 409) {
        const statusText = data?.reconciliation_status
          ? ` Status saat ini: ${formatReconciliationStatus(data.reconciliation_status)}.`
          : "";
        const orderText = data?.order?.order_number
          ? ` Order terkait: #${data.order.order_number}.`
          : "";

        nextMessage = `WARNING: ${data?.message || "Tracking number sudah pernah discan."}${statusText}${orderText}`;
      } else {
        nextMessage = formatErrorMessage(
          error,
          "Gagal memulai sesi serial No Data Ginee"
        );
      }

      setTrackingNumber(normalizedTracking);
      setMessage(nextMessage);
      focusTrackingInput();
      return { success: false, message: nextMessage };
    } finally {
      setLoading(false);
    }
  };

  const handleScanBarcode = async (incomingBarcodeValue = barcodeValue) => {
    clearBarcodeAutoScanTimeout();

    if (!activeTrackingNumber) {
      focusTrackingInput();
      return;
    }

    const currentBarcodeValue = String(incomingBarcodeValue || "");
    const nextTrackingCandidate = normalizeTrackingNumber(currentBarcodeValue);
    const parsedBarcode = parseSerialBarcodeValue(currentBarcodeValue);

    if (
      parsedBarcode.error &&
      scannedItems.length > 0 &&
      nextTrackingCandidate &&
      !hasSerialBarcodeSeparator(currentBarcodeValue)
    ) {
      await handleAutoSubmitFromNonSerialBarcode(nextTrackingCandidate);
      return;
    }

    if (parsedBarcode.error) {
      playSound("error");
      setMessage(`ERROR: ${parsedBarcode.error}`);
      setBarcodeValue("");
      focusBarcodeInput();
      return;
    }

    const isDuplicateSerial = scannedItems.some(
      (item) =>
        normalizeSerialNumber(item.serial_number).toLowerCase() ===
        parsedBarcode.serialNumber.toLowerCase()
    );

    if (isDuplicateSerial) {
      playSound("error");
      setMessage(
        `WARNING: Nomor seri ${parsedBarcode.serialNumber} sudah ada di sesi tracking ini.`
      );
      setBarcodeValue("");
      focusBarcodeInput();
      return;
    }

    setScannedItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        actual_sku: parsedBarcode.actualSku,
        serial_number: parsedBarcode.serialNumber,
        scanned_at: new Date().toLocaleTimeString("id-ID"),
      },
    ]);
    setMessage(
      `OK: SKU ${parsedBarcode.actualSku} dengan nomor seri ${parsedBarcode.serialNumber} berhasil ditambahkan ke tracking ${activeTrackingNumber}.`
    );
    setBarcodeValue("");
    playSound("scanproduk");
    focusBarcodeInput();
  };

  const handleRemoveItem = (itemId) => {
    setScannedItems((prev) => prev.filter((item) => item.id !== itemId));
    setMessage("INFO: Scan serial dihapus dari sesi tracking aktif.");
    focusBarcodeInput();
  };

  const handleSubmit = async ({
    showSuccessModal = true,
    nextTrackingCandidate = "",
    submitReason = "",
  } = {}) => {
    const trackingToSubmit = activeTrackingNumber;
    const itemsToSubmit = scannedItems;

    if (!scannerName || !trackingToSubmit || itemsToSubmit.length === 0) {
      return false;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await API.post("/packing-no-data-ginee/submit", {
        scan_mode: "serial_scan",
        scanner_name: scannerName,
        tracking_number: trackingToSubmit,
        items: itemsToSubmit.map((item) => ({
          actual_sku: item.actual_sku,
          serial_number: item.serial_number,
        })),
      });

      const submitMessage = buildSerialSubmitMessage(response.data);
      const nextMessage = [submitMessage, submitReason].filter(Boolean).join("\n");

      resetSession({ preserveMessage: true });
      setTrackingNumber(nextTrackingCandidate);
      setMessage(nextMessage || submitMessage);
      playSound("success");

      if (showSuccessModal) {
        await Swal.fire({
          icon: "success",
          title: "Submit Berhasil",
          text: response.data?.message || "Scan serial No Data Ginee berhasil disimpan.",
          confirmButtonText: "OK",
          buttonsStyling: false,
          customClass: {
            popup: "pk-bb-swal-popup",
            confirmButton: "pk-bb-swal-confirm",
          },
        });
      }

      focusTrackingInput();
      return true;
    } catch (error) {
      playSound("error");
      setMessage(
        formatErrorMessage(error, "Submit scan serial No Data Ginee gagal")
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmitFromNonSerialBarcode = async (nextTrackingCandidate) => {
    const submitReason = [
      `INFO: Barcode ${nextTrackingCandidate} terdeteksi bukan format serial.`,
      "Sesi tracking serial sebelumnya otomatis disubmit dan barcode dipindahkan ke field tracking.",
    ].join("\n");

    return handleSubmit({
      showSuccessModal: false,
      nextTrackingCandidate,
      submitReason,
    });
  };

  useEffect(() => {
    const normalizedBarcodeValue = String(barcodeValue || "").trim();

    if (!normalizedBarcodeValue) {
      resetBarcodeTypingMeta();
      return undefined;
    }

    const parsedBarcode = parseSerialBarcodeValue(normalizedBarcodeValue);
    const shouldQueueAutoProcess =
      !parsedBarcode.error ||
      (scannedItems.length > 0 && !hasSerialBarcodeSeparator(normalizedBarcodeValue));

    if (!shouldQueueAutoProcess) {
      clearBarcodeAutoScanTimeout();
      return undefined;
    }

    clearBarcodeAutoScanTimeout();
    barcodeAutoScanTimeoutRef.current = setTimeout(async () => {
      if (!shouldAutoProcessBarcode(normalizedBarcodeValue)) {
        return;
      }

      isAutoProcessingBarcodeRef.current = true;

      try {
        await handleScanBarcode(normalizedBarcodeValue);
      } finally {
        resetBarcodeTypingMeta();
      }
    }, 150);

    return () => {
      clearBarcodeAutoScanTimeout();
    };
  }, [
    barcodeValue,
    activeTrackingNumber,
    loading,
    isSubmitting,
    isSessionLocked,
    scannedItems.length,
  ]);

  return (
    <>
      <section className="pk-kpi-grid">
        <article className="pk-kpi-card">
          <div className="pk-kpi-head">
            <FiUser /> Scanner
          </div>
          <strong>{scannerName || "-"}</strong>
          <small>scanner aktif untuk submit tracking serial</small>
        </article>
        <article className="pk-kpi-card">
          <div className="pk-kpi-head">
            <FiPackage /> Serial Terscan
          </div>
          <strong>{scannedItems.length}</strong>
          <small>jumlah barcode `SKU | NOMOR_SERI` di tracking aktif</small>
        </article>
        <article className="pk-kpi-card">
          <div className="pk-kpi-head">
            <FiSearch /> Tracking Aktif
          </div>
          <strong>{activeTrackingNumber || "-"}</strong>
          <small>
            {orderPreview?.order_number ? `order #${orderPreview.order_number}` : "menunggu tracking dipilih"}
          </small>
        </article>
      </section>

      <section className="pk-card pk-search-card">
        <div className="pk-search-head">
          <h2>Mulai Tracking Serial</h2>
          <span>
            Scan tracking number dulu, lalu lanjut scan barcode dengan format
            <code> SKU | NOMOR_SERI</code>.
          </span>
        </div>

        {isSessionLocked && (
          <div className="pk-session-lock">
            <div className="pk-session-lock-copy">
              <strong>Sesi scan belum aktif</strong>
              <span>
                Masukkan nama scanner terlebih dahulu, lalu mulai scan tracking number
                untuk mode serial.
              </span>
            </div>
            <button
              type="button"
              className="btn-search-modern"
              onClick={onUnlockSession}
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
                handleStartSession();
              }
            }}
            className="tracking-input-modern"
            disabled={loading || isSubmitting || !scannerName || isSessionLocked}
          />

          <button
            type="button"
            onClick={() => handleStartSession()}
            disabled={loading || isSubmitting || !scannerName || isSessionLocked}
            className="btn-search-modern"
          >
            {loading ? "Memproses..." : "Mulai Tracking"}
          </button>
        </div>

        {(orderPreview || activeTrackingNumber) && (
          <div className="pk-session-lock" style={{ marginTop: "16px" }}>
            <div className="pk-session-lock-copy">
              <strong>
                {orderPreview?.order_number
                  ? `Order #${orderPreview.order_number}`
                  : `Tracking ${activeTrackingNumber}`}
              </strong>
              <span>
                {orderPreview
                  ? `${orderPreview.customer_name || "-"} | total qty ${orderPreview.total_qty || 0} | status ${orderPreview.status || "-"}`
                  : "Data order belum ada di Ginee. Scan tetap bisa dilanjutkan dan akan direkonsiliasi nanti."}
              </span>
            </div>
          </div>
        )}

        {message && (
          <div className={`packing-message packing-message-${messageTone}`}>{message}</div>
        )}
      </section>

      <section className="pk-card order-section">
        <h2>Scan Barcode Serial</h2>
        <p className="pk-order-meta">
          <strong>Tracking Aktif:</strong> {activeTrackingNumber || "-"} <br />
          <strong>Scanner:</strong> {scannerName || "-"} <br />
          <strong>Mode:</strong> Serial Scan
        </p>

        <div className="sku-input-wrapper">
          <label className="sku-label">Scan Barcode `SKU | NOMOR_SERI`</label>
          <small className="pk-cell-muted">
            Hasil scan serial akan otomatis diproses. Jika barcode berikutnya bukan
            format serial, sesi ini akan otomatis submit.
          </small>

          <div className="sku-input">
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Contoh: SKU-001 | ABC123456"
              value={barcodeValue}
              onChange={(event) => handleBarcodeChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleScanBarcode();
                }
              }}
              disabled={loading || isSubmitting || !activeTrackingNumber || isSessionLocked}
            />
            <button
              type="button"
              onClick={() => handleScanBarcode()}
              disabled={loading || isSubmitting || !activeTrackingNumber || isSessionLocked}
            >
              Tambah Scan
            </button>
          </div>
        </div>

        <div className="packing-actions">
          <button
            type="button"
            className="btn-validate"
            disabled={isSubmitting || scannedItems.length === 0}
            onClick={() => handleSubmit()}
          >
            {isSubmitting ? "Mengirim..." : "Submit Tracking Serial"}
          </button>

          <button
            type="button"
            className="btn-cancel"
            onClick={() => {
              resetSession();
              setMessage("INFO: Sesi tracking serial dibatalkan.");
              focusTrackingInput();
            }}
            disabled={loading || isSubmitting}
          >
            Batal Tracking
          </button>
        </div>

        {scannedItems.length === 0 ? (
          <div className="pk-empty-session">
            Belum ada barcode serial yang discan untuk tracking aktif.
          </div>
        ) : (
          <div className="pk-bb-order-list">
            <div className="pk-table-wrap">
              <table className="packing-table pk-bb-detail-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>SKU</th>
                    <th>Nomor Seri</th>
                    <th>Waktu Scan</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {scannedItems.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="pk-cell-primary">{item.actual_sku}</span>
                      </td>
                      <td>
                        <span className="pk-cell-primary">{item.serial_number}</span>
                      </td>
                      <td>
                        <span className="pk-cell-muted">{item.scanned_at}</span>
                      </td>
                      <td>
                        <span className="pk-status-pill pk-status-scan">
                          <FiAlertTriangle /> Menunggu Rekonsiliasi
                        </span>
                      </td>
                      <td className="pk-action-cell">
                        <button
                          type="button"
                          className="pk-delete-btn"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isSubmitting}
                        >
                          <FaTrash /> Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default PackingNoDataGineeSerialMode;

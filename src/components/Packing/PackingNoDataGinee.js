import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { FaQrcode, FaTrash } from "react-icons/fa";
import { FiCheckCircle, FiPackage, FiUser, FiAlertTriangle } from "react-icons/fi";
import API from "../../api";
import "./Packing.css";
import PackingNoDataGineeSerialMode from "./PackingNoDataGineeSerialMode";

const normalizeTrackingNumber = (value = "") => value.trim();
const SCANNER_HISTORY_STORAGE_KEY = "packing-no-data-ginee:scanner-history";
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

const ACCESS_KEYWORD = "abc123";

const PackingNoDataGinee = () => {
  const navigate = useNavigate();
  const trackingInputRef = useRef(null);

  const [mode, setMode] = useState("tracking_only");
  const [serialModeResetKey, setSerialModeResetKey] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedScannerNames, setSavedScannerNames] = useState(getSavedScannerNames);
  const [scannerName, setScannerName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [scannedTrackings, setScannedTrackings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isPromptingScanner, setIsPromptingScanner] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(true);

  const totalTrackedItems = scannedTrackings.length;
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
      const selectId = "pk-ndg-scanner-select";
      const inputId = "pk-ndg-scanner-input";
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

  // ── Combined init: password gate → scanner prompt (sequential) ──
  useEffect(() => {
    let cancelled = false;

    const initSession = async () => {
      // Step 1: Password gate
      const pwResult = await Swal.fire({
        title: "Akses Terbatas",
        text: "Masukkan kata kunci untuk mengakses fitur No Data Ginee.",
        input: "password",
        inputPlaceholder: "Kata kunci...",
        showCancelButton: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: "Masuk",
        cancelButtonText: "Batal",
        buttonsStyling: false,
        customClass: scannerPromptSwalClass,
        preConfirm: (value) => {
          if (!value) {
            Swal.showValidationMessage("Kata kunci wajib diisi");
            return false;
          }
          if (value !== ACCESS_KEYWORD) {
            Swal.showValidationMessage("Kata kunci salah");
            return false;
          }
          return value;
        },
      });

      if (cancelled) {
        return;
      }

      if (!pwResult.isConfirmed) {
        navigate("/packing");
        return;
      }

      setIsAuthenticated(true);

      // Step 2: Scanner name prompt (runs immediately after password OK)
      if (!cancelled) {
        requestScannerName();
      }
    };

    initSession();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === "tracking_only" && scannerName && !isSessionLocked) {
      focusTrackingInput();
    }
  }, [scannerName, isSessionLocked, mode]);

  const lockSession = ({ nextMessage = "" } = {}) => {
    setScannerName("");
    setTrackingNumber("");
    setScannedTrackings([]);
    setSerialModeResetKey((prevValue) => prevValue + 1);
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

    // Check for duplicate in current session
    if (
      scannedTrackings.some(
        (item) => normalizeTrackingNumber(item.tracking_number) === normalizedTracking
      )
    ) {
      playSound("error");
      setTrackingNumber("");
      setMessage(`WARNING: Tracking number ${normalizedTracking} sudah ada di daftar sesi ini.`);
      focusTrackingInput();
      return;
    }

    // Check for duplicate in database (already submitted in a previous session)
    setLoading(true);
    setMessage("");

    try {
      await API.get(
        `/packing-no-data-ginee/check/${encodeURIComponent(normalizedTracking)}`
      );

      // If check passes (200), add to local list
      setScannedTrackings((prev) => [
        { tracking_number: normalizedTracking, scanned_at: new Date().toLocaleTimeString("id-ID") },
        ...prev,
      ]);
      playSound("scanproduk");
      setMessage(`OK: Tracking number ${normalizedTracking} berhasil ditambahkan ke sesi scan.`);
    } catch (error) {
      playSound("error");
      const data = error?.response?.data;
      if (error?.response?.status === 409) {
        setMessage(`WARNING: ${data?.message || `Tracking number ${normalizedTracking} sudah pernah discan sebelumnya.`}`);
      } else {
        setMessage(formatErrorMessage(error, "Gagal memeriksa tracking number"));
      }
    } finally {
      setLoading(false);
      setTrackingNumber("");
      focusTrackingInput();
    }
  };

  const handleRemoveTracking = (trackingToRemove) => {
    setScannedTrackings((prev) =>
      prev.filter((item) => item.tracking_number !== trackingToRemove)
    );
    setMessage(`INFO: Tracking number ${trackingToRemove} dihapus dari sesi scan.`);
    focusTrackingInput();
  };

  const handleSubmit = async () => {
    if (!scannerName || scannedTrackings.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await API.post("/packing-no-data-ginee/submit", {
        scanner_name: scannerName,
        tracking_numbers: scannedTrackings.map((item) => item.tracking_number),
      });

      const successMessage =
        response.data.message ||
        "Semua tracking number berhasil dicatat melalui No Data Ginee";

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
        formatErrorMessage(error, "Submit scan No Data Ginee gagal")
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
                <h1>No Data Ginee</h1>
                <p>
                  Scan tracking number tanpa perlu validasi data order dari Ginee.
                  Cukup scan, kumpulkan, lalu submit.
                </p>
              </div>
            </div>
          </header>

          <main className="pk-main">
            <section className="pk-card pk-session-banner" style={{ borderLeft: "4px solid #f59e0b" }}>
              <div className="pk-session-meta">
                <span className="pk-session-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <FiAlertTriangle style={{ color: "#f59e0b" }} /> Mode No Data Ginee
                </span>
                <small style={{ color: "#94a3b8", marginTop: "2px", display: "block" }}>
                  Tracking number akan dicatat tanpa validasi ke database Ginee
                </small>
              </div>
            </section>

            <section className="pk-card pk-session-banner">
              <div className="pk-session-meta">
                <span className="pk-session-label">Scanner  Aktif</span>
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

            <section className="pk-card pk-search-card">
              <div className="pk-search-head">
                <h2>Pilih Mode</h2>
                <span>
                  Gunakan mode tracking biasa untuk scan cepat, atau mode serial untuk
                  scan <code>SKU | NOMOR_SERI</code> saat data order telat masuk.
                </span>
              </div>

              <div className="packing-actions pk-bb-scan-actions">
                <button
                  type="button"
                  className={mode === "tracking_only" ? "btn-validate" : "btn-cancel"}
                  onClick={() => setMode("tracking_only")}
                >
                  Tracking Only
                </button>

                <button
                  type="button"
                  className={mode === "serial_scan" ? "btn-validate" : "btn-cancel"}
                  onClick={() => setMode("serial_scan")}
                >
                  Scan Serial
                </button>
              </div>
            </section>

            {mode === "tracking_only" ? (
              <>
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
                <strong>{totalTrackedItems}</strong>
                <small>jumlah tracking number di sesi berjalan</small>
              </article>
              <article className="pk-kpi-card">
                <div className="pk-kpi-head">
                  <FiPackage /> Mode
                </div>
                <strong style={{ fontSize: "14px", color: "#f59e0b" }}>No Data Ginee</strong>
                <small>tanpa validasi order Ginee</small>
              </article>
            </section>

            <section className="pk-card pk-search-card">
              <div className="pk-search-head">
                <h2>Scan Tracking Number</h2>
                <span>
                  Scan tracking number tanpa perlu data order ada di Ginee.
                  Input akan otomatis kosong setelah scan berhasil.
                </span>
              </div>

              {isSessionLocked && (
                <div className="pk-session-lock">
                  <div className="pk-session-lock-copy">
                    <strong>Sesi scan belum aktif</strong>
                    <span>
                      Masukkan nama scanner terlebih dahulu, lalu lanjut scan
                      tracking number. Data tidak perlu ada di Ginee.
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
                  disabled={isSubmitting || scannedTrackings.length === 0}
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
                <strong>Total Tracking:</strong> {totalTrackedItems} <br />
                <strong>Mode:</strong> No Data Ginee
              </p>

              {scannedTrackings.length === 0 ? (
                <div className="pk-empty-session">
                  Belum ada tracking number yang discan pada sesi ini.
                </div>
              ) : (
                <div className="pk-bb-order-list">
                  <div className="pk-table-wrap">
                    <table className="packing-table pk-bb-detail-table">
                      <thead>
                        <tr>
                          <th>No</th>
                          <th>Tracking Number</th>
                          <th>Waktu Scan</th>
                          <th>Status</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scannedTrackings.map((item, index) => (
                          <tr key={item.tracking_number}>
                            <td>{index + 1}</td>
                            <td>
                              <span className="pk-cell-primary">{item.tracking_number}</span>
                            </td>
                            <td>
                              <span className="pk-cell-muted">{item.scanned_at}</span>
                            </td>
                            <td>
                              <span className="pk-status-pill pk-status-sesuai">
                                <FiCheckCircle /> Siap Submit
                              </span>
                            </td>
                            <td className="pk-action-cell">
                              <button
                                type="button"
                                className="pk-delete-btn"
                                onClick={() => handleRemoveTracking(item.tracking_number)}
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
            ) : (
              <PackingNoDataGineeSerialMode
                key={serialModeResetKey}
                scannerName={scannerName}
                isSessionLocked={isSessionLocked}
                isPromptingScanner={isPromptingScanner}
                onUnlockSession={handleUnlockSession}
              />
            )}
          </main>
        </section>
      </div>
    </div>
  );
};

export default PackingNoDataGinee;

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./StokOpnameGudang.css";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
import {
  buildGudangWorkspaceErrorMessage,
  fetchOpnameProducts,
  fetchOpnameSkus,
  commitOpname,
} from "./GudangProdukWorkspaceApi";
import {
  FaBoxes,
  FaChevronLeft,
  FaClipboardCheck,
  FaSearch,
  FaTimesCircle,
  FaBarcode,
  FaCheckCircle,
  FaExclamationTriangle,
  FaRedo,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaArrowRight,
} from "react-icons/fa";
import { FiPackage } from "react-icons/fi";

// ─── Constants ───────────────────────────────────────────────────────────────

const STEP_SELECT_PRODUCT = 1;
const STEP_SELECT_SKU      = 2;
const STEP_SCAN            = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeSerial = (value) =>
  String(value || "").trim().toUpperCase();

const SIZE_SORT_ORDER = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "4XL",
  "5XL",
];

const getSizeSortValue = (size) => {
  const normalized = String(size || "").trim().toUpperCase();
  const index = SIZE_SORT_ORDER.indexOf(normalized);
  return index === -1 ? SIZE_SORT_ORDER.length : index;
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

const StepIndicator = ({ current }) => (
  <div className="opname-steps">
    {[
      { num: 1, label: "Pilih Produk" },
      { num: 2, label: "Pilih SKU" },
      { num: 3, label: "Scan Seri" },
    ].map(({ num, label }) => (
      <React.Fragment key={num}>
        <div
          className={`opname-step ${
            current === num
              ? "active"
              : current > num
              ? "done"
              : ""
          }`}
        >
          <div className="opname-step-circle">
            {current > num ? <FaCheckCircle size={14} /> : num}
          </div>
          <span>{label}</span>
        </div>
        {num < 3 && (
          <div
            className={`opname-step-line ${current > num ? "done" : ""}`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─── Step 1: Select Product ───────────────────────────────────────────────────

const SelectProductStep = ({ onSelect }) => {
  const [products, setProducts]     = useState([]);
  const [search, setSearch]         = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState("");
  const [showAll, setShowAll]       = useState(false);
  const hasSearch = search.trim().length > 0;

  const loadProducts = useCallback(async (searchValue, all) => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchOpnameProducts({ search: searchValue.trim(), all });
      setProducts(data);
    } catch (err) {
      setError(buildGudangWorkspaceErrorMessage(err, "Gagal memuat daftar produk."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setProducts([]);
      setError("");
      setIsLoading(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      loadProducts(query, showAll);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, showAll, loadProducts]);

  return (
    <div className="opname-step-content">
      <div className="opname-section-header">
        <h2>
          <FaBoxes className="opname-section-icon" />
          Pilih Produk
        </h2>
        <p>Pilih produk yang akan dilakukan stok opname.</p>
      </div>

      <div className="opname-search-bar">
        <FaSearch className="opname-search-icon" />
        <input
          id="opname-product-search"
          type="text"
          placeholder="Cari nama produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {search && (
          <button
            type="button"
            className="opname-clear-btn"
            onClick={() => setSearch("")}
          >
            <FaTimesCircle />
          </button>
        )}
      </div>

      {hasSearch && (
        <div className="opname-show-all-row">
          <label className="opname-toggle-label">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            <span>Sertakan produk Product List yang belum ada stok</span>
          </label>
        </div>
      )}

      {error && <div className="opname-callout opname-callout-error">{error}</div>}

      {!hasSearch ? (
        <div className="opname-empty">
          <FiPackage size={40} />
          <p>Cari nama produk untuk menampilkan pilihan dari Product List.</p>
        </div>
      ) : isLoading ? (
        <div className="opname-loading">Memuat produk...</div>
      ) : products.length === 0 ? (
        <div className="opname-empty">
          <FiPackage size={40} />
          <p>
            {showAll
              ? `Tidak ada produk Product List cocok dengan "${search.trim()}"`
              : `Tidak ada produk Product List dengan stok di gudang cocok dengan "${search.trim()}"`}
          </p>
          {!showAll && (
            <button
              type="button"
              className="opname-btn opname-btn-secondary"
              onClick={() => setShowAll(true)}
            >
              Tampilkan Semua Produk
            </button>
          )}
        </div>
      ) : (
        <div className="opname-product-grid">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              id={`opname-product-${product.id}`}
              className="opname-product-card"
              onClick={() => onSelect(product)}
            >
              <div className="opname-product-card-icon">
                <FiPackage size={22} />
              </div>
              <div className="opname-product-card-body">
                <span className="opname-product-name">{product.name}</span>
                <span className="opname-product-meta">
                  {product.meta || `${product.productListItems?.length || 0} SKU Product List`}
                </span>
              </div>
              <FaArrowRight className="opname-product-arrow" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Step 2: Select SKU (slot) ────────────────────────────────────────────────

const SelectSkuStep = ({ product, onSelect, onBack }) => {
  const [skuRows, setSkuRows]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    setSearch("");

    fetchOpnameSkus(product)
      .then((data) => {
        if (!cancelled) setSkuRows(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(buildGudangWorkspaceErrorMessage(err, "Gagal memuat data SKU."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const filteredSkuRows = skuRows.filter((row) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    return [
      row.skuCode,
      row.variant,
      row.warna,
      row.ukuran,
      row.layoutName,
      row.slotCode,
      row.qtyGudang,
    ].some((value) => String(value ?? "").toLowerCase().includes(term));
  });

  const groupedSkuRows = useMemo(() => {
    const groups = filteredSkuRows.reduce((acc, row) => {
      const size = String(row.ukuran || "Tanpa Ukuran").trim() || "Tanpa Ukuran";
      if (!acc[size]) acc[size] = [];
      acc[size].push(row);
      return acc;
    }, {});

    return Object.entries(groups)
      .sort(([sizeA], [sizeB]) => {
        const byOrder = getSizeSortValue(sizeA) - getSizeSortValue(sizeB);
        if (byOrder !== 0) return byOrder;
        return sizeA.localeCompare(sizeB, "id", { numeric: true });
      })
      .map(([size, rows]) => ({
        size,
        rows: rows.slice().sort((a, b) =>
          String(a.skuCode || "").localeCompare(String(b.skuCode || ""), "id", {
            numeric: true,
          })
        ),
      }));
  }, [filteredSkuRows]);

  return (
    <div className="opname-step-content">
      <div className="opname-section-header">
        <h2>
          <FaLayerGroup className="opname-section-icon" />
          Pilih SKU &amp; Lokasi
        </h2>
        <p>
          Produk: <strong>{product.name}</strong> — pilih SKU dan lokasi yang
          akan di-opname.
        </p>
      </div>

      <button
        type="button"
        className="opname-btn opname-btn-ghost opname-back-btn"
        onClick={onBack}
      >
        <FaChevronLeft /> Ganti Produk
      </button>

      {error && <div className="opname-callout opname-callout-error">{error}</div>}

      {isLoading ? (
        <div className="opname-loading">Memuat data SKU...</div>
      ) : skuRows.length === 0 ? (
        <div className="opname-empty">
          <FiPackage size={40} />
          <p>Produk ini belum memiliki stok di gudang.</p>
          <button
            type="button"
            className="opname-btn opname-btn-secondary"
            onClick={onBack}
          >
            <FaChevronLeft /> Kembali
          </button>
        </div>
      ) : (
        <>
          <div className="opname-search-bar">
            <FaSearch className="opname-search-icon" />
            <input
              id="opname-sku-search"
              type="text"
              placeholder="Cari SKU, warna, ukuran, atau lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            {search && (
              <button
                type="button"
                className="opname-clear-btn"
                onClick={() => setSearch("")}
                aria-label="Bersihkan pencarian SKU"
              >
                <FaTimesCircle />
              </button>
            )}
          </div>

          {filteredSkuRows.length === 0 ? (
            <div className="opname-empty">
              <FiPackage size={40} />
              <p>Tidak ada SKU atau lokasi cocok dengan "{search}".</p>
            </div>
          ) : (
            <div className="opname-sku-size-grid">
              {groupedSkuRows.map((group) => (
                <section key={group.size} className="opname-sku-size-column">
                  <div className="opname-sku-size-header">
                    <span>SKU UKURAN {group.size}</span>
                    <strong>{group.rows.length} SKU</strong>
                  </div>

                  <div className="opname-sku-size-list">
                    {group.rows.map((row) => (
                      <button
                        key={row.entryId}
                        type="button"
                        id={`opname-sku-${row.entryId}`}
                        className="opname-sku-size-row"
                        onClick={() => onSelect(row)}
                      >
                        <span className="opname-sku-size-row-main">
                          <span className="opname-sku-code">{row.skuCode}</span>
                          {row.variant && (
                            <span className="opname-sku-variant">{row.variant}</span>
                          )}
                          <span className="opname-sku-location">
                            <FaMapMarkerAlt />
                            {row.layoutName} — {row.slotCode}
                          </span>
                        </span>
                        <span className="opname-sku-qty">
                          Stok: <strong>{row.qtyGudang}</strong>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Step 3: Scan Serials ─────────────────────────────────────────────────────

const ScanStep = ({ product, skuRow, onBack, onDone }) => {
  const [scannedList, setScannedList]     = useState([]);
  const [inputValue, setInputValue]       = useState("");
  const [duplicateAlert, setDuplicateAlert] = useState("");
  const [isCommitting, setIsCommitting]   = useState(false);
  const [commitError, setCommitError]     = useState("");
  const [notes, setNotes]                 = useState("");
  const inputRef                          = useRef(null);

  const focusScanInput = useCallback(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    focusScanInput();
  }, [focusScanInput]);

  const handleScan = useCallback(
    (raw) => {
      const serial = normalizeSerial(raw);
      if (!serial) return;

      setDuplicateAlert("");

      if (scannedList.includes(serial)) {
        setDuplicateAlert(`Seri "${serial}" sudah di-scan sebelumnya!`);
        setInputValue("");
        focusScanInput();
        return;
      }

      setScannedList((prev) => [serial, ...prev]);
      setInputValue("");
      focusScanInput();
    },
    [scannedList, focusScanInput]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan(inputValue);
    }
  };

  const handleRemove = (serial) => {
    setScannedList((prev) => prev.filter((s) => s !== serial));
    setDuplicateAlert("");
  };

  const handleReset = () => {
    setScannedList([]);
    setInputValue("");
    setDuplicateAlert("");
    setCommitError("");
    setTimeout(focusScanInput, 50);
  };

  const handleCommit = async () => {
    setIsCommitting(true);
    setCommitError("");

    try {
      const result = await commitOpname({
        skuId:         skuRow.skuId,
        slotId:        skuRow.slotId,
        layoutId:      skuRow.layoutId,
        scannedQty:    scannedList.length,
        scannedSeries: scannedList,
        notes:         notes.trim() || undefined,
      });
      onDone({
        product,
        skuRow,
        scannedQty: scannedList.length,
        scannedList,
        message: result.message,
      });
    } catch (err) {
      setCommitError(
        buildGudangWorkspaceErrorMessage(err, "Gagal menyimpan opname.")
      );
    } finally {
      setIsCommitting(false);
    }
  };

  const scannedCount = scannedList.length;

  return (
    <div className="opname-step-content">
      {/* Header info */}
      <div className="opname-scan-header">
        <button
          type="button"
          className="opname-btn opname-btn-ghost opname-back-btn"
          onClick={onBack}
          disabled={isCommitting}
        >
          <FaChevronLeft /> Ganti SKU
        </button>

        <div className="opname-scan-meta">
          <div className="opname-scan-meta-item">
            <span className="opname-scan-meta-label">Produk</span>
            <span className="opname-scan-meta-value">{product.name}</span>
          </div>
          <div className="opname-scan-meta-item">
            <span className="opname-scan-meta-label">SKU</span>
            <span className="opname-scan-meta-value">
              {skuRow.skuCode}
              {skuRow.variant ? ` — ${skuRow.variant}` : ""}
            </span>
          </div>
          <div className="opname-scan-meta-item">
            <span className="opname-scan-meta-label">Lokasi</span>
            <span className="opname-scan-meta-value">
              {skuRow.layoutName} / {skuRow.slotCode}
            </span>
          </div>
          <div className="opname-scan-meta-item">
            <span className="opname-scan-meta-label">Stok Sebelumnya</span>
            <span className="opname-scan-meta-value opname-old-qty">
              {skuRow.qtyGudang} pcs
            </span>
          </div>
        </div>
      </div>

      {/* Counter */}
      <div className="opname-counter-card">
        <div className="opname-counter-number">{scannedCount}</div>
        <div className="opname-counter-label">Seri sudah di-scan</div>
        <div className="opname-counter-sub">
          {scannedCount === 0
            ? "Belum ada seri di-scan"
            : scannedCount === 1
            ? "1 item dihitung"
            : `${scannedCount} item dihitung — akan menjadi qty baru`}
        </div>
      </div>

      {/* Scan input */}
      <div className="opname-scan-box">
        <div className="opname-scan-box-label">
          <FaBarcode />
          <span>Scan atau ketik nomor seri, tekan Enter</span>
        </div>
        <div className="opname-scan-input-row">
          <input
            id="opname-scan-input"
            ref={inputRef}
            type="text"
            className="opname-scan-input"
            placeholder="Arahkan scanner ke sini atau ketik nomor seri..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value.toUpperCase());
              setDuplicateAlert("");
            }}
            onKeyDown={handleKeyDown}
            disabled={isCommitting}
            autoComplete="off"
            autoCapitalize="characters"
          />
          <button
            type="button"
            className="opname-btn opname-btn-scan"
            onClick={() => handleScan(inputValue)}
            disabled={!inputValue.trim() || isCommitting}
          >
            Tambah
          </button>
        </div>

        {duplicateAlert && (
          <div className="opname-duplicate-alert">
            <FaExclamationTriangle />
            {duplicateAlert}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="opname-notes-row">
        <label htmlFor="opname-notes">
          Catatan opname <span className="opname-notes-optional">(opsional)</span>
        </label>
        <input
          id="opname-notes"
          type="text"
          className="opname-notes-input"
          placeholder="Contoh: stok rusak dipisah, dll..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isCommitting}
        />
      </div>

      {/* Scanned list */}
      {scannedList.length > 0 && (
        <div className="opname-scanned-section">
          <div className="opname-scanned-title">
            Daftar Seri ({scannedCount})
            <button
              type="button"
              className="opname-btn opname-btn-ghost opname-reset-mini"
              onClick={handleReset}
              disabled={isCommitting}
            >
              <FaRedo /> Reset
            </button>
          </div>
          <div className="opname-scanned-list">
            {scannedList.map((serial, idx) => (
              <div key={`${serial}-${idx}`} className="opname-serial-chip">
                <span className="opname-serial-num">{scannedCount - idx}</span>
                <span className="opname-serial-text">{serial}</span>
                <button
                  type="button"
                  className="opname-serial-remove"
                  onClick={() => handleRemove(serial)}
                  disabled={isCommitting}
                  title="Hapus dari daftar"
                >
                  <FaTimesCircle />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {commitError && (
        <div className="opname-callout opname-callout-error">{commitError}</div>
      )}

      {/* Actions */}
      <div className="opname-action-bar">
        <button
          type="button"
          className="opname-btn opname-btn-secondary"
          onClick={handleReset}
          disabled={isCommitting || scannedCount === 0}
        >
          <FaRedo /> Reset Scan
        </button>
        <button
          type="button"
          id="opname-commit-btn"
          className="opname-btn opname-btn-primary"
          onClick={handleCommit}
          disabled={isCommitting}
        >
          {isCommitting ? (
            "Menyimpan..."
          ) : (
            <>
              <FaClipboardCheck /> Commit Opname ({scannedCount} seri)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Result Screen ────────────────────────────────────────────────────────────

const ResultScreen = ({ result, onNewOpname }) => (
  <div className="opname-result-screen">
    <div className="opname-result-icon">
      <FaCheckCircle size={56} />
    </div>
    <h2 className="opname-result-title">Opname Berhasil!</h2>
    <p className="opname-result-sub">{result.message}</p>

    <div className="opname-result-summary">
      <div className="opname-result-row">
        <span>Produk</span>
        <strong>{result.product.name}</strong>
      </div>
      <div className="opname-result-row">
        <span>SKU</span>
        <strong>
          {result.skuRow.skuCode}
          {result.skuRow.variant ? ` — ${result.skuRow.variant}` : ""}
        </strong>
      </div>
      <div className="opname-result-row">
        <span>Lokasi</span>
        <strong>
          {result.skuRow.layoutName} / {result.skuRow.slotCode}
        </strong>
      </div>
      <div className="opname-result-row opname-result-row-highlight">
        <span>Qty Baru</span>
        <strong>{result.scannedQty} pcs</strong>
      </div>
    </div>

    {result.scannedList.length > 0 && (
      <details className="opname-result-serials">
        <summary>Lihat {result.scannedList.length} seri yang di-scan</summary>
        <div className="opname-result-serial-list">
          {result.scannedList.map((s, i) => (
            <span key={`${s}-${i}`} className="opname-result-serial-chip">
              {s}
            </span>
          ))}
        </div>
      </details>
    )}

    <button
      type="button"
      id="opname-new-btn"
      className="opname-btn opname-btn-primary opname-result-cta"
      onClick={onNewOpname}
    >
      <FaRedo /> Opname Produk Lain
    </button>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const StokOpnameGudang = () => {
  const [step, setStep]               = useState(STEP_SELECT_PRODUCT);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSkuRow, setSelectedSkuRow]   = useState(null);
  const [result, setResult]           = useState(null);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSelectedSkuRow(null);
    setStep(STEP_SELECT_SKU);
  };

  const handleSelectSku = (skuRow) => {
    setSelectedSkuRow(skuRow);
    setStep(STEP_SCAN);
  };

  const handleDone = (res) => {
    setResult(res);
  };

  const handleNewOpname = () => {
    setStep(STEP_SELECT_PRODUCT);
    setSelectedProduct(null);
    setSelectedSkuRow(null);
    setResult(null);
  };

  const handleBackToProduct = () => {
    setStep(STEP_SELECT_PRODUCT);
    setSelectedProduct(null);
    setSelectedSkuRow(null);
  };

  const handleBackToSku = () => {
    setStep(STEP_SELECT_SKU);
    setSelectedSkuRow(null);
  };

  const statusLabel = result
    ? "Opname Selesai"
    : step === STEP_SELECT_PRODUCT
    ? "Langkah 1 dari 3"
    : step === STEP_SELECT_SKU
    ? "Langkah 2 dari 3"
    : "Langkah 3 dari 3";

  return (
    <GudangProdukBaseShell
      title="Stok Opname"
      subtitle="Lakukan penyesuaian stok gudang berdasarkan scan seri fisik satu per satu."
      icon={FaClipboardCheck}
      statusLabel={statusLabel}
    >
      <div className="opname-page">
        {!result && <StepIndicator current={step} />}

        <div className="opname-body">
          {result ? (
            <ResultScreen result={result} onNewOpname={handleNewOpname} />
          ) : step === STEP_SELECT_PRODUCT ? (
            <SelectProductStep onSelect={handleSelectProduct} />
          ) : step === STEP_SELECT_SKU ? (
            <SelectSkuStep
              product={selectedProduct}
              onSelect={handleSelectSku}
              onBack={handleBackToProduct}
            />
          ) : (
            <ScanStep
              product={selectedProduct}
              skuRow={selectedSkuRow}
              onBack={handleBackToSku}
              onDone={handleDone}
            />
          )}
        </div>
      </div>
    </GudangProdukBaseShell>
  );
};

export default StokOpnameGudang;

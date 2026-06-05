import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./Seri.css";
import API from "../../api";
import { 
  FiSearch, FiPlus, FiDownload, FiHash,
  FiBox, FiX, FiCheckCircle, FiLayers, FiDatabase, FiFilter, FiGrid, FiEdit3
} from "react-icons/fi";

const Seri = () => {
  const [seri, setSeri] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [inputMode, setInputMode] = useState("manual");
  const [productOptions, setProductOptions] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productListSerialType, setProductListSerialType] = useState("opname");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState("");
  
  const [newSeri, setNewSeri] = useState({
    nomor_seri: "",
    sku: "",
    jumlah: "1",
  });

  const fetchSeri = useCallback(async (page = 1, search = "") => {
    try {
      setLoading(true);
      const response = await API.get(`/seri?page=${page}&search=${encodeURIComponent(search)}`);
      setSeri(response.data.data);
      setCurrentPage(response.data.current_page);
      setLastPage(response.data.last_page);
      setTotalItems(response.data.total || 0);
      setError(null);
    } catch (error) {
      setError("Gagal mengambil data seri");
    } finally {
      setLoading(false);
    }
  }, []);

  const getProductSkuReference = (product) => {
    return String(product?.sku_name || product?.sku || product?.product || "").trim();
  };

  const getProductSerialReference = (product) => {
    return String(product?.kode_seri || product?.nomor_seri || "").trim();
  };

  const getProductOptionLabel = (product) => {
    const skuReference = getProductSkuReference(product);
    const productName = String(product?.product || "").trim();

    if (skuReference && productName && skuReference !== productName) {
      return `${skuReference} - ${productName}`;
    }

    return skuReference || productName || `Product #${product?.id}`;
  };

  const buildStockAwalNomorSeri = (skuReference = "") => {
    const normalizedSku = String(skuReference)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return normalizedSku ? `SA-${normalizedSku}` : "SA";
  };

  const selectedProduct = useMemo(
    () => productOptions.find((product) => String(product.id) === String(selectedProductId)),
    [productOptions, selectedProductId]
  );

  const fetchProductOptions = useCallback(async (search = "") => {
    try {
      setLoadingProducts(true);
      setProductError("");

      const response = await API.get("/product-list", {
        params: {
          search,
          page: 1,
          per_page: 100,
          sortBy: search ? "sku_name" : "id",
          sortOrder: search ? "asc" : "desc",
        },
      });

      setProductOptions(response.data.data || []);
    } catch (error) {
      setProductOptions([]);
      setProductError("Gagal mengambil data Product List.");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSeri(1, searchTerm);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchSeri]);

  useEffect(() => {
    if (!showForm || inputMode !== "product-list") return;

    const timeoutId = window.setTimeout(() => {
      fetchProductOptions(productSearchTerm.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [fetchProductOptions, inputMode, productSearchTerm, showForm]);

  const downloadQR = async (id, nomorSeri) => {
    try {
      const response = await API.get(`/seri/${id}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `qr-seri-${nomorSeri}.pdf`);
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Gagal mengunduh file.");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (inputMode === "product-list" && !selectedProductId) {
      alert("Pilih produk dari Product List terlebih dahulu.");
      return;
    }

    if (!newSeri.sku.trim()) {
      alert("SKU referensi wajib diisi.");
      return;
    }

    const formData = new FormData();
    formData.append("nomor_seri", newSeri.nomor_seri);
    formData.append("sku", newSeri.sku);
    formData.append("jumlah", newSeri.jumlah);
    if (inputMode === "product-list") {
      formData.append("jenis_seri", productListSerialType);
    }

    try {
      await API.post("/seri", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await fetchSeri(currentPage, searchTerm);
      setSuccessMessage("Data seri berhasil ditambahkan.");
      setShowSuccessModal(true);
      setShowForm(false);
      setNewSeri({
        nomor_seri: "",
        sku: "",
        jumlah: "1",
      });
      setInputMode("manual");
      setProductListSerialType("opname");
      setProductSearchTerm("");
      setSelectedProductId("");
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menambahkan seri.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSeri((prev) => ({
      ...prev,
      [name]: name === "jumlah" ? value.replace(/\D/g, "") : value.toUpperCase(),
    }));
  };

  const handleModeChange = (mode) => {
    setInputMode(mode);
    setSelectedProductId("");
    setProductError("");

    if (mode === "product-list") {
      setProductSearchTerm("");
      setProductListSerialType("opname");
      setNewSeri((prev) => ({
        ...prev,
        sku: "",
        nomor_seri: "",
      }));
    }
  };

  const resolveProductListNomorSeri = (product, serialType, currentNomorSeri = "") => {
    if (serialType === "stok_awal") {
      return buildStockAwalNomorSeri(getProductSkuReference(product));
    }

    const skuReference = getProductSkuReference(product).toUpperCase();
    const serialReference = getProductSerialReference(product).toUpperCase();
    const fallbackSerialReference = serialReference || skuReference;

    return currentNomorSeri || fallbackSerialReference;
  };

  const handleProductSelect = (e) => {
    const productId = e.target.value;
    const product = productOptions.find((item) => String(item.id) === String(productId));

    setSelectedProductId(productId);

    if (!product) {
      setNewSeri((prev) => ({
        ...prev,
        sku: "",
        nomor_seri: productListSerialType === "stok_awal" ? buildStockAwalNomorSeri() : "",
      }));
      return;
    }

    const skuReference = getProductSkuReference(product).toUpperCase();

    setNewSeri((prev) => ({
      ...prev,
      sku: skuReference,
      nomor_seri: resolveProductListNomorSeri(product, productListSerialType, prev.nomor_seri),
    }));
  };

  const handleProductListSerialTypeChange = (e) => {
    const serialType = e.target.value;

    setProductListSerialType(serialType);
    setNewSeri((prev) => ({
      ...prev,
      nomor_seri: resolveProductListNomorSeri(
        selectedProduct,
        serialType,
        serialType === "stok_awal" || prev.nomor_seri.startsWith("SA-") ? "" : prev.nomor_seri
      ),
    }));
  };

  const sortedData = [...seri].sort((a, b) => b.id - a.id);
  const totalRows = totalItems;
  const visibleRows = sortedData.length;
  const isFiltering = searchTerm.trim().length > 0;

  return (
    <div className="seri-page">
      <header className="seri-topbar">
            <div className="seri-title-group">
              <div className="brand-icon">
                <FiBox size={24} color="#fff" />
              </div>
              <div className="brand-text">
                 <h1>Data Seri Directory</h1>
                 <p>Manajemen nomor seri dan referensi SKU produk</p>
              </div>
            </div>
            
            <div className="seri-actions">
              <div className="search-bar">
                <input 
                  type="text" 
                  placeholder="Cari nomor seri, SKU produk..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </header>

          <main className="seri-main">
            <section className="seri-kpi-grid">
              <article className="seri-kpi-card">
                <div className="kpi-icon"><FiDatabase size={16} /></div>
                <div>
                  <p>Total Seri (Halaman)</p>
                  <h3>{totalRows}</h3>
                </div>
              </article>
              <article className="seri-kpi-card">
                <div className="kpi-icon"><FiFilter size={16} /></div>
                <div>
                  <p>Hasil Pencarian</p>
                  <h3>{visibleRows}</h3>
                </div>
              </article>
              <article className="seri-kpi-card">
                <div className="kpi-icon"><FiGrid size={16} /></div>
                <div>
                  <p>Posisi Halaman</p>
                  <h3>{currentPage} / {lastPage}</h3>
                </div>
              </article>
            </section>

            <div className="table-card">
              <div className="table-header">
                <div>
                  <h3>Semua Data Seri</h3>
                  <p>
                    Monitoring nomor seri produk dan referensi SKU
                    {isFiltering ? ` - menampilkan ${visibleRows} hasil dari filter` : ` - ${totalRows} data pada halaman ini`}
                  </p>
                </div>
                <button className="btn-primary" onClick={() => setShowForm(true)}>
                   <FiPlus size={18} /> Tambah Seri Baru
                </button>
              </div>

              <div className="table-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px', textAlign: 'center' }}>No</th>
                      <th style={{ paddingLeft: '24px' }}>Nomor Seri</th>
                      <th>Informasi SKU</th>
                      <th>Status Scan</th>
                      <th className="text-right" style={{ paddingRight: '24px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                      {loading ? (
                        <tr className="empty-row">
                            <td colSpan="5" className="empty-state">Memuat data seri...</td>
                        </tr>
                      ) : error ? (
                        <tr className="empty-row">
                            <td colSpan="5" className="empty-state text-accent">{error}</td>
                        </tr>
                      ) : sortedData.map((item, index) => (
                        <tr key={item.id}>
                          <td className="text-muted font-mono" style={{ textAlign: 'center' }}>
                             {index + 1}
                          </td>
                          <td style={{ paddingLeft: '24px' }}>
                            <div className="serial-pill">
                              <span className="status-dot-sm"></span>
                              <span className="font-semibold text-accent">{item.nomor_seri}</span>
                            </div>
                          </td>
                          <td>
                            <span className="sku-inline">
                                <FiLayers className="text-muted" />
                                <span className="sku-chip">{item.sku}</span>
                            </span>
                          </td>
                          <td>
                            {item.scanned_count > 0 ? (
                              <div className="scanned-status-pill success" title={
                                item.scanned_details?.map(d => `${d.barcode}: ${d.source}`).join("\n")
                              }>
                                <div className="scanned-dot-wrapper">
                                  <span className="scanned-dot green"></span>
                                  <span className="scanned-text font-semibold text-success">
                                    {item.scanned_count} / {item.jumlah} Di-scan
                                  </span>
                                </div>
                                <div className="scanned-origins">
                                  {Array.from(new Set(item.scanned_details?.map(d => d.source) || [])).map(source => (
                                    <span key={source} className="scanned-source-badge">{source}</span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="scanned-status-pill neutral">
                                <div className="scanned-dot-wrapper">
                                  <span className="scanned-dot gray"></span>
                                  <span className="scanned-text text-muted">Belum di-scan</span>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="text-right" style={{ paddingRight: '24px' }}>
                             <button className="btn-download-blue" onClick={() => downloadQR(item.id, item.nomor_seri)}>
                                <FiDownload /> Unduh QR
                             </button>
                          </td>
                        </tr>
                      ))}
                    {!loading && sortedData.length === 0 && !error && (
                      <tr className="empty-row">
                        <td colSpan="5" className="empty-state">
                          Tidak ada data seri yang sesuai dengan kata kunci "{searchTerm}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && sortedData.length > 0 && (
                <div className="seri-pagination">
                  <button disabled={currentPage === 1} onClick={() => fetchSeri(currentPage - 1, searchTerm)}>
                    Sebelumnya
                  </button>
                  <span>
                    Halaman {currentPage} dari {lastPage}
                  </span>
                  <button disabled={currentPage === lastPage} onClick={() => fetchSeri(currentPage + 1, searchTerm)}>
                    Selanjutnya
                  </button>
                </div>
              )}
            </div>
      </main>

      {showForm && (
          <div className="modal-overlay">
            <div className="modal-backdrop" onClick={() => setShowForm(false)} />
            <div className="modal-content modal-form-layout">
              <div className="modal-header">
                <div className="modal-title-wrap">
                  <h2>Tambah Seri dan SKU Baru</h2>
                  <p>Lengkapi data berikut untuk membuat nomor seri baru.</p>
                </div>
                <button type="button" className="close-btn" onClick={() => setShowForm(false)}>
                  <FiX size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="modal-form">
                <div className="seri-mode-switch" role="group" aria-label="Mode input seri">
                  <button
                    type="button"
                    className={inputMode === "manual" ? "active" : ""}
                    onClick={() => handleModeChange("manual")}
                  >
                    <FiEdit3 size={15} />
                    Manual
                  </button>
                  <button
                    type="button"
                    className={inputMode === "product-list" ? "active" : ""}
                    onClick={() => handleModeChange("product-list")}
                  >
                    <FiDatabase size={15} />
                    Product List
                  </button>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <span className="label-content">
                        <FiLayers size={14} />
                        <span>{inputMode === "product-list" ? "Produk / SKU Referensi" : "SKU Referensi"}</span>
                      </span>
                    </label>
                    {inputMode === "product-list" ? (
                      <>
                        <div className="seri-product-search">
                          <FiSearch size={15} />
                          <input
                            type="text"
                            value={productSearchTerm}
                            onChange={(event) => {
                              setProductSearchTerm(event.target.value);
                              setSelectedProductId("");
                              setNewSeri((prev) => ({
                                ...prev,
                                sku: "",
                                nomor_seri: productListSerialType === "stok_awal" ? buildStockAwalNomorSeri() : "",
                              }));
                            }}
                            placeholder="Cari produk atau SKU..."
                          />
                        </div>
                        <select
                          name="product_list_id"
                          required
                          value={selectedProductId}
                          onChange={handleProductSelect}
                          disabled={loadingProducts && productOptions.length === 0}
                        >
                          <option value="">
                            {loadingProducts ? "Memuat Product List..." : "Pilih produk dari Product List"}
                          </option>
                          {productOptions.map((product) => (
                            <option key={product.id} value={product.id}>
                              {getProductOptionLabel(product)}
                            </option>
                          ))}
                        </select>
                        {productError && <p className="seri-field-error">{productError}</p>}
                        {selectedProduct && (
                          <div className="seri-product-preview">
                            <span>SKU</span>
                            <strong>{newSeri.sku || "-"}</strong>
                            <small>{selectedProduct.product || "-"}</small>
                          </div>
                        )}
                      </>
                    ) : (
                      <input 
                        type="text" 
                        name="sku" 
                        required 
                        placeholder="Contoh: SET Karina"
                        value={newSeri.sku}
                        onChange={handleInputChange}
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label>Jumlah Print</label>
                    <input 
                      type="number" 
                      min="1"
                      name="jumlah"
                      value={newSeri.jumlah}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {inputMode === "product-list" && (
                  <div className="form-group">
                    <label>
                      <span className="label-content">
                        <FiFilter size={14} />
                        <span>Jenis Seri</span>
                      </span>
                    </label>
                    <select
                      name="jenis_seri"
                      value={productListSerialType}
                      onChange={handleProductListSerialTypeChange}
                      required
                    >
                      <option value="opname">Opname</option>
                      <option value="stok_awal">Stok Awal</option>
                    </select>
                    {productListSerialType === "stok_awal" && (
                      <p className="seri-field-hint">Nomor seri otomatis menggunakan format SA-SKU.</p>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label>
                    <span className="label-content">
                      <FiHash size={14} />
                      <span>Nomor Seri Unik</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    name="nomor_seri"
                    required
                    placeholder={inputMode === "product-list" && productListSerialType === "stok_awal" ? "SA-SKU" : "Contoh: AL-01"}
                    value={newSeri.nomor_seri}
                    onChange={handleInputChange}
                    readOnly={inputMode === "product-list" && productListSerialType === "stok_awal"}
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
                  <button type="submit" className="btn-primary">
                    <FiCheckCircle size={18} /> Simpan Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showSuccessModal && (
          <div className="modal-overlay">
            <div className="modal-backdrop" onClick={() => setShowSuccessModal(false)} />
            <div className="modal-content modal-content-compact">
              <div className="success-wrap">
                <div className="success-icon-wrap">
                    <FiCheckCircle size={40} />
                </div>
                <h2 className="success-title">Berhasil Disimpan</h2>
                <p className="success-text">{successMessage}</p>
                <button 
                  type="button" 
                  className="btn-primary success-btn"
                  onClick={() => setShowSuccessModal(false)}>
                  Tutup dan Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Seri;

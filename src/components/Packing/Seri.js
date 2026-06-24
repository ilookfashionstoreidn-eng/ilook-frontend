import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./Seri.css";
import API from "../../api";
import { 
  FiSearch, FiPlus, FiDownload, FiHash,
  FiBox, FiX, FiCheckCircle, FiLayers, FiDatabase, FiFilter, FiGrid, FiEdit3, FiTrash2
} from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";

const Seri = () => {
  const [seri, setSeri] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [inputMode, setInputMode] = useState("product-list");
  const [productOptions, setProductOptions] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productListSerialType, setProductListSerialType] = useState("barang_masuk");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState("");
  
  const [newSeri, setNewSeri] = useState({
    nomor_seri: "",
    sku: "",
    jumlah: "1",
  });

  const fetchSeri = useCallback(async (page = 1, search = "", status = "all") => {
    try {
      setLoading(true);
      const response = await API.get(`/seri?page=${page}&search=${encodeURIComponent(search)}&status_scan=${status}`);
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

  const buildTanpaSeriNomorSeri = (skuReference = "") => {
    const normalizedSku = String(skuReference)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return normalizedSku ? `TS-${normalizedSku}` : "TS";
  };

  const buildReturnNomorSeri = (skuReference = "") => {
    const normalizedSku = String(skuReference)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return normalizedSku ? `RTN-${normalizedSku}` : "RTN";
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
    fetchSeri(currentPage, searchTerm, activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeTab]);

  const handleSearchSubmit = () => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchSeri(1, searchTerm, activeTab);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

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

  const handleDelete = async (id, nomorSeri) => {
    const result = await Swal.fire({
      title: 'Hapus Seri?',
      text: `Apakah Anda yakin ingin menghapus nomor seri ${nomorSeri}? Data yang dihapus tidak dapat dikembalikan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#ffffff',
      customClass: {
        title: 'text-gray-800',
        content: 'text-gray-600'
      }
    });

    if (result.isConfirmed) {
      try {
        await API.delete(`/seri/${id}`);
        Swal.fire({
          title: 'Terhapus!',
          text: `Nomor seri ${nomorSeri} berhasil dihapus.`,
          icon: 'success',
          confirmButtonColor: '#3b82f6'
        });
        fetchSeri(currentPage, searchTerm, activeTab);
      } catch (error) {
        Swal.fire({
          title: 'Gagal!',
          text: error.response?.data?.message || 'Terjadi kesalahan saat menghapus data seri.',
          icon: 'error',
          confirmButtonColor: '#3b82f6'
        });
      }
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
      const response = await API.post("/seri", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await fetchSeri(currentPage, searchTerm);

      const createdSeri = response.data?.data;
      if (createdSeri && createdSeri.id) {
        await downloadQR(createdSeri.id, createdSeri.nomor_seri);
      }

      setSuccessMessage("Data seri berhasil ditambahkan.");
      setShowSuccessModal(true);
      setShowForm(false);
      setNewSeri({
        nomor_seri: "",
        sku: "",
        jumlah: "1",
      });
      setInputMode("product-list");
      setProductListSerialType("barang_masuk");
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
      setProductListSerialType("barang_masuk");
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
    if (serialType === "tanpa_seri") {
      return buildTanpaSeriNomorSeri(getProductSkuReference(product));
    }
    if (serialType === "return") {
      return buildReturnNomorSeri(getProductSkuReference(product));
    }
    if (serialType === "barang_masuk") {
      return currentNomorSeri;
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
        nomor_seri:
          productListSerialType === "stok_awal"
            ? buildStockAwalNomorSeri()
            : productListSerialType === "tanpa_seri"
            ? buildTanpaSeriNomorSeri()
            : productListSerialType === "return"
            ? buildReturnNomorSeri()
            : "",
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
        serialType === "stok_awal" ||
        serialType === "tanpa_seri" ||
        serialType === "return" ||
        prev.nomor_seri.startsWith("SA-") ||
        prev.nomor_seri.startsWith("TS-") ||
        prev.nomor_seri.startsWith("RTN-")
          ? ""
          : prev.nomor_seri
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
              <div className="seri-tabs-container">
                <div className="seri-tabs">
                  <button className={`seri-tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => handleTabChange('all')}>Semua</button>
                  <button className={`seri-tab-btn ${activeTab === 'unscanned' ? 'active' : ''}`} onClick={() => handleTabChange('unscanned')}>Belum Di-scan</button>
                  <button className={`seri-tab-btn ${activeTab === 'scanned' ? 'active' : ''}`} onClick={() => handleTabChange('scanned')}>Sudah Di-scan</button>
                </div>
              </div>

              <div className="table-header">
                <div>
                  <h3>Semua Data Seri</h3>
                </div>
                <div className="table-header-actions">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #dde3ed', borderRight: 'none', borderRadius: '8px 0 0 8px', background: '#f8fafc', paddingLeft: '12px', transition: 'border-color 0.2s, background 0.2s' }}>
                      <FiSearch color="#94a3b8" size={15} style={{ flexShrink: 0 }} />
                      <input 
                        type="text" 
                        placeholder="Cari nomor seri, SKU..." 
                        style={{ border: 'none', background: 'transparent', outline: 'none', padding: '8px 12px', width: '210px', fontSize: '13px', margin: 0 }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                      />
                    </div>
                    <button className="search-btn" onClick={handleSearchSubmit}>Cari</button>
                  </div>
                  <button className="btn-primary" onClick={() => setShowForm(true)}>
                     <FiPlus size={18} /> Tambah Seri
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%', textAlign: 'center', whiteSpace: 'nowrap' }}>No</th>
                      <th style={{ paddingLeft: '24px', width: '35%' }}>Nomor Seri</th>
                      <th style={{ width: '25%' }}>Informasi SKU</th>
                      <th style={{ width: '15%', whiteSpace: 'nowrap' }}>Tanggal Dibuat</th>
                      <th style={{ width: '15%', whiteSpace: 'nowrap' }}>Status Scan</th>
                      <th className="text-right" style={{ paddingRight: '24px', width: '5%', whiteSpace: 'nowrap' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                      {loading ? (
                        <tr className="empty-row">
                            <td colSpan="6" className="empty-state" style={{ textAlign: 'center' }}>Memuat data seri...</td>
                        </tr>
                      ) : error ? (
                        <tr className="empty-row">
                            <td colSpan="6" className="empty-state text-accent" style={{ textAlign: 'center' }}>{error}</td>
                        </tr>
                      ) : (
                        <AnimatePresence>
                          {sortedData.map((item, index) => (
                            <motion.tr 
                              key={item.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.2, delay: index * 0.05 }}
                              className="seri-table-row"
                            >
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
                                <span className="text-muted font-semibold" style={{ fontSize: '13px' }}>
                                  {dayjs(item.created_at).format('DD MMM YYYY')}
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
                                 <div className="action-buttons-group">
                                   <button className="btn-download-blue" onClick={() => downloadQR(item.id, item.nomor_seri)} title="Unduh QR">
                                      <FiDownload />
                                   </button>
                                   <button className="btn-delete-red" onClick={() => handleDelete(item.id, item.nomor_seri)} title="Hapus Seri">
                                      <FiTrash2 />
                                   </button>
                                 </div>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      )}
                    {!loading && sortedData.length === 0 && !error && (
                      <tr className="empty-row">
                        <td colSpan="6" className="empty-state">
                          Tidak ada data seri yang sesuai dengan kriteria.
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
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <span className="label-content">
                        <FiLayers size={14} />
                        <span>Produk / SKU Referensi</span>
                      </span>
                    </label>
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
                            nomor_seri:
                              productListSerialType === "stok_awal"
                                ? buildStockAwalNomorSeri()
                                : productListSerialType === "tanpa_seri"
                                ? buildTanpaSeriNomorSeri()
                                : productListSerialType === "return"
                                ? buildReturnNomorSeri()
                                : "",
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
                    <option value="barang_masuk">Barang Masuk</option>
                    <option value="tanpa_seri">Tanpa Seri</option>
                    <option value="return">Return</option>
                  </select>
                  {productListSerialType === "stok_awal" && (
                    <p className="seri-field-hint">Nomor seri otomatis menggunakan format SA-SKU.</p>
                  )}
                  {productListSerialType === "tanpa_seri" && (
                    <p className="seri-field-hint">Nomor seri otomatis menggunakan format TS-SKU.</p>
                  )}
                  {productListSerialType === "return" && (
                    <p className="seri-field-hint">Nomor seri otomatis menggunakan format RTN-SKU.</p>
                  )}
                </div>

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
                    placeholder={
                      productListSerialType === "stok_awal"
                        ? "SA-SKU"
                        : productListSerialType === "tanpa_seri"
                        ? "TS-SKU"
                        : productListSerialType === "return"
                        ? "RTN-SKU"
                        : "Contoh: AL-01"
                    }
                    value={newSeri.nomor_seri}
                    onChange={handleInputChange}
                    readOnly={
                      productListSerialType === "stok_awal" ||
                      productListSerialType === "tanpa_seri" ||
                      productListSerialType === "return"
                    }
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

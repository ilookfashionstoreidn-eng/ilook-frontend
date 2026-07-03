import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
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
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Data Seri Directory</h1>
          <span className="ks-header-sub">Kelola dan pantau semua nomor seri produk Anda di sini.</span>
        </div>
        <div className="ks-header-actions">
           <button className="ks-btn is-primary" onClick={() => setShowForm(true)}>
             <FiPlus size={16} style={{ marginRight: 8 }} /> Tambah Seri
           </button>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Total Seri (Halaman)</span>
          <span className="ks-stat-value">{totalRows}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Hasil Pencarian</span>
          <span className="ks-stat-value">{visibleRows}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Posisi Halaman</span>
          <span className="ks-stat-value">{currentPage} / {lastPage}</span>
        </div>
      </div>

      <section className="ks-board" style={{ margin: "20px" }}>
        <div className="ks-toolbar">
          <div style={{ display: "flex", gap: "16px", alignItems: "center", width: "100%", flexWrap: "wrap" }}>
             <div className="ks-search">
                <FiSearch className="ks-search-icon" />
                <input
                   type="text"
                   placeholder="Cari nomor seri, SKU..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   onKeyDown={handleSearchKeyDown}
                />
             </div>
             <button type="button" className="ks-btn is-primary" onClick={handleSearchSubmit}>
                Cari
             </button>
          </div>
        </div>

        <div style={{ padding: "0 20px", display: "flex", gap: "24px", borderBottom: "1px solid var(--ks-line)", marginBottom: "16px" }}>
            <button
                onClick={() => handleTabChange('all')}
                style={{ padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "all" ? "2px solid #155eef" : "2px solid transparent", color: activeTab === "all" ? "#155eef" : "#64748b", fontWeight: activeTab === "all" ? 600 : 500, fontSize: "14px", display: "flex", alignItems: "center" }}
            >
                Semua
            </button>
            <button
                onClick={() => handleTabChange('unscanned')}
                style={{ padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "unscanned" ? "2px solid #155eef" : "2px solid transparent", color: activeTab === "unscanned" ? "#155eef" : "#64748b", fontWeight: activeTab === "unscanned" ? 600 : 500, fontSize: "14px", display: "flex", alignItems: "center" }}
            >
                Belum Di-scan
            </button>
            <button
                onClick={() => handleTabChange('scanned')}
                style={{ padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "scanned" ? "2px solid #155eef" : "2px solid transparent", color: activeTab === "scanned" ? "#155eef" : "#64748b", fontWeight: activeTab === "scanned" ? 600 : 500, fontSize: "14px", display: "flex", alignItems: "center" }}
            >
                Sudah Di-scan
            </button>
        </div>

        <div className="ks-grid-scroll" style={{ padding: '0 20px' }}>
          <table className="ks-grid">
            <thead>
              <tr>
                <th style={{ width: '5%', textAlign: 'center' }}>No</th>
                <th style={{ width: '30%' }}>Nomor Seri</th>
                <th style={{ width: '20%' }}>Informasi SKU</th>
                <th style={{ width: '15%' }}>Tanggal Dibuat</th>
                <th style={{ width: '15%' }}>Status Scan</th>
                <th style={{ width: '10%' }}>Lokasi / Sumber</th>
                <th style={{ width: '5%', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
                {loading ? (
                  <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>Memuat data seri...</td>
                  </tr>
                ) : error ? (
                  <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#ef4444' }}>{error}</td>
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
                      >
                        <td style={{ textAlign: 'center' }}>
                            {index + 1}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#155eef' }}></span>
                            <span style={{ fontWeight: 600, color: '#155eef' }}>{item.nomor_seri}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #dde3ed', width: 'fit-content' }}>
                              <FiLayers color="#64748b" />
                              <span style={{ color: '#334155' }}>{item.sku}</span>
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>
                            {dayjs(item.created_at).format('DD MMM YYYY')}
                          </span>
                        </td>
                        <td>
                          {item.scanned_count > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '13px' }}>
                                  {item.scanned_count} / {item.jumlah} Di-scan
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }}></span>
                              <span style={{ color: '#64748b', fontSize: '13px' }}>Belum di-scan</span>
                            </div>
                          )}
                        </td>
                        <td>
                          {item.scanned_count > 0 ? (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {Array.from(new Set(item.scanned_details?.map(d => d.source) || [])).map(source => (
                                  <span key={source} style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', padding: '2px 6px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>{source}</span>
                                ))}
                              </div>
                          ) : (
                              <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button onClick={() => downloadQR(item.id, item.nomor_seri)} title="Unduh QR" style={{ padding: '6px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                <FiDownload size={16} />
                              </button>
                              <button onClick={() => handleDelete(item.id, item.nomor_seri)} title="Hapus Seri" style={{ padding: '6px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              {!loading && sortedData.length === 0 && !error && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    Tidak ada data seri yang sesuai dengan kriteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && sortedData.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--ks-line)' }}>
            <button className="ks-btn" disabled={currentPage === 1} onClick={() => fetchSeri(currentPage - 1, searchTerm)}>
              Sebelumnya
            </button>
            <span style={{ fontSize: '13px', color: 'var(--ks-text-soft)' }}>
              Halaman {currentPage} dari {lastPage}
            </span>
            <button className="ks-btn" disabled={currentPage === lastPage} onClick={() => fetchSeri(currentPage + 1, searchTerm)}>
              Selanjutnya
            </button>
          </div>
        )}
      </section>

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

import React, { useEffect, useMemo, useRef, useState } from "react";
import "./HppProduk.css";
import API from "../../api";
import { FaChevronDown, FaEdit, FaFilePdf, FaInfoCircle, FaPlus, FaSearch, FaTimes } from "react-icons/fa";
import { FiBox } from "react-icons/fi";

const HppProduk = () => {
  const [produks, setProduks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCustomJenis, setShowCustomJenis] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [addModalTab, setAddModalTab] = useState("info");
  const [editModalTab, setEditModalTab] = useState("info");
  const [selectedProduk, setSelectedProduk] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editKomponenList, setEditKomponenList] = useState([]);
  const [bahanList, setBahanList] = useState([]);
  const [aksesorisList, setAksesorisList] = useState([]);
  const [productGroupOptions, setProductGroupOptions] = useState([]);
  const [newProductGroupOpen, setNewProductGroupOpen] = useState(false);
  const [newProductGroupSearch, setNewProductGroupSearch] = useState("");
  const [editProductGroupOpen, setEditProductGroupOpen] = useState(false);
  const [editProductGroupSearch, setEditProductGroupSearch] = useState("");
  const [newSkuList, setNewSkuList] = useState([]);
  const [editSkuList, setEditSkuList] = useState([]);
  const [openBahanDropdown, setOpenBahanDropdown] = useState(null);
  const [bahanSearchTerms, setBahanSearchTerms] = useState({});
  const newProductGroupRef = useRef(null);
  const editProductGroupRef = useRef(null);
  const [newProduk, setNewProduk] = useState({
    nama_produk: "",
    kategori_produk: "",
    jenis_produk: "",
    product_group: "",
    ld_s: "",
    ld_m: "",
    ld_l: "",
    ld_xl: "",
    pj_dress: "",
    pj_celana: "",
    pj_baju: "",
    gambar_produk: null,
    status_produk: "sementara",
    harga_jasa_cutting: "",
    harga_jasa_cmt: "",
    harga_jasa_aksesoris: "",
    harga_overhead: "",
  });
  const [editProduk, setEditProduk] = useState({
    id: "",
    nama_produk: "",
    kategori_produk: "",
    jenis_produk: "",
    product_group: "",
    ld_s: "",
    ld_m: "",
    ld_l: "",
    ld_xl: "",
    pj_dress: "",
    pj_celana: "",
    pj_baju: "",
    gambar_produk: null,
    status_produk: "",
    harga_jasa_cutting: "",
    harga_jasa_cmt: "",
    harga_jasa_aksesoris: "",
    harga_overhead: "",
  });
  const [komponenList, setKomponenList] = useState([
    {
      jenis_komponen: "atasan",
      sumber_komponen: "bahan", // akan otomatis jadi "aksesoris" jika jenis_komponen = aksesoris
      bahan_id: "",
      aksesoris_id: "",
      harga_bahan: "",
      jumlah_bahan: "",
    },
  ]);
  const [warnaList, setWarnaList] = useState([""]);
  const [ukuranList, setUkuranList] = useState([""]);
  const [editWarnaList, setEditWarnaList] = useState([""]);
  const [editUkuranList, setEditUkuranList] = useState([""]);
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const extractCurrencyDigits = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    return raw.replace(/\D/g, "");
  };

  // API decimals such as "10000.00" must display as 10.000, not 1.000.000.
  const normalizeCurrencyDigits = (value) => {
    if (value === null || value === undefined) return "";

    if (typeof value === "number") {
      if (!Number.isFinite(value)) return "";
      return String(Math.trunc(value));
    }

    const raw = String(value).trim();
    if (!raw) return "";

    const numericOnly = raw.replace(/[^0-9.,-]/g, "");
    if (!numericOnly) return "";

    const isNegative = numericOnly.startsWith("-");
    const unsigned = isNegative ? numericOnly.slice(1) : numericOnly;

    if (/^\d+$/.test(unsigned)) {
      return `${isNegative ? "-" : ""}${unsigned}`;
    }

    const lastDot = unsigned.lastIndexOf(".");
    const lastComma = unsigned.lastIndexOf(",");
    const lastSeparator = Math.max(lastDot, lastComma);

    if (lastSeparator === -1) {
      return `${isNegative ? "-" : ""}${unsigned.replace(/\D/g, "")}`;
    }

    const integerPart = unsigned.slice(0, lastSeparator);
    const decimalPart = unsigned.slice(lastSeparator + 1);

    if (decimalPart.length > 0 && decimalPart.length <= 2) {
      const integerDigits = integerPart.replace(/\D/g, "");
      return `${isNegative ? "-" : ""}${integerDigits || "0"}`;
    }

    return `${isNegative ? "-" : ""}${unsigned.replace(/\D/g, "")}`;
  };

  const formatRupiahDisplay = (value) => {
    const digits = normalizeCurrencyDigits(value);
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const formatRupiahValue = (value) => {
    const digits = normalizeCurrencyDigits(value);
    if (!digits) return "0";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const showFeedback = (type, title, message) => {
    setFeedbackModal({ open: true, type, title, message });
  };

  const closeFeedback = () => {
    setFeedbackModal((prev) => ({ ...prev, open: false }));
  };

  const getApiErrorMessage = (error, fallbackMessage) => {
    const serverMessage = error?.response?.data?.message;
    const validationErrors = error?.response?.data?.errors;

    if (validationErrors && typeof validationErrors === "object") {
      const firstError = Object.values(validationErrors)?.[0];
      if (Array.isArray(firstError) && firstError.length > 0) {
        return firstError[0];
      }
    }

    if (typeof serverMessage === "string" && serverMessage.trim()) {
      if (serverMessage.toLowerCase().includes("duplicate entry")) {
        return "Kombinasi SKU sudah ada. Cek kembali warna dan ukuran agar tidak duplikat.";
      }
      return serverMessage;
    }

    return fallbackMessage;
  };

  const normalizeSkuValue = (value) => String(value ?? "").trim().toUpperCase();

  const findDuplicateSkuCombination = (warnaSource, ukuranSource) => {
    const warnaNormalized = (warnaSource || [])
      .map(normalizeSkuValue)
      .filter(Boolean);
    const ukuranNormalized = (ukuranSource || [])
      .map(normalizeSkuValue)
      .filter(Boolean);

    if (!warnaNormalized.length || !ukuranNormalized.length) {
      return null;
    }

    const pairSet = new Set();

    for (const warna of warnaNormalized) {
      for (const ukuran of ukuranNormalized) {
        const key = `${warna}__${ukuran}`;
        if (pairSet.has(key)) {
          return { warna, ukuran };
        }
        pairSet.add(key);
      }
    }

    return null;
  };

  const handleCurrencyChange = (mode, field, value) => {
    const digitsOnly = extractCurrencyDigits(value);

    if (mode === "new") {
      setNewProduk((prev) => ({ ...prev, [field]: digitsOnly }));
      return;
    }

    setEditProduk((prev) => ({ ...prev, [field]: digitsOnly }));
  };

  const addKomponen = () => {
    setKomponenList([
      ...komponenList,
      {
        jenis_komponen: "bawahan",
        sumber_komponen: "bahan", // diset otomatis sesuai jenis_komponen
        bahan_id: "",
        aksesoris_id: "",
        harga_bahan: "",
        jumlah_bahan: "",
        satuan_bahan: "",
      },
    ]);
  };

  const fetchAksesoris = async () => {
    try {
      const res = await API.get("/aksesoris");
      setAksesorisList(res.data.data || res.data);
    } catch (err) {
      console.error("Gagal fetch aksesoris", err);
    }
  };

  const normalizeSkuItems = (items) =>
    (Array.isArray(items) ? items : [])
      .map((item) => ({
        sku: String(item?.sku || "").trim(),
        warna: String(item?.warna || "").trim(),
        ukuran: String(item?.ukuran || "").trim(),
      }))
      .filter((item) => item.sku);

  const getBahanDropdownKey = (mode, index) => `${mode}-${index}`;

  const getBahanSearchText = (bahan) => String(bahan?.nama_bahan || "").trim();

  const getBahanDisplayLabel = (bahan) => {
    const nama = String(bahan?.nama_bahan || "").trim() || "Tanpa Nama";
    const harga = formatRupiahValue(bahan?.harga);
    const satuan = String(bahan?.satuan || "").trim();

    return `${nama} - Rp ${harga}${satuan ? ` (${satuan})` : ""}`;
  };

  const getJenisKomponenLabel = (value) => {
    const normalized = String(value || "").trim().toLowerCase();

    const labels = {
      atasan: "Bahan Utama",
      bawahan: "Bahan Kombinasi",
      aksesoris: "Aksesoris",
      fullbody: "Fullbody",
      bahan_utama: "Bahan Utama",
      bahan_kombinasi: "Bahan Kombinasi",
    };

    if (labels[normalized]) {
      return labels[normalized];
    }

    if (!normalized) {
      return "";
    }

    return normalized
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getKomponenBadgeLabel = (komp, index, komponenItems = []) => {
    if (komp?.sumber_komponen === "aksesoris") {
      return "Aksesoris";
    }

    const bahanIndex = komponenItems
      .slice(0, index)
      .filter((item) => item?.sumber_komponen !== "aksesoris").length;

    return bahanIndex === 0 ? "Bahan Utama" : `Bahan Kombinasi ${bahanIndex}`;
  };

  const filterBahanOptions = (searchValue) => {
    const term = String(searchValue || "").trim().toLowerCase();

    if (!term) {
      return bahanList;
    }

    return bahanList.filter((bahan) =>
      [bahan?.nama_bahan, bahan?.harga, bahan?.satuan].some((field) => String(field ?? "").toLowerCase().includes(term))
    );
  };

  const setBahanSearchValue = (mode, index, value) => {
    const key = getBahanDropdownKey(mode, index);

    setBahanSearchTerms((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const openBahanSearchDropdown = (mode, index, currentBahanId) => {
    const key = getBahanDropdownKey(mode, index);
    const currentBahan = bahanList.find((item) => String(item.id) === String(currentBahanId));
    const isSameDropdown = openBahanDropdown?.mode === mode && openBahanDropdown?.index === index;

    if (isSameDropdown) {
      setOpenBahanDropdown(null);
      return;
    }

    setBahanSearchTerms((prevTerms) => ({
      ...prevTerms,
      [key]: currentBahan ? getBahanSearchText(currentBahan) : prevTerms[key] || "",
    }));
    setOpenBahanDropdown({ mode, index });
  };

  const closeBahanSearchDropdown = () => {
    setOpenBahanDropdown(null);
  };

  const updateKomponenBahanSelection = (mode, index, bahanId) => {
    const selectedBahan = bahanList.find((item) => String(item.id) === String(bahanId));
    const payload = {
      bahan_id: String(bahanId || ""),
      harga_bahan: selectedBahan?.harga ?? "",
      satuan_bahan: selectedBahan?.satuan ?? "",
    };

    if (mode === "edit") {
      setEditKomponenList((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, ...payload } : item)));
    } else {
      setKomponenList((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, ...payload } : item)));
    }

    const key = getBahanDropdownKey(mode, index);
    setBahanSearchTerms((prev) => ({
      ...prev,
      [key]: selectedBahan ? getBahanSearchText(selectedBahan) : "",
    }));
    setOpenBahanDropdown(null);
  };

  const renderBahanSearchableSelect = (mode, index, komp) => {
    const key = getBahanDropdownKey(mode, index);
    const isOpen = openBahanDropdown?.mode === mode && openBahanDropdown?.index === index;
    const selectedBahan = bahanList.find((item) => String(item.id) === String(komp.bahan_id));
    const searchValue = bahanSearchTerms[key] ?? (selectedBahan ? getBahanSearchText(selectedBahan) : "");
    const filteredBahan = filterBahanOptions(searchValue);

    return (
      <div className="hpp-searchable-select" data-bahan-searchable-select="true">
        <button
          type="button"
          className="hpp-searchable-select-trigger"
          onClick={() => openBahanSearchDropdown(mode, index, komp.bahan_id)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={selectedBahan ? "" : "placeholder"}>{selectedBahan ? getBahanDisplayLabel(selectedBahan) : "Pilih Bahan"}</span>
          <FaChevronDown />
        </button>

        {isOpen && (
          <div className="hpp-searchable-select-menu">
            <div className="hpp-searchable-select-search">
              <FaSearch />
              <input
                type="text"
                value={searchValue}
                onChange={(event) => setBahanSearchValue(mode, index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                  }

                  if (event.key === "Escape") {
                    closeBahanSearchDropdown();
                  }
                }}
                placeholder="Cari bahan..."
                autoFocus
              />
              {searchValue && (
                <button type="button" onClick={() => setBahanSearchValue(mode, index, "")} aria-label="Bersihkan pencarian bahan">
                  <FaTimes />
                </button>
              )}
            </div>

            <div className="hpp-searchable-select-options" role="listbox">
              {filteredBahan.length ? (
                filteredBahan.map((bahan) => (
                  <button
                    type="button"
                    key={bahan.id}
                    className={`hpp-searchable-option${String(komp.bahan_id) === String(bahan.id) ? " selected" : ""}`}
                    onClick={() => updateKomponenBahanSelection(mode, index, bahan.id)}
                    role="option"
                    aria-selected={String(komp.bahan_id) === String(bahan.id)}
                  >
                    {getBahanDisplayLabel(bahan)}
                  </button>
                ))
              ) : (
                <div className="hpp-searchable-empty">Bahan tidak ditemukan.</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const filteredNewProductGroupOptions = useMemo(() => {
    const term = newProductGroupSearch.trim().toLowerCase();

    if (!term) {
      return productGroupOptions;
    }

    return productGroupOptions.filter((group) => String(group).toLowerCase().includes(term));
  }, [productGroupOptions, newProductGroupSearch]);

  const filteredEditProductGroupOptions = useMemo(() => {
    const term = editProductGroupSearch.trim().toLowerCase();

    if (!term) {
      return productGroupOptions;
    }

    return productGroupOptions.filter((group) => String(group).toLowerCase().includes(term));
  }, [productGroupOptions, editProductGroupSearch]);

  const fetchProductGroups = async () => {
    try {
      const res = await API.get("/product-list/hpp-catalog");
      setProductGroupOptions(res.data.groups || []);
    } catch (err) {
      console.error("Gagal fetch product group", err);
      setProductGroupOptions([]);
    }
  };

  const handleProductGroupToggle = (mode) => {
    const isEdit = mode === "edit";
    const currentValue = isEdit ? editProduk.product_group : newProduk.product_group;
    const setOpen = isEdit ? setEditProductGroupOpen : setNewProductGroupOpen;
    const setSearch = isEdit ? setEditProductGroupSearch : setNewProductGroupSearch;

    setOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        setSearch(currentValue || "");
      }
      return nextOpen;
    });
  };

  const handleProductGroupSelect = (mode, productGroup) => {
    if (mode === "edit") {
      setEditProductGroupSearch(productGroup || "");
      setEditProductGroupOpen(false);
    } else {
      setNewProductGroupSearch(productGroup || "");
      setNewProductGroupOpen(false);
    }

    applyProductGroupSelection(mode, productGroup);
  };

  const renderProductGroupSelect = (mode) => {
    const isEdit = mode === "edit";
    const selectedValue = isEdit ? editProduk.product_group : newProduk.product_group;
    const isOpen = isEdit ? editProductGroupOpen : newProductGroupOpen;
    const searchValue = isEdit ? editProductGroupSearch : newProductGroupSearch;
    const setSearchValue = isEdit ? setEditProductGroupSearch : setNewProductGroupSearch;
    const filteredOptions = isEdit ? filteredEditProductGroupOptions : filteredNewProductGroupOptions;
    const dropdownRef = isEdit ? editProductGroupRef : newProductGroupRef;

    return (
      <div className="hpp-form-group">
        <label>Product Group</label>
        <div className={`hpp-searchable-select${isOpen ? " open" : ""}`} ref={dropdownRef}>
          <button
            type="button"
            className="hpp-searchable-select-trigger"
            onClick={() => handleProductGroupToggle(mode)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className={selectedValue ? "" : "placeholder"}>{selectedValue || "Pilih Product Group"}</span>
            <FaChevronDown />
          </button>

          {isOpen && (
            <div className="hpp-searchable-select-menu">
              <div className="hpp-searchable-select-search">
                <FaSearch />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                    }
                    if (event.key === "Escape") {
                      isEdit ? setEditProductGroupOpen(false) : setNewProductGroupOpen(false);
                    }
                  }}
                  placeholder="Cari product group..."
                  autoFocus
                />
                {searchValue && (
                  <button type="button" onClick={() => setSearchValue("")} aria-label="Bersihkan pencarian product group">
                    <FaTimes />
                  </button>
                )}
              </div>

              <div className="hpp-searchable-select-options" role="listbox">
                {filteredOptions.length ? (
                  filteredOptions.map((group) => (
                    <button
                      type="button"
                      className={`hpp-searchable-option${selectedValue === group ? " selected" : ""}`}
                      key={group}
                      onClick={() => handleProductGroupSelect(mode, group)}
                      role="option"
                      aria-selected={selectedValue === group}
                    >
                      {group}
                    </button>
                  ))
                ) : (
                  <div className="hpp-searchable-empty">Product Group tidak ditemukan.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const applyProductGroupSelection = async (mode, productGroup) => {
    const setProduk = mode === "edit" ? setEditProduk : setNewProduk;
    const setSkuList = mode === "edit" ? setEditSkuList : setNewSkuList;

    setProduk((prev) => ({
      ...prev,
      product_group: productGroup,
      jenis_produk: productGroup ? prev.jenis_produk : "",
      nama_produk: productGroup ? prev.nama_produk : "",
      ld_s: productGroup ? prev.ld_s : "",
      ld_m: productGroup ? prev.ld_m : "",
      ld_l: productGroup ? prev.ld_l : "",
      ld_xl: productGroup ? prev.ld_xl : "",
      pj_dress: productGroup ? prev.pj_dress : "",
      pj_celana: productGroup ? prev.pj_celana : "",
      pj_baju: productGroup ? prev.pj_baju : "",
    }));

    if (!productGroup) {
      setSkuList([]);
      return;
    }

    try {
      const res = await API.get("/product-list/hpp-catalog", {
        params: { product_group: productGroup },
      });
      const catalog = res.data || {};
      const skuItems = normalizeSkuItems(catalog.sku_items);

      setProduk((prev) => ({
        ...prev,
        product_group: catalog.product_group || productGroup,
        jenis_produk: catalog.jenis_produk || "",
        nama_produk: catalog.nama_produk || "",
        ld_s: catalog.ld_s ?? "",
        ld_m: catalog.ld_m ?? "",
        ld_l: catalog.ld_l ?? "",
        ld_xl: catalog.ld_xl ?? "",
        pj_dress: catalog.pj_dress ?? "",
        pj_celana: catalog.pj_celana ?? "",
        pj_baju: catalog.pj_baju ?? "",
        harga_jasa_cutting: catalog.price_cutting ?? prev.harga_jasa_cutting,
        harga_jasa_cmt: catalog.price_cmt ?? prev.harga_jasa_cmt,
      }));
      setSkuList(skuItems);
    } catch (err) {
      setSkuList([]);
      showFeedback("error", "Product Group Tidak Bisa Dimuat", getApiErrorMessage(err, "Gagal mengambil detail Product Group."));
    }
  };

  useEffect(() => {
    fetchAksesoris();
    fetchProductGroups();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (newProductGroupRef.current && !newProductGroupRef.current.contains(event.target)) {
        setNewProductGroupOpen(false);
      }

      if (editProductGroupRef.current && !editProductGroupRef.current.contains(event.target)) {
        setEditProductGroupOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest('[data-bahan-searchable-select="true"]')) {
        return;
      }

      setOpenBahanDropdown(null);
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProduks = async () => {
      try {
        setLoading(true);
        const response = await API.get(`/produk`, {
          params: {
            kategori_produk: selectedKategori || "",
            status_produk: selectedStatus || "",
            search: searchTerm || "",
            page: currentPage,
            per_page: 7,
          },
        });
        setProduks(response.data.data || []);
        setCurrentPage(response.data.current_page || 1);
        setLastPage(response.data.last_page || 1);
        setTotal(response.data.total || 0);
      } catch (error) {
        setError("Gagal mengambil data produk.");
      } finally {
        setLoading(false);
      }
    };

    const fetchBahans = async () => {
      try {
        const res = await API.get("/bahan");
        setBahanList(res.data.data || res.data);
      } catch (err) {
        console.error("Gagal fetch bahan:", err);
      }
    };

    fetchBahans();
    fetchProduks();
  }, [selectedKategori, selectedStatus, searchTerm, currentPage]);

  // Reset ke page 1 ketika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKategori, selectedStatus, searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeAddModal = () => {
    setShowForm(false);
    setAddModalTab("info");
    setNewProductGroupOpen(false);
    setNewProductGroupSearch("");
    setOpenBahanDropdown(null);
    setBahanSearchTerms({});
  };

  const closeEditModal = () => {
    setShowEditForm(false);
    setEditModalTab("info");
    setEditSkuList([]);
    setEditProductGroupOpen(false);
    setEditProductGroupSearch("");
    setOpenBahanDropdown(null);
    setBahanSearchTerms({});
  };

  const openAddModal = () => {
    setAddModalTab("info");
    setKomponenList([
      {
        jenis_komponen: "atasan",
        sumber_komponen: "bahan",
        bahan_id: "",
        aksesoris_id: "",
        harga_bahan: "",
        jumlah_bahan: "",
        satuan_bahan: "",
      },
    ]);
    setNewProduk({
      nama_produk: "",
      kategori_produk: "",
      jenis_produk: "",
      product_group: "",
      ld_s: "",
      ld_m: "",
      ld_l: "",
      ld_xl: "",
      pj_dress: "",
      pj_celana: "",
      pj_baju: "",
      gambar_produk: null,
      status_produk: "sementara",
      harga_jasa_cutting: "",
      harga_jasa_cmt: "",
      harga_jasa_aksesoris: "",
      harga_overhead: "",
    });
    setNewProductGroupOpen(false);
    setNewProductGroupSearch("");
    setOpenBahanDropdown(null);
    setBahanSearchTerms({});
    setNewSkuList([]);
    setWarnaList([""]);
    setUkuranList([""]);
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!String(newProduk.product_group || "").trim()) {
      showFeedback("warning", "Product Group Wajib Dipilih", "Pilih product group terlebih dahulu agar data produk dan SKU bisa terisi otomatis.");
      setAddModalTab("info");
      return;
    }

    const duplicatePair = newSkuList.length ? null : findDuplicateSkuCombination(warnaList, ukuranList);
    if (duplicatePair) {
      showFeedback(
        "warning",
        "Kombinasi SKU Duplikat",
        `Kombinasi warna ${duplicatePair.warna} dan ukuran ${duplicatePair.ukuran} terdeteksi lebih dari sekali.`
      );
      setAddModalTab("sku");
      return;
    }

    const formData = new FormData();

    // ===== DATA PRODUK =====
    formData.append("nama_produk", newProduk.nama_produk);
    formData.append("kategori_produk", newProduk.kategori_produk);
    formData.append("jenis_produk", newProduk.jenis_produk);
    formData.append("product_group", newProduk.product_group || "");
    formData.append("ld_s", newProduk.ld_s || "");
    formData.append("ld_m", newProduk.ld_m || "");
    formData.append("ld_l", newProduk.ld_l || "");
    formData.append("ld_xl", newProduk.ld_xl || "");
    formData.append("pj_dress", newProduk.pj_dress || "");
    formData.append("pj_celana", newProduk.pj_celana || "");
    formData.append("pj_baju", newProduk.pj_baju || "");
    formData.append("harga_jasa_cutting", newProduk.harga_jasa_cutting || 0);
    formData.append("harga_jasa_cmt", newProduk.harga_jasa_cmt || 0);
    formData.append("harga_jasa_aksesoris", newProduk.harga_jasa_aksesoris || 0);
    formData.append("harga_overhead", newProduk.harga_overhead || 0);

    if (newProduk.gambar_produk) {
      formData.append("gambar_produk", newProduk.gambar_produk);
    }

    if (newSkuList.length) {
      newSkuList.forEach((item, index) => {
        formData.append(`sku_items[${index}][sku]`, item.sku);
        formData.append(`sku_items[${index}][warna]`, item.warna || "");
        formData.append(`sku_items[${index}][ukuran]`, item.ukuran || "");
      });
    } else {
      // ===== WARNA DAN UKURAN =====
      warnaList.forEach((warna) => {
        if (warna && warna.trim()) {
          formData.append("warna[]", warna.trim());
        }
      });

      ukuranList.forEach((ukuran) => {
        if (ukuran && ukuran.trim()) {
          formData.append("ukuran[]", ukuran.trim());
        }
      });
    }

    // ===== KOMponen =====
    komponenList.forEach((komp, index) => {
      formData.append(`komponen[${index}][jenis_komponen]`, komp.jenis_komponen);

      formData.append(`komponen[${index}][sumber_komponen]`, komp.sumber_komponen);

      formData.append(`komponen[${index}][jumlah_bahan]`, komp.jumlah_bahan);

      if (komp.sumber_komponen === "bahan") {
        formData.append(`komponen[${index}][bahan_id]`, komp.bahan_id);
      }

      if (komp.sumber_komponen === "aksesoris") {
        formData.append(`komponen[${index}][aksesoris_id]`, komp.aksesoris_id);
      }
    });

    try {
      await API.post("/produk", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      showFeedback("success", "Berhasil", "Produk berhasil ditambahkan.");

      // Refresh data dengan pagination
      const refreshResponse = await API.get(`/produk`, {
        params: {
          kategori_produk: selectedKategori || "",
          status_produk: selectedStatus || "",
          search: searchTerm || "",
          page: currentPage,
          per_page: 7,
        },
      });
      setProduks(refreshResponse.data.data || []);
      setCurrentPage(refreshResponse.data.current_page || 1);
      setLastPage(refreshResponse.data.last_page || 1);
      setTotal(refreshResponse.data.total || 0);

      // ===== RESET FORM =====
      setNewProduk({
        nama_produk: "",
        kategori_produk: "",
        jenis_produk: "",
        product_group: "",
        ld_s: "",
        ld_m: "",
        ld_l: "",
        ld_xl: "",
        pj_dress: "",
        pj_celana: "",
        pj_baju: "",
        gambar_produk: null,
        harga_jasa_cutting: "",
        harga_jasa_cmt: "",
        harga_jasa_aksesoris: "",
        harga_overhead: "",
      });

      setKomponenList([
        {
          jenis_komponen: "",
          sumber_komponen: "bahan",
          bahan_id: "",
          aksesoris_id: "",
          harga_bahan: "",
          jumlah_bahan: "",
          satuan_bahan: "",
        },
      ]);
      setWarnaList([""]);
      setUkuranList([""]);
      setNewSkuList([]);
      closeAddModal();
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      showFeedback("error", "Gagal Menyimpan", getApiErrorMessage(error, "Terjadi kesalahan saat menyimpan produk."));
    }
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();

    const duplicatePair = editSkuList.length ? null : findDuplicateSkuCombination(editWarnaList, editUkuranList);
    if (duplicatePair) {
      showFeedback(
        "warning",
        "Kombinasi SKU Duplikat",
        `Kombinasi warna ${duplicatePair.warna} dan ukuran ${duplicatePair.ukuran} terdeteksi lebih dari sekali.`
      );
      setEditModalTab("sku");
      return;
    }

    const formData = new FormData();

    formData.append("nama_produk", editProduk.nama_produk);
    formData.append("kategori_produk", editProduk.kategori_produk);
    formData.append("jenis_produk", editProduk.jenis_produk);
    formData.append("product_group", editProduk.product_group || "");
    formData.append("ld_s", editProduk.ld_s || "");
    formData.append("ld_m", editProduk.ld_m || "");
    formData.append("ld_l", editProduk.ld_l || "");
    formData.append("ld_xl", editProduk.ld_xl || "");
    formData.append("pj_dress", editProduk.pj_dress || "");
    formData.append("pj_celana", editProduk.pj_celana || "");
    formData.append("pj_baju", editProduk.pj_baju || "");

    formData.append("harga_jasa_cutting", editProduk.harga_jasa_cutting || 0);
    formData.append("harga_jasa_cmt", editProduk.harga_jasa_cmt || 0);
    formData.append("harga_jasa_aksesoris", editProduk.harga_jasa_aksesoris || 0);
    formData.append("harga_overhead", editProduk.harga_overhead || 0);

    formData.append("status_produk", editProduk.status_produk || "Sementara");

    // gambar (jika diganti)
    if (editProduk.gambar_produk instanceof File) {
      formData.append("gambar_produk", editProduk.gambar_produk);
    }

    if (editSkuList.length) {
      editSkuList.forEach((item, index) => {
        formData.append(`sku_items[${index}][sku]`, item.sku);
        formData.append(`sku_items[${index}][warna]`, item.warna || "");
        formData.append(`sku_items[${index}][ukuran]`, item.ukuran || "");
      });
    } else {
      // ===== WARNA DAN UKURAN =====
      editWarnaList.forEach((warna) => {
        if (warna && warna.trim()) {
          formData.append("warna[]", warna.trim());
        }
      });

      editUkuranList.forEach((ukuran) => {
        if (ukuran && ukuran.trim()) {
          formData.append("ukuran[]", ukuran.trim());
        }
      });
    }

    // komponen
    editKomponenList.forEach((komp, index) => {
      formData.append(`komponen[${index}][jenis_komponen]`, komp.jenis_komponen);

      formData.append(`komponen[${index}][sumber_komponen]`, komp.sumber_komponen);

      if (komp.sumber_komponen === "bahan") {
        formData.append(`komponen[${index}][bahan_id]`, komp.bahan_id);
      }

      if (komp.sumber_komponen === "aksesoris") {
        formData.append(`komponen[${index}][aksesoris_id]`, komp.aksesoris_id);
      }

      formData.append(`komponen[${index}][jumlah_bahan]`, komp.jumlah_bahan);
    });

    // method spoofing Laravel
    formData.append("_method", "PUT");

    try {
      await API.post(`/produk/${editProduk.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      showFeedback("success", "Berhasil", "Produk berhasil diperbarui.");

      // Refresh data dengan pagination
      const refreshResponse = await API.get(`/produk`, {
        params: {
          kategori_produk: selectedKategori || "",
          status_produk: selectedStatus || "",
          search: searchTerm || "",
          page: currentPage,
          per_page: 7,
        },
      });
      setProduks(refreshResponse.data.data || []);
      setCurrentPage(refreshResponse.data.current_page || 1);
      setLastPage(refreshResponse.data.last_page || 1);
      setTotal(refreshResponse.data.total || 0);

      setEditWarnaList([""]);
      setEditUkuranList([""]);
      closeEditModal();
    } catch (error) {
      console.error("Update error:", error.response?.data || error.message);
      showFeedback("error", "Gagal Memperbarui", getApiErrorMessage(error, "Terjadi kesalahan saat update produk."));
    }
  };

  const handleKomponenChange = (index, field, value) => {
    const updatedKomponen = [...komponenList];

    if (field === "jenis_komponen") {
      const isAks = value === "aksesoris";
      updatedKomponen[index] = {
        ...updatedKomponen[index],
        jenis_komponen: value,
        sumber_komponen: isAks ? "aksesoris" : "bahan",
        bahan_id: isAks ? "" : updatedKomponen[index].bahan_id,
        aksesoris_id: isAks ? updatedKomponen[index].aksesoris_id : "",
        harga_bahan: "",
        jumlah_bahan: "",
        satuan_bahan: isAks ? "pcs" : "",
      };
    } else {
      updatedKomponen[index][field] = value;
    }

    setKomponenList(updatedKomponen);
  };

  const removeKomponen = (index) => {
    const updatedKomponen = [...komponenList];
    updatedKomponen.splice(index, 1);
    setKomponenList(updatedKomponen);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (showEditForm) {
      setEditProduk((prev) => ({
        ...prev,
        gambar_produk: file,
      }));
    } else {
      setNewProduk((prev) => ({
        ...prev,
        gambar_produk: file,
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Jika untuk newProduk
    setNewProduk((prev) => ({
      ...prev,
      [name]: value, // Menggunakan name dari input untuk mengubah state
    }));

    // Jika untuk editProduk
    setEditProduk((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditClick = async (produk) => {
    setEditProduk({
      id: produk.id,
      nama_produk: produk.nama_produk,
      kategori_produk: produk.kategori_produk,
      jenis_produk: produk.jenis_produk,
      product_group: produk.product_group || "",
      ld_s: produk.ld_s || "",
      ld_m: produk.ld_m || "",
      ld_l: produk.ld_l || "",
      ld_xl: produk.ld_xl || "",
      pj_dress: produk.pj_dress ?? "",
      pj_celana: produk.pj_celana ?? "",
      pj_baju: produk.pj_baju ?? "",
      status_produk: produk.status_produk ?? "",
      gambar_produk: produk.gambar_produk,
      harga_jasa_cutting: produk.harga_jasa_cutting || "",
      harga_jasa_cmt: produk.harga_jasa_cmt || "",
      harga_jasa_aksesoris: produk.harga_jasa_aksesoris || "",
      harga_overhead: produk.harga_overhead || "",
    });
    setEditProductGroupOpen(false);
    setEditProductGroupSearch(produk.product_group || "");
    setOpenBahanDropdown(null);
    setBahanSearchTerms({});
    setEditKomponenList(
      (produk.komponen || []).map((k) => ({
        jenis_komponen: k.jenis_komponen,
        sumber_komponen: k.sumber_komponen,
        bahan_id: k.bahan_id || "",
        aksesoris_id: k.aksesoris_id || "",
        harga_bahan: k.harga_bahan,
        jumlah_bahan: k.jumlah_bahan,
        satuan_bahan: k.satuan_bahan,
      }))
    );

    // Ambil data SKU untuk mendapatkan warna dan ukuran
    try {
      const response = await API.get(`/produk/${produk.id}`);
      const produkDetail = response.data;
      
      if (produkDetail.skus && produkDetail.skus.length > 0) {
        // Ambil unique warna dan ukuran dari SKU
        const uniqueWarna = [...new Set(produkDetail.skus.map(sku => sku.warna))];
        const uniqueUkuran = [...new Set(produkDetail.skus.map(sku => sku.ukuran))];
        
        setEditWarnaList(uniqueWarna.length > 0 ? uniqueWarna : [""]);
        setEditUkuranList(uniqueUkuran.length > 0 ? uniqueUkuran : [""]);
        setEditSkuList(normalizeSkuItems(produkDetail.skus));
      } else {
        setEditWarnaList([""]);
        setEditUkuranList([""]);
        setEditSkuList([]);
      }
    } catch (error) {
      console.error("Error fetching produk detail:", error);
      setEditWarnaList([""]);
      setEditUkuranList([""]);
      setEditSkuList([]);
    }

    setEditModalTab("info");
    setShowEditForm(true);
  };

  // Fungsi untuk handle warna dan ukuran
  const handleWarnaChange = (index, value) => {
    const updated = [...warnaList];
    updated[index] = value;
    setWarnaList(updated);
  };

  const addWarna = () => {
    setWarnaList([...warnaList, ""]);
  };

  const removeWarna = (index) => {
    if (warnaList.length > 1) {
      setWarnaList(warnaList.filter((_, i) => i !== index));
    }
  };

  const handleUkuranChange = (index, value) => {
    const updated = [...ukuranList];
    updated[index] = value;
    setUkuranList(updated);
  };

  const addUkuran = () => {
    setUkuranList([...ukuranList, ""]);
  };

  const removeUkuran = (index) => {
    if (ukuranList.length > 1) {
      setUkuranList(ukuranList.filter((_, i) => i !== index));
    }
  };

  // Fungsi untuk handle edit warna dan ukuran
  const handleEditWarnaChange = (index, value) => {
    const updated = [...editWarnaList];
    updated[index] = value;
    setEditWarnaList(updated);
  };

  const addEditWarna = () => {
    setEditWarnaList([...editWarnaList, ""]);
  };

  const removeEditWarna = (index) => {
    if (editWarnaList.length > 1) {
      setEditWarnaList(editWarnaList.filter((_, i) => i !== index));
    }
  };

  const handleEditUkuranChange = (index, value) => {
    const updated = [...editUkuranList];
    updated[index] = value;
    setEditUkuranList(updated);
  };

  const addEditUkuran = () => {
    setEditUkuranList([...editUkuranList, ""]);
  };

  const removeEditUkuran = (index) => {
    if (editUkuranList.length > 1) {
      setEditUkuranList(editUkuranList.filter((_, i) => i !== index));
    }
  };

  const handleCancelEdit = () => {
    closeEditModal();
  };
  const handleJenisChange = (e) => {
    const value = e.target.value;
    if (value === "custom") {
      setShowCustomJenis(true);
      // kosongkan dulu biar input manual ambil alih
      setNewProduk((prev) => ({ ...prev, jenis_produk: "" }));
    } else {
      setShowCustomJenis(false);
      setNewProduk((prev) => ({
        ...prev,
        jenis_produk: value,
        nama_produk: prev.nama_produk?.startsWith(prev.jenis_produk) ? value + " " : value + "",
      }));
    }
  };
  const handleEditKomponenChange = (index, field, value) => {
    setEditKomponenList((prev) => {
      const updated = [...prev];

      if (field === "jenis_komponen") {
        const isAks = value === "aksesoris";
        updated[index] = {
          ...updated[index],
          jenis_komponen: value,
          sumber_komponen: isAks ? "aksesoris" : "bahan",
          bahan_id: isAks ? "" : updated[index].bahan_id,
          aksesoris_id: isAks ? updated[index].aksesoris_id : "",
          harga_bahan: "",
          jumlah_bahan: "",
          satuan_bahan: isAks ? "pcs" : "",
        };
      } else {
        updated[index][field] = value;
      }

      return updated;
    });
  };

  const addEditKomponen = () => {
    setEditKomponenList((prev) => [
      ...prev,
      {
        jenis_komponen: "bawahan",
        sumber_komponen: "bahan",
        bahan_id: "",
        aksesoris_id: "",
        jumlah_bahan: "",
      },
    ]);
  };

  const removeEditKomponen = (index) => {
    setEditKomponenList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDetailClick = async (produk) => {
    setSelectedProduk(produk);
    setIsModalOpen(true);

    try {
      const response = await API.get(`/produk/${produk.id}`);
      setSelectedProduk({
        ...produk,
        ...response.data,
        gambar_produk: produk.gambar_produk,
      });
    } catch (error) {
      console.error("Error fetching detail produk:", error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduk(null);
  };

  const handleDownloadPdf = async (produkId) => {
    try {
      const response = await API.get(`/produk/${produkId}/download-pdf`, {
        responseType: "blob", // Penting untuk download file
      });

      // Buat URL dari blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Ambil nama file dari header atau buat default
      const contentDisposition = response.headers["content-disposition"];
      let fileName = `Produk_${produkId}_${new Date().toISOString().split("T")[0]}.pdf`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      showFeedback("error", "Download Gagal", "Gagal mengunduh PDF. Silakan coba lagi.");
    }
  };

  // Hitung statistik
  const totalUrgent = produks.filter((p) => p.kategori_produk === "Urgent").length;
  const totalFix = produks.filter((p) => p.status_produk === "Fix").length;
  const avgHpp = produks.length > 0 ? produks.reduce((sum, p) => sum + (parseFloat(p.hpp) || 0), 0) / produks.length : 0;
  const isFiltering = Boolean(searchTerm || selectedKategori || selectedStatus);
  const visibleRows = produks.length;

  return (
    <div className="hpp-container">
      <header className="hpp-header">
        <div className="hpp-header-top">
          <div className="hpp-title-group">
            <div className="hpp-brand-icon">
              <FiBox />
            </div>
            <div className="hpp-title-wrap">
              <div className="hpp-module-pill">Product Module</div>
              <h1>Data Produk</h1>
              <p className="hpp-header-subtitle">Manajemen produk, HPP, dan komponen produksi</p>
            </div>
          </div>
          <div className="hpp-search-wrap">
            <input type="text" className="hpp-search-input" placeholder="Cari nama produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button
                className="hpp-search-clear"
                onClick={() => setSearchTerm("")}
                title="Hapus pencarian"
              >
                x
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="hpp-main">
        <section className="hpp-stats">
          <article className="hpp-stat-item">
            <div className="hpp-stat-label">Total Produk</div>
            <div className="hpp-stat-value">{total}</div>
          </article>
          <article className="hpp-stat-item">
            <div className="hpp-stat-label">Produk Urgent</div>
            <div className="hpp-stat-value hpp-stat-value-danger">{totalUrgent}</div>
          </article>
          <article className="hpp-stat-item">
            <div className="hpp-stat-label">Status Fix</div>
            <div className="hpp-stat-value hpp-stat-value-success">{totalFix}</div>
          </article>
          <article className="hpp-stat-item">
            <div className="hpp-stat-label">Rata-rata HPP</div>
            <div className="hpp-stat-value hpp-stat-value-info">
              Rp. {formatRupiahValue(avgHpp)}
            </div>
          </article>
        </section>

        <section className="hpp-table-wrapper">
          <div className="hpp-table-header">
            <div>
              <h3>Semua Data Produk</h3>
              <p>{isFiltering ? `Menampilkan ${visibleRows} data sesuai filter` : `Menampilkan ${visibleRows} data pada halaman ini`}</p>
            </div>
            <button className="hpp-btn-primary" onClick={openAddModal}>
              <FaPlus /> Tambah Produk
            </button>
          </div>

          <div className="hpp-filter-section">
            <div className="hpp-filter-wrap">
              <select value={selectedKategori} onChange={(e) => setSelectedKategori(e.target.value)} className="hpp-filter-select">
                <option value="">Semua Status Produk</option>
                <option value="Urgent">Urgent</option>
                <option value="Normal">Normal</option>
              </select>
              {selectedKategori && (
                <span className="hpp-filter-badge" onClick={() => setSelectedKategori("")} title="Hapus filter">
                  {selectedKategori} x
                </span>
              )}
            </div>
            <div className="hpp-filter-wrap">
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="hpp-filter-select">
                <option value="">Semua Status HPP</option>
                <option value="sementara">Sementara</option>
                <option value="fix">Fix</option>
                <option value="bermasalah">Bermasalah</option>
              </select>
              {selectedStatus && (
                <span className="hpp-filter-badge" onClick={() => setSelectedStatus("")} title="Hapus filter">
                  {selectedStatus === "sementara" ? "Sementara" : selectedStatus === "fix" ? "Fix" : "Bermasalah"} x
                </span>
              )}
            </div>
          </div>

      {loading ? (
        <div className="hpp-loading">
          <div className="hpp-spinner"></div>
          <div className="hpp-loading-title">Memuat data produk...</div>
          <div className="hpp-loading-subtitle">Mohon tunggu sebentar</div>
        </div>
      ) : error ? (
        <div className="hpp-empty-state">
          <div className="hpp-empty-icon">!</div>
          <h3 className="hpp-empty-title error">Terjadi Kesalahan</h3>
          <p className="hpp-empty-text">{error}</p>
          <button className="hpp-btn-primary" onClick={() => window.location.reload()}>
            Muat Ulang Halaman
          </button>
        </div>
      ) : produks.length === 0 ? (
        <div className="hpp-empty-state">
          <div className="hpp-empty-icon">-</div>
          <h3 className="hpp-empty-title">Belum Ada Data Produk</h3>
          <p className="hpp-empty-text">{searchTerm || selectedKategori || selectedStatus ? "Tidak ada produk yang sesuai dengan filter yang Anda pilih" : "Mulai dengan menambahkan produk pertama Anda"}</p>
          {(searchTerm || selectedKategori || selectedStatus) && (
            <button
              className="hpp-btn-secondary hpp-empty-cta"
              onClick={() => {
                setSearchTerm("");
                setSelectedKategori("");
                setSelectedStatus("");
              }}
            >
              Hapus Filter
            </button>
          )}
          {!searchTerm && !selectedKategori && !selectedStatus && (
            <button className="hpp-btn-primary hpp-empty-cta" onClick={openAddModal}>
              <FaPlus /> Tambah Produk Pertama
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="hpp-table-scroll">
            <table className="hpp-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Gambar</th>
                  <th>Nama Produk</th>
                  <th>Product Group</th>
                  <th>Jenis Produk</th>
                  <th>Status Produk</th>
                  <th>Status HPP</th>
                  <th>HPP</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {produks.map((produk, index) => {
                  // Hitung nomor berdasarkan pagination
                  const nomor = (currentPage - 1) * 7 + index + 1;
                  return (
                    <tr key={produk.id_produk || produk.id}>
                      <td>
                        <strong>{nomor}</strong>
                      </td>
                      <td>
                        <img
                          src={produk.gambar_produk}
                          alt={produk.nama_produk}
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/60?text=No+Image";
                          }}
                        />
                      </td>
                      <td>
                        <strong>{produk.nama_produk}</strong>
                      </td>
                      <td>{produk.product_group || "-"}</td>
                      <td>{produk.jenis_produk || "-"}</td>
                      <td>{produk.kategori_produk === "Urgent" ? <span className="hpp-status-badge hpp-status-urgent">Urgent</span> : <span className="hpp-status-badge hpp-status-normal">Normal</span>}</td>
                      <td>
                        {produk.status_produk === "Sementara" ? (
                          <span className="hpp-status-badge hpp-status-sementara">Sementara</span>
                        ) : produk.status_produk === "Fix" ? (
                          <span className="hpp-status-badge hpp-status-fix">Fix</span>
                        ) : produk.status_produk === "Bermasalah" ? (
                          <span className="hpp-status-badge hpp-status-bermasalah">Bermasalah</span>
                        ) : (
                          <span className="hpp-status-badge">-</span>
                        )}
                      </td>
                      <td>
                        <strong className="hpp-hpp-value">Rp. {formatRupiahValue(produk.hpp)}</strong>
                      </td>
                      <td>
                        <div className="hpp-action-buttons">
                          <button className="hpp-btn-icon" onClick={() => handleEditClick(produk)} title="Edit Produk">
                            <FaEdit />
                          </button>
                          <button className="hpp-btn-icon info" onClick={() => handleDetailClick(produk)} title="Detail Produk">
                            <FaInfoCircle />
                          </button>
                          <button className="hpp-btn-icon danger" onClick={() => handleDownloadPdf(produk.id)} title="Download PDF">
                            <FaFilePdf />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="hpp-pagination">
              <button className="hpp-pagination-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} title="Halaman Sebelumnya">
                Sebelumnya
              </button>

              <div className="hpp-pagination-info">
                <span>
                  Halaman {currentPage} dari {lastPage}
                </span>
                <span className="hpp-pagination-total">(Total: {total} data)</span>
              </div>

              <button className="hpp-pagination-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === lastPage} title="Halaman Selanjutnya">
                Selanjutnya
              </button>
            </div>
          )}
        </>
      )}
        </section>
      </main>

      {/* Modal Form Tambah */}
      {showForm && (
        <div
          className="hpp-modal-overlay"
          onClick={() => {
            closeAddModal();
          }}
        >
          <div className="hpp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="hpp-modal-header">
              <h2>Tambah Produk</h2>
              <button
                className="hpp-modal-close"
                onClick={() => {
                  closeAddModal();
                }}
                type="button"
              >
                <FaTimes />
              </button>
            </div>
            <div className="hpp-modal-body">
              <form onSubmit={handleFormSubmit} className="hpp-modal-form">
                <div className="hpp-modal-tabs">
                  <button type="button" className={`hpp-modal-tab ${addModalTab === "info" ? "active" : ""}`} onClick={() => setAddModalTab("info")}>
                    Informasi Produk
                  </button>
                  <button type="button" className={`hpp-modal-tab ${addModalTab === "sku" ? "active" : ""}`} onClick={() => setAddModalTab("sku")}>
                    SKU
                  </button>
                  <button type="button" className={`hpp-modal-tab ${addModalTab === "biaya" ? "active" : ""}`} onClick={() => setAddModalTab("biaya")}>
                    Biaya
                  </button>
                  <button type="button" className={`hpp-modal-tab ${addModalTab === "komponen" ? "active" : ""}`} onClick={() => setAddModalTab("komponen")}>
                    Komponen
                  </button>
                </div>

                {addModalTab === "info" && (
                  <>
                {renderProductGroupSelect("new")}

                <div className="hpp-form-group">
                  <label>Jenis Produk</label>
                  <input type="text" className="hpp-form-input" value={newProduk.jenis_produk} readOnly placeholder="Otomatis dari Product Group" />
                </div>

                <div className="hpp-form-group">
                  <label>Nama Produk</label>
                  <input type="text" className="hpp-form-input" value={newProduk.nama_produk} readOnly placeholder="Otomatis dari Product Group" />
                </div>

                <div className="hpp-form-group">
                  <label>LD S</label>
                  <input type="text" className="hpp-form-input" value={newProduk.ld_s} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>LD M</label>
                  <input type="text" className="hpp-form-input" value={newProduk.ld_m} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>LD L</label>
                  <input type="text" className="hpp-form-input" value={newProduk.ld_l} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>LD XL</label>
                  <input type="text" className="hpp-form-input" value={newProduk.ld_xl} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>PJ Dress</label>
                  <input type="text" className="hpp-form-input" value={newProduk.pj_dress} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>PJ Celana</label>
                  <input type="text" className="hpp-form-input" value={newProduk.pj_celana} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>PJ Baju</label>
                  <input type="text" className="hpp-form-input" value={newProduk.pj_baju} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>Gambar Produk</label>
                  <input type="file" name="gambar_produk" className="hpp-form-input" onChange={handleFileChange} accept="image/*" />
                  {newProduk.gambar_produk && !(newProduk.gambar_produk instanceof File) && (
                    <div className="hpp-form-image-preview">
                      <p>Gambar Saat Ini</p>
                      <img src={`${process.env.REACT_APP_FILE_URL || ""}/storage/${newProduk.gambar_produk}`} alt="Gambar Produk" />
                    </div>
                  )}
                </div>

                <div className="hpp-form-group">
                  <label>Status Produk</label>
                  <select name="kategori_produk" className="hpp-form-select" value={newProduk.kategori_produk} onChange={handleInputChange} required>
                    <option value="">Pilih Status</option>
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                  </>
                )}

                {addModalTab === "biaya" && (
                  <>
                    <div className="hpp-form-group">
                      <label>Harga Jasa Cutting</label>
                      <div className="hpp-price-input-wrap">
                        <span className="hpp-price-prefix">Rp.</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          name="harga_jasa_cutting"
                          className="hpp-form-input hpp-input-with-prefix"
                          value={formatRupiahDisplay(newProduk.harga_jasa_cutting)}
                          onChange={(e) => handleCurrencyChange("new", "harga_jasa_cutting", e.target.value)}
                          placeholder="Masukkan harga jasa cutting"
                        />
                      </div>
                    </div>

                    <div className="hpp-form-group">
                      <label>Harga Jasa CMT</label>
                      <div className="hpp-price-input-wrap">
                        <span className="hpp-price-prefix">Rp.</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          name="harga_jasa_cmt"
                          className="hpp-form-input hpp-input-with-prefix"
                          value={formatRupiahDisplay(newProduk.harga_jasa_cmt)}
                          onChange={(e) => handleCurrencyChange("new", "harga_jasa_cmt", e.target.value)}
                          placeholder="Masukkan harga jasa CMT"
                        />
                      </div>
                    </div>

                    <div className="hpp-form-group">
                      <label>Harga Jasa Aksesoris</label>
                      <div className="hpp-price-input-wrap">
                        <span className="hpp-price-prefix">Rp.</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          name="harga_jasa_aksesoris"
                          className="hpp-form-input hpp-input-with-prefix"
                          value={formatRupiahDisplay(newProduk.harga_jasa_aksesoris)}
                          onChange={(e) => handleCurrencyChange("new", "harga_jasa_aksesoris", e.target.value)}
                          placeholder="Masukkan harga jasa aksesoris"
                        />
                      </div>
                    </div>

                    <div className="hpp-form-group">
                      <label>Harga Overhead</label>
                      <div className="hpp-price-input-wrap">
                        <span className="hpp-price-prefix">Rp.</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          name="harga_overhead"
                          className="hpp-form-input hpp-input-with-prefix"
                          value={formatRupiahDisplay(newProduk.harga_overhead)}
                          onChange={(e) => handleCurrencyChange("new", "harga_overhead", e.target.value)}
                          placeholder="Masukkan harga overhead"
                        />
                      </div>
                    </div>
                  </>
                )}

                {addModalTab === "sku" && (
                  <>
                    <div className="hpp-form-group hpp-sku-panel">
                      <label>Daftar SKU</label>
                      {newSkuList.length ? (
                        <div className="hpp-sku-list">
                          {newSkuList.map((item, index) => (
                            <div className="hpp-sku-item" key={`${item.sku}-${index}`}>
                              <div className="hpp-sku-code">{item.sku}</div>
                              <div className="hpp-sku-meta">
                                <span>{item.warna || "-"}</span>
                                <span>{item.ukuran || "-"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="hpp-empty-sku-state">
                          Pilih Product Group terlebih dahulu agar daftar SKU muncul otomatis.
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Komponen Produk */}
                {addModalTab === "komponen" && (
                <div className="hpp-komponen-section">
                  <h3>Bahan Utama &amp; Bahan Kombinasi</h3>

                  {komponenList.map((komp, index) => (
                    <div key={index} className="hpp-komponen-row">
                      <div className="hpp-komponen-row-header">
                        <span className={`hpp-komponen-role-badge${komp.sumber_komponen === "aksesoris" ? " aksesoris" : ""}`}>
                          {getKomponenBadgeLabel(komp, index, komponenList)}
                        </span>
                      </div>

                      {/* Jenis Komponen */}
                      <select value={komp.jenis_komponen} onChange={(e) => handleKomponenChange(index, "jenis_komponen", e.target.value)} required>
                        <option value="">Pilih Jenis Komponen</option>
                        <optgroup label="Bahan">
                          <option value="atasan">Bahan Utama</option>
                          <option value="bawahan">Bahan Kombinasi</option>
                        </optgroup>
                        <optgroup label="Lainnya">
                          <option value="fullbody">Fullbody</option>
                          <option value="aksesoris">Aksesoris</option>
                        </optgroup>
                      </select>

                      {/* PILIH BAHAN */}
                      {komp.sumber_komponen !== "aksesoris" && (
                        renderBahanSearchableSelect("new", index, komp)
                      )}

                      {/* PILIH AKSESORIS */}
                      {komp.sumber_komponen === "aksesoris" && (
                        <select
                          value={komp.aksesoris_id}
                          onChange={(e) => {
                            const aksId = e.target.value;
                            const aks = aksesorisList.find((a) => String(a.id) === String(aksId));
                            handleKomponenChange(index, "aksesoris_id", aksId);
                            handleKomponenChange(index, "harga_bahan", aks?.harga_per_biji || "");
                            handleKomponenChange(index, "satuan_bahan", "pcs");
                          }}
                          required
                        >
                          <option value="">Pilih Aksesoris</option>
                          {aksesorisList.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nama_aksesoris} - Rp {a.harga_per_biji}/pcs
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Harga (Auto) */}
                      <div className="hpp-price-input-wrap">
                        <span className="hpp-price-prefix">Rp.</span>
                        <input type="text" className="hpp-input-with-prefix" placeholder="Harga" value={formatRupiahDisplay(komp.harga_bahan)} readOnly />
                      </div>

                      {/* Jumlah */}
                      <input type="number" min="0.0001" step="0.0001" placeholder="Jumlah" value={komp.jumlah_bahan} onChange={(e) => handleKomponenChange(index, "jumlah_bahan", e.target.value)} required />

                      {/* Satuan */}
                      <select value={komp.satuan_bahan} disabled={komp.sumber_komponen === "aksesoris"} onChange={(e) => handleKomponenChange(index, "satuan_bahan", e.target.value)}>
                        <option value="">Pilih Satuan</option>
                        <option value="kg">Kg</option>
                        <option value="yard">Yard</option>
                        <option value="gross">Gross</option>
                        <option value="pcs">Pcs</option>
                      </select>

                      {/* Hapus */}
                      <button type="button" className="hpp-komponen-remove-btn" onClick={() => removeKomponen(index)}>
                        Hapus
                      </button>
                    </div>
                  ))}

                  <button type="button" className="hpp-komponen-add-btn" onClick={addKomponen}>
                    <FaPlus /> Tambah Bahan Kombinasi
                  </button>
                </div>
                )}

                {/* Action Buttons */}
                <div className="hpp-form-actions">
                  <button type="submit" className="hpp-btn-submit">
                    Simpan
                  </button>
                  <button
                    type="button"
                    className="hpp-btn-cancel"
                    onClick={() => {
                      closeAddModal();
                    }}
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Edit */}
      {showEditForm && (
        <div className="hpp-modal-overlay" onClick={handleCancelEdit}>
          <div className="hpp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="hpp-modal-header">
              <h2>Edit Produk</h2>
              <button className="hpp-modal-close" onClick={handleCancelEdit} type="button">
                <FaTimes />
              </button>
            </div>
            <div className="hpp-modal-body">
              <form onSubmit={handleFormUpdate} className="hpp-modal-form">
                <div className="hpp-modal-tabs">
                  <button type="button" className={`hpp-modal-tab ${editModalTab === "info" ? "active" : ""}`} onClick={() => setEditModalTab("info")}>
                    Informasi Produk
                  </button>
                  <button type="button" className={`hpp-modal-tab ${editModalTab === "sku" ? "active" : ""}`} onClick={() => setEditModalTab("sku")}>
                    SKU
                  </button>
                  <button type="button" className={`hpp-modal-tab ${editModalTab === "biaya" ? "active" : ""}`} onClick={() => setEditModalTab("biaya")}>
                    Biaya
                  </button>
                  <button type="button" className={`hpp-modal-tab ${editModalTab === "komponen" ? "active" : ""}`} onClick={() => setEditModalTab("komponen")}>
                    Komponen
                  </button>
                </div>

                {editModalTab === "info" && (
                  <>
                {renderProductGroupSelect("edit")}

                <div className="hpp-form-group">
                  <label>Jenis Produk</label>
                  <input type="text" className="hpp-form-input" value={editProduk.jenis_produk} readOnly placeholder="Otomatis dari Product Group" />
                </div>

                <div className="hpp-form-group">
                  <label>Nama Produk</label>
                  <input type="text" className="hpp-form-input" value={editProduk.nama_produk} readOnly placeholder="Otomatis dari Product Group" />
                </div>

                <div className="hpp-form-group">
                  <label>LD S</label>
                  <input type="text" className="hpp-form-input" value={editProduk.ld_s} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>LD M</label>
                  <input type="text" className="hpp-form-input" value={editProduk.ld_m} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>LD L</label>
                  <input type="text" className="hpp-form-input" value={editProduk.ld_l} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>LD XL</label>
                  <input type="text" className="hpp-form-input" value={editProduk.ld_xl} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>PJ Dress</label>
                  <input type="text" className="hpp-form-input" value={editProduk.pj_dress} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>PJ Celana</label>
                  <input type="text" className="hpp-form-input" value={editProduk.pj_celana} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>PJ Baju</label>
                  <input type="text" className="hpp-form-input" value={editProduk.pj_baju} readOnly placeholder="Otomatis dari Product List" />
                </div>

                <div className="hpp-form-group">
                  <label>Gambar Produk</label>
                  <input type="file" className="hpp-form-input" accept="image/*" onChange={handleFileChange} />
                  {editProduk.gambar_produk && !(editProduk.gambar_produk instanceof File) && (
                    <div className="hpp-form-image-preview">
                      <p>Gambar Saat Ini</p>
                      <img src={`${process.env.REACT_APP_FILE_URL || ""}/storage/${editProduk.gambar_produk}`} alt="Gambar Produk" />
                    </div>
                  )}
                </div>

                <div className="hpp-form-group">
                  <label>Status Produk</label>
                  <select name="kategori_produk" className="hpp-form-select" value={editProduk.kategori_produk} onChange={handleInputChange}>
                    <option value="">Pilih Status</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>

                <div className="hpp-form-group">
                  <label>Status HPP</label>
                  <select name="status_produk" className="hpp-form-select" value={editProduk.status_produk} onChange={handleInputChange}>
                    <option value="">Pilih Status</option>
                    <option value="Sementara">Sementara</option>
                    <option value="Fix">Fix</option>
                    <option value="Bermasalah">Bermasalah</option>
                  </select>
                </div>
                  </>
                )}

                {editModalTab === "biaya" && (
                  <>
                    <div className="hpp-form-group">
                      <label>Harga Jasa Cutting</label>
                      <div className="hpp-price-input-wrap">
                        <span className="hpp-price-prefix">Rp.</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          name="harga_jasa_cutting"
                          className="hpp-form-input hpp-input-with-prefix"
                          value={formatRupiahDisplay(editProduk.harga_jasa_cutting)}
                          onChange={(e) => handleCurrencyChange("edit", "harga_jasa_cutting", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="hpp-form-group">
                      <label>Harga Jasa CMT</label>
                      <div className="hpp-price-input-wrap">
                        <span className="hpp-price-prefix">Rp.</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          name="harga_jasa_cmt"
                          className="hpp-form-input hpp-input-with-prefix"
                          value={formatRupiahDisplay(editProduk.harga_jasa_cmt)}
                          onChange={(e) => handleCurrencyChange("edit", "harga_jasa_cmt", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="hpp-form-group">
                      <label>Harga Jasa Aksesoris</label>
                      <div className="hpp-price-input-wrap">
                        <span className="hpp-price-prefix">Rp.</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          name="harga_jasa_aksesoris"
                          className="hpp-form-input hpp-input-with-prefix"
                          value={formatRupiahDisplay(editProduk.harga_jasa_aksesoris)}
                          onChange={(e) => handleCurrencyChange("edit", "harga_jasa_aksesoris", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="hpp-form-group">
                      <label>Harga Overhead</label>
                      <div className="hpp-price-input-wrap">
                        <span className="hpp-price-prefix">Rp.</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          name="harga_overhead"
                          className="hpp-form-input hpp-input-with-prefix"
                          value={formatRupiahDisplay(editProduk.harga_overhead)}
                          onChange={(e) => handleCurrencyChange("edit", "harga_overhead", e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {editModalTab === "sku" && (
                  <>
                    <div className="hpp-form-group hpp-sku-panel">
                      <label>Daftar SKU</label>
                      {editSkuList.length ? (
                        <div className="hpp-sku-list">
                          {editSkuList.map((item, index) => (
                            <div className="hpp-sku-item" key={`${item.sku}-${index}`}>
                              <div className="hpp-sku-code">{item.sku}</div>
                              <div className="hpp-sku-meta">
                                <span>{item.warna || "-"}</span>
                                <span>{item.ukuran || "-"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="hpp-empty-sku-state">
                          Pilih Product Group terlebih dahulu agar daftar SKU muncul otomatis.
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Komponen */}
                {editModalTab === "komponen" && (
                <div className="hpp-komponen-section">
                  <h3>Edit Bahan Utama &amp; Bahan Kombinasi</h3>

                  {editKomponenList.map((komp, index) => (
                    <div key={index} className="hpp-komponen-row">
                      <div className="hpp-komponen-row-header">
                        <span className={`hpp-komponen-role-badge${komp.sumber_komponen === "aksesoris" ? " aksesoris" : ""}`}>
                          {getKomponenBadgeLabel(komp, index, editKomponenList)}
                        </span>
                      </div>

                      {/* Jenis Komponen */}
                      <select value={komp.jenis_komponen} onChange={(e) => handleEditKomponenChange(index, "jenis_komponen", e.target.value)}>
                        <option value="">Pilih Jenis Komponen</option>
                        <optgroup label="Bahan">
                          <option value="atasan">Bahan Utama</option>
                          <option value="bawahan">Bahan Kombinasi</option>
                        </optgroup>
                        <optgroup label="Lainnya">
                          <option value="fullbody">Fullbody</option>
                          <option value="aksesoris">Aksesoris</option>
                        </optgroup>
                      </select>

                      {/* PILIH BAHAN */}
                      {komp.sumber_komponen !== "aksesoris" && (
                        renderBahanSearchableSelect("edit", index, komp)
                      )}

                      {/* PILIH AKSESORIS */}
                      {komp.sumber_komponen === "aksesoris" && (
                        <select
                          value={komp.aksesoris_id}
                          onChange={(e) => {
                            const aks = aksesorisList.find((a) => String(a.id) === String(e.target.value));
                            handleEditKomponenChange(index, "aksesoris_id", e.target.value);
                            handleEditKomponenChange(index, "harga_bahan", aks?.harga_per_biji || "");
                            handleEditKomponenChange(index, "satuan_bahan", "pcs");
                          }}
                        >
                          <option value="">Pilih Aksesoris</option>
                          {aksesorisList.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nama_aksesoris}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Harga */}
                      <div className="hpp-price-input-wrap">
                        <span className="hpp-price-prefix">Rp.</span>
                        <input type="text" className="hpp-input-with-prefix" value={formatRupiahDisplay(komp.harga_bahan)} readOnly />
                      </div>

                      {/* Jumlah */}
                      <input type="number" value={komp.jumlah_bahan} onChange={(e) => handleEditKomponenChange(index, "jumlah_bahan", e.target.value)} />

                      {/* Satuan */}
                      <input type="text" value={komp.satuan_bahan} readOnly />

                      <button type="button" className="hpp-komponen-remove-btn" onClick={() => removeEditKomponen(index)}>
                        Hapus
                      </button>
                    </div>
                  ))}

                  <button type="button" className="hpp-komponen-add-btn" onClick={addEditKomponen}>
                    <FaPlus /> Tambah Bahan Kombinasi
                  </button>
                </div>
                )}

                <div className="hpp-form-actions">
                  <button type="submit" className="hpp-btn-submit">
                    Simpan Edit
                  </button>
                  <button type="button" className="hpp-btn-cancel" onClick={handleCancelEdit}>
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {isModalOpen && selectedProduk && (
        <div className="hpp-modal-overlay" onClick={handleCloseModal}>
          <div className="hpp-modal-content hpp-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hpp-modal-header">
              <h3>Detail Produk</h3>
              <button className="hpp-modal-close" onClick={handleCloseModal} type="button">
                <FaTimes />
              </button>
            </div>
            <div className="hpp-detail-body">
              {/* Header info ringkas */}
              <div className="hpp-detail-top">
                <div className="hpp-detail-hero">
                  {selectedProduk.gambar_produk && (
                    <div className="hpp-detail-image-wrap">
                      <img
                        src={selectedProduk.gambar_produk}
                        alt={selectedProduk.nama_produk}
                        className="hpp-detail-image"
                      />
                    </div>
                  )}
                  <div className="hpp-detail-name">{selectedProduk.nama_produk}</div>
                  <div className="hpp-detail-badges">
                    <span className="hpp-badge hpp-badge-primary">{selectedProduk.kategori_produk || "Normal"}</span>
                    <span
                      className={`hpp-badge ${
                        selectedProduk.status_produk === "fix"
                          ? "hpp-badge-success"
                          : selectedProduk.status_produk === "sementara"
                          ? "hpp-badge-warning"
                          : selectedProduk.status_produk === "bermasalah"
                          ? "hpp-badge-danger"
                          : "hpp-badge-muted"
                      }`}
                    >
                      {selectedProduk.status_produk || "Status HPP?"}
                    </span>
                  </div>
                </div>
                <div className="hpp-detail-summary">
                  <div className="hpp-detail-summary-item">
                    <div className="label">ID Produk</div>
                    <div className="value">#{selectedProduk.id}</div>
                  </div>
                  <div className="hpp-detail-summary-item">
                    <div className="label">Product Group</div>
                    <div className="value">{selectedProduk.product_group || "-"}</div>
                  </div>
                  <div className="hpp-detail-summary-item">
                    <div className="label">Jenis Produk</div>
                    <div className="value">{selectedProduk.jenis_produk || "-"}</div>
                  </div>
                  <div className="hpp-detail-summary-item highlight">
                    <div className="label">HPP</div>
                    <div className="value big">Rp. {formatRupiahValue(selectedProduk.hpp)}</div>
                  </div>
                </div>
              </div>

              <div className="hpp-detail-grid">
                <div className="hpp-detail-card">
                  <div className="label">LD S</div>
                  <div className="value">{selectedProduk.ld_s || "-"}</div>
                </div>
                <div className="hpp-detail-card">
                  <div className="label">LD M</div>
                  <div className="value">{selectedProduk.ld_m || "-"}</div>
                </div>
                <div className="hpp-detail-card">
                  <div className="label">LD L</div>
                  <div className="value">{selectedProduk.ld_l || "-"}</div>
                </div>
                <div className="hpp-detail-card">
                  <div className="label">LD XL</div>
                  <div className="value">{selectedProduk.ld_xl || "-"}</div>
                </div>
                <div className="hpp-detail-card">
                  <div className="label">PJ Dress</div>
                  <div className="value">{selectedProduk.pj_dress ?? "-"}</div>
                </div>
                <div className="hpp-detail-card">
                  <div className="label">PJ Celana</div>
                  <div className="value">{selectedProduk.pj_celana ?? "-"}</div>
                </div>
                <div className="hpp-detail-card">
                  <div className="label">PJ Baju</div>
                  <div className="value">{selectedProduk.pj_baju ?? "-"}</div>
                </div>
              </div>

              {/* Ringkasan biaya */}
              <div className="hpp-detail-grid">
                <div className="hpp-detail-card">
                  <div className="label">Harga Jasa CMT</div>
                  <div className="value">Rp. {formatRupiahValue(selectedProduk.harga_jasa_cmt)}</div>
                </div>
                <div className="hpp-detail-card">
                  <div className="label">Harga Jasa Cutting</div>
                  <div className="value">Rp. {formatRupiahValue(selectedProduk.harga_jasa_cutting)}</div>
                </div>
                <div className="hpp-detail-card">
                  <div className="label">Harga Jasa Aksesoris</div>
                  <div className="value">Rp. {formatRupiahValue(selectedProduk.harga_jasa_aksesoris)}</div>
                </div>
                <div className="hpp-detail-card">
                  <div className="label">Harga Overhead</div>
                  <div className="value">Rp. {formatRupiahValue(selectedProduk.harga_overhead)}</div>
                </div>
                <div className="hpp-detail-card full highlight">
                  <div className="label">Total Harga Komponen</div>
                  <div className="value big">Rp. {formatRupiahValue(selectedProduk.total_komponen)}</div>
                </div>
              </div>

              <div className="hpp-detail-section">
                <h4>SKU Produk</h4>
                {selectedProduk.skus && selectedProduk.skus.length > 0 ? (
                  <div className="hpp-sku-list detail">
                    {selectedProduk.skus.map((sku, index) => (
                      <div className="hpp-sku-item" key={`${sku.sku}-${index}`}>
                        <div className="hpp-sku-code">{sku.sku}</div>
                        <div className="hpp-sku-meta">
                          <span>{sku.warna || "-"}</span>
                          <span>{sku.ukuran || "-"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="hpp-empty-state">
                    <p>Tidak ada data SKU untuk produk ini.</p>
                  </div>
                )}
              </div>

              <div className="hpp-detail-section">
                <h4>Detail Komponen</h4>
                {selectedProduk.komponen && selectedProduk.komponen.length > 0 ? (
                  <div className="hpp-komponen-table-wrap">
                    <table className="hpp-komponen-table">
                      <thead>
                        <tr>
                          <th>Posisi</th>
                          <th>Jenis Komponen</th>
                          <th>Nama Bahan/Aksesoris</th>
                          <th className="text-right">Harga Bahan</th>
                          <th className="text-right">Jumlah</th>
                          <th>Satuan</th>
                          <th className="text-right">Total Harga</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProduk.komponen.map((k, idx) => {
                          const nama = k.nama_bahan || k.nama_aksesoris || k.bahan?.nama_bahan || k.aksesoris?.nama_aksesoris || "-";
                          const satuan = k.satuan_bahan || (k.sumber_komponen === "aksesoris" ? "pcs" : k.bahan?.satuan) || "-";
                          const jumlahFormatted = k.jumlah_bahan !== undefined && k.jumlah_bahan !== null ? Number(k.jumlah_bahan).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : "0";
                          return (
                            <tr key={idx}>
                              <td>
                                <span className={`hpp-komponen-role-badge${k.sumber_komponen === "aksesoris" ? " aksesoris" : ""}`}>
                                  {getKomponenBadgeLabel(k, idx, selectedProduk.komponen)}
                                </span>
                              </td>
                              <td>
                                <span className="hpp-komponen-type-chip">{getJenisKomponenLabel(k.jenis_komponen)}</span>
                              </td>
                              <td>{nama}</td>
                              <td className="text-right">Rp. {formatRupiahValue(k.harga_bahan)}</td>
                              <td className="text-right">{jumlahFormatted}</td>
                              <td>{satuan}</td>
                              <td className="text-right hpp-komponen-total">Rp. {formatRupiahValue(k.total_harga_bahan)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="hpp-empty-state">
                    <p>Tidak ada data komponen untuk produk ini.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="hpp-detail-footer">
              <button className="hpp-btn-close" onClick={handleCloseModal}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackModal.open && (
        <div className="hpp-modal-overlay" onClick={closeFeedback}>
          <div className="hpp-modal-content hpp-feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hpp-modal-header">
              <h3>{feedbackModal.title}</h3>
              <button className="hpp-modal-close" onClick={closeFeedback} type="button">
                <FaTimes />
              </button>
            </div>
            <div className="hpp-modal-body">
              <div className={`hpp-feedback-box ${feedbackModal.type}`}>
                <p>{feedbackModal.message}</p>
              </div>
              <div className="hpp-form-actions">
                <button type="button" className="hpp-btn-submit" onClick={closeFeedback}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HppProduk;


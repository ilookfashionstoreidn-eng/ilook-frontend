import React, { useEffect, useState, useMemo } from "react";
import "./UserManagement.css";
import API from "../../api";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSearch, FaTimes, FaPlus, FaEdit, FaTrash, FaUsers, FaChevronDown, FaCheck,
  FaTachometerAlt, FaFileInvoice, FaShieldAlt, FaFlask, FaGem, FaBox, FaWarehouse, FaCut, FaTools, FaTshirt, FaBoxes, FaBoxOpen, FaUndo
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AVAILABLE_MENUS = [
  { key: "dashboard", label: "Dashboard", icon: FaTachometerAlt },
  { key: "laporan_daily_produksi", label: "Laporan Daily", icon: FaFileInvoice },
  {
    key: "qc",
    label: "Quality Control",
    icon: FaShieldAlt,
    submenus: [
      { key: "qc:lolos", label: "QC Lolos" },
      { key: "qc:reject", label: "QC Reject" }
    ]
  },
  {
    key: "sample",
    label: "Management Sample",
    icon: FaFlask,
    submenus: [
      { key: "sample:tukang", label: "Tukang Sample" },
      { key: "sample:spk", label: "SPK Sample" },
      { key: "sample:summary", label: "Summary SPK Sample" }
    ]
  },
  {
    key: "aksesoris",
    label: "Aksesoris",
    icon: FaGem,
    submenus: [
      { key: "aksesoris:data", label: "Data Aksesoris" },
      { key: "aksesoris:pembelian_toko", label: "Pembelian Aksesoris Toko" },
      { key: "aksesoris:pembelian_cmt", label: "Pembelian Aksesoris CMT" }
    ]
  },
  {
    key: "produk",
    label: "Produk",
    icon: FaBox,
    submenus: [
      { key: "produk:list", label: "Produk List" },
      { key: "produk:hpp", label: "Hpp Produk" }
    ]
  },
  {
    key: "gudang_bahan",
    label: "Gudang Bahan",
    icon: FaWarehouse,
    submenus: [
      { key: "gudang_bahan:pabrik", label: "Data Pabrik" },
      { key: "gudang_bahan:gudang", label: "Data Gudang" },
      { key: "gudang_bahan:bahan", label: "Data Bahan" },
      { key: "gudang_bahan:list_bahan", label: "List Bahan" },
      { key: "gudang_bahan:pemesanan", label: "Pemesanan Bahan" },
      { key: "gudang_bahan:pengiriman", label: "Pengiriman Bahan" },
      { key: "gudang_bahan:opname", label: "Stok Opname Bahan" },
      { key: "gudang_bahan:return", label: "Return Bahan" },
      { key: "gudang_bahan:scan_masuk", label: "Scan Bahan Masuk" },
      { key: "gudang_bahan:stok", label: "Stok Bahan" },
      { key: "gudang_bahan:scan_keluar", label: "Scan Bahan Keluar" },
      { key: "gudang_bahan:history_keluar", label: "History Stok Bahan Keluar" },
      { key: "gudang_bahan:hutang_pabrik", label: "Hutang Pabrik" },
      { key: "gudang_bahan:history_hutang_pabrik", label: "History Hutang Pabrik" }
    ]
  },
  {
    key: "cutting",
    label: "Cutting",
    icon: FaCut,
    submenus: [
      { key: "cutting:dashboard", label: "Dashboard Cutting" },
      { key: "cutting:tukang", label: "Tukang Cutting" },
      { key: "cutting:pola", label: "Tukang Pola" },
      { key: "cutting:marker", label: "Marker Produk" },
      { key: "cutting:spk", label: "Surat Perintah Cutting" },
      { key: "cutting:hasil", label: "Input Hasil Cutting" },
      { key: "cutting:laporan", label: "Laporan Hasil Cutting" },
      { key: "cutting:acuan", label: "Laporan Data Acuan" },
      { key: "cutting:history_hasil", label: "History Hasil Cutting" },
      { key: "cutting:history_distribusi", label: "History Distribusi SPK" },
      { key: "cutting:hutang", label: "Hutang Tukang Cutting" },
      { key: "cutting:cashbon", label: "Cashbon Tukang Cutting" },
      { key: "cutting:piutang", label: "Piutang Tukang Cutting" },
      { key: "cutting:history_pembayaran", label: "History Pembayaran" }
    ]
  },
  {
    key: "jasa",
    label: "Jasa",
    icon: FaTools,
    submenus: [
      { key: "jasa:dashboard", label: "Dashboard Jasa" },
      { key: "jasa:tukang", label: "Tukang Jasa" },
      { key: "jasa:spk", label: "Spk Jasa" },
      { key: "jasa:hasil", label: "Hasil Jasa" },
      { key: "jasa:cashbon", label: "Cashboan" },
      { key: "jasa:hutang", label: "Hutang" },
      { key: "jasa:pendapatan", label: "Pendapatan" },
      { key: "jasa:history_pendapatan", label: "History Pendapatan" }
    ]
  },
  {
    key: "cmt",
    label: "CMT",
    icon: FaTshirt,
    submenus: [
      { key: "cmt:dashboard", label: "Dashboard CMT" },
      { key: "cmt:penjahit", label: "Daftar Penjahit" },
      { key: "cmt:pekerjaan_tersedia", label: "Laporan Pekerjaan Tersedia" },
      { key: "cmt:spk", label: "Surat Perintah Kerja CMT" },
      { key: "cmt:data_dikerjakan", label: "Data Dikerjakan & Pengiriman" },
      { key: "cmt:pengiriman", label: "Pengiriman" },
      { key: "cmt:hutang", label: "Hutang" },
      { key: "cmt:cashbon", label: "Casbon" },
      { key: "cmt:pendapatan", label: "Pendapatan" },
      { key: "cmt:history_pendapatan", label: "History Pendapatan" },
      { key: "cmt:deadline", label: "Log Deadline" },
      { key: "cmt:status", label: "Log Status" },
      { key: "cmt:sku", label: "SKU" }
    ]
  },
  {
    key: "gudang_produk",
    label: "Gudang Produk",
    icon: FaBoxes,
    submenus: [
      { key: "gudang_produk:master_layout", label: "Master Layout" },
      { key: "gudang_produk:input_sku", label: "Input SKU Gudang" },
      { key: "gudang_produk:scan_masuk", label: "Scan Produk Masuk" },
      { key: "gudang_produk:mutasi", label: "Mutasi Gudang" },
      { key: "gudang_produk:picking_queue", label: "Picking Queue" },
      { key: "gudang_produk:stok_awal", label: "Stok Awal" },
      { key: "gudang_produk:stok_opname", label: "Stok Opname" },
      { key: "gudang_produk:stok_lokasi", label: "Stok per Lokasi" },
      { key: "gudang_produk:list_stok", label: "List Stok Product" },
      { key: "gudang_produk:history_mutasi", label: "History Mutasi" },
      { key: "gudang_produk:history_produk", label: "History Produk" },
      { key: "gudang_produk:history_stok_awal", label: "History Stok Awal" },
      { key: "gudang_produk:history_produk_masuk", label: "History Produk Masuk" }
    ]
  },
  {
    key: "packing",
    label: "Packing",
    icon: FaBoxOpen,
    submenus: [
      { key: "packing:packing", label: "Packing" },
      { key: "packing:random", label: "Packing Random" },
      { key: "packing:pendingan", label: "Pendingan" },
      { key: "packing:belum_barcode", label: "Produk Belum Barcode" },
      { key: "packing:no_data_ginee", label: "No Data Ginee" },
      { key: "packing:inject", label: "Inject Data" },
      { key: "packing:logs", label: "History scan" },
      { key: "packing:seri", label: "Seri" }
    ]
  },
  {
    key: "return",
    label: "Return",
    icon: FaUndo,
    submenus: [
      { key: "return:return", label: "Return" },
      { key: "return:logs", label: "Logs Return" }
    ]
  }
];


const ROLES = [
  "super-admin",
  "owner",
  "supervisor",
  "staff",
  "penjahit",
  "staff_bawah",
  "kasir",
  "gudang"
];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [cmtList, setCmtList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    role: "staff",
    id_penjahit: "",
    menus: []
  });

  useEffect(() => {
    fetchUsers();
    fetchCmtList();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await API.get("/users-management");
      setUsers(response.data || []);
    } catch (error) {
      toast.error("Gagal mengambil data user.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCmtList = async () => {
    try {
      const response = await API.get("/penjahit");
      setCmtList(response.data || []);
    } catch (error) {
      console.error("Gagal mengambil data penjahit:", error);
    }
  };

  const stats = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter((u) => u.role === "super-admin").length;
    const otherUsers = total - superAdmins;
    return { total, superAdmins, otherUsers };
  }, [users]);

  const getMenuLabel = (key) => {
    for (const menu of AVAILABLE_MENUS) {
      if (menu.key === key) return menu.label;
      if (menu.submenus) {
        const sub = menu.submenus.find((s) => s.key === key);
        if (sub) return `${menu.label} > ${sub.label}`;
      }
    }
    return key;
  };

  const getAllMenuKeys = () => {
    let keys = [];
    AVAILABLE_MENUS.forEach((menu) => {
      if (menu.submenus) {
        menu.submenus.forEach((sub) => keys.push(sub.key));
      } else {
        keys.push(menu.key);
      }
    });
    return keys;
  };

  const isParentChecked = (menu) => {
    if (!menu.submenus) {
      return formData.menus.includes(menu.key);
    }
    return menu.submenus.every((s) => formData.menus.includes(s.key));
  };

  const isParentIndeterminate = (menu) => {
    if (!menu.submenus) return false;
    const hasSome = menu.submenus.some((s) => formData.menus.includes(s.key));
    const hasAll = menu.submenus.every((s) => formData.menus.includes(s.key));
    return hasSome && !hasAll;
  };

  const handleParentToggle = (menu) => {
    setFormData((prev) => {
      let newMenus = [...prev.menus];
      if (menu.submenus) {
        const subKeys = menu.submenus.map((s) => s.key);
        const allChecked = subKeys.every((k) => newMenus.includes(k));
        if (allChecked) {
          // Uncheck all submenus and parent
          newMenus = newMenus.filter((k) => !subKeys.includes(k) && k !== menu.key);
        } else {
          // Check all submenus
          subKeys.forEach((k) => {
            if (!newMenus.includes(k)) newMenus.push(k);
          });
          if (!newMenus.includes(menu.key)) newMenus.push(menu.key);
        }
      } else {
        if (newMenus.includes(menu.key)) {
          newMenus = newMenus.filter((k) => k !== menu.key);
        } else {
          newMenus.push(menu.key);
        }
      }
      return { ...prev, menus: newMenus };
    });
  };

  const handleSubmenuToggle = (parentMenu, subKey) => {
    setFormData((prev) => {
      let newMenus = [...prev.menus];
      if (newMenus.includes(subKey)) {
        newMenus = newMenus.filter((k) => k !== subKey);
        newMenus = newMenus.filter((k) => k !== parentMenu.key);
      } else {
        newMenus.push(subKey);
        const subKeys = parentMenu.submenus.map((s) => s.key);
        const allChecked = subKeys.every((k) => newMenus.includes(k));
        if (allChecked && !newMenus.includes(parentMenu.key)) {
          newMenus.push(parentMenu.key);
        }
      }
      return { ...prev, menus: newMenus };
    });
  };

  const handleSelectAllMenus = () => {
    setFormData((prev) => {
      const allKeys = getAllMenuKeys();
      const menus = prev.menus.length === allKeys.length ? [] : allKeys;
      return { ...prev, menus };
    });
  };

  const toggleExpandMenu = (menuKey) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      id_penjahit: formData.role === "penjahit" ? formData.id_penjahit : null,
      menus: formData.role === "super-admin" ? [] : formData.menus
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      if (isEdit && formData.id) {
        await API.put(`/users-management/${formData.id}`, payload);
        toast.success("User berhasil diperbarui!");
      } else {
        if (!formData.password) {
          toast.error("Password wajib diisi untuk user baru!");
          return;
        }
        await API.post("/users-management", payload);
        toast.success("User berhasil ditambahkan!");
      }

      closeModal();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Terjadi kesalahan saat menyimpan user.");
    }
  };

  const confirmDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    const deletedId = itemToDelete.id;

    try {
      await API.delete(`/users-management/${deletedId}`);
      toast.success("User berhasil dihapus!");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Gagal menghapus data.");
    } finally {
      closeDeleteModal();
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const openEditModal = (item) => {
    setFormData({
      id: item.id,
      name: item.name,
      email: item.email,
      password: "",
      role: item.role || "staff",
      id_penjahit: item.id_penjahit || "",
      menus: item.menus || []
    });
    setIsEdit(true);
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setIsEdit(false);
    setFormData({
      id: null,
      name: "",
      email: "",
      password: "",
      role: "staff",
      id_penjahit: "",
      menus: []
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredUsers = users.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="um-container">
      <ToastContainer position="top-right" autoClose={2600} hideProgressBar theme="colored" />

      <header className="um-header">
        <div className="um-header-top">
          <div className="um-title-group">
            <div className="um-brand-icon">
              <FaUsers size={20} color="#fff" />
            </div>
            <div className="um-title-wrap">
              <div className="um-module-pill">Admin Console</div>
              <h1>User Management</h1>
              <p className="um-header-subtitle">Kelola data akun pengguna, role jabatan, dan pembatasan hak akses menu sistem</p>
            </div>
          </div>

          <div className="um-search-wrap">
            <FaSearch className="um-search-icon" />
            <input
              type="text"
              className="um-search-input"
              placeholder="Cari nama atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="um-search-clear"
                onClick={() => setSearchTerm("")}
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="um-main">
        <section className="um-stats">
          <div className="um-stat-item">
            <h4 className="um-stat-label">Total Akun</h4>
            <div className="um-stat-value primary">{stats.total}</div>
          </div>
          <div className="um-stat-item">
            <h4 className="um-stat-label">Super Admin</h4>
            <div className="um-stat-value success">{stats.superAdmins}</div>
          </div>
          <div className="um-stat-item">
            <h4 className="um-stat-label">Staff / Lainnya</h4>
            <div className="um-stat-value muted">{stats.otherUsers}</div>
          </div>
        </section>

        <motion.div
          className="um-table-wrapper"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <div className="um-table-header">
            <div>
              <h3>Daftar Pengguna Sistem</h3>
              <p>Total akun terdaftar: {users.length} user</p>
            </div>
            <button className="um-btn-primary" onClick={() => setShowForm(true)}>
              <FaPlus size={12} /> Tambah User
            </button>
          </div>

          <div className="um-table-scroll">
            <table className="um-table">
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>No</th>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Hak Akses Menu</th>
                  <th style={{ width: '120px', textAlign: 'right', paddingRight: '20px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        layout
                      >
                        <td style={{ textAlign: 'center', color: '#64748b', fontFamily: 'monospace' }}>
                          {index + 1}
                        </td>
                        <td style={{ fontWeight: 600, color: '#2458ce' }}>{item.name}</td>
                        <td>{item.email}</td>
                        <td>
                          <span className={`um-role-badge ${item.role}`}>
                            {item.role}
                          </span>
                        </td>
                        <td>
                          {item.role === "super-admin" ? (
                            <span className="um-menu-tag super">Semua Menu (Bypass)</span>
                          ) : item.menus && item.menus.length > 0 ? (
                            <div className="um-menu-tags-container">
                              {item.menus.map((key) => (
                                <span key={key} className="um-menu-tag">
                                  {getMenuLabel(key)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>Tidak ada akses menu</span>
                          )}
                        </td>
                        <td style={{ paddingRight: '20px' }}>
                          <div className="um-action-buttons">
                            <button className="um-btn-icon edit" title="Edit" onClick={() => openEditModal(item)}>
                              <FaEdit />
                            </button>
                            <button className="um-btn-icon danger" title="Hapus" onClick={() => confirmDelete(item)}>
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        {loading ? "Memuat data..." : "Tidak ada data user ditemukan."}
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {showForm && (
          <div className="um-modal-overlay">
            <motion.div
              className="um-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            />
            <motion.div
              className="um-modal-box"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="um-modal-top">
                <div>
                  <h2>{isEdit ? "Edit Pengguna" : "Tambah Pengguna Baru"}</h2>
                  <p>Lengkapi informasi kredensial dan hak akses menu akun pengguna.</p>
                </div>
                <button type="button" className="close-btn" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="um-modal-form">
                <div className="um-form-row">
                  <div className="um-field-group">
                    <label>Nama Lengkap <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="Contoh: Admin Store"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="um-field-group">
                    <label>Email Pengguna <span className="text-danger">*</span></label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="Contoh: admin@ilook.com"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="um-form-row">
                  <div className="um-field-group">
                    <label>Password {!isEdit && <span className="text-danger">*</span>}</label>
                    <input
                      type="password"
                      name="password"
                      required={!isEdit}
                      placeholder={isEdit ? "Kosongkan jika tidak ingin diubah" : "Minimal 6 karakter"}
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="um-field-group">
                    <label>Role Jabatan <span className="text-danger">*</span></label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.role === "penjahit" && (
                  <div className="um-field-group full-width">
                    <label>Hubungkan dengan Penjahit CMT <span className="text-danger">*</span></label>
                    <select
                      name="id_penjahit"
                      value={formData.id_penjahit}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">-- Pilih Penjahit CMT --</option>
                      {cmtList.map((cmt) => (
                        <option key={cmt.id_penjahit} value={cmt.id_penjahit}>
                          {cmt.nama_penjahit}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.role !== "super-admin" && (
                  <div className="um-permissions-section">
                    <div className="um-permissions-header">
                      <label>Pilih Hak Akses Menu</label>
                      <button type="button" className="um-select-all-btn" onClick={handleSelectAllMenus}>
                        {formData.menus.length === getAllMenuKeys().length ? "Hapus Semua" : "Pilih Semua"}
                      </button>
                    </div>
                    <div className="um-permissions-tree">
                      {AVAILABLE_MENUS.map((menu) => {
                        const isChecked = isParentChecked(menu);
                        const isIndeterminate = isParentIndeterminate(menu);
                        const hasSubmenus = !!menu.submenus;
                        const isExpanded = !!expandedMenus[menu.key];
                        const MenuIcon = menu.icon;

                        return (
                          <div key={menu.key} className="um-permission-group">
                            <div 
                              className="um-permission-group-header"
                              onClick={() => hasSubmenus ? toggleExpandMenu(menu.key) : handleParentToggle(menu)}
                            >
                              <div 
                                className="um-permission-group-left" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleParentToggle(menu);
                                }}
                              >
                                {isChecked ? (
                                  <div className="custom-chk checked">
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                    >
                                      <FaCheck size={9} color="#fff" />
                                    </motion.div>
                                  </div>
                                ) : isIndeterminate ? (
                                  <div className="custom-chk indeterminate">
                                    <div className="minus-line" />
                                  </div>
                                ) : (
                                  <div className="custom-chk" />
                                )}
                                {MenuIcon && (
                                  <span className="um-permission-group-icon">
                                    <MenuIcon size={12} />
                                  </span>
                                )}
                                <span className="um-permission-group-label">{menu.label}</span>
                              </div>

                              {hasSubmenus && (
                                <button
                                  type="button"
                                  className="um-permission-group-toggle"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpandMenu(menu.key);
                                  }}
                                >
                                  {menu.submenus.length} Menu
                                  <FaChevronDown 
                                    style={{ 
                                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                      transition: "transform 0.2s",
                                      marginLeft: "4px"
                                    }} 
                                  />
                                </button>
                              )}
                            </div>

                            <AnimatePresence initial={false}>
                              {hasSubmenus && isExpanded && (
                                <motion.div
                                  className="um-permission-submenus"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22, ease: "easeInOut" }}
                                  style={{ overflow: "hidden" }}
                                >
                                  {/* Special "Select All / Deselect All" card inside the submenus grid */}
                                  <div 
                                    className="um-submenu-label select-all-submenus" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleParentToggle(menu);
                                    }}
                                  >
                                    {isChecked ? (
                                      <div className="custom-chk checked">
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                        >
                                          <FaCheck size={9} color="#fff" />
                                        </motion.div>
                                      </div>
                                    ) : isIndeterminate ? (
                                      <div className="custom-chk indeterminate">
                                        <div className="minus-line" />
                                      </div>
                                    ) : (
                                      <div className="custom-chk" />
                                    )}
                                    <span className="select-all-text">Pilih / Batal Semua</span>
                                  </div>

                                  {menu.submenus.map((sub) => {
                                    const isSubChecked = formData.menus.includes(sub.key);
                                    return (
                                      <div 
                                        key={sub.key} 
                                        className="um-submenu-label" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSubmenuToggle(menu, sub.key);
                                        }}
                                      >
                                        {isSubChecked ? (
                                          <div className="custom-chk checked">
                                            <motion.div
                                              initial={{ scale: 0 }}
                                              animate={{ scale: 1 }}
                                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                            >
                                              <FaCheck size={9} color="#fff" />
                                            </motion.div>
                                          </div>
                                        ) : (
                                          <div className="custom-chk" />
                                        )}
                                        <span>{sub.label}</span>
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="um-modal-bottom">
                  <button type="button" className="um-btn-cancel" onClick={closeModal}>Batal</button>
                  <button type="submit" className="um-btn-primary">
                    Simpan Data
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && itemToDelete && (
          <div className="um-modal-overlay">
            <motion.div
              className="um-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDeleteModal}
            />
            <motion.div
              className="um-modal-box small-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="um-modal-top borderless center-header">
                <button type="button" className="close-btn absolute-right" onClick={closeDeleteModal}>
                  <FaTimes />
                </button>
                <div className="danger-icon-wrap">
                  <FaTrash />
                </div>
              </div>

              <div className="um-modal-form center-text pt-0">
                <h2>Hapus Data Pengguna?</h2>
                <p className="delete-desc">
                  Apakah Anda yakin ingin menghapus akun <strong>{itemToDelete.name}</strong> ({itemToDelete.email})? Tindakan ini akan mencabut akses sistem secara permanen.
                </p>

                <div className="um-modal-bottom evenly">
                  <button type="button" className="um-btn-cancel flex-1" onClick={closeDeleteModal}>Batal</button>
                  <button type="button" className="um-btn-danger flex-1" onClick={handleDelete}>
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;

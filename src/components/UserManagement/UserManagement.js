import React, { useEffect, useState, useMemo } from "react";
import "./UserManagement.css";
import API from "../../api";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSearch, FaTimes, FaPlus, FaEdit, FaTrash, FaUsers, FaChevronDown, FaChevronRight, FaCheck,
  FaTachometerAlt, FaFileInvoice, FaShieldAlt, FaFlask, FaGem, FaBox, FaWarehouse, FaCut, FaTools, FaTshirt, FaBoxes, FaBoxOpen, FaUndo, FaMapMarkerAlt
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
      { key: "cmt:pekerjaan_tersedia", label: "Pekerjaan Tersedia" },
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
      { key: "gudang_produk:history_produk_masuk", label: "History Produk Masuk" },
      { key: "gudang_produk:history_out_check", label: "History Keluar - Cek Masuk" }
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
  const [layouts, setLayouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [expandedGudangs, setExpandedGudangs] = useState({});
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    role: "staff",
    id_penjahit: "",
    menus: [],
    gudang_access: []
  });

  useEffect(() => {
    fetchUsers();
    fetchCmtList();
    fetchLayouts();
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

  const fetchLayouts = async () => {
    try {
      const response = await API.get("/gudang-produk-workspace?without_catalog=true&activity_limit=0");
      setLayouts(response.data?.data?.layouts || []);
    } catch (error) {
      console.error("Gagal mengambil data gudang:", error);
    }
  };

  const getLayoutAllRacks = (layout) => {
    let racks = [];
    layout.floors?.forEach(f => {
      f.blocks?.forEach(b => {
        b.racks?.forEach(r => racks.push(r.id));
      });
    });
    return racks;
  };

  const getLayoutAccessState = (layout, currentAccess) => {
    if (currentAccess.includes(layout.id)) return 'checked';
    const allRacks = getLayoutAllRacks(layout);
    if (allRacks.length === 0) return 'unchecked';
    const checkedRacks = allRacks.filter(r => currentAccess.includes(r));
    if (checkedRacks.length === 0) return 'unchecked';
    if (checkedRacks.length === allRacks.length) return 'checked';
    return 'indeterminate';
  };

  const toggleGudangMenu = (menuKey, e) => {
    e.stopPropagation();
    setExpandedGudangs((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const toggleLayoutAccess = (layout) => {
    setFormData(prev => {
      const state = getLayoutAccessState(layout, prev.gudang_access);
      let newAccess = prev.gudang_access.filter(id => id !== layout.id && !getLayoutAllRacks(layout).includes(id));
      if (state !== 'checked') {
        newAccess.push(layout.id); // Add full layout
      }
      return { ...prev, gudang_access: newAccess };
    });
  };

  const toggleRackAccess = (layout, rackId) => {
    setFormData(prev => {
      let newAccess = [...prev.gudang_access];
      const hasFullLayout = newAccess.includes(layout.id);
      const allRacks = getLayoutAllRacks(layout);
      
      if (hasFullLayout) {
        newAccess = newAccess.filter(id => id !== layout.id);
        allRacks.forEach(r => {
          if (r !== rackId) newAccess.push(r);
        });
      } else {
        if (newAccess.includes(rackId)) {
          newAccess = newAccess.filter(id => id !== rackId);
        } else {
          newAccess.push(rackId);
        }
        
        const checkedRacks = allRacks.filter(r => newAccess.includes(r));
        if (checkedRacks.length === allRacks.length && allRacks.length > 0) {
          newAccess = newAccess.filter(id => !allRacks.includes(id));
          newAccess.push(layout.id);
        }
      }
      return { ...prev, gudang_access: newAccess };
    });
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
      menus: formData.role === "super-admin" ? [] : formData.menus,
      gudang_access: formData.role === "super-admin" ? [] : formData.gudang_access
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
      menus: item.menus || [],
      gudang_access: item.gudang_access || []
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
      menus: [],
      gudang_access: []
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
    <div className="ks-page">
      <ToastContainer position="top-right" autoClose={2600} hideProgressBar theme="colored" />

      <header className="ks-header">
        <div className="ks-header-id">
          <h1>
            User Management
          </h1>
          <span className="ks-header-sub">Kelola data akun pengguna, role jabatan, dan pembatasan hak akses menu sistem</span>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Total Akun</span>
          <span className="ks-stat-value">{stats.total}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Super Admin</span>
          <span className="ks-stat-value">{stats.superAdmins}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Staff / Lainnya</span>
          <span className="ks-stat-value">{stats.otherUsers}</span>
        </div>
      </div>

      <section className="ks-board" style={{ margin: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="ks-toolbar">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1, flexWrap: "wrap" }}>
            <div className="ks-search">
              <FaSearch style={{ position: "absolute", left: "10px", color: "var(--ks-muted, #9a9aa3)", pointerEvents: "none", fontSize: "12px" }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari nama atau email..."
                style={{ paddingLeft: "30px" }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8"
                  }}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className="ks-btn ks-btn-primary" onClick={() => setShowForm(true)}>
              <FaPlus /> Tambah User
            </button>
          </div>
        </div>
        <div className="ks-grid-scroll" style={{ flex: 1, overflowY: "auto" }}>
          <table className="ks-grid" style={{ whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>NO</th>
                <th>NAMA</th>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th>HAK AKSES MENU</th>
                <th style={{ width: '120px', textAlign: 'center' }}>AKSI</th>
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
                      <td style={{ textAlign: 'center', color: 'var(--ks-muted)', fontFamily: 'monospace' }}>
                        {index + 1}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--ks-text)' }}>{item.name}</td>
                      <td>{item.email}</td>
                      <td>
                        <span className={`um-role-badge ${item.role}`}>
                          {item.role}
                        </span>
                      </td>
                      <td>
                        {item.role === "super-admin" ? (
                          <span className="um-menu-tag super" style={{ background: "#ecfdf5", color: "#047857", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: "bold" }}>Semua Menu (Bypass)</span>
                        ) : item.menus && item.menus.length > 0 ? (
                          <div style={{ display: "flex", gap: "4px" }}>
                            {item.menus.slice(0, 2).map((key) => (
                              <span key={key} style={{ background: "#edf2f7", color: "#475569", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: "bold", border: "1px solid #cbd5e1" }}>
                                {getMenuLabel(key)}
                              </span>
                            ))}
                            {item.menus.length > 2 && (
                              <span style={{ background: "#f8fafc", color: "#64748b", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: "bold", border: "1px dashed #cbd5e1" }}>
                                +{item.menus.length - 2} Lainnya
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: 12 }}>Tidak ada akses menu</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button 
                            className="ks-btn" 
                            style={{ padding: "4px 8px" }} 
                            title="Edit" 
                            onClick={() => openEditModal(item)}
                          >
                            <FaEdit color="#0f766e" />
                          </button>
                          <button 
                            className="ks-btn" 
                            style={{ padding: "4px 8px" }} 
                            title="Hapus" 
                            onClick={() => confirmDelete(item)}
                          >
                            <FaTrash color="#be123c" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontStyle: 'italic' }}>
                      {loading ? "Memuat data..." : "Tidak ada data user ditemukan."}
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </section>

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
                <div className="um-modal-columns">
                  <div className="um-modal-col">
                    <h3 className="um-col-title">Detail Pengguna</h3>
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
                </div> {/* End Column 1 */}

                {formData.role !== "super-admin" && (
                  <div className="um-modal-col">
                    <h3 className="um-col-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                      Hak Akses Menu
                      <button type="button" className="um-select-all-btn" onClick={handleSelectAllMenus}>
                        {formData.menus.length === getAllMenuKeys().length ? "Hapus Semua" : "Pilih Semua"}
                      </button>
                    </h3>
                    <div className="um-permissions-tree" style={{ marginTop: '12px' }}>
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

                {formData.role !== "super-admin" && layouts.length > 0 && (
                  <div className="um-modal-col">
                    <h3 className="um-col-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                      Akses Gudang / Layout
                      <button 
                        type="button" 
                        className="um-select-all-btn" 
                        onClick={() => {
                          const allSelected = layouts.every(l => formData.gudang_access.includes(l.id));
                          setFormData(prev => ({
                            ...prev,
                            gudang_access: allSelected ? [] : layouts.map(l => l.id)
                          }));
                        }}
                      >
                        {layouts.every(l => formData.gudang_access.includes(l.id)) ? "Hapus Semua" : "Pilih Semua"}
                      </button>
                    </h3>
                    <div className="um-permissions-tree" style={{ marginTop: '12px' }}>
                      {layouts.map((layout) => {
                        const layoutState = getLayoutAccessState(layout, formData.gudang_access);
                        const isExpanded = expandedGudangs[layout.id];
                        return (
                          <div key={layout.id} className="um-permission-group">
                            <div className="um-permission-group-header" onClick={() => toggleLayoutAccess(layout)} style={{ cursor: "pointer" }}>
                              <div className="um-permission-group-left">
                                <button type="button" className="um-expand-btn" onClick={(e) => toggleGudangMenu(layout.id, e)}>
                                  {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                                </button>
                                {layoutState === 'checked' ? (
                                  <div className="custom-chk checked"><FaCheck size={9} color="#fff" /></div>
                                ) : layoutState === 'indeterminate' ? (
                                  <div className="custom-chk checked"><div style={{width: 8, height: 2, background: '#fff', borderRadius: 1}} /></div>
                                ) : (
                                  <div className="custom-chk" />
                                )}
                                <span className="um-permission-group-icon"><FaMapMarkerAlt size={12} /></span>
                                <span className="um-permission-group-label">{layout.name}</span>
                              </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  style={{ overflow: "hidden" }}
                                >
                                  {layout.floors?.map(floor => (
                                    <div key={floor.id} style={{ paddingLeft: 24, marginTop: 4 }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', padding: '4px 0' }}>Lantai {floor.number}</div>
                                      {floor.blocks?.map(block => (
                                        <div key={block.id} style={{ paddingLeft: 12 }}>
                                          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', padding: '4px 0' }}>Blok {block.code}</div>
                                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, paddingLeft: 12, marginBottom: 8 }}>
                                            {block.racks?.map(rack => {
                                              const isRackChecked = formData.gudang_access.includes(layout.id) || formData.gudang_access.includes(rack.id);
                                              return (
                                                <div 
                                                  key={rack.id} 
                                                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 8px', background: isRackChecked ? '#eff6ff' : '#f8fafc', border: `1px solid ${isRackChecked ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: 4 }}
                                                  onClick={() => toggleRackAccess(layout, rack.id)}
                                                >
                                                  {isRackChecked ? (
                                                    <div className="custom-chk checked" style={{ width: 14, height: 14, minWidth: 14 }}><FaCheck size={8} color="#fff" /></div>
                                                  ) : (
                                                    <div className="custom-chk" style={{ width: 14, height: 14, minWidth: 14 }} />
                                                  )}
                                                  <span style={{ fontSize: 12, color: isRackChecked ? '#1e40af' : '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rack.label || `Rak ${rack.number}`}</span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                </div> {/* End um-modal-columns */}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", marginTop: "8px" }}>
                  <button type="button" className="ks-btn" onClick={closeModal}>Batal</button>
                  <button type="submit" className="ks-btn ks-btn-primary">
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
              style={{ width: 400 }}
            >
              <div className="um-modal-top borderless center-header" style={{ flexDirection: "column", alignItems: "center", padding: "24px 24px 12px", borderBottom: "none" }}>
                <button type="button" className="close-btn" style={{ position: "absolute", right: 16, top: 16 }} onClick={closeDeleteModal}>
                  <FaTimes />
                </button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "50%", color: "#dc2626", fontSize: 24, marginBottom: 12 }}>
                  <FaTrash />
                </div>
              </div>

              <div style={{ textAlign: "center", padding: "0 24px 24px" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>Hapus Data Pengguna?</h2>
                <p style={{ fontSize: 13, color: "#64748b", margin: "8px 0 24px" }}>
                  Apakah Anda yakin ingin menghapus akun <strong>{itemToDelete.name}</strong> ({itemToDelete.email})? Tindakan ini akan mencabut akses sistem secara permanen.
                </p>

                <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                  <button type="button" className="ks-btn" style={{ flex: 1, justifyContent: "center" }} onClick={closeDeleteModal}>Batal</button>
                  <button type="button" className="ks-btn ks-btn-danger" style={{ flex: 1, justifyContent: "center", background: "#e11d48", color: "#fff" }} onClick={handleDelete}>
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

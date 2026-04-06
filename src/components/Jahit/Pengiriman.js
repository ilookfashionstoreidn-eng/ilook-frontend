import React, { useEffect, useMemo, useState } from "react";
import "./Pengiriman.css";
import API from "../../api";
import Select from "react-select";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiFilter,
  FiPackage,
  FiPlus,
  FiSearch,
  FiShield,
  FiTruck,
  FiUser,
  FiX,
} from "react-icons/fi";

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createInitialPengiriman = () => ({
  id_spk: "",
  tanggal_pengiriman: getTodayDate(),
  total_barang_dikirim: "",
  sisa_barang: "",
  total_bayar: "",
  warna: [],
  foto_nota: null,
});

const statusConfig = {
  valid: {
    label: "Valid",
    tone: "is-valid",
    icon: <FiCheckCircle />,
  },
  invalid: {
    label: "Invalid",
    tone: "is-invalid",
    icon: <FiAlertCircle />,
  },
  pending: {
    label: "Pending",
    tone: "is-pending",
    icon: <FiClock />,
  },
};

const getStatusConfig = (status) => statusConfig[status] || statusConfig.pending;

const Pengiriman = () => {
  const [pengirimans, setPengirimans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPengiriman, setSelectedPengiriman] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedPenjahit, setSelectedPenjahit] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [penjahitList, setPenjahitList] = useState([]);
  const [selectedStatusVerifikasi, setSelectedStatusVerifikasi] = useState("");
  const [warnaData, setWarnaData] = useState([]);
  const [showPetugasAtasPopup, setShowPetugasAtasPopup] = useState(false);
  const [spkCmtList, setSpkCmtList] = useState([]);
  const [selectedSpkDeadline, setSelectedSpkDeadline] = useState(null);
  const [deadlineError, setDeadlineError] = useState("");
  const [tanggalMasaLaluError, setTanggalMasaLaluError] = useState("");
  const [newPengiriman, setNewPengiriman] = useState(createInitialPengiriman());

  const userRole = localStorage.getItem("role");

  useEffect(() => {
    const fetchPengirimans = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await API.get("/pengiriman", {
          params: {
            page: currentPage,
            id_penjahit: selectedPenjahit,
            sortBy,
            sortOrder,
            status_verifikasi: selectedStatusVerifikasi,
          },
        });

        setPengirimans(response.data.data || []);
        setLastPage(response.data.last_page || 1);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchPengirimans();
  }, [currentPage, selectedPenjahit, sortBy, sortOrder, selectedStatusVerifikasi]);

  useEffect(() => {
    const fetchPenjahits = async () => {
      try {
        const response = await API.get("/penjahit");
        setPenjahitList(response.data || []);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || "Gagal mengambil data penjahit.");
      }
    };

    fetchPenjahits();
  }, []);

  useEffect(() => {
    const fetchSpkCmt = async () => {
      try {
        const response = await API.get("/spkcmt", {
          params: {
            status: "sudah_diambil",
            allData: "true",
          },
        });

        let data = [];

        if (response.data?.spk) {
          if (Array.isArray(response.data.spk)) {
            data = response.data.spk;
          } else if (Array.isArray(response.data.spk.data)) {
            data = response.data.spk.data;
          }
        }

        setSpkCmtList(data);
      } catch (fetchError) {
        setSpkCmtList([]);
      }
    };

    fetchSpkCmt();
  }, []);

  useEffect(() => {
    if (showPetugasAtasPopup && selectedPengiriman) {
      fetchWarnaBySpk(selectedPengiriman.id_spk);
    }
  }, [selectedPengiriman, showPetugasAtasPopup]);

  useEffect(() => {
    if (showForm) {
      setNewPengiriman((prev) => ({
        ...prev,
        tanggal_pengiriman: getTodayDate(),
      }));
      setTanggalMasaLaluError("");
      setDeadlineError("");
    }
  }, [showForm]);

  const fetchWarnaBySpk = async (idSpk) => {
    try {
      const response = await API.get(`/spk-cmt/${idSpk}/warna`);

      if (!Array.isArray(response.data.warna)) {
        return;
      }

      setWarnaData(
        response.data.warna.map((warna) => ({
          nama_warna: warna.nama_warna,
          qty_spk: warna.qty,
          jumlah_dikirim: 0,
        }))
      );
    } catch (fetchError) {
      setWarnaData([]);
    }
  };

  const fetchSpkDeadline = async (idSpk) => {
    try {
      const spkSelected = spkCmtList.find((spk) => spk.id_spk === idSpk);

      if (spkSelected?.deadline) {
        setSelectedSpkDeadline(spkSelected.deadline);
        return;
      }

      const response = await API.get(`/spkcmt/${idSpk}`);

      if (response.data?.deadline) {
        setSelectedSpkDeadline(response.data.deadline);
      } else {
        setSelectedSpkDeadline(null);
      }
    } catch (fetchError) {
      setSelectedSpkDeadline(null);
    }
  };

  const validateTanggalMasaLalu = (tanggalPengiriman) => {
    if (!tanggalPengiriman) {
      setTanggalMasaLaluError("");
      return { valid: true, error: "" };
    }

    const tanggal = new Date(tanggalPengiriman);
    tanggal.setHours(0, 0, 0, 0);

    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);

    if (tanggal < hariIni) {
      const tanggalFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(tanggal);

      const hariIniFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(hariIni);

      const message = `Tanggal pengiriman (${tanggalFormatted}) tidak boleh sebelum hari ini (${hariIniFormatted}).`;
      setTanggalMasaLaluError(message);
      return { valid: false, error: message };
    }

    setTanggalMasaLaluError("");
    return { valid: true, error: "" };
  };

  const validateDeadline = (tanggalPengiriman, returnError = false) => {
    if (!tanggalPengiriman || !selectedSpkDeadline) {
      setDeadlineError("");
      return returnError ? { valid: true, error: "" } : true;
    }

    const tanggal = new Date(tanggalPengiriman);
    tanggal.setHours(0, 0, 0, 0);

    const deadline = new Date(selectedSpkDeadline);
    deadline.setHours(0, 0, 0, 0);

    if (tanggal > deadline) {
      const deadlineFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(deadline);

      const tanggalFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(tanggal);

      const message = `Tanggal pengiriman (${tanggalFormatted}) tidak boleh melewati deadline SPK (${deadlineFormatted}).`;
      setDeadlineError(message);
      return returnError ? { valid: false, error: message } : false;
    }

    setDeadlineError("");
    return returnError ? { valid: true, error: "" } : true;
  };

  const getTotalTransfer = (pengiriman) => {
    const claimBelumDibayar =
      pengiriman.status_claim === "belum_dibayar" ? pengiriman.claim || 0 : 0;

    return (
      (Number(pengiriman.total_bayar) || 0) +
      (Number(pengiriman.refund_claim) || 0) -
      (Number(claimBelumDibayar) || 0)
    );
  };

  const filteredPengirimans = useMemo(() => {
    if (!Array.isArray(pengirimans)) {
      return [];
    }

    const keyword = searchTerm.trim().toLowerCase();

    return [...pengirimans]
      .filter((pengiriman) => {
        if (!keyword) {
          return true;
        }

        return [
          pengiriman.id_spk,
          pengiriman.id_pengiriman,
          pengiriman.nama_penjahit,
          pengiriman.nama_produk,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      })
      .sort((first, second) =>
        sortOrder === "asc"
          ? new Date(first.created_at) - new Date(second.created_at)
          : new Date(second.created_at) - new Date(first.created_at)
      );
  }, [pengirimans, searchTerm, sortOrder]);

  const dashboardStats = useMemo(() => {
    const pendingCount = filteredPengirimans.filter(
      (item) => (item.status_verifikasi || "pending") === "pending"
    ).length;

    const totalTransferValid = filteredPengirimans.reduce((total, item) => {
      if (item.status_verifikasi !== "valid") {
        return total;
      }
      return total + getTotalTransfer(item);
    }, 0);

    const totalSisaBarang = filteredPengirimans.reduce(
      (total, item) => total + (Number(item.sisa_barang) || 0),
      0
    );

    const invalidCount = filteredPengirimans.filter(
      (item) => item.status_verifikasi === "invalid"
    ).length;

    return [
      {
        key: "shipments",
        label: "Total Pengiriman",
        value: filteredPengirimans.length,
        note: "Data tampil pada halaman aktif",
        icon: <FiPackage />,
      },
      {
        key: "pending",
        label: "Menunggu Verifikasi",
        value: pendingCount,
        note: "Butuh tindak lanjut petugas atas",
        icon: <FiClock />,
      },
      {
        key: "transfer",
        label: "Transfer Tervalidasi",
        value: formatRupiah(totalTransferValid),
        note: "Akumulasi pembayaran valid",
        icon: <FiDollarSign />,
      },
      {
        key: "sisa",
        label: "Sisa Barang",
        value: `${totalSisaBarang} pcs`,
        note:
          invalidCount > 0
            ? `${invalidCount} data berstatus invalid`
            : "Semua pengiriman tertata",
        icon: <FiShield />,
      },
    ];
  }, [filteredPengirimans]);

  const heroSnapshot = useMemo(() => {
    const validItems = filteredPengirimans.filter(
      (item) => item.status_verifikasi === "valid"
    );
    const pendingCount = filteredPengirimans.filter(
      (item) => (item.status_verifikasi || "pending") === "pending"
    ).length;
    const totalTransferValid = validItems.reduce(
      (total, item) => total + getTotalTransfer(item),
      0
    );
    const topTransferItem = [...validItems].sort(
      (first, second) => getTotalTransfer(second) - getTotalTransfer(first)
    )[0];

    return {
      pendingCount,
      validCount: validItems.length,
      totalTransferValid: formatRupiah(totalTransferValid),
      topTransferLabel: topTransferItem
        ? `${topTransferItem.nama_penjahit || "CMT"} • ${formatRupiah(
            getTotalTransfer(topTransferItem)
          )}`
        : "Belum ada transfer valid",
    };
  }, [filteredPengirimans]);

  const toolbarInsights = useMemo(() => {
    const uniqueCmtCount = new Set(
      filteredPengirimans.map((item) => item.nama_penjahit).filter(Boolean)
    ).size;

    const highestSisaItem = filteredPengirimans.reduce((highest, item) => {
      if (!highest) {
        return item;
      }

      return Number(item.sisa_barang || 0) > Number(highest.sisa_barang || 0)
        ? item
        : highest;
    }, null);

    const validCount = filteredPengirimans.filter(
      (item) => item.status_verifikasi === "valid"
    ).length;

    return [
      {
        key: "view",
        label: "View",
        value: searchTerm.trim() ? "Filtered" : "Overall",
      },
      {
        key: "partner",
        label: "Partner CMT",
        value: `${uniqueCmtCount} aktif`,
      },
      {
        key: "valid",
        label: "Terverifikasi",
        value: `${validCount} data`,
      },
      {
        key: "risk",
        label: "Sisa Tertinggi",
        value: highestSisaItem
          ? `${highestSisaItem.nama_penjahit || "CMT"} • ${
              highestSisaItem.sisa_barang || 0
            } pcs`
          : "-",
      },
    ];
  }, [filteredPengirimans, searchTerm]);

  const spkCmtOptions = useMemo(() => {
    if (!Array.isArray(spkCmtList) || spkCmtList.length === 0) {
      return [];
    }

    return spkCmtList
      .filter((spk) => spk.status === "sudah_diambil")
      .map((spk) => ({
        value: spk.id_spk,
        label: `${spk.nomor_seri || `SPK-${spk.id_spk}`} - ${
          spk.nama_produk || "Produk tidak diketahui"
        }`,
      }));
  }, [spkCmtList]);

  const formatTanggal = (tanggal) => {
    const date = new Date(tanggal);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  function formatRupiah(value) {
    if (!value && value !== 0) {
      return "Rp 0";
    }

    const numValue = typeof value === "string" ? parseFloat(value) : value;

    if (Number.isNaN(numValue)) {
      return "Rp 0";
    }

    return `Rp ${Math.floor(numValue).toLocaleString("id-ID")}`;
  }

  const resetFormState = () => {
    setNewPengiriman(createInitialPengiriman());
    setSelectedSpkDeadline(null);
    setDeadlineError("");
    setTanggalMasaLaluError("");
  };

  const closeFormModal = () => {
    setShowForm(false);
    resetFormState();
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedPengiriman(null);
  };

  const closePetugasAtasPopup = () => {
    setShowPetugasAtasPopup(false);
    setSelectedPengiriman(null);
    setWarnaData([]);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    if (!newPengiriman.id_spk) {
      alert("Silakan pilih SPK CMT terlebih dahulu");
      return;
    }

    if (!newPengiriman.foto_nota) {
      alert("Silakan upload foto nota terlebih dahulu");
      return;
    }

    const tanggalMasaLaluValidation = validateTanggalMasaLalu(
      newPengiriman.tanggal_pengiriman
    );

    if (!tanggalMasaLaluValidation.valid) {
      alert(tanggalMasaLaluValidation.error);
      return;
    }

    const deadlineValidation = validateDeadline(
      newPengiriman.tanggal_pengiriman,
      true
    );

    if (!deadlineValidation.valid) {
      alert(deadlineValidation.error);
      return;
    }

    const formData = new FormData();
    formData.append("id_spk", Number(newPengiriman.id_spk));
    formData.append("tanggal_pengiriman", newPengiriman.tanggal_pengiriman);
    formData.append(
      "total_barang_dikirim",
      Number(newPengiriman.total_barang_dikirim) || 0
    );
    formData.append("foto_nota", newPengiriman.foto_nota);

    try {
      const response = await API.post("/pengiriman/petugas-bawah", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPengirimans((prev) => [...prev, response.data.data]);
      closeFormModal();
    } catch (submitError) {
      alert(
        submitError.response?.data?.error ||
          "Terjadi kesalahan saat menambahkan pengiriman."
      );
    }
  };

  const handleQtyChange = (index, value) => {
    setWarnaData((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, jumlah_dikirim: value } : item
      )
    );
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setNewPengiriman((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "tanggal_pengiriman") {
      validateTanggalMasaLalu(value);
      validateDeadline(value);
    }
  };

  const handleDetailClick = (pengiriman) => {
    setSelectedPengiriman(pengiriman);
    setShowPopup(true);
    setShowPetugasAtasPopup(false);
  };

  const handlePetugasAtas = (pengiriman) => {
    setSelectedPengiriman(pengiriman);
    setShowPetugasAtasPopup(true);
    setShowPopup(false);
  };

  const handlePetugasAtasSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await API.put(
        `/pengiriman/petugas-atas/${selectedPengiriman.id_pengiriman}`,
        {
          warna: warnaData.map((warna) => ({
            warna: warna.nama_warna,
            jumlah_dikirim: warna.jumlah_dikirim,
          })),
        }
      );

      alert("Data berhasil diperbarui!");

      setPengirimans((prev) =>
        prev.map((item) =>
          item.id_pengiriman === selectedPengiriman.id_pengiriman
            ? { ...item, ...response.data.data }
            : item
        )
      );

      closePetugasAtasPopup();
    } catch (submitError) {
      alert(
        submitError.response?.data?.error || "Gagal memperbarui data pengiriman."
      );
    }
  };

  const selectedStatus = selectedPengiriman
    ? getStatusConfig(selectedPengiriman.status_verifikasi || "pending")
    : getStatusConfig("pending");

  return (
    <div className="pengiriman-page">
      <div className="pengiriman-shell">
        <section className="pengiriman-hero">
          <div className="pengiriman-hero-copy">
            <span className="pengiriman-eyebrow">
              <FiTruck />
              CMT Delivery Control
            </span>
            <div className="pengiriman-title-row">
              <div className="pengiriman-title-icon">
                <FiTruck />
              </div>
              <div>
                <h1>Manajemen Pengiriman CMT</h1>
                <p>
                  Satu workspace. Pengiriman, verifikasi, dan sisa barang — semua dalam kendali penuh.
                </p>
              </div>
            </div>
            <div className="pengiriman-chip-row">
              <span className="pengiriman-chip pengiriman-chip--primary">
                <FiCalendar />
                {formatTanggal(getTodayDate())}
              </span>
              <span className="pengiriman-chip">
                <FiPackage />
                {filteredPengirimans.length} data aktif di halaman ini
              </span>
              <span className="pengiriman-chip">
                <FiShield />
                {heroSnapshot.validCount} data sudah valid
              </span>
            </div>
          </div>

          <div className="pengiriman-hero-aside">
            <div className="pengiriman-hero-card">
              <span className="pengiriman-hero-card-label">Snapshot Operasional</span>
              <strong>{heroSnapshot.totalTransferValid}</strong>
              <p>
                Fokus utama hari ini ada pada verifikasi pengiriman dan kontrol
                nilai transfer yang sudah sah.
              </p>
              <div className="pengiriman-hero-side-grid">
                <div>
                  <span>Pending</span>
                  <strong>{heroSnapshot.pendingCount}</strong>
                </div>
                <div>
                  <span>Top Transfer</span>
                  <strong>{heroSnapshot.topTransferLabel}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pengiriman-stats-grid">
          {dashboardStats.map((item) => (
            <article key={item.key} className="pengiriman-stat-card">
              <div className="pengiriman-stat-icon">{item.icon}</div>
              <div className="pengiriman-stat-copy">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </div>
            </article>
          ))}
        </section>

        <section className="pengiriman-main-card">
          <div className="pengiriman-main-head">
            <div>
              <span className="pengiriman-section-label">
                <FiFilter />
                Control Center
              </span>
              <h2>Daftar Pengiriman</h2>
              <p>
                Filter, pantau, dan verifikasi data pengiriman dengan struktur
                yang lebih cepat dipindai.
              </p>
            </div>

            <div className="pengiriman-head-actions">
              <button
                type="button"
                className="pengiriman-primary-btn"
                onClick={() => setShowForm(true)}
              >
                <FiPlus />
                Tambah Pengiriman
              </button>
            </div>
          </div>

          <div className="pengiriman-inline-stats">
            {toolbarInsights.map((item) => (
              <div key={item.key} className="pengiriman-inline-stat">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="pengiriman-filter-grid">
            <label className="pengiriman-filter-field pengiriman-filter-field--search">
              <span>
                <FiSearch />
                Cari data
              </span>
              <input
                type="text"
                placeholder="Cari SPK, produk, atau CMT"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <label className="pengiriman-filter-field">
              <span>
                <FiUser />
                CMT
              </span>
              <select
                value={selectedPenjahit}
                onChange={(event) => setSelectedPenjahit(event.target.value)}
              >
                <option value="">Semua CMT</option>
                {penjahitList.map((penjahit) => (
                  <option
                    key={penjahit.id_penjahit}
                    value={penjahit.id_penjahit}
                  >
                    {penjahit.nama_penjahit}
                  </option>
                ))}
              </select>
            </label>

            <label className="pengiriman-filter-field">
              <span>
                <FiCalendar />
                Urutan data
              </span>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              >
                <option value="desc">Terbaru</option>
                <option value="asc">Terlama</option>
              </select>
            </label>

            <label className="pengiriman-filter-field">
              <span>
                <FiShield />
                Status verifikasi
              </span>
              <select
                value={selectedStatusVerifikasi}
                onChange={(event) =>
                  setSelectedStatusVerifikasi(event.target.value)
                }
              >
                <option value="">Semua status</option>
                <option value="pending">Pending</option>
                <option value="invalid">Invalid</option>
                <option value="valid">Valid</option>
              </select>
            </label>
          </div>

          <div className="pengiriman-table-card">
            <div className="pengiriman-table-head">
              <div>
                <h3>Ringkasan Halaman</h3>
                <p>
                  Menampilkan {filteredPengirimans.length} data dari halaman{" "}
                  {currentPage}.
                </p>
              </div>
              <div className="pengiriman-table-meta">
                <span className="pengiriman-table-meta-chip">
                  Halaman {currentPage} / {lastPage}
                </span>
              </div>
            </div>

            {error && (
              <div className="pengiriman-inline-alert">
                <FiAlertCircle />
                <span>{error}</span>
              </div>
            )}

            <div className="pengiriman-table-wrapper">
              <table className="pengiriman-table">
                <thead>
                  <tr>
                    <th>SPK</th>
                    <th>CMT</th>
                    <th>Produk</th>
                    <th>Tanggal</th>
                    <th>Qty Kirim</th>
                    <th>Sisa</th>
                    <th>Total Transfer</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="pengiriman-table-state">
                        Memuat data pengiriman...
                      </td>
                    </tr>
                  ) : filteredPengirimans.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="pengiriman-table-state">
                        Tidak ada data pengiriman yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPengirimans.map((pengiriman) => {
                      const status = getStatusConfig(
                        pengiriman.status_verifikasi || "pending"
                      );
                      const totalTransfer = getTotalTransfer(pengiriman);

                      return (
                        <tr key={pengiriman.id_pengiriman}>
                          <td>
                            <div className="pengiriman-cell-primary">
                              <strong>SPK-{pengiriman.id_spk}</strong>
                              <span>ID Pengiriman #{pengiriman.id_pengiriman}</span>
                            </div>
                          </td>
                          <td>{pengiriman.nama_penjahit || "-"}</td>
                          <td>{pengiriman.nama_produk || "-"}</td>
                          <td>{formatTanggal(pengiriman.tanggal_pengiriman)}</td>
                          <td>{pengiriman.total_barang_dikirim || 0} pcs</td>
                          <td>
                            <span
                              className={`pengiriman-qty-chip ${
                                Number(pengiriman.sisa_barang) > 0
                                  ? "is-warning"
                                  : "is-safe"
                              }`}
                            >
                              {pengiriman.sisa_barang || 0} pcs
                            </span>
                          </td>
                          <td>
                            {pengiriman.status_verifikasi === "valid" ? (
                              formatRupiah(totalTransfer)
                            ) : (
                              <span className="pengiriman-muted-text">
                                Belum diverifikasi
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`pengiriman-status ${status.tone}`}>
                              {status.icon}
                              {status.label}
                            </span>
                          </td>
                          <td>
                            <div className="pengiriman-row-actions">
                              <button
                                type="button"
                                className="pengiriman-icon-btn"
                                onClick={() => handleDetailClick(pengiriman)}
                                title="Detail"
                              >
                                <FiFileText />
                              </button>
                              {userRole !== "staff_bawah" && (
                                <button
                                  type="button"
                                  className="pengiriman-icon-btn pengiriman-icon-btn--success"
                                  onClick={() => handlePetugasAtas(pengiriman)}
                                  title="Verifikasi"
                                >
                                  <FiShield />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="pengiriman-pagination">
              <button
                type="button"
                className="pengiriman-pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                <FiArrowLeft />
                Prev
              </button>

              <span className="pengiriman-pagination-info">
                Halaman {currentPage} dari {lastPage}
              </span>

              <button
                type="button"
                className="pengiriman-pagination-btn"
                disabled={currentPage === lastPage}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
                <FiArrowRight />
              </button>
            </div>
          </div>
        </section>
      </div>

      {showPopup && selectedPengiriman && (
        <div className="pengiriman-modal-overlay" onClick={closePopup}>
          <div
            className="pengiriman-modal pengiriman-modal--detail"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pengiriman-modal-header">
              <div>
                <span className="pengiriman-section-label pengiriman-section-label--light">
                  <FiTruck />
                  Detail Pengiriman
                </span>
                <h2>SPK-{selectedPengiriman.id_spk}</h2>
                <p>Lihat rincian barang, claim, dan transfer untuk satu pengiriman.</p>
              </div>
              <button
                type="button"
                className="pengiriman-modal-close"
                onClick={closePopup}
              >
                <FiX />
              </button>
            </div>

            <div className="pengiriman-modal-body">
              <div className="pengiriman-detail-topline">
                <div className="pengiriman-detail-metric">
                  <span>Status verifikasi</span>
                  <strong className={`pengiriman-status ${selectedStatus.tone}`}>
                    {selectedStatus.icon}
                    {selectedStatus.label}
                  </strong>
                </div>
                <div className="pengiriman-detail-metric">
                  <span>Total transfer</span>
                  <strong>
                    {selectedPengiriman.status_verifikasi === "valid"
                      ? formatRupiah(getTotalTransfer(selectedPengiriman))
                      : "Belum diverifikasi"}
                  </strong>
                </div>
              </div>

              <div className="pengiriman-detail-grid">
                <div className="pengiriman-detail-item">
                  <span>ID Pengiriman</span>
                  <strong>#{selectedPengiriman.id_pengiriman}</strong>
                </div>
                <div className="pengiriman-detail-item">
                  <span>Tanggal Pengiriman</span>
                  <strong>{formatTanggal(selectedPengiriman.tanggal_pengiriman)}</strong>
                </div>
                <div className="pengiriman-detail-item">
                  <span>Total Barang</span>
                  <strong>{selectedPengiriman.total_barang_dikirim || 0} pcs</strong>
                </div>
                <div className="pengiriman-detail-item">
                  <span>Sisa Barang</span>
                  <strong>{selectedPengiriman.sisa_barang || 0} pcs</strong>
                </div>
                <div className="pengiriman-detail-item">
                  <span>Total Bayar</span>
                  <strong>
                    {selectedPengiriman.status_verifikasi === "valid"
                      ? formatRupiah(selectedPengiriman.total_bayar || 0)
                      : "Belum diverifikasi"}
                  </strong>
                </div>
                <div className="pengiriman-detail-item">
                  <span>Status Claim</span>
                  <strong
                    className={
                      selectedPengiriman.status_claim === "sudah_dibayar"
                        ? "pengiriman-text-success"
                        : "pengiriman-text-warning"
                    }
                  >
                    {selectedPengiriman.status_claim === "sudah_dibayar"
                      ? "Sudah Dibayar"
                      : "Belum Dibayar"}
                  </strong>
                </div>
              </div>

              <div className="pengiriman-finance-card">
                <div className="pengiriman-finance-row">
                  <span>Claim</span>
                  <strong>
                    {selectedPengiriman.status_verifikasi === "valid"
                      ? formatRupiah(selectedPengiriman.claim || 0)
                      : "Belum diverifikasi"}
                  </strong>
                </div>
                <div className="pengiriman-finance-row">
                  <span>Refund Claim</span>
                  <strong>
                    {selectedPengiriman.status_verifikasi === "valid"
                      ? formatRupiah(selectedPengiriman.refund_claim || 0)
                      : "Belum diverifikasi"}
                  </strong>
                </div>
              </div>

              {selectedPengiriman.warna?.length > 0 && (
                <div className="pengiriman-warna-section">
                  <div>
                    <h3>Distribusi Warna</h3>
                    <p>Ringkasan barang dikirim dan sisa per warna.</p>
                  </div>

                  <div className="pengiriman-warna-grid">
                    {selectedPengiriman.warna.map((warnaDetail) => (
                      <div
                        key={warnaDetail.id_pengiriman_warna}
                        className="pengiriman-warna-card"
                      >
                        <strong>{warnaDetail.warna}</strong>
                        <span>Dikirim: {warnaDetail.jumlah_dikirim} pcs</span>
                        <span>
                          Sisa: {warnaDetail.sisa_barang_per_warna || 0} pcs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="pengiriman-modal-overlay" onClick={closeFormModal}>
          <div
            className="pengiriman-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pengiriman-modal-header">
              <div>
                <span className="pengiriman-section-label pengiriman-section-label--light">
                  <FiPlus />
                  Input Pengiriman
                </span>
                <h2>Tambah Data Pengiriman</h2>
                <p>Simpan data pengiriman baru beserta nota dan tanggal kirim.</p>
              </div>
              <button
                type="button"
                className="pengiriman-modal-close"
                onClick={closeFormModal}
              >
                <FiX />
              </button>
            </div>

            <div className="pengiriman-modal-body">
              <form onSubmit={handleFormSubmit} className="pengiriman-form">
                <div className="pengiriman-form-grid">
                  <div className="pengiriman-form-group pengiriman-form-group--full">
                    <label className="pengiriman-form-label">SPK CMT</label>
                    <Select
                      classNamePrefix="pengiriman-select"
                      options={spkCmtOptions}
                      value={
                        spkCmtOptions.find(
                          (option) => option.value === newPengiriman.id_spk
                        ) || null
                      }
                      onChange={(selected) => {
                        const idSpk = selected ? selected.value : "";

                        setNewPengiriman((prev) => ({
                          ...prev,
                          id_spk: idSpk,
                        }));

                        if (idSpk) {
                          fetchSpkDeadline(idSpk);
                        } else {
                          setSelectedSpkDeadline(null);
                          setDeadlineError("");
                        }
                      }}
                      placeholder="Pilih atau cari SPK CMT..."
                      isSearchable
                      isClearable
                      noOptionsMessage={({ inputValue }) =>
                        inputValue
                          ? `Tidak ditemukan untuk "${inputValue}"`
                          : "Tidak ada SPK CMT dengan status sudah diambil"
                      }
                      required
                    />
                  </div>

                  <div className="pengiriman-form-group">
                    <label className="pengiriman-form-label">
                      Tanggal Kirim
                    </label>
                    <input
                      type="date"
                      name="tanggal_pengiriman"
                      className={`pengiriman-form-input ${
                        deadlineError || tanggalMasaLaluError ? "has-error" : ""
                      }`}
                      value={newPengiriman.tanggal_pengiriman}
                      onChange={handleInputChange}
                      min={getTodayDate()}
                      max={selectedSpkDeadline || undefined}
                      required
                    />
                    {selectedSpkDeadline && (
                      <small className="pengiriman-form-help">
                        Deadline SPK: {formatTanggal(selectedSpkDeadline)}
                      </small>
                    )}
                    {tanggalMasaLaluError && (
                      <div className="pengiriman-form-error">
                        {tanggalMasaLaluError}
                      </div>
                    )}
                    {deadlineError && (
                      <div className="pengiriman-form-error">
                        {deadlineError}
                      </div>
                    )}
                  </div>

                  <div className="pengiriman-form-group">
                    <label className="pengiriman-form-label">Total Barang</label>
                    <input
                      type="number"
                      name="total_barang_dikirim"
                      className="pengiriman-form-input"
                      value={newPengiriman.total_barang_dikirim}
                      onChange={handleInputChange}
                      placeholder="Masukkan jumlah barang"
                      required
                    />
                  </div>

                  <div className="pengiriman-form-group pengiriman-form-group--full">
                    <label className="pengiriman-form-label">
                      Upload Nota (JPG, PNG, PDF)
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      className="pengiriman-form-input pengiriman-form-input--file"
                      onChange={(event) =>
                        setNewPengiriman((prev) => ({
                          ...prev,
                          foto_nota: event.target.files?.[0] || null,
                        }))
                      }
                      required
                    />
                    <small className="pengiriman-form-help">
                      {newPengiriman.foto_nota
                        ? `File terpilih: ${newPengiriman.foto_nota.name}`
                        : "Lampirkan nota sebagai bukti pengiriman."}
                    </small>
                  </div>
                </div>

                <div className="pengiriman-form-actions">
                  <button
                    type="button"
                    className="pengiriman-secondary-btn"
                    onClick={closeFormModal}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="pengiriman-primary-btn"
                    disabled={Boolean(deadlineError || tanggalMasaLaluError)}
                  >
                    Simpan Pengiriman
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showPetugasAtasPopup && selectedPengiriman && (
        <div
          className="pengiriman-modal-overlay"
          onClick={closePetugasAtasPopup}
        >
          <div
            className="pengiriman-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pengiriman-modal-header">
              <div>
                <span className="pengiriman-section-label pengiriman-section-label--light">
                  <FiShield />
                  Verifikasi Pengiriman
                </span>
                <h2>ID Pengiriman #{selectedPengiriman.id_pengiriman}</h2>
                <p>Masukkan jumlah dikirim per warna untuk proses validasi.</p>
              </div>
              <button
                type="button"
                className="pengiriman-modal-close"
                onClick={closePetugasAtasPopup}
              >
                <FiX />
              </button>
            </div>

            <div className="pengiriman-modal-body">
              <div className="pengiriman-verification-banner">
                <div>
                  <span>SPK</span>
                  <strong>SPK-{selectedPengiriman.id_spk}</strong>
                </div>
                <div>
                  <span>Produk</span>
                  <strong>{selectedPengiriman.nama_produk || "-"}</strong>
                </div>
                <div>
                  <span>Total Kirim</span>
                  <strong>{selectedPengiriman.total_barang_dikirim || 0} pcs</strong>
                </div>
              </div>

              <form
                onSubmit={handlePetugasAtasSubmit}
                className="pengiriman-form"
              >
                {warnaData.length > 0 ? (
                  <div className="pengiriman-form-grid">
                    {warnaData.map((item, index) => (
                      <div className="pengiriman-form-group" key={item.nama_warna}>
                        <label className="pengiriman-form-label">
                          {item.nama_warna}
                        </label>
                        <small className="pengiriman-form-help">
                          Kuantitas SPK: {item.qty_spk} pcs
                        </small>
                        <input
                          type="number"
                          className="pengiriman-form-input"
                          value={item.jumlah_dikirim === 0 ? "" : item.jumlah_dikirim}
                          onChange={(event) =>
                            handleQtyChange(
                              index,
                              event.target.value === ""
                                ? ""
                                : Number(event.target.value)
                            )
                          }
                          min="0"
                          required
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pengiriman-empty-box">
                    Tidak ada data warna untuk SPK ini.
                  </div>
                )}

                <div className="pengiriman-form-actions">
                  <button
                    type="button"
                    className="pengiriman-secondary-btn"
                    onClick={closePetugasAtasPopup}
                  >
                    Batal
                  </button>
                  <button type="submit" className="pengiriman-primary-btn">
                    Simpan Verifikasi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pengiriman;

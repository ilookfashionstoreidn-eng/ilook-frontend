import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import "./Penjahit.css";
import "./SpkCmt.css";
import "./KodeSeriBelumDikerjakanOptimized.css";
import { FiSearch } from "react-icons/fi";
import axios from "axios";
import Pusher from "pusher-js";
import { toast } from "react-toastify";
import API from "../../api";
import { FaMicrophone, FaArrowUp, FaArrowDown, FaStop, FaImage, FaPlus, FaSave, FaTimes, FaPaperPlane, FaBell, FaHistory, FaEdit, FaClock, FaInfoCircle, FaBarcode, FaExclamationTriangle, FaCalendarAlt, FaBoxes, FaUser, FaDollarSign, FaPalette, FaClipboardList, FaFileAlt, FaTshirt, FaTag, FaFileExcel, FaUpload, FaEllipsisV, FaTrash } from "react-icons/fa";
import Select from "react-select";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";

const SWEETALERT_CDN = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js";

// Konversi Excel serial date number ke Date object
const excelSerialToDate = (serial) => {
  // Excel serial date: 1 = 1 Jan 1900, tapi ada bug leap year 1900 di Excel
  // Formula: (serial - 25569) * 86400 * 1000 (mulai dari 1 Jan 1970)
  const utcMs = (serial - 25569) * 86400 * 1000;
  return new Date(utcMs);
};

// Format tanggal untuk preview (termasuk handle Excel Date object dan serial number)
const formatDatePreview = (val) => {
  if (!val && val !== 0) return "-";
  // Handle Excel serial number (number)
  if (typeof val === "number") {
    const d = excelSerialToDate(val);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${day}/${m}/${y}`;
  }
  if (val instanceof Date) {
    return val.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  // Try parsing string date
  return val.toString();
};

// Konversi nilai tanggal dari xlsx ke format YYYY-MM-DD string untuk dikirim ke backend
const normalizeExcelDate = (val) => {
  if (!val && val !== 0) return "";
  if (typeof val === "number") {
    const d = excelSerialToDate(val);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const day = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  // Already a string
  return val.toString();
};


// Fungsi untuk format rupiah (input formatting dengan titik)
const formatRupiah = (value) => {
  if (value === null || value === undefined || value === "") return "";
  let stringValue = value.toString().replace(/\.00$/, "");
  const numeric = stringValue.replace(/\D/g, "");
  if (!numeric) return "";
  return Number(numeric).toLocaleString("id-ID");
};

// Fungsi untuk parse dari format rupiah ke angka (untuk disimpan)
const parseRupiah = (value) => {
  if (value === null || value === undefined || value === "") return "";
  let stringValue = value.toString().replace(/\.00$/, "");
  const cleaned = stringValue.replace(/\D/g, "");
  return cleaned;
};

// Fungsi untuk format rupiah untuk display (dengan "Rp" prefix)
const formatRupiahDisplay = (value) => {
  if (value === null || value === undefined || value === "") return "Rp 0";
  let stringValue = value.toString().replace(/\.00$/, "");
  const cleaned = stringValue.replace(/\D/g, "");
  const numValue = parseFloat(cleaned) || 0;
  return `Rp ${Number(numValue).toLocaleString("id-ID")}`;
};

const formatNumber = (value) => new Intl.NumberFormat("id-ID").format(Number(value) || 0);

const getDeadlineTone = (sisaHari) => {
  if (sisaHari === null || sisaHari === undefined || sisaHari === "") return "tone-none";
  const num = Number(sisaHari);
  if (isNaN(num)) return "tone-none";
  if (num < 0) return "tone-overdue";
  if (num <= 3) return "tone-warning";
  return "tone-safe";
};

const SpkCmt = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const importInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [showImportPreviewModal, setShowImportPreviewModal] = useState(false);
  const [importPreviewErrors, setImportPreviewErrors] = useState(0);

  const [spkCmtData, setSpkCmtData] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpk, setSelectedSpk] = useState(null);
  const [selectedSpkId, setSelectedSpkId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pengirimanDetails, setPengirimanDetails] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [penjahitList, setPenjahitList] = useState([]);
  const [message, setMessage] = useState("");
  const [dropdownSpk, setDropdownSpk] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showChatPopup, setShowChatPopup] = useState(false);
  const [showInviteStaffModal, setShowInviteStaffModal] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [vnFile, setVnFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState({ url: "", type: "" });
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioURL, setAudioURL] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [modalType, setModalType] = useState("");

  useEffect(() => {
    const handleOutsideClick = () => {
      setDropdownSpk(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [readers, setReaders] = useState({});
  // Baca dari URL atau default kosong
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "");
  const [selectedPenjahit, setSelectedPenjahit] = useState("");
  const [produkList, setProdukList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  // Filter baru untuk deadline status dan kirim minggu ini
  const [deadlineStatusFilter, setDeadlineStatusFilter] = useState(searchParams.get("deadline_status") || "");
  const [kirimMingguIniFilter, setKirimMingguIniFilter] = useState(searchParams.get("kirim_minggu_ini") || "");
  const [sortBy, setSortBy] = useState("created_at"); // Default sorting by created_at
  const [sortOrder, setSortOrder] = useState("desc"); // Default descending
  const [selectedProduk, setSelectedProduk] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("");
  const [allData, setAllData] = useState(false);
  const [selectedSisaHari, setSelectedSisaHari] = useState("");
  const [distribusiList, setDistribusiList] = useState([]);
  const [spkJasaList, setSpkJasaList] = useState([]);
  const [aksesorisList, setAksesorisList] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [showLogDeadline, setShowLogDeadline] = useState(false);
  const [logDeadline, setLogDeadline] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [selectedLogSpkId, setSelectedLogSpkId] = useState(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingDays, setPendingDays] = useState("");
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingSpkId, setPendingSpkId] = useState(null);
  const [pendingNote, setPendingNote] = useState("");
  const [pendingUntil, setPendingUntil] = useState("");
  const [distribusiOptions, setDistribusiOptions] = useState([]);
  const [spkJasaOptions, setSpkJasaOptions] = useState([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [searchSourceInput, setSearchSourceInput] = useState("");
  const [statusCount, setStatusCount] = useState({
    belum_diambil: 0,
    sudah_diambil: 0,
    pending: 0,
    completed: 0,
  });
  const [newSpk, setNewSpk] = useState({
    source_type: "cutting",
    source_id: "",

    deadline: "",
    tanggal_ambil: "",
    id_penjahit: "",
    keterangan: "",
    catatan: "",

    markeran: "",
    aksesoris: [],
    handtag: "",
    merek: "",

    // 🔴 BARU
    harga_barang_dasar: "",
    jenis_harga_barang: "per_pcs",

    // 🔴 JASA
    harga_per_jasa: "",
    jenis_harga_jasa: "per_barang",
  });

  const ensureSweetAlert = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (window.Swal) {
          resolve(window.Swal);
          return;
        }

        const existingScript = document.querySelector('script[data-sweetalert2="cdn"]');
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(window.Swal), { once: true });
          existingScript.addEventListener("error", reject, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = SWEETALERT_CDN;
        script.async = true;
        script.setAttribute("data-sweetalert2", "cdn");
        script.onload = () => resolve(window.Swal);
        script.onerror = reject;
        document.body.appendChild(script);
      }),
    []
  );

  const formatAlertMessage = useCallback((message, fallback = "Terjadi kesalahan") => {
    if (!message) {
      return fallback;
    }

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join("\n");
    }

    if (typeof message === "object") {
      return Object.values(message)
        .flat()
        .filter(Boolean)
        .join("\n");
    }

    return fallback;
  }, []);

  const showStatusAlert = useCallback(
    async ({ icon = "info", title = "Informasi", text = "", toast = false, timer = 2200 }) => {
      try {
        const Swal = await ensureSweetAlert();
        if (!Swal) {
          throw new Error("SweetAlert2 tidak tersedia");
        }

        await Swal.fire({
          icon,
          title,
          text,
          toast,
          position: toast ? "top-end" : "center",
          timer: toast ? timer : undefined,
          timerProgressBar: toast,
          showConfirmButton: !toast,
          confirmButtonText: "OK",
          buttonsStyling: false,
          customClass: {
            popup: "spkcmt-swal-popup",
            confirmButton: "spkcmt-swal-btn spkcmt-swal-btn-primary",
          },
        });

        return true;
      } catch (alertError) {
        console.error("Gagal menampilkan SweetAlert:", alertError);
        window.alert(text || title || "Terjadi kesalahan");
        return false;
      }
    },
    [ensureSweetAlert]
  );

  const refreshStatusCount = useCallback(async () => {
    try {
      const params = {};
      if (selectedPenjahit) {
        params.id_penjahit = selectedPenjahit;
      }

      const response = await API.get("/spk-cmt/status-count", { params });
      setStatusCount(response.data);
    } catch (error) {
      console.error("Error fetching status count:", error);
    }
  }, [selectedPenjahit]);

  const updateSpkInTable = useCallback((updatedSpk) => {
    if (!updatedSpk?.id_spk) {
      return;
    }

    setSpkCmtData((prev) => prev.map((spk) => (spk.id_spk === updatedSpk.id_spk ? { ...spk, ...updatedSpk } : spk)));
  }, []);

  const prependSpkToTable = useCallback(
    (createdSpk) => {
      if (!createdSpk?.id_spk) {
        return;
      }

      setSpkCmtData((prev) => {
        const deduped = prev.filter((spk) => spk.id_spk !== createdSpk.id_spk);

        if (currentPage !== 1) {
          return deduped;
        }

        const nextRows = [createdSpk, ...deduped];
        return itemsPerPage > 0 ? nextRows.slice(0, itemsPerPage) : nextRows;
      });

      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    },
    [currentPage, itemsPerPage]
  );

  useEffect(() => {
    if (!showForm) {
      setDistribusiOptions([]);
      setSpkJasaOptions([]);
      setPreviewData(null);
      return;
    }

    if (selectedSpk) {
      // In edit mode, we don't need available sources options
      setDistribusiOptions([]);
      setSpkJasaOptions([]);
      return;
    }

    if (!newSpk.source_type) {
      setDistribusiOptions([]);
      setSpkJasaOptions([]);
      setPreviewData(null);
      return;
    }

    const getAvailableSources = async () => {
      try {
        setLoadingSource(true);

        const response = await API.get(`/spk-cmt/available-sources?source_type=${newSpk.source_type}`);

        if (newSpk.source_type === "cutting") {
          setDistribusiOptions(response.data);
        } else {
          setSpkJasaOptions(response.data);
        }
      } catch (error) {
        setDistribusiOptions([]);
        setSpkJasaOptions([]);
      } finally {
        setLoadingSource(false);
      }
    };

    getAvailableSources();
  }, [newSpk.source_type, showForm, selectedSpk]);

  const fetchPreview = useCallback(async () => {
    if (!newSpk.source_id || !newSpk.source_type) {
      setPreviewData(null);
      return;
    }

    try {
      let response;

      if (newSpk.source_type === "cutting") {
        response = await API.get(`/spk-cutting-distribusi/${newSpk.source_id}`);
      } else {
        // Untuk jasa, gunakan endpoint /spk-jasa/{id}
        response = await API.get(`/spk-jasa/${newSpk.source_id}`);
      }

      console.log("Preview response:", response.data); // Debug log
      const fetchedData = response.data?.data ?? response.data;
      setPreviewData(fetchedData);

      if (fetchedData) {
        const updates = {};
        if (fetchedData.deadline) {
          updates.deadline = fetchedData.deadline;
        }
        if (fetchedData.price_cmt) {
          updates.harga_per_jasa = formatRupiah(String(Math.round(Number(fetchedData.price_cmt))));
        }
        if (fetchedData.notes_spk !== undefined) {
          updates.keterangan = fetchedData.notes_spk || "";
        }
        if (Object.keys(updates).length > 0) {
          setNewSpk(prev => ({ ...prev, ...updates }));
        }
      }
    } catch (error) {
      console.error("Error fetching preview:", error);
      console.error("Error response:", error.response?.data); // Debug log
      setPreviewData(null);
      if (error.response?.status === 404) {
        await showStatusAlert({
          icon: "warning",
          title: "Data Tidak Ditemukan",
          text: "Data SPK Jasa tidak ditemukan.",
        });
      } else if (error.response?.data?.error) {
        await showStatusAlert({
          icon: "error",
          title: "Preview Gagal Dimuat",
          text: formatAlertMessage(error.response.data.error),
        });
      }
    }
  }, [formatAlertMessage, newSpk.source_id, newSpk.source_type, showStatusAlert]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const produkOptions = produkList.map((produk) => ({
    value: produk.id,
    label: produk.nama_produk,
  }));

  const sourceOptions = useMemo(() => {
    const rawOptions = newSpk.source_type === "cutting" ? distribusiOptions : spkJasaOptions;

    return rawOptions.map((option) => ({
      ...option,
      searchText: (option.search_text || `${option.label || ""} ${option.kode_seri || ""} ${option.nama_produk || ""} ${option.jumlah_produk || ""}`).toLowerCase(),
    }));
  }, [distribusiOptions, newSpk.source_type, spkJasaOptions]);

  const [newDeadline, setNewDeadline] = useState({
    deadline: "",
    keterangan: "",
  });
  const [newStatus, setNewStatus] = useState({
    status: "",
    keterangan: "",
  });
  const userId = localStorage.getItem("userId");

  const userRole = localStorage.getItem("role");

  console.log("User Role dari localStorage:", userRole);

  const chatContainerRef = useRef(null);

  const pusherRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      let chunks = []; // Menyimpan data audio

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data); // Simpan data audio ke array
        }
      };

      recorder.onstop = () => {
        if (chunks.length === 0) {
          console.error("Tidak ada data yang direkam.");
          return;
        }

        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voice_note.webm", { type: "audio/webm" });

        setVnFile(audioFile);
        setAudioURL(URL.createObjectURL(audioBlob)); // Buat URL untuk diputar
        setIsRecording(false);

        // Hentikan akses mikrofon
        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start(); // Mulai rekaman
      setIsRecording(true);
    } catch (error) {
      console.error("Error saat merekam:", error);
    }
  };
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop(); // Hentikan rekaman
      setMediaRecorder(null); // Reset media recorder
    }
  };

  const deleteVN = () => {
    setAudioURL(null);
    setVnFile(null);
  };

  // Fungsi untuk membuka modal
  const openMediaPreview = (url, type) => {
    setMediaPreview({ url, type });
  };

  // Fungsi untuk menutup modal
  const closeMediaPreview = () => {
    setMediaPreview({ url: "", type: "" });
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]); // Akan berjalan setiap kali messages berubah

  // Update filter dari URL saat component mount atau URL berubah
  useEffect(() => {
    const statusFromUrl = searchParams.get("status");
    const deadlineStatusFromUrl = searchParams.get("deadline_status");
    const kirimMingguIniFromUrl = searchParams.get("kirim_minggu_ini");

    if (statusFromUrl) {
      setSelectedStatus(statusFromUrl);
    }
    if (deadlineStatusFromUrl) {
      setDeadlineStatusFilter(deadlineStatusFromUrl);
    }
    if (kirimMingguIniFromUrl) {
      setKirimMingguIniFilter(kirimMingguIniFromUrl);
    }

    // Reset currentPage ke 1 ketika filter berubah
    setCurrentPage(1);
  }, [searchParams]);

  useEffect(() => {
    console.log("Fetching SPK with sortOrder:", sortOrder);
    const fetchSpkCmtData = async () => {
      try {
        setLoading(true);

        // Baca langsung dari URL untuk menghindari race condition
        const urlParams = new URLSearchParams(location.search);
        const statusFromUrl = urlParams.get("status") || selectedStatus;
        const deadlineStatusFromUrl = urlParams.get("deadline_status") || deadlineStatusFilter;
        const kirimMingguIniFromUrl = urlParams.get("kirim_minggu_ini") || kirimMingguIniFilter;

        // ✅ Debugging log sebelum request API
        console.log("Current Filters:");
        console.log("status:", statusFromUrl);
        console.log("deadline_status:", deadlineStatusFromUrl);
        console.log("kirim_minggu_ini:", kirimMingguIniFromUrl);
        console.log("page:", currentPage);
        console.log("id_penjahit:", selectedPenjahit);
        console.log("sortBy:", sortBy);
        console.log("sortOrder:", sortOrder);
        console.log("selectedProduk (before convert):", selectedProduk);
        console.log("selectedProduk (converted):", selectedProduk ? Number(selectedProduk) : undefined);

        const params = {
          status: statusFromUrl || undefined,
          page: currentPage,
          per_page: 50,
          id_penjahit: selectedPenjahit || undefined,
          sortBy: sortBy,
          sortOrder: sortOrder,
          id_produk: selectedProduk || undefined,
          kategori_produk: selectedKategori || undefined,
          sisa_hari: selectedSisaHari || undefined,
        };

        // Tambahkan filter baru jika ada
        if (deadlineStatusFromUrl) {
          params.deadline_status = deadlineStatusFromUrl;
        }
        if (kirimMingguIniFromUrl) {
          params.kirim_minggu_ini = kirimMingguIniFromUrl;
        }

        const response = await API.get(`/spkcmt`, { params });

        console.log("Data SPK:", response.data); // Debugging
        console.log("SPK Data:", response.data.spk?.data); // Debugging

        // Pastikan data ada sebelum set state
        if (response.data.spk?.data) {
          setSpkCmtData(response.data.spk.data);
          setLastPage(response.data.spk.last_page || 1);
          setItemsPerPage(response.data.spk.per_page || response.data.spk.data.length || 10);
        } else {
          // Jika menggunakan get() bukan paginate()
          setSpkCmtData(response.data.spk || []);
          setLastPage(1);
          setItemsPerPage(response.data.spk?.length || response.data.spk?.data?.length || 10);
        }
      } catch (error) {
        setError(error.response?.data?.message || "Failed to fetch data");
        console.error("Error fetching SPK:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpkCmtData();
  }, [currentPage, selectedStatus, selectedPenjahit, sortBy, sortOrder, selectedProduk, selectedKategori, selectedSisaHari, deadlineStatusFilter, kirimMingguIniFilter, location.search]);

  // Fetch status count
  useEffect(() => {
    refreshStatusCount();
  }, [refreshStatusCount]);

  useEffect(() => {
    const fetchProduks = async () => {
      try {
        setLoading(true);
        const response = await API.get("/produk");
        setProdukList(response.data.data);

        // Ekstrak kategori unik dari produkList
        const uniqueKategori = [...new Set(response.data.data.map((produk) => produk.kategori_produk))];
        setKategoriList(uniqueKategori);
      } catch (error) {
        setError("Gagal mengambil data produk.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduks();
  }, []);

  useEffect(() => {
    const fetchAksesoris = async () => {
      try {
        const response = await API.get("/aksesoris?all=1");
        setAksesorisList(response.data || []);
      } catch (error) {
        console.error("Gagal mengambil data aksesoris:", error);
      }
    };

    fetchAksesoris();
  }, []);


  // Ambil chat saat komponen pertama kali dirender
  useEffect(() => {
    if (selectedSpkId && !showModal) {
      // Cek apakah modal pengiriman sedang terbuka
      setMessages([]);

      // Hanya buka popup kalau sebelumnya belum terbuka
      setShowChatPopup((prev) => prev || true);

      // Fetch chat messages untuk SPK yang dipilih
      API.get(`/spk-chats/${selectedSpkId}`)
        .then((response) => {
          setMessages(response.data); // Data dari backend sudah termasuk yang ditandai sebagai dibaca
        })
        .catch((error) => {
          console.error("Error fetching messages:", error);
          if (error.response && error.response.status === 403) {
            setMessages([]); // Clear chat kalau error akses
          }
        });
    }
  }, [selectedSpkId]);

  useEffect(() => {
    if (selectedSpkId && messages.length > 0) {
      API.post(`/spk-chats/${selectedSpkId}/mark-as-read`, {})
        .then(() => console.log("Marked all messages as read in SPK:", selectedSpkId))
        .catch((err) => console.error("Error marking as read:", err));
    }
  }, [messages]); // ✅ Jalan setiap ada pesan baru

  //useEffect(() => {
  useEffect(() => {
    if (selectedSpkId) {
      API.get(`/spk-chats/${selectedSpkId}/readers`)
        .then((response) => {
          setReaders(response.data); // Simpan semua readers sekaligus
        })
        .catch((error) => console.error("Error fetching chat readers:", error));
    }
  }, [selectedSpkId]);

  const fetchNotifications = async () => {
    try {
      const response = await API.get("/notifications");

      console.log("Fetched notifications:", response.data);

      // Pisahkan notifikasi yang belum dibaca
      const allNotifications = response.data;
      const unreadNotifications = allNotifications.filter((notif) => !notif.is_read);

      setNotifications(allNotifications);
      setUnreadNotifications(unreadNotifications);
      setUnreadCount(unreadNotifications.length);

      // Simpan ke localStorage agar tetap ada meski halaman di-refresh
      localStorage.setItem("notifications", JSON.stringify(allNotifications));
      localStorage.setItem("unreadNotifications", JSON.stringify(unreadNotifications));
    } catch (error) {
      console.error("Gagal mengambil notifikasi:", error);
    }
  };
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await API.get("/notifications/unread");

        console.log("Fetched Notifications from API:", response.data.notifications); // Debugging
        const fetchedNotifications = response.data.notifications.map((notif) => ({
          id: notif.id,
          user_id: notif.user_id ?? "N/A", // Tambahkan user_id
          spk_id: notif.spk_id ?? "N/A", // Tambahkan spk_id
          text: notif.message?.trim() ? notif.message : "📩 Pesan baru diterima",
          time: new Date(notif.created_at).toLocaleTimeString(),
        }));

        // Ambil notifikasi lama dari localStorage
        const storedNotifications = JSON.parse(localStorage.getItem("notifications")) || [];

        // Gabungkan notifikasi lama dan baru, hindari duplikasi berdasarkan `id`
        const mergedNotifications = [...fetchedNotifications, ...storedNotifications].reduce((acc, curr) => {
          if (!acc.find((item) => item.id === curr.id)) {
            acc.push(curr);
          }
          return acc;
        }, []);

        console.log("Merged Notifications:", mergedNotifications); // Debugging

        // Update state dan localStorage
        setNotifications(mergedNotifications);
        setUnreadNotifications(fetchedNotifications);
        setUnreadCount(fetchedNotifications.length);

        localStorage.setItem("notifications", JSON.stringify(mergedNotifications));
        localStorage.setItem("unreadNotifications", JSON.stringify(fetchedNotifications));
      } catch (error) {
        console.error("Error fetching unread notifications:", error);
      }
    };

    fetchNotifications();

    // Ambil notifikasi dari localStorage jika ada
    const storedNotifications = JSON.parse(localStorage.getItem("notifications")) || [];
    console.log("Stored Notifications from LocalStorage:", storedNotifications); // Debugging
    setNotifications(storedNotifications);

    const storedUnread = JSON.parse(localStorage.getItem("unreadNotifications")) || [];
    console.log("Stored Unread Notifications:", storedUnread); // Debugging
    setUnreadNotifications(storedUnread);
    setUnreadCount(storedUnread.length);
  }, []);

  ///////

  const handleCloseChat = () => {
    setShowChatPopup(false); // Tutup pop-up chat
    setSelectedSpkId(null); // Reset SPK yang dipilih

    // 🔥 Reload daftar SPK agar status chat diperbarui
    window.location.reload();
  };

  //////////

  useEffect(() => {
    if (!pusherRef.current) {
      pusherRef.current = new Pusher("b646c54d20b146c476dc", {
        cluster: "ap1",
        encrypted: true,
      });
      console.log("Pusher initialized di SpkCmt!");
    }

    const globalNotifChannel = pusherRef.current.subscribe("spk-global-chat-notification");

    globalNotifChannel.bind("chat.notification", (data) => {
      console.log("Global notification received:", data);

      const allowedUsers = data.allowed_users || [];

      // Cek apakah user saat ini diizinkan menerima notifikasi/chat ini
      if (!allowedUsers.includes(parseInt(userId))) {
        console.warn("User tidak diizinkan menerima notifikasi global ini.");
        return;
      }

      const newMessage = {
        id: data.chat.id,
        user_id: data.chat.user_id, // Tambahkan user_id
        spk_id: data.chat.id_spk, // Tambahkan spk_id
        text: data.chat.message,
        time: new Date().toLocaleTimeString(),
      };

      // Jika user sedang di dalam room chat, tambahkan ke chat langsung
      setMessages((prevMessages) => [...prevMessages, data.chat]);

      // Update semua notifikasi (untuk ikon bell)
      setNotifications((prevNotifications) => {
        const updatedNotifications = [...prevNotifications, newMessage];
        localStorage.setItem("notifications", JSON.stringify(updatedNotifications));
        return updatedNotifications;
      });

      // Update unread notifikasi dan count (untuk ikon bell)
      setUnreadNotifications((prevUnread) => {
        const exists = prevUnread.some((notif) => notif.id === newMessage.id);
        if (!exists) {
          const updatedUnread = [...prevUnread, newMessage];
          setUnreadCount(updatedUnread.length);
          localStorage.setItem("unreadNotifications", JSON.stringify(updatedUnread));
          return updatedUnread;
        }
        return prevUnread;
      });
    });

    return () => {
      globalNotifChannel.unbind("chat.notification");
      pusherRef.current.unsubscribe("spk-global-chat-notification");
      console.log("Global Pusher channel unsubscribed dari SpkCmt!");
    };
  }, []);

  const markNotificationsAsRead = async () => {
    try {
      await API.post("/notifications/mark-as-read", {});

      setUnreadCount(0);
      setUnreadNotifications([]);
      localStorage.setItem("unreadNotifications", JSON.stringify([]));
    } catch (error) {
      console.error("Error updating notifications:", error);
    }
  };

  /////////////////////////////////////////////////////////////////////
  const notifHandlerRef = useRef(null);

  // Fungsi untuk mengirim pesan
  const sendMessage = async () => {
    console.log("sendMessage function called"); // Debug log
    if (!message.trim() && !imageFile && !videoFile && !vnFile) return;

    const formData = new FormData();
    formData.append("id_spk", selectedSpkId);
    formData.append("message", message);
    if (imageFile) formData.append("image", imageFile);
    if (videoFile) formData.append("video", videoFile);
    if (vnFile) formData.append("vn", vnFile);

    try {
      // Pastikan koneksi Pusher sudah ada
      const socketId = pusherRef.current?.connection?.socket_id;
      console.log("Socket ID:", socketId);

      const response = await API.post("/send-message", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "X-Socket-ID": socketId,
        },
      });

      console.log("Response dari API:", response.data);
      setMessages((prevMessages) => [...prevMessages, response.data.data]);

      setMessage("");
      setImageFile(null);
      setVideoFile(null);
      setVnFile(null);
      setAudioURL(null);
    } catch (error) {
      console.error("Error sending message:", error.response ? error.response.data : error);
    }
  };

  const fetchStaffList = async () => {
    try {
      const response = await API.get(`/spk/${selectedSpkId}/staff-list`);
      setStaffList(response.data);
    } catch (error) {
      console.error("Gagal mengambil daftar staff:", error);
    }
  };

  useEffect(() => {
    if (showInviteStaffModal) {
      fetchStaffList();
    }
  }, [showInviteStaffModal]);

  // Fungsi untuk mengundang staff
  const inviteStaff = async () => {
    if (!selectedStaffId || !selectedSpkId) return;

    try {
      const response = await API.post(`/spk/${selectedSpkId}/invite-staff/${selectedStaffId}`, {});
      console.log(response.data);
      await showStatusAlert({
        icon: "success",
        title: "Undangan Terkirim",
        text: "Staff berhasil diundang ke chat SPK.",
        toast: true,
      });
      setShowInviteStaffModal(false); // Tutup modal setelah mengundang
    } catch (error) {
      console.error("Gagal mengundang staff:", error);
      await showStatusAlert({
        icon: "error",
        title: "Undangan Gagal",
        text: "Gagal mengundang staff ke chat.",
      });
    }
  };

  useEffect(() => {
    if (showInviteStaffModal) {
      fetchStaffList();
    }
  }, [showInviteStaffModal]);

  const handleChatClick = (spk) => {
    setSelectedSpkId(spk.id_spk);
  };

  //fungsi untuk input form
  const handleDeadlineChange = (e) => {
    const { name, value } = e.target;
    setNewDeadline((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  // Fungsi untuk input form status
  const handleStatusChange = (e) => {
    const { name, value } = e.target;
    setNewStatus((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogDeadlineClick = async (idSpk) => {
    setSelectedLogSpkId(idSpk);
    setShowLogDeadline(true);
    setLoadingLog(true);

    try {
      const res = await API.get(`/spk/${idSpk}/log-deadline`);
      setLogDeadline(res.data);
    } catch (error) {
      console.error("Gagal mengambil log deadline", error);
      await showStatusAlert({
        icon: "error",
        title: "Riwayat Deadline Gagal Dimuat",
        text: formatAlertMessage(error.response?.data?.message || "Gagal mengambil log deadline."),
      });
    } finally {
      setLoadingLog(false);
    }
  };

  //fungsi untuk kirim update dadline ke API
  const updateDeadline = async (spkId) => {
    const { deadline, keterangan } = newDeadline;

    try {
      const response = await API.put(`/spk/${spkId}/deadline`, { deadline, keterangan });

      // Update state lokal dengan data baru
      updateSpkInTable({
        ...selectedSpk,
        id_spk: spkId,
        deadline,
        keterangan,
      });

      // Tutup popup dan form setelah pembaruan selesai
      setShowPopup(false);
      setShowForm(false);
      setShowDeadlineForm(false);

      await showStatusAlert({
        icon: "success",
        title: "Deadline Diperbarui",
        text: response.data.message || "Deadline berhasil diperbarui.",
        toast: true,
      });
      refreshStatusCount();
    } catch (error) {
      await showStatusAlert({
        icon: "error",
        title: "Update Deadline Gagal",
        text: formatAlertMessage(error.response?.data?.message || error.message),
      });
    }
  };

  // Fungsi untuk kirim update status ke API
  const updateStatus = async (spkId) => {
    const { status, keterangan } = newStatus;

    try {
      const response = await API.put(`/spk/${spkId}/status`, { status, keterangan });

      // Update state lokal dengan status baru
      updateSpkInTable({
        ...selectedSpk,
        id_spk: spkId,
        status,
        keterangan,
      });

      await showStatusAlert({
        icon: "success",
        title: "Status Diperbarui",
        text: response.data.message || "Status SPK berhasil diperbarui.",
        toast: true,
      });
      setShowPopup(false); // Menutup popup setelah status berhasil diperbarui
      setShowForm(false); // Menyembunyikan form update setelah berhasil
      setShowStatusForm(false); // Menutup form update status
      refreshStatusCount();
    } catch (error) {
      await showStatusAlert({
        icon: "error",
        title: "Update Status Gagal",
        text: formatAlertMessage(error.response?.data?.message || error.message),
      });
    }
  };

  // Fungsi untuk update status langsung dari dropdown
  const handleStatusChangeDirect = async (spkId, newStatus) => {
    try {
      const response = await API.put(`/spk/${spkId}/status`, {
        status: newStatus,
      });

      // Update state lokal dengan status baru
      updateSpkInTable({
        id_spk: spkId,
        status: newStatus,
      });

      // Refresh status count
      await refreshStatusCount();

      console.log("Status berhasil diupdate:", response.data.message);
      await showStatusAlert({
        icon: "success",
        title: "Status Berhasil Diubah",
        text: response.data.message || "Status SPK berhasil diperbarui.",
        toast: true,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      await showStatusAlert({
        icon: "error",
        title: "Update Status Gagal",
        text: formatAlertMessage(error.response?.data?.message || error.message),
      });

      // Revert perubahan jika error - refetch data dengan memanggil fetchSpkCmtData dari useCallback
      const fetchData = async () => {
        try {
          const response = await API.get(`/spkcmt`, {
            params: {
              status: selectedStatus,
              page: currentPage,
              per_page: 50,
              id_penjahit: selectedPenjahit,
              sortBy: sortBy,
              sortOrder: sortOrder,
              id_produk: selectedProduk,
              kategori_produk: selectedKategori,
              sisa_hari: selectedSisaHari,
            },
          });
          if (response.data.spk?.data) {
            setSpkCmtData(response.data.spk.data);
            setLastPage(response.data.spk.last_page || 1);
            setItemsPerPage(response.data.spk.per_page || response.data.spk.data.length || 10);
          } else {
            setSpkCmtData(response.data.spk || []);
            setLastPage(1);
            setItemsPerPage(response.data.spk?.length || 10);
          }
        } catch (err) {
          console.error("Error refetching data:", err);
        }
      };
      fetchData();
    }
  };

  //nampilin form update deadline
  const handleUpdateDeadlineClick = (spk) => {
    setSelectedSpk(spk); // Menyimpan data SPK yang dipilih
    setShowDeadlineForm(true); // Tampilkan form update deadline
    setShowForm(false); // Pastikan form SPK tidak tampil
  };

  // Menampilkan form update status
  const handleUpdateStatusClick = (spk) => {
    setSelectedSpk(spk); // Menyimpan data SPK yang dipilih
    setShowStatusForm(true); // Menampilkan form update status
    setShowForm(false); // Pastikan form SPK tidak tampil
  };

  useEffect(() => {
    const fetchPenjahits = async () => {
      try {
        setLoading(true);

        const response = await API.get("/penjahit");
        setPenjahitList(response.data);
      } catch (error) {
        setError("Gagal mengambil data penjahit.");
      } finally {
        setLoading(false);
      }
    };

    fetchPenjahits();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Jika field harga, format sebagai rupiah
    if (name === "harga_barang_dasar" || name === "harga_per_jasa") {
      const formatted = formatRupiah(value);
      setNewSpk((prev) => ({
        ...prev,
        [name]: formatted,
      }));
    } else {
      setNewSpk((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleUpdateSubmit = async (e, id) => {
    e.preventDefault();
    console.log("Selected SPK sebelum submit:", selectedSpk);
    console.log("Selected SPK ID:", selectedSpk?.id_spk);

    if (!id) {
      await showStatusAlert({
        icon: "error",
        title: "Update Gagal",
        text: "ID SPK tidak ditemukan.",
      });
      return;
    }

    console.log("Mengupdate SPK dengan ID:", id);
    const formData = new FormData();

    // Tambahkan semua data kecuali 'warna', 'aksesoris', 'jenis_harga_jasa'
    Object.keys(newSpk).forEach((key) => {
      if (key !== "warna" && key !== "aksesoris" && key !== "jenis_harga_jasa") {
        formData.append(key, newSpk[key]);
      }
    });

    formData.append("aksesoris", JSON.stringify(newSpk.aksesoris || []));

    // Menambahkan warna ke FormData dengan format array
    newSpk.warna.forEach((warna, index) => {
      formData.append(`warna[${index}][id_warna]`, warna.id_warna || "");
      formData.append(`warna[${index}][nama_warna]`, warna.nama_warna);
      formData.append(`warna[${index}][qty]`, warna.qty);
    });

    formData.append("harga_jasa_awal", newSpk.harga_jasa_awal);
    formData.append("jenis_harga_jasa", newSpk.jenis_harga_jasa);

    console.log("Jenis harga jasa yang dikirim:", newSpk.jenis_harga_jasa);

    formData.append("_method", "PUT");

    for (let pair of formData.entries()) {
      console.log(pair[0] + ": " + pair[1]);
    }

    try {
      const token = localStorage.getItem("token");

      const response = await API.post(`/spkcmt/${id}`, formData, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response dari server:", response.data); // ✅ ini benar

      const updatedSpk = response.data;
      console.log("SPK berhasil diupdate:", updatedSpk);

      setShowForm(false);
      updateSpkInTable(updatedSpk.data);
      refreshStatusCount();

      await showStatusAlert({
        icon: "success",
        title: "Data Berhasil Diperbarui",
        text: "SPK berhasil diupdate.",
        toast: true,
      });
    } catch (error) {
      if (error.response) {
        console.error("Detail kesalahan:", error.response.data.errors);
        await showStatusAlert({
          icon: "error",
          title: "Validasi Gagal",
          text: formatAlertMessage(error.response.data.errors),
        });
      } else {
        console.error("Terjadi kesalahan:", error);
        await showStatusAlert({
          icon: "error",
          title: "Update Gagal",
          text: formatAlertMessage(error.message),
        });
      }
    }
  };

  const filteredSpk = spkCmtData.filter((spk) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return spk.nama_produk?.toLowerCase().includes(searchLower) || spk.nomor_seri?.toLowerCase().includes(searchLower) || spk.penjahit?.nama_penjahit?.toLowerCase().includes(searchLower);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("source_type", newSpk.source_type);
    formData.append("source_id", newSpk.source_id);

    formData.append("deadline", newSpk.deadline);
    formData.append("tanggal_ambil", newSpk.tanggal_ambil || "");
    formData.append("id_penjahit", newSpk.id_penjahit);
    formData.append("keterangan", newSpk.keterangan);
    formData.append("catatan", newSpk.catatan);

    formData.append("markeran", newSpk.markeran);
    formData.append("aksesoris", JSON.stringify(newSpk.aksesoris || []));
    formData.append("handtag", newSpk.handtag);
    formData.append("merek", newSpk.merek);

    // 🔴 HARGA BARANG DASAR = HARGA CMT
    formData.append("harga_barang_dasar", parseRupiah(newSpk.harga_per_jasa));
    formData.append("jenis_harga_barang", newSpk.jenis_harga_barang);

    // 🔴 JASA - Parse dari format rupiah
    formData.append("harga_per_jasa", parseRupiah(newSpk.harga_per_jasa));
    formData.append("jenis_harga_jasa", newSpk.jenis_harga_jasa);

    try {
      const isEdit = !!selectedSpk;
      const url = isEdit ? `/spkcmt/${selectedSpk.id_spk}` : "/spkcmt";
      
      if (isEdit) {
        formData.append("_method", "PUT");
      }

      const response = await API.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (isEdit) {
        window.location.reload();
      } else {
        prependSpkToTable(response.data.data);
      }
      refreshStatusCount();
      setShowForm(false);
      // Reset form
      setNewSpk({
        source_type: "cutting",
        source_id: "",
        deadline: "",
        tanggal_ambil: "",
        id_penjahit: "",
        keterangan: "",
        catatan: "",
        markeran: "",
        aksesoris: [],
        handtag: "",
        merek: "",
        harga_barang_dasar: "",
        jenis_harga_barang: "per_pcs",
        harga_per_jasa: "",
        jenis_harga_jasa: "per_barang",
      });
      setPreviewData(null);

      await showStatusAlert({
        icon: "success",
        title: "Data Berhasil Ditambahkan",
        text: "SPK CMT berhasil disimpan.",
        toast: true,
      });
    } catch (error) {
      await showStatusAlert({
        icon: "error",
        title: "Simpan Data Gagal",
        text: formatAlertMessage(error.response?.data?.message || error.message),
      });
    }
  };

  const downloadPdf = async (id) => {
    try {
      const response = await API.get(`/spk-cmt/${id}/download-pdf`, {
        responseType: "blob", // Pastikan menerima file sebagai blob
      });

      // Buat URL blob dari response data
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `spk_cmt_${id}.pdf`); // Sesuaikan nama file
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Hapus URL blob setelah selesai
      window.URL.revokeObjectURL(blobUrl);
      await showStatusAlert({
        icon: "success",
        title: "Download Dimulai",
        text: `File SPK #${id} sedang diunduh.`,
        toast: true,
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      await showStatusAlert({
        icon: "error",
        title: "Download Gagal",
        text: formatAlertMessage(error.response?.data?.error || "Gagal mengunduh SPK."),
      });
    }
  };


  const downloadBarcodePdf = async (id) => {
    try {
      const response = await API.get(`/spk-cmt/${id}/barcode-pdf`, {
        responseType: "blob", // Pastikan menerima file sebagai blob
      });

      // Buat URL blob dari response data
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `barcode_spk_cmt_${id}.pdf`); // Sesuaikan nama file
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Hapus URL blob setelah selesai
      window.URL.revokeObjectURL(blobUrl);
      await showStatusAlert({
        icon: "success",
        title: "Download Barcode Dimulai",
        text: `Barcode SPK #${id} sedang diunduh.`,
        toast: true,
      });
    } catch (error) {
      console.error("Error downloading barcode:", error);
      await showStatusAlert({
        icon: "error",
        title: "Download Barcode Gagal",
        text: formatAlertMessage(error.response?.data?.error || "Gagal mengunduh barcode SKU."),
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const urlParams = new URLSearchParams(location.search);
      const statusFromUrl = urlParams.get("status") || selectedStatus;
      const deadlineStatusFromUrl = urlParams.get("deadline_status") || deadlineStatusFilter;
      const kirimMingguIniFromUrl = urlParams.get("kirim_minggu_ini") || kirimMingguIniFilter;

      const params = {
        status: statusFromUrl || undefined,
        id_penjahit: selectedPenjahit || undefined,
        sortBy: sortBy,
        sortOrder: sortOrder,
        id_produk: selectedProduk || undefined,
        kategori_produk: selectedKategori || undefined,
        sisa_hari: selectedSisaHari || undefined,
      };

      if (deadlineStatusFromUrl) {
        params.deadline_status = deadlineStatusFromUrl;
      }
      if (kirimMingguIniFromUrl) {
        params.kirim_minggu_ini = kirimMingguIniFromUrl;
      }

      const startDate = urlParams.get("start_date");
      const endDate = urlParams.get("end_date");
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await API.get("/spkcmt/export/excel", {
        params,
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      const fileName = `spk-cmt-${new Date().toISOString().split("T")[0]}.xlsx`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      await showStatusAlert({
        icon: "success",
        title: "Export Berhasil",
        text: "Data SPK CMT berhasil diexport ke Excel.",
        toast: true,
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      await showStatusAlert({
        icon: "error",
        title: "Export Gagal",
        text: "Gagal mengeksport data ke Excel.",
      });
    }
  };

  const handleImportButtonClick = () => {
    importInputRef.current?.click();
  };

  const handleDownloadTemplate = async () => {
    try {
      const SwalObj = await ensureSweetAlert();
      SwalObj.fire({
        title: "Menyiapkan Template...",
        text: "Mohon tunggu sebentar.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => SwalObj.showLoading(),
      });

      const response = await API.get("/spkcmt/import/template", {
        responseType: "blob",
        timeout: 600000,
      });

      const fileName = "template_spk_cmt.xlsx";
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      SwalObj.close();
    } catch (err) {
      console.error("Gagal mendownload template:", err);
      const SwalObj = await ensureSweetAlert();
      SwalObj.close();
      await showStatusAlert({
        icon: "error",
        title: "Gagal",
        text: "Gagal mengunduh template Excel.",
      });
    }
  };

  const handleImportChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) {
          const SwalObj = await ensureSweetAlert();
          await SwalObj.fire({
            icon: "error",
            title: "File Kosong",
            text: "File Excel tidak memiliki data untuk diimport.",
          });
          return;
        }

        const headers = rows[0].map(h => (h || "").toString().trim().toLowerCase());
        const headerMap = {};
        headers.forEach((h, index) => {
          if (h !== "") {
            headerMap[h] = index;
          }
        });

        // Parse rows
        const parsedRows = [];
        let errCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          // Check if row is empty
          const hasContent = row.some(val => val !== null && val !== undefined && val.toString().trim() !== "");
          if (!hasContent) continue;

          const tglSpk = row[headerMap["tgl spk"]] || "";
          const penjahit = row[headerMap["nama penjahit"]] || "";
          const nomorSeri = row[headerMap["nomor seri"]] || "";
          const deadline = row[headerMap["deadline"]] || "";
          const tanggalAmbil = row[headerMap["tanggal ambil"]] || "";
          const hargaBarang = row[headerMap["harga barang"]] || 0;
          const jenisHargaBarang = row[headerMap["jenis harga barang"]] || "per_pcs";
          const hargaJasa = row[headerMap["harga jasa"]] || 0;
          const jenisHargaJasa = row[headerMap["jenis harga jasa"]] || "per_barang";
          const merek = row[headerMap["merek"]] || "";
          const keterangan = row[headerMap["keterangan"]] || "";
          const catatan = row[headerMap["catatan"]] || "";
          const qty = row[headerMap["qty"]] || row[headerMap["jumlah"]] || 0;
          const warna = row[headerMap["warna"]] || "";
          const sku = row[headerMap["sku"]] || "";

          // Validation
          let isValid = true;
          let validationMsg = "Ready";

          if (!penjahit) {
            isValid = false;
            errCount++;
            validationMsg = "Error: Nama Penjahit wajib diisi";
          } else if (!nomorSeri && (!qty || isNaN(qty) || Number(qty) <= 0)) {
            isValid = false;
            errCount++;
            validationMsg = "Error: Harus ada Nomor Seri atau Qty (jumlah) untuk migrasi";
          }

          parsedRows.push({
            rowNumber: i + 1,
            tglSpk,
            penjahit,
            nomorSeri,
            deadline,
            tanggalAmbil,
            hargaBarang,
            jenisHargaBarang,
            hargaJasa,
            jenisHargaJasa,
            merek,
            keterangan,
            catatan,
            qty,
            warna,
            sku,
            isValid,
            validationMsg
          });
        }

        setImportPreviewRows(parsedRows);
        setImportFile(file);
        setImportPreviewErrors(errCount);
        setShowImportPreviewModal(true);

      } catch (err) {
        console.error("Gagal membaca Excel:", err);
        const SwalObj = await ensureSweetAlert();
        await SwalObj.fire({
          icon: "error",
          title: "Gagal Membaca File",
          text: "Pastikan file berformat Excel (.xlsx, .xls) yang valid.",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;

    const formData = new FormData();
    formData.append("file", importFile);

    const SwalObj = await ensureSweetAlert();

    try {
      setImporting(true);
      SwalObj.fire({
        title: "Mengimport data...",
        text: "Mohon tunggu sampai proses selesai.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => SwalObj.showLoading(),
      });

      const response = await API.post("/spkcmt/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600000,
      });

      // Close the preview modal first
      setShowImportPreviewModal(false);
      setImportFile(null);
      setImportPreviewRows([]);

      const result = response.data || {};
      const errors = Array.isArray(result.errors) ? result.errors : [];
      const errorList = errors
        .slice(0, 8)
        .map((item) => `<li>Row ${item.row}: ${item.message}</li>`)
        .join("");

      SwalObj.close();

      await SwalObj.fire({
        icon: result.total_errors > 0 ? "warning" : "success",
        title: "Import Selesai",
        html: `
          <div style="display: flex; justify-content: space-around; font-size: 14px; margin-bottom: 15px;">
            <div><strong>${result.processed || 0}</strong><br/>Diproses</div>
            <div><strong>${result.created || 0}</strong><br/>Sukses</div>
            <div><strong>${result.skipped || 0}</strong><br/>Gagal</div>
          </div>
          ${errorList
            ? `<div style="text-align: left; background: #fff5f5; padding: 10px; border-radius: 8px; border: 1px solid #fed7d7; max-height: 150px; overflow-y: auto;"><p style="margin: 0 0 5px 0; font-weight: bold; color: #c53030;">Catatan:</p><ul style="margin: 0; padding-left: 15px; font-size: 12px; color: #c53030;">${errorList}</ul></div>`
            : ""
          }
        `,
        confirmButtonText: "Selesai",
        confirmButtonColor: "#2563eb",
      });

      // Reload SPK CMT data after user clicks Selesai
      window.location.reload();
    } catch (err) {
      SwalObj.close();
      await showStatusAlert({
        icon: "error",
        title: "Import Gagal",
        text: "File Excel gagal diimport. Pastikan server aktif dan format file sudah sesuai template.",
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadStaffPdf = (id) => {
    const url = `/api/spk-cmt/${id}/download-staff-pdf`;
    window.open(url, "_blank"); // Membuka file PDF di tab baru
  };

  const handleWarnaChange = (e, index) => {
    const { name, value } = e.target;
    const updatedWarna = [...newSpk.warna];

    // Update nilai nama_warna atau qty
    if (name.includes("nama_warna")) {
      updatedWarna[index].nama_warna = value;
    } else if (name.includes("qty")) {
      updatedWarna[index].qty = value;
    }

    // Hitung ulang jumlah_produk
    const totalProduk = calculateJumlahProduk(updatedWarna);

    // Hitung total_harga berdasarkan harga_per_barang dan jumlah_produk
    const totalHarga = newSpk.harga_per_barang * totalProduk;

    setNewSpk({
      ...newSpk,
      warna: updatedWarna,
      jumlah_produk: totalProduk, // Perbarui jumlah_produk secara otomatis
      total_harga: totalHarga, // Perbarui total_harga secara otomatis
    });
  };

  const handleAddWarna = () => {
    const updatedWarna = [...newSpk.warna, { nama_warna: "", qty: 0 }];
    const totalProduk = calculateJumlahProduk(updatedWarna);

    setNewSpk({
      ...newSpk,
      warna: updatedWarna,
      jumlah_produk: totalProduk,
    });
  };

  const handleRemoveWarna = (index) => {
    const updatedWarna = newSpk.warna.filter((_, i) => i !== index);
    const totalProduk = calculateJumlahProduk(updatedWarna);

    setNewSpk({
      ...newSpk,
      warna: updatedWarna,
      jumlah_produk: totalProduk,
    });
  };

  const handleDetailClick = (spk) => {
    setSelectedSpk(spk); // Simpan detail SPK yang dipilih
    setShowPopup(true); // Tampilkan pop-up
  };

  const closePopup = () => {
    setShowPopup(false); // Sembunyikan pop-up
    setSelectedSpk(null); // Reset data SPK
  };

  const formatTanggal = (tanggal) => {
    const date = new Date(tanggal);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const calculateWaktuPengerjaan = (spk) => {
    if (!spk.deadline) {
      return spk.waktu_pengerjaan !== null && spk.waktu_pengerjaan !== undefined ? `${spk.waktu_pengerjaan} hari` : "-";
    }
    const d1 = new Date(spk.deadline);
    const today = new Date();
    d1.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = d1 - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} hari`;
  };

  const calculateJumlahProduk = (warnaArray) => {
    const total = warnaArray.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    return total;
  };
  const handleEditClick = (spk) => {
    console.log("SPK yang diedit:", spk); // Debugging
    setSelectedSpk(spk);

    let parseAksesoris = [];
    if (spk.aksesoris) {
      try {
        parseAksesoris = JSON.parse(spk.aksesoris);
        if (!Array.isArray(parseAksesoris)) parseAksesoris = [];
      } catch (e) {
        parseAksesoris = [];
      }
    }

    setNewSpk({
      ...spk,
      warna: spk.warna || [],
      aksesoris: parseAksesoris,
    });
    setShowForm(true); // Tampilkan form
  };

  const handleDeleteSpk = async (spkId) => {
    const SwalObj = await ensureSweetAlert();
    const result = await SwalObj.fire({
      title: "Hapus SPK CMT?",
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      try {
        await API.delete(`/spkcmt/${spkId}`);
        setSpkCmtData(prev => prev.filter(item => item.id_spk !== spkId));
        await showStatusAlert({
          icon: "success",
          title: "Dihapus!",
          text: "SPK CMT berhasil dihapus.",
          toast: true,
        });
        refreshStatusCount();
      } catch (error) {
        await showStatusAlert({
          icon: "error",
          title: "Gagal Menghapus",
          text: formatAlertMessage(error.response?.data?.message || error.message),
        });
      }
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "belum_diambil":
        return "Belum Diambil";
      case "sudah_diambil":
        return "Sudah Diambil";
      case "pending":
        return "Pending";
      case "Completed":
        return "Completed";
      default:
        return status || "Belum Diambil";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "belum_diambil":
        return "#f59e0b";
      case "sudah_diambil":
        return "#2563eb";
      case "pending":
        return "#d97706";
      case "Completed":
        return "#059669";
      default:
        return "#64748b";
    }
  };

  const getSisaHariColor = (sisaHari) => {
    if (sisaHari === null || sisaHari === undefined || sisaHari === "") {
      return "#64748b";
    }

    if (Number(sisaHari) < 0) {
      return "#b91c1c";
    }

    if (Number(sisaHari) <= 3) {
      return "#ea580c";
    }

    if (Number(sisaHari) <= 7) {
      return "#ca8a04";
    }

    return "#0f766e";
  };

  const getDetailStatusClass = (status) => {
    switch (status) {
      case "belum_diambil":
        return "spkcmt-detail-badge--warning";
      case "sudah_diambil":
        return "spkcmt-detail-badge--info";
      case "pending":
        return "spkcmt-detail-badge--danger";
      case "Completed":
        return "spkcmt-detail-badge--success";
      default:
        return "spkcmt-detail-badge--neutral";
    }
  };

  const parseAksesorisItems = (aksesoris) => {
    if (!aksesoris) {
      return [];
    }

    try {
      const parsed = JSON.parse(aksesoris);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const handlePengirimanDetailClick = (spk, type) => {
    setSelectedSpkId(spk.id_spk);
    setModalType(type); // Simpan jenis modal

    if (type === "jumlah_kirim") {
      setPengirimanDetails(spk.pengiriman || []); // Simpan semua data pengiriman
    } else if (type === "sisa_barang") {
      const lastPengiriman = spk.pengiriman?.length > 0 ? spk.pengiriman[spk.pengiriman.length - 1] : null;

      setPengirimanDetails(lastPengiriman?.sisa_barang_per_warna || {}); // Simpan sisa barang per warna
    }

    setShowModal(true);
  };

  const togglePopup = () => {
    setShowPopup(!showPopup);
  };

  const handleSortChange = (e) => setSortBy(e.target.value);

  const handleOrderChange = () => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));

  const openPendingModal = (spk) => {
    setSelectedSpk(spk);
    setPendingDays("");
    setPendingNote("");
    setPendingUntil("");
    setShowPendingModal(true);
  };
  const closePendingModal = () => {
    setShowPendingModal(false);
    setSelectedSpk(null);
    setPendingDays("");
    setPendingNote("");
    setPendingUntil("");
  };
  const submitPendingStatus = async () => {
    if (!pendingUntil) {
      await showStatusAlert({
        icon: "warning",
        title: "Tanggal Pending Wajib Diisi",
        text: "Silakan pilih tanggal pending terlebih dahulu.",
      });
      return;
    }

    try {
      setLoadingPending(true);

      await API.patch(`/spk-cmt/${selectedSpk.id_spk}/status`, {
        status: "pending",
        pending_until: pendingUntil,
        alasan_pending: pendingNote || null,
      });

      updateSpkInTable({
        ...selectedSpk,
        status: "pending",
        pending_until: pendingUntil,
        alasan_pending: pendingNote || null,
      });

      // Refresh status count
      await refreshStatusCount();

      closePendingModal();
      await showStatusAlert({
        icon: "success",
        title: "Status Pending Disimpan",
        text: "Status pending berhasil diperbarui.",
        toast: true,
      });
    } catch (error) {
      await showStatusAlert({
        icon: "error",
        title: "Set Pending Gagal",
        text: formatAlertMessage(error.response?.data?.message || "Gagal set pending"),
      });
    } finally {
      setLoadingPending(false);
    }
  };

  const activeFilterCount = [searchTerm, selectedStatus, selectedPenjahit, selectedProduk, selectedKategori].filter(Boolean).length;

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedStatus("");
    setSelectedPenjahit("");
    setSelectedProduk("");
    setSelectedKategori("");
    setSelectedSisaHari("");
    setDeadlineStatusFilter("");
    setKirimMingguIniFilter("");
    setCurrentPage(1);
    setSearchParams({});
  };

  const totalSpkOverview = (statusCount.belum_diambil || 0) + (statusCount.sudah_diambil || 0) + (statusCount.pending || 0) + (statusCount.completed || 0);
  const detailSkuList = selectedSpk?.skus || [];
  const detailWarnaList = selectedSpk?.warna || [];
  const detailAksesorisList = parseAksesorisItems(selectedSpk?.aksesoris);
  const detailStatusLabel = selectedSpk ? getStatusLabel(selectedSpk.status) : "-";
  const detailStatusClass = selectedSpk ? getDetailStatusClass(selectedSpk.status) : "spkcmt-detail-badge--neutral";
  const detailPendingInfo = selectedSpk?.status === "pending" && selectedSpk?.pending_until ? formatTanggal(selectedSpk.pending_until) : "-";
  const estimasiPengerjaanText = useMemo(() => {
    if (!selectedSpk?.deadline || !selectedSpk?.tanggal_ambil) return "-";
    const d1 = new Date(selectedSpk.deadline);
    const d2 = new Date(selectedSpk.tanggal_ambil);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffTime = d1 - d2;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} Hari`;
  }, [selectedSpk?.deadline, selectedSpk?.tanggal_ambil]);

  const pageNumbers = [];
  const pageStart = Math.max(1, currentPage - 2);
  const pageEnd = Math.min(lastPage, currentPage + 2);
  for (let i = pageStart; i <= pageEnd; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="ks-page">
      {!showForm ? (
        <>
        <header className="ks-header">
          <div className="ks-header-id">
            <h1>Data SPK CMT</h1>
            <span className="ks-header-sub">Manajemen SPK CMT, deadline produksi, pengiriman, dan dokumen kerja</span>
          </div>

          <div className="ks-header-actions">
            <div className="ks-search">
              <FiSearch className="ks-search-icon" />
              <input
                type="text"
                placeholder="Cari produk, nomor seri, penjahit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="spkcmt-search-clear"
                  onClick={() => setSearchTerm("")}
                  title="Hapus pencarian"
                  style={{ right: "8px", border: "none", background: "transparent", cursor: "pointer", color: "#9a9aa3" }}
                >
                  x
                </button>
              )}
            </div>
            <button
              type="button"
              className="ks-btn"
              style={{ position: "relative", height: "30px", width: "30px", padding: 0, justifyContent: "center" }}
              onClick={() => {
                setShowNotifPopup((prev) => !prev);
                if (!showNotifPopup) {
                  markNotificationsAsRead();
                }
              }}
            >
              <FaBell />
              {unreadCount > 0 && (
                <span
                  className="notif-badge"
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "#e5484d",
                    color: "white",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    fontSize: "9px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #fff"
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifPopup && (
              <div className="spkcmt-notif-popup" onClick={(e) => e.stopPropagation()} style={{ top: "45px", right: "10px", zIndex: 100 }}>
                <div className="spkcmt-notif-popup-header">
                  <div>
                    <span className="spkcmt-panel-eyebrow">Notification Center</span>
                    <h3>Aktivitas Terbaru</h3>
                  </div>
                </div>
                {notifications.length > 0 ? (
                  <ul className="spkcmt-notif-list">
                    {notifications.map((notif) => (
                      <li key={notif.id} className="spkcmt-notif-item">
                        <div className="spkcmt-notif-text">
                          <strong>SPK #{notif.spk_id}</strong>
                          <span>{notif.text}</span>
                          <small>User ID: {notif.user_id}</small>
                        </div>
                        <span className="spkcmt-notif-time">{notif.time}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="spkcmt-empty-inline">Belum ada notifikasi baru.</div>
                )}

                <button
                  type="button"
                  className="spkcmt-notif-clear-btn"
                  onClick={() => {
                    setNotifications([]);
                    localStorage.removeItem("notifications");
                  }}
                >
                  Hapus Notifikasi
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="ks-statrail">
          <div className="ks-stat">
            <span className="ks-stat-label">Total SPK</span>
            <span className="ks-stat-value">{statusCount.total_spk || 0}</span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">Total Produk</span>
            <span className="ks-stat-value tone-none">
              {(statusCount.total_produk || 0).toLocaleString("id-ID")}
            </span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">Total Kirim</span>
            <span className="ks-stat-value tone-safe">
              {(statusCount.total_kirim || 0).toLocaleString("id-ID")}
            </span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">Total Sisa</span>
            <span className="ks-stat-value tone-warning">
              {(statusCount.total_sisa || 0).toLocaleString("id-ID")}
            </span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">SPK Dekat Deadline</span>
            <span className="ks-stat-value tone-overdue">
              <span className="ks-dot tone-overdue" />
              {statusCount.spk_mendekati || 0}
            </span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">Sisa (Jauh Deadline)</span>
            <span className="ks-stat-value tone-safe">
              <span className="ks-dot tone-safe" />
              {(statusCount.sisa_jauh || 0).toLocaleString("id-ID")}
            </span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">Sisa (Dekat Deadline)</span>
            <span className="ks-stat-value tone-warning">
              <span className="ks-dot tone-warning" />
              {(statusCount.sisa_mendekati || 0).toLocaleString("id-ID")}
            </span>
          </div>
          <div className="ks-stat">
            <span className="ks-stat-label">Sisa (Lewat Deadline)</span>
            <span className="ks-stat-value tone-overdue">
              <span className="ks-dot tone-overdue" />
              {(statusCount.sisa_lewat || 0).toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        <main className="spkcmt-main" style={{ padding: 0, gap: 0, flex: 1, minHeight: 0 }}>
          <section className="ks-board">
            <div className="ks-toolbar" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="ks-pagesize"
                  style={{ height: "30px", border: "1px solid var(--ks-line-strong)", borderRadius: "6px", padding: "0 8px", outline: "none", background: "var(--ks-surface)", color: "var(--ks-text)", fontSize: "12px" }}
                >
                  <option value="">Semua Status SPK</option>
                  <option value="belum_diambil">Belum Diambil</option>
                  <option value="sudah_diambil">Sudah Diambil</option>
                  <option value="pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>

                <select
                  value={selectedPenjahit}
                  onChange={(e) => setSelectedPenjahit(e.target.value)}
                  className="ks-pagesize"
                  style={{ height: "30px", border: "1px solid var(--ks-line-strong)", borderRadius: "6px", padding: "0 8px", outline: "none", background: "var(--ks-surface)", color: "var(--ks-text)", fontSize: "12px", maxWidth: "150px" }}
                >
                  <option value="">Semua Penjahit</option>
                  {penjahitList.map((penjahit) => (
                    <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                      {penjahit.nama_penjahit}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedProduk}
                  onChange={(e) => setSelectedProduk(e.target.value)}
                  className="ks-pagesize"
                  style={{ height: "30px", border: "1px solid var(--ks-line-strong)", borderRadius: "6px", padding: "0 8px", outline: "none", background: "var(--ks-surface)", color: "var(--ks-text)", fontSize: "12px", maxWidth: "150px" }}
                >
                  <option value="">Semua Produk</option>
                  {produkList.map((produk) => (
                    <option key={produk.id} value={produk.id}>
                      {produk.nama_produk}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedKategori}
                  onChange={(e) => setSelectedKategori(e.target.value)}
                  className="ks-pagesize"
                  style={{ height: "30px", border: "1px solid var(--ks-line-strong)", borderRadius: "6px", padding: "0 8px", outline: "none", background: "var(--ks-surface)", color: "var(--ks-text)", fontSize: "12px" }}
                >
                  <option value="">Semua Kategori</option>
                  {kategoriList.map((kategori, index) => (
                    <option key={index} value={kategori}>
                      {kategori}
                    </option>
                  ))}
                </select>

                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="ks-pagesize"
                  style={{ height: "30px", border: "1px solid var(--ks-line-strong)", borderRadius: "6px", padding: "0 8px", outline: "none", background: "var(--ks-surface)", color: "var(--ks-text)", fontSize: "12px" }}
                >
                  <option value="desc">Urutan Terbaru</option>
                  <option value="asc">Urutan Terlama</option>
                </select>

                {activeFilterCount > 0 && (
                  <button type="button" className="ks-btn" onClick={resetFilters}>
                    Reset Filter
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportChange}
                  style={{ display: "none" }}
                />

                <button type="button" className="ks-btn" onClick={() => importInputRef.current?.click()}>
                  Import Excel
                </button>
                <button type="button" className="ks-btn" onClick={handleExportExcel}>
                  Export Excel
                </button>

                <button type="button" className="ks-btn is-primary" onClick={() => setShowForm(true)}>
                  <FaPlus /> Tambah SPK CMT
                </button>
              </div>
            </div>

            {loading ? (
              <div className="ks-empty">
                <div className="is-spinning" style={{ fontSize: "20px" }}><FiSearch /></div>
                <h4>Memuat data SPK CMT</h4>
                <p>Data SPK sedang disinkronkan dari server.</p>
              </div>
            ) : error ? (
              <div className="ks-empty">
                <h4>Terjadi Kesalahan</h4>
                <p>{error}</p>
                <button type="button" className="ks-btn is-primary" onClick={() => window.location.reload()}>
                  Muat Ulang Halaman
                </button>
              </div>
            ) : filteredSpk.length === 0 ? (
              <div className="ks-empty">
                <h4>Data Tidak Ditemukan</h4>
                <p>
                  {searchTerm || selectedStatus || selectedPenjahit || selectedProduk || selectedKategori
                    ? "Tidak ada SPK yang sesuai dengan filter yang Anda pilih"
                    : "Mulai dengan menambahkan SPK CMT pertama Anda"}
                </p>
                {activeFilterCount > 0 && (
                  <button type="button" className="ks-btn" onClick={resetFilters}>
                    Hapus Filter
                  </button>
                )}
                {activeFilterCount === 0 && (
                  <button type="button" className="ks-btn is-primary" onClick={() => setShowForm(true)}>
                    <FaPlus /> Tambah SPK Pertama
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="ks-grid-scroll">
                  <table className="ks-grid">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Nomor Seri</th>
                        <th>Tgl SPK</th>
                        <th>Deadline</th>
                        <th style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="ks-th-btn"
                            onClick={handleOrderChange}
                            style={{ margin: "0 auto" }}
                          >
                            <span>Sisa Hari</span>
                            {sortOrder === "asc" ? <FaArrowDown size={10} /> : <FaArrowUp size={10} />}
                          </button>
                        </th>
                        <th>Penjahit</th>
                        <th>Tanggal Ambil</th>
                        <th>Sisa Waktu</th>
                        <th>Nama Baju</th>
                        <th>Size</th>
                        <th>Warna</th>
                        <th style={{ textAlign: "right" }}>Jml Produk</th>
                        <th style={{ textAlign: "right" }}>Jml Kirim</th>
                        <th style={{ textAlign: "right" }}>Jml Sisa</th>
                        <th style={{ textAlign: "center" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let rowCounter = 0;
                        return filteredSpk.flatMap((spk) => {
                          const latestPengiriman = spk.pengiriman?.length ? [...spk.pengiriman].sort((a, b) => a.id_pengiriman - b.id_pengiriman).at(-1) : null;
                          const activeColors = spk.warna || [];
                          const cuttingDate = spk.sumber_pekerjaan?.spk_cutting?.created_at 
                            || spk.sumber_pekerjaan?.spk_cutting_distribusi?.spk_cutting?.created_at 
                            || spk.spk_cutting_distribusi?.spk_cutting?.created_at 
                            || spk.created_at;
                          
                          if (activeColors.length === 0) {
                            rowCounter++;
                            const sisaBarang = latestPengiriman?.sisa_barang ?? spk.jumlah_produk ?? 0;
                            return (
                              <tr key={`${spk.id_spk}-none`}>
                                <td>
                                  <span className="ks-cell-num" style={{ fontWeight: 600 }}>{(currentPage - 1) * itemsPerPage + rowCounter}</span>
                                </td>
                                <td>
                                  <span className="ks-cell-code">{spk.nomor_seri || "-"}</span>
                                </td>
                                <td>{spk.tgl_spk ? new Date(spk.tgl_spk).toLocaleDateString("id-ID") : (cuttingDate ? new Date(cuttingDate).toLocaleDateString("id-ID") : "-")}</td>
                                <td>{spk.deadline ? new Date(spk.deadline).toLocaleDateString("id-ID") : "-"}</td>
                                <td style={{ textAlign: "center" }}>
                                  <span className={`ks-run ${getDeadlineTone(spk.sisa_hari)}`}>
                                    {spk.sisa_hari ?? "-"}
                                  </span>
                                </td>
                                <td>{spk.penjahit?.nama_penjahit || "-"}</td>
                                <td>{spk.tanggal_ambil ? new Date(spk.tanggal_ambil).toLocaleDateString("id-ID") : "-"}</td>
                                <td>{calculateWaktuPengerjaan(spk)}</td>
                                <td>
                                  <div className="ks-cell-product" title={spk.nama_produk}>{spk.nama_produk || "-"}</div>
                                </td>
                                <td>{spk.product_size || "-"}</td>
                                <td>-</td>
                                <td className="align-right ks-cell-num">{(spk.jumlah_produk || 0).toLocaleString("id-ID")}</td>
                                <td className="align-right ks-cell-num">
                                  <span 
                                    onClick={() => handlePengirimanDetailClick(spk, "jumlah_kirim")} 
                                    style={{ cursor: "pointer", textDecoration: "underline", color: "var(--ks-accent)", fontWeight: "600" }} 
                                    title="Klik untuk detail pengiriman"
                                  >
                                    {(spk.total_barang_dikirim || 0).toLocaleString("id-ID")}
                                  </span>
                                </td>
                                <td className="align-right ks-cell-num">
                                  <span 
                                    onClick={() => handlePengirimanDetailClick(spk, "sisa_barang")} 
                                    style={{ cursor: "pointer", textDecoration: "underline", color: "var(--ks-safe)", fontWeight: "600" }} 
                                    title="Klik untuk detail sisa barang"
                                  >
                                    {sisaBarang.toLocaleString("id-ID")}
                                  </span>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.nativeEvent.stopImmediatePropagation();
                                      if (dropdownSpk?.id_spk === spk.id_spk) {
                                        setDropdownSpk(null);
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setDropdownPosition({
                                          top: rect.bottom + window.scrollY,
                                          left: rect.right + window.scrollX - 160
                                        });
                                        setDropdownSpk(spk);
                                      }
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                      color: "var(--ks-text-soft)",
                                      boxShadow: "none",
                                      margin: "0 auto",
                                      padding: "8px",
                                      transition: "all 0.2s"
                                    }}
                                    title="Pilih Aksi"
                                  >
                                    <FaEllipsisV size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          }

                          return activeColors.map((color, colorIdx) => {
                            rowCounter++;
                            const sisaBarang = latestPengiriman
                              ? (latestPengiriman.sisa_barang_per_warna?.[color.nama_warna] ??
                                 latestPengiriman.sisa_barang_per_warna?.[color.nama_warna.trim()] ??
                                 latestPengiriman.sisa_barang_per_warna?.[color.nama_warna.toUpperCase()] ??
                                 color.qty ?? 0)
                              : (color.qty ?? 0);
                            const kirimPerWarna = (color.qty ?? 0) - sisaBarang;
                            
                            return (
                              <tr key={`${spk.id_spk}-${color.nama_warna}-${colorIdx}`}>
                                <td>
                                  <span className="ks-cell-num" style={{ fontWeight: 600 }}>{(currentPage - 1) * itemsPerPage + rowCounter}</span>
                                </td>
                                <td>
                                  <span className="ks-cell-code">{spk.nomor_seri || "-"}</span>
                                </td>
                                <td>{spk.tgl_spk ? new Date(spk.tgl_spk).toLocaleDateString("id-ID") : (cuttingDate ? new Date(cuttingDate).toLocaleDateString("id-ID") : "-")}</td>
                                <td>{spk.deadline ? new Date(spk.deadline).toLocaleDateString("id-ID") : "-"}</td>
                                <td style={{ textAlign: "center" }}>
                                  <span className={`ks-run ${getDeadlineTone(spk.sisa_hari)}`}>
                                    {spk.sisa_hari ?? "-"}
                                  </span>
                                </td>
                                <td>{spk.penjahit?.nama_penjahit || "-"}</td>
                                <td>{spk.tanggal_ambil ? new Date(spk.tanggal_ambil).toLocaleDateString("id-ID") : "-"}</td>
                                <td>{calculateWaktuPengerjaan(spk)}</td>
                                <td>
                                  <div className="ks-cell-product" title={spk.nama_produk}>{spk.nama_produk || "-"}</div>
                                </td>
                                <td>{spk.product_size || "-"}</td>
                                <td>{color.nama_warna}</td>
                                <td className="align-right ks-cell-num" style={{ fontWeight: "700" }}>
                                  {(color.qty || 0).toLocaleString("id-ID")}
                                </td>
                                <td className="align-right ks-cell-num">
                                  <span
                                    onClick={() => handlePengirimanDetailClick(spk, "jumlah_kirim")}
                                    style={{ cursor: "pointer", textDecoration: "underline", color: "var(--ks-accent)", fontWeight: "600" }}
                                    title="Klik untuk detail pengiriman"
                                  >
                                    {kirimPerWarna.toLocaleString("id-ID")}
                                  </span>
                                </td>
                                <td className="align-right ks-cell-num">
                                  <span 
                                    onClick={() => handlePengirimanDetailClick(spk, "sisa_barang")} 
                                    style={{ cursor: "pointer", textDecoration: "underline", color: "var(--ks-safe)", fontWeight: "600" }} 
                                    title="Klik untuk detail sisa barang"
                                  >
                                    {sisaBarang.toLocaleString("id-ID")}
                                  </span>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.nativeEvent.stopImmediatePropagation();
                                      if (dropdownSpk?.id_spk === spk.id_spk) {
                                        setDropdownSpk(null);
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setDropdownPosition({
                                          top: rect.bottom + window.scrollY,
                                          left: rect.right + window.scrollX - 160
                                        });
                                        setDropdownSpk(spk);
                                      }
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                      color: "var(--ks-text-soft)",
                                      boxShadow: "none",
                                      margin: "0 auto",
                                      padding: "8px",
                                      transition: "all 0.2s"
                                    }}
                                    title="Pilih Aksi"
                                  >
                                    <FaEllipsisV size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                <div className="ks-footer">
                  <div className="ks-footer-info">
                    <span>Halaman {formatNumber(currentPage)} dari {formatNumber(lastPage)} · Menampilkan {formatNumber(filteredSpk.length)} data</span>
                  </div>

                  <div className="ks-pager">
                    <button type="button" className="ks-pg-btn" onClick={() => setCurrentPage(1)} disabled={currentPage <= 1}>
                      &laquo;
                    </button>
                    <button type="button" className="ks-pg-btn" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                      &lsaquo;
                    </button>
                    {pageNumbers.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`ks-pg-btn ${currentPage === n ? "is-active" : ""}`}
                        onClick={() => setCurrentPage(n)}
                      >
                        {n}
                      </button>
                    ))}
                    <button type="button" className="ks-pg-btn" onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))} disabled={currentPage >= lastPage}>
                      &rsaquo;
                    </button>
                    <button type="button" className="ks-pg-btn" onClick={() => setCurrentPage(lastPage)} disabled={currentPage >= lastPage}>
                      &raquo;
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
        </>
      ) : (
        <div className="spkcmt-shell">
          <header className="spkcmt-topbar">
            <div className="spkcmt-title-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                type="button"
                className="spkcmt-btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setNewSpk({
                    source_type: "cutting",
                    source_id: "",
                    deadline: "",
                    tanggal_ambil: "",
                    id_penjahit: "",
                    keterangan: "",
                    catatan: "",
                    markeran: "",
                    aksesoris: [],
                    handtag: "",
                    merek: "",
                    harga_barang_dasar: "",
                    jenis_harga_barang: "per_pcs",
                    harga_per_jasa: "",
                    jenis_harga_jasa: "per_barang",
                  });
                  setPreviewData(null);
                  setSelectedSpk(null);
                }}
                style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              >
                ← Kembali
              </button>
              <div className="spkcmt-title-wrap">
                <div className="spkcmt-module-pill">CMT Module</div>
                <h1>{selectedSpk ? "Edit Data SPK CMT" : "Tambah SPK CMT"}</h1>
                <p className="spkcmt-header-subtitle" style={{ margin: '4px 0 0' }}>
                  Silakan lengkapi data SPK CMT di bawah ini. Preview cetak akan terupdate secara langsung.
                </p>
              </div>
            </div>
          </header>

          <main className="spkcmt-main">
            <div style={{ display: "flex", gap: "24px", width: "100%", alignItems: "flex-start" }}>
              {/* LEFT 50%: Form */}
              <div style={{ flex: 1, minWidth: 0, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.05)" }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
                    {/* ===== LEFT: Distribusi Cutting / Jasa List ===== */}
                    {!selectedSpk && (
                      <div style={{ flex: "0 0 240px", display: "flex", flexDirection: "column" }}>
                        <label className="spkcmt-form-label" style={{ marginBottom: "6px" }}>Pilih Sumber Pekerjaan</label>
                        <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                          <button
                            type="button"
                            className={`spkcmt-btn-secondary ${newSpk.source_type === "cutting" ? "active" : ""}`}
                            onClick={() => setNewSpk({ ...newSpk, source_type: "cutting", source_id: "" })}
                            style={{ flex: 1, padding: "6px", fontSize: "11px", background: newSpk.source_type === "cutting" ? "#eff6ff" : "#fff", borderColor: newSpk.source_type === "cutting" ? "#2458ce" : "#e2e8f0", color: newSpk.source_type === "cutting" ? "#2458ce" : "#64748b", cursor: "pointer" }}
                          >
                            Cutting
                          </button>
                          <button
                            type="button"
                            className={`spkcmt-btn-secondary ${newSpk.source_type === "jasa" ? "active" : ""}`}
                            onClick={() => setNewSpk({ ...newSpk, source_type: "jasa", source_id: "" })}
                            style={{ flex: 1, padding: "6px", fontSize: "11px", background: newSpk.source_type === "jasa" ? "#eff6ff" : "#fff", borderColor: newSpk.source_type === "jasa" ? "#2458ce" : "#e2e8f0", color: newSpk.source_type === "jasa" ? "#2458ce" : "#64748b", cursor: "pointer" }}
                          >
                            Jasa
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Cari kode seri..."
                          value={searchSourceInput}
                          onChange={(e) => setSearchSourceInput(e.target.value)}
                          style={{
                            width: "100%", padding: "8px 12px", fontSize: "12px", border: "1px solid #cbd5e1",
                            borderBottom: "none", background: "#f8fafc", outline: "none"
                          }}
                        />
                        <div style={{
                          border: "1px solid #cbd5e1", background: "#fff", height: "220px",
                          overflowY: "auto", overflowX: "hidden"
                        }}>
                          {loadingSource ? (
                            <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>Memuat...</div>
                          ) : sourceOptions.filter((opt) => {
                            if (!searchSourceInput) return true;
                            return opt.searchText?.includes(searchSourceInput.toLowerCase());
                          }).length === 0 ? (
                            <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>Tidak ditemukan</div>
                          ) : (
                            sourceOptions.filter((opt) => {
                              if (!searchSourceInput) return true;
                              return opt.searchText?.includes(searchSourceInput.toLowerCase());
                            }).map((opt) => (
                              <div
                                key={opt.value}
                                onClick={() => setNewSpk({ ...newSpk, source_id: opt.value })}
                                style={{
                                  padding: "8px 10px",
                                  cursor: "pointer",
                                  borderBottom: "1px solid #f1f5f9",
                                  background: newSpk.source_id === opt.value ? "#eef3ff" : "#fff",
                                  borderLeft: newSpk.source_id === opt.value ? "3px solid #2458ce" : "3px solid transparent",
                                  transition: "background 0.15s",
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: "12px", color: newSpk.source_id === opt.value ? "#1e40af" : "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{opt.label}</div>
                                {opt.subtitle && <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{opt.subtitle}</div>}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* ===== RIGHT: Form Fields ===== */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
                      {selectedSpk && (
                        <div style={{ padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "4px solid #2458ce", fontSize: "13px", color: "#0f172a" }}>
                          <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.03em" }}>Sumber Pekerjaan (Read-Only)</span>
                          <strong style={{ fontSize: "14px", color: "#1e3a8a" }}>{selectedSpk.nomor_seri || selectedSpk.kode_seri || "-"}</strong>
                          {selectedSpk.nama_produk && <span style={{ marginLeft: "6px", color: "#475569" }}>• {selectedSpk.nama_produk}</span>}
                          {selectedSpk.jumlah_produk && <span style={{ marginLeft: "6px", fontWeight: "600", color: "#0f172a" }}>({selectedSpk.jumlah_produk} pcs)</span>}
                        </div>
                      )}
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                        <div className="spkcmt-form-group">
                          <label className="spkcmt-form-label">Penjahit</label>
                          <select className="spkcmt-form-select" value={newSpk.id_penjahit} onChange={(e) => setNewSpk({ ...newSpk, id_penjahit: e.target.value })} required>
                            <option value="">Pilih</option>
                            {penjahitList.map((p) => (
                              <option key={p.id_penjahit} value={p.id_penjahit}>{p.nama_penjahit}</option>
                            ))}
                          </select>
                        </div>
                        <div className="spkcmt-form-group">
                          <label className="spkcmt-form-label">Harga CMT</label>
                          <div className="spkcmt-currency-input">
                            <span className="currency-prefix">Rp</span>
                            <input type="text" className="spkcmt-form-input" name="harga_per_jasa" value={newSpk.harga_per_jasa} onChange={handleInputChange} placeholder="0" required />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                        <div className="spkcmt-form-group">
                          <label className="spkcmt-form-label">Deadline</label>
                          <input type="date" className="spkcmt-form-input" value={newSpk.deadline} onChange={(e) => setNewSpk({ ...newSpk, deadline: e.target.value })} required />
                        </div>
                        <div className="spkcmt-form-group">
                          <label className="spkcmt-form-label">Tanggal Ambil</label>
                          <input type="date" className="spkcmt-form-input" value={newSpk.tanggal_ambil || ""} onChange={(e) => setNewSpk({ ...newSpk, tanggal_ambil: e.target.value })} />
                        </div>
                      </div>

                      <div className="spkcmt-form-group">
                        <label className="spkcmt-form-label">Keterangan SPK (Notes)</label>
                        <textarea
                          className="spkcmt-form-input spkcmt-form-textarea"
                          name="keterangan"
                          value={newSpk.keterangan || ""}
                          onChange={(e) => setNewSpk({ ...newSpk, keterangan: e.target.value })}
                          placeholder="Notes SPK otomatis dari Product List atau ketik manual catatan tambahan di sini..."
                          rows={3}
                          style={{ width: "100%", fontFamily: "inherit", resize: "vertical", minHeight: "70px" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ================= PREVIEW / DETAIL SPK ================= */}
                  {previewData && (
                    <div className="spkcmt-form-group" style={{ marginTop: "16px" }}>
                      <div className="spkcmt-table-container" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "visible" }}>
                        <table className="spkcmt-table" style={{ margin: 0, width: "100%", tableLayout: "fixed" }}>
                          <colgroup>
                            <col style={{ width: "35%" }} />
                            <col style={{ width: "20%" }} />
                            <col style={{ width: "15%" }} />
                            <col style={{ width: "30%" }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>Warna</th>
                              <th style={{ textAlign: "center" }}>Qty</th>
                              <th>Aksesoris</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const rawSkus = Array.isArray(previewData.skus) && previewData.skus.length > 0 ? previewData.skus : [];
                              const rawWarna = Array.isArray(previewData.warna) && previewData.warna.length > 0 ? previewData.warna : [];
                              // Prefer warna if it has more detail (more items)
                              if (rawWarna.length > rawSkus.length) {
                                return rawWarna.map((w, idx) => (
                                <tr key={idx}>
                                  <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.display || w.sku || "-"}</td>
                                  <td style={{ whiteSpace: "nowrap" }}>{w.nama_warna || w.warna || "-"}</td>
                                  <td style={{ whiteSpace: "nowrap", textAlign: "center" }}>{(w.qty || w.jumlah || 0).toLocaleString("id-ID")}</td>
                                  <td>
                                    <Select
                                      options={aksesorisList.map((a) => ({ value: a.nama_aksesoris, label: a.nama_aksesoris, satuan: a.satuan || "" }))}
                                      value={newSpk.aksesoris?.[idx]?.nama ? { value: newSpk.aksesoris[idx].nama, label: newSpk.aksesoris[idx].nama } : null}
                                      onChange={(selected) => {
                                        const newAksesoris = [...(newSpk.aksesoris || [])];
                                        if (!newAksesoris[idx]) newAksesoris[idx] = { nama: "", jumlah: "", satuan: "" };
                                        newAksesoris[idx].nama = selected ? selected.value : "";
                                        if (selected?.satuan) newAksesoris[idx].satuan = selected.satuan;
                                        setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                                      }}
                                      placeholder="Pilih..."
                                      isClearable
                                      menuPortalTarget={document.body}
                                      styles={{
                                        control: (base) => ({ ...base, minHeight: "34px", height: "34px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }),
                                        valueContainer: (base) => ({ ...base, padding: "0 6px" }),
                                        input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                        indicatorsContainer: (base) => ({ ...base, height: "34px" }),
                                        menu: (base) => ({ ...base, fontSize: "12px" }),
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 })
                                      }}
                                    />
                                  </td>
                                </tr>
                                ));
                              } else if (rawSkus.length > 0) {
                                return rawSkus.map((sku, idx) => (
                                <tr key={idx}>
                                  <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sku.display || sku.sku || "-"}</td>
                                  <td style={{ whiteSpace: "nowrap" }}>{sku.warna || "-"}</td>
                                  <td style={{ whiteSpace: "nowrap", textAlign: "center" }}>{(sku.qty || sku.jumlah || 0).toLocaleString("id-ID")}</td>
                                  <td>
                                    <Select
                                      options={aksesorisList.map((a) => ({ value: a.nama_aksesoris, label: a.nama_aksesoris, satuan: a.satuan || "" }))}
                                      value={newSpk.aksesoris?.[idx]?.nama ? { value: newSpk.aksesoris[idx].nama, label: newSpk.aksesoris[idx].nama } : null}
                                      onChange={(selected) => {
                                        const newAksesoris = [...(newSpk.aksesoris || [])];
                                        if (!newAksesoris[idx]) newAksesoris[idx] = { nama: "", jumlah: "", satuan: "" };
                                        newAksesoris[idx].nama = selected ? selected.value : "";
                                        if (selected?.satuan) newAksesoris[idx].satuan = selected.satuan;
                                        setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                                      }}
                                      placeholder="Pilih..."
                                      isClearable
                                      menuPortalTarget={document.body}
                                      styles={{
                                        control: (base) => ({ ...base, minHeight: "34px", height: "34px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }),
                                        valueContainer: (base) => ({ ...base, padding: "0 6px" }),
                                        input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                        indicatorsContainer: (base) => ({ ...base, height: "34px" }),
                                        menu: (base) => ({ ...base, fontSize: "12px" }),
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 })
                                      }}
                                    />
                                  </td>
                                </tr>
                                ));
                              } else if (rawWarna.length > 0) {
                                return rawWarna.map((w, idx) => (
                                <tr key={idx}>
                                  <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.display || w.sku || "-"}</td>
                                  <td style={{ whiteSpace: "nowrap" }}>{w.nama_warna || w.warna || "-"}</td>
                                  <td style={{ whiteSpace: "nowrap", textAlign: "center" }}>{(w.qty || w.jumlah || 0).toLocaleString("id-ID")}</td>
                                  <td>
                                    <Select
                                      options={aksesorisList.map((a) => ({ value: a.nama_aksesoris, label: a.nama_aksesoris, satuan: a.satuan || "" }))}
                                      value={newSpk.aksesoris?.[idx]?.nama ? { value: newSpk.aksesoris[idx].nama, label: newSpk.aksesoris[idx].nama } : null}
                                      onChange={(selected) => {
                                        const newAksesoris = [...(newSpk.aksesoris || [])];
                                        if (!newAksesoris[idx]) newAksesoris[idx] = { nama: "", jumlah: "", satuan: "" };
                                        newAksesoris[idx].nama = selected ? selected.value : "";
                                        if (selected?.satuan) newAksesoris[idx].satuan = selected.satuan;
                                        setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                                      }}
                                      placeholder="Pilih..."
                                      isClearable
                                      menuPortalTarget={document.body}
                                      styles={{
                                        control: (base) => ({ ...base, minHeight: "34px", height: "34px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }),
                                        valueContainer: (base) => ({ ...base, padding: "0 6px" }),
                                        input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                        indicatorsContainer: (base) => ({ ...base, height: "34px" }),
                                        menu: (base) => ({ ...base, fontSize: "12px" }),
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 })
                                      }}
                                    />
                                  </td>
                                </tr>
                                ));
                              } else {
                                return (
                                <tr>
                                  <td colSpan="4" style={{ textAlign: "center", color: "#64748b" }}>Data detail tidak tersedia</td>
                                </tr>
                                );
                              }
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="spkcmt-form-actions" style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                    <button type="submit" className="spkcmt-btn-submit" style={{ padding: '10px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>
                      <FaSave /> {selectedSpk ? "Simpan Perubahan" : "Simpan SPK CMT"}
                    </button>
                    <button
                      type="button"
                      className="spkcmt-btn-cancel"
                      onClick={() => {
                        setShowForm(false);
                        setNewSpk({
                          source_type: "cutting",
                          source_id: "",
                          deadline: "",
                          tanggal_ambil: "",
                          id_penjahit: "",
                          keterangan: "",
                          catatan: "",
                          markeran: "",
                          aksesoris: [],
                          handtag: "",
                          merek: "",
                          harga_barang_dasar: "",
                          jenis_harga_barang: "per_pcs",
                          harga_per_jasa: "",
                          jenis_harga_jasa: "per_barang",
                        });
                        setPreviewData(null);
                        setSelectedSpk(null);
                      }}
                      style={{ padding: '10px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer' }}
                    >
                      <FaTimes /> Batal
                    </button>
                  </div>
                </form>
              </div>

              {/* RIGHT 50%: Live Print Preview — Full SPK Document */}
              <div className="spkcmt-preview-column" style={{ flex: 1, minWidth: 0 }}>
                {previewData ? (() => {
                  const namaCmt = penjahitList.find(p => String(p.id_penjahit) === String(newSpk.id_penjahit))?.nama_penjahit || "-";
                  const namaProduk = previewData?.nama_produk || "-";
                  const kodeSeri = previewData?.kode_seri || previewData?.nomor_seri || "-";
                  const hargaJasa = newSpk.harga_per_jasa || "0";
                  // Use previewData.skus if available, fallback to previewData.warna for detailed per-color breakdown
                  const rawSkus = Array.isArray(previewData.skus) && previewData.skus.length > 0 ? previewData.skus : [];
                  const rawWarna = Array.isArray(previewData.warna) && previewData.warna.length > 0 ? previewData.warna : [];
                  // If warna has more detail (more items) than skus, prefer warna for detailed breakdown
                  const skus = rawWarna.length > rawSkus.length
                    ? rawWarna.map(w => ({
                        warna: w.nama_warna || w.warna || "-",
                        qty: w.qty || w.jumlah || 0,
                        display: w.display || w.sku || "-",
                        sku: w.sku || "-",
                      }))
                    : rawSkus;
                  const totalProduksi = skus.reduce((sum, s) => sum + (Number(s.qty) || Number(s.jumlah) || 0), 0);
                  const formatTgl = (d) => {
                    if (!d) return "-";
                    try {
                      const dt = new Date(d);
                      if (isNaN(dt)) return d;
                      return dt.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
                    } catch { return d; }
                  };
                  const waktuPengerjaan = (() => {
                    if (!newSpk.deadline || !newSpk.tanggal_ambil) return "-";
                    const d1 = new Date(newSpk.deadline);
                    const d2 = new Date(newSpk.tanggal_ambil);
                    if (isNaN(d1) || isNaN(d2)) return "-";
                    d1.setHours(0,0,0,0); d2.setHours(0,0,0,0);
                    return Math.round((d1 - d2) / (1000*60*60*24));
                  })();
                  const uniqueWarnas = [...new Set(skus.map(s => s.warna).filter(Boolean))];

                  return (
                  <div style={{ background: "#ffffff", border: "1px solid #c8cdd4", borderRadius: "4px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", position: "relative" }}>
                    {/* Print Button Bar */}
                    <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const printArea = document.getElementById("spkcmt-print-area");
                          if (printArea) {
                            const printWindow = window.open("", "_blank");
                            printWindow.document.write(`
                              <html><head><title>SPK CMT - ${kodeSeri}</title>
                              <style>
                                @page { size: A4; margin: 12mm; }
                                * { box-sizing: border-box; margin: 0; padding: 0; }
                                body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; line-height: 1.4; padding: 0; }
                                .spk-doc { width: 100%; }
                                .spk-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 3px solid #1a1a2e; }
                                .spk-header-left h1 { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #1a1a2e; }
                                .spk-header-left p { font-size: 10px; color: #555; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
                                .spk-header-right { text-align: right; }
                                .spk-header-right .seri-label { font-size: 10px; color: #666; text-transform: uppercase; }
                                .spk-header-right .seri-value { font-size: 18px; font-weight: 800; color: #1a1a2e; }
                                .spk-info-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1.5px solid #1a1a2e; }
                                .spk-info-table td { padding: 5px 8px; font-size: 11px; border: 1px solid #c8cdd4; vertical-align: middle; }
                                .spk-info-table .label { font-weight: 700; text-transform: uppercase; font-size: 9.5px; color: #333; background: #f0f2f5; width: 110px; letter-spacing: 0.3px; }
                                .spk-info-table .value { font-weight: 600; color: #1a1a2e; }
                                .spk-info-table .value-highlight { font-weight: 700; color: #d63384; }
                                .spk-info-table .waktu-box { text-align: center; }
                                .spk-info-table .waktu-number { font-size: 22px; font-weight: 800; color: #d63384; display: block; }
                                .spk-info-table .waktu-unit { font-size: 9px; color: #888; text-transform: uppercase; }
                                .spk-sku-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1.5px solid #1a1a2e; }
                                .spk-sku-table th { padding: 5px 8px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; background: #1a1a2e; color: #fff; border: 1px solid #1a1a2e; letter-spacing: 0.3px; }
                                .spk-sku-table td { padding: 5px 8px; font-size: 11px; border: 1px solid #c8cdd4; }
                                .spk-sku-table .row-bold td { font-weight: 700; }
                                .spk-sku-table .total-row td { background: #f0f2f5; font-weight: 800; border-top: 2px solid #1a1a2e; }
                                .spk-section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #1a1a2e; margin: 14px 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid #1a1a2e; }
                                .spk-warna-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
                                .spk-warna-card { flex: 1; min-width: 100px; max-width: 160px; border: 1px solid #c8cdd4; text-align: center; padding: 6px; }
                                .spk-warna-card .warna-label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #1a1a2e; margin-bottom: 4px; letter-spacing: 0.3px; }
                                .spk-warna-card .warna-placeholder { width: 100%; height: 120px; background: #f0f2f5; display: flex; align-items: center; justify-content: center; color: #999; font-size: 10px; }
                                .spk-catatan-box { border: 1.5px solid #1a1a2e; padding: 10px; margin-bottom: 14px; }
                                .spk-catatan-box .catatan-title { font-size: 10px; font-weight: 700; color: #d63384; margin-bottom: 4px; }
                                .spk-catatan-box .catatan-hint { font-size: 9px; color: #999; font-style: italic; margin-bottom: 4px; }
                                .spk-catatan-box .catatan-content { font-size: 11px; font-weight: 600; text-transform: uppercase; }
                                .spk-ketentuan { border: 2px solid #d63384; padding: 10px; margin-bottom: 14px; background: #fff5f9; }
                                .spk-ketentuan .ket-title { font-size: 10px; font-weight: 700; color: #d63384; margin-bottom: 6px; }
                                .spk-ketentuan ol { padding-left: 16px; font-size: 9.5px; color: #333; }
                                .spk-ketentuan ol li { margin-bottom: 4px; line-height: 1.4; }
                                .spk-ketentuan .ket-highlight { font-weight: 700; color: #d63384; }
                                .spk-signature { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 10px; border-top: 1.5px solid #c8cdd4; }
                                .spk-sig-block { text-align: center; width: 30%; }
                                .spk-sig-block .sig-label { font-size: 9.5px; color: #666; margin-bottom: 40px; }
                                .spk-sig-block .sig-line { border-top: 1px solid #1a1a2e; padding-top: 4px; }
                                .spk-sig-block .sig-name { font-size: 11px; font-weight: 700; }
                                .spk-sig-block .sig-title { font-size: 9px; color: #888; }
                                .spec-box { display: inline-block; border: 1px solid #c8cdd4; padding: 2px 6px; margin: 1px; font-size: 9.5px; background: #f8f9fa; }
                                @media print { body { padding: 0; } }
                              </style></head><body>${printArea.innerHTML}</body></html>
                            `);
                            printWindow.document.close();
                            printWindow.focus();
                            printWindow.print();
                          }
                        }}
                        style={{ padding: "6px 16px", background: "linear-gradient(135deg, #1d4ed8, #4f46e5)", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        🖨 Print
                      </button>
                    </div>

                    {/* SPK Document */}
                    <div id="spkcmt-print-area" style={{ padding: "20px", fontSize: "11px", color: "#1a1a2e", lineHeight: "1.4" }}>

                      {/* ===== HEADER ===== */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", paddingBottom: "8px", borderBottom: "3px solid #1a1a2e" }}>
                        <div>
                          <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "2px", color: "#1a1a2e" }}>ILOOK</div>
                          <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "2px" }}>SURAT PERINTAH KERJA CMT</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "10px", color: "#666", textTransform: "uppercase" }}>NO. SERI:</div>
                          <div style={{ fontSize: "18px", fontWeight: 800, color: "#1a1a2e" }}>{kodeSeri}</div>
                        </div>
                      </div>

                      {/* ===== INFO TABLE ===== */}
                      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14px", border: "1.5px solid #1a1a2e" }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: "5px 8px", fontWeight: 700, textTransform: "uppercase", fontSize: "9.5px", color: "#333", background: "#f0f2f5", width: "110px", letterSpacing: "0.3px", border: "1px solid #c8cdd4" }}>NAMA CMT</td>
                            <td style={{ padding: "5px 8px", fontWeight: 600, color: "#1a1a2e", border: "1px solid #c8cdd4" }}>{namaCmt}</td>
                            <td rowSpan="2" style={{ padding: "5px 8px", fontWeight: 700, textTransform: "uppercase", fontSize: "9.5px", color: "#333", background: "#f0f2f5", border: "1px solid #c8cdd4", textAlign: "center", letterSpacing: "0.3px" }}>
                              <span style={{ color: "#d63384", fontWeight: 700 }}>BATAS KIRIM</span>
                            </td>
                            <td rowSpan="2" style={{ padding: "5px 8px", fontWeight: 700, textTransform: "uppercase", fontSize: "9.5px", color: "#333", background: "#f0f2f5", border: "1px solid #c8cdd4", textAlign: "center" }}>TANGGAL AMBIL</td>
                            <td rowSpan="3" style={{ padding: "5px 8px", border: "1px solid #c8cdd4", textAlign: "center", verticalAlign: "middle", width: "90px" }}>
                              <div style={{ fontSize: "9px", color: "#888", textTransform: "uppercase", marginBottom: "2px" }}>WAKTU PENGERJAAN</div>
                              <div style={{ fontSize: "22px", fontWeight: 800, color: "#d63384" }}>{waktuPengerjaan !== "-" ? waktuPengerjaan : "-"}</div>
                              <div style={{ fontSize: "9px", color: "#888", textTransform: "uppercase" }}>{waktuPengerjaan !== "-" ? "HARI" : ""}</div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: "5px 8px", fontWeight: 700, textTransform: "uppercase", fontSize: "9.5px", color: "#333", background: "#f0f2f5", border: "1px solid #c8cdd4", letterSpacing: "0.3px" }}>NAMA PRODUCT</td>
                            <td style={{ padding: "5px 8px", fontWeight: 600, color: "#1a1a2e", border: "1px solid #c8cdd4" }}>
                              {namaProduk} {previewData?.size ? <span style={{ color: "#d63384" }}>({previewData.size})</span> : ""}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: "5px 8px", fontWeight: 700, textTransform: "uppercase", fontSize: "9.5px", color: "#333", background: "#f0f2f5", border: "1px solid #c8cdd4", letterSpacing: "0.3px" }}>HARGA JASA</td>
                            <td style={{ padding: "5px 8px", fontWeight: 700, color: "#d63384", border: "1px solid #c8cdd4" }}>Rp {hargaJasa}</td>
                            <td style={{ padding: "5px 8px", fontWeight: 600, color: "#1a1a2e", border: "1px solid #c8cdd4", textAlign: "center", fontSize: "10px" }}>{formatTgl(newSpk.deadline)}</td>
                            <td style={{ padding: "5px 8px", fontWeight: 600, color: "#1a1a2e", border: "1px solid #c8cdd4", textAlign: "center", fontSize: "10px" }}>{formatTgl(newSpk.tanggal_ambil)}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* ===== SKU TABLE ===== */}
                      {skus.length > 0 && (
                        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14px", border: "1.5px solid #1a1a2e" }}>
                          <thead>
                            <tr>
                              <th style={{ padding: "5px 8px", fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", background: "#1a1a2e", color: "#fff", border: "1px solid #1a1a2e", width: "30px" }}>NO</th>
                              <th style={{ padding: "5px 8px", fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", background: "#1a1a2e", color: "#fff", border: "1px solid #1a1a2e" }}>VARIAN WARNA</th>
                              <th style={{ padding: "5px 8px", fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", background: "#1a1a2e", color: "#fff", border: "1px solid #1a1a2e", width: "50px", textAlign: "center" }}>QTY</th>
                              <th style={{ padding: "5px 8px", fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", background: "#1a1a2e", color: "#fff", border: "1px solid #1a1a2e" }}>AKSESORIS YANG DISERAHKAN</th>
                              <th colSpan="4" style={{ padding: "5px 8px", fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", background: "#1a1a2e", color: "#fff", border: "1px solid #1a1a2e", textAlign: "center" }}>SPESIFIKASI UKURAN</th>
                            </tr>
                          </thead>
                          <tbody>
                            {skus.map((sku, idx) => (
                              <tr key={idx} style={{ fontWeight: 600 }}>
                                <td style={{ padding: "5px 8px", border: "1px solid #c8cdd4", textAlign: "center", fontSize: "11px" }}>{idx + 1}</td>
                                <td style={{ padding: "5px 8px", border: "1px solid #c8cdd4", fontWeight: 700, fontSize: "11px" }}>{sku.warna || "-"}</td>
                                <td style={{ padding: "5px 8px", border: "1px solid #c8cdd4", textAlign: "center", fontSize: "11px" }}>{(sku.qty || 0).toLocaleString("id-ID")}</td>
                                <td style={{ padding: "5px 8px", border: "1px solid #c8cdd4", fontSize: "10px" }}>
                                  {newSpk.aksesoris?.[idx]?.nama
                                    ? `${newSpk.aksesoris[idx].nama} (${newSpk.aksesoris[idx].jumlah || 0} ${newSpk.aksesoris[idx].satuan || "PCS"})`
                                    : "-"}
                                </td>
                                {idx === 0 && (
                                  <td rowSpan={skus.length} style={{ padding: "6px", border: "1px solid #c8cdd4", verticalAlign: "top", fontSize: "9.5px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                      <span style={{ display: "inline-block", border: "1px solid #c8cdd4", padding: "2px 6px", background: "#f8f9fa" }}>LD (Lebar Dada) &nbsp; <strong>-</strong></span>
                                      <span style={{ display: "inline-block", border: "1px solid #c8cdd4", padding: "2px 6px", background: "#f8f9fa" }}>PJ DRESS &nbsp; <strong>-</strong></span>
                                      <span style={{ display: "inline-block", border: "1px solid #c8cdd4", padding: "2px 6px", background: "#f8f9fa" }}>PJ CELANA &nbsp; <strong>-</strong></span>
                                      <span style={{ display: "inline-block", border: "1px solid #c8cdd4", padding: "2px 6px", background: "#f8f9fa" }}>PJ BAJU &nbsp; <strong>-</strong></span>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                            {/* Total Row */}
                            <tr style={{ background: "#f0f2f5", fontWeight: 800 }}>
                              <td colSpan="2" style={{ padding: "5px 8px", border: "1px solid #c8cdd4", textAlign: "right", fontSize: "10px", textTransform: "uppercase", borderTop: "2px solid #1a1a2e" }}>TOTAL PRODUKSI</td>
                              <td style={{ padding: "5px 8px", border: "1px solid #c8cdd4", textAlign: "center", fontSize: "12px", borderTop: "2px solid #1a1a2e" }}>{totalProduksi.toLocaleString("id-ID")}</td>
                              <td style={{ padding: "5px 8px", border: "1px solid #c8cdd4", fontSize: "9px", color: "#888", fontWeight: 400, fontStyle: "italic", borderTop: "2px solid #1a1a2e" }}>* Periksa kesesuaian fisik aksesoris</td>
                              <td style={{ padding: "5px 8px", border: "1px solid #c8cdd4", borderTop: "2px solid #1a1a2e" }}></td>
                            </tr>
                          </tbody>
                        </table>
                      )}

                      {/* ===== VISUAL REFERENSI PRODUK ===== */}
                      <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#1a1a2e", margin: "14px 0 8px", paddingBottom: "4px", borderBottom: "1.5px solid #1a1a2e" }}>
                        VISUAL REFERENSI PRODUK / VARIAN WARNA
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                        {(uniqueWarnas.length > 0 ? uniqueWarnas : ["-"]).map((warna, idx) => (
                          <div key={idx} style={{ flex: 1, minWidth: "100px", maxWidth: "160px", border: "1px solid #c8cdd4", textAlign: "center", padding: "6px" }}>
                            <div style={{ fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", color: "#1a1a2e", marginBottom: "4px", letterSpacing: "0.3px" }}>{warna}</div>
                            <div style={{ width: "100%", height: "120px", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: "10px", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "18px" }}>?</span>
                              <span>TIDAK ADA FOTO</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ===== CATATAN KHUSUS SPK ===== */}
                      <div style={{ border: "1.5px solid #1a1a2e", padding: "10px", marginBottom: "14px" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#d63384", marginBottom: "4px" }}>? CATATAN KHUSUS SPK</div>
                        <div style={{ fontSize: "9px", color: "#999", fontStyle: "italic", marginBottom: "4px" }}>Tidak ada catatan khusus untuk transaksi ini.</div>
                        <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>
                          KETERANGAN: {newSpk.keterangan || "-"}
                        </div>
                      </div>

                      {/* ===== KETENTUAN & CATATAN KERJA CMT ===== */}
                      <div style={{ border: "2px solid #d63384", padding: "10px", marginBottom: "14px", background: "#fff5f9" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#d63384", marginBottom: "6px" }}>? KETENTUAN & CATATAN KERJA CMT (PENTING):</div>
                        <ol style={{ paddingLeft: "16px", fontSize: "9.5px", color: "#333" }}>
                          <li style={{ marginBottom: "4px", lineHeight: "1.4" }}>
                            <strong>Sampel asli tidak boleh hilang.</strong> Jika sampel hilang, CMT wajib mengganti kerugian sebesar <span style={{ fontWeight: 700, color: "#d63384" }}>Rp 500.000,- (Lima Ratus Ribu Rupiah)</span>. Pengembalian sampel harus dilakukan di hari pertama pengiriman barang jadi ke CMT. Jika pengembalian sampel tertunda, otomatis akan dipotong klaim sebesar nominal tersebut dari tagihan CMT. Menandatangani SPK ini berarti CMT setuju dengan segala ketentuan tertulis.
                          </li>
                          <li style={{ marginBottom: "4px", lineHeight: "1.4" }}>
                            <strong>Laporan & Overtime.</strong> Batas pelaporan masalah setelah pengambilan SPK adalah 2-5 hari. Jika tidak ada laporan, pekerjaan dianggap lengkap tanpa kendala. Keterlambatan pengiriman (overtime) tanpa alasan/tagskonfirmasi tertulis akan dikenakan pemotongan nilai tagihan (klaim).
                          </li>
                        </ol>
                      </div>

                      {/* ===== TANDA TANGAN ===== */}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", paddingTop: "10px", borderTop: "1.5px solid #c8cdd4" }}>
                        <div style={{ textAlign: "center", width: "30%" }}>
                          <div style={{ fontSize: "9.5px", color: "#666", marginBottom: "40px" }}>Dibuat Oleh,</div>
                          <div style={{ borderTop: "1px solid #1a1a2e", paddingTop: "4px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700 }}>Sendy</div>
                            <div style={{ fontSize: "9px", color: "#888" }}>Tim Produksi</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "center", width: "30%" }}>
                          <div style={{ fontSize: "9.5px", color: "#666", marginBottom: "40px" }}>Mengetahui,</div>
                          <div style={{ borderTop: "1px solid #1a1a2e", paddingTop: "4px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700 }}>&nbsp;</div>
                            <div style={{ fontSize: "9px", color: "#888" }}>SPV / Manager</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "center", width: "30%" }}>
                          <div style={{ fontSize: "9.5px", color: "#666", marginBottom: "40px" }}>Diterima Oleh CMT,</div>
                          <div style={{ borderTop: "1px solid #1a1a2e", paddingTop: "4px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700 }}>{namaCmt !== "-" ? namaCmt : ""}</div>
                            <div style={{ fontSize: "9px", color: "#888" }}>Mitra CMT</div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                  );
                })() : (
                  <div className="spkcmt-live-preview-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "2px dashed #cbd5e1", borderRadius: "12px", background: "#f8fafc", padding: "40px 24px", color: "#64748b", height: "320px", gap: "12px" }}>
                    <FaBarcode size={32} style={{ color: "#94a3b8" }} />
                    <span style={{ fontSize: "13px", fontWeight: "500", textAlign: "center", maxWidth: "240px", lineHeight: "1.5" }}>Pilih distribusi cutting atau SPK Jasa untuk menampilkan preview cetak.</span>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      )}
      {showChatPopup && (
        <div className="spkcmt-chat-overlay" onClick={handleCloseChat}>
          <div className="spkcmt-chat-popup" onClick={(e) => e.stopPropagation()}>
            <div className="spkcmt-chat-header">
              <h4>💬 Chat SPK #{selectedSpkId}</h4>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {(userRole === "supervisor" || userRole === "super-admin") && (
                  <button className="spkcmt-invite-btn" onClick={() => setShowInviteStaffModal(true)}>
                    + Undang Staff
                  </button>
                )}
                <button className="spkcmt-modal-close" onClick={handleCloseChat}>
                  <FaTimes />
                </button>
              </div>
            </div>

            <div ref={chatContainerRef} className="spkcmt-chat-messages">
              {messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div key={index} className={`spkcmt-chat-message ${msg.user_id === userId ? "user-message" : "partner-message"}`}>
                    <div style={{ marginBottom: "4px", fontSize: "12px", fontWeight: "600", opacity: 0.8 }}>
                      <strong>{msg.user ? msg.user.name : "Unknown User"}</strong>
                    </div>

                    <div>
                      {msg.message && <p>{msg.message}</p>} {/* Hanya tampilkan jika ada teks */}
                      {msg.image_url && <img src={msg.image_url} alt="Chat media" className="chat-image" onClick={() => openMediaPreview(msg.image_url, "image")} />}
                      {msg.video_url && (
                        <video controls className="chat-image" onClick={() => openMediaPreview(msg.video_url, "video")}>
                          <source src={msg.video_url} type="video/mp4" />
                          <source src={msg.video_url} type="video/webm" />
                          <source src={msg.video_url} type="video/ogg" />
                          Your browser does not support the video tag.
                        </video>
                      )}
                      {msg.vn_url && (
                        <div className="chat-audio-wrapper">
                          {" "}
                          {/* Pembungkus untuk kontrol audio */}
                          <audio controls className="chat-audio">
                            <source src={msg.vn_url} type="audio/webm" />
                            <source src={msg.vn_url.replace(".webm", ".mp3")} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                      {readers[msg.id] && readers[msg.id].length > 0 && (
                        <div className="readers">
                          <small>
                            Read by:{" "}
                            {readers[msg.id]
                              .filter((r) => r.user_id !== msg.user_id) // 🔥 Filter agar pengirim tidak muncul di daftar
                              .map((r) => r.user.name)
                              .join(", ")}
                          </small>
                        </div>
                      )}
                    </div>
                    <small>{new Date(msg.created_at).toLocaleString()}</small>
                  </div>
                ))
              ) : (
                <p>Belum ada chat</p>
              )}
            </div>

            {/* Modal untuk preview media */}
            {mediaPreview.url && (
              <div className="media-preview-modal" onClick={closeMediaPreview}>
                <div className="media-preview-content" onClick={(e) => e.stopPropagation()}>
                  {mediaPreview.type === "image" ? (
                    <img src={mediaPreview.url} alt="Preview" />
                  ) : (
                    <video controls autoPlay>
                      <source src={mediaPreview.url} type="video/mp4" />
                    </video>
                  )}
                  <button className="close-button" onClick={closeMediaPreview}>
                    Close
                  </button>
                </div>
              </div>
            )}

            <div className="spkcmt-chat-input">
              {audioURL ? (
                <div className="vn-container">
                  <div className="vn-preview">
                    <audio controls>
                      <source src={audioURL} type="audio/webm" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                  <button className="delete-vn" onClick={deleteVN}>
                    ❌
                  </button>
                </div>
              ) : (
                // Jika tidak ada VN, tampilkan input teks
                <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ketik pesan..." />
              )}

              {/* Tombol Upload Gambar/Video */}
              <label htmlFor="media-upload" className="image-upload-label">
                <FaImage className="upload-icon" />
                <span>{imageFile?.name ? (imageFile.name.length > 7 ? imageFile.name.slice(0, 7) + "..." : imageFile.name) : videoFile?.name ? (videoFile.name.length > 7 ? videoFile.name.slice(0, 7) + "..." : videoFile.name) : ""}</span>
              </label>
              <input
                id="media-upload"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.type.startsWith("image/")) {
                      setImageFile(file);
                      setVideoFile(null);
                    } else if (file.type.startsWith("video/")) {
                      setVideoFile(file);
                      setImageFile(null);
                    }
                  }
                }}
                style={{ display: "none" }}
              />

              {/* Tombol Rekam VN */}
              <label className="image-upload-label" onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? <FaStop /> : <FaMicrophone />}
              </label>

              {/* Tombol Kirim */}
              <button className="spkcmt-send-btn" onClick={sendMessage}>
                <FaPaperPlane />
              </button>
            </div>

            {showInviteStaffModal && (
              <div className="spkcmt-modal-overlay" onClick={() => setShowInviteStaffModal(false)}>
                <div className="spkcmt-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="spkcmt-modal-header">
                    <h3>👥 Pilih Staff untuk Diundang</h3>
                    <button className="spkcmt-modal-close" onClick={() => setShowInviteStaffModal(false)}>
                      <FaTimes />
                    </button>
                  </div>
                  <div className="spkcmt-modal-body">
                    <div className="spkcmt-form-group">
                      <label className="spkcmt-form-label">Pilih Staff</label>
                      <select className="spkcmt-form-select" onChange={(e) => setSelectedStaffId(e.target.value)}>
                        <option value="">Pilih Staff</option>
                        {staffList.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="spkcmt-form-actions">
                      <button className="spkcmt-btn-submit" onClick={inviteStaff}>
                        Undang
                      </button>
                      <button className="spkcmt-btn-cancel" onClick={() => setShowInviteStaffModal(false)}>
                        Batal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="spkcmt-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="spkcmt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spkcmt-modal-header">
              <h3>{modalType === "jumlah_kirim" ? "📦 Detail Pengiriman" : "📊 Sisa Barang Per Warna"}</h3>
              <button className="spkcmt-modal-close" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="spkcmt-modal-body">
              {/* Modal untuk "Jumlah Kirim" */}
              {modalType === "jumlah_kirim" && (
                <>
                  <p style={{ marginBottom: "16px", color: "#667eea", fontWeight: "600" }}>SPK ID: {selectedSpkId}</p>
                  <div className="spkcmt-table-container">
                    <table className="spkcmt-table">
                      <thead>
                        <tr>
                          <th>ID Pengiriman</th>
                          <th>Tanggal Pengiriman</th>
                          <th>Total Barang Dikirim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pengirimanDetails.map((detail) => (
                          <tr key={detail.id_pengiriman}>
                            <td>{detail.id_pengiriman}</td>
                            <td>{detail.tanggal_pengiriman}</td>
                            <td>
                              <strong>{detail.total_barang_dikirim}</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Modal untuk "Sisa Barang" (Per Warna) */}
              {modalType === "sisa_barang" && pengirimanDetails && (
                <>
                  <p style={{ marginBottom: "16px", color: "#667eea", fontWeight: "600" }}>SPK ID: {selectedSpkId}</p>
                  <div className="spkcmt-table-container">
                    <table className="spkcmt-table">
                      <thead>
                        <tr>
                          <th>Warna</th>
                          <th>Sisa Barang</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(pengirimanDetails).map(([warna, jumlah]) => (
                          <tr key={warna}>
                            <td>
                              <strong>{warna}</strong>
                            </td>
                            <td>
                              <strong>{jumlah}</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="spkcmt-form-actions">
                <button className="spkcmt-btn-cancel" onClick={() => setShowModal(false)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPopup && selectedSpk && (
        <div className="spkcmt-detail-popup" onClick={closePopup}>
          <div className="spkcmt-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="spkcmt-detail-header">
              <div className="spkcmt-detail-title">
                <span className="spkcmt-detail-eyebrow">SPK CMT Overview</span>
                <h2>Detail SPK #{selectedSpk.id_spk}</h2>
                <p>{selectedSpk.nama_produk || "Produk belum memiliki nama"}</p>
              </div>

              <div className="spkcmt-detail-actions">
                <button type="button" className="spkcmt-detail-action spkcmt-detail-action--pdf" onClick={() => downloadPdf(selectedSpk.id_spk)} title="Download PDF">
                  <FaSave size={14} /> PDF
                </button>
                {detailSkuList.length > 0 && (
                  <button type="button" className="spkcmt-detail-action spkcmt-detail-action--barcode" onClick={() => downloadBarcodePdf(selectedSpk.id_spk)} title="Download Barcode SKU">
                    <FaBarcode size={14} /> Barcode
                  </button>
                )}
                <button className="spkcmt-modal-close" onClick={closePopup}>
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="spkcmt-detail-content-wrapper">
              {/* Pending Alert Banner (Full Width, above dashboard) */}
              {selectedSpk.status === "pending" && (
                <div className="spkcmt-detail-pending-banner">
                  <div className="pending-banner-icon">
                    <FaExclamationTriangle size={20} />
                  </div>
                  <div className="pending-banner-content">
                    <h4>SPK CMT Sedang Ditunda (Pending)</h4>
                    <p>
                      <strong>Sampai:</strong> {detailPendingInfo} <span className="separator">|</span> 
                      <strong>Alasan:</strong> {selectedSpk.alasan_pending || "Tidak ada alasan yang dicantumkan"}
                    </p>
                  </div>
                </div>
              )}

              <div className="spkcmt-detail-dashboard">
                {/* LEFT PANEL: Photo & Identity */}
                <div className="spkcmt-detail-photo-panel">
                  <div className="spkcmt-detail-visual-card-full">
                    {selectedSpk.gambar_produk ? (
                      <img src={`${process.env.REACT_APP_FILE_URL || ""}/storage/${selectedSpk.gambar_produk}`} alt="Produk SPK" className="spkcmt-detail-image-full" />
                    ) : (
                      <div className="spkcmt-detail-image-placeholder-full">
                        <FaImage size={48} style={{ opacity: 0.5, marginBottom: 8 }} />
                        <span>Preview Produk</span>
                        <strong>Belum ada gambar</strong>
                      </div>
                    )}

                    <div className="spkcmt-detail-product-meta-full">
                      <h3>{selectedSpk.nama_produk || "Produk belum tersedia"}</h3>
                      <p>{selectedSpk.nomor_seri ? `Nomor seri ${selectedSpk.nomor_seri}` : "Nomor seri belum tersedia"}</p>

                      <div className="spkcmt-detail-badges">
                        <span className={`spkcmt-detail-badge ${detailStatusClass}`}>{detailStatusLabel}</span>
                        <span className="spkcmt-detail-badge spkcmt-detail-badge--neutral">
                          <FaBoxes size={11} style={{ marginRight: 4 }} />
                          {(selectedSpk.jumlah_produk || 0).toLocaleString("id-ID")} pcs
                        </span>
                        <span className="spkcmt-detail-badge spkcmt-detail-badge--neutral">
                          <FaUser size={11} style={{ marginRight: 4 }} />
                          {selectedSpk.penjahit?.nama_penjahit || "Penjahit belum dipilih"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT PANEL: Unified Data Dashboard */}
                <div className="spkcmt-detail-data-panel">
                  {/* Financial Summary Row (Horizontal) */}
                  <div className="spkcmt-detail-financial-row">
                    <div className="spkcmt-detail-summary-card-horizontal">
                      <div className="card-icon bg-indigo-light">
                        <FaDollarSign className="text-indigo" />
                      </div>
                      <div className="card-content">
                        <span>Total Nilai SPK</span>
                        <strong className="text-indigo">{formatRupiahDisplay(selectedSpk.total_harga || 0)}</strong>
                      </div>
                    </div>
                    <div className="spkcmt-detail-summary-card-horizontal">
                      <div className="card-icon bg-slate-light">
                        <FaDollarSign className="text-slate" />
                      </div>
                      <div className="card-content">
                        <span>Harga Barang</span>
                        <strong>{formatRupiahDisplay(selectedSpk.harga_per_barang || 0)}</strong>
                      </div>
                    </div>
                    <div className="spkcmt-detail-summary-card-horizontal">
                      <div className="card-icon bg-emerald-light">
                        <FaDollarSign className="text-emerald" />
                      </div>
                      <div className="card-content">
                        <span>Harga Jasa / PCS</span>
                        <strong className="text-emerald">{formatRupiahDisplay(selectedSpk.harga_per_jasa || 0)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 3-Columns Grid for Operasional, Varian, Aksesoris & Catatan */}
                  <div className="spkcmt-detail-grid-3col">
                    {/* Column 1: Ringkasan Operasional */}
                    <div className="spkcmt-detail-column">
                      <section className="spkcmt-detail-section spkcmt-detail-section--full-height">
                        <div className="spkcmt-detail-section-header">
                          <div>
                            <span className="spkcmt-detail-eyebrow">Timeline & Milestone</span>
                            <h3>Ringkasan Operasional</h3>
                          </div>
                        </div>

                        <div className="spkcmt-detail-timeline-vertical">
                          <div className="spkcmt-detail-item-v2" style={{ marginBottom: "8px" }}>
                            <div className="item-icon-wrap bg-blue-light">
                              <FaCalendarAlt className="text-blue" />
                            </div>
                            <div className="item-content-wrap">
                              <strong>Tanggal SPK Dibuat</strong>
                              <span>{selectedSpk.created_at ? formatTanggal(selectedSpk.created_at) : "-"}</span>
                            </div>
                          </div>

                          <div className="spkcmt-detail-item-v2" style={{ marginBottom: "8px" }}>
                            <div className="item-icon-wrap bg-purple-light">
                              <FaClock className="text-purple" />
                            </div>
                            <div className="item-content-wrap">
                              <strong>Estimasi Pengerjaan</strong>
                              <span>{estimasiPengerjaanText}</span>
                            </div>
                          </div>

                          <div className="spkcmt-detail-item-v2" style={{ marginBottom: "8px" }}>
                            <div className="item-icon-wrap bg-rose-light">
                              <FaClock className="text-rose" />
                            </div>
                            <div className="item-content-wrap">
                              <strong>Batas Waktu (Deadline)</strong>
                              <span className="text-danger font-semibold">{selectedSpk.deadline ? formatTanggal(selectedSpk.deadline) : "-"}</span>
                            </div>
                          </div>

                          <div className="spkcmt-detail-item-v2" style={{ marginBottom: "8px" }}>
                            <div className="item-icon-wrap bg-emerald-light">
                              <FaCalendarAlt className="text-emerald" />
                            </div>
                            <div className="item-content-wrap">
                              <strong>Tanggal Pengambilan</strong>
                              <span>{selectedSpk.tanggal_ambil ? formatTanggal(selectedSpk.tanggal_ambil) : "-"}</span>
                            </div>
                          </div>

                          <div className="spkcmt-detail-item-v2">
                            <div className="item-icon-wrap bg-amber-light">
                              <FaTag className="text-amber" />
                            </div>
                            <div className="item-content-wrap">
                              <strong>Merek / Brand</strong>
                              <span>{selectedSpk.merek || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>

                    {/* Column 2: Varian & Warna */}
                    <div className="spkcmt-detail-column">
                      <section className="spkcmt-detail-section spkcmt-detail-section--full-height">
                        <div className="spkcmt-detail-section-header">
                          <div>
                            <span className="spkcmt-detail-eyebrow">Detail Spesifikasi</span>
                            <h3>Varian & Warna Produk</h3>
                          </div>
                        </div>

                        <div className="spkcmt-detail-stack-v2">
                          <div className="spkcmt-detail-spec-row">
                            <div className="spec-label">
                              <FaPalette style={{ marginRight: 6 }} /> Komposisi Warna
                            </div>
                            <div className="spec-content">
                              {detailWarnaList.length > 0 ? (
                                <div className="spkcmt-detail-colors-list">
                                  {detailWarnaList.map((warna, index) => (
                                    <span key={index} className="spkcmt-detail-color-chip">
                                      <span className="color-dot"></span>
                                      <span className="color-name">{warna.nama_warna}</span>
                                      <span className="color-qty">{warna.qty} pcs</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">Tidak ada data komposisi warna</span>
                              )}
                            </div>
                          </div>

                          <div className="spkcmt-detail-spec-row">
                            <div className="spec-label">
                              <FaBarcode style={{ marginRight: 6 }} /> Daftar SKU Produk
                            </div>
                            <div className="spec-content">
                              {detailSkuList.length > 0 ? (
                                <div className="spkcmt-detail-sku-list">
                                  {detailSkuList.map((sku, index) => (
                                    <span key={`${sku.sku}-${index}`} className="spkcmt-detail-sku-chip">
                                      {sku.sku}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">Tidak ada SKU terdaftar</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>

                    {/* Column 3: Aksesoris & Catatan */}
                    <div className="spkcmt-detail-column">
                      <section className="spkcmt-detail-section" style={{ marginBottom: "16px" }}>
                        <div className="spkcmt-detail-section-header">
                          <div>
                            <span className="spkcmt-detail-eyebrow">Material Pelengkap</span>
                            <h3>Aksesoris & Perlengkapan</h3>
                          </div>
                        </div>

                        <div className="spkcmt-detail-stack-v2">
                          <div className="spkcmt-detail-spec-row">
                            <div className="spec-label">
                              <FaClipboardList style={{ marginRight: 6 }} /> Aksesoris CMT
                            </div>
                            <div className="spec-content">
                              {detailAksesorisList.length > 0 ? (
                                <div className="spkcmt-detail-aksesoris-list">
                                  {detailAksesorisList.map((item, index) => (
                                    <span key={`${item.nama || "aksesoris"}-${index}`} className="spkcmt-detail-sku-chip spkcmt-detail-sku-chip--soft">
                                      {`${item.nama || "Aksesoris"} (${item.jumlah || 0} ${item.satuan || "pcs"})`}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">{selectedSpk.aksesoris || "Tidak ada aksesoris pendukung"}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="spkcmt-detail-section">
                        <div className="spkcmt-detail-section-header">
                          <div>
                            <span className="spkcmt-detail-eyebrow">Informasi Tambahan</span>
                            <h3>Catatan & Keterangan</h3>
                          </div>
                        </div>

                        <div className="spkcmt-detail-stack-v2">
                          <div className="spkcmt-detail-note-card">
                            <div className="note-card-title">
                              <FaFileAlt size={12} /> Keterangan SPK (Notes)
                            </div>
                            <div className="note-card-body">
                              {selectedSpk.keterangan || "Tidak ada keterangan yang dicantumkan."}
                            </div>
                          </div>

                          <div className="spkcmt-detail-note-card">
                            <div className="note-card-title">
                              <FaFileAlt size={12} /> Catatan Tambahan
                            </div>
                            <div className="note-card-body">
                              {selectedSpk.catatan || "Tidak ada catatan tambahan."}
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeadlineForm && selectedSpk && (
        <div className="spkcmt-modal-overlay" onClick={() => setShowDeadlineForm(false)}>
          <div className="spkcmt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spkcmt-modal-header">
              <h2>⏰ Update Deadline</h2>
              <button className="spkcmt-modal-close" onClick={() => setShowDeadlineForm(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="spkcmt-modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateDeadline(selectedSpk.id_spk);
                }}
              >
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Deadline Baru</label>
                  <input type="date" className="spkcmt-form-input" name="deadline" value={newDeadline.deadline} onChange={handleDeadlineChange} required />
                </div>
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Keterangan</label>
                  <input type="text" className="spkcmt-form-input" name="keterangan" value={newDeadline.keterangan} onChange={handleDeadlineChange} required />
                </div>
                <div className="spkcmt-form-actions">
                  <button type="submit" className="spkcmt-btn-submit">
                    <FaSave /> Simpan
                  </button>
                  <button type="button" className="spkcmt-btn-cancel" onClick={() => setShowDeadlineForm(false)}>
                    <FaTimes /> Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showStatusForm && selectedSpk && (
        <div className="spkcmt-modal-overlay" onClick={() => setShowStatusForm(false)}>
          <div className="spkcmt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spkcmt-modal-header">
              <h2>⚙️ Update Status</h2>
              <button className="spkcmt-modal-close" onClick={() => setShowStatusForm(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="spkcmt-modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateStatus(selectedSpk.id_spk);
                }}
              >
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Status Baru</label>
                  <select className="spkcmt-form-select" name="status" value={newStatus.status} onChange={handleStatusChange}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Keterangan</label>
                  <input type="text" className="spkcmt-form-input" name="keterangan" value={newStatus.keterangan} onChange={handleStatusChange} />
                </div>
                <div className="spkcmt-form-actions">
                  <button type="submit" className="spkcmt-btn-submit">
                    <FaSave /> Simpan
                  </button>
                  <button type="button" className="spkcmt-btn-cancel" onClick={() => setShowStatusForm(false)}>
                    <FaTimes /> Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {false && showForm && (
        <div
          className="spkcmt-modal-overlay"
          onClick={() => {
            setShowForm(false);
            setNewSpk({
              source_type: "cutting",
              source_id: "",
              deadline: "",
              tanggal_ambil: "",
              id_penjahit: "",
              keterangan: "",
              catatan: "",
              markeran: "",
              aksesoris: [],
              handtag: "",
              merek: "",
              harga_barang_dasar: "",
              jenis_harga_barang: "per_pcs",
              harga_per_jasa: "",
              jenis_harga_jasa: "per_barang",
            });
            setPreviewData(null);
          }}
        >
          <div className="spkcmt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spkcmt-modal-header">
              <h2>➕ Tambah Data SPK CMT</h2>
              <button
                className="spkcmt-modal-close"
                onClick={() => {
                  setShowForm(false);
                  setNewSpk({
                    source_type: "cutting",
                    source_id: "",
                    deadline: "",
                    tanggal_ambil: "",
                    id_penjahit: "",
                    keterangan: "",
                    catatan: "",
                    markeran: "",
                    aksesoris: [],
                    handtag: "",
                    merek: "",
                    harga_barang_dasar: "",
                    jenis_harga_barang: "per_pcs",
                    harga_per_jasa: "",
                    jenis_harga_jasa: "per_barang",
                  });
                  setPreviewData(null);
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div className="spkcmt-modal-body">
              <form onSubmit={handleSubmit}>
                <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
                  {/* ===== LEFT: Distribusi Cutting List ===== */}
                  {!selectedSpk && (
                    <div style={{ flex: "0 0 380px", display: "flex", flexDirection: "column" }}>
                      <label className="spkcmt-form-label" style={{ marginBottom: "6px" }}>Distribusi Cutting</label>
                      <input
                        type="text"
                        placeholder="Cari kode seri atau nama produk..."
                        value={searchSourceInput}
                        onChange={(e) => setSearchSourceInput(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 12px", fontSize: "13px", border: "1px solid #cfd8e3",
                          borderBottom: "none", background: "#f8fafc", outline: "none", borderRadius: 0
                        }}
                      />
                      <div style={{
                        border: "1px solid #cfd8e3", background: "#fff", height: "260px",
                        overflowY: "auto", overflowX: "hidden", borderRadius: 0
                      }}>
                        {loadingSource ? (
                          <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>Memuat data...</div>
                        ) : sourceOptions.filter((opt) => {
                          if (!searchSourceInput) return true;
                          return opt.searchText?.includes(searchSourceInput.toLowerCase());
                        }).length === 0 ? (
                          <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>Tidak ada distribusi tersedia</div>
                        ) : (
                          sourceOptions.filter((opt) => {
                            if (!searchSourceInput) return true;
                            return opt.searchText?.includes(searchSourceInput.toLowerCase());
                          }).map((opt) => (
                            <div
                              key={opt.value}
                              onClick={() => setNewSpk({ ...newSpk, source_id: opt.value })}
                              style={{
                                padding: "10px 12px",
                                cursor: "pointer",
                                borderBottom: "1px solid #f1f5f9",
                                background: newSpk.source_id === opt.value ? "#eef3ff" : "#fff",
                                borderLeft: newSpk.source_id === opt.value ? "3px solid #2458ce" : "3px solid transparent",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => { if (newSpk.source_id !== opt.value) e.currentTarget.style.background = "#f8fafc"; }}
                              onMouseLeave={(e) => { if (newSpk.source_id !== opt.value) e.currentTarget.style.background = "#fff"; }}
                            >
                              <div style={{ fontWeight: 700, fontSize: "13px", color: newSpk.source_id === opt.value ? "#1e40af" : "#0f172a" }}>{opt.label}</div>
                              {opt.subtitle && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{opt.subtitle}</div>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* ===== RIGHT: Form Fields ===== */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
                    {selectedSpk && (
                      <div style={{ padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "4px solid #2458ce", fontSize: "13px", color: "#0f172a" }}>
                        <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.03em" }}>Sumber Pekerjaan (Read-Only)</span>
                        <strong style={{ fontSize: "14px", color: "#1e3a8a" }}>{selectedSpk.nomor_seri || selectedSpk.kode_seri || "-"}</strong>
                        {selectedSpk.nama_produk && <span style={{ marginLeft: "6px", color: "#475569" }}>• {selectedSpk.nama_produk}</span>}
                        {selectedSpk.jumlah_produk && <span style={{ marginLeft: "6px", fontWeight: "600", color: "#0f172a" }}>({selectedSpk.jumlah_produk} pcs)</span>}
                      </div>
                    )}
                    {/* Row 1: Penjahit + Harga CMT */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div className="spkcmt-form-group" style={{ marginBottom: 0 }}>
                        <label className="spkcmt-form-label">Penjahit</label>
                        <select className="spkcmt-form-select" value={newSpk.id_penjahit} onChange={(e) => setNewSpk({ ...newSpk, id_penjahit: e.target.value })} required>
                          <option value="">Pilih</option>
                          {penjahitList.map((p) => (
                            <option key={p.id_penjahit} value={p.id_penjahit}>{p.nama_penjahit}</option>
                          ))}
                        </select>
                      </div>
                      <div className="spkcmt-form-group" style={{ marginBottom: 0 }}>
                        <label className="spkcmt-form-label">Harga CMT</label>
                        <div className="spkcmt-currency-input">
                          <span className="currency-prefix">Rp</span>
                          <input type="text" className="spkcmt-form-input" name="harga_per_jasa" value={newSpk.harga_per_jasa} onChange={handleInputChange} placeholder="0" required />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Deadline + Tanggal Ambil */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div className="spkcmt-form-group" style={{ marginBottom: 0 }}>
                        <label className="spkcmt-form-label">Deadline</label>
                        <input type="date" className="spkcmt-form-input" value={newSpk.deadline} onChange={(e) => setNewSpk({ ...newSpk, deadline: e.target.value })} required />
                      </div>
                      <div className="spkcmt-form-group" style={{ marginBottom: 0 }}>
                        <label className="spkcmt-form-label">Tanggal Ambil</label>
                        <input type="date" className="spkcmt-form-input" value={newSpk.tanggal_ambil || ""} onChange={(e) => setNewSpk({ ...newSpk, tanggal_ambil: e.target.value })} />
                      </div>
                    </div>

                    {/* Row 3: Keterangan */}
                    <div className="spkcmt-form-group" style={{ marginBottom: 0 }}>
                      <label className="spkcmt-form-label">Keterangan SPK (Notes)</label>
                      <textarea
                        className="spkcmt-form-input spkcmt-form-textarea"
                        name="keterangan"
                        value={newSpk.keterangan || ""}
                        onChange={(e) => setNewSpk({ ...newSpk, keterangan: e.target.value })}
                        placeholder="Notes SPK otomatis dari Product List atau ketik manual catatan tambahan di sini..."
                        rows={3}
                        style={{ width: "100%", fontFamily: "inherit", resize: "vertical", minHeight: "70px" }}
                      />
                    </div>
                  </div>
                </div>

                {/* ================= PREVIEW / DETAIL SPK ================= */}
                {previewData && (
                  <div className="spkcmt-form-group">
                    <div className="spkcmt-table-container" style={{ border: "1px solid #e2e8f0", borderRadius: 0, overflow: "visible" }}>
                      <table className="spkcmt-table" style={{ margin: 0, width: "100%", tableLayout: "fixed" }}>
                        <colgroup>
                          <col style={{ width: "25%" }} />
                          <col style={{ width: "12%" }} />
                          <col style={{ width: "8%" }} />
                          <col style={{ width: "30%" }} />
                          <col style={{ width: "12%" }} />
                          <col style={{ width: "13%" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>Warna</th>
                            <th style={{ textAlign: "center" }}>Qty</th>
                            <th>Aksesoris</th>
                            <th>Jml</th>
                            <th>Satuan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(previewData.skus) && previewData.skus.length > 0 ? (
                            previewData.skus.map((sku, idx) => (
                              <tr key={idx}>
                                <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sku.display || sku.sku || "-"}</td>
                                <td style={{ whiteSpace: "nowrap" }}>{sku.warna || "-"}</td>
                                <td style={{ whiteSpace: "nowrap", textAlign: "center" }}>{(sku.qty || sku.jumlah || 0).toLocaleString("id-ID")}</td>
                                <td>
                                  <Select
                                    options={aksesorisList.map((a) => ({ value: a.nama_aksesoris, label: a.nama_aksesoris, satuan: a.satuan || "" }))}
                                    value={newSpk.aksesoris?.[idx]?.nama ? { value: newSpk.aksesoris[idx].nama, label: newSpk.aksesoris[idx].nama } : null}
                                    onChange={(selected) => {
                                      const newAksesoris = [...(newSpk.aksesoris || [])];
                                      if (!newAksesoris[idx]) newAksesoris[idx] = { nama: "", jumlah: "", satuan: "" };
                                      newAksesoris[idx].nama = selected ? selected.value : "";
                                      if (selected?.satuan) newAksesoris[idx].satuan = selected.satuan;
                                      setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                                    }}
                                    placeholder="Pilih..."
                                    isClearable
                                    menuPortalTarget={document.body}
                                    styles={{
                                      control: (base) => ({ ...base, minHeight: "34px", height: "34px", fontSize: "12px", borderRadius: 0, border: "1px solid #cbd5e1" }),
                                      valueContainer: (base) => ({ ...base, padding: "0 6px" }),
                                      input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                      indicatorsContainer: (base) => ({ ...base, height: "34px" }),
                                      menu: (base) => ({ ...base, fontSize: "12px" }),
                                      menuPortal: (base) => ({ ...base, zIndex: 9999 })
                                    }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="spkcmt-form-input"
                                    placeholder="0"
                                    value={newSpk.aksesoris?.[idx]?.jumlah || ""}
                                    onChange={(e) => {
                                      const newAksesoris = [...(newSpk.aksesoris || [])];
                                      if (!newAksesoris[idx]) newAksesoris[idx] = { nama: "", jumlah: "", satuan: "" };
                                      newAksesoris[idx].jumlah = e.target.value;
                                      setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                                    }}
                                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", height: "34px", border: "1px solid #cbd5e1", borderRadius: 0 }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="spkcmt-form-input"
                                    placeholder="pcs"
                                    value={newSpk.aksesoris?.[idx]?.satuan || ""}
                                    onChange={(e) => {
                                      const newAksesoris = [...(newSpk.aksesoris || [])];
                                      if (!newAksesoris[idx]) newAksesoris[idx] = { nama: "", jumlah: "", satuan: "" };
                                      newAksesoris[idx].satuan = e.target.value;
                                      setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                                    }}
                                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", height: "34px", border: "1px solid #cbd5e1", borderRadius: 0 }}
                                  />
                                </td>
                              </tr>
                            ))
                          ) : Array.isArray(previewData.warna) && previewData.warna.length > 0 ? (
                            previewData.warna.map((w, idx) => (
                               <tr key={idx}>
                                <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.display || w.sku || "-"}</td>
                                <td style={{ whiteSpace: "nowrap" }}>{w.nama_warna || w.warna || "-"}</td>
                                <td style={{ whiteSpace: "nowrap", textAlign: "center" }}>{(w.qty || w.jumlah || 0).toLocaleString("id-ID")}</td>
                                <td>
                                  <Select
                                    options={aksesorisList.map((a) => ({ value: a.nama_aksesoris, label: a.nama_aksesoris, satuan: a.satuan || "" }))}
                                    value={newSpk.aksesoris?.[idx]?.nama ? { value: newSpk.aksesoris[idx].nama, label: newSpk.aksesoris[idx].nama } : null}
                                    onChange={(selected) => {
                                      const newAksesoris = [...(newSpk.aksesoris || [])];
                                      if (!newAksesoris[idx]) newAksesoris[idx] = { nama: "", jumlah: "", satuan: "" };
                                      newAksesoris[idx].nama = selected ? selected.value : "";
                                      if (selected?.satuan) newAksesoris[idx].satuan = selected.satuan;
                                      setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                                    }}
                                    placeholder="Pilih..."
                                    isClearable
                                    menuPortalTarget={document.body}
                                    styles={{
                                      control: (base) => ({ ...base, minHeight: "34px", height: "34px", fontSize: "12px", borderRadius: 0, border: "1px solid #cbd5e1" }),
                                      valueContainer: (base) => ({ ...base, padding: "0 6px" }),
                                      input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                      indicatorsContainer: (base) => ({ ...base, height: "34px" }),
                                      menu: (base) => ({ ...base, fontSize: "12px" }),
                                      menuPortal: (base) => ({ ...base, zIndex: 9999 })
                                    }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="spkcmt-form-input"
                                    placeholder="0"
                                    value={newSpk.aksesoris?.[idx]?.jumlah || ""}
                                    onChange={(e) => {
                                      const newAksesoris = [...(newSpk.aksesoris || [])];
                                      if (!newAksesoris[idx]) newAksesoris[idx] = { nama: "", jumlah: "", satuan: "" };
                                      newAksesoris[idx].jumlah = e.target.value;
                                      setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                                    }}
                                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", height: "34px", border: "1px solid #cbd5e1", borderRadius: 0 }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="spkcmt-form-input"
                                    placeholder="pcs"
                                    value={newSpk.aksesoris?.[idx]?.satuan || ""}
                                    onChange={(e) => {
                                      const newAksesoris = [...(newSpk.aksesoris || [])];
                                      if (!newAksesoris[idx]) newAksesoris[idx] = { nama: "", jumlah: "", satuan: "" };
                                      newAksesoris[idx].satuan = e.target.value;
                                      setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                                    }}
                                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", height: "34px", border: "1px solid #cbd5e1", borderRadius: 0 }}
                                  />
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" style={{ textAlign: "center", color: "#64748b" }}>Data detail tidak tersedia</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}


                <div className="spkcmt-form-actions">
                  <button type="submit" className="spkcmt-btn-submit">
                    <FaSave /> Simpan SPK CMT
                  </button>
                  <button
                    type="button"
                    className="spkcmt-btn-cancel"
                    onClick={() => {
                      setShowForm(false);
                      setNewSpk({
                        source_type: "cutting",
                        source_id: "",
                        deadline: "",
                        tanggal_ambil: "",
                        id_penjahit: "",
                        keterangan: "",
                        catatan: "",
                        markeran: "",
                        aksesoris: [],
                        handtag: "",
                        merek: "",
                        harga_barang_dasar: "",
                        jenis_harga_barang: "per_pcs",
                        harga_per_jasa: "",
                        jenis_harga_jasa: "per_barang",
                      });
                      setPreviewData(null);
                    }}
                  >
                    <FaTimes /> Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showLogDeadline && (
        <div className="spkcmt-modal-overlay" onClick={() => setShowLogDeadline(false)}>
          <div className="spkcmt-modal spkcmt-log-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spkcmt-modal-header spkcmt-log-modal-header">
              <div className="spkcmt-log-modal-title">
                <span className="spkcmt-detail-eyebrow">Deadline Audit Trail</span>
                <h3>Riwayat Perubahan Deadline</h3>
                <p>{selectedLogSpkId ? `SPK #${selectedLogSpkId}` : "Riwayat perubahan jadwal produksi"}</p>
              </div>
              <button className="spkcmt-modal-close" onClick={() => setShowLogDeadline(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="spkcmt-modal-body spkcmt-log-modal-body">
              {loadingLog ? (
                <div className="spkcmt-log-state">
                  <div className="spkcmt-loading-spinner" />
                  <strong>Memuat riwayat deadline</strong>
                  <span>Data perubahan deadline sedang disiapkan.</span>
                </div>
              ) : Array.isArray(logDeadline) && logDeadline.length === 0 ? (
                <div className="spkcmt-log-state spkcmt-log-state--empty">
                  <div className="spkcmt-log-state-icon">DL</div>
                  <strong>Belum ada riwayat deadline</strong>
                  <span>Perubahan deadline untuk SPK ini belum pernah dicatat.</span>
                </div>
              ) : (
                <>
                  <div className="spkcmt-log-summary">
                    <div className="spkcmt-log-summary-card">
                      <span>Total Perubahan</span>
                      <strong>{logDeadline.length}</strong>
                    </div>
                    <div className="spkcmt-log-summary-card">
                      <span>Perubahan Terakhir</span>
                      <strong>{logDeadline[0]?.tanggal_aktivitas ? formatTanggal(logDeadline[0].tanggal_aktivitas) : "-"}</strong>
                    </div>
                  </div>

                  <div className="spkcmt-log-table-wrap">
                    <table className="spkcmt-log-table">
                      <thead>
                        <tr>
                          <th>Deadline Lama</th>
                          <th>Deadline Baru</th>
                          <th>Tanggal Perubahan</th>
                          <th>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logDeadline.map((log) => (
                          <tr key={log.id_log}>
                            <td>{log.deadline_lama ? formatTanggal(log.deadline_lama) : "-"}</td>
                            <td>{log.deadline_baru ? formatTanggal(log.deadline_baru) : "-"}</td>
                            <td>{log.tanggal_aktivitas ? formatTanggal(log.tanggal_aktivitas) : "-"}</td>
                            <td>{log.keterangan || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="spkcmt-form-actions spkcmt-log-actions">
                <button className="spkcmt-btn-cancel" onClick={() => setShowLogDeadline(false)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPendingModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Set Status Pending</h3>

            <div className="modal-body">
              <p>
                <strong>SPK:</strong> #{selectedSpk?.id_spk}
              </p>
              <p>
                <strong>Penjahit:</strong> {selectedSpk?.penjahit?.nama_penjahit}
              </p>

              <label className="modal-label">Pending sampai tanggal</label>
              <input type="date" value={pendingUntil} onChange={(e) => setPendingUntil(e.target.value)} className="modal-input" min={new Date().toISOString().split("T")[0]} />

              <label className="modal-label" style={{ marginTop: "16px" }}>Alasan atau Keterangan Pending</label>
              <textarea
                value={pendingNote}
                onChange={(e) => setPendingNote(e.target.value)}
                className="modal-input"
                placeholder="Masukkan alasan atau keterangan pending (opsional)"
                rows={4}
                maxLength={500}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 0,
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={closePendingModal} disabled={loadingPending}>
                Batal
              </button>

              <button className="btn-primary" onClick={submitPendingStatus} disabled={loadingPending}>
                {loadingPending ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportPreviewModal && (
        <div className="spkcmt-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="spkcmt-modal" style={{ maxWidth: "90%", width: "1200px" }}>
            <div className="spkcmt-modal-header">
              <div>
                <h2>Preview Import SPK CMT</h2>
                <p style={{ margin: 0, color: "#64748b" }}>
                  Mengecek data dari file <strong>{importFile?.name}</strong> sebelum dimasukkan ke database.
                </p>
              </div>
              <button
                type="button"
                className="spkcmt-modal-close"
                onClick={() => {
                  setShowImportPreviewModal(false);
                  setImportFile(null);
                  setImportPreviewRows([]);
                }}
              >
                &times;
              </button>
            </div>

            <div className="spkcmt-modal-body" style={{ maxHeight: "60vh", overflowY: "auto", padding: "20px 0" }}>
              {importPreviewErrors > 0 && (
                <div style={{
                  margin: "0 24px 16px",
                  padding: "12px 16px",
                  background: "#fef2f2",
                  border: "1px solid #fee2e2",
                  borderRadius: 0,
                  color: "#991b1b",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "14px"
                }}>
                  <FaExclamationTriangle />
                  <span>Ditemukan <strong>{importPreviewErrors}</strong> baris data bermasalah. Pastikan Nama Penjahit dan Nomor Seri telah terisi.</span>
                </div>
              )}

              <div style={{ overflowX: "auto", padding: "0 24px" }}>
                <table className="spkcmt-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Baris</th>
                      <th style={{ padding: "10px 8px" }}>Tgl SPK</th>
                      <th style={{ padding: "10px 8px" }}>Nama Penjahit</th>
                      <th style={{ padding: "10px 8px" }}>Nomor Seri</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Qty</th>
                      <th style={{ padding: "10px 8px" }}>Warna</th>
                      <th style={{ padding: "10px 8px" }}>SKU</th>
                      <th style={{ padding: "10px 8px" }}>Deadline</th>
                      <th style={{ padding: "10px 8px" }}>Tanggal Ambil</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Harga Barang</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Harga Jasa</th>
                      <th style={{ padding: "10px 8px" }}>Merek</th>
                      <th style={{ padding: "10px 8px" }}>Keterangan</th>
                      <th style={{ padding: "10px 8px" }}>Catatan</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Status Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreviewRows.map((row, idx) => (
                      <tr key={idx} style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: row.isValid ? "transparent" : "#fff1f1"
                      }}>
                        <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: "600", color: "#64748b" }}>{row.rowNumber}</td>
                        <td style={{ padding: "10px 8px" }}>{formatDatePreview(row.tglSpk)}</td>
                        <td style={{ padding: "10px 8px", fontWeight: row.penjahit ? "600" : "400", color: row.penjahit ? "#334155" : "#94a3b8" }}>
                          {row.penjahit || "-"}
                        </td>
                        <td style={{ padding: "10px 8px", fontWeight: "600", color: row.nomorSeri ? "#1e3a8a" : "#94a3b8" }}>
                          {row.nomorSeri || "-"}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: "600" }}>
                          {row.qty ? row.qty : "-"}
                        </td>
                        <td style={{ padding: "10px 8px" }}>{row.warna || "-"}</td>
                        <td style={{ padding: "10px 8px" }}>{row.sku || "-"}</td>
                        <td style={{ padding: "10px 8px" }}>{formatDatePreview(row.deadline)}</td>
                        <td style={{ padding: "10px 8px" }}>{formatDatePreview(row.tanggalAmbil)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right" }}>
                          {row.hargaBarang ? `Rp ${Number(row.hargaBarang).toLocaleString("id-ID")}` : "Rp 0"}
                          <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "4px" }}>({row.jenisHargaBarang})</span>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right" }}>
                          {row.hargaJasa ? `Rp ${Number(row.hargaJasa).toLocaleString("id-ID")}` : "Rp 0"}
                          <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "4px" }}>({row.jenisHargaJasa})</span>
                        </td>
                        <td style={{ padding: "10px 8px" }}>{row.merek || "-"}</td>
                        <td style={{ padding: "10px 8px", color: "#64748b", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.keterangan || "-"}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#64748b", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.catatan || "-"}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center" }}>
                          {row.isValid ? (
                            <span style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: 0,
                              background: "#dcfce7",
                              color: "#15803d",
                              fontSize: "11px",
                              fontWeight: "700"
                            }}>
                              OK
                            </span>
                          ) : (
                            <span style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: 0,
                              background: "#fee2e2",
                              color: "#b91c1c",
                              fontSize: "11px",
                              fontWeight: "700"
                            }} title={row.validationMsg}>
                              Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-actions" style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowImportPreviewModal(false);
                  setImportFile(null);
                  setImportPreviewRows([]);
                }}
                disabled={importing}
              >
                Batal
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirmImport}
                disabled={importing}
                style={{
                  background: importPreviewErrors > 0 ? "#f59e0b" : "linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)"
                }}
              >
                {importing ? "Mengimport..." : importPreviewErrors > 0 ? "Tetap Import Data Valid" : "Konfirmasi Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {dropdownSpk && createPortal(
        <div
          style={{
            position: "absolute",
            left: `${dropdownPosition.left}px`,
            top: `${dropdownPosition.top}px`,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 0,
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            zIndex: 9999,
            minWidth: "160px",
            display: "flex",
            flexDirection: "column",
            padding: "4px 0"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setDropdownSpk(null);
              handleDetailClick(dropdownSpk);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px 12px",
              border: "none",
              background: "none",
              textAlign: "left",
              fontSize: "13px",
              cursor: "pointer",
              color: "#374151"
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.background = "none")}
          >
            <FaInfoCircle color="#17a2b8" size={13} /> Detail SPK
          </button>
          <button
            type="button"
            onClick={() => {
              setDropdownSpk(null);
              handleUpdateDeadlineClick(dropdownSpk);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px 12px",
              border: "none",
              background: "none",
              textAlign: "left",
              fontSize: "13px",
              cursor: "pointer",
              color: "#374151"
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.background = "none")}
          >
            <FaClock color="#20c997" size={13} /> Update Deadline
          </button>
          <button
            type="button"
            onClick={() => {
              setDropdownSpk(null);
              handleEditClick(dropdownSpk);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px 12px",
              border: "none",
              background: "none",
              textAlign: "left",
              fontSize: "13px",
              cursor: "pointer",
              color: "#374151"
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.background = "none")}
          >
            <FaEdit color="#fd7e14" size={13} /> Edit SPK
          </button>
          <button
            type="button"
            onClick={() => {
              setDropdownSpk(null);
              handleLogDeadlineClick(dropdownSpk.id_spk);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px 12px",
              border: "none",
              background: "none",
              textAlign: "left",
              fontSize: "13px",
              cursor: "pointer",
              color: "#374151"
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.background = "none")}
          >
            <FaHistory color="#6f42c1" size={13} /> Log Deadline
          </button>
          <button
            type="button"
            onClick={() => {
              setDropdownSpk(null);
              downloadPdf(dropdownSpk.id_spk);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px 12px",
              border: "none",
              background: "none",
              textAlign: "left",
              fontSize: "13px",
              cursor: "pointer",
              color: "#374151"
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.background = "none")}
          >
            <FaSave color="#667eea" size={13} /> Download PDF
          </button>
          <button
            type="button"
            onClick={() => {
              setDropdownSpk(null);
              downloadBarcodePdf(dropdownSpk.id_spk);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px 12px",
              border: "none",
              background: "none",
              textAlign: "left",
              fontSize: "13px",
              cursor: "pointer",
              color: "#374151"
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.background = "none")}
          >
            <FaBarcode color="#e83e8c" size={13} /> Barcode SKU
          </button>
          <button
            type="button"
            onClick={() => {
              setDropdownSpk(null);
              handleDeleteSpk(dropdownSpk.id_spk);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px 12px",
              border: "none",
              background: "none",
              textAlign: "left",
              fontSize: "13px",
              cursor: "pointer",
              color: "#dc2626"
            }}
            onMouseEnter={(e) => (e.target.style.background = "#fee2e2")}
            onMouseLeave={(e) => (e.target.style.background = "none")}
          >
            <FaTrash color="#dc2626" size={13} /> Hapus SPK
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SpkCmt;

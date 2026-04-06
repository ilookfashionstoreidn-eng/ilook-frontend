import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import "./Penjahit.css";
import "./SpkCmt.css";
import axios from "axios";
import Pusher from "pusher-js";
import { toast } from "react-toastify";
import API from "../../api";
import { FaMicrophone, FaArrowUp, FaArrowDown, FaStop, FaImage, FaPlus, FaSave, FaTimes, FaPaperPlane, FaBell, FaHistory, FaEdit, FaClock, FaInfoCircle, FaBarcode } from "react-icons/fa";
import Select from "react-select";

const SWEETALERT_CDN = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js";

const SpkCmt = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

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
  const [statusCount, setStatusCount] = useState({
    belum_diambil: 0,
    sudah_diambil: 0,
    pending: 0,
    completed: 0,
  });
  const [newSpk, setNewSpk] = useState({
    source_type: "",
    source_id: "",

    deadline: "",
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
  }, [newSpk.source_type]);

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
      setPreviewData(response.data?.data ?? response.data);
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
      axios
        .get(`http://localhost:8000/api/spk-chats/${selectedSpkId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
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
      axios
        .post(
          `http://localhost:8000/api/spk-chats/${selectedSpkId}/mark-as-read`,
          {},
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        )
        .then(() => console.log("Marked all messages as read in SPK:", selectedSpkId))
        .catch((err) => console.error("Error marking as read:", err));
    }
  }, [messages]); // ✅ Jalan setiap ada pesan baru

  //useEffect(() => {
  useEffect(() => {
    if (selectedSpkId) {
      axios
        .get(`http://localhost:8000/api/spk-chats/${selectedSpkId}/readers`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((response) => {
          setReaders(response.data); // Simpan semua readers sekaligus
        })
        .catch((error) => console.error("Error fetching chat readers:", error));
    }
  }, [selectedSpkId]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://127.0.0.1:8000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

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
        const response = await axios.get("http://localhost:8000/api/notifications/unread", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

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
      await axios.post(
        "http://localhost:8000/api/notifications/mark-as-read",
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

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

      const response = await axios.post("http://localhost:8000/api/send-message", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
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
      const response = await axios.get(`http://localhost:8000/api/spk/${selectedSpkId}/staff-list`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
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
      const response = await axios.post(
        `http://localhost:8000/api/spk/${selectedSpkId}/invite-staff/${selectedStaffId}`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
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

  // Fungsi untuk format rupiah (input formatting dengan titik)
  const formatRupiah = (value) => {
    if (!value) return "";

    const numeric = value.toString().replace(/\D/g, "");
    if (!numeric) return "";

    return Number(numeric).toLocaleString("id-ID");
  };

  // Fungsi untuk parse dari format rupiah ke angka (untuk disimpan)
  const parseRupiah = (value) => {
    if (!value && value !== 0) return "";
    // Hapus semua karakter non-digit (termasuk titik, spasi, dll)
    const cleaned = value.toString().replace(/\D/g, "");
    return cleaned;
  };

  // Fungsi untuk format rupiah untuk display (dengan "Rp" prefix)
  const formatRupiahDisplay = (value) => {
    if (!value && value !== 0) return "Rp 0";
    const numValue = typeof value === "string" ? parseFloat(value.replace(/\D/g, "")) : value;
    return `Rp ${numValue.toLocaleString("id-ID")}`;
  };

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
    formData.append("id_penjahit", newSpk.id_penjahit);
    formData.append("keterangan", newSpk.keterangan);
    formData.append("catatan", newSpk.catatan);

    formData.append("markeran", newSpk.markeran);
    formData.append("aksesoris", JSON.stringify(newSpk.aksesoris || []));
    formData.append("handtag", newSpk.handtag);
    formData.append("merek", newSpk.merek);

    // 🔴 BARU (HARGA BARANG) - Parse dari format rupiah
    formData.append("harga_barang_dasar", parseRupiah(newSpk.harga_barang_dasar));
    formData.append("jenis_harga_barang", newSpk.jenis_harga_barang);

    // 🔴 JASA - Parse dari format rupiah
    formData.append("harga_per_jasa", parseRupiah(newSpk.harga_per_jasa));
    formData.append("jenis_harga_jasa", newSpk.jenis_harga_jasa);

    try {
      const response = await API.post("/spkcmt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      prependSpkToTable(response.data.data);
      refreshStatusCount();
      setShowForm(false);
      // Reset form
      setNewSpk({
        source_type: "",
        source_id: "",
        deadline: "",
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

  const downloadStaffPdf = (id) => {
    const url = `http://localhost:8000/api/spk-cmt/${id}/download-staff-pdf`;
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

  return (
    <div className="spkcmt-page">
      <div className="spkcmt-shell">
        <header className="spkcmt-topbar">
          <div className="spkcmt-title-group">
            <div className="spkcmt-brand-icon">
              <FaBarcode />
            </div>
            <div className="spkcmt-title-wrap">
              <div className="spkcmt-module-pill">CMT Module</div>
              <h1>Data SPK CMT</h1>
              <p className="spkcmt-header-subtitle">Manajemen SPK CMT, deadline produksi, pengiriman, dan dokumen kerja</p>
            </div>
          </div>

          <div className="spkcmt-header-actions">
            <div className="spkcmt-search-wrap">
              <input
                type="text"
                className="spkcmt-search-input"
                placeholder="Cari nama produk, nomor seri, atau penjahit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button type="button" className="spkcmt-search-clear" onClick={() => setSearchTerm("")} title="Hapus pencarian">
                  x
                </button>
              )}
            </div>
            <button
              type="button"
              className="notif-wrapper"
              onClick={() => {
                setShowNotifPopup((prev) => !prev);
                if (!showNotifPopup) {
                  markNotificationsAsRead();
                }
              }}
            >
              <FaBell className="notif-icon" />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
          </div>

          {showNotifPopup && (
            <div className="spkcmt-notif-popup" onClick={(e) => e.stopPropagation()}>
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
        </header>
        <main className="spkcmt-main">
          <section className="spkcmt-stats">
            <article className="spkcmt-stat-item">
              <div className="spkcmt-stat-label">Total SPK</div>
              <div className="spkcmt-stat-value">{totalSpkOverview}</div>
            </article>
            <article className="spkcmt-stat-item">
              <div className="spkcmt-stat-label">Belum Diambil</div>
              <div className="spkcmt-stat-value spkcmt-stat-value-warning">{statusCount.belum_diambil || 0}</div>
            </article>
            <article className="spkcmt-stat-item">
              <div className="spkcmt-stat-label">Pending</div>
              <div className="spkcmt-stat-value spkcmt-stat-value-danger">{statusCount.pending || 0}</div>
            </article>
            <article className="spkcmt-stat-item">
              <div className="spkcmt-stat-label">Completed</div>
              <div className="spkcmt-stat-value spkcmt-stat-value-success">{statusCount.completed || 0}</div>
            </article>
          </section>

          <section className="spkcmt-table-wrapper">
            <div className="spkcmt-table-header">
              <div>
                <h3>Semua Data SPK CMT</h3>
                <p>{activeFilterCount > 0 ? `Menampilkan ${filteredSpk.length} data sesuai filter` : `Menampilkan ${filteredSpk.length} data pada halaman ini`}</p>
              </div>
              <button type="button" className="spkcmt-btn-primary" onClick={() => setShowForm(true)}>
                <FaPlus /> Tambah SPK CMT
              </button>
            </div>

            <div className="spkcmt-filter-section">
              <div className="spkcmt-filter-wrap">
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="spkcmt-filter-select">
                  <option value="">Semua Status SPK</option>
                  <option value="belum_diambil">Belum Diambil</option>
                  <option value="sudah_diambil">Sudah Diambil</option>
                  <option value="pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
                {selectedStatus && (
                  <span className="spkcmt-filter-badge" onClick={() => setSelectedStatus("")} title="Hapus filter">
                    {getStatusLabel(selectedStatus)} x
                  </span>
                )}
              </div>

              <div className="spkcmt-filter-wrap">
                <select value={selectedPenjahit} onChange={(e) => setSelectedPenjahit(e.target.value)} className="spkcmt-filter-select">
                  <option value="">Semua Penjahit</option>
                  {penjahitList.map((penjahit) => (
                    <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                      {penjahit.nama_penjahit}
                    </option>
                  ))}
                </select>
                {selectedPenjahit && (
                  <span className="spkcmt-filter-badge" onClick={() => setSelectedPenjahit("")} title="Hapus filter">
                    CMT x
                  </span>
                )}
              </div>

              <div className="spkcmt-filter-wrap">
                <select value={selectedProduk} onChange={(e) => setSelectedProduk(e.target.value)} className="spkcmt-filter-select">
                  <option value="">Semua Produk</option>
                  {produkList.map((produk) => (
                    <option key={produk.id} value={produk.id}>
                      {produk.nama_produk}
                    </option>
                  ))}
                </select>
                {selectedProduk && (
                  <span className="spkcmt-filter-badge" onClick={() => setSelectedProduk("")} title="Hapus filter">
                    Produk x
                  </span>
                )}
              </div>

              <div className="spkcmt-filter-wrap">
                <select value={selectedKategori} onChange={(e) => setSelectedKategori(e.target.value)} className="spkcmt-filter-select">
                  <option value="">Semua Kategori</option>
                  {kategoriList.map((kategori, index) => (
                    <option key={index} value={kategori}>
                      {kategori}
                    </option>
                  ))}
                </select>
                {selectedKategori && (
                  <span className="spkcmt-filter-badge" onClick={() => setSelectedKategori("")} title="Hapus filter">
                    Kategori x
                  </span>
                )}
              </div>

              <div className="spkcmt-filter-wrap">
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="spkcmt-filter-select">
                  <option value="desc">Urutan Terbaru</option>
                  <option value="asc">Urutan Terlama</option>
                </select>
              </div>

              {activeFilterCount > 0 && (
                <button type="button" className="spkcmt-btn-secondary" onClick={resetFilters}>
                  Reset Filter
                </button>
              )}
            </div>

            {loading ? (
              <div className="spkcmt-loading">
                <div className="spkcmt-spinner"></div>
                <div className="spkcmt-loading-title">Memuat data SPK CMT...</div>
                <div className="spkcmt-loading-subtitle">Mohon tunggu sebentar</div>
              </div>
            ) : error ? (
              <div className="spkcmt-empty-state spkcmt-empty-block">
                <div className="spkcmt-empty-icon">!</div>
                <h3 className="spkcmt-empty-title error">Terjadi Kesalahan</h3>
                <p className="spkcmt-empty-text">{error}</p>
                <button type="button" className="spkcmt-btn-primary" onClick={() => window.location.reload()}>
                  Muat Ulang Halaman
                </button>
              </div>
            ) : filteredSpk.length === 0 ? (
              <div className="spkcmt-empty-state spkcmt-empty-block">
                <div className="spkcmt-empty-icon">-</div>
                <h3 className="spkcmt-empty-title">Belum Ada Data SPK CMT</h3>
                <p className="spkcmt-empty-text">
                  {searchTerm || selectedStatus || selectedPenjahit || selectedProduk || selectedKategori
                    ? "Tidak ada SPK yang sesuai dengan filter yang Anda pilih"
                    : "Mulai dengan menambahkan SPK CMT pertama Anda"}
                </p>
                {activeFilterCount > 0 && (
                  <button type="button" className="spkcmt-btn-secondary" onClick={resetFilters}>
                    Hapus Filter
                  </button>
                )}
                {activeFilterCount === 0 && (
                  <button type="button" className="spkcmt-btn-primary" onClick={() => setShowForm(true)}>
                    <FaPlus /> Tambah SPK Pertama
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="spkcmt-table-scroll">
                  <table className="spkcmt-table spkcmt-table-responsive">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Nama Baju</th>
                        <th>Penjahit</th>
                        <th>
                          <button type="button" className="spkcmt-sort-trigger" onClick={handleOrderChange}>
                            <span>Sisa Hari</span>
                            {sortOrder === "asc" ? <FaArrowDown size={11} /> : <FaArrowUp size={11} />}
                          </button>
                        </th>
                        <th>Waktu</th>
                        <th className="spkcmt-text-right">Jml Produk</th>
                        <th className="spkcmt-text-right">Jml Kirim</th>
                        <th className="spkcmt-text-right">Sisa</th>
                        <th>Status</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSpk.map((spk, index) => {
                        const latestPengiriman = spk.pengiriman?.length ? [...spk.pengiriman].sort((a, b) => a.id_pengiriman - b.id_pengiriman).at(-1) : null;
                        const sisaBarang = latestPengiriman?.sisa_barang ?? spk.jumlah_produk ?? 0;
                        const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;

                        return (
                          <tr key={spk.id_spk}>
                            <td>
                              <strong className="spkcmt-row-id">{rowNumber}</strong>
                            </td>
                            <td>
                              <div className="spkcmt-row-product">
                                <strong>{spk.nama_produk || "-"}</strong>
                                <span>{spk.nomor_seri ? `Nomor seri ${spk.nomor_seri}` : "Nomor seri belum tersedia"}</span>
                              </div>
                            </td>
                            <td>{spk.penjahit?.nama_penjahit || "-"}</td>
                            <td>
                              <span className="spkcmt-day-badge" style={{ color: getSisaHariColor(spk.sisa_hari) }}>
                                {spk.sisa_hari ?? "-"}
                              </span>
                            </td>
                            <td>{spk.waktu_pengerjaan ?? "-"}</td>
                            <td className="spkcmt-text-right">{(spk.jumlah_produk || 0).toLocaleString("id-ID")}</td>
                            <td className="spkcmt-text-right">
                              <button type="button" onClick={() => handlePengirimanDetailClick(spk, "jumlah_kirim")} className="spkcmt-chip-button spkcmt-chip-button--indigo" title="Klik untuk detail pengiriman">
                                {(spk.total_barang_dikirim || 0).toLocaleString("id-ID")}
                              </button>
                            </td>
                            <td className="spkcmt-text-right">
                              <button type="button" onClick={() => handlePengirimanDetailClick(spk, "sisa_barang")} className="spkcmt-chip-button spkcmt-chip-button--emerald" title="Klik untuk detail sisa barang">
                                {sisaBarang.toLocaleString("id-ID")}
                              </button>
                            </td>
                            <td>
                              <select
                                value={spk.status || "belum_diambil"}
                                onChange={(e) => {
                                  const newStatus = e.target.value;

                                  if (newStatus === "pending") {
                                    openPendingModal(spk);
                                  } else {
                                    handleStatusChangeDirect(spk.id_spk, newStatus);
                                  }
                                }}
                                className="spkcmt-status-select"
                                style={{ backgroundColor: getStatusColor(spk.status) }}
                                title={getStatusLabel(spk.status)}
                              >
                                <option value="belum_diambil">Belum Diambil</option>
                                <option value="sudah_diambil">Sudah Diambil</option>
                                <option value="pending">Pending</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </td>
                            <td>
                              <div className="spkcmt-action-group">
                                <button type="button" className="spkcmt-btn-icon spkcmt-btn-icon-info" onClick={() => handleDetailClick(spk)} title="Detail">
                                  <FaInfoCircle size={13} />
                                </button>
                                <button type="button" className="spkcmt-btn-icon spkcmt-btn-icon-deadline" onClick={() => handleUpdateDeadlineClick(spk)} title="Update Deadline">
                                  <FaClock size={13} />
                                </button>
                                <button type="button" className="spkcmt-btn-icon spkcmt-btn-icon-edit" onClick={() => handleEditClick(spk)} title="Edit">
                                  <FaEdit size={13} />
                                </button>
                                <button type="button" className="spkcmt-btn-icon spkcmt-btn-icon-log" onClick={() => handleLogDeadlineClick(spk.id_spk)} title="Log Deadline">
                                  <FaHistory size={13} />
                                </button>
                                <button type="button" onClick={() => downloadPdf(spk.id_spk)} className="spkcmt-btn-icon spkcmt-btn-icon-download" title="Download PDF">
                                  <FaSave size={13} />
                                </button>
                                <button type="button" onClick={() => downloadBarcodePdf(spk.id_spk)} className="spkcmt-btn-icon spkcmt-btn-icon-barcode" title="Download Barcode SKU">
                                  <FaBarcode size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="spkcmt-pagination">
                  <button type="button" className="spkcmt-pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                    Prev
                  </button>
                  <span className="spkcmt-pagination-info">
                    Halaman {currentPage} dari {lastPage}
                  </span>
                  <button type="button" className="spkcmt-pagination-btn" disabled={currentPage === lastPage} onClick={() => setCurrentPage(currentPage + 1)}>
                    Next
                  </button>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
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

            <div className="spkcmt-detail-content">
              <aside className="spkcmt-detail-aside">
                <div className="spkcmt-detail-visual-card">
                  {selectedSpk.gambar_produk ? (
                    <img src={`http://localhost:8000/storage/${selectedSpk.gambar_produk}`} alt="Gambar Produk" className="spkcmt-detail-image" />
                  ) : (
                    <div className="spkcmt-detail-image-placeholder">
                      <span>Preview Produk</span>
                      <strong>Belum ada gambar</strong>
                    </div>
                  )}

                  <div className="spkcmt-detail-product-meta">
                    <h3>{selectedSpk.nama_produk || "Produk belum tersedia"}</h3>
                    <p>{selectedSpk.nomor_seri ? `Nomor seri ${selectedSpk.nomor_seri}` : "Nomor seri belum tersedia"}</p>

                    <div className="spkcmt-detail-badges">
                      <span className={`spkcmt-detail-badge ${detailStatusClass}`}>{detailStatusLabel}</span>
                      <span className="spkcmt-detail-badge spkcmt-detail-badge--neutral">{(selectedSpk.jumlah_produk || 0).toLocaleString("id-ID")} pcs</span>
                      <span className="spkcmt-detail-badge spkcmt-detail-badge--neutral">{selectedSpk.penjahit?.nama_penjahit || "Penjahit belum dipilih"}</span>
                    </div>
                  </div>
                </div>

                <div className="spkcmt-detail-summary-grid">
                  <div className="spkcmt-detail-summary-card">
                    <span>Total Nilai</span>
                    <strong>{formatRupiahDisplay(selectedSpk.total_harga || 0)}</strong>
                  </div>
                  <div className="spkcmt-detail-summary-card">
                    <span>Harga Barang</span>
                    <strong>{formatRupiahDisplay(selectedSpk.harga_per_barang || 0)}</strong>
                  </div>
                  <div className="spkcmt-detail-summary-card">
                    <span>Harga Jasa / PCS</span>
                    <strong>{formatRupiahDisplay(selectedSpk.harga_per_jasa || 0)}</strong>
                  </div>
                  <div className="spkcmt-detail-summary-card">
                    <span>Deadline</span>
                    <strong>{selectedSpk.deadline ? formatTanggal(selectedSpk.deadline) : "-"}</strong>
                  </div>
                </div>
              </aside>

              <div className="spkcmt-detail-main">
                <section className="spkcmt-detail-section">
                  <div className="spkcmt-detail-section-header">
                    <div>
                      <span className="spkcmt-detail-eyebrow">Informasi Produksi</span>
                      <h3>Ringkasan Operasional</h3>
                    </div>
                  </div>

                  <div className="spkcmt-detail-info-grid">
                    <div className="spkcmt-detail-item">
                      <strong>Nama Produk</strong>
                      <span>{selectedSpk.nama_produk || "-"}</span>
                    </div>
                    <div className="spkcmt-detail-item">
                      <strong>Penjahit</strong>
                      <span>{selectedSpk.penjahit?.nama_penjahit || "-"}</span>
                    </div>
                    <div className="spkcmt-detail-item">
                      <strong>Jumlah Produk</strong>
                      <span>{(selectedSpk.jumlah_produk || 0).toLocaleString("id-ID")} pcs</span>
                    </div>
                    <div className="spkcmt-detail-item">
                      <strong>Waktu Pengerjaan</strong>
                      <span>{selectedSpk.waktu_pengerjaan || "-"}</span>
                    </div>
                    <div className="spkcmt-detail-item">
                      <strong>Tanggal SPK</strong>
                      <span>{selectedSpk.created_at ? formatTanggal(selectedSpk.created_at) : "-"}</span>
                    </div>
                    <div className="spkcmt-detail-item">
                      <strong>Deadline</strong>
                      <span>{selectedSpk.deadline ? formatTanggal(selectedSpk.deadline) : "-"}</span>
                    </div>
                    <div className="spkcmt-detail-item">
                      <strong>Status</strong>
                      <span>{detailStatusLabel}</span>
                    </div>
                    <div className="spkcmt-detail-item">
                      <strong>Merek</strong>
                      <span>{selectedSpk.merek || "-"}</span>
                    </div>
                  </div>
                </section>

                <section className="spkcmt-detail-section">
                  <div className="spkcmt-detail-section-header">
                    <div>
                      <span className="spkcmt-detail-eyebrow">Varian Produk</span>
                      <h3>Warna dan SKU</h3>
                    </div>
                  </div>

                  <div className="spkcmt-detail-stack">
                    <div className="spkcmt-detail-item">
                      <strong>Komposisi Warna</strong>
                      <span>{detailWarnaList.length > 0 ? detailWarnaList.map((warna) => `${warna.nama_warna} (${warna.qty})`).join(", ") : "Tidak ada data warna"}</span>
                    </div>

                    <div className="spkcmt-detail-item">
                      <strong>Daftar SKU</strong>
                      {detailSkuList.length > 0 ? (
                        <div className="spkcmt-detail-sku-list">
                          {detailSkuList.map((sku, index) => (
                            <span key={`${sku.sku}-${index}`} className="spkcmt-detail-sku-chip">
                              {sku.sku}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>Tidak ada SKU</span>
                      )}
                    </div>
                  </div>
                </section>

                <section className="spkcmt-detail-section">
                  <div className="spkcmt-detail-section-header">
                    <div>
                      <span className="spkcmt-detail-eyebrow">Pendukung Produksi</span>
                      <h3>Aksesoris dan Catatan</h3>
                    </div>
                  </div>

                  <div className="spkcmt-detail-stack">
                    <div className="spkcmt-detail-item">
                      <strong>Aksesoris</strong>
                      {detailAksesorisList.length > 0 ? (
                        <div className="spkcmt-detail-sku-list">
                          {detailAksesorisList.map((item, index) => (
                            <span key={`${item.nama || "aksesoris"}-${index}`} className="spkcmt-detail-sku-chip spkcmt-detail-sku-chip--soft">
                              {`${item.nama || "Aksesoris"} (${item.jumlah || 0} ${item.satuan || "pcs"})`}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>{selectedSpk.aksesoris || "Tidak ada aksesoris"}</span>
                      )}
                    </div>

                    <div className="spkcmt-detail-item">
                      <strong>Catatan</strong>
                      <span>{selectedSpk.catatan || "Tidak ada catatan tambahan"}</span>
                    </div>

                    {selectedSpk.status === "pending" && (
                      <>
                        <div className="spkcmt-detail-item">
                          <strong>Pending Sampai</strong>
                          <span>{detailPendingInfo}</span>
                        </div>
                        <div className="spkcmt-detail-item">
                          <strong>Alasan Pending</strong>
                          <span>{selectedSpk.alasan_pending || "Belum ada alasan pending"}</span>
                        </div>
                      </>
                    )}
                  </div>
                </section>
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

      {showForm && (
        <div
          className="spkcmt-modal-overlay"
          onClick={() => {
            setShowForm(false);
            setNewSpk({
              source_type: "",
              source_id: "",
              deadline: "",
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
                    source_type: "",
                    source_id: "",
                    deadline: "",
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
                {/* ================= SOURCE TYPE ================= */}
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Sumber SPK</label>
                  <select
                    className="spkcmt-form-select"
                    value={newSpk.source_type}
                    onChange={(e) =>
                      setNewSpk({
                        ...newSpk,
                        source_type: e.target.value,
                        source_id: "",
                      })
                    }
                    required
                  >
                    <option value="">Pilih</option>
                    <option value="cutting">Dari Cutting</option>
                    <option value="jasa">Dari SPK Jasa</option>
                  </select>
                </div>

                {/* ================= SOURCE ID ================= */}
                {newSpk.source_type && (
                  <div className="spkcmt-form-group">
                    <label className="spkcmt-form-label">{newSpk.source_type === "cutting" ? "Distribusi Cutting" : "SPK Jasa"}</label>

                    <Select
                      options={sourceOptions}
                      value={sourceOptions.find((opt) => opt.value === newSpk.source_id) || null}
                      onChange={(selected) =>
                        setNewSpk({
                          ...newSpk,
                          source_id: selected ? selected.value : "",
                        })
                      }
                      placeholder={newSpk.source_type === "cutting" ? "Cari kode distribusi, nama produk, atau jumlah..." : "Cari SPK jasa atau kode seri..."}
                      isSearchable
                      isClearable
                      isLoading={loadingSource}
                      isDisabled={loadingSource}
                      filterOption={(candidate, inputValue) => {
                        const query = inputValue.trim().toLowerCase();
                        if (!query) return true;
                        return candidate.data.searchText?.includes(query);
                      }}
                      formatOptionLabel={(option, { context }) => {
                        if (context === "value") {
                          return option.label;
                        }

                        return (
                          <div className="spkcmt-source-option">
                            <strong>{option.label}</strong>
                            {option.subtitle && <span>{option.subtitle}</span>}
                          </div>
                        );
                      }}
                      noOptionsMessage={({ inputValue }) => {
                        if (loadingSource) return "Memuat data...";
                        if (inputValue) return `Tidak ditemukan untuk "${inputValue}"`;
                        return newSpk.source_type === "cutting" ? "Tidak ada distribusi cutting tersedia" : "Tidak ada SPK Jasa tersedia";
                      }}
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: "46px",
                          border: "1px solid #cfd8e3",
                          borderRadius: "12px",
                          fontSize: "14px",
                          boxShadow: "none",
                          "&:hover": {
                            borderColor: "#2458ce",
                          },
                        }),
                        option: (base, state) => ({
                          ...base,
                          padding: "10px 12px",
                          backgroundColor: state.isFocused ? "#eef4ff" : "#ffffff",
                          color: "#0f172a",
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                          border: "1px solid #dbe5f1",
                          borderRadius: "14px",
                          overflow: "hidden",
                          boxShadow: "0 18px 36px -26px rgba(15, 23, 42, 0.35)",
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "#94a3b8",
                        }),
                        input: (base) => ({
                          ...base,
                          color: "#0f172a",
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: "#0f172a",
                        }),
                      }}
                    />
                    <small className="spkcmt-field-hint">Ketik kode distribusi seperti `AR-05A`, nama produk, atau jumlah pcs untuk mempercepat pencarian.</small>
                  </div>
                )}

                {/* ================= PREVIEW ================= */}
                {previewData && (
                  <div className="spkcmt-preview-card">
                    <div className="spkcmt-preview-header">
                      <h3>📋 Preview SPK yang Dipilih</h3>
                    </div>

                    <div className="spkcmt-preview-content">
                      {/* Foto Produk (Cutting) */}
                      {previewData.gambar_produk && (
                        <div style={{ marginBottom: "16px", textAlign: "center" }}>
                          <img
                            src={`http://localhost:8000/storage/${previewData.gambar_produk}`}
                            alt={previewData.nama_produk || "Gambar Produk"}
                            style={{
                              maxWidth: "100%",
                              maxHeight: "300px",
                              borderRadius: "8px",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                              objectFit: "contain",
                            }}
                          />
                        </div>
                      )}

                      <div className="spkcmt-preview-item">
                        <strong>Kode Seri:</strong>
                        <span>{previewData.kode_seri || "-"}</span>
                      </div>

                      {previewData.nomor_seri && (
                        <div className="spkcmt-preview-item">
                          <strong>Nomor Seri:</strong>
                          <span>{previewData.nomor_seri}</span>
                        </div>
                      )}

                      <div className="spkcmt-preview-item">
                        <strong>Nama Produk:</strong>
                        <span>{previewData.nama_produk || "-"}</span>
                      </div>

                      {previewData.kategori_produk && (
                        <div className="spkcmt-preview-item">
                          <strong>Kategori Produk:</strong>
                          <span>{previewData.kategori_produk}</span>
                        </div>
                      )}

                      <div className="spkcmt-preview-item">
                        <strong>Jumlah Produk:</strong>
                        <span className="spkcmt-preview-highlight">{(previewData.jumlah_produk || 0).toLocaleString("id-ID")} pcs</span>
                      </div>

                      {/* Warna */}
                      {Array.isArray(previewData.warna) && previewData.warna.length > 0 && (
                        <div className="spkcmt-preview-item">
                          <strong>Warna & Jumlah:</strong>
                          <div className="spkcmt-preview-warna">
                            {previewData.warna.map((w, idx) => (
                              <div key={idx} className="spkcmt-preview-warna-item">
                                <span className="spkcmt-warna-badge">{w.nama_warna || w.warna}</span>
                                <span className="spkcmt-warna-qty">{(w.qty || w.jumlah || 0).toLocaleString("id-ID")} pcs</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tukang Jasa */}
                      {previewData.tukang_jasa && (
                        <div className="spkcmt-preview-item">
                          <strong>Tukang Jasa:</strong>
                          <span>{previewData.tukang_jasa.nama}</span>
                        </div>
                      )}

                      {/* SKU */}
                      {Array.isArray(previewData.skus) && previewData.skus.length > 0 && (
                        <div className="spkcmt-preview-item">
                          <strong>SKU:</strong>
                          <div className="spkcmt-preview-warna" style={{ marginTop: "8px" }}>
                            {previewData.skus.map((sku, idx) => (
                              <div key={idx} className="spkcmt-preview-warna-item" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
                                {sku.display || sku.sku}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ================= PENJAHIT ================= */}
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Penjahit</label>
                  <select className="spkcmt-form-select" value={newSpk.id_penjahit} onChange={(e) => setNewSpk({ ...newSpk, id_penjahit: e.target.value })} required>
                    <option value="">Pilih</option>
                    {penjahitList.map((p) => (
                      <option key={p.id_penjahit} value={p.id_penjahit}>
                        {p.nama_penjahit}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ================= DEADLINE ================= */}
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Deadline</label>
                  <input type="date" className="spkcmt-form-input" value={newSpk.deadline} onChange={(e) => setNewSpk({ ...newSpk, deadline: e.target.value })} required />
                </div>

                {/* ================= KETERANGAN ================= */}
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Keterangan</label>
                  <textarea className="spkcmt-form-textarea" value={newSpk.keterangan} onChange={(e) => setNewSpk({ ...newSpk, keterangan: e.target.value })} />
                </div>

                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Catatan</label>
                  <textarea className="spkcmt-form-textarea" value={newSpk.catatan} onChange={(e) => setNewSpk({ ...newSpk, catatan: e.target.value })} />
                </div>

                {/* ================= AKSESORIS ================= */}
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Aksesoris</label>
                  {Array.isArray(newSpk.aksesoris) && newSpk.aksesoris.map((item, index) => (
                    <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <Select
                          options={aksesorisList.map((a) => ({
                            value: a.nama_aksesoris,
                            label: a.nama_aksesoris,
                            satuan: a.satuan || ""
                          }))}
                          value={item.nama ? { value: item.nama, label: item.nama } : null}
                          onChange={(selectedOption) => {
                            const newAksesoris = [...newSpk.aksesoris];
                            newAksesoris[index].nama = selectedOption ? selectedOption.value : "";
                            if (selectedOption && selectedOption.satuan) {
                              newAksesoris[index].satuan = selectedOption.satuan;
                            }
                            setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                          }}
                          placeholder="Pilih Aksesoris..."
                          isClearable
                          styles={{
                            control: (base) => ({
                              ...base,
                              height: "40px",
                              minHeight: "40px",
                              borderRadius: "8px",
                              borderColor: "#e2e8f0",
                              boxShadow: "none",
                              "&:hover": { borderColor: "#cbd5e1" }
                            }),
                            menu: (base) => ({ ...base, zIndex: 9999 })
                          }}
                        />
                      </div>
                      <input type="number" className="spkcmt-form-input" placeholder="Jumlah" value={item.jumlah} style={{ width: "100px" }} onChange={(e) => {
                        const newAksesoris = [...newSpk.aksesoris];
                        newAksesoris[index].jumlah = e.target.value;
                        setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                      }} required />
                      <input type="text" className="spkcmt-form-input" placeholder="Satuan (Pcs, dsb)" value={item.satuan} style={{ width: "120px" }} onChange={(e) => {
                        const newAksesoris = [...newSpk.aksesoris];
                        newAksesoris[index].satuan = e.target.value;
                        setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                      }} required />
                      <button type="button" className="spkcmt-btn-cancel" onClick={() => {
                        const newAksesoris = newSpk.aksesoris.filter((_, i) => i !== index);
                        setNewSpk({ ...newSpk, aksesoris: newAksesoris });
                      }} style={{ padding: "8px 12px", minWidth: "fit-content", alignSelf: "center", marginBottom: "0" }}>
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="spkcmt-btn-primary" onClick={() => {
                    setNewSpk({ ...newSpk, aksesoris: [...(newSpk.aksesoris || []), { nama: "", jumlah: "", satuan: "" }] });
                  }} style={{ width: "fit-content", padding: "8px 12px", marginTop: "5px", paddingLeft: "15px", paddingRight: "15px" }}>
                    <FaPlus style={{ marginRight: "5px" }} /> Tambah Aksesoris
                  </button>
                </div>

                {/* ================= ATRIBUT ================= */}

                {/* ================= HARGA BARANG ================= */}
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Jenis Harga Produk</label>
                  <input type="text" className="spkcmt-form-input" value="Per Pcs" disabled />
                </div>

                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Harga Produk</label>
                  <div className="spkcmt-currency-input">
                    <span className="currency-prefix">Rp</span>
                    <input type="text" className="spkcmt-form-input" name="harga_barang_dasar" value={newSpk.harga_barang_dasar} onChange={handleInputChange} placeholder="0" required />
                  </div>
                  {/* PREVIEW */}
                  {newSpk.harga_barang_dasar && (
                    <div className="spkcmt-currency-preview">💰 Harga / pcs: {formatRupiahDisplay(newSpk.jenis_harga_barang === "per_lusin" ? parseRupiah(newSpk.harga_barang_dasar) / 12 : parseRupiah(newSpk.harga_barang_dasar))}</div>
                  )}
                </div>

                {/* ================= HARGA JASA ================= */}
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Jenis Harga Jasa</label>
                  <select className="spkcmt-form-select" value={newSpk.jenis_harga_jasa} onChange={(e) => setNewSpk({ ...newSpk, jenis_harga_jasa: e.target.value })}>
                    <option value="per_barang">Pcs</option>
                    <option value="per_lusin">Lusin</option>
                  </select>
                </div>

                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Harga Jasa</label>
                  <div className="spkcmt-currency-input">
                    <span className="currency-prefix">Rp</span>
                    <input type="text" className="spkcmt-form-input" name="harga_per_jasa" value={newSpk.harga_per_jasa} onChange={handleInputChange} placeholder="0" required />
                  </div>
                </div>

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
                        source_type: "",
                        source_id: "",
                        deadline: "",
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
                  borderRadius: "8px",
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
    </div>
  );
};

export default SpkCmt;

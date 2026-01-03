import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import "./Penjahit.css";
import "./SpkCmt.css";
import axios from "axios";
import Pusher from "pusher-js";
import { toast } from "react-toastify";
import API from "../../api";
import {
  FaMicrophone,
  FaArrowUp,
  FaArrowDown,
  FaPause,
  FaStop,
  FaMicrophoneSlash,
  FaImage,
  FaPhotoVideo,
  FaVideo,
  FaVideoSlash,
  FaPlus,
  FaTrash,
  FaSave,
  FaTimes,
  FaPaperPlane,
  FaBell,
  FaRegEye,
  FaCog,
  FaEdit,
  FaClock,
  FaInfoCircle,
  FaComments,
  FaCommentDots,
  FaComment,
} from "react-icons/fa";
import Select from "react-select";

const SpkCmt = () => {
  const [spkCmtData, setSpkCmtData] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpk, setSelectedSpk] = useState(null);
  const [selectedSpkId, setSelectedSpkId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pengirimanDetails, setPengirimanDetails] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
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
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPenjahit, setSelectedPenjahit] = useState("");
  const [produkList, setProdukList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [sortBy, setSortBy] = useState("created_at"); // Default sorting by created_at
  const [sortOrder, setSortOrder] = useState("desc"); // Default descending
  const [selectedProduk, setSelectedProduk] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("");
  const [allData, setAllData] = useState(false);
  const [selectedSisaHari, setSelectedSisaHari] = useState("");
  const [distribusiList, setDistribusiList] = useState([]);
  const [spkJasaList, setSpkJasaList] = useState([]);
  const [previewData, setPreviewData] = useState(null);

  const [newSpk, setNewSpk] = useState({
    source_type: "",
    source_id: "",

    deadline: "",
    id_penjahit: "",
    keterangan: "",
    catatan: "",

    markeran: "",
    aksesoris: "",
    handtag: "",
    merek: "",

    // 🔴 BARU
    harga_barang_dasar: "",
    jenis_harga_barang: "per_pcs",

    // 🔴 JASA
    harga_per_jasa: "",
    jenis_harga_jasa: "per_barang",
  });

  useEffect(() => {
    if (newSpk.source_type === "cutting") {
      fetchDistribusi();
    }

    if (newSpk.source_type === "jasa") {
      fetchSpkJasa();
    }

    // Reset preview ketika source_type berubah
    setPreviewData(null);
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
      } else if (newSpk.source_type === "jasa") {
        response = await API.get(`/SpkJasa/${newSpk.source_id}`);
      }

      if (response?.data) {
        setPreviewData(response.data);
      }
    } catch (error) {
      console.error("Error fetching preview:", error);
      setPreviewData(null);
    }
  }, [newSpk.source_id, newSpk.source_type]);

  // Fetch preview ketika source_id dipilih
  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const fetchDistribusi = async () => {
    try {
      const res = await API.get("/spk-cutting-distribusi");
      setDistribusiList(res.data.data || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSpkJasa = async () => {
    try {
      const res = await API.get("/SpkJasa");

      console.log("SPK JASA PAGINATION:", res.data);
      console.log("SPK JASA LIST:", res.data.data);

      setSpkJasaList(res.data.data); // ⬅️ WAJIB .data
    } catch (err) {
      console.error("FETCH SPK JASA ERROR:", err);
    }
  };

  const produkOptions = produkList.map((produk) => ({
    value: produk.id,
    label: produk.nama_produk,
  }));

  // Options untuk dropdown Cutting (dengan useMemo untuk optimasi)
  const distribusiOptions = useMemo(
    () =>
      distribusiList.map((d) => {
        const kodeSeri = d.kode_seri || `Distribusi #${d.id}`;
        // Coba path camelCase (default Laravel) atau snake_case (fallback)
        const namaProduk = d.spkCutting?.produk?.nama_produk || d.spk_cutting?.produk?.nama_produk || null;

        // Format label: "Kode Seri - Nama Produk" jika ada nama produk, jika tidak hanya "Kode Seri"
        const label = namaProduk ? `${kodeSeri} - ${namaProduk}` : kodeSeri;

        return {
          value: d.id,
          label: label,
        };
      }),
    [distribusiList]
  );

  // Options untuk dropdown Jasa (dengan useMemo untuk optimasi)
  const spkJasaOptions = useMemo(
    () =>
      spkJasaList.map((j) => {
        const kodeSeri = j.spkCuttingDistribusi?.kode_seri || j.spk_cutting_distribusi?.kode_seri || `Jasa #${j.id}`;

        // Coba path camelCase (default Laravel) atau snake_case (fallback)
        // Path: spkCuttingDistribusi.spkCutting.produk.nama_produk
        const namaProduk =
          j.spkCuttingDistribusi?.spkCutting?.produk?.nama_produk ||
          j.spkCuttingDistribusi?.spk_cutting?.produk?.nama_produk ||
          j.spk_cutting_distribusi?.spkCutting?.produk?.nama_produk ||
          j.spk_cutting_distribusi?.spk_cutting?.produk?.nama_produk ||
          null;

        // Format label: "Kode Seri - Nama Produk" jika ada nama produk, jika tidak hanya "Kode Seri"
        const label = namaProduk ? `${kodeSeri} - ${namaProduk}` : kodeSeri;

        return {
          value: j.id,
          label: label,
        };
      }),
    [spkJasaList]
  );

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

  useEffect(() => {
    console.log("Fetching SPK with sortOrder:", sortOrder);
    const fetchSpkCmtData = async () => {
      try {
        setLoading(true);

        // ✅ Debugging log sebelum request API
        console.log("Current Filters:");
        console.log("status:", selectedStatus);
        console.log("page:", currentPage);
        console.log("id_penjahit:", selectedPenjahit);
        console.log("sortBy:", sortBy);
        console.log("sortOrder:", sortOrder);
        console.log("selectedProduk (before convert):", selectedProduk);
        console.log("selectedProduk (converted):", selectedProduk ? Number(selectedProduk) : undefined);

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

        console.log("Data SPK:", response.data); // Debugging
        console.log("SPK Data:", response.data.spk?.data); // Debugging

        // Pastikan data ada sebelum set state
        if (response.data.spk?.data) {
          setSpkCmtData(response.data.spk.data);
          setLastPage(response.data.spk.last_page || 1);
        } else {
          // Jika menggunakan get() bukan paginate()
          setSpkCmtData(response.data.spk || []);
          setLastPage(1);
        }
      } catch (error) {
        setError(error.response?.data?.message || "Failed to fetch data");
        console.error("Error fetching SPK:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpkCmtData();
  }, [currentPage, selectedStatus, selectedPenjahit, sortBy, sortOrder, selectedProduk, selectedKategori, selectedSisaHari]);

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
      alert("Staff berhasil diundang ke chat!");
      setShowInviteStaffModal(false); // Tutup modal setelah mengundang
    } catch (error) {
      console.error("Gagal mengundang staff:", error);
      alert("Gagal mengundang staff.");
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

  //fungsi untuk kirim update dadline ke API
  const updateDeadline = async (spkId) => {
    const { deadline, keterangan } = newDeadline;

    try {
      const response = await API.put(`/spk/${spkId}/deadline`, { deadline, keterangan });

      // Update state lokal dengan data baru
      setSpkCmtData((prevSpkCmtData) => prevSpkCmtData.map((spk) => (spk.id_spk === spkId ? { ...spk, deadline, keterangan } : spk)));

      // Tutup popup dan form setelah pembaruan selesai
      setShowPopup(false);
      setShowForm(false);
      setShowDeadlineForm(false);

      alert(response.data.message); // Menampilkan pesan sukses
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || error.message)); // Menampilkan error yang lebih jelas
    }
  };

  // Fungsi untuk kirim update status ke API
  const updateStatus = async (spkId) => {
    const { status, keterangan } = newStatus;

    try {
      const response = await API.put(`/spk/${spkId}/status`, { status, keterangan });

      // Update state lokal dengan status baru
      setSpkCmtData((prevSpkCmtData) => prevSpkCmtData.map((spk) => (spk.id_spk === spkId ? { ...spk, status, keterangan } : spk)));

      alert(response.data.message); // Menampilkan pesan sukses
      setShowPopup(false); // Menutup popup setelah status berhasil diperbarui
      setShowForm(false); // Menyembunyikan form update setelah berhasil
      setShowStatusForm(false); // Menutup form update status
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || error.message)); // Menampilkan pesan error yang lebih spesifik
    }
  };

  // Fungsi untuk update status langsung dari dropdown
  const handleStatusChangeDirect = async (spkId, newStatus) => {
    try {
      const response = await API.put(`/spk/${spkId}/status`, {
        status: newStatus,
      });

      // Update state lokal dengan status baru
      setSpkCmtData((prevSpkCmtData) => prevSpkCmtData.map((spk) => (spk.id_spk === spkId ? { ...spk, status: newStatus } : spk)));

      // Tampilkan notifikasi sukses (opsional)
      console.log("Status berhasil diupdate:", response.data.message);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error: " + (error.response?.data?.message || error.message));

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
          } else {
            setSpkCmtData(response.data.spk || []);
            setLastPage(1);
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
  return new Intl.NumberFormat("id-ID").format(value || 0);
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
      alert("Gagal update: ID SPK tidak ditemukan!");
      return;
    }

    console.log("Mengupdate SPK dengan ID:", id);
    const formData = new FormData();

    // Tambahkan semua data kecuali 'warna'
    Object.keys(newSpk).forEach((key) => {
      if (key !== "warna" && key !== "jenis_harga_jasa") {
        formData.append(key, newSpk[key]);
      }
    });

    // Menambahkan warna ke FormData dengan format array
    newSpk.warna.forEach((warna, index) => {
      formData.append(`warna[${index}][id_warna]`, warna.id_warna || "");
      formData.append(`warna[${index}][nama_warna]`, warna.nama_warna);
      formData.append(`warna[${index}][qty]`, warna.qty);
    });

    formData.append("harga_jasa_awal", newSpk.harga_jasa_awal);
    formData.append("jenis_harga_jasa", newSpk.jenis_harga_jasa);

    console.log("Jenis harga jasa yang dikirim:", newSpk.jenis_harga_jasa);

    formData.append("_method", "PUT"); // Tambahkan _method untuk Laravel

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
      setSpkCmtData((prev) => prev.map((spk) => (spk.id_spk === updatedSpk.data.id_spk ? updatedSpk.data : spk)));

      alert("SPK berhasil diupdate!");
    } catch (error) {
      if (error.response) {
        console.error("Detail kesalahan:", error.response.data.errors);
        alert("Validasi gagal: " + JSON.stringify(error.response.data.errors, null, 2));
      } else {
        console.error("Terjadi kesalahan:", error);
        alert("Error: " + error.message);
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
    formData.append("aksesoris", newSpk.aksesoris);
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

      setSpkCmtData((prev) => [...prev, response.data.data]);
      setShowForm(false);

      alert("SPK CMT berhasil disimpan!");
    } catch (error) {
      alert(error.response?.data?.message || error.message);
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
    } catch (error) {
      console.error("Error downloading file:", error);
      alert(error.response?.data?.error || "Gagal mengunduh SPK.");
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
    setNewSpk({ ...spk, warna: spk.warna || [] });
    setShowForm(true); // Tampilkan form
  };

  const statusColors = {
    Pending: "orange",
    Completed: "#93D7A9",
  };

  const getStatusColor = (status, sisaHari) => {
    if (status === "In Progress" || status === "Pending") {
      if (sisaHari >= 14) return "#A0DCDC"; // Hijau
      if (sisaHari >= 7) return "#EF9651"; // Kuning
      return "#A31D1D"; // Merah
    }
    return "#88BC78"; // Status lain
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

  return (
    <div className="spkcmt-container">
      <div className="spkcmt-header">
        <h1>📋 Data SPK CMT</h1>
        <div
          className="notif-wrapper"
          onClick={() => {
            setShowPopup(!showPopup);
            if (!showPopup) {
              markNotificationsAsRead();
            }
          }}
        >
          <FaBell className="notif-icon" />
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </div>

        {showPopup && (
          <div className="spkcmt-notif-popup" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px", borderBottom: "2px solid #f0f0f0" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#667eea" }}>🔔 Notifikasi</h3>
            </div>
            {notifications.length > 0 ? (
              <ul className="spkcmt-notif-list">
                {notifications.map((notif) => (
                  <li key={notif.id} className="spkcmt-notif-item">
                    <div className="spkcmt-notif-text">
                      <strong>User ID:</strong> {notif.user_id} <br />
                      <strong>SPK ID:</strong> {notif.spk_id} <br />
                      <strong>Pesan:</strong> {notif.text}
                    </div>
                    <span className="spkcmt-notif-time">{notif.time}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
                <p style={{ margin: 0 }}>Belum ada notifikasi baru.</p>
              </div>
            )}

            <button
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

      <div className="spkcmt-filters">
        <button className="spkcmt-btn-primary" onClick={() => setShowForm(true)}>
          <FaPlus /> Tambah SPK CMT
        </button>
        <div className="spkcmt-search">
          <i className="fas fa-search spkcmt-search-icon"></i>
          <input type="text" placeholder="Cari nama produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="spkcmt-filter-select">
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <select value={selectedPenjahit} onChange={(e) => setSelectedPenjahit(e.target.value)} className="spkcmt-filter-select">
          <option value="">All CMT</option>
          {penjahitList.map((penjahit) => (
            <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
              {penjahit.nama_penjahit}
            </option>
          ))}
        </select>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="spkcmt-filter-select">
          <option value="asc">Terlama</option>
          <option value="desc">Terbaru</option>
        </select>
        <select value={selectedProduk} onChange={(e) => setSelectedProduk(e.target.value)} className="spkcmt-filter-select">
          <option value="">All Produk</option>
          {produkList.map((produk) => (
            <option key={produk.id} value={produk.id}>
              {produk.nama_produk}
            </option>
          ))}
        </select>
        <select value={selectedKategori} onChange={(e) => setSelectedKategori(e.target.value)} className="spkcmt-filter-select">
          <option value="">All Status Produk</option>
          {kategoriList.map((kategori, index) => (
            <option key={index} value={kategori}>
              {kategori}
            </option>
          ))}
        </select>
      </div>

      <div className="spkcmt-table-container">
        <table className="spkcmt-table spkcmt-table-responsive">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nama Baju</th>
              <th>Penjahit</th>
              <th>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>Sisa Hari</span>
                  <button
                    onClick={handleOrderChange}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {sortOrder === "asc" ? <FaArrowDown size={12} /> : <FaArrowUp size={12} />}
                  </button>
                </div>
              </th>
              <th title="Waktu Pengerjaan">WAKTU</th>
              <th title="Jumlah Produk">JML PRODUK</th>
              <th title="Jumlah Dikirim">JML KIRIM</th>
              <th title="Sisa Barang">SISA</th>
              <th>STATUS</th>
              <th>AKSI</th> {/* Kolom Download dihapus, digabung ke sini */}
            </tr>
          </thead>
          <tbody>
            {filteredSpk.map((spk) => {
              // Hitung sisa barang terbaru dari pengiriman
              const latestPengiriman = spk.pengiriman?.length ? [...spk.pengiriman].sort((a, b) => a.id_pengiriman - b.id_pengiriman).at(-1) : null;
              const sisaBarang = latestPengiriman?.sisa_barang ?? spk.jumlah_produk ?? 0;

              return (
                <tr key={spk.id_spk}>
                  <td>{spk.id_spk}</td>
                  <td>
                    <strong>{(spk.nama_produk || "–") + (spk.nomor_seri ? ` / ${spk.nomor_seri}` : "")}</strong>
                  </td>
                  <td>{spk.penjahit?.nama_penjahit || "–"}</td>
                  <td
                    style={{
                      color: getStatusColor(spk.status, spk.sisa_hari),
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    {spk.sisa_hari ?? "–"}
                  </td>
                  <td style={{ textAlign: "center" }}>{spk.waktu_pengerjaan ?? "–"}</td>
                  <td style={{ textAlign: "right" }}>
                    <strong>{(spk.jumlah_produk || 0).toLocaleString("id-ID")}</strong>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handlePengirimanDetailClick(spk, "jumlah_kirim")}
                      style={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        border: "none",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "11px",
                        minWidth: "60px",
                      }}
                    >
                      {(spk.total_barang_dikirim || 0).toLocaleString("id-ID")}
                    </button>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handlePengirimanDetailClick(spk, "sisa_barang")}
                      style={{
                        background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                        color: "white",
                        border: "none",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "11px",
                        minWidth: "60px",
                      }}
                    >
                      {sisaBarang.toLocaleString("id-ID")}
                    </button>
                  </td>
                  <td>
                    <select
                      value={spk.status || "belum_diambil"}
                      onChange={(e) => handleStatusChangeDirect(spk.id_spk, e.target.value)}
                      className="spkcmt-status-select"
                      style={{
                        backgroundColor: getStatusColor(spk.status, spk.sisa_hari),
                        color: "white",
                        border: "2px solid transparent",
                        padding: "6px 8px",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "12px",
                        cursor: "pointer",
                        minWidth: "130px",
                        outline: "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <option value="belum_diambil">Belum Diambil</option>
                      <option value="sudah_diambil">Sudah Diambil</option>
                    </select>
                  </td>
                  {/* Kolom Aksi — Termasuk Download */}
                  <td style={{ textAlign: "center" }}>
                    <div className="spkcmt-action-group">
                      <button className="spkcmt-btn-icon spkcmt-btn-icon-info" onClick={() => handleDetailClick(spk)} title="Detail">
                        <FaInfoCircle size={12} />
                      </button>
                      <button className="spkcmt-btn-icon spkcmt-btn-icon-info" onClick={() => handleUpdateDeadlineClick(spk)} title="Update Deadline">
                        <FaClock size={12} />
                      </button>
                      <button className="spkcmt-btn-icon spkcmt-btn-icon-settings" onClick={() => handleUpdateStatusClick(spk)} title="Update Status">
                        <FaCog size={12} />
                      </button>
                      <button className="spkcmt-btn-icon spkcmt-btn-icon-edit" onClick={() => handleEditClick(spk)} title="Edit">
                        <FaEdit size={12} />
                      </button>
                      {/* ✅ Tombol Download dipindahkan ke sini */}
                      <button onClick={() => downloadPdf(spk.id_spk)} className="spkcmt-btn-icon spkcmt-btn-icon-download" title="Download PDF">
                        <FaSave size={12} />
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
      <div className="spkcmt-pagination">
        <button className="spkcmt-pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
          ◀ Prev
        </button>
        <span className="spkcmt-pagination-info">
          Halaman {currentPage} dari {lastPage}
        </span>
        <button className="spkcmt-pagination-btn" disabled={currentPage === lastPage} onClick={() => setCurrentPage(currentPage + 1)}>
          Next ▶
        </button>
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
                      {msg.image_url && <img src={msg.image_url} alt="Chat Image" className="chat-image" onClick={() => openMediaPreview(msg.image_url, "image")} />}
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
              <h2>📋 Detail SPK</h2>
              <button className="spkcmt-modal-close" onClick={closePopup}>
                <FaTimes />
              </button>
            </div>

            <div className="spkcmt-detail-content">
              {/* Gambar Produk */}
              <div>
                {selectedSpk.gambar_produk ? (
                  <img src={`http://localhost:8000/storage/${selectedSpk.gambar_produk}`} alt="Gambar Produk" className="spkcmt-detail-image" />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "300px",
                      background: "linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                      fontSize: "16px",
                      fontWeight: "600",
                    }}
                  >
                    No Image
                  </div>
                )}
              </div>

              {/* Detail Produk */}
              <div className="spkcmt-detail-info">
                <div className="spkcmt-detail-item">
                  <strong>Nama Produk</strong>
                  <span>{selectedSpk.nama_produk || "–"}</span>
                </div>
                <div className="spkcmt-detail-item">
                  <strong>Jumlah Produk</strong>
                  <span>{(selectedSpk.jumlah_produk || 0).toLocaleString("id-ID")}</span>
                </div>
               <div className="spkcmt-detail-item">
                <strong>Total Harga</strong>
                <span>{formatRupiah(selectedSpk.total_harga)}</span>
              </div>

              <div className="spkcmt-detail-item">
                <strong>Harga Barang</strong>
                <span>{formatRupiah(selectedSpk.harga_per_barang)}</span>
              </div>

              <div className="spkcmt-detail-item">
                <strong>Harga Jasa</strong>
                <span>{formatRupiah(selectedSpk.harga_per_jasa)} / PCS</span>
              </div>

                <div className="spkcmt-detail-item">
                  <strong>Warna</strong>
                  <span>{selectedSpk.warna && selectedSpk.warna.length > 0 ? selectedSpk.warna.map((w) => `${w.nama_warna} (${w.qty})`).join(", ") : "Tidak ada"}</span>
                </div>
                <div className="spkcmt-detail-item">
                  <strong>Tanggal SPK</strong>
                  <span>
                    {selectedSpk.created_at
                      ? new Date(selectedSpk.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "–"}
                  </span>
                </div>
                <div className="spkcmt-detail-item">
                  <strong>Deadline</strong>
                  <span>
                    {selectedSpk.deadline
                      ? new Date(selectedSpk.deadline).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "–"}
                  </span>
                </div>
                <div className="spkcmt-detail-item">
                  <strong>Status</strong>
                  <span>{selectedSpk.status || "–"}</span>
                </div>
                <div className="spkcmt-detail-item">
                  <strong>Merek</strong>
                  <span>{selectedSpk.merek || "–"}</span>
                </div>
                <div className="spkcmt-detail-item">
                  <strong>Aksesoris</strong>
                  <span>{selectedSpk.aksesoris || "–"}</span>
                </div>
                <div className="spkcmt-detail-item">
                  <strong>Catatan</strong>
                  <span>{selectedSpk.catatan || "–"}</span>
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

      {showForm && (
        <div className="spkcmt-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="spkcmt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spkcmt-modal-header">
              <h2>➕ Tambah Data SPK CMT</h2>
              <button className="spkcmt-modal-close" onClick={() => setShowForm(false)}>
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
                      options={newSpk.source_type === "cutting" ? distribusiOptions : spkJasaOptions}
                      value={newSpk.source_type === "cutting" ? distribusiOptions.find((opt) => opt.value === newSpk.source_id) || null : spkJasaOptions.find((opt) => opt.value === newSpk.source_id) || null}
                      onChange={(selected) =>
                        setNewSpk({
                          ...newSpk,
                          source_id: selected ? selected.value : "",
                        })
                      }
                      placeholder="Pilih atau cari..."
                      isSearchable={true}
                      isClearable={true}
                      isLoading={newSpk.source_type === "cutting" ? distribusiList.length === 0 : spkJasaList.length === 0}
                      noOptionsMessage={({ inputValue }) => (inputValue ? `Tidak ditemukan untuk "${inputValue}"` : newSpk.source_type === "cutting" ? "Tidak ada data distribusi cutting" : "Tidak ada data SPK Jasa")}
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: "40px",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          fontSize: "14px",
                          "&:hover": {
                            borderColor: "#667eea",
                          },
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "#999",
                        }),
                      }}
                    />
                  </div>
                )}

                {/* ================= PREVIEW ================= */}
                {previewData && (
                  <div className="spkcmt-preview-card">
                    <div className="spkcmt-preview-header">
                      <h3>📋 Preview SPK yang Dipilih</h3>
                    </div>
                    <div className="spkcmt-preview-content">
                      {/* Foto Produk */}
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
                      {previewData.warna && previewData.warna.length > 0 && (
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
                      {previewData.tukang_jasa && (
                        <div className="spkcmt-preview-item">
                          <strong>Tukang Jasa:</strong>
                          <span>{previewData.tukang_jasa.nama || "-"}</span>
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

                {/* ================= ATRIBUT ================= */}
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Markeran</label>
                  <input type="text" className="spkcmt-form-input" value={newSpk.markeran} onChange={(e) => setNewSpk({ ...newSpk, markeran: e.target.value })} />
                </div>

                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Aksesoris</label>
                  <input type="text" className="spkcmt-form-input" value={newSpk.aksesoris} onChange={(e) => setNewSpk({ ...newSpk, aksesoris: e.target.value })} />
                </div>

                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Handtag</label>
                  <input type="text" className="spkcmt-form-input" value={newSpk.handtag} onChange={(e) => setNewSpk({ ...newSpk, handtag: e.target.value })} />
                </div>

                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Merek</label>
                  <input type="text" className="spkcmt-form-input" value={newSpk.merek} onChange={(e) => setNewSpk({ ...newSpk, merek: e.target.value })} />
                </div>

                {/* ================= HARGA BARANG ================= */}
                <div className="spkcmt-form-group">
                  <label className="spkcmt-form-label">Jenis Harga Produk</label>
                  <select
                    className="spkcmt-form-select"
                    value={newSpk.jenis_harga_barang}
                    onChange={(e) =>
                      setNewSpk({
                        ...newSpk,
                        jenis_harga_barang: e.target.value,
                      })
                    }
                  >
                    <option value="per_pcs">Per Pcs</option>
                    <option value="per_lusin">Per Lusin</option>
                  </select>
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
                    <option value="per_barang">Per Barang</option>
                    <option value="per_lusin">Per Lusin</option>
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
                  <button type="button" className="spkcmt-btn-cancel" onClick={() => setShowForm(false)}>
                    <FaTimes /> Batal
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

export default SpkCmt;

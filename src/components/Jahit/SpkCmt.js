import React, { useEffect, useState, useRef } from 'react';
import './Penjahit.css';
import axios from "axios";
import Pusher from 'pusher-js';
import { toast } from 'react-toastify';
import API from "../../api"; 
import {FaMicrophone, FaArrowUp, FaArrowDown, FaPause, FaStop, FaMicrophoneSlash, FaImage,FaPhotoVideo,  FaVideo, FaVideoSlash, FaPlus, FaTrash, FaSave, FaTimes,FaPaperPlane,FaBell, FaRegEye, FaCog,
  FaEdit, FaClock,FaInfoCircle,FaComments,FaCommentDots,FaComment  } from 'react-icons/fa';
import Select from 'react-select';


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
  const [mediaPreview, setMediaPreview] = useState({ url: '', type: '' });
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
}, [newSpk.source_type]);

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


  const produkOptions = produkList.map(produk => ({
    value: produk.id,             
    label: produk.nama_produk
  }));
  
  const [newDeadline, setNewDeadline] = useState({
    deadline: '',
    keterangan: '',
  });
  const [newStatus, setNewStatus] = useState({
    status: '',
    keterangan: '',
  });
  const userId = localStorage.getItem('userId'); 

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
       stream.getTracks().forEach(track => track.stop());
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
    setMediaPreview({ url: '', type: '' });
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
            id_penjahit:selectedPenjahit,
            sortBy: sortBy,   
            sortOrder: sortOrder,
            id_produk: selectedProduk,
            kategori_produk: selectedKategori,
            sisa_hari: selectedSisaHari, 
          }, 
            
        });
  
        console.log("Data SPK:", response.data); // Debugging
  
        setSpkCmtData(response.data.spk.data);
        setLastPage(response.data.spk.last_page);
      } catch (error) {
        setError(error.response?.data?.message || "Failed to fetch data");
        console.error("Error fetching SPK:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchSpkCmtData();
  }, [currentPage, selectedStatus,  selectedPenjahit, sortBy, sortOrder, selectedProduk,  selectedKategori, selectedSisaHari]); 
  
  
  
  
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
    if (selectedSpkId && !showModal) { // Cek apakah modal pengiriman sedang terbuka
      setMessages([]);
  
      // Hanya buka popup kalau sebelumnya belum terbuka
      setShowChatPopup(prev => prev || true);
  
      // Fetch chat messages untuk SPK yang dipilih
      axios.get(`http://localhost:8000/api/spk-chats/${selectedSpkId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(response => {
        setMessages(response.data); // Data dari backend sudah termasuk yang ditandai sebagai dibaca
      })
      .catch(error => {
        console.error("Error fetching messages:", error);
        if (error.response && error.response.status === 403) {
          setMessages([]); // Clear chat kalau error akses
        }
      });
    }
  }, [selectedSpkId]);
  
  useEffect(() => {
    if (selectedSpkId && messages.length > 0) { 
      axios.post(`http://localhost:8000/api/spk-chats/${selectedSpkId}/mark-as-read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(() => console.log("Marked all messages as read in SPK:", selectedSpkId))
      .catch(err => console.error("Error marking as read:", err));
    }
  }, [messages]); // ✅ Jalan setiap ada pesan baru
  

//useEffect(() => {
  useEffect(() => {
    if (selectedSpkId) {
      axios.get(`http://localhost:8000/api/spk-chats/${selectedSpkId}/readers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(response => {
        setReaders(response.data); // Simpan semua readers sekaligus
      })
      .catch(error => console.error("Error fetching chat readers:", error));
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
  };useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/notifications/unread", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
  
        console.log("Fetched Notifications from API:", response.data.notifications); // Debugging
        const fetchedNotifications = response.data.notifications.map((notif) => ({
          id: notif.id,
          user_id: notif.user_id ?? "N/A", // Tambahkan user_id
          spk_id: notif.spk_id ?? "N/A",   // Tambahkan spk_id
          text: notif.message?.trim() ? notif.message : "📩 Pesan baru diterima",
          time: new Date(notif.created_at).toLocaleTimeString(),
        }));
        
  
        // Ambil notifikasi lama dari localStorage
        const storedNotifications = JSON.parse(localStorage.getItem("notifications")) || [];
  
        // Gabungkan notifikasi lama dan baru, hindari duplikasi berdasarkan `id`
        const mergedNotifications = [...fetchedNotifications, ...storedNotifications].reduce(
          (acc, curr) => {
            if (!acc.find((item) => item.id === curr.id)) {
              acc.push(curr);
            }
            return acc;
          }, []
        );
  
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
    setSelectedSpkId(null);  // Reset SPK yang dipilih
  
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
        user_id: data.chat.user_id,  // Tambahkan user_id
        spk_id: data.chat.id_spk,    // Tambahkan spk_id
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
    await axios.post("http://localhost:8000/api/notifications/mark-as-read", {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });

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

    const response = await axios.post(
      "http://localhost:8000/api/send-message",
      formData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
          "X-Socket-ID": socketId,
        },
      }
    );

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
      setSpkCmtData((prevSpkCmtData) =>
        prevSpkCmtData.map((spk) =>
          spk.id_spk === spkId ? { ...spk, deadline, keterangan } : spk
        )
      );
  
      // Tutup popup dan form setelah pembaruan selesai
      setShowPopup(false);
      setShowForm(false);
      setShowDeadlineForm(false);
  
      alert(response.data.message); // Menampilkan pesan sukses
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message)); // Menampilkan error yang lebih jelas
    }
  };
  

   // Fungsi untuk kirim update status ke API
   const updateStatus = async (spkId) => {
    const { status, keterangan } = newStatus;
    
    try {
      const response = await API.put(`/spk/${spkId}/status`, { status, keterangan });
  
      // Update state lokal dengan status baru
      setSpkCmtData((prevSpkCmtData) =>
        prevSpkCmtData.map((spk) =>
          spk.id_spk === spkId ? { ...spk, status, keterangan } : spk
        )
      );
  
      alert(response.data.message); // Menampilkan pesan sukses
      setShowPopup(false); // Menutup popup setelah status berhasil diperbarui
      setShowForm(false); // Menyembunyikan form update setelah berhasil
      setShowStatusForm(false); // Menutup form update status
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message)); // Menampilkan pesan error yang lebih spesifik
    }
  };
  

  //nampilin form update deadline
  const handleUpdateDeadlineClick = (spk) => {
    setSelectedSpk(spk);  // Menyimpan data SPK yang dipilih
    setShowDeadlineForm(true);  // Tampilkan form update deadline
    setShowForm(false);  // Pastikan form SPK tidak tampil
  };
 
   // Menampilkan form update status
   const handleUpdateStatusClick = (spk) => {
    setSelectedSpk(spk);  // Menyimpan data SPK yang dipilih
    setShowStatusForm(true);  // Menampilkan form update status
    setShowForm(false);  // Pastikan form SPK tidak tampil
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

  setNewSpk((prev) => ({
    ...prev,
    [name]: value,
  }));
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
    setSpkCmtData((prev) =>
      prev.map((spk) => (spk.id_spk === updatedSpk.data.id_spk ? updatedSpk.data : spk))
    );
  
    alert("SPK berhasil diupdate!");
  } catch (error) {
    if (error.response) {
      console.error("Detail kesalahan:", error.response.data.errors);
      alert(
        "Validasi gagal: " +
          JSON.stringify(error.response.data.errors, null, 2)
      );
    } else {
      console.error("Terjadi kesalahan:", error);
      alert("Error: " + error.message);
    }
  }
  
};



const filteredSpk = spkCmtData.filter((spk) =>
  spk.sumber_pekerjaan?.nama?.toLowerCase().includes(searchTerm.toLowerCase())
);

  

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

  // 🔴 BARU (HARGA BARANG)
  formData.append("harga_barang_dasar", newSpk.harga_barang_dasar);
  formData.append("jenis_harga_barang", newSpk.jenis_harga_barang);

  // 🔴 JASA
  formData.append("harga_per_jasa", newSpk.harga_per_jasa);
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
  window.open(url, '_blank'); // Membuka file PDF di tab baru
};




const handleWarnaChange = (e, index) => {
  const { name, value } = e.target;
  const updatedWarna = [...newSpk.warna];

  // Update nilai nama_warna atau qty
  if (name.includes('nama_warna')) {
    updatedWarna[index].nama_warna = value;
  } else if (name.includes('qty')) {
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
    total_harga: totalHarga,    // Perbarui total_harga secara otomatis
  });
};


const handleAddWarna = () => {
  const updatedWarna = [...newSpk.warna, { nama_warna: '', qty: 0 }];
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
  setShowPopup(true);  // Tampilkan pop-up
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
    const lastPengiriman = spk.pengiriman?.length > 0 
    ? spk.pengiriman[spk.pengiriman.length - 1] 
    : null;

  setPengirimanDetails(lastPengiriman?.sisa_barang_per_warna || {}); // Simpan sisa barang per warna
}

  setShowModal(true);
};




const togglePopup = () => {
  setShowPopup(!showPopup);
};


const handleSortChange = (e) => setSortBy(e.target.value);

const handleOrderChange = () =>
  setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));


return (
  <div>
      <div className="penjahit-container">
      <h1>Data SPK CMT</h1>
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
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup-content1" onClick={(e) => e.stopPropagation()}>
            <h3 className="popup-title">Notifikasi</h3>
            {notifications.length > 0 ? (
         <ul className="notif-list">
         {notifications.map((notif) => (
           <li key={notif.id} className="notif-item">
             <span className="notif-text">
              <strong>User ID:</strong> {notif.user_id} <br />
              <strong>SPK ID:</strong> {notif.spk_id} <br />
              <strong>Pesan:</strong> {notif.text} {/* Pastikan pakai notif.text */}
            </span>
             <span className="notif-time">{notif.time}</span>
           </li>
         ))}
       </ul>
       
        ) : (
          <p className="notif-empty">Belum ada notifikasi baru.</p>
        )}

           <button
            className="notif-clear-btn"
            onClick={() => {
              setNotifications([]);
              localStorage.removeItem("notifications");

              // Jika ingin hapus semua dari backend juga, tambahkan API untuk delete
            }}
          >
            Hapus Notifikasi
          </button>

          </div>
        </div>
      )}
    </div>

    <div className="table-container">
        <div className="filter-header1">
        <button 
        onClick={() => setShowForm(true)}>
          Tambah
        </button>
        <div className="search-bar1">
          <input
            type="text"
            placeholder="Cari nama produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          </div>
          <label htmlFor="statusFilter" className="filter-label"></label>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}  className="filter-select1" >

            <option value="" >All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <label htmlFor="statusFilter" className="filter-label"></label>
          <select 
          value={selectedPenjahit} 
          onChange={(e) => setSelectedPenjahit(e.target.value)}
          className="filter-select1"
           >
          <option value="">All CMT</option>
          {penjahitList.map((penjahit) => (
              <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                  {penjahit.nama_penjahit}
              </option>
          ))}
          </select>
          <label htmlFor="statusFilter" className="filter-label"></label>
          <select 
          value={sortOrder} 
          onChange={(e) => setSortOrder(e.target.value)}
          className="filter-select1"
          >
            <option value="asc">Terlama</option>
            <option value="desc">Terbaru</option>
          </select>
          
          <label htmlFor="statusFilter" className="filter-label"></label>
          <select 
          value={selectedProduk} 
          onChange={(e) => setSelectedProduk(e.target.value)}
          className="filter-select1"
           >
          <option value="">All Produk</option>
          {produkList.map((produk) => (
              <option key={produk.id} value={produk.id}>
                  {produk.nama_produk}
              </option>
          ))}
          </select>
          <label htmlFor="statusFilter" className="filter-label"></label>
          <select 
            value={selectedKategori} 
            onChange={(e) => setSelectedKategori(e.target.value)}
              className="filter-select1"
            >
              <option value="">All Status Produk</option>
              {kategoriList.map((kategori, index) => (
                <option key={index} value={kategori}>
                  {kategori}
                </option>
              ))}
            </select>

      </div>

      <div className="table-wrapper">
      <table className="penjahit-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nama Baju  </th>
            <th>Penjahit</th>
            <th>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: "bold" }}>Sisa Hari</span>

            <button 
              onClick={handleOrderChange} 
              style={{
                background: "none",
                border: "none",
                padding: "4px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              {sortOrder === "asc" ? (
                <FaArrowDown /> // Ikon panah atas
              ) : (
                <FaArrowUp /> // Ikon panah bawah
              )}
            </button>
          </div>
        </th>

            <th>Waktu Pengerjaan</th>
            <th>Jumlah Produk</th>
            <th>Jumlah DIkirim</th>
            <th>Sisa Barang</th>
            <th>Status</th>
            <th>Status Produk</th>
            <th>Aksi</th>
            <th>Download</th>
          </tr>
        </thead>
        <tbody>
          {filteredSpk.map((spk) => (
            <tr key={spk.id_spk}>
              <td data-label="ID SPK : " >{spk.id_spk}</td>
              <td data-label="Nama baju : ">
              {(spk.nama_produk || "Tidak Diketahui") + " " + spk.nomor_seri}

          </td>


          <td data-label="Penjahit :">{spk.penjahit?.nama_penjahit || 'Tidak Diketahui'} </td>
            
          <td data-label="Sisa Hari : "
              style={{ color: getStatusColor(spk.status, spk.sisa_hari),
                 fontWeight: "bold"
               }}>
            {spk.sisa_hari}
          </td>


              <td data-label="Waktu Pengerjaan : ">{spk.waktu_pengerjaan}</td> 
              <td data-label= "Jumlah Produk : ">{(spk.jumlah_produk || 0).toLocaleString('id-ID')}</td>
              <td data-label= "Jumlah Kirim: ">
                <button
                onClick={() => handlePengirimanDetailClick(spk, "jumlah_kirim")}
                  className="btn-pengiriman-detail1"
                >
                 {(spk.total_barang_dikirim || 0).toLocaleString('id-ID')}

                </button>
              </td>

              <td data-label="Sisa Barang : ">
              <button
               
               onClick={() => handlePengirimanDetailClick(spk, "sisa_barang")}
                  className="btn-pengiriman-detail1"
                  >
                    {
                      spk.pengiriman?.length > 0
                        ? [...spk.pengiriman]
                        .sort((a, b) => a.id_pengiriman - b.id_pengiriman)
                        .at(-1).sisa_barang
                        : (spk.jumlah_produk || 0).toLocaleString('id-ID')

                    }

                  
                  </button>
              </td>

     
              <td  data-label="">
              <span
                style={{
                  backgroundColor: getStatusColor(spk.status, spk.sisa_hari),
                  color: "white",
                  padding: "1px 1px", // Padding seragam
                  borderRadius: "5px",
                  display: "inline-block", // Pastikan ukuran bisa menyesuaikan
                  minWidth: "85px", // Tentukan ukuran minimum agar semua sama
                  textAlign: "center", // Biar teks selalu di tengah
                }}
              >
                {spk.status}
              </span>
            </td>

            <td data-label="">
            <span
              style={{
                backgroundColor: spk.kategori_produk === "Urgent" ?  "rgb(220, 165, 160)" : "#B0B0B0", // Tentukan warna berdasarkan kategori
                color: "white",
                padding: "1px 1px", // Padding seragam
                borderRadius: "5px",
                display: "inline-block", // Pastikan ukuran bisa menyesuaikan
                minWidth: "85px", // Tentukan ukuran minimum agar semua sama
                textAlign: "center", // Biar teks selalu di tengah
              }}
            >
              {spk.kategori_produk}
            </span>
          </td>

              <td  data-label="">
                <div className="action-card">
                  <button 
                    className="btn1-icon" 
                    onClick={() => handleDetailClick(spk)}
                  >
                    <FaInfoCircle className="icon" />
                  </button>
                  <button 
                    className="btn1-icon" 
                    onClick={() => handleUpdateDeadlineClick(spk)}
                  >
                    <FaClock className="icon" />
                  </button>
                 
                   <button 
                    className="btn1-icon" 
                     onClick={() =>handleUpdateStatusClick(spk)}
                     > 
                     <  FaCog  className="icon" />
                   </button>

                   <button 
                    className="btn1-icon" 
                     onClick={() => handleEditClick(spk)}
                     > 
                     <FaEdit className="icon" />
                   </button>
                   <button className="btn1-icon" onClick={() => handleChatClick(spk)}> 
                    <FaCommentDots className="icon" />
                  </button>
                </div>      
              </td>
              <td data-label="">
              <div className="action-card">
                <button
                  onClick={() => downloadPdf(spk.id_spk)}
                  className="btn1-icon3" 
                  >
                        <FaSave className="icon" />
                </button>
              
                <button
                  onClick={() => downloadStaffPdf(spk.id_spk)}
                  className="btn1-icon3" 
                  >
                        <FaSave className="icon" />

                </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
     
    </div>
     {/* Pagination */}
     <div className="pagination-container">
        <button 
          className="pagination-button" 
          disabled={currentPage === 1} 
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          ◀ Prev
        </button>

        <span className="pagination-info">Halaman {currentPage} dari {lastPage}</span>

        <button 
          className="pagination-button" 
          disabled={currentPage === lastPage} 
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next ▶
        </button>
      </div>
  
    </div>

    {showChatPopup && (
      <div className="chat-overlay">
        <div className="chat-popup">
          <div className="chat-popup-content">
          <button className="close-btn" onClick={handleCloseChat}>
  <FaTimes />
</button>


            <div className="chat-header">
              <h4>Chat SPK #{selectedSpkId}</h4>
              {(userRole === "supervisor" || userRole === "super-admin") && (
              <button className="invite-btn" onClick={() => setShowInviteStaffModal(true)}>
                + Undang Staff
              </button>
            )}
      </div>
        
      <div ref={chatContainerRef} className="chat-messages">
        {messages.length > 0 ? (
          messages.map((msg, index) => (
            <div
            key={index}
            className={`chat-message ${msg.user_id === userId ? 'user-message' : 'partner-message'}`}
          >
            <div className="message-header">
          <strong>{msg.user ? msg.user.name : 'Unknown User'}</strong> {/* Cek apakah msg.user ada */}
        </div>
        
          <div className="message-text">
            {msg.message && <p>{msg.message}</p>} {/* Hanya tampilkan jika ada teks */}
            {msg.image_url && (
            <img
              src={msg.image_url}
              alt="Chat Image"
              className="chat-image"
              onClick={() => openMediaPreview(msg.image_url, 'image')}
            />
          )}
          {msg.video_url && (
            <video
              controls
              className="chat-image"
              onClick={() => openMediaPreview(msg.video_url, 'video')}
            >
              <source src={msg.video_url} type="video/mp4" />
              <source src={msg.video_url} type="video/webm" />
              <source src={msg.video_url} type="video/ogg" />
              Your browser does not support the video tag.
            </video>
          )}
          {msg.vn_url && (
          <div className="chat-audio-wrapper"> {/* Pembungkus untuk kontrol audio */}
            <audio controls className="chat-audio">
              <source src={msg.vn_url} type="audio/webm" />
              <source src={msg.vn_url.replace('.webm', '.mp3')} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
       {readers[msg.id] && readers[msg.id].length > 0 && (
  <div className="readers">
    <small>
      Read by: {readers[msg.id]
        .filter(r => r.user_id !== msg.user_id) // 🔥 Filter agar pengirim tidak muncul di daftar
        .map(r => r.user.name)
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
                  {mediaPreview.type === 'image' ? (
                    <img src={mediaPreview.url} alt="Preview" />
                  ) : (
                    <video controls autoPlay>
                      <source src={mediaPreview.url} type="video/mp4" />
                    </video>
                  )}
                  <button className="close-button" onClick={closeMediaPreview}>Close</button>
                </div>
              </div>
      )}

      <div className="chat-input">
      {audioURL ? (
        <div className="vn-container">
          <div className="vn-preview">
            <audio controls>
              <source src={audioURL} type="audio/webm" />
              Your browser does not support the audio element.
            </audio>
          </div>
          <button className="delete-vn" onClick={deleteVN}>❌</button>
        </div>
      ) : (
        // Jika tidak ada VN, tampilkan input teks
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ketik pesan..."
        />
      )}

        {/* Tombol Upload Gambar/Video */}
        <label htmlFor="media-upload" className="image-upload-label">
        <FaImage className="upload-icon" />
        <span>
          {imageFile?.name
            ? imageFile.name.length > 7
              ? imageFile.name.slice(0, 7) + "..."
              : imageFile.name
            : videoFile?.name
            ? videoFile.name.length > 7
              ? videoFile.name.slice(0, 7) + "..."
              : videoFile.name
            : ""}
        </span>
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
      <button className="send-button" onClick={sendMessage}>
        <FaPaperPlane />
      </button>
    </div>

      {showInviteStaffModal && (
        <div className="modal-invite-overlay">
      <div className="modal-invite">
        <div className="modal-invite-content">
          <h3>Pilih Staff untuk Diundang</h3>
          <select onChange={(e) => setSelectedStaffId(e.target.value)}>
            <option value="">Pilih Staff</option>
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
          <button onClick={inviteStaff}>Undang</button>
          <button onClick={() => setShowInviteStaffModal(false)}>Batal</button>
        </div>
        </div>
      </div>
    )}
    </div>
  </div>
  </div>  
)}



{showModal && (
  <div className="modal-pengiriman">
    <div className="modal-content-pengiriman">
      {/* Modal untuk "Jumlah Kirim" */}
      {modalType === "jumlah_kirim" && (
        <>
          <h3>Detail Pengiriman untuk SPK ID: {selectedSpkId}</h3>
          <table>
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
                  <td>{detail.total_barang_dikirim}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Modal untuk "Sisa Barang" (Per Warna) */}
      {modalType === "sisa_barang" && pengirimanDetails && (
        <>
          <h3>Sisa Barang Per Warna untuk SPK ID: {selectedSpkId}</h3>
          <table>
            <thead>
              <tr>
                <th>Warna</th>
                <th>Sisa Barang</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pengirimanDetails).map(([warna, jumlah]) => (
                <tr key={warna}>
                  <td>{warna}</td>
                  <td>{jumlah}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <button onClick={() => setShowModal(false)}>Tutup</button>
    </div>
  </div>
)}

{showModal && (
  <div className="modal-pengiriman">
    <div className="modal-content-pengiriman">
      {/* Modal untuk "Jumlah Kirim" */}
      {modalType === "jumlah_kirim" && (
        <>
          <h3>Detail Pengiriman untuk SPK ID: {selectedSpkId}</h3>
          <table>
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
                  <td>{detail.total_barang_dikirim}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Modal untuk "Sisa Barang" (Per Warna) */}
      {modalType === "sisa_barang" && (
        <>
          <h3>Sisa Barang Per Warna untuk SPK ID: {selectedSpkId}</h3>
          <table>
            <thead>
              <tr>
                <th>Warna</th>
                <th>Sisa Barang</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pengirimanDetails).map(([warna, jumlah]) => (
                <tr key={warna}>
                  <td>{warna}</td>
                  <td>{jumlah}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <button onClick={() => setShowModal(false)}>Tutup</button>
    </div>
  </div>
)}




   
 {/* Pop-Up Card */}
{showPopup && selectedSpk && (
  <div className="popup1-overlay">
    <div className="popup1-card">
      <div className="popup1-header">
        <h2>Detail SPK</h2>
        <button className="btn-close" onClick={closePopup}>
          &times;
        </button>
      </div>

      <div className="popup1-content">
        {/* Gambar Produk */}
        <div className="popup1-image-container">
          {selectedSpk.gambar_produk ? (
            <img
              src={`http://localhost:8000/storage/${selectedSpk.gambar_produk}`}
              alt="Gambar Produk"
              className="popup1-image"
            />
          ) : (
            <div className="popup1-no-image">No Image</div>
          )}
        </div>

        {/* Detail Produk */}
        <div className="popup1-details">
          <div className="detail-group">
          <p><strong>Nama Produk :</strong> <span> {selectedSpk.id_produk}</span></p>
          <p><strong>Jumlah Produk :</strong> <span> {selectedSpk.jumlah_produk}</span></p>
          <p><strong>Total Harga :</strong> <span> {selectedSpk.total_harga}</span></p>
          <p><strong>Harga Barang :</strong> <span> Rp {selectedSpk.harga_per_barang}</span></p>
          <p><strong>Harga Jasa :</strong> <span> Rp {selectedSpk.harga_per_jasa} /PCS</span></p>
          <p><strong> Warna:</strong> <span>
            {selectedSpk.warna.map(w => `${w.nama_warna} (${w.qty})`).join(", ")}
            </span></p>


            
            
            
          </div>
          <div className="detail-group">
          <p><strong>Tanggal SPK :</strong> <span>{selectedSpk.tgl_spk}</span></p>
          <p><strong>Deadline :</strong> <span> {selectedSpk.deadline}</span></p>
          <p><strong>Status :</strong> <span> {selectedSpk.status}</span></p>
          </div>
          <div className="detail-group">
          <p><strong>Merek :</strong> <span> {selectedSpk.merek}</span></p>
          <p><strong>Aksesoris :</strong> <span> {selectedSpk.aksesoris}</span></p>
          <p><strong>Catatan :</strong> <span> {selectedSpk.catatan}</span></p>
          </div>
        </div>
      </div>
    </div>
  </div>
)}



{showDeadlineForm && selectedSpk && (
  <div className="modal">
 <div className="modal-content">
 <h2>Update Deadline</h2>
    <form onSubmit={(e) => { e.preventDefault(); updateDeadline(selectedSpk.id_spk); }} className="modern-form">
    <div className="form-group">
        <label>Deadline Baru</label>
        <input
          type="date"
          name="deadline"
          value={newDeadline.deadline}
          onChange={handleDeadlineChange}
          required
        />
      </div>
      <div>
        <label>Keterangan</label>
        <input
          type="text"
          name="keterangan"
          value={newDeadline.keterangan}
          onChange={handleDeadlineChange}
          required
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-submit">
            <FaSave /> Simpan
          </button>
        <button
            type="button"
            className="btn btn-cancel"
            onClick={() => setShowDeadlineForm(false)}
          >
            <FaTimes /> Batal
        </button>
        </div>
        </form>
    </div>
  </div>
)}


{showStatusForm && selectedSpk && (
  <div className="modal">
 <div className="modal-content">
 <h2>Update Status</h2>
    <form onSubmit={(e) => { e.preventDefault(); updateStatus(selectedSpk.id_spk); }} className="modern-form">
    <div className="form-group">
        <label>Status Baru</label>
        <select
                name="status"
                value={newStatus.status}
                onChange={handleStatusChange}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
      </div>
      <div>
        <label>Keterangan</label>
        <input
          type="text"
          name="keterangan"
          value={newStatus.keterangan}
          onChange={handleStatusChange}
          
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-submit">
            <FaSave /> Simpan
          </button>
        <button
            type="button"
            className="btn btn-cancel"
            onClick={() => setShowStatusForm(false)}
          >
            <FaTimes /> Batal
        </button>
        </div>
        </form>
    </div>
  </div>
)}

{/* Modal Form */}
{showForm && (
  <div className="modal">
    <div className="modal-content">
      <h2>TAMBAH DATA SPK CMT</h2>

      <form className="modern-form" onSubmit={handleSubmit}>
        {/* ================= SOURCE TYPE ================= */}
        <div className="form-group">
          <label>Sumber SPK</label>
          <select
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
          <div className="form-group">
            <label>
              {newSpk.source_type === "cutting"
                ? "Distribusi Cutting"
                : "SPK Jasa"}
            </label>
            <select
              value={newSpk.source_id}
              onChange={(e) =>
                setNewSpk({ ...newSpk, source_id: e.target.value })
              }
              required
            >
              <option value="">Pilih</option>

              {newSpk.source_type === "cutting" &&
                distribusiList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.kode_seri}
                  </option>
                ))}

              {newSpk.source_type === "jasa" &&
                spkJasaList.map((j) => (
                  <option key={j.id} value={j.id}>
                    Jasa #{j.id} - Distribusi {j.spk_cutting_distribusi_id}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* ================= PENJAHIT ================= */}
        <div className="form-group">
          <label>Penjahit</label>
          <select
            value={newSpk.id_penjahit}
            onChange={(e) =>
              setNewSpk({ ...newSpk, id_penjahit: e.target.value })
            }
            required
          >
            <option value="">Pilih</option>
            {penjahitList.map((p) => (
              <option key={p.id_penjahit} value={p.id_penjahit}>
                {p.nama_penjahit}
              </option>
            ))}
          </select>
        </div>

        {/* ================= DEADLINE ================= */}
        <div className="form-group">
          <label>Deadline</label>
          <input
            type="date"
            value={newSpk.deadline}
            onChange={(e) =>
              setNewSpk({ ...newSpk, deadline: e.target.value })
            }
            required
          />
        </div>

        {/* ================= KETERANGAN ================= */}
        <div className="form-group">
          <label>Keterangan</label>
          <textarea
            value={newSpk.keterangan}
            onChange={(e) =>
              setNewSpk({ ...newSpk, keterangan: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Catatan</label>
          <textarea
            value={newSpk.catatan}
            onChange={(e) =>
              setNewSpk({ ...newSpk, catatan: e.target.value })
            }
          />
        </div>

        {/* ================= ATRIBUT ================= */}
        <div className="form-group">
          <label>Markeran</label>
          <input
            type="text"
            value={newSpk.markeran}
            onChange={(e) =>
              setNewSpk({ ...newSpk, markeran: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Aksesoris</label>
          <input
            type="text"
            value={newSpk.aksesoris}
            onChange={(e) =>
              setNewSpk({ ...newSpk, aksesoris: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Handtag</label>
          <input
            type="text"
            value={newSpk.handtag}
            onChange={(e) =>
              setNewSpk({ ...newSpk, handtag: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Merek</label>
          <input
            type="text"
            value={newSpk.merek}
            onChange={(e) =>
              setNewSpk({ ...newSpk, merek: e.target.value })
            }
          />
        </div>

        {/* ================= HARGA BARANG ================= */}
        <div className="form-group">
          <label>Harga Barang</label>
          <input
            type="number"
            value={newSpk.harga_barang_dasar}
            onChange={(e) =>
              setNewSpk({
                ...newSpk,
                harga_barang_dasar: e.target.value,
              })
            }
            required
          />
        </div>

        <div className="form-group">
          <label>Jenis Harga Barang</label>
          <select
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

        {/* PREVIEW */}
        {newSpk.harga_barang_dasar && (
          <small className="price-preview">
            Harga / pcs:{" "}
            {newSpk.jenis_harga_barang === "per_lusin"
              ? (newSpk.harga_barang_dasar / 12).toLocaleString("id-ID")
              : Number(newSpk.harga_barang_dasar).toLocaleString("id-ID")}
          </small>
        )}

        {/* ================= HARGA JASA ================= */}
        <div className="form-group">
          <label>Jenis Harga Jasa</label>
          <select
            value={newSpk.jenis_harga_jasa}
            onChange={(e) =>
              setNewSpk({ ...newSpk, jenis_harga_jasa: e.target.value })
            }
          >
            <option value="per_barang">Per Barang</option>
            <option value="per_lusin">Per Lusin</option>
          </select>
        </div>

        <div className="form-group">
          <label>Harga Jasa</label>
          <input
            type="number"
            value={newSpk.harga_per_jasa}
            onChange={(e) =>
              setNewSpk({ ...newSpk, harga_per_jasa: e.target.value })
            }
            required
          />
        </div>

        <button type="submit" className="btn btn-submit">
          Simpan SPK CMT
        </button>
      </form>
    </div>
  </div>
)}


 </div>
  );
};

export default SpkCmt;

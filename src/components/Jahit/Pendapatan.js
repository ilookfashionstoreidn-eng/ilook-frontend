import React, { useEffect, useState } from "react";
import { FaInfoCircle, FaDownload, FaCalendarAlt, FaMoneyBillWave, FaTimes } from "react-icons/fa";
import "./Pendapatan.css";
import API from "../../api";

const Pendapatan = () => {
  const [pendapatans, setPendapatans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedPendapatan, setSelectedPendapatan] = useState(null);
  const [detailPengiriman, setDetailPengiriman] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPenjahit, setSelectedPenjahit] = useState(null);
  const [kurangiHutang, setKurangiHutang] = useState(false);
  const [kurangiCashbon, setKurangiCashbon] = useState(false);
  const [aksesorisDipilih, setAksesorisDipilih] = useState([]);
  const [detailAksesoris, setDetailAksesoris] = useState([]);
  const [claimBelumDibayar, setClaimBelumDibayar] = useState([]);
  const [claimDipilih, setClaimDipilih] = useState([]);
  const [buktiTransfer, setBuktiTransfer] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloadingPreview, setDownloadingPreview] = useState(false);
  const [invoiceId, setInvoiceId] = useState(null);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [formMode, setFormMode] = useState("create"); // "create" atau "pay"
  const [invoiceData, setInvoiceData] = useState(null); // Simpan data invoice untuk perhitungan realtime

  const [simulasi, setSimulasi] = useState({
    total_pendapatan: 0,
    total_refund_claim: 0,
    total_claim: 0,
    potongan_hutang: 0,
    potongan_cashbon: 0,
    potongan_aksesoris: 0,
    total_transfer: 0,
  });

  useEffect(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startDateStr = startOfMonth.toISOString().split("T")[0];
    const endDateStr = endOfMonth.toISOString().split("T")[0];

    setStartDate(startDateStr);
    setEndDate(endDateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) return;

    // Debounce untuk mencegah terlalu banyak request saat user mengubah tanggal
    const timeoutId = setTimeout(() => {
      fetchPendapatans();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchSimulasi = async (id_penjahit, kurangiHutang, kurangiCashbon, aksesorisIds = [], claimIds = [], preserveTotalPendapatan = null) => {
    if (!startDate || !endDate) return;

    // Pastikan id_penjahit adalah number atau string yang valid
    const penjahitId = typeof id_penjahit === "object" ? id_penjahit?.id_penjahit : id_penjahit;

    console.log("FetchSimulasi called with:", {
      id_penjahit,
      penjahitId,
      kurangiHutang,
      kurangiCashbon,
      id_penjahit_type: typeof id_penjahit,
      penjahitId_type: typeof penjahitId,
    });

    try {
      const response = await API.post("/simulasi-pendapatan", {
        id_penjahit: penjahitId,
        tanggal_awal: startDate,
        tanggal_akhir: endDate,
        kurangi_hutang: kurangiHutang,
        kurangi_cashbon: kurangiCashbon,
        detail_aksesoris_ids: aksesorisIds, // kirim array id
        claim_ids: claimIds, // kirim array id_pengiriman untuk claim
      });

      if (response.data) {
        // Jika preserveTotalPendapatan diberikan (saat edit invoice), gunakan nilai dari invoice
        const totalPendapatan = preserveTotalPendapatan !== null ? preserveTotalPendapatan : response.data.total_pendapatan || 0;
        const totalRefund = preserveTotalPendapatan !== null ? invoiceData?.total_refund_claim || 0 : response.data.total_refund_claim || 0;

        console.log("FetchSimulasi response:", {
          preserveTotalPendapatan,
          totalPendapatan,
          totalRefund,
          potongan_hutang: response.data.potongan_hutang,
          potongan_cashbon: response.data.potongan_cashbon,
          kurangiHutang,
          kurangiCashbon,
          fullResponse: response.data,
        });

        // Debug: Log jika cashbon dicentang tapi nilainya 0
        if (kurangiCashbon && (!response.data.potongan_cashbon || response.data.potongan_cashbon === 0)) {
          console.warn("⚠️ WARNING: kurangiCashbon = true tapi potongan_cashbon dari API = 0. Kemungkinan tidak ada cashbon yang belum lunas untuk penjahit ini.");
        }

        // Hitung total transfer dengan menggunakan total_pendapatan yang benar
        const totalTransfer = totalPendapatan + totalRefund - (response.data.total_claim || 0) - (response.data.potongan_hutang || 0) - (response.data.potongan_cashbon || 0) - (response.data.potongan_aksesoris || 0);

        const simulasiUpdate = {
          total_pendapatan: totalPendapatan,
          total_refund_claim: totalRefund,
          total_claim: response.data.total_claim || 0,
          potongan_hutang: response.data.potongan_hutang || 0,
          potongan_cashbon: response.data.potongan_cashbon || 0,
          potongan_aksesoris: response.data.potongan_aksesoris || 0,
          total_transfer: totalTransfer,
        };

        console.log("Setting simulasi:", simulasiUpdate);
        setSimulasi(simulasiUpdate);
      } else {
        console.warn("Data simulasi kosong:", response.data);
        setSimulasi({
          total_pendapatan: preserveTotalPendapatan !== null ? preserveTotalPendapatan : 0,
          total_refund_claim: preserveTotalPendapatan !== null ? invoiceData?.total_refund_claim || 0 : 0,
          total_claim: 0,
          potongan_hutang: 0,
          potongan_cashbon: 0,
          potongan_aksesoris: 0,
          total_transfer: 0,
        });
      }
    } catch (err) {
      console.error("Gagal fetch simulasi pendapatan", err);
      setSimulasi({
        total_pendapatan: preserveTotalPendapatan !== null ? preserveTotalPendapatan : 0,
        total_refund_claim: preserveTotalPendapatan !== null ? invoiceData?.total_refund_claim || 0 : 0,
        total_claim: 0,
        potongan_hutang: 0,
        potongan_cashbon: 0,
        potongan_aksesoris: 0,
        total_transfer: 0,
      });
    }
  };

  // Fungsi untuk menghitung simulasi secara realtime saat edit invoice
  const calculateSimulasiFromInvoice = () => {
    if (!invoiceData) return;

    const totalPendapatan = parseFloat(invoiceData.total_pendapatan) || 0;
    const totalRefund = parseFloat(invoiceData.total_refund_claim) || 0;

    // Hitung potongan hutang
    // Gunakan nilai yang sudah tersimpan di invoice (total_hutang) jika checkbox dicentang
    let potonganHutang = 0;
    if (kurangiHutang) {
      // Ambil nilai dari invoice, jika tidak ada atau 0, tetap gunakan 0
      const hutangValue = parseFloat(invoiceData.total_hutang);
      potonganHutang = hutangValue && hutangValue > 0 ? hutangValue : 0;
    }

    // Hitung potongan cashbon
    // Gunakan nilai yang sudah tersimpan di invoice (total_cashbon) jika checkbox dicentang
    // TAPI jika nilai di invoice adalah 0, jangan gunakan nilai dari invoice karena mungkin perlu fetch dari API
    let potonganCashbon = 0;
    if (kurangiCashbon) {
      // Ambil nilai dari invoice, jika tidak ada atau 0, tetap gunakan 0
      // Catatan: Jika nilai 0, seharusnya sudah di-fetch dari API sebelumnya
      const cashbonValue = parseFloat(invoiceData.total_cashbon);
      potonganCashbon = cashbonValue && cashbonValue > 0 ? cashbonValue : 0;
    }

    console.log("Calculate simulasi - kurangiHutang:", kurangiHutang, "total_hutang:", invoiceData.total_hutang, "potonganHutang:", potonganHutang);
    console.log("Calculate simulasi - kurangiCashbon:", kurangiCashbon, "total_cashbon:", invoiceData.total_cashbon, "potonganCashbon:", potonganCashbon);

    // Hitung potongan aksesoris dari yang dipilih
    let potonganAksesoris = 0;
    if (detailAksesoris.length > 0 && aksesorisDipilih.length > 0) {
      potonganAksesoris = detailAksesoris.filter((item) => aksesorisDipilih.includes(item.id)).reduce((sum, item) => sum + (parseFloat(item.total_harga) || 0), 0);
    }

    // Hitung potongan claim dari yang dipilih
    let totalClaim = 0;
    if (claimBelumDibayar.length > 0 && claimDipilih.length > 0) {
      totalClaim = claimBelumDibayar.filter((claim) => claimDipilih.includes(claim.id_pengiriman)).reduce((sum, claim) => sum + (parseFloat(claim.claim) || 0), 0);
    }

    // Hitung total transfer
    const totalTransfer = totalPendapatan + totalRefund - totalClaim - potonganHutang - potonganCashbon - potonganAksesoris;

    setSimulasi({
      total_pendapatan: totalPendapatan,
      total_refund_claim: totalRefund,
      total_claim: totalClaim,
      potongan_hutang: potonganHutang,
      potongan_cashbon: potonganCashbon,
      potongan_aksesoris: potonganAksesoris,
      total_transfer: totalTransfer,
    });
  };

  // Di event handler (misal di onChange checkbox)
  // Fetch simulasi untuk create invoice baru atau edit invoice jika checkbox dicentang tapi nilai di invoice 0
  useEffect(() => {
    if (selectedPenjahit && startDate && endDate && formMode === "create") {
      if (!invoiceId) {
        // Create invoice baru - selalu fetch simulasi
        fetchSimulasi(selectedPenjahit.id_penjahit, kurangiHutang, kurangiCashbon, aksesorisDipilih, claimDipilih);
      } else if (isEditingInvoice && invoiceData) {
        // Edit invoice - fetch simulasi jika checkbox dicentang tapi nilai di invoice 0
        const needRecalculateHutang = kurangiHutang && (!invoiceData.total_hutang || parseFloat(invoiceData.total_hutang) === 0);
        const needRecalculateCashbon = kurangiCashbon && (!invoiceData.total_cashbon || parseFloat(invoiceData.total_cashbon) === 0);

        console.log("Edit invoice check:", {
          kurangiHutang,
          kurangiCashbon,
          total_hutang: invoiceData.total_hutang,
          total_cashbon: invoiceData.total_cashbon,
          needRecalculateHutang,
          needRecalculateCashbon,
        });

        // SELALU fetch dari API jika checkbox cashbon dicentang (untuk mendapatkan nilai terbaru)
        // karena cashbon bisa berubah setelah invoice dibuat
        // Gunakan id_penjahit dari invoiceData untuk memastikan konsistensi
        const invoicePenjahitId = invoiceData.id_penjahit || selectedPenjahit?.id_penjahit;

        if (needRecalculateHutang || needRecalculateCashbon || kurangiCashbon) {
          // Fetch simulasi untuk mendapatkan nilai terbaru, tapi preserve total_pendapatan dari invoice
          const totalPendapatanFromInvoice = parseFloat(invoiceData.total_pendapatan) || 0;
          console.log("Fetching simulasi dengan preserveTotalPendapatan:", totalPendapatanFromInvoice, "karena kurangiCashbon:", kurangiCashbon, "id_penjahit:", invoicePenjahitId);
          fetchSimulasi(invoicePenjahitId, kurangiHutang, kurangiCashbon, aksesorisDipilih, claimDipilih, totalPendapatanFromInvoice);
        } else {
          // Gunakan nilai dari invoice, hitung secara lokal
          calculateSimulasiFromInvoice();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPenjahit, aksesorisDipilih, claimDipilih, kurangiHutang, kurangiCashbon, startDate, endDate, formMode, invoiceId, isEditingInvoice, invoiceData]);

  // Hitung simulasi secara realtime saat edit invoice (jika tidak perlu fetch dari API)
  useEffect(() => {
    if (isEditingInvoice && invoiceData && formMode === "create" && invoiceId) {
      // Cek apakah perlu fetch dari API atau cukup hitung lokal
      const needRecalculateHutang = kurangiHutang && (!invoiceData.total_hutang || parseFloat(invoiceData.total_hutang) === 0);
      const needRecalculateCashbon = kurangiCashbon && (!invoiceData.total_cashbon || parseFloat(invoiceData.total_cashbon) === 0);

      // Jika tidak perlu recalculate, hitung secara lokal
      if (!needRecalculateHutang && !needRecalculateCashbon) {
        calculateSimulasiFromInvoice();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kurangiHutang, kurangiCashbon, aksesorisDipilih, claimDipilih, invoiceData, isEditingInvoice, formMode, detailAksesoris, claimBelumDibayar, invoiceId]);

  const fetchDetailAksesoris = async (penjahitId) => {
    try {
      const response = await API.get(`/detail-pesanan-aksesoris?penjahit_id=${penjahitId}`);
      setDetailAksesoris(response.data);
    } catch (error) {
      console.error("Gagal mengambil aksesoris:", error);
    }
  };

  const fetchClaimBelumDibayar = async (penjahitId) => {
    try {
      const response = await API.get(`/pendapatan/claim-belum-dibayar/${penjahitId}`);
      setClaimBelumDibayar(response.data.data || []);
    } catch (error) {
      console.error("Gagal mengambil claim belum dibayar:", error);
      setClaimBelumDibayar([]);
    }
  };

  const fetchPendapatans = async () => {
    if (!startDate || !endDate) {
      console.warn("Start date atau end date belum diisi");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await API.get("/pendapatan", {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setPendapatans(data);
    } catch (e) {
      console.error("Error fetching pendapatan:", e);
      if (e.response?.status === 429) {
        setError("Terlalu banyak request. Silakan tunggu sebentar dan coba lagi.");
      } else {
        setError("Gagal mengambil data pendapatan");
      }
      setPendapatans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      alert("Pilih periode tanggal terlebih dahulu");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        id_penjahit: selectedPenjahit.id_penjahit,
        tanggal_awal: startDate,
        tanggal_akhir: endDate,
        kurangi_hutang: kurangiHutang,
        kurangi_cashbon: kurangiCashbon,
        detail_aksesoris_ids: aksesorisDipilih,
        claim_ids: claimDipilih,
      };

      let response;
      if (isEditingInvoice && invoiceId) {
        // Update invoice
        response = await API.put(`/pendapatan/${invoiceId}/update-invoice`, payload);
      } else {
        // Create invoice
        response = await API.post("/pendapatan/create-invoice", payload);
      }

      if (response.status === 201 || response.status === 200) {
        alert(response.data.message || "Invoice berhasil dibuat!");
        setInvoiceId(response.data.data.id_pendapatan);
        setFormMode("pay");
        setIsEditingInvoice(false);
        fetchPendapatans();
      }
    } catch (error) {
      console.error("Error saat create/update invoice:", error);
      if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert("Terjadi kesalahan saat membuat invoice.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBayarInvoiceSubmit = async (e) => {
    e.preventDefault();

    if (!invoiceId) {
      alert("Invoice tidak ditemukan");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();

      if (buktiTransfer) {
        formData.append("bukti_transfer", buktiTransfer);
      }

      const response = await API.put(`/pendapatan/${invoiceId}/bayar`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 200) {
        alert(response.data.message || "Invoice berhasil dibayarkan!");
        handleCloseModal();
        fetchPendapatans();
      }
    } catch (error) {
      console.error("Error saat bayar invoice:", error);
      if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert("Terjadi kesalahan saat membayar invoice.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoicePreview = async (pendapatan) => {
    if (!startDate || !endDate) {
      alert("Pilih periode tanggal terlebih dahulu");
      return;
    }

    // Prevent multiple simultaneous requests
    if (downloadingPreview) {
      return;
    }

    setDownloadingPreview(true);
    try {
      const response = await API.post(
        "/pendapatan/download-invoice-preview",
        {
          id_penjahit: pendapatan.id_penjahit,
          tanggal_awal: startDate,
          tanggal_akhir: endDate,
        },
        {
          responseType: "blob",
        }
      );

      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice-Preview-Pendapatan-${pendapatan.id_penjahit}_${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading invoice preview:", error);
      if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert("Gagal mengunduh preview invoice.");
      }
    } finally {
      setDownloadingPreview(false);
    }
  };

  const handleDetailClick = async (pendapatan) => {
    setSelectedPendapatan(pendapatan);
    setLoading(true);
    setError("");

    try {
      // Panggil API untuk mendapatkan detail pengiriman
      const response = await API.get(`/pendapatan/${pendapatan.id_pendapatan}/pengiriman`);
      setDetailPengiriman(response.data.pengiriman || []); // Simpan detail pengiriman ke state
    } catch (error) {
      console.error("Error fetching detail pengiriman:", error);
      setError(error.response?.data?.message || "Gagal memuat detail pengiriman.");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedPendapatan(null);
    setDetailPengiriman([]);
  };

  const handleDownload = async (idPendapatan) => {
    try {
      const response = await API.get(`/pendapatan/${idPendapatan}/download-nota`, {
        responseType: "blob", // Pastikan menerima file sebagai blob
      });

      // Buat URL blob dari response data
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `nota_pendapatan_${idPendapatan}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Hapus URL blob setelah selesai
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert(error.response?.data?.message || "Gagal mengunduh nota.");
    }
  };

  const handleOpenForm = (penjahit) => {
    if (!startDate || !endDate) {
      alert("Pilih periode tanggal terlebih dahulu");
      return;
    }
    setSelectedPenjahit(penjahit);
    setShowForm(true);
    setFormMode("create");
    setInvoiceId(null);
    setIsEditingInvoice(false);
    setKurangiHutang(false);
    setKurangiCashbon(false);
    setAksesorisDipilih([]);
    setClaimDipilih([]);
    setBuktiTransfer(null);
    fetchDetailAksesoris(penjahit.id_penjahit);
    fetchClaimBelumDibayar(penjahit.id_penjahit);
  };

  const handleEditInvoice = async (pendapatan) => {
    if (!startDate || !endDate) {
      alert("Pilih periode tanggal terlebih dahulu");
      return;
    }
    try {
      const response = await API.get(`/pendapatan/${pendapatan.pendapatan_id}/invoice`);
      const invoice = response.data.data;

      console.log("Invoice data untuk edit:", invoice);
      console.log("Total Hutang dari invoice:", invoice.total_hutang);
      console.log("Total Cashbon dari invoice:", invoice.total_cashbon);
      console.log("Kurangi Hutang:", invoice.kurangi_hutang);
      console.log("Kurangi Cashbon:", invoice.kurangi_cashbon);

      // Simpan data invoice untuk perhitungan realtime
      setInvoiceData(invoice);

      // Set simulasi awal dari invoice
      const simulasiData = {
        total_pendapatan: parseFloat(invoice.total_pendapatan) || 0,
        total_refund_claim: parseFloat(invoice.total_refund_claim) || 0,
        total_claim: parseFloat(invoice.total_claim) || 0,
        potongan_hutang: parseFloat(invoice.total_hutang) || 0,
        potongan_cashbon: parseFloat(invoice.total_cashbon) || 0,
        potongan_aksesoris: parseFloat(invoice.potongan_aksesoris) || 0,
        total_transfer: parseFloat(invoice.total_transfer) || 0,
      };

      // Set semua state sekaligus
      // Pastikan menggunakan id_penjahit dari invoice, bukan dari pendapatan object
      const penjahitObject = {
        id_penjahit: invoice.id_penjahit,
        nama_penjahit: invoice.penjahit?.nama_penjahit || pendapatan.nama_penjahit || "Unknown",
      };

      console.log("Setting selectedPenjahit untuk edit:", {
        "pendapatan.id_penjahit": pendapatan.id_penjahit,
        "invoice.id_penjahit": invoice.id_penjahit,
        penjahitObject: penjahitObject,
      });

      setSelectedPenjahit(penjahitObject);
      setInvoiceId(invoice.id_pendapatan);
      setIsEditingInvoice(true);
      setFormMode("create");
      setKurangiHutang(invoice.kurangi_hutang || false);
      setKurangiCashbon(invoice.kurangi_cashbon || false);
      setAksesorisDipilih(invoice.detail_aksesoris_ids || []);
      setClaimDipilih(invoice.claim_ids || []);
      setBuktiTransfer(null);
      setSimulasi(simulasiData);

      // Buka form setelah semua state di-set
      setShowForm(true);

      fetchDetailAksesoris(invoice.id_penjahit);
      fetchClaimBelumDibayar(invoice.id_penjahit);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      alert("Gagal memuat data invoice");
    }
  };

  const handleBayarInvoice = async (pendapatan) => {
    if (!startDate || !endDate) {
      alert("Pilih periode tanggal terlebih dahulu");
      return;
    }
    try {
      const response = await API.get(`/pendapatan/${pendapatan.pendapatan_id}/invoice`);
      const invoice = response.data.data;

      console.log("Invoice data:", invoice);
      console.log("Total Pendapatan:", invoice.total_pendapatan);

      // Set simulasi dari invoice TERLEBIH DAHULU sebelum membuka form
      const simulasiData = {
        total_pendapatan: parseFloat(invoice.total_pendapatan) || 0,
        total_claim: parseFloat(invoice.total_claim) || 0,
        potongan_hutang: parseFloat(invoice.total_hutang) || 0,
        potongan_cashbon: parseFloat(invoice.total_cashbon) || 0,
        potongan_aksesoris: parseFloat(invoice.potongan_aksesoris) || 0,
        total_transfer: parseFloat(invoice.total_transfer) || 0,
      };

      console.log("Simulasi data:", simulasiData);

      // Set semua state sekaligus
      setSelectedPenjahit(pendapatan);
      setInvoiceId(invoice.id_pendapatan);
      setIsEditingInvoice(false);
      setFormMode("pay");
      setKurangiHutang(invoice.kurangi_hutang || false);
      setKurangiCashbon(invoice.kurangi_cashbon || false);
      setAksesorisDipilih(invoice.detail_aksesoris_ids || []);
      setClaimDipilih(invoice.claim_ids || []);
      setBuktiTransfer(null);
      setSimulasi(simulasiData);

      // Buka form setelah semua state di-set
      setShowForm(true);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      alert("Gagal memuat data invoice");
    }
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setSelectedPenjahit(null);
    setKurangiHutang(false);
    setKurangiCashbon(false);
    setAksesorisDipilih([]);
    setClaimDipilih([]);
    setClaimBelumDibayar([]);
    setBuktiTransfer(null);
    setInvoiceId(null);
    setIsEditingInvoice(false);
    setFormMode("create");
    setInvoiceData(null);
    setSimulasi({
      total_pendapatan: 0,
      total_refund_claim: 0,
      total_claim: 0,
      potongan_hutang: 0,
      potongan_cashbon: 0,
      potongan_aksesoris: 0,
      total_transfer: 0,
    });
  };

  const handleFilter = () => {
    if (!startDate || !endDate) {
      alert("Silakan pilih tanggal mulai dan tanggal akhir terlebih dahulu");
      return;
    }

    setSelectedPenjahit(null);
    setKurangiHutang(false);
    setKurangiCashbon(false);
    setAksesorisDipilih([]);
    setClaimDipilih([]);
    setBuktiTransfer(null);
    setSimulasi({
      total_pendapatan: 0,
      total_refund_claim: 0,
      total_claim: 0,
      potongan_hutang: 0,
      potongan_cashbon: 0,
      potongan_aksesoris: 0,
      total_transfer: 0,
    });
    fetchPendapatans();
  };

  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  return (
    <div className="pendapatan-container">
      <div className="pendapatan-header">
        <FaMoneyBillWave style={{ fontSize: "32px", color: "#0369a1" }} />
        <h1>Daftar Pendapatan</h1>
      </div>

      <div className="pendapatan-filter-card">
        <div className="pendapatan-filter-group">
          <div className="pendapatan-filter-item">
            <label>
              <FaCalendarAlt /> Dari Tanggal
            </label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="pendapatan-filter-item">
            <label>
              <FaCalendarAlt /> Sampai Tanggal
            </label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <button onClick={handleFilter} className="pendapatan-btn-filter">
            Terapkan Filter
          </button>
        </div>
      </div>

      <div className="pendapatan-table-card">
        {loading ? (
          <div className="pendapatan-loading">Memuat data...</div>
        ) : error ? (
          <div className="pendapatan-error">{error}</div>
        ) : pendapatans.length === 0 ? (
          <div className="pendapatan-empty">
            <div className="pendapatan-empty-icon">💰</div>
            <p>Tidak ada data pendapatan</p>
          </div>
        ) : (
          <div className="pendapatan-table-wrapper">
            <table className="pendapatan-table">
              <thead>
                <tr>
                  <th>Nama Penjahit</th>
                  <th>Total Pendapatan</th>
                  <th>Total Transfer</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pendapatans.map((pendapatan) => (
                  <tr key={pendapatan.id_penjahit}>
                    <td>
                      <span className="pendapatan-name">{pendapatan.nama_penjahit || "Tidak Diketahui"}</span>
                    </td>
                    <td>
                      <span className="pendapatan-amount">{formatRupiah(pendapatan.total_pendapatan || 0)}</span>
                    </td>
                    <td>
                      <span className="pendapatan-amount">{formatRupiah(pendapatan.total_transfer || 0)}</span>
                    </td>
                    <td>
                      {pendapatan.total_pendapatan > 0 ? (
                        pendapatan.status_pembayaran === "belum dibayar" && pendapatan.pendapatan_id ? (
                          <button onClick={() => handleBayarInvoice(pendapatan)} className="pendapatan-btn pendapatan-btn-primary">
                            Bayar
                          </button>
                        ) : pendapatan.status_pembayaran === "sudah dibayar" ? (
                          <span className="pendapatan-badge pendapatan-badge-success">Sudah Dibayar</span>
                        ) : (
                          <button onClick={() => handleOpenForm(pendapatan)} className="pendapatan-btn pendapatan-btn-primary">
                            Buat Invoice
                          </button>
                        )
                      ) : (
                        <span className="pendapatan-badge pendapatan-badge-disabled">Tidak ada pendapatan</span>
                      )}
                    </td>
                    <td>
                      <div className="pendapatan-actions">
                        {pendapatan.pendapatan_id ? (
                          <>
                            {pendapatan.status_pembayaran === "belum dibayar" && (
                              <button className="pendapatan-btn-icon" onClick={() => handleDownload(pendapatan.pendapatan_id)} title="Download Invoice">
                                <FaDownload />
                              </button>
                            )}
                            {pendapatan.status_pembayaran === "sudah dibayar" && (
                              <>
                                <button className="pendapatan-btn-icon" onClick={() => handleDetailClick(pendapatan)} title="Detail">
                                  <FaInfoCircle />
                                </button>
                                <button className="pendapatan-btn-icon" onClick={() => handleDownload(pendapatan.pendapatan_id)} title="Download Invoice">
                                  <FaDownload />
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              className="pendapatan-btn-icon"
                              onClick={() => handleDownloadInvoicePreview(pendapatan)}
                              title="Download Preview Invoice"
                              disabled={downloadingPreview || pendapatan.total_pendapatan === 0}
                              style={{ opacity: downloadingPreview || pendapatan.total_pendapatan === 0 ? 0.5 : 1 }}
                            >
                              <FaDownload />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Pendapatan */}
      {selectedPendapatan && (
        <div className="pendapatan-modal-overlay" onClick={closeModal}>
          <div className="pendapatan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pendapatan-modal-header">
              <h2>Detail Pendapatan #{selectedPendapatan.id_pendapatan}</h2>
              <button className="pendapatan-modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <div className="pendapatan-modal-body">
              <div className="pendapatan-detail-grid">
                <div className="pendapatan-detail-item">
                  <label>Total Claim</label>
                  <span>{formatRupiah(selectedPendapatan.total_claim || 0)}</span>
                </div>
                <div className="pendapatan-detail-item">
                  <label>Total Refund Claim</label>
                  <span>{formatRupiah(selectedPendapatan.total_refund_claim || 0)}</span>
                </div>
                <div className="pendapatan-detail-item">
                  <label>Total Cashbon</label>
                  <span>{formatRupiah(selectedPendapatan.total_cashbon || 0)}</span>
                </div>
                <div className="pendapatan-detail-item">
                  <label>Total Hutang</label>
                  <span>{formatRupiah(selectedPendapatan.total_hutang || 0)}</span>
                </div>
                <div className="pendapatan-detail-item">
                  <label>Handtag</label>
                  <span>{formatRupiah(selectedPendapatan.handtag || 0)}</span>
                </div>
                <div className="pendapatan-detail-item">
                  <label>Transportasi</label>
                  <span>{formatRupiah(selectedPendapatan.transportasi || 0)}</span>
                </div>
              </div>

              <h3 style={{ marginTop: "32px", marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#1e293b" }}>Detail Pengiriman</h3>

              {loading ? (
                <div className="pendapatan-loading">Memuat detail...</div>
              ) : error ? (
                <div className="pendapatan-error">{error}</div>
              ) : (
                <div className="pendapatan-table-wrapper">
                  <table className="pendapatan-modal-table">
                    <thead>
                      <tr>
                        <th>ID Pengiriman</th>
                        <th>Tanggal Pengiriman</th>
                        <th>Total Pengiriman</th>
                        <th>Gaji</th>
                        <th>Claim</th>
                        <th>Refund Claim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailPengiriman.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                            Tidak ada data pengiriman
                          </td>
                        </tr>
                      ) : (
                        detailPengiriman.map((pengiriman) => (
                          <tr key={pengiriman.id_pengiriman}>
                            <td>{pengiriman.id_pengiriman}</td>
                            <td>{new Date(pengiriman.tanggal_pengiriman).toLocaleDateString("id-ID")}</td>
                            <td>{pengiriman.total_barang_dikirim || 0}</td>
                            <td>{formatRupiah(pengiriman.total_bayar || 0)}</td>
                            <td>{formatRupiah(pengiriman.claim || 0)}</td>
                            <td>{formatRupiah(pengiriman.refund_claim || 0)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Invoice */}
      {showForm && (
        <div className="pendapatan-modal-overlay" onClick={handleCloseModal}>
          <div className="pendapatan-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="pendapatan-modal-header">
              <h2>{formMode === "pay" ? "Bayar Invoice" : isEditingInvoice ? "Edit Invoice" : "Buat Invoice"}</h2>
              <button className="pendapatan-modal-close" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>
            <div className="pendapatan-modal-body">
              {formMode === "create" ? (
                <form onSubmit={handleCreateInvoice} className="pendapatan-form">
                  <div className="pendapatan-form-group">
                    <label>ID Penjahit</label>
                    <input type="text" value={selectedPenjahit?.id_penjahit || ""} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Nama Penjahit</label>
                    <input type="text" value={selectedPenjahit?.nama_penjahit || ""} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Total Pendapatan</label>
                    <input type="text" value={formatRupiah(simulasi.total_pendapatan || 0)} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Potongan Hutang</label>
                    <input type="text" value={formatRupiah(simulasi.potongan_hutang || 0)} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Potongan Cashbon</label>
                    <input type="text" value={formatRupiah(simulasi.potongan_cashbon || 0)} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Potongan Aksesoris</label>
                    <input type="text" value={formatRupiah(simulasi.potongan_aksesoris || 0)} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Potongan Claim</label>
                    <input type="text" value={formatRupiah(simulasi.total_claim || 0)} readOnly />
                  </div>

                  <div className="pendapatan-checkbox-group">
                    <label>
                      <input type="checkbox" checked={kurangiHutang} onChange={(e) => setKurangiHutang(e.target.checked)} />
                      Potong Hutang
                    </label>
                  </div>

                  <div className="pendapatan-checkbox-group">
                    <label>
                      <input type="checkbox" checked={kurangiCashbon} onChange={(e) => setKurangiCashbon(e.target.checked)} />
                      Potong Cashbon
                    </label>
                  </div>

                  {detailAksesoris.length > 0 && (
                    <div className="pendapatan-checkbox-group">
                      <label style={{ marginBottom: "8px", fontWeight: "600" }}>Potong Aksesoris:</label>
                      {detailAksesoris.map((item) => (
                        <div key={item.id} className="pendapatan-checkbox-item">
                          <label>
                            <input
                              type="checkbox"
                              value={item.id}
                              checked={aksesorisDipilih.includes(item.id)}
                              onChange={(e) => {
                                const id = parseInt(e.target.value);
                                if (e.target.checked) {
                                  setAksesorisDipilih([...aksesorisDipilih, id]);
                                } else {
                                  setAksesorisDipilih(aksesorisDipilih.filter((itemId) => itemId !== id));
                                }
                              }}
                            />
                            {item.aksesoris.nama_aksesoris} - {formatRupiah(parseInt(item.total_harga))}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pendapatan-checkbox-group">
                    <label style={{ marginBottom: "8px", fontWeight: "600" }}>Potong Claim:</label>
                    {claimBelumDibayar.length > 0 ? (
                      claimBelumDibayar.map((claim) => (
                        <div key={claim.id_pengiriman} className="pendapatan-checkbox-item">
                          <label>
                            <input
                              type="checkbox"
                              value={claim.id_pengiriman}
                              checked={claimDipilih.includes(claim.id_pengiriman)}
                              onChange={(e) => {
                                const id = parseInt(e.target.value);
                                if (e.target.checked) {
                                  setClaimDipilih([...claimDipilih, id]);
                                } else {
                                  setClaimDipilih(claimDipilih.filter((itemId) => itemId !== id));
                                }
                              }}
                            />
                            ID Pengiriman: {claim.id_pengiriman} - Tanggal: {new Date(claim.tanggal_pengiriman).toLocaleDateString("id-ID")} - Claim: {formatRupiah(parseInt(claim.claim))}
                          </label>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: "8px", color: "#94a3b8", fontStyle: "italic" }}>Tidak ada claim yang belum dibayar</div>
                    )}
                  </div>

                  <div className="pendapatan-form-group pendapatan-total-transfer">
                    <label>Total Transfer</label>
                    <input type="text" value={formatRupiah(simulasi.total_transfer || 0)} readOnly />
                  </div>

                  <div className="pendapatan-form-actions">
                    <button type="button" className="pendapatan-btn pendapatan-btn-cancel" onClick={handleCloseModal}>
                      Batal
                    </button>
                    <button type="submit" className="pendapatan-btn pendapatan-btn-submit" disabled={loading}>
                      {loading ? "Menyimpan..." : isEditingInvoice ? "Update Invoice" : "Buat Invoice"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleBayarInvoiceSubmit} className="pendapatan-form">
                  <div className="pendapatan-form-group">
                    <label>ID Penjahit</label>
                    <input type="text" value={selectedPenjahit?.id_penjahit || ""} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Nama Penjahit</label>
                    <input type="text" value={selectedPenjahit?.nama_penjahit || ""} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Total Pendapatan</label>
                    <input type="text" value={formatRupiah(simulasi.total_pendapatan || 0)} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Potongan Hutang</label>
                    <input type="text" value={formatRupiah(simulasi.potongan_hutang || 0)} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Potongan Cashbon</label>
                    <input type="text" value={formatRupiah(simulasi.potongan_cashbon || 0)} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Potongan Aksesoris</label>
                    <input type="text" value={formatRupiah(simulasi.potongan_aksesoris || 0)} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Potongan Claim</label>
                    <input type="text" value={formatRupiah(simulasi.total_claim || 0)} readOnly />
                  </div>

                  <div className="pendapatan-form-group pendapatan-total-transfer">
                    <label>Total Transfer</label>
                    <input type="text" value={formatRupiah(simulasi.total_transfer || 0)} readOnly />
                  </div>

                  <div className="pendapatan-form-group">
                    <label>Upload Bukti Transfer</label>
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => setBuktiTransfer(e.target.files[0])} />
                  </div>

                  <div className="pendapatan-form-actions">
                    <button type="button" className="pendapatan-btn pendapatan-btn-cancel" onClick={() => handleEditInvoice(selectedPenjahit)}>
                      Edit Invoice
                    </button>
                    <button type="button" className="pendapatan-btn pendapatan-btn-cancel" onClick={handleCloseModal}>
                      Batal
                    </button>
                    <button type="submit" className="pendapatan-btn pendapatan-btn-submit" disabled={loading}>
                      {loading ? "Memproses..." : "Bayar Invoice"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pendapatan;

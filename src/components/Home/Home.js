import React, { useEffect, useState } from "react";
import { Doughnut, Pie } from "react-chartjs-2";
import "chart.js/auto"; // Pastikan ini diimport agar chart bisa berfungsi
import './Home.css';
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Tambahkan ini
import ChartDataLabels from 'chartjs-plugin-datalabels';
import API from "../../api";

import {   } from 'react-icons/fa';


const Home = () => {
  const [spkData, setSpkData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [categoryInfo, setCategoryInfo] = useState([]);
  const [sisaProdukChart, setSisaProdukChart] = useState(null);
  const [selectedCMT, setSelectedCMT] = useState("");
  const [cmtList, setCmtList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kinerjaData, setKinerjaData] = useState({});
  const [kategoriProduk, setKategoriProduk] = useState([]);
  const [urgentProducts, setUrgentProducts] = useState([]);

  const navigate = useNavigate(); // Inisialisasi useNavigate



  useEffect(() => {
    const fetchCmtList = async () => {
      try {
        setLoading(true);
        const response = await API.get("/penjahit");
        if (response.data.length > 0) {
          setCmtList(response.data);
        }
      } catch (error) {
        setError("Gagal mengambil data penjahit.");
      } finally {
        setLoading(false);
      }
    };

    fetchCmtList();
  }, []);


  useEffect(() => {
    const fetchSpkData = async () => {
      try {
        const response = await API.get("/spkcmt", {
          params: { id_penjahit: selectedCMT }
        });

        // Ambil array dari response.data.data
        setSpkData(Array.isArray(response.data.spk.data) ? response.data.spk.data : []);
        setKategoriProduk(response.data.kategori_count || []);
        setUrgentProducts(response.data.urgent_products || [])

      } catch (error) {
        console.error("Error fetching SPK data:", error);
        setSpkData([]);
        setKategoriProduk([])
        setUrgentProducts([]);
      }
    };

    fetchSpkData();
  }, [selectedCMT]);




  useEffect(() => {
    const fetchKinerjaCMT = async () => {
      try {
        const response = await API.get("/kinerja-cmt");
        setKinerjaData(response.data);
      } catch (error) {
        console.error("Error fetching kinerja CMT:", error);
      }
    };
    fetchKinerjaCMT();
  }, []);


  useEffect(() => {
    const fetchCategoryCount = async () => {
      try {
        const response = await API.get("/kinerja-cmt/kategori-count-by-penjahit"
        );
        const categoryData = response.data;

        // Siapkan data untuk Pie Chart
        const labels = Object.keys(categoryData); // ['A', 'B', 'C', 'D']
        const values = Object.values(categoryData).map((item) => item.count); // [1, 1, 0, 0]
        const percentages = Object.values(categoryData).map(
          (item) => item.percentage
        ); // [50, 50, 0, 0]

        setChartData({
          labels,
          datasets: [
            {
              label: "Jumlah Penjahit",
              data: values,
              backgroundColor: ["#B2CD38", "#5E95C3", "#E7AD41", "#DD6262"],
              hoverBackgroundColor: [
                "#B2CD38",
                "#5E95C3",
                "#E7AD41",
                "#DD6262",
              ],
            },
          ],
        });

        // Simpan info kategori untuk ditampilkan di samping chart
        const info = labels.map((label, index) => ({
          label,
          percentage: percentages[index],
        }));
        setCategoryInfo(info);
      } catch (error) {
        console.error("Error fetching category data:", error);
      }
    };

    fetchCategoryCount();
  }, []);

  useEffect(() => {
  const fetchSisaProdukData = async () => {
    try {
      const response = await API.get("/kemampuan-cmt");
      const data = response.data;

      // Hitung jumlah kategori
      let overloadCount = 0, underloadCount = 0, normalCount = 0;

      Object.values(data).forEach(item => {
        if (item.kategori_sisa_produk === "Overload") overloadCount++;
        else if (item.kategori_sisa_produk === "Underload") underloadCount++;
        else normalCount++;
      });

      // Siapkan data untuk Pie Chart
      setSisaProdukChart({
        labels: ["Overload", "Underload", "Normal"],
        datasets: [
          {
            label: "Kategori Sisa Produk",
            data: [overloadCount, underloadCount, normalCount],
            backgroundColor: ["#FF6384", "#FFCE56", "#36A2EB"], // Warna kategori
            hoverBackgroundColor: ["#E74C3C", "#F1C40F", "#3498DB"],
          },
        ],
      });

    } catch (error) {
      console.error("Error fetching sisa produk data:", error);
    }
  };

  fetchSisaProdukData();
}, []);


  const inProgressCount = spkData.filter(
    (item) => item.status === "In Progress"
  ).length;
  const pendingCount = spkData.filter((item) => item.status === "Pending").length;
  const completedCount = spkData.filter((item) => item.status === "Completed")
    .length;

  // Breakdown data untuk In Progress berdasarkan warna
  const inProgressRed = spkData.filter(
    (item) => item.status === "In Progress" && item.status_with_color?.color === "red"
  ).length;

  const inProgressBlue = spkData.filter(
    (item) => item.status === "In Progress" && item.status_with_color?.color === "blue"
  ).length;

  const inProgressGreen = spkData.filter(
    (item) => item.status === "In Progress" && item.status_with_color?.color === "green"
  ).length;


  // Data untuk Donut Chart
  const donutData = {
    labels: ["Periode 3", "Periode 2", "Lebih dari 2 periode"],
    datasets: [
      {
        label: "In Progress Breakdown",
        data: [inProgressRed, inProgressBlue, inProgressGreen],
        backgroundColor: ["#EAC98D", "#A0DCDC", "#DCA5A0"],
        hoverBackgroundColor: ["#E4B255", "#53CCCC", "#E58D85"],
      },
    ],
  };


  const handleChartClick = (event, elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const selectedCategory = ["Overload", "Underload", "Normal"][index];
      navigate(`/kinerja2?filter=${selectedCategory.toLowerCase()}`);
    }
  };

  const handleChartClickKategoriKinerja = (event, elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const selectedCategory = ["A", "B", "C", "D"][index]; // Misalnya kategori kinerja
      navigate(`/kinerja2?kinerja=${selectedCategory.toLowerCase()}`);
    }
  };


  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          position: "bottom",
        },
      },
      datalabels: {
        color: "#fff", // Warna teks label
        anchor: "center", // Posisi teks di tengah
        align: "center",
        font: {
          weight: "bold",
          size: 14,
        },
        formatter: (value, context) => {
          return value; // Menampilkan angka kategori
        },
      },
    },
    onClick: handleChartClick,
  };
  const chartOptionsKinerja = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          position: "bottom",
        },
      },
      datalabels: {
        color: "#fff",
        anchor: "center",
        align: "center",
        font: {
          weight: "bold",
          size: 14,
        },
        formatter: (value) => value,
      },
    },
    onClick: handleChartClickKategoriKinerja,
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
  };

  // Cari nama penjahit berdasarkan selectedCMT
  const selectedCMTName = cmtList.find(cmt => Number(cmt.id_penjahit) === Number(selectedCMT))?.nama_penjahit || "";

  // Ambil kategori berdasarkan nama penjahit
  const kategoriCMT = selectedCMTName && kinerjaData[selectedCMTName]
    ? kinerjaData[selectedCMTName].kategori || "N/A"
    : "N/A";


  return (
    <div>
      
    </div>
  );
};

export default Home;
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
    <div className="dashboard-container">
          <header className="dashboard-header">
          <h1 className="dashboard-title">
              Dashboard {selectedCMTName && kategoriCMT !== "N/A" ? `- ${selectedCMTName} (Kategori: ${kategoriCMT})` : ""}
            </h1>



              <div className="user-profile">
                  <img
                      src={`http://localhost:8000/storage/${localStorage.getItem('foto') || 'user.png'}`}
                      alt=""
                  />
              </div>
          </header>


         <div className="dashboard-content">

         <div className="filter-container">
            <select
                value={selectedCMT}
                onChange={(e) => setSelectedCMT(e.target.value)}
                className="filter-select1"
                >
                <option value="">All CMT</option>
                {cmtList.map((cmt) => (
                    <option key={cmt.id_penjahit} value={cmt.id_penjahit}>
                        {cmt.nama_penjahit}
                    </option>
                ))}
                </select>
          </div>

         <div className="dashboard-stats">
          {/* Kategori Produk */}
          <div className="stat-card">
            <div className="stat-header">
              <i className="fas fa-boxes"></i>
              <h3>Kategori Produk</h3>
            </div>
            <div className="stat-content">
              {kategoriProduk.length > 0 ? (
                kategoriProduk.map((item, index) => (
                  <div key={index} className="stat-item">
                    <span>{item.kategori_produk}</span>
                    <strong>{item.total_produk} produk</strong>
                  </div>
                ))
              ) : (
                <p className="empty-text">Tidak ada data kategori.</p>
              )}
            </div>
          </div>

            {/* Produk Urgent */}
            <div className="stat-card urgent">
              <div className="stat-header">
                <i className="fas fa-exclamation-circle"></i>
                <h3>Produk Urgent</h3>
              </div>
              <div className="stat-content">
                {urgentProducts.length > 0 ? (
                  urgentProducts.map((product, index) => (
                    <div key={index} className="stat-item">
                      <span>{product.nama_produk}</span>
                    </div>
                  ))
                ) : (
                  <p className="empty-text">Tidak ada produk urgent.</p>
                )}
              </div>
            </div>
          </div>

            {/* Kontainer untuk card-animate */}
            <div className="card-container">
              <div className="card card-animate">
                <div className="card-icon" style={{ backgroundColor: '#d9af5e' }}>
                  <i className="fas fa-tasks"></i>
                </div>
                <div className="card-content">
                <h4 className="card-title">In Progress </h4>
                  <p className="value">{inProgressCount}</p>
               </div>
            </div>
              <div className="card card-animate">
                <div className="card-icon" style={{ backgroundColor: '#d26b75' }}>
                  <i className="fas fa-clock"></i>
                </div>
                <div className="card-content">
                <h3 className="card-title">Pending </h3>
                  <p className="value">{pendingCount}</p>
                </div>
              </div>
              <div className="card card-animate">
                <div className="card-icon" style={{ backgroundColor: '#88BC78' }}>
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="card-content">
                <h2 className="card-title">Completed </h2>
                  <p className="value">{completedCount}</p>
                </div>
              </div>
            </div>



            <div className="charts-wrapper">
              {/* Kontainer untuk donut chart */}
              <div className="chart-container">
                <div className="chart-card card2">
                  <h2 className="chart-title">In Progress</h2>
                  <div className="chart-content">
                  <Doughnut data={donutData} options={donutOptions}   />
                  </div>
                </div>
              </div>

              {/* Kontainer untuk pie chart */}
              {chartData && !selectedCMT && (
              <div className="chart-card card2">
                <h2 className="chart-title">Kinerja Penjahit</h2>
                <div className="chart-content">
                  <Pie data={chartData} options={chartOptionsKinerja} plugins={[ChartDataLabels]} />
                  <div className="chart-info">
                    {categoryInfo.map((item) => (
                      <div key={item.label} className="info-item">
                        <span
                          className="info-color"
                          style={{
                            backgroundColor:
                              chartData.datasets[0].backgroundColor[
                                chartData.labels.indexOf(item.label)
                              ],
                          }}
                        ></span>
                        <span className="info-label">{item.label}</span>
                        <span className="info-percentage">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}


              <div className="chart-container">
              { sisaProdukChart && !selectedCMT && (
                <div className="chart-card card2">
                  <h2 className="chart-title">Sisa Produk CMT</h2>
                  <div className="chart-content">
                  <Pie data={sisaProdukChart} options={chartOptions} plugins={[ChartDataLabels]} />

                  </div>
          </div>
          )}


        </div>

            </div>







          </div>
    </div>

  );
};

export default Home;
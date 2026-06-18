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


  const totalSpk = spkData.length;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {selectedCMTName && kategoriCMT !== "N/A"
              ? `Penjahit ${selectedCMTName} — Kategori ${kategoriCMT}`
              : "Ringkasan produksi CMT secara keseluruhan"}
          </p>
        </div>

        <div className="page-actions">
          <select
            value={selectedCMT}
            onChange={(e) => setSelectedCMT(e.target.value)}
            className="form-select dash-filter"
          >
            <option value="">Semua CMT</option>
            {cmtList.map((cmt) => (
              <option key={cmt.id_penjahit} value={cmt.id_penjahit}>
                {cmt.nama_penjahit}
              </option>
            ))}
          </select>

          <div className="dash-user">
            <img
              src={`${process.env.REACT_APP_FILE_URL || ""}/storage/${localStorage.getItem("foto") || "user.png"}`}
              alt="User"
            />
          </div>
        </div>
      </header>

      {/* Ringkasan status SPK */}
      <section className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon is-info"><i className="fas fa-tasks"></i></div>
          <div className="stat-meta">
            <span className="stat-label">In Progress</span>
            <span className="stat-value">{inProgressCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon is-warning"><i className="fas fa-clock"></i></div>
          <div className="stat-meta">
            <span className="stat-label">Pending</span>
            <span className="stat-value">{pendingCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon is-success"><i className="fas fa-check-circle"></i></div>
          <div className="stat-meta">
            <span className="stat-label">Completed</span>
            <span className="stat-value">{completedCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-layer-group"></i></div>
          <div className="stat-meta">
            <span className="stat-label">Total SPK</span>
            <span className="stat-value">{totalSpk}</span>
          </div>
        </div>
      </section>

      {/* Charts */}
      <section className="dash-charts">
        <div className="card chart-card">
          <div className="card-header"><h3>Breakdown In Progress</h3></div>
          <div className="card-body">
            <div className="chart-canvas">
              <Doughnut data={donutData} options={donutOptions} />
            </div>
          </div>
        </div>

        {chartData && !selectedCMT && (
          <div className="card chart-card">
            <div className="card-header"><h3>Kinerja Penjahit</h3></div>
            <div className="card-body">
              <div className="chart-canvas">
                <Pie data={chartData} options={chartOptionsKinerja} plugins={[ChartDataLabels]} />
              </div>
              <div className="chart-legend">
                {categoryInfo.map((item) => (
                  <div key={item.label} className="legend-row">
                    <span
                      className="legend-dot"
                      style={{
                        backgroundColor:
                          chartData.datasets[0].backgroundColor[
                            chartData.labels.indexOf(item.label)
                          ],
                      }}
                    ></span>
                    <span className="legend-label">Kategori {item.label}</span>
                    <span className="legend-value">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {sisaProdukChart && !selectedCMT && (
          <div className="card chart-card">
            <div className="card-header"><h3>Sisa Produk CMT</h3></div>
            <div className="card-body">
              <div className="chart-canvas">
                <Pie data={sisaProdukChart} options={chartOptions} plugins={[ChartDataLabels]} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Panel daftar */}
      <section className="dash-side-grid">
        <div className="card">
          <div className="card-header"><h3>Kategori Produk</h3></div>
          <div className="card-body">
            {kategoriProduk.length > 0 ? (
              kategoriProduk.map((item, index) => (
                <div key={index} className="list-row">
                  <span>{item.kategori_produk}</span>
                  <strong>{item.total_produk} produk</strong>
                </div>
              ))
            ) : (
              <div className="empty-state">Tidak ada data kategori.</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Produk Urgent</h3>
            {urgentProducts.length > 0 && (
              <span className="badge badge-danger">{urgentProducts.length}</span>
            )}
          </div>
          <div className="card-body">
            {urgentProducts.length > 0 ? (
              urgentProducts.map((product, index) => (
                <div key={index} className="list-row is-urgent">
                  <span>{product.nama_produk}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">Tidak ada produk urgent.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;